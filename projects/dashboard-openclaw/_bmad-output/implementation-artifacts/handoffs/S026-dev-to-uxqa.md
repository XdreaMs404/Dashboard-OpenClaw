# S026 — Handoff DEV → UXQA

## Story
- ID: S026
- Epic: E03
- Phase cible: H14 (UX QA Audit)
- Statut DEV: READY_FOR_UX_AUDIT

## Scope implémenté (strict S026)
- `app/src/g4-dual-evaluation.js`
- `app/src/index.js` (export S026)
- `app/tests/unit/g4-dual-evaluation.test.js`
- `app/tests/edge/g4-dual-evaluation.edge.test.js`
- `app/tests/e2e/g4-dual-evaluation.spec.js`
- `_bmad-output/implementation-artifacts/stories/S026.md`
- `_bmad-output/implementation-artifacts/handoffs/S026-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S026-dev-to-tea.md`

## Evidence UX/UI disponible
- Démonstrateur e2e S026 couvrant les états UI: `empty`, `loading`, `error`, `success`.
- Vérification des éléments opérateur visibles:
  - `reasonCode`, `reason`
  - compteurs diagnostics (`g4t`, `g4ux`, `dual`, `mismatch`, `p95`, `sourceReasonCode`)
  - rendu des sous-gates `G4-T` / `G4-UX` (status, owner, evidence)
  - rendu `correlationMatrix` (cas matché `RULE-G4-01`)
  - `correctiveActions` (`SYNC_G4_SUBGATES`, `BLOCK_DONE_TRANSITION`, etc.)
- Cas UX couverts:
  - `INVALID_G4_DUAL_INPUT`
  - `GATE_STATUS_INCOMPLETE` (blocage amont S025 propagé)
  - `G4_SUBGATES_UNSYNC`
  - `OK` nominal
- Responsive mobile/tablette/desktop: test e2e sans overflow horizontal.

## Point d’attention UX
- Les états erreur doivent rester actionnables avec raison explicite et action corrective claire (`SYNC_G4_SUBGATES`, `BLOCK_DONE_TRANSITION`).
- La distinction visuelle entre `G4-T` et `G4-UX` est critique (pas de fusion implicite des sous-gates).

## Recheck rapide DEV (preuves)
- `npm run lint && npm run typecheck` ✅
- `npx vitest run tests/unit/g4-dual-evaluation.test.js tests/edge/g4-dual-evaluation.edge.test.js` ✅
- `npx playwright test tests/e2e/g4-dual-evaluation.spec.js` ✅
- `npx vitest run tests/unit/g4-dual-evaluation.test.js tests/edge/g4-dual-evaluation.edge.test.js --coverage --coverage.include=src/g4-dual-evaluation.js` ✅

## Points de focus demandés à UXQA
1. Validation lisibilité/hiérarchie de la corrélation duale G4 (`G4-T` vs `G4-UX`).
2. Validation microcopies et clarté des erreurs (`INVALID_G4_DUAL_INPUT`, `G4_SUBGATES_UNSYNC`, blocages amont propagés).
3. Validation accessibilité (`role=status`, `role=alert`, `aria-live`, focus retour bouton action).
4. Validation responsive mobile/tablette/desktop sans overflow horizontal.

## Next handoff
UXQA → DEV/TEA (H15)
