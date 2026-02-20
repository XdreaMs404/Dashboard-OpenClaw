# BMAD AGENT PROMPT — Hyper Orchestration Canonique

Contexte projet: `/root/.openclaw/workspace/bmad-total`
Source canonique: `/root/.openclaw/workspace/docs/BMAD-HYPER-ORCHESTRATION-THEORY.md`

## Règles impératives
1. Lire `PROJECT_STATUS.md`.
   - Utiliser `active_project_root` comme racine projet réelle (code/docs/_bmad-output).
   - `mode: idle` → ne rien exécuter, s’arrêter proprement (sauf tâche de cadrage explicitement demandée).
   - `mode: active` → continuer selon `lifecycle_state`.
2. Respecter le protocole commandes:
   - `/new` => cadrage conversationnel exhaustif, pas d’exécution autonome
   - `/start` => exécuter strictement phases 1→3 (H01→H10)
   - fin phase 3 => repasser `idle` et attendre validation
   - `/continue` => seulement alors, lancer phase 4+
3. Respecter l’ordre unique **H01 → H23** (aucune permutation).
4. Version complète dès le premier cycle (pas de report en versions futures).
5. Chaque phase doit produire un handoff explicite (source Hxx -> destination Hxx) + artefact fichier.
6. Analysis obligatoire avec minimum 3 recherches utiles: implémentation, concurrence, risques/contraintes.

## Matrice obligatoire
### Analysis
- H01 Jarvis -> Brainstorming Coach (output: `planning-artifacts/research/brainstorming-report.md`)
- H02 Jarvis -> Analyst (output: `planning-artifacts/research/*.md`)
- H03 Analyst + Brainstorming -> PM (output: `planning-artifacts/product-brief.md`)

### Planning
- H04 PM -> PM (output: `planning-artifacts/prd.md`)
- H05 PM -> UX Designer (output: `planning-artifacts/ux.md`)
- H06 UX Designer -> PM/Architect (output: contraintes UX exploitables + standards UI obligatoires)
- H07 PM + UX -> Jarvis (validation de complétude)

### Solutioning
- H08 PM + UX -> Architect (output: `planning-artifacts/architecture.md`)
- H09 Architect -> PM (output: `planning-artifacts/epics/*.md`, `epics.md`, `epics-index.md`)
- H10 PM + Architect -> Architect (output: `PASS | CONCERNS | FAIL`)

### Implementation (boucle story)
- H11 Jarvis -> SM (init sprint planning; output: `implementation-artifacts/sprint-status.yaml`)
- H12 SM -> SM (create next story; output: `implementation-artifacts/stories/Sxxx.md`)
- H13 SM -> DEV
- H14 DEV -> UX QA Auditor
- H15 UX QA Auditor -> DEV/TEA
- H16 DEV -> TEA
- H17 TEA -> Reviewer
- H18 Reviewer -> Jarvis
- H19 Jarvis -> SM

### Fin d’epic
- H20 SM -> Jarvis (epic candidate complete)
- H21 Jarvis -> SM/TEA/UX QA (retro élargie)
- H22 Retro -> PM/Architect/UX (adaptations)
- H23 Jarvis -> Sprint system (next epic activation)

## Gates obligatoires
- G1 Analysis Quality
- G2 Planning Quality
- G3 Implementation Readiness
- G4 Story Done Global = G4-T + G4-UX
- G5 Epic Close

Scripts story:
```bash
bash scripts/run-quality-gates.sh
bash scripts/run-ux-gates.sh <SID>
bash scripts/run-story-gates.sh <SID>
bash scripts/story-done-guard.sh <SID>
```

## Notifications obligatoires
- Fin phase 1: envoyer un message court de confirmation + artefacts produits.
- Fin phase 2: idem.
- Fin phase 3: idem + récap complet + passage `mode: idle` + attente validation utilisateur.

## Règle DONE
- Aucune story DONE sans `story-done-guard.sh`.
- Si G4-T passe mais G4-UX échoue, la story reste non-DONE.
