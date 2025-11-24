# ================================
# 1. BUILDER STAGE (install deps)
# ================================
FROM python:3.11-slim AS builder

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install uv
RUN pip install uv

# Copy dependency files
COPY pyproject.toml uv.lock* /app/

# Install all dependencies into a local directory (not system-wide)
RUN uv pip install --no-cache --target=/app/deps \
    -r requirements.txt

# ================================
# 2. FINAL STAGE (small + fast)
# ================================
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /app/deps /usr/local/lib/python3.11/site-packages

# Copy application code
COPY . /app/

# Entry script permissions
RUN mkdir -p /app/staticfiles /app/media \
    && chmod +x /app/docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/app/docker-entrypoint.sh"]

# ================================
# 🚀 Run Django with Gunicorn (uvicorn workers)
# ================================
CMD ["gunicorn", "backend.asgi:application", \
    "--bind", "0.0.0.0:8000", \
    "--worker-class", "uvicorn.workers.UvicornWorker", \
    "--workers", "4", \
    "--timeout", "120", \
    "--log-level", "info"]
