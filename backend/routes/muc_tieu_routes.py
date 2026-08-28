"""
routes/muc_tieu_routes.py — Flask Blueprint cho MucTieu API.
"""
from flask import Blueprint, jsonify, request
from services.muc_tieu_service import MucTieuService

bp = Blueprint("muc_tieu", __name__)


@bp.route("/api/muc_tieu", methods=["GET"])
def get_muc_tieu():
    return jsonify(MucTieuService.get_all())


@bp.route("/api/muc_tieu", methods=["POST"])
def create_muc_tieu():
    try:
        return jsonify({
            "message": "Tạo mục tiêu thành công",
            "muc_tieu": MucTieuService.create(request.json or {}),
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/muc_tieu/<ma_muc_tieu>", methods=["PUT"])
def update_muc_tieu(ma_muc_tieu):
    try:
        return jsonify({
            "message": "Cập nhật mục tiêu thành công",
            "muc_tieu": MucTieuService.update(ma_muc_tieu, request.json or {}),
        })
    except LookupError as e:
        return jsonify({"error": str(e)}), 404
