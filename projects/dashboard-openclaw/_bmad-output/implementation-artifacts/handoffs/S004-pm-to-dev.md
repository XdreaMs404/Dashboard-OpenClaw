# H13 — PM → DEV — S004 (scope strict)

## Contexte
- **SID**: S004
- **Story canonique**: E01-S04 — Capture owner/horodatage/statut de phase
- **Epic**: E01
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Runtime tick**: 2026-02-22 12:18 UTC
- **Story source (SoT)**: `_bmad-output/implementation-artifacts/stories/S004.md`
- **Entrées validées**:
  - `_bmad-output/planning-artifacts/prd.md`
  - `_bmad-output/planning-artifacts/architecture.md`
  - `_bmad-output/planning-artifacts/epics.md`
  - `_bmad-output/planning-artifacts/epics-index.md`

## Décision PM
**GO_DEV explicite — S004 uniquement.**

## AC canoniques à satisfaire (E01-S04)
1. **AC-01 / FR-004**: afficher owner, started_at, finished_at, statut, durée pour chaque phase.
2. **AC-02 / FR-005**: exiger les prérequis déclarés avant activation de la phase suivante.
3. **AC-03 / NFR-034**: métriques clés disponibles en continu.
4. **AC-04 / NFR-040**: usage/actionnabilité permettant un time-to-first-value < 14 jours.

## DoD canonique (obligatoire)
- Tests unitaires + intégration + e2e verts (nominal + échecs critiques).
- Contrôle sécurité (RBAC/allowlist/inputs) sans finding bloquant.
- Preuves UX (states/a11y/responsive/microcopy) si UI touchée.
- Instrumentation métriques + alertes + runbook mis à jour.
- Mapping FR/NFR/Risques documenté et traçable.
- Handoffs aval sans ambiguïté.

## Risques ciblés
- **P06**: contrôles ULTRA contournés.
- **P07**: erreur de contexte / prérequis non respectés.

## Scope DEV autorisé (strict S004)
1. Implémenter/ajuster `buildPhaseStateProjection(input, options?)` dans `app/src/phase-state-projection.js`.
2. Intégrer FR-005 via validation prérequis injectée/déléguée (`validatePhasePrerequisites`) pour exposer `activationAllowed` + synthèse checklist.
3. Propager les blocages transition/SLA issus de S002/S003.
4. Maintenir un contrat de sortie stable et déterministe avec diagnostics exploitables.
5. Ajouter/adapter tests unit + edge + e2e S004.

## Scope interdit (hors-scope)
- Toute évolution hors FR-004/FR-005 / S004.
- Implémentation des scripts sequence-guard/ultra-quality-check (scope S005/S006).
- Refactor transverse non requis par S004.
- Modifications fonctionnelles d’autres stories non strictement nécessaires.

## Fichiers autorisés (strict S004)
- `app/src/phase-state-projection.js`
- `app/src/phase-prerequisites-validator.js` *(ajustement minimal uniquement si requis S004)*
- `app/src/index.js` (export S004 uniquement si ajustement nécessaire)
- `app/tests/unit/phase-state-projection.test.js`
- `app/tests/edge/phase-state-projection.edge.test.js`
- `app/tests/e2e/phase-state-projection.spec.js`
- `_bmad-output/implementation-artifacts/stories/S004.md`
- `_bmad-output/implementation-artifacts/handoffs/S004-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S004-dev-to-tea.md`

## Gates à exécuter avant sortie DEV
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit tests/edge
npx playwright test tests/e2e
npm run test:coverage
npm run build && npm run security:deps
```

## Critères de preuve attendus (UX / TEA)
### UX (H14)
- Captures + rapport montrant owner/horodatages/statut/durée visibles.
- Évidence des états `empty/loading/error/success`.
- Lisibilité explicite des blocages (`blockingReasonCode`, `blockingReason`) et prérequis (`activationAllowed`, `missingPrerequisiteIds`).

### TEA (H16)
- Logs complets de gates techniques.
- Mapping AC/DoD → tests.
- Couverture module S004 >=95% lignes/branches.
- Non-régression S001..S003 prouvée.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
