# H13 — PM → DEV — S031 (scope strict canonique E03-S07)

## Contexte
- **SID**: S031
- **Story canonique**: E03-S07 — Versioning des policies de gate
- **Epic**: E03
- **Dépendance story**: E03-S06 (S030)
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Runtime tick**: 2026-02-24 05:13 UTC
- **Sources validées (strict)**:
  - `_bmad-output/implementation-artifacts/stories/S031.md`
  - `_bmad-output/planning-artifacts/epics.md` (section Story E03-S07)
  - `_bmad-output/planning-artifacts/prd.md` (FR-017, FR-018, AC-017A/B, AC-018A/B, NFR-007, NFR-018)
  - `_bmad-output/planning-artifacts/architecture.md` (modèle `PolicyVersion`, `GateResult.policy_version`, endpoint `POST /api/v1/gates/{gateId}/simulate`, RULE-G4-01)

## Décision PM
**GO_DEV explicite — S031 uniquement.**

## Objectifs DEV (strict S031)
1. Implémenter `versionGatePolicy(input, options?)` dans `app/src/gate-policy-versioning.js`.
2. Implémenter `simulateGateVerdictBeforeSubmission(input, options?)` dans `app/src/gate-pre-submit-simulation.js`.
3. Versionner les règles de gate et historiser les changements (FR-017).
4. Permettre une simulation de verdict avant soumission finale, sans effet de bord (FR-018).
5. Consommer S030 en source prioritaire (`concernsActionResult`) ou déléguer via `concernsActionInput`.
6. Exporter S031 dans `app/src/index.js` (exports S031 uniquement).

## AC canoniques (E03-S07) à satisfaire
1. **AC-01 / FR-017**: versionnement des règles de gate + historisation.
2. **AC-02 / FR-018**: simulation de verdict pré-soumission sans contournement.
3. **AC-03 / NFR-007**: <= 2s après preuve.
4. **AC-04 / NFR-018**: >= 65% baseline.

## AC d’exécution S031 (obligatoires)
- AC-01 policy active obligatoire: `policyVersioning.activeVersion` non vide (semver) sinon `GATE_POLICY_VERSION_MISSING`.
- AC-02 historisation immuable: chaque changement version => entrée `{ policyId, previousVersion, nextVersion, changedAt, changedBy, changeType }`.
- AC-03 version stale/inactive refusée: `allowed=false`, `reasonCode=POLICY_VERSION_NOT_ACTIVE`, action `SYNC_ACTIVE_POLICY_VERSION`.
- AC-04 simulation pré-soumission: `simulation.eligible=true`, `simulation.simulatedVerdict` présent (`PASS|CONCERNS|FAIL`), sans mutation état.
- AC-05 simulation input invalide: `allowed=false`, `reasonCode=INVALID_GATE_SIMULATION_INPUT`, `simulation.eligible=false`.
- AC-06 résolution source stricte:
  - `concernsActionResult` prioritaire,
  - sinon délégation S030 via `concernsActionInput`,
  - sinon `INVALID_GATE_POLICY_INPUT`.
- AC-07 propagation stricte des blocages amont S030/S029/S028/S027 sans réécriture métier.
- AC-08 contrat stable:
  `{ allowed, reasonCode, reason, diagnostics, policyVersioning, simulation, correctiveActions }`.
- AC-09 diagnostics obligatoires:
  `policyVersion`, `historyEntryCount`, `simulationEligible`, `simulatedVerdict`, `durationMs`, `p95SimulationMs`, `sourceReasonCode`.
- AC-10 qualité/perf:
  couverture module >=95% lignes/branches + benchmark 500 simulations (`p95SimulationMs <= 2000`) + baseline >=65%.

## Contraintes non négociables
- Scope strict **S031 uniquement**.
- S031 n’implémente pas le dashboard tendances/verdict analytics (stories suivantes).
- Aucun changement de contrat public S030/S029/S028/S027 hors intégration minimale.
- Fail-closed sur ambiguïté version/historique/simulation.
- Aucune exécution shell dans les modules applicatifs S031.

## Reason codes attendus (S031)
- `OK`
- `GATE_POLICY_VERSION_MISSING`
- `POLICY_VERSION_NOT_ACTIVE`
- `GATE_POLICY_HISTORY_INCOMPLETE`
- `INVALID_GATE_POLICY_INPUT`
- `INVALID_GATE_SIMULATION_INPUT`
- + propagation des reason codes bloquants amont (ex: `CONCERNS_ACTION_ASSIGNMENT_INVALID`, `EVIDENCE_CHAIN_INCOMPLETE`, `DONE_TRANSITION_BLOCKED`, `INVALID_GATE_VERDICT_INPUT`, `G4_SUBGATES_UNSYNC`, etc.)

## Plan d’implémentation DEV (séquencé)
1. **Contrat I/O S031**: validation entrée + normalisation payload policy/simulation.
2. **Résolution source**: consommer `concernsActionResult` ou déléguer à S030.
3. **Versioning policy**: validation semver, gestion activeVersion/previousVersion, garde anti-stale.
4. **Historisation**: production d’entrées immuables de changement policy.
5. **Simulation pré-soumission**: calcul déterministe verdict simulé non-mutatif.
6. **Diagnostics/perf**: instrumenter `durationMs`, `p95SimulationMs`, compteurs de versions/historique.
7. **Tests**: unit/edge/e2e S031 + non-régression S030/S029/S028/S027.
8. **Handoffs DEV**: publier `S031-dev-to-uxqa.md` et `S031-dev-to-tea.md` avec preuves.

## Fichiers autorisés (strict S031)
- `app/src/gate-policy-versioning.js`
- `app/src/gate-pre-submit-simulation.js`
- `app/src/index.js` (exports S031 uniquement)
- `app/tests/unit/gate-policy-versioning.test.js`
- `app/tests/edge/gate-policy-versioning.edge.test.js`
- `app/tests/e2e/gate-policy-versioning.spec.js`
- `app/src/gate-concerns-actions.js` *(ajustement minimal d’intégration uniquement, sans changement de logique S030)*
- `_bmad-output/implementation-artifacts/stories/S031.md`
- `_bmad-output/implementation-artifacts/handoffs/S031-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S031-dev-to-tea.md`

## Commandes de validation (obligatoires)
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit/gate-policy-versioning.test.js tests/edge/gate-policy-versioning.edge.test.js
npx playwright test tests/e2e/gate-policy-versioning.spec.js
npm run test:coverage
npm run build && npm run security:deps
BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw bash /root/.openclaw/workspace/bmad-total/scripts/run-story-gates.sh S031
BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw bash /root/.openclaw/workspace/bmad-total/scripts/run-ux-gates.sh S031
```

## Critères de validation de sortie DEV
- Mapping explicite **AC -> tests** dans story/handoffs DEV.
- Couverture module S031 >=95% lignes + >=95% branches.
- `p95SimulationMs <= 2000` validé + baseline précision >=65%.
- Non-régression des contrats publics S030/S029/S028/S027.
- Preuves techniques + UX complètes pour passage DEV -> UXQA/TEA.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
