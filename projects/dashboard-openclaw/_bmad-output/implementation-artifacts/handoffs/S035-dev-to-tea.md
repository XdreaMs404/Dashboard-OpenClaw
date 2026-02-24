# S035 — Handoff DEV → TEA

## Story
- ID: S035
- Epic: E03
- Statut DEV: READY_FOR_TEA
- checkpoint_token: ready_for_tea

## Scope implémenté (strict S035)
- `app/src/g4-ux-evidence-bridge.js`
- `app/src/index.js` (export S035)
- `app/tests/unit/g4-ux-evidence-bridge.test.js`
- `app/tests/edge/g4-ux-evidence-bridge.edge.test.js`
- `app/tests/e2e/g4-ux-evidence-bridge.spec.js`

## Contrat livré
Sortie stable S035:
`{ allowed, reasonCode, reason, diagnostics, gateView, g4Correlation, correctiveActions }`

## AC couverts
- AC-01 FR-011: vue gate unique G1→G5 avec `status/owner/updatedAt`.
- AC-02 FR-012 (négatif): G4-T et G4-UX distincts + corrélés (`correlationId` requis, fail-closed sinon).
- AC-03 NFR-002: budget latence p95 < 2.5s (blocage `LATENCY_BUDGET_EXCEEDED`).
- AC-04 NFR-007: ingestion preuve UX <= 2s p95 (blocage `UX_EVIDENCE_INGESTION_TOO_SLOW`).

## Preuves DEV exécutées
- `npm run lint` ✅
- `npm run typecheck` ✅
- `npx vitest run tests/unit/g4-ux-evidence-bridge.test.js tests/edge/g4-ux-evidence-bridge.edge.test.js tests/unit/g4-dual-evaluation.test.js tests/edge/g4-dual-evaluation.edge.test.js` ✅
- `npx playwright test tests/e2e/g4-ux-evidence-bridge.spec.js tests/e2e/g4-dual-evaluation.spec.js --output=test-results/e2e-s035` ✅
- `BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw bash /root/.openclaw/workspace/bmad-total/scripts/run-fast-quality-gates.sh S035` ✅

## Points TEA à vérifier
1. Fail-closed sur corrélation G4-T/G4-UX manquante.
2. Contrôle strict du budget ingestion UX (<=2s p95).
3. Contrôle budget latence global (<=2.5s p95).
4. Non-régression de `g4-dual-evaluation` et exports `index.js`.

## Next handoff
TEA → Reviewer (H17)
