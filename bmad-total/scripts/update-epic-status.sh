#!/usr/bin/env bash
set -euo pipefail
EID="$1"
STATUS="$2"   # TODO|IN_PROGRESS|DONE
RETRO="$3"    # TODO|DONE
IDX="/root/.openclaw/workspace/bmad-total/_bmad-output/planning-artifacts/epics-index.md"
TMP=$(mktemp)
awk -F'|' -v eid="$EID" -v st="$STATUS" -v rt="$RETRO" 'BEGIN{OFS="|"}
{
  if ($0 ~ "\\| "eid" \\|") {
    $4=" "st" ";
    $5=" "rt" ";
  }
  print
}' "$IDX" > "$TMP"
mv "$TMP" "$IDX"
echo "✅ EPIC_STATUS_UPDATED $EID ($STATUS / $RETRO)"
