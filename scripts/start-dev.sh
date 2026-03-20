#!/bin/bash
# Visioryx - Start dev (kills busy ports 3000/8000 first)
# Usage: ./scripts/start-dev.sh [backend|frontend|all]

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

# Prefer Python 3.10+ when available
pick_python() {
    for cmd in python3.12 python3.11 python3.10 python3; do
        if command -v "$cmd" >/dev/null 2>&1 && "$cmd" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' 2>/dev/null; then
            echo "$cmd"
            return 0
        fi
    done
    if command -v python3 >/dev/null 2>&1; then
        echo "python3"
        return 0
    fi
    echo ""
}

PYTHON_CMD="$(pick_python)"
if [ -z "$PYTHON_CMD" ]; then
    echo "Error: python3 not found"
    exit 1
fi
if ! "$PYTHON_CMD" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' 2>/dev/null; then
    echo "Warning: $PYTHON_CMD is below 3.10. Visioryx targets Python 3.10+; install via https://www.python.org or: brew install python@3.12"
fi

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
    (
        cd "$PROJECT_ROOT/backend" || exit 1
        export PYTHONPATH=.
        if [ -f "venv/bin/activate" ]; then
            # shellcheck source=/dev/null
            . venv/bin/activate
        else
            echo "ERROR: backend/venv missing after pip install."
            exit 1
        fi
        echo "Running database migrations..."
        if ! alembic upgrade head; then
            echo ""
            echo "ERROR: Database migrations failed."
            echo "  • Start PostgreSQL (example: docker compose -f docker/docker-compose.dev.yml up -d)"
            echo "  • Copy backend/.env.example to backend/.env and set DATABASE_URL / DATABASE_URL_SYNC"
            echo "  • Run ./scripts/preflight.sh to verify your machine"
            exit 1
        fi
        echo "Seeding admin user (if needed)..."
        python scripts/seed_admin.py || true
        echo "Verifying database tables..."
        if ! python "$PROJECT_ROOT/scripts/check_setup.py"; then
            exit 1
        fi
    )
}

start_backend() {
    echo "Starting backend on port 8000..."
    kill_port 8000
    cd "$PROJECT_ROOT/backend"
    if [ ! -d "venv" ]; then
        echo "Creating venv with $PYTHON_CMD..."
        "$PYTHON_CMD" -m venv venv || { echo "venv creation failed"; return 1; }
    fi
    if [ -f "venv/bin/activate" ]; then
        . venv/bin/activate
    elif [ -f "venv/Scripts/activate" ]; then
        . venv/Scripts/activate
    else
        echo "venv activate not found, using system python"
    fi
    pip install -q -r requirements.txt || pip3 install -q -r requirements.txt
    if ! setup_db; then
        echo "Backend start aborted (fix database setup above)."
        return 1
    fi
    uvicorn app.main:app --host 0.0.0.0 --port 8000 &
    echo "Backend started: http://localhost:8000"
}

start_frontend() {
    echo "Starting frontend on port 3000..."
    if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
        echo "ERROR: Node.js / npm not found. Install Node 20+ from https://nodejs.org"
        return 1
    fi
    kill_port 3000
    cd "$PROJECT_ROOT/frontend"
    if ! (npm install --silent 2>/dev/null || npm install); then
        echo "ERROR: npm install failed."
        return 1
    fi
    npm run dev &
    echo "Frontend started: http://localhost:3000"
}

case "${1:-all}" in
    backend)
        start_backend || exit 1
        echo "Backend running. Press Ctrl+C to stop."
        wait
        ;;
    frontend)
        start_frontend || exit 1
        echo "Frontend running. Press Ctrl+C to stop."
        wait
        ;;
    all)
        start_backend || exit 1
        sleep 2
        start_frontend || exit 1
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
