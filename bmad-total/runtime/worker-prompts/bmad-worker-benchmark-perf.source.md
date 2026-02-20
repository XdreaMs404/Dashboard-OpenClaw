# BENCHMARK_PERF_WORKER — Source Pack (bmad-worker-benchmark-perf)

Ce fichier contient les sources BMAD/locales à relire avant exécution du worker.

## Source 1: /root/.openclaw/workspace/bmad-total/scripts/run-quality-gates.sh

#!/usr/bin/env bash
set -euo pipefail
ROOT="/root/.openclaw/workspace/bmad-total"
APP_DIR="$ROOT/app"

cd "$APP_DIR"

if [ ! -f package.json ]; then
  echo "⚠ app/package.json manquant -> bootstrap automatique du stack test"
  bash "$ROOT/scripts/bootstrap-test-stack.sh" --ci
fi

# Required scripts for strict BMAD quality gates
REQUIRED=("lint" "typecheck" "test" "test:e2e" "test:edge" "test:coverage" "build")
for s in "${REQUIRED[@]}"; do
  node -e "const p=require('./package.json'); process.exit(p.scripts && p.scripts['$s'] ? 0 : 1)" \
    || { echo "❌ Missing npm script: $s"; exit 1; }
done

echo "▶ lint"
npm run lint

echo "▶ typecheck"
npm run typecheck

echo "▶ unit/integration tests"
npm test

echo "▶ e2e tests"
npm run test:e2e

echo "▶ edge-case tests"
npm run test:edge

echo "▶ coverage tests"
npm run test:coverage

node "$ROOT/scripts/check-coverage.mjs"

# Security scan (script override allowed)
bash "$ROOT/scripts/security-scan.sh"

echo "▶ build"
npm run build

echo "✅ QUALITY_GATES_OK"

## Source 2: /root/.openclaw/workspace/docs/BMAD-HYPER-ORCHESTRATION-THEORY.md

# Blueprint Théorique — Système BMAD Multi-Agents Hyper-Intelligent (OpenClaw)

## Scope
Document **100% théorique** (aucune implémentation) pour construire une organisation BMAD complète avec Jarvis en chef, agents spécialisés, sous-agents workers, et gouvernance **qualité / coût / design UI-UX**.

---

## 1) Principes d’architecture (non négociables)

1. **Jarvis orchestre, les spécialistes exécutent**.
2. **Chaque handoff produit un artefact structuré** (pas de handoff “oral”).
3. **Chaque phase BMAD a un gate explicite** (PASS / CONCERNS / FAIL).
4. **Le DONE est déterministe** (tests + checks), jamais déclaratif.
5. **L’autonomie est bornée** (budget, timeout, concurrence, stop conditions).
6. **Le contexte est externalisé dans les artefacts** (`_bmad-output`), pas dans la mémoire implicite.
7. **UI/UX est une contrainte produit de premier ordre**, pas une option “cosmétique”.
8. **Prompt seul ne suffit pas pour le design**: il faut un rôle UX dédié + un gate UX mesurable.
9. **Aucune story n’est DONE sans validation UX explicite**.
10. **Amélioration continue obligatoire** via rétro d’epic et fermeture des actions.

---

## 2) Cartographie complète des agents

## 2.1 Couches

- **Couche A — Gouvernance**: Jarvis (orchestrateur principal)
- **Couche B — Spécialistes BMAD persistants**: PM, Architect, SM, DEV, TEA, UX, etc.
- **Couche C — Workers éphémères (subagents)**: recherche, fact-check, audits, génération ciblée
- **Couche D — Contrôle déterministe**: gates scripts/CI/checklists
- **Couche E — Design Governance**: design authority + design QA (story-level)

## 2.2 Agents persistants (noyau recommandé)

### 1) Jarvis (Chief Orchestrator)
- Mission: pilotage global, priorisation, arbitrage, décision finale de passage de gate.
- Inputs: objectifs business, état du sprint, scores AQCD, risques.
- Outputs: plan d’exécution phase par phase, décisions go/no-go.
- KPI: cycle time global, taux de blocage, stabilité du throughput.

### 2) Brainstorming Coach
- Mission: divergence cadrée (idées, hypothèses, options).
- Inputs: brief initial, contraintes business.
- Outputs: `brainstorming-report.md`.
- KPI: diversité d’options utiles, qualité des hypothèses testables.

### 3) Analyst
- Mission: recherche marché/tech/risques, synthèse fiable.
- Inputs: sujet, questions de recherche.
- Outputs: `research/*`, `product-brief.md` (co-produit).
- KPI: taux d’affirmations sourcées, réduction d’incertitudes critiques.

### 4) PM
- Mission: PRD, scope, priorisation, epics/stories.
- Inputs: brief + research + contraintes.
- Outputs: `prd.md`, `epics.md`, `epics-index.md`.
- KPI: clarté des AC, stabilité de scope, ratio story “ready”.

### 5) UX Designer (Design Authority)
- Mission: définir le niveau d’excellence UX, règles d’interface, patterns, accessibilité, responsive.
- Inputs: PRD + personas + flux + contraintes produit.
- Outputs: `ux.md` (ou `ux-spec.md`) + règles design obligatoires.
- KPI: ambiguïtés UX détectées avant implémentation, cohérence visuelle globale.

### 6) Architect
- Mission: architecture cible, ADRs, NFRs, readiness.
- Inputs: PRD + UX + contexte technique.
- Outputs: `architecture.md`, verdict readiness.
- KPI: incidents d’architecture évités, dette technique évitée.

### 7) SM (Scrum Master)
- Mission: sprint planning, préparation story, séquencement.
- Inputs: epics + architecture + statut sprint.
- Outputs: `sprint-status.yaml`, story packs ready.
- KPI: taux de stories “prêtes du premier coup”.

### 8) DEV
- Mission: implémentation story + tests + mise à jour story record.
- Inputs: story + contexte + contraintes techniques + règles UX.
- Outputs: code + tests + update story file.
- KPI: first-pass gate success, taux de régression.

### 9) TEA (Test Architect)
- Mission: stratégie de test, traçabilité, quality gate.
- Inputs: ACs, code, tests, coverage, CI.
- Outputs: validation/gaps + décision qualité.
- KPI: défauts échappés, flakiness, couverture utile.

### 10) Reviewer (Senior Code Review)
- Mission: revue technique, sécurité, maintenabilité.
- Inputs: diff + tests + evidence QA.
- Outputs: approve / changes requested / blocked.
- KPI: défauts trouvés avant merge, rework ratio.

### 11) UX QA Auditor (Design Guardian)
- Mission: vérifier **chaque implémentation** contre le standard UX/UI cible.
- Inputs: story implémentée + captures UI + states (loading/empty/error/success) + règles UX.
- Outputs: verdict UX (PASS / CONCERNS / FAIL) + liste de corrections.
- KPI: défauts UX bloqués avant DONE, cohérence design-system, accessibilité réelle.

### 12) Tech Writer
- Mission: doc dev/exploitation/runbook/changelog.
- Inputs: implémentation validée + décisions.
- Outputs: docs durables et actionnables.
- KPI: docs à jour, réduction des questions récurrentes.

## 2.3 Sous-agents workers éphémères (à spawn)

- Web-research worker
- Fact-check worker
- Competitive scan worker
- Security dependency worker
- Test generation worker
- Edge-case worker
- Benchmark/perf worker
- Doc consistency worker
- **Visual QA worker** (captures, diff visuel, cohérence composants)
- **Accessibility audit worker** (WCAG, contrastes, focus, navigation clavier)
- **Responsive audit worker** (mobile/tablet/desktop)
- **Design consistency worker** (tokens, spacing, typo, composants)

Règle: un worker = **1 objectif clair, 1 format de sortie, 1 limite de temps**.

---

## 3) Contrat standard de handoff (format unique)

Chaque handoff doit contenir:

- `from_agent`
- `to_agent`
- `objective`
- `constraints`
- `inputs` (artefacts + versions)
- `required_output_schema`
- `done_definition_local`
- `deadline_or_timeout`
- `escalation_rule`
- `design_requirements` (si UI impactée)
- `ux_verification_required` (bool)

Ce contrat réduit les pertes d’info et limite les erreurs de coordination.

---

## 4) Matrice de handoff BMAD complète

## Phase 1 — Analysis

- **H01** Jarvis → Brainstorming Coach  
  Output: `planning-artifacts/research/brainstorming-report.md`
- **H02** Jarvis → Analyst (market + tech + risk research)  
  Output: `planning-artifacts/research/*.md`
- **H03** Analyst + Brainstorming → PM  
  Output: `planning-artifacts/product-brief.md`

**Gate G1 (Analysis Quality)**: hypothèses testables + risques majeurs identifiés + sources minimales.

## Phase 2 — Planning

- **H04** PM → PM (PRD structuré)  
  Output: `planning-artifacts/prd.md`
- **H05** PM → UX Designer  
  Output: `planning-artifacts/ux.md`
- **H06** UX Designer → PM/Architect  
  Output: contraintes UX exploitables + standards UI obligatoires
- **H07** PM + UX → Jarvis (validation de complétude)

**Gate G2 (Planning Quality)**: PRD actionnable, ACs vérifiables, ambiguïtés critiques levées, règles UX explicites.

## Phase 3 — Solutioning

- **H08** PM + UX → Architect  
  Output: `planning-artifacts/architecture.md`
- **H09** Architect → PM  
  Output: `planning-artifacts/epics/*.md`, `epics.md`, `epics-index.md`
- **H10** PM + Architect → Architect (readiness check)  
  Output: PASS / CONCERNS / FAIL

**Gate G3 (Implementation Readiness)**: cohérence PRD/UX/archi/epics + risques acceptables + design constraints traçables dans les stories.

## Phase 4 — Implementation (boucle story)

- **H11** Jarvis → SM (init sprint planning)  
  Output: `implementation-artifacts/sprint-status.yaml`
- **H12** SM → SM (create next story)  
  Output: `implementation-artifacts/stories/Sxxx.md`
- **H13** SM → DEV (story pack prêt)
- **H14** DEV → UX QA Auditor (evidence UX/UI + captures + states)
- **H15** UX QA Auditor → DEV/TEA (verdict UX + corrections)
- **H16** DEV → TEA (evidence de test + qualité technique)
- **H17** TEA → Reviewer (statut qualité + gaps)
- **H18** Reviewer → Jarvis (approve / changes / blocked)
- **H19** Jarvis → SM (update status + next story)

**Gate G4 (Story Done Global)** = **G4-T + G4-UX**

- **G4-T (Technique)**: lint/typecheck/tests/edge/e2e/coverage/security/build + review OK.
- **G4-UX (Design)**: conformité design system + accessibilité + responsive + états d’interface + clarté UX validées.

Si G4-T passe mais G4-UX échoue, la story reste **non-DONE**.

## Fin d’epic

- **H20** SM → Jarvis (epic candidate complete)
- **H21** Jarvis → SM/TEA/UX QA (retrospective élargie technique + design)
- **H22** Retro → PM/Architect/UX (adaptations pour epic suivant)
- **H23** Jarvis → Sprint system (next epic activation)

**Gate G5 (Epic Close)**: rétro validée + actions concrètes + adaptation planifiée, incluant les dettes UX/UI.

---

## 5) Modèle de scoring Autonomie / Qualité / Coût / Design (AQCD)

## 5.1 Score global

- `Score_Global = 0.30 * Qualité_Tech + 0.25 * Design_Excellence + 0.25 * Autonomie + 0.20 * Efficience_Coût`

Pourquoi: on garde la qualité technique centrale, mais on donne un poids fort au design pour refléter la priorité produit.

## 5.2 Score Autonomie (0–100)

- **A1**: % stories complétées sans intervention humaine manuelle
- **A2**: taux de handoff réussi (sans retour arrière)
- **A3**: taux de runs terminés sans timeout/abort
- **A4**: respect du SLA de cycle (story lead time)

Formule:
- `Autonomie = 0.35*A1 + 0.25*A2 + 0.20*A3 + 0.20*A4`

## 5.3 Score Qualité_Tech (0–100)

- **Q1**: taux de passage des quality gates au 1er essai
- **Q2**: défauts échappés (post-merge) inversés en score
- **Q3**: robustesse tests (coverage utile + flakiness inversée)
- **Q4**: rework ratio après review
- **Q5**: taux de fermeture des actions de rétro

Formule:
- `Qualité_Tech = 0.30*Q1 + 0.25*Q2 + 0.20*Q3 + 0.15*Q4 + 0.10*Q5`

## 5.4 Score Efficience_Coût (0–100)

- **C1**: coût/story acceptée (vs baseline)
- **C2**: token waste ratio (retries, runs annulés, duplication)
- **C3**: efficacité du routing modèle (bon modèle au bon rôle)
- **C4**: throughput utile par unité de coût

Formule:
- `Efficience_Coût = 0.30*C1 + 0.30*C2 + 0.20*C3 + 0.20*C4`

## 5.5 Score Design_Excellence (0–100)

- **D1**: conformité design-system (tokens, spacing, typo, composants)
- **D2**: accessibilité (WCAG 2.2 AA cible)
- **D3**: responsive quality (mobile/tablet/desktop)
- **D4**: qualité des interactions (loading/empty/error/success/focus)
- **D5**: hiérarchie visuelle + lisibilité + clarté parcours
- **D6**: performance perçue UX (stabilité visuelle, fluidité)

Formule:
- `Design_Excellence = 0.25*D1 + 0.20*D2 + 0.15*D3 + 0.15*D4 + 0.15*D5 + 0.10*D6`

## 5.6 Seuils opérationnels

- **85–100**: Industriel (autonomie forte, stable)
- **70–84**: Stable (améliorable)
- **55–69**: Fragile (surveillance rapprochée)
- **<55**: Non acceptable (retour mode supervisé)

## 5.7 Seuils bloquants design

- Story non-DONE si `Design_Excellence < 80`
- Story non-DONE si `D2 (accessibilité) < 85`

## 5.8 Kill-switch théorique (sécurité opérationnelle)

- Si `Qualité_Tech < 65` sur 2 cycles: bloquer autonomie partielle, revue humaine renforcée.
- Si `Design_Excellence < 75` sur 2 stories consécutives: blocage de sortie + correction design prioritaire.
- Si `C2 (waste) > 25%`: réduire concurrence, simplifier chaînes d’agents.
- Si défaut critique échappé: gate architecture + QA + UX renforcé obligatoire avant reprise.

---

## 6) Cadence de pilotage recommandée

- **Par story**: G4 (tech + UX) + mise à jour AQCD story-level
- **Par epic**: G5 + rétro + plan d’adaptation
- **Hebdo**: revue portefeuille (tendance AQCD, goulots, coûts)
- **Mensuel**: ajustement architecture d’agents (ajout/suppression/réallocation)
- **Bimensuel UX**: revue design-system et dette UX transversale

---

## 7) Anti-patterns à éviter

1. Spawn massif sans contrat de sortie
2. “Agent expert” sans limite d’outil
3. Handoff verbal sans artefact
4. Validation uniquement LLM (sans scripts/tests)
5. Confiance aveugle dans les annonces async
6. Mélange contextes privés/publics sans cloisonnement
7. Ajustements permanents sans baseline métrique
8. **Pilotage UX en “prompt only” sans rôle ni gate dédié**

---

## 8) Modèle de maturité (théorique)

- **Niveau 0**: Mono-agent assisté
- **Niveau 1**: Orchestration BMAD séquentielle
- **Niveau 2**: Parallélisation workers contrôlée
- **Niveau 3**: Gouvernance AQCD + rétro adaptative
- **Niveau 4**: Système auto-optimisant sous contraintes

Objectif réaliste court terme: atteindre **Niveau 3 stable** avant d’augmenter encore l’autonomie.

---

## 9) Décision d’architecture UI/UX (question clé)

## Option A — Prompt uniquement
- Avantage: simple, rapide.
- Limite: inconsistant, difficile à auditer, fragile à l’échelle.
- Verdict: acceptable uniquement pour proto rapide.

## Option B — Agent/sous-agent UX uniquement
- Avantage: meilleure qualité que prompt seul.
- Limite: peut dériver si les contraintes ne sont pas codifiées partout.
- Verdict: bon, mais incomplet sans baseline globale.

## Option C — **Hybride (recommandé)**
Combiner:
1. **Prompt baseline UX permanent** (règles de design partout),
2. **UX Designer persistant** (vision et standards),
3. **UX QA Auditor + workers UX** sur chaque story,
4. **Gate G4-UX bloquant**.

Verdict: meilleur ratio cohérence / qualité / scalabilité.

---

## 10) UI/UX Definition of Done minimale (théorique)

Une story UI est DONE uniquement si:

- [ ] composants conformes design-system
- [ ] états loading/empty/error/success présents
- [ ] responsive validé mobile/tablet/desktop
- [ ] accessibilité AA minimale validée
- [ ] navigation clavier/focus/contraste validés
- [ ] aucune incohérence visuelle critique
- [ ] verdict UX QA = PASS

---

## Conclusion

La meilleure version pour ton cas: **Jarvis-Orchestrated BMAD Cell System avec Design Governance intégrée**.

Ce n’est pas “plus d’agents = mieux”.  
C’est: **bons rôles + bons handoffs + bons gates + bonnes métriques + discipline UX**.

Avec ce modèle, tu maximises l’autonomie sans sacrifier ce qui est critique pour toi:  
**un niveau de design UI/UX élevé, constant et vérifiable**.
