#!/bin/sh
set -e

echo "═══════════════════════════════════════"
echo "  Moataz AI Platform — Starting..."
echo "═══════════════════════════════════════"

# Check if DATABASE_URL is provided
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL is missing. Please check your Railway variables."
  exit 1
fi

# Apply database migrations
echo "⏳ Waiting for database to be ready..."
/usr/bin/wait-for-it.sh $DATABASE_HOST:$DATABASE_PORT -t 60 -- echo "✅ Database is ready!"

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

# Run seed if requested
if [ "$SEED_ON_START" = "true" ]; then
  echo "🌱 Seeding database..."
  npx prisma db seed || echo "⚠️ Seed skipped."
fi

echo "🚀 Starting Moataz AI Server..."
echo "═══════════════════════════════════════"

# Execute the standalone server
exec node server.js
