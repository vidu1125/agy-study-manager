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

if __name__ == "__main__":
    print("🚀 Starting AGY Study Manager on http://localhost:5000")
    app.run(host="0.0.0.0", port=5000, debug=True)
