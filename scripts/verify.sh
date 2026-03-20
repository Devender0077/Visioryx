#!/bin/bash
# Visioryx - Verify Docker, Database, and Services
# Usage: ./scripts/verify.sh

set -e
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=== Visioryx Verification ==="
echo ""

# 1. Docker
echo "1. Docker"
if command -v docker &>/dev/null; then
  docker --version
  docker compose version 2>/dev/null || docker-compose --version
  echo "   ✓ Docker available"
else
  echo "   ✗ Docker not found"
fi
echo ""

# 2–3. Database (use backend venv Python when present)
PY="$PROJECT_ROOT/backend/venv/bin/python"
[ -x "$PY" ] || PY=python3
echo "2. Database (PostgreSQL) — using $PY"
if "$PY" "$PROJECT_ROOT/scripts/check_setup.py" 2>/dev/null; then
  :
else
  echo "   ✗ Database / schema check failed. Start Postgres and run: cd backend && PYTHONPATH=. alembic upgrade head"
fi
echo ""

echo "3. Database row counts (optional)"
(cd "$PROJECT_ROOT/backend" && PYTHONPATH=. "$PY" -c "
from sqlalchemy import create_engine, text
import os
from pathlib import Path
envp = Path('.' ) / '.env'
if envp.exists():
    for line in envp.read_text().splitlines():
        line = line.strip()
        if line and not line.startswith('#') and '=' in line:
            k, _, v = line.partition('=')
            if k.strip() and k.strip() not in os.environ:
                x = v.strip().strip(chr(34)).strip(chr(39))
                os.environ[k.strip()] = x
url = os.environ.get('DATABASE_URL_SYNC', 'postgresql://postgres:postgres@localhost:5432/visioryx')
if url.startswith('postgresql+asyncpg://'):
    url = 'postgresql://' + url.split('postgresql+asyncpg://', 1)[1]
engine = create_engine(url)
with engine.connect() as conn:
    r = conn.execute(text(\"SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename\"))
    tables = [row[0] for row in r]
    print('   Tables:', len(tables), '(' + ', '.join(tables) + ')')
    if 'auth_users' in tables:
        r2 = conn.execute(text('SELECT COUNT(*) FROM auth_users'))
        n = r2.scalar()
        print('   Auth users:', n)
        if n == 0:
            print('   WARNING: Run cd backend && PYTHONPATH=. python scripts/seed_admin.py')
    for t in ['cameras', 'users', 'detections', 'alerts']:
        if t in tables:
            r3 = conn.execute(text('SELECT COUNT(*) FROM ' + t))
            print('   ' + t + ':', r3.scalar(), 'rows')
" 2>/dev/null) || echo "   (Skipped — ensure backend venv exists: pip install -r backend/requirements.txt)"
echo ""

# 4. Backend API
echo "4. Backend API (http://localhost:8000)"
if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
  echo "   ✓ Backend healthy"
  if curl -sf http://localhost:8000/health/db >/dev/null 2>&1; then
    echo "   ✓ DB health OK"
  fi
else
  echo "   ✗ Backend not responding. Start with: ./scripts/start-dev.sh backend"
fi
echo ""

# 5. Frontend
echo "5. Frontend (http://localhost:3000)"
if curl -sf -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null | grep -q 200; then
  echo "   ✓ Frontend responding"
else
  echo "   ✗ Frontend not responding. Start with: ./scripts/start-dev.sh frontend"
fi
echo ""

echo "=== Verification complete ==="
