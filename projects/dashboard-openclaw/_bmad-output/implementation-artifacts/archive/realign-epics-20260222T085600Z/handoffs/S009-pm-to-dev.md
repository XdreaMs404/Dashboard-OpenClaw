# H13 — PM → DEV — S009 (scope strict)

## Contexte
- **SID**: S009
- **Epic**: E01
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Story source**: `_bmad-output/implementation-artifacts/stories/S009.md`
- **Index source**: `_bmad-output/implementation-artifacts/stories/STORIES_INDEX.md`
- **Objectif story**: livrer la matrice des dépendances bloquantes inter-phases en temps réel (FR-010), avec propagation explicite des blocages, owner visible, staleness détectée et action corrective déterministe.

## Vérification PM (entrées obligatoires)
1. `S009.md` est complète et actionnable: user story, dépendances S002/S003/S004/S008, traçabilité FR/NFR/AC, AC mesurables, cas de test, contraintes, quality/UX gates.
2. `S009.md` est en statut **READY_FOR_DEV**.
3. `STORIES_INDEX.md` maintient `S009` en `TODO` (story planifiée, prête pour prise en charge DEV en H13).
4. Continuité vérifiée sur le code existant `app/src` + tests S001..S008:
   - S002: `validatePhaseTransition` (source de vérité transitions + reason codes)
   - S003: `buildPhaseStateProjection` (owner + contexte phase)
   - S004: `validatePhasePrerequisites` (source de vérité dépendances prérequis)
   - S008: `evaluatePhaseTransitionOverride` (contexte override exceptionnel)

## Décision PM
**GO_DEV explicite — S009 uniquement.**

### Confirmation PM (revalidation)
- Revalidation effectuée (scope strict S009): **GO_DEV maintenu**.
- Aucun élargissement de périmètre autorisé; le scope DEV reste strictement celui listé ci-dessous.

## Scope DEV autorisé (strict S009)
1. Implémenter `buildPhaseDependencyMatrix(input, options?)` dans `app/src/phase-dependency-matrix.js`.
2. Résoudre les sources de données selon priorité contractuelle:
   - `transitionValidation` injecté sinon délégation à S002 via `transitionInput`
   - `prerequisitesValidation` injecté sinon délégation à S004 via `prerequisitesInput`
   - `overrideEvaluation` injecté sinon optionnel via `overrideInput` vers S008
3. Implémenter l’agrégation des dépendances avec blocages explicites:
   - propagation stricte des reason codes amont
   - `blockingDependencies` cohérent
   - owner systématiquement visible dans message/diagnostics
4. Implémenter la fraîcheur temps réel:
   - `maxRefreshIntervalMs` par défaut `5000`
   - si stale: `allowed=false`, `reasonCode=DEPENDENCY_STATE_STALE`, action `REFRESH_DEPENDENCY_MATRIX`
5. Produire le contrat de sortie stable:
   `{ allowed, reasonCode, reason, diagnostics, dependencies, blockingDependencies, correctiveActions }`.
6. Ajouter/maintenir les tests S009 unit + edge + e2e avec coverage module >=95% lignes+branches.
7. Exporter S009 dans `app/src/index.js` (export S009 uniquement).

## Scope interdit (hors-scope)
- Toute évolution hors FR-010 / S009.
- Toute modification métier S001..S008 non strictement nécessaire à l’intégration S009.
- Toute exécution shell depuis S009.
- Refactors transverses non requis par les AC S009.

## Reason codes autorisés (strict)
`OK | INVALID_PHASE | TRANSITION_NOT_ALLOWED | PHASE_NOTIFICATION_MISSING | PHASE_NOTIFICATION_SLA_EXCEEDED | PHASE_PREREQUISITES_MISSING | PHASE_PREREQUISITES_INCOMPLETE | INVALID_PHASE_PREREQUISITES | OVERRIDE_NOT_ELIGIBLE | OVERRIDE_REQUEST_MISSING | OVERRIDE_JUSTIFICATION_REQUIRED | OVERRIDE_APPROVER_REQUIRED | OVERRIDE_APPROVER_CONFLICT | DEPENDENCY_STATE_STALE | INVALID_PHASE_DEPENDENCY_INPUT`

## Fichiers cibles autorisés (strict S009)
- `app/src/phase-dependency-matrix.js`
- `app/src/index.js` (export S009 uniquement)
- `app/tests/unit/phase-dependency-matrix.test.js`
- `app/tests/edge/phase-dependency-matrix.edge.test.js`
- `app/tests/e2e/phase-dependency-matrix.spec.js`
- `_bmad-output/implementation-artifacts/stories/S009.md`
- `_bmad-output/implementation-artifacts/handoffs/S009-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S009-dev-to-tea.md`

## Gates à exécuter avant sortie DEV
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit tests/edge
npx playwright test tests/e2e
npm run test:coverage
npm run build && npm run security:deps
```

## Critère de succès H13
- AC-01..AC-10 couverts et vérifiables.
- Non-régression S001..S008 prouvée (tests verts).
- Evidence gates techniques + UX fournie dans les handoffs DEV.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
