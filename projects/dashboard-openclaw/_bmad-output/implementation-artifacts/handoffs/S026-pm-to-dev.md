# H13 — PM → DEV — S026 (scope strict canonique E03-S02)

## Contexte
- **SID**: S026
- **Story canonique**: E03-S02 — Évaluation duale G4-T/G4-UX corrélée
- **Epic**: E03
- **Dépendance story**: E03-S01 (S025)
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Runtime tick**: 2026-02-24 00:04 UTC
- **Sources validées (strict)**:
  - `_bmad-output/implementation-artifacts/stories/S026.md`
  - `_bmad-output/planning-artifacts/epics.md` (section Story E03-S02)
  - `_bmad-output/planning-artifacts/prd.md` (FR-012, FR-013, AC-012A/B, AC-013A/B, NFR-007, NFR-018)
  - `_bmad-output/planning-artifacts/architecture.md` (events `gate.g4_t.*` / `gate.g4_ux.*`, endpoint `POST /api/v1/gates/g4/sync-subgates`, règle `RULE-G4-01`)

## Décision PM
**GO_DEV explicite — S026 uniquement.**

## Objectifs DEV (strict S026)
1. Implémenter `evaluateG4DualCorrelation(input, options?)` dans `app/src/g4-dual-evaluation.js`.
2. Évaluer G4-T et G4-UX de manière distincte puis corrélée (FR-012), avec matrice explicite de compatibilité.
3. Calculer un verdict corrélé `PASS|CONCERNS|FAIL` pour le **dual G4** (FR-013) sans implémenter le calculateur global multi-gates (scope S027).
4. Réutiliser S025 (`buildGateCenterStatus`) via:
   - `gateCenterResult` injecté prioritaire,
   - sinon `gateCenterInput` délégué,
   - sans casser le contrat public S025.
5. Garantir un contrat de sortie stable:
   `{ allowed, reasonCode, reason, diagnostics, g4DualStatus, correlationMatrix, correctiveActions }`.
6. Exporter S026 dans `app/src/index.js` (export S026 uniquement).

## AC canoniques (E03-S02) à satisfaire
1. **AC-01 / FR-012**: afficher G4-T et G4-UX de manière distincte et corrélée.
2. **AC-02 / FR-013**: calculer automatiquement PASS/CONCERNS/FAIL selon règles de gate en vigueur (dans le périmètre dual G4).
3. **AC-03 / NFR-007**: latence verdict <= 2s après preuve.
4. **AC-04 / NFR-018**: précision baseline >= 65%.

## AC d’exécution S026 (obligatoires)
- AC-01 nominal: entrées G4-T/G4-UX valides -> `allowed=true`, `reasonCode=OK`, verdict corrélé présent.
- AC-02 distinction claire: `g4DualStatus` expose séparément `g4t` et `g4ux` (`status`, `owner`, `updatedAt`, `evidenceCount`).
- AC-03 corrélation: `correlationMatrix` explicite cas `PASS/PASS`, `PASS/FAIL`, `CONCERNS/PASS`, etc.
- AC-04 verdict corrélé auto-calculé (dual G4):
  - `PASS` uniquement si `G4-T=PASS` et `G4-UX=PASS`;
  - `FAIL` si au moins un sous-gate `FAIL`;
  - `CONCERNS` sinon.
- AC-05 résolution source:
  - `gateCenterResult` injecté prioritaire,
  - sinon `gateCenterInput` délégué à S025,
  - sinon erreur d’entrée.
- AC-06 propagation stricte blocages amont S025 (`INVALID_GATE_CENTER_INPUT`, `GATE_STATUS_INCOMPLETE`, `G4_SUBGATE_MISMATCH`, codes gouvernance propagés) sans réécriture.
- AC-07 incohérence de synchro sous-gates (timestamps/owners contradictoires) -> `G4_SUBGATES_UNSYNC` + action corrective `SYNC_G4_SUBGATES`.
- AC-08 contrat stable + diagnostics complets (`g4tStatus`, `g4uxStatus`, `dualVerdict`, `mismatchCount`, `durationMs`, `p95DualEvalMs`, `sourceReasonCode`).
- AC-09 e2e UI: états `empty/loading/success/error` + reason/counters/subgates/verdict/actions.
- AC-10 qualité/perf: couverture module >=95% lignes/branches; benchmark 500 événements (`p95DualEvalMs <= 2000`) + vérification précision baseline >=65% sur dataset de validation.

## Contraintes non négociables
- Scope strict **S026 uniquement**.
- Interdiction d’implémenter le calculateur verdict global complet (scope **S027**).
- S025 reste la source de vérité de la vue Gate Center; S026 ne doit pas modifier son contrat public.
- Aucune exécution shell depuis les modules S026.
- Aucune dérive fonctionnelle S001..S025 hors ajustement minimal d’intégration.
- Story non-DONE tant que **G4-T** et **G4-UX** ne sont pas tous deux PASS.

## Reason codes autorisés (strict)
`OK | INVALID_PHASE | TRANSITION_NOT_ALLOWED | PHASE_NOTIFICATION_MISSING | PHASE_NOTIFICATION_SLA_EXCEEDED | PHASE_PREREQUISITES_MISSING | PHASE_PREREQUISITES_INCOMPLETE | INVALID_PHASE_PREREQUISITES | OVERRIDE_NOT_ELIGIBLE | OVERRIDE_REQUEST_MISSING | OVERRIDE_JUSTIFICATION_REQUIRED | OVERRIDE_APPROVER_REQUIRED | OVERRIDE_APPROVER_CONFLICT | DEPENDENCY_STATE_STALE | INVALID_PHASE_DEPENDENCY_INPUT | PHASE_SEQUENCE_GAP_DETECTED | PHASE_SEQUENCE_REGRESSION_DETECTED | REPEATED_BLOCKING_ANOMALY | INVALID_PHASE_PROGRESSION_INPUT | INVALID_GOVERNANCE_DECISION_INPUT | GATE_STATUS_INCOMPLETE | G4_SUBGATE_MISMATCH | INVALID_GATE_CENTER_INPUT | G4_SUBGATES_UNSYNC | G4_DUAL_EVALUATION_FAILED | INVALID_G4_DUAL_INPUT`

## Plan d’implémentation DEV (séquencé)
1. **Contrat I/O S026**: valider payload dual G4, normaliser `status`/timestamps/owners.
2. **Résolution des sources**: consommer `gateCenterResult` ou déléguer à S025 via `gateCenterInput`.
3. **Matrice duale G4**: implémenter règles de corrélation explicites et testables.
4. **Verdict corrélé**: calcul auto `PASS|CONCERNS|FAIL` + diagnostic mismatch/sync.
5. **Actions correctives**: `SYNC_G4_SUBGATES`, `BLOCK_DONE_TRANSITION`, `REQUEST_UX_EVIDENCE_REFRESH` selon cas.
6. **Diagnostics/perf**: instrumenter latence p95 et compteurs d’incohérences.
7. **Tests**: compléter unit/edge/e2e S026 + non-régression d’intégration S025.
8. **Handoffs DEV**: publier preuves vers UXQA/TEA (`S026-dev-to-uxqa.md`, `S026-dev-to-tea.md`).

## Fichiers autorisés (strict S026)
- `app/src/g4-dual-evaluation.js`
- `app/src/index.js` (export S026 uniquement)
- `app/tests/unit/g4-dual-evaluation.test.js`
- `app/tests/edge/g4-dual-evaluation.edge.test.js`
- `app/tests/e2e/g4-dual-evaluation.spec.js`
- `app/src/gate-center-status.js` *(ajustement minimal uniquement si partage utilitaire, sans changement fonctionnel S025)*
- `_bmad-output/implementation-artifacts/stories/S026.md`
- `_bmad-output/implementation-artifacts/handoffs/S026-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S026-dev-to-tea.md`

## Commandes de validation (obligatoires)
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit/g4-dual-evaluation.test.js tests/edge/g4-dual-evaluation.edge.test.js
npx playwright test tests/e2e/g4-dual-evaluation.spec.js
npm run test:coverage
npm run build && npm run security:deps
```

## Critères de validation de sortie DEV
- Mapping explicite **AC -> tests** dans story/handoffs DEV.
- Couverture module S026 >= 95% lignes + 95% branches.
- Seuils perf S026 respectés (`p95DualEvalMs <= 2000`) + précision baseline >=65%.
- Preuve de non-régression sur S025 + socle S001..S025.
- Preuves techniques + UX complètes pour passage DEV -> UXQA/TEA.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
