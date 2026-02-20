# Handoff Matrix (Operational — Canonique H01→H23)

## Phase 1 — Analysis
- H01 Jarvis → Brainstorming Coach  
  Output: `planning-artifacts/research/brainstorming-report.md`
- H02 Jarvis → Analyst (market + tech + risk research)  
  Output: `planning-artifacts/research/*.md`
- H03 Analyst + Brainstorming → PM  
  Output: `planning-artifacts/product-brief.md`

Gate G1: hypothèses testables + risques majeurs identifiés + sources minimales.

## Phase 2 — Planning
- H04 PM → PM (PRD structuré)  
  Output: `planning-artifacts/prd.md`
- H05 PM → UX Designer  
  Output: `planning-artifacts/ux.md`
- H06 UX Designer → PM/Architect  
  Output: contraintes UX exploitables + standards UI obligatoires
- H07 PM + UX → Jarvis (validation de complétude)

Gate G2: PRD actionnable + ACs vérifiables + ambiguïtés critiques levées + règles UX explicites.

## Phase 3 — Solutioning
- H08 PM + UX → Architect  
  Output: `planning-artifacts/architecture.md`
- H09 Architect → PM  
  Output: `planning-artifacts/epics/*.md`, `epics.md`, `epics-index.md`
- H10 PM + Architect → Architect (readiness check)  
  Output: `PASS | CONCERNS | FAIL`

Gate G3: cohérence PRD/UX/archi/epics + risques acceptables + design constraints traçables.

## Phase 4 — Implementation (boucle story)
- H11 Jarvis → SM (init sprint planning)  
  Output: `implementation-artifacts/sprint-status.yaml`
- H12 SM → SM (create next story)  
  Output: `implementation-artifacts/stories/Sxxx.md`
- H13 SM → DEV
- H14 DEV → UX QA Auditor (evidence UX/UI + captures + states)
- H15 UX QA Auditor → DEV/TEA (verdict UX + corrections)
- H16 DEV → TEA (evidence de test + qualité technique)
- H17 TEA → Reviewer (statut qualité + gaps)
- H18 Reviewer → Jarvis (approve / changes / blocked)
- H19 Jarvis → SM (update status + next story)

Gate G4 = G4-T + G4-UX.

## Fin d’epic
- H20 SM → Jarvis (epic candidate complete)
- H21 Jarvis → SM/TEA/UX QA (retrospective élargie technique + design)
- H22 Retro → PM/Architect/UX (adaptations pour epic suivant)
- H23 Jarvis → Sprint system (next epic activation)

Gate G5: rétro validée + actions concrètes + adaptation planifiée.

## Contrat imposé
Utiliser le template: `templates/HANDOFF_CONTRACT_TEMPLATE.md`
