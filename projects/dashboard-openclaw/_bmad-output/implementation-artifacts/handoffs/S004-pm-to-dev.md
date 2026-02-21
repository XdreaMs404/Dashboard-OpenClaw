# H13 — Handoff PM → DEV (S004)

## Identité story
- **SID**: S004
- **Epic**: E01
- **Titre**: Validation des prérequis obligatoires avant activation de phase
- **Source**: `_bmad-output/implementation-artifacts/stories/S004.md`

## Objectif DEV (strictement S004)
Implémenter la validation des prérequis de phase avant activation de la phase suivante, avec propagation stricte des blocages S002 et diagnostics exploitables pour S003/UI.

## Dépendances à respecter
- **S002**: `validatePhaseTransition` est la source de vérité des blocages transition et de leurs `reasonCode`.
- **S003**: la forme des diagnostics doit rester exploitable côté projection/affichage d’état.

## Scope IN (autorisé)
1. Créer/maintenir `validatePhasePrerequisites(input)`.
2. Valider la checklist `prerequisites` (structure + règles métier requis/optionnel).
3. Propager à l’identique les blocages S002 (`allowed=false` + même `reasonCode`/`reason`).
4. Retourner le contrat stable: `{ allowed, reasonCode, reason, diagnostics }`.
5. Ajouter/mettre à jour tests unit + edge + e2e S004.
6. Fournir preuves de gates techniques et couverture S004 >= 95% lignes + branches.

## Scope OUT (interdit)
- Toute évolution fonctionnelle hors FR-005/S004.
- Toute modification de logique métier S001/S002/S003 (hors intégration stricte attendue).
- Refactors non nécessaires au périmètre S004.

## Fichiers cibles autorisés (S004)
- `app/src/phase-prerequisites-validator.js`
- `app/src/index.js` (export uniquement lié à S004)
- `app/tests/unit/phase-prerequisites-validator.test.js`
- `app/tests/edge/phase-prerequisites-validator.edge.test.js`
- `app/tests/e2e/phase-prerequisites-validator.spec.js`
- `_bmad-output/implementation-artifacts/stories/S004.md` (mise à jour statut/preuves)
- `_bmad-output/implementation-artifacts/handoffs/S004-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S004-dev-to-tea.md`

## AC obligatoires à satisfaire (S004)
- **AC-01**: transition autorisée + requis tous `done` => `allowed:true`, `reasonCode:OK`.
- **AC-02**: si S002 bloque => propagation exacte du `reasonCode`/`reason`.
- **AC-03**: checklist absente/non-tableau/vide => `PHASE_PREREQUISITES_MISSING`.
- **AC-04**: requis incomplet => `PHASE_PREREQUISITES_INCOMPLETE` + `diagnostics.missingPrerequisiteIds`.
- **AC-05**: optionnels non `done` ne bloquent pas si requis complets.
- **AC-06**: entrée invalide (id vide/status invalide/doublon) => `INVALID_PHASE_PREREQUISITES`.
- **AC-07**: contrat stable + ensemble de `reasonCode` autorisés uniquement.
- **AC-08**: e2e UI avec états `empty/loading/success/error` + motifs explicites.
- **AC-09**: couverture module prérequis >= 95% lignes + branches.

## Reason codes autorisés (strict)
`OK | INVALID_PHASE | TRANSITION_NOT_ALLOWED | PHASE_NOTIFICATION_MISSING | PHASE_NOTIFICATION_SLA_EXCEEDED | PHASE_PREREQUISITES_MISSING | PHASE_PREREQUISITES_INCOMPLETE | INVALID_PHASE_PREREQUISITES`

## Diagnostics minimum obligatoires
- `fromPhase`
- `toPhase`
- `requiredCount`
- `satisfiedCount`
- `missingPrerequisiteIds`
- `blockedByTransition`

## Tests obligatoires
- **Fonctionnels**: nominal, blocage transition propagé, checklist absente, requis incomplet, optionnel non bloquant, entrées invalides.
- **E2E UI**: `empty -> loading -> success/error` avec rendu `reasonCode`, `reason`, `missingPrerequisiteIds`.
- **Non-régression**: contrats S002/S003 inchangés; suites existantes vertes.

## Commandes de validation (à exécuter)
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit tests/edge
npx playwright test tests/e2e
npm run test:coverage
npm run build && npm run security:deps
```

## Critère GO DEV
GO uniquement si tous AC + tests + gates passent, sans changement hors-scope S004.

## Handoff suivant attendu
- DEV → UX QA (H14)
- DEV → TEA (H16)
