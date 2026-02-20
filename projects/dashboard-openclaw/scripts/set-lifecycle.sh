#!/usr/bin/env bash
set -euo pipefail

source "/root/.openclaw/workspace/bmad-total/scripts/project-env.sh"

STATE="${1:-}"
AWAITING="${2:-}"
LAST_CMD="${3:-}"
NOTE="${4:-}"
STATUS_FILE="$CONTROL_ROOT/PROJECT_STATUS.md"
ACTIVE_PROJECT_ROOT="$(get_active_project_root)"

if [[ -z "$STATE" ]]; then
  echo "Usage: bash scripts/set-lifecycle.sh <state> [awaiting_user_validation:true|false] [last_user_command] [note]"
  echo "States: ideation|phase1_analysis|phase1_done|phase2_planning|phase2_done|phase3_solutioning|awaiting_validation|phase4_implementation|paused"
  exit 1
fi

python3 - <<PY
from pathlib import Path
from datetime import datetime, timezone

status_path = Path("$STATUS_FILE")
state = "$STATE"
awaiting_arg = "$AWAITING".strip().lower()
last_cmd = "$LAST_CMD".strip()
note = "$NOTE".strip()

allowed_states = {
    "ideation",
    "phase1_analysis",
    "phase1_done",
    "phase2_planning",
    "phase2_done",
    "phase3_solutioning",
    "awaiting_validation",
    "phase4_implementation",
    "paused",
}
if state not in allowed_states:
    raise SystemExit(f"Invalid state: {state}")

if status_path.exists():
    text = status_path.read_text(encoding='utf-8')
else:
    text = "# PROJECT_STATUS\n\nmode: idle\nproject_name:\nactive_project_root:\ncurrent_epic:\ncurrent_story:\nlast_update:\n"

vals = {}
for line in text.splitlines():
    if ': ' in line and not line.startswith('#'):
        k,v = line.split(':',1)
        vals[k.strip()] = v.strip()

# defaults
vals.setdefault('mode', 'idle')
vals.setdefault('project_name', '')
vals.setdefault('active_project_root', '')
vals.setdefault('lifecycle_state', 'ideation')
vals.setdefault('phase1_status', 'pending')
vals.setdefault('phase2_status', 'pending')
vals.setdefault('phase3_status', 'pending')
vals.setdefault('phase4_status', 'blocked_until_validation')
vals.setdefault('awaiting_user_validation', 'false')
vals.setdefault('last_user_command', '')
vals.setdefault('last_note', '')
vals.setdefault('current_epic', '')
vals.setdefault('current_story', '')

# state transitions
if state == 'ideation':
    vals['lifecycle_state'] = state
    vals['phase1_status'] = 'pending'
    vals['phase2_status'] = 'pending'
    vals['phase3_status'] = 'pending'
    vals['phase4_status'] = 'blocked_until_validation'
elif state == 'phase1_analysis':
    vals['lifecycle_state'] = state
    vals['phase1_status'] = 'in_progress'
    vals['phase2_status'] = 'pending'
    vals['phase3_status'] = 'pending'
    vals['phase4_status'] = 'blocked_until_validation'
elif state == 'phase1_done':
    vals['lifecycle_state'] = state
    vals['phase1_status'] = 'done'
    vals['phase2_status'] = 'pending'
    vals['phase3_status'] = 'pending'
    vals['phase4_status'] = 'blocked_until_validation'
elif state == 'phase2_planning':
    vals['lifecycle_state'] = state
    vals['phase1_status'] = 'done'
    vals['phase2_status'] = 'in_progress'
    vals['phase3_status'] = 'pending'
    vals['phase4_status'] = 'blocked_until_validation'
elif state == 'phase2_done':
    vals['lifecycle_state'] = state
    vals['phase1_status'] = 'done'
    vals['phase2_status'] = 'done'
    vals['phase3_status'] = 'pending'
    vals['phase4_status'] = 'blocked_until_validation'
elif state == 'phase3_solutioning':
    vals['lifecycle_state'] = state
    vals['phase1_status'] = 'done'
    vals['phase2_status'] = 'done'
    vals['phase3_status'] = 'in_progress'
    vals['phase4_status'] = 'blocked_until_validation'
elif state == 'awaiting_validation':
    vals['lifecycle_state'] = state
    vals['phase1_status'] = 'done'
    vals['phase2_status'] = 'done'
    vals['phase3_status'] = 'done'
    vals['phase4_status'] = 'blocked_until_validation'
    vals['awaiting_user_validation'] = 'true'
elif state == 'phase4_implementation':
    vals['lifecycle_state'] = state
    vals['phase1_status'] = 'done'
    vals['phase2_status'] = 'done'
    vals['phase3_status'] = 'done'
    vals['phase4_status'] = 'in_progress'
    vals['awaiting_user_validation'] = 'false'
elif state == 'paused':
    vals['lifecycle_state'] = state

if awaiting_arg in {'true','false'}:
    vals['awaiting_user_validation'] = awaiting_arg
if last_cmd:
    vals['last_user_command'] = last_cmd
if note:
    vals['last_note'] = note

vals['active_project_root'] = "$ACTIVE_PROJECT_ROOT"
vals['last_update'] = datetime.now(timezone.utc).isoformat()

ordered_keys = [
    'mode',
    'project_name',
    'active_project_root',
    'lifecycle_state',
    'phase1_status',
    'phase2_status',
    'phase3_status',
    'phase4_status',
    'awaiting_user_validation',
    'last_user_command',
    'last_note',
    'current_epic',
    'current_story',
    'last_update',
]

out = ["# PROJECT_STATUS", ""]
for k in ordered_keys:
    out.append(f"{k}: {vals.get(k,'')}")
out += [
    "",
    "## Règles",
    "- mode: active => exécution autonome autorisée",
    "- mode: idle => aucune exécution autonome",
    "- Phase 1→3 (H01→H10) doit être faite avant toute implémentation",
    "- Fin phase 3 => retour en mode: idle + awaiting_user_validation: true",
    "- Phase 4 (H11→H23) démarre uniquement après validation explicite utilisateur (/continue)",
]

status_path.write_text("\n".join(out)+"\n", encoding='utf-8')
PY

echo "PROJECT_STATUS lifecycle updated: state=$STATE"