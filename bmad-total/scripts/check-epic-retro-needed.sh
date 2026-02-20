#!/usr/bin/env bash
set -euo pipefail
EID="$1"
IDX="/root/.openclaw/workspace/bmad-total/_bmad-output/implementation-artifacts/stories/STORIES_INDEX.md"
# retourne 0 si toutes les stories de l'epic sont DONE
COUNT_NOT_DONE=$(awk -F'|' -v eid="$EID" '/\| S[0-9]{3} \|/ {e=$3; s=$4; gsub(/^ +| +$/, "", e); gsub(/^ +| +$/, "", s); if(e==eid && s!="DONE") c++} END{print c+0}' "$IDX")
if [ "$COUNT_NOT_DONE" -eq 0 ]; then
  exit 0
else
  exit 1
fi
