# S031 — Handoff DEV → TEA

## Story
- ID: S031
- Epic: E03
- Statut DEV: READY_FOR_TEA

## Vérification scope strict S031
- Implémentation limitée à E03-S07 (versioning policy gate + historisation immuable + simulation pré-soumission non mutative).
- Contrat public S030/S029/S028/S027 non modifié; S031 consomme S030 via `concernsActionResult` ou délégation `concernsActionInput`.
- Contrat stable S031 livré:
  `{ allowed, reasonCode, reason, diagnostics, policyVersioning, simulation, correctiveActions }`.

## Fichiers touchés (S031)
- `app/src/gate-policy-versioning.js`
- `app/src/gate-pre-submit-simulation.js`
- `app/src/index.js` (exports S031)
- `app/tests/unit/gate-policy-versioning.test.js`
- `app/tests/edge/gate-policy-versioning.edge.test.js`
- `app/tests/e2e/gate-policy-versioning.spec.js`
- `_bmad-output/implementation-artifacts/handoffs/S031-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S031-dev-to-tea.md`

## Résumé technique
1. **Version policy obligatoire (AC-01)**
   - Validation `policyScope="gate"` + `activeVersion` semver.
   - Rejet `GATE_POLICY_VERSION_MISSING` en fail-closed si invalide.
2. **Historisation immuable (AC-02)**
   - Entrée obligatoire `{ policyId, previousVersion, nextVersion, changedAt, changedBy, changeType }`.
   - Rejet `GATE_POLICY_HISTORY_INCOMPLETE` si métadonnées incomplètes/invalides.
3. **Version stale/inactive refusée (AC-03)**
   - `POLICY_VERSION_NOT_ACTIVE` + action corrective `SYNC_ACTIVE_POLICY_VERSION`.
4. **Simulation pré-soumission non mutative (AC-04/AC-05)**
   - `simulateGateVerdictBeforeSubmission` impose `nonMutative/readOnly`.
   - Rejet `INVALID_GATE_SIMULATION_INPUT` sur payload invalide/inéligible.
5. **Résolution source stricte (AC-06)**
   - Priorité `concernsActionResult`.
   - Sinon délégation S030 via `concernsActionInput`.
   - Sinon `INVALID_GATE_POLICY_INPUT`.
6. **Propagation blocages amont (AC-07)**
   - Reason codes bloquants S030/S029/S028/S027 propagés sans réécriture.
7. **Contrat de sortie stable + diagnostics (AC-08/AC-09/AC-10)**
   - Diagnostics fournis: `policyVersion`, `historyEntryCount`, `simulationEligible`, `simulatedVerdict`, `durationMs`, `p95SimulationMs`, `sourceReasonCode`.
   - Tests synthétiques 500 simulations pour seuil `p95 <= 2000ms` et baseline précision `>=65%`.

## Vérifications DEV exécutées
- `npm run lint` ✅
- `npm run typecheck` ✅
- `npx vitest run tests/unit/gate-policy-versioning.test.js tests/edge/gate-policy-versioning.edge.test.js` ✅
- `npx playwright test tests/e2e/gate-policy-versioning.spec.js --output=test-results/e2e-s031` ✅
- `BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw bash /root/.openclaw/workspace/bmad-total/scripts/run-fast-quality-gates.sh S031` ✅

## Points de contrôle demandés à TEA
1. Rejouer unit/edge/e2e S031.
2. Vérifier reason codes critiques: `GATE_POLICY_VERSION_MISSING`, `POLICY_VERSION_NOT_ACTIVE`, `GATE_POLICY_HISTORY_INCOMPLETE`, `INVALID_GATE_SIMULATION_INPUT`.
3. Vérifier propagation stricte des blocages amont (pas de remapping).
4. Vérifier simulation non mutative et stabilité contrat de sortie.

## Next handoff
TEA → Reviewer (H17)
