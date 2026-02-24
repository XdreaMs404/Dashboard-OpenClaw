# S031 — Handoff DEV → UXQA

## Story
- ID: S031
- Epic: E03
- Phase cible: H14 (UX QA Audit)
- Statut DEV: READY_FOR_UX_AUDIT

## Scope implémenté (strict S031)
- `app/src/gate-policy-versioning.js`
- `app/src/gate-pre-submit-simulation.js`
- `app/src/index.js` (exports S031)
- `app/tests/unit/gate-policy-versioning.test.js`
- `app/tests/edge/gate-policy-versioning.edge.test.js`
- `app/tests/e2e/gate-policy-versioning.spec.js`
- `_bmad-output/implementation-artifacts/handoffs/S031-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S031-dev-to-tea.md`

## Evidence UX/UI disponible
- Démonstrateur e2e S031 couvrant les états UI: `empty`, `loading`, `error`, `success`.
- Champs affichés et vérifiés:
  - `reasonCode`, `reason`
  - diagnostics (`policyVersion`, `historyEntryCount`, `simulationEligible`, `simulatedVerdict`, `p95SimulationMs`, `sourceReasonCode`)
  - `policyVersioning` + `historyEntry`
  - `simulation` (eligible, simulatedVerdict, nonMutative, factors, evaluatedAt)
  - `correctiveActions`
- Cas UX couverts:
  - `INVALID_GATE_POLICY_INPUT`
  - `GATE_POLICY_VERSION_MISSING`
  - `POLICY_VERSION_NOT_ACTIVE`
  - `INVALID_GATE_SIMULATION_INPUT`
  - `OK` nominal (version active + simulation non mutative)
- Responsive mobile/tablette/desktop: test e2e sans overflow horizontal.

## Points d’attention UX
- Vérifier lisibilité des microcopies de remédiation (`SYNC_ACTIVE_POLICY_VERSION`, `LINK_GATE_POLICY_VERSION`, `FIX_GATE_SIMULATION_INPUT`).
- Vérifier accessibilité (`role=status`, `role=alert`, `aria-live`, focus retour bouton).
- Vérifier clarté opérateur sur l’historique immuable (`changedAt`, `changedBy`, `changeType`).

## Recheck rapide DEV (preuves)
- `npm run lint` ✅
- `npm run typecheck` ✅
- `npx vitest run tests/unit/gate-policy-versioning.test.js tests/edge/gate-policy-versioning.edge.test.js` ✅
- `npx playwright test tests/e2e/gate-policy-versioning.spec.js --output=test-results/e2e-s031` ✅
- `BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw bash /root/.openclaw/workspace/bmad-total/scripts/run-fast-quality-gates.sh S031` ✅

## Next handoff
UXQA → DEV/TEA (H15)
