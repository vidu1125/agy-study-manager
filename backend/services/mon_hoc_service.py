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

        if "ten_mon" in data:
            ten_mon = (data.get("ten_mon") or "").strip()
            if not ten_mon:
                raise ValueError("Tên môn học không được để trống")
            mon.ten_mon = ten_mon

        if "muc_do_uu_tien" in data:
            muc_do_uu_tien = data["muc_do_uu_tien"]
            if muc_do_uu_tien not in {"Cao", "Trung_binh", "Thap"}:
                raise ValueError("Mức độ ưu tiên không hợp lệ")
            mon.muc_do_uu_tien = muc_do_uu_tien

        if "trang_thai" in data:
            trang_thai = data["trang_thai"]
            if trang_thai not in {"Dang_hoc", "Da_xong"}:
                raise ValueError("Trạng thái môn học không hợp lệ")
            mon.trang_thai = trang_thai

        if mon.loai_mon == "Truong":
            if "giang_vien" in data:
                giang_vien = (data.get("giang_vien") or "").strip()
                if not giang_vien:
                    raise ValueError("Môn thuộc trường bắt buộc điền Giảng viên")
                mon.giang_vien = giang_vien
            if "so_tin_chi" in data:
                try:
                    so_tin_chi = int(data["so_tin_chi"])
                except (TypeError, ValueError) as error:
                    raise ValueError("Số tín chỉ phải là số nguyên") from error
                if not 1 <= so_tin_chi <= 10:
                    raise ValueError("Số tín chỉ phải từ 1 đến 10")
                mon.so_tin_chi = so_tin_chi
        else:
            if "nguon_hoc" in data:
                nguon_hoc = (data.get("nguon_hoc") or "").strip()
                if not nguon_hoc:
                    raise ValueError("Môn tự học bắt buộc điền Nguồn học")
                mon.nguon_hoc = nguon_hoc

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
