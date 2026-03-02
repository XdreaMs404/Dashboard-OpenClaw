# H13 — PM → DEV — S042 (scope strict canonique E04-S06)

## Story
- ID: S042
- Canonical story: E04-S06
- Epic: E04
- Project root: /root/.openclaw/workspace/projects/dashboard-openclaw

## Scope strict
- Respect strict de la story S042 uniquement.
- Interdit de dériver vers d'autres stories/features.

## Objectifs DEV
1. Implémenter uniquement le scope canonique de E04-S06.
2. Ajouter/adapter tests unit + edge + e2e liés à la story.
3. Publier les handoffs:
   - S042-dev-to-uxqa.md
   - S042-dev-to-tea.md

## AC ciblés
- Couvrir les AC de la story source: /root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/implementation-artifacts/stories/S042.md
- Valider les 4 états UI: empty/loading/error/success si composant UI

## Validation minimale DEV
- cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
- npm run lint && npm run typecheck
- BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw bash /root/.openclaw/workspace/bmad-total/scripts/run-fast-quality-gates.sh S042

## Next handoff
DEV → UXQA (H14) et DEV → TEA (H16)
