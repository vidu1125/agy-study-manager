"""Các migration schema nhỏ, idempotent cho database đang chạy.

Đây là cầu nối tương thích cho các database đã được tạo trước khi dự án có
migration versioned đầy đủ. Mỗi bước đều an toàn khi chạy lại.
"""
import sqlite3

from sqlalchemy import text


def run_database_migrations(db_uri: str, engine) -> None:
    """Áp dụng các migration tương thích cho SQLite và PostgreSQL."""
    if "sqlite" in db_uri:
        _run_sqlite_migrations(db_uri)
    elif "postgres" in db_uri:
        _run_postgresql_migrations(engine)


def _run_sqlite_migrations(db_uri: str) -> None:
    """
    Áp dụng các ALTER TABLE cần thiết cho SQLite khi deploy/upgrade.
    Idempotent: kiểm tra cột trước khi thêm.
    """
    if "sqlite" not in db_uri:
        return

    db_path = db_uri.replace("sqlite:///", "")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()

        # Migration: thêm cột ngay_nhac_cuoi vào bảng DEADLINE nếu chưa có.
        cursor.execute("PRAGMA table_info(DEADLINE);")
        cols = [row[1] for row in cursor.fetchall()]
        if "ngay_nhac_cuoi" not in cols:
            cursor.execute("ALTER TABLE DEADLINE ADD COLUMN ngay_nhac_cuoi DATE;")
            conn.commit()

        # Migration: cho phép TAI_LIEU.ma_mon là NULL để lưu tài liệu chung.
        cursor.execute("PRAGMA table_info(TAI_LIEU);")
        table_info = {row[1]: row for row in cursor.fetchall()}
        ma_mon_is_required = table_info.get("ma_mon", (None, None, 0))[3] == 1
        if ma_mon_is_required:
            cursor.execute("PRAGMA foreign_keys = OFF;")
            cursor.execute(
                """
                CREATE TABLE TAI_LIEU__new (
                    ma_tai_lieu VARCHAR(30) NOT NULL PRIMARY KEY,
                    ma_mon VARCHAR(20),
                    ten_tai_lieu VARCHAR(200) NOT NULL,
                    loai_tai_lieu VARCHAR(30) NOT NULL,
                    link VARCHAR(500),
                    ngay_them DATE,
                    FOREIGN KEY(ma_mon) REFERENCES MON_HOC(ma_mon)
                );
                """
            )
            cursor.execute(
                """
                INSERT INTO TAI_LIEU__new
                    (ma_tai_lieu, ma_mon, ten_tai_lieu, loai_tai_lieu, link, ngay_them)
                SELECT ma_tai_lieu, ma_mon, ten_tai_lieu, loai_tai_lieu, link, ngay_them
                FROM TAI_LIEU;
                """
            )
            cursor.execute("DROP TABLE TAI_LIEU;")
            cursor.execute("ALTER TABLE TAI_LIEU__new RENAME TO TAI_LIEU;")
            conn.commit()
            cursor.execute("PRAGMA foreign_keys = ON;")

        conn.close()
    except Exception as e:
        print("Schema migration info:", e)


def _run_postgresql_migrations(engine) -> None:
    """Áp dụng các thay đổi tương thích cho Supabase PostgreSQL."""
    with engine.begin() as connection:
        is_nullable = connection.execute(
            text(
                """
                SELECT is_nullable
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'TAI_LIEU'
                  AND column_name = 'ma_mon'
                """
            )
        ).scalar()
        if is_nullable == "NO":
            connection.execute(
                text('ALTER TABLE "TAI_LIEU" ALTER COLUMN ma_mon DROP NOT NULL')
            )
