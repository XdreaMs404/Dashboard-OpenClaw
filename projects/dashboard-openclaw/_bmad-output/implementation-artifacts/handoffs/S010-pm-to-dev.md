# H13 — PM → DEV — S010 (scope strict)

## Contexte
- **SID**: S010
- **Epic**: E01
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Story source**: `_bmad-output/implementation-artifacts/stories/S010.md`
- **Index source**: `_bmad-output/implementation-artifacts/stories/STORIES_INDEX.md`
- **Objectif story**: détecter les anomalies de progression de phase et produire des alertes actionnables pour sécuriser la continuité canonique H01→H23 (FR-001/FR-002), en réutilisant la matrice dépendances S009.

## Vérification PM (entrées obligatoires)
1. `S010.md` est complète et actionnable: user story, dépendances S002/S006/S009, traçabilité FR/NFR/AC, AC mesurables, cas de test, contraintes, quality/UX gates.
2. `S010.md` est en statut **READY_FOR_DEV**.
3. `STORIES_INDEX.md` maintient `S010` en `TODO` (story planifiée, prête pour prise en charge DEV en H13).
4. Continuité vérifiée sur le code existant `app/src` + tests S001..S009:
   - S002: `BMAD_PHASE_ORDER`, `validatePhaseTransition` (ordre canonique + transitions)
   - S006: `recordPhaseTransitionHistory` (format historique transitions/verdicts)
   - S009: `buildPhaseDependencyMatrix` (blocages dépendances + staleness)

## Décision PM
**GO_DEV explicite — S010 uniquement.**

## Scope DEV autorisé (strict S010)
1. Implémenter `evaluatePhaseProgressionAlert(input, options?)` dans `app/src/phase-progression-alert.js`.
2. Résoudre les sources de données selon priorité contractuelle:
   - `dependencyMatrix` injecté sinon délégation à S009 via `dependencyMatrixInput`
   - `historyEntries` optionnel (format S006), défaut `[]`
3. Implémenter la détection d’anomalies de progression:
   - saut de séquence canonique (`PHASE_SEQUENCE_GAP_DETECTED`)
   - régression de séquence (`PHASE_SEQUENCE_REGRESSION_DETECTED`)
   - récurrence de blocages (`REPEATED_BLOCKING_ANOMALY`) selon `lookbackEntries`/`escalationThreshold`
4. Propager strictement les blocages S009 (dont `DEPENDENCY_STATE_STALE`) avec owner et actions correctives explicites.
5. Produire le contrat de sortie stable:
   `{ allowed, reasonCode, reason, diagnostics, alert, anomalies, correctiveActions }`.
6. Ajouter/maintenir les tests S010 unit + edge + e2e avec coverage module >=95% lignes+branches.
7. Exporter S010 dans `app/src/index.js` (export S010 uniquement).

## Scope interdit (hors-scope)
- Toute évolution hors FR-001/FR-002 / S010.
- Toute modification métier S001..S009 non strictement nécessaire à l’intégration S010.
- Toute exécution shell depuis S010.
- Refactors transverses non requis par les AC S010.

## Reason codes autorisés (strict)
`OK | INVALID_PHASE | TRANSITION_NOT_ALLOWED | PHASE_NOTIFICATION_MISSING | PHASE_NOTIFICATION_SLA_EXCEEDED | PHASE_PREREQUISITES_MISSING | PHASE_PREREQUISITES_INCOMPLETE | INVALID_PHASE_PREREQUISITES | OVERRIDE_NOT_ELIGIBLE | OVERRIDE_REQUEST_MISSING | OVERRIDE_JUSTIFICATION_REQUIRED | OVERRIDE_APPROVER_REQUIRED | OVERRIDE_APPROVER_CONFLICT | DEPENDENCY_STATE_STALE | INVALID_PHASE_DEPENDENCY_INPUT | PHASE_SEQUENCE_GAP_DETECTED | PHASE_SEQUENCE_REGRESSION_DETECTED | REPEATED_BLOCKING_ANOMALY | INVALID_PHASE_PROGRESSION_INPUT`

## Fichiers cibles autorisés (strict S010)
- `app/src/phase-progression-alert.js`
- `app/src/index.js` (export S010 uniquement)
- `app/tests/unit/phase-progression-alert.test.js`
- `app/tests/edge/phase-progression-alert.edge.test.js`
- `app/tests/e2e/phase-progression-alert.spec.js`
- `_bmad-output/implementation-artifacts/stories/S010.md`
- `_bmad-output/implementation-artifacts/handoffs/S010-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S010-dev-to-tea.md`

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
- Non-régression S001..S009 prouvée (tests verts).
- Evidence gates techniques + UX fournie dans les handoffs DEV.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
