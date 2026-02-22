# H13 — PM → DEV — S007 (scope strict)

## Contexte
- **SID**: S007
- **Story canonique**: E01-S07 — Orchestration ultra-quality-check depuis le cockpit
- **Epic**: E01
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Story SoT**: `_bmad-output/implementation-artifacts/stories/S007.md`
- **Entrées de cadrage validées**:
  - `_bmad-output/planning-artifacts/prd.md`
  - `_bmad-output/planning-artifacts/architecture.md`
  - `_bmad-output/planning-artifacts/epics.md`
  - `_bmad-output/planning-artifacts/epics-index.md`

## Décision PM
**GO_DEV explicite — S007 uniquement.**

## AC canoniques à satisfaire (E01-S07)
1. **AC-01 / FR-007**: conserver un historique consultable des transitions de phase et des verdicts associés.
2. **AC-02 / FR-008**: signaler les dépassements de SLA de transition et proposer une action corrective.
3. **AC-03 / NFR-013**: fiabilité des commandes autorisées `>= 95%`.
4. **AC-04 / NFR-017**: MTTA alerte critique `< 10 min`.

## DoD canonique (obligatoire)
- DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
- DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
- DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
- DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
- DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
- DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.

## Risques ciblés
- **P02**: handoffs incomplets ou ambigus.
- **P03**: notifications de phase manquantes.

## Scope DEV autorisé (strict S007)
1. Orchestrer le flux ultra-quality-check côté cockpit dans `app/src/phase-guards-orchestrator.js` avec contrôle strict du mode simulate/apply.
2. Garantir l’utilisation contrôlée des templates autorisés architecture (`CMD-008`, `CMD-009`) sans extension de catalogue.
3. Produire la traçabilité FR-007 via enregistrement/consultation de verdicts de transitions dans `app/src/phase-transition-history.js`.
4. Produire le signal d’alerte FR-008 (dépassement SLA + action corrective explicite) via `app/src/phase-sla-alert.js`.
5. Maintenir un contrat de sortie déterministe et reason codes bornés entre orchestration, historique et alertes.
6. Ajouter/adapter les tests unit + edge + e2e S007.
7. Ajuster l’export `app/src/index.js` uniquement si nécessaire pour S007.
8. Mettre à jour les handoffs DEV de preuve:
   - `_bmad-output/implementation-artifacts/handoffs/S007-dev-to-uxqa.md`
   - `_bmad-output/implementation-artifacts/handoffs/S007-dev-to-tea.md`

## Scope interdit (hors-scope)
- Toute évolution hors FR-007/FR-008 / S007.
- Toute modification fonctionnelle des stories S001..S006 et S008+ non strictement requise par S007.
- Tout refactor transverse non requis par les AC S007.
- Toute commande hors allowlist CMD-008/CMD-009 dans le flux orchestré S007.
- Toute altération des politiques globales RBAC/allowlist hors besoins stricts S007.

## Reason codes autorisés (strict)
`OK | INVALID_PHASE | TRANSITION_NOT_ALLOWED | PHASE_NOTIFICATION_MISSING | PHASE_NOTIFICATION_SLA_EXCEEDED | PHASE_PREREQUISITES_MISSING | PHASE_PREREQUISITES_INCOMPLETE | INVALID_PHASE_PREREQUISITES | INVALID_GUARD_PHASE | GUARD_EXECUTION_FAILED | INVALID_TRANSITION_HISTORY`

## Fichiers autorisés (strict S007)
- `app/src/phase-guards-orchestrator.js`
- `app/src/phase-transition-history.js`
- `app/src/phase-sla-alert.js`
- `app/src/index.js` *(export S007 uniquement si requis)*
- `app/tests/unit/phase-guards-orchestrator.test.js`
- `app/tests/edge/phase-guards-orchestrator.edge.test.js`
- `app/tests/e2e/phase-guards-orchestrator.spec.js`
- `app/tests/unit/phase-transition-history.test.js`
- `app/tests/edge/phase-transition-history.edge.test.js`
- `app/tests/e2e/phase-transition-history.spec.js`
- `app/tests/unit/phase-sla-alert.test.js`
- `app/tests/edge/phase-sla-alert.edge.test.js`
- `app/tests/e2e/phase-sla-alert.spec.js`
- `_bmad-output/implementation-artifacts/stories/S007.md`
- `_bmad-output/implementation-artifacts/handoffs/S007-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S007-dev-to-tea.md`

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
- Preuve FR-007: historique consultable et cohérent des verdicts de transitions.
- Preuve FR-008: alertes SLA explicites avec action corrective proposée.
- Preuve NFR-013/NFR-017 publiée (fiabilité commandes autorisées et réactivité alerting).

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
