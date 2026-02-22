# H13 — PM → DEV — S007 (scope strict)

## Contexte
- **SID**: S007
- **Epic**: E01
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Story source**: `_bmad-output/implementation-artifacts/stories/S007.md`
- **Index source**: `_bmad-output/implementation-artifacts/stories/STORIES_INDEX.md`
- **Objectif story**: détecter les dépassements SLA de transition et produire un plan d’action corrective déterministe (FR-008), en continuité stricte avec S002 et S006.

## Vérification PM (entrées obligatoires)
1. `S007.md` est complète et actionnable: user story, dépendances, traçabilité FR/NFR, AC mesurables, cas de test, contraintes, quality/UX gates.
2. `S007.md` est en statut **READY_FOR_DEV**.
3. `STORIES_INDEX.md` maintient `S007` en `TODO` (story planifiée, prête pour prise en charge DEV en H13).
4. Continuité vérifiée sur le code existant `app/src` + tests S001..S006:
   - S002: `validatePhaseTransition` (reason codes SLA)
   - S006: `recordPhaseTransitionHistory` (historique read-only)
   - S001..S005: non-régression exigée.

## Décision PM
**GO_DEV explicite — S007 uniquement.**

## Scope DEV autorisé (strict S007)
1. Implémenter/ajuster `evaluatePhaseSlaAlert(input, options?)` dans `app/src/phase-sla-alert.js`.
2. Utiliser S002 comme source de vérité de validation transition:
   - priorité à `transitionValidation` injecté,
   - sinon délégation à `validatePhaseTransition` via `transitionInput`.
3. Consommer `history` (format S006) en lecture seule pour calcul de récurrence.
4. Produire un plan d’actions déterministe et ordonné:
   - `PUBLISH_PHASE_NOTIFY`
   - `REVALIDATE_TRANSITION`
   - `ESCALATE_TO_PM` (conditionnel, en 3e position)
5. Respecter les paramètres:
   - `lookbackMinutes` défaut 60
   - `escalationThreshold` défaut 2
6. Garantir le contrat de sortie stable:
   `{ allowed, reasonCode, reason, diagnostics, alert, correctiveActions }`.
7. Ajouter/maintenir les tests S007 unit + edge + e2e avec coverage module >=95% lignes+branches.
8. Exporter S007 dans `app/src/index.js` (export S007 uniquement).

## Scope interdit (hors-scope)
- Toute évolution hors FR-008 / S007.
- Toute modification métier S001..S006 non strictement nécessaire à l’intégration S007.
- Toute exécution shell depuis S007.
- Refactors transverses non requis par les AC S007.

## Reason codes autorisés (strict)
`OK | INVALID_PHASE | TRANSITION_NOT_ALLOWED | PHASE_NOTIFICATION_MISSING | PHASE_NOTIFICATION_SLA_EXCEEDED | INVALID_SLA_ALERT_INPUT`

## Fichiers cibles autorisés (strict S007)
- `app/src/phase-sla-alert.js`
- `app/src/index.js` (export S007 uniquement)
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
- AC-01..AC-08 couverts et vérifiables.
- Non-régression S001..S006 prouvée (tests verts).
- Evidence gates techniques + UX fournie dans les handoffs DEV.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
