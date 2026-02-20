#!/usr/bin/env bash
set -euo pipefail

SID="${1:-}"
EID="${2:-}"
if [ -z "$SID" ]; then
  echo "Usage: bash scripts/new-ux-audit.sh S001 [E01]"
  exit 1
fi

source "/root/.openclaw/workspace/bmad-total/scripts/project-env.sh"

ROOT="$(get_active_project_root)"
TEMPLATE="$ROOT/templates/UX_AUDIT_TEMPLATE.json"
OUT_DIR="$ROOT/_bmad-output/implementation-artifacts/ux-audits"
OUT_FILE="$OUT_DIR/${SID}-ux-audit.json"

mkdir -p "$OUT_DIR"

python3 - "$TEMPLATE" "$OUT_FILE" "$SID" "$EID" <<'PY'
import json
import sys
from datetime import datetime, timezone

tpl, out, sid, eid = sys.argv[1:]
with open(tpl, 'r', encoding='utf-8') as f:
    data = json.load(f)

data['storyId'] = sid
if eid:
    data['epicId'] = eid

data['updatedAt'] = datetime.now(timezone.utc).isoformat()

with open(out, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write('\n')
PY

echo "✅ UX_AUDIT_TEMPLATE_CREATED: $OUT_FILE"
