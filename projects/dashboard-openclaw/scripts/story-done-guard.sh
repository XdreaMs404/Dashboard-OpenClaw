#!/usr/bin/env bash
set -euo pipefail

SID="${1:-}"
if [ -z "$SID" ]; then
  echo "Usage: bash scripts/story-done-guard.sh S001"
  exit 1
fi

source "/root/.openclaw/workspace/bmad-total/scripts/project-env.sh"

ROOT="$CONTROL_ROOT"
PROJECT_ROOT="$(get_active_project_root)"
IMPL="$PROJECT_ROOT/_bmad-output/implementation-artifacts"
IDX="$IMPL/stories/STORIES_INDEX.md"
STORY="$IMPL/stories/${SID}.md"
REVIEW="$IMPL/reviews/${SID}-review.md"
SUMMARY="$IMPL/summaries/${SID}-summary.md"
UX_AUDIT="$IMPL/ux-audits/${SID}-ux-audit.json"
RETRO_ENSURE="$ROOT/scripts/ensure-epic-retro.sh"

[ -f "$IDX" ] || { echo "❌ Missing stories index: $IDX"; exit 1; }
[ -f "$STORY" ] || { echo "❌ Missing story file: $STORY"; exit 1; }
[ -f "$REVIEW" ] || { echo "❌ Missing review file: $REVIEW"; exit 1; }
[ -f "$SUMMARY" ] || { echo "❌ Missing summary file: $SUMMARY"; exit 1; }
[ -f "$UX_AUDIT" ] || { echo "❌ Missing UX audit file: $UX_AUDIT"; exit 1; }

grep -qi "Comment tester" "$SUMMARY" || { echo "❌ Summary must include 'Comment tester' section"; exit 1; }

bash "$ROOT/scripts/run-story-gates.sh" "$SID"

PREV_STATUS="$(awk -F'|' -v sid="$SID" '/\| S[0-9]{3} \|/ {s=$2; st=$5; gsub(/^ +| +$/, "", s); gsub(/^ +| +$/, "", st); if (s==sid){print st; exit}}' "$IDX")"
if [[ -z "$PREV_STATUS" ]]; then
  PREV_STATUS="IN_PROGRESS"
fi

bash "$ROOT/scripts/update-story-status.sh" "$SID" "DONE"
if [[ -x "$RETRO_ENSURE" ]]; then
  if ! BMAD_PROJECT_ROOT="$PROJECT_ROOT" bash "$RETRO_ENSURE" --sid "$SID"; then
    bash "$ROOT/scripts/update-story-status.sh" "$SID" "$PREV_STATUS" >/dev/null 2>&1 || true
    echo "❌ Epic retrospective requirement failed (status reverted: $PREV_STATUS)"
    exit 1
  fi
fi

# Auto-commit/push story completion (safe by default, strict with BMAD_GIT_STRICT=1)
if [[ "${BMAD_GIT_AUTOCOMMIT:-1}" == "1" ]]; then
  bash "$ROOT/scripts/git-auto-commit-story.sh" "$SID"
fi

echo "✅ STORY_DONE_GUARD_OK ($SID)"
