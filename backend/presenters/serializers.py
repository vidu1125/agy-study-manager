"""
presenters/serializers.py — MVP Presenter layer.

Chứa các hàm serialize phức tạp hoặc cần transform đặc biệt.
Các serialize đơn giản vẫn dùng model.to_dict() trực tiếp.
Thêm serializer mới tại đây khi cần format response khác biệt.
"""
import datetime
from models import Deadline, NhatKyThoiGian


def serialize_deadline_with_status(dl: Deadline) -> dict:
    """
    Serialize deadline với status được tính toán động.
    Dùng khi cần hiển thị status 'Tre_han' tự động dù DB chưa update.
    """
    d = dl.to_dict()
    if d["trang_thai"] not in ["Hoan_thanh"] and d["so_ngay_con_lai"] < 0:
        d["trang_thai"] = "Tre_han"
    return d


def serialize_time_summary(logs: list[NhatKyThoiGian]) -> dict:
    """Tổng hợp thống kê thời gian học từ danh sách log."""
    total_hours = round(sum(l.gio_thuc_te for l in logs), 2)
    focus_distribution = {}
    for log in logs:
        key = log.muc_do_tap_trung
        focus_distribution[key] = focus_distribution.get(key, 0) + log.gio_thuc_te

    by_date: dict = {}
    for log in logs:
        date_key = log.ngay.strftime("%Y-%m-%d") if log.ngay else "unknown"
        by_date[date_key] = round(by_date.get(date_key, 0) + log.gio_thuc_te, 2)

    return {
        "total_hours": total_hours,
        "focus_distribution": {k: round(v, 2) for k, v in focus_distribution.items()},
        "by_date": by_date,
        "log_count": len(logs),
    }
