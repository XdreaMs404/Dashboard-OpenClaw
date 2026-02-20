---
title: "H07 — Validation de complétude planning (PM + UX -> Jarvis)"
phase: "H07"
project: "dashboard-openclaw"
date: "2026-02-20"
workflowType: "BMAD Planning Validation"
executionMode: "agent-by-agent + file-by-file"
referenceBenchmark: "https://github.com/XdreaMs404/ExempleBMAD"
qualityTarget: "Gate G2 validé de manière argumentée avec concerns explicites"
owners:
  pm: "PM BMAD"
  ux: "UX Designer BMAD"
  validation: "Jarvis / Orchestrateur"
stepsCompleted:
  - "Lecture des cadres BMAD-HYPER-ORCHESTRATION-THEORY et BMAD-ULTRA-QUALITY-PROTOCOL"
  - "Lecture complète des artefacts planning obligatoires: PRD, UX, implementation-patterns, competition-benchmark, risks-constraints"
  - "Contrôle de conformité metadata (stepsCompleted/inputDocuments) sur les artefacts majeurs"
  - "Vérification de la complétude PRD: FR/NFR/AC/KPI, dépendances, risques, conditions G2, handoff H05/H07/H08"
  - "Vérification de la complétude UX: contraintes H06, standards UI bloquants, plan de tests G4-UX, traçabilité FR/NFR"
  - "Croisement PRD/UX avec les risques critiques et dépendances D01..D16 issus de H02"
  - "Évaluation des ambiguïtés résiduelles explicitement taguées et de leur impact gate"
  - "Rendu d’un verdict par axe (scope/AC/UX/risks/dependencies) et décision finale G2"
  - "Formalisation d’actions correctives non bloquantes avant H08/H10"
inputDocuments:
  - "/root/.openclaw/workspace/docs/BMAD-HYPER-ORCHESTRATION-THEORY.md"
  - "/root/.openclaw/workspace/docs/BMAD-ULTRA-QUALITY-PROTOCOL.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/prd.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/ux.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/implementation-patterns.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/competition-benchmark.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/risks-constraints.md"
---

# H07 — Planning Validation (G2)

## 1) Mandat H07 et méthode de validation

Objectif H07: valider la complétude planning PRD+UX avant poursuite de la chaîne solutioning, avec un verdict explicite pour le gate **G2**.

Référentiel de décision appliqué:
- BMAD Hyper-Orchestration Theory: gate **G2** = PRD actionnable, AC vérifiables, ambiguïtés critiques levées, règles UX explicites.
- BMAD Ultra Quality Protocol: exécution agent/fichier, traçabilité, metadata obligatoires, profondeur documentaire.

Méthode de validation utilisée:
1. Contrôle documentaire (présence, structure, frontmatter, traçabilité).
2. Contrôle de complétude planning (scope, FR/NFR/AC, UX, risques, dépendances).
3. Contrôle de cohérence inter-documents (PRD ↔ UX ↔ recherches H02).
4. Classification des ambiguïtés résiduelles en bloquantes vs non bloquantes.
5. Verdict par axe puis décision finale **PASS | CONCERNS | FAIL** pour **G2**.

## 2) Contrôles de complétude documentaire ULTRA (preuve de base)

### 2.1 Vérification présence/structure des artefacts obligatoires

| Artefact | Statut lecture | Lignes | Sections H2 | Metadata stepsCompleted/inputDocuments | Résultat |
|---|---:|---:|---:|---|---|
| `prd.md` | OK | 1364 | 26 | Oui / Oui | PASS |
| `ux.md` | OK | 925 | 25 | Oui / Oui | PASS |
| `research/implementation-patterns.md` | OK | 1220 | 16 | Oui / Oui | PASS |
| `research/competition-benchmark.md` | OK | 617 | 15 | Oui / Oui | PASS |
| `research/risks-constraints.md` | OK | 1126 | 17 | Oui / Oui | PASS |

### 2.2 Vérification de profondeur planning exploitable

Constats quantitatifs (PRD/UX):
- PRD: **82 FR**, **164 AC** (A/B), **40 NFR**, **30 KPI**, **20 critères G2-C01..C20**.
- UX: couverture explicite de **82 FR**, **40 NFR**, **48 tests TC-UX**, **10 contraintes H06-UXC**.
- Les 12 questions ouvertes PRD (Q-01..Q-12) sont taguées et affectées (H05/H08/H07), donc ambiguïtés non cachées.

Conclusion documentaire:
- Les entrées H07 sont présentes, riches, traçables et exploitables.
- Aucun manque bloquant de structure n’a été observé.

## 3) Validation G2 détaillée (checklist C01..C20)

| Critère G2 | Evidence principale | Vérification H07 | Statut |
|---|---|---|---|
| G2-C01 PRD complet + metadata | PRD frontmatter + sections 1..26 | `stepsCompleted` et `inputDocuments` présents | PASS |
| G2-C02 FR traçables | PRD §9 + §25 | IDs FR-001..FR-082, mapping JTBD/risque/KPI | PASS |
| G2-C03 NFR mesurables | PRD §11 | NFR-001..040 avec cibles quantifiées | PASS |
| G2-C04 AC mesurables | PRD §10 | AC-001A..082B, méthode de test et gate impacté | PASS |
| G2-C05 Personas/JTBD explicites | PRD §5 et §6 | Personas décisionnels + JTBD reliés à outcomes | PASS |
| G2-C06 Règles UX explicites | PRD §12 + UX §§8..15 | Règles UXR + standards de comportement UI | PASS |
| G2-C07 Dual gate G4 documenté | PRD §§10,12,21 + UX §§11,18,19 | Blocage DONE si G4-T ou G4-UX != PASS | PASS |
| G2-C08 Sécurité commandes spécifiée | PRD §13 + UX §14 + risks §9 | RBAC, allowlist, dry-run, root signé, audit | PASS |
| G2-C09 Dépendances critiques identifiées | PRD §15 + risks §4 | D01..D20 (PRD) et D01..D16 (risk register) | PASS |
| G2-C10 Risques + mitigations actionnables | PRD §18 + risks §§5..16 | registre structuré, owners, scores, contingence | PASS |
| G2-C11 Plan KPI/instrumentation | PRD §16 + UX §17 + risks §12 | KPI owner/fréquence + seuils + escalade | PASS |
| G2-C12 Plan rollout réaliste | PRD §19 + impl. patterns §13 | R0..R11 avec critères de passage | PASS |
| G2-C13 Plan tests pré-H08/H10 | PRD §20 + UX §18 + impl. patterns §10 | catalogue FR/NFR/UX/sécu/perf couvrant gates | PASS |
| G2-C14 Hypothèses ouvertes listées | PRD §24 + benchmark §13 | questions ouvertes explicites et phase owner | PASS |
| G2-C15 Handoff H05/H07/H08 préparé | PRD §22 + UX §20 + risks §15 | décisions transférables explicites | PASS |
| G2-C16 Aucune ambiguïté critique non taguée | PRD §24 + section concerns H07 | ambiguïtés existantes sont identifiées/assignées | PASS |
| G2-C17 Conformité ULTRA | PRD/UX metadata + trace H07 | discipline agent/fichier/trace confirmée | PASS |
| G2-C18 Référence qualité explicite | frontmatter + sections sources | lien ExempleBMAD présent dans livrables | PASS |
| G2-C19 Critères de succès quantifiés | PRD §§4,16 + UX §1 | objectifs chiffrés TCD, adoption, quality, cost | PASS |
| G2-C20 Prêt pour design détaillé H05 | UX complet + H06 contraintes | contraintes UX exploitables et testables | PASS |

Lecture H07:
- Les 20 critères du gate **G2** sont couverts par preuves documentaires.
- La complétude planning est validée sur le fond.

## 4) Verdict par axe demandé (scope / AC / UX / risks / dependencies)

| Axe | Résumé du contrôle | Verdict axe | Justification synthétique |
|---|---|---|---|
| Scope | Vision, proposition de valeur, anti-scope V1, segment cible, rollout | PASS | Scope principal cohérent “décision+preuve+action”, anti-scope documenté, mais capacité V1 à surveiller |
| AC | FR/NFR/AC quantifiés et testables | PASS | Couverture forte (FR 82, AC 164, NFR 40), critères testables et reliés aux gates |
| UX | Règles UX explicites, contraintes H06, tests G4-UX | PASS | UX normative et bloquante, dual gate explicite, accessibilité/responsive/states cadrés |
| Risks | Registre consolidé, top risques critiques, monitoring | CONCERNS | Couverture excellente mais plusieurs risques critiques restent à fermer avant H10 |
| Dependencies | D01..D16/D20, owners, impacts, exigences d’architecture | CONCERNS | Dépendances bien identifiées; certaines exigent datation/validation nominative avant H08 |

## 5) Ambiguïtés résiduelles et concerns explicites (non bloquants G2)

> Toutes les ambiguïtés ci-dessous sont **taguées** et donc compatibles avec un **PASS G2** sous plan d’action.

| ID | Concern résiduel | Impact potentiel | Niveau | Bloquant G2 | Action corrective minimale |
|---|---|---|---|---|---|
| CONC-01 | Taille du scope V1 (82 FR) vs capacité réelle équipe | dérive calendrier / rework | Élevé | Non | figer MUST v1 et déplacer SHOULD/COULD en V1.1 |
| CONC-02 | Précision initiale readiness predictor (Q-02) non prouvée en réel | recommandations inexactes | Modéré | Non | lancer baseline + validation hebdo sur historique pilote |
| CONC-03 | Self-host readiness (M07/D12) pas encore datée au niveau livrable planning | objection sécurité enterprise | Élevé | Non | publier jalons datés pré-H08 (architecture + sécu) |
| CONC-04 | ROI TCD (M02) dépend d’une baseline terrain non encore mesurée | valeur business contestable | Élevé | Non | instrumenter baseline TCD dès pilote R0 |
| CONC-05 | Sign-off inter-rôles D16 non encore matérialisé nominativement | ambiguïté de responsabilité | Modéré | Non | produire matrice sign-off PM/Arch/UX/TEA avec dates |
| CONC-06 | Politique rétention/suppression (Q-04, S08, D14) à confirmer client régulé | risque conformité | Élevé | Non | valider policy profile + revue Security/DPO avant GA |
| CONC-07 | Fatigue notifications (U06) sans baseline d’usage réel | baisse adoption | Modéré | Non | activer KPI fatigue + tuning thresholds sous 2 sprints |
| CONC-08 | Packaging pricing/positionnement encore hypothétique (benchmark E1..E6) | risque GTM | Modéré | Non | exécuter expérimentations marché et boucler vers PM |

## 6) Actions correctives exigées suite aux concerns

| Action ID | Action | Owner cible | Échéance recommandée | Preuve de clôture attendue |
|---|---|---|---|---|
| ACT-01 | Prioriser backlog V1 par criticité gate (MUST/SHOULD/COULD) | PM | avant H08 final | tableau de scope signé + stories recadrées |
| ACT-02 | Initialiser baseline TCD + dashboard de suivi ROI | PM + Ops | Sprint 1 implémentation | KPI baseline publié et versionné |
| ACT-03 | Datation du plan self-host security readiness | Architecte + Security | avant H10 readiness | roadmap datée + risques M07/S08 mis à jour |
| ACT-04 | Produire matrice de sign-off nominative D16 | Orchestrateur + PM | immédiat (pré-H08) | document sign-off horodaté |
| ACT-05 | Valider politique rétention/export avec Security/DPO | Security Lead | pré-GA | policy validée + tests conformité |
| ACT-06 | Lancer calibration notifications (fatigue/ack SLA) | UX Lead + Orchestrateur | 2 sprints | KPI U06 sous seuil + rapport tuning |
| ACT-07 | Exécuter plan d’expérimentation marché E1..E6 | PMM + PM | 30 jours | rapport d’expériences + décisions pricing |
| ACT-08 | Vérifier précision readiness predictor vs données réelles | Architecte + PM | 30-45 jours | score précision publié et expliqué |

## 7) Décision finale H07 — Gate G2

Décision consolidée PM+UX vers Jarvis:
- **Verdict final G2: PASS**
- Mode de décision: **PASS avec concerns non bloquants** (8 max, explicités et actionnables)

Argumentaire final:
1. Les exigences de complétude planning sont remplies (scope, AC, UX, risques, dépendances).
2. Les critères G2-C01..C20 sont couverts avec preuves directes dans PRD/UX/H02.
3. Les ambiguïtés résiduelles sont explicites, taguées, affectées et non critiques pour la sortie H07.
4. Aucun critère de **FAIL immédiat G2** (tel que défini en PRD §21) n’a été détecté.
5. Le passage vers H08 est autorisé sous exécution des actions ACT-01..ACT-08.

Conditions de maintien du PASS:
- conserver le blocage strict dual gate (G4-T/G4-UX);
- ne pas contourner les contrôles ULTRA (metadata + trace + quality checks);
- verrouiller les owners/dates des concerns avant readiness H10.

## 8) Sign-off PM + UX -> Jarvis

| Rôle | Position | Commentaire |
|---|---|---|
| PM BMAD | PASS | Planning actionnable, testable, traçable; concerns pilotables |
| UX Designer BMAD | PASS | Contraintes UX bloquantes explicites et exploitables en architecture |
| Décision H07 transmise à Jarvis | PASS | Gate **G2** validé avec plan correctif |

---

**Conclusion exécutable:** H07 est validé, **G2 = PASS** avec concerns explicites (non bloquants), et plan correctif immédiatement actionnable.
