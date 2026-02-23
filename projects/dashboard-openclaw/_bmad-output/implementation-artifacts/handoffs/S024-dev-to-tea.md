# S024 — Handoff DEV → TEA

## Story
- ID: S024
- Epic: E02
- Statut DEV: READY_FOR_TEA

## Vérification scope strict S024
- Implémentation limitée à E02-S12 (backfill historique + migration corpus existant).
- S023 reste source de vérité amont pour tags/annotations (`annotateArtifactRiskContext`) ; contrat S023 inchangé.
- Contrat stable livré côté S024:
  `{ allowed, reasonCode, reason, diagnostics, migratedArtifacts, skippedArtifacts, failedArtifacts, migrationReport, correctiveActions }`.

## Fichiers touchés (S024)
- `app/src/artifact-corpus-backfill.js`
- `app/src/index.js` (export S024)
- `app/tests/unit/artifact-corpus-backfill.test.js`
- `app/tests/edge/artifact-corpus-backfill.edge.test.js`
- `app/tests/e2e/artifact-corpus-backfill.spec.js`
- `_bmad-output/implementation-artifacts/stories/S024.md`
- `_bmad-output/implementation-artifacts/handoffs/S024-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S024-dev-to-tea.md`

## Résumé technique
1. Résolution source stricte:
   - `riskAnnotationsResult` prioritaire
   - sinon délégation à S023 via `riskAnnotationsInput`
   - sinon `legacyArtifacts`
   - sinon `INVALID_BACKFILL_INPUT`
2. Propagation stricte des blocages amont autorisés (`ARTIFACT_*`, `INVALID_*`, `PARSE_*`, `RISK_*`).
3. Validation sécurité ingestion:
   - roots allowlist absolues
   - extensions autorisées (`.md/.markdown/.yaml/.yml` par défaut)
   - blocage `ARTIFACT_PATH_NOT_ALLOWED` / `UNSUPPORTED_ARTIFACT_TYPE`
4. Idempotence:
   - `dedupKey = artifactPath::hash` (hash fallback si `contentHash` absent)
   - doublons skip `DUPLICATE_ARTIFACT`
5. Reprise checkpoint:
   - support `resumeToken.nextOffset` + `processedDedupKeys`
   - skip explicite `RESUME_TOKEN_ALREADY_PROCESSED`
   - sortie `resumeToken.completed`
6. Gestion incidents:
   - saturation queue `BACKFILL_QUEUE_SATURATED`
   - incompatibilité corpus `MIGRATION_CORPUS_INCOMPATIBLE`
   - échec lot `BACKFILL_BATCH_FAILED` avec offset de reprise
7. Diagnostics complets:
   - `requestedCount`, `migratedCount`, `skippedCount`, `failedCount`, `batchCount`, `durationMs`, `p95BatchMs`, `sourceReasonCode`

## Vérifications DEV exécutées
- `npm run lint && npm run typecheck` ✅
- `npx vitest run tests/unit/artifact-corpus-backfill.test.js tests/edge/artifact-corpus-backfill.edge.test.js` ✅
- `npx playwright test tests/e2e/artifact-corpus-backfill.spec.js` ✅
- `npx vitest run tests/unit/artifact-corpus-backfill.test.js tests/edge/artifact-corpus-backfill.edge.test.js --coverage --coverage.include=src/artifact-corpus-backfill.js` ✅

## Couverture S024
- `app/src/artifact-corpus-backfill.js`:
  - **99.72% statements**
  - **98.22% branches**
  - **100% functions**
  - **99.71% lines**
- Seuil TEA attendu: >=95% lignes + >=95% branches ✅

## Mapping AC S024 -> tests
- AC-01..AC-10 (fonctionnel, edge, perf):
  - `tests/unit/artifact-corpus-backfill.test.js`
  - `tests/edge/artifact-corpus-backfill.edge.test.js`
- Preuve UX/e2e états:
  - `tests/e2e/artifact-corpus-backfill.spec.js`

## Points de contrôle demandés à TEA
1. Rejouer lint/typecheck + unit/edge/e2e S024.
2. Vérifier propagation stricte des reason codes amont S023.
3. Vérifier idempotence/reprise (`dedupKey`, `resumeToken`).
4. Vérifier reason codes S024 (`OK`, `INVALID_BACKFILL_INPUT`, `ARTIFACT_PATH_NOT_ALLOWED`, `UNSUPPORTED_ARTIFACT_TYPE`, `BACKFILL_QUEUE_SATURATED`, `MIGRATION_CORPUS_INCOMPATIBLE`, `BACKFILL_BATCH_FAILED`).
5. Confirmer perf/couverture module (`p95BatchMs <= 5000`, lot `< 60000ms`, coverage >=95/95).

## Next handoff
TEA → Reviewer (H17)
