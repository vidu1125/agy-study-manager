"""
routes/tai_lieu_routes.py — Flask Blueprint cho TaiLieu API (UC09–UC10).
"""
from flask import Blueprint, current_app, jsonify, request, send_from_directory
from services.tai_lieu_service import TaiLieuService

bp = Blueprint("tai_lieu", __name__)


@bp.route("/api/tai_lieu", methods=["GET"])
def get_tai_lieu():
    return jsonify(TaiLieuService.get_all())


@bp.route("/api/tai_lieu", methods=["POST"])
def create_tai_lieu():
    try:
        if request.is_json:
            payload = request.get_json(silent=True) or {}
            uploaded_file = None
        else:
            payload = request.form.to_dict()
            uploaded_file = request.files.get("file")
        return jsonify({
            "message": "Thêm tài liệu thành công",
            "tai_lieu": TaiLieuService.create(
                payload,
                uploaded_file=uploaded_file,
                upload_dir=current_app.config["UPLOAD_FOLDER"],
            ),
        }), 201
    except ValueError as e:
        return jsonify({"error": str(e)}), 400


@bp.route("/api/tai_lieu/<ma_tai_lieu>", methods=["DELETE"])
def delete_tai_lieu(ma_tai_lieu):
    try:
        link = TaiLieuService.delete(ma_tai_lieu)
        TaiLieuService.delete_stored_upload(link, current_app.config["UPLOAD_FOLDER"])
        return jsonify({"message": "Đã xóa tài liệu"})
    except LookupError as e:
        return jsonify({"error": str(e)}), 404


@bp.route("/uploads/<path:filename>", methods=["GET"])
def get_uploaded_material(filename):
    """Phục vụ tệp tài liệu do ứng dụng lưu, với kiểm tra path của Flask."""
    return send_from_directory(current_app.config["UPLOAD_FOLDER"], filename)
