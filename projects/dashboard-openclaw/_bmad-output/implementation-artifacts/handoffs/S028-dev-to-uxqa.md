# S028 — Handoff DEV → UXQA

## Story
- ID: S028
- Epic: E03
- Phase cible: H14 (UX QA Audit)
- Statut DEV: READY_FOR_UX_AUDIT

## Scope implémenté (strict S028)
- `app/src/done-transition-guard.js`
- `app/src/index.js` (export S028)
- `app/tests/unit/done-transition-guard.test.js`
- `app/tests/edge/done-transition-guard.edge.test.js`
- `app/tests/e2e/done-transition-guard.spec.js`
- `_bmad-output/implementation-artifacts/stories/S028.md`
- `_bmad-output/implementation-artifacts/handoffs/S028-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S028-dev-to-tea.md`

## Evidence UX/UI disponible
- Démonstrateur e2e S028 couvrant les états UI: `empty`, `loading`, `error`, `success`.
- Vérification des éléments opérateur visibles:
  - `reasonCode`, `reason`
  - compteurs diagnostics (`targetState`, `verdict`, `canMarkDone`, `g4t`, `g4ux`, `evidenceCount`, `p95`, `sourceReasonCode`)
  - synthèse `doneTransition` (`blocked`, `blockingReasons`, sous-gates)
  - `correctiveActions`
- Cas UX couverts:
  - `INVALID_DONE_TRANSITION_INPUT`
  - blocage amont `G4_SUBGATES_UNSYNC`
  - `EVIDENCE_CHAIN_INCOMPLETE`
  - `OK` nominal
- Responsive mobile/tablette/desktop: test e2e sans overflow horizontal.

## Point d’attention UX
- Vérifier lisibilité immédiate du signal blocant DONE (`DONE_TRANSITION_BLOCKED` / `EVIDENCE_CHAIN_INCOMPLETE`).
- Vérifier compréhension microcopies sur causes de blocage (`Verdict`, `sous-gates`, `canMarkDone`, `preuve manquante`).
- Vérifier accessibilité `role=status`, `role=alert`, `aria-live`, focus retour bouton.

## Recheck rapide DEV (preuves)
- `npm run lint && npm run typecheck` ✅
- `npx vitest run tests/unit/done-transition-guard.test.js tests/edge/done-transition-guard.edge.test.js` ✅
- `npx playwright test tests/e2e/done-transition-guard.spec.js` ✅

## Next handoff
UXQA → DEV/TEA (H15)
