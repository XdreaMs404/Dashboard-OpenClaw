# H13 — PM → DEV — S009 (scope strict)

## Contexte
- **SID**: S009
- **Epic**: E01
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Story source**: `_bmad-output/implementation-artifacts/stories/S009.md`
- **Index source**: `_bmad-output/implementation-artifacts/stories/STORIES_INDEX.md`
- **Objectif story**: autoriser un override exceptionnel de transition uniquement avec justification explicite et approbateur nominatif (FR-009), en continuité stricte avec S002/S007.

## Vérification PM (entrées obligatoires)
1. `S009.md` est complète et actionnable: user story, dépendances, traçabilité FR/NFR, AC mesurables, cas de test, contraintes, quality/UX gates.
2. `S009.md` est en statut **READY_FOR_DEV**.
3. `STORIES_INDEX.md` maintient `S009` en `TODO` (story planifiée, prête pour prise en charge DEV en H13).
4. Continuité vérifiée sur le code existant `app/src` + tests S001..S007:
   - S002: `validatePhaseTransition` (source de vérité transitions)
   - S007: `evaluatePhaseSlaAlert` (contexte incident SLA)
   - S001..S006: non-régression exigée.

## Décision PM
**GO_DEV explicite — S009 uniquement.**

## Scope DEV autorisé (strict S009)
1. Implémenter `evaluatePhaseTransitionOverride(input, options?)` dans `app/src/phase-transition-override.js`.
2. Utiliser S002 comme source de vérité de transition:
   - priorité à `transitionValidation` injecté,
   - sinon délégation à `validatePhaseTransition` via `transitionInput`.
3. Implémenter la politique d’override exceptionnel:
   - motifs éligibles: `TRANSITION_NOT_ALLOWED`, `PHASE_NOTIFICATION_MISSING`, `PHASE_NOTIFICATION_SLA_EXCEEDED`
   - justification obligatoire (seuil minimal configurable, défaut 20)
   - approbateur nominatif obligatoire
   - approbateur distinct du demandeur (par défaut)
4. Produire un résultat stable avec actions ordonnées:
   - `CAPTURE_JUSTIFICATION`, `CAPTURE_APPROVER` (si demande incomplète)
   - `REVALIDATE_TRANSITION`, `RECORD_OVERRIDE_AUDIT` (si override approuvé)
5. Garantir le contrat de sortie stable:
   `{ allowed, reasonCode, reason, diagnostics, override, requiredActions }`.
6. Ajouter/maintenir les tests S009 unit + edge + e2e avec coverage module >=95% lignes+branches.
7. Exporter S009 dans `app/src/index.js` (export S009 uniquement).

## Scope interdit (hors-scope)
- Toute évolution hors FR-009 / S009.
- Toute modification métier S001..S007 non strictement nécessaire à l’intégration S009.
- Toute exécution shell depuis S009.
- Refactors transverses non requis par les AC S009.

## Reason codes autorisés (strict)
`OK | INVALID_PHASE | TRANSITION_NOT_ALLOWED | PHASE_NOTIFICATION_MISSING | PHASE_NOTIFICATION_SLA_EXCEEDED | OVERRIDE_NOT_ELIGIBLE | OVERRIDE_REQUEST_MISSING | OVERRIDE_JUSTIFICATION_REQUIRED | OVERRIDE_APPROVER_REQUIRED | OVERRIDE_APPROVER_CONFLICT | INVALID_OVERRIDE_INPUT`

## Fichiers cibles autorisés (strict S009)
- `app/src/phase-transition-override.js`
- `app/src/index.js` (export S009 uniquement)
- `app/tests/unit/phase-transition-override.test.js`
- `app/tests/edge/phase-transition-override.edge.test.js`
- `app/tests/e2e/phase-transition-override.spec.js`
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

## Critère de succès H13
- AC-01..AC-09 couverts et vérifiables.
- Non-régression S001..S007 prouvée (tests verts).
- Evidence gates techniques + UX fournie dans les handoffs DEV.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
