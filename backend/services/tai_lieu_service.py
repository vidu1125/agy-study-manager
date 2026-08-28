"""
services/tai_lieu_service.py — Business logic cho TaiLieu (UC09, UC10).

Single Responsibility: quản lý tài liệu học + phân tích Spaced Repetition.
"""
import datetime
import os
from pathlib import Path
from urllib.parse import urlparse
from uuid import uuid4

from werkzeug.datastructures import FileStorage
from werkzeug.utils import secure_filename

from models import db, MonHoc, TaiLieu

_SPACED_MILESTONES = [1, 3, 7, 14, 30]
_ALLOWED_UPLOAD_EXTENSIONS = {
    ".pdf", ".doc", ".docx", ".ppt", ".pptx", ".xls", ".xlsx",
    ".txt", ".md", ".csv", ".png", ".jpg", ".jpeg", ".webp",
}
_FILE_TYPE_BY_EXTENSION = {
    ".pdf": "PDF",
    ".doc": "Word",
    ".docx": "Word",
    ".ppt": "PowerPoint",
    ".pptx": "PowerPoint",
    ".xls": "Excel",
    ".xlsx": "Excel",
    ".txt": "Van_ban",
    ".md": "Van_ban",
    ".csv": "Excel",
    ".png": "Hinh_anh",
    ".jpg": "Hinh_anh",
    ".jpeg": "Hinh_anh",
    ".webp": "Hinh_anh",
}


class TaiLieuService:

    @staticmethod
    def get_all() -> list[dict]:
        return [m.to_dict() for m in TaiLieu.query.all()]

    @staticmethod
    def create(
        data: dict,
        uploaded_file: FileStorage | None = None,
        upload_dir: str | None = None,
    ) -> dict:
        ma_mon = (data.get("ma_mon") or "").strip() or None
        ten_tai_lieu = data.get("ten_tai_lieu", "").strip()
        if not ten_tai_lieu:
            raise ValueError("Tên tài liệu là bắt buộc")
        if ma_mon and not MonHoc.query.get(ma_mon):
            raise ValueError("Môn học được chọn không tồn tại")

        link = TaiLieuService._validate_external_link(data.get("link", ""))
        stored_file_path: str | None = None
        try:
            if uploaded_file and uploaded_file.filename:
                if link:
                    raise ValueError("Chỉ chọn một nguồn: link hoặc tệp tải lên")
                if not upload_dir:
                    raise ValueError("Thư mục lưu tệp chưa được cấu hình")
                link, stored_file_path = TaiLieuService._save_upload(uploaded_file, upload_dir)

            prefix = ma_mon or "CHUNG"
            ma_tai_lieu = data.get("ma_tai_lieu") or TaiLieuService._next_material_id(prefix)
            loai_tai_lieu = TaiLieuService._resolve_material_type(
                data.get("loai_tai_lieu"), uploaded_file.filename if uploaded_file else "", link
            )

            material = TaiLieu(
                ma_tai_lieu=ma_tai_lieu,
                ma_mon=ma_mon,
                ten_tai_lieu=ten_tai_lieu,
                loai_tai_lieu=loai_tai_lieu,
                link=link or None,
                ngay_them=datetime.date.today(),
            )
            db.session.add(material)
            db.session.commit()
            return material.to_dict()
        except Exception:
            db.session.rollback()
            if stored_file_path:
                Path(stored_file_path).unlink(missing_ok=True)
            raise

    @staticmethod
    def delete(ma_tai_lieu: str) -> str | None:
        material = TaiLieu.query.get(ma_tai_lieu)
        if not material:
            raise LookupError("Không tìm thấy tài liệu")
        link = material.link
        db.session.delete(material)
        db.session.commit()
        return link

    @staticmethod
    def _next_material_id(prefix: str) -> str:
        sequence = 1
        while TaiLieu.query.get(f"{prefix}-TL{sequence:02d}"):
            sequence += 1
        return f"{prefix}-TL{sequence:02d}"

    @staticmethod
    def _validate_external_link(value: str | None) -> str:
        link = (value or "").strip()
        if not link:
            return ""
        parsed = urlparse(link)
        if parsed.scheme not in {"http", "https"} or not parsed.netloc:
            raise ValueError("Link tài liệu phải bắt đầu bằng http:// hoặc https://")
        if len(link) > 500:
            raise ValueError("Link tài liệu quá dài")
        return link

    @staticmethod
    def _save_upload(uploaded_file: FileStorage, upload_dir: str) -> tuple[str, str]:
        safe_name = secure_filename(uploaded_file.filename or "")
        extension = Path(safe_name).suffix.lower()
        if not safe_name or extension not in _ALLOWED_UPLOAD_EXTENSIONS:
            supported = ", ".join(sorted(_ALLOWED_UPLOAD_EXTENSIONS))
            raise ValueError(f"Định dạng tệp chưa hỗ trợ. Chỉ nhận: {supported}")

        os.makedirs(upload_dir, exist_ok=True)
        stored_name = f"{uuid4().hex}{extension}"
        stored_path = os.path.join(upload_dir, stored_name)
        uploaded_file.save(stored_path)
        return f"/uploads/{stored_name}", stored_path

    @staticmethod
    def _resolve_material_type(value: str | None, filename: str, link: str) -> str:
        selected_type = (value or "Tu_dong").strip()
        if selected_type and selected_type != "Tu_dong":
            return selected_type
        extension = Path(filename).suffix.lower()
        if extension in _FILE_TYPE_BY_EXTENSION:
            return _FILE_TYPE_BY_EXTENSION[extension]
        return "Link" if link else "Khac"

    @staticmethod
    def delete_stored_upload(link: str | None, upload_dir: str) -> None:
        """Xóa tệp do app quản lý; không động vào external URL."""
        if not link or not link.startswith("/uploads/"):
            return
        filename = os.path.basename(link)
        if filename != link.removeprefix("/uploads/"):
            return
        Path(upload_dir, filename).unlink(missing_ok=True)

    @staticmethod
    def check_spaced_repetition() -> list[dict]:
        """UC10 — Trả về danh sách tài liệu cần ôn tập theo Spaced Repetition."""
        today = datetime.date.today()
        suggestions = []
        for m in TaiLieu.query.all():
            days_added = (today - m.ngay_them).days
            if days_added in _SPACED_MILESTONES:
                mon_name = m.mon_hoc.ten_mon if m.mon_hoc else ""
                suggestions.append({
                    "type": "spaced_repetition",
                    "level": "info",
                    "material_id": m.ma_tai_lieu,
                    "material_name": m.ten_tai_lieu,
                    "mon_name": mon_name,
                    "days": days_added,
                    "message": (
                        f"🧠 Gợi ý Spaced Repetition ({days_added} ngày): "
                        f"Nên ôn lại tài liệu '{m.ten_tai_lieu}' ({mon_name})."
                    ),
                })
        return suggestions
