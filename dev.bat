@echo off
:: Enable UTF-8 mode globally in Python on Windows to prevent UnicodeDecodeError crashes
set PYTHONUTF8=1

echo Starting Suchit Nagar Nigam Services...

:: Start Backend in a new CMD window (persisting window via /k so logs are visible)
echo Starting FastAPI Backend...
start "Suchit Backend" cmd /k ".venv\Scripts\python -m uvicorn backend.main:app --reload --port 8000"

:: Start Next.js Frontend in a new CMD window
echo Starting Next.js Frontend...
start "Suchit Frontend" cmd /c "cd frontend && npm run dev"

echo Both services launched.
