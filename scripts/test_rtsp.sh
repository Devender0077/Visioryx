#!/bin/bash
# Test RTSP from the same machine that runs the Visioryx backend (required for live view).
# Usage: ./scripts/test_rtsp.sh 'rtsp://user:pass@host:554/path?channel=1&subtype=0'
set -e
URL="${1:?Usage: $0 'rtsp://...'}"
if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "Install ffmpeg first (e.g. brew install ffmpeg), then re-run."
  exit 1
fi
echo "Probing RTSP (TCP, 1 frame) — same network path the backend uses..."
# Keep flags minimal: some FFmpeg builds omit -stimeout / -rw_timeout on the global CLI.
# Run from your project folder, e.g. cd ~/Desktop/Projects/Visioryx (not the literal /path/to/Visioryx).
ffmpeg -hide_banner -loglevel warning -rtsp_transport tcp -i "$URL" -frames:v 1 -f null - && echo "OK: RTSP reachable from this host."
