#!/usr/bin/env bash
set -euo pipefail

FROM="${1:-}"
TO="${2:-}"
OBJECTIVE="${3:-}"
STORY="${4:-}"
EPIC="${5:-}"

if [ -z "$FROM" ] || [ -z "$TO" ] || [ -z "$OBJECTIVE" ]; then
  echo "Usage: bash scripts/new-handoff.sh <from> <to> <objective> [story] [epic]"
  exit 1
fi

ROOT="/root/.openclaw/workspace/bmad-total"
OUT_DIR="$ROOT/_bmad-output/implementation-artifacts/handoffs"
LOG_FILE="$OUT_DIR/HANDOFFS_LOG.md"

mkdir -p "$OUT_DIR"

TS="$(date -u +%Y%m%d-%H%M%S)"
HID="H-${TS}"
OUT_FILE="$OUT_DIR/${HID}.md"

cat > "$OUT_FILE" <<EOF
# HANDOFF CONTRACT

## Metadata
- handoff_id: $HID
- from_agent: $FROM
- to_agent: $TO
- related_story: ${STORY:-N/A}
- related_epic: ${EPIC:-N/A}
- priority: normal
- created_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)

## Objective
- objective: $OBJECTIVE
- business_reason:

## Constraints
- scope_in:
- scope_out:
- technical_constraints:
- design_requirements:
- security_requirements:
- time_budget_minutes:

## Inputs (artifacts + versions)
- artifact_path:
- artifact_version:

## Required Output Schema
- output_type:
- required_sections:
- required_files:

## Local Definition of Done
- [ ] Deliverable complete
- [ ] Constraints respected
- [ ] Evidence attached

## Escalation Rule
- escalate_when:
- escalation_target:

## Final Handoff Result
- status: PASS | CONCERNS | FAIL
- summary:
- blockers:
- next_action:
EOF

if [ ! -f "$LOG_FILE" ]; then
  cat > "$LOG_FILE" <<'EOF'
# HANDOFFS_LOG

| Handoff | From | To | Story | Epic | Objective | Status |
|---|---|---|---|---|---|---|
EOF
fi

echo "| $HID | $FROM | $TO | ${STORY:-N/A} | ${EPIC:-N/A} | $OBJECTIVE | OPEN |" >> "$LOG_FILE"

echo "✅ HANDOFF_CREATED: $OUT_FILE"
