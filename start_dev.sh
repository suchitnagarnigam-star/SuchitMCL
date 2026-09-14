#!/bin/bash
# Suchit Nagar Nigam — Dev Server Launcher Script

# Determine project root directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

echo "🧹 Freeing ports 3000, 3001 and 8000..."
fuser -k 3000/tcp 3001/tcp 8000/tcp 2>/dev/null || true
pkill -f "next-server" 2>/dev/null || true
pkill -f "uvicorn" 2>/dev/null || true
sleep 1

echo "⚡ Disabling telemetry & clearing stale Next.js cache..."
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--dns-result-order=ipv4first"
rm -rf frontend/.next

echo "🚀 Launching FastAPI Backend (http://localhost:8000)..."
nohup "$SCRIPT_DIR/.venv/bin/uvicorn" backend.main:app --host 0.0.0.0 --port 8000 > "$SCRIPT_DIR/backend.log" 2>&1 &

sleep 2

echo "🚀 Launching Next.js Frontend (http://localhost:3000)..."
cd "$SCRIPT_DIR/frontend" && npm run dev
