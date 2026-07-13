import os
import datetime
from flask import Flask, jsonify, request, render_template, send_from_directory
from models import db, MonHoc, Deadline, OutputTuHoc, LichSuGiaHan, TaiLieu, MucTieu, NhatKyThoiGian, LogLoi, LichHoc
from seed_data import seed_database
import scheduler

app = Flask(__name__, template_folder='templates', static_folder='static')

# Persistent Database Configuration for Render Deployment / Local Fallback
db_path = os.getenv('DB_PATH')
if not db_path:
    db_path = os.path.join(app.root_path, 'database.db')

os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

with app.app_context():
    db.create_all()
    # Auto migrate missing columns in SQLite database for smooth deployment upgrades
    try:
        import sqlite3
        db_uri = app.config.get('SQLALCHEMY_DATABASE_URI', '')
        if 'sqlite' in db_uri:
            db_path = db_uri.replace('sqlite:///', '')
            conn = sqlite3.connect(db_path)
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(DEADLINE);")
            cols = [row[1] for row in cursor.fetchall()]
            if 'ngay_nhac_cuoi' not in cols:
                cursor.execute("ALTER TABLE DEADLINE ADD COLUMN ngay_nhac_cuoi DATE;")
                conn.commit()
            conn.close()
    except Exception as e:
        print("Schema migration info:", e)

    seed_database()



@app.route('/ping', methods=['GET'])
def ping():
    """Route anti-sleep dùng cho cron-job.org (UC Deploy - Section 3 Step 5) & Trigger nhắc nhở hàng ngày"""
    try:
        notifications_sent = scheduler.nhac_deadline()
    except Exception as e:
        notifications_sent = 0

    return jsonify({
        'status': 'ok',
        'message': 'AGY STUDY Application Service is active and running',
        'daily_notifications_triggered': notifications_sent,
        'timestamp': datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    }), 200




# ==========================================
# BACKGROUND SCHEDULER (PUSH NOTIFICATIONS UC10, 13, 14, 15, 16)
# ==========================================
from apscheduler.schedulers.background import BackgroundScheduler
bg_scheduler = BackgroundScheduler(daemon=True)

def job_nhac_deadline():
    with app.app_context():
        scheduler.nhac_deadline()

def job_nhac_on_tap():
    with app.app_context():
        scheduler.nhac_on_tap()

def job_nhac_nhap_lieu():
    with app.app_context():
        scheduler.nhac_nhap_lieu()

def job_canh_bao_qua_tai():
    with app.app_context():
        scheduler.canh_bao_qua_tai()

def job_bao_cao_tuan():
    with app.app_context():
        scheduler.bao_cao_tuan()

# Registration matching 06_ke_hoach_UC_thong_bao.md
bg_scheduler.add_job(job_nhac_deadline,    'cron', hour=7,  minute=0,  id='uc13_deadline')
bg_scheduler.add_job(job_canh_bao_qua_tai, 'cron', hour=7,  minute=5,  id='uc15_overload')
bg_scheduler.add_job(job_nhac_on_tap,      'cron', hour=8,  minute=0,  id='uc10_spaced_rep')
bg_scheduler.add_job(job_nhac_nhap_lieu,   'cron', hour=20, minute=0,  id='uc14_missing_log')
bg_scheduler.add_job(job_bao_cao_tuan,     'cron', day_of_week='sun', hour=21, minute=0, id='uc16_weekly_report')

bg_scheduler.start()


# ==========================================
# PAGE ROUTE
# ==========================================
@app.route('/')
def index_page():
    return render_template('index.html')


# ==========================================
# API: DASHBOARD (UC17)
# ==========================================
@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    today = datetime.date.today()
    next_7_days = today + datetime.timedelta(days=7)

    priority_order = {'Cao': 1, 'Trung_binh': 2, 'Thap': 3}
    active_deadlines = Deadline.query.filter(
        Deadline.trang_thai != 'Hoan_thanh'
    ).all()
    
    deadlines_7_days = [d for d in active_deadlines if d.han_nop <= next_7_days]
    deadlines_7_days.sort(key=lambda d: (priority_order.get(d.do_uu_tien, 2), d.han_nop))

    week_start = today - datetime.timedelta(days=7)
    recent_logs = NhatKyThoiGian.query.filter(NhatKyThoiGian.ngay >= week_start).all()
    hours_this_week = round(sum(l.gio_thuc_te for l in recent_logs), 1)

    streak_count = scheduler.calculate_streak()

    overload_alerts = scheduler.check_overload_warning()
    deadline_reminders = scheduler.check_deadline_reminders()
    missing_log_reminders = scheduler.check_missing_time_logs()
    spaced_repetition = scheduler.check_spaced_repetition_materials()

    overdue_deadlines = Deadline.query.filter(Deadline.trang_thai == 'Tre_han').all()
    subject_overdue_counts = {}
    for d in overdue_deadlines:
        mon_name = d.mon_hoc.ten_mon if d.mon_hoc else 'Không xác định'
        subject_overdue_counts[mon_name] = subject_overdue_counts.get(mon_name, 0) + 1

    active_goals = MucTieu.query.filter(MucTieu.trang_thai != 'Tam_dung').all()

    return jsonify({
        'status': 'success',
        'ntfy_topic': scheduler.get_ntfy_topic(),
        'metrics': {
            'upcoming_deadlines_count': len(deadlines_7_days),
            'streak_days': streak_count,
            'weekly_hours': hours_this_week
        },
        'upcoming_deadlines': [d.to_dict() for d in deadlines_7_days],
        'overload_alerts': overload_alerts,
        'deadline_reminders': deadline_reminders,
        'missing_log_reminders': missing_log_reminders,
        'spaced_repetition': spaced_repetition,
        'subject_overdue_counts': subject_overdue_counts,
        'goals': [g.to_dict() for g in active_goals]
    })


# ==========================================
# API: PUSH NOTIFICATION & DEBUG (MOBILE NTFY)
# ==========================================
@app.route('/api/test_notification', methods=['POST'])
def test_notification():
    data = request.json or {}
    tieu_de = data.get('tieu_de', '🔔 Kiểm tra Thông báo Điện thoại')
    noi_dung = data.get('noi_dung', 'Hệ thống Quản lý Học tập AGY STUDY đã kết nối thành công với điện thoại của bạn!')
    uu_tien = data.get('uu_tien', 'high')
    tags = data.get('tags', 'bell,rocket')

    success, message = scheduler.gui_thong_bao(noi_dung, tieu_de=tieu_de, uu_tien=uu_tien, tags=tags)
    if success:
        return jsonify({'status': 'success', 'message': message, 'topic': scheduler.get_ntfy_topic()})
    else:
        return jsonify({'status': 'error', 'message': message, 'topic': scheduler.get_ntfy_topic()}), 500


@app.route('/api/trigger_uc_notification/<uc_name>', methods=['POST'])
def trigger_uc_notification(uc_name):
    """Kích hoạt gửi push notification thử nghiệm tức thì cho từng Use Case"""
    uc_map = {
        'uc13': ('UC13 Nhắc Deadline', scheduler.nhac_deadline),
        'uc14': ('UC14 Nhắc Nhập Liệu', scheduler.nhac_nhap_lieu),
        'uc15': ('UC15 Cảnh Báo Quá Tải', scheduler.canh_bao_qua_tai),
        'uc16': ('UC16 Báo Cáo Tuần', scheduler.bao_cao_tuan),
        'uc10': ('UC10 Spaced Repetition', scheduler.nhac_on_tap)
    }

    if uc_name not in uc_map:
        return jsonify({'error': 'UC không hợp lệ (hỗ trợ: uc10, uc13, uc14, uc15, uc16)'}), 400

    title, func = uc_map[uc_name]
    count = func()
    return jsonify({
        'status': 'success',
        'message': f"Đã chạy {title}. Số thông báo được gửi: {count}",
        'topic': scheduler.get_ntfy_topic()
    })


@app.route('/api/ntfy_config', methods=['GET', 'POST'])
def handle_ntfy_config():
    if request.method == 'POST':
        data = request.json or {}
        new_topic = data.get('topic', '').strip()
        if new_topic:
            os.environ['NTFY_TOPIC'] = new_topic
            return jsonify({'message': f"Đã cập nhật NTFY_TOPIC thành: '{new_topic}'", 'topic': new_topic})
        return jsonify({'error': 'Topic không được trống'}), 400
    
    return jsonify({'topic': scheduler.get_ntfy_topic(), 'ntfy_url': f"https://ntfy.sh/{scheduler.get_ntfy_topic()}"})


@app.route('/api/log_loi', methods=['GET'])
def get_log_loi():
    logs = LogLoi.query.order_by(LogLoi.thoi_gian.desc()).all()
    return jsonify([l.to_dict() for l in logs])


# ==========================================
# API: MON HOC (UC01, UC02, UC03)
# ==========================================
@app.route('/api/mon_hoc', methods=['GET'])
def get_mon_hoc():
    subjects = MonHoc.query.all()
    return jsonify([s.to_dict() for s in subjects])


@app.route('/api/mon_hoc', methods=['POST'])
def create_mon_hoc():
    data = request.json or {}
    ma_mon = data.get('ma_mon', '').strip()
    ten_mon = data.get('ten_mon', '').strip()
    loai_mon = data.get('loai_mon', 'Truong')

    if not ma_mon or not ten_mon:
        return jsonify({'error': 'Mã môn và tên môn không được để trống'}), 400

    if MonHoc.query.get(ma_mon):
        return jsonify({'error': f"Mã môn '{ma_mon}' đã tồn tại"}), 400

    giang_vien = data.get('giang_vien') if loai_mon == 'Truong' else None
    so_tin_chi = int(data.get('so_tin_chi', 0)) if (loai_mon == 'Truong' and data.get('so_tin_chi')) else None
    nguon_hoc = data.get('nguon_hoc') if loai_mon == 'Tu_hoc' else None

    if loai_mon == 'Truong' and (not giang_vien or so_tin_chi is None):
        return jsonify({'error': 'Môn thuộc trường bắt buộc điền Giảng viên và Số tín chỉ'}), 400
    if loai_mon == 'Tu_hoc' and not nguon_hoc:
        return jsonify({'error': 'Môn tự học bắt buộc điền Nguồn học'}), 400

    mon = MonHoc(
        ma_mon=ma_mon,
        ten_mon=ten_mon,
        loai_mon=loai_mon,
        giang_vien=giang_vien,
        so_tin_chi=so_tin_chi,
        nguon_hoc=nguon_hoc,
        muc_do_uu_tien=data.get('muc_do_uu_tien', 'Trung_binh'),
        trang_thai='Dang_hoc'
    )
    db.session.add(mon)

    create_goal = data.get('tao_muc_tieu_tuong_ung', False)
    created_goal_dict = None
    if loai_mon == 'Tu_hoc' and create_goal:
        goal_id = f"MT-{ma_mon}"
        goal = MucTieu(
            ma_muc_tieu=goal_id,
            ma_mon=ma_mon,
            ten_muc_tieu=f"Hoàn thành môn tự học: {ten_mon}",
            loai_muc_tieu='Dai_han',
            ngay_bat_dau=datetime.date.today(),
            thoi_han=datetime.date.today() + datetime.timedelta(days=90),
            cac_buoc_hanh_dong=f"Nguồn học: {nguon_hoc}. Học và làm bài tập theo lộ trình.",
            tien_do_phan_tram=0,
            trang_thai='Dang_thuc_hien'
        )
        db.session.add(goal)
        created_goal_dict = goal.to_dict()

    db.session.commit()
    return jsonify({
        'message': 'Tạo môn học thành công',
        'mon_hoc': mon.to_dict(),
        'created_goal': created_goal_dict
    }), 201


@app.route('/api/mon_hoc/<ma_mon>', methods=['PUT'])
def update_mon_hoc(ma_mon):
    mon = MonHoc.query.get(ma_mon)
    if not mon:
        return jsonify({'error': 'Không tìm thấy môn học'}), 404

    data = request.json or {}
    mon.ten_mon = data.get('ten_mon', mon.ten_mon)
    mon.muc_do_uu_tien = data.get('muc_do_uu_tien', mon.muc_do_uu_tien)
    mon.trang_thai = data.get('trang_thai', mon.trang_thai)

    if mon.loai_mon == 'Truong':
        mon.giang_vien = data.get('giang_vien', mon.giang_vien)
        if 'so_tin_chi' in data:
            mon.so_tin_chi = int(data['so_tin_chi'])
    else:
        mon.nguon_hoc = data.get('nguon_hoc', mon.nguon_hoc)

    db.session.commit()
    return jsonify({'message': 'Cập nhật môn học thành công', 'mon_hoc': mon.to_dict()})


@app.route('/api/mon_hoc/<ma_mon>', methods=['DELETE'])
def delete_mon_hoc(ma_mon):
    mon = MonHoc.query.get(ma_mon)
    if not mon:
        return jsonify({'error': 'Không tìm thấy môn học'}), 404

    mon.trang_thai = 'Da_xong'
    db.session.commit()
    return jsonify({'message': 'Đã chuyển trạng thái môn học thành Đã xong (soft-delete)'})


# ==========================================
# API: DEADLINE (UC04, UC05, UC06, UC07)
# ==========================================
@app.route('/api/deadline', methods=['GET'])
def get_deadlines():
    deadlines = Deadline.query.all()
    return jsonify([d.to_dict() for d in deadlines])


@app.route('/api/deadline', methods=['POST'])
def create_deadline():
    data = request.json or {}
    ma_mon = data.get('ma_mon')
    ten_bai_tap = data.get('ten_bai_tap', '').strip()
    han_nop_str = data.get('han_nop')

    if not ma_mon or not ten_bai_tap or not han_nop_str:
        return jsonify({'error': 'Môn học, Tên bài tập và Hạn nộp là bắt buộc'}), 400

    mon = MonHoc.query.get(ma_mon)
    if not mon:
        return jsonify({'error': 'Môn học không tồn tại'}), 404

    han_nop = datetime.datetime.strptime(han_nop_str, '%Y-%m-%d').date()
    ngay_giao = datetime.datetime.strptime(data['ngay_giao'], '%Y-%m-%d').date() if data.get('ngay_giao') else datetime.date.today()

    nguoi_dat_han = 'Tu_dat' if mon.loai_mon == 'Tu_hoc' else 'Giang_vien'
    output_mong_muon = data.get('output_mong_muon')

    if nguoi_dat_han == 'Tu_dat' and not output_mong_muon:
        return jsonify({'error': 'Bắt buộc nhập Output mong muốn đối với deadline tự đặt'}), 400

    existing_count = Deadline.query.filter_by(ma_mon=ma_mon).count()
    prefix = 'BT' if nguoi_dat_han == 'Giang_vien' else 'NV'
    ma_bai_tap = data.get('ma_bai_tap') or f"{ma_mon}-{prefix}{existing_count + 1:02d}"

    deadline = Deadline(
        ma_bai_tap=ma_bai_tap,
        ma_mon=ma_mon,
        ten_bai_tap=ten_bai_tap,
        loai_bai=data.get('loai_bai', 'Bai_tap'),
        ngay_giao=ngay_giao,
        han_nop=han_nop,
        trang_thai='Chua_lam',
        phan_tram_hoan_thanh=0,
        do_uu_tien=data.get('do_uu_tien', 'Trung_binh'),
        nguoi_dat_han=nguoi_dat_han,
        output_mong_muon=output_mong_muon,
        link_tai_lieu=data.get('link_tai_lieu')
    )
    db.session.add(deadline)

    if nguoi_dat_han == 'Tu_dat':
        output_obj = OutputTuHoc(
            ma_output=f"{ma_bai_tap}-OUT",
            ma_bai_tap=ma_bai_tap,
            tieu_chi_hoan_thanh=output_mong_muon,
            ket_qua_dat_duoc='',
            ngay_cap_nhat=datetime.date.today(),
            tu_danh_gia=None
        )
        db.session.add(output_obj)

    db.session.commit()

    # Instant Push Notification when new deadline is created
    days_left = (han_nop - datetime.date.today()).days
    creation_msg = f"🎉 Đã tạo Deadline: '{ten_bai_tap}' ({mon.ten_mon})\n⏰ Hạn nộp: {han_nop.strftime('%d/%m/%Y')} (Còn {days_left} ngày)\n🔥 Ưu tiên: {deadline.do_uu_tien}"
    scheduler.gui_thong_bao(
        creation_msg,
        tieu_de="Tạo mới Deadline",
        uu_tien="high" if deadline.do_uu_tien == "Cao" else "default",
        tags="memo,calendar"
    )

    # Immediately trigger periodic scheduler check for upcoming deadlines
    scheduler.nhac_deadline()

    return jsonify({'message': 'Tạo deadline thành công', 'deadline': deadline.to_dict()}), 201




@app.route('/api/deadline/<ma_bai_tap>', methods=['PUT'])
def update_deadline_status(ma_bai_tap):
    deadline = Deadline.query.get(ma_bai_tap)
    if not deadline:
        return jsonify({'error': 'Không tìm thấy deadline'}), 404

    data = request.json or {}
    new_status = data.get('trang_thai', deadline.trang_thai)
    new_pct = data.get('phan_tram_hoan_thanh', deadline.phan_tram_hoan_thanh)

    deadline.trang_thai = new_status
    deadline.phan_tram_hoan_thanh = int(new_pct)

    if new_status == 'Hoan_thanh':
        deadline.phan_tram_hoan_thanh = 100

    db.session.commit()
    return jsonify({'message': 'Cập nhật trạng thái thành công', 'deadline': deadline.to_dict()})


@app.route('/api/deadline/<ma_bai_tap>/gia_han', methods=['POST'])
def extend_deadline(ma_bai_tap):
    deadline = Deadline.query.get(ma_bai_tap)
    if not deadline:
        return jsonify({'error': 'Không tìm thấy deadline'}), 404

    if deadline.nguoi_dat_han != 'Tu_dat':
        return jsonify({'error': 'Chỉ được phép gia hạn deadline tự đặt'}), 400

    data = request.json or {}
    han_moi_str = data.get('han_moi')
    if not han_moi_str:
        return jsonify({'error': 'Bắt buộc chọn Hạn mới'}), 400

    han_moi = datetime.datetime.strptime(han_moi_str, '%Y-%m-%d').date()
    han_cu = deadline.han_nop

    if han_moi <= han_cu:
        return jsonify({'error': 'Hạn mới phải muộn hơn hạn hiện tại'}), 400

    extension_log = LichSuGiaHan(
        ma_gia_han=f"GH-{int(datetime.datetime.now().timestamp())}",
        ma_bai_tap=ma_bai_tap,
        han_cu=han_cu,
        han_moi=han_moi,
        ngay_gia_han=datetime.date.today(),
        ly_do=data.get('ly_do', 'Cần thêm thời gian hoàn thiện')
    )
    db.session.add(extension_log)

    deadline.han_nop = han_moi
    deadline.so_lan_gia_han += 1
    deadline.ngay_nhac_cuoi = None  # Allow automatic reminder cycle to run for the new date

    if deadline.trang_thai == 'Tre_han':
        deadline.trang_thai = 'Dang_lam'

    db.session.commit()

    # Dispatch extension push notification
    ext_msg = f"⌛ Gia hạn Deadline thành công: '{deadline.ten_bai_tap}'\n📅 Hạn mới: {han_moi.strftime('%d/%m/%Y')} (Gia hạn lần thứ {deadline.so_lan_gia_han})\n📝 Lý do: {extension_log.ly_do}"
    scheduler.gui_thong_bao(ext_msg, tieu_de="Gia hạn Deadline", tags="hourglass")

    return jsonify({
        'message': 'Gia hạn deadline thành công',
        'deadline': deadline.to_dict(),
        'lich_su': extension_log.to_dict()
    })



# ==========================================
# API: OUTPUT TU HOC (UC08)
# ==========================================
@app.route('/api/output/<ma_output>', methods=['PUT'])
def update_output_tu_hoc(ma_output):
    output_obj = OutputTuHoc.query.get(ma_output)
    if not output_obj:
        return jsonify({'error': 'Không tìm thấy kết quả output'}), 404

    data = request.json or {}
    output_obj.ket_qua_dat_duoc = data.get('ket_qua_dat_duoc', output_obj.ket_qua_dat_duoc)
    output_obj.tu_danh_gia = data.get('tu_danh_gia', output_obj.tu_danh_gia)
    output_obj.ngay_cap_nhat = datetime.date.today()

    db.session.commit()
    return jsonify({'message': 'Cập nhật kết quả output thành công', 'output': output_obj.to_dict()})


# ==========================================
# API: TAI LIEU (UC09, UC10)
# ==========================================
@app.route('/api/tai_lieu', methods=['GET'])
def get_tai_lieu():
    materials = TaiLieu.query.all()
    return jsonify([m.to_dict() for m in materials])


@app.route('/api/tai_lieu', methods=['POST'])
def create_tai_lieu():
    data = request.json or {}
    ma_mon = data.get('ma_mon')
    ten_tai_lieu = data.get('ten_tai_lieu', '').strip()
    link = data.get('link', '').strip()

    if not ma_mon or not ten_tai_lieu:
        return jsonify({'error': 'Môn học và Tên tài liệu là bắt buộc'}), 400

    existing_count = TaiLieu.query.filter_by(ma_mon=ma_mon).count()
    ma_tai_lieu = data.get('ma_tai_lieu') or f"{ma_mon}-TL{existing_count + 1:02d}"

    material = TaiLieu(
        ma_tai_lieu=ma_tai_lieu,
        ma_mon=ma_mon,
        ten_tai_lieu=ten_tai_lieu,
        loai_tai_lieu=data.get('loai_tai_lieu', 'Slide'),
        link=link if link else None,
        ngay_them=datetime.date.today()
    )
    db.session.add(material)
    db.session.commit()
    return jsonify({'message': 'Thêm tài liệu thành công', 'tai_lieu': material.to_dict()}), 201


@app.route('/api/tai_lieu/<ma_tai_lieu>', methods=['DELETE'])
def delete_tai_lieu(ma_tai_lieu):
    material = TaiLieu.query.get(ma_tai_lieu)
    if not material:
        return jsonify({'error': 'Không tìm thấy tài liệu'}), 404
    db.session.delete(material)
    db.session.commit()
    return jsonify({'message': 'Đã xóa tài liệu'})


# ==========================================
# API: NHAT KY THOI GIAN (UC11, UC12)
# ==========================================
@app.route('/api/nhat_ky', methods=['GET'])
def get_nhat_ky():
    logs = NhatKyThoiGian.query.order_by(NhatKyThoiGian.ngay.desc()).all()
    return jsonify([l.to_dict() for l in logs])


@app.route('/api/nhat_ky', methods=['POST'])
def create_nhat_ky():
    data = request.json or {}
    ma_bai_tap = data.get('ma_bai_tap')
    gio_thuc_te_val = data.get('gio_thuc_te')

    if not ma_bai_tap or gio_thuc_te_val is None:
        return jsonify({'error': 'Nhiệm vụ liên quan và Số giờ đã học là bắt buộc'}), 400

    try:
        gio_thuc_te = float(gio_thuc_te_val)
        if gio_thuc_te <= 0:
            raise ValueError()
    except ValueError:
        return jsonify({'error': 'Số giờ đã học phải là số dương hợp lệ'}), 400

    ngay_log = datetime.datetime.strptime(data['ngay'], '%Y-%m-%d').date() if data.get('ngay') else datetime.date.today()

    log_entry = NhatKyThoiGian(
        ma_log=f"LOG-{int(datetime.datetime.now().timestamp())}",
        ma_bai_tap=ma_bai_tap,
        ngay=ngay_log,
        gio_thuc_te=gio_thuc_te,
        muc_do_tap_trung=data.get('muc_do_tap_trung', 'Tot'),
        ghi_chu=data.get('ghi_chu', '')
    )
    db.session.add(log_entry)
    db.session.commit()

    new_streak = scheduler.calculate_streak()

    return jsonify({
        'message': 'Ghi nhận thời gian thành công',
        'log': log_entry.to_dict(),
        'streak': new_streak
    }), 201


# ==========================================
# API: MUC TIEU
# ==========================================
@app.route('/api/muc_tieu', methods=['GET'])
def get_muc_tieu():
    goals = MucTieu.query.all()
    return jsonify([g.to_dict() for g in goals])


@app.route('/api/muc_tieu', methods=['POST'])
def create_muc_tieu():
    data = request.json or {}
    ten_muc_tieu = data.get('ten_muc_tieu', '').strip()
    if not ten_muc_tieu:
        return jsonify({'error': 'Tên mục tiêu không được để trống'}), 400

    existing_count = MucTieu.query.count()
    ma_muc_tieu = f"MT-{existing_count + 1:03d}"

    goal = MucTieu(
        ma_muc_tieu=ma_muc_tieu,
        ma_mon=data.get('ma_mon') if data.get('ma_mon') else None,
        ten_muc_tieu=ten_muc_tieu,
        loai_muc_tieu=data.get('loai_muc_tieu', 'Dai_han'),
        ngay_bat_dau=datetime.datetime.strptime(data['ngay_bat_dau'], '%Y-%m-%d').date() if data.get('ngay_bat_dau') else datetime.date.today(),
        thoi_han=datetime.datetime.strptime(data['thoi_han'], '%Y-%m-%d').date() if data.get('thoi_han') else None,
        cac_buoc_hanh_dong=data.get('cac_buoc_hanh_dong', ''),
        tien_do_phan_tram=int(data.get('tien_do_phan_tram', 0)),
        trang_thai='Dang_thuc_hien'
    )
    db.session.add(goal)
    db.session.commit()
    return jsonify({'message': 'Tạo mục tiêu thành công', 'muc_tieu': goal.to_dict()}), 201


@app.route('/api/muc_tieu/<ma_muc_tieu>', methods=['PUT'])
def update_muc_tieu(ma_muc_tieu):
    goal = MucTieu.query.get(ma_muc_tieu)
    if not goal:
        return jsonify({'error': 'Không tìm thấy mục tiêu'}), 404

    data = request.json or {}
    goal.ten_muc_tieu = data.get('ten_muc_tieu', goal.ten_muc_tieu)
    goal.tien_do_phan_tram = int(data.get('tien_do_phan_tram', goal.tien_do_phan_tram))
    goal.trang_thai = data.get('trang_thai', goal.trang_thai)

    db.session.commit()
    return jsonify({'message': 'Cập nhật mục tiêu thành công', 'muc_tieu': goal.to_dict()})


# ==========================================
# API: LICH SU GIA HAN & BAO CAO TUAN
# ==========================================
@app.route('/api/lich_su_gia_han', methods=['GET'])
def get_lich_su_gia_han():
    logs = LichSuGiaHan.query.order_by(LichSuGiaHan.ngay_gia_han.desc()).all()
    return jsonify([l.to_dict() for l in logs])


@app.route('/api/bao_cao_tuan', methods=['GET'])
def get_bao_cao_tuan():
    report = scheduler.generate_weekly_report()
    return jsonify(report)


# ==========================================
# API: EXPORT DATA (UC18)
# ==========================================
@app.route('/api/export', methods=['GET'])
def export_data():
    return jsonify({
        'exported_at': datetime.datetime.now().isoformat(),
        'mon_hoc': [m.to_dict() for m in MonHoc.query.all()],
        'deadline': [d.to_dict() for d in Deadline.query.all()],
        'output_tu_hoc': [o.to_dict() for o in OutputTuHoc.query.all()],
        'tai_lieu': [t.to_dict() for t in TaiLieu.query.all()],
        'muc_tieu': [m.to_dict() for m in MucTieu.query.all()],
        'nhat_ky': [n.to_dict() for n in NhatKyThoiGian.query.all()],
        'lich_su_gia_han': [l.to_dict() for l in LichSuGiaHan.query.all()]
    })


# ==========================================
# API: LICH HOC & THỜI KHÓA BIỂU (UC19 - UC26)
# ==========================================
@app.route('/api/lich_hoc', methods=['GET'])
def get_lich_hoc():
    items = LichHoc.query.all()
    return jsonify([i.to_dict() for i in items])


@app.route('/api/lich_hoc', methods=['POST'])
def create_lich_hoc():
    data = request.json or {}
    loai_su_kien = data.get('loai_su_kien', 'Lich_hoc_co_dinh')
    lap_lai = data.get('lap_lai', True) if loai_su_kien == 'Lich_hoc_co_dinh' else False
    thu_trong_tuan = data.get('thu_trong_tuan')
    ngay_cu_the_str = data.get('ngay_cu_the')
    gio_bat_dau = data.get('gio_bat_dau')
    gio_ket_thuc = data.get('gio_ket_thuc')
    force_save = data.get('force', False)

    if not gio_bat_dau or not gio_ket_thuc:
        return jsonify({'error': 'Giờ bắt đầu và Giờ kết thúc là bắt buộc'}), 400

    if lap_lai and not thu_trong_tuan:
        return jsonify({'error': 'Thứ trong tuần là bắt buộc đối với lịch học lặp lại'}), 400

    if not lap_lai and not ngay_cu_the_str:
        return jsonify({'error': 'Ngày cụ thể là bắt buộc đối với sự kiện một lần'}), 400

    ngay_cu_the = datetime.datetime.strptime(ngay_cu_the_str, '%Y-%m-%d').date() if ngay_cu_the_str else None

    # UC25: Conflict Detection
    if not force_save:
        all_lich = LichHoc.query.all()
        conflict_item = None
        for lh in all_lich:
            same_day = False
            if lap_lai and lh.lap_lai and lh.thu_trong_tuan == thu_trong_tuan:
                same_day = True
            elif not lap_lai and not lh.lap_lai and lh.ngay_cu_the == ngay_cu_the:
                same_day = True
            elif lap_lai and not lh.lap_lai and lh.ngay_cu_the:
                # Compare day of week
                weekday_map = {0: 'T2', 1: 'T3', 2: 'T4', 3: 'T5', 4: 'T6', 5: 'T7', 6: 'CN'}
                if weekday_map.get(lh.ngay_cu_the.weekday()) == thu_trong_tuan:
                    same_day = True

            if same_day:
                # Time overlap check: new_start < existing_end and new_end > existing_start
                if (gio_bat_dau < lh.gio_ket_thuc) and (gio_ket_thuc > lh.gio_bat_dau):
                    conflict_item = lh
                    break

        if conflict_item:
            ten_trung = conflict_item.ten_hien_thi
            return jsonify({
                'conflict': True,
                'message': f"⚠ Trùng giờ với '{ten_trung}' ({conflict_item.gio_bat_dau} - {conflict_item.gio_ket_thuc}). Bạn có chắc muốn vẫn lưu?",
                'conflict_item': conflict_item.to_dict()
            }), 409

    ma_lich = f"LH-{int(datetime.datetime.now().timestamp())}"
    ma_mon = data.get('ma_mon') if data.get('ma_mon') else None
    mon = MonHoc.query.get(ma_mon) if ma_mon else None

    item = LichHoc(
        ma_lich=ma_lich,
        ma_mon=ma_mon,
        loai_su_kien=loai_su_kien,
        lap_lai=lap_lai,
        thu_trong_tuan=thu_trong_tuan,
        ngay_cu_the=ngay_cu_the,
        gio_bat_dau=gio_bat_dau,
        gio_ket_thuc=gio_ket_thuc,
        hinh_thuc=data.get('hinh_thuc', 'Offline'),
        dia_diem=data.get('dia_diem', ''),
        ten_su_kien=data.get('ten_su_kien', mon.ten_mon if mon else 'Lịch học'),
        ngay_bat_dau_ap_dung=datetime.datetime.strptime(data['ngay_bat_dau_ap_dung'], '%Y-%m-%d').date() if data.get('ngay_bat_dau_ap_dung') else None,
        ngay_ket_thuc_ap_dung=datetime.datetime.strptime(data['ngay_ket_thuc_ap_dung'], '%Y-%m-%d').date() if data.get('ngay_ket_thuc_ap_dung') else None,
        ghi_chu=data.get('ghi_chu', '')
    )
    db.session.add(item)
    db.session.commit()

    return jsonify({'message': 'Tạo lịch học thành công', 'lich_hoc': item.to_dict()}), 201


@app.route('/api/lich_hoc/<ma_lich>', methods=['PUT'])
def update_lich_hoc(ma_lich):
    item = LichHoc.query.get(ma_lich)
    if not item:
        return jsonify({'error': 'Không tìm thấy lịch học'}), 404

    data = request.json or {}
    item.gio_bat_dau = data.get('gio_bat_dau', item.gio_bat_dau)
    item.gio_ket_thuc = data.get('gio_ket_thuc', item.gio_ket_thuc)
    item.hinh_thuc = data.get('hinh_thuc', item.hinh_thuc)
    item.dia_diem = data.get('dia_diem', item.dia_diem)
    item.ten_su_kien = data.get('ten_su_kien', item.ten_su_kien)
    item.ghi_chu = data.get('ghi_chu', item.ghi_chu)

    db.session.commit()
    return jsonify({'message': 'Cập nhật lịch học thành công', 'lich_hoc': item.to_dict()})


@app.route('/api/lich_hoc/<ma_lich>', methods=['DELETE'])
def delete_lich_hoc(ma_lich):
    item = LichHoc.query.get(ma_lich)
    if not item:
        return jsonify({'error': 'Không tìm thấy lịch học'}), 404

    db.session.delete(item)
    db.session.commit()
    return jsonify({'message': 'Xóa lịch học thành công'})


# Overlay Calendar View (UC21, UC22, UC24)
@app.route('/api/calendar_view', methods=['GET'])
def get_calendar_view():
    start_str = request.args.get('start_date')
    end_str = request.args.get('end_date')

    if not start_str or not end_str:
        today = datetime.date.today()
        # Default to current week (Mon to Sun)
        start_date = today - datetime.timedelta(days=today.weekday())
        end_date = start_date + datetime.timedelta(days=6)
    else:
        start_date = datetime.datetime.strptime(start_str, '%Y-%m-%d').date()
        end_date = datetime.datetime.strptime(end_str, '%Y-%m-%d').date()

    lich_hocs = LichHoc.query.all()
    deadlines = Deadline.query.filter(
        Deadline.han_nop >= start_date,
        Deadline.han_nop <= end_date,
        Deadline.trang_thai != 'Hoan_thanh'
    ).all()

    weekday_map = {0: 'T2', 1: 'T3', 2: 'T4', 3: 'T5', 4: 'T6', 5: 'T7', 6: 'CN'}
    calendar_days = {}

    curr = start_date
    while curr <= end_date:
        d_str = curr.strftime('%Y-%m-%d')
        thu = weekday_map[curr.weekday()]

        day_items = []
        pin_points = []

        # 1. Matching Schedule items
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
                item_dict['date'] = d_str
                day_items.append(item_dict)

                # Pin Point rule: Vibrant Blue for fixed class (#2563EB), Violet for one-time event (#7C3AED)
                color = '#2563EB' if lh.loai_su_kien == 'Lich_hoc_co_dinh' else '#7C3AED'
                pin_points.append({
                    'type': 'Lich_hoc',
                    'color': color,
                    'title': lh.ten_hien_thi,
                    'time': f"{lh.gio_bat_dau} - {lh.gio_ket_thuc}"
                })

        # 2. Matching Deadlines Overlay (UC24)
        for dl in deadlines:
            if dl.han_nop == curr:
                dl_dict = dl.to_dict()
                dl_dict['is_deadline'] = True
                day_items.append(dl_dict)

                # Pin Point rule: Vibrant Red for High Priority (#EF4444), Amber for Med/Low (#F59E0B)
                color = '#EF4444' if dl.do_uu_tien == 'Cao' else '#F59E0B'
                pin_points.append({
                    'type': 'Deadline',
                    'color': color,
                    'title': f"Deadline: {dl.ten_bai_tap}",
                    'priority': dl.do_uu_tien
                })


        calendar_days[d_str] = {
            'date': d_str,
            'weekday': thu,
            'items': day_items,
            'pin_points': pin_points
        }

        curr += datetime.timedelta(days=1)

    return jsonify({
        'start_date': start_date.strftime('%Y-%m-%d'),
        'end_date': end_date.strftime('%Y-%m-%d'),
        'days': calendar_days
    })


if __name__ == '__main__':
    print("Starting Flask server on http://localhost:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)

