# H13 — PM → DEV — S032 (scope strict canonique E03-S08)

## Contexte
- **SID**: S032
- **Story canonique**: E03-S08 — Simulation de verdict pré-soumission
- **Epic**: E03
- **Dépendance story**: E03-S07 (S031)
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Runtime tick**: 2026-02-24 07:34 UTC
- **Sources validées (strict)**:
  - `_bmad-output/implementation-artifacts/stories/S032.md`
  - `_bmad-output/planning-artifacts/epics.md` (section Story E03-S08)
  - `_bmad-output/planning-artifacts/prd.md` (FR-018, FR-019, AC-018A/B, AC-019A/B, NFR-018, NFR-029)
  - `_bmad-output/planning-artifacts/architecture.md` (CONS-08 `evidence_ref`, `POST /api/v1/gates/{gateId}/simulate`, `GET /api/v1/gates/{gateId}/history`, RULE-G4-01)

## Décision PM
**GO_DEV explicite — S032 uniquement.**

## Objectifs DEV (strict S032)
1. Étendre `simulateGateVerdictBeforeSubmission(input, options?)` pour couvrir simulation + tendances phase/période.
2. Implémenter `buildSimulationTrendSnapshot(input, options?)` pour agréger PASS/CONCERNS/FAIL par phase et période (FR-019).
3. Garantir simulation non mutative et exploitable avant soumission finale (FR-018).
4. Rendre obligatoire la chaîne de preuve complète de simulation+tendance (NFR-029).
5. Atteindre baseline précision >=65% sur dataset de validation versionné (NFR-018).
6. Exporter les fonctions S032 dans `app/src/index.js` (exports S032 uniquement).

## AC canoniques (E03-S08) à satisfaire
1. **AC-01 / FR-018**: simulation de verdict avant soumission finale.
2. **AC-02 / FR-019**: tendances PASS/CONCERNS/FAIL par phase et période.
3. **AC-03 / NFR-018**: baseline >= 65%.
4. **AC-04 / NFR-029**: chaîne de preuve complète.

## AC d’exécution S032 (obligatoires)
- AC-01 simulation nominale: `allowed=true`, `reasonCode=OK`, `simulation.eligible=true`, `simulation.nonMutative=true`, `simulation.simulatedVerdict` présent.
- AC-02 simulation invalide: `allowed=false`, `reasonCode=INVALID_GATE_SIMULATION_INPUT`, `simulation.eligible=false`.
- AC-03 tendance obligatoire: `trendSnapshot` inclut `phase`, `period`, `passCount`, `concernsCount`, `failCount`, `totalCount`, `trendDirection`.
- AC-04 fenêtre tendance invalide: `allowed=false`, `reasonCode=SIMULATION_TREND_WINDOW_INVALID`, action `FIX_TREND_WINDOW_INPUT`.
- AC-05 preuve complète: `evidenceChain.primaryEvidenceRefs` + `evidenceChain.trendEvidenceRefs` non vides, sinon `EVIDENCE_CHAIN_INCOMPLETE`.
- AC-06 résolution source stricte:
  - `policyVersionResult` injecté prioritaire,
  - sinon délégation S031 via `policyVersionInput`,
  - sinon `INVALID_PRE_SUBMIT_SIMULATION_INPUT`.
- AC-07 propagation stricte des blocages amont S031/S030/S029/S028/S027 sans réécriture métier.
- AC-08 contrat stable:
  `{ allowed, reasonCode, reason, diagnostics, simulation, trendSnapshot, evidenceChain, correctiveActions }`.
- AC-09 diagnostics obligatoires:
  `simulationEligible`, `simulatedVerdict`, `trendWindow`, `trendSamples`, `evidenceCount`, `durationMs`, `p95SimulationMs`, `sourceReasonCode`.
- AC-10 qualité/perf:
  couverture >=95% lignes/branches + benchmark 500 simulations (`p95SimulationMs <= 2000`) + baseline >=65%.

## Contraintes non négociables
- Scope strict **S032 uniquement**.
- S032 ne couvre pas le dashboard tendances complet ni export rapport (stories suivantes).
- Aucun changement de contrat public S031/S030/S029/S028/S027 hors intégration minimale.
- Fail-closed sur ambiguïté simulation/tendance/preuve.
- Aucune exécution shell dans les modules applicatifs S032.

## Reason codes attendus (S032)
- `OK`
- `INVALID_GATE_SIMULATION_INPUT`
- `SIMULATION_TREND_WINDOW_INVALID`
- `INVALID_PRE_SUBMIT_SIMULATION_INPUT`
- `EVIDENCE_CHAIN_INCOMPLETE`
- + propagation des reason codes bloquants amont (ex: `POLICY_VERSION_NOT_ACTIVE`, `GATE_POLICY_VERSION_MISSING`, `CONCERNS_ACTION_ASSIGNMENT_INVALID`, `DONE_TRANSITION_BLOCKED`, `INVALID_GATE_VERDICT_INPUT`, `G4_SUBGATES_UNSYNC`, etc.)

## Plan d’implémentation DEV (séquencé)
1. **Contrat I/O S032**: validation d’entrée simulation + période + preuves.
2. **Résolution source**: consommer `policyVersionResult` ou déléguer à S031 via `policyVersionInput`.
3. **Simulation non mutative**: produire verdict simulé déterministe sans persistance.
4. **Agrégation tendances**: calculer snapshot phase/période (PASS/CONCERNS/FAIL + direction).
5. **Contrôle preuve**: refuser toute sortie exploitable sans `primaryEvidenceRefs` et `trendEvidenceRefs`.
6. **Diagnostics/perf**: instrumenter `durationMs`, `p95SimulationMs`, taille dataset tendance.
7. **Tests**: unit/edge/e2e S032 + non-régression S031..S027.
8. **Handoffs DEV**: publier `S032-dev-to-uxqa.md` et `S032-dev-to-tea.md` avec preuves.

## Fichiers autorisés (strict S032)
- `app/src/gate-pre-submit-simulation.js`
- `app/src/gate-simulation-trends.js`
- `app/src/index.js` (exports S032 uniquement)
- `app/tests/unit/gate-pre-submit-simulation.test.js`
- `app/tests/edge/gate-pre-submit-simulation.edge.test.js`
- `app/tests/unit/gate-simulation-trends.test.js`
- `app/tests/edge/gate-simulation-trends.edge.test.js`
- `app/tests/e2e/gate-pre-submit-simulation.spec.js`
- `app/src/gate-policy-versioning.js` *(ajustement minimal d’intégration uniquement, sans changement de logique S031)*
- `_bmad-output/implementation-artifacts/stories/S032.md`
- `_bmad-output/implementation-artifacts/handoffs/S032-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S032-dev-to-tea.md`

## Commandes de validation (obligatoires)
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit/gate-pre-submit-simulation.test.js tests/edge/gate-pre-submit-simulation.edge.test.js tests/unit/gate-simulation-trends.test.js tests/edge/gate-simulation-trends.edge.test.js
npx playwright test tests/e2e/gate-pre-submit-simulation.spec.js
npm run test:coverage
npm run build && npm run security:deps
BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw bash /root/.openclaw/workspace/bmad-total/scripts/run-story-gates.sh S032
BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw bash /root/.openclaw/workspace/bmad-total/scripts/run-ux-gates.sh S032
```

## Critères de validation de sortie DEV
- Mapping explicite **AC -> tests** dans story/handoffs DEV.
- Couverture modules S032 >=95% lignes + >=95% branches.
- `p95SimulationMs <= 2000` validé sur 500 simulations.
- Baseline précision simulation+tendance >=65%.
- Chaîne de preuve complète démontrée (simulation + tendances).
- Non-régression des contrats publics S031/S030/S029/S028/S027.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
