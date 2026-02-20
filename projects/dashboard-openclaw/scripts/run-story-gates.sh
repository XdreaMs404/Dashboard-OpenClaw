#!/usr/bin/env bash
set -euo pipefail

SID="${1:-}"
if [ -z "$SID" ]; then
  echo "Usage: bash scripts/run-story-gates.sh S001"
  exit 1
fi

source "/root/.openclaw/workspace/bmad-total/scripts/project-env.sh"

ROOT="$CONTROL_ROOT"

echo "▶ technical quality gates"
bash "$ROOT/scripts/run-quality-gates.sh"

echo "▶ ux gates"
bash "$ROOT/scripts/run-ux-gates.sh" "$SID"

echo "✅ STORY_GATES_OK ($SID)"
