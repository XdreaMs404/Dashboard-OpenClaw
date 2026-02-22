# H13 — PM → DEV — S013 (scope strict)

## Contexte
- **SID**: S013
- **Epic**: E02
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Story source (SoT)**: `_bmad-output/implementation-artifacts/stories/S013.md`
- **Références planning**: `prd.md` (FR-021/FR-022), `architecture.md`, `epics.md` (E02-S01)
- **Runtime tick**: 2026-02-21 21:42 UTC

## Vérification PM du cadrage S013
1. Story S013 bien cadrée: objectif, dépendances, traçabilité FR/NFR/risques, AC mesurables, tests obligatoires, scope autorisé/interdit.
2. Alignement confirmé avec E02-S01 (`FR-021`, `FR-022`, `NFR-003`, `NFR-004`, risques `T01`, `T02`, `P02`).
3. Contrat technique explicite: pipeline d’ingestion allowlist + validation metadata minimale + reason codes stables.
4. Handoff DEV requis en **scope strict S013 uniquement**.

## Décision PM
**GO_DEV explicite — S013 uniquement.**

## Objectifs DEV (H13)
1. Implémenter `ingestBmadArtifacts(input, options?)` dans `app/src/artifact-ingestion-pipeline.js`.
2. Garantir ingestion sous allowlist stricte (`allowlistRoots`) et extensions autorisées (`.md`, `.markdown`, `.yaml`, `.yml`).
3. Valider metadata obligatoire (`stepsCompleted`, `inputDocuments`) pour artefacts majeurs.
4. Produire un résultat déterministe et stable:
   `{ allowed, reasonCode, reason, diagnostics, ingestedArtifacts, rejectedArtifacts, correctiveActions }`.
5. Livrer tests unit/edge/e2e + couverture/perf conformes aux seuils S013.

## Acceptance Criteria (AC) à satisfaire
- **AC-01** Nominal allowlist: lot valide → `allowed:true`, `reasonCode:OK`, compteurs cohérents.
- **AC-02** Hors allowlist: blocage `ARTIFACT_PATH_NOT_ALLOWED` + action corrective.
- **AC-03** Extension non supportée: `UNSUPPORTED_ARTIFACT_TYPE`.
- **AC-04** Metadata manquante: `ARTIFACT_METADATA_MISSING` + compteur metadata.
- **AC-05** Metadata invalide: `ARTIFACT_METADATA_INVALID` + erreurs de champs explicites.
- **AC-06** Parse invalide markdown/yaml: `ARTIFACT_PARSE_FAILED` sans crash global.
- **AC-07** Résolution des sources conforme (`artifactDocuments` prioritaire, sinon `artifactPaths` + reader, sinon erreur d’entrée).
- **AC-08** Contrat de sortie stable + reason codes autorisés uniquement.
- **AC-09** E2E UI: états `empty/loading/success/error` avec reason + compteurs + actions correctives.
- **AC-10** Qualité/performance: couverture module ≥95% lignes/branches, benchmark 500 docs (`p95 <= 2000ms`, lot `<5000ms`).

## Contraintes (non négociables)
- Scope strict **S013** (aucune évolution fonctionnelle hors FR-021/FR-022).
- Aucune régression S001..S010.
- Aucune exécution shell depuis le module S013.
- Sortie déterministe, reason codes stables:
  `OK | ARTIFACT_PATH_NOT_ALLOWED | UNSUPPORTED_ARTIFACT_TYPE | ARTIFACT_READ_FAILED | ARTIFACT_PARSE_FAILED | ARTIFACT_METADATA_MISSING | ARTIFACT_METADATA_INVALID | INVALID_ARTIFACT_INGESTION_INPUT`.
- Story **non DONE** tant que G4-T et G4-UX ne sont pas tous deux PASS.

## Fichiers cibles autorisés (strict S013)
- `app/src/artifact-ingestion-pipeline.js`
- `app/src/index.js` (export S013 uniquement)
- `app/tests/unit/artifact-ingestion-pipeline.test.js`
- `app/tests/edge/artifact-ingestion-pipeline.edge.test.js`
- `app/tests/e2e/artifact-ingestion-pipeline.spec.js`
- `_bmad-output/implementation-artifacts/stories/S013.md`
- `_bmad-output/implementation-artifacts/handoffs/S013-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S013-dev-to-tea.md`

## Critères de succès H13
- Tous les AC S013 sont couverts par des tests vérifiables.
- Lint, typecheck, tests unit/edge/e2e, coverage, build, security: **PASS**.
- Seuils de perf S013 respectés sur corpus 500 docs.
- Non-régression prouvée sur l’existant.
- Handoffs DEV→UXQA et DEV→TEA fournis avec preuves complètes.

## Preuves attendues (obligatoires)
1. **Logs d’exécution gates** (commandes + sorties): lint, typecheck, vitest (unit/edge), playwright e2e, coverage, build, security.
2. **Mapping AC → tests** explicite dans la story/handoff DEV.
3. **Preuve coverage S013**: pour `artifact-ingestion-pipeline.js`, lignes/branches ≥95% (valeurs exactes reportées).
4. **Preuve performance**: mesure benchmark 500 docs avec `p95IngestMs` et durée totale.
5. **Preuves UX (si UI touchée)**: états `empty/loading/error/success`, lisibilité reason code/compteurs/actions correctives.
6. **Preuve robustesse**: cas négatifs (hors allowlist, extension invalide, metadata manquante/invalide, parse failure, source absente).
7. **Liste des fichiers modifiés** limitée au périmètre autorisé S013.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
