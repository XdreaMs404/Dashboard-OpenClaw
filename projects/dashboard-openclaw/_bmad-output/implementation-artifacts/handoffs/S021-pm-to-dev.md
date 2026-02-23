# H13 — PM → DEV — S021 (scope strict canonique E02-S09)

## Contexte
- **SID**: S021
- **Story canonique**: E02-S09 — Indicateur de fraîcheur/staleness des vues
- **Epic**: E02
- **Dépendance story**: E02-S08 (S020)
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Runtime tick**: 2026-02-23 13:46 UTC
- **Sources validées (strict)**:
  - `_bmad-output/implementation-artifacts/stories/S021.md`
  - `_bmad-output/planning-artifacts/epics.md` (section Story E02-S09)
  - `_bmad-output/planning-artifacts/prd.md` (FR-029, FR-030, AC-029A/B, AC-030A/B, NFR-006, NFR-012)
  - `_bmad-output/planning-artifacts/architecture.md` (`projection.staleness.board`, événement `artifact.staleness.raised`, métrique `m_artifact_staleness_seconds`, principe stale-but-available)

## Décision PM
**GO_DEV explicite — S021 uniquement.**

## Objectifs DEV (strict S021)
1. Implémenter `buildArtifactStalenessIndicator(input, options?)` dans `app/src/artifact-staleness-indicator.js`.
2. Calculer la fraîcheur/staleness par artefact et au niveau vue globale (`ageSeconds`, `isStale`, `stalenessLevel`, `maxAgeSeconds`).
3. Exploiter la sortie S020 (`evidenceGraphResult`) ou déléguer via `evidenceGraphInput` à `buildArtifactEvidenceGraph`, sans casser le contrat S020.
4. Marquer explicitement FR-030 (stale/fresh) tout en supportant le mode **stale-but-available** côté lecture.
5. Couvrir FR-029 pour la vue décision: artefacts justificatifs enrichis avec leur état de fraîcheur.
6. Garantir un contrat de sortie stable:
   `{ allowed, reasonCode, reason, diagnostics, stalenessBoard, decisionFreshness, correctiveActions }`.
7. Exporter S021 dans `app/src/index.js` (export S021 uniquement).

## AC canoniques (E02-S09) à satisfaire
1. **AC-01 / FR-029**: lister les artefacts justificatifs d’une décision.
2. **AC-02 / FR-030**: marquer explicitement la fraîcheur/staleness des vues dérivées.
3. **AC-03 / NFR-006**: rebuild/projection < 60s.
4. **AC-04 / NFR-012**: 0 perte d’événement ledger tolérée.

## AC d’exécution S021 (obligatoires)
- AC-01 nominal (données fraîches): `allowed=true`, `reasonCode=OK`, indicateurs `isStale=false` cohérents.
- AC-02 stale détecté: `allowed=true`, `reasonCode=ARTIFACT_STALENESS_DETECTED`, badge/flag explicite + action corrective.
- AC-03 résolution source:
  - `evidenceGraphResult` injecté prioritaire,
  - sinon `evidenceGraphInput` délégué à S020,
  - sinon erreur d’entrée.
- AC-04 propagation stricte blocages amont S020 (`ARTIFACT_*`, `INVALID_ARTIFACT_*`, `EVIDENCE_LINK_INCOMPLETE`, `DECISION_NOT_FOUND`, `INVALID_EVIDENCE_GRAPH_INPUT`).
- AC-05 détection incohérence ledger (gap/séquence invalide) -> `EVENT_LEDGER_GAP_DETECTED` + correction explicite.
- AC-06 dépassement seuil rebuild (`rebuildDurationMs > 60000`) -> `PROJECTION_REBUILD_TIMEOUT` + action `REBUILD_STALENESS_PROJECTION`.
- AC-07 sortie décisionnelle FR-029: `decisionFreshness[decisionId]` contient artefacts justifiants + statut fraîcheur sans doublons.
- AC-08 contrat stable + diagnostics complets (`artifactsCount`, `staleCount`, `staleRatio`, `maxAgeSeconds`, `rebuildDurationMs`, `durationMs`, `p95StalenessMs`, `sourceReasonCode`).
- AC-09 e2e UI: états `empty/loading/success/error` + reason/counters/stale badges/actions.
- AC-10 qualité/perf: couverture module >=95% lignes/branches; benchmark 500 docs (`p95StalenessMs <= 2000`, lot `< 60000ms`).

## Contraintes non négociables
- Scope strict **S021 uniquement**.
- Interdiction d’implémenter le diagnostic parse-errors (scope **S022**).
- S020 reste la source de vérité du graph/backlinks; S021 ne doit pas modifier son contrat public.
- Aucune exécution shell depuis les modules S021.
- Aucune dérive fonctionnelle S001..S020 hors ajustement minimal d’intégration.
- Story non-DONE tant que **G4-T** et **G4-UX** ne sont pas tous deux PASS.

## Reason codes autorisés (strict)
`OK | ARTIFACT_PATH_NOT_ALLOWED | UNSUPPORTED_ARTIFACT_TYPE | ARTIFACT_READ_FAILED | ARTIFACT_PARSE_FAILED | ARTIFACT_METADATA_MISSING | ARTIFACT_METADATA_INVALID | ARTIFACT_SECTIONS_MISSING | ARTIFACT_TABLES_MISSING | INVALID_ARTIFACT_SEARCH_INPUT | INVALID_ARTIFACT_CONTEXT_FILTER_INPUT | ARTIFACT_DIFF_NOT_ELIGIBLE | INVALID_ARTIFACT_DIFF_INPUT | EVIDENCE_LINK_INCOMPLETE | DECISION_NOT_FOUND | INVALID_EVIDENCE_GRAPH_INPUT | ARTIFACT_STALENESS_DETECTED | PROJECTION_REBUILD_TIMEOUT | EVENT_LEDGER_GAP_DETECTED | INVALID_STALENESS_INPUT`

## Plan d’implémentation DEV (séquencé)
1. **Contrat I/O S021**: valider entrée, normaliser timestamps/TTL (`maxAgeSeconds`), bornes strictes.
2. **Résolution des sources**: consommer `evidenceGraphResult` ou déléguer à S020 via `evidenceGraphInput`.
3. **Calcul staleness board**: âge par artefact, ratio stale, worst-case age, niveaux de sévérité.
4. **Vue décisionnelle FR-029**: enrichir backlinks de décision avec statut fraîcheur par artefact.
5. **Détection incidents**: gap ledger + timeout rebuild + corrective actions actionnables.
6. **Diagnostics/perf**: instrumenter p95 + durée lot + compteurs staleness.
7. **Tests**: compléter unit/edge/e2e S021 + non-régression intégration S020.
8. **Handoffs DEV**: publier preuves vers UXQA/TEA (`S021-dev-to-uxqa.md`, `S021-dev-to-tea.md`).

## Fichiers autorisés (strict S021)
- `app/src/artifact-staleness-indicator.js`
- `app/src/index.js` (export S021 uniquement)
- `app/tests/unit/artifact-staleness-indicator.test.js`
- `app/tests/edge/artifact-staleness-indicator.edge.test.js`
- `app/tests/e2e/artifact-staleness-indicator.spec.js`
- `app/src/artifact-evidence-graph.js` *(ajustement minimal uniquement si partage utilitaire, sans changement fonctionnel S020)*
- `_bmad-output/implementation-artifacts/stories/S021.md`
- `_bmad-output/implementation-artifacts/handoffs/S021-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S021-dev-to-tea.md`

## Commandes de validation (obligatoires)
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit/artifact-staleness-indicator.test.js tests/edge/artifact-staleness-indicator.edge.test.js
npx playwright test tests/e2e/artifact-staleness-indicator.spec.js
npm run test:coverage
npm run build && npm run security:deps
```

## Critères de validation de sortie DEV
- Mapping explicite **AC -> tests** dans story/handoffs DEV.
- Couverture module S021 >= 95% lignes + 95% branches.
- Seuils perf S021 respectés (`p95StalenessMs <= 2000`, lot < 60000ms, corpus 500 docs).
- Preuve de non-régression sur S020 + socle S001..S020.
- Preuves techniques + UX complètes pour passage DEV -> UXQA/TEA.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
