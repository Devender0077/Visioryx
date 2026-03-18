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

# 2. Database connection
echo "2. Database (PostgreSQL)"
DB_URL="${DATABASE_URL_SYNC:-postgresql://postgres:postgres@localhost:5432/visioryx}"
if cd backend && PYTHONPATH=. python3 -c "
import os
from sqlalchemy import create_engine, text
url = os.environ.get('DATABASE_URL_SYNC', 'postgresql://postgres:postgres@localhost:5432/visioryx')
try:
    engine = create_engine(url)
    with engine.connect() as conn:
        conn.execute(text('SELECT 1'))
    print('   ✓ Database connected')
except Exception as e:
    print(f'   ✗ Database error: {e}')
    exit(1)
" 2>/dev/null; then
  :
else
  echo "   ✗ Database connection failed. Ensure PostgreSQL is running on port 5432."
fi
cd "$PROJECT_ROOT"
echo ""

# 3. Database data
echo "3. Database tables & data"
(cd "$PROJECT_ROOT/backend" && PYTHONPATH=. python3 -c "
from sqlalchemy import create_engine, text
import os
url = os.environ.get('DATABASE_URL_SYNC', 'postgresql://postgres:postgres@localhost:5432/visioryx')
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
") 2>/dev/null || echo "   (Query skipped - ensure backend deps installed)"
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
