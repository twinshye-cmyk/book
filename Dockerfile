FROM python:3.12-slim
RUN apt-get update && apt-get install -y --no-install-recommends fonts-nanum && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN mkdir -p /app/data
ENV DATA_DIR=/app/data COOKIE_SECURE=1 PYTHONUNBUFFERED=1
EXPOSE 8000
CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "1", "--threads", "4", "app:app"]
