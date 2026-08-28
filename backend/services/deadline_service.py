"""
services/deadline_service.py — Business logic cho Deadline (UC04–UC08).

Single Responsibility: quản lý deadline, gia hạn, output, và các phân tích nhắc nhở.
Side-effects (push notification) được gọi trực tiếp sau mỗi thao tác có ý nghĩa.
"""
import datetime

from models import db, Deadline, MonHoc, OutputTuHoc, LichSuGiaHan
from notifications.ntfy_client import gui_thong_bao


class DeadlineService:

    @staticmethod
    def get_all() -> list[dict]:
        return [d.to_dict() for d in Deadline.query.all()]

    @staticmethod
    def create(data: dict) -> dict:
        """UC04 — Tạo deadline mới. Tự gửi push notification và tự tạo OutputTuHoc nếu cần."""
        ma_mon = data.get("ma_mon")
        ten_bai_tap = data.get("ten_bai_tap", "").strip()
        han_nop_str = data.get("han_nop")

        if not ma_mon or not ten_bai_tap or not han_nop_str:
            raise ValueError("Môn học, Tên bài tập và Hạn nộp là bắt buộc")

        mon = MonHoc.query.get(ma_mon)
        if not mon:
            raise LookupError("Môn học không tồn tại")

        han_nop = datetime.datetime.strptime(han_nop_str, "%Y-%m-%d").date()
        ngay_giao = (
            datetime.datetime.strptime(data["ngay_giao"], "%Y-%m-%d").date()
            if data.get("ngay_giao")
            else datetime.date.today()
        )

        nguoi_dat_han = "Tu_dat" if mon.loai_mon == "Tu_hoc" else "Giang_vien"
        output_mong_muon = data.get("output_mong_muon")

        if nguoi_dat_han == "Tu_dat" and not output_mong_muon:
            raise ValueError("Bắt buộc nhập Output mong muốn đối với deadline tự đặt")

        existing_count = Deadline.query.filter_by(ma_mon=ma_mon).count()
        prefix = "BT" if nguoi_dat_han == "Giang_vien" else "NV"
        ma_bai_tap = data.get("ma_bai_tap") or f"{ma_mon}-{prefix}{existing_count + 1:02d}"

        deadline = Deadline(
            ma_bai_tap=ma_bai_tap,
            ma_mon=ma_mon,
            ten_bai_tap=ten_bai_tap,
            loai_bai=data.get("loai_bai", "Bai_tap"),
            ngay_giao=ngay_giao,
            han_nop=han_nop,
            trang_thai="Chua_lam",
            phan_tram_hoan_thanh=0,
            do_uu_tien=data.get("do_uu_tien", "Trung_binh"),
            nguoi_dat_han=nguoi_dat_han,
            output_mong_muon=output_mong_muon,
            link_tai_lieu=data.get("link_tai_lieu"),
        )
        db.session.add(deadline)

        if nguoi_dat_han == "Tu_dat":
            db.session.add(OutputTuHoc(
                ma_output=f"{ma_bai_tap}-OUT",
                ma_bai_tap=ma_bai_tap,
                tieu_chi_hoan_thanh=output_mong_muon,
                ket_qua_dat_duoc="",
                ngay_cap_nhat=datetime.date.today(),
                tu_danh_gia=None,
            ))

        db.session.commit()

        # Instant push notification khi tạo deadline mới
        days_left = (han_nop - datetime.date.today()).days
        days_label = "Hôm nay" if days_left == 0 else (f"Còn {days_left} ngày" if days_left > 0 else f"Trễ {abs(days_left)} ngày")
        uu_tien_vn = {"Cao": "CAO", "Trung_binh": "Trung bình", "Thap": "Thấp"}.get(deadline.do_uu_tien, deadline.do_uu_tien)

        noi_dung = (
            f"─────────────────────\n"
            f"Môn học   : {mon.ten_mon}\n"
            f"Bài tập   : {ten_bai_tap}\n"
            f"Hạn nộp   : {han_nop.strftime('%d/%m/%Y')} ({days_label})\n"
            f"Ưu tiên   : {uu_tien_vn}\n"
            f"Loại bài  : {deadline.loai_bai}\n"
            f"─────────────────────\n"
            f"-> Đã ghi nhận vào danh sách công việc."
        )

        gui_thong_bao(
            noi_dung,
            tieu_de=f"DEADLINE MỚI: {ten_bai_tap}",
            uu_tien="high" if deadline.do_uu_tien == "Cao" else "default",
            tags="memo,calendar",
        )

        return deadline.to_dict()

    @staticmethod
    def update_status(ma_bai_tap: str, data: dict) -> dict:
        """UC05 — Cập nhật trạng thái và % hoàn thành deadline."""
        deadline = Deadline.query.get(ma_bai_tap)
        if not deadline:
            raise LookupError("Không tìm thấy deadline")

        deadline.trang_thai = data.get("trang_thai", deadline.trang_thai)
        deadline.phan_tram_hoan_thanh = int(
            data.get("phan_tram_hoan_thanh", deadline.phan_tram_hoan_thanh)
        )
        if deadline.trang_thai == "Hoan_thanh":
            deadline.phan_tram_hoan_thanh = 100

        db.session.commit()
        return deadline.to_dict()

    @staticmethod
    def update_output(ma_output: str, data: dict) -> dict:
        """UC08 — Ghi kết quả output tự học."""
        output_obj = OutputTuHoc.query.get(ma_output)
        if not output_obj:
            raise LookupError("Không tìm thấy kết quả output")
        output_obj.ket_qua_dat_duoc = data.get("ket_qua_dat_duoc", output_obj.ket_qua_dat_duoc)
        output_obj.tu_danh_gia = data.get("tu_danh_gia", output_obj.tu_danh_gia)
        output_obj.ngay_cap_nhat = datetime.date.today()
        db.session.commit()
        return output_obj.to_dict()

    @staticmethod
    def extend(ma_bai_tap: str, data: dict) -> tuple[dict, dict]:
        """UC06 — Gia hạn deadline tự đặt. Gửi push notification sau khi gia hạn."""
        deadline = Deadline.query.get(ma_bai_tap)
        if not deadline:
            raise LookupError("Không tìm thấy deadline")
        if deadline.nguoi_dat_han != "Tu_dat":
            raise PermissionError("Chỉ được phép gia hạn deadline tự đặt")

        han_moi_str = data.get("han_moi")
        if not han_moi_str:
            raise ValueError("Bắt buộc chọn Hạn mới")

        han_moi = datetime.datetime.strptime(han_moi_str, "%Y-%m-%d").date()
        han_cu = deadline.han_nop
        if han_moi <= han_cu:
            raise ValueError("Hạn mới phải muộn hơn hạn hiện tại")

        extension_log = LichSuGiaHan(
            ma_gia_han=f"GH-{int(datetime.datetime.now().timestamp())}",
            ma_bai_tap=ma_bai_tap,
            han_cu=han_cu,
            han_moi=han_moi,
            ngay_gia_han=datetime.date.today(),
            ly_do=data.get("ly_do", "Cần thêm thời gian hoàn thiện"),
        )
        db.session.add(extension_log)
        deadline.han_nop = han_moi
        deadline.so_lan_gia_han += 1
        deadline.ngay_nhac_cuoi = None  # reset để nhắc nhở lại từ đầu
        if deadline.trang_thai == "Tre_han":
            deadline.trang_thai = "Dang_lam"
        db.session.commit()

        noi_dung_gh = (
            f"─────────────────────\n"
            f"Bài tập   : {deadline.ten_bai_tap}\n"
            f"Hạn cũ    : {han_cu.strftime('%d/%m/%Y')}\n"
            f"Hạn mới   : {han_moi.strftime('%d/%m/%Y')}\n"
            f"Lần gia hạn: Lần thứ {deadline.so_lan_gia_han}\n"
            f"Lý do     : {extension_log.ly_do}\n"
            f"─────────────────────\n"
            f"-> Hãy sắp xếp thời gian để hoàn thành theo hạn mới."
        )

        gui_thong_bao(
            noi_dung_gh,
            tieu_de=f"GIA HẠN DEADLINE: {deadline.ten_bai_tap}",
            tags="hourglass",
        )
        return deadline.to_dict(), extension_log.to_dict()

    @staticmethod
    def force_remind() -> int:
        """Reset dedup filter và gửi nhắc nhở ngay lập tức cho deadline sắp đến."""
        today = datetime.date.today()
        for d in Deadline.query.filter(Deadline.trang_thai != "Hoan_thanh").all():
            days_left = (d.han_nop - today).days
            if days_left in [0, 1, 2] or days_left < 0:
                d.ngay_nhac_cuoi = None
        db.session.commit()

        from notifications.notification_jobs import nhac_deadline
        return nhac_deadline()

    @staticmethod
    def get_extension_history() -> list[dict]:
        logs = LichSuGiaHan.query.order_by(LichSuGiaHan.ngay_gia_han.desc()).all()
        return [l.to_dict() for l in logs]

    # ── In-app analysis helpers (moved from scheduler.py) ────────────────────

    @staticmethod
    def check_deadline_reminders() -> list[dict]:
        """Phân tích và trả về danh sách nhắc nhở deadline cho dashboard."""
        today = datetime.date.today()
        reminders = []
        for d in Deadline.query.filter(Deadline.trang_thai != "Hoan_thanh").all():
            days_left = (d.han_nop - today).days
            mon_ten = d.mon_hoc.ten_mon if d.mon_hoc else d.ma_mon

            if days_left < 0:
                reminders.append({"type": "deadline_overdue", "level": "danger",
                    "message": f"⚠️ Deadline '{d.ten_bai_tap}' ({mon_ten}) đã quá hạn {abs(days_left)} ngày!"})
            elif days_left == 0:
                reminders.append({"type": "deadline_urgent", "level": "danger",
                    "message": f"🚨 [HẠN HÔM NAY] Deadline '{d.ten_bai_tap}' ({mon_ten}) phải hoàn thành hôm nay ({d.han_nop.strftime('%d/%m')})!"})
            elif d.do_uu_tien == "Cao" and days_left in [1, 2, 3]:
                reminders.append({"type": "deadline_urgent", "level": "warning" if days_left <= 1 else "info",
                    "message": f"⏰ [Ưu tiên Cao] '{d.ten_bai_tap}' ({mon_ten}) còn {days_left} ngày (Hạn: {d.han_nop.strftime('%d/%m')})."})
            elif d.do_uu_tien in ["Trung_binh", "Thap"] and days_left in [1, 2]:
                reminders.append({"type": "deadline_reminder", "level": "info",
                    "message": f"📌 Deadline '{d.ten_bai_tap}' ({mon_ten}) còn {days_left} ngày (Hạn: {d.han_nop.strftime('%d/%m')})."})
        return reminders

    @staticmethod
    def check_overload_warning() -> list[dict]:
        """Phân tích và cảnh báo khi ≥3 deadline trùng ngày nộp."""
        due_dates: dict = {}
        for d in Deadline.query.filter(Deadline.trang_thai != "Hoan_thanh").all():
            due_dates[d.han_nop] = due_dates.get(d.han_nop, 0) + 1

        alerts = []
        for due_date, count in due_dates.items():
            if count >= 3:
                date_str = due_date.strftime("%d/%m/%Y")
                alerts.append({
                    "type": "overload", "level": "warning",
                    "date": date_str, "count": count,
                    "message": f"⚠️ Cảnh báo quá tải: Ngày {date_str} có đến {count} deadline trùng hạn nộp! Hãy chủ động phân bổ thời gian sớm.",
                })
        return alerts
