"""
backend package initialization
"""
import os
import sys

# Đảm bảo backend directory nằm trong sys.path để các module nội bộ import lẫn nhau thông suốt
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
