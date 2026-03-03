# S047 — Handoff DEV → UXQA

## Story
- ID: S047
- Canonical story: E04-S11
- Epic: E04
- Phase cible: H14 (UX QA Audit)
- Statut DEV: READY_FOR_UX_AUDIT
- checkpoint_token: READY_FOR_UX_AUDIT

## Scope implémenté (strict S047)
- `app/src/command-allowlist-catalog.js`
- `app/tests/unit/command-allowlist-catalog.test.js`
- `app/tests/edge/command-allowlist-catalog.edge.test.js`
- `app/tests/e2e/command-allowlist-catalog.spec.js`
- `app/scripts/capture-command-allowlist-ux-evidence.mjs`

## Résultat livré (FR-043 / FR-044)
- FR-043 maintenu: approbation nominative obligatoire pour tout `policyOverride`.
- FR-044 ajouté: template de commande validé obligatoire pour tout `policyOverride` approuvé.
  - Nouveau reason code: `POLICY_OVERRIDE_TEMPLATE_REQUIRED`
  - Corrective action: `USE_VALIDATED_COMMAND_TEMPLATE`
  - Vérification stricte: `templateId` présent + template existant + validé + compatible (`commandId`, `mode`).
- Traçabilité renforcée:
  - diagnostics: `commandTemplateCount`, `commandTemplateUsageCount`, `commandTemplateViolations`
  - guard: `executionGuard.commandTemplatePolicyCompliant`
  - sortie catalogue enrichie: `catalog.commandTemplates`

## Vérifications DEV (preuves)
- `npm run lint && npm run typecheck` ✅
- `npx vitest run tests/unit/command-allowlist-catalog.test.js tests/edge/command-allowlist-catalog.edge.test.js` ✅
- `npx playwright test tests/e2e/command-allowlist-catalog.spec.js` ✅
- Evidence UX S047:
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S047/vitest-s047.log`
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S047/playwright-s047.log`
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S047/state-flow-check.json`
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S047/reason-copy-check.json`
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S047/responsive-check.json`
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S047/responsive-mobile.png`
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S047/responsive-tablet.png`
  - `_bmad-output/implementation-artifacts/ux-audits/evidence/S047/responsive-desktop.png`

## Next handoff
UXQA → DEV/TEA (H15)
