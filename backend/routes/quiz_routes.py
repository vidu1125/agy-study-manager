"""REST API cho Quiz MCQ."""
from flask import Blueprint, jsonify, request

from services.quiz_service import QuizService


bp = Blueprint('quiz', __name__)


def _result(callback, success_code=200):
    try:
        return jsonify(callback()), success_code
    except LookupError as error:
        return jsonify({'error': str(error)}), 404
    except ValueError as error:
        return jsonify({'error': str(error)}), 400


@bp.route('/api/quiz/decks', methods=['GET'])
def get_quiz_decks():
    return jsonify(QuizService.get_decks())


@bp.route('/api/quiz/decks', methods=['POST'])
def create_quiz_deck():
    return _result(lambda: {'deck': QuizService.create_deck(request.get_json(silent=True) or {})}, 201)


@bp.route('/api/quiz/decks/<int:deck_id>', methods=['GET'])
def get_quiz_deck(deck_id):
    return _result(lambda: {'deck': QuizService.get_deck(deck_id)})


@bp.route('/api/quiz/decks/<int:deck_id>/questions/import', methods=['POST'])
def import_quiz_questions(deck_id):
    return _result(lambda: QuizService.import_questions(deck_id, request.get_json(silent=True)), 201)


@bp.route('/api/quiz/decks/<int:deck_id>/play', methods=['GET'])
def get_playable_quiz(deck_id):
    shuffle_value = request.args.get('shuffle', 'true').strip().lower()
    if shuffle_value not in {'true', 'false', '1', '0'}:
        return jsonify({'error': 'shuffle phải là true hoặc false'}), 400
    return _result(lambda: QuizService.playable_questions(
        deck_id, shuffle_questions=shuffle_value in {'true', '1'}
    ))


@bp.route('/api/quiz/decks/<int:deck_id>/submit', methods=['POST'])
def submit_quiz_exam(deck_id):
    return _result(lambda: QuizService.submit_exam(
        deck_id, request.get_json(silent=True) or {}
    ))

@bp.route('/api/quiz/decks/<int:deck_id>/questions/<int:question_id>/answer', methods=['POST'])
def answer_quiz_question(deck_id, question_id):
    return _result(lambda: QuizService.answer(
        deck_id, question_id, request.get_json(silent=True) or {}
    ))
