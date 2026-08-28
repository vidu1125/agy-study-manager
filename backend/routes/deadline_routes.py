"""
routes/deadline_routes.py — Flask Blueprint cho Deadline & Output API (UC04–UC08).
"""
from flask import Blueprint, jsonify, request
from services.deadline_service import DeadlineService

bp = Blueprint("deadline", __name__)


@bp.route("/api/deadline", methods=["GET"])
def get_deadlines():
    return jsonify(DeadlineService.get_all())


@bp.route("/api/deadline", methods=["POST"])
def create_deadline():
    try:
        return jsonify({
            "message": "Tạo deadline thành công",
            "deadline": DeadlineService.create(request.json or {}),
        }), 201
    except LookupError as e:
        return jsonify({"error": str(e)}), 404
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/deadline/<ma_bai_tap>", methods=["PUT"])
def update_deadline_status(ma_bai_tap):
    try:
        return jsonify({
            "message": "Cập nhật trạng thái thành công",
            "deadline": DeadlineService.update_status(ma_bai_tap, request.json or {}),
        })
    except LookupError as e:
        return jsonify({"error": str(e)}), 404


@bp.route("/api/deadline/<ma_bai_tap>/gia_han", methods=["POST"])
def extend_deadline(ma_bai_tap):
    try:
        dl_dict, log_dict = DeadlineService.extend(ma_bai_tap, request.json or {})
        return jsonify({
            "message": "Gia hạn deadline thành công",
            "deadline": dl_dict,
            "lich_su": log_dict,
        })
    except LookupError as e:
        return jsonify({"error": str(e)}), 404
    except (ValueError, PermissionError) as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/output/<ma_output>", methods=["PUT"])
def update_output_tu_hoc(ma_output):
    try:
        return jsonify({
            "message": "Cập nhật kết quả output thành công",
            "output": DeadlineService.update_output(ma_output, request.json or {}),
        })
    except LookupError as e:
        return jsonify({"error": str(e)}), 404


@bp.route("/api/lich_su_gia_han", methods=["GET"])
def get_lich_su_gia_han():
    return jsonify(DeadlineService.get_extension_history())
