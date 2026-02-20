#!/usr/bin/env bash
set -euo pipefail

source "/root/.openclaw/workspace/bmad-total/scripts/project-env.sh"

EID="$1"
PROJECT_ROOT="$(get_active_project_root)"
IDX="$PROJECT_ROOT/_bmad-output/implementation-artifacts/stories/STORIES_INDEX.md"
# retourne 0 si toutes les stories de l'epic sont DONE
COUNT_NOT_DONE=$(awk -F'|' -v eid="$EID" '/\| S[0-9]{3} \|/ {e=$3; s=$5; gsub(/^ +| +$/, "", e); gsub(/^ +| +$/, "", s); if(e==eid && s!="DONE") c++} END{print c+0}' "$IDX")
if [ "$COUNT_NOT_DONE" -eq 0 ]; then
  exit 0
else
  exit 1
fi
