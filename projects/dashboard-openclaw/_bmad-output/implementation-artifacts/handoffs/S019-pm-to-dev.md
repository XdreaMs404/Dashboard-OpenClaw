# H13 — PM → DEV — S019 (scope strict canonique E02-S07)

## Contexte
- **SID**: S019
- **Story canonique**: E02-S07 — Moteur diff version-vers-version d’artefacts
- **Epic**: E02
- **Dépendance story**: E02-S06 (S018)
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Runtime tick**: 2026-02-23 09:27 UTC
- **Sources validées (strict)**:
  - `_bmad-output/implementation-artifacts/stories/S019.md`
  - `_bmad-output/planning-artifacts/epics.md` (section Story E02-S07)
  - `_bmad-output/planning-artifacts/prd.md` (FR-027, FR-028, AC-027A/B, AC-028A/B, NFR-003, NFR-004)
  - `_bmad-output/planning-artifacts/architecture.md` (`artifact.diff.generated`, `projection.artifact.diffs`, `GET /api/v1/artifacts/{artifactId}/diff/{otherId}`)

## Décision PM
**GO_DEV explicite — S019 uniquement.**

## Objectifs DEV (strict S019)
1. Implémenter `diffArtifactVersions(input, options?)` dans `app/src/artifact-version-diff.js`.
2. Comparer deux versions d’un artefact de manière déterministe (version-vers-version) et produire un diff structuré lisible.
3. Consommer les candidats de diff issus de S018 (sans réimplémenter S018), avec propagation stricte des blocages amont.
4. Préparer FR-028 dans le scope S019 via une sortie de liens de provenance (`decision`, `gate`, `command`) attachés au diff, sans implémenter le graph complet S020.
5. Garantir un contrat de sortie stable:
   `{ allowed, reasonCode, reason, diagnostics, diffResults, unresolvedCandidates, provenanceLinks, correctiveActions }`.
6. Exporter S019 dans `app/src/index.js` (export S019 uniquement).

## AC canoniques (E02-S07) à satisfaire
1. **AC-01 / FR-027**: comparer deux versions d’un artefact et souligner les changements structurants.
2. **AC-02 / FR-028**: anti-contournement sur la traçabilité des liens artefact↔décision↔gate↔commande (préparation dans le scope S019).
3. **AC-03 / NFR-003**: p95 < 5s.
4. **AC-04 / NFR-004**: p95 < 2s sur corpus 500 docs.

## AC d’exécution S019 (obligatoires)
- AC-01 diff nominal sur paire valide -> `allowed=true`, `reasonCode=OK`, `diffResults` non vide.
- AC-02 résolution source prioritaire:
  - `contextFilterResult` injecté (S018) prioritaire,
  - sinon `contextFilterInput` délégué à `applyArtifactContextFilters`,
  - sinon `artifactPairs` direct,
  - sinon erreur d’entrée.
- AC-03 calcul des changements structurants déterministe: `metadata`, `sections`, `tables`, `contentSummary` (added/removed/changed).
- AC-04 tri stable des sorties (`groupKey`, `leftArtifactId`, `rightArtifactId`) reproductible sur deux runs identiques.
- AC-05 propagation stricte blocages amont (`ARTIFACT_*`, `INVALID_ARTIFACT_SEARCH_INPUT`, `INVALID_ARTIFACT_CONTEXT_FILTER_INPUT`) sans réécriture.
- AC-06 candidats non éligibles (<2 versions ou données inexploitables) -> `ARTIFACT_DIFF_NOT_ELIGIBLE` + `unresolvedCandidates` + actions correctives.
- AC-07 sortie provenance minimale FR-028: `provenanceLinks` avec `decisionRefs`, `gateRefs`, `commandRefs` agrégés depuis les versions comparées.
- AC-08 contrat de sortie stable + diagnostics complets (`requestedCandidatesCount`, `comparedPairsCount`, `unresolvedCount`, `durationMs`, `p95DiffMs`, `sourceReasonCode`).
- AC-09 e2e UI: états `empty/loading/success/error` + reason/counters/diff/provenance/actions.
- AC-10 qualité/perf: couverture module >=95% lignes/branches; benchmark 500 docs (`p95DiffMs <= 2000`, lot `< 60000ms`).

## Contraintes non négociables
- Scope strict **S019 uniquement**.
- Interdiction d’implémenter le graph de provenance complet (scope **S020**).
- S018 reste la source de vérité des `diffCandidates`; S019 ne doit pas modifier son contrat public.
- Aucune exécution shell depuis les modules S019.
- Aucune dérive fonctionnelle S001..S018 hors ajustement minimal d’intégration.
- Story non-DONE tant que **G4-T** et **G4-UX** ne sont pas tous deux PASS.

## Reason codes autorisés (strict)
`OK | ARTIFACT_PATH_NOT_ALLOWED | UNSUPPORTED_ARTIFACT_TYPE | ARTIFACT_READ_FAILED | ARTIFACT_PARSE_FAILED | ARTIFACT_METADATA_MISSING | ARTIFACT_METADATA_INVALID | ARTIFACT_SECTIONS_MISSING | ARTIFACT_TABLES_MISSING | INVALID_ARTIFACT_SEARCH_INPUT | INVALID_ARTIFACT_CONTEXT_FILTER_INPUT | ARTIFACT_DIFF_NOT_ELIGIBLE | INVALID_ARTIFACT_DIFF_INPUT`

## Plan d’implémentation DEV (séquencé)
1. **Contrat I/O S019**: validation d’entrée, normalisation des paires et des candidats, bornage des limites.
2. **Résolution des sources**: consommer `contextFilterResult` ou déléguer à S018 via `contextFilterInput`; supporter `artifactPairs` explicites.
3. **Moteur diff**: calcul structuré des deltas version-vers-version (metadata/sections/tables/contenu).
4. **Provenance minimale**: extraire/agréger `decisionRefs`, `gateRefs`, `commandRefs` par paire comparée.
5. **Diagnostics/perf**: instrumenter temps de traitement + percentile p95 + compteurs de résolution.
6. **Tests**: compléter unit/edge/e2e S019 + non-régression d’intégration avec S018.
7. **Handoffs DEV**: publier preuves vers UXQA/TEA (`S019-dev-to-uxqa.md`, `S019-dev-to-tea.md`).

## Fichiers autorisés (strict S019)
- `app/src/artifact-version-diff.js`
- `app/src/index.js` (export S019 uniquement)
- `app/tests/unit/artifact-version-diff.test.js`
- `app/tests/edge/artifact-version-diff.edge.test.js`
- `app/tests/e2e/artifact-version-diff.spec.js`
- `app/src/artifact-context-filter.js` *(ajustement minimal uniquement si partage utilitaire, sans changement fonctionnel S018)*
- `_bmad-output/implementation-artifacts/stories/S019.md`
- `_bmad-output/implementation-artifacts/handoffs/S019-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S019-dev-to-tea.md`

## Commandes de validation (obligatoires)
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit/artifact-version-diff.test.js tests/edge/artifact-version-diff.edge.test.js
npx playwright test tests/e2e/artifact-version-diff.spec.js
npm run test:coverage
npm run build && npm run security:deps
```

## Critères de validation de sortie DEV
- Mapping explicite **AC -> tests** dans story/handoffs DEV.
- Couverture module S019 >= 95% lignes + 95% branches.
- Seuils perf S019 respectés (`p95DiffMs <= 2000`, lot < 60000ms, corpus 500 docs).
- Preuve de non-régression sur S018 + socle S001..S018.
- Preuves techniques + UX complètes pour passage DEV -> UXQA/TEA.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
