# S028 — Handoff DEV → TEA

## Story
- ID: S028
- Epic: E03
- Statut DEV: READY_FOR_TEA

## Vérification scope strict S028
- Implémentation limitée à E03-S04 (blocage DONE si sous-gate non PASS + preuve primaire).
- Contrat public S027 conservé; S028 consomme S027 via `gateVerdictResult` ou `gateVerdictInput`.
- Contrat stable S028 livré:
  `{ allowed, reasonCode, reason, diagnostics, doneTransition, correctiveActions }`.

## Fichiers touchés (S028)
- `app/src/done-transition-guard.js`
- `app/src/index.js` (export S028)
- `app/tests/unit/done-transition-guard.test.js`
- `app/tests/edge/done-transition-guard.edge.test.js`
- `app/tests/e2e/done-transition-guard.spec.js`
- `_bmad-output/implementation-artifacts/stories/S028.md`
- `_bmad-output/implementation-artifacts/handoffs/S028-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S028-dev-to-tea.md`

## Résumé technique
1. Résolution source stricte:
   - `gateVerdictResult` prioritaire
   - sinon délégation S027 via `gateVerdictInput`
   - sinon `INVALID_DONE_TRANSITION_INPUT`
2. Propagation stricte des blocages amont autorisés S027.
3. Application FR-014:
   - tout verdict non `PASS`, sous-gate non `PASS` ou `canMarkDone=false` => `DONE_TRANSITION_BLOCKED` + `BLOCK_DONE_TRANSITION`
4. Application FR-015 / NFR-029:
   - absence de preuve primaire requise => `EVIDENCE_CHAIN_INCOMPLETE` + `LINK_PRIMARY_EVIDENCE`
5. Diagnostics complets:
   - `targetState`, `verdict`, `canMarkDone`, `g4tStatus`, `g4uxStatus`, `evidenceCount`, `durationMs`, `p95GuardMs`, `sourceReasonCode`

## Vérifications DEV exécutées
- `npm run lint && npm run typecheck` ✅
- `npx vitest run tests/unit/done-transition-guard.test.js tests/edge/done-transition-guard.edge.test.js` ✅
- `npx playwright test tests/e2e/done-transition-guard.spec.js` ✅
- `npx vitest run tests/unit/done-transition-guard.test.js tests/edge/done-transition-guard.edge.test.js --coverage --coverage.include=src/done-transition-guard.js` ✅
- `npm run build && npm run security:deps` ✅
- `BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw bash /root/.openclaw/workspace/bmad-total/scripts/run-fast-quality-gates.sh S028` ✅

## Couverture S028
- `app/src/done-transition-guard.js`:
  - **99.34% statements**
  - **96.06% branches**
  - **96.00% functions**
  - **100% lines**

## Points de contrôle demandés à TEA
1. Rejouer lint/typecheck + unit/edge/e2e ciblés S028.
2. Vérifier blocage DONE systématique quand verdict/sous-gates/canMarkDone sont non conformes.
3. Vérifier preuve primaire obligatoire et reason code `EVIDENCE_CHAIN_INCOMPLETE`.
4. Vérifier propagation des reason codes amont S027.
5. Vérifier seuil couverture/performance module S028.

## Next handoff
TEA → Reviewer (H17)
