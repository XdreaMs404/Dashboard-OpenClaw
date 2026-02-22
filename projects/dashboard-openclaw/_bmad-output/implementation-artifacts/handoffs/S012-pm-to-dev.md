# H13 — PM → DEV — S012 (scope strict)

## Contexte
- **SID**: S012
- **Epic**: E02
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Story source (SoT)**: `_bmad-output/implementation-artifacts/stories/S012.md`
- **Entrées validées**:
  - `_bmad-output/implementation-artifacts/stories/S012.md`
  - `_bmad-output/planning-artifacts/epics.md` (E02-S02)
- **Objectif story**: livrer le validateur metadata `stepsCompleted` + `inputDocuments` pour sécuriser FR-022 et préparer FR-023.

## Vérification PM (entrées obligatoires)
1. `S012.md` est complète et actionnable: user story, traçabilité FR/NFR, AC mesurables, cas de test, contraintes, scope autorisé/interdit.
2. `S012.md` est en statut **READY_FOR_DEV**.
3. Alignement canonique confirmé avec `epics.md` story **E02-S02**:
   - FR ciblés: FR-022, FR-023
   - NFR ciblés: NFR-004, NFR-006
   - Risques: T02, T03
   - Dépendance: E02-S01 (S011 en implémentation locale)
4. Périmètre DEV verrouillé en **scope strict S012 uniquement**.

## Décision PM
**GO_DEV explicite — S012 uniquement.**

## Scope DEV autorisé (strict S012)
1. Implémenter `validateArtifactMetadataCompliance(input, options?)` dans `app/src/artifact-metadata-validator.js`.
2. Implémenter validation metadata obligatoire (`stepsCompleted`, `inputDocuments`) avec diagnostics explicites.
3. Résoudre les sources selon priorité contractuelle:
   - `artifactDocuments` injecté,
   - sinon `artifactPaths` + `options.documentReader`,
   - sinon `INVALID_METADATA_VALIDATION_INPUT`.
4. Produire un contrat de sortie stable:
   `{ allowed, reasonCode, reason, diagnostics, compliantArtifacts, nonCompliantArtifacts, correctiveActions }`.
5. Préparer explicitement S013 via `compliantArtifacts[*].sectionExtractionEligible=true`.
6. Ajouter/maintenir les tests S012 unit + edge + e2e avec coverage >=95% lignes/branches et benchmark 500 docs.
7. Exporter S012 dans `app/src/index.js` (export S012 uniquement).

## Scope interdit (hors-scope)
- Toute évolution hors FR-022/FR-023 / S012.
- Toute modification fonctionnelle S001..S011 non strictement nécessaire à l’intégration S012.
- Tout refactor transverse non requis par les AC S012.
- Toute exécution shell depuis les modules S012.

## Reason codes autorisés (strict)
`OK | ARTIFACT_PATH_NOT_ALLOWED | UNSUPPORTED_ARTIFACT_TYPE | ARTIFACT_READ_FAILED | ARTIFACT_PARSE_FAILED | ARTIFACT_METADATA_MISSING | ARTIFACT_METADATA_INVALID | INVALID_METADATA_VALIDATION_INPUT`

## Fichiers cibles autorisés (strict S012)
- `app/src/artifact-metadata-validator.js`
- `app/src/index.js` (export S012 uniquement)
- `app/tests/unit/artifact-metadata-validator.test.js`
- `app/tests/edge/artifact-metadata-validator.edge.test.js`
- `app/tests/e2e/artifact-metadata-validator.spec.js`
- `app/src/artifact-ingestion-pipeline.js` *(ajustement minimal uniquement si partage utilitaire sans changement comportement S011)*
- `_bmad-output/implementation-artifacts/stories/S012.md`
- `_bmad-output/implementation-artifacts/handoffs/S012-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S012-dev-to-tea.md`

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
- Non-régression S001..S011 prouvée (tests verts).
- Evidence gates techniques + UX fournie dans les handoffs DEV.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
