"""
services/mon_hoc_service.py — Business logic cho MonHoc (UC01, UC02, UC03).

Single Responsibility: xử lý tất cả nghiệp vụ liên quan đến môn học.
Không phụ thuộc vào Flask request/response.
"""
import datetime

from models import db, MonHoc, MucTieu


class MonHocService:

    @staticmethod
    def get_all() -> list[dict]:
        return [m.to_dict() for m in MonHoc.query.all()]

    @staticmethod
    def create(data: dict) -> tuple[dict, dict | None]:
        """
        Tạo môn học mới. Tuỳ chọn tự động tạo MucTieu cho môn tự học.
        Returns: (mon_dict, goal_dict | None)
        Raises: ValueError nếu dữ liệu không hợp lệ.
        """
        ma_mon = data.get("ma_mon", "").strip()
        ten_mon = data.get("ten_mon", "").strip()
        loai_mon = data.get("loai_mon", "Truong")

        if not ma_mon or not ten_mon:
            raise ValueError("Mã môn và tên môn không được để trống")
        if MonHoc.query.get(ma_mon):
            raise ValueError(f"Mã môn '{ma_mon}' đã tồn tại")

        giang_vien = data.get("giang_vien") if loai_mon == "Truong" else None
        so_tin_chi = (
            int(data.get("so_tin_chi", 0))
            if (loai_mon == "Truong" and data.get("so_tin_chi"))
            else None
        )
        nguon_hoc = data.get("nguon_hoc") if loai_mon == "Tu_hoc" else None

        if loai_mon == "Truong" and (not giang_vien or so_tin_chi is None):
            raise ValueError("Môn thuộc trường bắt buộc điền Giảng viên và Số tín chỉ")
        if loai_mon == "Tu_hoc" and not nguon_hoc:
            raise ValueError("Môn tự học bắt buộc điền Nguồn học")

        mon = MonHoc(
            ma_mon=ma_mon,
            ten_mon=ten_mon,
            loai_mon=loai_mon,
            giang_vien=giang_vien,
            so_tin_chi=so_tin_chi,
            nguon_hoc=nguon_hoc,
            muc_do_uu_tien=data.get("muc_do_uu_tien", "Trung_binh"),
            trang_thai="Dang_hoc",
        )
        db.session.add(mon)

        # Tự động tạo MucTieu dài hạn khi tạo môn tự học (nếu user yêu cầu)
        created_goal: dict | None = None
        if loai_mon == "Tu_hoc" and data.get("tao_muc_tieu_tuong_ung"):
            goal = MucTieu(
                ma_muc_tieu=f"MT-{ma_mon}",
                ma_mon=ma_mon,
                ten_muc_tieu=f"Hoàn thành môn tự học: {ten_mon}",
                loai_muc_tieu="Dai_han",
                ngay_bat_dau=datetime.date.today(),
                thoi_han=datetime.date.today() + datetime.timedelta(days=90),
                cac_buoc_hanh_dong=f"Nguồn học: {nguon_hoc}. Học và làm bài tập theo lộ trình.",
                tien_do_phan_tram=0,
                trang_thai="Dang_thuc_hien",
            )
            db.session.add(goal)
            created_goal = goal.to_dict()

        db.session.commit()
        return mon.to_dict(), created_goal

    @staticmethod
    def update(ma_mon: str, data: dict) -> dict:
        """Raises: LookupError nếu không tìm thấy môn."""
        mon = MonHoc.query.get(ma_mon)
        if not mon:
            raise LookupError("Không tìm thấy môn học")

        mon.ten_mon = data.get("ten_mon", mon.ten_mon)
        mon.muc_do_uu_tien = data.get("muc_do_uu_tien", mon.muc_do_uu_tien)
        mon.trang_thai = data.get("trang_thai", mon.trang_thai)

        if mon.loai_mon == "Truong":
            mon.giang_vien = data.get("giang_vien", mon.giang_vien)
            if "so_tin_chi" in data:
                mon.so_tin_chi = int(data["so_tin_chi"])
        else:
            mon.nguon_hoc = data.get("nguon_hoc", mon.nguon_hoc)

        db.session.commit()
        return mon.to_dict()

    @staticmethod
    def soft_delete(ma_mon: str) -> None:
        """Soft-delete: chuyển trang_thai → Da_xong thay vì xoá thật."""
        mon = MonHoc.query.get(ma_mon)
        if not mon:
            raise LookupError("Không tìm thấy môn học")
        mon.trang_thai = "Da_xong"
        db.session.commit()
