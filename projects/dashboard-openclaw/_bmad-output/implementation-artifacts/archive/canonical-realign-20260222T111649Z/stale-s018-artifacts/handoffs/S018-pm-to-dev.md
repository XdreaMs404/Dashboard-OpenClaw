# H13 — PM → DEV — S018 (scope strict)

## Contexte
- **SID**: S018
- **Epic**: E02
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Story source (SoT)**: `_bmad-output/implementation-artifacts/stories/S018.md`
- **Horodatage UTC (courant)**: 2026-02-22 11:00 UTC

## Entrées validées (PM)
- `_bmad-output/implementation-artifacts/stories/S018.md` (statut `READY_FOR_DEV`)
- `_bmad-output/planning-artifacts/prd.md` (FR-026, FR-027, AC-026A/B, AC-027A/B, NFR-038, NFR-003)
- `_bmad-output/planning-artifacts/architecture.md` (service `svc-search`, endpoint `GET /api/v1/artifacts/search`, projection `projection.artifact.search`)
- `_bmad-output/planning-artifacts/epics.md` (E02-S06)
- `_bmad-output/planning-artifacts/epics-index.md` (cohérence dépendances E02)

## Décision PM
**GO_DEV explicite — S018 uniquement.**

## Objectif DEV (strict S018)
Implémenter `applyArtifactContextFilters(input, options?)` pour appliquer des filtres contextuels déterministes (FR-026) et préparer les candidats de comparaison de versions (`diffCandidates`) pour FR-027, sans implémenter le moteur diff complet.

## Scope autorisé (strict)
1. Implémenter `applyArtifactContextFilters(input, options?)` dans `app/src/artifact-context-filter.js`.
2. Appliquer en intersection stricte les filtres FR-026 : `phase`, `agent`, `dateFrom/dateTo`, `gate`, `owner`, `riskLevel`.
3. Résoudre les sources selon contrat :
   - `searchResult` injecté,
   - sinon `searchInput` → délégation à S017 (`searchArtifactsFullText`),
   - sinon `INVALID_ARTIFACT_CONTEXT_FILTER_INPUT`.
4. Propager strictement les blocages amont S017/S016.
5. Produire des `diffCandidates` déterministes (préparation FR-027 uniquement).
6. Retourner un contrat stable :
   `{ allowed, reasonCode, reason, diagnostics, filteredResults, appliedFilters, diffCandidates, correctiveActions }`.
7. Ajouter/adapter tests S018 :
   - `app/tests/unit/artifact-context-filter.test.js`
   - `app/tests/edge/artifact-context-filter.edge.test.js`
   - `app/tests/e2e/artifact-context-filter.spec.js`
8. Exporter S018 dans `app/src/index.js` (export S018 uniquement).

## Hors-scope (interdit)
- Toute évolution hors FR-026/FR-027 liée à S018.
- Toute implémentation du moteur diff complet (scope S019).
- Toute modification fonctionnelle S001..S017 non strictement nécessaire à l’intégration S018.
- Tout refactor transverse non requis par les AC de S018.
- Toute exécution shell depuis les modules S018.

## Reason codes autorisés (strict)
`OK | ARTIFACT_PATH_NOT_ALLOWED | UNSUPPORTED_ARTIFACT_TYPE | ARTIFACT_READ_FAILED | ARTIFACT_PARSE_FAILED | ARTIFACT_METADATA_MISSING | ARTIFACT_METADATA_INVALID | ARTIFACT_SECTIONS_MISSING | ARTIFACT_TABLES_MISSING | INVALID_ARTIFACT_SEARCH_INPUT | INVALID_ARTIFACT_CONTEXT_FILTER_INPUT`

## Fichiers cibles autorisés
- `app/src/artifact-context-filter.js`
- `app/src/index.js`
- `app/tests/unit/artifact-context-filter.test.js`
- `app/tests/edge/artifact-context-filter.edge.test.js`
- `app/tests/e2e/artifact-context-filter.spec.js`
- `app/src/artifact-fulltext-search.js` *(ajustement minimal uniquement si nécessaire, sans changer le comportement S017)*
- `_bmad-output/implementation-artifacts/stories/S018.md`
- `_bmad-output/implementation-artifacts/handoffs/S018-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S018-dev-to-tea.md`

## Gates obligatoires avant handoff DEV
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit/artifact-context-filter.test.js tests/edge/artifact-context-filter.edge.test.js
npx playwright test tests/e2e/artifact-context-filter.spec.js
npm run test:coverage
npm run build && npm run security:deps
```

## Critère de succès attendu
- Implémentation actionnable, alignée FR-026/FR-027, sans hors-scope.
- Preuves d’exécution des gates + mapping AC→tests + couverture/perf conformes.

## Handoff suivant
- DEV (H13→H14/H16)
