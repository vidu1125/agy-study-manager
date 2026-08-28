"""
services/dashboard_service.py — Aggregation service cho Dashboard & Báo cáo tuần.

Single Responsibility: tổng hợp dữ liệu từ nhiều domain để phục vụ dashboard view.
Gọi các service khác thay vì trực tiếp query DB.
"""
import datetime

from models import Deadline, NhatKyThoiGian, MucTieu
from config import get_ntfy_topic
from services.nhat_ky_service import NhatKyService
from services.deadline_service import DeadlineService
from services.tai_lieu_service import TaiLieuService


def get_dashboard_data() -> dict:
    """UC17 — Tổng hợp toàn bộ dữ liệu cần cho trang dashboard."""
    today = datetime.date.today()
    next_7_days = today + datetime.timedelta(days=7)
    priority_order = {"Cao": 1, "Trung_binh": 2, "Thap": 3}

    active_deadlines = Deadline.query.filter(Deadline.trang_thai != "Hoan_thanh").all()
    deadlines_7_days = sorted(
        [d for d in active_deadlines if d.han_nop <= next_7_days],
        key=lambda d: (priority_order.get(d.do_uu_tien, 2), d.han_nop),
    )

    week_start = today - datetime.timedelta(days=7)
    hours_this_week = round(
        sum(l.gio_thuc_te for l in NhatKyThoiGian.query.filter(NhatKyThoiGian.ngay >= week_start).all()),
        1,
    )

    subject_overdue: dict = {}
    for d in Deadline.query.filter(Deadline.trang_thai == "Tre_han").all():
        mon_name = d.mon_hoc.ten_mon if d.mon_hoc else "Không xác định"
        subject_overdue[mon_name] = subject_overdue.get(mon_name, 0) + 1

    active_goals = MucTieu.query.filter(MucTieu.trang_thai != "Tam_dung").all()

    return {
        "status": "success",
        "ntfy_topic": get_ntfy_topic(),
        "metrics": {
            "upcoming_deadlines_count": len(deadlines_7_days),
            "streak_days": NhatKyService.calculate_streak(),
            "weekly_hours": hours_this_week,
        },
        "upcoming_deadlines": [d.to_dict() for d in deadlines_7_days],
        "overload_alerts": DeadlineService.check_overload_warning(),
        "deadline_reminders": DeadlineService.check_deadline_reminders(),
        "missing_log_reminders": NhatKyService.check_missing_time_logs(),
        "spaced_repetition": TaiLieuService.check_spaced_repetition(),
        "subject_overdue_counts": subject_overdue,
        "goals": [g.to_dict() for g in active_goals],
    }


def generate_weekly_report() -> dict:
    """UC16 — Tạo báo cáo học tập tổng kết 7 ngày qua."""
    today = datetime.date.today()
    week_start = today - datetime.timedelta(days=7)

    completed_deadlines = Deadline.query.filter(Deadline.trang_thai == "Hoan_thanh").all()
    logs_this_week = NhatKyThoiGian.query.filter(NhatKyThoiGian.ngay >= week_start).all()
    total_hours = sum(l.gio_thuc_te for l in logs_this_week)

    subject_overdue: dict = {}
    for d in Deadline.query.filter(Deadline.trang_thai == "Tre_han").all():
        mon_name = d.mon_hoc.ten_mon if d.mon_hoc else "Không xác định"
        subject_overdue[mon_name] = subject_overdue.get(mon_name, 0) + 1

    most_overdue = (
        max(subject_overdue.items(), key=lambda x: x[1])
        if subject_overdue
        else (None, 0)
    )

    return {
        "week_range": f"{week_start.strftime('%d/%m')} - {today.strftime('%d/%m/%Y')}",
        "completed_count": len(completed_deadlines),
        "total_study_hours": round(total_hours, 1),
        "most_overdue_subject": most_overdue[0],
        "most_overdue_count": most_overdue[1],
        "subject_overdue_counts": subject_overdue,
    }
