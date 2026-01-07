#!/bin/bash
set -e

# Helper function to wait for the database
wait_for_db() {
    echo "Waiting for database..."
    while ! python -c "import socket; s = socket.socket(socket.AF_INET, socket.SOCK_STREAM); s.settimeout(1); s.connect(('db', 5432))" 2>/dev/null; do
        echo "Database not ready yet..."
        sleep 2
    done
    echo "Database is ready!"
}

wait_for_db

echo "Applying migrations..."
uv run PrimeBank/manage.py migrate

echo "Starting server on 0.0.0.0:${DJANGO_PORT}..."
# exec uv run PrimeBank/manage.py runserver 0.0.0.0:${DJANGO_PORT}
exec uv run gunicorn --pythonpath PrimeBank PrimeBank.wsgi:application --bind 0.0.0.0:${DJANGO_PORT}