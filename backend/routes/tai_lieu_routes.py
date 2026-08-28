"""
routes/tai_lieu_routes.py — Flask Blueprint cho TaiLieu API (UC09–UC10).
"""
from flask import Blueprint, jsonify, request
from services.tai_lieu_service import TaiLieuService

bp = Blueprint("tai_lieu", __name__)


@bp.route("/api/tai_lieu", methods=["GET"])
def get_tai_lieu():
    return jsonify(TaiLieuService.get_all())


@bp.route("/api/tai_lieu", methods=["POST"])
def create_tai_lieu():
    try:
        return jsonify({
            "message": "Thêm tài liệu thành công",
            "tai_lieu": TaiLieuService.create(request.json or {}),
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/tai_lieu/<ma_tai_lieu>", methods=["DELETE"])
def delete_tai_lieu(ma_tai_lieu):
    try:
        TaiLieuService.delete(ma_tai_lieu)
        return jsonify({"message": "Đã xóa tài liệu"})
    except LookupError as e:
        return jsonify({"error": str(e)}), 404
