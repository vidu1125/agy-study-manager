"""REST API cho module Học từ vựng / Spaced Repetition."""
from flask import Blueprint, jsonify, request

from services.vocab_service import VocabService


bp = Blueprint("vocab", __name__)


def _result(callback, success_code=200):
    try:
        return jsonify(callback()), success_code
    except LookupError as error:
        return jsonify({"error": str(error)}), 404
    except ValueError as error:
        return jsonify({"error": str(error)}), 400


@bp.route("/api/vocab/decks", methods=["GET"])
def get_decks():
    return jsonify(VocabService.get_decks())


@bp.route("/api/vocab/decks", methods=["POST"])
def create_deck():
    return _result(lambda: {"deck": VocabService.create_deck(request.get_json(silent=True) or {})}, 201)


@bp.route("/api/vocab/decks/<int:deck_id>", methods=["GET"])
def get_deck(deck_id):
    return _result(lambda: {"deck": VocabService.get_deck(deck_id)})


@bp.route("/api/vocab/decks/<int:deck_id>/config", methods=["PUT"])
def update_deck_config(deck_id):
    return _result(lambda: {"config": VocabService.update_config(deck_id, request.get_json(silent=True) or {})})


@bp.route("/api/vocab/decks/<int:deck_id>/notes", methods=["POST"])
def add_note(deck_id):
    return _result(lambda: VocabService.add_note(deck_id, request.get_json(silent=True) or {}), 201)


@bp.route("/api/vocab/decks/<int:deck_id>/notes/import", methods=["POST"])
def import_notes(deck_id):
    """Nhập hàng loạt từ vựng từ JSON đã được browser đọc/kiểm tra."""
    return _result(
        lambda: VocabService.import_notes(deck_id, request.get_json(silent=True)),
        201,
    )


@bp.route("/api/vocab/decks/<int:deck_id>/cards", methods=["GET"])
def browse_cards(deck_id):
    return _result(lambda: {"cards": VocabService.browse_cards(
        deck_id, request.args.get("search"), request.args.get("state")
    )})


@bp.route("/api/vocab/decks/<int:deck_id>/notes/<int:note_id>", methods=["DELETE"])
def delete_note(deck_id, note_id):
    def callback():
        VocabService.delete_note(deck_id, note_id)
        return {"message": "Đã xóa từ vựng và các thẻ liên quan"}
    return _result(callback)


@bp.route("/api/vocab/decks/<int:deck_id>/sessions", methods=["POST"])
def start_session(deck_id):
    return _result(lambda: VocabService.start_session(deck_id), 201)


@bp.route("/api/vocab/sessions/<session_id>/end", methods=["POST"])
def end_session(session_id):
    return _result(lambda: {"session": VocabService.end_session(session_id)})


@bp.route("/api/vocab/decks/<int:deck_id>/next", methods=["GET"])
def next_card(deck_id):
    return _result(lambda: VocabService.next_card(deck_id))


@bp.route("/api/vocab/decks/<int:deck_id>/cards/<int:card_id>/answer", methods=["POST"])
def answer_card(deck_id, card_id):
    return _result(lambda: VocabService.answer_card(deck_id, card_id, request.get_json(silent=True) or {}))


@bp.route("/api/vocab/decks/<int:deck_id>/cards/<int:card_id>/preview", methods=["GET"])
def preview_card(deck_id, card_id):
    return _result(lambda: {"intervals": VocabService.preview_intervals(deck_id, card_id)})


@bp.route("/api/vocab/decks/<int:deck_id>/cards/<int:card_id>/suspend", methods=["POST"])
def suspend_card(deck_id, card_id):
    return _result(lambda: {"card": VocabService.suspend_card(deck_id, card_id)})


@bp.route("/api/vocab/decks/<int:deck_id>/cards/<int:card_id>/unsuspend", methods=["POST"])
def unsuspend_card(deck_id, card_id):
    return _result(lambda: {"card": VocabService.unsuspend_card(deck_id, card_id)})


@bp.route("/api/vocab/decks/<int:deck_id>/cards/<int:card_id>/reset", methods=["POST"])
def reset_card(deck_id, card_id):
    return _result(lambda: {"card": VocabService.reset_card(deck_id, card_id)})


@bp.route("/api/vocab/decks/<int:deck_id>/stats", methods=["GET"])
def vocab_stats(deck_id):
    return _result(lambda: VocabService.stats(deck_id))


@bp.route("/api/vocab/analytics", methods=["GET"])
def vocab_analytics():
    """Dữ liệu tổng hợp cho trang phân tích tiến độ Spaced Repetition."""
    return _result(lambda: VocabService.analytics(request.args.get("deck_id", type=int)))
