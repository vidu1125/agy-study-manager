"""Sinh câu Fill-in-the-blank: Groq nhiều key -> OpenAI -> template tại chỗ."""
import json
import os
import re

import requests


class VocabAiGenerator:
    """Không lưu key hay câu trả lời provider vào log; chỉ lưu câu hỏi đã tạo."""

    @classmethod
    def generate_fill_questions(cls, cards: list[dict]) -> tuple[list[dict], str]:
        if not cards:
            return [], "not-needed"

        payload = [
            {
                "card_id": item["card_id"],
                "word": item["word"],
                "meaning": item["meaning"],
                "tags": item.get("tags", ""),
                "example": item.get("example", ""),
            }
            for item in cards
        ]
        for label, url, key, model in cls._providers():
            try:
                result = cls._request(url, key, model, payload)
                questions = cls._validate(result, payload)
                if questions:
                    return questions, label
            except (requests.RequestException, ValueError, TypeError, KeyError):
                # Fallback theo thứ tự đã cấu hình; không ghi token/key ra ngoài.
                continue
        return cls._local_questions(payload), "local-fallback"

    @staticmethod
    def _providers() -> list[tuple[str, str, str, str]]:
        providers = []
        seen = set()
        groq_keys = [os.getenv(f"GROQ_API_KEY_{index}", "").strip() for index in range(1, 6)]
        groq_keys.extend(
            key.strip() for key in os.getenv("GROQ_API_KEYS", "").split(",") if key.strip()
        )
        legacy_key = os.getenv("GROQ_API_KEY", "").strip()
        if legacy_key:
            groq_keys.append(legacy_key)
        for index, key in enumerate(groq_keys, start=1):
            if key and key not in seen:
                seen.add(key)
                providers.append((
                    f"groq-{index}",
                    "https://api.groq.com/openai/v1/chat/completions",
                    key,
                    os.getenv("GROQ_VOCAB_MODEL", "llama-3.3-70b-versatile"),
                ))
        openai_key = os.getenv("OPENAI_API_KEY", "").strip()
        if openai_key:
            providers.append((
                "openai",
                "https://api.openai.com/v1/chat/completions",
                openai_key,
                os.getenv("OPENAI_VOCAB_MODEL", "gpt-4o-mini"),
            ))
        return providers

    @staticmethod
    def _request(url: str, key: str, model: str, cards: list[dict]) -> list[dict]:
        instructions = (
            "Create one English fill-in-the-blank item for every supplied vocabulary item. "
            "The learner is Vietnamese and studies IELTS plus everyday English. "
            "Use a single natural sentence, not a dialogue. Replace only the target word "
            "with exactly five underscores. Do not use words outside the supplied item as "
            "the answer. Return JSON only in shape {\"questions\":[{\"card_id\":1,"
            "\"sentence\":\"... _____ ...\",\"hint\":\"Vietnamese hint\"}]}. "
            "Do not include explanations."
        )
        response = requests.post(
            url,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "temperature": 0.35,
                "response_format": {"type": "json_object"},
                "messages": [
                    {"role": "system", "content": instructions},
                    {"role": "user", "content": json.dumps({"cards": cards}, ensure_ascii=False)},
                ],
            },
            timeout=7,
        )
        response.raise_for_status()
        content = response.json()["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        return parsed.get("questions", [])

    @staticmethod
    def _validate(questions: list[dict], cards: list[dict]) -> list[dict]:
        by_id = {item["card_id"]: item for item in cards}
        valid = []
        for question in questions if isinstance(questions, list) else []:
            card_id = question.get("card_id")
            card = by_id.get(card_id)
            sentence = str(question.get("sentence", "")).strip()
            if not card or "_____" not in sentence or len(sentence) > 1200:
                continue
            valid.append({
                "id": f"fill-{card_id}",
                "card_id": card_id,
                "sentence": sentence,
                "hint": str(question.get("hint") or card["meaning"]).strip()[:500],
                "answer": card["word"],
            })
        return valid

    @staticmethod
    def _local_questions(cards: list[dict]) -> list[dict]:
        questions = []
        for card in cards:
            word = card["word"]
            example = card.get("example") or ""
            pattern = re.compile(re.escape(word), re.IGNORECASE)
            sentence = pattern.sub("_____", example, count=1) if example else ""
            if "_____" not in sentence:
                sentence = "Choose the most suitable word to complete this natural English sentence: _____."
            questions.append({
                "id": f"fill-{card['card_id']}",
                "card_id": card["card_id"],
                "sentence": sentence,
                "hint": card["meaning"],
                "answer": word,
            })
        return questions

