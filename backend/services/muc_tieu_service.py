"""
services/muc_tieu_service.py — Business logic cho MucTieu.

Single Responsibility: quản lý mục tiêu học tập.
"""
import datetime

from models import db, MucTieu


class MucTieuService:

    @staticmethod
    def get_all() -> list[dict]:
        return [g.to_dict() for g in MucTieu.query.all()]

    @staticmethod
    def create(data: dict) -> dict:
        ten_muc_tieu = data.get("ten_muc_tieu", "").strip()
        if not ten_muc_tieu:
            raise ValueError("Tên mục tiêu không được để trống")

        existing_count = MucTieu.query.count()
        goal = MucTieu(
            ma_muc_tieu=f"MT-{existing_count + 1:03d}",
            ma_mon=data.get("ma_mon") or None,
            ten_muc_tieu=ten_muc_tieu,
            loai_muc_tieu=data.get("loai_muc_tieu", "Dai_han"),
            ngay_bat_dau=(
                datetime.datetime.strptime(data["ngay_bat_dau"], "%Y-%m-%d").date()
                if data.get("ngay_bat_dau")
                else datetime.date.today()
            ),
            thoi_han=(
                datetime.datetime.strptime(data["thoi_han"], "%Y-%m-%d").date()
                if data.get("thoi_han")
                else None
            ),
            cac_buoc_hanh_dong=data.get("cac_buoc_hanh_dong", ""),
            tien_do_phan_tram=int(data.get("tien_do_phan_tram", 0)),
            trang_thai="Dang_thuc_hien",
        )
        db.session.add(goal)
        db.session.commit()
        return goal.to_dict()

    @staticmethod
    def update(ma_muc_tieu: str, data: dict) -> dict:
        goal = MucTieu.query.get(ma_muc_tieu)
        if not goal:
            raise LookupError("Không tìm thấy mục tiêu")
        goal.ten_muc_tieu = data.get("ten_muc_tieu", goal.ten_muc_tieu)
        goal.tien_do_phan_tram = int(data.get("tien_do_phan_tram", goal.tien_do_phan_tram))
        goal.trang_thai = data.get("trang_thai", goal.trang_thai)
        db.session.commit()
        return goal.to_dict()
