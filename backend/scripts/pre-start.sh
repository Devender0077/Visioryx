#!/bin/sh
# Pre-start: run migrations and seed admin before starting the app
set -e
cd "$(dirname "$0")/.."

echo "[Visioryx] Pre-start: waiting for database..."
for i in 1 2 3 4 5 6 7 8 9 10; do
  if python -c "
import os, sys
url = os.environ.get('DATABASE_URL_SYNC', 'postgresql://postgres:postgres@localhost:5432/visioryx').replace('+asyncpg', '')
try:
  import psycopg2
  psycopg2.connect(url)
  sys.exit(0)
except Exception:
  sys.exit(1)
" 2>/dev/null; then
    echo "[Visioryx] Database ready."
    break
  fi
  [ $i -eq 10 ] && { echo "[Visioryx] Database not ready."; exit 1; }
  sleep 3
done

echo "[Visioryx] Running migrations..."
alembic upgrade head || true
echo "[Visioryx] Seeding admin..."
python scripts/seed_admin.py || true
echo "[Visioryx] Pre-start complete. Starting uvicorn..."
