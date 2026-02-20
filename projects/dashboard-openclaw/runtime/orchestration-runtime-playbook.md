# Runtime Playbook — Orchestration multi-agent BMAD (canonique)

## Source unique
- `docs/BMAD-HYPER-ORCHESTRATION-THEORY.md` (H01→H23, G1→G5)

## Règles runtime
- Ordre obligatoire H01→H23 (pas de permutation)
- Handoff explicite obligatoire à chaque transition
- Artefact fichier obligatoire pour chaque étape critique
- Version complète dès le premier cycle (pas de report en versions futures)
- Analysis = minimum 3 recherches utiles sourcées
- Protocole commandes: `/new`, `/start`, `/pause`, `/continue`, `/recap`
- En phase de démarrage `/start`, exécuter uniquement phases 1→3 puis repasser en idle en attente validation.

## Séquence runtime
### Phase 1 — Analysis
- H01 Jarvis -> bmad-brainstorm
- H02 Jarvis -> bmad-analyst
- H03 analyst + brainstorming -> bmad-pm

### Phase 2 — Planning
- H04 bmad-pm -> bmad-pm
- H05 bmad-pm -> bmad-ux-designer
- H06 bmad-ux-designer -> bmad-pm + bmad-architect
- H07 bmad-pm + bmad-ux-designer -> Jarvis

### Phase 3 — Solutioning
- H08 bmad-pm + bmad-ux-designer -> bmad-architect
- H09 bmad-architect -> bmad-pm
- H10 bmad-pm + bmad-architect -> bmad-architect (readiness)

### Phase 4 — Implementation (story loop)
- H11 Jarvis -> bmad-sm (init sprint planning)
- H12 bmad-sm -> bmad-sm (create next story)
- H13 bmad-sm -> bmad-dev
- H14 bmad-dev -> bmad-ux-qa
- H15 bmad-ux-qa -> bmad-dev + bmad-tea
- H16 bmad-dev -> bmad-tea
- H17 bmad-tea -> bmad-reviewer
- H18 bmad-reviewer -> Jarvis
- H19 Jarvis -> bmad-sm

### Fin d’epic
- H20 bmad-sm -> Jarvis
- H21 Jarvis -> bmad-sm + bmad-tea + bmad-ux-qa
- H22 rétro -> bmad-pm + bmad-architect + bmad-ux-designer
- H23 Jarvis -> Sprint system

## Gates runtime
- G1 analysis quality
- G2 planning quality
- G3 implementation readiness
- G4 story done global = G4-T + G4-UX
- G5 epic close

## Scripts story
```bash
bash scripts/run-quality-gates.sh
bash scripts/run-ux-gates.sh <SID>
bash scripts/run-story-gates.sh <SID>
bash scripts/story-done-guard.sh <SID>
```

## Gestion d’échec
- Si gate échoue: story reste non-DONE
- Créer handoff correctif vers le rôle responsable
- Réexécuter uniquement après artefact de correction
