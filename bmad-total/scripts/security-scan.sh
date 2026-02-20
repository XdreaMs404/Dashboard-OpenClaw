#!/usr/bin/env bash
set -euo pipefail
APP_DIR="/root/.openclaw/workspace/bmad-total/app"
cd "$APP_DIR"

if [ ! -f package.json ]; then
  echo "No app/package.json yet."
  exit 1
fi

HAS_SECURITY_SCRIPT=$(node -e "const p=require('./package.json');process.exit(p.scripts && p.scripts['security:deps'] ? 0 : 1)") || true
if [ "${HAS_SECURITY_SCRIPT}" = "0" ]; then
  npm run security:deps
else
  npm audit --audit-level=high
fi

echo "✅ SECURITY_SCAN_OK"
