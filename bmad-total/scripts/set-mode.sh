#!/usr/bin/env bash
set -euo pipefail
MODE="${1:-}"
PROJECT_NAME="${2:-}"
STATUS_FILE="/root/.openclaw/workspace/bmad-total/PROJECT_STATUS.md"
if [[ "$MODE" != "active" && "$MODE" != "idle" ]]; then
  echo "Usage: bash scripts/set-mode.sh <active|idle> [project_name]"
  exit 1
fi
python3 - <<PY
from pathlib import Path
from datetime import datetime, timezone
p=Path("$STATUS_FILE")
text=p.read_text(encoding='utf-8') if p.exists() else "# PROJECT_STATUS\n\nmode: idle\nproject_name:\ncurrent_epic:\ncurrent_story:\nlast_update:\n"
lines=[]
seen=set()
for line in text.splitlines():
    if line.startswith('mode:'):
        lines.append('mode: $MODE'); seen.add('mode')
    elif line.startswith('project_name:'):
        val = "$PROJECT_NAME" if "$PROJECT_NAME" else line.split(':',1)[1].strip()
        lines.append(f'project_name: {val}'); seen.add('project_name')
    elif line.startswith('last_update:'):
        lines.append('last_update: '+datetime.now(timezone.utc).isoformat()); seen.add('last_update')
    else:
        lines.append(line)
if 'mode' not in seen: lines.append('mode: $MODE')
if 'project_name' not in seen: lines.append(f'project_name: {"$PROJECT_NAME"}')
if 'last_update' not in seen: lines.append('last_update: '+datetime.now(timezone.utc).isoformat())
p.write_text('\n'.join(lines)+'\n',encoding='utf-8')
PY
echo "PROJECT_STATUS updated: mode=$MODE"
