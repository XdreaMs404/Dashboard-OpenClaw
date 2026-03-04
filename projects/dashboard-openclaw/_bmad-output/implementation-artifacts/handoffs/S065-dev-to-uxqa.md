# S065 — Handoff DEV → UXQA

## Story
- ID: S065
- Canonical story: E06-S05
- Epic: E06
- Phase cible: H14 (UX QA Audit)
- Statut DEV: READY_FOR_UX_AUDIT
- checkpoint_token: READY_FOR_UX_AUDIT

## Scope implémenté (strict S065)
- `app/src/g4-ux-evidence-bridge.js`
- `app/src/index.js`
- `app/tests/unit/g4-ux-evidence-bridge.test.js`
- `app/tests/edge/g4-ux-evidence-bridge.edge.test.js`
- `app/tests/e2e/g4-ux-evidence-bridge.spec.js`
- `implementation-artifacts/stories/S065.md` (commandes de test ciblées)

## Résultat livré (FR-067 / FR-068)
- FR-067: liaison stricte entre captures UX et verdicts de sous-gate `G4-UX` (corrélation `G4-T` ↔ `G4-UX` obligatoire + références de preuves).
- FR-068: visualisation des dettes UX ouvertes via `reasonCode` + `correctiveActions` (plan d’actions de réduction).
- NFR-040: sortie exploitable rapidement (fail-closed immédiat + diagnostics actionnables).
- NFR-030: garde-fous qualité via contrôles bloquants sur intégrité gate view/corrélation/ingestion.

## Vérifications DEV (preuves)
- `npx vitest run tests/unit/g4-ux-evidence-bridge.test.js tests/edge/g4-ux-evidence-bridge.edge.test.js` ✅
- `npx playwright test tests/e2e/g4-ux-evidence-bridge.spec.js` ✅
- `BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw bash /root/.openclaw/workspace/bmad-total/scripts/run-fast-quality-gates.sh S065` ✅

## États UX à auditer
- `empty` (avant déclenchement)
- `loading` (pont UX↔G4 en traitement)
- `error` (input invalide / gate view incomplète / corrélation manquante / SLA ingestion KO)
- `success` (G1→G5 complet + corrélation G4 valide + ingestion UX dans SLA)

## Next handoff
UXQA → DEV/TEA (H15)
