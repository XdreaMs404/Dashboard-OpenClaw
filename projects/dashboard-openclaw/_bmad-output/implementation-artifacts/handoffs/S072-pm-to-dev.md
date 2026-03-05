# H13 — PM → DEV — S072 (scope strict canonique E06-S12)

## Story
- ID: S072
- Canonical story: E06-S12
- Epic: E06
- Project root: /root/.openclaw/workspace/projects/dashboard-openclaw

## Scope strict
- Respect strict de la story S072 uniquement.
- Interdit de dériver vers d'autres stories/features.

## Objectifs DEV
1. Implémenter uniquement le scope canonique de E06-S12.
2. Ajouter/adapter tests unit + edge + e2e liés à la story.
3. Publier les handoffs:
   - S072-dev-to-uxqa.md
   - S072-dev-to-tea.md

## AC ciblés
- Couvrir les AC de la story source: /root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/implementation-artifacts/stories/S072.md
- Valider les 4 états UI: empty/loading/error/success si composant UI

## Validation minimale DEV
- cd /root/.openclaw/workspace/projects/dashboard-openclaw/app
- npm run lint && npm run typecheck
- BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw bash /root/.openclaw/workspace/bmad-total/scripts/run-fast-quality-gates.sh S072

## Next handoff
DEV → UXQA (H14) et DEV → TEA (H16)
