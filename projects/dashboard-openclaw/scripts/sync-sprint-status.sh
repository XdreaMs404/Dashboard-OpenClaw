#!/usr/bin/env bash
set -euo pipefail

source "/root/.openclaw/workspace/bmad-total/scripts/project-env.sh"

PROJECT_ROOT="$(get_active_project_root)"
IMPL="$PROJECT_ROOT/_bmad-output/implementation-artifacts"
IDX="$IMPL/stories/STORIES_INDEX.md"
OUT="$IMPL/sprint-status.yaml"

mkdir -p "$IMPL"

python3 - "$IDX" "$OUT" "$PROJECT_ROOT" <<'PY'
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

idx = Path(sys.argv[1])
out = Path(sys.argv[2])
project_root = Path(sys.argv[3])

story_rows = []
if idx.exists():
    for line in idx.read_text(encoding='utf-8').splitlines():
        m = re.match(r'^\|\s*(S\d{3})\s*\|\s*(E\d{2})\s*\|\s*(.*?)\s*\|\s*(.*?)\s*\|\s*$', line)
        if m:
            sid, eid, title, status = m.groups()
            story_rows.append((sid, eid, title, status))

def slugify(text: str) -> str:
    txt = (text or '').strip().lower()
    txt = unicodedata.normalize('NFKD', txt)
    txt = ''.join(ch for ch in txt if not unicodedata.combining(ch))
    txt = re.sub(r'[^a-z0-9]+', '-', txt)
    txt = re.sub(r'-+', '-', txt).strip('-')
    return txt

def normalize_story_status(raw: str) -> str:
    s = (raw or '').strip().lower().replace('_', '-').replace(' ', '-')
    if s in {'done', 'closed', 'complete', 'completed'}:
        return 'done'
    if s in {
        'in-progress', 'inprogress', 'wip', 'review',
        'ready-for-review', 'ready-for-dev', 'ready-for-qa',
        'qa', 'testing', 'blocked'
    }:
        return 'in-progress'
    return 'backlog'

by_epic = {}
for sid, eid, title, status in story_rows:
    by_epic.setdefault(eid, []).append((sid, title, normalize_story_status(status)))

for eid in by_epic:
    by_epic[eid].sort(key=lambda x: int(x[0][1:]))

def epic_state(stories):
    if not stories:
        return 'backlog'
    states = [st for _, _, st in stories]
    if all(st == 'done' for st in states):
        return 'done'
    if any(st in {'done', 'in-progress'} for st in states):
        return 'in-progress'
    return 'backlog'

lines = []
lines.append('generated: auto')
lines.append('project: Dashboard OpenClaw')
lines.append('tracking_system: file-system')
lines.append(f'story_location: "{project_root}/_bmad-output/implementation-artifacts"')
lines.append(f'updated_at_utc: "{datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}"')
lines.append('')
lines.append('development_status:')

for eid in sorted(by_epic.keys(), key=lambda e: int(e[1:])):
    epic_num = int(eid[1:])
    stories = by_epic[eid]
    lines.append(f'  epic-{epic_num}: {epic_state(stories)}')
    for sid, title, st in stories:
        sid_num = int(sid[1:])
        slug = slugify(title) or f'story-{sid_num}'
        lines.append(f'  {epic_num}-{sid_num:02d}-{slug}: {st}')
    lines.append(f'  epic-{epic_num}-retrospective: optional')
    lines.append('')

if not by_epic:
    lines.append('  {}')

out.write_text('\n'.join(lines).rstrip() + '\n', encoding='utf-8')
PY

echo "✅ SPRINT_STATUS_SYNCED $OUT"
