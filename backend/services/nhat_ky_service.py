"""
services/nhat_ky_service.py — Business logic cho NhatKyThoiGian (UC11, UC12).

Single Responsibility: ghi nhật ký học tập + tính streak + kiểm tra thiếu log.
"""
import datetime

from models import db, NhatKyThoiGian, Deadline


class NhatKyService:

    @staticmethod
    def get_all() -> list[dict]:
        logs = NhatKyThoiGian.query.order_by(NhatKyThoiGian.ngay.desc()).all()
        return [l.to_dict() for l in logs]

    @staticmethod
    def create(data: dict) -> tuple[dict, int]:
        """
        Tạo bản ghi nhật ký thời gian học.
        Returns: (log_dict, streak_count)
        Raises: ValueError nếu dữ liệu không hợp lệ.
        """
        ma_bai_tap = data.get("ma_bai_tap")
        gio_thuc_te_val = data.get("gio_thuc_te")

        if not ma_bai_tap or gio_thuc_te_val is None:
            raise ValueError("Nhiệm vụ liên quan và Số giờ đã học là bắt buộc")

        try:
            gio_thuc_te = float(gio_thuc_te_val)
            if gio_thuc_te <= 0:
                raise ValueError()
        except (ValueError, TypeError):
            raise ValueError("Số giờ đã học phải là số dương hợp lệ")

        ngay_log = (
            datetime.datetime.strptime(data["ngay"], "%Y-%m-%d").date()
            if data.get("ngay")
            else datetime.date.today()
        )

        log_entry = NhatKyThoiGian(
            ma_log=f"LOG-{int(datetime.datetime.now().timestamp())}",
            ma_bai_tap=ma_bai_tap,
            ngay=ngay_log,
            gio_thuc_te=gio_thuc_te,
            muc_do_tap_trung=data.get("muc_do_tap_trung", "Tot"),
            ghi_chu=data.get("ghi_chu", ""),
        )
        db.session.add(log_entry)
        db.session.commit()

        return log_entry.to_dict(), NhatKyService.calculate_streak()

    @staticmethod
    def calculate_streak() -> int:
        """UC12 — Tính số ngày học liên tiếp (streak) tính tới hôm nay."""
        logs = NhatKyThoiGian.query.order_by(NhatKyThoiGian.ngay.desc()).all()
        if not logs:
            return 0

        unique_dates = sorted(set(log.ngay for log in logs), reverse=True)
        today = datetime.date.today()
        streak = 0
        check_date = today

        # Nếu ngày gần nhất không phải hôm nay và đã qua 1 ngày → streak = 0
        if unique_dates and unique_dates[0] < today:
            if (today - unique_dates[0]).days > 1:
                return 0
            check_date = unique_dates[0]

        for d in unique_dates:
            if d == check_date:
                streak += 1
                check_date -= datetime.timedelta(days=1)
            elif d < check_date:
                break  # chuỗi bị đứt
        return streak

    @staticmethod
    def check_missing_time_logs() -> list[dict]:
        """Trả về danh sách deadline đang làm mà chưa ghi log thời gian đủ lâu."""
        today = datetime.date.today()
        reminders = []
        for d in Deadline.query.filter_by(trang_thai="Dang_lam").all():
            last_log = (
                NhatKyThoiGian.query
                .filter_by(ma_bai_tap=d.ma_bai_tap)
                .order_by(NhatKyThoiGian.ngay.desc())
                .first()
            )
            days_since = (today - last_log.ngay).days if last_log else 999
            threshold = 2 if d.nguoi_dat_han == "Tu_dat" else 3
            if days_since >= threshold:
                reminders.append({
                    "type": "missing_log",
                    "level": "warning",
                    "message": (
                        f"📝 Bạn chưa ghi nhận giờ học cho '{d.ten_bai_tap}' "
                        f"trong {days_since} ngày qua. Hãy cập nhật tiến độ nhé!"
                    ),
                })
        return reminders
