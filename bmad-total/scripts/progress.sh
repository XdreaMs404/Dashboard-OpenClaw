#!/usr/bin/env bash
set -euo pipefail

ROOT="/root/.openclaw/workspace/bmad-total"
IDX="$ROOT/_bmad-output/implementation-artifacts/stories/STORIES_INDEX.md"
UX_DIR="$ROOT/_bmad-output/implementation-artifacts/ux-audits"
AQCD_JSON="$ROOT/_bmad-output/implementation-artifacts/scorecards/aqcd-latest.json"

DONE=$(awk -F'|' '/\| S[0-9]{3} \|/ {s=$4; gsub(/^ +| +$/, "", s); if(s=="DONE") c++} END{print c+0}' "$IDX")
TOTAL=$(awk -F'|' '/\| S[0-9]{3} \|/ {c++} END{print c+0}' "$IDX")
NEXT=$(bash "$ROOT/scripts/next-story.sh" || true)
PCT=0
if [ "$TOTAL" -gt 0 ]; then PCT=$((DONE*100/TOTAL)); fi

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
