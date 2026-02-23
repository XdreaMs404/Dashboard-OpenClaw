# H13 — PM → DEV — S025 (scope strict canonique E03-S01)

## Contexte
- **SID**: S025
- **Story canonique**: E03-S01 — Gate Center unifié avec statut et owner
- **Epic**: E03
- **Dépendance story**: E01-S12 (S012)
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Runtime tick**: 2026-02-23 21:52 UTC
- **Sources validées (strict)**:
  - `_bmad-output/implementation-artifacts/stories/S025.md`
  - `_bmad-output/planning-artifacts/epics.md` (section Story E03-S01)
  - `_bmad-output/planning-artifacts/prd.md` (FR-011, FR-012, AC-011A/B, AC-012A/B, NFR-002, NFR-007)
  - `_bmad-output/planning-artifacts/architecture.md` (events gate G1..G5 + G4_T/G4_UX, projections `projection.gate.*.status`, endpoints `/api/v1/gates*`)

## Décision PM
**GO_DEV explicite — S025 uniquement.**

## Objectifs DEV (strict S025)
1. Implémenter `buildGateCenterStatus(input, options?)` dans `app/src/gate-center-status.js`.
2. Produire une vue unifiée G1→G5 avec `status`, `owner`, `updatedAt` et diagnostic global (FR-011).
3. Afficher G4-T et G4-UX de manière **distincte et corrélée** avec cohérence du G4 global (FR-012).
4. Réutiliser S012 (`recordPhaseGateGovernanceDecision`) via:
   - `governanceDecisionResult` injecté prioritaire,
   - sinon `governanceDecisionInput` délégué,
   - sans casser le contrat public S012.
5. Garantir un contrat de sortie stable:
   `{ allowed, reasonCode, reason, diagnostics, gateCenter, subGates, correctiveActions }`.
6. Exporter S025 dans `app/src/index.js` (export S025 uniquement).

## AC canoniques (E03-S01) à satisfaire
1. **AC-01 / FR-011**: vue unique G1→G5 avec statut, owner, horodatage.
2. **AC-02 / FR-012**: G4-T et G4-UX distincts et corrélés, sans contournement.
3. **AC-03 / NFR-002**: chargement Gate Center p95 < 2.5s.
4. **AC-04 / NFR-007**: latence verdict gate <= 2s après preuve.

## AC d’exécution S025 (obligatoires)
- AC-01 nominal: toutes gates disponibles -> `allowed=true`, `reasonCode=OK`, 5 gates présentes + owners + timestamps.
- AC-02 dual G4: `subGates` contient `G4-T` et `G4-UX` distincts + corrélation explicite vers `G4`.
- AC-03 résolution source:
  - `governanceDecisionResult` injecté prioritaire,
  - sinon `governanceDecisionInput` délégué à S012,
  - sinon erreur d’entrée.
- AC-04 propagation stricte blocages amont S012 (`TRANSITION_NOT_ALLOWED`, `PHASE_NOTIFICATION_MISSING`, `PHASE_NOTIFICATION_SLA_EXCEEDED`, `DEPENDENCY_STATE_STALE`, `INVALID_GOVERNANCE_DECISION_INPUT`, etc.) sans réécriture.
- AC-05 gate incomplète (owner/status/horodatage manquant) -> `GATE_STATUS_INCOMPLETE` + corrective actions.
- AC-06 incohérence sous-gates G4 (ex: G4=PASS alors G4-UX FAIL) -> `G4_SUBGATE_MISMATCH` + blocage explicite.
- AC-07 conformité DONE safety: si `G4-T` ou `G4-UX` non PASS alors action corrective inclut `BLOCK_DONE_TRANSITION`.
- AC-08 contrat stable + diagnostics complets (`gatesCount`, `subGatesCount`, `staleCount`, `durationMs`, `p95BuildMs`, `sourceReasonCode`).
- AC-09 e2e UI: états `empty/loading/success/error` + reason/counters/gates/subgates/actions.
- AC-10 qualité/perf: couverture module >=95% lignes/branches; benchmark 500 docs/events (`p95BuildMs <= 2500`, update <=2000ms après preuve).

## Contraintes non négociables
- Scope strict **S025 uniquement**.
- Interdiction d’implémenter l’évaluation duale complète G4-T/G4-UX (scope **S026**).
- S012 reste la source de vérité du journal décisionnel; S025 ne doit pas modifier son contrat public.
- Aucune exécution shell depuis les modules S025.
- Aucune dérive fonctionnelle S001..S024 hors ajustement minimal d’intégration.
- Story non-DONE tant que **G4-T** et **G4-UX** ne sont pas tous deux PASS.

## Reason codes autorisés (strict)
`OK | INVALID_PHASE | TRANSITION_NOT_ALLOWED | PHASE_NOTIFICATION_MISSING | PHASE_NOTIFICATION_SLA_EXCEEDED | PHASE_PREREQUISITES_MISSING | PHASE_PREREQUISITES_INCOMPLETE | INVALID_PHASE_PREREQUISITES | OVERRIDE_NOT_ELIGIBLE | OVERRIDE_REQUEST_MISSING | OVERRIDE_JUSTIFICATION_REQUIRED | OVERRIDE_APPROVER_REQUIRED | OVERRIDE_APPROVER_CONFLICT | DEPENDENCY_STATE_STALE | INVALID_PHASE_DEPENDENCY_INPUT | PHASE_SEQUENCE_GAP_DETECTED | PHASE_SEQUENCE_REGRESSION_DETECTED | REPEATED_BLOCKING_ANOMALY | INVALID_PHASE_PROGRESSION_INPUT | INVALID_GOVERNANCE_DECISION_INPUT | GATE_STATUS_INCOMPLETE | G4_SUBGATE_MISMATCH | INVALID_GATE_CENTER_INPUT`

## Plan d’implémentation DEV (séquencé)
1. **Contrat I/O S025**: valider payload, normaliser IDs gates (`G1..G5`, `G4-T`, `G4-UX`), bornes et horodatages.
2. **Résolution des sources**: consommer `governanceDecisionResult` ou déléguer à S012 via `governanceDecisionInput`.
3. **Construction Gate Center**: agréger statut/owner/updatedAt par gate, vue unique triée G1→G5.
4. **Dual G4**: assembler `subGates` + cohérence corrélée avec G4 global, détecter mismatch.
5. **Safeguard DONE**: injecter action `BLOCK_DONE_TRANSITION` si sous-gates G4 non PASS.
6. **Diagnostics/perf**: instrumenter latence de build et update post-preuve.
7. **Tests**: compléter unit/edge/e2e S025 + non-régression intégration S012.
8. **Handoffs DEV**: publier preuves vers UXQA/TEA (`S025-dev-to-uxqa.md`, `S025-dev-to-tea.md`).

## Fichiers autorisés (strict S025)
- `app/src/gate-center-status.js`
- `app/src/index.js` (export S025 uniquement)
- `app/tests/unit/gate-center-status.test.js`
- `app/tests/edge/gate-center-status.edge.test.js`
- `app/tests/e2e/gate-center-status.spec.js`
- `app/src/phase-gate-governance-journal.js` *(ajustement minimal uniquement si partage utilitaire, sans changement fonctionnel S012)*
- `_bmad-output/implementation-artifacts/stories/S025.md`
- `_bmad-output/implementation-artifacts/handoffs/S025-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S025-dev-to-tea.md`

## Commandes de validation (obligatoires)
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit/gate-center-status.test.js tests/edge/gate-center-status.edge.test.js
npx playwright test tests/e2e/gate-center-status.spec.js
npm run test:coverage
npm run build && npm run security:deps
```

## Critères de validation de sortie DEV
- Mapping explicite **AC -> tests** dans story/handoffs DEV.
- Couverture module S025 >= 95% lignes + 95% branches.
- Seuils perf S025 respectés (`p95BuildMs <= 2500`, update <= 2000ms après preuve).
- Preuve de non-régression sur S012 + socle S001..S024.
- Preuves techniques + UX complètes pour passage DEV -> UXQA/TEA.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
