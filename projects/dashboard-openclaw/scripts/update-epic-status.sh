#!/usr/bin/env bash
set -euo pipefail

source "/root/.openclaw/workspace/bmad-total/scripts/project-env.sh"

EID="$1"
STATUS="$2"   # TODO|IN_PROGRESS|DONE
RETRO="$3"    # TODO|DONE
PROJECT_ROOT="$(get_active_project_root)"
IDX="$PROJECT_ROOT/_bmad-output/planning-artifacts/epics-index.md"
TMP=$(mktemp)
awk -F'|' -v eid="$EID" -v st="$STATUS" -v rt="$RETRO" 'BEGIN{OFS="|"}
{
  if ($0 ~ "\\| "eid" \\|") {
    $5=" "st" ";
    $6=" "rt" ";
  }
  print
}' "$IDX" > "$TMP"
mv "$TMP" "$IDX"
echo "✅ EPIC_STATUS_UPDATED $EID ($STATUS / $RETRO)"
