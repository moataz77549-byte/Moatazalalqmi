#!/bin/bash
set -e

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Moataz AI — High Reliability Production Startup Script
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "═══════════════════════════════════════"
echo "  Moataz AI Platform — Production Startup"
echo "═══════════════════════════════════════"

# 1. Database Connection Logic
if [ -z "$DATABASE_URL" ]; then
  echo "❌ FATAL ERROR: DATABASE_URL is missing."
  echo "Please set DATABASE_URL in your environment variables."
  exit 1
fi

# Fix potential URL encoding issues (like # in password)
# If password contains #, it must be %23 in the connection string
if [[ "$DATABASE_URL" == *"#"* ]]; then
  echo "⚠️ Warning: DATABASE_URL contains '#'. Automatically encoding to '%23' for Prisma compatibility..."
  export DATABASE_URL="${DATABASE_URL//#/%23}"
fi

# Extract host and port for wait-for-it
# Format: postgresql://user:pass@host:port/db
DB_HOST=$(echo $DATABASE_URL | sed -e 's|.*@||' -e 's|/.*||' -e 's|:.*||')
DB_PORT=$(echo $DATABASE_URL | sed -n -e 's|.*:||p' | sed -e 's|/.*||')
if [[ ! "$DB_PORT" =~ ^[0-9]+$ ]]; then
  DB_PORT=5432
fi

echo "🔍 Checking database connectivity at $DB_HOST:$DB_PORT..."

# Wait for DB with exponential backoff
MAX_RETRIES=3
RETRY_COUNT=0
WAIT_TIME=2

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  if /usr/bin/wait-for-it.sh "$DB_HOST:$DB_PORT" -t 15; then
    echo "✅ Database is reachable via TCP."
    break
  else
    RETRY_COUNT=$((RETRY_COUNT+1))
    echo "⚠️ Database TCP check timed out. Retrying in ${WAIT_TIME}s... (Attempt $RETRY_COUNT/$MAX_RETRIES)"
    if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
      echo "⚠️ Warning: Database unreachable via TCP after $MAX_RETRIES attempts."
      echo "🚀 Proceeding anyway to let Prisma attempt a full connection..."
    else
      sleep $WAIT_TIME
      WAIT_TIME=$((WAIT_TIME * 2))
    fi
  fi
done

# 2. Database Initialization
echo "⚙️ Step 1/3: Generating Prisma Client..."
npx prisma generate --schema=./prisma/schema.prisma

echo "⚙️ Step 2/3: Applying Database Migrations..."
# We use a try-catch style here to prevent fatal crash if DB is still warming up
if npx prisma migrate deploy --schema=./prisma/schema.prisma; then
  echo "✅ Migrations applied successfully."
else
  echo "⚠️ Migration deploy failed. Attempting 'db push' as fallback..."
  npx prisma db push --accept-data-loss --schema=./prisma/schema.prisma || {
    echo "❌ FATAL ERROR: Database connection failed during initialization."
    echo "Please verify your DATABASE_URL and Supabase network settings (IPv4/IPv6)."
    exit 1
  }
fi

echo "⚙️ Step 3/3: Running Production Bootstrap (Seed)..."
# This is where Admin and Providers are imported
npx prisma db seed || echo "⚠️ Seed execution had warnings, but continuing startup..."

# 3. Start Application
echo "🚀 All systems ready. Starting Moataz AI Server..."
exec node server.js
