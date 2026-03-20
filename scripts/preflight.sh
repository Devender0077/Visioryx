#!/bin/bash
# Visioryx — check tooling and (if backend venv exists) database + tables.
# Usage: ./scripts/preflight.sh
# Run after: cd backend && python3 -m venv venv && . venv/bin/activate && pip install -r requirements.txt
# Or run ./scripts/start-dev.sh once to create the venv, then run this script again.

set -euo pipefail
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "=== Visioryx preflight ==="
echo ""

echo "1) Required tools"
MISSING=0
for cmd in node npm; do
  if command -v "$cmd" >/dev/null 2>&1; then
    echo "   ✓ $cmd ($("$cmd" --version 2>/dev/null | head -1))"
  else
    echo "   ✗ $cmd not found — install Node.js 20+ from https://nodejs.org"
    MISSING=1
  fi
done

pick_python() {
  for c in python3.12 python3.11 python3.10 python3; do
    if command -v "$c" >/dev/null 2>&1 && "$c" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' 2>/dev/null; then
      echo "$c"
      return 0
    fi
  done
  command -v python3 >/dev/null 2>&1 && echo python3 && return 0
  echo ""
}

PY="$(pick_python)"
if [ -n "$PY" ]; then
  echo "   ✓ Python ($PY — $($PY --version 2>&1))"
  if ! "$PY" -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)' 2>/dev/null; then
    echo "   ⚠ Python is below 3.10 — install 3.10+ (brew install python@3.12) for best compatibility"
  fi
else
  echo "   ✗ python3 not found"
  MISSING=1
fi

echo ""
echo "2) Optional (recommended for streaming / Docker)"
for cmd in docker ffmpeg; do
  if command -v "$cmd" >/dev/null 2>&1; then
    echo "   ✓ $cmd"
  else
    echo "   ○ $cmd not found (optional)"
  fi
done

echo ""
echo "3) Backend configuration"
if [ -f "$PROJECT_ROOT/backend/.env" ]; then
  echo "   ✓ backend/.env exists"
else
  echo "   ⚠ backend/.env missing — copy: cp backend/.env.example backend/.env"
fi

echo ""
echo "4) Database & schema"
VENV_PY="$PROJECT_ROOT/backend/venv/bin/python"
if [ -x "$VENV_PY" ]; then
  if "$VENV_PY" "$PROJECT_ROOT/scripts/check_setup.py"; then
    :
  else
    MISSING=1
  fi
else
  echo "   ⚠ backend/venv not found yet — create it, then install deps:"
  echo "      cd backend && $PY -m venv venv && . venv/bin/activate && pip install -r requirements.txt"
  echo "   Then start PostgreSQL and run: ./scripts/preflight.sh again"
fi

echo ""
echo "5) Services (if already running)"
if curl -sf http://localhost:8000/health >/dev/null 2>&1; then
  echo "   ✓ Backend http://localhost:8000 responds"
  if curl -sf http://localhost:8000/health/db >/dev/null 2>&1; then
    echo "   ✓ Backend /health/db — database reachable from API"
  else
    echo "   ⚠ Backend /health/db failed — check DATABASE_URL in backend/.env"
  fi
else
  echo "   ○ Backend not running (start: ./scripts/start-dev.sh backend)"
fi
if curl -sf -o /dev/null http://localhost:3000 2>/dev/null; then
  echo "   ✓ Frontend http://localhost:3000 responds"
else
  echo "   ○ Frontend not running (start: ./scripts/start-dev.sh frontend)"
fi

echo ""
if [ "$MISSING" -eq 0 ]; then
  echo "=== Preflight: required tooling OK ==="
  if [ ! -x "$VENV_PY" ]; then
    echo "    (Create backend venv + install deps, then run this again to verify PostgreSQL & tables.)"
  fi
else
  echo "=== Preflight: fix items marked ✗ / FAIL above ==="
  exit 1
fi
