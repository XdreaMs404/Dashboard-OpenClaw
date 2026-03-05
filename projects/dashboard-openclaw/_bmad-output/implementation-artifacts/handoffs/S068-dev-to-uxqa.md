# S068 — Handoff DEV → UXQA

## Story
- ID: S068
- Canonical story: E06-S08
- Epic: E06
- Phase cible: H14 (UX QA Audit)
- Statut DEV: READY_FOR_UX_AUDIT
- checkpoint_token: READY_FOR_UX_AUDIT

## Scope implémenté (strict S068)
- `app/src/ux-design-token-rogue-lint.js`
- `app/src/index.js`
- `app/tests/unit/ux-design-token-rogue-lint.test.js`
- `app/tests/edge/ux-design-token-rogue-lint.edge.test.js`
- `app/tests/e2e/ux-design-token-rogue-lint.spec.js`
- `implementation-artifacts/stories/S068.md` (commandes de test ciblées)

## Contrat livré
`buildUxDesignTokenRogueLint(payload, runtimeOptions)` retourne:
`{ allowed, reasonCode, reason, diagnostics, uxAudit, criticalWidgetStateContract, uxDebtReductionLane, contextualGlossaryIntegration, designTokenRogueLint, correctiveActions }`

## Couverture AC (FR/NFR)
- FR-070: lint anti-style rogue sur spacing/typo/couleurs avec allowlists design tokens.
- FR-063: contrôle 4 états `empty/loading/error/success` sur chaque vue critique.
- NFR-032: couverture responsive obligatoire mobile/tablette/desktop par vue critique.
- NFR-033: budget décision PER-01 <= 90s contrôlé et bloquant si dépassé.

## Vérifications DEV (preuves)
- `npx vitest run tests/unit/ux-design-token-rogue-lint.test.js tests/edge/ux-design-token-rogue-lint.edge.test.js` ✅
- `npx playwright test tests/e2e/ux-design-token-rogue-lint.spec.js` ✅
- `BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw bash /root/.openclaw/workspace/bmad-total/scripts/run-fast-quality-gates.sh S068` ✅

## États UX à auditer
- `empty`: aucune vue critique prête
- `loading`: audit lint en cours
- `error`: état manquant / style rogue / token non autorisé / budget dépassé
- `success`: lint token + 4 états + responsive + budget validés

## Next handoff
UXQA → DEV/TEA (H15)
