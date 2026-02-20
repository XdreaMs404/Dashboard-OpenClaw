#!/usr/bin/env bash
set -euo pipefail
EID="$1"
RETRO="/root/.openclaw/workspace/bmad-total/_bmad-output/implementation-artifacts/retros/${EID}-retro.md"
if [ ! -f "$RETRO" ]; then
  echo "❌ Missing retrospective: $RETRO"
  exit 1
fi

ACTIONS=$(grep -E "^- \[ \]" "$RETRO" | wc -l | tr -d ' ')
if [ "$ACTIONS" -lt 3 ]; then
  echo "❌ Retro must contain at least 3 open action items (- [ ] ...). Found: $ACTIONS"
  exit 1
fi

grep -q "## Adaptations pour l'epic suivant" "$RETRO" || { echo "❌ Retro missing adaptations section"; exit 1; }

echo "✅ RETRO_VALID (${EID})"
