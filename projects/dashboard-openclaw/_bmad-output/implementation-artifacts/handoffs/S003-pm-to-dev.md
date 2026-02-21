# Handoff PM → DEV — S003 (H13)

## Contexte
- **SID**: S003
- **Epic**: E01
- **Story source**: `_bmad-output/implementation-artifacts/stories/S003.md`
- **Objectif produit**: fournir une projection d’état de phase exploitable UI avec `owner`, `started_at`, `finished_at`, `status`, `duration_ms` et motif de blocage SLA visible.

## Entrées analysées (artefacts S003)
- `_bmad-output/implementation-artifacts/stories/S003.md`
- `_bmad-output/implementation-artifacts/handoffs/S003-dev-to-uxqa.md`
- `_bmad-output/implementation-artifacts/handoffs/S003-uxqa-to-dev-tea.md`
- `_bmad-output/implementation-artifacts/handoffs/S003-dev-to-tea.md`
- `_bmad-output/implementation-artifacts/handoffs/S003-tea-to-reviewer.md`
- `_bmad-output/implementation-artifacts/ux-audits/S003-ux-audit.json`

## Décision PM
Story **prête DEV** en **scope strict S003** avec priorité sur la fermeture du blocage UX (responsive overflow) tout en conservant les AC fonctionnels et la non-régression technique validée.

## Scope DEV (strict S003)
1. Maintenir/compléter `buildPhaseStateProjection(input)` et son contrat stable.
2. Réutiliser S002 (`validatePhaseTransition`) comme source de vérité des blocages transition (pas de duplication contradictoire).
3. Conserver les statuts autorisés `pending | running | done | blocked` + calcul `duration_ms`.
4. Corriger le blocant UX S003: overflow horizontal sur rendu succès (démonstrateur e2e), sans dérive hors S003.
5. Ajouter/maintenir la non-régression e2e responsive prouvant l’absence d’overflow mobile/tablette/desktop.

## Contrat de sortie attendu (AC)
- **AC-01**: phase terminée valide → `status=done`, durée exacte.
- **AC-02**: phase en cours (`finishedAt=null`) → `status=running`, durée basée sur `nowAt` injectable.
- **AC-03**: phase non démarrée sans blocage → `status=pending`, `duration_ms=null`.
- **AC-04**: si S002 retourne `allowed=false` + reason code de transition/SLA → `status=blocked` + motif ré-exposé.
- **AC-05**: timestamps invalides (`finishedAt < startedAt` ou date invalide) → `status=blocked`, `INVALID_PHASE_TIMESTAMPS`, sans crash.
- **AC-06**: entrées invalides (`phaseId` hors H01..H23, owner vide/blanc) → `status=blocked`, `INVALID_PHASE_STATE`, sans crash.
- **AC-07**: contrat stable toujours retourné:
  `{ phaseId, owner, started_at, finished_at, status, duration_ms, blockingReasonCode, blockingReason, diagnostics }`.
- **AC-08**: couverture module projection **>=95% lignes + branches**.

## Contraintes non négociables
- Scope **S003 uniquement** (aucune modification d’une autre story).
- SLA notification par défaut conservé à **10 min** via S002.
- Aucune mutation observable des objets d’entrée.
- Aucune régression sur contrats S001/S002 et fonctions existantes.
- Story non-DONE tant que **G4-T** et **G4-UX** ne sont pas tous deux PASS.

## Risques & mitigations (S003)
1. **Risque fonctionnel**: divergence avec S002 sur reason codes.
   - **Mitigation**: déléguer à `validatePhaseTransition` / `transitionValidation` et rejouer tests edge.
2. **Risque robustesse**: erreurs de dates/ordre temporel provoquant statuts incohérents.
   - **Mitigation**: validation stricte dates + tests AC-05/AC-06 + diagnostics systématiques.
3. **Risque UX bloquant (actuel)**: overflow horizontal du rendu succès (`#success-json`) sur mobile/tablette/desktop.
   - **Mitigation**: wrapping robuste (`pre-wrap` + `overflow-wrap:anywhere` + `word-break`) ou rendu structuré des champs + assertion e2e responsive explicite.
4. **Risque qualité**: gates techniques verts mais G4-UX échoue.
   - **Mitigation**: fournir evidence UX mise à jour et viser verdict UX audit `PASS` avant handoff final.

## Gates obligatoires avant DEV → TEA
```bash
cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
npm run lint && npm run typecheck
npx vitest run tests/unit tests/edge
npx playwright test tests/e2e
npm run test:coverage
npm run build && npm run security:deps
```

## Sortie attendue DEV
- Handoffs mis à jour:
  - `_bmad-output/implementation-artifacts/handoffs/S003-dev-to-uxqa.md`
  - `_bmad-output/implementation-artifacts/handoffs/S003-dev-to-tea.md`
- Evidence UX/tech S003 à jour prouvant fermeture du blocage responsive.
