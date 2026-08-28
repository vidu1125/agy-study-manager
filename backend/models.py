import datetime
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class MonHoc(db.Model):
    __tablename__ = 'MON_HOC'
    
    ma_mon = db.Column(db.String(20), primary_key=True)
    ten_mon = db.Column(db.String(200), nullable=False)
    loai_mon = db.Column(db.String(20), nullable=False) # 'Truong' or 'Tu_hoc'
    giang_vien = db.Column(db.String(100), nullable=True) # Null if Tu_hoc
    so_tin_chi = db.Column(db.Integer, nullable=True) # Null if Tu_hoc
    nguon_hoc = db.Column(db.String(200), nullable=True) # Null if Truong
    muc_do_uu_tien = db.Column(db.String(20), nullable=False, default='Trung_binh') # 'Cao', 'Trung_binh', 'Thap'
    trang_thai = db.Column(db.String(20), nullable=False, default='Dang_hoc') # 'Dang_hoc', 'Da_xong' (soft-delete)

    # Relationships
    deadlines = db.relationship('Deadline', backref='mon_hoc', cascade='all, delete-orphan', lazy=True)
    tai_lieux = db.relationship('TaiLieu', backref='mon_hoc', cascade='all, delete-orphan', lazy=True)
    muc_tieus = db.relationship('MucTieu', backref='mon_hoc', lazy=True)
    lich_hocs = db.relationship('LichHoc', backref='mon_hoc', cascade='all, delete-orphan', lazy=True)


    def to_dict(self):
        return {
            'ma_mon': self.ma_mon,
            'ten_mon': self.ten_mon,
            'loai_mon': self.loai_mon,
            'giang_vien': self.giang_vien,
            'so_tin_chi': self.so_tin_chi,
            'nguon_hoc': self.nguon_hoc,
            'muc_do_uu_tien': self.muc_do_uu_tien,
            'trang_thai': self.trang_thai
        }


class Deadline(db.Model):
    __tablename__ = 'DEADLINE'
    
    ma_bai_tap = db.Column(db.String(30), primary_key=True)
    ma_mon = db.Column(db.String(20), db.ForeignKey('MON_HOC.ma_mon'), nullable=False)
    ten_bai_tap = db.Column(db.String(200), nullable=False)
    loai_bai = db.Column(db.String(30), nullable=False) # 'Bai_tap', 'Kiem_tra', 'Do_an', 'Thuyet_trinh'
    ngay_giao = db.Column(db.Date, nullable=True)
    han_nop = db.Column(db.Date, nullable=False)
    trang_thai = db.Column(db.String(20), nullable=False, default='Chua_lam') # 'Chua_lam', 'Dang_lam', 'Hoan_thanh', 'Tre_han'
    phan_tram_hoan_thanh = db.Column(db.Integer, default=0)
    do_uu_tien = db.Column(db.String(20), nullable=False, default='Trung_binh') # 'Cao', 'Trung_binh', 'Thap'
    nguoi_dat_han = db.Column(db.String(20), nullable=False) # 'Giang_vien', 'Tu_dat'
    output_mong_muon = db.Column(db.Text, nullable=True) # Required if Tu_dat
    link_tai_lieu = db.Column(db.String(500), nullable=True)
    so_lan_gia_han = db.Column(db.Integer, default=0)
    ngay_nhac_cuoi = db.Column(db.Date, nullable=True)

    # Relationships
    output_tu_hoc = db.relationship('OutputTuHoc', backref='deadline', uselist=False, cascade='all, delete-orphan')
    nhat_ky_thoi_gian = db.relationship('NhatKyThoiGian', backref='deadline', cascade='all, delete-orphan', lazy=True)
    lich_su_gia_han = db.relationship('LichSuGiaHan', backref='deadline', cascade='all, delete-orphan', lazy=True)

    @property
    def so_ngay_con_lai(self):
        if not self.han_nop:
            return 0
        today = datetime.date.today()
        return (self.han_nop - today).days

    def to_dict(self):
        # Auto compute status if past due and not finished
        current_status = self.trang_thai
        if current_status not in ['Hoan_thanh'] and self.so_ngay_con_lai < 0:
            current_status = 'Tre_han'

        return {
            'ma_bai_tap': self.ma_bai_tap,
            'ma_mon': self.ma_mon,
            'ten_mon': self.mon_hoc.ten_mon if self.mon_hoc else '',
            'ten_bai_tap': self.ten_bai_tap,
            'loai_bai': self.loai_bai,
            'ngay_giao': self.ngay_giao.strftime('%Y-%m-%d') if self.ngay_giao else None,
            'han_nop': self.han_nop.strftime('%Y-%m-%d'),
            'trang_thai': current_status,
            'phan_tram_hoan_thanh': self.phan_tram_hoan_thanh,
            'do_uu_tien': self.do_uu_tien,
            'nguoi_dat_han': self.nguoi_dat_han,
            'output_mong_muon': self.output_mong_muon,
            'link_tai_lieu': self.link_tai_lieu,
            'so_lan_gia_han': self.so_lan_gia_han,
            'so_ngay_con_lai': self.so_ngay_con_lai,
            'ngay_nhac_cuoi': self.ngay_nhac_cuoi.strftime('%Y-%m-%d') if self.ngay_nhac_cuoi else None
        }


class OutputTuHoc(db.Model):
    __tablename__ = 'OUTPUT_TU_HOC'
    
    ma_output = db.Column(db.String(30), primary_key=True)
    ma_bai_tap = db.Column(db.String(30), db.ForeignKey('DEADLINE.ma_bai_tap'), nullable=False, unique=True)
    tieu_chi_hoan_thanh = db.Column(db.Text, nullable=False)
    ket_qua_dat_duoc = db.Column(db.Text, nullable=True)
    ngay_cap_nhat = db.Column(db.Date, default=datetime.date.today)
    tu_danh_gia = db.Column(db.String(20), nullable=True) # 'Dat', 'Chua_dat', 'Can_lam_lai'

    def to_dict(self):
        return {
            'ma_output': self.ma_output,
            'ma_bai_tap': self.ma_bai_tap,
            'tieu_chi_hoan_thanh': self.tieu_chi_hoan_thanh,
            'ket_qua_dat_duoc': self.ket_qua_dat_duoc,
            'ngay_cap_nhat': self.ngay_cap_nhat.strftime('%Y-%m-%d'),
            'tu_danh_gia': self.tu_danh_gia
        }


class LichSuGiaHan(db.Model):
    __tablename__ = 'LICH_SU_GIA_HAN'
    
    ma_gia_han = db.Column(db.String(30), primary_key=True)
    ma_bai_tap = db.Column(db.String(30), db.ForeignKey('DEADLINE.ma_bai_tap'), nullable=False)
    han_cu = db.Column(db.Date, nullable=False)
    han_moi = db.Column(db.Date, nullable=False)
    ngay_gia_han = db.Column(db.Date, default=datetime.date.today)
    ly_do = db.Column(db.Text, nullable=True)

    def to_dict(self):
        ten_bai = self.deadline.ten_bai_tap if self.deadline else self.ma_bai_tap
        mon_ten = self.deadline.mon_hoc.ten_mon if (self.deadline and self.deadline.mon_hoc) else ''
        return {
            'ma_gia_han': self.ma_gia_han,
            'ma_bai_tap': self.ma_bai_tap,
            'ten_bai_tap': ten_bai,
            'ten_mon': mon_ten,
            'han_cu': self.han_cu.strftime('%Y-%m-%d'),
            'han_moi': self.han_moi.strftime('%Y-%m-%d'),
            'ngay_gia_han': self.ngay_gia_han.strftime('%Y-%m-%d'),
            'ly_do': self.ly_do
        }


class TaiLieu(db.Model):
    __tablename__ = 'TAI_LIEU'
    
    ma_tai_lieu = db.Column(db.String(30), primary_key=True)
    # Tài liệu có thể là tài liệu chung, không bắt buộc gắn với một môn học.
    ma_mon = db.Column(db.String(20), db.ForeignKey('MON_HOC.ma_mon'), nullable=True)
    ten_tai_lieu = db.Column(db.String(200), nullable=False)
    loai_tai_lieu = db.Column(db.String(30), nullable=False) # 'Slide', 'De_cuong', 'Bai_giai', 'Video', 'Sach'
    link = db.Column(db.String(500), nullable=True)
    ngay_them = db.Column(db.Date, default=datetime.date.today)

    def to_dict(self):
        return {
            'ma_tai_lieu': self.ma_tai_lieu,
            'ma_mon': self.ma_mon,
            'ten_mon': self.mon_hoc.ten_mon if self.mon_hoc else '',
            'ten_tai_lieu': self.ten_tai_lieu,
            'loai_tai_lieu': self.loai_tai_lieu,
            'link': self.link,
            'ngay_them': self.ngay_them.strftime('%Y-%m-%d') if self.ngay_them else None
        }


class MucTieu(db.Model):
    __tablename__ = 'MUC_TIEU'
    
    ma_muc_tieu = db.Column(db.String(30), primary_key=True)
    ma_mon = db.Column(db.String(20), db.ForeignKey('MON_HOC.ma_mon'), nullable=True)
    ten_muc_tieu = db.Column(db.String(300), nullable=False)
    loai_muc_tieu = db.Column(db.String(20), nullable=False, default='Ngan_han') # 'Ngan_han', 'Dai_han'
    ngay_bat_dau = db.Column(db.Date, nullable=True)
    thoi_han = db.Column(db.Date, nullable=True)
    cac_buoc_hanh_dong = db.Column(db.Text, nullable=True)
    tien_do_phan_tram = db.Column(db.Integer, default=0)
    trang_thai = db.Column(db.String(20), default='Dang_thuc_hien') # 'Dang_thuc_hien', 'Hoan_thanh', 'Tam_dung'

    def to_dict(self):
        return {
            'ma_muc_tieu': self.ma_muc_tieu,
            'ma_mon': self.ma_mon,
            'ten_mon': self.mon_hoc.ten_mon if self.mon_hoc else 'Mục tiêu chung',
            'ten_muc_tieu': self.ten_muc_tieu,
            'loai_muc_tieu': self.loai_muc_tieu,
            'ngay_bat_dau': self.ngay_bat_dau.strftime('%Y-%m-%d') if self.ngay_bat_dau else None,
            'thoi_han': self.thoi_han.strftime('%Y-%m-%d') if self.thoi_han else None,
            'cac_buoc_hanh_dong': self.cac_buoc_hanh_dong,
            'tien_do_phan_tram': self.tien_do_phan_tram,
            'trang_thai': self.trang_thai
        }


class NhatKyThoiGian(db.Model):
    __tablename__ = 'NHAT_KY_THOI_GIAN'
    
    ma_log = db.Column(db.String(30), primary_key=True)
    ma_bai_tap = db.Column(db.String(30), db.ForeignKey('DEADLINE.ma_bai_tap'), nullable=False)
    ngay = db.Column(db.Date, default=datetime.date.today)
    gio_thuc_te = db.Column(db.Float, nullable=False)
    muc_do_tap_trung = db.Column(db.String(20), nullable=False, default='Tot') # 'Tot', 'Trung_binh', 'Xao_nhang'
    ghi_chu = db.Column(db.Text, nullable=True)

    def to_dict(self):
        return {
            'ma_log': self.ma_log,
            'ma_bai_tap': self.ma_bai_tap,
            'ten_bai_tap': self.deadline.ten_bai_tap if self.deadline else '',
            'ten_mon': self.deadline.mon_hoc.ten_mon if (self.deadline and self.deadline.mon_hoc) else '',
            'ngay': self.ngay.strftime('%Y-%m-%d') if self.ngay else None,
            'gio_thuc_te': self.gio_thuc_te,
            'muc_do_tap_trung': self.muc_do_tap_trung,
            'ghi_chu': self.ghi_chu
        }


class LogLoi(db.Model):
    __tablename__ = 'LOG_LOI'

    ma_log_loi = db.Column(db.Integer, primary_key=True, autoincrement=True)
    thoi_gian = db.Column(db.DateTime, default=datetime.datetime.now)
    noi_dung_loi = db.Column(db.Text, nullable=False)
    ham_gay_loi = db.Column(db.String(100), nullable=True)

    def to_dict(self):
        return {
            'ma_log_loi': self.ma_log_loi,
            'thoi_gian': self.thoi_gian.strftime('%Y-%m-%d %H:%M:%S') if self.thoi_gian else None,
            'noi_dung_loi': self.noi_dung_loi,
            'ham_gay_loi': self.ham_gay_loi
        }


class LichHoc(db.Model):
    __tablename__ = 'LICH_HOC'

    ma_lich = db.Column(db.String(30), primary_key=True)
    ma_mon = db.Column(db.String(20), db.ForeignKey('MON_HOC.ma_mon'), nullable=True) # Nullable for non-subject events
    loai_su_kien = db.Column(db.String(30), nullable=False, default='Lich_hoc_co_dinh') # 'Lich_hoc_co_dinh', 'Su_kien_mot_lan'
    lap_lai = db.Column(db.Boolean, default=True)
    thu_trong_tuan = db.Column(db.String(10), nullable=True) # 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'
    ngay_cu_the = db.Column(db.Date, nullable=True) # Used if lap_lai = False
    gio_bat_dau = db.Column(db.String(10), nullable=False) # e.g. '07:00'
    gio_ket_thuc = db.Column(db.String(10), nullable=False) # e.g. '09:00'
    hinh_thuc = db.Column(db.String(20), default='Offline') # 'Offline', 'Online'
    dia_diem = db.Column(db.String(200), nullable=True)
    ten_su_kien = db.Column(db.String(200), nullable=True) # Custom title when ma_mon is Null
    ngay_bat_dau_ap_dung = db.Column(db.Date, nullable=True)
    ngay_ket_thuc_ap_dung = db.Column(db.Date, nullable=True)
    ghi_chu = db.Column(db.Text, nullable=True)

    @property
    def ten_hien_thi(self):
        if self.ten_su_kien:
            return self.ten_su_kien
        if self.mon_hoc:
            return self.mon_hoc.ten_mon
        return 'Lịch học'

    def to_dict(self):
        return {
            'ma_lich': self.ma_lich,
            'ma_mon': self.ma_mon,
            'ten_mon': self.mon_hoc.ten_mon if self.mon_hoc else '',
            'ten_hien_thi': self.ten_hien_thi,
            'loai_su_kien': self.loai_su_kien,
            'lap_lai': self.lap_lai,
            'thu_trong_tuan': self.thu_trong_tuan,
            'ngay_cu_the': self.ngay_cu_the.strftime('%Y-%m-%d') if self.ngay_cu_the else None,
            'gio_bat_dau': self.gio_bat_dau,
            'gio_ket_thuc': self.gio_ket_thuc,
            'hinh_thuc': self.hinh_thuc,
            'dia_diem': self.dia_diem,
            'ten_su_kien': self.ten_su_kien,
            'ngay_bat_dau_ap_dung': self.ngay_bat_dau_ap_dung.strftime('%Y-%m-%d') if self.ngay_bat_dau_ap_dung else None,
            'ngay_ket_thuc_ap_dung': self.ngay_ket_thuc_ap_dung.strftime('%Y-%m-%d') if self.ngay_ket_thuc_ap_dung else None,
            'ghi_chu': self.ghi_chu
        }


# =============================================================================
# HỌC TỪ VỰNG — SPACED REPETITION (SM-2 / Anki-inspired)
# =============================================================================

class VocabDeckConfig(db.Model):
    """Preset lịch ôn. V1 dùng một preset riêng cho mỗi deck để dễ cấu hình."""
    __tablename__ = 'VOCAB_DECK_CONFIG'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False, default='Mặc định')
    new_cards_per_day = db.Column(db.Integer, nullable=False, default=20)
    reviews_per_day = db.Column(db.Integer, nullable=False, default=200)
    learning_steps = db.Column(db.String(50), nullable=False, default='1m 10m')
    relearning_steps = db.Column(db.String(50), nullable=False, default='10m')
    graduating_interval_days = db.Column(db.Integer, nullable=False, default=1)
    easy_interval_days = db.Column(db.Integer, nullable=False, default=4)
    starting_ease = db.Column(db.Integer, nullable=False, default=250)
    easy_bonus_pct = db.Column(db.Integer, nullable=False, default=130)
    hard_interval_pct = db.Column(db.Integer, nullable=False, default=120)
    interval_modifier_pct = db.Column(db.Integer, nullable=False, default=100)
    lapse_new_interval_pct = db.Column(db.Integer, nullable=False, default=10)
    minimum_ease = db.Column(db.Integer, nullable=False, default=130)
    maximum_interval_days = db.Column(db.Integer, nullable=False, default=36500)
    leech_threshold = db.Column(db.Integer, nullable=False, default=8)
    leech_action = db.Column(db.String(20), nullable=False, default='suspend')
    bury_siblings = db.Column(db.Boolean, nullable=False, default=True)
    new_card_order = db.Column(db.String(20), nullable=False, default='added_order')
    day_start_hour = db.Column(db.Integer, nullable=False, default=4)

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name,
            'new_cards_per_day': self.new_cards_per_day,
            'reviews_per_day': self.reviews_per_day,
            'learning_steps': self.learning_steps,
            'relearning_steps': self.relearning_steps,
            'graduating_interval_days': self.graduating_interval_days,
            'easy_interval_days': self.easy_interval_days,
            'starting_ease': self.starting_ease,
            'easy_bonus_pct': self.easy_bonus_pct,
            'hard_interval_pct': self.hard_interval_pct,
            'interval_modifier_pct': self.interval_modifier_pct,
            'lapse_new_interval_pct': self.lapse_new_interval_pct,
            'minimum_ease': self.minimum_ease,
            'maximum_interval_days': self.maximum_interval_days,
            'leech_threshold': self.leech_threshold,
            'leech_action': self.leech_action,
            'bury_siblings': self.bury_siblings,
            'new_card_order': self.new_card_order,
            'day_start_hour': self.day_start_hour,
        }


class VocabDeck(db.Model):
    __tablename__ = 'VOCAB_DECK'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    name = db.Column(db.String(100), nullable=False)
    description = db.Column(db.Text, nullable=True)
    config_id = db.Column(db.Integer, db.ForeignKey('VOCAB_DECK_CONFIG.id'), nullable=False)
    is_archived = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)

    config = db.relationship('VocabDeckConfig', backref=db.backref('vocab_decks', lazy=True))
    notes = db.relationship('VocabNote', backref='deck', cascade='all, delete-orphan', lazy=True)
    cards = db.relationship('VocabCard', backref='deck', cascade='all, delete-orphan', lazy=True)

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'description': self.description or '',
            'config_id': self.config_id, 'is_archived': self.is_archived,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class VocabNote(db.Model):
    """Note là nội dung gốc; V1 hỗ trợ Basic Vocabulary sinh 2 card hai chiều."""
    __tablename__ = 'VOCAB_NOTE'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    deck_id = db.Column(db.Integer, db.ForeignKey('VOCAB_DECK.id'), nullable=False, index=True)
    word = db.Column(db.String(300), nullable=False)
    ipa = db.Column(db.String(300), nullable=True)
    meaning = db.Column(db.Text, nullable=False)
    example = db.Column(db.Text, nullable=True)
    tags = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)

    cards = db.relationship('VocabCard', backref='note', cascade='all, delete-orphan', lazy=True)

    def to_dict(self):
        return {
            'id': self.id, 'deck_id': self.deck_id, 'word': self.word,
            'ipa': self.ipa or '', 'meaning': self.meaning,
            'example': self.example or '', 'tags': self.tags or '',
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class VocabCard(db.Model):
    __tablename__ = 'VOCAB_CARD'
    __table_args__ = (db.Index('ix_vocab_card_deck_state_due', 'deck_id', 'state', 'due_at'),)

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    note_id = db.Column(db.Integer, db.ForeignKey('VOCAB_NOTE.id'), nullable=False, index=True)
    deck_id = db.Column(db.Integer, db.ForeignKey('VOCAB_DECK.id'), nullable=False, index=True)
    direction = db.Column(db.String(10), nullable=False)  # en_vi | vi_en
    state = db.Column(db.String(20), nullable=False, default='new')
    queue = db.Column(db.String(20), nullable=False, default='new')
    due_at = db.Column(db.DateTime, nullable=True)
    due_order = db.Column(db.Integer, nullable=False, default=0)
    interval_days = db.Column(db.Integer, nullable=False, default=0)
    ease_factor = db.Column(db.Integer, nullable=False, default=250)
    repetitions = db.Column(db.Integer, nullable=False, default=0)
    lapses = db.Column(db.Integer, nullable=False, default=0)
    left_steps = db.Column(db.Integer, nullable=False, default=0)
    is_leech = db.Column(db.Boolean, nullable=False, default=False)
    suspended_from_state = db.Column(db.String(20), nullable=True)
    suspended_at = db.Column(db.DateTime, nullable=True)
    buried_until = db.Column(db.DateTime, nullable=True)
    last_reviewed_at = db.Column(db.DateTime, nullable=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)

    reviews = db.relationship('VocabReviewLog', backref='card', cascade='all, delete-orphan', lazy=True)

    def to_dict(self):
        return {
            'id': self.id, 'note_id': self.note_id, 'deck_id': self.deck_id,
            'direction': self.direction, 'state': self.state, 'queue': self.queue,
            'due_at': self.due_at.isoformat() if self.due_at else None,
            'due_order': self.due_order, 'interval_days': self.interval_days,
            'ease_factor': self.ease_factor, 'repetitions': self.repetitions,
            'lapses': self.lapses, 'left_steps': self.left_steps,
            'is_leech': self.is_leech,
            'buried_until': self.buried_until.isoformat() if self.buried_until else None,
            'last_reviewed_at': self.last_reviewed_at.isoformat() if self.last_reviewed_at else None,
        }


class VocabStudySession(db.Model):
    __tablename__ = 'VOCAB_STUDY_SESSION'

    id = db.Column(db.String(36), primary_key=True)
    deck_id = db.Column(db.Integer, db.ForeignKey('VOCAB_DECK.id'), nullable=True)
    started_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow)
    ended_at = db.Column(db.DateTime, nullable=True)
    new_cards_studied = db.Column(db.Integer, nullable=False, default=0)
    reviews_done = db.Column(db.Integer, nullable=False, default=0)
    again_count = db.Column(db.Integer, nullable=False, default=0)
    hard_count = db.Column(db.Integer, nullable=False, default=0)
    good_count = db.Column(db.Integer, nullable=False, default=0)
    easy_count = db.Column(db.Integer, nullable=False, default=0)


class VocabReviewLog(db.Model):
    __tablename__ = 'VOCAB_REVIEW_LOG'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    card_id = db.Column(db.Integer, db.ForeignKey('VOCAB_CARD.id'), nullable=False, index=True)
    session_id = db.Column(db.String(36), db.ForeignKey('VOCAB_STUDY_SESSION.id'), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=False, default=datetime.datetime.utcnow, index=True)
    study_day = db.Column(db.Date, nullable=False, default=datetime.date.today, index=True)
    answer_button = db.Column(db.String(10), nullable=False)
    state_before = db.Column(db.String(20), nullable=False)
    state_after = db.Column(db.String(20), nullable=False)
    ease_before = db.Column(db.Integer, nullable=False)
    ease_after = db.Column(db.Integer, nullable=False)
    interval_before_days = db.Column(db.Integer, nullable=False)
    interval_after_days = db.Column(db.Integer, nullable=False)
    time_taken_ms = db.Column(db.Integer, nullable=True)

