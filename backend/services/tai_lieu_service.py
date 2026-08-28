"""
services/tai_lieu_service.py — Business logic cho TaiLieu (UC09, UC10).

Single Responsibility: quản lý tài liệu học + phân tích Spaced Repetition.
"""
import datetime

from models import db, TaiLieu

_SPACED_MILESTONES = [1, 3, 7, 14, 30]


class TaiLieuService:

    @staticmethod
    def get_all() -> list[dict]:
        return [m.to_dict() for m in TaiLieu.query.all()]

    @staticmethod
    def create(data: dict) -> dict:
        ma_mon = data.get("ma_mon")
        ten_tai_lieu = data.get("ten_tai_lieu", "").strip()
        if not ma_mon or not ten_tai_lieu:
            raise ValueError("Môn học và Tên tài liệu là bắt buộc")

        existing_count = TaiLieu.query.filter_by(ma_mon=ma_mon).count()
        ma_tai_lieu = data.get("ma_tai_lieu") or f"{ma_mon}-TL{existing_count + 1:02d}"
        link = data.get("link", "").strip()

        material = TaiLieu(
            ma_tai_lieu=ma_tai_lieu,
            ma_mon=ma_mon,
            ten_tai_lieu=ten_tai_lieu,
            loai_tai_lieu=data.get("loai_tai_lieu", "Slide"),
            link=link if link else None,
            ngay_them=datetime.date.today(),
        )
        db.session.add(material)
        db.session.commit()
        return material.to_dict()

    @staticmethod
    def delete(ma_tai_lieu: str) -> None:
        material = TaiLieu.query.get(ma_tai_lieu)
        if not material:
            raise LookupError("Không tìm thấy tài liệu")
        db.session.delete(material)
        db.session.commit()

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
