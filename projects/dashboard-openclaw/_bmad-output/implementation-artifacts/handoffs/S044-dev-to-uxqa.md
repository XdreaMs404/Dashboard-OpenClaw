# S044 — Handoff DEV → UXQA

## Story
- ID: S044
- Canonical story: E04-S08
- Epic: E04
- Phase cible: H14 (UX QA Audit)
- Statut DEV: READY_FOR_UX_AUDIT
- checkpoint_token: READY_FOR_UX_AUDIT

## Scope implémenté (strict S044)
- `app/src/command-allowlist-catalog.js`
- `app/tests/unit/command-allowlist-catalog.test.js`
- `app/tests/edge/command-allowlist-catalog.edge.test.js`

## Résultat livré (FR-040 / FR-041)
- Politique timeout/retry pilotée:
  - `maxTimeoutMs` (défaut 120000), `maxRetryCount` (défaut 3), violations bloquantes.
  - reason codes: `TIMEOUT_POLICY_VIOLATION`, `RETRY_POLICY_VIOLATION`.
- Politique idempotency key:
  - clé obligatoire pour `apply/retry`.
  - rejet sur réutilisation conflictuelle (`IDEMPOTENCY_KEY_REUSE_CONFLICT`).
- Ordonnancement concurrent:
  - séquencement déterministe par priorité/capacité.
  - `scheduledCommandOrder` + `queuePosition` + `capacitySlot` dans diagnostics.

## Vérifications DEV (preuves)
- `npm run lint && npm run typecheck` ✅
- `npx vitest run tests/unit/command-allowlist-catalog.test.js tests/edge/command-allowlist-catalog.edge.test.js` ✅
- `npx playwright test tests/e2e/command-allowlist-catalog.spec.js` ✅
- Evidence UX S044:
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S044/vitest-s044.log`
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S044/playwright-s044.log`
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S044/state-flow-check.json`
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S044/reason-copy-check.json`
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S044/responsive-check.json`
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S044/responsive-mobile.png`
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S044/responsive-tablet.png`
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S044/responsive-desktop.png`

## Next handoff
UXQA → DEV/TEA (H15)
