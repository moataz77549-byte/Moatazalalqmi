#!/bin/bash
# Moataz AI — Railway Deployment Script
set -euo pipefail

echo "🚀 Moataz AI v1.0 — Railway Deployment"
echo "======================================="

# Verify Railway CLI is installed
if ! command -v railway &> /dev/null; then
  echo "❌ Railway CLI not found. Install: npm install -g @railway/cli"
  exit 1
fi

# Check logged in
railway whoami || { echo "❌ Not logged in. Run: railway login"; exit 1; }

echo "📦 Deploying to Railway..."
railway up --detach

echo "✅ Deployment initiated. Monitor at: https://railway.app/dashboard"
