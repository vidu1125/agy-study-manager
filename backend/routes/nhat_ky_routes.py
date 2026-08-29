"""
routes/nhat_ky_routes.py — Flask Blueprint cho NhatKyThoiGian API (UC11–UC12).
"""
from flask import Blueprint, jsonify, request
from services.nhat_ky_service import NhatKyService

bp = Blueprint("nhat_ky", __name__)


@bp.route("/api/nhat_ky", methods=["GET"])
def get_nhat_ky():
    return jsonify(NhatKyService.get_all())


@bp.route("/api/nhat_ky/summary", methods=["GET"])
def get_nhat_ky_summary():
    return jsonify(NhatKyService.get_study_summary())


@bp.route("/api/nhat_ky", methods=["POST"])
def create_nhat_ky():
    try:
        log_dict, streak = NhatKyService.create(request.json or {})
        return jsonify({
            "message": "Ghi nhận thời gian thành công",
            "log": log_dict,
            "streak": streak,
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
