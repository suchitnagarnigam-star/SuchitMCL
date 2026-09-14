#!/bin/bash
# Suchit Nagar Nigam — Dev Server Launcher Script

echo "🧹 Freeing ports 3000 and 8000..."
fuser -k 3000/tcp 8000/tcp 2>/dev/null || true

echo "⚡ Disabling telemetry & clearing stale Next.js cache..."
export NEXT_TELEMETRY_DISABLED=1
export NODE_OPTIONS="--dns-result-order=ipv4first"
rm -rf frontend/.next

echo "🚀 Launching FastAPI Backend (http://localhost:8000)..."
.venv/bin/uvicorn backend.main:app --host 0.0.0.0 --port 8000 &

sleep 2

echo "🚀 Launching Next.js Frontend (http://localhost:3000)..."
cd frontend && npm run dev
