#!/usr/bin/env bash
set -euo pipefail

source "/root/.openclaw/workspace/bmad-total/scripts/project-env.sh"

SID="$1"
NEW_STATUS="$2"
PROJECT_ROOT="$(get_active_project_root)"
IDX="$PROJECT_ROOT/_bmad-output/implementation-artifacts/stories/STORIES_INDEX.md"
TMP=$(mktemp)
awk -F'|' -v sid="$SID" -v st="$NEW_STATUS" 'BEGIN{OFS="|"}
{
  if ($0 ~ "\\| "sid" \\|") { $5=" "st" " }
  print
}' "$IDX" > "$TMP"
mv "$TMP" "$IDX"
