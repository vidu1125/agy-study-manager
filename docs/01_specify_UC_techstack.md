# ĐẶC TẢ USE CASE & TECH STACK
## Hệ thống Quản lý Học tập & Deadline Cá nhân

---

## 1. Tổng quan hệ thống

**Mục đích:** Ứng dụng web cá nhân (single-user) giúp quản lý môn học (cả môn ở trường và môn tự học), theo dõi deadline, output, thời gian học thực tế, và nhận nhắc nhở tự động.

**Phạm vi:** Không có phân quyền nhiều người dùng. Không cần đăng nhập phức tạp (có thể chỉ 1 tài khoản admin/owner).

---

## 2. Actor

| Actor | Mô tả |
|---|---|
| **Người dùng (Owner)** | Người duy nhất sử dụng hệ thống, thao tác nhập liệu, xem dashboard |
| **Scheduler (hệ thống nền)** | Cron job / background worker tự động quét dữ liệu và gửi thông báo, không cần thao tác thủ công |

---

## 3. Danh sách Use Case đầy đủ

### Nhóm A — Quản lý Môn học

**UC01 — Tạo môn học mới (trường)**
- Actor: Người dùng
- Input: tên môn, mã môn, giảng viên, số tín chỉ, mức ưu tiên
- Output: 1 bản ghi mới trong bảng `mon_hoc` với `loai_mon = "Truong"`

**UC02 — Tạo môn tự học**
- Actor: Người dùng
- Input: tên môn, nguồn học (VD: Udemy, sách, khóa online), mức ưu tiên
- Output: 1 bản ghi `mon_hoc` với `loai_mon = "Tu_hoc"`, các trường giảng viên/tín chỉ để trống
- Điều kiện đặc biệt: hệ thống gợi ý tạo luôn 1 mục tiêu tương ứng trong bảng `muc_tieu` nếu người dùng đồng ý

**UC03 — Chỉnh sửa / Vô hiệu hóa môn học**
- Actor: Người dùng
- Mô tả: sửa thông tin môn hoặc đánh dấu môn đã kết thúc (không xóa cứng, dùng soft-delete/status)

---

### Nhóm B — Quản lý Deadline & Nhiệm vụ

**UC04 — Tạo deadline/bài tập (môn trường)**
- Input: môn học (chọn), tên bài tập, loại bài (Bài tập/Kiểm tra/Đồ án/Thuyết trình), ngày giao, hạn nộp, mức ưu tiên
- Output: bản ghi trong `deadline`, cờ `nguoi_dat_han = "Giang_vien"`
- Hệ thống tự tính `so_ngay_con_lai`

**UC05 — Tự đặt deadline + output (môn tự học)**
- Input: môn học (đã lọc chỉ hiện môn `Tu_hoc`), tên nhiệm vụ, **output mong muốn (bắt buộc)**, hạn tự đặt
- Output: bản ghi `deadline` với `nguoi_dat_han = "Tu_dat"`, liên kết bản ghi tương ứng trong `output_tu_hoc`

**UC06 — Cập nhật trạng thái deadline**
- Input: chọn deadline (dropdown), trạng thái mới (Chưa làm/Đang làm/Hoàn thành/Trễ hạn), % hoàn thành
- Output: cập nhật dòng tương ứng

**UC07 — Gia hạn deadline tự đặt**
- Chỉ áp dụng cho deadline có `nguoi_dat_han = "Tu_dat"`
- Input: deadline cũ, hạn mới
- Output: tăng `so_lan_gia_han`, tạo lịch sử gia hạn (không phạt nặng như deadline trường)

**UC08 — Cập nhật kết quả output (môn tự học)**
- Input: chọn nhiệm vụ tự học, kết quả đạt được (text), tự đánh giá (Đạt/Chưa đạt/Cần làm lại)
- Output: bản ghi mới trong `output_tu_hoc`
- Nếu "Chưa đạt": hệ thống gợi ý tạo deadline gia hạn (liên kết UC07)

---

### Nhóm C — Quản lý Tài liệu

**UC09 — Thêm tài liệu học tập**
- Input: môn học, tên tài liệu, link (validate URL), loại tài liệu (Slide/Đề cương/Bài giải/Video/Sách)
- Output: bản ghi `tai_lieu`

**UC10 — Nhắc ôn tập lặp lại (spaced repetition)**
- Actor: Scheduler
- Điều kiện: tài liệu đã thêm >= 1 ngày / 3 ngày / 7 ngày kể từ `ngay_them`
- Output: gửi nhắc nhở ôn lại

---

### Nhóm D — Theo dõi Thời gian

**UC11 — Ghi nhận thời gian học thực tế**
- Input: chọn deadline liên quan, giờ thực tế đã học (số, cho phép số lẻ), mức độ tập trung (Tốt/Trung bình/Bị xao nhãng), ghi chú
- Output: bản ghi `nhat_ky_thoi_gian`

**UC12 — Tính chuỗi ngày duy trì (streak)**
- Actor: Scheduler
- Mô tả: đếm số ngày liên tiếp có ít nhất 1 bản ghi `nhat_ky_thoi_gian`

---

### Nhóm E — Nhắc nhở & Thông báo

**UC13 — Nhắc deadline trước hạn (phân tầng theo ưu tiên)**
- Actor: Scheduler (chạy 1 lần/ngày, VD 7h sáng)
- Logic:
  - Ưu tiên Cao → nhắc trước 2 ngày **và** 1 ngày
  - Ưu tiên Trung bình/Thấp → nhắc trước 1 ngày
  - Điều kiện: `trang_thai != "Hoan_thanh"`
- Output: email / thông báo push

**UC14 — Nhắc nhập liệu định kỳ**
- Actor: Scheduler
- Điều kiện: deadline đang "Đang làm" nhưng không có `nhat_ky_thoi_gian` mới trong 2–3 ngày (môn trường) hoặc 2 ngày (môn tự học — nhắc dày hơn)

**UC15 — Cảnh báo quá tải deadline**
- Actor: Scheduler
- Điều kiện: trong cùng 1 ngày có ≥ 3 deadline `han_nop` trùng nhau và chưa hoàn thành
- Output: cảnh báo sớm để người dùng phân bổ lại thời gian

**UC16 — Báo cáo tuần tự động**
- Actor: Scheduler (chạy mỗi Chủ nhật)
- Nội dung: số deadline hoàn thành trong tuần, tổng giờ học, môn bị trễ nhiều nhất

---

### Nhóm F — Dashboard & Tổng quan

**UC17 — Xem Dashboard tổng quan**
- Input: không có (trang chủ)
- Output: hiển thị deadline 7 ngày tới (sắp theo ưu tiên + hạn nộp), tiến độ mục tiêu theo môn, cảnh báo môn bị trễ nhiều task, streak hiện tại

**UC18 — Đồng bộ 2 chiều Google Calendar** *(tính năng mở rộng, ưu tiên thấp)*
- Mỗi deadline tự tạo sự kiện Calendar; khi trạng thái đổi thành "Hoàn thành" → sự kiện đổi màu/đánh dấu xong

---

## 4. Bảng ưu tiên triển khai (Phase)

| Phase | Use Case | Lý do |
|---|---|---|
| **MVP (Phase 1)** | UC01, UC02, UC04, UC05, UC06, UC09, UC11, UC17 | Chức năng lõi: nhập liệu + xem tổng quan |
| **Phase 2** | UC03, UC07, UC08, UC13, UC14 | Hoàn thiện vòng đời deadline + nhắc nhở cơ bản |
| **Phase 3** | UC12, UC15, UC16, UC10 | Tính năng tạo động lực & phân tích sâu |
| **Phase 4 (optional)** | UC18 | Tích hợp bên ngoài, không bắt buộc |

---

## 5. Tech Stack đề xuất

### 5.1. Backend

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Framework | **Flask** (Python) | Bạn đã có kinh nghiệm; nhẹ, đủ dùng cho app single-user |
| ORM | **SQLAlchemy** | Quản lý quan hệ giữa các bảng dễ dàng, tránh viết SQL tay |
| Database | **SQLite** | Không cần server riêng, phù hợp app cá nhân, dễ backup (1 file `.db`) |
| Scheduler | **APScheduler** | Chạy cron job nhắc nhở ngay trong process Flask, không cần cron hệ điều hành |
| Gửi thông báo | **SMTP (email)** qua `smtplib`, hoặc **Telegram Bot API** | Telegram đơn giản hơn, push nhanh, không lo spam folder như email |

### 5.2. Frontend

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Framework | **React** | Bạn đã quen; phù hợp form động (ẩn/hiện field theo điều kiện) |
| State management | **React Context** hoặc **useState/useReducer** đơn giản | App nhỏ, không cần Redux |
| Styling | **CSS thuần / Tailwind CSS** | Kiểm soát tone màu, font chữ dễ dàng, đồng nhất |
| Form validation | **React Hook Form** (nhẹ) hoặc validate tay | Validate URL, ngày tháng, số |
| Biểu đồ Dashboard | **Recharts** | Vẽ tiến độ mục tiêu, thống kê giờ học |

### 5.3. Triển khai (Deployment)

| Thành phần | Lựa chọn |
|---|---|
| Local dev | Chạy Flask (port 5000) + React dev server (port 3000), proxy API |
| Production nhẹ | Build React tĩnh, Flask serve luôn (1 process duy nhất) |
| Hosting (nếu cần truy cập từ xa) | Render / Railway (free tier đủ cho single-user) |
| Backup dữ liệu | Export SQLite `.db` định kỳ, hoặc đồng bộ lên Google Drive |

### 5.4. Kiến trúc thư mục đề xuất

```
project/
├── backend/
│   ├── app.py
│   ├── models.py          # SQLAlchemy models (7 bảng)
│   ├── routes/
│   │   ├── mon_hoc.py
│   │   ├── deadline.py
│   │   ├── tai_lieu.py
│   │   ├── nhat_ky.py
│   │   └── dashboard.py
│   ├── scheduler/
│   │   ├── nhac_deadline.py
│   │   ├── nhac_nhap_lieu.py
│   │   └── bao_cao_tuan.py
│   └── database.db
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── FormNhapLieu.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   └── DanhSachDeadline.jsx
│   │   └── App.jsx
└── README.md
```

---

## 6. Ghi chú kỹ thuật quan trọng

- **Không cần authentication phức tạp** vì single-user — có thể dùng 1 biến môi trường làm "khóa truy cập" nếu deploy public.
- **Soft-delete** cho môn học/deadline thay vì xóa cứng, để giữ lịch sử báo cáo tuần chính xác.
- **Timezone**: cố định giờ Việt Nam (UTC+7) cho các cron job nhắc nhở.
