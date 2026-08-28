"""
notifications/notification_jobs.py — Scheduled push-notification jobs.

Mỗi hàm:
  1. Query DB lấy dữ liệu cần thiết
  2. Quyết định có cần gửi không
  3. Gọi ntfy_client.gui_thong_bao()

Không chứa business logic domain — business logic nằm trong services/.

-----------------------------------------------------------------------
Quy chuẩn format tin nhắn gửi về điện thoại:
  - Tiêu đề: ngắn, nói rõ loại cảnh báo
  - Thân:    dùng dấu gạch kẻ, căn dòng, dễ đọc trên màn hình nhỏ
  - Mỗi thông tin quan trọng 1 dòng riêng
  - Kết thúc bằng gợi ý hành động (nếu có)
-----------------------------------------------------------------------
"""
import datetime

from models import db, Deadline, NhatKyThoiGian, TaiLieu, VocabCard
from notifications.ntfy_client import gui_thong_bao


def _sep() -> str:
    """Đường kẻ ngăn cách các khối thông tin."""
    return "─────────────────────"


def _han_nop_str(date: datetime.date) -> str:
    thu_map = {0: "Th.2", 1: "Th.3", 2: "Th.4", 3: "Th.5", 4: "Th.6", 5: "Th.7", 6: "CN"}
    return f"{thu_map[date.weekday()]}, {date.strftime('%d/%m/%Y')}"


def _days_label(days: int) -> str:
    if days == 0:
        return "HOM NAY"
    if days == 1:
        return "Con 1 ngay"
    if days > 0:
        return f"Con {days} ngay"
    return f"Tre {abs(days)} ngay"


# ── UC13 ─────────────────────────────────────────────────────────────────────
def nhac_deadline() -> int:
    """Nhắc deadline mỗi 6 tiếng (07:00, 13:00, 19:00, 01:00)."""
    homnay = datetime.date.today()
    deadlines = Deadline.query.filter(Deadline.trang_thai != "Hoan_thanh").all()
    sent_count = 0

    for dl in deadlines:
        days_left = (dl.han_nop - homnay).days
        mon_ten = dl.mon_hoc.ten_mon if dl.mon_hoc else dl.ma_mon

        if days_left not in [0, 1, 2] and days_left >= 0:
            continue

        # ── Chọn mức độ & tiêu đề theo urgency ─────────────────────────────
        if days_left < 0:
            tieu_de = f"TRE HAN  {abs(days_left)} NGAY"
            uu_tien, tags = "high", "warning,hourglass"
            trang_thai_line = f"Tre han   : {abs(days_left)} ngay chua nop"
            hanh_dong = "-> Lien he giang vien / cap nhat trang thai ngay."
        elif days_left == 0:
            tieu_de = "HAN NOY NAY  Pha nop truoc khi het gio!"
            uu_tien, tags = "urgent", "rotating_light,exclamation"
            trang_thai_line = "Han nop   : HOM NAY — con it thoi gian!"
            hanh_dong = "-> Hoan thanh va nop truoc 23:59 hom nay."
        elif days_left == 1:
            tieu_de = "CON 1 NGAY  Kiem tra tien do ngay!"
            uu_tien, tags = "high", "warning,calendar"
            trang_thai_line = f"Han nop   : {_han_nop_str(dl.han_nop)} (CON 1 NGAY)"
            hanh_dong = "-> Hoan thien va nop truoc han."
        else:  # days_left == 2
            tieu_de = "CON 2 NGAY  Dung de nuoc den chan moi nhay"
            uu_tien, tags = "default", "memo,calendar"
            trang_thai_line = f"Han nop   : {_han_nop_str(dl.han_nop)} (con 2 ngay)"
            hanh_dong = "-> Danh gia tien do va hoan thien som."

        uu_tien_vn = {"Cao": "CAO", "Trung_binh": "Trung binh", "Thap": "Thap"}.get(dl.do_uu_tien, dl.do_uu_tien)
        phan_tram = f"{dl.phan_tram_hoan_thanh}%"

        noi_dung = (
            f"{_sep()}\n"
            f"Mon hoc   : {mon_ten}\n"
            f"Bai tap   : {dl.ten_bai_tap}\n"
            f"{trang_thai_line}\n"
            f"Tien do   : {phan_tram}  |  Uu tien: {uu_tien_vn}\n"
            f"{_sep()}\n"
            f"{hanh_dong}"
        )

        gui_thong_bao(noi_dung, tieu_de=tieu_de, uu_tien=uu_tien, tags=tags)
        dl.ngay_nhac_cuoi = homnay
        sent_count += 1

    if sent_count > 0:
        db.session.commit()
    return sent_count


# ── UC14 ─────────────────────────────────────────────────────────────────────
def nhac_nhap_lieu() -> int:
    """Nhắc nhập liệu thời gian học (20h00 hàng ngày)."""
    sent_count = 0
    for dl in Deadline.query.filter_by(trang_thai="Dang_lam").all():
        threshold = 2 if dl.nguoi_dat_han == "Tu_dat" else 3
        last_log = (
            NhatKyThoiGian.query
            .filter_by(ma_bai_tap=dl.ma_bai_tap)
            .order_by(NhatKyThoiGian.ngay.desc())
            .first()
        )
        days_since = (datetime.date.today() - last_log.ngay).days if last_log else 999
        if days_since < threshold:
            continue

        mon_ten = dl.mon_hoc.ten_mon if dl.mon_hoc else dl.ma_mon
        last_log_str = last_log.ngay.strftime("%d/%m") if last_log else "Chua co"

        noi_dung = (
            f"{_sep()}\n"
            f"Mon hoc   : {mon_ten}\n"
            f"Bai tap   : {dl.ten_bai_tap}\n"
            f"Log cuoi  : {last_log_str}  ({days_since} ngay truoc)\n"
            f"Tien do   : {dl.phan_tram_hoan_thanh}%  |  Han: {_han_nop_str(dl.han_nop)}\n"
            f"{_sep()}\n"
            f"-> Mo app, ghi nhan gio hoc hom nay de giu streak."
        )

        gui_thong_bao(
            noi_dung,
            tieu_de=f"NHAC GHI LOG  Chua cap nhat {days_since} ngay",
            tags="memo,pencil",
        )
        sent_count += 1
    return sent_count


# ── UC15 ─────────────────────────────────────────────────────────────────────
def canh_bao_qua_tai() -> int:
    """Cảnh báo khi ≥3 deadline trùng ngày nộp (7h05 hàng ngày)."""
    theo_ngay: dict = {}
    for dl in Deadline.query.filter(Deadline.trang_thai != "Hoan_thanh").all():
        theo_ngay.setdefault(dl.han_nop, []).append(dl)

    sent_count = 0
    for ngay, ds in theo_ngay.items():
        if len(ds) < 3:
            continue

        ten_list = "\n".join(
            f"  {i+1}. {d.ten_bai_tap}  [{d.do_uu_tien}]"
            for i, d in enumerate(ds)
        )

        noi_dung = (
            f"{_sep()}\n"
            f"Ngay nop  : {_han_nop_str(ngay)}\n"
            f"So luong  : {len(ds)} deadline cung han\n"
            f"{_sep()}\n"
            f"{ten_list}\n"
            f"{_sep()}\n"
            f"-> Phan bo thoi gian som, lam bai uu tien CAO truoc."
        )

        gui_thong_bao(
            noi_dung,
            tieu_de=f"CANH BAO QUA TAI  {len(ds)} deadline ngay {ngay.strftime('%d/%m')}",
            uu_tien="high",
            tags="rotating_light,exclamation",
        )
        sent_count += 1
    return sent_count


# ── UC16 ─────────────────────────────────────────────────────────────────────
def bao_cao_tuan() -> int:
    """Gửi báo cáo học tập tuần (Chủ nhật 21h00)."""
    from services.dashboard_service import generate_weekly_report

    r = generate_weekly_report()
    subject_lines = ""
    if r["subject_overdue_counts"]:
        subject_lines = "\n" + "\n".join(
            f"  - {mon}: {cnt} bai tre"
            for mon, cnt in r["subject_overdue_counts"].items()
        )

    noi_dung = (
        f"{_sep()}\n"
        f"Tuan      : {r['week_range']}\n"
        f"Hoan thanh: {r['completed_count']} deadline\n"
        f"Tong gio  : {r['total_study_hours']} gio hoc\n"
        f"Mon tre   : {r['most_overdue_subject'] or 'Khong co'}{subject_lines}\n"
        f"{_sep()}\n"
        f"-> Tong ket tuan & lap ke hoach cho tuan toi."
    )

    ok, _ = gui_thong_bao(
        noi_dung,
        tieu_de=f"BAO CAO TUAN  {r['week_range']}",
        tags="bar_chart,trophy",
    )
    return 1 if ok else 0


# ── UC10 ─────────────────────────────────────────────────────────────────────
def nhac_on_tap() -> int:
    """UC10/UC-14: nhắc tài liệu cũ và các thẻ từ vựng đang đến hạn (8h00)."""
    MILESTONES = [1, 3, 7, 14, 30]
    MILESTONE_LABELS = {
        1: "1 ngay — Kiem tra lai lan dau",
        3: "3 ngay — On tap lan 2",
        7: "7 ngay — Kiem tra nho lau dai",
        14: "14 ngay — Nua thang, on lai!",
        30: "30 ngay — On tap cuoi chu ky",
    }
    today = datetime.date.today()
    sent_count = 0

    for tl in TaiLieu.query.all():
        days_passed = (today - tl.ngay_them).days
        if days_passed not in MILESTONES:
            continue

        mon_ten = tl.mon_hoc.ten_mon if tl.mon_hoc else "—"
        label = MILESTONE_LABELS.get(days_passed, f"{days_passed} ngay")

        noi_dung = (
            f"{_sep()}\n"
            f"Mon hoc   : {mon_ten}\n"
            f"Tai lieu  : {tl.ten_tai_lieu}\n"
            f"Loai      : {tl.loai_tai_lieu}\n"
            f"Moc on tap: {label}\n"
            f"{_sep()}\n"
            f"-> Danh 15–20 phut on lai tai lieu nay ngay hom nay."
        )

        gui_thong_bao(
            noi_dung,
            tieu_de=f"ON TAP  Moc {days_passed} ngay — {tl.ten_tai_lieu[:30]}",
            tags="books,brain",
        )
        sent_count += 1

    # Module từ vựng sử dụng lịch due thực tế thay vì các mốc ngày cố định.
    # Gộp theo deck để một buổi sáng không bị nhận hàng chục notification.
    due_by_deck: dict = {}
    now = datetime.datetime.utcnow()
    due_cards = VocabCard.query.filter(
        VocabCard.state.in_(("learning", "review", "relearning")),
        VocabCard.queue.in_(("learning", "review", "relearning")),
        VocabCard.due_at <= now,
    ).all()
    for card in due_cards:
        due_by_deck.setdefault(card.deck, 0)
        due_by_deck[card.deck] += 1

    for deck, count in due_by_deck.items():
        noi_dung = (
            f"{_sep()}\n"
            f"Bo tu vung: {deck.name}\n"
            f"The den han: {count}\n"
            f"{_sep()}\n"
            f"-> Mo AGY STUDY, vao Hoc tu vung va hoan thanh hang doi hom nay."
        )
        gui_thong_bao(
            noi_dung,
            tieu_de=f"ON TU VUNG  {count} the can on",
            tags="brain,books",
        )
        sent_count += 1
    return sent_count
