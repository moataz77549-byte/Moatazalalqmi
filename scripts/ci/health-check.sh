#!/bin/bash
# Moataz AI — Health Check Script
set -euo pipefail

URL="${1:-http://localhost:3000}"
ENDPOINT="$URL/api/v1/health"
MAX_RETRIES=30
RETRY_INTERVAL=2

echo "🏥 Checking health at: $ENDPOINT"

for i in $(seq 1 $MAX_RETRIES); do
  RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$ENDPOINT" 2>/dev/null || echo "000")
  if [ "$RESPONSE" = "200" ]; then
    echo "✅ Service is healthy (attempt $i)"
    exit 0
  fi
  echo "   Attempt $i/$MAX_RETRIES — HTTP $RESPONSE"
  sleep $RETRY_INTERVAL
done

echo "❌ Service did not become healthy after $MAX_RETRIES attempts"
exit 1
