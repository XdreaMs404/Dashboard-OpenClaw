# H13 — PM → DEV — S001 (scope strict)

## Contexte
- **SID**: S001
- **Story canonique**: E01-S01 — Machine d’état canonique H01→H23
- **Epic**: E01
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Runtime tick**: 2026-02-22 11:47 UTC
- **Sources utilisées (strict)**:
  - `_bmad-output/implementation-artifacts/stories/S001.md`
  - `_bmad-output/planning-artifacts/epics.md` (section Story E01-S01)

## Décision PM
**GO_DEV explicite — S001 uniquement (scope strict).**

## AC S001 à satisfaire (source canonique E01-S01)
1. **AC-01 (FR-001)**: progression de phase strictement conforme à l’ordre BMAD H01→H23.
2. **AC-02 (FR-002)**: blocage de toute transition non autorisée avec raison explicite.
3. **AC-03 (NFR-011)**: fiabilité opérationnelle >= 99.5%.
4. **AC-04 (NFR-013)**: qualité/validation >= 95%.

## Scope DEV autorisé (strict S001)
- Implémentation/ajustement minimal des modules de validation de transition canonique.
- Tests unit/edge/e2e strictement nécessaires à S001.
- Mise à jour preuves S001 dans les artifacts de handoff DEV.

## Scope interdit (hors-scope)
- Toute exigence d’une autre story (E01-S02+ ou autre epic).
- Tout refactor transverse non requis par FR-001/FR-002.
- Toute modification métier hors machine d’état canonique et blocage transitions.
- Passage DONE sans preuves gates techniques + UX.

## Fichiers cibles autorisés (strict S001)
- `app/src/phase-transition-validator.js`
- `app/src/index.js` (export S001 uniquement si nécessaire)
- `app/tests/unit/phase-transition-validator.test.js`
- `app/tests/edge/phase-transition-validator.edge.test.js`
- `app/tests/e2e/phase-transition-validator.spec.js`
- `_bmad-output/implementation-artifacts/stories/S001.md`
- `_bmad-output/implementation-artifacts/handoffs/S001-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S001-dev-to-tea.md`

## Gates à exécuter avant sortie DEV
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit tests/edge
npx playwright test tests/e2e
npm run test:coverage
npm run build && npm run security:deps
```

## Preuves attendues (obligatoires)
1. Logs d’exécution des gates (lint/typecheck/unit/edge/e2e/coverage/build/security).
2. Preuve explicite des blocages transitions interdites avec raison lisible.
3. Mapping AC S001 → tests.
4. Preuve couverture module conforme (>=95% lignes + branches).
5. Handoffs DEV→UXQA et DEV→TEA complétés avec verdicts.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
