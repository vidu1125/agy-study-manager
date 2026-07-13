import os
import datetime
import requests
import base64
from models import db, MonHoc, Deadline, TaiLieu, NhatKyThoiGian, MucTieu, LogLoi

# Topic mặc định trên ntfy.sh (an toàn, có thể override qua biến môi trường NTFY_TOPIC)
DEFAULT_TOPIC = "dung-hoctap-nhacnho-9f3k2xq8"

def get_ntfy_topic():
    return os.environ.get("NTFY_TOPIC", DEFAULT_TOPIC).strip()


def ghi_log_loi_gui(loi: str, ham: str = ""):
    """Ghi lại vết lỗi vào DB khi gửi push notification thất bại (UC7 trong kế hoạch thông báo)"""
    try:
        log = LogLoi(noi_dung_loi=loi, ham_gay_loi=ham, thoi_gian=datetime.datetime.now())
        db.session.add(log)
        db.session.commit()
    except Exception as e:
        print(f"Lỗi ghi log lỗi DB: {e}")


def gui_thong_bao(noi_dung: str, tieu_de: str = "Nhắc nhở học tập", uu_tien: str = "default", tags: str = ""):
    """
    Hàm gửi tin nhắn push notification chung tới điện thoại qua ntfy.sh & Telegram Bot API
    uu_tien: 'default' | 'high' | 'urgent' | 'low'
    tags: icon emoji (VD: 'warning', 'memo', 'rotating_light', 'bar_chart', 'books')
    """
    sent_services = []
    
    # 1. Dispatch via ntfy.sh
    topic = get_ntfy_topic()
    url_ntfy = f"https://ntfy.sh/{topic}"
    try:
        # Base64 RFC 2047 header encoding to support UTF-8 Vietnamese & Emoji in HTTP Header
        encoded_title = f"=?utf-8?B?{base64.b64encode(tieu_de.encode('utf-8')).decode('utf-8')}?="
        res = requests.post(
            url_ntfy,
            data=noi_dung.encode("utf-8"),
            headers={
                "Title": encoded_title,
                "Priority": uu_tien,
                "Tags": tags
            },
            timeout=10
        )
        if res.status_code == 200:
            sent_services.append(f"ntfy.sh ({topic})")
        else:
            ghi_log_loi_gui(f"ntfy HTTP {res.status_code}: {res.text}", "gui_thong_bao_ntfy")
    except Exception as e:
        ghi_log_loi_gui(f"ntfy Error: {str(e)}", "gui_thong_bao_ntfy")


    # 2. Dispatch via Telegram Bot API (if configured in env)
    tg_token = os.environ.get("TELEGRAM_BOT_TOKEN")
    tg_chat_id = os.environ.get("TELEGRAM_CHAT_ID")
    if tg_token and tg_chat_id:
        try:
            url_tg = f"https://api.telegram.org/bot{tg_token}/sendMessage"
            tg_text = f"<b>{tieu_de}</b>\n\n{noi_dung}"
            res_tg = requests.post(url_tg, json={"chat_id": tg_chat_id, "text": tg_text, "parse_mode": "HTML"}, timeout=10)
            if res_tg.status_code == 200:
                sent_services.append("Telegram Bot")
            else:
                ghi_log_loi_gui(f"Telegram HTTP {res_tg.status_code}: {res_tg.text}", "gui_thong_bao_telegram")
        except requests.RequestException as e:
            ghi_log_loi_gui(f"Telegram Error: {str(e)}", "gui_thong_bao_telegram")

    if sent_services:
        return True, f"Đã gửi qua: {', '.join(sent_services)}"
    else:
        return False, "Không gửi được thông báo qua các kênh đã cấu hình"



# ==========================================
# CALCULATION & IN-APP ENGINE HELPERS
# ==========================================
def calculate_streak():
    """
    UC12 - Tính chuỗi ngày duy trì (Streak)
    Đếm số ngày liên tiếp tính tới hôm nay có ít nhất 1 bản ghi nhat_ky_thoi_gian
    """
    logs = NhatKyThoiGian.query.order_by(NhatKyThoiGian.ngay.desc()).all()
    if not logs:
        return 0

    unique_dates = sorted(list(set(log.ngay for log in logs)), reverse=True)
    today = datetime.date.today()
    
    streak = 0
    check_date = today

    if unique_dates and unique_dates[0] < today:
        if (today - unique_dates[0]).days > 1:
            return 0 # Streak broken
        check_date = unique_dates[0]

    for d in unique_dates:
        if d == check_date:
            streak += 1
            check_date -= datetime.timedelta(days=1)
        elif d < check_date:
            break

    return streak


def check_deadline_reminders():
    today = datetime.date.today()
    active_deadlines = Deadline.query.filter(Deadline.trang_thai != 'Hoan_thanh').all()
    reminders = []
    for d in active_deadlines:
        days_left = (d.han_nop - today).days
        mon_ten = d.mon_hoc.ten_mon if d.mon_hoc else d.ma_mon
        
        if days_left < 0:
            reminders.append({
                'type': 'deadline_overdue',
                'level': 'danger',
                'message': f"⚠️ Deadline '{d.ten_bai_tap}' ({mon_ten}) đã quá hạn {abs(days_left)} ngày!"
            })
        elif days_left == 0:
            reminders.append({
                'type': 'deadline_urgent',
                'level': 'danger',
                'message': f"🚨 [HẠN HÔM NAY] Deadline '{d.ten_bai_tap}' ({mon_ten}) phải hoàn thành trong hôm nay ({d.han_nop.strftime('%d/%m')})!"
            })
        elif d.do_uu_tien == 'Cao' and days_left in [1, 2, 3]:
            reminders.append({
                'type': 'deadline_urgent',
                'level': 'warning' if days_left <= 1 else 'info',
                'message': f"⏰ [Ưu tiên Cao] Deadline '{d.ten_bai_tap}' ({mon_ten}) còn {days_left} ngày (Hạn: {d.han_nop.strftime('%d/%m')})."
            })
        elif d.do_uu_tien in ['Trung_binh', 'Thap'] and days_left in [1, 2]:
            reminders.append({
                'type': 'deadline_reminder',
                'level': 'info',
                'message': f"📌 Deadline '{d.ten_bai_tap}' ({mon_ten}) còn {days_left} ngày (Hạn: {d.han_nop.strftime('%d/%m')})."
            })
    return reminders



def check_missing_time_logs():
    today = datetime.date.today()
    in_progress = Deadline.query.filter(Deadline.trang_thai == 'Dang_lam').all()
    reminders = []
    for d in in_progress:
        last_log = NhatKyThoiGian.query.filter_by(ma_bai_tap=d.ma_bai_tap).order_by(NhatKyThoiGian.ngay.desc()).first()
        days_since_log = (today - last_log.ngay).days if last_log else 999
        threshold = 2 if d.nguoi_dat_han == 'Tu_dat' else 3
        if days_since_log >= threshold:
            reminders.append({
                'type': 'missing_log',
                'level': 'warning',
                'message': f"📝 Bạn chưa ghi nhận giờ học cho '{d.ten_bai_tap}' trong {days_since_log} ngày qua. Hãy cập nhật tiến độ nhé!"
            })
    return reminders


def check_overload_warning():
    today = datetime.date.today()
    active_deadlines = Deadline.query.filter(Deadline.trang_thai != 'Hoan_thanh').all()
    due_dates_count = {}
    for d in active_deadlines:
        due_dates_count[d.han_nop] = due_dates_count.get(d.han_nop, 0) + 1

    overload_alerts = []
    for due_date, count in due_dates_count.items():
        if count >= 3:
            date_str = due_date.strftime('%d/%m/%Y')
            overload_alerts.append({
                'type': 'overload',
                'level': 'warning',
                'date': date_str,
                'count': count,
                'message': f"⚠️ Cảnh báo quá tải: Ngày {date_str} có đến {count} deadline trùng hạn nộp! Hãy chủ động phân bổ thời gian sớm."
            })
    return overload_alerts


def check_spaced_repetition_materials():
    today = datetime.date.today()
    materials = TaiLieu.query.all()
    spaced_suggestions = []
    for m in materials:
        days_added = (today - m.ngay_them).days
        if days_added in [1, 3, 7, 14, 30]:
            spaced_suggestions.append({
                'type': 'spaced_repetition',
                'level': 'info',
                'material_id': m.ma_tai_lieu,
                'material_name': m.ten_tai_lieu,
                'mon_name': m.mon_hoc.ten_mon if m.mon_hoc else '',
                'days': days_added,
                'message': f"🧠 Gợi ý Spaced Repetition ({days_added} ngày): Nên ôn lại tài liệu '{m.ten_tai_lieu}' ({m.mon_hoc.ten_mon})."
            })
    return spaced_suggestions


def generate_weekly_report():
    today = datetime.date.today()
    week_start = today - datetime.timedelta(days=7)
    completed_deadlines = Deadline.query.filter(Deadline.trang_thai == 'Hoan_thanh').all()
    logs_this_week = NhatKyThoiGian.query.filter(NhatKyThoiGian.ngay >= week_start).all()
    total_hours = sum(l.gio_thuc_te for l in logs_this_week)

    overdue_deadlines = Deadline.query.filter(Deadline.trang_thai == 'Tre_han').all()
    subject_overdue_counts = {}
    for d in overdue_deadlines:
        mon_name = d.mon_hoc.ten_mon if d.mon_hoc else 'Không xác định'
        subject_overdue_counts[mon_name] = subject_overdue_counts.get(mon_name, 0) + 1

    most_overdue_subject = max(subject_overdue_counts.items(), key=lambda x: x[1]) if subject_overdue_counts else (None, 0)

    return {
        'week_range': f"{week_start.strftime('%d/%m')} - {today.strftime('%d/%m/%Y')}",
        'completed_count': len(completed_deadlines),
        'total_study_hours': round(total_hours, 1),
        'most_overdue_subject': most_overdue_subject[0],
        'most_overdue_count': most_overdue_subject[1],
        'subject_overdue_counts': subject_overdue_counts
    }


# ==========================================
# PUSH NOTIFICATION JOBS (UC10, UC13, UC14, UC15, UC16)
# ==========================================
def nhac_deadline():
    """UC13 - Gửi push notification nhắc deadline trước hạn 0, 1, 2 ngày tự động hàng ngày"""
    homnay = datetime.date.today()
    deadlines = Deadline.query.filter(Deadline.trang_thai != "Hoan_thanh").all()
    sent_count = 0

    for dl in deadlines:
        so_ngay_con_lai = (dl.han_nop - homnay).days
        mon_ten = dl.mon_hoc.ten_mon if dl.mon_hoc else dl.ma_mon

        # Tự động gửi thông báo liên tục mỗi ngày khi còn 2 ngày, 1 ngày, và 0 ngày (hôm nay)
        if so_ngay_con_lai in [0, 1, 2] or so_ngay_con_lai < 0:
            # Nếu hôm nay chưa nhắc cho deadline này thì gửi nhắc nhở
            if dl.ngay_nhac_cuoi != homnay:
                if so_ngay_con_lai == 0:
                    noi_dung = f"🚨 [HẠN HÔM NAY] '{dl.ten_bai_tap}' ({mon_ten}) phải hoàn thành trong HÔM NAY ({dl.han_nop.strftime('%d/%m/%Y')})!"
                    tieu_de = "🚨 Nhắc nhở: Hạn nộp Hôm Nay!"
                    muc_uu_tien = "urgent"
                    tags = "rotating_light,exclamation"
                elif so_ngay_con_lai == 1:
                    noi_dung = f"⏰ [CÒN 1 NGÀY] '{dl.ten_bai_tap}' ({mon_ten}) còn 1 ngày nữa - Ngày mai hết hạn! (Hạn: {dl.han_nop.strftime('%d/%m/%Y')})"
                    tieu_de = "⏰ Nhắc nhở: Còn 1 Ngày!"
                    muc_uu_tien = "high"
                    tags = "warning,calendar"
                elif so_ngay_con_lai == 2:
                    noi_dung = f"📌 [CÒN 2 NGÀY] '{dl.ten_bai_tap}' ({mon_ten}) còn 2 ngày nữa đến hạn ({dl.han_nop.strftime('%d/%m/%Y')})"
                    tieu_de = "📌 Nhắc nhở: Còn 2 Ngày!"
                    muc_uu_tien = "default"
                    tags = "memo,calendar"
                else: # so_ngay_con_lai < 0
                    noi_dung = f"⚠️ [ĐÃ TRỄ HẠN] '{dl.ten_bai_tap}' ({mon_ten}) đã quá hạn {abs(so_ngay_con_lai)} ngày!"
                    tieu_de = "⚠️ Cảnh báo: Trễ Hạn Deadline!"
                    muc_uu_tien = "high"
                    tags = "warning,hourglass"

                gui_thong_bao(noi_dung, tieu_de=tieu_de, uu_tien=muc_uu_tien, tags=tags)
                dl.ngay_nhac_cuoi = homnay
                sent_count += 1

    if sent_count > 0:
        db.session.commit()

    return sent_count




def nhac_nhap_lieu():
    """UC14 - Gửi push notification nhắc nhập liệu thời gian (20h00 hàng ngày)"""
    dang_lam = Deadline.query.filter_by(trang_thai="Dang_lam").all()
    sent_count = 0

    for dl in dang_lam:
        nguong_ngay = 2 if dl.nguoi_dat_han == "Tu_dat" else 3
        log_gan_nhat = (NhatKyThoiGian.query
                        .filter_by(ma_bai_tap=dl.ma_bai_tap)
                        .order_by(NhatKyThoiGian.ngay.desc())
                        .first())

        so_ngay_khong_log = (datetime.date.today() - log_gan_nhat.ngay).days if log_gan_nhat else 999

        if so_ngay_khong_log >= nguong_ngay:
            mon_ten = dl.mon_hoc.ten_mon if dl.mon_hoc else ""
            noi_dung = f"Bạn chưa cập nhật tiến độ '{dl.ten_bai_tap}' ({mon_ten}) trong {so_ngay_khong_log} ngày. Đừng quên ghi log nhé!"
            gui_thong_bao(noi_dung, tieu_de="📝 Cập nhật tiến độ học tập", tags="memo,pencil")
            sent_count += 1

    return sent_count


def canh_bao_qua_tai():
    """UC15 - Gửi push notification cảnh báo quá tải deadline (7h05 hàng ngày)"""
    deadlines = Deadline.query.filter(Deadline.trang_thai != "Hoan_thanh").all()
    theo_ngay = {}

    for dl in deadlines:
        theo_ngay.setdefault(dl.han_nop, []).append(dl)

    sent_count = 0
    for ngay, ds in theo_ngay.items():
        if len(ds) >= 3:
            ten_bai = ", ".join([d.ten_bai_tap for d in ds])
            noi_dung = f"Ngày {ngay.strftime('%d/%m/%Y')} có {len(ds)} deadline trùng nộp: {ten_bai}. Hãy chủ động sắp xếp!"
            gui_thong_bao(noi_dung, tieu_de="🚨 Cảnh báo quá tải deadline", uu_tien="high", tags="rotating_light,exclamation")
            sent_count += 1

    return sent_count


def bao_cao_tuan():
    """UC16 - Gửi push notification báo cáo tuần (Chủ nhật 21h00)"""
    r = generate_weekly_report()
    noi_dung = (f"Tuần này: Hoàn thành {r['completed_count']} deadline, "
                f"tổng {r['total_study_hours']} giờ học. "
                f"Môn trễ nhiều nhất: {r['most_overdue_subject'] or 'Không có'}")
    ok, _ = gui_thong_bao(noi_dung, tieu_de="📊 Báo cáo học tập tuần", tags="bar_chart,trophy")
    return 1 if ok else 0


def nhac_on_tap():
    """UC10 - Gửi push notification nhắc ôn tập tài liệu Spaced Repetition (8h00 hàng ngày)"""
    tai_lieu = TaiLieu.query.all()
    moc_ngay = [1, 3, 7, 14, 30]
    sent_count = 0

    for tl in tai_lieu:
        so_ngay_da_qua = (datetime.date.today() - tl.ngay_them).days
        if so_ngay_da_qua in moc_ngay:
            mon_ten = tl.mon_hoc.ten_mon if tl.mon_hoc else ""
            noi_dung = f"Đã {so_ngay_da_qua} ngày kể từ khi lưu tài liệu '{tl.ten_tai_lieu}' ({mon_ten}) — nên ôn lại ngay!"
            gui_thong_bao(noi_dung, tieu_de="🧠 Ôn tập Spaced Repetition", tags="books,brain")
            sent_count += 1

    return sent_count
