#!/usr/bin/env bash
set -euo pipefail

source "/root/.openclaw/workspace/bmad-total/scripts/project-env.sh"

ROOT="$CONTROL_ROOT"
PHASE="${1:-}"
NOTE="${2:-}"

if [[ -z "$PHASE" ]]; then
  echo "Usage: bash scripts/phase-complete.sh <1|2|3> [note]"
  exit 1
fi

case "$PHASE" in
  1)
    bash "$ROOT/scripts/set-lifecycle.sh" phase1_done false "auto:phase1_done" "${NOTE:-Phase 1 Analysis terminée}"
    echo "✅ Phase 1 (Analysis) terminée."
    ;;
  2)
    bash "$ROOT/scripts/set-lifecycle.sh" phase2_done false "auto:phase2_done" "${NOTE:-Phase 2 Planning terminée}"
    echo "✅ Phase 2 (Planning) terminée."
    ;;
  3)
    bash "$ROOT/scripts/set-mode.sh" idle
    bash "$ROOT/scripts/set-lifecycle.sh" awaiting_validation true "auto:phase3_done" "${NOTE:-Phase 3 Solutioning terminée - attente validation utilisateur}"
    echo "✅ Phase 3 (Solutioning) terminée. Passage en idle et attente validation utilisateur."
    ;;
  *)
    echo "Invalid phase: $PHASE (expected 1, 2 or 3)"
    exit 1
    ;;
esac
