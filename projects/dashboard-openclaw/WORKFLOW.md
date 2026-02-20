# WORKFLOW.md — BMAD Hyper Orchestration (ordre canonique unique)

## Source de vérité
`/root/.openclaw/workspace/docs/BMAD-HYPER-ORCHESTRATION-THEORY.md`

Matrice obligatoire: **H01 → H23**  
Gates obligatoires: **G1 → G5**

Règles absolues:
- Aucune permutation des étapes.
- Handoff explicite à chaque étape (entrant + sortant).
- Version complète dès le premier cycle (pas de report en versions futures).
- Analysis complète obligatoire avec **minimum 3 recherches utiles**.
- Protocole commandes: `/new` (cadrage + création dossier projet), `/start` (phases 1→3), `/pause`, `/continue`, `/recap`.
- Après phase 3: retour `mode: idle` + attente validation utilisateur avant phase 4.
- Tous les artefacts sont écrits dans `active_project_root` (projet isolé).

---

## Phase 1 — Analysis
- **H01** Jarvis → Brainstorming Coach  
  Output: `_bmad-output/planning-artifacts/research/brainstorming-report.md`
- **H02** Jarvis → Analyst (market + tech + risk research)  
  Output: `_bmad-output/planning-artifacts/research/*.md`
- **H03** Analyst + Brainstorming → PM  
  Output: `_bmad-output/planning-artifacts/product-brief.md`

**Gate G1**: hypothèses testables + risques majeurs identifiés + sources minimales.

## Phase 2 — Planning
- **H04** PM → PM (PRD structuré)  
  Output: `_bmad-output/planning-artifacts/prd.md`
- **H05** PM → UX Designer  
  Output: `_bmad-output/planning-artifacts/ux.md`
- **H06** UX Designer → PM/Architect  
  Output: contraintes UX exploitables + standards UI obligatoires
- **H07** PM + UX → Jarvis (validation de complétude)

**Gate G2**: PRD actionnable, ACs vérifiables, ambiguïtés critiques levées, règles UX explicites.

## Phase 3 — Solutioning
- **H08** PM + UX → Architect  
  Output: `_bmad-output/planning-artifacts/architecture.md`
- **H09** Architect → PM  
  Output: `_bmad-output/planning-artifacts/epics/*.md`, `epics.md`, `epics-index.md`
- **H10** PM + Architect → Architect (readiness check)  
  Output: `PASS | CONCERNS | FAIL`

**Gate G3**: cohérence PRD/UX/archi/epics + risques acceptables + design constraints traçables dans les stories.

## Phase 4 — Implementation (boucle story)
- **H11** Jarvis → SM (init sprint planning)  
  Output: `_bmad-output/implementation-artifacts/sprint-status.yaml`
- **H12** SM → SM (create next story)  
  Output: `_bmad-output/implementation-artifacts/stories/Sxxx.md`
- **H13** SM → DEV (story pack prêt)
- **H14** DEV → UX QA Auditor (evidence UX/UI + captures + states)
- **H15** UX QA Auditor → DEV/TEA (verdict UX + corrections)
- **H16** DEV → TEA (evidence de test + qualité technique)
- **H17** TEA → Reviewer (statut qualité + gaps)
- **H18** Reviewer → Jarvis (approve / changes / blocked)
- **H19** Jarvis → SM (update status + next story)

**Gate G4 (Story Done Global)** = **G4-T + G4-UX**
- **G4-T (Technique)**: lint/typecheck/tests/edge/e2e/coverage/security/build + review OK.
- **G4-UX (Design)**: conformité design system + accessibilité + responsive + états d’interface + clarté UX validées.
- Si G4-T passe mais G4-UX échoue, la story reste **non-DONE**.

Scripts story:
```bash
bash scripts/run-quality-gates.sh
bash scripts/run-ux-gates.sh <SID>
bash scripts/run-story-gates.sh <SID>
bash scripts/story-done-guard.sh <SID>
```

## Fin d’epic
- **H20** SM → Jarvis (epic candidate complete)
- **H21** Jarvis → SM/TEA/UX QA (retrospective élargie technique + design)
- **H22** Retro → PM/Architect/UX (adaptations pour epic suivant)
- **H23** Jarvis → Sprint system (next epic activation)

**Gate G5**: rétro validée + actions concrètes + adaptation planifiée.
