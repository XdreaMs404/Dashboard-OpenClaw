# H13 — PM → DEV — S030 (scope strict canonique E03-S06)

## Contexte
- **SID**: S030
- **Story canonique**: E03-S06 — Création automatique actions CONCERNS
- **Epic**: E03
- **Dépendance story**: E03-S05 (S029)
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Runtime tick**: 2026-02-24 03:59 UTC
- **Sources validées (strict)**:
  - `_bmad-output/implementation-artifacts/stories/S030.md`
  - `_bmad-output/planning-artifacts/epics.md` (section Story E03-S06)
  - `_bmad-output/planning-artifacts/prd.md` (FR-016, FR-017, AC-016A/B, AC-017A/B, NFR-002, NFR-007)
  - `_bmad-output/planning-artifacts/architecture.md` (RULE-G4-01, endpoints `/api/v1/gates/{gateId}/actions` & `/api/v1/gates/{gateId}/history`, modèle `PolicyVersion`)

## Décision PM
**GO_DEV explicite — S030 uniquement.**

## Objectifs DEV (strict S030)
1. Implémenter `createGateConcernsAction(input, options?)` dans `app/src/gate-concerns-actions.js`.
2. Créer automatiquement une action assignée avec échéance pour tout verdict gate `CONCERNS` (FR-016).
3. Capturer la version de policy gate appliquée et historiser la création/mise à jour d’action (FR-017, scope S030 minimal).
4. Consommer S029 en source prioritaire (`primaryEvidenceResult`) ou déléguer via `primaryEvidenceInput`.
5. Livrer un contrat stable:
   `{ allowed, reasonCode, reason, diagnostics, concernsAction, policySnapshot, historyEntry, correctiveActions }`.
6. Exporter S030 dans `app/src/index.js` (export S030 uniquement).

## AC canoniques (E03-S06) à satisfaire
1. **AC-01 / FR-016**: action assignée avec échéance pour chaque gate en `CONCERNS`.
2. **AC-02 / FR-017**: versionnement/historisation des règles sans contournement.
3. **AC-03 / NFR-002**: p95 < 2.5s.
4. **AC-04 / NFR-007**: <= 2s après preuve.

## AC d’exécution S030 (obligatoires)
- AC-01 création auto: verdict `CONCERNS` => `concernsAction` créée avec `assignee`, `dueAt` (ISO), `status=OPEN`, `gateId`, `storyId`.
- AC-02 passage nominal non-CONCERNS: verdict `PASS`/`FAIL` => pas de création d’action CONCERNS, sans faux positifs.
- AC-03 invalidité assignation: verdict `CONCERNS` sans `assignee` ou `dueAt` valide => `allowed=false`, `reasonCode=CONCERNS_ACTION_ASSIGNMENT_INVALID`.
- AC-04 policy snapshot obligatoire (FR-017): action créée avec `policySnapshot.version` non vide; sinon `GATE_POLICY_VERSION_MISSING`.
- AC-05 historisation obligatoire (FR-017): chaque création/modification d’action produit un `historyEntry` immuable (`actionId`, `policyVersion`, `changedAt`, `changedBy`, `changeType`).
- AC-06 résolution source stricte:
  - `primaryEvidenceResult` injecté prioritaire,
  - sinon délégation S029 via `primaryEvidenceInput`,
  - sinon `INVALID_CONCERNS_ACTION_INPUT`.
- AC-07 propagation stricte des blocages amont S029/S028/S027 sans réécriture sémantique.
- AC-08 diagnostics obligatoires: `verdict`, `concernsActionRequired`, `actionCreated`, `durationMs`, `p95ActionMs`, `sourceReasonCode`, `policyVersion`.
- AC-09 e2e UI 4 états: `empty/loading/error/success` + affichage `reasonCode`, `concernsAction`, `policySnapshot`, `historyEntry`, `correctiveActions`.
- AC-10 qualité/perf: couverture module >=95% lignes/branches + benchmark 500 évaluations avec `p95ActionMs <= 2500` et `durationMs <= 2000` après preuve.

## Contraintes non négociables
- Scope strict **S030 uniquement**.
- S030 ne couvre pas la gestion complète du cycle de vie des policies (publication/diff/admin: scope stories suivantes).
- Aucun changement de contrat public S029/S028 hors intégration minimale.
- Fail-closed sur ambiguïté action/policy/history.
- Aucune exécution shell dans les modules applicatifs S030.

## Reason codes attendus (S030)
- `OK`
- `CONCERNS_ACTION_ASSIGNMENT_INVALID`
- `CONCERNS_ACTION_HISTORY_INCOMPLETE`
- `GATE_POLICY_VERSION_MISSING`
- `INVALID_CONCERNS_ACTION_INPUT`
- + propagation des reason codes bloquants amont de S029/S028/S027 (ex: `EVIDENCE_CHAIN_INCOMPLETE`, `DONE_TRANSITION_BLOCKED`, `INVALID_DONE_TRANSITION_INPUT`, `INVALID_GATE_VERDICT_INPUT`, `G4_SUBGATES_UNSYNC`, etc.)

## Plan d’implémentation DEV (séquencé)
1. **Contrat I/O S030**: validation d’entrée + normalisation payload action/policy.
2. **Résolution source**: consommer `primaryEvidenceResult` ou déléguer à S029.
3. **Moteur création action CONCERNS**: génération déterministe `actionId` + champs requis d’assignation/échéance.
4. **Version policy**: injecter `policySnapshot` minimal (`policyScope`, `version`) sur chaque action.
5. **Historisation**: produire `historyEntry` immuable pour create/update (sans implémenter gestion complète de versions globales).
6. **Diagnostics/perf**: instrumenter `durationMs`, `p95ActionMs`, compteurs de créations/actions invalides.
7. **Tests**: unit/edge/e2e S030 + non-régression S029/S028.
8. **Handoffs DEV**: publier `S030-dev-to-uxqa.md` et `S030-dev-to-tea.md` avec preuves.

## Fichiers autorisés (strict S030)
- `app/src/gate-concerns-actions.js`
- `app/src/index.js` (export S030 uniquement)
- `app/tests/unit/gate-concerns-actions.test.js`
- `app/tests/edge/gate-concerns-actions.edge.test.js`
- `app/tests/e2e/gate-concerns-actions.spec.js`
- `app/src/gate-primary-evidence-validator.js` *(ajustement minimal d’intégration uniquement, sans changement de logique S029)*
- `app/src/phase-gate-governance-journal.js` *(ajustement minimal si nécessaire à l’historisation S030)*
- `_bmad-output/implementation-artifacts/stories/S030.md`
- `_bmad-output/implementation-artifacts/handoffs/S030-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S030-dev-to-tea.md`

## Commandes de validation (obligatoires)
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit/gate-concerns-actions.test.js tests/edge/gate-concerns-actions.edge.test.js
npx playwright test tests/e2e/gate-concerns-actions.spec.js
npm run test:coverage
npm run build && npm run security:deps
BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw bash /root/.openclaw/workspace/bmad-total/scripts/run-story-gates.sh S030
BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw bash /root/.openclaw/workspace/bmad-total/scripts/run-ux-gates.sh S030
```

## Critères de validation de sortie DEV
- Mapping explicite **AC -> tests** dans story/handoffs DEV.
- Couverture module S030 >=95% lignes + >=95% branches.
- `p95ActionMs <= 2500` et `durationMs <= 2000` après preuve validés.
- Non-régression des contrats publics S029/S028/S027.
- Preuves techniques + UX complètes pour passage DEV -> UXQA/TEA.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
