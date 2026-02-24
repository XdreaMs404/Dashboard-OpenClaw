# S027 — Handoff DEV → TEA

## Story
- ID: S027
- Epic: E03
- Statut DEV: READY_FOR_TEA

## Vérification scope strict S027
- Implémentation limitée à E03-S03 (calculateur verdict PASS/CONCERNS/FAIL).
- S026 reste la source de vérité duale G4 (`evaluateG4DualCorrelation`) ; contrat public S026 inchangé.
- Contrat stable livré côté S027:
  `{ allowed, reasonCode, reason, diagnostics, verdict, canMarkDone, contributingFactors, correctiveActions }`.

## Fichiers touchés (S027)
- `app/src/gate-verdict-calculator.js`
- `app/src/index.js` (export S027)
- `app/tests/unit/gate-verdict-calculator.test.js`
- `app/tests/edge/gate-verdict-calculator.edge.test.js`
- `app/tests/e2e/gate-verdict-calculator.spec.js`
- `_bmad-output/implementation-artifacts/stories/S027.md`
- `_bmad-output/implementation-artifacts/handoffs/S027-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S027-dev-to-tea.md`

## Résumé technique
1. Résolution source stricte:
   - `g4DualResult` prioritaire
   - sinon délégation S026 via `g4DualInput`
   - sinon `INVALID_GATE_VERDICT_INPUT`
2. Propagation stricte des blocages amont autorisés S026 (`INVALID_G4_DUAL_INPUT`, `G4_SUBGATES_UNSYNC`, `G4_DUAL_EVALUATION_FAILED`, etc.).
3. Moteur verdict déterministe:
   - base G4-T/G4-UX + mismatch + signaux additionnels
   - sortie `PASS|CONCERNS|FAIL`
4. Signal FR-014:
   - `canMarkDone=false` dès qu’un sous-gate G4 n’est pas PASS
   - ajout forcé `BLOCK_DONE_TRANSITION`
5. Chaîne de preuve:
   - validation `evidenceRefs`/`evidenceByGateRefs`
   - absence de preuve primaire requise => `EVIDENCE_CHAIN_INCOMPLETE`
6. Diagnostics complets:
   - `inputGatesCount`, `evidenceCount`, `g4tStatus`, `g4uxStatus`, `durationMs`, `p95VerdictMs`, `sourceReasonCode`
   - `contributingFactors` pour traçabilité des facteurs du verdict

## Vérifications DEV exécutées
- `npm run lint && npm run typecheck` ✅
- `npx vitest run tests/unit/gate-verdict-calculator.test.js tests/edge/gate-verdict-calculator.edge.test.js` ✅
- `npx playwright test tests/e2e/gate-verdict-calculator.spec.js` ✅
- `npx vitest run tests/unit/gate-verdict-calculator.test.js tests/edge/gate-verdict-calculator.edge.test.js --coverage --coverage.include=src/gate-verdict-calculator.js` ✅
- `npm run build && npm run security:deps` ✅
- `BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw bash /root/.openclaw/workspace/bmad-total/scripts/run-fast-quality-gates.sh S027` ✅

## Couverture S027
- `app/src/gate-verdict-calculator.js`:
  - **99.17% statements**
  - **99.21% branches**
  - **97.36% functions**
  - **99.57% lines**
- Seuil story S027 (>=95% lignes + >=95% branches) validé.

## Mapping AC S027 -> tests
- AC-01, AC-02, AC-05, AC-06, AC-07, AC-08, AC-10:
  - `tests/unit/gate-verdict-calculator.test.js`
  - `tests/edge/gate-verdict-calculator.edge.test.js`
- AC-03 précision baseline:
  - `tests/unit/gate-verdict-calculator.test.js` (dataset 9 cas, précision observée 100% >=65%)
- AC-04 chaîne de preuve:
  - `tests/unit/gate-verdict-calculator.test.js`
  - `tests/edge/gate-verdict-calculator.edge.test.js`
- AC-09 UX/e2e:
  - `tests/e2e/gate-verdict-calculator.spec.js`

## Points de contrôle demandés à TEA
1. Rejouer lint/typecheck + unit/edge/e2e ciblés S027.
2. Vérifier propagation stricte des reason codes amont S026.
3. Vérifier logique verdict `PASS|CONCERNS|FAIL` + `canMarkDone`.
4. Vérifier blocage `EVIDENCE_CHAIN_INCOMPLETE` en absence de preuve primaire.
5. Vérifier perf/couverture module S027.

## Next handoff
TEA → Reviewer (H17)
