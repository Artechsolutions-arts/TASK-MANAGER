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

# Railway uses port 8080; entrypoint reads $PORT (Railway sets it)
RUN chmod +x entrypoint.sh
ENV PORT=8080
EXPOSE 8080

# Use absolute path so entrypoint runs regardless of how the container is started
ENTRYPOINT ["/app/entrypoint.sh"]
