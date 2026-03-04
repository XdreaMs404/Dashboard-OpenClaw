# S060 — Handoff DEV → TEA

## Story
- ID: S060
- Canonical story: E05-S12
- Epic: E05
- Statut DEV: READY_FOR_TEA
- checkpoint_token: READY_FOR_TEA

## Scope implémenté (strict S060)
- `app/src/aqcd-baseline-roi-instrumentation.js`
- `app/src/index.js`
- `app/tests/unit/aqcd-baseline-roi-instrumentation.test.js`
- `app/tests/edge/aqcd-baseline-roi-instrumentation.edge.test.js`
- `app/tests/e2e/aqcd-baseline-roi-instrumentation.spec.js`

## Contrat livré
Sortie stable:
`{ allowed, reasonCode, reason, diagnostics, scorecard, formula, snapshots, readiness, gateActions, riskRegister, mitigationLinks, mitigationClosureLinks, heatmap, heatmapDashboard, validatedDecisionCost, criticalRunbook, phaseWasteRatios, wasteAlerts, wasteAlerting, retroClosureTracking, sponsorExecutiveView, baselineRoiInstrumentation, correctiveActions }`

Couverture S060:
- FR-046: snapshots baseline/courant obligatoires pour analyse de tendance.
- FR-047: facteurs readiness rules-based visibles dans baseline ROI.
- NFR-035: runbook critique baseline ROI obligatoire et testé.
- NFR-009: garde p95 dédiée sur instrumentation baseline ROI.

## Preuves DEV
- unit + edge S060 ✅
- e2e S060 ✅
- fast gates S060 ✅ (`run-fast-quality-gates.sh`)

## Risques / points de surveillance TEA
- Vérifier la garde fail-closed sur historique snapshots insuffisant.
- Vérifier la présence/traçabilité des readiness factors (rule+contribution+source).
- Vérifier la cohérence ROI ajusté risque (P05 + pending rétro) et budget p95.

## Next handoff
TEA → Reviewer (H17)
