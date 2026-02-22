# H13 — PM → DEV — S007 (scope strict)

## Contexte
- **SID**: S007
- **Epic**: E01
- **Story source**: `_bmad-output/implementation-artifacts/stories/S007.md`
- **Index source**: `_bmad-output/implementation-artifacts/stories/STORIES_INDEX.md`
- **Objectif story**: exécution contrôlée des guards de phase avec simulation par défaut, propagation stricte des blocages S004, diagnostics actionnables.

## Vérification PM (entrées)
1. `S007.md` définit AC-01..AC-07, contraintes de sécurité, tests unit/edge/e2e, coverage >=95%.
2. `STORIES_INDEX.md` confirme `S007` en statut `TODO` (prêt pour prise en charge DEV H13).

## Décision PM
**GO_DEV explicite — S007 uniquement.**

## Scope DEV autorisé (strict S007)
1. Implémenter `orchestratePhaseGuards(input, options?)` dans `app/src/phase-guards-orchestrator.js`.
2. Réutiliser S004 comme garde d’entrée obligatoire (`validatePhasePrerequisites` ou injection `prerequisitesValidation`).
3. Planifier strictement (ordre fixe) :
   - `bash /root/.openclaw/workspace/bmad-total/scripts/phase13-sequence-guard.sh <phaseNumber>`
   - `bash /root/.openclaw/workspace/bmad-total/scripts/phase13-ultra-quality-check.sh <phaseNumber>`
4. Exécution contrôlée :
   - `simulate=true` par défaut (pas d’exécution réelle),
   - `simulate=false` via exécuteur injecté,
   - arrêt immédiat sur premier échec + `reasonCode=GUARD_EXECUTION_FAILED`.
5. Contrat de sortie stable : `{ allowed, reasonCode, reason, diagnostics, commands, results }`.
6. Tests S007 unit + edge + e2e, coverage module >=95% lignes+branches.

## Scope interdit (hors-scope)
- Toute évolution hors FR-006 / S007.
- Toute modification S001/S002/S003/S004 non strictement nécessaire à l’intégration S007.
- Refactors transverses non requis par AC S007.

## Reason codes autorisés (strict)
`OK | INVALID_PHASE | TRANSITION_NOT_ALLOWED | PHASE_NOTIFICATION_MISSING | PHASE_NOTIFICATION_SLA_EXCEEDED | PHASE_PREREQUISITES_MISSING | PHASE_PREREQUISITES_INCOMPLETE | INVALID_PHASE_PREREQUISITES | INVALID_GUARD_PHASE | GUARD_EXECUTION_FAILED`

## Fichiers cibles autorisés (strict S007)
- `app/src/phase-guards-orchestrator.js`
- `app/src/index.js` (export S007 uniquement)
- `app/tests/unit/phase-guards-orchestrator.test.js`
- `app/tests/edge/phase-guards-orchestrator.edge.test.js`
- `app/tests/e2e/phase-guards-orchestrator.spec.js`
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

## Handoff attendu après DEV
- DEV → UXQA (H14)
- DEV → TEA (H16)
