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

# Read PORT from env in Python so it works even when Railway runs without a shell
CMD ["python", "start.py"]
