#!/usr/bin/env bash
set -euo pipefail
IDX="/root/.openclaw/workspace/bmad-total/_bmad-output/implementation-artifacts/stories/STORIES_INDEX.md"
awk -F'|' 'BEGIN{OFS="|"}
/\| S[0-9]{3} \|/ {
  sid=$2; st=$4;
  gsub(/^ +| +$/, "", sid);
  gsub(/^ +| +$/, "", st);
  if (st != "DONE") { print sid; exit }
}' "$IDX"
