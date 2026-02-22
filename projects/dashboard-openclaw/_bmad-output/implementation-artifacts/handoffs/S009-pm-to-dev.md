# H13 — PM → DEV — S009 (scope strict canonique E01-S09)

## Contexte
- **SID**: S009
- **Story canonique**: E01-S09 — Workflow override exceptionnel avec approbateur
- **Epic**: E01
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Runtime tick**: 2026-02-22 15:03 UTC
- **Sources validées (strict)**:
  - `_bmad-output/implementation-artifacts/stories/S009.md`
  - `_bmad-output/planning-artifacts/epics.md` (section Story E01-S09)

## Décision PM
**GO_DEV explicite — S009 uniquement.**

## AC canoniques à satisfaire (source E01-S09)
1. **AC-01 / FR-009**: autoriser un override exceptionnel uniquement avec justification et approbateur.
2. **AC-02 / FR-010**: afficher les dépendances bloquantes inter-phases et leur état en temps réel.
3. **AC-03 / NFR-034**: métriques clés disponibles en continu.
4. **AC-04 / NFR-040**: time-to-first-value < 14 jours.

## DoD canonique (obligatoire)
- **DoD-01**: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
- **DoD-02**: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
- **DoD-03**: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
- **DoD-04**: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
- **DoD-05**: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
- **DoD-06**: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.

## Risques ciblés
- **P06**: contrôles ULTRA quality contournés.
- **P07**: erreur de contexte multi-projets.

## Plan d’implémentation testable (strict S009)
1. **Override exceptionnel FR-009**
   - Implémenter/ajuster `evaluatePhaseTransitionOverride(input, options?)` avec règles obligatoires:
     - `overrideRequest` requis en cas de blocage éligible,
     - justification minimale,
     - approbateur obligatoire,
     - approbateur distinct du demandeur (par défaut),
     - actions requises explicites (`CAPTURE_*`, `REVALIDATE_TRANSITION`, `RECORD_OVERRIDE_AUDIT`).
2. **Dépendances inter-phases FR-010**
   - Implémenter/ajuster `buildPhaseDependencyMatrix(input, options?)` pour exposer:
     - dépendances `TRANSITION`, `PREREQUISITES`, `OVERRIDE`, `FRESHNESS`,
     - `blockingDependencies` explicites,
     - état temps réel (`snapshotAgeMs`, `maxRefreshIntervalMs`, `isStale`).
3. **Observabilité NFR-034**
   - Diagnostics systématiques: `fromPhase`, `toPhase`, `owner`, `sourceReasonCode`, `blockedDependenciesCount`.
4. **Actionnabilité NFR-040**
   - Sorties et reason codes lisibles, orientés décision immédiate (éviter ambiguïté opérateur).

## Scope DEV autorisé (strict S009)
- Implémentation S009 uniquement sur override + matrice dépendances.
- Ajustement minimal des exports publics.
- Tests unit/edge/e2e ciblés S009.
- Mise à jour des preuves S009 (handoffs DEV).

## Scope interdit (hors-scope)
- Toute évolution hors FR-009/FR-010, NFR-034/NFR-040.
- Toute modification fonctionnelle des stories S001..S008 ou S010+ non strictement nécessaire.
- Tout refactor transverse non requis par S009.
- Toute exécution shell depuis les modules S009.

## Reason codes attendus (strict)
- Override: `OK | OVERRIDE_NOT_ELIGIBLE | OVERRIDE_REQUEST_MISSING | OVERRIDE_JUSTIFICATION_REQUIRED | OVERRIDE_APPROVER_REQUIRED | OVERRIDE_APPROVER_CONFLICT | INVALID_OVERRIDE_INPUT` + propagation des codes transition amont.
- Matrice dépendances: `OK | DEPENDENCY_STATE_STALE | INVALID_PHASE_DEPENDENCY_INPUT` + propagation blocages transition/prérequis/override.

## Fichiers autorisés (strict S009)
- `app/src/phase-transition-override.js`
- `app/src/phase-dependency-matrix.js`
- `app/src/index.js` *(export S009 uniquement si requis)*
- `app/tests/unit/phase-transition-override.test.js`
- `app/tests/edge/phase-transition-override.edge.test.js`
- `app/tests/e2e/phase-transition-override.spec.js`
- `app/tests/unit/phase-dependency-matrix.test.js`
- `app/tests/edge/phase-dependency-matrix.edge.test.js`
- `app/tests/e2e/phase-dependency-matrix.spec.js`
- `_bmad-output/implementation-artifacts/stories/S009.md`
- `_bmad-output/implementation-artifacts/handoffs/S009-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S009-dev-to-tea.md`

## Gates à exécuter avant sortie DEV
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit tests/edge
npx playwright test tests/e2e
npm run test:coverage
npm run build && npm run security:deps
```

## Critères de preuve attendus (UX / TEA)
### UX (H14)
- états `empty/loading/error/success` visibles pour override + dépendances,
- lisibilité des motifs de blocage et actions correctives,
- responsive/a11y sans régression.

### TEA (H16)
- logs complets des gates,
- mapping AC/DoD -> tests,
- couverture >= 95% lignes/branches pour modules S009,
- preuves de non-régression S001..S008.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
