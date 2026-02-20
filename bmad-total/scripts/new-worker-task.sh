#!/usr/bin/env bash
set -euo pipefail

WORKER="${1:-}"
OBJECTIVE="${2:-}"
SID="${3:-}"
EID="${4:-}"

if [ -z "$WORKER" ] || [ -z "$OBJECTIVE" ]; then
  echo "Usage: bash scripts/new-worker-task.sh <worker-name> <objective> [story] [epic]"
  exit 1
fi

ROOT="/root/.openclaw/workspace/bmad-total"
OUT_DIR="$ROOT/_bmad-output/implementation-artifacts/handoffs"
mkdir -p "$OUT_DIR"

TS="$(date -u +%Y%m%d-%H%M%S)"
OUT_FILE="$OUT_DIR/WORKER-${TS}-${WORKER}.md"

cat > "$OUT_FILE" <<EOF
# SUBAGENT TASK

## Metadata
- worker_name: $WORKER
- owner_agent: Jarvis
- story_id: ${SID:-N/A}
- epic_id: ${EID:-N/A}
- timeout_minutes: 30

## Objective
- objective: $OBJECTIVE

## Inputs
- artifact_paths:
- constraints:

## Required Output
- output_format: markdown
- output_path:
- acceptance_checks:

## Notes
- reply style: concise and factual
- include evidence paths
- if blocked: return explicit blocker + required decision
EOF

echo "✅ WORKER_TASK_CREATED: $OUT_FILE"
