"""Nghiệp vụ Quiz MCQ: deck, import JSON và chấm đáp án."""
import random

from sqlalchemy import func

from models import db, QuizDeck, QuizQuestion


_MAX_IMPORT_QUESTIONS = 1000


class QuizService:
    @staticmethod
    def get_decks() -> list[dict]:
        rows = (
            db.session.query(QuizDeck, func.count(QuizQuestion.id))
            .outerjoin(QuizQuestion)
            .group_by(QuizDeck.id)
            .order_by(QuizDeck.created_at.desc())
            .all()
        )
        return [deck.to_dict(question_count=count) for deck, count in rows]

    @staticmethod
    def create_deck(data: dict) -> dict:
        name = (data.get('name') or '').strip()
        if not name:
            raise ValueError('Tên quiz deck không được để trống')
        if len(name) > 160:
            raise ValueError('Tên quiz deck tối đa 160 ký tự')
        deck = QuizDeck(name=name)
        db.session.add(deck)
        db.session.commit()
        return deck.to_dict(question_count=0)

    @staticmethod
    def get_deck(deck_id: int) -> dict:
        deck = QuizService._get_deck(deck_id)
        count = QuizQuestion.query.filter_by(deck_id=deck.id).count()
        return deck.to_dict(question_count=count)

    @staticmethod
    def import_questions(deck_id: int, payload) -> dict:
        """Nhập một mảng câu hỏi. Hỗ trợ cả options[] và option_A...option_E."""
        deck = QuizService._get_deck(deck_id)
        rows = payload if isinstance(payload, list) else (payload.get('questions') if isinstance(payload, dict) else None)
        if not isinstance(rows, list) or not rows:
            raise ValueError('JSON phải có trường questions là một mảng, hoặc là một mảng câu hỏi')
        if len(rows) > _MAX_IMPORT_QUESTIONS:
            raise ValueError(f'Mỗi lần import tối đa {_MAX_IMPORT_QUESTIONS} câu hỏi')

        existing_questions = {
            item.question.strip().casefold()
            for item in QuizQuestion.query.filter_by(deck_id=deck.id).all()
        }
        seen_questions = set()
        prepared = []
        skipped_duplicates = 0
        for index, row in enumerate(rows, start=1):
            item = QuizService._validate_import_row(row, index)
            key = item['question'].casefold()
            if key in existing_questions or key in seen_questions:
                skipped_duplicates += 1
                continue
            seen_questions.add(key)
            prepared.append(item)

        questions = [
            QuizQuestion(
                deck_id=deck.id,
                question=item['question'],
                options=item['options'],
                correct_index=item['correct_index'],
                explanation=item['explanation'],
            )
            for item in prepared
        ]
        db.session.add_all(questions)
        db.session.commit()
        return {
            'imported_questions': len(questions),
            'skipped_duplicates': skipped_duplicates,
            'deck': deck.to_dict(question_count=QuizQuestion.query.filter_by(deck_id=deck.id).count()),
        }

    @staticmethod
    def playable_questions(deck_id: int) -> dict:
        deck = QuizService._get_deck(deck_id)
        questions = QuizQuestion.query.filter_by(deck_id=deck.id).all()
        if not questions:
            raise ValueError('Deck này chưa có câu hỏi. Hãy import JSON trước.')
        random.shuffle(questions)
        return {
            'deck': deck.to_dict(question_count=len(questions)),
            'questions': [question.to_dict(include_answer=False) for question in questions],
        }

    @staticmethod
    def answer(deck_id: int, question_id: int, data: dict) -> dict:
        QuizService._get_deck(deck_id)
        question = QuizQuestion.query.filter_by(id=question_id, deck_id=deck_id).first()
        if not question:
            raise LookupError('Không tìm thấy câu hỏi trong deck này')
        selected_index = data.get('selected_index')
        if isinstance(selected_index, bool):
            raise ValueError('Đáp án được chọn không hợp lệ')
        try:
            selected_index = int(selected_index)
        except (TypeError, ValueError) as error:
            raise ValueError('Đáp án được chọn không hợp lệ') from error
        if not 0 <= selected_index < len(question.options or []):
            raise ValueError('Đáp án được chọn không hợp lệ')
        return {
            'is_correct': selected_index == question.correct_index,
            'correct_index': question.correct_index,
            'correct_option': question.options[question.correct_index],
            'explanation': question.explanation or '',
        }

    @staticmethod
    def submit_exam(deck_id: int, data: dict) -> dict:
        """Chấm toàn bộ bài luyện thi trong một request, sau khi người học nộp bài."""
        QuizService._get_deck(deck_id)
        answers = data.get('answers') if isinstance(data, dict) else None
        if not isinstance(answers, list):
            raise ValueError('Bài nộp cần có mảng answers')
        if len(answers) > _MAX_IMPORT_QUESTIONS:
            raise ValueError('Bài nộp có quá nhiều đáp án')

        questions = QuizQuestion.query.filter_by(deck_id=deck_id).all()
        question_by_id = {question.id: question for question in questions}
        selected_by_id = {}
        for position, answer in enumerate(answers, start=1):
            if not isinstance(answer, dict):
                raise ValueError(f'Đáp án nộp thứ {position} không hợp lệ')
            question_id = answer.get('question_id')
            if isinstance(question_id, bool):
                raise ValueError(f'question_id ở đáp án thứ {position} không hợp lệ')
            try:
                question_id = int(question_id)
            except (TypeError, ValueError) as error:
                raise ValueError(f'question_id ở đáp án thứ {position} không hợp lệ') from error
            if question_id not in question_by_id:
                raise ValueError(f'Câu hỏi ở đáp án thứ {position} không thuộc quiz deck này')
            if question_id in selected_by_id:
                raise ValueError(f'Câu hỏi {question_id} bị nộp nhiều lần')

            selected_index = answer.get('selected_index')
            if selected_index is None:
                selected_by_id[question_id] = None
                continue
            if isinstance(selected_index, bool):
                raise ValueError(f'Đáp án của câu {question_id} không hợp lệ')
            try:
                selected_index = int(selected_index)
            except (TypeError, ValueError) as error:
                raise ValueError(f'Đáp án của câu {question_id} không hợp lệ') from error
            if not 0 <= selected_index < len(question_by_id[question_id].options or []):
                raise ValueError(f'Đáp án của câu {question_id} không hợp lệ')
            selected_by_id[question_id] = selected_index

        results = []
        correct_count = 0
        unanswered_count = 0
        for question in questions:
            selected_index = selected_by_id.get(question.id)
            if selected_index is None:
                unanswered_count += 1
                is_correct = False
            else:
                is_correct = selected_index == question.correct_index
                correct_count += int(is_correct)
            results.append({
                'question_id': question.id,
                'selected_index': selected_index,
                'is_correct': is_correct,
                'correct_index': question.correct_index,
                'correct_option': question.options[question.correct_index],
                'explanation': question.explanation or '',
            })
        return {
            'total_questions': len(questions),
            'correct_count': correct_count,
            'unanswered_count': unanswered_count,
            'results': results,
        }

    @staticmethod
    def _get_deck(deck_id: int) -> QuizDeck:
        deck = QuizDeck.query.get(deck_id)
        if not deck:
            raise LookupError('Không tìm thấy quiz deck')
        return deck

    @staticmethod
    def _validate_import_row(row, position: int) -> dict:
        if not isinstance(row, dict):
            raise ValueError(f'Câu {position} phải là một object JSON')
        question = (row.get('question') or '').strip()
        if not question:
            raise ValueError(f'Câu {position} thiếu trường question')
        if len(question) > 5000:
            raise ValueError(f'Câu {position} dài quá 5.000 ký tự')

        options = row.get('options')
        if options is None:
            options = [row.get(f'option_{letter}') for letter in 'ABCDE']
            options = [option for option in options if option is not None]
        if not isinstance(options, list) or len(options) not in {4, 5}:
            raise ValueError(f'Câu {position} phải có đúng 4 hoặc 5 đáp án')
        clean_options = []
        for option_position, option in enumerate(options, start=1):
            if not isinstance(option, str) or not option.strip():
                raise ValueError(f'Đáp án {option_position} của câu {position} không hợp lệ')
            clean_options.append(option.strip())
        if len({option.casefold() for option in clean_options}) != len(clean_options):
            raise ValueError(f'Câu {position} có đáp án bị trùng')

        correct_index = QuizService._correct_index(row, clean_options, position)
        explanation = (row.get('explanation') or row.get('source_quote') or '').strip()
        return {
            'question': question,
            'options': clean_options,
            'correct_index': correct_index,
            'explanation': explanation[:5000],
        }

    @staticmethod
    def _correct_index(row: dict, options: list[str], position: int) -> int:
        if 'correct_index' in row:
            try:
                index = int(row['correct_index'])
            except (TypeError, ValueError) as error:
                raise ValueError(f'correct_index của câu {position} không hợp lệ') from error
            if 0 <= index < len(options):
                return index
            raise ValueError(f'correct_index của câu {position} phải từ 0 đến {len(options) - 1}')

        answer = row.get('correct_answer')
        if isinstance(answer, str):
            answer = answer.strip()
            if len(answer) == 1 and answer.upper() in 'ABCDE':
                index = ord(answer.upper()) - ord('A')
                if index < len(options):
                    return index
            for index, option in enumerate(options):
                if answer.casefold() == option.casefold():
                    return index
            if answer.isdigit():
                answer = int(answer)
        if isinstance(answer, int) and not isinstance(answer, bool) and 1 <= answer <= len(options):
            return answer - 1
        raise ValueError(
            f'Câu {position} cần correct_answer (A–{chr(ord("A") + len(options) - 1)} hoặc 1–{len(options)}) '
            'hoặc correct_index (đếm từ 0)'
        )
