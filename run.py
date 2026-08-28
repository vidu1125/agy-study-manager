"""
run.py — Root application entrypoint for local execution and production servers.
Usage:
  - Local Dev:   python run.py
  - Gunicorn:    gunicorn run:app
"""
import os
import sys

# Thêm thư mục backend vào sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(BASE_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from backend.app import app
from backend.config import get_bool_env, get_int_env

if __name__ == "__main__":
    port = get_int_env("PORT", default=5000)
    debug = get_bool_env("FLASK_DEBUG", default=True)
    print(f"🚀 Starting AGY Study Manager on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=debug)
