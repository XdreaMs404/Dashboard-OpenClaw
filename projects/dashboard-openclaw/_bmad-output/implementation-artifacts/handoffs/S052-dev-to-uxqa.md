# S052 — Handoff DEV → UXQA

## Story
- ID: S052
- Canonical story: E05-S04
- Epic: E05
- Phase cible: H14 (UX QA Audit)
- Statut DEV: READY_FOR_UX_AUDIT
- checkpoint_token: READY_FOR_UX_AUDIT

## Scope implémenté (strict S052)
- `app/src/aqcd-gate-priority-actions.js` (nouveau)
- `app/src/index.js` (export `buildAqcdGatePriorityActions`)
- `app/tests/unit/aqcd-gate-priority-actions.test.js` (nouveau)
- `app/scripts/capture-aqcd-gate-priority-ux-evidence.mjs` (evidence UX)

## Résultat livré (FR-048 / FR-049)
- Génération des top actions prioritaires par gate (max 3/gate).
- Chaque action priorisée expose `owner` + `evidenceRef` + `priorityScore`.
- Registre des risques intégré (owner/status/dueAt/exposure) avec résumé d’exposition.
- Contrôles fail-closed: input invalide, runbook manquant, risk register invalide, budget latence p95 dépassé.
- États UX couverts et auditables: empty/loading/error/success.

## Vérifications DEV (preuves)
- `npm run lint && npm run typecheck` ✅
- `npx vitest run tests/unit/aqcd-gate-priority-actions.test.js` ✅
- Evidence UX S052:
  - `_bmad-output/implementation-artifacts/ux-audits/S052-ux-audit.json`
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S052/state-flow-check.json`
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S052/reason-copy-check.json`
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S052/responsive-check.json`
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S052/responsive-mobile.png`
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S052/responsive-tablet.png`
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S052/responsive-desktop.png`

## Next handoff
UXQA → DEV/TEA (H15)
