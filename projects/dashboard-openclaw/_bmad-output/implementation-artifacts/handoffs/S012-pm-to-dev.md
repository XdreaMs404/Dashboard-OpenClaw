# H13 — PM → DEV — S012 (scope strict canonique E01-S12)

## Contexte
- **SID**: S012
- **Story canonique**: E01-S12 — Journal décisionnel de gouvernance phase/gate
- **Epic**: E01
- **Dépendance story**: E01-S11
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Runtime tick**: 2026-02-22 23:01 UTC
- **Sources validées (strict)**:
  - `_bmad-output/implementation-artifacts/stories/S012.md`
  - `_bmad-output/planning-artifacts/epics.md` (section Story E01-S12)
  - `_bmad-output/planning-artifacts/prd.md` (FR-002, FR-003, AC-002A/B, AC-003A/B, NFR-013, NFR-017)
  - `_bmad-output/planning-artifacts/architecture.md` (modèle `DecisionRecord`, flux `phase.*.transition.blocked`, endpoints workflow timeline/handoffs)

## Décision PM
**GO_DEV explicite — S012 uniquement.**

## AC canoniques à satisfaire (source E01-S12)
1. **AC-01 / FR-002**: empêcher toute transition non autorisée entre phases et afficher la raison du blocage.
2. **AC-02 / FR-003**: bloquer la transition si la notification de phase n’est pas publiée dans la fenêtre SLA.
3. **AC-03 / NFR-013**: taux de validation correcte >= 95%.
4. **AC-04 / NFR-017**: MTTA alerte critique < 10 min.

## DoD canonique (obligatoire)
- **DoD-01**: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
- **DoD-02**: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
- **DoD-03**: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
- **DoD-04**: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
- **DoD-05**: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
- **DoD-06**: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.

## Risques ciblés
- **P02**: handoffs incomplets ou ambigus.
- **P03**: notifications de phase manquantes.

## Plan d’implémentation testable (strict S012)
1. Implémenter `recordPhaseGateGovernanceDecision(input, options?)` dans `app/src/phase-gate-governance-journal.js`.
2. Réutiliser strictement la dépendance E01-S11 (sans réimplémenter ses règles):
   - `progressionAlert` injecté prioritaire;
   - sinon `progressionAlertInput` -> délégation à `evaluatePhaseProgressionAlert`.
3. Produire une entrée de journal décisionnel déterministe contenant au minimum:
   - `decisionId`, `decisionType`, `phaseFrom`, `phaseTo`, `gateId`, `owner`,
   - `allowed`, `reasonCode`, `reason`, `severity`, `decidedAt`,
   - `sourceReasonCode`, `correctiveActions`, `evidenceRefs`.
4. Exposer consultation du journal avec filtres (`phase`, `gate`, `owner`, `reasonCode`, `allowed`, `fromDate`, `toDate`) + tri décroissant stable + limite bornée.
5. Garantir propagation stricte des blocages FR-002/FR-003 (`TRANSITION_NOT_ALLOWED`, `PHASE_NOTIFICATION_MISSING`, `PHASE_NOTIFICATION_SLA_EXCEEDED`) avec owner + action corrective explicite.
6. Contrat de sortie stable attendu:
   `{ allowed, reasonCode, reason, diagnostics, decisionEntry, decisionHistory, correctiveActions }`.
7. Exporter S012 dans `app/src/index.js` (export S012 uniquement).

## Scope DEV autorisé (strict S012)
- Implémentation S012 du journal décisionnel phase/gate.
- Ajustement minimal des exports publics S012.
- Tests unit/edge/e2e ciblés S012.
- Mise à jour des preuves S012 (story + handoffs DEV).

## Scope interdit (hors-scope)
- Toute évolution hors FR-002/FR-003, NFR-013/NFR-017.
- Toute modification fonctionnelle des stories S001..S011 ou S013+ non strictement nécessaire.
- Tout refactor transverse non requis par S012.
- Toute exécution shell depuis les modules S012.
- Toute réintroduction de l’ancien scope S012 (metadata validator E02) interdit.

## Reason codes attendus (strict)
`OK | INVALID_PHASE | TRANSITION_NOT_ALLOWED | PHASE_NOTIFICATION_MISSING | PHASE_NOTIFICATION_SLA_EXCEEDED | PHASE_PREREQUISITES_MISSING | PHASE_PREREQUISITES_INCOMPLETE | INVALID_PHASE_PREREQUISITES | OVERRIDE_NOT_ELIGIBLE | OVERRIDE_REQUEST_MISSING | OVERRIDE_JUSTIFICATION_REQUIRED | OVERRIDE_APPROVER_REQUIRED | OVERRIDE_APPROVER_CONFLICT | DEPENDENCY_STATE_STALE | INVALID_PHASE_DEPENDENCY_INPUT | PHASE_SEQUENCE_GAP_DETECTED | PHASE_SEQUENCE_REGRESSION_DETECTED | REPEATED_BLOCKING_ANOMALY | INVALID_PHASE_PROGRESSION_INPUT | INVALID_GOVERNANCE_DECISION_INPUT`

## Fichiers autorisés (strict S012)
- `app/src/phase-gate-governance-journal.js`
- `app/src/index.js` *(export S012 uniquement si requis)*
- `app/tests/unit/phase-gate-governance-journal.test.js`
- `app/tests/edge/phase-gate-governance-journal.edge.test.js`
- `app/tests/e2e/phase-gate-governance-journal.spec.js`
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

## Critères de preuve attendus (UX / TEA)
### UX (H14)
- États `empty/loading/error/success` validés sur le journal décisionnel.
- Lisibilité opérateur: owner, reasonCode, reason, correctiveActions, timestamp.
- Responsive/a11y sans régression.

### TEA (H16)
- Logs complets des gates.
- Mapping AC/DoD -> tests.
- Couverture module S012 >= 95% lignes + branches.
- Preuve de non-régression S001..S011.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
