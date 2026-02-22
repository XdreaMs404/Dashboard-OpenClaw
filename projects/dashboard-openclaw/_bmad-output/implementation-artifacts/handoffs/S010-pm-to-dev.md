# H13 — PM → DEV — S010 (scope strict canonique E01-S10)

## Contexte
- **SID**: S010
- **Story canonique**: E01-S10 — Carte dépendances inter-phases en temps réel
- **Epic**: E01
- **Dépendance story**: E01-S09
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Runtime tick (revalidation PM)**: 2026-02-22 17:48 UTC
- **Source de vérité (strict)**:
  - `_bmad-output/implementation-artifacts/stories/S010.md`

## Motif de réalignement
- Story réouverte pour réalignement canonique: `fr_missing:FR-001`.
- Obligation explicite: bloquer toute transition non canonique BMAD et proposer l’action corrective `ALIGN_PHASE_SEQUENCE`.

## Décision PM
**GO_DEV explicite — S010 uniquement.**

## AC canoniques à satisfaire (E01-S10)
1. **AC-01 / FR-010**: afficher les dépendances bloquantes inter-phases et leur état en temps réel.
2. **AC-02 / FR-001**: garantir la progression de phase selon l’ordre canonique BMAD H01→H23 (aucune dérive/contournement dans la matrice).
3. **AC-03 / NFR-040**: sortie actionnable et immédiatement exploitable (time-to-first-value < 14 jours).
4. **AC-04 / NFR-011**: fiabilité opérationnelle >= 99.5%.

## DoD canonique (obligatoire)
- **DoD-01**: tests unitaires + intégration + e2e verts (nominal + échecs critiques).
- **DoD-02**: contrôle sécurité (RBAC/allowlist/inputs) sans finding bloquant.
- **DoD-03**: preuve UX (states/a11y/responsive/microcopy) attachée si UI concernée.
- **DoD-04**: instrumentation métriques + alertes + runbook mis à jour.
- **DoD-05**: mapping FR/NFR/Risque + owner + échéance documentés et traçables.
- **DoD-06**: dépendances aval vérifiées, handoff sans ambiguïté.

## Risques ciblés
- **P07**: erreur de contexte multi-projets.
- **P01**: non-respect de l’ordre canonique H01→H23.

## Plan d’implémentation testable (strict S010)
1. Implémenter/ajuster `buildPhaseDependencyMatrix(input, options?)` pour exposer une matrice déterministe:
   - dépendances minimum: `TRANSITION`, `PREREQUISITES`, `OVERRIDE`, `FRESHNESS`;
   - `blockingDependencies` explicites;
   - owner visible dans diagnostics/messages.
2. Résoudre les sources selon priorité contractuelle:
   - `transitionValidation` injecté sinon `transitionInput` -> validator transition,
   - `prerequisitesValidation` injecté sinon `prerequisitesInput` -> validator prérequis,
   - `overrideEvaluation` injecté sinon `overrideInput` -> évaluateur override.
3. Préserver strictement FR-001:
   - toute transition hors ordre canonique BMAD doit rester `allowed=false`,
   - fournir `reasonCode` explicite et action `ALIGN_PHASE_SEQUENCE`.
4. Gérer la fraîcheur temps réel:
   - `maxRefreshIntervalMs` défaut 5000,
   - stale => `allowed=false`, `reasonCode=DEPENDENCY_STATE_STALE`, action `REFRESH_DEPENDENCY_MATRIX`.
5. Contrat de sortie stable:
   `{ allowed, reasonCode, reason, diagnostics, dependencies, blockingDependencies, correctiveActions }`.

## Scope DEV autorisé (strict S010)
- Implémentation S010 sur matrice dépendances inter-phases en temps réel.
- Ajustement minimal des exports publics S010.
- Tests unit/edge/e2e ciblés S010.
- Mise à jour des preuves S010 (story + handoffs dédiés).

## Scope interdit (hors-scope)
- Toute évolution hors FR-010/FR-001, NFR-040/NFR-011.
- Toute modification fonctionnelle des stories S001..S009 ou S011+ non strictement nécessaire.
- Tout refactor transverse non requis par S010.

## Reason codes attendus (strict)
`OK | INVALID_PHASE | TRANSITION_NOT_ALLOWED | PHASE_NOTIFICATION_MISSING | PHASE_NOTIFICATION_SLA_EXCEEDED | PHASE_PREREQUISITES_MISSING | PHASE_PREREQUISITES_INCOMPLETE | INVALID_PHASE_PREREQUISITES | OVERRIDE_NOT_ELIGIBLE | OVERRIDE_REQUEST_MISSING | OVERRIDE_JUSTIFICATION_REQUIRED | OVERRIDE_APPROVER_REQUIRED | OVERRIDE_APPROVER_CONFLICT | DEPENDENCY_STATE_STALE | INVALID_PHASE_DEPENDENCY_INPUT`

## Fichiers autorisés (strict S010)
- `app/src/phase-dependency-matrix.js`
- `app/src/index.js` *(export S010 uniquement si requis)*
- `app/tests/unit/phase-dependency-matrix.test.js`
- `app/tests/edge/phase-dependency-matrix.edge.test.js`
- `app/tests/e2e/phase-dependency-matrix.spec.js`
- `_bmad-output/implementation-artifacts/stories/S010.md`
- `_bmad-output/implementation-artifacts/handoffs/S010-pm-to-dev.md`
- `_bmad-output/implementation-artifacts/handoffs/S010-dev-to-uxqa-tea.md`
- `_bmad-output/implementation-artifacts/handoffs/S010-tech-gates.log`

## Contraintes UX/NFR
- États UI obligatoires: `empty`, `loading`, `error`, `success`.
- Blocages lisibles et actionnables (reason code + corrective actions explicites).
- Contrainte NFR-011: comportement déterministe, sans crash, fiabilité >= 99.5%.
- Contrainte NFR-040: sortie compréhensible rapidement pour opérateur PM/SM/Architect.

## Commandes de validation (avant DEV → UXQA/TEA)
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit tests/edge
npx playwright test tests/e2e
npm run test:coverage
npm run build && npm run security:deps
```

## Handoff suivant attendu
- DEV → UXQA + TEA (H14 + H16)
