# H13 — PM → DEV — S022 (scope strict canonique E02-S10)

## Contexte
- **SID**: S022
- **Story canonique**: E02-S10 — Diagnostic parse-errors et recommandations
- **Epic**: E02
- **Dépendance story**: E02-S09 (S021)
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Runtime tick**: 2026-02-23 15:06 UTC
- **Sources validées (strict)**:
  - `_bmad-output/implementation-artifacts/stories/S022.md`
  - `_bmad-output/planning-artifacts/epics.md` (section Story E02-S10)
  - `_bmad-output/planning-artifacts/prd.md` (FR-030, FR-031, AC-030A/B, AC-031A/B, NFR-012, NFR-016)
  - `_bmad-output/planning-artifacts/architecture.md` (`projection.parse-errors.dashboard`, événement `artifact.parsed.failed`, DLQ obligatoire, retries bornés)

## Décision PM
**GO_DEV explicite — S022 uniquement.**

## Objectifs DEV (strict S022)
1. Implémenter `buildArtifactParseDiagnostics(input, options?)` dans `app/src/artifact-parse-diagnostics.js`.
2. Expliquer les parse-errors avec recommandations actionnables par artefact (FR-031).
3. Exploiter la sortie S021 (`stalenessResult`) ou déléguer via `stalenessInput` à `buildArtifactStalenessIndicator`, sans casser le contrat S021.
4. Intégrer la logique retry + DLQ dans le diagnostic (NFR-016) avec limites explicites (`maxRetries=3`).
5. Rendre visible l’impact fraîcheur/staleness dans le diagnostic de parsing (FR-030), sans réimplémenter S021.
6. Garantir un contrat de sortie stable:
   `{ allowed, reasonCode, reason, diagnostics, parseIssues, recommendations, dlqCandidates, correctiveActions }`.
7. Exporter S022 dans `app/src/index.js` (export S022 uniquement).

## AC canoniques (E02-S10) à satisfaire
1. **AC-01 / FR-030**: marquer explicitement la fraîcheur/staleness des vues dérivées.
2. **AC-02 / FR-031**: expliquer les erreurs de parsing avec recommandations de correction.
3. **AC-03 / NFR-012**: perte d’événement critique = 0 toléré.
4. **AC-04 / NFR-016**: retries bornés (max 3) + DLQ.

## AC d’exécution S022 (obligatoires)
- AC-01 nominal (aucun parse error): `allowed=true`, `reasonCode=OK`, `parseIssues=[]`.
- AC-02 parse-errors détectés: diagnostic détaillé par artefact (`errorType`, `errorLocation`, `parseStage`, `recommendedFix`).
- AC-03 résolution source:
  - `stalenessResult` injecté prioritaire,
  - sinon `stalenessInput` délégué à S021,
  - sinon erreur d’entrée.
- AC-04 propagation stricte blocages amont S021 (`ARTIFACT_*`, `INVALID_ARTIFACT_*`, `EVIDENCE_LINK_INCOMPLETE`, `DECISION_NOT_FOUND`, `INVALID_EVIDENCE_GRAPH_INPUT`, `ARTIFACT_STALENESS_DETECTED`, `PROJECTION_REBUILD_TIMEOUT`, `EVENT_LEDGER_GAP_DETECTED`, `INVALID_STALENESS_INPUT`).
- AC-05 retry policy: compteur retries par artefact, bloqué à 3 max; au-delà -> `PARSE_RETRY_LIMIT_REACHED` + `dlqCandidates`.
- AC-06 DLQ policy: erreur persistante -> `PARSE_DLQ_REQUIRED` + action corrective `MOVE_TO_PARSE_DLQ`.
- AC-07 lien staleness↔parse: chaque parse issue expose `stalenessContext` (`isStale`, `ageSeconds`, `stalenessLevel`) si disponible.
- AC-08 contrat stable + diagnostics complets (`artifactsChecked`, `parseErrorCount`, `retryScheduledCount`, `dlqCount`, `durationMs`, `p95ParseDiagMs`, `sourceReasonCode`).
- AC-09 e2e UI: états `empty/loading/success/error` + reason/counters/issues/recommendations/dlq/actions.
- AC-10 qualité/perf: couverture module >=95% lignes/branches; benchmark 500 docs (`p95ParseDiagMs <= 2000`, lot `< 60000ms`).

## Contraintes non négociables
- Scope strict **S022 uniquement**.
- Interdiction d’implémenter les tags/annotations de risques (scope **S023**).
- S021 reste la source de vérité sur staleness; S022 ne doit pas modifier son contrat public.
- Aucune exécution shell depuis les modules S022.
- Aucune dérive fonctionnelle S001..S021 hors ajustement minimal d’intégration.
- Story non-DONE tant que **G4-T** et **G4-UX** ne sont pas tous deux PASS.

## Reason codes autorisés (strict)
`OK | ARTIFACT_PATH_NOT_ALLOWED | UNSUPPORTED_ARTIFACT_TYPE | ARTIFACT_READ_FAILED | ARTIFACT_PARSE_FAILED | ARTIFACT_METADATA_MISSING | ARTIFACT_METADATA_INVALID | ARTIFACT_SECTIONS_MISSING | ARTIFACT_TABLES_MISSING | INVALID_ARTIFACT_SEARCH_INPUT | INVALID_ARTIFACT_CONTEXT_FILTER_INPUT | ARTIFACT_DIFF_NOT_ELIGIBLE | INVALID_ARTIFACT_DIFF_INPUT | EVIDENCE_LINK_INCOMPLETE | DECISION_NOT_FOUND | INVALID_EVIDENCE_GRAPH_INPUT | ARTIFACT_STALENESS_DETECTED | PROJECTION_REBUILD_TIMEOUT | EVENT_LEDGER_GAP_DETECTED | INVALID_STALENESS_INPUT | PARSE_RETRY_LIMIT_REACHED | PARSE_DLQ_REQUIRED | INVALID_PARSE_DIAGNOSTIC_INPUT`

## Plan d’implémentation DEV (séquencé)
1. **Contrat I/O S022**: validation stricte entrée, normalisation parse events et bornes retry.
2. **Résolution des sources**: consommer `stalenessResult` ou déléguer à S021 via `stalenessInput`.
3. **Diagnostic parse**: classifier erreurs (`syntax/frontmatter/schema/encoding`) + localisation + recommandations ciblées.
4. **Retry & DLQ**: appliquer stratégie max 3 retries + escalade DLQ.
5. **Contexte fraîcheur**: enrichir chaque issue parse avec signaux staleness (âge, niveau).
6. **Diagnostics/perf**: instrumenter p95 + durée lot + compteurs retry/DLQ.
7. **Tests**: compléter unit/edge/e2e S022 + non-régression intégration S021.
8. **Handoffs DEV**: publier preuves vers UXQA/TEA (`S022-dev-to-uxqa.md`, `S022-dev-to-tea.md`).

## Fichiers autorisés (strict S022)
- `app/src/artifact-parse-diagnostics.js`
- `app/src/index.js` (export S022 uniquement)
- `app/tests/unit/artifact-parse-diagnostics.test.js`
- `app/tests/edge/artifact-parse-diagnostics.edge.test.js`
- `app/tests/e2e/artifact-parse-diagnostics.spec.js`
- `app/src/artifact-staleness-indicator.js` *(ajustement minimal uniquement si partage utilitaire, sans changement fonctionnel S021)*
- `_bmad-output/implementation-artifacts/stories/S022.md`
- `_bmad-output/implementation-artifacts/handoffs/S022-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S022-dev-to-tea.md`

## Commandes de validation (obligatoires)
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit/artifact-parse-diagnostics.test.js tests/edge/artifact-parse-diagnostics.edge.test.js
npx playwright test tests/e2e/artifact-parse-diagnostics.spec.js
npm run test:coverage
npm run build && npm run security:deps
```

## Critères de validation de sortie DEV
- Mapping explicite **AC -> tests** dans story/handoffs DEV.
- Couverture module S022 >= 95% lignes + 95% branches.
- Seuils perf S022 respectés (`p95ParseDiagMs <= 2000`, lot < 60000ms, corpus 500 docs).
- Preuve de non-régression sur S021 + socle S001..S021.
- Preuves techniques + UX complètes pour passage DEV -> UXQA/TEA.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
