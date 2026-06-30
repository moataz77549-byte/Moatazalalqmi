#!/bin/bash
set -e

echo "🛡️ ENTERING PRODUCTION RECOVERY STARTUP..."

if [ -z "$DATABASE_URL" ]; then
  echo "❌ CRITICAL ERROR: DATABASE_URL is missing. Exiting."
  exit 1
fi

echo "✅ DATABASE_URL detected."

# Handle special characters in DATABASE_URL for shell commands
# Railway automatically escapes, but good to have for local/other environments
if [[ "$DATABASE_URL" == *"#"* ]]; then
  export DATABASE_URL="${DATABASE_URL//#/%23}"
fi

# Extract database host, port, and user from DATABASE_URL for pg_isready
# Extract user, password, host, port, and database name
# Extract user, password, host, port, and database name using sed
DB_USER=$(echo $DATABASE_URL | sed -r 's/postgresql:\/\/([^:]+):.*@.*/\1/')
DB_PASSWORD=$(echo $DATABASE_URL | sed -r 's/postgresql:\/\/[^:]+:([^@]+)@.*/\1/')
DB_HOST=$(echo $DATABASE_URL | sed -r 's/postgresql:\/\/[^@]+@([^:]+):.*/\1/')
DB_PORT=$(echo $DATABASE_URL | sed -r 's/postgresql:\/\/[^@]+@[^:]+:([0-9]+)\/.*$/\1/')
DB_NAME=$(echo $DATABASE_URL | sed -r 's/postgresql:\/\/[^@]+@[^:]+:[0-9]+\/([^?]+).*/\1/')

# Set PGPASSWORD for psql command
PGPASSWORD="$DB_PASSWORD"

echo "Debug: Extracted DB_USER=$DB_USER"
echo "Debug: Extracted DB_HOST=$DB_HOST"
echo "Debug: Extracted DB_PORT=$DB_PORT"
echo "Debug: Extracted DB_NAME=$DB_NAME"
echo "Debug: PGPASSWORD is set (value not shown for security)"

# For Supabase, the user for pg_isready might be 'postgres' even if the connection string has a different user
# We will use the extracted DB_USER, but keep this in mind for debugging.
# Also, Supabase often uses PgBouncer, which might cause issues with direct pg_isready checks.
# A simple netcat check for port availability might be more reliable for initial connection.


# For Supabase, the user for pg_isready might be 'postgres' even if the connection string has a different user
# We will use the extracted DB_USER, but keep this in mind for debugging.
# Also, Supabase often uses PgBouncer, which might cause issues with direct pg_isready checks.
# A simple netcat check for port availability might be more reliable for initial connection.


# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL database to be ready at $DB_HOST:$DB_PORT for user $DB_USER..."
until PGPASSWORD="$PGPASSWORD" psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; do
  echo "Debug: psql command failed. Retrying..."
  echo "PostgreSQL database is not ready or accessible - sleeping"
  sleep 5
done
echo "✅ PostgreSQL is ready."

echo "⚙️ Running Prisma Migrations..."
npx prisma migrate deploy --schema=/app/prisma/schema.prisma || { echo "❌ Prisma migrate deploy failed. Exiting."; exit 1; }
echo "✅ Prisma Migrations applied."

echo "🌱 Running Prisma Seed..."
npx prisma db seed --schema=/app/prisma/schema.prisma || echo "⚠️ Recovery seed finished with warnings."
echo "✅ Prisma Seed executed."

echo "🚀 Starting Moataz AI Server..."
echo "Attempting to start Next.js server..."
# Ensure the correct path to the standalone server.js
# Based on Dockerfile, .next/standalone content is copied to /app, so server.js is at /app/server.js
exec node /app/server.js || { echo "❌ Next.js server failed to start. Exiting."; exit 1; }
