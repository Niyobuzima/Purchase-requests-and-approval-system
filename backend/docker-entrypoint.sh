#!/bin/sh
set -e

echo "Waiting for postgres..."

# Use Python to wait for PostgreSQL (no netcat needed)
python << END
import sys
import time
import psycopg2
import os

db_host = os.getenv('DB_HOST', 'db')
db_port = os.getenv('DB_PORT', '5432')
db_user = os.getenv('DB_USER', 'postgres')
db_pass = os.getenv('DB_PASSWORD', 'postgres')
db_name = os.getenv('DB_NAME', 'p2p_db')

max_retries = 30
retry_count = 0

while retry_count < max_retries:
    try:
        conn = psycopg2.connect(
            host=db_host,
            port=db_port,
            user=db_user,
            password=db_pass,
            dbname=db_name
        )
        conn.close()
        print("PostgreSQL is ready!")
        sys.exit(0)
    except psycopg2.OperationalError:
        retry_count += 1
        print(f"Waiting for PostgreSQL... ({retry_count}/{max_retries})")
        time.sleep(1)

print("PostgreSQL did not become ready in time")
sys.exit(1)
END

echo "Collecting static files..."
python manage.py collectstatic --noinput || true

echo "Starting server..."
exec "$@"
