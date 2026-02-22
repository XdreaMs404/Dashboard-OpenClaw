# H13 — PM → DEV — S005 (scope strict)

## Contexte
- **SID**: S005
- **Story canonique**: E01-S05 — Checklist prérequis avant activation de phase
- **Epic**: E01
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Runtime tick**: 2026-02-22 12:59 UTC
- **Story source (SoT)**: `_bmad-output/implementation-artifacts/stories/S005.md`
- **Entrées validées (obligatoires)**:
  - `_bmad-output/planning-artifacts/prd.md`
  - `_bmad-output/planning-artifacts/architecture.md`
  - `_bmad-output/planning-artifacts/epics.md`
  - `_bmad-output/planning-artifacts/epics-index.md`
  - `_bmad-output/implementation-artifacts/stories/S005.md`

## Décision PM
**GO_DEV explicite — S005 uniquement.**

## AC canoniques à satisfaire (E01-S05)
1. **AC-01 / FR-005**: exiger les prérequis déclarés avant activation de la phase suivante.
2. **AC-02 / FR-006**: permettre l’exécution contrôlée des scripts `sequence-guard` et `ultra-quality-check` via un verdict fiable (S005 prépare, S006 orchestre).
3. **AC-03 / NFR-040**: time-to-first-value < 14 jours (lisibilité/actionnabilité).
4. **AC-04 / NFR-011**: fiabilité >= 99.5%.

## DoD canonique (obligatoire)
- Tests unitaires + intégration + e2e verts (nominal + échecs critiques).
- Contrôle sécurité (RBAC/allowlist/inputs) sans finding bloquant.
- Preuves UX (states/a11y/responsive/microcopy) si UI concernée.
- Instrumentation métriques + alertes + runbook mis à jour.
- Mapping FR/NFR/Risques documenté et traçable.
- Handoffs aval sans ambiguïté.

## Risques ciblés
- **P07**: erreur de contexte multi-projets.
- **P01**: non-respect de l’ordre canonique H01→H23.

## Scope DEV autorisé (strict S005)
1. Implémenter/ajuster `validatePhasePrerequisites(input)` dans `app/src/phase-prerequisites-validator.js`.
2. Assurer propagation stricte des reason codes amont S002/S003 (`INVALID_PHASE`, `TRANSITION_NOT_ALLOWED`, `PHASE_NOTIFICATION_MISSING`, `PHASE_NOTIFICATION_SLA_EXCEEDED`).
3. Garantir les reason codes checklist S005 (`PHASE_PREREQUISITES_MISSING`, `INVALID_PHASE_PREREQUISITES`, `PHASE_PREREQUISITES_INCOMPLETE`, `OK`).
4. Maintenir un contrat de sortie stable `{ allowed, reasonCode, reason, diagnostics }` avec diagnostics actionnables.
5. Ajouter/adapter tests unit + edge + e2e S005.
6. Ajuster `app/src/index.js` pour l’export S005 uniquement si nécessaire.
7. Ajustement minimal de `app/src/phase-transition-validator.js` autorisé uniquement pour compatibilité contractuelle S005.

## Scope interdit (hors-scope)
- Toute évolution hors FR-005/FR-006 / S005.
- Toute orchestration/exécution shell directe des scripts guards (scope S006).
- Tout refactor transverse non requis par S005.
- Toute modification fonctionnelle d’autres stories non strictement nécessaire.

## Reason codes autorisés (strict)
`OK | INVALID_PHASE | TRANSITION_NOT_ALLOWED | PHASE_NOTIFICATION_MISSING | PHASE_NOTIFICATION_SLA_EXCEEDED | PHASE_PREREQUISITES_MISSING | PHASE_PREREQUISITES_INCOMPLETE | INVALID_PHASE_PREREQUISITES`

## Fichiers autorisés (strict S005)
- `app/src/phase-prerequisites-validator.js`
- `app/src/index.js` (export S005 uniquement si nécessaire)
- `app/src/phase-transition-validator.js` *(ajustement minimal uniquement si requis S005)*
- `app/tests/unit/phase-prerequisites-validator.test.js`
- `app/tests/edge/phase-prerequisites-validator.edge.test.js`
- `app/tests/e2e/phase-prerequisites-validator.spec.js`
- `_bmad-output/implementation-artifacts/stories/S005.md`
- `_bmad-output/implementation-artifacts/handoffs/S005-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S005-dev-to-tea.md`

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
- Captures/rapport des états `empty/loading/error/success` du flux validation prérequis.
- Lisibilité explicite des reason codes et `missingPrerequisiteIds`.
- Vérification responsive + accessibilité minimale.

### TEA (H16)
- Logs complets des gates techniques.
- Mapping AC/DoD → tests.
- Couverture module S005 >=95% lignes/branches.
- Preuve de non-régression S001..S004.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
