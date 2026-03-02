# S041 — Handoff DEV → UXQA

## Story
- ID: S041
- Canonical story: E04-S05
- Epic: E04
- Phase cible: H14 (UX QA Audit)
- Statut DEV: READY_FOR_UX_AUDIT
- checkpoint_token: READY_FOR_UX_AUDIT

## Scope implémenté (strict S041)
- `app/src/command-allowlist-catalog.js`
- `app/tests/unit/command-allowlist-catalog.test.js`
- `app/tests/edge/command-allowlist-catalog.edge.test.js`
- `app/tests/e2e/command-allowlist-catalog.spec.js`

## Résultat fonctionnel livré (FR-037 / FR-038)
- **FR-037**: contrôle role-based avant exécution write/critical.
  - Blocage `ROLE_PERMISSION_REQUIRED` si rôle non autorisé (write).
  - Blocage `CRITICAL_ACTION_ROLE_REQUIRED` si rôle non autorisé (critical).
- **FR-038**: protection du contexte actif (`active_project_root`) contre exécutions ambiguës.
  - Impact preview tracé avant apply.
  - Détection des impacts hors projet actif (`impactPreviewOutsideProjectCount`).

## Vérifications DEV (preuves)
- `npx vitest run tests/unit/command-allowlist-catalog.test.js tests/edge/command-allowlist-catalog.edge.test.js` ✅ (23 pass)
- `npx playwright test tests/e2e/command-allowlist-catalog.spec.js --output=test-results/e2e-s041` ✅ (2 pass)
- `BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw bash /root/.openclaw/workspace/bmad-total/scripts/run-fast-quality-gates.sh S041` ✅

## Points d’attention UX
- Microcopy de refus explicite et actionnable (`ROLE_PERMISSION_REQUIRED`, `CRITICAL_ACTION_ROLE_REQUIRED`, `DRY_RUN_REQUIRED_FOR_WRITE`).
- Validation des états `empty/loading/error/success`.
- Lisibilité responsive sans overflow horizontal (mobile/tablette/desktop).

## Next handoff
UXQA → DEV/TEA (H15)
