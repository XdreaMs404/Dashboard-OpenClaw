#!/usr/bin/env bash
set -euo pipefail
ROOT="/root/.openclaw/workspace/bmad-total"
APP_DIR="$ROOT/app"

cd "$APP_DIR"

if [ ! -f package.json ]; then
  echo "⚠ app/package.json manquant -> bootstrap automatique du stack test"
  bash "$ROOT/scripts/bootstrap-test-stack.sh" --ci
fi

# Required scripts for strict BMAD quality gates
REQUIRED=("lint" "typecheck" "test" "test:e2e" "test:edge" "test:coverage" "build")
for s in "${REQUIRED[@]}"; do
  node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts['$s'] ? 0 : 1)" \
    || { echo "❌ Missing npm script: $s"; exit 1; }
done

echo "▶ lint"
npm run lint

echo "▶ typecheck"
npm run typecheck

echo "▶ unit/integration tests"
npm test

echo "▶ e2e tests"
npm run test:e2e

echo "▶ edge-case tests"
npm run test:edge

echo "▶ coverage tests"
npm run test:coverage

node "$ROOT/scripts/check-coverage.mjs"

# Security scan (script override allowed)
bash "$ROOT/scripts/security-scan.sh"

echo "▶ build"
npm run build

echo "✅ QUALITY_GATES_OK"
