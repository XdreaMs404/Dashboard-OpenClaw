# H13 — PM → DEV — S024 (scope strict canonique E02-S12)

## Contexte
- **SID**: S024
- **Story canonique**: E02-S12 — Backfill historique + migration corpus existant
- **Epic**: E02
- **Dépendance story**: E02-S11 (S023)
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Runtime tick**: 2026-02-23 19:56 UTC
- **Sources validées (strict)**:
  - `_bmad-output/implementation-artifacts/stories/S024.md`
  - `_bmad-output/planning-artifacts/epics.md` (section Story E02-S12)
  - `_bmad-output/planning-artifacts/prd.md` (FR-032, FR-021, AC-032A/B, AC-021A/B, NFR-038, NFR-003)
  - `_bmad-output/planning-artifacts/architecture.md` (MIG-07 indexation artefacts historiques, projections artifact/evidence, idempotence ingestion, backpressure + DLQ)

## Décision PM
**GO_DEV explicite — S024 uniquement.**

## Objectifs DEV (strict S024)
1. Implémenter `runArtifactCorpusBackfill(input, options?)` dans `app/src/artifact-corpus-backfill.js`.
2. Exécuter un backfill historique idempotent des artefacts legacy vers le corpus canonique, en respectant strictement les roots autorisés (FR-021).
3. Réutiliser la sortie S023 (`riskAnnotationsResult`) ou déléguer via `riskAnnotationsInput` à `annotateArtifactRiskContext`, sans casser le contrat S023.
4. Migrer les tags/annotations de risques existants (FR-032) sans perte ni duplication, avec journal détaillé par lot.
5. Gérer le traitement par batches (`batchSize`) avec reprise sur checkpoint (`resumeToken`) pour éviter saturation ingestion (T03).
6. Garantir un contrat de sortie stable:
   `{ allowed, reasonCode, reason, diagnostics, migratedArtifacts, skippedArtifacts, failedArtifacts, migrationReport, correctiveActions }`.
7. Exporter S024 dans `app/src/index.js` (export S024 uniquement).

## AC canoniques (E02-S12) à satisfaire
1. **AC-01 / FR-032**: permettre tags de risque et annotations contextuelles sur artefacts après migration historique.
2. **AC-02 / FR-021**: ingérer les artefacts markdown/yaml des dossiers BMAD autorisés.
3. **AC-03 / NFR-038**: aucune rupture sur corpus de référence.
4. **AC-04 / NFR-003**: p95 < 5s (rafraîchissement delta / traitement lot).

## AC d’exécution S024 (obligatoires)
- AC-01 nominal: backfill complet -> `allowed=true`, `reasonCode=OK`, compteurs migration cohérents.
- AC-02 résolution source:
  - `riskAnnotationsResult` injecté prioritaire,
  - sinon `riskAnnotationsInput` délégué à S023,
  - sinon `legacyArtifacts` direct,
  - sinon erreur d’entrée.
- AC-03 propagation stricte blocages amont S023 (`ARTIFACT_*`, `INVALID_ARTIFACT_*`, `PARSE_RETRY_LIMIT_REACHED`, `PARSE_DLQ_REQUIRED`, `RISK_TAGS_MISSING`, `RISK_ANNOTATION_CONFLICT`, `INVALID_RISK_ANNOTATION_INPUT`).
- AC-04 allowlist stricte: artefact hors racines autorisées -> `ARTIFACT_PATH_NOT_ALLOWED` (aucune ingestion).
- AC-05 idempotence: re-run avec même input ne doit pas dupliquer les artefacts migrés (`dedupKey` stable path+hash).
- AC-06 reprise checkpoint: `resumeToken` reprend au bon offset sans retraiter les lots validés.
- AC-07 saturation file ingestion détectée -> `BACKFILL_QUEUE_SATURATED` + action corrective de throttling/retry.
- AC-08 lot invalide (payload/corpus) -> `INVALID_BACKFILL_INPUT` avec diagnostics exploitables.
- AC-09 contrat stable + diagnostics complets (`requestedCount`, `migratedCount`, `skippedCount`, `failedCount`, `batchCount`, `durationMs`, `p95BatchMs`, `sourceReasonCode`).
- AC-10 qualité/perf: couverture module >=95% lignes/branches; benchmark 500 docs (`p95BatchMs <= 5000`, lot total `< 60000ms`) + non-régression corpus (NFR-038).

## Contraintes non négociables
- Scope strict **S024 uniquement**.
- Interdiction d’implémenter les stories Epic E03+ (S025 et suivantes).
- S023 reste la source de vérité des tags/annotations; S024 ne doit pas modifier son contrat public.
- Aucune exécution shell depuis les modules S024.
- Aucune dérive fonctionnelle S001..S023 hors ajustement minimal d’intégration.
- Story non-DONE tant que **G4-T** et **G4-UX** ne sont pas tous deux PASS.

## Reason codes autorisés (strict)
`OK | ARTIFACT_PATH_NOT_ALLOWED | UNSUPPORTED_ARTIFACT_TYPE | ARTIFACT_READ_FAILED | ARTIFACT_PARSE_FAILED | ARTIFACT_METADATA_MISSING | ARTIFACT_METADATA_INVALID | ARTIFACT_SECTIONS_MISSING | ARTIFACT_TABLES_MISSING | INVALID_ARTIFACT_SEARCH_INPUT | INVALID_ARTIFACT_CONTEXT_FILTER_INPUT | ARTIFACT_DIFF_NOT_ELIGIBLE | INVALID_ARTIFACT_DIFF_INPUT | EVIDENCE_LINK_INCOMPLETE | DECISION_NOT_FOUND | INVALID_EVIDENCE_GRAPH_INPUT | ARTIFACT_STALENESS_DETECTED | PROJECTION_REBUILD_TIMEOUT | EVENT_LEDGER_GAP_DETECTED | INVALID_STALENESS_INPUT | PARSE_RETRY_LIMIT_REACHED | PARSE_DLQ_REQUIRED | INVALID_PARSE_DIAGNOSTIC_INPUT | RISK_TAGS_MISSING | RISK_ANNOTATION_CONFLICT | INVALID_RISK_ANNOTATION_INPUT | BACKFILL_QUEUE_SATURATED | BACKFILL_BATCH_FAILED | MIGRATION_CORPUS_INCOMPATIBLE | INVALID_BACKFILL_INPUT`

## Plan d’implémentation DEV (séquencé)
1. **Contrat I/O S024**: valider input, normaliser batches/checkpoint, bornes strictes (`batchSize`, `maxRetries`, `resumeToken`).
2. **Résolution des sources**: consommer `riskAnnotationsResult` ou déléguer à S023 via `riskAnnotationsInput`.
3. **Moteur backfill**: traitement par lots idempotents, mapping legacy -> canonique, dedup path+hash.
4. **Migration risque/annotations**: conserver `riskTags` + `contextAnnotations` pendant migration.
5. **Checkpoint/reprise**: produire `resumeToken` robuste et rejouable, sans retraitement des succès.
6. **Gestion incidents**: backpressure, saturation queue, retries bornés, DLQ candidats.
7. **Diagnostics/perf**: instrumenter p95 lot, compteurs migration/skips/failures, sourceReasonCode.
8. **Tests**: compléter unit/edge/e2e S024 + non-régression d’intégration S023.
9. **Handoffs DEV**: publier preuves vers UXQA/TEA (`S024-dev-to-uxqa.md`, `S024-dev-to-tea.md`).

## Fichiers autorisés (strict S024)
- `app/src/artifact-corpus-backfill.js`
- `app/src/index.js` (export S024 uniquement)
- `app/tests/unit/artifact-corpus-backfill.test.js`
- `app/tests/edge/artifact-corpus-backfill.edge.test.js`
- `app/tests/e2e/artifact-corpus-backfill.spec.js`
- `app/src/artifact-risk-annotations.js` *(ajustement minimal uniquement si partage utilitaire, sans changement fonctionnel S023)*
- `_bmad-output/implementation-artifacts/stories/S024.md`
- `_bmad-output/implementation-artifacts/handoffs/S024-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S024-dev-to-tea.md`

## Commandes de validation (obligatoires)
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit/artifact-corpus-backfill.test.js tests/edge/artifact-corpus-backfill.edge.test.js
npx playwright test tests/e2e/artifact-corpus-backfill.spec.js
npm run test:coverage
npm run build && npm run security:deps
```

## Critères de validation de sortie DEV
- Mapping explicite **AC -> tests** dans story/handoffs DEV.
- Couverture module S024 >= 95% lignes + 95% branches.
- Seuils perf S024 respectés (`p95BatchMs <= 5000`, lot total < 60000ms, corpus 500 docs).
- Preuve de non-régression sur S023 + socle S001..S023.
- Preuves techniques + UX complètes pour passage DEV -> UXQA/TEA.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
