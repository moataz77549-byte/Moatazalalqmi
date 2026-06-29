#!/bin/bash
set -e

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Moataz AI — Production Recovery & Stabilization Startup
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

echo "🛡️ ENTERING PRODUCTION RECOVERY STARTUP..."

# 1. Database Connection Check (Non-blocking)
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️ CRITICAL: DATABASE_URL is missing. Application starting in degraded mode."
else
  # Encode # for Prisma stability
  if [[ "$DATABASE_URL" == *"#"* ]]; then
    export DATABASE_URL="${DATABASE_URL//#/%23}"
  fi
  echo "✅ DATABASE_URL detected."
  
  # Run Recovery Seed (Offline-ready, no package downloads)
  echo "⚙️ Executing Recovery Bootstrap..."
  npx prisma db seed || echo "⚠️ Recovery seed finished with warnings."
fi

# 2. Start Application
echo "🚀 Starting Moataz AI Server..."
exec node server.js
