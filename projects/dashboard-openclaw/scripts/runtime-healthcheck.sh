#!/usr/bin/env bash
set -euo pipefail

source "/root/.openclaw/workspace/bmad-total/scripts/project-env.sh"

PROJECT_ROOT="$(get_active_project_root)"
REG="$PROJECT_ROOT/runtime/agent-registry.json"
E2E_DIR="$PROJECT_ROOT/runtime/e2e"
STATUS="$CONTROL_ROOT/PROJECT_STATUS.md"

[ -f "$REG" ] || { echo "❌ Missing registry: $REG"; exit 1; }
[ -f "$STATUS" ] || { echo "❌ Missing project status: $STATUS"; exit 1; }

node - "$REG" <<'NODE'
const fs = require('node:fs');
const reg = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));

const coreList = reg.persistentCoreAgents ?? reg.coreAgents ?? [];
const workerList = reg.runtimeWorkers ?? reg.workerAgents ?? [];

const core = Array.isArray(coreList) ? coreList.length : 0;
const workers = Array.isArray(workerList) ? workerList.length : 0;

if (core < 11) {
  console.error(`❌ core agents missing (${core}/11)`);
  process.exit(1);
}
if (workers < 12) {
  console.error(`❌ worker agents missing (${workers}/12)`);
  process.exit(1);
}

const notReady = Array.isArray(coreList)
  ? coreList.filter(a => a && a.status && a.status !== 'READY').map(a => a.agentId || a.role)
  : [];
if (notReady.length > 0) {
  console.error(`❌ core agents not READY: ${notReady.join(', ')}`);
  process.exit(1);
}

console.log(`✅ registry agents OK (core=${core}, workers=${workers})`);
NODE

for f in 01-pm-plan.md 02-dev-output.md 03-ux-audit.md 04-review.md 05-summary.md RUNTIME_E2E_RESULT.md; do
  [ -f "$E2E_DIR/$f" ] || { echo "❌ Missing runtime e2e artifact: $f"; exit 1; }
done

echo "✅ runtime e2e artifacts OK"
echo "--- ACTIVE PROJECT ---"
echo "$PROJECT_ROOT"

echo "--- PROJECT_STATUS ---"
awk '/^mode:|^project_name:|^active_project_root:|^lifecycle_state:|^phase1_status:|^phase2_status:|^phase3_status:|^phase4_status:|^awaiting_user_validation:|^last_user_command:|^current_epic:|^current_story:|^last_update:/' "$STATUS"

echo "✅ RUNTIME_HEALTHCHECK_OK"
