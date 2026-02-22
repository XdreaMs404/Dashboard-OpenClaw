# H13 — PM → DEV — S012 (scope strict)

## Contexte
- **SID**: S012
- **Epic**: E02
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Story source (SoT)**: `_bmad-output/implementation-artifacts/stories/S012.md`
- **Runtime tick**: 2026-02-21 23:18:00 UTC

## Entrées PM validées
- `_bmad-output/implementation-artifacts/stories/S012.md`
- `_bmad-output/planning-artifacts/prd.md` (FR-022, FR-023, AC-022A/B, AC-023A/B, NFR-004, NFR-006)
- `_bmad-output/planning-artifacts/architecture.md` (endpoint `/api/v1/artifacts/validate-metadata`, projection `artifact.metadata-compliance`)
- `_bmad-output/planning-artifacts/epics.md` (E02-S02)
- Dépendance technique S011 (`ingestBmadArtifacts`) confirmée comme socle existant

## Vérification PM du cadrage S012
1. Story S012 complète et actionnable: objectif, dépendances, traçabilité FR/NFR/risques, AC mesurables, cas de test obligatoires, contraintes explicites.
2. Alignement confirmé avec E02-S02: validation metadata explicite (`stepsCompleted`, `inputDocuments`) + préparation extraction structurée FR-023.
3. Périmètre DEV verrouillé: **scope strict S012 uniquement**, sans dérive vers autres stories.
4. Conditions de DONE rappelées: G4-T **et** G4-UX requis.

## Décision PM
**GO_DEV explicite — S012 uniquement.**

## Objectifs DEV (H13)
1. Implémenter `validateArtifactMetadataCompliance(input, options?)` dans `app/src/artifact-metadata-validator.js`.
2. Garantir validation stricte de `stepsCompleted` et `inputDocuments` (présence + format: tableaux non vides de chaînes non vides).
3. Conserver les garde-fous: allowlist stricte, extensions autorisées, parse robuste, erreurs localisées.
4. Produire un contrat de sortie stable:
   `{ allowed, reasonCode, reason, diagnostics, compliantArtifacts, nonCompliantArtifacts, correctiveActions }`.
5. Préparer FR-023 avec `compliantArtifacts[*].sectionExtractionEligible === true`.

## Acceptance Criteria à satisfaire (résumé exécutable)
- **AC-01** Nominal metadata valide -> `allowed:true`, `reasonCode:OK`, compteurs cohérents.
- **AC-02** Metadata manquante -> `ARTIFACT_METADATA_MISSING` + `missingFields` + `ADD_REQUIRED_METADATA`.
- **AC-03** Metadata invalide -> `ARTIFACT_METADATA_INVALID` + `metadataErrors` + `FIX_INVALID_METADATA`.
- **AC-04** Hors allowlist -> `ARTIFACT_PATH_NOT_ALLOWED`.
- **AC-05** Type non supporté -> `UNSUPPORTED_ARTIFACT_TYPE`.
- **AC-06** Parse invalide markdown/yaml -> `ARTIFACT_PARSE_FAILED` sans crash lot.
- **AC-07** Résolution des sources: `artifactDocuments` prioritaire, sinon `artifactPaths + options.documentReader`, sinon `INVALID_METADATA_VALIDATION_INPUT`.
- **AC-08** Contrat de sortie déterministe + diagnostics complets + `sectionExtractionEligible`.
- **AC-09** E2E UI: états `empty/loading/success/error` + reasonCode/reason/compteurs/actions.
- **AC-10** Couverture module >=95% lignes+branches; perf 500 docs: `p95 <= 2000ms`, lot `< 60000ms`.

## Contraintes non négociables
- Scope strict **S012** (aucune évolution fonctionnelle hors FR-022/FR-023).
- Aucune régression S001..S011.
- Aucune exécution shell dans les modules S012.
- Reason codes autorisés uniquement:
  `OK | ARTIFACT_PATH_NOT_ALLOWED | UNSUPPORTED_ARTIFACT_TYPE | ARTIFACT_READ_FAILED | ARTIFACT_PARSE_FAILED | ARTIFACT_METADATA_MISSING | ARTIFACT_METADATA_INVALID | INVALID_METADATA_VALIDATION_INPUT`.
- Story non-DONE tant que G4-T et G4-UX ne sont pas tous deux PASS.

## Fichiers cibles autorisés (strict S012)
- `app/src/artifact-metadata-validator.js`
- `app/src/index.js` (export S012 uniquement)
- `app/tests/unit/artifact-metadata-validator.test.js`
- `app/tests/edge/artifact-metadata-validator.edge.test.js`
- `app/tests/e2e/artifact-metadata-validator.spec.js`
- `app/src/artifact-ingestion-pipeline.js` *(ajustement minimal uniquement si nécessaire au partage utilitaire sans changement comportement S011)*
- `_bmad-output/implementation-artifacts/stories/S012.md`
- `_bmad-output/implementation-artifacts/handoffs/S012-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S012-dev-to-tea.md`

## Gates techniques à exécuter avant sortie DEV
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit tests/edge
npx playwright test tests/e2e
npm run test:coverage
npm run build && npm run security:deps
```

## Preuves attendues (obligatoires)
1. Logs complets des gates (lint/typecheck/unit/edge/e2e/coverage/build/security).
2. Mapping explicite AC -> tests dans la story/handoff DEV.
3. Preuve coverage S012 (`artifact-metadata-validator.js`) >=95% lignes + branches.
4. Preuve performance 500 docs (`p95ValidationMs`, durée totale).
5. Liste des fichiers modifiés limitée au scope S012.
6. Handoffs DEV -> UXQA et DEV -> TEA publiés avec statut prêt.

## Critères de succès H13
- Cadrage S012 complet, non ambigu, exécutable.
- GO_DEV explicite avec périmètre verrouillé.
- Critères de validation et preuves de sortie DEV clairement définis.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
