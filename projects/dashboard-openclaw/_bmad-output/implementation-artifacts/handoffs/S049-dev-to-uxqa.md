# S049 — Handoff DEV → UXQA

## Story
- ID: S049
- Canonical story: E05-S01
- Epic: E05
- Phase cible: H14 (UX QA Audit)
- Statut DEV: READY_FOR_UX_AUDIT
- checkpoint_token: READY_FOR_UX_AUDIT

## Scope implémenté (strict S049)
- `app/src/aqcd-scoreboard.js` (nouveau)
- `app/src/index.js` (export)
- `app/tests/unit/aqcd-scoreboard.test.js` (nouveau)
- `app/tests/edge/aqcd-scoreboard.edge.test.js` (nouveau)
- `app/tests/e2e/aqcd-scoreboard.spec.js` (nouveau)

## Résultat livré (FR-045 / FR-046)
- Tableau AQCD explicable livré:
  - score détaillé par dimensions A/Q/C/D avec formule de pondération explicite.
  - chaque terme de formule exige une source (`metricSources`) et échoue fail-closed si absente.
- Snapshot AQCD + tendance:
  - support `snapshots` / `historySnapshots`.
  - calcul trend (`previousGlobal`, `deltaGlobal`, direction).
- Contrôles NFR intégrés:
  - NFR-018: baseline readiness minimale (reason `AQCD_BASELINE_BELOW_TARGET`).
  - NFR-009: budget p95 latence (`AQCD_LATENCY_BUDGET_EXCEEDED`).
- États UI validés sur démo e2e: empty/loading/error/success.

## Vérifications DEV (preuves)
- `npm run lint && npm run typecheck` ✅
- `npx vitest run tests/unit/aqcd-scoreboard.test.js tests/edge/aqcd-scoreboard.edge.test.js` ✅
- `npx playwright test tests/e2e/aqcd-scoreboard.spec.js` ✅
- Evidence S049:
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S049/vitest-s049.log`
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S049/playwright-s049.log`

## Next handoff
UXQA → DEV/TEA (H15)
