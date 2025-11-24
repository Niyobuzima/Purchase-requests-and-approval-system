FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1
ENV UV_SYSTEM_PYTHON=1

WORKDIR /app

# Install uv - the fast Python package installer
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy only dependency files first for better layer caching
COPY pyproject.toml /app/

# Install dependencies using uv (much faster than pip)
# uv resolves and installs packages in parallel
RUN uv pip install --system --no-cache -e .

# Copy application code
COPY . /app/

# Create directories and set permissions
RUN mkdir -p /app/staticfiles /app/media && \
    chmod +x /app/docker-entrypoint.sh

EXPOSE 8000

# Set entrypoint
ENTRYPOINT ["/app/docker-entrypoint.sh"]

# Optimized for 2GB VM: 2 workers + 2 threads = handles 4 concurrent requests
CMD ["gunicorn", "backend.wsgi:application", \
     "--bind", "0.0.0.0:8000", \
     "--workers", "2", \
     "--threads", "2", \
     "--worker-class", "gthread", \
     "--worker-tmp-dir", "/dev/shm", \
     "--timeout", "120", \
     "--max-requests", "1000", \
     "--max-requests-jitter", "50", \
     "--access-logfile", "-", \
     "--error-logfile", "-"]
