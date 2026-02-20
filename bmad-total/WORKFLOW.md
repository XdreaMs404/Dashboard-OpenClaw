# Workflow BMAD Total (1 agent, continu, Tech + UX)

## Architecture BMAD (adaptée)
Racine artifacts: `_bmad-output/`

- Planning: `_bmad-output/planning-artifacts/`
  - `prd.md`, `architecture.md`, `epics.md`, `epics-index.md`, `product-brief.md`, `project-context.md`, `ux.md`, `design-system.md`, `bmm-workflow-status.yaml`, `research/`
- Implémentation: `_bmad-output/implementation-artifacts/`
  - `stories/`, `reviews/`, `summaries/`, `retros/`, `ux-audits/`, `handoffs/`, `scorecards/`, `sprint-status.yaml`

## Objectif
Livrer un projet complet story par story, avec qualité technique élevée **et design UX/UI élevé**.

## Pipeline par story
1. DOC de la story (fast / low)
2. DEV (xhigh)
3. UX audit (obligatoire)
4. REVIEW technique (high)
5. TESTS complets + quality gates stricts
6. Résumé simple utilisateur
7. Story = DONE (uniquement via garde-fou)

## Gates bloquants

### Gate technique
Script principal: `scripts/run-quality-gates.sh`

Obligatoire:
- lint
- typecheck
- test (unit/intégration)
- test:e2e
- test:edge (cas limites)
- test:coverage + seuil minimum
- security scan dépendances
- build

### Gate UX
Script principal: `scripts/run-ux-gates.sh <SID>`

Obligatoire:
- audit JSON présent: `_bmad-output/implementation-artifacts/ux-audits/<SID>-ux-audit.json`
- verdict UX = PASS
- design score >= seuil config
- accessibilité D2 >= seuil config
- evidence UX minimale présente
- states UI couverts: loading/empty/error/success

### Gate Story global
Script principal: `scripts/run-story-gates.sh <SID>`

La story passe seulement si:
- Gate technique ✅
- Gate UX ✅

## Garde-fou Story DONE
Utiliser: `scripts/story-done-guard.sh <SID>`

Ce script vérifie:
- review présent (`implementation-artifacts/reviews`)
- summary présent + section "Comment tester" (`implementation-artifacts/summaries`)
- audit UX JSON présent + PASS
- tous les gates techniques et UX verts
- puis seulement ensuite marque la story DONE

## Contrôle de fin d'epic (obligatoire)
Quand les 10 stories de l'epic sont DONE:
1. Audit epic entier (tech + UX)
2. Créer `_bmad-output/implementation-artifacts/retros/<EID>-retro.md`
3. Inclure au moins 3 actions concrètes
4. Inclure section "Adaptations pour l'epic suivant"
5. Valider via `scripts/validate-retro.sh <EID>`
6. Mettre à jour `epics-index.md` via `scripts/update-epic-status.sh <EID> DONE DONE`

## Scoring AQCD
Fichiers:
- metrics input: `_bmad-output/implementation-artifacts/scorecards/aqcd-metrics.json`
- latest result: `_bmad-output/implementation-artifacts/scorecards/aqcd-latest.json`
- latest report: `_bmad-output/implementation-artifacts/scorecards/aqcd-latest.md`

Commande:
- `bash scripts/update-aqcd-score.sh`

## Communication simple
Après chaque story: `_bmad-output/implementation-artifacts/summaries/<SID>-summary.md`
- Ce qui a été développé
- Comment tester simplement
- Résultats tests
- Résultats UX
- Risques restants
