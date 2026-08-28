# Môi trường dùng chung: `.env`, Docker và Makefile

Tài liệu này giúp mọi người chạy AGY Study Manager theo cùng một cách, không cần chia sẻ secret trong source code.

## Khởi động nhanh

### Cách 1 — Python local

```bash
make install
make run
```

Lần đầu `make install` sẽ tạo `.venv`, cài dependencies và tạo file `.env` từ `.env.example` nếu chưa có.

### Cách 2 — Docker

```bash
make docker-up
make health
```

Mở [http://127.0.0.1:5000](http://127.0.0.1:5000). Khi xong:

```bash
make docker-down
```

Lệnh này chỉ dừng container, **không xoá** named volume chứa database SQLite local.

## Cấu hình môi trường

`.env` là file cấu hình của từng máy, đã được gitignore. `.env.example` là mẫu an toàn được commit để cả nhóm dùng chung.

| Biến | Mặc định local | Ý nghĩa |
|---|---|---|
| `PORT` | `5000` | Cổng public của app local/Docker |
| `FLASK_DEBUG` | `true` | Bật debug khi dùng `python run.py` |
| `SCHEDULER_ENABLED` | `false` | Tránh nhiều máy cùng gửi thông báo định kỳ |
| `DATABASE_URL` | rỗng | URI PostgreSQL Supabase; có giá trị thì được ưu tiên thay SQLite |
| `DB_PATH` | `./data/database.db` | Đường dẫn SQLite khi `DATABASE_URL` rỗng |
| `UPLOAD_DIR` | `./data/uploads` | Thư mục lưu tệp tài liệu do người dùng tải lên |
| `MAX_UPLOAD_MB` | `25` | Giới hạn một tệp tài liệu, từ 1 đến 100 MB |
| `NTFY_TOPIC` | rỗng | Topic ntfy tùy chọn |
| `TELEGRAM_BOT_TOKEN` | rỗng | Chỉ dùng khi đã cấu hình Telegram |
| `TELEGRAM_CHAT_ID` | rỗng | Chỉ dùng khi đã cấu hình Telegram |

### Dùng Supabase

Trong `.env`, đặt duy nhất database URI do Supabase Dashboard → **Connect** cung cấp:

```ini
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
```

Không thêm Publishable key, `anon`, Secret key hay `service_role` key nếu app chỉ kết nối Postgres qua Flask/SQLAlchemy như hiện tại.

> Không gửi file `.env`, database URI hay password qua Git, pull request, issue hoặc nhóm chat.

## Docker design

- `Dockerfile` dùng Python 3.11 slim, chạy Gunicorn bằng user không đặc quyền `appuser`.
- `.dockerignore` loại `.env`, database local, virtualenv và cache ra khỏi image build context.
- `compose.yaml` mount named volume `agy_study_data` tại `/app/data`, nên SQLite local không mất khi tạo lại container.
- `GET /healthz` kiểm tra app + database bằng `SELECT 1`, không gửi notification hay thay đổi dữ liệu.
- Docker local mặc định `SCHEDULER_ENABLED=false`; chỉ bật scheduler ở **một** instance production được chỉ định.

Docker Compose hỗ trợ truyền `.env` qua `env_file`. Các biến truyền ở command line hoặc trong cấu hình deployment có thể ghi đè giá trị trong file; kiểm tra cấu hình thực tế bằng:

```bash
make docker-config
```

Tham khảo: [Docker Compose environment variables](https://docs.docker.com/compose/how-tos/environment-variables/set-environment-variables/) và [Docker Compose health checks](https://docs.docker.com/compose/how-tos/startup-order/).

## Make targets

| Lệnh | Mục đích |
|---|---|
| `make help` | Liệt kê toàn bộ lệnh |
| `make env` | Tạo `.env` khi chưa có |
| `make install` | Tạo virtualenv và cài dependencies |
| `make run` | Chạy Flask local |
| `make check` | Compile Python, check JavaScript và smoke test `/healthz` + `/` |
| `make test` | Alias của `make check` cho tới khi có pytest suite |
| `make docker-build` | Build Docker image |
| `make docker-up` | Build và chạy app background |
| `make docker-logs` | Theo dõi log Docker |
| `make docker-shell` | Mở shell trong container |
| `make docker-down` | Dừng container, giữ volume dữ liệu |
| `make health` | Kiểm tra endpoint `/healthz` |

## Deployment Railway

Không upload `.env` lên Railway. Thay vào đó, vào Railway **Variables** và thêm ít nhất:

```text
DATABASE_URL=<Supabase PostgreSQL URI>
SCHEDULER_ENABLED=true
```

Chỉ để một service/replica có `SCHEDULER_ENABLED=true`; nếu chạy nhiều replica, các job nhắc lịch sẽ bị thực thi trùng. Railway dùng `/healthz` làm health check, không còn dùng `/ping` vì `/ping` có thể kích hoạt nghiệp vụ nhắc deadline.

### Lưu tệp tài liệu trên Railway

File upload không nằm trong Supabase PostgreSQL và sẽ không bền vững nếu service không có Volume. Để PDF/Word/PowerPoint/Excel còn tồn tại sau redeploy:

1. Mở service Flask → **Settings** → **Volumes** → **Add Volume**.
2. Chọn mount path `/app/data`.
3. Trong **Variables**, đặt:

   ```text
   UPLOAD_DIR=/app/data/uploads
   MAX_UPLOAD_MB=25
   ```

4. Nếu Railway chạy image từ `Dockerfile` của dự án và log báo `Permission denied` khi upload, thêm `RAILWAY_RUN_UID=0`, sau đó redeploy. Dockerfile dùng user không đặc quyền nên Volume do Railway mount có thể cần biến này.

Link ngoài (Google Drive, OneDrive, website...) không cần Volume. Tệp upload được phục vụ từ URL public của web; không dùng cơ chế này cho tài liệu cần giới hạn quyền truy cập.
