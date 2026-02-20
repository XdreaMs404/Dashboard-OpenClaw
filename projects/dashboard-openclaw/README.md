# BMAD Total - Dev Factory (aligné BMAD `_bmad-output`)

## Cadre canonique
- Source: `../docs/BMAD-HYPER-ORCHESTRATION-THEORY.md`
- Ordre obligatoire: `H01 -> H23`
- Gates obligatoires: `G1 -> G5`
- Interdit: découpage artificiel en versions futures

## Structure
- `_bmad-output/planning-artifacts/` → PRD, architecture, epics, context, research, design-system, agent-mesh, handoff-matrix
- `_bmad-output/implementation-artifacts/` → stories, reviews, summaries, retros, ux-audits, handoffs, scorecards, sprint-status
- `app/` → code + stack test (Vitest + Playwright + coverage + audit)
- `scripts/` → automation quality gates + pilotage + scoring AQCD
- `config/hyper-orchestration.config.json` → règles et seuils (tech + UX + AQCD)

## Isolation multi-projets
- Tous les nouveaux projets sont créés sous: `/root/.openclaw/workspace/projects/<slug>/`
- Le projet actif est enregistré dans: `/root/.openclaw/workspace/.bmad-active-project`
- Tous les scripts BMAD utilisent automatiquement ce projet actif (code/docs/_bmad-output séparés par projet).

## Bootstrap auto du stack test (si app vide)
```bash
cd /root/.openclaw/workspace/bmad-total
bash scripts/bootstrap-test-stack.sh --ci
```

## Initialiser l'architecture Hyper-Orchestration
```bash
cd /root/.openclaw/workspace/bmad-total
bash scripts/init-hyper-orchestration.sh
```

## Gates

### Gate technique
```bash
bash scripts/run-quality-gates.sh
```

### Gate UX (par story)
```bash
bash scripts/run-ux-gates.sh S001
```

### Gate story global (tech + UX)
```bash
bash scripts/run-story-gates.sh S001
```

### Passer une story DONE (guard strict)
```bash
bash scripts/story-done-guard.sh S001
```

## UX audit template
```bash
bash scripts/new-ux-audit.sh S001 E01
```

## Handoff contract
```bash
bash scripts/new-handoff.sh pm dev "Implémenter composant login" S001 E01 H13 H14 "ux-qa:H15"
```

## Worker task (sous-agent)
```bash
bash scripts/new-worker-task.sh visual-qa-worker "Audit visuel story" S001 E01
```

## Score AQCD
```bash
bash scripts/update-aqcd-score.sh
```

## Protocole commandes
```bash
cd /root/.openclaw/workspace/bmad-total
bash scripts/control-command.sh /new "Idée projet"
bash scripts/control-command.sh /start "Consignes optionnelles"
bash scripts/control-command.sh /pause
bash scripts/control-command.sh /continue
bash scripts/control-command.sh /recap
bash scripts/control-command.sh /projects
bash scripts/control-command.sh /switch dashboard-openclaw
bash scripts/phase-complete.sh 1
bash scripts/phase-complete.sh 2
bash scripts/phase-complete.sh 3
```

## Activation directe (bas niveau)
```bash
cd /root/.openclaw/workspace/bmad-total
bash scripts/set-mode.sh active "Mon Projet"
```

## Progression
```bash
bash scripts/progress.sh
```

## Pause
```bash
bash scripts/set-mode.sh idle
```

## Reset nouveau projet
```bash
bash scripts/new-project-reset.sh
bash scripts/set-mode.sh idle ""
```
