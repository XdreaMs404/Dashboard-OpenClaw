# H13 — PM → DEV — S014 (scope strict)

## Contexte
- **SID**: S014
- **Epic**: E02
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Story source (SoT)**: `_bmad-output/implementation-artifacts/stories/S014.md`
- **Références planning**:
  - `_bmad-output/planning-artifacts/prd.md` (FR-024, FR-025, AC-024A/B, AC-025A/B, NFR-012, NFR-016)
  - `_bmad-output/planning-artifacts/architecture.md` (endpoint `GET /api/v1/artifacts/{artifactId}/tables`, projection `projection.artifact.tables`, event `artifact.table.indexed`)
  - `_bmad-output/planning-artifacts/epics.md` (E02-S04)
- **Runtime tick**: 2026-02-22 07:58 UTC

## Vérification PM (entrées obligatoires)
1. Story S014 cadrée, testable et traçable (FR/NFR/risques/AC/cas de test/contraintes).
2. Alignement confirmé avec E02-S04 : indexation tableaux markdown + schéma stable + préparation S015.
3. Dépendances verrouillées : S011 (ingestion), S012 (metadata), S013 (sections H2/H3).
4. Périmètre DEV verrouillé en **scope strict S014 uniquement**.

## Décision PM
**GO_DEV explicite — S014 uniquement.**

## Scope DEV autorisé (strict S014)
1. Implémenter `indexArtifactMarkdownTables(input, options?)` dans `app/src/artifact-table-indexer.js`.
2. Indexer les tableaux markdown d’artefacts conformes (`.md|.markdown`) avec schéma déterministe (`tableId`, rattachement section, `headers`, `rows`, `rowCount`, `columnCount`, `schemaVersion`, `extractedAt`).
3. Propager explicitement les garde-fous S012/S013 (`ARTIFACT_METADATA_*`, `ARTIFACT_SECTIONS_MISSING`) sans contournement silencieux.
4. Exposer la préparation S015 via `searchIndexEligible=true`, sans implémenter la recherche full-text dans S014.
5. Maintenir le contrat de sortie stable:
   `{ allowed, reasonCode, reason, diagnostics, indexedArtifacts, nonIndexedArtifacts, correctiveActions }`.
6. Ajouter/maintenir les tests S014 unit + edge + e2e, avec couverture >=95% lignes/branches et benchmark 500 docs conforme.
7. Exporter S014 dans `app/src/index.js` (export S014 uniquement).

## Acceptance Criteria (AC) à satisfaire
- **AC-01** Indexation nominale: lot markdown conforme -> `allowed=true`, `reasonCode=OK`, `indexedCount=requestedCount`.
- **AC-02** Schéma stable: `tableId`, rattachement section, `headers/rows/rowCount/columnCount`, `schemaVersion` déterministes.
- **AC-03** Absence de tableaux: `ARTIFACT_TABLES_MISSING` + `tableErrors` + `ADD_MARKDOWN_TABLES`.
- **AC-04** Garde-fous S012/S013: propagation explicite `ARTIFACT_METADATA_*` / `ARTIFACT_SECTIONS_MISSING`.
- **AC-05** Hors allowlist: `ARTIFACT_PATH_NOT_ALLOWED`.
- **AC-06** Type non supporté (`.md|.markdown` uniquement): `UNSUPPORTED_ARTIFACT_TYPE`.
- **AC-07** Parse invalide: `ARTIFACT_PARSE_FAILED` sans crash lot.
- **AC-08** Contrat de sortie stable + `searchIndexEligible=true` (préparation S015).
- **AC-09** E2E UI: états `empty/loading/success/error` + reason/counters/actions.
- **AC-10** Qualité/perf: couverture module >=95% lignes/branches; benchmark 500 docs (`p95<=2000ms`, lot `<60000ms`).

## Contrat de sortie attendu (stable)
`{ allowed, reasonCode, reason, diagnostics, indexedArtifacts, nonIndexedArtifacts, correctiveActions }`

Reason codes autorisés uniquement:
`OK | ARTIFACT_PATH_NOT_ALLOWED | UNSUPPORTED_ARTIFACT_TYPE | ARTIFACT_READ_FAILED | ARTIFACT_PARSE_FAILED | ARTIFACT_METADATA_MISSING | ARTIFACT_METADATA_INVALID | ARTIFACT_SECTIONS_MISSING | ARTIFACT_TABLES_MISSING | INVALID_TABLE_INDEX_INPUT`

## Fichiers cibles autorisés (strict S014)
- `app/src/artifact-table-indexer.js`
- `app/src/index.js` (export S014 uniquement)
- `app/tests/unit/artifact-table-indexer.test.js`
- `app/tests/edge/artifact-table-indexer.edge.test.js`
- `app/tests/e2e/artifact-table-indexer.spec.js`
- `app/src/artifact-section-extractor.js` *(ajustement minimal uniquement si partage utilitaire sans changement comportement S013)*
- `_bmad-output/implementation-artifacts/stories/S014.md`
- `_bmad-output/implementation-artifacts/handoffs/S014-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S014-dev-to-tea.md`

## Scope interdit (hors-scope)
- Toute implémentation complète de recherche full-text (scope S015).
- Toute évolution hors FR-024/FR-025 / S014.
- Toute modification fonctionnelle S001..S013 non strictement nécessaire à l’intégration S014.
- Tout refactor transverse non requis par les AC S014.

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
- Non-régression S001..S013 prouvée (tests verts).
- Evidence gates techniques + UX fournie dans les handoffs DEV.

## Preuves attendues (obligatoires)
1. Logs complets gates: lint/typecheck/unit/edge/e2e/coverage/build/security.
2. Mapping AC → tests explicite dans story/handoffs DEV.
3. Couverture S014 (`artifact-table-indexer.js`) >=95% lignes + branches.
4. Preuve performance 500 docs (`p95IndexMs`, durée totale).
5. Preuve de non-régression S001..S013.
6. Liste des fichiers modifiés strictement limitée au scope autorisé S014.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
