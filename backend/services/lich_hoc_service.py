"""
services/lich_hoc_service.py — Business logic cho LichHoc & Calendar (UC19–UC26).

Single Responsibility: quản lý lịch học + phát hiện xung đột + tạo calendar view.
"""
import datetime

from models import db, LichHoc, MonHoc, Deadline

_WEEKDAY_MAP = {0: "T2", 1: "T3", 2: "T4", 3: "T5", 4: "T6", 5: "T7", 6: "CN"}


class LichHocService:

    @staticmethod
    def get_all() -> list[dict]:
        return [i.to_dict() for i in LichHocService._visible_items()]

    @staticmethod
    def _visible_items() -> list[LichHoc]:
        """Ẩn lịch của môn đã xong, nhưng vẫn giữ lịch sử trong cơ sở dữ liệu."""
        return [
            item for item in LichHoc.query.all()
            if not item.ma_mon or (item.mon_hoc and item.mon_hoc.trang_thai == "Dang_hoc")
        ]

    @staticmethod
    def _get_active_subject(ma_mon: str | None):
        if not ma_mon:
            return None
        mon = MonHoc.query.get(ma_mon)
        if not mon:
            raise ValueError("Không tìm thấy môn học được chọn")
        if mon.trang_thai != "Dang_hoc":
            raise ValueError("Môn học này đã hoàn thành; không thể thêm lịch mới")
        return mon

    @staticmethod
    def _validate_time_range(gio_bat_dau: str | None, gio_ket_thuc: str | None) -> None:
        if not gio_bat_dau or not gio_ket_thuc:
            raise ValueError("Giờ bắt đầu và Giờ kết thúc là bắt buộc")
        try:
            start = datetime.datetime.strptime(gio_bat_dau, "%H:%M").time()
            end = datetime.datetime.strptime(gio_ket_thuc, "%H:%M").time()
        except ValueError as error:
            raise ValueError("Định dạng giờ không hợp lệ") from error
        if start >= end:
            raise ValueError("Giờ kết thúc phải sau giờ bắt đầu")

    @staticmethod
    def create(data: dict) -> dict:
        """
        UC20/UC23 — Tạo lịch học. Tự động detect conflict (UC25).
        Returns dict; nếu có conflict và force=False thì trả về {'conflict': True, ...}.
        """
        loai_su_kien = data.get("loai_su_kien", "Lich_hoc_co_dinh")
        lap_lai = data.get("lap_lai", True) if loai_su_kien == "Lich_hoc_co_dinh" else False
        thu_trong_tuan = data.get("thu_trong_tuan")
        ngay_cu_the_str = data.get("ngay_cu_the")
        gio_bat_dau = data.get("gio_bat_dau")
        gio_ket_thuc = data.get("gio_ket_thuc")

        LichHocService._validate_time_range(gio_bat_dau, gio_ket_thuc)
        if lap_lai and not thu_trong_tuan:
            raise ValueError("Thứ trong tuần là bắt buộc đối với lịch học lặp lại")
        if not lap_lai and not ngay_cu_the_str:
            raise ValueError("Ngày cụ thể là bắt buộc đối với sự kiện một lần")

        ngay_cu_the = (
            datetime.datetime.strptime(ngay_cu_the_str, "%Y-%m-%d").date()
            if ngay_cu_the_str
            else None
        )

        # UC25: Conflict detection
        if not data.get("force", False):
            conflict = LichHocService._detect_conflict(
                lap_lai, thu_trong_tuan, ngay_cu_the, gio_bat_dau, gio_ket_thuc
            )
            if conflict:
                return {
                    "conflict": True,
                    "conflict_item": conflict.to_dict(),
                    "message": (
                        f"⚠ Trùng giờ với '{conflict.ten_hien_thi}' "
                        f"({conflict.gio_bat_dau} - {conflict.gio_ket_thuc}). "
                        "Bạn có chắc muốn vẫn lưu?"
                    ),
                }

        mon = LichHocService._get_active_subject(data.get("ma_mon") or None)

        item = LichHoc(
            ma_lich=f"LH-{datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')}",
            ma_mon=data.get("ma_mon") or None,
            loai_su_kien=loai_su_kien,
            lap_lai=lap_lai,
            thu_trong_tuan=thu_trong_tuan,
            ngay_cu_the=ngay_cu_the,
            gio_bat_dau=gio_bat_dau,
            gio_ket_thuc=gio_ket_thuc,
            hinh_thuc=data.get("hinh_thuc", "Offline"),
            dia_diem=data.get("dia_diem", ""),
            ten_su_kien=(data.get("ten_su_kien") or "").strip() or (mon.ten_mon if mon else "Buổi học"),
            ngay_bat_dau_ap_dung=(
                datetime.datetime.strptime(data["ngay_bat_dau_ap_dung"], "%Y-%m-%d").date()
                if data.get("ngay_bat_dau_ap_dung") else None
            ),
            ngay_ket_thuc_ap_dung=(
                datetime.datetime.strptime(data["ngay_ket_thuc_ap_dung"], "%Y-%m-%d").date()
                if data.get("ngay_ket_thuc_ap_dung") else None
            ),
            ghi_chu=data.get("ghi_chu", ""),
        )
        db.session.add(item)
        db.session.commit()
        return {"lich_hoc": item.to_dict()}

    @staticmethod
    def create_weekly_batch(data: dict) -> dict:
        """Tạo nhiều buổi học lặp lại hàng tuần bằng một lần lưu."""
        if data.get("loai_su_kien", "Lich_hoc_co_dinh") != "Lich_hoc_co_dinh":
            raise ValueError("Chỉ lịch học lặp lại hàng tuần mới có thể tạo theo nhiều ngày")

        days = list(dict.fromkeys(data.get("thu_trong_tuan_list") or []))
        valid_days = set(_WEEKDAY_MAP.values())
        if not days or any(day not in valid_days for day in days):
            raise ValueError("Hãy chọn ít nhất một ngày hợp lệ trong tuần")

        LichHocService._validate_time_range(data.get("gio_bat_dau"), data.get("gio_ket_thuc"))
        mon = LichHocService._get_active_subject(data.get("ma_mon") or None)
        custom_title = (data.get("ten_su_kien") or "").strip()
        if not mon and not custom_title:
            raise ValueError("Chọn môn học hoặc nhập tên buổi học")

        if not data.get("force", False):
            for day in days:
                conflict = LichHocService._detect_conflict(
                    True, day, None, data["gio_bat_dau"], data["gio_ket_thuc"]
                )
                if conflict:
                    return {
                        "conflict": True,
                        "conflict_item": conflict.to_dict(),
                        "message": (
                            f"⚠ Trùng giờ với '{conflict.ten_hien_thi}' vào {day} "
                            f"({conflict.gio_bat_dau} - {conflict.gio_ket_thuc}). "
                            "Bạn có chắc muốn vẫn lưu?"
                        ),
                    }

        timestamp = datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')
        items = [
            LichHoc(
                ma_lich=f"LH-{timestamp}-{index}",
                ma_mon=data.get("ma_mon") or None,
                loai_su_kien="Lich_hoc_co_dinh",
                lap_lai=True,
                thu_trong_tuan=day,
                gio_bat_dau=data["gio_bat_dau"],
                gio_ket_thuc=data["gio_ket_thuc"],
                hinh_thuc=data.get("hinh_thuc", "Offline"),
                dia_diem=(data.get("dia_diem") or "").strip(),
                ten_su_kien=custom_title or mon.ten_mon,
                ghi_chu=(data.get("ghi_chu") or "").strip(),
            )
            for index, day in enumerate(days, start=1)
        ]
        db.session.add_all(items)
        db.session.commit()
        return {"lich_hocs": [item.to_dict() for item in items]}

    @staticmethod
    def _detect_conflict(
        lap_lai: bool,
        thu_trong_tuan: str | None,
        ngay_cu_the,
        gio_bat_dau: str,
        gio_ket_thuc: str,
    ):
        """Trả về LichHoc đầu tiên bị trùng giờ, hoặc None."""
        for lh in LichHocService._visible_items():
            same_day = False
            if lap_lai and lh.lap_lai and lh.thu_trong_tuan == thu_trong_tuan:
                same_day = True
            elif not lap_lai and not lh.lap_lai and lh.ngay_cu_the == ngay_cu_the:
                same_day = True
            elif lap_lai and not lh.lap_lai and lh.ngay_cu_the:
                if _WEEKDAY_MAP.get(lh.ngay_cu_the.weekday()) == thu_trong_tuan:
                    same_day = True
            elif not lap_lai and lh.lap_lai and ngay_cu_the:
                if lh.thu_trong_tuan == _WEEKDAY_MAP.get(ngay_cu_the.weekday()):
                    same_day = True

            if same_day and (gio_bat_dau < lh.gio_ket_thuc) and (gio_ket_thuc > lh.gio_bat_dau):
                return lh
        return None

    @staticmethod
    def update(ma_lich: str, data: dict) -> dict:
        item = LichHoc.query.get(ma_lich)
        if not item:
            raise LookupError("Không tìm thấy lịch học")
        item.gio_bat_dau = data.get("gio_bat_dau", item.gio_bat_dau)
        item.gio_ket_thuc = data.get("gio_ket_thuc", item.gio_ket_thuc)
        item.hinh_thuc = data.get("hinh_thuc", item.hinh_thuc)
        item.dia_diem = data.get("dia_diem", item.dia_diem)
        item.ten_su_kien = data.get("ten_su_kien", item.ten_su_kien)
        item.ghi_chu = data.get("ghi_chu", item.ghi_chu)
        db.session.commit()
        return item.to_dict()

    @staticmethod
    def delete(ma_lich: str) -> None:
        item = LichHoc.query.get(ma_lich)
        if not item:
            raise LookupError("Không tìm thấy lịch học")
        db.session.delete(item)
        db.session.commit()

    @staticmethod
    def get_calendar_view(start_str: str | None, end_str: str | None) -> dict:
        """UC21/UC24 — Overlay calendar view: lịch học + deadline theo ngày."""
        if not start_str or not end_str:
            today = datetime.date.today()
            start_date = today - datetime.timedelta(days=today.weekday())
            end_date = start_date + datetime.timedelta(days=6)
        else:
            start_date = datetime.datetime.strptime(start_str, "%Y-%m-%d").date()
            end_date = datetime.datetime.strptime(end_str, "%Y-%m-%d").date()

        lich_hocs = LichHocService._visible_items()
        deadlines = Deadline.query.filter(
            Deadline.han_nop >= start_date,
            Deadline.han_nop <= end_date,
            Deadline.trang_thai != "Hoan_thanh",
        ).all()

        calendar_days: dict = {}
        curr = start_date
        while curr <= end_date:
            d_str = curr.strftime("%Y-%m-%d")
            thu = _WEEKDAY_MAP[curr.weekday()]
            day_items: list = []
            pin_points: list = []

            for lh in lich_hocs:
                matches = False
                if lh.lap_lai and lh.thu_trong_tuan == thu:
                    if (not lh.ngay_bat_dau_ap_dung or lh.ngay_bat_dau_ap_dung <= curr) and \
                       (not lh.ngay_ket_thuc_ap_dung or lh.ngay_ket_thuc_ap_dung >= curr):
                        matches = True
                elif not lh.lap_lai and lh.ngay_cu_the == curr:
                    matches = True

                if matches:
                    item_dict = lh.to_dict()
                    item_dict["date"] = d_str
                    day_items.append(item_dict)
                    color = "#2563EB" if lh.loai_su_kien == "Lich_hoc_co_dinh" else "#7C3AED"
                    pin_points.append({
                        "type": "Lich_hoc", "color": color,
                        "title": lh.ten_hien_thi, "time": f"{lh.gio_bat_dau} - {lh.gio_ket_thuc}",
                    })

            for dl in deadlines:
                if dl.han_nop == curr:
                    dl_dict = dl.to_dict()
                    dl_dict["is_deadline"] = True
                    day_items.append(dl_dict)
                    color = "#EF4444" if dl.do_uu_tien == "Cao" else "#F59E0B"
                    pin_points.append({
                        "type": "Deadline", "color": color,
                        "title": f"Deadline: {dl.ten_bai_tap}", "priority": dl.do_uu_tien,
                    })

            calendar_days[d_str] = {
                "date": d_str, "weekday": thu,
                "items": day_items, "pin_points": pin_points,
            }
            curr += datetime.timedelta(days=1)

        return {
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d"),
            "days": calendar_days,
        }
