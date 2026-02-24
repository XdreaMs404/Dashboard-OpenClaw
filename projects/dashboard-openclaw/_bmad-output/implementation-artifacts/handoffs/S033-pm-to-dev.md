# H13 — PM → DEV — S033 (scope strict canonique E03-S09)

## Contexte
- SID: S033
- Story canonique: E03-S09 — Tableau tendances des verdicts
- Epic: E03
- Dépendance: E03-S08 (S032)
- Projet: `/root/.openclaw/workspace/projects/dashboard-openclaw`

## Décision PM
**GO_DEV explicite — S033 uniquement.**

## Objectifs DEV (strict S033)
1. Implémenter un moteur de tableau tendances PASS/CONCERNS/FAIL par phase/période (FR-019).
2. Produire un contexte d’export de rapport gate prêt pour la story suivante (FR-020, sans implémenter l’export complet S034).
3. Exiger une chaîne de preuve minimale pour la tendance (NFR-029, fail-closed).
4. Garantir les 4 états UI (empty/loading/error/success) dans la démo e2e (NFR-031).

## AC canoniques à couvrir
- AC-01: affichage tendances verdicts par phase/période.
- AC-02: scénario négatif garde-fou sur chemin export (pas de contournement).
- AC-03: chaîne de preuve complète obligatoire.
- AC-04: 4 états UI validés.

## Fichiers ciblés
- `app/src/gate-verdict-trends-table.js` (nouveau)
- `app/src/index.js` (export)
- `app/tests/unit/gate-verdict-trends-table.test.js`
- `app/tests/edge/gate-verdict-trends-table.edge.test.js`
- `app/tests/e2e/gate-verdict-trends-table.spec.js`

## Critères de sortie DEV
- Contrat stable: `{ allowed, reasonCode, reason, diagnostics, trendTable, reportExport, correctiveActions }`
- Tests unit + edge + e2e verts
- Handoffs DEV publiés vers UXQA et TEA

## Next handoff
DEV → UXQA (H14) et DEV → TEA (H16)
