"""
migrations/migrate.py — SQLite schema auto-migration.
Tách logic migration ra khỏi app.py để tuân thủ SRP.
"""
import sqlite3


def run_sqlite_migrations(db_uri: str) -> None:
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

        # Migration: thêm cột ngay_nhac_cuoi vào bảng DEADLINE nếu chưa có
        cursor.execute("PRAGMA table_info(DEADLINE);")
        cols = [row[1] for row in cursor.fetchall()]
        if "ngay_nhac_cuoi" not in cols:
            cursor.execute("ALTER TABLE DEADLINE ADD COLUMN ngay_nhac_cuoi DATE;")
            conn.commit()

        conn.close()
    except Exception as e:
        print("Schema migration info:", e)
