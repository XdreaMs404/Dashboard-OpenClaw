# S060 — Handoff DEV → UXQA

## Story
- ID: S060
- Canonical story: E05-S12
- Epic: E05
- Phase cible: H14 (UX QA Audit)
- Statut DEV: READY_FOR_UX_AUDIT
- checkpoint_token: READY_FOR_UX_AUDIT

## Scope implémenté (strict S060)
- `app/src/aqcd-baseline-roi-instrumentation.js`
- `app/src/index.js`
- `app/tests/unit/aqcd-baseline-roi-instrumentation.test.js`
- `app/tests/edge/aqcd-baseline-roi-instrumentation.edge.test.js`
- `app/tests/e2e/aqcd-baseline-roi-instrumentation.spec.js`

## Résultat livré (FR-046 / FR-047)
- FR-046: baseline ROI exige un historique snapshots périodique minimum pour comparaison baseline→courant.
- FR-047: facteurs readiness exposés explicitement dans la sortie baseline ROI (rule + contribution + source).
- NFR-035: runbook critique baseline ROI requis (ref + validation + test date).
- NFR-009: contrôle p95 dédié baseline ROI (budget configurable, fail-closed au dépassement).

## Vérifications DEV (preuves)
- `npx vitest run tests/unit/aqcd-baseline-roi-instrumentation.test.js tests/edge/aqcd-baseline-roi-instrumentation.edge.test.js` ✅
- `npx playwright test tests/e2e/aqcd-baseline-roi-instrumentation.spec.js` ✅
- `BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw bash /root/.openclaw/workspace/bmad-total/scripts/run-fast-quality-gates.sh S060` ✅

## États UX à auditer
- `empty` (avant action)
- `loading` (calcul baseline ROI)
- `error` (input invalide / snapshots insuffisants / budget latence dépassé)
- `success` (projection baseline ROI + TCD + facteurs readiness lisibles)

## Next handoff
UXQA → DEV/TEA (H15)
