# H13 — PM → DEV — S018 (scope strict canonique E02-S06)

## Contexte
- **SID**: S018
- **Story canonique**: E02-S06 — Filtrage contextuel phase/agent/date/gate
- **Epic**: E02
- **Dépendance story**: E02-S05 (S017)
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Runtime tick**: 2026-02-23 08:31 UTC
- **Sources validées (strict)**:
  - `_bmad-output/implementation-artifacts/stories/S018.md`
  - `_bmad-output/planning-artifacts/epics.md` (section Story E02-S06)
  - `_bmad-output/planning-artifacts/prd.md` (FR-026, FR-027, AC-026A/B, AC-027A/B, NFR-003, NFR-038)
  - `_bmad-output/planning-artifacts/architecture.md` (`svc-search`, `GET /api/v1/artifacts/search`, `projection.artifact.search`)

## Décision PM
**GO_DEV explicite — S018 uniquement.**

## Objectifs DEV (strict S018)
1. Implémenter `applyArtifactContextFilters(input, options?)` dans `app/src/artifact-context-filter.js`.
2. Appliquer les filtres FR-026 en intersection stricte: `phase`, `agent`, `dateFrom/dateTo`, `gate`, `owner`, `riskLevel`.
3. Préparer FR-027 sans implémenter S019: produire des `diffCandidates` déterministes (`groupKey`, artefacts ordonnés, action `RUN_ARTIFACT_DIFF`).
4. Propager strictement les blocages amont S017/S016 sans réécriture des reason codes.
5. Garantir contrat de sortie stable et déterministe:
   `{ allowed, reasonCode, reason, diagnostics, filteredResults, appliedFilters, diffCandidates, correctiveActions }`.
6. Exporter S018 dans `app/src/index.js` (export S018 uniquement).

## AC canoniques (E02-S06) à satisfaire
1. **AC-01 / FR-026**: filtrage contextuel opérationnel (phase/agent/date/gate/owner/risque).
2. **AC-02 / FR-027**: comportement anti-contournement côté comparaison (préparation diff déterministe dans S018).
3. **AC-03 / NFR-038**: aucune rupture sur corpus de référence.
4. **AC-04 / NFR-003**: performance filtrage p95 < 5s.

## AC d’exécution S018 (obligatoires)
- AC-01 filtrage nominal `allowed=true`, `reasonCode=OK`, compteurs cohérents.
- AC-02 support complet des filtres FR-026 + `appliedFilters` normalisés.
- AC-03 tri stable (`score` desc puis `artifactPath`).
- AC-04 entrées invalides -> `INVALID_ARTIFACT_CONTEXT_FILTER_INPUT` sans exception non contrôlée.
- AC-05 résolution des sources: `searchResult` prioritaire, sinon `searchInput` (délégation S017), sinon erreur d’entrée.
- AC-06 propagation stricte blocages amont S017/S016.
- AC-07 `diffCandidates` déterministes + action `RUN_ARTIFACT_DIFF` quand éligible.
- AC-08 contrat de sortie stable + diagnostics complets (`requestedCount`, `filteredCount`, `filteredOutCount`, `diffCandidateGroupsCount`, `durationMs`, `p95FilterMs`, `sourceReasonCode`).
- AC-09 e2e UI: états `empty/loading/success/error` + reason/filters/counters/diff/actions.
- AC-10 qualité/perf: couverture module >=95% lignes/branches; benchmark 500 docs (`p95FilterMs <= 5000`, lot `< 60000ms`).

## Contraintes non négociables
- Scope strict **S018 uniquement**.
- Interdiction d’implémenter le moteur diff complet (scope **S019**).
- S017 reste la source de vérité du moteur full-text; S018 ne doit pas casser son contrat.
- Aucune exécution shell depuis les modules S018.
- Aucune dérive fonctionnelle S001..S017 hors ajustement minimal d’intégration.
- Story non-DONE tant que **G4-T** et **G4-UX** ne sont pas tous deux PASS.

## Reason codes autorisés (strict)
`OK | ARTIFACT_PATH_NOT_ALLOWED | UNSUPPORTED_ARTIFACT_TYPE | ARTIFACT_READ_FAILED | ARTIFACT_PARSE_FAILED | ARTIFACT_METADATA_MISSING | ARTIFACT_METADATA_INVALID | ARTIFACT_SECTIONS_MISSING | ARTIFACT_TABLES_MISSING | INVALID_ARTIFACT_SEARCH_INPUT | INVALID_ARTIFACT_CONTEXT_FILTER_INPUT`

## Plan d’implémentation DEV (séquencé)
1. **Contrat d’entrée/sortie**: verrouiller validation payload, normalisation filtres, pagination/date range.
2. **Pipeline de source**: consommer `searchResult` injecté ou déléguer à S017 via `searchInput`.
3. **Filtrage contextuel**: appliquer intersection stricte des filtres + diagnostics d’exclusion.
4. **Diff candidates**: regrouper candidats comparables de manière déterministe (sans calcul diff détaillé).
5. **Tests**: compléter unit/edge/e2e S018 pour AC-01..AC-10 + cas négatifs + non-régression.
6. **Handoffs DEV**: publier preuves dans `S018-dev-to-uxqa.md` et `S018-dev-to-tea.md`.

## Fichiers autorisés (strict S018)
- `app/src/artifact-context-filter.js`
- `app/src/index.js` (export S018 uniquement)
- `app/tests/unit/artifact-context-filter.test.js`
- `app/tests/edge/artifact-context-filter.edge.test.js`
- `app/tests/e2e/artifact-context-filter.spec.js`
- `app/src/artifact-fulltext-search.js` *(ajustement minimal uniquement si partage utilitaire, sans changement fonctionnel S017)*
- `_bmad-output/implementation-artifacts/stories/S018.md`
- `_bmad-output/implementation-artifacts/handoffs/S018-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S018-dev-to-tea.md`

## Commandes de validation (obligatoires)
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit/artifact-context-filter.test.js tests/edge/artifact-context-filter.edge.test.js
npx playwright test tests/e2e/artifact-context-filter.spec.js
npm run test:coverage
npm run build && npm run security:deps
```

## Critères de validation de sortie DEV
- Mapping explicite **AC -> tests** dans la story/handoffs DEV.
- Couverture module S018 >= 95% lignes + 95% branches.
- Seuils perf S018 respectés (p95 <= 5000ms; lot < 60000ms; corpus 500 docs).
- Non-régression démontrée sur S017 et socle S001..S017.
- Preuves techniques + UX complètes pour passage DEV -> UXQA/TEA.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
