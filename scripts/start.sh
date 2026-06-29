#!/bin/bash
set -e
echo "🛡️ ENTERING PRODUCTION RECOVERY STARTUP..."
if [ -z "$DATABASE_URL" ]; then
  echo "⚠️ CRITICAL: DATABASE_URL is missing. Application starting in degraded mode."
else
  if [[ "$DATABASE_URL" == *"#"* ]]; then
    export DATABASE_URL="${DATABASE_URL//#/%23}"
  fi
  echo "✅ DATABASE_URL detected."
  echo "⚙️ Executing Recovery Bootstrap..."
  npx prisma db seed || echo "⚠️ Recovery seed finished with warnings."
fi
echo "🚀 Starting Moataz AI Server..."
exec node server.js
