# H13 — PM → DEV — S029 (scope strict canonique E03-S05)

## Contexte
- **SID**: S029
- **Story canonique**: E03-S05 — Validation preuve primaire obligatoire
- **Epic**: E03
- **Dépendance story**: E03-S04 (S028)
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Runtime tick**: 2026-02-24 03:10 UTC
- **Sources validées (strict)**:
  - `_bmad-output/implementation-artifacts/stories/S029.md`
  - `_bmad-output/planning-artifacts/epics.md` (section Story E03-S05)
  - `_bmad-output/planning-artifacts/prd.md` (FR-015, FR-016, AC-015A/B, AC-016A/B, NFR-031, NFR-002)
  - `_bmad-output/planning-artifacts/architecture.md` (CONS-08 evidence_ref, RULE-G4-01, RULE-G4-03, endpoints `/api/v1/gates/{gateId}/actions` et `/api/v1/evidence/*`)

## Décision PM
**GO_DEV explicite — S029 uniquement.**

## Objectifs DEV (strict S029)
1. Implémenter `validatePrimaryGateEvidence(input, options?)` dans `app/src/gate-primary-evidence-validator.js`.
2. Exiger au moins une preuve primaire valide pour toute décision gate (FR-015).
3. Garantir qu’un verdict `CONCERNS` produit une action assignée avec échéance (FR-016).
4. Consommer S028 en source prioritaire (`doneTransitionGuardResult`) ou déléguer via `doneTransitionGuardInput`.
5. Livrer un contrat stable:
   `{ allowed, reasonCode, reason, diagnostics, primaryEvidence, concernsAction, correctiveActions }`.
6. Exporter S029 dans `app/src/index.js` (export S029 uniquement).

## AC canoniques (E03-S05) à satisfaire
1. **AC-01 / FR-015**: exigence de preuve primaire liée.
2. **AC-02 / FR-016**: action assignée avec échéance pour chaque gate en `CONCERNS`.
3. **AC-03 / NFR-031**: 100% widgets critiques avec 4 états UI.
4. **AC-04 / NFR-002**: p95 < 2.5s.

## AC d’exécution S029 (obligatoires)
- AC-01 preuve primaire: absence/invalidité de preuve primaire => `allowed=false`, `reasonCode=EVIDENCE_CHAIN_INCOMPLETE`, action `LINK_PRIMARY_EVIDENCE`.
- AC-02 passage nominal: preuve primaire valide + entrée valide => `allowed=true`, `reasonCode=OK`.
- AC-03 action CONCERNS: si verdict `CONCERNS`, sortie avec `concernsAction.assignee` non vide, `concernsAction.dueAt` ISO valide, `concernsAction.status=OPEN`.
- AC-04 invalidité assignation CONCERNS: données manquantes/invalides => `allowed=false`, `reasonCode=CONCERNS_ACTION_ASSIGNMENT_INVALID`.
- AC-05 résolution source stricte:
  - `doneTransitionGuardResult` prioritaire,
  - sinon délégation S028 via `doneTransitionGuardInput`,
  - sinon `INVALID_PRIMARY_EVIDENCE_INPUT`.
- AC-06 propagation stricte des blocages amont S028/S027/S026/S025, sans réécriture du sens métier.
- AC-07 diagnostics obligatoires: `verdict`, `canMarkDone`, `evidenceCount`, `concernsActionRequired`, `durationMs`, `p95ValidationMs`, `sourceReasonCode`.
- AC-08 e2e 4 états UI: `empty/loading/error/success` + affichage `reasonCode/reason/primaryEvidence/concernsAction/correctiveActions`.
- AC-09 robustesse: aucune transition DONE ne peut être validée via S029 si S028 est bloquant.
- AC-10 qualité/perf: couverture module >=95% lignes/branches + benchmark 500 évaluations avec `p95ValidationMs <= 2500`.

## Contraintes non négociables
- Scope strict **S029 uniquement**.
- S029 n’implémente pas le versioning policy gate ni la simulation avancée (stories suivantes).
- Aucun changement de contrat public S028/S027 hors intégration minimale.
- Fail-closed sur ambiguïté de preuve/action.
- Aucune exécution shell dans les modules applicatifs S029.

## Reason codes attendus (S029)
- `OK`
- `EVIDENCE_CHAIN_INCOMPLETE`
- `CONCERNS_ACTION_ASSIGNMENT_INVALID`
- `INVALID_PRIMARY_EVIDENCE_INPUT`
- + propagation des reason codes bloquants amont de S028/S027 (ex: `DONE_TRANSITION_BLOCKED`, `INVALID_DONE_TRANSITION_INPUT`, `INVALID_GATE_VERDICT_INPUT`, `G4_SUBGATES_UNSYNC`, `INVALID_G4_DUAL_INPUT`, etc.)

## Plan d’implémentation DEV (séquencé)
1. **Contrat I/O S029**: validation entrée + normalisation payload preuve/action.
2. **Résolution source**: consommer `doneTransitionGuardResult` ou déléguer à S028.
3. **Validation preuve primaire**: présence, format, unicité minimale, cohérence décision.
4. **Workflow CONCERNS**: imposer `assignee` + `dueAt` + `OPEN` pour gate `CONCERNS`.
5. **Diagnostics/perf**: instrumenter `durationMs`, `p95ValidationMs`, compteurs preuve/actions.
6. **Tests**: unit/edge/e2e S029 + non-régression S028/S027.
7. **Handoffs DEV**: publier `S029-dev-to-uxqa.md` et `S029-dev-to-tea.md` avec preuves.

## Fichiers autorisés (strict S029)
- `app/src/gate-primary-evidence-validator.js`
- `app/src/index.js` (export S029 uniquement)
- `app/tests/unit/gate-primary-evidence-validator.test.js`
- `app/tests/edge/gate-primary-evidence-validator.edge.test.js`
- `app/tests/e2e/gate-primary-evidence-validator.spec.js`
- `app/src/done-transition-guard.js` *(ajustement minimal d’intégration uniquement, sans modification de logique S028)*
- `_bmad-output/implementation-artifacts/stories/S029.md`
- `_bmad-output/implementation-artifacts/handoffs/S029-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S029-dev-to-tea.md`

## Commandes de validation (obligatoires)
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit/gate-primary-evidence-validator.test.js tests/edge/gate-primary-evidence-validator.edge.test.js
npx playwright test tests/e2e/gate-primary-evidence-validator.spec.js
npm run test:coverage
npm run build && npm run security:deps
BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw bash /root/.openclaw/workspace/bmad-total/scripts/run-story-gates.sh S029
BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw bash /root/.openclaw/workspace/bmad-total/scripts/run-ux-gates.sh S029
```

## Critères de validation de sortie DEV
- Mapping explicite **AC -> tests** dans story/handoffs DEV.
- Couverture module S029 >=95% lignes + >=95% branches.
- `p95ValidationMs <= 2500` validé sur benchmark 500 évaluations.
- Non-régression des contrats publics S028/S027.
- Preuves techniques + UX complètes pour passage DEV -> UXQA/TEA.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
