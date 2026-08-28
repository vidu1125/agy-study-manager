SHELL := /bin/sh

PYTHON ?= python3
VENV := .venv
VENV_PYTHON := $(VENV)/bin/python
VENV_PIP := $(VENV)/bin/pip
COMPOSE ?= docker compose

PYTHON_SOURCES := run.py app.py backend/*.py backend/routes/*.py backend/services/*.py backend/notifications/*.py backend/migrations/*.py backend/presenters/*.py
JAVASCRIPT_SOURCES := frontend/static/js/app.js frontend/static/js/vocab_analytics.js

.DEFAULT_GOAL := help

.PHONY: help env install run check test docker-build docker-up docker-down docker-logs docker-shell docker-config health clean-pyc

help: ## Hiển thị các lệnh có thể dùng
	@awk 'BEGIN {FS = ":.*##"; printf "\nAGY Study Manager\n\nCú pháp: make <target>\n\n"} /^[a-zA-Z_-]+:.*?##/ {printf "  %-16s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

env: ## Tạo .env local từ .env.example nếu chưa có
	@if [ ! -f .env ]; then cp .env.example .env; echo "Created .env from .env.example"; else echo ".env already exists"; fi

install: env ## Tạo virtualenv và cài Python dependencies
	$(PYTHON) -m venv $(VENV)
	$(VENV_PIP) install --upgrade pip
	$(VENV_PIP) install -r requirements.txt

run: env ## Chạy ứng dụng local (scheduler mặc định tắt)
	@if [ ! -x $(VENV_PYTHON) ]; then $(MAKE) install; fi
	SCHEDULER_ENABLED=$${SCHEDULER_ENABLED:-false} $(VENV_PYTHON) run.py

check: ## Kiểm tra Python, JavaScript và health endpoint
	@if [ ! -x $(VENV_PYTHON) ]; then $(MAKE) install; fi
	SCHEDULER_ENABLED=false $(VENV_PYTHON) -m py_compile $(PYTHON_SOURCES)
	node --check frontend/static/js/app.js
	node --check frontend/static/js/vocab_analytics.js
	SCHEDULER_ENABLED=false $(VENV_PYTHON) -c "from run import app; client = app.test_client(); assert client.get('/healthz').status_code == 200; assert client.get('/').status_code == 200; print('Health and page smoke tests passed')"

test: check ## Alias kiểm tra hiện có (chưa có pytest suite)

docker-build: env ## Build Docker image local
	$(COMPOSE) build

docker-up: env ## Chạy Docker Compose nền
	$(COMPOSE) up --build -d

docker-down: ## Dừng container nhưng giữ database volume local
	$(COMPOSE) down

docker-logs: ## Theo dõi log container
	$(COMPOSE) logs -f app

docker-shell: ## Mở shell trong container đang chạy
	$(COMPOSE) exec app sh

docker-config: env ## Kiểm tra cấu hình Compose sau khi thay biến môi trường
	$(COMPOSE) config

health: ## Kiểm tra /healthz của app local hoặc Docker
	@curl --fail --silent --show-error http://127.0.0.1:$${PORT:-5000}/healthz && echo

clean-pyc: ## Xóa bytecode Python có thể tạo lại an toàn
	@find . -type d -name __pycache__ -prune -exec rm -rf {} +
