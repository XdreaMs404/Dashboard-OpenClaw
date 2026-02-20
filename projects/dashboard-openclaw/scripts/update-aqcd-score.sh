#!/usr/bin/env bash
set -euo pipefail

source "/root/.openclaw/workspace/bmad-total/scripts/project-env.sh"

ROOT="$CONTROL_ROOT"
PROJECT_ROOT="$(get_active_project_root)"
SCORE_DIR="$PROJECT_ROOT/_bmad-output/implementation-artifacts/scorecards"
METRICS_FILE="${1:-$SCORE_DIR/aqcd-metrics.json}"
OUT_JSON="$SCORE_DIR/aqcd-latest.json"
OUT_MD="$SCORE_DIR/aqcd-latest.md"

[ -f "$METRICS_FILE" ] || { echo "❌ Missing metrics file: $METRICS_FILE"; exit 1; }
mkdir -p "$SCORE_DIR"

BMAD_PROJECT_ROOT="$PROJECT_ROOT" node "$ROOT/scripts/calculate-aqcd.mjs" "$METRICS_FILE" > "$OUT_JSON"

node - "$OUT_JSON" "$OUT_MD" <<'NODE'
const fs = require('node:fs');
const [jsonPath, mdPath] = process.argv.slice(2);
const d = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const md = `# AQCD Scorecard (latest)\n\n` +
`- Window: ${d.window} (${d.windowRef})\n` +
`- Updated: ${d.updatedAt}\n` +
`- Band: **${d.band}**\n\n` +
`## Scores\n` +
`- Autonomy: ${d.scores.autonomy}\n` +
`- QualityTech: ${d.scores.qualityTech}\n` +
`- CostEfficiency: ${d.scores.costEfficiency}\n` +
`- DesignExcellence: ${d.scores.designExcellence}\n` +
`- Global: **${d.scores.global}**\n\n` +
`## Kill Switch\n` +
`- qualityTechLow: ${d.killSwitch.qualityTechLow}\n` +
`- designLow: ${d.killSwitch.designLow}\n` +
`- costWasteHigh: ${d.killSwitch.costWasteHigh}\n`;

fs.writeFileSync(mdPath, md);
NODE

echo "✅ AQCD_SCORE_UPDATED"
echo "- JSON: $OUT_JSON"
echo "- MD:   $OUT_MD"
