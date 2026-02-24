# S038 — Handoff DEV → TEA

## Story
- ID: S038
- Epic: E04
- Statut DEV: READY_FOR_TEA
- checkpoint_token: ready_for_tea

## Scope implémenté (strict S038)
- `app/src/command-allowlist-catalog.js`
- `app/tests/unit/command-allowlist-catalog.test.js`
- `app/tests/edge/command-allowlist-catalog.edge.test.js`
- `app/tests/e2e/command-allowlist-catalog.spec.js`

## Contrat livré
Sortie stable S038:
`{ allowed, reasonCode, reason, diagnostics, catalog, executionGuard, correctiveActions }`

Ajouts S038:
- `diagnostics.impactPreview` (commandId/files/inProject) pour affichage avant apply.
- Compteurs diagnostics: `impactPreviewProvidedCount`, `impactPreviewMissingCount`, `impactPreviewOutsideProjectCount`.
- Guards: `impactPreviewReadyForWrite`, `activeProjectRootSafe`.

## AC couverts
- AC-01 FR-034: dry-run par défaut maintenu (`request.dryRun !== false`).
- AC-02 FR-035: preview d’impact exposé avant toute tentative apply write.
- AC-03 NFR-020: exécution hors catalogue bloquée (`COMMAND_OUTSIDE_CATALOG`).
- AC-04 NFR-021: signal explicite des impacts hors projet actif (`impactPreviewOutsideProjectCount`).

## Preuves DEV exécutées
- `npx vitest run tests/unit/command-allowlist-catalog.test.js tests/edge/command-allowlist-catalog.edge.test.js` ✅
- `npx playwright test tests/e2e/command-allowlist-catalog.spec.js --output=test-results/e2e-s038` ✅
- `BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw bash /root/.openclaw/workspace/bmad-total/scripts/run-fast-quality-gates.sh S038` ✅

## Points TEA à vérifier
1. Le mode write sans dry-run reste refusé sans contournement.
2. Les infos preview impact sont toujours présentes côté diagnostics en cas d’apply bloqué.
3. Les impacts hors projet actif sont signalés et aucun chemin destructif n’est exécuté.
4. Les protections S02/S03 restent intactes (inputs sûrs + RBAC).

## Next handoff
TEA → Reviewer (H17)
