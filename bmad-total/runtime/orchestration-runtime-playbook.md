# Runtime Playbook — Orchestration multi-agent BMAD

## État runtime actuel
- Sessions core agents créées et READY.
- Sessions workers créées et READY.
- Registry source de vérité: `runtime/agent-registry.json`.

## Pipeline d'exécution (story)
1. PM prépare scope + critères + handoff DEV.
2. DEV implémente + tests.
3. UX QA audite UI/UX + accessibilité + responsive.
4. TEA valide stratégie/complétude tests.
5. REVIEWER challenge qualité technique + risques.
6. TECH WRITER produit synthèse utilisateur.
7. Orchestrateur lance gates:
   - `bash scripts/run-quality-gates.sh`
   - `bash scripts/run-ux-gates.sh <SID>`
   - `bash scripts/story-done-guard.sh <SID>`

## Règles runtime
- Aucun DONE sans verdict UX PASS.
- Toute mission sous-agent doit laisser un artefact fichier.
- En cas d'échec gate: story reste non-DONE et handoff correctif est créé.

## Smoke test runtime effectué
- Chaîne complète validée sur mini-cas dans `runtime/e2e/`:
  - `01-pm-plan.md`
  - `02-dev-output.md`
  - `03-ux-audit.md`
  - `04-review.md`
  - `05-summary.md`
