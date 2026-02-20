#!/usr/bin/env bash
set -euo pipefail

ROOT="/root/.openclaw/workspace/bmad-total"
PLAN="$ROOT/_bmad-output/planning-artifacts"
IMPL="$ROOT/_bmad-output/implementation-artifacts"

mkdir -p "$IMPL/reviews" "$IMPL/summaries" "$IMPL/retros" "$IMPL/ux-audits" "$IMPL/handoffs" "$IMPL/scorecards"

find "$IMPL/reviews" -type f -name '*.md' -delete || true
find "$IMPL/summaries" -type f -name '*.md' -delete || true
find "$IMPL/retros" -type f -name '*.md' -delete || true
find "$IMPL/ux-audits" -type f -name 'S*-ux-audit.json' -delete || true
find "$IMPL/handoffs" -type f -name 'H-*.md' -delete || true
rm -f "$IMPL/scorecards/aqcd-latest.json" "$IMPL/scorecards/aqcd-latest.md"

if [ -f "$ROOT/templates/AQCD_METRICS_TEMPLATE.json" ]; then
  cp "$ROOT/templates/AQCD_METRICS_TEMPLATE.json" "$IMPL/scorecards/aqcd-metrics.json"
fi

cat > "$IMPL/handoffs/HANDOFFS_LOG.md" <<'EOF'
# HANDOFFS_LOG

| Handoff | From | To | Story | Epic | Objective | Status |
|---|---|---|---|---|---|---|
EOF

python3 - <<'PY'
from pathlib import Path

root=Path('/root/.openclaw/workspace/bmad-total')
plan=root/'_bmad-output/planning-artifacts'
impl=root/'_bmad-output/implementation-artifacts'

# reset stories index status to TODO
idx=impl/'stories/STORIES_INDEX.md'
lines=[]
stories=[]
for line in idx.read_text(encoding='utf-8').splitlines():
    if line.startswith('| S'):
        parts=[p.strip() for p in line.strip('|').split('|')]
        sid,eid,title,_=parts
        parts[3]='TODO'
        stories.append((sid,eid,title))
        line='| '+' | '.join(parts)+' |'
    lines.append(line)
idx.write_text('\n'.join(lines)+'\n',encoding='utf-8')

# reset epics index status+retro
eidx=plan/'epics-index.md'
if eidx.exists():
    elines=[]
    for line in eidx.read_text(encoding='utf-8').splitlines():
        if line.startswith('| E'):
            parts=[p.strip() for p in line.strip('|').split('|')]
            if len(parts) >= 5:
                parts[3]='TODO'; parts[4]='TODO'
            line='| '+' | '.join(parts)+' |'
        elines.append(line)
    eidx.write_text('\n'.join(elines)+'\n',encoding='utf-8')

# reset each story status section to TODO
for p in (impl/'stories').glob('S*.md'):
    t=p.read_text(encoding='utf-8')
    if '## Status' in t:
        head, _, rest = t.partition('## Status')
        t=head+'## Status\nTODO\n'
    else:
        t=t+'\n## Status\nTODO\n'
    p.write_text(t,encoding='utf-8')

# regenerate sprint-status with all stories in backlog
epics={}
for sid,eid,title in stories:
    epics.setdefault(eid,[]).append((sid,title))

out=[]
out.append('generated: auto')
out.append('project: BMAD Total Dev-Only')
out.append('tracking_system: file-system')
out.append(f'story_location: "{impl}"')
out.append('')
out.append('development_status:')
for eid in sorted(epics.keys()):
    epic_num=int(eid[1:])
    out.append(f'  epic-{epic_num}: backlog')
    for sid,title in epics[eid]:
      skey=f"{epic_num}-{int(sid[1:]):02d}-{title.lower().replace(' ','-')}"
      out.append(f'  {skey}: backlog')
    out.append(f'  epic-{epic_num}-retrospective: optional')
    out.append('')
(impl/'sprint-status.yaml').write_text('\n'.join(out),encoding='utf-8')
PY

bash "$ROOT/scripts/enforce-story-template.sh"

echo "Project reset complete."
