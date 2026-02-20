#!/usr/bin/env bash
set -euo pipefail

source "/root/.openclaw/workspace/bmad-total/scripts/project-env.sh"

PROJECT_ROOT="$(get_active_project_root)"
IDX="$PROJECT_ROOT/_bmad-output/implementation-artifacts/stories/STORIES_INDEX.md"

[[ -f "$IDX" ]] || exit 0

awk -F'|' 'BEGIN{OFS="|"}
/\| S[0-9]{3} \|/ {
  sid=$2; st=$5;
  gsub(/^ +| +$/, "", sid);
  gsub(/^ +| +$/, "", st);
  if (st != "DONE") { print sid; exit }
}' "$IDX"
