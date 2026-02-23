# H13 — PM → DEV — S020 (scope strict canonique E02-S08)

## Contexte
- **SID**: S020
- **Story canonique**: E02-S08 — Evidence graph décision↔preuve↔gate↔commande
- **Epic**: E02
- **Dépendance story**: E02-S07 (S019)
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Runtime tick**: 2026-02-23 12:21 UTC
- **Sources validées (strict)**:
  - `_bmad-output/implementation-artifacts/stories/S020.md`
  - `_bmad-output/planning-artifacts/epics.md` (section Story E02-S08)
  - `_bmad-output/planning-artifacts/prd.md` (FR-028, FR-029, AC-028A/B, AC-029A/B, NFR-004, NFR-006)
  - `_bmad-output/planning-artifacts/architecture.md` (`projection.evidence.graph`, `GET /api/v1/evidence/graph`, `GET /api/v1/evidence/decisions/{decisionId}`, modèle `DecisionRecord`/`EvidenceLink`)

## Décision PM
**GO_DEV explicite — S020 uniquement.**

## Objectifs DEV (strict S020)
1. Implémenter `buildArtifactEvidenceGraph(input, options?)` dans `app/src/artifact-evidence-graph.js`.
2. Construire un graph de provenance décision↔preuve↔gate↔commande exploitable en lecture (`nodes`, `edges`, `clusters`).
3. Exposer les backlinks FR-029 par décision (liste exhaustive des artefacts justifiant une décision).
4. Consommer la sortie S019 (`artifactDiffResult`) ou déléguer via `artifactDiffInput` à `diffArtifactVersions`, avec propagation stricte des blocages amont.
5. Détecter et remonter les preuves orphelines/non chaînables (`orphanEvidence`) avec actions correctives.
6. Garantir un contrat de sortie stable:
   `{ allowed, reasonCode, reason, diagnostics, graph, decisionBacklinks, orphanEvidence, correctiveActions }`.
7. Exporter S020 dans `app/src/index.js` (export S020 uniquement).

## AC canoniques (E02-S08) à satisfaire
1. **AC-01 / FR-028**: visualiser les liens entre artefacts, décisions, gates et commandes.
2. **AC-02 / FR-029**: lister tous les artefacts qui justifient une décision donnée.
3. **AC-03 / NFR-004**: p95 < 2s sur 500 docs.
4. **AC-04 / NFR-006**: rebuild/projection < 60s.

## AC d’exécution S020 (obligatoires)
- AC-01 nominal: graph construit (`allowed=true`, `reasonCode=OK`) avec nœuds/liaisons cohérents.
- AC-02 backlinks décision: `decisionBacklinks[decisionId]` retourne 100% des artefacts justificatifs sans doublon.
- AC-03 résolution source:
  - `artifactDiffResult` injecté prioritaire,
  - sinon `artifactDiffInput` délégué à S019,
  - sinon `graphEntries` direct,
  - sinon erreur d’entrée.
- AC-04 propagation stricte blocages amont S019 (`ARTIFACT_*`, `INVALID_ARTIFACT_SEARCH_INPUT`, `INVALID_ARTIFACT_CONTEXT_FILTER_INPUT`, `ARTIFACT_DIFF_NOT_ELIGIBLE`, `INVALID_ARTIFACT_DIFF_INPUT`).
- AC-05 données incomplètes/non corrélables -> `EVIDENCE_LINK_INCOMPLETE` + `orphanEvidence` + action corrective.
- AC-06 décision absente/unknown dans requête ciblée -> `DECISION_NOT_FOUND` avec message explicite.
- AC-07 ordonnancement déterministe des nœuds/edges/backlinks (tri stable, reproductible run-à-run).
- AC-08 contrat stable + diagnostics complets (`nodesCount`, `edgesCount`, `decisionsCount`, `backlinkedArtifactsCount`, `orphanCount`, `durationMs`, `p95GraphMs`, `sourceReasonCode`).
- AC-09 e2e UI: états `empty/loading/success/error` + reason/counters/backlinks/orphans/actions.
- AC-10 qualité/perf: couverture module >=95% lignes/branches; benchmark 500 docs (`p95GraphMs <= 2000`, lot `< 60000ms`).

## Contraintes non négociables
- Scope strict **S020 uniquement**.
- Interdiction d’implémenter l’indicateur de fraîcheur/staleness (scope **S021**).
- S019 reste la source de vérité du moteur diff; S020 ne doit pas casser son contrat public.
- Aucune exécution shell depuis les modules S020.
- Aucune dérive fonctionnelle S001..S019 hors ajustement minimal d’intégration.
- Story non-DONE tant que **G4-T** et **G4-UX** ne sont pas tous deux PASS.

## Reason codes autorisés (strict)
`OK | ARTIFACT_PATH_NOT_ALLOWED | UNSUPPORTED_ARTIFACT_TYPE | ARTIFACT_READ_FAILED | ARTIFACT_PARSE_FAILED | ARTIFACT_METADATA_MISSING | ARTIFACT_METADATA_INVALID | ARTIFACT_SECTIONS_MISSING | ARTIFACT_TABLES_MISSING | INVALID_ARTIFACT_SEARCH_INPUT | INVALID_ARTIFACT_CONTEXT_FILTER_INPUT | ARTIFACT_DIFF_NOT_ELIGIBLE | INVALID_ARTIFACT_DIFF_INPUT | EVIDENCE_LINK_INCOMPLETE | DECISION_NOT_FOUND | INVALID_EVIDENCE_GRAPH_INPUT`

## Plan d’implémentation DEV (séquencé)
1. **Contrat I/O S020**: validation d’entrée, normalisation IDs/types, garde-fous anti-null.
2. **Résolution des sources**: consommer `artifactDiffResult` ou déléguer à S019 via `artifactDiffInput`; fallback `graphEntries`.
3. **Construction graph**: générer `nodes`/`edges`/`clusters` décision↔preuve↔gate↔commande avec IDs stables.
4. **Backlinks décision**: agréger par `decisionId` la liste complète des artefacts justificatifs (FR-029).
5. **Orphelins & corrections**: détecter preuves non rattachées et produire `orphanEvidence` + actions.
6. **Diagnostics/perf**: instrumenter latence p95, compteurs de volume, sourceReasonCode.
7. **Tests**: compléter unit/edge/e2e S020 + non-régression d’intégration S019.
8. **Handoffs DEV**: publier preuves vers UXQA/TEA (`S020-dev-to-uxqa.md`, `S020-dev-to-tea.md`).

## Fichiers autorisés (strict S020)
- `app/src/artifact-evidence-graph.js`
- `app/src/index.js` (export S020 uniquement)
- `app/tests/unit/artifact-evidence-graph.test.js`
- `app/tests/edge/artifact-evidence-graph.edge.test.js`
- `app/tests/e2e/artifact-evidence-graph.spec.js`
- `app/src/artifact-version-diff.js` *(ajustement minimal uniquement si partage utilitaire, sans changement fonctionnel S019)*
- `_bmad-output/implementation-artifacts/stories/S020.md`
- `_bmad-output/implementation-artifacts/handoffs/S020-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S020-dev-to-tea.md`

## Commandes de validation (obligatoires)
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit/artifact-evidence-graph.test.js tests/edge/artifact-evidence-graph.edge.test.js
npx playwright test tests/e2e/artifact-evidence-graph.spec.js
npm run test:coverage
npm run build && npm run security:deps
```

## Critères de validation de sortie DEV
- Mapping explicite **AC -> tests** dans story/handoffs DEV.
- Couverture module S020 >= 95% lignes + 95% branches.
- Seuils perf S020 respectés (`p95GraphMs <= 2000`, lot < 60000ms, corpus 500 docs).
- Preuve de non-régression sur S019 + socle S001..S019.
- Preuves techniques + UX complètes pour passage DEV -> UXQA/TEA.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
