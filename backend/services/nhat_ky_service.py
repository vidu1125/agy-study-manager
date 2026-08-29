"""
services/nhat_ky_service.py — Business logic cho NhatKyThoiGian (UC11, UC12).

Single Responsibility: ghi nhật ký học tập + tính streak + kiểm tra thiếu log.
"""
import datetime
from collections import defaultdict

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
        if gio_thuc_te > 24:
            raise ValueError("Số giờ học trong một ngày không thể vượt quá 24 giờ")

        ngay_log = (
            datetime.datetime.strptime(data["ngay"], "%Y-%m-%d").date()
            if data.get("ngay")
            else datetime.date.today()
        )
        if ngay_log > datetime.date.today():
            raise ValueError("Không thể ghi nhận giờ học cho ngày trong tương lai")

        log_entry = NhatKyThoiGian(
            ma_log=f"LOG-{datetime.datetime.now().strftime('%Y%m%d%H%M%S%f')}",
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
    def get_study_summary(today: datetime.date | None = None) -> dict:
        """Tổng hợp chuỗi học và thời lượng từ các nhật ký đã ghi nhận."""
        today = today or datetime.date.today()
        logs = NhatKyThoiGian.query.order_by(NhatKyThoiGian.ngay.desc()).all()
        hours_by_date: dict[datetime.date, float] = defaultdict(float)
        for log in logs:
            if log.ngay and log.ngay <= today:
                hours_by_date[log.ngay] += float(log.gio_thuc_te or 0)

        study_dates = set(hours_by_date)
        week_start = today - datetime.timedelta(days=today.weekday())
        month_start = today.replace(day=1)
        week_activity = []
        for offset in range(6, -1, -1):
            day = today - datetime.timedelta(days=offset)
            week_activity.append({
                "date": day.isoformat(),
                "hours": round(hours_by_date.get(day, 0), 2),
                "is_today": day == today,
            })

        return {
            "today_hours": round(hours_by_date.get(today, 0), 2),
            "week_hours": round(sum(hours for day, hours in hours_by_date.items() if day >= week_start), 2),
            "month_hours": round(sum(hours for day, hours in hours_by_date.items() if day >= month_start), 2),
            "total_hours": round(sum(hours_by_date.values()), 2),
            "active_days_week": sum(1 for day in study_dates if day >= week_start),
            "current_streak": NhatKyService._current_streak(study_dates, today),
            "longest_streak": NhatKyService._longest_streak(study_dates),
            "studied_today": today in study_dates,
            "last_study_date": max(study_dates).isoformat() if study_dates else None,
            "week_activity": week_activity,
        }

    @staticmethod
    def _current_streak(study_dates: set[datetime.date], today: datetime.date) -> int:
        if not study_dates:
            return 0
        check_date = today if today in study_dates else today - datetime.timedelta(days=1)
        if check_date not in study_dates:
            return 0
        streak = 0
        while check_date in study_dates:
            streak += 1
            check_date -= datetime.timedelta(days=1)
        return streak

    @staticmethod
    def _longest_streak(study_dates: set[datetime.date]) -> int:
        longest = 0
        running = 0
        previous = None
        for day in sorted(study_dates):
            running = running + 1 if previous and (day - previous).days == 1 else 1
            longest = max(longest, running)
            previous = day
        return longest

    @staticmethod
    def calculate_streak() -> int:
        """UC12 — Tính số ngày học liên tiếp, tính cả ngày hôm qua nếu hôm nay chưa học."""
        return NhatKyService.get_study_summary()["current_streak"]

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
