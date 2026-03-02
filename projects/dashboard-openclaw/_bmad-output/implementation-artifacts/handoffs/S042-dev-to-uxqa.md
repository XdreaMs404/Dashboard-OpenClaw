# S042 — Handoff DEV → UXQA

## Story
- ID: S042
- Canonical story: E04-S06
- Epic: E04
- Phase cible: H14 (UX QA Audit)
- Statut DEV: READY_FOR_UX_AUDIT
- checkpoint_token: READY_FOR_UX_AUDIT

## Scope implémenté (strict S042)
- `app/src/command-allowlist-catalog.js`
- `app/src/index.js`
- `app/tests/unit/command-allowlist-catalog.test.js`
- `app/tests/edge/command-allowlist-catalog.edge.test.js`
- `app/tests/e2e/command-allowlist-catalog.spec.js`
- `app/scripts/capture-command-allowlist-ux-evidence.mjs`

## Résultat livré (S042)
- Signature obligatoire du contexte actif `active_project_root` avant exécution:
  - `ACTIVE_PROJECT_ROOT_SIGNATURE_REQUIRED` si signature absente.
  - `ACTIVE_PROJECT_ROOT_SIGNATURE_INVALID` si signature invalide/altérée.
- Ajout du helper exporté `signActiveProjectRoot(...)` pour signer le contexte côté runtime.
- Garde d’exécution exposée via `executionGuard.activeProjectRootSigned`.
- Conserve les protections existantes RBAC / dry-run / double confirmation / impact preview.

## Vérifications DEV (preuves)
- `npx vitest run tests/unit/command-allowlist-catalog.test.js tests/edge/command-allowlist-catalog.edge.test.js` ✅
- `npx playwright test tests/e2e/command-allowlist-catalog.spec.js` ✅
- `BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw bash /root/.openclaw/workspace/bmad-total/scripts/run-fast-quality-gates.sh S042` ✅

## Points d’attention UX
- Microcopy explicite des deux nouveaux reason codes de signature.
- Validation des 4 états UI (`empty/loading/error/success`).
- Responsive sans overflow horizontal (mobile/tablette/desktop).

## Next handoff
UXQA → DEV/TEA (H15)
