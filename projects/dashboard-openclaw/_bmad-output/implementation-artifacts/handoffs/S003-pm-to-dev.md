# H13 — PM → DEV — S003 (scope strict canonique E01-S03)

## Contexte
- **SID**: S003
- **Story canonique**: E01-S03 — SLA de notification de phase et blocage
- **Epic**: E01
- **Projet**: `/root/.openclaw/workspace/projects/dashboard-openclaw`
- **Runtime tick**: 2026-02-22 12:02 UTC
- **Sources validées (strict)**:
  - `_bmad-output/planning-artifacts/epics.md` (section Story E01-S03)
  - `_bmad-output/implementation-artifacts/stories/S003.md`

## Décision PM
**GO_DEV explicite — S003 uniquement.**

## AC canoniques à satisfaire (source epics.md E01-S03)
1. **AC-01 (FR-003)** — Bloquer la transition si la notification de phase n’est pas publiée dans la fenêtre SLA.
2. **AC-02 (FR-004)** — Afficher `owner`, `started_at`, `finished_at`, `statut` et `durée` pour chaque phase.
3. **AC-03 (NFR-017)** — SLA respecté: `< 10 min`.
4. **AC-04 (NFR-034)** — Métriques clés disponibles en continu.

## DoD canonique (obligatoire)
- **DoD-01**: tests unitaires + intégration + e2e verts sur nominal + échec critique.
- **DoD-02**: contrôle sécurité (RBAC/allowlist/inputs) sans finding bloquant.
- **DoD-03**: preuve UX (states/a11y/responsive/microcopy) si UI concernée.
- **DoD-04**: instrumentation métriques + alertes + runbook mis à jour.
- **DoD-05**: mapping FR/NFR/Risque + owner + échéance traçables.
- **DoD-06**: dépendances aval vérifiées, handoff sans ambiguïté.

## Risques à couvrir explicitement
- **P03 — Notifications de phase manquantes**
  - Mitigation attendue: blocage SLA déterministe + raison explicite.
- **P06 — Contrôles ULTRA quality contournés**
  - Mitigation attendue: preuves techniques/UX complètes + gates G4-T/G4-UX appliqués.

## Plan d’implémentation testable (strict S003)
1. **Blocage SLA FR-003**
   - S’appuyer sur le validateur de transition canonique (`validatePhaseTransition`) pour propager les reason codes SLA (`PHASE_NOTIFICATION_MISSING`, `PHASE_NOTIFICATION_SLA_EXCEEDED`).
2. **Projection d’état FR-004**
   - Garantir un contrat de projection phase stable exposant: `owner`, `started_at`, `finished_at`, `status`, `duration_ms`, et motif de blocage si applicable.
3. **Diagnostics NFR-034**
   - Exposer des diagnostics exploitables en continu (timestamps calculés, code source blocage, durée).
4. **Tests**
   - Cas nominaux (`pending/running/done`) + cas bloquants SLA + cas entrées invalides.
   - UI e2e: états `empty/loading/error/success` avec champs FR-004 visibles.

## Fichiers autorisés (scope strict S003)
- `app/src/phase-state-projection.js`
- `app/src/phase-transition-validator.js` *(ajustement minimal uniquement si requis pour AC-01)*
- `app/src/index.js` (export S003 uniquement)
- `app/tests/unit/phase-state-projection.test.js`
- `app/tests/edge/phase-state-projection.edge.test.js`
- `app/tests/e2e/phase-state-projection.spec.js`
- `_bmad-output/implementation-artifacts/stories/S003.md`
- `_bmad-output/implementation-artifacts/handoffs/S003-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S003-dev-to-tea.md`

## Hors-scope (interdit)
- Toute évolution hors FR-003/FR-004, NFR-017/NFR-034.
- Tout refactor transverse non requis par E01-S03.
- Toute modification fonctionnelle d’autres stories non strictement nécessaire.

## Gates techniques à exécuter avant sortie DEV
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit tests/edge
npx playwright test tests/e2e
npm run test:coverage
npm run build && npm run security:deps
```

## Critères de preuve attendus — UX / TEA
### Preuves UX (H14)
- Captures/rapport montrant `owner`, `started_at`, `finished_at`, `status`, `duration_ms`.
- Démonstration des états `empty/loading/error/success`.
- Vérification accessibilité minimale (labels/focus/lecture des messages de blocage).

### Preuves TEA (H16)
- Logs complets de gates (lint/typecheck/tests/coverage/build/security).
- Mapping explicite **AC/DoD → tests**.
- Preuve couverture module >= 95% lignes + branches.
- Preuve blocage SLA déterministe (raison explicite) + non-régression.

## Handoff suivant attendu
- DEV → UXQA (H14)
- DEV → TEA (H16)
