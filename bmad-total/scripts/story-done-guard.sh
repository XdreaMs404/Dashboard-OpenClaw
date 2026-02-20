#!/usr/bin/env bash
set -euo pipefail

SID="${1:-}"
if [ -z "$SID" ]; then
  echo "Usage: bash scripts/story-done-guard.sh S001"
  exit 1
fi

ROOT="/root/.openclaw/workspace/bmad-total"
IMPL="$ROOT/_bmad-output/implementation-artifacts"
STORY="$IMPL/stories/${SID}.md"
REVIEW="$IMPL/reviews/${SID}-review.md"
SUMMARY="$IMPL/summaries/${SID}-summary.md"
UX_AUDIT="$IMPL/ux-audits/${SID}-ux-audit.json"

[ -f "$STORY" ] || { echo "❌ Missing story file: $STORY"; exit 1; }
[ -f "$REVIEW" ] || { echo "❌ Missing review file: $REVIEW"; exit 1; }
[ -f "$SUMMARY" ] || { echo "❌ Missing summary file: $SUMMARY"; exit 1; }
[ -f "$UX_AUDIT" ] || { echo "❌ Missing UX audit file: $UX_AUDIT"; exit 1; }

grep -qi "Comment tester" "$SUMMARY" || { echo "❌ Summary must include 'Comment tester' section"; exit 1; }

bash "$ROOT/scripts/run-story-gates.sh" "$SID"
bash "$ROOT/scripts/update-story-status.sh" "$SID" "DONE"

# Auto-commit/push story completion (safe by default, strict with BMAD_GIT_STRICT=1)
if [[ "${BMAD_GIT_AUTOCOMMIT:-1}" == "1" ]]; then
  bash "$ROOT/scripts/git-auto-commit-story.sh" "$SID"
fi

echo "✅ STORY_DONE_GUARD_OK ($SID)"
