#!/usr/bin/env bash
set -euo pipefail

SID="${1:-}"
if [ -z "$SID" ]; then
  echo "Usage: bash scripts/run-ux-gates.sh S001"
  exit 1
fi

source "/root/.openclaw/workspace/bmad-total/scripts/project-env.sh"

PROJECT_ROOT="$(get_active_project_root)"
CFG="$PROJECT_ROOT/config/hyper-orchestration.config.json"
IMPL="$PROJECT_ROOT/_bmad-output/implementation-artifacts"
STORY="$IMPL/stories/${SID}.md"
AUDIT_JSON="$IMPL/ux-audits/${SID}-ux-audit.json"

[ -f "$CFG" ] || { echo "❌ Missing config: $CFG"; exit 1; }
[ -f "$STORY" ] || { echo "❌ Missing story: $STORY"; exit 1; }
[ -f "$AUDIT_JSON" ] || { echo "❌ Missing UX audit file: $AUDIT_JSON"; exit 1; }

node - "$CFG" "$AUDIT_JSON" "$SID" <<'NODE'
const fs = require('node:fs');

const [cfgPath, auditPath, sid] = process.argv.slice(2);

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));

if (audit.storyId !== sid) fail(`UX audit storyId mismatch. Expected ${sid}, got ${audit.storyId}`);

const verdict = String(audit.verdict || '').toUpperCase();
if (!['PASS', 'CONCERNS', 'FAIL'].includes(verdict)) {
  fail(`Invalid UX verdict: ${audit.verdict}`);
}

const requiredChecks = cfg.uxGate.requiredChecks || [];
for (const key of requiredChecks) {
  if (!audit.checks || audit.checks[key] !== true) {
    fail(`Missing/failed required UX check: ${key}`);
  }
}

const requiredStates = cfg.uxGate.requiredStates || [];
for (const key of requiredStates) {
  if (!audit.stateCoverage || audit.stateCoverage[key] !== true) {
    fail(`Missing required UX state coverage: ${key}`);
  }
}

const evidenceMin = Number(cfg.uxGate.requiredEvidenceMin || 0);
const evidence = Array.isArray(audit.evidence) ? audit.evidence.filter(Boolean) : [];
if (evidence.length < evidenceMin) {
  fail(`Insufficient UX evidence: ${evidence.length}/${evidenceMin}`);
}

const designExcellence = Number(audit.scores?.designExcellence ?? -1);
if (!Number.isFinite(designExcellence)) fail('Invalid designExcellence score');

const d2 = Number(audit.scores?.D2 ?? -1);
if (!Number.isFinite(d2)) fail('Invalid D2 score');

const minDesign = Number(cfg.thresholds.designExcellenceMin || 0);
const minD2 = Number(cfg.thresholds.accessibilityD2Min || 0);

if (designExcellence < minDesign) {
  fail(`Design score too low: ${designExcellence} < ${minDesign}`);
}
if (d2 < minD2) {
  fail(`Accessibility D2 too low: ${d2} < ${minD2}`);
}
if (verdict !== 'PASS') {
  fail(`UX verdict must be PASS for DONE. Current verdict: ${verdict}`);
}

console.log(`✅ UX_GATES_OK (${sid}) design=${designExcellence} D2=${d2}`);
NODE
