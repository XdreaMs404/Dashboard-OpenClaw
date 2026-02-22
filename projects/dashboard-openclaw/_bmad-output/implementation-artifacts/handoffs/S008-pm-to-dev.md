# H13 — PM → DEV — S008 (scope strict)

## Contexte
- **SID**: S008
- **Epic**: E01
- **Story source**: `_bmad-output/implementation-artifacts/stories/S008.md`
- **Index source**: `_bmad-output/implementation-artifacts/stories/STORIES_INDEX.md`
- **Objectif story**: conserver un historique consultable des transitions de phase et des verdicts associés (FR-007), en continuité stricte avec S002/S004/S005.

## Vérification PM (entrées)
1. `S008.md` est complétée avec user story, dépendances, traçabilité FR/NFR, AC mesurables, cas de test, contraintes, gates techniques et UX, statut prêt DEV.
2. `STORIES_INDEX.md` confirme `S008` en statut `TODO` (prêt pour prise en charge DEV H13).
3. Continuité vérifiée avec le socle existant `app/src` + tests S001..S005 (contrats reason codes et propagation).

## Décision PM
**GO_DEV explicite — S008 uniquement.**

## Scope DEV autorisé (strict S008)
1. Implémenter `recordPhaseTransitionHistory(input, options?)` dans `app/src/phase-transition-history.js`.
2. Consommer le verdict amont via `guardResult` (issue S005) sans exécuter de scripts shell dans S008.
3. Valider/normaliser `fromPhase` et `toPhase` selon l’ordre canonique H01..H23 (continuité S002).
4. Gérer append immuable + consultation filtrée (`query.fromPhase`, `query.toPhase`, `query.reasonCode`, `query.allowed`, `query.limit`) triée du plus récent au plus ancien.
5. Gérer la rétention (`maxEntries`, défaut 200, borne max 1000) et renseigner `diagnostics.droppedCount`.
6. Garantir le contrat de sortie stable:
   `{ allowed, reasonCode, reason, diagnostics, entry, history }`.
7. Ajouter les tests S008 unit + edge + e2e et atteindre coverage module >=95% lignes+branches.
8. Exporter S008 dans `app/src/index.js` (export S008 uniquement).

## Scope interdit (hors-scope)
- Toute évolution hors FR-007 / S008.
- Toute modification de logique métier S001..S005 non strictement nécessaire à l’intégration S008.
- Toute exécution des scripts guards dans S008 (le module ne doit pas relancer S005 en shell).
- Ajout de dépendances externes non requises par les AC S008.

## Reason codes autorisés (strict)
`OK | INVALID_PHASE | TRANSITION_NOT_ALLOWED | PHASE_NOTIFICATION_MISSING | PHASE_NOTIFICATION_SLA_EXCEEDED | PHASE_PREREQUISITES_MISSING | PHASE_PREREQUISITES_INCOMPLETE | INVALID_PHASE_PREREQUISITES | INVALID_GUARD_PHASE | GUARD_EXECUTION_FAILED | INVALID_TRANSITION_HISTORY`

## Fichiers cibles autorisés (strict S008)
- `app/src/phase-transition-history.js`
- `app/src/index.js` (export S008 uniquement)
- `app/tests/unit/phase-transition-history.test.js`
- `app/tests/edge/phase-transition-history.edge.test.js`
- `app/tests/e2e/phase-transition-history.spec.js`
- `_bmad-output/implementation-artifacts/stories/S008.md`
- `_bmad-output/implementation-artifacts/handoffs/S008-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S008-dev-to-tea.md`

## Gates à exécuter avant sortie DEV
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit tests/edge
npx playwright test tests/e2e
npm run test:coverage
npm run build && npm run security:deps
```

## Handoff attendu après DEV
- DEV → UXQA (H14)
- DEV → TEA (H16)
