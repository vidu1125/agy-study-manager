# AGY Study Manager

> 🌐 **Production URL:** [https://agy-study-manager-production.up.railway.app](https://agy-study-manager-production.up.railway.app)

Web quản lý học tập cá nhân: theo dõi môn học, deadline, lịch học, thời gian tự học và ôn từ vựng tiếng Anh theo **Spaced Repetition**.

## Mục tiêu

AGY Study Manager giúp biến việc học thành một hệ thống dễ theo dõi:

- Gom môn học, tài liệu, deadline và mục tiêu vào một workspace.
- Ưu tiên việc cần làm và theo dõi tiến độ học thực tế.
- Duy trì lịch học cá nhân, tránh trùng lịch và không bỏ sót hạn nộp.
- Ghi nhớ từ vựng hiệu quả qua flashcard hai chiều và lịch ôn tự điều chỉnh.
- Đo chất lượng học bằng analytics: streak, tỷ lệ nhớ, khối lượng ôn và từ yếu.

## Tính năng chính

| Nhóm | Chức năng |
|---|---|
| Dashboard | Tổng quan deadline, cảnh báo, streak và tiến độ học |
| Môn học & deadline | Quản lý môn trường/tự học, ưu tiên, output và gia hạn |
| Lịch & tài liệu | Thời khóa biểu, lịch sự kiện, tài liệu chung hoặc theo môn, link và tệp học tập |
| Nhật ký học | Ghi thời gian học, mức độ tập trung và ghi chú |
| Từ vựng SRS | Deck, note, flashcard Anh–Việt/Việt–Anh, học theo lịch Spaced Repetition |
| Phân tích từ vựng | Biểu đồ đường/cột/tròn, forecast ôn tập, quality trả lời và danh sách từ yếu |
| Thông báo | Scheduler nhắc deadline, lịch học và lượt ôn qua kênh đã cấu hình |

## Tổng quan kiến trúc

```mermaid
flowchart LR
    Browser[Trình duyệt] --> UI[Frontend: HTML / CSS / JavaScript]
    UI --> API[Flask API]
    API --> ORM[SQLAlchemy]
    ORM --> Local[(SQLite local)]
    ORM --> Cloud[(Supabase PostgreSQL)]
    Scheduler[APScheduler<br/>một instance] --> API
    Scheduler --> Notifications[ntfy / Telegram tùy chọn]
```

- Flask phục vụ frontend từ `frontend/` và API từ `backend/routes/`.
- SQLite là mặc định cho máy local. Khi đặt `DATABASE_URL`, app chuyển sang PostgreSQL/Supabase.
- Frontend hiện gọi API Flask, nên **không cần Supabase API key** để dùng database Supabase.

## Chạy nhanh

### Yêu cầu

- Python 3.11 trở lên.
- `make` (có sẵn trên macOS/Linux).
- Docker Desktop nếu muốn chạy bằng container.
- Node.js chỉ cần cho `make check` để kiểm tra JavaScript.

### Local bằng Python

```bash
git clone <repository-url>
cd agy-study-manager
make install
make run
```

Mở [http://127.0.0.1:5000](http://127.0.0.1:5000).

Lần đầu, `make install` tạo virtual environment, cài dependency và tạo `.env` từ `.env.example`. Mặc định app dùng SQLite tại `data/database.db`; scheduler tắt để không tạo thông báo trùng trên máy developer.

### Docker

```bash
make docker-up
make health
```

Mở [http://127.0.0.1:5000](http://127.0.0.1:5000), xem log bằng `make docker-logs`. Khi xong:

```bash
make docker-down
```

Docker dùng named volume để giữ SQLite local. Lệnh `make docker-down` chỉ dừng container, không xoá volume dữ liệu.

## Cấu hình môi trường

Không commit file `.env`. Chỉ commit [`.env.example`](.env.example) làm mẫu cho cả nhóm.

```ini
# .env
PORT=5000
FLASK_DEBUG=true
SCHEDULER_ENABLED=false

# Để trống để dùng SQLite local.
DATABASE_URL=
DB_PATH=./data/database.db
UPLOAD_DIR=./data/uploads
MAX_UPLOAD_MB=25

# Tùy chọn
NTFY_TOPIC=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

### Dùng Supabase PostgreSQL

Trong Supabase Dashboard, bấm **Connect** và copy PostgreSQL connection URI. Đặt nó vào `.env`:

```ini
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
```

Sau đó chạy lại `make run` hoặc `make docker-up`. Với Supabase database trống, SQLAlchemy sẽ tạo các bảng hiện có ở lần app khởi động đầu tiên.

Không đặt `SUPABASE_SECRET_KEY`, `service_role` key hay database URI trong source code/browser. Publishable/Anon key cũng chưa cần vì app không gọi Supabase Data API trực tiếp.

Hướng dẫn chi tiết: [Khởi tạo Supabase & deploy](docs/09_Huong_Dan_Khoi_Tao_Supabase_Deploy.md).

### Tài liệu học tập

- Môn học là tùy chọn: có thể lưu tài liệu chung cho nhiều môn.
- Có thể chỉ lưu thông tin, thêm link `http(s)` (Google Drive, OneDrive, website...) hoặc tải tệp PDF, Word, PowerPoint, Excel, văn bản và hình ảnh. Giới hạn mặc định là 25 MB/tệp.
- Khi deploy Railway, tạo **Volume** mount tại `/app/data` và đặt `UPLOAD_DIR=/app/data/uploads`; nếu không, file tải trực tiếp lên service có thể mất sau redeploy. Link ngoài không bị ảnh hưởng.
- Tệp tải lên hiện được mở qua URL của ứng dụng. Chỉ tải lên tài liệu bạn được phép chia sẻ.

## Lệnh thường dùng

| Lệnh | Mục đích |
|---|---|
| `make help` | Xem toàn bộ lệnh |
| `make env` | Tạo `.env` từ mẫu nếu chưa có |
| `make install` | Cài Python dependencies vào `.venv` |
| `make run` | Chạy local Flask |
| `make check` | Kiểm tra Python, JavaScript và smoke test `/healthz` |
| `make docker-build` | Build Docker image |
| `make docker-up` | Chạy Docker Compose background |
| `make docker-logs` | Theo dõi log container |
| `make docker-down` | Dừng container, giữ volume dữ liệu |
| `make health` | Gọi health check an toàn `/healthz` |

## Cấu trúc thư mục

```text
.
├── backend/
│   ├── routes/          # HTTP API theo nghiệp vụ
│   ├── services/        # Business logic, gồm SRS engine
│   ├── notifications/   # Scheduler và kênh thông báo
│   ├── models.py        # SQLAlchemy models
│   └── app.py           # Flask application factory
├── frontend/
│   ├── templates/       # Trang HTML
│   └── static/          # CSS và JavaScript
├── docs/                # Use case, thiết kế và hướng dẫn triển khai
├── compose.yaml         # Docker Compose local
├── Dockerfile           # Image production-style
├── Makefile             # Lệnh dùng chung cho team
└── run.py               # Entry point: python run.py / gunicorn run:app
```

## Health check và scheduler

- `GET /healthz`: kiểm tra app + database, không thay đổi dữ liệu hay gửi thông báo.
- `GET /ping`: endpoint giữ tương thích cũ và có thể kích hoạt nghiệp vụ nhắc deadline; không dùng làm health check.
- Chỉ bật `SCHEDULER_ENABLED=true` tại **một** service production. Nhiều replica cùng bật scheduler có thể gửi thông báo trùng.

## Tài liệu liên quan

- [Use case học từ vựng Spaced Repetition](docs/UC_Hoc_Tu_Vung_Spaced_Repetition.md)
- [Kế hoạch CI/CD & Supabase](docs/08_ke_hoach_CI_CD_Supabase.md)
- [Hướng dẫn khởi tạo Supabase & deploy](docs/09_Huong_Dan_Khoi_Tao_Supabase_Deploy.md)
- [Hướng dẫn `.env`, Docker và Makefile](docs/10_Moi_Truong_Docker_Makefile.md)
- [System map](docs/SYSTEM_MAP.md)

## Kiểm tra trước khi gửi thay đổi

```bash
make check
```

Không thêm secret vào commit. Với thay đổi schema production, dùng migration có version thay vì chỉ dựa vào `db.create_all()`.
