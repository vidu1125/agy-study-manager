import datetime
from models import db, MonHoc, Deadline, OutputTuHoc, TaiLieu, MucTieu, NhatKyThoiGian, LichSuGiaHan, LichHoc

def seed_database():
    # If data already exists, don't re-seed
    if MonHoc.query.first():
        return

    today = datetime.date.today()


    # 1. MON HOC
    m1 = MonHoc(
        ma_mon='TOA101',
        ten_mon='Giải tích 2',
        loai_mon='Truong',
        giang_vien='TS. Nguyễn Văn A',
        so_tin_chi=3,
        muc_do_uu_tien='Cao',
        trang_thai='Dang_hoc'
    )
    m2 = MonHoc(
        ma_mon='INT2204',
        ten_mon='Lập trình Hướng đối tượng',
        loai_mon='Truong',
        giang_vien='ThS. Trần Thị B',
        so_tin_chi=4,
        muc_do_uu_tien='Cao',
        trang_thai='Dang_hoc'
    )
    m3 = MonHoc(
        ma_mon='TUHOC-IELTS',
        ten_mon='Tự học IELTS 7.0 Overall',
        loai_mon='Tu_hoc',
        nguon_hoc='Cambridge 14-18, Simon IELTS, Keith Speaking',
        muc_do_uu_tien='Cao',
        trang_thai='Dang_hoc'
    )
    m4 = MonHoc(
        ma_mon='TUHOC-REACT',
        ten_mon='Chuyên sâu React & Next.js Framework',
        loai_mon='Tu_hoc',
        nguon_hoc='Khóa học Udemy - Maximilian Schwarzmüller',
        muc_do_uu_tien='Trung_binh',
        trang_thai='Dang_hoc'
    )
    db.session.add_all([m1, m2, m3, m4])
    db.session.commit()

    # 2. DEADLINE
    d1 = Deadline(
        ma_bai_tap='TOA101-BT01',
        ma_mon='TOA101',
        ten_bai_tap='Bài tập Chương 5: Tích phân bội 3',
        loai_bai='Bai_tap',
        ngay_giao=today - datetime.timedelta(days=4),
        han_nop=today + datetime.timedelta(days=2),
        trang_thai='Dang_lam',
        phan_tram_hoan_thanh=60,
        do_uu_tien='Cao',
        nguoi_dat_han='Giang_vien',
        link_tai_lieu='https://drive.google.com/file/d/sample-math'
    )
    d2 = Deadline(
        ma_bai_tap='INT2204-KT01',
        ma_mon='INT2204',
        ten_bai_tap='Đồ án giữa kỳ: Đề tài Quản lý Học tập',
        loai_bai='Do_an',
        ngay_giao=today - datetime.timedelta(days=10),
        han_nop=today + datetime.timedelta(days=5),
        trang_thai='Dang_lam',
        phan_tram_hoan_thanh=45,
        do_uu_tien='Cao',
        nguoi_dat_han='Giang_vien',
        link_tai_lieu='https://github.com/sample/oop-project'
    )
    d3 = Deadline(
        ma_bai_tap='TUHOC-IELTS-NV01',
        ma_mon='TUHOC-IELTS',
        ten_bai_tap='Làm 3 đề Reading Cambridge 17 & 18',
        loai_bai='Bai_tap',
        ngay_giao=today - datetime.timedelta(days=2),
        han_nop=today + datetime.timedelta(days=1),
        trang_thai='Dang_lam',
        phan_tram_hoan_thanh=30,
        do_uu_tien='Cao',
        nguoi_dat_han='Tu_dat',
        output_mong_muon='Đạt tối thiểu 7.5/9.0 từng bài test và nạp thêm 20 từ vựng vào bộ thẻ flashcard'
    )
    d4 = Deadline(
        ma_bai_tap='TUHOC-REACT-NV01',
        ma_mon='TUHOC-REACT',
        ten_bai_tap='Hoàn thành Section 8: State Management & Redux Toolkit',
        loai_bai='Bai_tap',
        ngay_giao=today - datetime.timedelta(days=5),
        han_nop=today - datetime.timedelta(days=1), # Overdue sample
        trang_thai='Tre_han',
        phan_tram_hoan_thanh=20,
        do_uu_tien='Trung_binh',
        nguoi_dat_han='Tu_dat',
        output_mong_muon='Viết 1 ứng dụng demo quản lý giỏ hàng dùng Redux'
    )

    db.session.add_all([d1, d2, d3, d4])
    db.session.commit()

    # 3. OUTPUT TU HOC (for Tu_dat deadlines)
    out1 = OutputTuHoc(
        ma_output='TUHOC-IELTS-NV01-OUT',
        ma_bai_tap='TUHOC-IELTS-NV01',
        tieu_chi_hoan_thanh='Đạt 7.5/9.0 cho 3 bài test Reading',
        ket_qua_dat_duoc='Đã giải xong Test 1 đạt 8.0',
        ngay_cap_nhat=today,
        tu_danh_gia='Dat'
    )
    out2 = OutputTuHoc(
        ma_output='TUHOC-REACT-NV01-OUT',
        ma_bai_tap='TUHOC-REACT-NV01',
        tieu_chi_hoan_thanh='Build demo app Redux Toolkit',
        ket_qua_dat_duoc='Mới học xong 5 video lý thuyết',
        ngay_cap_nhat=today - datetime.timedelta(days=1),
        tu_danh_gia='Can_lam_lai'
    )
    db.session.add_all([out1, out2])

    # 4. TAI LIEU
    tl1 = TaiLieu(
        ma_tai_lieu='TOA101-TL01',
        ma_mon='TOA101',
        ten_tai_lieu='Slide Bài giảng Tích phân Bội 3 & Ứng dụng',
        loai_tai_lieu='Slide',
        link='https://course.university.edu.vn/slides/math2-chap5.pdf',
        ngay_them=today - datetime.timedelta(days=7)
    )
    tl2 = TaiLieu(
        ma_tai_lieu='TUHOC-IELTS-TL01',
        ma_mon='TUHOC-IELTS',
        ten_tai_lieu='Tổng hợp Template Writing Task 2 - Thầy Simon',
        loai_tai_lieu='De_cuong',
        link='https://ielts-simon.com/writing-task-2-guide',
        ngay_them=today - datetime.timedelta(days=3)
    )
    db.session.add_all([tl1, tl2])

    # 5. MUC TIEU
    mt1 = MucTieu(
        ma_muc_tieu='MT-GPA35',
        ma_mon=None,
        ten_muc_tieu='Đạt GPA tổng kết Hè 3.5/4.0',
        loai_muc_tieu='Dai_han',
        ngay_bat_dau=today - datetime.timedelta(days=30),
        thoi_han=today + datetime.timedelta(days=90),
        cac_buoc_hanh_dong='Làm bài tập đúng hạn 100%, ôn thi trước 2 tuần',
        tien_do_phan_tram=75,
        trang_thai='Dang_thuc_hien'
    )
    mt2 = MucTieu(
        ma_muc_tieu='MT-IELTS70',
        ma_mon='TUHOC-IELTS',
        ten_muc_tieu='Thi đạt chứng chỉ IELTS 7.0 Overall trước tháng 12/2026',
        loai_muc_tieu='Dai_han',
        ngay_bat_dau=today - datetime.timedelta(days=15),
        thoi_han=today + datetime.timedelta(days=120),
        cac_buoc_hanh_dong='Luyện Reading 3 đề/tuần, Speaking 30p/ngày',
        tien_do_phan_tram=45,
        trang_thai='Dang_thuc_hien'
    )
    db.session.add_all([mt1, mt2])

    # 6. NHAT KY THOI GIAN (Logs for streak)
    log1 = NhatKyThoiGian(
        ma_log='LOG-001',
        ma_bai_tap='TOA101-BT01',
        ngay=today - datetime.timedelta(days=2),
        gio_thuc_te=2.0,
        muc_do_tap_trung='Tot',
        ghi_chu='Giải hết bài tập 5.1 và 5.2'
    )
    log2 = NhatKyThoiGian(
        ma_log='LOG-002',
        ma_bai_tap='TUHOC-IELTS-NV01',
        ngay=today - datetime.timedelta(days=1),
        gio_thuc_te=1.5,
        muc_do_tap_trung='Tot',
        ghi_chu='Làm 1 bài Reading Cam 17 Test 1'
    )
    log3 = NhatKyThoiGian(
        ma_log='LOG-003',
        ma_bai_tap='INT2204-KT01',
        ngay=today,
        gio_thuc_te=3.0,
        muc_do_tap_trung='Tot',
        ghi_chu='Thiết kế ERD và viết class backend'
    )
    db.session.add_all([log1, log2, log3])

    # 7. LICH HOC (Timetable & Events)
    lh1 = LichHoc(
        ma_lich='LH-TOA101-T2',
        ma_mon='TOA101',
        loai_su_kien='Lich_hoc_co_dinh',
        lap_lai=True,
        thu_trong_tuan='T2',
        gio_bat_dau='07:00',
        gio_ket_thuc='09:00',
        hinh_thuc='Offline',
        dia_diem='Phòng A2-301',
        ten_su_kien='Giải tích 2',
        ngay_bat_dau_ap_dung=today - datetime.timedelta(days=30),
        ngay_ket_thuc_ap_dung=today + datetime.timedelta(days=90)
    )
    lh2 = LichHoc(
        ma_lich='LH-TOA101-T5',
        ma_mon='TOA101',
        loai_su_kien='Lich_hoc_co_dinh',
        lap_lai=True,
        thu_trong_tuan='T5',
        gio_bat_dau='07:00',
        gio_ket_thuc='09:00',
        hinh_thuc='Offline',
        dia_diem='Phòng A2-301',
        ten_su_kien='Giải tích 2',
        ngay_bat_dau_ap_dung=today - datetime.timedelta(days=30),
        ngay_ket_thuc_ap_dung=today + datetime.timedelta(days=90)
    )
    lh3 = LichHoc(
        ma_lich='LH-INT2204-T3',
        ma_mon='INT2204',
        loai_su_kien='Lich_hoc_co_dinh',
        lap_lai=True,
        thu_trong_tuan='T3',
        gio_bat_dau='09:30',
        gio_ket_thuc='11:30',
        hinh_thuc='Offline',
        dia_diem='Phòng B1-205',
        ten_su_kien='Lập trình Hướng đối tượng',
        ngay_bat_dau_ap_dung=today - datetime.timedelta(days=30),
        ngay_ket_thuc_ap_dung=today + datetime.timedelta(days=90)
    )
    lh4 = LichHoc(
        ma_lich='LH-INT2204-T6',
        ma_mon='INT2204',
        loai_su_kien='Lich_hoc_co_dinh',
        lap_lai=True,
        thu_trong_tuan='T6',
        gio_bat_dau='09:30',
        gio_ket_thuc='11:30',
        hinh_thuc='Offline',
        dia_diem='Phòng B1-205',
        ten_su_kien='Lập trình Hướng đối tượng',
        ngay_bat_dau_ap_dung=today - datetime.timedelta(days=30),
        ngay_ket_thuc_ap_dung=today + datetime.timedelta(days=90)
    )
    lh5 = LichHoc(
        ma_lich='LH-SK-BAOVE-DOAN',
        ma_mon='INT2204',
        loai_su_kien='Su_kien_mot_lan',
        lap_lai=False,
        thu_trong_tuan=None,
        ngay_cu_the=today + datetime.timedelta(days=5),
        gio_bat_dau='08:00',
        gio_ket_thuc='10:00',
        hinh_thuc='Offline',
        dia_diem='Hội trường C2',
        ten_su_kien='Bảo vệ Đồ án giữa kỳ INT2204'
    )
    db.session.add_all([lh1, lh2, lh3, lh4, lh5])

    db.session.commit()
    print("Database seeded with comprehensive initial sample data successfully!")

