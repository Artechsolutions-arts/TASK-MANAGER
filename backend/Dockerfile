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

# Ensure shell script has Unix line endings (avoids "bad interpreter" in container)
RUN sed -i 's/\r$//' entrypoint.sh 2>/dev/null || true
RUN chmod +x entrypoint.sh

ENV PORT=8080
EXPOSE 8080

# Run via shell so $PORT is always expanded (Railway sets PORT; default 8080)
CMD ["/bin/sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8080}"]
