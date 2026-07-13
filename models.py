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
    ma_mon = db.Column(db.String(20), db.ForeignKey('MON_HOC.ma_mon'), nullable=False)
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



