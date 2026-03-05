# S070 — Handoff DEV → TEA

## Story
- ID: S070
- Canonical story: E06-S10
- Epic: E06
- Statut DEV: READY_FOR_TEA
- checkpoint_token: READY_FOR_TEA

## Scope implémenté (strict S070)
- `app/src/ux-motion-preference-contract.js`
- `app/src/index.js`
- `app/tests/unit/ux-motion-preference-contract.test.js`
- `app/tests/edge/ux-motion-preference-contract.edge.test.js`
- `app/tests/e2e/ux-motion-preference-contract.spec.js`

## Contrat principal
`buildUxMotionPreferenceContract(payload, runtimeOptions)`

Sortie stable:
`{ allowed, reasonCode, reason, diagnostics, uxAudit, criticalWidgetStateContract, uxDebtReductionLane, contextualGlossaryIntegration, designTokenRogueLint, verdictMicrocopyCatalog, motionPreferenceContract, correctiveActions }`

Contrôles bloquants S070:
- `UX_MOTION_REQUIRED_MODE_MISSING`
- `UX_MOTION_REDUCED_MODE_NON_COMPLIANT`
- `UX_MOTION_KEYBOARD_ACCESS_REQUIRED`
- `UX_MOTION_CONTRAST_AA_REQUIRED`
- `UX_MOTION_QUALITY_SCORE_LOW`
- `UX_MOTION_BLOCKERS_PRESENT`
- `UX_MOTION_TTFV_EXCEEDED`

## Preuves DEV
- unit + edge S070 ✅
- e2e S070 ✅
- fast gates S070 ✅

## Next handoff
TEA → Reviewer (H17)
