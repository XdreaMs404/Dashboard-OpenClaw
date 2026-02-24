# S025 — Handoff DEV → TEA

## Story
- ID: S025
- Epic: E03
- Statut DEV: READY_FOR_TEA

## Vérification scope strict S025
- Implémentation limitée à E03-S01 (Gate Center unifié statut/owner).
- S012 reste source de vérité amont (`recordPhaseGateGovernanceDecision`) ; contrat public S012 inchangé.
- Contrat stable livré côté S025:
  `{ allowed, reasonCode, reason, diagnostics, gateCenter, subGates, correctiveActions }`.

## Fichiers touchés (S025)
- `app/src/gate-center-status.js`
- `app/src/index.js` (export S025)
- `app/tests/unit/gate-center-status.test.js`
- `app/tests/edge/gate-center-status.edge.test.js`
- `app/tests/e2e/gate-center-status.spec.js`
- `_bmad-output/implementation-artifacts/stories/S025.md`
- `_bmad-output/implementation-artifacts/handoffs/S025-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S025-dev-to-tea.md`

## Résumé technique
1. Résolution source stricte:
   - `governanceDecisionResult` prioritaire
   - sinon délégation S012 via `governanceDecisionInput`
   - sinon `INVALID_GATE_CENTER_INPUT`
2. Vue unique G1→G5:
   - tri canonique `G1..G5`
   - champs gate: `status`, `owner`, `updatedAt`, `reasonCode`, `sourceReasonCode`
3. Sous-gates G4:
   - `subGates` explicitement `G4-T` et `G4-UX`
   - parent `G4` forcé
4. Contrôles S025:
   - `GATE_STATUS_INCOMPLETE`
   - `G4_SUBGATE_MISMATCH`
   - propagation stricte blocages amont S012 (`TRANSITION_NOT_ALLOWED`, `PHASE_NOTIFICATION_MISSING`, etc.)
5. Safeguard DONE:
   - `BLOCK_DONE_TRANSITION` ajouté si `G4-T` ou `G4-UX` non PASS.
6. Diagnostics complets:
   - `gatesCount`, `subGatesCount`, `staleCount`, `durationMs`, `p95BuildMs`, `sourceReasonCode`.

## Vérifications DEV exécutées
- `npm run lint && npm run typecheck` ✅
- `npx vitest run tests/unit/gate-center-status.test.js tests/edge/gate-center-status.edge.test.js` ✅
- `npx playwright test tests/e2e/gate-center-status.spec.js` ✅
- `npx vitest run tests/unit/gate-center-status.test.js tests/edge/gate-center-status.edge.test.js --coverage --coverage.include=src/gate-center-status.js` ✅

## Couverture S025
- `app/src/gate-center-status.js`:
  - **99.31% statements**
  - **99.20% branches**
  - **100% functions**
  - **99.28% lines**
- Seuil story S025 validé pour ce module (`>=95% lignes` et `>=95% branches`).

## Mapping AC S025 -> tests
- AC-01..AC-10 (fonctionnel/erreurs/perf):
  - `tests/unit/gate-center-status.test.js`
  - `tests/edge/gate-center-status.edge.test.js`
- AC-09 UX/e2e:
  - `tests/e2e/gate-center-status.spec.js`

## Points de contrôle demandés à TEA
1. Rejouer lint/typecheck + unit/edge/e2e ciblés S025.
2. Vérifier propagation stricte reason codes amont S012.
3. Vérifier cohérence duale `G4` vs `G4-T/G4-UX` (mismatch + block done).
4. Vérifier contrat stable S025 et diagnostics complets.
5. Vérifier perf synthétique (`p95BuildMs <= 2500`, `durationMs <= 2000`) + couverture module.

## Next handoff
TEA → Reviewer (H17)
