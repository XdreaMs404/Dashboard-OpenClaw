# H13 — PM → DEV — S006 (scope strict)

## Contexte
- **SID**: S006
- **Story canonique**: E01-S06 — Orchestration sequence-guard depuis le cockpit
- **Epic**: E01
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Story source (SoT)**: `_bmad-output/implementation-artifacts/stories/S006.md`
- **Entrées de cadrage validées**:
  - `_bmad-output/planning-artifacts/prd.md`
  - `_bmad-output/planning-artifacts/architecture.md`
  - `_bmad-output/planning-artifacts/epics.md`
  - `_bmad-output/planning-artifacts/epics-index.md`

## Décision PM
**GO_DEV explicite — S006 uniquement.**

## AC canoniques à satisfaire (E01-S06)
1. **AC-01 / FR-006**: permettre l’exécution contrôlée des scripts `phase13-sequence-guard.sh` et `phase13-ultra-quality-check.sh`.
2. **AC-02 / FR-007**: conserver un historique consultable des transitions de phase et des verdicts associés.
3. **AC-03 / NFR-011**: fiabilité `>= 99.5%`.
4. **AC-04 / NFR-013**: audit command logs `>= 95%`.

## DoD canonique (obligatoire)
- DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
- DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
- DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
- DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
- DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
- DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.

## Risques ciblés
- **P01**: non-respect de l’ordre canonique H01→H23.
- **P02**: handoffs incomplets ou ambigus.

## Scope DEV autorisé (strict S006)
1. Implémenter/ajuster `orchestratePhaseGuards(input, options?)` dans `app/src/phase-guards-orchestrator.js`.
2. Maintenir un plan de commandes contrôlé pour les guards (`CMD-008`, `CMD-009`) avec mode `simulate` par défaut.
3. Bloquer l’exécution si prérequis S005 non satisfaits, avec propagation stricte des reason codes de blocage.
4. Conserver une sortie déterministe et exploitable pour la traçabilité FR-007 (`commands`, `results`, `diagnostics.failedCommand`).
5. Ajouter/adapter les tests S006 unit + edge + e2e.
6. Ajuster `app/src/index.js` uniquement si requis pour export S006.
7. Mettre à jour les handoffs DEV (`S006-dev-to-uxqa.md`, `S006-dev-to-tea.md`) avec preuves gates.

## Scope interdit (hors-scope)
- Toute évolution hors FR-006/FR-007 / S006.
- Toute modification fonctionnelle S001..S005 non strictement nécessaire à l’intégration S006.
- Tout refactor transverse non requis par les AC S006.
- Toute exécution de commandes non autorisées hors `CMD-008`/`CMD-009` dans le flux S006.

## Reason codes autorisés (strict)
`OK | INVALID_PHASE | TRANSITION_NOT_ALLOWED | PHASE_NOTIFICATION_MISSING | PHASE_NOTIFICATION_SLA_EXCEEDED | PHASE_PREREQUISITES_MISSING | PHASE_PREREQUISITES_INCOMPLETE | INVALID_PHASE_PREREQUISITES | INVALID_GUARD_PHASE | GUARD_EXECUTION_FAILED`

## Fichiers autorisés (strict S006)
- `app/src/phase-guards-orchestrator.js`
- `app/src/index.js` *(export S006 uniquement si requis)*
- `app/src/phase-prerequisites-validator.js` *(ajustement minimal uniquement si requis intégration S006)*
- `app/tests/unit/phase-guards-orchestrator.test.js`
- `app/tests/edge/phase-guards-orchestrator.edge.test.js`
- `app/tests/e2e/phase-guards-orchestrator.spec.js`
- `_bmad-output/implementation-artifacts/stories/S006.md`
- `_bmad-output/implementation-artifacts/handoffs/S006-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S006-dev-to-tea.md`

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
- AC-01..AC-04 satisfaits et traçables.
- Preuve de contrôle d’exécution guards sans contournement de prérequis.
- Preuve de traçabilité verdicts (`commands/results/failedCommand`) alignée FR-007.
- Preuve non-régression S001..S005.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
