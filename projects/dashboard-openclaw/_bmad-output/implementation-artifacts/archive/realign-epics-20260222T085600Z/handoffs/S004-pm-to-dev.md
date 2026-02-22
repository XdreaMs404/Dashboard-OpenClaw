# H13 — Handoff PM → DEV — S004 (scope strict)

## Contexte
- **SID**: S004
- **Epic**: E01
- **Story source**: `_bmad-output/implementation-artifacts/stories/S004.md`
- **Index source**: `_bmad-output/implementation-artifacts/stories/STORIES_INDEX.md`
- **Objectif story**: valider les prérequis obligatoires avant activation de phase (FR-005), sans contourner S002.

## Vérification PM (entrées)
1. `S004.md` confirme les AC S004 (AC-01 à AC-09), les tests requis (unit/edge/e2e), la couverture module >=95% (98.8% lines / 97.59% branches) et des gates techniques PASS.
2. `STORIES_INDEX.md` liste S004 en **TODO** (à maintenir par le flux de statut global), sans impact sur le périmètre fonctionnel de ce handoff H13.

## Décision PM
Story **GO_DEV** en **scope strict S004 uniquement**.

## Scope DEV autorisé (S004 uniquement)
1. Maintenir/compléter `validatePhasePrerequisites(input)`.
2. Propager strictement les blocages S002 (mêmes `reasonCode`/`reason` quand `allowed=false`).
3. Garantir le contrat stable de sortie:
   `{ allowed, reasonCode, reason, diagnostics }`.
4. Conserver diagnostics minimum:
   `fromPhase`, `toPhase`, `requiredCount`, `satisfiedCount`, `missingPrerequisiteIds`, `blockedByTransition`.
5. Maintenir les tests S004 (unit + edge + e2e) et la couverture module >=95% lignes+branches.
6. Maintenir la preuve UI des états `empty`, `loading`, `error`, `success` avec affichage explicite des motifs de blocage.

## Scope interdit (hors-scope)
- Toute évolution produit hors S004/FR-005.
- Toute modification de logique métier S001/S002/S003 non strictement nécessaire à l’intégration S004.
- Refactors transverses non exigés par les AC S004.

## Reason codes autorisés (strict)
`OK | INVALID_PHASE | TRANSITION_NOT_ALLOWED | PHASE_NOTIFICATION_MISSING | PHASE_NOTIFICATION_SLA_EXCEEDED | PHASE_PREREQUISITES_MISSING | PHASE_PREREQUISITES_INCOMPLETE | INVALID_PHASE_PREREQUISITES`

## Fichiers cibles autorisés (S004)
- `app/src/phase-prerequisites-validator.js`
- `app/src/index.js` (export S004 uniquement)
- `app/tests/unit/phase-prerequisites-validator.test.js`
- `app/tests/edge/phase-prerequisites-validator.edge.test.js`
- `app/tests/e2e/phase-prerequisites-validator.spec.js`
- `_bmad-output/implementation-artifacts/stories/S004.md`
- `_bmad-output/implementation-artifacts/handoffs/S004-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S004-dev-to-tea.md`

## Gates à conserver verts avant sortie DEV
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit tests/edge
npx playwright test tests/e2e
npm run test:coverage
npm run build && npm run security:deps
```

## Handoff attendu après DEV
- DEV → UXQA (H14)
- DEV → TEA (H16)
