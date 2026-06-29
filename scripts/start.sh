#!/bin/sh
set -e

echo "═══════════════════════════════════════"
echo "  Moataz AI Platform — Starting..."
echo "═══════════════════════════════════════"

# Check if DATABASE_URL is provided
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️ WARNING: DATABASE_URL is missing."
  echo "Please ensure you have added the variables in Railway Console > Variables."
  # We will try to continue to allow the health check to pass if possible, 
  # though the app will likely fail on DB queries later.
  # However, for Railway to stay alive, we might need a fallback or just a clearer error.
  echo "Trying to proceed anyway to allow health checks..."
fi

# Apply database migrations ONLY if DATABASE_URL is present
if [ -n "$DATABASE_URL" ]; then
  echo "⏳ Waiting for database to be ready..."
  # Parse DATABASE_URL to get host and port for wait-for-it.sh if not provided
  if [ -z "$DATABASE_HOST" ]; then
    DATABASE_HOST=$(echo $DATABASE_URL | sed -e 's|.*@||' -e 's|:.*||' -e 's|/.*||')
  fi
  if [ -z "$DATABASE_PORT" ]; then
    DATABASE_PORT=$(echo $DATABASE_URL | sed -e 's|.*:||' -e 's|/.*||')
    # Default to 5432 if port parsing fails
    case $DATABASE_PORT in
      ''|*[!0-9]*) DATABASE_PORT=5432 ;;
    esac
  fi

  echo "🔍 Checking connection to $DATABASE_HOST:$DATABASE_PORT..."
  /usr/bin/wait-for-it.sh $DATABASE_HOST:$DATABASE_PORT -t 60 -- echo "✅ Database is reachable!"

  echo "📦 Applying database migrations..."
  # Using npx to run prisma from local node_modules
  echo "⚙️  Generating Prisma Client..."
  npx prisma generate --schema=./prisma/schema.prisma

  if npx prisma migrate deploy --schema=./prisma/schema.prisma; then
    echo "✅ Migrations applied successfully."
  else
    echo "⚠️  Prisma migrate deploy failed. Attempting db push as fallback..."
    npx prisma db push --accept-data-loss --schema=./prisma/schema.prisma
  fi
else
  echo "⚠️ Skipping database migrations because DATABASE_URL is not set."
fi

# Run seed if requested
if [ "$SEED_ON_START" = "true" ]; then
  echo "🌱 Seeding database..."
  npx prisma db seed || echo "⚠️ Seed skipped."
fi

echo "🚀 Starting Moataz AI Server..."
echo "═══════════════════════════════════════"

# Execute the standalone server
exec node server.js
