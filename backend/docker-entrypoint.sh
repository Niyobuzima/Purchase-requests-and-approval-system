#!/bin/sh
set -e

echo "Starting application..."

# Check if DATABASE_URL is set (Render managed database)
if [ -n "$DATABASE_URL" ]; then
    echo "Using DATABASE_URL for database connection"

    # Wait for database using DATABASE_URL
    python << END
import sys
import time
import os

# Try to parse DATABASE_URL or use individual vars
database_url = os.getenv('DATABASE_URL')

if database_url:
    # Parse DATABASE_URL: postgres://user:pass@host:port/dbname
    try:
        from urllib.parse import urlparse
        result = urlparse(database_url)
        db_host = result.hostname
        db_port = result.port or 5432
        db_user = result.username
        db_pass = result.password
        db_name = result.path[1:]  # Remove leading /
    except Exception as e:
        print(f"Error parsing DATABASE_URL: {e}")
        # Fallback to individual vars
        db_host = os.getenv('DB_HOST', 'localhost')
        db_port = os.getenv('DB_PORT', '5432')
        db_user = os.getenv('DB_USER', 'postgres')
        db_pass = os.getenv('DB_PASSWORD', 'postgres')
        db_name = os.getenv('DB_NAME', 'p2p_db')
else:
    db_host = os.getenv('DB_HOST', 'localhost')
    db_port = os.getenv('DB_PORT', '5432')
    db_user = os.getenv('DB_USER', 'postgres')
    db_pass = os.getenv('DB_PASSWORD', 'postgres')
    db_name = os.getenv('DB_NAME', 'p2p_db')

print(f"Connecting to database at {db_host}:{db_port}/{db_name}")

import psycopg2
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
    except psycopg2.OperationalError as e:
        retry_count += 1
        print(f"Waiting for PostgreSQL... ({retry_count}/{max_retries})")
        if retry_count == max_retries:
            print(f"Connection error: {e}")
        time.sleep(2)

print("PostgreSQL did not become ready in time")
sys.exit(1)
END

else
    echo "No DATABASE_URL found, using individual DB_* variables"

    # Original wait logic for local development
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

print(f"Connecting to database at {db_host}:{db_port}/{db_name}")

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
    except psycopg2.OperationalError as e:
        retry_count += 1
        print(f"Waiting for PostgreSQL... ({retry_count}/{max_retries})")
        if retry_count == max_retries:
            print(f"Connection error: {e}")
        time.sleep(2)

print("PostgreSQL did not become ready in time")
sys.exit(1)
END
fi

echo "Running migrations..."
python manage.py migrate --noinput || echo "Migration failed, continuing..."

echo "Collecting static files..."
python manage.py collectstatic --noinput || true

echo "Running User Seeders for test..."
python manage.py seed_users || echo "Seeding failed, continuing...."

echo "Starting server..."
exec "$@"
