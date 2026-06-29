#!/bin/sh
set -e

echo "═══════════════════════════════════════"
echo "  Moataz AI Platform — Production Startup"
echo "═══════════════════════════════════════"

# 1. Verify DATABASE_URL exists
if [ -z "$DATABASE_URL" ]; then
  echo "❌ FATAL ERROR: DATABASE_URL is missing."
  echo "Please set DATABASE_URL in your environment variables."
  exit 1
fi

# 2. Parse Database Host and Port
DATABASE_HOST=$(echo $DATABASE_URL | sed -e 's|.*@||' -e 's|:.*||' -e 's|/.*||')
DATABASE_PORT=$(echo $DATABASE_URL | sed -e 's|.*:||' -e 's|/.*||')
case $DATABASE_PORT in
    ''|*[!0-9]*) DATABASE_PORT=5432 ;;
esac

# 3. Wait for Database with Exponential Backoff
echo "🔍 Checking database connectivity at $DATABASE_HOST:$DATABASE_PORT..."

MAX_RETRIES=5
RETRY_COUNT=0
WAIT_TIME=2

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if /usr/bin/wait-for-it.sh $DATABASE_HOST:$DATABASE_PORT -t 10; then
    echo "✅ Database is reachable!"
    break
  else
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
      echo "❌ FATAL ERROR: Database unreachable after $MAX_RETRIES attempts."
      exit 1
    fi
    echo "⚠️ Database not ready. Retrying in $WAIT_TIME seconds... (Attempt $RETRY_COUNT/$MAX_RETRIES)"
    sleep $WAIT_TIME
    WAIT_TIME=$((WAIT_TIME * 2))
  fi
done

# 4. Database Initialization
echo "⚙️  Step 1/3: Generating Prisma Client..."
if npx prisma generate --schema=./prisma/schema.prisma; then
    echo "✅ Prisma Client generated."
else
    echo "❌ Failed to generate Prisma Client."
    exit 1
fi

echo "📦 Step 2/3: Applying database migrations..."
if npx prisma migrate deploy --schema=./prisma/schema.prisma; then
  echo "✅ Migrations applied successfully."
else
  echo "⚠️  Migration deploy failed. Attempting db push as fallback..."
  if npx prisma db push --accept-data-loss --schema=./prisma/schema.prisma; then
    echo "✅ DB Push successful."
  else
    echo "❌ Database initialization failed."
    exit 1
  fi
fi

# 5. Bootstrap Data (Always run seed to ensure Admin & Providers are configured)
echo "🌱 Step 3/3: Running Production Bootstrap (Seed)..."
if npx prisma db seed; then
  echo "✅ Bootstrap completed."
else
  echo "⚠️ Bootstrap seed failed but continuing startup..."
fi

echo "🚀 Starting Moataz AI Server..."
echo "═══════════════════════════════════════"

# Execute the standalone server
exec node server.js
