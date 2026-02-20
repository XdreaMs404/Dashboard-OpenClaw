# BMAD Total - Dev Factory (aligné BMAD `_bmad-output`)

## Structure
- `_bmad-output/planning-artifacts/` → PRD, architecture, epics, context, research, design-system, agent-mesh, handoff-matrix
- `_bmad-output/implementation-artifacts/` → stories, reviews, summaries, retros, ux-audits, handoffs, scorecards, sprint-status
- `app/` → code + stack test (Vitest + Playwright + coverage + audit)
- `scripts/` → automation quality gates + pilotage + scoring AQCD
- `config/hyper-orchestration.config.json` → règles et seuils (tech + UX + AQCD)

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
bash scripts/new-handoff.sh pm dev "Implémenter composant login" S001 E01
```

## Worker task (sous-agent)
```bash
bash scripts/new-worker-task.sh visual-qa-worker "Audit visuel story" S001 E01
```

## Score AQCD
```bash
bash scripts/update-aqcd-score.sh
```

## Activation
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
