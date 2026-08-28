"""
config.py — Centralized app configuration.
Single Responsibility: chỉ cung cấp config values, không chứa logic nghiệp vụ.
"""
import os

DEFAULT_NTFY_TOPIC = "dung-hoctap-nhacnho-9f3k2xq8"


def get_ntfy_topic() -> str:
    """Trả về NTFY topic hiện tại (env override hoặc default)."""
    return os.environ.get("NTFY_TOPIC", DEFAULT_NTFY_TOPIC).strip()


def get_db_path(app_root_path: str) -> str:
    """Resolve đường dẫn SQLite fallback khi không dùng cloud database."""
    db_path = os.getenv("DB_PATH") or os.path.join(app_root_path, "database.db")
    os.makedirs(os.path.dirname(os.path.abspath(db_path)), exist_ok=True)
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
