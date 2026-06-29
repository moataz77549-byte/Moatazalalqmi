#!/bin/bash
set -e

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Moataz AI — Zero-Dependency Offline Startup Script
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "═══════════════════════════════════════"
echo "  Moataz AI Platform — Production Startup"
echo "═══════════════════════════════════════"

# 1. Environment Validation
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️ WARNING: DATABASE_URL is missing. Database features will be unavailable."
else
  # Auto-encode # if present for runtime stability
  if [[ "$DATABASE_URL" == *"#"* ]]; then
    export DATABASE_URL="${DATABASE_URL//#/%23}"
  fi
  echo "✅ DATABASE_URL is configured."
fi

# 2. Database Status (Non-blocking)
# We do not run prisma generate or migrate here.
# Everything must have been pre-built during the Docker build stage.
echo "ℹ️ Using pre-compiled Prisma client and build assets."
echo "ℹ️ Skipping database wait-for-it check to ensure instant startup."

# 3. Start Application
# We start the application regardless of database status.
# The application internal logic will handle connection retries or degraded mode.
echo "🚀 Starting Moataz AI Server..."
echo "═══════════════════════════════════════"

# Execute the pre-built standalone server
exec node server.js
