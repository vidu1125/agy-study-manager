"""
routes/lich_hoc_routes.py — Flask Blueprint cho LichHoc & Calendar API (UC19–UC26).
"""
from flask import Blueprint, jsonify, request
from services.lich_hoc_service import LichHocService

bp = Blueprint("lich_hoc", __name__)


@bp.route("/api/lich_hoc", methods=["GET"])
def get_lich_hoc():
    return jsonify(LichHocService.get_all())


@bp.route("/api/lich_hoc", methods=["POST"])
def create_lich_hoc():
    try:
        result = LichHocService.create(request.json or {})
        if result.get("conflict"):
            return jsonify(result), 409
        return jsonify({
            "message": "Tạo lịch học thành công",
            "lich_hoc": result["lich_hoc"],
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/lich_hoc/batch", methods=["POST"])
def create_lich_hoc_batch():
    try:
        result = LichHocService.create_weekly_batch(request.json or {})
        if result.get("conflict"):
            return jsonify(result), 409
        return jsonify({
            "message": f"Đã tạo {len(result['lich_hocs'])} buổi học hàng tuần",
            "lich_hocs": result["lich_hocs"],
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/lich_hoc/<ma_lich>", methods=["PUT"])
def update_lich_hoc(ma_lich):
    try:
        return jsonify({
            "message": "Cập nhật lịch học thành công",
            "lich_hoc": LichHocService.update(ma_lich, request.json or {}),
        })
    except LookupError as e:
        return jsonify({"error": str(e)}), 404


@bp.route("/api/lich_hoc/<ma_lich>", methods=["DELETE"])
def delete_lich_hoc(ma_lich):
    try:
        LichHocService.delete(ma_lich)
        return jsonify({"message": "Xóa lịch học thành công"})
    except LookupError as e:
        return jsonify({"error": str(e)}), 404


@bp.route("/api/calendar_view", methods=["GET"])
def get_calendar_view():
    return jsonify(LichHocService.get_calendar_view(
        request.args.get("start_date"),
        request.args.get("end_date"),
    ))
