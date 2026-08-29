"""Nghiệp vụ học từ vựng theo spaced repetition (SM-2 kiểu Anki, V1)."""
import datetime
import math
import random
import uuid

from sqlalchemy import func, or_

from models import (
    db,
    VocabCard,
    VocabDeck,
    VocabDeckConfig,
    VocabNote,
    VocabReviewLog,
    VocabStudySession,
)


_BUTTONS = {"again", "hard", "good", "easy"}
_ACTIVE_STATES = {"new", "learning", "review", "relearning"}
_MAX_IMPORT_NOTES = 1000


def _now() -> datetime.datetime:
    return datetime.datetime.utcnow()


def _steps(value: str, fallback: list[int]) -> list[int]:
    """Chuyển chuỗi cấu hình như `1m 10m` thành danh sách phút an toàn."""
    result = []
    for token in (value or "").lower().replace(",", " ").split():
        try:
            if token.endswith("h"):
                result.append(max(1, int(float(token[:-1]) * 60)))
            elif token.endswith("m"):
                result.append(max(1, int(float(token[:-1]))))
            else:
                result.append(max(1, int(float(token))))
        except ValueError:
            continue
    return result or fallback


def _study_day(now: datetime.datetime, config: VocabDeckConfig) -> datetime.date:
    """Ngày học đổi từ 04:00 (hoặc giờ đã cấu hình), thay vì đúng nửa đêm."""
    if now.hour < config.day_start_hour:
        return (now - datetime.timedelta(days=1)).date()
    return now.date()


def _next_day_start(now: datetime.datetime, config: VocabDeckConfig) -> datetime.datetime:
    tomorrow = _study_day(now, config) + datetime.timedelta(days=1)
    return datetime.datetime.combine(tomorrow, datetime.time(hour=config.day_start_hour))


def _format_interval(minutes: int | None = None, days: int | None = None) -> str:
    if days is not None:
        return f"{days}d"
    if minutes is None:
        return "—"
    if minutes >= 60 and minutes % 60 == 0:
        return f"{minutes // 60}h"
    return f"{minutes}m"


class VocabService:
    # ------------------------------------------------------------------ Decks
    @staticmethod
    def get_decks() -> list[dict]:
        now = _now()
        decks = VocabDeck.query.filter_by(is_archived=False).order_by(VocabDeck.created_at.asc()).all()
        return [VocabService._deck_summary(deck, now) for deck in decks]

    @staticmethod
    def get_deck(deck_id: int) -> dict:
        deck = VocabService._get_deck(deck_id)
        return VocabService._deck_summary(deck, _now(), include_config=True)

    @staticmethod
    def create_deck(data: dict) -> dict:
        name = (data.get("name") or "").strip()
        if not name:
            raise ValueError("Tên bộ từ vựng không được để trống")

        config_data = data.get("config") or {}
        config = VocabDeckConfig(name=f"Mặc định — {name}")
        VocabService._apply_config(config, config_data)
        deck = VocabDeck(
            name=name,
            description=(data.get("description") or "").strip() or None,
            config=config,
        )
        db.session.add_all([config, deck])
        db.session.commit()
        return VocabService._deck_summary(deck, _now(), include_config=True)

    @staticmethod
    def update_config(deck_id: int, data: dict) -> dict:
        deck = VocabService._get_deck(deck_id)
        VocabService._apply_config(deck.config, data)
        db.session.commit()
        return deck.config.to_dict()

    @staticmethod
    def _apply_config(config: VocabDeckConfig, data: dict) -> None:
        integer_fields = {
            "new_cards_per_day": (0, 9999), "reviews_per_day": (0, 99999),
            "graduating_interval_days": (1, 36500), "easy_interval_days": (1, 36500),
            "starting_ease": (130, 1000), "easy_bonus_pct": (100, 300),
            "hard_interval_pct": (100, 200), "interval_modifier_pct": (10, 300),
            "lapse_new_interval_pct": (1, 100), "minimum_ease": (100, 500),
            "maximum_interval_days": (1, 36500), "leech_threshold": (1, 100),
            "day_start_hour": (0, 23),
        }
        for field, (min_value, max_value) in integer_fields.items():
            if field not in data:
                continue
            try:
                value = int(data[field])
            except (TypeError, ValueError):
                raise ValueError(f"{field} phải là số nguyên")
            if not min_value <= value <= max_value:
                raise ValueError(f"{field} phải trong khoảng {min_value}–{max_value}")
            setattr(config, field, value)

        for field in ("learning_steps", "relearning_steps"):
            if field in data:
                parsed = _steps(str(data[field]), [])
                if not parsed:
                    raise ValueError(f"{field} phải có ít nhất một bước, ví dụ: 1m 10m")
                setattr(config, field, " ".join(f"{minute}m" for minute in parsed))

        if "leech_action" in data:
            if data["leech_action"] not in {"suspend", "tag_only"}:
                raise ValueError("leech_action chỉ có thể là suspend hoặc tag_only")
            config.leech_action = data["leech_action"]
        if "new_card_order" in data:
            if data["new_card_order"] not in {"added_order", "random"}:
                raise ValueError("new_card_order không hợp lệ")
            config.new_card_order = data["new_card_order"]
        if "bury_siblings" in data:
            config.bury_siblings = bool(data["bury_siblings"])

        # SQLAlchemy chỉ materialize Column.default lúc INSERT, nên các giá trị
        # chưa truyền ở form có thể vẫn là None ở bước validate này.
        minimum_ease = config.minimum_ease if config.minimum_ease is not None else 130
        starting_ease = config.starting_ease if config.starting_ease is not None else 250
        maximum_interval = config.maximum_interval_days if config.maximum_interval_days is not None else 36500
        easy_interval = config.easy_interval_days if config.easy_interval_days is not None else 4
        if minimum_ease > starting_ease:
            raise ValueError("minimum_ease không thể lớn hơn starting_ease")
        if maximum_interval < easy_interval:
            raise ValueError("maximum_interval_days phải lớn hơn easy_interval_days")

    # ------------------------------------------------------------------ Notes
    @staticmethod
    def add_note(deck_id: int, data: dict) -> dict:
        deck = VocabService._get_deck(deck_id)
        word = (data.get("word") or "").strip()
        meaning = (data.get("meaning") or "").strip()
        if not word or not meaning:
            raise ValueError("Từ vựng và nghĩa không được để trống")

        note = VocabNote(
            deck_id=deck.id,
            word=word,
            ipa=(data.get("ipa") or "").strip() or None,
            meaning=meaning,
            example=(data.get("example") or "").strip() or None,
            tags=VocabService._normalise_tags(data.get("tags") or "") or None,
        )
        db.session.add(note)
        db.session.flush()
        last_order = db.session.query(func.max(VocabCard.due_order)).filter_by(deck_id=deck.id).scalar() or 0
        directions = ["en_vi", "vi_en"] if data.get("bidirectional", True) else ["en_vi"]
        cards = [
            VocabCard(
                note_id=note.id, deck_id=deck.id, direction=direction,
                state="new", queue="new", due_order=last_order + index + 1,
                ease_factor=deck.config.starting_ease,
            )
            for index, direction in enumerate(directions)
        ]
        db.session.add_all(cards)
        db.session.commit()
        return {"note": note.to_dict(), "cards": [card.to_dict() for card in cards]}

    @staticmethod
    def import_notes(deck_id: int, payload) -> dict:
        """Nhập danh sách note JSON một cách atomic.

        Chấp nhận `{ "notes": [...] }` (khuyến nghị trong UI) hoặc trực tiếp
        một JSON array. Các cặp word/meaning trùng trong deck sẽ được bỏ qua để
        người dùng có thể import lại cùng file mà không sinh thẻ trùng.
        """
        deck = VocabService._get_deck(deck_id)
        rows = payload if isinstance(payload, list) else (payload.get("notes") if isinstance(payload, dict) else None)
        if not isinstance(rows, list) or not rows:
            raise ValueError("JSON phải là mảng từ vựng hoặc object có trường notes là một mảng")
        if len(rows) > _MAX_IMPORT_NOTES:
            raise ValueError(f"Mỗi lần chỉ import tối đa {_MAX_IMPORT_NOTES} từ")

        existing_pairs = {
            (note.word.strip().casefold(), note.meaning.strip().casefold())
            for note in VocabNote.query.filter_by(deck_id=deck.id).all()
        }
        seen_pairs = set()
        prepared_notes = []
        skipped_duplicates = 0

        for index, row in enumerate(rows, start=1):
            if not isinstance(row, dict):
                raise ValueError(f"Mục {index} phải là một object JSON")
            note_data = VocabService._validate_import_note(row, index)
            pair = (note_data["word"].casefold(), note_data["meaning"].casefold())
            if pair in existing_pairs or pair in seen_pairs:
                skipped_duplicates += 1
                continue
            seen_pairs.add(pair)
            prepared_notes.append(note_data)

        if not prepared_notes:
            return {
                "imported_notes": 0,
                "created_cards": 0,
                "skipped_duplicates": skipped_duplicates,
                "message": "Không có từ mới để import; các mục đều đã tồn tại trong deck.",
            }

        last_due_order = db.session.query(func.max(VocabCard.due_order)).filter_by(deck_id=deck.id).scalar() or 0
        created_cards = 0
        try:
            for note_data in prepared_notes:
                bidirectional = note_data["bidirectional"]
                note = VocabNote(
                    deck_id=deck.id,
                    word=note_data["word"],
                    ipa=note_data["ipa"],
                    meaning=note_data["meaning"],
                    example=note_data["example"],
                    tags=note_data["tags"],
                )
                db.session.add(note)
                db.session.flush()
                directions = ["en_vi", "vi_en"] if bidirectional else ["en_vi"]
                for direction in directions:
                    last_due_order += 1
                    db.session.add(VocabCard(
                        note_id=note.id,
                        deck_id=deck.id,
                        direction=direction,
                        state="new",
                        queue="new",
                        due_order=last_due_order,
                        ease_factor=deck.config.starting_ease,
                    ))
                    created_cards += 1
            db.session.commit()
        except Exception:
            db.session.rollback()
            raise

        return {
            "imported_notes": len(prepared_notes),
            "created_cards": created_cards,
            "skipped_duplicates": skipped_duplicates,
            "message": "Đã import từ vựng và tạo lịch ôn Spaced Repetition.",
        }

    @staticmethod
    def _validate_import_note(row: dict, index: int) -> dict:
        """Validate trước khi ghi bất kỳ note nào để import không bị dở dang."""
        limits = {
            "word": 300,
            "ipa": 300,
            "meaning": 2000,
            "example": 2000,
            "tags": 500,
        }
        values = {}
        for field, max_length in limits.items():
            value = row.get(field, "")
            if value is None:
                value = ""
            if not isinstance(value, str):
                raise ValueError(f"Mục {index}: {field} phải là chuỗi văn bản")
            value = value.strip()
            if len(value) > max_length:
                raise ValueError(f"Mục {index}: {field} dài tối đa {max_length} ký tự")
            values[field] = value

        if not values["word"] or not values["meaning"]:
            raise ValueError(f"Mục {index}: word và meaning là bắt buộc")

        bidirectional = row.get("bidirectional", True)
        if not isinstance(bidirectional, bool):
            raise ValueError(f"Mục {index}: bidirectional phải là true hoặc false")

        return {
            "word": values["word"],
            "ipa": values["ipa"] or None,
            "meaning": values["meaning"],
            "example": values["example"] or None,
            "tags": VocabService._normalise_tags(values["tags"]) or None,
            "bidirectional": bidirectional,
        }

    @staticmethod
    def browse_cards(deck_id: int, search: str | None = None, state: str | None = None) -> list[dict]:
        deck = VocabService._get_deck(deck_id)
        VocabService._release_buried(deck, _now())
        query = VocabCard.query.filter_by(deck_id=deck.id).join(VocabNote)
        if state:
            if state not in _ACTIVE_STATES | {"suspended", "buried"}:
                raise ValueError("Trạng thái lọc không hợp lệ")
            query = query.filter(VocabCard.queue == state if state == "buried" else VocabCard.state == state)
        if search:
            pattern = f"%{search.strip()}%"
            query = query.filter(
                or_(VocabNote.word.ilike(pattern), VocabNote.meaning.ilike(pattern), VocabNote.tags.ilike(pattern))
            )
        cards = query.order_by(VocabCard.created_at.desc()).all()
        return [VocabService._card_payload(card) for card in cards]

    @staticmethod
    def delete_note(deck_id: int, note_id: int) -> None:
        note = VocabNote.query.filter_by(id=note_id, deck_id=deck_id).first()
        if not note:
            raise LookupError("Không tìm thấy từ vựng")
        db.session.delete(note)
        db.session.commit()

    # ---------------------------------------------------------- Study session
    @staticmethod
    def start_session(deck_id: int) -> dict:
        deck = VocabService._get_deck(deck_id)
        session = VocabStudySession(id=str(uuid.uuid4()), deck_id=deck.id)
        db.session.add(session)
        db.session.commit()
        return {"session_id": session.id, "deck": VocabService._deck_summary(deck, _now())}

    @staticmethod
    def end_session(session_id: str) -> dict:
        session = VocabStudySession.query.get(session_id)
        if not session:
            raise LookupError("Không tìm thấy phiên học")
        if not session.ended_at:
            session.ended_at = _now()
            db.session.commit()
        return VocabService._session_payload(session)

    @staticmethod
    def next_card(deck_id: int) -> dict:
        deck = VocabService._get_deck(deck_id)
        now = _now()
        VocabService._release_buried(deck, now)
        card = VocabService._pick_next_card(deck, now)
        return {
            "card": VocabService._card_payload(card) if card else None,
            "remaining": VocabService._remaining(deck, now),
        }

    @staticmethod
    def answer_card(deck_id: int, card_id: int, data: dict) -> dict:
        deck = VocabService._get_deck(deck_id)
        card = VocabCard.query.filter_by(id=card_id, deck_id=deck.id).first()
        if not card:
            raise LookupError("Không tìm thấy thẻ")
        if card.state == "suspended" or card.queue in {"suspended", "buried"}:
            raise ValueError("Thẻ đang bị ẩn khỏi hàng đợi")

        button = (data.get("answer_button") or "").lower()
        if button not in _BUTTONS:
            raise ValueError("answer_button phải là again, hard, good hoặc easy")
        try:
            time_taken_ms = int(data.get("time_taken_ms")) if data.get("time_taken_ms") is not None else None
        except (TypeError, ValueError):
            raise ValueError("time_taken_ms không hợp lệ")

        now = _now()
        session_id = data.get("session_id")
        VocabService._validate_session(session_id, deck.id)
        state_before = card.state
        ease_before = card.ease_factor
        interval_before = card.interval_days
        VocabService._schedule(card, button, deck.config, now)
        card.last_reviewed_at = now

        if deck.config.bury_siblings:
            VocabService._bury_siblings(card, deck.config, now)

        VocabService._record_session(session_id, deck.id, state_before, button)
        log = VocabReviewLog(
            card_id=card.id,
            session_id=session_id or None,
            reviewed_at=now,
            study_day=_study_day(now, deck.config),
            answer_button=button,
            state_before=state_before,
            state_after=card.state,
            ease_before=ease_before,
            ease_after=card.ease_factor,
            interval_before_days=interval_before,
            interval_after_days=card.interval_days,
            time_taken_ms=max(0, time_taken_ms) if time_taken_ms is not None else None,
        )
        db.session.add(log)
        db.session.commit()
        return {
            "card": VocabService._card_payload(card),
            "message": VocabService._schedule_message(card, button),
            "next": VocabService.next_card(deck.id),
        }

    @staticmethod
    def preview_intervals(deck_id: int, card_id: int) -> dict:
        deck = VocabService._get_deck(deck_id)
        card = VocabCard.query.filter_by(id=card_id, deck_id=deck.id).first()
        if not card:
            raise LookupError("Không tìm thấy thẻ")
        return {button: VocabService._preview(card, button, deck.config) for button in ("again", "hard", "good", "easy")}

    # --------------------------------------------------------------- Card ops
    @staticmethod
    def suspend_card(deck_id: int, card_id: int) -> dict:
        card = VocabService._get_card(deck_id, card_id)
        if card.state != "suspended":
            card.suspended_from_state = card.state
            card.state = "suspended"
            card.queue = "suspended"
            card.suspended_at = _now()
            db.session.commit()
        return VocabService._card_payload(card)

    @staticmethod
    def unsuspend_card(deck_id: int, card_id: int) -> dict:
        card = VocabService._get_card(deck_id, card_id)
        if card.state == "suspended":
            card.state = card.suspended_from_state or ("review" if card.interval_days else "new")
            card.queue = card.state
            card.suspended_from_state = None
            card.suspended_at = None
            db.session.commit()
        return VocabService._card_payload(card)

    @staticmethod
    def reset_card(deck_id: int, card_id: int) -> dict:
        deck = VocabService._get_deck(deck_id)
        card = VocabService._get_card(deck.id, card_id)
        card.state = "new"
        card.queue = "new"
        card.due_at = None
        card.interval_days = 0
        card.ease_factor = deck.config.starting_ease
        card.repetitions = 0
        card.lapses = 0
        card.left_steps = 0
        card.is_leech = False
        card.suspended_from_state = None
        card.suspended_at = None
        card.buried_until = None
        db.session.commit()
        return VocabService._card_payload(card)

    # --------------------------------------------------------------- Statistics
    @staticmethod
    def stats(deck_id: int) -> dict:
        deck = VocabService._get_deck(deck_id)
        now = _now()
        VocabService._release_buried(deck, now)
        cards = VocabCard.query.filter_by(deck_id=deck.id).all()
        counts = {key: 0 for key in ("new", "learning", "review", "relearning", "suspended", "buried")}
        for card in cards:
            counts["buried" if card.queue == "buried" else card.state] = counts.get(
                "buried" if card.queue == "buried" else card.state, 0
            ) + 1

        since = now - datetime.timedelta(days=365)
        logs = VocabReviewLog.query.join(VocabCard).filter(
            VocabCard.deck_id == deck.id, VocabReviewLog.reviewed_at >= since
        ).all()
        answers = {button: 0 for button in _BUTTONS}
        heatmap: dict[str, int] = {}
        for log in logs:
            answers[log.answer_button] += 1
            key = log.study_day.isoformat()
            heatmap[key] = heatmap.get(key, 0) + 1

        forecast = []
        for offset in range(30):
            day = now.date() + datetime.timedelta(days=offset)
            start = datetime.datetime.combine(day, datetime.time.min)
            end = start + datetime.timedelta(days=1)
            due = VocabCard.query.filter(
                VocabCard.deck_id == deck.id,
                VocabCard.state.in_(("review", "learning", "relearning")),
                VocabCard.queue != "buried",
                VocabCard.due_at >= start,
                VocabCard.due_at < end,
            ).count()
            forecast.append({"date": day.isoformat(), "due": due})
        return {"counts": counts, "answers": answers, "heatmap": heatmap, "forecast": forecast}

    @staticmethod
    def analytics(deck_id: int | None = None) -> dict:
        """Tổng hợp dữ liệu có thể trực quan hoá cho UC học từ vựng.

        Dữ liệu được tính trực tiếp từ card và review log để trang phân tích
        luôn phản ánh lịch ôn hiện tại, không cần lưu snapshot riêng.
        """
        now = _now()
        if deck_id is not None:
            decks = [VocabService._get_deck(deck_id)]
        else:
            decks = VocabDeck.query.filter_by(is_archived=False).order_by(VocabDeck.created_at.asc()).all()

        for deck in decks:
            VocabService._release_buried(deck, now)

        deck_ids = [deck.id for deck in decks]
        if not deck_ids:
            return VocabService._empty_analytics()

        cards = VocabCard.query.filter(VocabCard.deck_id.in_(deck_ids)).all()
        notes_count = VocabNote.query.filter(VocabNote.deck_id.in_(deck_ids)).count()
        logs = VocabReviewLog.query.join(VocabCard).filter(
            VocabCard.deck_id.in_(deck_ids),
            VocabReviewLog.reviewed_at >= now - datetime.timedelta(days=365),
        ).order_by(VocabReviewLog.reviewed_at.asc()).all()
        review_total = VocabReviewLog.query.join(VocabCard).filter(
            VocabCard.deck_id.in_(deck_ids),
        ).count()

        counts = {key: 0 for key in ("new", "learning", "review", "relearning", "suspended", "buried")}
        interval_buckets = [
            {"label": "Mới", "count": 0, "color": "#22d3ee"},
            {"label": "Đang học", "count": 0, "color": "#fb923c"},
            {"label": "1 ngày", "count": 0, "color": "#a855f7"},
            {"label": "2–7 ngày", "count": 0, "color": "#60a5fa"},
            {"label": "8–30 ngày", "count": 0, "color": "#4ade80"},
            {"label": "> 30 ngày", "count": 0, "color": "#34d399"},
        ]
        for card in cards:
            state_key = "buried" if card.queue == "buried" else card.state
            counts[state_key] = counts.get(state_key, 0) + 1
            if card.state == "new":
                interval_buckets[0]["count"] += 1
            elif card.state in {"learning", "relearning"}:
                interval_buckets[1]["count"] += 1
            elif card.interval_days <= 1:
                interval_buckets[2]["count"] += 1
            elif card.interval_days <= 7:
                interval_buckets[3]["count"] += 1
            elif card.interval_days <= 30:
                interval_buckets[4]["count"] += 1
            else:
                interval_buckets[5]["count"] += 1

        period_days = 14
        today = now.date()
        activity_by_day = {}
        for offset in range(period_days - 1, -1, -1):
            day = today - datetime.timedelta(days=offset)
            activity_by_day[day.isoformat()] = {
                "date": day.isoformat(), "reviews": 0, "new_cards": 0,
                "again": 0, "hard": 0, "good": 0, "easy": 0, "_cards": set(),
            }

        answers_30d = {button: 0 for button in _BUTTONS}
        recent_30_start = today - datetime.timedelta(days=29)
        response_times = []
        study_days = set()
        for log in logs:
            study_days.add(log.study_day)
            if log.study_day >= recent_30_start:
                answers_30d[log.answer_button] = answers_30d.get(log.answer_button, 0) + 1
                if log.time_taken_ms is not None:
                    response_times.append(log.time_taken_ms)
            row = activity_by_day.get(log.study_day.isoformat())
            if row is not None:
                row["reviews"] += 1
                row["new_cards"] += int(log.state_before == "new")
                row[log.answer_button] += 1
                row["_cards"].add(log.card_id)

        activity = []
        for row in activity_by_day.values():
            row["unique_cards"] = len(row.pop("_cards"))
            activity.append(row)

        recent_answers = sum(answers_30d.values())
        retention_rate = round(
            100 * (answers_30d["good"] + answers_30d["easy"]) / recent_answers
        ) if recent_answers else None
        active_cards = [card for card in cards if card.state != "suspended" and card.queue != "buried"]
        mature_cards = [card for card in active_cards if card.state == "review" and card.interval_days >= 21]
        average_ease = round(
            sum(card.ease_factor for card in active_cards) / len(active_cards) / 100, 2
        ) if active_cards else None

        current_streak = 0
        probe = today
        while probe in study_days:
            current_streak += 1
            probe -= datetime.timedelta(days=1)
        longest_streak = 0
        streak = 0
        previous_day = None
        for day in sorted(study_days):
            streak = streak + 1 if previous_day and day == previous_day + datetime.timedelta(days=1) else 1
            longest_streak = max(longest_streak, streak)
            previous_day = day

        due_now = sum(
            1 for card in cards
            if card.state in {"learning", "review", "relearning"}
            and card.queue != "buried" and card.due_at and card.due_at <= now
        )
        new_available = sum(VocabService._remaining(deck, now)["new"] for deck in decks)
        forecast = []
        for offset in range(14):
            day = today + datetime.timedelta(days=offset)
            start = datetime.datetime.combine(day, datetime.time.min)
            end = start + datetime.timedelta(days=1)
            due = sum(
                1 for card in cards
                if card.state in {"learning", "review", "relearning"}
                and card.queue != "buried" and card.due_at and start <= card.due_at < end
            )
            forecast.append({"date": day.isoformat(), "due": due})

        weak_by_note = {}
        for card in cards:
            risk = card.lapses * 3 + max(0, 230 - card.ease_factor) / 10 + (8 if card.is_leech else 0)
            if risk <= 0:
                continue
            note = card.note
            entry = weak_by_note.setdefault(note.id, {
                "word": note.word, "meaning": note.meaning, "lapses": 0,
                "ease_factor": card.ease_factor, "is_leech": False, "risk": 0,
                "due_at": card.due_at.isoformat() if card.due_at else None,
            })
            entry["lapses"] += card.lapses
            entry["ease_factor"] = min(entry["ease_factor"], card.ease_factor)
            entry["is_leech"] = entry["is_leech"] or card.is_leech
            entry["risk"] = max(entry["risk"], risk)
            if card.due_at and (not entry["due_at"] or card.due_at.isoformat() < entry["due_at"]):
                entry["due_at"] = card.due_at.isoformat()
        weak_words = sorted(weak_by_note.values(), key=lambda item: (-item["risk"], -item["lapses"]))[:6]

        return {
            "scope": {
                "deck_id": deck_id,
                "deck_name": decks[0].name if deck_id is not None else "Tất cả deck",
                "deck_count": len(decks),
            },
            "summary": {
                "total_cards": len(cards), "total_notes": notes_count,
                "reviews_total": review_total, "reviews_14d": sum(row["reviews"] for row in activity),
                "reviews_today": activity[-1]["reviews"], "retention_rate": retention_rate,
                "current_streak": current_streak, "longest_streak": longest_streak,
                "mature_cards": len(mature_cards),
                "mastery_rate": round(100 * len(mature_cards) / len(active_cards)) if active_cards else 0,
                "average_ease": average_ease,
                "average_response_seconds": round(sum(response_times) / len(response_times) / 1000, 1) if response_times else None,
                "due_now": due_now, "new_available": new_available,
            },
            "state_counts": counts,
            "answer_distribution": answers_30d,
            "activity": activity,
            "forecast": forecast,
            "interval_buckets": interval_buckets,
            "weak_words": weak_words,
        }

    @staticmethod
    def _empty_analytics() -> dict:
        return {
            "scope": {"deck_id": None, "deck_name": "Tất cả deck", "deck_count": 0},
            "summary": {
                "total_cards": 0, "total_notes": 0, "reviews_total": 0, "reviews_14d": 0,
                "reviews_today": 0, "retention_rate": None, "current_streak": 0,
                "longest_streak": 0, "mature_cards": 0, "mastery_rate": 0,
                "average_ease": None, "average_response_seconds": None,
                "due_now": 0, "new_available": 0,
            },
            "state_counts": {key: 0 for key in ("new", "learning", "review", "relearning", "suspended", "buried")},
            "answer_distribution": {button: 0 for button in _BUTTONS},
            "activity": [], "forecast": [], "interval_buckets": [], "weak_words": [],
        }

    # ------------------------------------------------------- Scheduling engine
    @staticmethod
    def _schedule(card: VocabCard, button: str, config: VocabDeckConfig, now: datetime.datetime) -> None:
        """UC-07: engine SM-2 theo đúng nhánh New/Learning/Review/Relearning."""
        if card.state in {"new", "learning"}:
            VocabService._schedule_learning(card, button, config, now, relearning=False)
        elif card.state == "review":
            VocabService._schedule_review(card, button, config, now)
        elif card.state == "relearning":
            VocabService._schedule_learning(card, button, config, now, relearning=True)
        else:
            raise ValueError("Thẻ đang không ở trạng thái có thể học")
        if card.state != "suspended":
            card.queue = card.state

    @staticmethod
    def _schedule_learning(card: VocabCard, button: str, config: VocabDeckConfig,
                           now: datetime.datetime, relearning: bool) -> None:
        steps = _steps(config.relearning_steps if relearning else config.learning_steps, [10] if relearning else [1, 10])
        if card.state == "new":
            card.state = "learning"
            card.left_steps = len(steps)
        if card.left_steps <= 0 or card.left_steps > len(steps):
            card.left_steps = len(steps)

        current_index = min(max(len(steps) - card.left_steps, 0), len(steps) - 1)
        if button == "again":
            card.left_steps = len(steps)
            card.due_at = now + datetime.timedelta(minutes=steps[0])
        elif button == "hard":
            # Learning: Hard lặp lại bước hiện tại, không đi đến bước sau.
            card.due_at = now + datetime.timedelta(minutes=steps[current_index])
        elif button == "good":
            next_index = current_index + 1
            if next_index < len(steps):
                card.left_steps = len(steps) - next_index
                card.due_at = now + datetime.timedelta(minutes=steps[next_index])
            elif relearning:
                VocabService._regraduate(card, now)
            else:
                VocabService._graduate(card, config.graduating_interval_days, config, now)
        else:  # easy
            if relearning:
                VocabService._regraduate(card, now)
            else:
                VocabService._graduate(card, config.easy_interval_days, config, now)

    @staticmethod
    def _schedule_review(card: VocabCard, button: str, config: VocabDeckConfig, now: datetime.datetime) -> None:
        if button == "again":
            card.lapses += 1
            card.ease_factor = max(config.minimum_ease, card.ease_factor - 20)
            card.interval_days = max(1, round(card.interval_days * config.lapse_new_interval_pct / 100))
            card.repetitions = 0
            card.state = "relearning"
            steps = _steps(config.relearning_steps, [10])
            card.left_steps = len(steps)
            card.due_at = now + datetime.timedelta(minutes=steps[0])
            if card.lapses >= config.leech_threshold:
                card.is_leech = True
                card.note.tags = VocabService._append_tag(card.note.tags, "leech")
                if config.leech_action == "suspend":
                    card.suspended_from_state = "relearning"
                    card.state = "suspended"
                    card.queue = "suspended"
                    card.suspended_at = now
            return

        old_interval = card.interval_days
        if button == "hard":
            card.ease_factor = max(config.minimum_ease, card.ease_factor - 15)
            interval = old_interval * config.hard_interval_pct / 100
        elif button == "good":
            interval = old_interval * (card.ease_factor / 100)
        else:  # easy
            card.ease_factor += 15
            interval = old_interval * (card.ease_factor / 100) * (config.easy_bonus_pct / 100)

        interval *= config.interval_modifier_pct / 100
        interval = max(interval, old_interval + 1)
        interval = VocabService._fuzz(interval)
        # Fuzz không được làm vi phạm business rule interval tăng ít nhất một ngày.
        interval = max(interval, old_interval + 1)
        card.interval_days = min(config.maximum_interval_days, max(1, int(round(interval))))
        card.repetitions += 1
        card.state = "review"
        card.due_at = now + datetime.timedelta(days=card.interval_days)

    @staticmethod
    def _graduate(card: VocabCard, interval_days: int, config: VocabDeckConfig, now: datetime.datetime) -> None:
        card.state = "review"
        card.queue = "review"
        card.ease_factor = card.ease_factor or config.starting_ease
        card.interval_days = min(config.maximum_interval_days, max(1, interval_days))
        card.repetitions = 1
        card.left_steps = 0
        card.due_at = now + datetime.timedelta(days=card.interval_days)

    @staticmethod
    def _regraduate(card: VocabCard, now: datetime.datetime) -> None:
        card.state = "review"
        card.queue = "review"
        card.repetitions = 1
        card.left_steps = 0
        card.due_at = now + datetime.timedelta(days=max(1, card.interval_days))

    @staticmethod
    def _fuzz(interval: float) -> float:
        if interval < 2.5:
            return interval
        return interval * random.uniform(0.95, 1.05) if interval < 7 else interval * random.uniform(0.90, 1.10)

    # --------------------------------------------------------------- Internals
    @staticmethod
    def _pick_next_card(deck: VocabDeck, now: datetime.datetime) -> VocabCard | None:
        # Learning/Relearning luôn ưu tiên, không bị giới hạn reviews/day.
        learning = VocabCard.query.filter(
            VocabCard.deck_id == deck.id,
            VocabCard.state.in_(("learning", "relearning")),
            VocabCard.queue.in_(("learning", "relearning")),
            VocabCard.due_at <= now,
        ).order_by(VocabCard.due_at.asc()).first()
        if learning:
            return learning

        review_limit = max(0, deck.config.reviews_per_day - VocabService._reviews_done_today(deck, now))
        if review_limit > 0:
            review = VocabCard.query.filter(
                VocabCard.deck_id == deck.id, VocabCard.state == "review", VocabCard.queue == "review",
                VocabCard.due_at <= now,
            ).order_by(VocabCard.due_at.asc()).first()  # quá hạn lâu nhất trước
            if review:
                return review

        new_limit = max(0, deck.config.new_cards_per_day - VocabService._new_done_today(deck, now))
        if new_limit <= 0:
            return None
        new_query = VocabCard.query.filter_by(deck_id=deck.id, state="new", queue="new")
        if deck.config.new_card_order == "random":
            return new_query.order_by(func.random()).first()
        return new_query.order_by(VocabCard.due_order.asc()).first()

    @staticmethod
    def _remaining(deck: VocabDeck, now: datetime.datetime) -> dict:
        learning_due = VocabCard.query.filter(
            VocabCard.deck_id == deck.id, VocabCard.state.in_(("learning", "relearning")),
            VocabCard.queue.in_(("learning", "relearning")), VocabCard.due_at <= now,
        ).count()
        review_due = VocabCard.query.filter(
            VocabCard.deck_id == deck.id, VocabCard.state == "review", VocabCard.queue == "review",
            VocabCard.due_at <= now,
        ).count()
        new_available = min(
            VocabCard.query.filter_by(deck_id=deck.id, state="new", queue="new").count(),
            max(0, deck.config.new_cards_per_day - VocabService._new_done_today(deck, now)),
        )
        return {"learning": learning_due, "review": review_due, "new": new_available}

    @staticmethod
    def _new_done_today(deck: VocabDeck, now: datetime.datetime) -> int:
        return VocabReviewLog.query.join(VocabCard).filter(
            VocabCard.deck_id == deck.id,
            VocabReviewLog.study_day == _study_day(now, deck.config),
            VocabReviewLog.state_before == "new",
        ).count()

    @staticmethod
    def _reviews_done_today(deck: VocabDeck, now: datetime.datetime) -> int:
        return VocabReviewLog.query.join(VocabCard).filter(
            VocabCard.deck_id == deck.id,
            VocabReviewLog.study_day == _study_day(now, deck.config),
            # Learning/Relearning luôn được ưu tiên và không tiêu quota review/day.
            VocabReviewLog.state_before == "review",
        ).count()

    @staticmethod
    def _release_buried(deck: VocabDeck, now: datetime.datetime) -> None:
        buried = VocabCard.query.filter(
            VocabCard.deck_id == deck.id, VocabCard.queue == "buried",
            VocabCard.buried_until <= now,
        ).all()
        if not buried:
            return
        for card in buried:
            card.queue = card.state
            card.buried_until = None
        db.session.commit()

    @staticmethod
    def _bury_siblings(card: VocabCard, config: VocabDeckConfig, now: datetime.datetime) -> None:
        for sibling in VocabCard.query.filter(
            VocabCard.note_id == card.note_id,
            VocabCard.id != card.id,
            VocabCard.state.in_(tuple(_ACTIVE_STATES)),
            VocabCard.queue != "buried",
        ).all():
            sibling.queue = "buried"
            sibling.buried_until = _next_day_start(now, config)

    @staticmethod
    def _record_session(session_id: str | None, deck_id: int, state_before: str, button: str) -> None:
        if not session_id:
            return
        session = VocabStudySession.query.get(session_id)
        # Đã được kiểm tra trước khi engine thay đổi lịch học.
        if state_before == "new":
            session.new_cards_studied += 1
        else:
            session.reviews_done += 1
        setattr(session, f"{button}_count", getattr(session, f"{button}_count") + 1)

    @staticmethod
    def _validate_session(session_id: str | None, deck_id: int) -> None:
        if not session_id:
            return
        session = VocabStudySession.query.get(session_id)
        if not session or session.deck_id != deck_id:
            raise ValueError("Phiên học không hợp lệ")
        if session.ended_at:
            raise ValueError("Phiên học đã kết thúc")

    @staticmethod
    def _deck_summary(deck: VocabDeck, now: datetime.datetime, include_config: bool = False) -> dict:
        VocabService._release_buried(deck, now)
        data = deck.to_dict()
        data["remaining"] = VocabService._remaining(deck, now)
        data["total_cards"] = VocabCard.query.filter_by(deck_id=deck.id).count()
        if include_config:
            data["config"] = deck.config.to_dict()
        return data

    @staticmethod
    def _card_payload(card: VocabCard) -> dict:
        payload = card.to_dict()
        note = card.note
        if card.direction == "vi_en":
            front = note.meaning
            back = note.word
            if note.ipa:
                back = f"{back}\n{note.ipa}"
        else:
            front = note.word + (f"\n{note.ipa}" if note.ipa else "")
            back = note.meaning
        payload.update({
            "word": note.word, "meaning": note.meaning, "ipa": note.ipa or "",
            "example": note.example or "", "tags": note.tags or "",
            "front": front, "back": back,
            "direction_label": "Anh → Việt" if card.direction == "en_vi" else "Việt → Anh",
        })
        return payload

    @staticmethod
    def _preview(card: VocabCard, button: str, config: VocabDeckConfig) -> str:
        if card.state in {"new", "learning"}:
            steps = _steps(config.learning_steps, [1, 10])
            left = card.left_steps if card.left_steps else len(steps)
            current = min(max(len(steps) - left, 0), len(steps) - 1)
            if button == "again":
                return _format_interval(minutes=steps[0])
            if button == "hard":
                return _format_interval(minutes=steps[current])
            if button == "good" and current + 1 < len(steps):
                return _format_interval(minutes=steps[current + 1])
            return _format_interval(days=config.easy_interval_days if button == "easy" else config.graduating_interval_days)
        if card.state == "relearning":
            steps = _steps(config.relearning_steps, [10])
            if button in {"again", "hard"}:
                return _format_interval(minutes=steps[0])
            return _format_interval(days=max(1, card.interval_days))
        if button == "again":
            return _format_interval(minutes=_steps(config.relearning_steps, [10])[0])
        if button == "hard":
            days = max(card.interval_days + 1, math.ceil(card.interval_days * config.hard_interval_pct / 100))
        elif button == "good":
            days = max(card.interval_days + 1, math.ceil(card.interval_days * card.ease_factor / 100))
        else:
            days = max(card.interval_days + 1, math.ceil(card.interval_days * ((card.ease_factor + 15) / 100) * config.easy_bonus_pct / 100))
        return _format_interval(days=min(config.maximum_interval_days, days))

    @staticmethod
    def _schedule_message(card: VocabCard, button: str) -> str:
        if card.state == "suspended" and card.is_leech:
            return "Từ này bị quên nhiều lần nên đã được gắn leech và tạm ẩn."
        if card.state == "review":
            return f"Đã lên lịch ôn lại sau {card.interval_days} ngày."
        return "Đã cập nhật lịch học của thẻ."

    @staticmethod
    def _normalise_tags(tags: str) -> str:
        values = []
        for tag in tags.replace(",", " ").split():
            tag = tag.strip().lstrip("#")
            if tag and tag not in values:
                values.append(tag)
        return " ".join(values)

    @staticmethod
    def _append_tag(tags: str | None, tag: str) -> str:
        return VocabService._normalise_tags(f"{tags or ''} {tag}")

    @staticmethod
    def _get_deck(deck_id: int) -> VocabDeck:
        deck = VocabDeck.query.get(deck_id)
        if not deck or deck.is_archived:
            raise LookupError("Không tìm thấy bộ từ vựng")
        return deck

    @staticmethod
    def _get_card(deck_id: int, card_id: int) -> VocabCard:
        card = VocabCard.query.filter_by(id=card_id, deck_id=deck_id).first()
        if not card:
            raise LookupError("Không tìm thấy thẻ")
        return card

    @staticmethod
    def _session_payload(session: VocabStudySession) -> dict:
        return {
            "id": session.id, "deck_id": session.deck_id,
            "started_at": session.started_at.isoformat(),
            "ended_at": session.ended_at.isoformat() if session.ended_at else None,
            "new_cards_studied": session.new_cards_studied,
            "reviews_done": session.reviews_done,
            "again_count": session.again_count, "hard_count": session.hard_count,
            "good_count": session.good_count, "easy_count": session.easy_count,
        }
