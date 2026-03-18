#!/bin/bash
# Restartable backend runner (helps when Python/OpenCV crashes)
# Usage: ./scripts/start-backend-supervised.sh

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT/backend"

if [ ! -d "venv" ]; then
  python3 -m venv venv
fi

if [ -f "venv/bin/activate" ]; then
  . venv/bin/activate
elif [ -f "venv/Scripts/activate" ]; then
  . venv/Scripts/activate
fi

pip install -q -r requirements.txt || pip3 install -q -r requirements.txt

echo "Starting supervised backend on http://localhost:8000 (STREAM_MODE=${STREAM_MODE:-hls})"
echo "If it crashes, it will restart automatically."
echo ""

RESTART_DELAY_SEC="${RESTART_DELAY_SEC:-2}"

while true; do
  set +e
  PYTHONPATH=. uvicorn app.main:app --host 0.0.0.0 --port 8000
  code=$?
  set -e
  echo ""
  echo "Backend exited with code $code. Restarting in ${RESTART_DELAY_SEC}s..."
  sleep "$RESTART_DELAY_SEC"
done

