"""
config.py — Centralized app configuration.
Single Responsibility: chỉ cung cấp config values, không chứa logic nghiệp vụ.
"""
import os

from dotenv import load_dotenv


PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
# Local .env hỗ trợ onboarding; biến của Docker/Railway luôn được ưu tiên.
load_dotenv(os.path.join(PROJECT_ROOT, ".env"), override=False)

DEFAULT_NTFY_TOPIC = "dung-hoctap-nhacnho-9f3k2xq8"


def get_bool_env(name: str, default: bool = False) -> bool:
    """Đọc biến bool nhất quán cho local, Docker và Railway."""
    value = os.getenv(name)
    if value is None or not value.strip():
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def get_int_env(name: str, default: int, min_value: int = 1, max_value: int = 65535) -> int:
    """Đọc port/số nguyên có giới hạn an toàn và fallback về mặc định."""
    try:
        value = int(os.getenv(name, str(default)))
    except ValueError:
        return default
    return value if min_value <= value <= max_value else default


def get_ntfy_topic() -> str:
    """Trả về NTFY topic hiện tại (env override hoặc default)."""
    return os.environ.get("NTFY_TOPIC", DEFAULT_NTFY_TOPIC).strip()


def get_db_path(app_root_path: str) -> str:
    """Resolve đường dẫn SQLite fallback khi không dùng cloud database."""
    configured_path = os.getenv("DB_PATH")
    if configured_path:
        db_path = configured_path if os.path.isabs(configured_path) else os.path.join(app_root_path, configured_path)
    else:
        db_path = os.path.join(app_root_path, "database.db")
    db_path = os.path.abspath(db_path)
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    return db_path


def get_database_uri(app_root_path: str) -> str:
    """
    Trả về SQLAlchemy database URI:
    1. Ưu tiên biến môi trường DATABASE_URL hoặc SUPABASE_DB_URL.
       - Tự động chuyển 'postgres://' thành 'postgresql://' (tương thích SQLAlchemy 2.0+).
    2. Fallback sang SQLite cục bộ khi chạy offline/dev.
    """
    raw_uri = os.getenv("DATABASE_URL") or os.getenv("SUPABASE_DB_URL")
    if raw_uri:
        raw_uri = raw_uri.strip()
        # SQLAlchemy 1.4+ yêu cầu dialect postgresql:// thay vì postgres://
        if raw_uri.startswith("postgres://"):
            raw_uri = raw_uri.replace("postgres://", "postgresql://", 1)
        return raw_uri

    # SQLite fallback
    db_path = get_db_path(app_root_path)
    return f"sqlite:///{db_path}"


def get_upload_dir(app_root_path: str) -> str:
    """Resolve nơi lưu tệp tài liệu người dùng tải lên.

    Production nên trỏ thư mục này vào một Railway Volume. Mặc định giữ tệp
    cạnh dữ liệu SQLite để Docker Compose có thể mount cả hai cùng một volume.
    """
    configured_path = os.getenv("UPLOAD_DIR", "./data/uploads")
    upload_dir = configured_path if os.path.isabs(configured_path) else os.path.join(app_root_path, configured_path)
    upload_dir = os.path.abspath(upload_dir)
    os.makedirs(upload_dir, exist_ok=True)
    return upload_dir
