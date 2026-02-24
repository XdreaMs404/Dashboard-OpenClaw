# H13 — PM → DEV — S027 (scope strict canonique E03-S03)

## Contexte
- **SID**: S027
- **Story canonique**: E03-S03 — Calculateur verdict PASS/CONCERNS/FAIL
- **Epic**: E03
- **Dépendance story**: E03-S02 (S026)
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Runtime tick**: 2026-02-24 00:56 UTC
- **Sources validées (strict)**:
  - `_bmad-output/implementation-artifacts/stories/S027.md`
  - `_bmad-output/planning-artifacts/epics.md` (section Story E03-S03)
  - `_bmad-output/planning-artifacts/prd.md` (FR-013, FR-014, AC-013A/B, NFR-018, NFR-029)
  - `_bmad-output/planning-artifacts/architecture.md` (events `gate.*.evaluated.*`, règles G4, projection `projection.gate.*.status`, API `/api/v1/gates/*`)

## Décision PM
**GO_DEV explicite — S027 uniquement.**

## Objectifs DEV (strict S027)
1. Implémenter `calculateGateVerdict(input, options?)` dans `app/src/gate-verdict-calculator.js`.
2. Calculer automatiquement un verdict `PASS | CONCERNS | FAIL` selon les règles de gate en vigueur (FR-013).
3. Réutiliser la sortie duale S026 (`g4DualResult`) ou déléguer via `g4DualInput` à `evaluateG4DualCorrelation`, sans casser le contrat S026.
4. Intégrer la contrainte FR-014 au niveau calcul: si G4-T ou G4-UX n’est pas PASS, le verdict final doit empêcher DONE (`canMarkDone=false` + action corrective explicite).
5. Garantir un contrat de sortie stable:
   `{ allowed, reasonCode, reason, diagnostics, verdict, canMarkDone, contributingFactors, correctiveActions }`.
6. Exporter S027 dans `app/src/index.js` (export S027 uniquement).

## AC canoniques (E03-S03) à satisfaire
1. **AC-01 / FR-013**: calcul automatique PASS/CONCERNS/FAIL selon règles de gate.
2. **AC-02 / FR-014**: interdiction DONE si G4-T ou G4-UX n’est pas PASS (dans le calcul S027).
3. **AC-03 / NFR-018**: précision baseline >= 65%.
4. **AC-04 / NFR-029**: chaîne de preuve complète obligatoire.

## AC d’exécution S027 (obligatoires)
- AC-01 nominal: input valide -> `allowed=true`, `reasonCode=OK`, `verdict` déterministe.
- AC-02 résolution source:
  - `g4DualResult` injecté prioritaire,
  - sinon `g4DualInput` délégué à S026,
  - sinon erreur d’entrée.
- AC-03 propagation stricte blocages amont S026 (`INVALID_G4_DUAL_INPUT`, `G4_SUBGATES_UNSYNC`, `G4_DUAL_EVALUATION_FAILED`, codes gate center/gouvernance propagés) sans réécriture.
- AC-04 règle FR-014: si `g4t!=PASS` ou `g4ux!=PASS` alors `canMarkDone=false` et action `BLOCK_DONE_TRANSITION`.
- AC-05 preuve obligatoire: verdict sans `evidenceRefs` requis -> `EVIDENCE_CHAIN_INCOMPLETE`.
- AC-06 verdict concerns: si signaux non bloquants mais dégradés -> `verdict=CONCERNS`, `reasonCode=GATE_VERDICT_CONCERNS`.
- AC-07 verdict fail: incohérence ou sous-gate FAIL -> `verdict=FAIL`, `canMarkDone=false`.
- AC-08 contrat stable + diagnostics complets (`inputGatesCount`, `evidenceCount`, `g4tStatus`, `g4uxStatus`, `durationMs`, `p95VerdictMs`, `sourceReasonCode`).
- AC-09 e2e UI: états `empty/loading/success/error` + reason/verdict/canMarkDone/facteurs/actions.
- AC-10 qualité/perf: couverture module >=95% lignes/branches; benchmark 500 évaluations (`p95VerdictMs <= 2000`) + précision baseline >=65%.

## Contraintes non négociables
- Scope strict **S027 uniquement**.
- Interdiction d’implémenter le blocage DONE opérationnel de workflow complet (scope **S028**); S027 fournit le signal/verdict.
- S026 reste la source de vérité duale G4; S027 ne doit pas modifier son contrat public.
- Aucune exécution shell depuis les modules S027.
- Aucune dérive fonctionnelle S001..S026 hors ajustement minimal d’intégration.
- Story non-DONE tant que **G4-T** et **G4-UX** ne sont pas tous deux PASS.

## Reason codes autorisés (strict)
`OK | INVALID_PHASE | TRANSITION_NOT_ALLOWED | PHASE_NOTIFICATION_MISSING | PHASE_NOTIFICATION_SLA_EXCEEDED | PHASE_PREREQUISITES_MISSING | PHASE_PREREQUISITES_INCOMPLETE | INVALID_PHASE_PREREQUISITES | OVERRIDE_NOT_ELIGIBLE | OVERRIDE_REQUEST_MISSING | OVERRIDE_JUSTIFICATION_REQUIRED | OVERRIDE_APPROVER_REQUIRED | OVERRIDE_APPROVER_CONFLICT | DEPENDENCY_STATE_STALE | INVALID_PHASE_DEPENDENCY_INPUT | PHASE_SEQUENCE_GAP_DETECTED | PHASE_SEQUENCE_REGRESSION_DETECTED | REPEATED_BLOCKING_ANOMALY | INVALID_PHASE_PROGRESSION_INPUT | INVALID_GOVERNANCE_DECISION_INPUT | GATE_STATUS_INCOMPLETE | G4_SUBGATE_MISMATCH | INVALID_GATE_CENTER_INPUT | G4_SUBGATES_UNSYNC | G4_DUAL_EVALUATION_FAILED | INVALID_G4_DUAL_INPUT | GATE_VERDICT_CONCERNS | EVIDENCE_CHAIN_INCOMPLETE | INVALID_GATE_VERDICT_INPUT`

## Plan d’implémentation DEV (séquencé)
1. **Contrat I/O S027**: validation d’entrée, normalisation états/verdicts, garde-fous anti-null.
2. **Résolution des sources**: consommer `g4DualResult` ou déléguer à S026 via `g4DualInput`.
3. **Moteur verdict**: règles déterministes PASS/CONCERNS/FAIL + facteurs contributifs explicites.
4. **Signal FR-014**: calcul `canMarkDone` + action `BLOCK_DONE_TRANSITION` quand G4 non PASS.
5. **Traçabilité preuve**: valider chaîne `evidenceRefs` et déclencher `EVIDENCE_CHAIN_INCOMPLETE` si manquante.
6. **Diagnostics/perf**: instrumenter p95 verdict + compteurs de facteurs.
7. **Tests**: compléter unit/edge/e2e S027 + non-régression intégration S026.
8. **Handoffs DEV**: publier preuves vers UXQA/TEA (`S027-dev-to-uxqa.md`, `S027-dev-to-tea.md`).

## Fichiers autorisés (strict S027)
- `app/src/gate-verdict-calculator.js`
- `app/src/index.js` (export S027 uniquement)
- `app/tests/unit/gate-verdict-calculator.test.js`
- `app/tests/edge/gate-verdict-calculator.edge.test.js`
- `app/tests/e2e/gate-verdict-calculator.spec.js`
- `app/src/g4-dual-evaluation.js` *(ajustement minimal uniquement si partage utilitaire, sans changement fonctionnel S026)*
- `_bmad-output/implementation-artifacts/stories/S027.md`
- `_bmad-output/implementation-artifacts/handoffs/S027-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S027-dev-to-tea.md`

## Commandes de validation (obligatoires)
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit/gate-verdict-calculator.test.js tests/edge/gate-verdict-calculator.edge.test.js
npx playwright test tests/e2e/gate-verdict-calculator.spec.js
npm run test:coverage
npm run build && npm run security:deps
```

## Critères de validation de sortie DEV
- Mapping explicite **AC -> tests** dans story/handoffs DEV.
- Couverture module S027 >= 95% lignes + 95% branches.
- Seuils perf S027 respectés (`p95VerdictMs <= 2000`) + précision baseline >=65%.
- Preuve de non-régression sur S026 + socle S001..S026.
- Preuves techniques + UX complètes pour passage DEV -> UXQA/TEA.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
