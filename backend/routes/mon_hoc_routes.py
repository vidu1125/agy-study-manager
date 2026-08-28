"""
routes/mon_hoc_routes.py — Flask Blueprint cho MonHoc API (UC01–UC03).

Thin controller: parse request → gọi service → trả jsonify.
Không chứa business logic.
"""
from flask import Blueprint, jsonify, request
from services.mon_hoc_service import MonHocService

bp = Blueprint("mon_hoc", __name__)


@bp.route("/api/mon_hoc", methods=["GET"])
def get_mon_hoc():
    return jsonify(MonHocService.get_all())


@bp.route("/api/mon_hoc", methods=["POST"])
def create_mon_hoc():
    try:
        mon_dict, goal_dict = MonHocService.create(request.json or {})
        return jsonify({
            "message": "Tạo môn học thành công",
            "mon_hoc": mon_dict,
            "created_goal": goal_dict,
        }), 201
    except LookupError as e:
        return jsonify({"error": str(e)}), 404
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/mon_hoc/<ma_mon>", methods=["PUT"])
def update_mon_hoc(ma_mon):
    try:
        return jsonify({
            "message": "Cập nhật môn học thành công",
            "mon_hoc": MonHocService.update(ma_mon, request.json or {}),
        })
    except LookupError as e:
        return jsonify({"error": str(e)}), 404
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/mon_hoc/<ma_mon>", methods=["DELETE"])
def delete_mon_hoc(ma_mon):
    try:
        MonHocService.soft_delete(ma_mon)
        return jsonify({"message": "Đã chuyển trạng thái môn học thành Đã xong (soft-delete)"})
    except LookupError as e:
        return jsonify({"error": str(e)}), 404
