#!/usr/bin/env bash
set -euo pipefail

source "/root/.openclaw/workspace/bmad-total/scripts/project-env.sh"

CONTROL="$CONTROL_ROOT"
PROJECT_ROOT="$(get_active_project_root)"
STATUS="$CONTROL/PROJECT_STATUS.md"
IDX="$PROJECT_ROOT/_bmad-output/implementation-artifacts/stories/STORIES_INDEX.md"
UX_DIR="$PROJECT_ROOT/_bmad-output/implementation-artifacts/ux-audits"
AQCD_JSON="$PROJECT_ROOT/_bmad-output/implementation-artifacts/scorecards/aqcd-latest.json"

DONE=0
TOTAL=0
if [[ -f "$IDX" ]]; then
  DONE=$(awk -F'|' '/\| S[0-9]{3} \|/ {s=$5; gsub(/^ +| +$/, "", s); if(s=="DONE") c++} END{print c+0}' "$IDX")
  TOTAL=$(awk -F'|' '/\| S[0-9]{3} \|/ {c++} END{print c+0}' "$IDX")
fi
NEXT=$(bash "$CONTROL/scripts/next-story.sh" || true)
PCT=0
if [ "$TOTAL" -gt 0 ]; then PCT=$((DONE*100/TOTAL)); fi

LIFECYCLE="$(awk -F': ' '/^lifecycle_state:/ {print $2}' "$STATUS" | tr -d '\r' || true)"
P1="$(awk -F': ' '/^phase1_status:/ {print $2}' "$STATUS" | tr -d '\r' || true)"
P2="$(awk -F': ' '/^phase2_status:/ {print $2}' "$STATUS" | tr -d '\r' || true)"
P3="$(awk -F': ' '/^phase3_status:/ {print $2}' "$STATUS" | tr -d '\r' || true)"
P4="$(awk -F': ' '/^phase4_status:/ {print $2}' "$STATUS" | tr -d '\r' || true)"
AWAIT="$(awk -F': ' '/^awaiting_user_validation:/ {print $2}' "$STATUS" | tr -d '\r' || true)"

UX_PASS=0
if [ -d "$UX_DIR" ]; then
  UX_PASS=$(python3 - "$UX_DIR" <<'PY'
import json
import sys
from pathlib import Path

ux=Path(sys.argv[1])
c=0
for p in ux.glob('S*-ux-audit.json'):
    try:
        d=json.loads(p.read_text(encoding='utf-8'))
        if str(d.get('verdict','')).upper()=='PASS':
            c+=1
    except Exception:
        pass
print(c)
PY
)
fi

echo "Active project root: $PROJECT_ROOT"
echo "Lifecycle: ${LIFECYCLE:-unknown} | awaiting_user_validation=${AWAIT:-unknown}"
echo "Phases: P1=${P1:-unknown} P2=${P2:-unknown} P3=${P3:-unknown} P4=${P4:-unknown}"
echo "Progress stories: $DONE/$TOTAL (${PCT}%)"
echo "UX audits PASS: ${UX_PASS}/${TOTAL}"
echo "Next story: ${NEXT:-NONE}"

if [ -f "$AQCD_JSON" ]; then
  node - "$AQCD_JSON" <<'NODE'
const fs = require('node:fs');
const path = process.argv[2];
const d = JSON.parse(fs.readFileSync(path,'utf8'));
console.log(`AQCD: global=${d.scores.global} band=${d.band} design=${d.scores.designExcellence}`);
NODE
fi
