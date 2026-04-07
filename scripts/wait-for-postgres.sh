#!/bin/sh
# wait-for-postgres.sh - Wait for PostgreSQL to be ready before starting the application

set -e

host="$1"
shift
cmd="$@"

echo "Waiting for PostgreSQL at $host..."

until PGPASSWORD=$POSTGRES_PASSWORD psql -h "$host" -U "${POSTGRES_USER:-shortener}" -d "${POSTGRES_DB:-shortener}" -c '\q' 2>/dev/null; do
  >&2 echo "Postgres is unavailable - sleeping"
  sleep 2
done

>&2 echo "Postgres is up - executing command"
exec $cmd
