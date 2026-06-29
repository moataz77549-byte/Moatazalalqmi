#!/bin/bash
set -e

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Moataz AI — Ultimate Production Bootstrap Startup Script
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "═══════════════════════════════════════"
echo "  Moataz AI Platform — Production Startup"
echo "═══════════════════════════════════════"

# 1. Environment & Database Check
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️ WARNING: DATABASE_URL is missing. Application will run in degraded mode."
else
  # Auto-encode # if present for runtime stability
  if [[ "$DATABASE_URL" == *"#"* ]]; then
    export DATABASE_URL="${DATABASE_URL//#/%23}"
  fi
  echo "✅ DATABASE_URL detected."
  
  # Try to run migrations and seed (Bootstrap)
  echo "⚙️ Initializing System Bootstrap..."
  
  # Run Prisma Seed (which now handles Admin, Roles, Providers, and Settings)
  # We use npx tsx directly to ensure it uses the production node_modules
  npx prisma db seed || echo "⚠️ Bootstrap seed had warnings, but continuing startup..."
fi

# 2. Final System Readiness
echo "ℹ️ Using pre-compiled build assets."
echo "🚀 Starting Moataz AI Server..."
echo "═══════════════════════════════════════"

# Execute the pre-built standalone server
exec node server.js
