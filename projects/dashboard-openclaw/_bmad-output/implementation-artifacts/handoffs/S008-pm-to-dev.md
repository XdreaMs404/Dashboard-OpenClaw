# H13 — PM → DEV — S008 (scope strict)

## Contexte
- **SID**: S008
- **Story canonique**: E01-S08 — Historique consultable des transitions
- **Epic**: E01
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Story SoT**: `_bmad-output/implementation-artifacts/stories/S008.md`
- **Entrées PM validées**:
  - `_bmad-output/implementation-artifacts/stories/S008.md`
  - `_bmad-output/planning-artifacts/epics.md`

## Décision PM
**GO_DEV explicite — S008 uniquement.**

## AC canoniques à satisfaire (E01-S08)
1. **AC-01 / FR-008**: signaler les dépassements de SLA de transition et proposer une action corrective.
2. **AC-02 / FR-009**: sur scénario négatif/abuse case, garantir qu’aucun contournement d’override exceptionnel n’est possible sans justification/approbateur traçables dans l’historique.
3. **AC-03 / NFR-017**: MTTA alerte critique `< 10 min`.
4. **AC-04 / NFR-034**: métriques clés disponibles en continu.

## DoD canonique (obligatoire)
- DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
- DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
- DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
- DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
- DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
- DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.

## Risques ciblés
- **P03**: notifications de phase manquantes.
- **P06**: contrôles ULTRA quality contournés.

## Scope DEV autorisé (strict S008)
1. Implémenter/ajuster l’historique consultable des transitions dans `app/src/phase-transition-history.js` (entrée, normalisation, tri, rétention, filtres consultables).
2. Implémenter/ajuster la logique d’alerte SLA et action corrective dans `app/src/phase-sla-alert.js` pour couvrir FR-008 et NFR-017.
3. Garantir la traçabilité des événements bloquants/exceptionnels (dont tentative override) dans les entrées d’historique, sans implémenter le workflow complet d’override.
4. Maintenir un contrat de sortie stable, déterministe et auditable pour historique + alerte SLA.
5. Ajouter/adapter les tests S008 unit + edge + e2e.
6. Ajuster l’export `app/src/index.js` uniquement si nécessaire pour exposition S008.
7. Produire les handoffs DEV de preuve:
   - `_bmad-output/implementation-artifacts/handoffs/S008-dev-to-uxqa.md`
   - `_bmad-output/implementation-artifacts/handoffs/S008-dev-to-tea.md`

## Scope interdit (hors-scope)
- Toute évolution hors FR-008/FR-009 / S008.
- Implémentation complète du workflow override exceptionnel (scope S009).
- Toute modification fonctionnelle des stories S001..S007 et S009+ non strictement nécessaire à S008.
- Tout refactor transverse non requis par les AC S008.
- Toute commande d’exécution non autorisée hors politiques existantes.

## Reason codes autorisés (strict)
`OK | INVALID_PHASE | TRANSITION_NOT_ALLOWED | PHASE_NOTIFICATION_MISSING | PHASE_NOTIFICATION_SLA_EXCEEDED | PHASE_PREREQUISITES_MISSING | PHASE_PREREQUISITES_INCOMPLETE | INVALID_PHASE_PREREQUISITES | INVALID_GUARD_PHASE | GUARD_EXECUTION_FAILED | INVALID_TRANSITION_HISTORY`

## Fichiers autorisés (strict S008)
- `app/src/phase-transition-history.js`
- `app/src/phase-sla-alert.js`
- `app/src/index.js` *(export S008 uniquement si requis)*
- `app/tests/unit/phase-transition-history.test.js`
- `app/tests/edge/phase-transition-history.edge.test.js`
- `app/tests/e2e/phase-transition-history.spec.js`
- `app/tests/unit/phase-sla-alert.test.js`
- `app/tests/edge/phase-sla-alert.edge.test.js`
- `app/tests/e2e/phase-sla-alert.spec.js`
- `_bmad-output/implementation-artifacts/stories/S008.md`
- `_bmad-output/implementation-artifacts/handoffs/S008-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S008-dev-to-tea.md`

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
- AC-01..AC-04 satisfaits et traçables dans les preuves DEV.
- Historique des transitions consultable, filtrable, et cohérent avec les verdicts de guard/SLA.
- Alertes SLA explicites avec proposition d’action corrective.
- Evidence gates techniques + UX prête pour revue.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
