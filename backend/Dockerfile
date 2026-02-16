FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Railway and other platforms inject PORT at runtime
ENV PORT=8000
EXPOSE $PORT

# Use shell form so $PORT is expanded at runtime (Railway sets PORT)
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
