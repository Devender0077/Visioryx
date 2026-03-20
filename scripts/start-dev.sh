#!/bin/bash
# Visioryx - Start dev (kills busy ports 3000/8000 first)
# Usage: ./scripts/start-dev.sh [backend|frontend|all]

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

kill_port() {
    local port=$1
    local pids
    pids=$(lsof -ti :"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
        echo "Killing process(es) on port $port: $pids"
        echo "$pids" | xargs kill -9 2>/dev/null || true
        sleep 1
    fi
}

setup_db() {
    echo "Database: running Alembic migrations (requires PostgreSQL)..."
    if (cd "$PROJECT_ROOT/backend" && PYTHONPATH=. alembic upgrade head); then
        echo "Database: migrations OK."
    else
        echo ""
        echo "  *** Migration failed. Start Postgres, then retry:"
        echo "      docker compose -f docker/docker-compose.dev.yml up -d"
        echo "      Ensure backend/.env DATABASE_URL matches postgresql+asyncpg://postgres:postgres@localhost:5432/visioryx"
        echo "  Health check: curl -s http://localhost:8000/health/db"
        echo ""
    fi
    if (cd "$PROJECT_ROOT/backend" && PYTHONPATH=. python3 scripts/seed_admin.py); then
        :
    else
        echo "  (seed_admin skipped or failed — may be OK if DB not up yet)"
    fi
}

start_backend() {
    echo "Starting backend on port 8000..."
    kill_port 8000
    cd "$PROJECT_ROOT/backend"
    if [ ! -d "venv" ]; then
        echo "Creating venv..."
        python3 -m venv venv || { echo "venv creation failed"; return 1; }
    fi
    if [ -f "venv/bin/activate" ]; then
        . venv/bin/activate
    elif [ -f "venv/Scripts/activate" ]; then
        . venv/Scripts/activate
    else
        echo "venv activate not found, using system python"
    fi
    pip install -q -r requirements.txt || pip3 install -q -r requirements.txt
    setup_db
    uvicorn app.main:app --host 0.0.0.0 --port 8000 &
    echo "Backend started: http://localhost:8000"
}

start_frontend() {
    echo "Starting frontend on port 3000..."
    kill_port 3000
    cd "$PROJECT_ROOT/frontend"
    npm install --silent 2>/dev/null
    npm run dev &
    echo "Frontend started: http://localhost:3000"
}

case "${1:-all}" in
    backend)
        start_backend
        echo "Backend running. Press Ctrl+C to stop."
        wait
        ;;
    frontend)
        start_frontend
        echo "Frontend running. Press Ctrl+C to stop."
        wait
        ;;
    all)
        start_backend
        sleep 2
        start_frontend
        echo ""
        echo "Visioryx running:"
        echo "  Dashboard: http://localhost:3000"
        echo "  API:       http://localhost:8000"
        echo "  API Docs:  http://localhost:8000/api/docs"
        wait
        ;;
    *)
        echo "Usage: $0 [backend|frontend|all]"
        exit 1
        ;;
esac
