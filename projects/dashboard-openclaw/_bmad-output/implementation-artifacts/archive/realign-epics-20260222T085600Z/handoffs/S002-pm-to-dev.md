# Handoff PM → DEV — S002

## Contexte
- SID: S002
- Story: `_bmad-output/implementation-artifacts/stories/S002.md`
- Objet: Validateur de transitions autorisées + blocage sans notification de phase.

## Décision PM
Story **prête pour flux implémentation** (scope clair, AC testables, cas de test obligatoires définis, gates listées).

## À implémenter
1. Module `app/src/phase-transition-validator.js` avec API `validatePhaseTransition(input)` et ordre canonique `H01→H23`.
2. Gestion des reason codes: `OK | INVALID_PHASE | TRANSITION_NOT_ALLOWED | PHASE_NOTIFICATION_MISSING | PHASE_NOTIFICATION_SLA_EXCEEDED`.
3. Contrat de sortie stable: `{ allowed, reasonCode, reason, diagnostics }`.
4. Tests unit/edge/e2e selon la story (dont frontière SLA et états UI empty/loading/error/success).
5. Maintenir non-régression sur fonctions existantes.

## Contraintes
- SLA notification par défaut: **10 min** (bloquant).
- Transition autorisée uniquement vers la phase suivante canonique.
- Ne modifier **aucune autre story**.

## Gates à passer avant handoff DEV→TEA
- `lint`, `typecheck`, `tests`, `coverage >= 95% (module)`, `build`, `security:deps`.

## Commandes minimales
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit tests/edge
npx playwright test tests/e2e
npm run test:coverage
npm run build && npm run security:deps
```
