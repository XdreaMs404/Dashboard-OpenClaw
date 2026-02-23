# H13 — PM → DEV — S023 (scope strict canonique E02-S11)

## Contexte
- **SID**: S023
- **Story canonique**: E02-S11 — Tags risques et annotations contextuelles
- **Epic**: E02
- **Dépendance story**: E02-S10 (S022)
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Runtime tick**: 2026-02-23 16:13 UTC
- **Sources validées (strict)**:
  - `_bmad-output/implementation-artifacts/stories/S023.md`
  - `_bmad-output/planning-artifacts/epics.md` (section Story E02-S11)
  - `_bmad-output/planning-artifacts/prd.md` (FR-031, FR-032, AC-031A/B, AC-032A/B, NFR-016, NFR-038)
  - `_bmad-output/planning-artifacts/architecture.md` (`projection.parse-errors.dashboard`, `projection.risk.register`, événements parse/ingestion, retries + DLQ)

## Décision PM
**GO_DEV explicite — S023 uniquement.**

## Objectifs DEV (strict S023)
1. Implémenter `annotateArtifactRiskContext(input, options?)` dans `app/src/artifact-risk-annotations.js`.
2. Produire des tags risques normalisés sur artefacts (`riskTags`) et annotations contextuelles actionnables (`contextAnnotations`) selon FR-032.
3. Réutiliser la sortie S022 (`parseDiagnosticsResult`) ou déléguer via `parseDiagnosticsInput` à `buildArtifactParseDiagnostics`, sans casser le contrat S022.
4. Conserver FR-031 dans S023: chaque annotation issue d’un parse error doit expliciter cause + recommandation + priorité.
5. Garantir un contrat de sortie stable:
   `{ allowed, reasonCode, reason, diagnostics, taggedArtifacts, contextAnnotations, riskTagCatalog, correctiveActions }`.
6. Exporter S023 dans `app/src/index.js` (export S023 uniquement).

## AC canoniques (E02-S11) à satisfaire
1. **AC-01 / FR-031**: expliquer les erreurs de parsing avec recommandations de correction.
2. **AC-02 / FR-032**: permettre tags de risque et annotations contextuelles sur artefacts.
3. **AC-03 / NFR-016**: retries bornés max 3 + DLQ.
4. **AC-04 / NFR-038**: aucune rupture sur corpus de référence.

## AC d’exécution S023 (obligatoires)
- AC-01 nominal: artefacts conformes -> `allowed=true`, `reasonCode=OK`, tags + annotations générés de façon déterministe.
- AC-02 résolution source:
  - `parseDiagnosticsResult` injecté prioritaire,
  - sinon `parseDiagnosticsInput` délégué à S022,
  - sinon erreur d’entrée.
- AC-03 propagation stricte blocages amont S022 (`ARTIFACT_*`, `INVALID_ARTIFACT_*`, `EVIDENCE_LINK_INCOMPLETE`, `DECISION_NOT_FOUND`, `INVALID_EVIDENCE_GRAPH_INPUT`, `ARTIFACT_STALENESS_DETECTED`, `PROJECTION_REBUILD_TIMEOUT`, `EVENT_LEDGER_GAP_DETECTED`, `INVALID_STALENESS_INPUT`, `PARSE_RETRY_LIMIT_REACHED`, `PARSE_DLQ_REQUIRED`, `INVALID_PARSE_DIAGNOSTIC_INPUT`).
- AC-04 mapping parse issue -> annotation: `errorType`, `parseStage`, `recommendedFix`, `severity`, `ownerHint`.
- AC-05 tags risques normalisés (`Txx/Pxx/...`) sans doublons, tri stable, et catalogue agrégé (`riskTagCatalog`) par fréquence.
- AC-06 artefact sans tag requis malgré issue critique -> `RISK_TAGS_MISSING` + corrective action explicite.
- AC-07 conflit de contexte (annotation incompatible avec tags calculés) -> `RISK_ANNOTATION_CONFLICT`.
- AC-08 contrat stable + diagnostics complets (`artifactsTaggedCount`, `annotationsCount`, `highRiskCount`, `retryLimitedCount`, `dlqCount`, `durationMs`, `p95TaggingMs`, `sourceReasonCode`).
- AC-09 e2e UI: états `empty/loading/success/error` + reason/counters/tags/annotations/actions.
- AC-10 qualité/perf: couverture module >=95% lignes/branches; benchmark 500 docs (`p95TaggingMs <= 2000`, lot `< 60000ms`) et non-régression corpus (NFR-038).

## Contraintes non négociables
- Scope strict **S023 uniquement**.
- Interdiction d’implémenter le backfill/migration corpus (scope **S024**).
- Interdiction d’implémenter le registre risques AQCD complet (scope Epic E05).
- S022 reste la source de vérité des parse diagnostics; S023 ne doit pas modifier son contrat public.
- Aucune exécution shell depuis les modules S023.
- Aucune dérive fonctionnelle S001..S022 hors ajustement minimal d’intégration.
- Story non-DONE tant que **G4-T** et **G4-UX** ne sont pas tous deux PASS.

## Reason codes autorisés (strict)
`OK | ARTIFACT_PATH_NOT_ALLOWED | UNSUPPORTED_ARTIFACT_TYPE | ARTIFACT_READ_FAILED | ARTIFACT_PARSE_FAILED | ARTIFACT_METADATA_MISSING | ARTIFACT_METADATA_INVALID | ARTIFACT_SECTIONS_MISSING | ARTIFACT_TABLES_MISSING | INVALID_ARTIFACT_SEARCH_INPUT | INVALID_ARTIFACT_CONTEXT_FILTER_INPUT | ARTIFACT_DIFF_NOT_ELIGIBLE | INVALID_ARTIFACT_DIFF_INPUT | EVIDENCE_LINK_INCOMPLETE | DECISION_NOT_FOUND | INVALID_EVIDENCE_GRAPH_INPUT | ARTIFACT_STALENESS_DETECTED | PROJECTION_REBUILD_TIMEOUT | EVENT_LEDGER_GAP_DETECTED | INVALID_STALENESS_INPUT | PARSE_RETRY_LIMIT_REACHED | PARSE_DLQ_REQUIRED | INVALID_PARSE_DIAGNOSTIC_INPUT | RISK_TAGS_MISSING | RISK_ANNOTATION_CONFLICT | INVALID_RISK_ANNOTATION_INPUT`

## Plan d’implémentation DEV (séquencé)
1. **Contrat I/O S023**: validation stricte entrée, normalisation tags/annotations, garde-fous anti-null.
2. **Résolution des sources**: consommer `parseDiagnosticsResult` ou déléguer à S022 via `parseDiagnosticsInput`.
3. **Moteur tagging**: calculer tags risques par artefact (dérivés parse/staleness/retry/DLQ) + sévérité.
4. **Annotations contextuelles**: générer annotations lisibles orientées correction (`what`, `why`, `nextAction`, `ownerHint`).
5. **Catalogue risques**: agréger tags globaux (`riskTagCatalog`) avec compteurs et priorités.
6. **Diagnostics/perf**: instrumenter p95 + durée lot + compteurs high-risk/retry/DLQ.
7. **Tests**: compléter unit/edge/e2e S023 + non-régression d’intégration S022.
8. **Handoffs DEV**: publier preuves vers UXQA/TEA (`S023-dev-to-uxqa.md`, `S023-dev-to-tea.md`).

## Fichiers autorisés (strict S023)
- `app/src/artifact-risk-annotations.js`
- `app/src/index.js` (export S023 uniquement)
- `app/tests/unit/artifact-risk-annotations.test.js`
- `app/tests/edge/artifact-risk-annotations.edge.test.js`
- `app/tests/e2e/artifact-risk-annotations.spec.js`
- `app/src/artifact-parse-diagnostics.js` *(ajustement minimal uniquement si partage utilitaire, sans changement fonctionnel S022)*
- `_bmad-output/implementation-artifacts/stories/S023.md`
- `_bmad-output/implementation-artifacts/handoffs/S023-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S023-dev-to-tea.md`

## Commandes de validation (obligatoires)
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit/artifact-risk-annotations.test.js tests/edge/artifact-risk-annotations.edge.test.js
npx playwright test tests/e2e/artifact-risk-annotations.spec.js
npm run test:coverage
npm run build && npm run security:deps
```

## Critères de validation de sortie DEV
- Mapping explicite **AC -> tests** dans story/handoffs DEV.
- Couverture module S023 >= 95% lignes + 95% branches.
- Seuils perf S023 respectés (`p95TaggingMs <= 2000`, lot < 60000ms, corpus 500 docs).
- Preuve de non-régression sur S022 + socle S001..S022.
- Preuves techniques + UX complètes pour passage DEV -> UXQA/TEA.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
