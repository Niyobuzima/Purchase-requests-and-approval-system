#Builder stage
FROM python:3.11-slim AS builder

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install uv (lightweight, fast package manager)
RUN pip install --no-cache-dir uv

# Copy application first to create uv project structure
COPY . /app/

# Set longer timeout for package downloads (google-generativeai has large dependencies)
ENV UV_HTTP_TIMEOUT=120

# Initialize uv project and add dependencies
# uv creates a virtual environment and installs packages efficiently
RUN uv venv /app/.venv && \
    . /app/.venv/bin/activate && \
    uv pip install --no-cache \
        setuptools==80.9.0 \
        django==4.2.16 \
        djangorestframework==3.14.0 \
        djangorestframework-simplejwt==5.3.0 \
        psycopg2-binary==2.9.9 \
        django-cors-headers==4.3.1 \
        django-filter==23.5 \
        django-cloudinary-storage==0.3.0 \
        cloudinary==1.36.0 \
        python-dotenv==1.0.0 \
        openai==1.6.1 \
        google-generativeai==0.8.5 \
        pillow==10.1.0 \
        reportlab==4.0.7 \
        uvicorn[standard]==0.27.0 \
        gunicorn==21.2.0

#Final Stage
FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV PATH="/app/.venv/bin:$PATH"
ENV VIRTUAL_ENV="/app/.venv"

WORKDIR /app

# Install uv and curl (for health checks)
RUN apt-get update && apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/* && \
    pip install --no-cache-dir uv

# Copy virtual environment from builder
COPY --from=builder /app/.venv /app/.venv

# Copy application code
COPY . /app/

# Create directories and set permissions
RUN mkdir -p /app/staticfiles /app/media && \
    chmod +x /app/docker-entrypoint.sh

EXPOSE 8000

# Health check - verify the app is responding
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/api/health/ || exit 1

ENTRYPOINT ["/app/docker-entrypoint.sh"]

CMD uv run uvicorn backend.asgi:application \
     --host ${HOST:-0.0.0.0} \
     --port ${PORT:-8000} \
     --workers 2 \
     --timeout-keep-alive 120 \
     --log-level info \
     --access-log
