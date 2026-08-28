"""
routes/dashboard_routes.py — Flask Blueprint cho Dashboard, Export & Báo cáo tuần.
"""
import datetime

from flask import Blueprint, jsonify
from models import MonHoc, Deadline, OutputTuHoc, TaiLieu, MucTieu, NhatKyThoiGian, LichSuGiaHan
from services.dashboard_service import get_dashboard_data, generate_weekly_report

bp = Blueprint("dashboard", __name__)


@bp.route("/api/dashboard", methods=["GET"])
def get_dashboard():
    return jsonify(get_dashboard_data())


@bp.route("/api/bao_cao_tuan", methods=["GET"])
def get_bao_cao_tuan():
    return jsonify(generate_weekly_report())


@bp.route("/api/export", methods=["GET"])
def export_data():
    """UC18 — Export toàn bộ dữ liệu dưới dạng JSON."""
    return jsonify({
        "exported_at": datetime.datetime.now().isoformat(),
        "mon_hoc": [m.to_dict() for m in MonHoc.query.all()],
        "deadline": [d.to_dict() for d in Deadline.query.all()],
        "output_tu_hoc": [o.to_dict() for o in OutputTuHoc.query.all()],
        "tai_lieu": [t.to_dict() for t in TaiLieu.query.all()],
        "muc_tieu": [m.to_dict() for m in MucTieu.query.all()],
        "nhat_ky": [n.to_dict() for n in NhatKyThoiGian.query.all()],
        "lich_su_gia_han": [l.to_dict() for l in LichSuGiaHan.query.all()],
    })
