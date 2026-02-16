#!/bin/sh
set -e
# Railway exposes on 8080; use that as default so healthcheck finds the app
PORT="${PORT:-8080}"
exec uvicorn app.main:app --host 0.0.0.0 --port "$PORT"
