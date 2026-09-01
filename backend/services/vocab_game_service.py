"""Nghiệp vụ hành trình ôn từ vựng 5 chặng, bám sát hàng đợi SRS."""
import datetime
import difflib
import random
import uuid

from models import db, VocabCard, VocabGameSession, VocabReviewLog, VocabStudySession
from services.vocab_ai_service import VocabAiGenerator
from services.vocab_service import VocabService, _now, _study_day


class VocabGameService:
    """Game chỉ thu thập tín hiệu; lịch SRS được áp dụng đúng một lần khi kết thúc."""

    @classmethod
    def start(cls, deck_id: int) -> dict:
        deck = VocabService._get_deck(deck_id)
        now = _now()
        VocabService._release_buried(deck, now)
        cards = cls._due_cards(deck, now)
        study = VocabStudySession(id=str(uuid.uuid4()), deck_id=deck.id)
        db.session.add(study)
        db.session.flush()
        payload = cls._build_payload(cards)
        game = VocabGameSession(
            id=str(uuid.uuid4()),
            deck_id=deck.id,
            study_session_id=study.id,
            card_ids=[card.id for card in cards],
            stage_payload=payload,
            stage_results={"signals": {}, "answered": {}, "matching": {}},
            started_at=now,
        )
        db.session.add(game)
        db.session.commit()
        return cls._public(game, deck)

    @classmethod
    def get(cls, session_id: str) -> dict:
        game = cls._get_game(session_id, allow_ended=True)
        return cls._public(game, VocabService._get_deck(game.deck_id))

    @classmethod
    def prepare_fill_blank(cls, session_id: str) -> dict:
        """Tạo câu chặng 4 khi người học thực sự mở chặng này."""
        game = cls._get_game(session_id)
        payload = dict(game.stage_payload or {})
        if payload.get("fill_source") == "pending":
            questions, source = VocabAiGenerator.generate_fill_questions(payload.get("fill_input", []))
            payload["fill_blank"] = questions
            payload["fill_source"] = source
            game.stage_payload = payload
            db.session.commit()

        current = game.stage_payload or {}
        return {
            "items": [
                {key: value for key, value in item.items() if key != "answer"}
                for item in current.get("fill_blank", [])
            ],
            "source": current.get("fill_source", "not-needed"),
        }

    @classmethod
    def word_rush_answer(cls, session_id: str, data: dict) -> dict:
        game = cls._get_game(session_id)
        item = cls._item(game, "word_rush", data.get("item_id"))
        if cls._already_answered(game, "word_rush", item["id"]):
            return cls._event_response(game, True, "Đã ghi nhận câu trả lời này.")
        elapsed = cls._elapsed(data.get("time_taken_ms"))
        answer = data.get("answer")
        # Mọi câu trả lời không rỗng đều đi qua AI. Hàm evaluator có một lớp bảo vệ
        # đáp án khớp tuyệt đối để AI không thể hạ điểm đúng do phản hồi thiếu ổn định.
        evaluation = VocabAiGenerator.evaluate_word_rush(item["prompt"], item["answer"], answer)
        if not evaluation.get("available", True):
            # Provider không phản hồi không được biến thành một lượt Again oan.
            return {
                **cls._event_response(game, False, evaluation["feedback"]),
                "quality": "unavailable",
                "score_awarded": 0,
                "evaluation_source": evaluation.get("source", "unavailable"),
                "evaluation_analysis": evaluation.get("analysis", {}),
                "needs_retry": True,
            }
        correct = evaluation["accepted"]
        quality = evaluation["quality"]
        rating = "again"
        if correct:
            rating = "hard" if elapsed > 8000 or quality == "partial" else "good"
        awarded = evaluation["score"] if rating == "good" else min(evaluation["score"], 10)
        if elapsed > 8000:
            awarded = min(awarded, 10)
        cls._mark_answered(game, "word_rush", item["id"])
        cls._signal(game, item["card_id"], rating, elapsed)
        cls._commit_event(game, correct, rating, awarded)
        message = evaluation["feedback"] if correct else f"{evaluation['feedback']} Đáp án: {item['answer']}"
        return {**cls._event_response(game, correct, message), "quality": quality,
                "score_awarded": awarded, "evaluation_source": evaluation["source"],
                "evaluation_analysis": evaluation.get("analysis", {}), "needs_retry": False}

    @classmethod
    def matching_attempt(cls, session_id: str, data: dict) -> dict:
        game = cls._get_game(session_id)
        tiles = {tile["id"]: tile for tile in game.stage_payload.get("matching", {}).get("tiles", [])}
        first, second = tiles.get(data.get("first_tile_id")), tiles.get(data.get("second_tile_id"))
        if not first or not second or first["id"] == second["id"]:
            raise ValueError("Cặp ghép không hợp lệ")
        if first["type"] == second["type"]:
            raise ValueError("Hãy chọn một từ và một nghĩa")
        matched = first["card_id"] == second["card_id"]
        matching = (game.stage_results or {}).get("matching", {})
        if matched:
            matching[first["card_id"]] = {"matched": True, "mistakes": matching.get(first["card_id"], {}).get("mistakes", 0)}
            rating = "good" if matching[first["card_id"]]["mistakes"] == 0 else "again"
            cls._signal(game, first["card_id"], rating, cls._elapsed(data.get("time_taken_ms")))
        else:
            for tile in (first, second):
                entry = matching.setdefault(tile["card_id"], {"matched": False, "mistakes": 0})
                entry["mistakes"] += 1
                cls._signal(game, tile["card_id"], "again", cls._elapsed(data.get("time_taken_ms")))
            rating = "again"
        results = dict(game.stage_results or {})
        results["matching"] = matching
        game.stage_results = results
        cls._commit_event(game, matched, rating)
        return {
            **cls._event_response(game, matched, "Ghép đúng!" if matched else "Chưa đúng, thử lại."),
            "matched_card_id": first["card_id"] if matched else None,
            "completed_pairs": sum(1 for entry in matching.values() if entry.get("matched")),
        }

    @classmethod
    def fill_blank_answer(cls, session_id: str, data: dict) -> dict:
        game = cls._get_game(session_id)
        item = cls._item(game, "fill_blank", data.get("item_id"))
        if cls._already_answered(game, "fill_blank", item["id"]):
            return cls._event_response(game, True, "Đã ghi nhận câu trả lời này.")
        correct = cls._fuzzy(data.get("answer"), item["answer"])
        used_hint = bool(data.get("used_hint"))
        rating = "good" if correct and not used_hint else "again"
        cls._mark_answered(game, "fill_blank", item["id"])
        cls._signal(game, item["card_id"], rating, cls._elapsed(data.get("time_taken_ms")))
        cls._commit_event(game, correct, rating)
        return cls._event_response(game, correct, "Chính xác!" if correct else f"Đáp án: {item['answer']}")

    @classmethod
    def multiple_choice_answer(cls, session_id: str, data: dict) -> dict:
        game = cls._get_game(session_id)
        item = cls._item(game, "multiple_choice", data.get("item_id"))
        if cls._already_answered(game, "multiple_choice", item["id"]):
            return cls._event_response(game, True, "Đã ghi nhận câu trả lời này.")
        correct = cls._same(data.get("option"), item["answer"])
        elapsed = cls._elapsed(data.get("time_taken_ms"))
        rating = "good" if correct and elapsed <= 6000 else ("hard" if correct else "again")
        cls._mark_answered(game, "multiple_choice", item["id"])
        cls._signal(game, item["card_id"], rating, elapsed)
        cls._commit_event(game, correct, rating)
        return cls._event_response(game, correct, "Chính xác!" if correct else f"Đáp án: {item['answer']}")

    @classmethod
    def finish(cls, session_id: str) -> dict:
        game = cls._get_game(session_id, allow_ended=True)
        deck = VocabService._get_deck(game.deck_id)
        if game.applied_at:
            return cls._finish_payload(game, 0, 0)
        now = _now()
        signals = (game.stage_results or {}).get("signals", {})
        cards = VocabCard.query.filter(VocabCard.id.in_(game.card_ids or [-1])).all()
        applied = 0
        skipped = 0
        for card in cards:
            signal = signals.get(str(card.id))
            if not signal or card.state == "suspended" or card.queue == "buried":
                skipped += 1
                continue
            if card.last_reviewed_at and card.last_reviewed_at > game.started_at:
                skipped += 1
                continue
            rating = cls._final_rating(signal)
            before_state, before_ease, before_interval = card.state, card.ease_factor, card.interval_days
            VocabService._schedule(card, rating, deck.config, now)
            card.last_reviewed_at = now
            VocabService._record_session(game.study_session_id, deck.id, before_state, rating)
            db.session.add(VocabReviewLog(
                card_id=card.id, session_id=game.study_session_id, reviewed_at=now,
                study_day=_study_day(now, deck.config), answer_button=rating,
                state_before=before_state, state_after=card.state, ease_before=before_ease,
                ease_after=card.ease_factor, interval_before_days=before_interval,
                interval_after_days=card.interval_days, time_taken_ms=signal.get("time_taken_ms"),
            ))
            applied += 1
        study = VocabStudySession.query.get(game.study_session_id)
        if study and not study.ended_at:
            study.ended_at = now
        game.ended_at = now
        game.applied_at = now
        db.session.commit()
        return cls._finish_payload(game, applied, skipped)

    @staticmethod
    def _due_cards(deck, now):
        learning = VocabCard.query.filter(
            VocabCard.deck_id == deck.id, VocabCard.state.in_(("learning", "relearning")),
            VocabCard.queue.in_(("learning", "relearning")), VocabCard.due_at <= now,
        ).order_by(VocabCard.due_at.asc()).all()
        review_limit = max(0, deck.config.reviews_per_day - VocabService._reviews_done_today(deck, now))
        review = VocabCard.query.filter(
            VocabCard.deck_id == deck.id, VocabCard.state == "review", VocabCard.queue == "review",
            VocabCard.due_at <= now,
        ).order_by(VocabCard.due_at.asc()).limit(review_limit).all()
        new_limit = max(0, deck.config.new_cards_per_day - VocabService._new_done_today(deck, now))
        new_query = VocabCard.query.filter_by(deck_id=deck.id, state="new", queue="new")
        ordering = VocabCard.due_order.asc() if deck.config.new_card_order == "added_order" else db.func.random()
        new_cards = new_query.order_by(ordering).limit(new_limit).all()
        cards = learning + review + new_cards
        random.shuffle(cards)
        return cards

    @classmethod
    def _build_payload(cls, cards):
        review = [VocabService._card_payload(card) for card in cards]
        rush = []
        # Word Rush chỉ có một hướng Việt -> Anh. Deck hai chiều có hai VocabCard cho
        # cùng một note, nên chỉ chọn một card đến hạn (ưu tiên card vi_en) để tránh
        # hỏi lặp lại cùng một từ trong một phiên.
        rush_cards = {}
        for card in cards:
            selected = rush_cards.get(card.note_id)
            if selected is None or (card.direction == "vi_en" and selected.direction != "vi_en"):
                rush_cards[card.note_id] = card
        for card in rush_cards.values():
            note = card.note
            rush.append({
                "id": f"rush-{card.id}", "card_id": card.id,
                "prompt": note.meaning,
                "prompt_label": "DỊCH VIỆT → ANH",
                "answer": note.word, "audio_text": note.word,
            })
        pair_cards = cls._unique_notes(cards)[:6]
        tiles = []
        for card in pair_cards:
            tiles.extend([
                {"id": f"word-{card.id}", "card_id": card.id, "type": "word", "value": card.note.word},
                {"id": f"meaning-{card.id}", "card_id": card.id, "type": "meaning", "value": card.note.meaning},
            ])
        random.shuffle(tiles)
        fill_cards = cards[:25]
        fill_source = [{"card_id": card.id, "word": card.note.word, "meaning": card.note.meaning,
                        "tags": card.note.tags or "", "example": card.note.example or ""} for card in fill_cards]
        fill_status = "pending" if fill_source else "not-needed"
        mcq_cards = [card for card in cards if card.state in {"new", "learning", "relearning"}][:25]
        if not mcq_cards:
            mcq_cards = [card for card in cards if card.interval_days < 21][:25]
        return {
            "review": review,
            "word_rush": rush,
            "matching": {"tiles": tiles, "pair_count": len(pair_cards)},
            "fill_blank": [],
            "fill_source": fill_status,
            "fill_input": fill_source,
            "multiple_choice": cls._mcq(mcq_cards, cards),
        }

    @staticmethod
    def _unique_notes(cards):
        result, seen = [], set()
        for card in cards:
            if card.note_id not in seen:
                seen.add(card.note_id)
                result.append(card)
        return result

    @classmethod
    def _mcq(cls, cards, all_cards):
        pool = cls._unique_notes(all_cards)
        questions = []
        for card in cards:
            ask_word = card.direction != "vi_en"
            answer = card.note.meaning if ask_word else card.note.word
            distractors = []
            candidates = [other.note.meaning if ask_word else other.note.word for other in pool if other.note_id != card.note_id]
            random.shuffle(candidates)
            for candidate in candidates:
                if candidate and candidate not in distractors and candidate != answer:
                    distractors.append(candidate)
                if len(distractors) == 3:
                    break
            options = [answer] + distractors
            random.shuffle(options)
            questions.append({
                "id": f"mcq-{card.id}", "card_id": card.id,
                "question": f"Nghĩa phù hợp nhất của “{card.note.word}” là gì?" if ask_word
                            else f"Từ tiếng Anh nào có nghĩa “{card.note.meaning}”? ",
                "options": options, "answer": answer,
            })
        return questions

    @staticmethod
    def _get_game(session_id, allow_ended=False):
        game = VocabGameSession.query.get(session_id)
        if not game:
            raise LookupError("Không tìm thấy hành trình ôn tập")
        if game.ended_at and not allow_ended:
            raise ValueError("Hành trình này đã kết thúc")
        return game

    @staticmethod
    def _item(game, stage, item_id):
        for item in game.stage_payload.get(stage, []):
            if item.get("id") == item_id:
                return item
        raise ValueError("Câu hỏi không thuộc hành trình này")

    @staticmethod
    def _already_answered(game, stage, item_id):
        return item_id in (game.stage_results or {}).get("answered", {}).get(stage, [])

    @staticmethod
    def _mark_answered(game, stage, item_id):
        results = dict(game.stage_results or {})
        answered = dict(results.get("answered", {}))
        answered[stage] = list(answered.get(stage, [])) + [item_id]
        results["answered"] = answered
        game.stage_results = results

    @staticmethod
    def _signal(game, card_id, rating, time_taken_ms):
        results = dict(game.stage_results or {})
        signals = dict(results.get("signals", {}))
        entry = dict(signals.get(str(card_id), {"ratings": [], "time_taken_ms": 0}))
        entry["ratings"] = list(entry.get("ratings", [])) + [rating]
        entry["time_taken_ms"] = max(entry.get("time_taken_ms", 0), time_taken_ms or 0)
        signals[str(card_id)] = entry
        results["signals"] = signals
        game.stage_results = results

    @staticmethod
    def _commit_event(game, correct, rating, awarded_points=None):
        points = awarded_points if awarded_points is not None else (18 if rating == "good" else (10 if rating == "hard" else 0))
        results = dict(game.stage_results or {})
        streak = int(results.get("streak", 0))
        streak = streak + 1 if correct else 0
        results["streak"] = streak
        game.stage_results = results
        game.points += points
        game.best_streak = max(game.best_streak, streak)
        db.session.commit()

    @staticmethod
    def _event_response(game, correct, message):
        return {
            "correct": correct, "message": message, "points": game.points,
            "streak": (game.stage_results or {}).get("streak", 0),
            "best_streak": game.best_streak,
        }

    @staticmethod
    def _same(value, answer):
        return " ".join(str(value or "").casefold().split()) == " ".join(str(answer or "").casefold().split())

    @classmethod
    def _fuzzy(cls, value, answer):
        value, answer = " ".join(str(value or "").casefold().split()), " ".join(str(answer or "").casefold().split())
        if not value or not answer:
            return False
        return cls._same(value, answer) or (len(answer) >= 5 and difflib.SequenceMatcher(None, value, answer).ratio() >= 0.88)

    @staticmethod
    def _elapsed(value):
        try:
            return max(0, min(int(value), 120000))
        except (TypeError, ValueError):
            return 0

    @staticmethod
    def _final_rating(signal):
        ratings = signal.get("ratings", [])
        if "again" in ratings:
            return "again"
        if "hard" in ratings:
            return "hard"
        return "good"

    @classmethod
    def _public(cls, game, deck):
        payload = game.stage_payload or {}
        stages = {
            "review": payload.get("review", []),
            "word_rush": [{key: value for key, value in item.items() if key != "answer"} for item in payload.get("word_rush", [])],
            "matching": {
                "pair_count": payload.get("matching", {}).get("pair_count", 0),
                "tiles": [{key: value for key, value in tile.items() if key != "card_id"} for tile in payload.get("matching", {}).get("tiles", [])],
            },
            "fill_blank": [{key: value for key, value in item.items() if key != "answer"} for item in payload.get("fill_blank", [])],
            "fill_source": payload.get("fill_source", "not-needed"),
            "fill_count": len(payload.get("fill_input", [])),
            "multiple_choice": [{key: value for key, value in item.items() if key != "answer"} for item in payload.get("multiple_choice", [])],
        }
        return {
            "session_id": game.id, "deck": VocabService._deck_summary(deck, _now()),
            "due_count": len(game.card_ids or []), "stages": stages, "points": game.points,
            "best_streak": game.best_streak, "ended_at": game.ended_at.isoformat() if game.ended_at else None,
        }

    @staticmethod
    def _finish_payload(game, applied, skipped):
        return {
            "message": "Đã lưu kết quả và cập nhật lịch Spaced Repetition.",
            "points": game.points, "best_streak": game.best_streak,
            "applied_cards": applied, "skipped_cards": skipped,
        }
