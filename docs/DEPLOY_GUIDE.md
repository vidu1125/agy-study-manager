# 🚀 Hướng Dẫn Triển Khai: Supabase (PostgreSQL) + Railway + CI/CD

Tài liệu này hướng dẫn chi tiết từng bước để triển khai toàn bộ ứng dụng **AGY Study Manager** lên môi trường Production với **Supabase** (Database) và **Railway** (Backend Web App + Background Scheduler).

---

## 1. Chuẩn Bị Database trên Supabase (PostgreSQL)

1. Truy cập [https://supabase.com](https://supabase.com) và đăng nhập (hoặc tạo tài khoản miễn phí).
2. Nhấn **New Project**:
   - **Name:** `agy-study-manager` (hoặc tên tuỳ chọn).
   - **Database Password:** Đặt mật khẩu an toàn (hãy lưu lại mật khẩu này!).
   - **Region:** Chọn khu vực gần bạn nhất (ví dụ: `Southeast Asia (Singapore)` để có tốc độ tốt nhất).
3. Sau khi Project tạo xong, vào **Project Settings** (biểu tượng bánh răng ở sidebar bên trái) -> chọn tab **Database**.
4. Kéo xuống mục **Connection string**:
   - Chọn tab **URI**.
   - Chọn chế độ **Session** (Port `5432`) hoặc **Direct connection** (Port `5432`).
   - Chuỗi kết nối có dạng:
     ```text
     postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres
     ```
   - **Lưu ý:** Thay `[YOUR-PASSWORD]` bằng mật khẩu database bạn đã đặt ở bước 2.

---

## 2. Triển Khai Ứng Dụng lên Railway

1. Truy cập [https://railway.app](https://railway.app) và đăng nhập bằng GitHub.
2. Nhấn **New Project** -> chọn **Deploy from GitHub repo**.
3. Chọn repository `agy-study-manager` của bạn.
4. Sau khi project được tạo, bấm vào service của bạn trên Dashboard -> chọn tab **Variables**:
   - Nhấn **Add Variable** và thêm các biến môi trường sau:
     | Tên Biến (Variable) | Giá Trị (Value) | Mô Tả |
     |---|---|---|
     | `DATABASE_URL` | `postgresql://postgres.[REF]:[PASS]@...:5432/postgres` | Chuỗi URI lấy từ Supabase ở bước 1 |
     | `NTFY_TOPIC` | `dung-hoctap-nhacnho-9f3k2xq8` | Topic thông báo ntfy (hoặc topic riêng của bạn) |
     | `PORT` | `5000` | Cổng ứng dụng (Railway tự quản lý) |
5. Vào tab **Settings**:
   - Tìm mục **Networking** -> nhấn **Generate Domain** (hoặc Custom Domain) để nhận link web dạng: `https://agy-study-manager-production.up.railway.app`.
6. Railway sẽ tự động build qua `railway.json` / `Procfile`, chạy khởi tạo các bảng trên Supabase PostgreSQL và start background scheduler.

---

## 3. Tự Động Hoá với CI/CD (GitHub Actions)

File workflow đã được cấu hình sẵn tại [`.github/workflows/ci-cd.yml`](../.github/workflows/ci-cd.yml).
Mỗi khi bạn `git push` code lên nhánh `main` hoặc tạo Pull Request:
1. GitHub Actions sẽ tự động khởi chạy môi trường Python 3.11.
2. Kiểm tra cú pháp, dependencies, và chạy smoke test cho toàn bộ 34 routes của ứng dụng.
3. Railway đã kết nối với GitHub repo sẽ tự động kích hoạt quá trình Zero-Downtime Deploy ngay khi code được merge vào `main`.

---

## 4. Kiểm Tra Sau Khi Deploy

1. Mở domain Railway được cấp (ví dụ `https://your-app.up.railway.app`).
2. Kiểm tra trang tổng quan (Dashboard) và thử tạo 1 môn học / 1 deadline mới.
3. Kiểm tra trên Supabase Dashboard -> **Table Editor**: bạn sẽ thấy các bảng `MON_HOC`, `DEADLINE`, `TAI_LIEU`, `NHAT_KY_THOI_GIAN`, `MUC_TIEU`, `LICH_HOC` đã được tự động tạo với dữ liệu đầy đủ.
4. Kiểm tra điện thoại xem có nhận được thông báo ntfy xác nhận không.
5. Endpoint kiểm tra trạng thái hoạt động: `https://your-app.up.railway.app/ping`.
