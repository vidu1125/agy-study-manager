"""
notifications/ntfy_client.py — Infrastructure layer: gửi push notification.

Single Responsibility: CHỈ gửi HTTP request tới ntfy.sh và Telegram.
Không chứa business logic, không query DB (ngoại trừ ghi log lỗi).
"""
import os
import base64
import datetime
import requests

from config import get_ntfy_topic
from models import db, LogLoi


def _ghi_log_loi(loi: str, ham: str = "") -> None:
    """Ghi lỗi gửi thông báo vào DB (UC7)."""
    try:
        log = LogLoi(
            noi_dung_loi=loi,
            ham_gay_loi=ham,
            thoi_gian=datetime.datetime.now(),
        )
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        print(f"Lỗi ghi log lỗi DB: {e}")


def gui_thong_bao(
    noi_dung: str,
    tieu_de: str = "Nhắc nhở học tập",
    uu_tien: str = "default",
    tags: str = "",
) -> tuple[bool, str]:
    """
    Gửi push notification qua ntfy.sh và (tuỳ chọn) Telegram Bot API.

    Args:
        noi_dung: Nội dung thông báo.
        tieu_de: Tiêu đề (hỗ trợ Unicode/emoji qua RFC 2047 base64).
        uu_tien: 'default' | 'high' | 'urgent' | 'low'
        tags: Emoji tags, ví dụ 'warning,calendar'

    Returns:
        (success, message)
    """
    sent_services: list[str] = []
    topic = get_ntfy_topic()

    # ── 1. ntfy.sh ──────────────────────────────────────────────────────────
    try:
        # RFC 2047 base64 encoding để hỗ trợ tiếng Việt trong HTTP header
        encoded_title = (
            f"=?utf-8?B?{base64.b64encode(tieu_de.encode('utf-8')).decode('utf-8')}?="
        )
        res = requests.post(
            f"https://ntfy.sh/{topic}",
            data=noi_dung.encode("utf-8"),
            headers={"Title": encoded_title, "Priority": uu_tien, "Tags": tags},
            timeout=10,
        )
        if res.status_code == 200:
            sent_services.append(f"ntfy.sh ({topic})")
        else:
            _ghi_log_loi(
                f"ntfy HTTP {res.status_code}: {res.text}", "gui_thong_bao_ntfy"
            )
    except Exception as e:
        _ghi_log_loi(f"ntfy Error: {str(e)}", "gui_thong_bao_ntfy")

    # ── 2. Telegram Bot API (nếu đã cấu hình env) ───────────────────────────
    tg_token = os.environ.get("TELEGRAM_BOT_TOKEN")
    tg_chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if tg_token and tg_chat_id:
        try:
            res_tg = requests.post(
                f"https://api.telegram.org/bot{tg_token}/sendMessage",
                json={
                    "chat_id": tg_chat_id,
                    "text": f"<b>{tieu_de}</b>\n\n{noi_dung}",
                    "parse_mode": "HTML",
                },
                timeout=10,
            )
            if res_tg.status_code == 200:
                sent_services.append("Telegram Bot")
            else:
                _ghi_log_loi(
                    f"Telegram HTTP {res_tg.status_code}: {res_tg.text}",
                    "gui_thong_bao_telegram",
                )
        except requests.RequestException as e:
            _ghi_log_loi(f"Telegram Error: {str(e)}", "gui_thong_bao_telegram")

    if sent_services:
        return True, f"Đã gửi qua: {', '.join(sent_services)}"
    return False, "Không gửi được thông báo qua các kênh đã cấu hình"
