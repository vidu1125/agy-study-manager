"""
backend/app.py — Entry point và Application Factory của Flask backend.

Chỉ chứa: app init, DB config, blueprint registration, scheduler setup.
Business logic → backend/services/
Push notifications → backend/notifications/
Route handlers → backend/routes/
"""
import os
import sys
import datetime

# Đảm bảo backend directory nằm trong sys.path
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
BASE_DIR = os.path.abspath(os.path.join(BACKEND_DIR, ".."))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from flask import Flask, render_template, jsonify
from sqlalchemy import text
from werkzeug.exceptions import RequestEntityTooLarge
from models import db
from config import get_bool_env, get_database_uri, get_int_env, get_upload_dir
from migrations.migrate import run_database_migrations
from seed_data import seed_database
from apscheduler.schedulers.background import BackgroundScheduler
import notifications.notification_jobs as jobs


def create_app() -> Flask:
    template_folder = os.path.join(BASE_DIR, "frontend", "templates")
    static_folder = os.path.join(BASE_DIR, "frontend", "static")

    app = Flask(__name__, template_folder=template_folder, static_folder=static_folder)

    # ── Database ──────────────────────────────────────────────────────────────
    db_uri = get_database_uri(BASE_DIR)
    app.config["SQLALCHEMY_DATABASE_URI"] = db_uri
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["UPLOAD_FOLDER"] = get_upload_dir(BASE_DIR)
    app.config["MAX_CONTENT_LENGTH"] = get_int_env(
        "MAX_UPLOAD_MB", default=25, min_value=1, max_value=100
    ) * 1024 * 1024

    # Cấu hình connection pool cho PostgreSQL (Supabase / Cloud DB)
    if "sqlite" not in db_uri:
        app.config["SQLALCHEMY_ENGINE_OPTIONS"] = {
            "pool_pre_ping": True,
            "pool_recycle": 300,
            "pool_size": 5,
            "max_overflow": 10,
        }

    db.init_app(app)

    with app.app_context():
        db.create_all()
        run_database_migrations(db_uri, db.engine)
        seed_database()

    # ── Blueprints ────────────────────────────────────────────────────────────
    from routes.mon_hoc_routes import bp as mon_hoc_bp
    from routes.deadline_routes import bp as deadline_bp
    from routes.nhat_ky_routes import bp as nhat_ky_bp
    from routes.tai_lieu_routes import bp as tai_lieu_bp
    from routes.muc_tieu_routes import bp as muc_tieu_bp
    from routes.lich_hoc_routes import bp as lich_hoc_bp
    from routes.dashboard_routes import bp as dashboard_bp
    from routes.notification_routes import bp as notification_bp

    from routes.quiz_routes import bp as quiz_bp
    for blueprint in [
        mon_hoc_bp, deadline_bp, nhat_ky_bp, tai_lieu_bp,
        muc_tieu_bp, lich_hoc_bp, dashboard_bp, notification_bp, quiz_bp,
    ]:
        app.register_blueprint(blueprint)

    # Tuỳ chọn đăng ký vocab_routes nếu có
    try:
        from routes.vocab_routes import bp as vocab_bp
        app.register_blueprint(vocab_bp)
    except ImportError:
        pass

    # ── Background Scheduler (UC10, UC13–UC16) ────────────────────────────────
    # Tắt được ở local/CI để không phát thông báo từ máy mỗi developer.
    if get_bool_env("SCHEDULER_ENABLED", default=True):
        _start_scheduler(app)
    else:
        app.logger.info("Scheduler disabled by SCHEDULER_ENABLED")

    @app.errorhandler(RequestEntityTooLarge)
    def upload_too_large(_error):
        max_upload_mb = app.config["MAX_CONTENT_LENGTH"] // (1024 * 1024)
        return jsonify({"error": f"Tệp vượt quá giới hạn {max_upload_mb} MB"}), 413

    return app


def _start_scheduler(app: Flask) -> None:
    """Đăng ký và khởi động APScheduler với app context wrapper cho mỗi job."""
    def wrap(fn):
        def job():
            with app.app_context():
                fn()
        return job

    bg = BackgroundScheduler(daemon=True)
    bg.add_job(wrap(jobs.nhac_deadline),    "cron", hour="7,13,19,1", minute=0,  id="uc13_deadline")
    bg.add_job(wrap(jobs.canh_bao_qua_tai), "cron", hour=7,           minute=5,  id="uc15_overload")
    bg.add_job(wrap(jobs.nhac_on_tap),      "cron", hour=8,           minute=0,  id="uc10_spaced_rep")
    bg.add_job(wrap(jobs.nhac_nhap_lieu),   "cron", hour=20,          minute=0,  id="uc14_missing_log")
    bg.add_job(wrap(jobs.bao_cao_tuan),     "cron", day_of_week="sun", hour=21,  minute=0, id="uc16_weekly_report")
    bg.start()


# ── App instance (module-level for Flask dev server & gunicorn) ───────────────
app = create_app()


@app.route("/")
def index_page():
    return render_template("index.html")


@app.route("/ping")
def ping():
    """Anti-sleep endpoint cho cron-job.org + trigger nhắc nhở tức thì."""
    try:
        sent = jobs.nhac_deadline()
    except Exception:
        sent = 0
    return jsonify({
        "status": "ok",
        "message": "AGY STUDY Application Service is active and running",
        "daily_notifications_triggered": sent,
        "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }), 200


@app.route("/healthz")
def healthz():
    """Health check không tạo notification hay thay đổi dữ liệu."""
    try:
        db.session.execute(text("SELECT 1"))
        return jsonify({"status": "ok"}), 200
    except Exception:
        db.session.rollback()
        return jsonify({"status": "unavailable"}), 503


if __name__ == "__main__":
    print("Starting Flask backend server on http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)
