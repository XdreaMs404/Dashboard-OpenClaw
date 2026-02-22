# H13 — PM → DEV — S017 (scope strict)

## Contexte
- **SID**: S017
- **Epic**: E02
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Story source (SoT)**: `_bmad-output/implementation-artifacts/stories/S017.md`
- **Entrées de cadrage validées**:
  - `_bmad-output/planning-artifacts/prd.md`
  - `_bmad-output/planning-artifacts/architecture.md`
  - `_bmad-output/planning-artifacts/epics.md`
  - `_bmad-output/planning-artifacts/epics-index.md`
  - `_bmad-output/implementation-artifacts/stories/S017.md`
- **Objectif story**: livrer la recherche full-text avec filtres dynamiques (FR-025/FR-026) sur base d’artefacts conformes, avec contrat stable et performance mesurée.

## Vérification PM (entrées obligatoires)
1. `S017.md` est complète et actionnable: user story, dépendances S011..S014, traçabilité FR/NFR/AC, AC mesurables, cas de test, contraintes, quality/UX gates.
2. `S017.md` est en statut **READY_FOR_DEV**.
3. `STORIES_INDEX.md` maintient `S017` en `TODO` (story planifiée, prête pour prise en charge DEV en H13).
4. Alignement confirmé avec planning:
   - PRD FR-025/FR-026 + AC-025A/B + AC-026A/B,
   - Architecture `GET /api/v1/artifacts/search` + `projection.artifact.search`,
   - Epic E02-S05 (dépendance E02-S04).

## Décision PM
**GO_DEV explicite — S017 uniquement.**

## Scope DEV autorisé (strict S017)
1. Implémenter `searchArtifactsFullText(input, options?)` dans `app/src/artifact-fulltext-search.js`.
2. Implémenter la recherche full-text avec tri déterministe (`score` desc, puis `artifactPath`) et `snippet` explicite.
3. Implémenter les filtres dynamiques:
   - `artifactTypes` (FR-025),
   - `phase`, `agent`, `dateFrom/dateTo`, `gate`, `owner`, `riskLevel` (FR-026).
4. Résoudre les sources selon priorité contractuelle:
   - `searchIndex` injecté,
   - sinon `tableIndexResult` injecté,
   - sinon délégation S014 via `tableIndexInput`.
5. Propager strictement les blocages S014 (`ARTIFACT_*`, `ARTIFACT_SECTIONS_MISSING`, `ARTIFACT_TABLES_MISSING`).
6. Produire le contrat de sortie stable:
   `{ allowed, reasonCode, reason, diagnostics, results, appliedFilters, correctiveActions }`.
7. Ajouter/maintenir les tests S017 unit + edge + e2e avec coverage module >=95% lignes/branches et benchmark 500 docs.
8. Exporter S017 dans `app/src/index.js` (export S017 uniquement).

## Scope interdit (hors-scope)
- Toute évolution hors FR-025/FR-026 / S017.
- Toute implémentation complète des stories suivantes (ex: diff d’artefacts).
- Toute modification fonctionnelle S001..S014 non strictement nécessaire à l’intégration S017.
- Refactors transverses non requis par les AC S017.
- Toute exécution shell depuis les modules S017.

## Reason codes autorisés (strict)
`OK | ARTIFACT_PATH_NOT_ALLOWED | UNSUPPORTED_ARTIFACT_TYPE | ARTIFACT_READ_FAILED | ARTIFACT_PARSE_FAILED | ARTIFACT_METADATA_MISSING | ARTIFACT_METADATA_INVALID | ARTIFACT_SECTIONS_MISSING | ARTIFACT_TABLES_MISSING | INVALID_ARTIFACT_SEARCH_INPUT`

## Fichiers cibles autorisés (strict S017)
- `app/src/artifact-fulltext-search.js`
- `app/src/index.js` (export S017 uniquement)
- `app/tests/unit/artifact-fulltext-search.test.js`
- `app/tests/edge/artifact-fulltext-search.edge.test.js`
- `app/tests/e2e/artifact-fulltext-search.spec.js`
- `app/src/artifact-table-indexer.js` *(ajustement minimal uniquement si partage utilitaire sans changement comportement S014)*
- `_bmad-output/implementation-artifacts/stories/S017.md`
- `_bmad-output/implementation-artifacts/handoffs/S017-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S017-dev-to-tea.md`

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
- Non-régression S001..S014 prouvée (tests verts).
- Evidence gates techniques + UX fournie dans les handoffs DEV.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
