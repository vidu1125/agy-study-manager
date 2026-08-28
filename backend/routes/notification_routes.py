"""
routes/notification_routes.py — Flask Blueprint cho Notification & Debug API.
"""
import os

from flask import Blueprint, jsonify, request
from models import LogLoi
from config import get_ntfy_topic
from notifications.ntfy_client import gui_thong_bao
from services.deadline_service import DeadlineService
import notifications.notification_jobs as jobs

bp = Blueprint("notifications", __name__)


@bp.route("/api/test_notification", methods=["POST"])
def test_notification():
    """Gửi thông báo test tới điện thoại."""
    data = request.get_json(silent=True) or {}
    default_content = (
        "─────────────────────\n"
        "Hệ thống  : AGY STUDY Manager\n"
        "Trạng thái: Kết nối thành công\n"
        "Kênh nhận : ntfy.sh\n"
        "─────────────────────\n"
        "-> Bạn sẽ nhận được các nhắc nhở deadline và học tập tại đây."
    )
    success, message = gui_thong_bao(
        noi_dung=data.get("noi_dung", default_content),
        tieu_de=data.get("tieu_de", "KẾT NỐI THÀNH CÔNG - AGY STUDY"),
        uu_tien=data.get("uu_tien", "high"),
        tags=data.get("tags", "bell,rocket"),
    )
    status_code = 200 if success else 500
    return jsonify({"status": "success" if success else "error", "message": message, "topic": get_ntfy_topic()}), status_code


@bp.route("/api/trigger_uc_notification/<uc_name>", methods=["POST"])
def trigger_uc_notification(uc_name):
    """Kích hoạt thủ công từng scheduled job để test."""
    uc_map = {
        "uc13": ("UC13 Nhắc Deadline",        jobs.nhac_deadline),
        "uc14": ("UC14 Nhắc Nhập Liệu",       jobs.nhac_nhap_lieu),
        "uc15": ("UC15 Cảnh Báo Quá Tải",     jobs.canh_bao_qua_tai),
        "uc16": ("UC16 Báo Cáo Tuần",         jobs.bao_cao_tuan),
        "uc10": ("UC10 Spaced Repetition",    jobs.nhac_on_tap),
    }
    if uc_name not in uc_map:
        return jsonify({"error": "UC không hợp lệ (hỗ trợ: uc10, uc13, uc14, uc15, uc16)"}), 400

    title, fn = uc_map[uc_name]
    count = fn()
    return jsonify({
        "status": "success",
        "message": f"Đã chạy {title}. Số thông báo được gửi: {count}",
        "topic": get_ntfy_topic(),
    })


@bp.route("/api/force_remind", methods=["POST"])
def force_remind():
    """Force gửi nhắc nhở ngay lập tức, bỏ qua dedup filter."""
    count = DeadlineService.force_remind()
    return jsonify({
        "status": "success",
        "message": f"Đã gửi {count} thông báo nhắc nhở về điện thoại!",
        "topic": get_ntfy_topic(),
    })


@bp.route("/api/ntfy_config", methods=["GET", "POST"])
def handle_ntfy_config():
    if request.method == "POST":
        data = request.json or {}
        new_topic = data.get("topic", "").strip()
        if new_topic:
            os.environ["NTFY_TOPIC"] = new_topic
            return jsonify({"message": f"Đã cập nhật NTFY_TOPIC thành: '{new_topic}'", "topic": new_topic})
        return jsonify({"error": "Topic không được trống"}), 400

    topic = get_ntfy_topic()
    return jsonify({"topic": topic, "ntfy_url": f"https://ntfy.sh/{topic}"})


@bp.route("/api/log_loi", methods=["GET"])
def get_log_loi():
    logs = LogLoi.query.order_by(LogLoi.thoi_gian.desc()).all()
    return jsonify([l.to_dict() for l in logs])
