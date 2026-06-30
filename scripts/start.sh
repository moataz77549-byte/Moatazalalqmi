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
DB_HOST=$(echo $DATABASE_URL | sed -e 's/.*@//' -e 's/:.*//')
DB_PORT=$(echo $DATABASE_URL | sed -e 's/.*://' -e 's/\/.*//')
DB_USER=$(echo $DATABASE_URL | sed -e 's/postgresql:\/\///' -e 's/:.*//' -e 's/@.*//')

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL database to be ready at $DB_HOST:$DB_PORT for user $DB_USER..."
until pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; do
  echo "PostgreSQL is unavailable - sleeping"
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
exec node server.js
