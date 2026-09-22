FROM python:3.11-slim

# Install system dependencies (Poppler is required for PDF OCR)
RUN apt-get update && apt-get install -y --no-install-recommends \
    poppler-utils \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Upgrade pip and install wheels
RUN pip install --no-cache-dir --upgrade pip setuptools wheel

# Copy requirements and install
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy only backend application code
COPY backend/ ./backend/

# Set environment variables for UTF-8 and low memory consumption
ENV PYTHONUNBUFFERED=1
ENV PYTHONUTF8=1

EXPOSE 8000

# Run single worker Uvicorn honoring Railway's dynamic PORT
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1
