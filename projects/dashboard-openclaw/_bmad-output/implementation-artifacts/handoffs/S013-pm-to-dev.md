# H13 — PM → DEV — S013 (scope strict)

## Contexte
- **SID**: S013
- **Epic**: E02
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Story source (SoT)**: `_bmad-output/implementation-artifacts/stories/S013.md`
- **Runtime tick**: 2026-02-22 07:39 UTC

## Entrées PM validées
- `_bmad-output/implementation-artifacts/stories/S013.md`
- `_bmad-output/planning-artifacts/prd.md` (FR-023, FR-024, AC-023A/B, AC-024A/B, NFR-006, NFR-012)
- `_bmad-output/planning-artifacts/architecture.md`
  - endpoint cible `GET /api/v1/artifacts/{artifactId}/sections`
  - projection cible `projection.artifact.sections`
  - événement cible `artifact.section.indexed`
- `_bmad-output/planning-artifacts/epics.md` (E02-S03)
- Dépendances validées: S011 (`ingestBmadArtifacts`) + S012 (`validateArtifactMetadataCompliance`)

## Vérification PM du cadrage S013
1. Story S013 complète, actionnable et traçable (FR/NFR/risques/AC/tests).
2. Alignement confirmé avec E02-S03: extraction H2/H3 + préparation indexation story suivante.
3. Périmètre DEV verrouillé en **scope strict S013 uniquement**.
4. Conditions de DONE rappelées: G4-T **et** G4-UX requis.

## Décision PM
**GO_DEV explicite — S013 uniquement.**

## Objectif strict S013
Implémenter l’extracteur de sections H2/H3 pour navigation structurée sur artefacts markdown conformes, avec contrat de sortie stable, diagnostics exploitables et préparation explicite de S014.

## Périmètre fichiers autorisés (strict S013)
- `app/src/artifact-section-extractor.js`
- `app/src/index.js` (export S013 uniquement)
- `app/tests/unit/artifact-section-extractor.test.js`
- `app/tests/edge/artifact-section-extractor.edge.test.js`
- `app/tests/e2e/artifact-section-extractor.spec.js`
- `app/src/artifact-metadata-validator.js` *(ajustement minimal uniquement si partage utilitaire sans changement comportement S012)*
- `_bmad-output/implementation-artifacts/stories/S013.md`
- `_bmad-output/implementation-artifacts/handoffs/S013-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S013-dev-to-tea.md`

## AC exécutables à satisfaire
- **AC-01** Extraction nominale H2/H3 -> `allowed:true`, `reasonCode:OK`.
- **AC-02** Ordonnancement/hiérarchie stable -> ancres déterministes + parentage H3.
- **AC-03** Sections manquantes -> `ARTIFACT_SECTIONS_MISSING` + action corrective.
- **AC-04** Garde-fou metadata S012 respecté -> blocage explicite si metadata invalide/manquante.
- **AC-05** Hors allowlist -> `ARTIFACT_PATH_NOT_ALLOWED`.
- **AC-06** Type non supporté -> `UNSUPPORTED_ARTIFACT_TYPE`.
- **AC-07** Parse invalide -> `ARTIFACT_PARSE_FAILED` sans crash lot.
- **AC-08** Contrat stable + `tableIndexEligible=true` pour préparation S014.
- **AC-09** E2E UI -> états `empty/loading/success/error` + reason/counters/actions.
- **AC-10** Qualité/perf -> couverture module >=95% lignes+branches; 500 docs (`p95<=2000ms`, lot `<60000ms`).

## Contrat de sortie attendu (stable)
`{ allowed, reasonCode, reason, diagnostics, extractedArtifacts, nonExtractedArtifacts, correctiveActions }`

Reason codes autorisés uniquement:
`OK | ARTIFACT_PATH_NOT_ALLOWED | UNSUPPORTED_ARTIFACT_TYPE | ARTIFACT_READ_FAILED | ARTIFACT_PARSE_FAILED | ARTIFACT_METADATA_MISSING | ARTIFACT_METADATA_INVALID | ARTIFACT_SECTIONS_MISSING | INVALID_SECTION_EXTRACTION_INPUT`

## Gates à lancer avant sortie DEV
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
2. Mapping AC -> tests explicite dans la story/handoff DEV.
3. Preuve coverage S013 (`artifact-section-extractor.js`) >=95% lignes + branches.
4. Preuve performance 500 docs (`p95ExtractionMs`, durée totale).
5. Preuve de non-régression S001..S012.
6. Liste des fichiers modifiés limitée au scope autorisé S013.

## Critère de succès H13
- Cadrage S013 non ambigu, exécutable immédiatement par DEV.
- Objectif FR-023/FR-024 borné, sans dérive hors scope.
- Handoff DEV prêt avec contraintes, AC, preuves et gates explicités.

## Handoff suivant attendu (DEV)
- DEV → UXQA (H14)
- DEV → TEA (H16)
