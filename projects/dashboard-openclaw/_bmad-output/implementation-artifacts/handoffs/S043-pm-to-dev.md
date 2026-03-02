# H13 — PM → DEV — S043 (scope strict canonique E04-S07)

## Story
- ID: S043
- Canonical story: E04-S07
- Epic: E04
- Project root: /root/.openclaw/workspace/projects/dashboard-openclaw

## Scope strict
- Respect strict de la story S043 uniquement.
- Interdit de dériver vers d'autres stories/features.

## Objectifs DEV
1. Implémenter uniquement le scope canonique de E04-S07.
2. Ajouter/adapter tests unit + edge + e2e liés à la story.
3. Publier les handoffs:
   - S043-dev-to-uxqa.md
   - S043-dev-to-tea.md

## AC ciblés
- Couvrir les AC de la story source: /root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/implementation-artifacts/stories/S043.md
- Valider les 4 états UI: empty/loading/error/success si composant UI

## Validation minimale DEV
- cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
- npm run lint && npm run typecheck
- BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw bash /root/.openclaw/workspace/bmad-total/scripts/run-fast-quality-gates.sh S043

## Next handoff
DEV → UXQA (H14) et DEV → TEA (H16)
