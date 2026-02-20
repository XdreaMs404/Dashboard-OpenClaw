#!/usr/bin/env bash
set -euo pipefail
SID="$1"
NEW_STATUS="$2"
IDX="/root/.openclaw/workspace/bmad-total/_bmad-output/implementation-artifacts/stories/STORIES_INDEX.md"
TMP=$(mktemp)
awk -F'|' -v sid="$SID" -v st="$NEW_STATUS" 'BEGIN{OFS="|"}
{
  if ($0 ~ "\\| "sid" \\|") { $4=" "st" " }
  print
}' "$IDX" > "$TMP"
mv "$TMP" "$IDX"
