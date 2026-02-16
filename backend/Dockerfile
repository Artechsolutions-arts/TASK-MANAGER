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

# Entrypoint ensures PORT is always expanded (Railway may override CMD without a shell)
RUN chmod +x entrypoint.sh
ENV PORT=8000
EXPOSE 8000

# Clear any Railway-injected start command by using entrypoint; PORT is read inside the script
ENTRYPOINT ["./entrypoint.sh"]
