# Hướng dẫn khởi tạo Supabase và deploy AGY Study Manager

> Dành cho trạng thái hiện tại: **chưa có Supabase project, schema hay API key**.
>
> Kiến trúc của dự án: Supabase cung cấp **PostgreSQL**; Flask vẫn cần chạy trên một dịch vụ web như Railway. Frontend gọi API Flask, không gọi trực tiếp Supabase.

## 1. Điều quan trọng trước khi bắt đầu

Với code hiện tại, chỉ cần **chuỗi kết nối database** (`DATABASE_URL`) để Flask kết nối Supabase. Không cần `SUPABASE_URL`, Publishable/Anon key hay Secret/Service Role key.

| Thành phần | Có cần ngay không? | Dùng để làm gì? |
|---|---:|---|
| Supabase project | Có | Cung cấp PostgreSQL managed |
| Database password | Có | Nằm trong connection string |
| `DATABASE_URL` | Có | Flask/SQLAlchemy đọc và ghi database |
| Publishable key / `anon` key | Không | Chỉ cần khi frontend gọi trực tiếp Supabase Auth/Data API |
| Secret key / `service_role` | Không | Chỉ cần khi backend dùng Supabase Admin API, Auth Admin hoặc Storage API |

> Không đưa `DATABASE_URL`, database password, Secret key hay `service_role` key vào Git, JavaScript phía trình duyệt, ảnh chụp màn hình hoặc chat công khai.

## 2. Tạo Supabase project

1. Đăng nhập tại [Supabase Dashboard](https://supabase.com/dashboard).
2. Chọn **New project**.
3. Điền thông tin:
   - **Organization:** chọn hoặc tạo organization cá nhân.
   - **Name:** `agy-study-manager-production`.
   - **Database Password:** tạo mật khẩu dài, riêng cho project và lưu vào password manager.
   - **Region:** ưu tiên khu vực gần người dùng/deployment, ví dụ Singapore nếu phù hợp.
4. Nhấn **Create new project** và chờ database sẵn sàng.

Nên tách ít nhất hai project khi sẵn sàng vận hành thật:

| Môi trường | Tên gợi ý | Mục đích |
|---|---|---|
| Staging | `agy-study-manager-staging` | Thử migration và deploy trước |
| Production | `agy-study-manager-production` | Dữ liệu sử dụng thật |

Ban đầu có thể tạo một project staging để làm quen; không nhập dữ liệu cá nhân quan trọng cho đến khi deploy được kiểm tra.

## 3. Lấy đúng connection string

Trong Supabase project, bấm **Connect** ở phía trên Dashboard và sao chép URI PostgreSQL.

Ví dụ minh hoạ (không dùng nguyên văn):

```text
postgresql://postgres:YOUR_DATABASE_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
```

Chọn theo tình huống:

| Loại kết nối | Khi dùng | Ghi chú |
|---|---|---|
| **Direct connection** | Flask chạy liên tục và môi trường deploy hỗ trợ IPv6 | Lựa chọn tốt cho backend dài hạn và migration |
| **Shared Pooler – Session mode** (cổng `5432`) | Direct connection lỗi mạng do môi trường chỉ IPv4 | Phù hợp backend Flask chạy liên tục |
| **Transaction mode** (cổng `6543`) | Serverless/Edge ngắn hạn | Không dùng cho Flask hiện tại nếu chưa đổi cấu hình SQLAlchemy |

Hãy copy nguyên chuỗi do Supabase cung cấp. Nếu tự thay database password có ký tự đặc biệt như `@`, `:`, `/`, hãy URL-encode password trước khi ghép vào URI.

Tài liệu tham khảo: [Supabase – Connect to Postgres](https://supabase.com/docs/guides/database/connecting-to-postgres).

## 4. Tạo schema tự động cho database trống

Ứng dụng hiện có SQLAlchemy và đã dùng `db.create_all()` khi khởi động. Vì vậy, **không cần viết tay SQL schema trong Supabase SQL Editor cho lần khởi tạo đầu tiên**.

### 4.1 Chạy thử từ máy local

Trong Terminal tại thư mục project:

```bash
cd /Users/batman/Desktop/agy-study-manager
source .venv/bin/activate
export DATABASE_URL='DAN_CONNECTION_STRING_DA_COPY_TU_SUPABASE'
python run.py
```

Mở [http://127.0.0.1:5000](http://127.0.0.1:5000). Ở lần chạy đầu với Supabase database trống, các model của ứng dụng sẽ tạo các bảng quản lý môn học, deadline, lịch học, mục tiêu và Spaced Repetition.

Sau đó vào **Supabase Dashboard → Table Editor** để xác nhận các bảng xuất hiện. Có thể dùng SQL Editor để kiểm tra không làm thay đổi dữ liệu:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;
```

> Để quay về SQLite local sau khi thử xong, đóng Terminal/server và mở Terminal mới mà không đặt `DATABASE_URL`. App sẽ fallback về file `database.db` cục bộ.

### 4.2 Giới hạn của cách tự tạo schema

`db.create_all()` tạo các bảng còn thiếu, nhưng **không thay thế migration có version** khi schema đã được đưa vào production. Khi bắt đầu có dữ liệu thật, mọi thay đổi bảng/cột/index phải đi qua Alembic/Flask-Migrate hoặc Supabase migration được commit cùng code.

Không xoá database SQLite hiện có. Việc tạo schema Supabase chỉ tạo cấu trúc; chưa chuyển dữ liệu từ `database.db`. Hãy backup SQLite trước và làm một bước import/đối soát riêng nếu muốn giữ dữ liệu cũ.

## 5. Deploy web Flask lên Railway

Supabase không host Flask web app này; nó host database. Dùng Railway để chạy Flask là phương án đã được chuẩn bị trong project.

1. Đẩy repository lên GitHub, đảm bảo không commit secret.
2. Đăng nhập [Railway](https://railway.app) bằng GitHub.
3. Chọn **New Project → Deploy from GitHub repo** và chọn repository này.
4. Trong service Railway, mở **Variables** và thêm:

| Biến | Giá trị |
|---|---|
| `DATABASE_URL` | URI PostgreSQL copy từ Supabase Connect |
| `NTFY_TOPIC` | Topic thông báo riêng của môi trường (nếu dùng) |
| `TELEGRAM_BOT_TOKEN` | Chỉ thêm nếu đã cấu hình Telegram |
| `TELEGRAM_CHAT_ID` | Chỉ thêm nếu đã cấu hình Telegram |

5. Railway sẽ chạy entrypoint của project. App kết nối tới Supabase qua `DATABASE_URL` và tạo bảng thiếu ở database trống.
6. Sau deploy, mở domain Railway, tạo thử một môn học hoặc một deck từ vựng và kiểm tra dữ liệu xuất hiện ở Table Editor.

Không cần thêm biến `PORT` thủ công trừ khi nền tảng yêu cầu; Railway thường tự cung cấp port runtime. Không đặt `DATABASE_URL` vào GitHub repository variables nếu workflow không cần kết nối database; ưu tiên Railway Variables hoặc Environment Secret chuyên biệt.

## 6. Khi nào cần API key của Supabase?

Chỉ lấy key khi có yêu cầu mới dưới đây:

| Tính năng tương lai | Key cần dùng | Vị trí lưu |
|---|---|---|
| Đăng nhập bằng Supabase Auth hoặc frontend gọi Data API | Publishable key (hoặc `anon` key cũ) | Có thể nằm trong frontend, nhưng phải bật RLS và policy |
| Upload file qua Supabase Storage từ Flask | Secret key / `service_role` | Biến môi trường backend/Railway, tuyệt đối không gửi ra browser |
| Supabase Auth Admin (mời/xóa user) | Secret key / `service_role` | Biến môi trường backend/Railway |

Hiện tại **không thêm key nào** là đúng và an toàn nhất. Nếu sau này frontend gọi trực tiếp Supabase, cần bật Row Level Security (RLS) và policy cho từng bảng trước khi đưa Publishable key vào web. [Supabase – API keys](https://supabase.com/docs/guides/getting-started/api-keys) · [Supabase – RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).

## 7. Checklist trước khi dùng dữ liệu thật

- [ ] Supabase project đã tạo ở đúng region.
- [ ] Database password được lưu an toàn, không nằm trong source code.
- [ ] `DATABASE_URL` đã được đặt ở Railway Variables hoặc chỉ trong Terminal local.
- [ ] Web chạy được và tạo/đọc được ít nhất một bản ghi trên Supabase.
- [ ] Đã nhìn thấy bảng trong Supabase Table Editor.
- [ ] Không có `service_role`, Secret key hoặc database URI trong Git history.
- [ ] Đã có backup file `database.db` trước khi thực hiện import dữ liệu cũ.
- [ ] Đã lập kế hoạch migration versioned trước thay đổi schema tiếp theo.

## 8. Bước tiếp theo khuyến nghị

1. Hoàn thành bước 2–4 với một Supabase staging project.
2. Chạy thử web local trỏ tới staging và xác minh schema.
3. Deploy Railway staging với cùng connection string staging.
4. Chỉ khi staging ổn định mới tạo project production và thực hiện import dữ liệu/CI-CD.

Xem thêm kế hoạch kỹ thuật tổng thể tại [08_ke_hoach_CI_CD_Supabase.md](08_ke_hoach_CI_CD_Supabase.md).
