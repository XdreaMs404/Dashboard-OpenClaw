---
title: "H04 — PRD approfondi et actionnable: Dashboard OpenClaw"
phase: "H04"
project: "dashboard-openclaw"
date: "2026-02-20"
workflowType: "BMAD Planning"
executionMode: "agent-by-agent + file-by-file"
referenceBenchmark: "https://github.com/XdreaMs404/ExempleBMAD"
qualityTarget: "G2-ready, traçable, mesurable, exploitable par H05/H07/H08"
owners:
  product: "PM BMAD"
  governance: "Orchestrateur"
  ux: "UX QA Lead"
  architecture: "Architecte Plateforme"
stepsCompleted:
  - "Lecture des contraintes BMAD H01→H23 et des gates G1→G5"
  - "Lecture du protocole BMAD Ultra Quality et extraction des obligations H04"
  - "Analyse du brainstorming H01 (personas, JTBD, opportunités, hypothèses)"
  - "Analyse du benchmark d’implémentation (patterns techniques, modèles data, sécurité)"
  - "Analyse du benchmark concurrentiel (positionnement, pricing, différenciation)"
  - "Analyse du registre risques/contraintes et des dépendances critiques D01..D16"
  - "Synthèse opérationnelle des décisions transférables vers H05/H07/H08"
  - "Formalisation FR/NFR traçables avec critères de test et métriques associées"
  - "Définition des critères d’acceptation mesurables et des conditions de Gate G2"
  - "Consolidation du plan d’instrumentation KPI, rollout, tests et contingence"
inputDocuments:
  - "/root/.openclaw/workspace/docs/BMAD-HYPER-ORCHESTRATION-THEORY.md"
  - "/root/.openclaw/workspace/docs/BMAD-ULTRA-QUALITY-PROTOCOL.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/brainstorming-report.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/implementation-patterns.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/competition-benchmark.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/risks-constraints.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/exemplebmad-analysis-2026-02-20.md"
---

# Product Requirements Document — Dashboard OpenClaw

## 1. Résumé exécutif
Ce PRD H04 formalise une **Control Tower BMAD orientée décision** pour réduire le *Time-to-confident-decision (TCD)*.
Le produit cible une gouvernance opérationnelle où chaque décision est reliée à une preuve, un owner, un gate et une action suivante.
Le périmètre V1 est volontairement centré sur la valeur mesurable: Pipeline H01→H23, Gate Center, Evidence Graph, Command Broker sécurisé, AQCD de pilotage et Risk Radar.
Le document respecte les exigences de qualité documentaire BMAD ULTRA et intègre explicitement la référence de calibrage: https://github.com/XdreaMs404/ExempleBMAD.

Décisions de cadrage prises dans ce PRD:
- Positionnement: **décision + preuve + action**, et non dashboard d’observabilité générique.
- Segment primaire: équipes AI produit multi-rôles (21–60 personnes) avec dette de coordination élevée.
- Scope V1: Gate Center dual (G4-T/G4-UX), Artifact Explorer, Evidence Graph, Command Dry-Run, Risk/AQCD cockpit.
- Anti-scope V1: autonomie corrective complète, ML prédictif opaque, intégrations massives non critiques.
- Critère principal de succès: réduction TCD >= 30% sur pilote.

## 2. Sources, méthode et traçabilité
Le PRD est dérivé directement des entrées imposées et des contraintes BMAD de gouvernance process.
Aucun bloc n’est laissé en placeholder: chaque exigence est liée à au moins une source et à un risque explicite.

| Code source | Document | Usage dans ce PRD |
|---|---|---|
| SRC-01 | BMAD-HYPER-ORCHESTRATION-THEORY.md | Règles H01→H23, gates G1→G5, dual gate G4, gouvernance AQCD |
| SRC-02 | BMAD-ULTRA-QUALITY-PROTOCOL.md | Contraintes ULTRA: metadata, trace, agent/file granularity, checks bloquants |
| SRC-03 | brainstorming-report.md | Personas, JTBD, hypothèses, opportunités, pain points P01..P12 |
| SRC-04 | implementation-patterns.md | Patterns AP-01..AP-16, modèle data, observabilité, sécurité commande |
| SRC-05 | competition-benchmark.md | Positionnement, segmentation, packaging, différenciation V1 |
| SRC-06 | risks-constraints.md | Registre risques C/M/P/S/T/U, dépendances D01..D16, monitoring |
| SRC-07 | exemplebmad-analysis-2026-02-20.md | Exigence de profondeur documentaire et traçabilité équivalente/supérieure |
| SRC-08 | https://github.com/XdreaMs404/ExempleBMAD | Référence explicite de qualité documentaire cible |

Critères méthodologiques appliqués:
- Traçabilité FR/NFR/AC avec IDs stables.
- Critères de test mesurables (SLO, SLA, seuils d’échec).
- Alignement systématique vers H05 (UX), H07 (planning completeness), H08 (architecture).
- Intégration explicite des risques critiques (top 10) et mitigations actionnables.

## 3. Vision produit, proposition de valeur et non-objectifs
### Vision
Créer la tour de contrôle BMAD qui convertit des signaux dispersés en décisions rapides, fiables et auditables.

### Proposition de valeur centrale
- Réduire le TCD sur décisions phase/gate.
- Empêcher les faux DONE via dual gate technique + UX.
- Relier chaque décision à ses preuves (documents, tests, gates, commandes).
- Permettre une action sécurisée (dry-run, RBAC, audit immuable).

### Non-objectifs explicites de V1
- Ne pas remplacer tout l’écosystème outillage existant (Jira/Linear/Notion/CI).
- Ne pas implémenter de correction autonome sans validation humaine.
- Ne pas imposer un framework agentique unique.
- Ne pas lancer de ML prédictif opaque sans baseline fiable.

| Axe | In-scope V1 | Out-of-scope V1 | Raison produit |
|---|---|---|---|
| Gouvernance de phase | Pipeline H01→H23 et état machine | Moteur BPM générique configurable à l’infini | Conserver simplicité et lisibilité de décision |
| Quality gates | G1→G5 + G4-T/G4-UX dual | Moteur de policies multi-tenant avancé | Prioriser valeur opérationnelle immédiate |
| Evidence | Graph de preuve + export bundle | Data warehouse analytique complet | Viser auditabilité rapide avant BI avancée |
| Commandes | Broker + allowlist + dry-run | Orchestreur universel shell/script externe illimité | Réduire risque sécurité et scope creep |
| Intégrations | Connecteurs read-first prioritaires | Marketplace connecteurs large | Dé-risquer adoption sans dispersion |

## 4. Objectifs business, product outcomes et Critères de succès
Objectif principal: baisser l’incertitude de pilotage multi-agents en phase planning/solutioning et en boucle story.

| ID objectif | Description | Baseline cible | Cible 90 jours | Critères de validation |
|---|---|---:|---:|---|
| OBJ-01 | Réduction du Time-to-confident-decision (TCD) | baseline à mesurer semaine 1 | -30% minimum | Mesure avant/après sur décisions gate |
| OBJ-02 | Réduction des faux DONE liés à UX | incidents non consolidés | 0 faux DONE sur 2 sprints | Cas G4-T PASS/G4-UX FAIL systématiquement bloqués |
| OBJ-03 | Diminution du rework de handoff | ratio actuel à établir | <15% | m_handoff_rework_ratio sous seuil 3 semaines |
| OBJ-04 | Discipline de notifications de phase | variable | 95% < 5 min | m_notification_phase_delay conforme |
| OBJ-05 | Fiabilité des commandes critiques | variable | 0 incident cross-project | m_context_switch_error = 0 en écriture |
| OBJ-06 | Lisibilité sponsor AQCD | faible compréhension initiale | >=80% compréhension | score de compréhension panel sponsor |
| OBJ-07 | Efficience coût | inconnu | AQCD cost >= 70 | coût/story + waste ratio sous contrôle |
| OBJ-08 | Adoption active pilote | non mesuré | >=60% activation | taux activation à J+30 |

## 5. Personas cibles et responsabilités décisionnelles
| Persona ID | Persona | Responsabilité principale | Décision attendue dans le produit | Pain point majeur adressé |
|---|---|---|---|---|
| PER-01 | Orchestrateur principal | Maintenir flux H01→H23 sans dérive | Go/No-Go phase, escalade, priorisation blocage | Vision fragmentée des phases et gates |
| PER-02 | PM Produit | Transformer recherche en scope testable | Arbitrage scope V1, critère de valeur, AC | Ambiguïtés FR/NFR et dépendances cachées |
| PER-03 | Architecte | Garantir faisabilité et robustesse | Valider patterns/ADRs et trade-offs | Données dispersées, faible lisibilité risques |
| PER-04 | TEA / QA Lead | Garantir qualité technique mesurable | Gate qualité technique et readiness | Preuves CI/test non consolidées |
| PER-05 | UX QA Lead | Garantir qualité UX bloquante | PASS/FAIL G4-UX et remédiation | Faux DONE technique-only |
| PER-06 | Sponsor/Ops Manager | Piloter ROI, coût, cadence | Continuer/ralentir l’autonomie, allocation budget | Reporting peu actionnable |
| PER-07 | Scrum Master | Séquencer stories et mitigations | Priorité des actions correctives sprint | Handoffs incomplets et mitigation non fermée |
| PER-08 | Security/Admin | Sécuriser commandes et conformité | Autorisation/deny/override contrôlés | Risque d’escalade et exfiltration |

### Critères d’adoption par persona
- PER-01: décision phase en <90 secondes avec preuve cliquable.
- PER-02: passage H03→H04→H08 sans ambiguïté critique non taguée.
- PER-03: disponibilité des dépendances critiques D01..D16 en une vue.
- PER-04: verdict qualité basé sur evidences, pas sur déclaratif.
- PER-05: traçabilité explicite des états UX et de la conformité accessibilité.
- PER-06: lecture exécutive AQCD en <3 minutes.

## 6. Jobs-to-be-Done (JTBD) et scénarios métier
| JTBD ID | Situation | Motivation | Outcome attendu |
|---|---|---|---|
| JTBD-01 | Quand une phase se termine | voir immédiatement impacts et prérequis de la suivante | réduire erreurs de séquence et retards |
| JTBD-02 | Quand un gate est CONCERNS/FAIL | identifier owner, cause et action corrective prioritaire | réduire délai de résolution |
| JTBD-03 | Quand je consulte un artefact | avoir son contexte décisionnel et ses preuves associées | éviter interprétations partielles |
| JTBD-04 | Quand le coût augmente | identifier la source de waste par phase/commande | maîtriser budget sans sacrifier qualité |
| JTBD-05 | Quand je prépare H04/H08 | traduire recherche en exigences traçables | réduire ambiguïtés architecture |
| JTBD-06 | Quand je change de projet | être certain du contexte actif avant toute action | éviter incidents cross-project |
| JTBD-07 | Quand un audit est demandé | exporter un bundle de preuves complet en quelques secondes | réduire effort manuel de justification |
| JTBD-08 | Quand une story approche DONE | valider simultanément technique et UX | supprimer les faux DONE |
| JTBD-09 | Quand un gate approche | disposer d’un score readiness explicable | anticiper blocages |
| JTBD-10 | Quand un nouveau rôle arrive | disposer d’une vue adaptée avec actions utiles | réduire temps d’onboarding |
| JTBD-11 | Quand une mitigation est ouverte | suivre son statut jusqu’à preuve de fermeture | éviter dette opérationnelle |
| JTBD-12 | Quand une alerte critique survient | être notifié avec priorité et chemin d’action | réduire MTTA et impact |

## 7. Périmètre produit: V1, V1.1, anti-scope
| Domaine | V1 (obligatoire) | V1.1 (planifié) | Anti-scope (refusé en V1) |
|---|---|---|---|
| Phase governance | Timeline H01→H23 + transitions autorisées | Configuration de phases custom | Moteur BPM complet multi-tenant |
| Gates | Gate Center G1→G5 + G4 dual | Policy editor avancé | Gate engine générique scriptable sans garde-fou |
| Evidence | Graph preuves + liens artefacts/gates/commands | Clustering assisté de preuves | Knowledge graph ML auto-curation |
| Artefacts | Index markdown/yaml + diff + recherche | Classification sémantique enrichie | ingestion illimitée de formats non priorisés |
| Commandes | Broker allowlist + dry-run + audit | Auto-recommandation commande conditionnelle | exécution autonome non supervisée |
| AQCD | Dashboard score + tendance baseline | Simulations de scénarios | score opaque sans formule |
| Risques | Risk register vivant + mitigations | Priorisation semi-automatique | gestion risque hors owner |
| Notifications | Priorités + throttling + SLA | Routage contextuel avancé | notifications non filtrées de masse |
| Intégrations | Jira/Linear/Notion read-first + CI | write-back contrôlé | migration imposée de la stack client |
| Sécurité | RBAC, root signé, secret redaction | SSO enterprise avancé | bypass command broker |
| Export | bundle md/pdf/json | templates compliance étendus | export sans filtrage rôle/classification |
| Déploiement | mode cloud contrôlé + préparation self-host | self-host industrialisé | dépendance cloud unique sans roadmap self-host |

## 8. Capacités produit structurantes (macro-fonctions)
| Capability ID | Nom capability | Problème résolu | Sortie utilisateur attendue | Gate principalement impacté |
|---|---|---|---|---|
| CAP-01 | Pipeline Board H01→H23 | Séquençage opaque | Vue d’avancement fiable, owner, blocages | G1/G2/G3 |
| CAP-02 | Gate Control Center | Verdicts dispersés | Décision go/no-go avec preuve | G1..G5 |
| CAP-03 | Dual G4 Engine | Faux DONE UX | Blocage DONE si G4-UX non conforme | G4 |
| CAP-04 | Artifact Explorer | Recherche lente de preuves | Accès contextualisé aux artefacts | G1..G5 |
| CAP-05 | Evidence Graph | Décisions contestables | Provenance complète décision↔preuve | G2/G3/G4 |
| CAP-06 | Command Broker | Risque commande destructive | Exécution sécurisée et auditable | G2/G3/G4 |
| CAP-07 | Risk Radar | Risques non priorisés | Heatmap active + mitigation trackée | G2/G3 |
| CAP-08 | AQCD Cockpit | Pilotage qualité/coût flou | Score transparent et actionnable | G2/G3/G5 |
| CAP-09 | Readiness Predictor | Blocages découverts tard | Signal précoce avant passage gate | G2/G3 |
| CAP-10 | Notification Hub | Alertes bruitées | Alertes priorisées et SLA d’accusé | tous |
| CAP-11 | Role Views | Surcharge informationnelle | Vue orientée rôle et décision | tous |
| CAP-12 | Audit Bundle Export | Audit manuel coûteux | Export preuve consolidée | G2/G3/G5 |
| CAP-13 | Multi-project Isolation | Erreurs de contexte | Protection cross-project stricte | tous |
| CAP-14 | Integration Hub | Stack client fragmentée | Pont vers outils existants | G2/G3 |
| CAP-15 | Retrospective Tracker | Actions rétro perdues | Plan d’adaptation suivi jusqu’à fermeture | G5 |
| CAP-16 | Compliance Controls | Conservation/suppression floue | Conformité rétention et masquage | G2/G3/G5 |

## 9. Exigences fonctionnelles (FR) traçables
Les FR ci-dessous sont le contrat de livraison fonctionnel du produit.
Chaque FR est lié à des sources, risques et KPI pour garantir la traçabilité inter-phases.

| FR ID | Module | Exigence fonctionnelle | Priorité | Sources | Risques liés | KPI liés |
|---|---|---|---|---|---|---|
| FR-001 | Workflow & Phases | Le système doit afficher la progression de phase en respectant strictement l’ordre canonique BMAD. | Must | SRC-01,SRC-02,SRC-03,SRC-06 | P01,P03,P06,P07 | KPI-01,KPI-02,KPI-03 |
| FR-002 | Workflow & Phases | Le système doit empêcher toute transition non autorisée entre phases et afficher la raison du blocage. | Must | SRC-01,SRC-02,SRC-03,SRC-06 | P01,P03,P06,P07 | KPI-01,KPI-02,KPI-03 |
| FR-003 | Workflow & Phases | Le système doit bloquer la transition si la notification de phase n’est pas publiée dans la fenêtre SLA. | Must | SRC-01,SRC-02,SRC-03,SRC-06 | P01,P03,P06,P07 | KPI-01,KPI-02,KPI-03 |
| FR-004 | Workflow & Phases | Le système doit afficher owner, started_at, finished_at, statut et durée pour chaque phase. | Must | SRC-01,SRC-02,SRC-03,SRC-06 | P01,P03,P06,P07 | KPI-01,KPI-02,KPI-03 |
| FR-005 | Workflow & Phases | Le système doit exiger les prérequis déclarés avant activation de la phase suivante. | Must | SRC-01,SRC-02,SRC-03,SRC-06 | P01,P03,P06,P07 | KPI-01,KPI-02,KPI-03 |
| FR-006 | Workflow & Phases | Le système doit permettre l’exécution contrôlée des scripts sequence-guard et ultra-quality-check. | Must | SRC-01,SRC-02,SRC-03,SRC-06 | P01,P03,P06,P07 | KPI-01,KPI-02,KPI-03 |
| FR-007 | Workflow & Phases | Le système doit conserver un historique consultable des transitions de phase et des verdicts associés. | Must | SRC-01,SRC-02,SRC-03,SRC-06 | P01,P03,P06,P07 | KPI-01,KPI-02,KPI-03 |
| FR-008 | Workflow & Phases | Le système doit signaler les dépassements de SLA de transition et proposer une action corrective. | Must | SRC-01,SRC-02,SRC-03,SRC-06 | P01,P03,P06,P07 | KPI-01,KPI-02,KPI-03 |
| FR-009 | Workflow & Phases | Le système doit autoriser un override exceptionnel uniquement avec justification et approbateur. | Must | SRC-01,SRC-02,SRC-03,SRC-06 | P01,P03,P06,P07 | KPI-01,KPI-02,KPI-03 |
| FR-010 | Workflow & Phases | Le système doit afficher les dépendances bloquantes inter-phases et leur état en temps réel. | Must | SRC-01,SRC-02,SRC-03,SRC-06 | P01,P03,P06,P07 | KPI-01,KPI-02,KPI-03 |
| FR-011 | Gate Control | Le système doit présenter G1→G5 dans une vue unique avec statut, owner et horodatage. | Must | SRC-01,SRC-03,SRC-04,SRC-06 | T07,P06,U03 | KPI-02,KPI-04,KPI-15 |
| FR-012 | Gate Control | Le système doit afficher G4-T et G4-UX de manière distincte et corrélée. | Must | SRC-01,SRC-03,SRC-04,SRC-06 | T07,P06,U03 | KPI-02,KPI-04,KPI-15 |
| FR-013 | Gate Control | Le système doit calculer automatiquement PASS/CONCERNS/FAIL selon les règles de gate en vigueur. | Must | SRC-01,SRC-03,SRC-04,SRC-06 | T07,P06,U03 | KPI-02,KPI-04,KPI-15 |
| FR-014 | Gate Control | Le système doit interdire DONE si G4-T ou G4-UX n’est pas PASS. | Must | SRC-01,SRC-03,SRC-04,SRC-06 | T07,P06,U03 | KPI-02,KPI-04,KPI-15 |
| FR-015 | Gate Control | Le système doit exiger au moins une preuve primaire liée pour toute décision de gate. | Must | SRC-01,SRC-03,SRC-04,SRC-06 | T07,P06,U03 | KPI-02,KPI-04,KPI-15 |
| FR-016 | Gate Control | Le système doit créer une action assignée avec échéance pour chaque gate en CONCERNS. | Must | SRC-01,SRC-03,SRC-04,SRC-06 | T07,P06,U03 | KPI-02,KPI-04,KPI-15 |
| FR-017 | Gate Control | Le système doit versionner les règles de gate et historiser les changements. | Must | SRC-01,SRC-03,SRC-04,SRC-06 | T07,P06,U03 | KPI-02,KPI-04,KPI-15 |
| FR-018 | Gate Control | Le système doit permettre une simulation de verdict avant soumission finale du gate. | Must | SRC-01,SRC-03,SRC-04,SRC-06 | T07,P06,U03 | KPI-02,KPI-04,KPI-15 |
| FR-019 | Gate Control | Le système doit afficher les tendances PASS/CONCERNS/FAIL par phase et par période. | Must | SRC-01,SRC-03,SRC-04,SRC-06 | T07,P06,U03 | KPI-02,KPI-04,KPI-15 |
| FR-020 | Gate Control | Le système doit exporter un rapport de gate incluant verdict, preuves et actions ouvertes. | Must | SRC-01,SRC-03,SRC-04,SRC-06 | T07,P06,U03 | KPI-02,KPI-04,KPI-15 |
| FR-021 | Artifact & Evidence | Le système doit ingérer les artefacts markdown et yaml des dossiers BMAD autorisés. | Must | SRC-03,SRC-04,SRC-06,SRC-07 | T01,T02,T08 | KPI-05,KPI-11 |
| FR-022 | Artifact & Evidence | Le système doit vérifier la présence de stepsCompleted et inputDocuments sur les artefacts majeurs. | Must | SRC-03,SRC-04,SRC-06,SRC-07 | T01,T02,T08 | KPI-05,KPI-11 |
| FR-023 | Artifact & Evidence | Le système doit extraire sections H2/H3 pour permettre une navigation structurée. | Must | SRC-03,SRC-04,SRC-06,SRC-07 | T01,T02,T08 | KPI-05,KPI-11 |
| FR-024 | Artifact & Evidence | Le système doit indexer les tableaux markdown pour requêtes ciblées. | Must | SRC-03,SRC-04,SRC-06,SRC-07 | T01,T02,T08 | KPI-05,KPI-11 |
| FR-025 | Artifact & Evidence | Le système doit fournir une recherche plein texte avec filtrage instantané par type d’artefact. | Must | SRC-03,SRC-04,SRC-06,SRC-07 | T01,T02,T08 | KPI-05,KPI-11 |
| FR-026 | Artifact & Evidence | Le système doit filtrer par phase, agent, date, gate, owner et niveau de risque. | Must | SRC-03,SRC-04,SRC-06,SRC-07 | T01,T02,T08 | KPI-05,KPI-11 |
| FR-027 | Artifact & Evidence | Le système doit comparer deux versions d’un artefact et souligner les changements structurants. | Must | SRC-03,SRC-04,SRC-06,SRC-07 | T01,T02,T08 | KPI-05,KPI-11 |
| FR-028 | Artifact & Evidence | Le système doit visualiser les liens entre artefacts, décisions, gates et commandes. | Must | SRC-03,SRC-04,SRC-06,SRC-07 | T01,T02,T08 | KPI-05,KPI-11 |
| FR-029 | Artifact & Evidence | Le système doit lister tous les artefacts qui justifient une décision donnée. | Must | SRC-03,SRC-04,SRC-06,SRC-07 | T01,T02,T08 | KPI-05,KPI-11 |
| FR-030 | Artifact & Evidence | Le système doit marquer explicitement la fraîcheur/staleness des vues dérivées. | Must | SRC-03,SRC-04,SRC-06,SRC-07 | T01,T02,T08 | KPI-05,KPI-11 |
| FR-031 | Artifact & Evidence | Le système doit expliquer les erreurs de parsing avec recommandations de correction. | Must | SRC-03,SRC-04,SRC-06,SRC-07 | T01,T02,T08 | KPI-05,KPI-11 |
| FR-032 | Artifact & Evidence | Le système doit permettre des tags de risque et annotations contextuelles sur les artefacts. | Must | SRC-03,SRC-04,SRC-06,SRC-07 | T01,T02,T08 | KPI-05,KPI-11 |
| FR-033 | Command Broker | Le système doit exposer un catalogue de commandes autorisées avec paramètres contrôlés. | Must | SRC-04,SRC-06 | S01,S02,S03,S05,P07 | KPI-08,KPI-10 |
| FR-034 | Command Broker | Le système doit proposer un dry-run par défaut pour toute commande d’écriture. | Must | SRC-04,SRC-06 | S01,S02,S03,S05,P07 | KPI-08,KPI-10 |
| FR-035 | Command Broker | Le système doit afficher les fichiers potentiellement impactés avant exécution réelle. | Must | SRC-04,SRC-06 | S01,S02,S03,S05,P07 | KPI-08,KPI-10 |
| FR-036 | Command Broker | Le système doit imposer une double confirmation pour les commandes à impact élevé. | Must | SRC-04,SRC-06 | S01,S02,S03,S05,P07 | KPI-08,KPI-10 |
| FR-037 | Command Broker | Le système doit vérifier les permissions role-based avant chaque exécution. | Must | SRC-04,SRC-06 | S01,S02,S03,S05,P07 | KPI-08,KPI-10 |
| FR-038 | Command Broker | Le système doit signer active_project_root et refuser les exécutions ambiguës. | Must | SRC-04,SRC-06 | S01,S02,S03,S05,P07 | KPI-08,KPI-10 |
| FR-039 | Command Broker | Le système doit enregistrer commande, acteur, approbateur, résultat dans un journal append-only. | Must | SRC-04,SRC-06 | S01,S02,S03,S05,P07 | KPI-08,KPI-10 |
| FR-040 | Command Broker | Le système doit appliquer des timeouts, retries bornés et idempotency key pour les runs. | Must | SRC-04,SRC-06 | S01,S02,S03,S05,P07 | KPI-08,KPI-10 |
| FR-041 | Command Broker | Le système doit séquencer les commandes concurrentes selon priorité et capacité. | Must | SRC-04,SRC-06 | S01,S02,S03,S05,P07 | KPI-08,KPI-10 |
| FR-042 | Command Broker | Le système doit permettre l’arrêt immédiat des commandes d’écriture en cas d’incident critique. | Must | SRC-04,SRC-06 | S01,S02,S03,S05,P07 | KPI-08,KPI-10 |
| FR-043 | Command Broker | Le système doit exiger approbation nominative pour tout override de policy. | Must | SRC-04,SRC-06 | S01,S02,S03,S05,P07 | KPI-08,KPI-10 |
| FR-044 | Command Broker | Le système doit fournir des templates de commande validés pour réduire les erreurs humaines. | Must | SRC-04,SRC-06 | S01,S02,S03,S05,P07 | KPI-08,KPI-10 |
| FR-045 | AQCD & Risk Intelligence | Le système doit afficher les scores A/Q/C/D avec formule et source de données. | Must | SRC-01,SRC-03,SRC-04,SRC-06 | M02,C01,P05 | KPI-01,KPI-06,KPI-13,KPI-14,KPI-15 |
| FR-046 | AQCD & Risk Intelligence | Le système doit conserver des snapshots AQCD par période pour analyse de tendance. | Must | SRC-01,SRC-03,SRC-04,SRC-06 | M02,C01,P05 | KPI-01,KPI-06,KPI-13,KPI-14,KPI-15 |
| FR-047 | AQCD & Risk Intelligence | Le système doit calculer un readiness score rules-based avec facteurs contributifs visibles. | Must | SRC-01,SRC-03,SRC-04,SRC-06 | M02,C01,P05 | KPI-01,KPI-06,KPI-13,KPI-14,KPI-15 |
| FR-048 | AQCD & Risk Intelligence | Le système doit proposer les 3 actions prioritaires par gate avec owner et preuve. | Must | SRC-01,SRC-03,SRC-04,SRC-06 | M02,C01,P05 | KPI-01,KPI-06,KPI-13,KPI-14,KPI-15 |
| FR-049 | AQCD & Risk Intelligence | Le système doit maintenir un registre risques avec owner, échéance, statut et exposition. | Must | SRC-01,SRC-03,SRC-04,SRC-06 | M02,C01,P05 | KPI-01,KPI-06,KPI-13,KPI-14,KPI-15 |
| FR-050 | AQCD & Risk Intelligence | Le système doit lier chaque mitigation à une tâche et à une preuve de fermeture. | Must | SRC-01,SRC-03,SRC-04,SRC-06 | M02,C01,P05 | KPI-01,KPI-06,KPI-13,KPI-14,KPI-15 |
| FR-051 | AQCD & Risk Intelligence | Le système doit afficher une heatmap probabilité/impact et son évolution. | Must | SRC-01,SRC-03,SRC-04,SRC-06 | M02,C01,P05 | KPI-01,KPI-06,KPI-13,KPI-14,KPI-15 |
| FR-052 | AQCD & Risk Intelligence | Le système doit calculer le coût moyen par décision validée. | Must | SRC-01,SRC-03,SRC-04,SRC-06 | M02,C01,P05 | KPI-01,KPI-06,KPI-13,KPI-14,KPI-15 |
| FR-053 | AQCD & Risk Intelligence | Le système doit mesurer le waste ratio par phase et déclencher alerte en dérive. | Must | SRC-01,SRC-03,SRC-04,SRC-06 | M02,C01,P05 | KPI-01,KPI-06,KPI-13,KPI-14,KPI-15 |
| FR-054 | AQCD & Risk Intelligence | Le système doit suivre les actions H21/H22/H23 jusqu’à clôture vérifiée. | Must | SRC-01,SRC-03,SRC-04,SRC-06 | M02,C01,P05 | KPI-01,KPI-06,KPI-13,KPI-14,KPI-15 |
| FR-055 | Collaboration & Notifications | Le système doit proposer des dashboards personnalisés par rôle (PM, Architecte, TEA, UX QA, Sponsor). | Must | SRC-03,SRC-05,SRC-06 | U06,P03,M03 | KPI-07,KPI-12 |
| FR-056 | Collaboration & Notifications | Le système doit générer une file d’actions priorisées et contextualisées par rôle. | Must | SRC-03,SRC-05,SRC-06 | U06,P03,M03 | KPI-07,KPI-12 |
| FR-057 | Collaboration & Notifications | Le système doit centraliser les notifications avec niveaux critique/élevé/moyen/faible. | Should | SRC-03,SRC-05,SRC-06 | U06,P03,M03 | KPI-07,KPI-12 |
| FR-058 | Collaboration & Notifications | Le système doit regrouper et limiter les alertes répétitives pour éviter la fatigue. | Should | SRC-03,SRC-05,SRC-06 | U06,P03,M03 | KPI-07,KPI-12 |
| FR-059 | Collaboration & Notifications | Le système doit mesurer le délai phase complete → notify et alerter les dépassements. | Should | SRC-03,SRC-05,SRC-06 | U06,P03,M03 | KPI-07,KPI-12 |
| FR-060 | Collaboration & Notifications | Le système doit permettre des threads de commentaires reliés aux décisions et gates. | Should | SRC-03,SRC-05,SRC-06 | U06,P03,M03 | KPI-07,KPI-12 |
| FR-061 | Collaboration & Notifications | Le système doit gérer les mentions directes et l’escalade automatique selon la sévérité. | Should | SRC-03,SRC-05,SRC-06 | U06,P03,M03 | KPI-07,KPI-12 |
| FR-062 | Collaboration & Notifications | Le système doit afficher une timeline inter-rôles des événements clés du projet. | Should | SRC-03,SRC-05,SRC-06 | U06,P03,M03 | KPI-07,KPI-12 |
| FR-063 | UX Quality Controls | Le système doit implémenter loading/empty/error/success sur toutes les vues critiques. | Should | SRC-01,SRC-03,SRC-04,SRC-06 | U02,U03,U04,C05 | KPI-04,KPI-09 |
| FR-064 | UX Quality Controls | Le système doit supporter une navigation clavier complète avec focus visible et logique. | Should | SRC-01,SRC-03,SRC-04,SRC-06 | U02,U03,U04,C05 | KPI-04,KPI-09 |
| FR-065 | UX Quality Controls | Le système doit respecter les contrastes WCAG 2.2 AA sur les surfaces critiques. | Should | SRC-01,SRC-03,SRC-04,SRC-06 | U02,U03,U04,C05 | KPI-04,KPI-09 |
| FR-066 | UX Quality Controls | Le système doit rester exploitable sur mobile, tablette et desktop standard. | Should | SRC-01,SRC-03,SRC-04,SRC-06 | U02,U03,U04,C05 | KPI-04,KPI-09 |
| FR-067 | UX Quality Controls | Le système doit lier captures et verdicts UX aux sous-gates G4-UX. | Should | SRC-01,SRC-03,SRC-04,SRC-06 | U02,U03,U04,C05 | KPI-04,KPI-09 |
| FR-068 | UX Quality Controls | Le système doit visualiser les dettes UX ouvertes et leur plan de réduction. | Should | SRC-01,SRC-03,SRC-04,SRC-06 | U02,U03,U04,C05 | KPI-04,KPI-09 |
| FR-069 | UX Quality Controls | Le système doit afficher des définitions BMAD contextuelles pour réduire ambiguïtés. | Should | SRC-01,SRC-03,SRC-04,SRC-06 | U02,U03,U04,C05 | KPI-04,KPI-09 |
| FR-070 | UX Quality Controls | Le système doit vérifier la cohérence spacing/typo/couleurs selon design system. | Should | SRC-01,SRC-03,SRC-04,SRC-06 | U02,U03,U04,C05 | KPI-04,KPI-09 |
| FR-071 | Integrations & Multi-Project | Le système doit offrir un switch de projet avec confirmation du contexte actif. | Should | SRC-04,SRC-05,SRC-06 | M03,M07,S08,T05 | KPI-10,KPI-11,KPI-12 |
| FR-072 | Integrations & Multi-Project | Le système doit empêcher toute écriture sur un projet non actif. | Should | SRC-04,SRC-05,SRC-06 | M03,M07,S08,T05 | KPI-10,KPI-11,KPI-12 |
| FR-073 | Integrations & Multi-Project | Le système doit ingérer les données Jira nécessaires au suivi story/gate. | Should | SRC-04,SRC-05,SRC-06 | M03,M07,S08,T05 | KPI-10,KPI-11,KPI-12 |
| FR-074 | Integrations & Multi-Project | Le système doit ingérer les données Linear nécessaires au suivi story/gate. | Should | SRC-04,SRC-05,SRC-06 | M03,M07,S08,T05 | KPI-10,KPI-11,KPI-12 |
| FR-075 | Integrations & Multi-Project | Le système doit indexer les pages Notion référencées comme preuves. | Could | SRC-04,SRC-05,SRC-06 | M03,M07,S08,T05 | KPI-10,KPI-11,KPI-12 |
| FR-076 | Integrations & Multi-Project | Le système doit intégrer les résultats tests (unit/int/e2e/coverage). | Could | SRC-04,SRC-05,SRC-06 | M03,M07,S08,T05 | KPI-10,KPI-11,KPI-12 |
| FR-077 | Integrations & Multi-Project | Le système doit intégrer les rapports de vulnérabilités et leur sévérité. | Could | SRC-04,SRC-05,SRC-06 | M03,M07,S08,T05 | KPI-10,KPI-11,KPI-12 |
| FR-078 | Integrations & Multi-Project | Le système doit exporter des bundles de preuve dans les formats md/pdf/json. | Could | SRC-04,SRC-05,SRC-06 | M03,M07,S08,T05 | KPI-10,KPI-11,KPI-12 |
| FR-079 | Integrations & Multi-Project | Le système doit exposer des endpoints API pour reporting externe contrôlé. | Could | SRC-04,SRC-05,SRC-06 | M03,M07,S08,T05 | KPI-10,KPI-11,KPI-12 |
| FR-080 | Integrations & Multi-Project | Le système doit supporter backup/restauration des configurations critiques. | Could | SRC-04,SRC-05,SRC-06 | M03,M07,S08,T05 | KPI-10,KPI-11,KPI-12 |
| FR-081 | Integrations & Multi-Project | Le système doit fournir un profil déploiement compatible self-host sécurisé. | Could | SRC-04,SRC-05,SRC-06 | M03,M07,S08,T05 | KPI-10,KPI-11,KPI-12 |
| FR-082 | Integrations & Multi-Project | Le système doit appliquer une politique de rétention et purge par type de donnée. | Could | SRC-04,SRC-05,SRC-06 | M03,M07,S08,T05 | KPI-10,KPI-11,KPI-12 |

### Détail narratif des FR par module
#### Module WF — Workflow & Phases
- **FR-001 (Timeline canonique H01→H23)**
  - Critères métier: Le système doit afficher la progression de phase en respectant strictement l’ordre canonique BMAD.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-02,SRC-03,SRC-06 | Risques: P01,P03,P06,P07 | KPI: KPI-01,KPI-02,KPI-03
- **FR-002 (Transitions autorisées uniquement)**
  - Critères métier: Le système doit empêcher toute transition non autorisée entre phases et afficher la raison du blocage.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-02,SRC-03,SRC-06 | Risques: P01,P03,P06,P07 | KPI: KPI-01,KPI-02,KPI-03
- **FR-003 (Blocage sans phase-notify)**
  - Critères métier: Le système doit bloquer la transition si la notification de phase n’est pas publiée dans la fenêtre SLA.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-02,SRC-03,SRC-06 | Risques: P01,P03,P06,P07 | KPI: KPI-01,KPI-02,KPI-03
- **FR-004 (Owner et horodatage de phase)**
  - Critères métier: Le système doit afficher owner, started_at, finished_at, statut et durée pour chaque phase.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-02,SRC-03,SRC-06 | Risques: P01,P03,P06,P07 | KPI: KPI-01,KPI-02,KPI-03
- **FR-005 (Checklist pré-phase)**
  - Critères métier: Le système doit exiger les prérequis déclarés avant activation de la phase suivante.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-02,SRC-03,SRC-06 | Risques: P01,P03,P06,P07 | KPI: KPI-01,KPI-02,KPI-03
- **FR-006 (Exécution des guards)**
  - Critères métier: Le système doit permettre l’exécution contrôlée des scripts sequence-guard et ultra-quality-check.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-02,SRC-03,SRC-06 | Risques: P01,P03,P06,P07 | KPI: KPI-01,KPI-02,KPI-03
- **FR-007 (Historique de transitions)**
  - Critères métier: Le système doit conserver un historique consultable des transitions de phase et des verdicts associés.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-02,SRC-03,SRC-06 | Risques: P01,P03,P06,P07 | KPI: KPI-01,KPI-02,KPI-03
- **FR-008 (Alerte SLA de phase)**
  - Critères métier: Le système doit signaler les dépassements de SLA de transition et proposer une action corrective.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-02,SRC-03,SRC-06 | Risques: P01,P03,P06,P07 | KPI: KPI-01,KPI-02,KPI-03
- **FR-009 (Override encadré)**
  - Critères métier: Le système doit autoriser un override exceptionnel uniquement avec justification et approbateur.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-02,SRC-03,SRC-06 | Risques: P01,P03,P06,P07 | KPI: KPI-01,KPI-02,KPI-03
- **FR-010 (Matrice dépendances phase)**
  - Critères métier: Le système doit afficher les dépendances bloquantes inter-phases et leur état en temps réel.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-02,SRC-03,SRC-06 | Risques: P01,P03,P06,P07 | KPI: KPI-01,KPI-02,KPI-03

#### Module GT — Gate Control
- **FR-011 (Gate Center unifié)**
  - Critères métier: Le système doit présenter G1→G5 dans une vue unique avec statut, owner et horodatage.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: T07,P06,U03 | KPI: KPI-02,KPI-04,KPI-15
- **FR-012 (Sous-gates G4 explicites)**
  - Critères métier: Le système doit afficher G4-T et G4-UX de manière distincte et corrélée.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: T07,P06,U03 | KPI: KPI-02,KPI-04,KPI-15
- **FR-013 (Verdict global calculé)**
  - Critères métier: Le système doit calculer automatiquement PASS/CONCERNS/FAIL selon les règles de gate en vigueur.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: T07,P06,U03 | KPI: KPI-02,KPI-04,KPI-15
- **FR-014 (Blocage DONE dual gate)**
  - Critères métier: Le système doit interdire DONE si G4-T ou G4-UX n’est pas PASS.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: T07,P06,U03 | KPI: KPI-02,KPI-04,KPI-15
- **FR-015 (Lien de preuve obligatoire)**
  - Critères métier: Le système doit exiger au moins une preuve primaire liée pour toute décision de gate.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: T07,P06,U03 | KPI: KPI-02,KPI-04,KPI-15
- **FR-016 (Workflow de résolution CONCERNS)**
  - Critères métier: Le système doit créer une action assignée avec échéance pour chaque gate en CONCERNS.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: T07,P06,U03 | KPI: KPI-02,KPI-04,KPI-15
- **FR-017 (Versionnement policy gate)**
  - Critères métier: Le système doit versionner les règles de gate et historiser les changements.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: T07,P06,U03 | KPI: KPI-02,KPI-04,KPI-15
- **FR-018 (Simulation pré-gate)**
  - Critères métier: Le système doit permettre une simulation de verdict avant soumission finale du gate.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: T07,P06,U03 | KPI: KPI-02,KPI-04,KPI-15
- **FR-019 (Tendance de gates)**
  - Critères métier: Le système doit afficher les tendances PASS/CONCERNS/FAIL par phase et par période.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: T07,P06,U03 | KPI: KPI-02,KPI-04,KPI-15
- **FR-020 (Export rapport gate)**
  - Critères métier: Le système doit exporter un rapport de gate incluant verdict, preuves et actions ouvertes.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: T07,P06,U03 | KPI: KPI-02,KPI-04,KPI-15

#### Module AR — Artifact & Evidence
- **FR-021 (Ingestion markdown/yaml)**
  - Critères métier: Le système doit ingérer les artefacts markdown et yaml des dossiers BMAD autorisés.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-03,SRC-04,SRC-06,SRC-07 | Risques: T01,T02,T08 | KPI: KPI-05,KPI-11
- **FR-022 (Validation frontmatter)**
  - Critères métier: Le système doit vérifier la présence de stepsCompleted et inputDocuments sur les artefacts majeurs.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-03,SRC-04,SRC-06,SRC-07 | Risques: T01,T02,T08 | KPI: KPI-05,KPI-11
- **FR-023 (Extraction sections)**
  - Critères métier: Le système doit extraire sections H2/H3 pour permettre une navigation structurée.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-03,SRC-04,SRC-06,SRC-07 | Risques: T01,T02,T08 | KPI: KPI-05,KPI-11
- **FR-024 (Extraction tableaux)**
  - Critères métier: Le système doit indexer les tableaux markdown pour requêtes ciblées.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-03,SRC-04,SRC-06,SRC-07 | Risques: T01,T02,T08 | KPI: KPI-05,KPI-11
- **FR-025 (Recherche plein texte)**
  - Critères métier: Le système doit fournir une recherche plein texte avec filtrage instantané par type d’artefact.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-03,SRC-04,SRC-06,SRC-07 | Risques: T01,T02,T08 | KPI: KPI-05,KPI-11
- **FR-026 (Filtres contextuels)**
  - Critères métier: Le système doit filtrer par phase, agent, date, gate, owner et niveau de risque.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-03,SRC-04,SRC-06,SRC-07 | Risques: T01,T02,T08 | KPI: KPI-05,KPI-11
- **FR-027 (Diff d’artefact)**
  - Critères métier: Le système doit comparer deux versions d’un artefact et souligner les changements structurants.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-03,SRC-04,SRC-06,SRC-07 | Risques: T01,T02,T08 | KPI: KPI-05,KPI-11
- **FR-028 (Graph de provenance)**
  - Critères métier: Le système doit visualiser les liens entre artefacts, décisions, gates et commandes.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-03,SRC-04,SRC-06,SRC-07 | Risques: T01,T02,T08 | KPI: KPI-05,KPI-11
- **FR-029 (Backlinks décision)**
  - Critères métier: Le système doit lister tous les artefacts qui justifient une décision donnée.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-03,SRC-04,SRC-06,SRC-07 | Risques: T01,T02,T08 | KPI: KPI-05,KPI-11
- **FR-030 (Fraîcheur de données)**
  - Critères métier: Le système doit marquer explicitement la fraîcheur/staleness des vues dérivées.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-03,SRC-04,SRC-06,SRC-07 | Risques: T01,T02,T08 | KPI: KPI-05,KPI-11
- **FR-031 (Diagnostic parse errors)**
  - Critères métier: Le système doit expliquer les erreurs de parsing avec recommandations de correction.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-03,SRC-04,SRC-06,SRC-07 | Risques: T01,T02,T08 | KPI: KPI-05,KPI-11
- **FR-032 (Annotations et tags risque)**
  - Critères métier: Le système doit permettre des tags de risque et annotations contextuelles sur les artefacts.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-03,SRC-04,SRC-06,SRC-07 | Risques: T01,T02,T08 | KPI: KPI-05,KPI-11

#### Module CM — Command Broker
- **FR-033 (Catalogue allowlist)**
  - Critères métier: Le système doit exposer un catalogue de commandes autorisées avec paramètres contrôlés.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-06 | Risques: S01,S02,S03,S05,P07 | KPI: KPI-08,KPI-10
- **FR-034 (Mode dry-run)**
  - Critères métier: Le système doit proposer un dry-run par défaut pour toute commande d’écriture.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-06 | Risques: S01,S02,S03,S05,P07 | KPI: KPI-08,KPI-10
- **FR-035 (Preview impact fichiers)**
  - Critères métier: Le système doit afficher les fichiers potentiellement impactés avant exécution réelle.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-06 | Risques: S01,S02,S03,S05,P07 | KPI: KPI-08,KPI-10
- **FR-036 (Double confirmation destructive)**
  - Critères métier: Le système doit imposer une double confirmation pour les commandes à impact élevé.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-06 | Risques: S01,S02,S03,S05,P07 | KPI: KPI-08,KPI-10
- **FR-037 (Contrôle RBAC)**
  - Critères métier: Le système doit vérifier les permissions role-based avant chaque exécution.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-06 | Risques: S01,S02,S03,S05,P07 | KPI: KPI-08,KPI-10
- **FR-038 (Root actif signé)**
  - Critères métier: Le système doit signer active_project_root et refuser les exécutions ambiguës.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-06 | Risques: S01,S02,S03,S05,P07 | KPI: KPI-08,KPI-10
- **FR-039 (Audit log immuable)**
  - Critères métier: Le système doit enregistrer commande, acteur, approbateur, résultat dans un journal append-only.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-06 | Risques: S01,S02,S03,S05,P07 | KPI: KPI-08,KPI-10
- **FR-040 (Timeout et retry borné)**
  - Critères métier: Le système doit appliquer des timeouts, retries bornés et idempotency key pour les runs.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-06 | Risques: S01,S02,S03,S05,P07 | KPI: KPI-08,KPI-10
- **FR-041 (Queue et backpressure)**
  - Critères métier: Le système doit séquencer les commandes concurrentes selon priorité et capacité.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-06 | Risques: S01,S02,S03,S05,P07 | KPI: KPI-08,KPI-10
- **FR-042 (Kill-switch opérationnel)**
  - Critères métier: Le système doit permettre l’arrêt immédiat des commandes d’écriture en cas d’incident critique.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-06 | Risques: S01,S02,S03,S05,P07 | KPI: KPI-08,KPI-10
- **FR-043 (Override policy encadré)**
  - Critères métier: Le système doit exiger approbation nominative pour tout override de policy.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-06 | Risques: S01,S02,S03,S05,P07 | KPI: KPI-08,KPI-10
- **FR-044 (Bibliothèque templates)**
  - Critères métier: Le système doit fournir des templates de commande validés pour réduire les erreurs humaines.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-06 | Risques: S01,S02,S03,S05,P07 | KPI: KPI-08,KPI-10

#### Module AQ — AQCD & Risk Intelligence
- **FR-045 (Tableau AQCD explicable)**
  - Critères métier: Le système doit afficher les scores A/Q/C/D avec formule et source de données.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: M02,C01,P05 | KPI: KPI-01,KPI-06,KPI-13,KPI-14,KPI-15
- **FR-046 (Snapshots périodiques AQCD)**
  - Critères métier: Le système doit conserver des snapshots AQCD par période pour analyse de tendance.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: M02,C01,P05 | KPI: KPI-01,KPI-06,KPI-13,KPI-14,KPI-15
- **FR-047 (Readiness score explicable)**
  - Critères métier: Le système doit calculer un readiness score rules-based avec facteurs contributifs visibles.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: M02,C01,P05 | KPI: KPI-01,KPI-06,KPI-13,KPI-14,KPI-15
- **FR-048 (Recommandations actionnables)**
  - Critères métier: Le système doit proposer les 3 actions prioritaires par gate avec owner et preuve.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: M02,C01,P05 | KPI: KPI-01,KPI-06,KPI-13,KPI-14,KPI-15
- **FR-049 (Registre risques vivant)**
  - Critères métier: Le système doit maintenir un registre risques avec owner, échéance, statut et exposition.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: M02,C01,P05 | KPI: KPI-01,KPI-06,KPI-13,KPI-14,KPI-15
- **FR-050 (Mitigation task linking)**
  - Critères métier: Le système doit lier chaque mitigation à une tâche et à une preuve de fermeture.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: M02,C01,P05 | KPI: KPI-01,KPI-06,KPI-13,KPI-14,KPI-15
- **FR-051 (Heatmap risques)**
  - Critères métier: Le système doit afficher une heatmap probabilité/impact et son évolution.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: M02,C01,P05 | KPI: KPI-01,KPI-06,KPI-13,KPI-14,KPI-15
- **FR-052 (Coût par décision)**
  - Critères métier: Le système doit calculer le coût moyen par décision validée.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: M02,C01,P05 | KPI: KPI-01,KPI-06,KPI-13,KPI-14,KPI-15
- **FR-053 (Waste ratio par phase)**
  - Critères métier: Le système doit mesurer le waste ratio par phase et déclencher alerte en dérive.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: M02,C01,P05 | KPI: KPI-01,KPI-06,KPI-13,KPI-14,KPI-15
- **FR-054 (Tracker actions rétro)**
  - Critères métier: Le système doit suivre les actions H21/H22/H23 jusqu’à clôture vérifiée.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: M02,C01,P05 | KPI: KPI-01,KPI-06,KPI-13,KPI-14,KPI-15

#### Module CO — Collaboration & Notifications
- **FR-055 (Vues orientées rôle)**
  - Critères métier: Le système doit proposer des dashboards personnalisés par rôle (PM, Architecte, TEA, UX QA, Sponsor).
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-03,SRC-05,SRC-06 | Risques: U06,P03,M03 | KPI: KPI-07,KPI-12
- **FR-056 (Next Best Action)**
  - Critères métier: Le système doit générer une file d’actions priorisées et contextualisées par rôle.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-03,SRC-05,SRC-06 | Risques: U06,P03,M03 | KPI: KPI-07,KPI-12
- **FR-057 (Notification center priorisé)**
  - Critères métier: Le système doit centraliser les notifications avec niveaux critique/élevé/moyen/faible.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-03,SRC-05,SRC-06 | Risques: U06,P03,M03 | KPI: KPI-07,KPI-12
- **FR-058 (Throttling notifications)**
  - Critères métier: Le système doit regrouper et limiter les alertes répétitives pour éviter la fatigue.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-03,SRC-05,SRC-06 | Risques: U06,P03,M03 | KPI: KPI-07,KPI-12
- **FR-059 (SLA phase-notify)**
  - Critères métier: Le système doit mesurer le délai phase complete → notify et alerter les dépassements.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-03,SRC-05,SRC-06 | Risques: U06,P03,M03 | KPI: KPI-07,KPI-12
- **FR-060 (Commentaires décisionnels)**
  - Critères métier: Le système doit permettre des threads de commentaires reliés aux décisions et gates.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-03,SRC-05,SRC-06 | Risques: U06,P03,M03 | KPI: KPI-07,KPI-12
- **FR-061 (Mentions et escalade)**
  - Critères métier: Le système doit gérer les mentions directes et l’escalade automatique selon la sévérité.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-03,SRC-05,SRC-06 | Risques: U06,P03,M03 | KPI: KPI-07,KPI-12
- **FR-062 (Timeline d’activité)**
  - Critères métier: Le système doit afficher une timeline inter-rôles des événements clés du projet.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-03,SRC-05,SRC-06 | Risques: U06,P03,M03 | KPI: KPI-07,KPI-12

#### Module UX — UX Quality Controls
- **FR-063 (États UI obligatoires)**
  - Critères métier: Le système doit implémenter loading/empty/error/success sur toutes les vues critiques.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: U02,U03,U04,C05 | KPI: KPI-04,KPI-09
- **FR-064 (Navigation clavier)**
  - Critères métier: Le système doit supporter une navigation clavier complète avec focus visible et logique.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: U02,U03,U04,C05 | KPI: KPI-04,KPI-09
- **FR-065 (Contraste et lisibilité)**
  - Critères métier: Le système doit respecter les contrastes WCAG 2.2 AA sur les surfaces critiques.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: U02,U03,U04,C05 | KPI: KPI-04,KPI-09
- **FR-066 (Responsive 3 classes)**
  - Critères métier: Le système doit rester exploitable sur mobile, tablette et desktop standard.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: U02,U03,U04,C05 | KPI: KPI-04,KPI-09
- **FR-067 (Preuves UX G4)**
  - Critères métier: Le système doit lier captures et verdicts UX aux sous-gates G4-UX.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: U02,U03,U04,C05 | KPI: KPI-04,KPI-09
- **FR-068 (UX debt lane)**
  - Critères métier: Le système doit visualiser les dettes UX ouvertes et leur plan de réduction.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: U02,U03,U04,C05 | KPI: KPI-04,KPI-09
- **FR-069 (Glossaire contextuel)**
  - Critères métier: Le système doit afficher des définitions BMAD contextuelles pour réduire ambiguïtés.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: U02,U03,U04,C05 | KPI: KPI-04,KPI-09
- **FR-070 (Cohérence design tokens)**
  - Critères métier: Le système doit vérifier la cohérence spacing/typo/couleurs selon design system.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-01,SRC-03,SRC-04,SRC-06 | Risques: U02,U03,U04,C05 | KPI: KPI-04,KPI-09

#### Module IN — Integrations & Multi-Project
- **FR-071 (Switch multi-projets)**
  - Critères métier: Le système doit offrir un switch de projet avec confirmation du contexte actif.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-05,SRC-06 | Risques: M03,M07,S08,T05 | KPI: KPI-10,KPI-11,KPI-12
- **FR-072 (Protection cross-project)**
  - Critères métier: Le système doit empêcher toute écriture sur un projet non actif.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-05,SRC-06 | Risques: M03,M07,S08,T05 | KPI: KPI-10,KPI-11,KPI-12
- **FR-073 (Connecteur Jira read)**
  - Critères métier: Le système doit ingérer les données Jira nécessaires au suivi story/gate.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-05,SRC-06 | Risques: M03,M07,S08,T05 | KPI: KPI-10,KPI-11,KPI-12
- **FR-074 (Connecteur Linear read)**
  - Critères métier: Le système doit ingérer les données Linear nécessaires au suivi story/gate.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-05,SRC-06 | Risques: M03,M07,S08,T05 | KPI: KPI-10,KPI-11,KPI-12
- **FR-075 (Connecteur Notion links)**
  - Critères métier: Le système doit indexer les pages Notion référencées comme preuves.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-05,SRC-06 | Risques: M03,M07,S08,T05 | KPI: KPI-10,KPI-11,KPI-12
- **FR-076 (Ingestion rapports tests CI)**
  - Critères métier: Le système doit intégrer les résultats tests (unit/int/e2e/coverage).
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-05,SRC-06 | Risques: M03,M07,S08,T05 | KPI: KPI-10,KPI-11,KPI-12
- **FR-077 (Ingestion scans sécurité)**
  - Critères métier: Le système doit intégrer les rapports de vulnérabilités et leur sévérité.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-05,SRC-06 | Risques: M03,M07,S08,T05 | KPI: KPI-10,KPI-11,KPI-12
- **FR-078 (Export bundle md/pdf/json)**
  - Critères métier: Le système doit exporter des bundles de preuve dans les formats md/pdf/json.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-05,SRC-06 | Risques: M03,M07,S08,T05 | KPI: KPI-10,KPI-11,KPI-12
- **FR-079 (API externe de reporting)**
  - Critères métier: Le système doit exposer des endpoints API pour reporting externe contrôlé.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-05,SRC-06 | Risques: M03,M07,S08,T05 | KPI: KPI-10,KPI-11,KPI-12
- **FR-080 (Sauvegarde/restauration)**
  - Critères métier: Le système doit supporter backup/restauration des configurations critiques.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-05,SRC-06 | Risques: M03,M07,S08,T05 | KPI: KPI-10,KPI-11,KPI-12
- **FR-081 (Préparation self-host)**
  - Critères métier: Le système doit fournir un profil déploiement compatible self-host sécurisé.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-05,SRC-06 | Risques: M03,M07,S08,T05 | KPI: KPI-10,KPI-11,KPI-12
- **FR-082 (Rétention/purge)**
  - Critères métier: Le système doit appliquer une politique de rétention et purge par type de donnée.
  - Valeur utilisateur: Réduit le temps de décision et augmente la fiabilité opérationnelle.
  - Traçabilité: SRC-04,SRC-05,SRC-06 | Risques: M03,M07,S08,T05 | KPI: KPI-10,KPI-11,KPI-12

## 10. Critères d’acceptation mesurables (AC)
Les AC ci-dessous sont conçus pour être testables, quantifiés et reliés aux gates BMAD.

| AC ID | FR lié | Scénario de validation | Critère mesurable | Méthode de test | Gate impacté |
|---|---|---|---|---|---|
| AC-001A | FR-001 | Mise à jour de la vue phase après événement de transition | Rafraîchissement visible <= 5 secondes pour 95% des cas | E2E + métrique m_phase_transition_latency_ms | G1/G2/G3 |
| AC-001B | FR-001 | Tentative de transition invalide ou notify manquant | Blocage 100% avec message d’erreur explicite et owner affiché | Test règles + test de sécurité process | G1/G2/G3 |
| AC-002A | FR-002 | Mise à jour de la vue phase après événement de transition | Rafraîchissement visible <= 5 secondes pour 95% des cas | E2E + métrique m_phase_transition_latency_ms | G1/G2/G3 |
| AC-002B | FR-002 | Tentative de transition invalide ou notify manquant | Blocage 100% avec message d’erreur explicite et owner affiché | Test règles + test de sécurité process | G1/G2/G3 |
| AC-003A | FR-003 | Mise à jour de la vue phase après événement de transition | Rafraîchissement visible <= 5 secondes pour 95% des cas | E2E + métrique m_phase_transition_latency_ms | G1/G2/G3 |
| AC-003B | FR-003 | Tentative de transition invalide ou notify manquant | Blocage 100% avec message d’erreur explicite et owner affiché | Test règles + test de sécurité process | G1/G2/G3 |
| AC-004A | FR-004 | Mise à jour de la vue phase après événement de transition | Rafraîchissement visible <= 5 secondes pour 95% des cas | E2E + métrique m_phase_transition_latency_ms | G1/G2/G3 |
| AC-004B | FR-004 | Tentative de transition invalide ou notify manquant | Blocage 100% avec message d’erreur explicite et owner affiché | Test règles + test de sécurité process | G1/G2/G3 |
| AC-005A | FR-005 | Mise à jour de la vue phase après événement de transition | Rafraîchissement visible <= 5 secondes pour 95% des cas | E2E + métrique m_phase_transition_latency_ms | G1/G2/G3 |
| AC-005B | FR-005 | Tentative de transition invalide ou notify manquant | Blocage 100% avec message d’erreur explicite et owner affiché | Test règles + test de sécurité process | G1/G2/G3 |
| AC-006A | FR-006 | Mise à jour de la vue phase après événement de transition | Rafraîchissement visible <= 5 secondes pour 95% des cas | E2E + métrique m_phase_transition_latency_ms | G1/G2/G3 |
| AC-006B | FR-006 | Tentative de transition invalide ou notify manquant | Blocage 100% avec message d’erreur explicite et owner affiché | Test règles + test de sécurité process | G1/G2/G3 |
| AC-007A | FR-007 | Mise à jour de la vue phase après événement de transition | Rafraîchissement visible <= 5 secondes pour 95% des cas | E2E + métrique m_phase_transition_latency_ms | G1/G2/G3 |
| AC-007B | FR-007 | Tentative de transition invalide ou notify manquant | Blocage 100% avec message d’erreur explicite et owner affiché | Test règles + test de sécurité process | G1/G2/G3 |
| AC-008A | FR-008 | Mise à jour de la vue phase après événement de transition | Rafraîchissement visible <= 5 secondes pour 95% des cas | E2E + métrique m_phase_transition_latency_ms | G1/G2/G3 |
| AC-008B | FR-008 | Tentative de transition invalide ou notify manquant | Blocage 100% avec message d’erreur explicite et owner affiché | Test règles + test de sécurité process | G1/G2/G3 |
| AC-009A | FR-009 | Mise à jour de la vue phase après événement de transition | Rafraîchissement visible <= 5 secondes pour 95% des cas | E2E + métrique m_phase_transition_latency_ms | G1/G2/G3 |
| AC-009B | FR-009 | Tentative de transition invalide ou notify manquant | Blocage 100% avec message d’erreur explicite et owner affiché | Test règles + test de sécurité process | G1/G2/G3 |
| AC-010A | FR-010 | Mise à jour de la vue phase après événement de transition | Rafraîchissement visible <= 5 secondes pour 95% des cas | E2E + métrique m_phase_transition_latency_ms | G1/G2/G3 |
| AC-010B | FR-010 | Tentative de transition invalide ou notify manquant | Blocage 100% avec message d’erreur explicite et owner affiché | Test règles + test de sécurité process | G1/G2/G3 |
| AC-011A | FR-011 | Recalcul d’un verdict gate après ajout de preuve | Verdict recalculé <= 2 secondes et historisé | Test intégration gate engine | G1..G5 |
| AC-011B | FR-011 | Story candidate DONE avec G4-UX FAIL | DONE refusé dans 100% des cas | E2E G4 dual | G4 |
| AC-012A | FR-012 | Recalcul d’un verdict gate après ajout de preuve | Verdict recalculé <= 2 secondes et historisé | Test intégration gate engine | G1..G5 |
| AC-012B | FR-012 | Story candidate DONE avec G4-UX FAIL | DONE refusé dans 100% des cas | E2E G4 dual | G4 |
| AC-013A | FR-013 | Recalcul d’un verdict gate après ajout de preuve | Verdict recalculé <= 2 secondes et historisé | Test intégration gate engine | G1..G5 |
| AC-013B | FR-013 | Story candidate DONE avec G4-UX FAIL | DONE refusé dans 100% des cas | E2E G4 dual | G4 |
| AC-014A | FR-014 | Recalcul d’un verdict gate après ajout de preuve | Verdict recalculé <= 2 secondes et historisé | Test intégration gate engine | G1..G5 |
| AC-014B | FR-014 | Story candidate DONE avec G4-UX FAIL | DONE refusé dans 100% des cas | E2E G4 dual | G4 |
| AC-015A | FR-015 | Recalcul d’un verdict gate après ajout de preuve | Verdict recalculé <= 2 secondes et historisé | Test intégration gate engine | G1..G5 |
| AC-015B | FR-015 | Story candidate DONE avec G4-UX FAIL | DONE refusé dans 100% des cas | E2E G4 dual | G4 |
| AC-016A | FR-016 | Recalcul d’un verdict gate après ajout de preuve | Verdict recalculé <= 2 secondes et historisé | Test intégration gate engine | G1..G5 |
| AC-016B | FR-016 | Story candidate DONE avec G4-UX FAIL | DONE refusé dans 100% des cas | E2E G4 dual | G4 |
| AC-017A | FR-017 | Recalcul d’un verdict gate après ajout de preuve | Verdict recalculé <= 2 secondes et historisé | Test intégration gate engine | G1..G5 |
| AC-017B | FR-017 | Story candidate DONE avec G4-UX FAIL | DONE refusé dans 100% des cas | E2E G4 dual | G4 |
| AC-018A | FR-018 | Recalcul d’un verdict gate après ajout de preuve | Verdict recalculé <= 2 secondes et historisé | Test intégration gate engine | G1..G5 |
| AC-018B | FR-018 | Story candidate DONE avec G4-UX FAIL | DONE refusé dans 100% des cas | E2E G4 dual | G4 |
| AC-019A | FR-019 | Recalcul d’un verdict gate après ajout de preuve | Verdict recalculé <= 2 secondes et historisé | Test intégration gate engine | G1..G5 |
| AC-019B | FR-019 | Story candidate DONE avec G4-UX FAIL | DONE refusé dans 100% des cas | E2E G4 dual | G4 |
| AC-020A | FR-020 | Recalcul d’un verdict gate après ajout de preuve | Verdict recalculé <= 2 secondes et historisé | Test intégration gate engine | G1..G5 |
| AC-020B | FR-020 | Story candidate DONE avec G4-UX FAIL | DONE refusé dans 100% des cas | E2E G4 dual | G4 |
| AC-021A | FR-021 | Recherche d’un artefact critique dans corpus planning | Résultat pertinent en p95 < 2 secondes sur 500 documents | Test perf recherche + pertinence | G1/G2/G3 |
| AC-021B | FR-021 | Document sans metadata obligatoire | Détection/flag 100% et blocage selon policy | Test contrat documentaire | G2 |
| AC-022A | FR-022 | Recherche d’un artefact critique dans corpus planning | Résultat pertinent en p95 < 2 secondes sur 500 documents | Test perf recherche + pertinence | G1/G2/G3 |
| AC-022B | FR-022 | Document sans metadata obligatoire | Détection/flag 100% et blocage selon policy | Test contrat documentaire | G2 |
| AC-023A | FR-023 | Recherche d’un artefact critique dans corpus planning | Résultat pertinent en p95 < 2 secondes sur 500 documents | Test perf recherche + pertinence | G1/G2/G3 |
| AC-023B | FR-023 | Document sans metadata obligatoire | Détection/flag 100% et blocage selon policy | Test contrat documentaire | G2 |
| AC-024A | FR-024 | Recherche d’un artefact critique dans corpus planning | Résultat pertinent en p95 < 2 secondes sur 500 documents | Test perf recherche + pertinence | G1/G2/G3 |
| AC-024B | FR-024 | Document sans metadata obligatoire | Détection/flag 100% et blocage selon policy | Test contrat documentaire | G2 |
| AC-025A | FR-025 | Recherche d’un artefact critique dans corpus planning | Résultat pertinent en p95 < 2 secondes sur 500 documents | Test perf recherche + pertinence | G1/G2/G3 |
| AC-025B | FR-025 | Document sans metadata obligatoire | Détection/flag 100% et blocage selon policy | Test contrat documentaire | G2 |
| AC-026A | FR-026 | Recherche d’un artefact critique dans corpus planning | Résultat pertinent en p95 < 2 secondes sur 500 documents | Test perf recherche + pertinence | G1/G2/G3 |
| AC-026B | FR-026 | Document sans metadata obligatoire | Détection/flag 100% et blocage selon policy | Test contrat documentaire | G2 |
| AC-027A | FR-027 | Recherche d’un artefact critique dans corpus planning | Résultat pertinent en p95 < 2 secondes sur 500 documents | Test perf recherche + pertinence | G1/G2/G3 |
| AC-027B | FR-027 | Document sans metadata obligatoire | Détection/flag 100% et blocage selon policy | Test contrat documentaire | G2 |
| AC-028A | FR-028 | Recherche d’un artefact critique dans corpus planning | Résultat pertinent en p95 < 2 secondes sur 500 documents | Test perf recherche + pertinence | G1/G2/G3 |
| AC-028B | FR-028 | Document sans metadata obligatoire | Détection/flag 100% et blocage selon policy | Test contrat documentaire | G2 |
| AC-029A | FR-029 | Recherche d’un artefact critique dans corpus planning | Résultat pertinent en p95 < 2 secondes sur 500 documents | Test perf recherche + pertinence | G1/G2/G3 |
| AC-029B | FR-029 | Document sans metadata obligatoire | Détection/flag 100% et blocage selon policy | Test contrat documentaire | G2 |
| AC-030A | FR-030 | Recherche d’un artefact critique dans corpus planning | Résultat pertinent en p95 < 2 secondes sur 500 documents | Test perf recherche + pertinence | G1/G2/G3 |
| AC-030B | FR-030 | Document sans metadata obligatoire | Détection/flag 100% et blocage selon policy | Test contrat documentaire | G2 |
| AC-031A | FR-031 | Recherche d’un artefact critique dans corpus planning | Résultat pertinent en p95 < 2 secondes sur 500 documents | Test perf recherche + pertinence | G1/G2/G3 |
| AC-031B | FR-031 | Document sans metadata obligatoire | Détection/flag 100% et blocage selon policy | Test contrat documentaire | G2 |
| AC-032A | FR-032 | Recherche d’un artefact critique dans corpus planning | Résultat pertinent en p95 < 2 secondes sur 500 documents | Test perf recherche + pertinence | G1/G2/G3 |
| AC-032B | FR-032 | Document sans metadata obligatoire | Détection/flag 100% et blocage selon policy | Test contrat documentaire | G2 |
| AC-033A | FR-033 | Exécution commande non autorisée | Refus 100% + journalisation audit complète | Test sécurité RBAC/allowlist | G2/G3/G4 |
| AC-033B | FR-033 | Commande d’écriture autorisée | Dry-run et preview affichés avant apply dans 100% des cas | E2E broker simulate/apply | G2/G3 |
| AC-034A | FR-034 | Exécution commande non autorisée | Refus 100% + journalisation audit complète | Test sécurité RBAC/allowlist | G2/G3/G4 |
| AC-034B | FR-034 | Commande d’écriture autorisée | Dry-run et preview affichés avant apply dans 100% des cas | E2E broker simulate/apply | G2/G3 |
| AC-035A | FR-035 | Exécution commande non autorisée | Refus 100% + journalisation audit complète | Test sécurité RBAC/allowlist | G2/G3/G4 |
| AC-035B | FR-035 | Commande d’écriture autorisée | Dry-run et preview affichés avant apply dans 100% des cas | E2E broker simulate/apply | G2/G3 |
| AC-036A | FR-036 | Exécution commande non autorisée | Refus 100% + journalisation audit complète | Test sécurité RBAC/allowlist | G2/G3/G4 |
| AC-036B | FR-036 | Commande d’écriture autorisée | Dry-run et preview affichés avant apply dans 100% des cas | E2E broker simulate/apply | G2/G3 |
| AC-037A | FR-037 | Exécution commande non autorisée | Refus 100% + journalisation audit complète | Test sécurité RBAC/allowlist | G2/G3/G4 |
| AC-037B | FR-037 | Commande d’écriture autorisée | Dry-run et preview affichés avant apply dans 100% des cas | E2E broker simulate/apply | G2/G3 |
| AC-038A | FR-038 | Exécution commande non autorisée | Refus 100% + journalisation audit complète | Test sécurité RBAC/allowlist | G2/G3/G4 |
| AC-038B | FR-038 | Commande d’écriture autorisée | Dry-run et preview affichés avant apply dans 100% des cas | E2E broker simulate/apply | G2/G3 |
| AC-039A | FR-039 | Exécution commande non autorisée | Refus 100% + journalisation audit complète | Test sécurité RBAC/allowlist | G2/G3/G4 |
| AC-039B | FR-039 | Commande d’écriture autorisée | Dry-run et preview affichés avant apply dans 100% des cas | E2E broker simulate/apply | G2/G3 |
| AC-040A | FR-040 | Exécution commande non autorisée | Refus 100% + journalisation audit complète | Test sécurité RBAC/allowlist | G2/G3/G4 |
| AC-040B | FR-040 | Commande d’écriture autorisée | Dry-run et preview affichés avant apply dans 100% des cas | E2E broker simulate/apply | G2/G3 |
| AC-041A | FR-041 | Exécution commande non autorisée | Refus 100% + journalisation audit complète | Test sécurité RBAC/allowlist | G2/G3/G4 |
| AC-041B | FR-041 | Commande d’écriture autorisée | Dry-run et preview affichés avant apply dans 100% des cas | E2E broker simulate/apply | G2/G3 |
| AC-042A | FR-042 | Exécution commande non autorisée | Refus 100% + journalisation audit complète | Test sécurité RBAC/allowlist | G2/G3/G4 |
| AC-042B | FR-042 | Commande d’écriture autorisée | Dry-run et preview affichés avant apply dans 100% des cas | E2E broker simulate/apply | G2/G3 |
| AC-043A | FR-043 | Exécution commande non autorisée | Refus 100% + journalisation audit complète | Test sécurité RBAC/allowlist | G2/G3/G4 |
| AC-043B | FR-043 | Commande d’écriture autorisée | Dry-run et preview affichés avant apply dans 100% des cas | E2E broker simulate/apply | G2/G3 |
| AC-044A | FR-044 | Exécution commande non autorisée | Refus 100% + journalisation audit complète | Test sécurité RBAC/allowlist | G2/G3/G4 |
| AC-044B | FR-044 | Commande d’écriture autorisée | Dry-run et preview affichés avant apply dans 100% des cas | E2E broker simulate/apply | G2/G3 |
| AC-045A | FR-045 | Calcul AQCD et readiness sur période active | Snapshot disponible <= 60 minutes de fraîcheur | Test data pipeline + projection | G2/G3/G5 |
| AC-045B | FR-045 | Alerte readiness < 65 | 3 recommandations avec owner/preuve/action présentes à 100% | Test moteur recommandation | G2/G3 |
| AC-046A | FR-046 | Calcul AQCD et readiness sur période active | Snapshot disponible <= 60 minutes de fraîcheur | Test data pipeline + projection | G2/G3/G5 |
| AC-046B | FR-046 | Alerte readiness < 65 | 3 recommandations avec owner/preuve/action présentes à 100% | Test moteur recommandation | G2/G3 |
| AC-047A | FR-047 | Calcul AQCD et readiness sur période active | Snapshot disponible <= 60 minutes de fraîcheur | Test data pipeline + projection | G2/G3/G5 |
| AC-047B | FR-047 | Alerte readiness < 65 | 3 recommandations avec owner/preuve/action présentes à 100% | Test moteur recommandation | G2/G3 |
| AC-048A | FR-048 | Calcul AQCD et readiness sur période active | Snapshot disponible <= 60 minutes de fraîcheur | Test data pipeline + projection | G2/G3/G5 |
| AC-048B | FR-048 | Alerte readiness < 65 | 3 recommandations avec owner/preuve/action présentes à 100% | Test moteur recommandation | G2/G3 |
| AC-049A | FR-049 | Calcul AQCD et readiness sur période active | Snapshot disponible <= 60 minutes de fraîcheur | Test data pipeline + projection | G2/G3/G5 |
| AC-049B | FR-049 | Alerte readiness < 65 | 3 recommandations avec owner/preuve/action présentes à 100% | Test moteur recommandation | G2/G3 |
| AC-050A | FR-050 | Calcul AQCD et readiness sur période active | Snapshot disponible <= 60 minutes de fraîcheur | Test data pipeline + projection | G2/G3/G5 |
| AC-050B | FR-050 | Alerte readiness < 65 | 3 recommandations avec owner/preuve/action présentes à 100% | Test moteur recommandation | G2/G3 |
| AC-051A | FR-051 | Calcul AQCD et readiness sur période active | Snapshot disponible <= 60 minutes de fraîcheur | Test data pipeline + projection | G2/G3/G5 |
| AC-051B | FR-051 | Alerte readiness < 65 | 3 recommandations avec owner/preuve/action présentes à 100% | Test moteur recommandation | G2/G3 |
| AC-052A | FR-052 | Calcul AQCD et readiness sur période active | Snapshot disponible <= 60 minutes de fraîcheur | Test data pipeline + projection | G2/G3/G5 |
| AC-052B | FR-052 | Alerte readiness < 65 | 3 recommandations avec owner/preuve/action présentes à 100% | Test moteur recommandation | G2/G3 |
| AC-053A | FR-053 | Calcul AQCD et readiness sur période active | Snapshot disponible <= 60 minutes de fraîcheur | Test data pipeline + projection | G2/G3/G5 |
| AC-053B | FR-053 | Alerte readiness < 65 | 3 recommandations avec owner/preuve/action présentes à 100% | Test moteur recommandation | G2/G3 |
| AC-054A | FR-054 | Calcul AQCD et readiness sur période active | Snapshot disponible <= 60 minutes de fraîcheur | Test data pipeline + projection | G2/G3/G5 |
| AC-054B | FR-054 | Alerte readiness < 65 | 3 recommandations avec owner/preuve/action présentes à 100% | Test moteur recommandation | G2/G3 |
| AC-055A | FR-055 | Publication d’une alerte critique | Accusé de réception < 10 minutes dans >= 90% des cas | Test notification SLA | Tous |
| AC-055B | FR-055 | Fin de phase avec notify requis | Délai complete→notify < 5 min dans >=95% des cas | Test workflow phase-notify | G2 |
| AC-056A | FR-056 | Publication d’une alerte critique | Accusé de réception < 10 minutes dans >= 90% des cas | Test notification SLA | Tous |
| AC-056B | FR-056 | Fin de phase avec notify requis | Délai complete→notify < 5 min dans >=95% des cas | Test workflow phase-notify | G2 |
| AC-057A | FR-057 | Publication d’une alerte critique | Accusé de réception < 10 minutes dans >= 90% des cas | Test notification SLA | Tous |
| AC-057B | FR-057 | Fin de phase avec notify requis | Délai complete→notify < 5 min dans >=95% des cas | Test workflow phase-notify | G2 |
| AC-058A | FR-058 | Publication d’une alerte critique | Accusé de réception < 10 minutes dans >= 90% des cas | Test notification SLA | Tous |
| AC-058B | FR-058 | Fin de phase avec notify requis | Délai complete→notify < 5 min dans >=95% des cas | Test workflow phase-notify | G2 |
| AC-059A | FR-059 | Publication d’une alerte critique | Accusé de réception < 10 minutes dans >= 90% des cas | Test notification SLA | Tous |
| AC-059B | FR-059 | Fin de phase avec notify requis | Délai complete→notify < 5 min dans >=95% des cas | Test workflow phase-notify | G2 |
| AC-060A | FR-060 | Publication d’une alerte critique | Accusé de réception < 10 minutes dans >= 90% des cas | Test notification SLA | Tous |
| AC-060B | FR-060 | Fin de phase avec notify requis | Délai complete→notify < 5 min dans >=95% des cas | Test workflow phase-notify | G2 |
| AC-061A | FR-061 | Publication d’une alerte critique | Accusé de réception < 10 minutes dans >= 90% des cas | Test notification SLA | Tous |
| AC-061B | FR-061 | Fin de phase avec notify requis | Délai complete→notify < 5 min dans >=95% des cas | Test workflow phase-notify | G2 |
| AC-062A | FR-062 | Publication d’une alerte critique | Accusé de réception < 10 minutes dans >= 90% des cas | Test notification SLA | Tous |
| AC-062B | FR-062 | Fin de phase avec notify requis | Délai complete→notify < 5 min dans >=95% des cas | Test workflow phase-notify | G2 |
| AC-063A | FR-063 | Audit accessibilité des vues critiques | Score >= 85 et 0 blocker WCAG 2.2 AA | Audit a11y automatisé + revue manuelle | G4-UX |
| AC-063B | FR-063 | Validation états UI sur widget critique | 4 états implémentés et validés sur 3 breakpoints | Test visuel + e2e responsive | G4-UX |
| AC-064A | FR-064 | Audit accessibilité des vues critiques | Score >= 85 et 0 blocker WCAG 2.2 AA | Audit a11y automatisé + revue manuelle | G4-UX |
| AC-064B | FR-064 | Validation états UI sur widget critique | 4 états implémentés et validés sur 3 breakpoints | Test visuel + e2e responsive | G4-UX |
| AC-065A | FR-065 | Audit accessibilité des vues critiques | Score >= 85 et 0 blocker WCAG 2.2 AA | Audit a11y automatisé + revue manuelle | G4-UX |
| AC-065B | FR-065 | Validation états UI sur widget critique | 4 états implémentés et validés sur 3 breakpoints | Test visuel + e2e responsive | G4-UX |
| AC-066A | FR-066 | Audit accessibilité des vues critiques | Score >= 85 et 0 blocker WCAG 2.2 AA | Audit a11y automatisé + revue manuelle | G4-UX |
| AC-066B | FR-066 | Validation états UI sur widget critique | 4 états implémentés et validés sur 3 breakpoints | Test visuel + e2e responsive | G4-UX |
| AC-067A | FR-067 | Audit accessibilité des vues critiques | Score >= 85 et 0 blocker WCAG 2.2 AA | Audit a11y automatisé + revue manuelle | G4-UX |
| AC-067B | FR-067 | Validation états UI sur widget critique | 4 états implémentés et validés sur 3 breakpoints | Test visuel + e2e responsive | G4-UX |
| AC-068A | FR-068 | Audit accessibilité des vues critiques | Score >= 85 et 0 blocker WCAG 2.2 AA | Audit a11y automatisé + revue manuelle | G4-UX |
| AC-068B | FR-068 | Validation états UI sur widget critique | 4 états implémentés et validés sur 3 breakpoints | Test visuel + e2e responsive | G4-UX |
| AC-069A | FR-069 | Audit accessibilité des vues critiques | Score >= 85 et 0 blocker WCAG 2.2 AA | Audit a11y automatisé + revue manuelle | G4-UX |
| AC-069B | FR-069 | Validation états UI sur widget critique | 4 états implémentés et validés sur 3 breakpoints | Test visuel + e2e responsive | G4-UX |
| AC-070A | FR-070 | Audit accessibilité des vues critiques | Score >= 85 et 0 blocker WCAG 2.2 AA | Audit a11y automatisé + revue manuelle | G4-UX |
| AC-070B | FR-070 | Validation états UI sur widget critique | 4 états implémentés et validés sur 3 breakpoints | Test visuel + e2e responsive | G4-UX |
| AC-071A | FR-071 | Tentative écriture sur projet non actif | 0 incident cross-project; blocage 100% des tentatives | Test sécurité contexte projet | G2/G3 |
| AC-071B | FR-071 | Génération bundle audit | Succès >= 98% et p95 génération < 10 secondes | Test export + métrique bundle | G2/G5 |
| AC-072A | FR-072 | Tentative écriture sur projet non actif | 0 incident cross-project; blocage 100% des tentatives | Test sécurité contexte projet | G2/G3 |
| AC-072B | FR-072 | Génération bundle audit | Succès >= 98% et p95 génération < 10 secondes | Test export + métrique bundle | G2/G5 |
| AC-073A | FR-073 | Tentative écriture sur projet non actif | 0 incident cross-project; blocage 100% des tentatives | Test sécurité contexte projet | G2/G3 |
| AC-073B | FR-073 | Génération bundle audit | Succès >= 98% et p95 génération < 10 secondes | Test export + métrique bundle | G2/G5 |
| AC-074A | FR-074 | Tentative écriture sur projet non actif | 0 incident cross-project; blocage 100% des tentatives | Test sécurité contexte projet | G2/G3 |
| AC-074B | FR-074 | Génération bundle audit | Succès >= 98% et p95 génération < 10 secondes | Test export + métrique bundle | G2/G5 |
| AC-075A | FR-075 | Tentative écriture sur projet non actif | 0 incident cross-project; blocage 100% des tentatives | Test sécurité contexte projet | G2/G3 |
| AC-075B | FR-075 | Génération bundle audit | Succès >= 98% et p95 génération < 10 secondes | Test export + métrique bundle | G2/G5 |
| AC-076A | FR-076 | Tentative écriture sur projet non actif | 0 incident cross-project; blocage 100% des tentatives | Test sécurité contexte projet | G2/G3 |
| AC-076B | FR-076 | Génération bundle audit | Succès >= 98% et p95 génération < 10 secondes | Test export + métrique bundle | G2/G5 |
| AC-077A | FR-077 | Tentative écriture sur projet non actif | 0 incident cross-project; blocage 100% des tentatives | Test sécurité contexte projet | G2/G3 |
| AC-077B | FR-077 | Génération bundle audit | Succès >= 98% et p95 génération < 10 secondes | Test export + métrique bundle | G2/G5 |
| AC-078A | FR-078 | Tentative écriture sur projet non actif | 0 incident cross-project; blocage 100% des tentatives | Test sécurité contexte projet | G2/G3 |
| AC-078B | FR-078 | Génération bundle audit | Succès >= 98% et p95 génération < 10 secondes | Test export + métrique bundle | G2/G5 |
| AC-079A | FR-079 | Tentative écriture sur projet non actif | 0 incident cross-project; blocage 100% des tentatives | Test sécurité contexte projet | G2/G3 |
| AC-079B | FR-079 | Génération bundle audit | Succès >= 98% et p95 génération < 10 secondes | Test export + métrique bundle | G2/G5 |
| AC-080A | FR-080 | Tentative écriture sur projet non actif | 0 incident cross-project; blocage 100% des tentatives | Test sécurité contexte projet | G2/G3 |
| AC-080B | FR-080 | Génération bundle audit | Succès >= 98% et p95 génération < 10 secondes | Test export + métrique bundle | G2/G5 |
| AC-081A | FR-081 | Tentative écriture sur projet non actif | 0 incident cross-project; blocage 100% des tentatives | Test sécurité contexte projet | G2/G3 |
| AC-081B | FR-081 | Génération bundle audit | Succès >= 98% et p95 génération < 10 secondes | Test export + métrique bundle | G2/G5 |
| AC-082A | FR-082 | Tentative écriture sur projet non actif | 0 incident cross-project; blocage 100% des tentatives | Test sécurité contexte projet | G2/G3 |
| AC-082B | FR-082 | Génération bundle audit | Succès >= 98% et p95 génération < 10 secondes | Test export + métrique bundle | G2/G5 |

## 11. Exigences non fonctionnelles (NFR) traçables
| NFR ID | Domaine | Exigence non fonctionnelle | Cible mesurable | Vérification | Risque lié | Sources |
|---|---|---|---|---|---|---|
| NFR-001 | Performance | Chargement Pipeline Board | p95 < 2.0s | test perf synthétique journalier | T04 | SRC-04,SRC-06 |
| NFR-002 | Performance | Chargement Gate Center | p95 < 2.5s | test perf synthétique journalier | T04 | SRC-04,SRC-06 |
| NFR-003 | Performance | Rafraîchissement delta artefact | p95 < 5s | test ingestion delta | T03 | SRC-04,SRC-06 |
| NFR-004 | Performance | Recherche artefacts | p95 < 2s sur 500 docs | test recherche charge | T01 | SRC-04 |
| NFR-005 | Performance | Export bundle | p95 < 10s | test export périodique | S06 | SRC-04,SRC-06 |
| NFR-006 | Performance | Rebuild projection | < 60s | test projection bulk | T03 | SRC-04 |
| NFR-007 | Performance | Latence verdict gate | <= 2s après preuve | test intégration gate | T07 | SRC-04,SRC-06 |
| NFR-008 | Performance | Latence command preview | <= 1.5s | test broker UI | S01 | SRC-04,SRC-06 |
| NFR-009 | Performance | Temps ouverture vue risque | p95 < 2.5s | test perf dashboard | P05 | SRC-04,SRC-06 |
| NFR-010 | Performance | Latence timeline notifications | p95 < 2s | test perf notifications | U06 | SRC-04,SRC-06 |
| NFR-011 | Fiabilité | Disponibilité read-model principal | >= 99.5% | monitoring uptime | T08 | SRC-04 |
| NFR-012 | Fiabilité | Perte d’événement ledger | 0 toléré | audit séquence events | S04 | SRC-04,SRC-06 |
| NFR-013 | Fiabilité | Succès commandes autorisées | >= 95% | audit command logs | T06 | SRC-04,SRC-06 |
| NFR-014 | Fiabilité | Stabilité tests critiques | flakiness < 3% | analyse rapports tests | T05 | SRC-04 |
| NFR-015 | Fiabilité | Fallback stale mode | bascule < 60s | test résilience mensuel | T08 | SRC-04,SRC-06 |
| NFR-016 | Fiabilité | Retry ingestion borné | max 3 retries + DLQ | test chaos ingestion | T03 | SRC-04 |
| NFR-017 | Fiabilité | MTTA alerte critique | < 10 min | monitoring incidents | U06 | SRC-04,SRC-06 |
| NFR-018 | Fiabilité | Précision readiness score | >= 65% sur baseline | validation historique | M02 | SRC-04,SRC-06 |
| NFR-019 | Sécurité | RBAC minimal par défaut | 0 action critique hors rôle | test autorisation | S03 | SRC-06 |
| NFR-020 | Sécurité | Allowlist commandes | 100% commandes exécutées issues catalogue | audit broker | S02 | SRC-04,SRC-06 |
| NFR-021 | Sécurité | Validation root actif | 0 exécution destructive hors projet actif | test contexte | S01 | SRC-06 |
| NFR-022 | Sécurité | Journal d’audit immuable | intégrité vérifiée quotidienne | checksum/signature | S04 | SRC-04,SRC-06 |
| NFR-023 | Sécurité | Redaction secrets | 0 secret exposé dans logs persistés | scan secret post-run | S05 | SRC-06 |
| NFR-024 | Sécurité | Override policy contrôlé | 100% overrides avec approbateur | audit policy overrides | S03 | SRC-06 |
| NFR-025 | Sécurité | Timeout commandes destructives | timeout max 120s | test sécurité opérationnelle | S01 | SRC-04 |
| NFR-026 | Sécurité | Revocation accès | <24h après changement rôle | audit IAM mensuel | S07 | SRC-06 |
| NFR-027 | Conformité | Rétention des artefacts | politique appliquée par type de données | audit conformité | S08 | SRC-06 |
| NFR-028 | Conformité | Export contrôlé par rôle | 100% exports validés par policy | test export permissions | S06 | SRC-06 |
| NFR-029 | Conformité | Traçabilité provenance décision | chaîne preuve complète obligatoire | audit bundle | P06 | SRC-02,SRC-04 |
| NFR-030 | UX | Accessibilité globale | score >= 85 + 0 blocker | audit WCAG 2.2 AA | U03 | SRC-01,SRC-06 |
| NFR-031 | UX | États interface | 100% widgets critiques avec 4 états | tests visuels | U02 | SRC-01,SRC-03 |
| NFR-032 | UX | Responsive | parcours critiques validés mobile/tablette/desktop | tests responsive | U04 | SRC-03,SRC-06 |
| NFR-033 | UX | Lisibilité décisionnelle | décision critique en <90s pour PER-01 | test usability | U01 | SRC-03 |
| NFR-034 | Opérabilité | Observabilité full-stack | métriques clés disponibles en continu | monitoring | P05 | SRC-04,SRC-06 |
| NFR-035 | Opérabilité | Runbooks incidents | runbook critique disponible et testé | game day mensuel | P05 | SRC-04,SRC-06 |
| NFR-036 | Opérabilité | Versioning contrats data | 100% changements avec version + migration | test contract | T05 | SRC-04 |
| NFR-037 | Maintenabilité | Couverture documentation | 100% modules critiques documentés | revue doc mensuelle | P06 | SRC-02,SRC-07 |
| NFR-038 | Maintenabilité | Compatibilité parser | aucune rupture sur corpus de référence | test non-régression parser | T01 | SRC-04 |
| NFR-039 | Maintenabilité | Déploiement reproductible | build self-host reproductible | test pipeline release | M07 | SRC-05,SRC-06 |
| NFR-040 | Maintenabilité | Temps onboarding rôle | time-to-first-value < 14 jours | mesure adoption | C04 | SRC-03,SRC-06 |

## 12. Exigences UX/UI, accessibilité et design governance
La qualité UX est traitée comme une contrainte produit de premier ordre (alignement BMAD).
Le gate G4-UX reste bloquant au même niveau d’exigence que le gate technique.

| Rule ID | Règle UX/UI | Critère de conformité | Validation |
|---|---|---|---|
| UXR-01 | Hiérarchie visuelle | Information critique (gate fail, risque critique) visible sans scroll | Revue UX QA + tests users |
| UXR-02 | Clarté des statuts | Codes PASS/CONCERNS/FAIL lisibles et homogènes | Test compréhension > 90% |
| UXR-03 | Feedback immédiat | Toute action utilisateur confirme succès/erreur < 1s | E2E interaction |
| UXR-04 | States complets | loading/empty/error/success obligatoires | Checklist UX QA |
| UXR-05 | Navigation clavier | Parcours principal 100% clavier | Audit a11y |
| UXR-06 | Focus visible | Focus ring visible sur composants interactifs | Audit a11y |
| UXR-07 | Contraste | Contraste minimum WCAG AA | Audit contrast |
| UXR-08 | Responsive mobile | Lecture KPI/gates possible en mobile paysage | Test responsive |
| UXR-09 | Responsive tablette | Parcours décisionnel complet en tablette | Test responsive |
| UXR-10 | Responsive desktop | Densité d’info sans surcharge cognitive | Test usability |
| UXR-11 | Terminologie cohérente | Glossaire BMAD contextuel partout | Test compréhension |
| UXR-12 | Prévention erreur | Confirmations explicites pour actions risquées | E2E + heuristique |
| UXR-13 | Accessibilité labels | Tous les contrôles ont labels accessibles | Audit a11y |
| UXR-14 | Performance perçue | Skeleton/loading progressif sur vues > 1s | Audit UX perf |
| UXR-15 | Lisibilité tableau | Tables filtrables + sticky headers | Test UX data-heavy |
| UXR-16 | Comparaison diff | Diff artefact lisible sans ambiguïté | Tests utilisateurs PM/Architecte |
| UXR-17 | Priorisation alerts | Critiques en tête, bruit regroupé | Analyse alert fatigue |
| UXR-18 | Actionnabilité | Chaque carte critique propose une action contextuelle | Audit task completion |
| UXR-19 | Preuves UX liées | Captures UX liées aux gates concernés | Audit G4-UX |
| UXR-20 | Cohérence design tokens | Typo, spacing, couleur alignés design system | Review design system |
| UXR-21 | Microcopy décision | Microcopy orientée décision, pas monitoring brut | Review content design |
| UXR-22 | Mode dégradé lisible | Message explicite quand données stale | Test incident mode |
| UXR-23 | Onboarding role-based | Parcours guidé par rôle en 3 étapes | Mesure activation |
| UXR-24 | Internationalisation FR-first | Terminologie FR opérationnelle cohérente | Review contenu |

## 13. Sécurité, RBAC, conformité et auditabilité
Les contrôles sécurité sont structurants du MVP, car le produit exécute des commandes potentiellement critiques.

| Capability sécurité | Exigence | Critère de contrôle |
|---|---|---|
| RBAC | Matrice de permissions minimale par rôle | 0 action critique hors permission |
| Allowlist | Commandes hors catalogue refusées | 100% deny + audit |
| Root signé | Validation explicite du projet actif | 0 incident cross-project write |
| Dry-run obligatoire | Preview avant apply sur commandes d’écriture | 100% commandes write en dry-run d’abord |
| Double confirmation | Actions destructives nécessitent 2 confirmations | 100% conformité |
| Journal immuable | Logs append-only signés | Intégrité vérifiée quotidiennement |
| Redaction secret | Masquage automatique des secrets | 0 secret exposé |
| Override policy | Workflow approuvé et tracé | 100% overrides justifiés |
| Rétention/purge | Politique de cycle de vie par type d’artefact | 100% types couverts |
| Export contrôlé | Filtrage bundle par rôle/sensibilité | 100% exports validés |

### Matrice RBAC (V1)
| Capability | Orchestrateur | PM | Architecte | SM | DEV | TEA | UX QA | Sponsor | Admin Sécurité |
|---|---|---|---|---|---|---|---|---|---|
| Lire artefacts et traces | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Lancer scripts lecture seule | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | — | ✅ |
| Lancer scripts écriture projet | ✅ | — | — | ✅ | ✅ | — | — | — | ✅ |
| Publier phase-notify | ✅ | ✅ | — | ✅ | — | — | — | — | — |
| Approuver override policy | ✅ | — | — | — | — | — | — | — | ✅ |
| Modifier allowlist | — | — | — | — | — | — | — | — | ✅ |
| Fermer alerte critique sécurité | ✅ | — | — | — | — | — | — | — | ✅ |
| Export bundle audit | ✅ | ✅ | — | — | — | ✅ | ✅ | — | ✅ |
| Changer projet actif global | ✅ | — | — | — | — | — | — | — | ✅ |
| Geler commandes écriture (kill-switch) | ✅ | — | — | — | — | — | — | — | ✅ |

## 14. Modèle de données, événements et preuves
Le modèle de données suit un pattern event-ledger + projections read-side.
Les objets de preuve sont des citoyens de première classe du modèle produit.

| Entité | Champs clés | Usage |
|---|---|---|
| ProjectContext | project_id, active_project_root, mode | Isolation multi-projets et sécurité contexte |
| PhaseState | phase_id, status, owner, started_at, finished_at | Pilotage H01→H23 |
| GateResult | gate_id, verdict, evidence_refs, evaluated_at | Décisions de gate |
| SubGateResult | subgate_id, verdict, details | Détail G4-T / G4-UX |
| HandoffRecord | from_agent, to_agent, objective, inputs, output | Traçabilité handoff |
| ArtifactRecord | path, type, hash, metadata, sections | Indexation artefacts |
| DecisionRecord | decision_id, owner, rationale, status | Journal décisionnel |
| EvidenceLink | decision_id, source_ref, confidence | Lien décision↔preuve |
| CommandExecution | command, actor_role, approved_by, result | Audit commandes |
| RiskItem | risk_id, probability, impact, owner, mitigation | Risk register vivant |
| MitigationTask | task_id, risk_id, due_date, status | Pilotage mitigations |
| NotificationEvent | phase, severity, sent_at, ack_at | SLA notifications |
| AQCDSnapshot | period, autonomy, quality, cost, design | Pilotage AQCD |
| ReadinessScore | phase_id, score, factors | Anticipation blocage gate |
| PolicyVersion | policy_id, version, changed_by, changed_at | Gouvernance règles |
| BundleExport | bundle_id, format, requester, result | Audit et conformité export |

## 15. Dépendances, intégrations et hypothèses techniques
| Dépendance ID | Dépendance | Type | Criticité | Condition d’acceptation |
|---|---|---|---|---|
| D01 | Frontmatter ULTRA obligatoire sur livrables planning | Process | Critique | 100% livrables H01→H10 conformes |
| D02 | Scripts de traçabilité phase disponibles | Process | Critique | new-phase-trace/guards exécutables |
| D03 | Command Broker zero-trust | Sécurité | Critique | allowlist + dry-run + audit actifs |
| D04 | RBAC policy-as-code versionnée | Sécurité | Critique | revue hebdo permissions en place |
| D05 | Dual Gate G4-T/G4-UX câblé | Gouvernance | Critique | 0 faux DONE sur 2 sprints |
| D06 | Pipeline parser + delta indexing | Technique | Élevée | parse_error < 2% |
| D07 | Event ledger append-only signé | Data | Élevée | intégrité journaux vérifiée |
| D08 | Baselines AQCD et TCD collectées | Data | Élevée | snapshots fiables disponibles |
| D09 | Règles UX/WCAG documentées | UX | Élevée | score a11y >=85 |
| D10 | Runbooks incident + on-call | Ops | Élevée | MTTA critique <10min |
| D11 | Cadre FinOps et budgets | FinOps | Élevée | AQCD cost >=70 |
| D12 | Préparation self-host sécurisée | Sécurité | Élevée | plan daté avant GA |
| D13 | Connecteurs externes prioritaires | Technique | Modérée | Jira/Linear/Notion read-first opérationnels |
| D14 | Politique rétention/suppression | Conformité | Critique | 100% types data couverts |
| D15 | Plan conduite du changement | Adoption | Modérée | time-to-first-value <14 jours |
| D16 | Sign-off inter-rôles PM/Arch/UX/TEA | Gouvernance | Critique | aucun gate majeur sans sign-off |
| D17 | Disponibilité exports pdf | Technique | Modérée | bundle pdf success >=98% |
| D18 | Ingestion rapports tests CI | Technique | Modérée | couverture rapports >95% runs |
| D19 | Ingestion scans sécurité | Sécurité | Élevée | 0 vulnérabilité high non tracée |
| D20 | Stabilité API internes | Technique | Élevée | 0 breaking change non versionné |

## 16. Plan d’instrumentation KPI et analytics produit
Le plan KPI priorise des métriques actionnables, non vanity, avec owner et seuil.

| KPI ID | Métrique | Définition | Cible | Owner | Fréquence |
|---|---|---|---|---|---|
| KPI-01 | TCD (Time-to-confident-decision) | Temps moyen pour décision gate/phase avec preuves | -30% vs baseline | PM Produit | hebdo |
| KPI-02 | Gate concerns resolution time | Temps de résolution des gates CONCERNS | < 24h planning | PM/TEA | quotidien |
| KPI-03 | Handoff rework ratio | % handoffs renvoyés pour manque qualité | < 15% | PM BMAD | hebdo |
| KPI-04 | Faux DONE rate | Stories invalidées post-DONE pour raison UX | 0 sur 2 sprints | UX QA + TEA | hebdo |
| KPI-05 | Artifact retrieval time | Temps pour retrouver artefact + décision liée | < 2 min | PM/Architecte | hebdo |
| KPI-06 | AQCD quality/design | Score qualité et design combinés | >=80 chacun | Orchestrateur | hebdo |
| KPI-07 | Notification acknowledgment SLA | % alertes critiques ack <10 min | >=90% | Orchestrateur | temps réel |
| KPI-08 | Policy violation rate | Tentatives commandes refusées hors policy | tendance décroissante | Security | quotidien |
| KPI-09 | Accessibility score | Score accessibilité sur vues critiques | >=85 | UX QA | release |
| KPI-10 | Cross-project incident count | Incidents de contexte projet en écriture | 0 | Security/Orchestrateur | temps réel |
| KPI-11 | Bundle export success | Succès export bundles preuve | >=98% | TEA | quotidien |
| KPI-12 | Pilot activation rate | Taux activation utilisateurs pilotes | >=60% | PMM | mensuel |
| KPI-13 | Cost per accepted decision | Coût moyen par décision validée | stabilisation trimestrielle | FinOps | hebdo |
| KPI-14 | Waste ratio | Part de coût non productif (retries/duplication) | <25% | FinOps | hebdo |
| KPI-15 | Readiness score precision | Capacité à anticiper gates problématiques | >=65% précision initiale | PM+Architecte | hebdo |
| KPI-16 | Phase notify compliance | % phases notifiées en <5min | >=95% | Orchestrateur | quotidien |
| KPI-17 | Command dry-run compliance | % commandes write exécutées après dry-run | 100% | Security | quotidien |
| KPI-18 | Alerte fatigue index | % alertes ignorées >24h | <15% | UX Lead | hebdo |
| KPI-19 | Mitigation closure rate | % mitigations critiques clôturées dans sprint | >=80% | SM/TEA | hebdo |
| KPI-20 | Parsing error rate | Taux d’erreur parsing artefacts | <2% | Architecte | temps réel |
| KPI-21 | Read-model staleness | Âge des projections critiques | <120s nominal | Architecte | temps réel |
| KPI-22 | Gate report lead time | Temps génération rapport gate | <5min | PM | hebdo |
| KPI-23 | Decision trace completeness | % décisions avec preuve primaire | 100% | PM | hebdo |
| KPI-24 | Security high findings open | Nombre vulnérabilités high ouvertes | 0 release candidate | Security | quotidien |
| KPI-25 | Onboarding time | Délai first value par nouveau rôle | <14 jours | PMM/CS | mensuel |
| KPI-26 | UX debt burn-down | Réduction dette UX sprint par sprint | tendance positive | UX QA | hebdo |
| KPI-27 | Retro action completion | Actions H21/H22 clôturées à échéance | >=85% | Orchestrateur | mensuel |
| KPI-28 | Override policy count | Nombre d’overrides policy | tendre vers 0 | Security | hebdo |
| KPI-29 | Search zero result rate | Recherches sans résultat utile | <20% | UX Lead | hebdo |
| KPI-30 | User confidence score | Confiance décisionnelle perçue | >=4/5 | PM Produit | mensuel |

## 17. Observabilité, alerting et playbooks de réaction
| Alerte ID | Déclencheur | Sévérité | Réponse attendue | Owner |
|---|---|---|---|---|
| AL-01 | phase notify manquant > 30 min | Critique | Bloquer transition + notifier orchestrateur | Orchestrateur |
| AL-02 | commande hors allowlist tentée | Critique | Refus + audit sécurité + revue policy | Security |
| AL-03 | G4-T PASS et G4-UX FAIL | Élevée | Bloquer DONE + créer tâche corrective UX | UX QA/TEA |
| AL-04 | parse error rate > 5% | Élevée | Basculer parser safe mode + escalade architecte | Architecte |
| AL-05 | readiness score < 60 | Élevée | Afficher recommandations avant gate | PM/Architecte |
| AL-06 | queue ingestion > seuil 10 min | Moyenne | Activer backpressure | Architecte |
| AL-07 | AQCD qualité < 65 deux cycles | Moyenne | Kill-switch autonomie partielle | Orchestrateur |
| AL-08 | alert fatigue > 30% ignorées | Moyenne | Activer throttling renforcé | UX Lead |
| AL-09 | cross-project write tentative | Critique | Stop exécution + incident sécurité | Security |
| AL-10 | security high finding détecté | Critique | Bloquer release candidate | Security/TEA |
| AL-11 | bundle export failure > 2% | Moyenne | Analyser service export + retry | TEA |
| AL-12 | MTTA critique > 10 min | Élevée | Escalade on-call immédiate | On-call |
| AL-13 | override policy non justifié | Élevée | Annuler override + audit | Security |
| AL-14 | TCD ne baisse pas sur 4 semaines | Moyenne | Reprioriser roadmap décisionnelle | PM Produit |
| AL-15 | mitigation critique en retard > 1 sprint | Élevée | Escalade CODIR + freeze scope | SM/PM |

## 18. Registre des risques et mitigations (consolidé)
Le registre reprend les risques structurants issus de la recherche H02 (tech, process, UX, sécurité, coût, adoption).

| Risque ID | Domaine | Description | P | I | D | Score | Mitigation principale | Owner | Gate impacté |
|---|---|---|---:|---:|---:|---:|---|---|---|
| T01 | Technique | Dérive de format markdown/frontmatter | 4 | 5 | 3 | 60 | Versionner schémas + lint metadata | Architecte | G2 |
| T02 | Technique | Absence métadonnées obligatoires | 4 | 4 | 3 | 48 | Blocage ingestion + correctif guidé | PM BMAD | G2 |
| T03 | Technique | Saturation queue ingestion | 3 | 4 | 3 | 36 | Backpressure + priorités + DLQ | Architecte | G2/G3 |
| T04 | Technique | Latence projections critiques | 3 | 5 | 4 | 60 | Projections matérialisées + cache | Architecte | G2/G3 |
| T05 | Technique | Rupture contrats front/back | 3 | 5 | 4 | 60 | Contract tests + versioning API | Lead Eng | G3 |
| T06 | Technique | Couplage scripts legacy | 4 | 4 | 3 | 48 | Adapters versionnés | Architecte | G2/G3 |
| T07 | Technique | Faux DONE via G4-UX mal câblé | 3 | 5 | 5 | 75 | Dual gate bloquant + tests E2E | TEA+UX QA | G4 |
| T08 | Technique | Absence mode dégradé read-model | 3 | 4 | 4 | 48 | Stale-but-available + fallback | Architecte | G2/G3 |
| P01 | Process | Non-respect ordre canonique H01→H23 | 3 | 5 | 4 | 60 | Machine d’état stricte | Orchestrateur | G1/G2/G3 |
| P02 | Process | Handoffs incomplets | 4 | 4 | 3 | 48 | Contrat handoff obligatoire | PM | G2 |
| P03 | Process | Notifications phase manquantes | 3 | 4 | 3 | 36 | Blocage auto sans notify | Orchestrateur | G2 |
| P04 | Process | RACI flou | 3 | 4 | 4 | 48 | Owner obligatoire + escalade 24h | PM+Orch | G2 |
| P05 | Process | Mitigations non fermées | 4 | 4 | 3 | 48 | Tracking sprint + freeze si retard | SM+TEA | G2/G3 |
| P06 | Process | Contrôles ULTRA contournés | 3 | 5 | 4 | 60 | Checks bloquants visibles | Orchestrateur | G2 |
| P07 | Process | Erreur contexte multi-projets | 3 | 5 | 4 | 60 | Root signé + confirmation | Orch+Security | G2/G3 |
| U01 | UX | Surcharge cognitive cockpit | 4 | 3 | 3 | 36 | Vues par rôle + progressive disclosure | UX Lead | G2/G4 |
| U02 | UX | États UI incomplets | 3 | 4 | 3 | 36 | Checklist états obligatoires | UX QA | G4-UX |
| U03 | UX | Non-conformité WCAG 2.2 AA | 3 | 5 | 4 | 60 | Audit a11y auto+manuel | UX QA | G4-UX |
| U04 | UX | Responsive dégradé | 3 | 3 | 3 | 27 | Tests sur 3 classes d’écran | UX Lead | G4-UX |
| U05 | UX | Next action peu compréhensible | 4 | 3 | 3 | 36 | Owner+preuve+action obligatoire | PM Produit | G2 |
| U06 | UX | Fatigue notifications | 4 | 4 | 3 | 48 | Throttling + regroupement | Orch+UX | G2 |
| S01 | Sécurité | Commande destructive mauvais projet | 3 | 5 | 5 | 75 | Double confirmation + dry-run | Admin Sec | G2/G3 |
| S02 | Sécurité | Injection arguments shell | 3 | 5 | 4 | 60 | Templates paramètres stricts | Security Eng | G2/G3 |
| S03 | Sécurité | RBAC trop permissif | 4 | 5 | 4 | 80 | RBAC minimal + revue hebdo | Admin Sec | G2/G3 |
| S04 | Sécurité | Journal audit altérable | 2 | 5 | 5 | 50 | Ledger signé append-only | Security Eng | G2/G5 |
| S05 | Sécurité | Fuite secrets logs | 3 | 5 | 4 | 60 | Redaction + scans secrets | Security Eng | G2/G3 |
| S06 | Sécurité | Exfiltration via export | 3 | 4 | 4 | 48 | Filtrage export par rôle | Security+TEA | G2/G5 |
| S07 | Sécurité | Non-révocation accès | 3 | 4 | 4 | 48 | JML automatisé + audit IAM | Admin Sec | G2 |
| S08 | Sécurité | Non-conformité rétention/suppression | 3 | 5 | 4 | 60 | Policy lifecycle validée | DPO/Sec Lead | G2/G3 |
| C01 | Coût | Explosion coûts token | 4 | 4 | 3 | 48 | Budgets phase + alertes waste | FinOps | G2 |
| C02 | Coût | Surcoût stockage ledger | 3 | 3 | 3 | 27 | Tiering + compression + archivage | Architecte | G3 |
| C03 | Coût | Sous-estimation coûts intégration | 3 | 4 | 3 | 36 | Prioriser connecteurs critiques | PM Produit | G2 |
| C04 | Coût | Onboarding trop coûteux | 3 | 3 | 3 | 27 | Parcours guidé + templates rôle | PMM/CS | G2 |
| C05 | Coût | Rework UX tardif | 4 | 4 | 3 | 48 | UX QA tôt + gate bloquant | UX QA+TEA | G4 |
| M01 | Adoption | Confusion catégorie produit | 4 | 4 | 3 | 48 | Message TCD+preuve+action | PMM | G2 |
| M02 | Adoption | ROI TCD non démontré | 4 | 5 | 3 | 60 | Instrumentation baseline + suivi | PM Produit | G2 |
| M03 | Adoption | Résistance changement stack | 4 | 4 | 3 | 48 | Position overlay + connecteurs | PMM+SE | G2 |
| M04 | Adoption | Scope inflation V1 | 4 | 4 | 2 | 32 | Cadre anti-scope gouverné | PM Produit | G2 |
| M05 | Adoption | Cycle vente enterprise trop long | 3 | 4 | 4 | 48 | Pack compliance standardisé | Sales+Security | G2 |
| M06 | Adoption | Dépendance niche BMAD | 3 | 3 | 3 | 27 | Narratif phase-gate-evidence | PMM | G2 |
| M07 | Adoption | Retard self-host readiness | 3 | 5 | 4 | 60 | Roadmap self-host datée | Architecte+Sec | G3 |
| M08 | Adoption | Lisibilité AQCD faible sponsor | 3 | 4 | 3 | 36 | Vue executive simplifiée | PM+Ops | G2 |

## 19. Plan de rollout, adoption et conduite du changement
Le rollout suit une logique progressive “preuve de valeur d’abord, extension ensuite”.

| Phase rollout | Horizon | Objectif | Livrables | Critères de passage |
|---|---|---|---|---|
| R0 - Préparation | Semaine 1 | Mettre en place baseline et instrumentation | Baseline TCD/AQCD, catalogue commandes, owners | Baselines validées et data fiable |
| R1 - Fondations | Semaine 2 | Activer Pipeline Board + Gate Center minimal | Vue phases/gates, garde notify, preuves primaires | Décision phase en <90s sur cas test |
| R2 - Evidence | Semaine 3 | Activer Artifact Explorer + Evidence Graph | Recherche, liens preuve, diff artefacts | Temps recherche preuve <2 min |
| R3 - Sécurisation | Semaine 4 | Activer Command Broker dry-run + RBAC | allowlist, audit, root signé, doubles confirmations | 0 incident sécurité pilote |
| R4 - Intelligence | Semaine 5 | Activer AQCD + Readiness + Risk Radar | Snapshots AQCD, score readiness, heatmap risques | alertes readiness actionnables |
| R5 - UX Quality | Semaine 6 | Activer UX evidence + G4 dual strict | preuves UX liées, blocage DONE dual gate | 0 faux DONE en sprint pilote |
| R6 - Intégrations | Semaine 7 | Connecteurs read-first prioritaires | Jira/Linear/Notion + CI + scans sécurité | visibilité inter-outils stable |
| R7 - Auditability | Semaine 8 | Bundles export et conformité rétention | exports md/pdf/json, policy data lifecycle | bundle success >=98% |
| R8 - Pilot élargi | Semaine 9-10 | Étendre à 2-3 équipes | onboarding par rôle, support runbooks | activation >=60% |
| R9 - Hardening | Semaine 11 | Durcir performance/résilience | chaos tests, fallback stale, tuning | SLO clés tenus 2 semaines |
| R10 - Pre-GA | Semaine 12 | Gate de décision go/no-go | revue risques critiques résiduels | aucun critique sans mitigation active |
| R11 - GA contrôlée | Après validation | Lancement progressif | runbook exploitation, support niveau 1/2 | OK sponsor + sécurité + PM + architecture |

## 20. Plan de validation, test et qualité (pré-H08/H10)
| Test ID | Type | Cible | Objectif de validation | Critère PASS |
|---|---|---|---|---|
| TC-FR-001 | E2E | FR-001 | Valider FR-001 - Timeline canonique H01→H23 | AC liés respectés et logs de preuve disponibles |
| TC-FR-002 | E2E | FR-002 | Valider FR-002 - Transitions autorisées uniquement | AC liés respectés et logs de preuve disponibles |
| TC-FR-003 | E2E | FR-003 | Valider FR-003 - Blocage sans phase-notify | AC liés respectés et logs de preuve disponibles |
| TC-FR-004 | E2E | FR-004 | Valider FR-004 - Owner et horodatage de phase | AC liés respectés et logs de preuve disponibles |
| TC-FR-005 | E2E | FR-005 | Valider FR-005 - Checklist pré-phase | AC liés respectés et logs de preuve disponibles |
| TC-FR-006 | E2E | FR-006 | Valider FR-006 - Exécution des guards | AC liés respectés et logs de preuve disponibles |
| TC-FR-007 | E2E | FR-007 | Valider FR-007 - Historique de transitions | AC liés respectés et logs de preuve disponibles |
| TC-FR-008 | E2E | FR-008 | Valider FR-008 - Alerte SLA de phase | AC liés respectés et logs de preuve disponibles |
| TC-FR-009 | E2E | FR-009 | Valider FR-009 - Override encadré | AC liés respectés et logs de preuve disponibles |
| TC-FR-010 | E2E | FR-010 | Valider FR-010 - Matrice dépendances phase | AC liés respectés et logs de preuve disponibles |
| TC-FR-011 | E2E | FR-011 | Valider FR-011 - Gate Center unifié | AC liés respectés et logs de preuve disponibles |
| TC-FR-012 | E2E | FR-012 | Valider FR-012 - Sous-gates G4 explicites | AC liés respectés et logs de preuve disponibles |
| TC-FR-013 | E2E | FR-013 | Valider FR-013 - Verdict global calculé | AC liés respectés et logs de preuve disponibles |
| TC-FR-014 | E2E | FR-014 | Valider FR-014 - Blocage DONE dual gate | AC liés respectés et logs de preuve disponibles |
| TC-FR-015 | E2E | FR-015 | Valider FR-015 - Lien de preuve obligatoire | AC liés respectés et logs de preuve disponibles |
| TC-FR-016 | E2E | FR-016 | Valider FR-016 - Workflow de résolution CONCERNS | AC liés respectés et logs de preuve disponibles |
| TC-FR-017 | E2E | FR-017 | Valider FR-017 - Versionnement policy gate | AC liés respectés et logs de preuve disponibles |
| TC-FR-018 | E2E | FR-018 | Valider FR-018 - Simulation pré-gate | AC liés respectés et logs de preuve disponibles |
| TC-FR-019 | E2E | FR-019 | Valider FR-019 - Tendance de gates | AC liés respectés et logs de preuve disponibles |
| TC-FR-020 | E2E | FR-020 | Valider FR-020 - Export rapport gate | AC liés respectés et logs de preuve disponibles |
| TC-FR-021 | Intégration | FR-021 | Valider FR-021 - Ingestion markdown/yaml | AC liés respectés et logs de preuve disponibles |
| TC-FR-022 | Intégration | FR-022 | Valider FR-022 - Validation frontmatter | AC liés respectés et logs de preuve disponibles |
| TC-FR-023 | Intégration | FR-023 | Valider FR-023 - Extraction sections | AC liés respectés et logs de preuve disponibles |
| TC-FR-024 | Intégration | FR-024 | Valider FR-024 - Extraction tableaux | AC liés respectés et logs de preuve disponibles |
| TC-FR-025 | Intégration | FR-025 | Valider FR-025 - Recherche plein texte | AC liés respectés et logs de preuve disponibles |
| TC-FR-026 | Intégration | FR-026 | Valider FR-026 - Filtres contextuels | AC liés respectés et logs de preuve disponibles |
| TC-FR-027 | Intégration | FR-027 | Valider FR-027 - Diff d’artefact | AC liés respectés et logs de preuve disponibles |
| TC-FR-028 | Intégration | FR-028 | Valider FR-028 - Graph de provenance | AC liés respectés et logs de preuve disponibles |
| TC-FR-029 | Intégration | FR-029 | Valider FR-029 - Backlinks décision | AC liés respectés et logs de preuve disponibles |
| TC-FR-030 | Intégration | FR-030 | Valider FR-030 - Fraîcheur de données | AC liés respectés et logs de preuve disponibles |
| TC-FR-031 | Intégration | FR-031 | Valider FR-031 - Diagnostic parse errors | AC liés respectés et logs de preuve disponibles |
| TC-FR-032 | Intégration | FR-032 | Valider FR-032 - Annotations et tags risque | AC liés respectés et logs de preuve disponibles |
| TC-FR-033 | Sécurité | FR-033 | Valider FR-033 - Catalogue allowlist | AC liés respectés et logs de preuve disponibles |
| TC-FR-034 | Sécurité | FR-034 | Valider FR-034 - Mode dry-run | AC liés respectés et logs de preuve disponibles |
| TC-FR-035 | Sécurité | FR-035 | Valider FR-035 - Preview impact fichiers | AC liés respectés et logs de preuve disponibles |
| TC-FR-036 | Sécurité | FR-036 | Valider FR-036 - Double confirmation destructive | AC liés respectés et logs de preuve disponibles |
| TC-FR-037 | Sécurité | FR-037 | Valider FR-037 - Contrôle RBAC | AC liés respectés et logs de preuve disponibles |
| TC-FR-038 | Sécurité | FR-038 | Valider FR-038 - Root actif signé | AC liés respectés et logs de preuve disponibles |
| TC-FR-039 | Sécurité | FR-039 | Valider FR-039 - Audit log immuable | AC liés respectés et logs de preuve disponibles |
| TC-FR-040 | Sécurité | FR-040 | Valider FR-040 - Timeout et retry borné | AC liés respectés et logs de preuve disponibles |
| TC-FR-041 | Sécurité | FR-041 | Valider FR-041 - Queue et backpressure | AC liés respectés et logs de preuve disponibles |
| TC-FR-042 | Sécurité | FR-042 | Valider FR-042 - Kill-switch opérationnel | AC liés respectés et logs de preuve disponibles |
| TC-FR-043 | Sécurité | FR-043 | Valider FR-043 - Override policy encadré | AC liés respectés et logs de preuve disponibles |
| TC-FR-044 | Sécurité | FR-044 | Valider FR-044 - Bibliothèque templates | AC liés respectés et logs de preuve disponibles |
| TC-FR-045 | Intégration | FR-045 | Valider FR-045 - Tableau AQCD explicable | AC liés respectés et logs de preuve disponibles |
| TC-FR-046 | Intégration | FR-046 | Valider FR-046 - Snapshots périodiques AQCD | AC liés respectés et logs de preuve disponibles |
| TC-FR-047 | Intégration | FR-047 | Valider FR-047 - Readiness score explicable | AC liés respectés et logs de preuve disponibles |
| TC-FR-048 | Intégration | FR-048 | Valider FR-048 - Recommandations actionnables | AC liés respectés et logs de preuve disponibles |
| TC-FR-049 | Intégration | FR-049 | Valider FR-049 - Registre risques vivant | AC liés respectés et logs de preuve disponibles |
| TC-FR-050 | Intégration | FR-050 | Valider FR-050 - Mitigation task linking | AC liés respectés et logs de preuve disponibles |
| TC-FR-051 | Intégration | FR-051 | Valider FR-051 - Heatmap risques | AC liés respectés et logs de preuve disponibles |
| TC-FR-052 | Intégration | FR-052 | Valider FR-052 - Coût par décision | AC liés respectés et logs de preuve disponibles |
| TC-FR-053 | Intégration | FR-053 | Valider FR-053 - Waste ratio par phase | AC liés respectés et logs de preuve disponibles |
| TC-FR-054 | Intégration | FR-054 | Valider FR-054 - Tracker actions rétro | AC liés respectés et logs de preuve disponibles |
| TC-FR-055 | E2E | FR-055 | Valider FR-055 - Vues orientées rôle | AC liés respectés et logs de preuve disponibles |
| TC-FR-056 | E2E | FR-056 | Valider FR-056 - Next Best Action | AC liés respectés et logs de preuve disponibles |
| TC-FR-057 | E2E | FR-057 | Valider FR-057 - Notification center priorisé | AC liés respectés et logs de preuve disponibles |
| TC-FR-058 | E2E | FR-058 | Valider FR-058 - Throttling notifications | AC liés respectés et logs de preuve disponibles |
| TC-FR-059 | E2E | FR-059 | Valider FR-059 - SLA phase-notify | AC liés respectés et logs de preuve disponibles |
| TC-FR-060 | E2E | FR-060 | Valider FR-060 - Commentaires décisionnels | AC liés respectés et logs de preuve disponibles |
| TC-FR-061 | E2E | FR-061 | Valider FR-061 - Mentions et escalade | AC liés respectés et logs de preuve disponibles |
| TC-FR-062 | E2E | FR-062 | Valider FR-062 - Timeline d’activité | AC liés respectés et logs de preuve disponibles |
| TC-FR-063 | E2E | FR-063 | Valider FR-063 - États UI obligatoires | AC liés respectés et logs de preuve disponibles |
| TC-FR-064 | E2E | FR-064 | Valider FR-064 - Navigation clavier | AC liés respectés et logs de preuve disponibles |
| TC-FR-065 | E2E | FR-065 | Valider FR-065 - Contraste et lisibilité | AC liés respectés et logs de preuve disponibles |
| TC-FR-066 | E2E | FR-066 | Valider FR-066 - Responsive 3 classes | AC liés respectés et logs de preuve disponibles |
| TC-FR-067 | E2E | FR-067 | Valider FR-067 - Preuves UX G4 | AC liés respectés et logs de preuve disponibles |
| TC-FR-068 | E2E | FR-068 | Valider FR-068 - UX debt lane | AC liés respectés et logs de preuve disponibles |
| TC-FR-069 | E2E | FR-069 | Valider FR-069 - Glossaire contextuel | AC liés respectés et logs de preuve disponibles |
| TC-FR-070 | E2E | FR-070 | Valider FR-070 - Cohérence design tokens | AC liés respectés et logs de preuve disponibles |
| TC-FR-071 | Sécurité | FR-071 | Valider FR-071 - Switch multi-projets | AC liés respectés et logs de preuve disponibles |
| TC-FR-072 | Sécurité | FR-072 | Valider FR-072 - Protection cross-project | AC liés respectés et logs de preuve disponibles |
| TC-FR-073 | Sécurité | FR-073 | Valider FR-073 - Connecteur Jira read | AC liés respectés et logs de preuve disponibles |
| TC-FR-074 | Sécurité | FR-074 | Valider FR-074 - Connecteur Linear read | AC liés respectés et logs de preuve disponibles |
| TC-FR-075 | Sécurité | FR-075 | Valider FR-075 - Connecteur Notion links | AC liés respectés et logs de preuve disponibles |
| TC-FR-076 | Sécurité | FR-076 | Valider FR-076 - Ingestion rapports tests CI | AC liés respectés et logs de preuve disponibles |
| TC-FR-077 | Sécurité | FR-077 | Valider FR-077 - Ingestion scans sécurité | AC liés respectés et logs de preuve disponibles |
| TC-FR-078 | Sécurité | FR-078 | Valider FR-078 - Export bundle md/pdf/json | AC liés respectés et logs de preuve disponibles |
| TC-FR-079 | Sécurité | FR-079 | Valider FR-079 - API externe de reporting | AC liés respectés et logs de preuve disponibles |
| TC-FR-080 | Sécurité | FR-080 | Valider FR-080 - Sauvegarde/restauration | AC liés respectés et logs de preuve disponibles |
| TC-FR-081 | Sécurité | FR-081 | Valider FR-081 - Préparation self-host | AC liés respectés et logs de preuve disponibles |
| TC-FR-082 | Sécurité | FR-082 | Valider FR-082 - Rétention/purge | AC liés respectés et logs de preuve disponibles |
| TC-NFR-001 | Non-fonctionnel | NFR-001 | Vérifier Chargement Pipeline Board | Cible p95 < 2.0s atteinte |
| TC-NFR-002 | Non-fonctionnel | NFR-002 | Vérifier Chargement Gate Center | Cible p95 < 2.5s atteinte |
| TC-NFR-003 | Non-fonctionnel | NFR-003 | Vérifier Rafraîchissement delta artefact | Cible p95 < 5s atteinte |
| TC-NFR-004 | Non-fonctionnel | NFR-004 | Vérifier Recherche artefacts | Cible p95 < 2s sur 500 docs atteinte |
| TC-NFR-005 | Non-fonctionnel | NFR-005 | Vérifier Export bundle | Cible p95 < 10s atteinte |
| TC-NFR-006 | Non-fonctionnel | NFR-006 | Vérifier Rebuild projection | Cible < 60s atteinte |
| TC-NFR-007 | Non-fonctionnel | NFR-007 | Vérifier Latence verdict gate | Cible <= 2s après preuve atteinte |
| TC-NFR-008 | Non-fonctionnel | NFR-008 | Vérifier Latence command preview | Cible <= 1.5s atteinte |
| TC-NFR-009 | Non-fonctionnel | NFR-009 | Vérifier Temps ouverture vue risque | Cible p95 < 2.5s atteinte |
| TC-NFR-010 | Non-fonctionnel | NFR-010 | Vérifier Latence timeline notifications | Cible p95 < 2s atteinte |
| TC-NFR-011 | Non-fonctionnel | NFR-011 | Vérifier Disponibilité read-model principal | Cible >= 99.5% atteinte |
| TC-NFR-012 | Non-fonctionnel | NFR-012 | Vérifier Perte d’événement ledger | Cible 0 toléré atteinte |
| TC-NFR-013 | Non-fonctionnel | NFR-013 | Vérifier Succès commandes autorisées | Cible >= 95% atteinte |
| TC-NFR-014 | Non-fonctionnel | NFR-014 | Vérifier Stabilité tests critiques | Cible flakiness < 3% atteinte |
| TC-NFR-015 | Non-fonctionnel | NFR-015 | Vérifier Fallback stale mode | Cible bascule < 60s atteinte |
| TC-NFR-016 | Non-fonctionnel | NFR-016 | Vérifier Retry ingestion borné | Cible max 3 retries + DLQ atteinte |
| TC-NFR-017 | Non-fonctionnel | NFR-017 | Vérifier MTTA alerte critique | Cible < 10 min atteinte |
| TC-NFR-018 | Non-fonctionnel | NFR-018 | Vérifier Précision readiness score | Cible >= 65% sur baseline atteinte |
| TC-NFR-019 | Non-fonctionnel | NFR-019 | Vérifier RBAC minimal par défaut | Cible 0 action critique hors rôle atteinte |
| TC-NFR-020 | Non-fonctionnel | NFR-020 | Vérifier Allowlist commandes | Cible 100% commandes exécutées issues catalogue atteinte |
| TC-NFR-021 | Non-fonctionnel | NFR-021 | Vérifier Validation root actif | Cible 0 exécution destructive hors projet actif atteinte |
| TC-NFR-022 | Non-fonctionnel | NFR-022 | Vérifier Journal d’audit immuable | Cible intégrité vérifiée quotidienne atteinte |
| TC-NFR-023 | Non-fonctionnel | NFR-023 | Vérifier Redaction secrets | Cible 0 secret exposé dans logs persistés atteinte |
| TC-NFR-024 | Non-fonctionnel | NFR-024 | Vérifier Override policy contrôlé | Cible 100% overrides avec approbateur atteinte |
| TC-NFR-025 | Non-fonctionnel | NFR-025 | Vérifier Timeout commandes destructives | Cible timeout max 120s atteinte |
| TC-NFR-026 | Non-fonctionnel | NFR-026 | Vérifier Revocation accès | Cible <24h après changement rôle atteinte |
| TC-NFR-027 | Non-fonctionnel | NFR-027 | Vérifier Rétention des artefacts | Cible politique appliquée par type de données atteinte |
| TC-NFR-028 | Non-fonctionnel | NFR-028 | Vérifier Export contrôlé par rôle | Cible 100% exports validés par policy atteinte |
| TC-NFR-029 | Non-fonctionnel | NFR-029 | Vérifier Traçabilité provenance décision | Cible chaîne preuve complète obligatoire atteinte |
| TC-NFR-030 | Non-fonctionnel | NFR-030 | Vérifier Accessibilité globale | Cible score >= 85 + 0 blocker atteinte |
| TC-NFR-031 | Non-fonctionnel | NFR-031 | Vérifier États interface | Cible 100% widgets critiques avec 4 états atteinte |
| TC-NFR-032 | Non-fonctionnel | NFR-032 | Vérifier Responsive | Cible parcours critiques validés mobile/tablette/desktop atteinte |
| TC-NFR-033 | Non-fonctionnel | NFR-033 | Vérifier Lisibilité décisionnelle | Cible décision critique en <90s pour PER-01 atteinte |
| TC-NFR-034 | Non-fonctionnel | NFR-034 | Vérifier Observabilité full-stack | Cible métriques clés disponibles en continu atteinte |
| TC-NFR-035 | Non-fonctionnel | NFR-035 | Vérifier Runbooks incidents | Cible runbook critique disponible et testé atteinte |
| TC-NFR-036 | Non-fonctionnel | NFR-036 | Vérifier Versioning contrats data | Cible 100% changements avec version + migration atteinte |
| TC-NFR-037 | Non-fonctionnel | NFR-037 | Vérifier Couverture documentation | Cible 100% modules critiques documentés atteinte |
| TC-NFR-038 | Non-fonctionnel | NFR-038 | Vérifier Compatibilité parser | Cible aucune rupture sur corpus de référence atteinte |
| TC-NFR-039 | Non-fonctionnel | NFR-039 | Vérifier Déploiement reproductible | Cible build self-host reproductible atteinte |
| TC-NFR-040 | Non-fonctionnel | NFR-040 | Vérifier Temps onboarding rôle | Cible time-to-first-value < 14 jours atteinte |

## 21. Conditions de gate G2 (Planning Quality) et Critères bloquants
Le passage G2 est **interdit** tant que les critères ci-dessous ne sont pas satisfaits.

| Critère G2 | Description attendue | Preuve requise | Statut attendu |
|---|---|---|---|
| G2-C01 | PRD complet avec metadata stepsCompleted/inputDocuments | Frontmatter valide + lint documentaire | PASS |
| G2-C02 | FR traçables avec IDs stables | Table FR + mapping sources/risques/KPI | PASS |
| G2-C03 | NFR mesurables et testables | Table NFR avec cibles quantitatives | PASS |
| G2-C04 | AC mesurables par FR | Table AC complète avec méthodes de test | PASS |
| G2-C05 | Personas et JTBD explicites | Sections personas + JTBD | PASS |
| G2-C06 | Règles UX explicites et bloquantes | Section UX + matrice UXR | PASS |
| G2-C07 | Dual gate G4-T/G4-UX documenté | Règles gate et blocage DONE | PASS |
| G2-C08 | Sécurité commandes spécifiée | RBAC + allowlist + dry-run + audit | PASS |
| G2-C09 | Dépendances critiques identifiées | Table D01..D20 avec critères acceptation | PASS |
| G2-C10 | Registre risques et mitigations actionnables | Table risques avec owners et scores | PASS |
| G2-C11 | Plan KPI et instrumentation | Table KPI avec owner/fréquence | PASS |
| G2-C12 | Plan de rollout réaliste | Roadmap R0..R11 + critères passage | PASS |
| G2-C13 | Plan de tests pré-H08/H10 | Catalogue tests FR/NFR | PASS |
| G2-C14 | Hypothèses ouvertes explicitement listées | Section questions ouvertes | PASS |
| G2-C15 | Handoff H05/H07/H08 préparé | Table décisions transférables | PASS |
| G2-C16 | Aucune ambiguïté critique non taguée | Review PM+Architecte+UX QA | PASS |
| G2-C17 | Conformité protocole ULTRA | Evidence checks scripts + trace | PASS |
| G2-C18 | Référence qualité explicite incluse | Lien vers ExempleBMAD dans PRD | PASS |
| G2-C19 | Critères de succès produit quantifiés | Section objectifs + KPI + seuils | PASS |
| G2-C20 | Prêt pour design détaillé H05 | Backlog UX constraints extractible | PASS |

### Critères de refus G2 (FAIL immédiat)
- FR sans traçabilité source/risque/kpi.
- AC non mesurables ou non testables.
- Absence de règles explicites G4-UX bloquantes.
- Absence de contrôle sécurité commandes (RBAC/allowlist/root signé).
- Risque critique sans owner ni mitigation active.
- Plan KPI absent ou sans seuil opérationnel.

## 22. Handoff préparé vers H05, H07 et H08
| Décision ID | Destination | Décision produit transférable | Impact attendu | Artefacts à produire en phase cible |
|---|---|---|---|---|
| HD-01 | H05 | Construire UI role-centric autour de Next Best Action | Réduction charge cognitive et TCD | ux.md: layouts par persona + priorité signaux |
| HD-02 | H05 | Rendre visibles G4-T et G4-UX côte à côte | Suppression faux DONE | ux.md: composants gate dual + états |
| HD-03 | H05 | Designer Pattern Evidence Graph lisible non expert | Meilleure confiance décisionnelle | ux.md: modèle visuel de provenance |
| HD-04 | H07 | Valider complétude PRD via critères G2-C01..C20 | Gate planning solide | planning-validation.md: checklist G2 signée |
| HD-05 | H07 | Exiger sign-off croisé PM/Architecte/UX QA/TEA | Réduction ambiguïtés critiques | planning-validation.md: matrice sign-off |
| HD-06 | H08 | Adopter event-ledger + read-model projections | Performance + auditabilité | architecture.md: ADR ledger/projections |
| HD-07 | H08 | Imposer command broker zero-trust | Sécurité opérationnelle | architecture.md: ADR sécurité broker |
| HD-08 | H08 | Versionner contrats handoff/artifact/API | Limiter rupture évolutive | architecture.md: ADR contract-first |
| HD-09 | H08 | Intégrer stale-but-available mode dégradé | Continuité service en incident | architecture.md: ADR résilience fallback |
| HD-10 | H08 | Préparer self-host sécurisé dès V1.1 | Accès segment security-first | architecture.md: plan déploiement self-host |

## 23. Plan d’exécution incrémental et gouvernance projet
### Rythme recommandé
- Revue hebdomadaire PM/Architecte/UX QA/TEA sur risques critiques et dérives KPI.
- Revue quotidienne opérationnelle sur gates, blocages et alertes critiques.
- Revue bi-hebdomadaire UX quality pour dette design et conformité WCAG.
- Revue mensuelle sponsor orientée ROI (TCD, coûts, adoption, qualité).

### Gouvernance de décision
- Toute décision de priorisation majeure doit référencer au moins un KPI + un risque + une preuve.
- Les overrides de policy sont temporaires, tracés et revus en comité sécurité.
- Les écarts à la roadmap sont acceptés uniquement si impact direct sur risques critiques ou objectifs KPI.

## 24. Questions ouvertes et hypothèses à confirmer en H05/H08
| Q ID | Question ouverte | Hypothèse actuelle | Impact si faux | Phase propriétaire |
|---|---|---|---|---|
| Q-01 | La granularité des vues sponsor est-elle suffisante sans surcharger ? | 3 niveaux de lecture suffisent | Risque incompréhension AQCD | H05 |
| Q-02 | Le readiness score rule-based atteint-il >=65% précision ? | Oui sur baseline pilote | Risque mauvaise recommandation | H08 |
| Q-03 | Le set connecteurs read-first couvre-t-il 80% des cas pilotes ? | Oui avec Jira/Linear/Notion | Risque adoption lente | H08 |
| Q-04 | La politique rétention est-elle acceptable pour clients régulés ? | Oui avec profils par type data | Risque blocage enterprise | H08 |
| Q-05 | Le mode self-host peut-il être industrialisé sans dégrader cadence ? | Oui en V1.1 | Risque backlog infra | H08 |
| Q-06 | La charge cognitive reste-t-elle acceptable avec 16+ widgets ? | Oui via vues par rôle | Risque fatigue utilisateur | H05 |
| Q-07 | Le dry-run obligatoire est-il perçu comme friction ou sécurité utile ? | Utile en onboarding | Risque contournement process | H05/H08 |
| Q-08 | Le bundle export PDF conserve-t-il lisibilité sur gros dossiers ? | Oui avec templates segmentés | Risque audit inefficace | H05/H08 |
| Q-09 | Le glossary FR-first réduit-il ambiguïtés inter-rôles ? | Oui sur pilotes | Risque handoff incomplet | H05 |
| Q-10 | Le kill-switch est-il suffisamment rapide en incident réel ? | Oui < 10s | Risque impact sécurité | H08 |
| Q-11 | Les alertes regroupées masquent-elles des signaux faibles ? | Non avec seuils calibrés | Risque incident non détecté | H05/H08 |
| Q-12 | La priorisation V1 est-elle compatible avec capacité équipe ? | Oui si anti-scope respecté | Risque dérive roadmap | H07 |

## 25. Matrice de traçabilité FR → JTBD → Risque → KPI → Gate
| FR ID | JTBD principal | Risque dominant | KPI principal | Gate prioritaire | Source principale |
|---|---|---|---|---|---|
| FR-001 | JTBD-01 | P01 | KPI-01 | G2 | SRC-01 |
| FR-002 | JTBD-01 | P01 | KPI-01 | G2 | SRC-01 |
| FR-003 | JTBD-01 | P01 | KPI-01 | G2 | SRC-01 |
| FR-004 | JTBD-01 | P01 | KPI-01 | G2 | SRC-01 |
| FR-005 | JTBD-01 | P01 | KPI-01 | G2 | SRC-01 |
| FR-006 | JTBD-01 | P01 | KPI-01 | G2 | SRC-01 |
| FR-007 | JTBD-01 | P01 | KPI-01 | G2 | SRC-01 |
| FR-008 | JTBD-01 | P01 | KPI-01 | G2 | SRC-01 |
| FR-009 | JTBD-01 | P01 | KPI-01 | G2 | SRC-01 |
| FR-010 | JTBD-01 | P01 | KPI-01 | G2 | SRC-01 |
| FR-011 | JTBD-02 | T07 | KPI-04 | G4 | SRC-04 |
| FR-012 | JTBD-02 | T07 | KPI-04 | G4 | SRC-04 |
| FR-013 | JTBD-02 | T07 | KPI-04 | G4 | SRC-04 |
| FR-014 | JTBD-02 | T07 | KPI-04 | G4 | SRC-04 |
| FR-015 | JTBD-02 | T07 | KPI-04 | G4 | SRC-04 |
| FR-016 | JTBD-02 | T07 | KPI-04 | G4 | SRC-04 |
| FR-017 | JTBD-02 | T07 | KPI-04 | G4 | SRC-04 |
| FR-018 | JTBD-02 | T07 | KPI-04 | G4 | SRC-04 |
| FR-019 | JTBD-02 | T07 | KPI-04 | G4 | SRC-04 |
| FR-020 | JTBD-02 | T07 | KPI-04 | G4 | SRC-04 |
| FR-021 | JTBD-03 | T01 | KPI-05 | G2 | SRC-04 |
| FR-022 | JTBD-03 | T01 | KPI-05 | G2 | SRC-04 |
| FR-023 | JTBD-03 | T01 | KPI-05 | G2 | SRC-04 |
| FR-024 | JTBD-03 | T01 | KPI-05 | G2 | SRC-04 |
| FR-025 | JTBD-03 | T01 | KPI-05 | G2 | SRC-04 |
| FR-026 | JTBD-03 | T01 | KPI-05 | G2 | SRC-04 |
| FR-027 | JTBD-03 | T01 | KPI-05 | G2 | SRC-04 |
| FR-028 | JTBD-03 | T01 | KPI-05 | G2 | SRC-04 |
| FR-029 | JTBD-03 | T01 | KPI-05 | G2 | SRC-04 |
| FR-030 | JTBD-03 | T01 | KPI-05 | G2 | SRC-04 |
| FR-031 | JTBD-03 | T01 | KPI-05 | G2 | SRC-04 |
| FR-032 | JTBD-03 | T01 | KPI-05 | G2 | SRC-04 |
| FR-033 | JTBD-06 | S03 | KPI-08 | G2 | SRC-06 |
| FR-034 | JTBD-06 | S03 | KPI-08 | G2 | SRC-06 |
| FR-035 | JTBD-06 | S03 | KPI-08 | G2 | SRC-06 |
| FR-036 | JTBD-06 | S03 | KPI-08 | G2 | SRC-06 |
| FR-037 | JTBD-06 | S03 | KPI-08 | G2 | SRC-06 |
| FR-038 | JTBD-06 | S03 | KPI-08 | G2 | SRC-06 |
| FR-039 | JTBD-06 | S03 | KPI-08 | G2 | SRC-06 |
| FR-040 | JTBD-06 | S03 | KPI-08 | G2 | SRC-06 |
| FR-041 | JTBD-06 | S03 | KPI-08 | G2 | SRC-06 |
| FR-042 | JTBD-06 | S03 | KPI-08 | G2 | SRC-06 |
| FR-043 | JTBD-06 | S03 | KPI-08 | G2 | SRC-06 |
| FR-044 | JTBD-06 | S03 | KPI-08 | G2 | SRC-06 |
| FR-045 | JTBD-09 | M02 | KPI-15 | G2/G3 | SRC-06 |
| FR-046 | JTBD-09 | M02 | KPI-15 | G2/G3 | SRC-06 |
| FR-047 | JTBD-09 | M02 | KPI-15 | G2/G3 | SRC-06 |
| FR-048 | JTBD-09 | M02 | KPI-15 | G2/G3 | SRC-06 |
| FR-049 | JTBD-09 | M02 | KPI-15 | G2/G3 | SRC-06 |
| FR-050 | JTBD-09 | M02 | KPI-15 | G2/G3 | SRC-06 |
| FR-051 | JTBD-09 | M02 | KPI-15 | G2/G3 | SRC-06 |
| FR-052 | JTBD-09 | M02 | KPI-15 | G2/G3 | SRC-06 |
| FR-053 | JTBD-09 | M02 | KPI-15 | G2/G3 | SRC-06 |
| FR-054 | JTBD-09 | M02 | KPI-15 | G2/G3 | SRC-06 |
| FR-055 | JTBD-12 | U06 | KPI-07 | G2 | SRC-03 |
| FR-056 | JTBD-12 | U06 | KPI-07 | G2 | SRC-03 |
| FR-057 | JTBD-12 | U06 | KPI-07 | G2 | SRC-03 |
| FR-058 | JTBD-12 | U06 | KPI-07 | G2 | SRC-03 |
| FR-059 | JTBD-12 | U06 | KPI-07 | G2 | SRC-03 |
| FR-060 | JTBD-12 | U06 | KPI-07 | G2 | SRC-03 |
| FR-061 | JTBD-12 | U06 | KPI-07 | G2 | SRC-03 |
| FR-062 | JTBD-12 | U06 | KPI-07 | G2 | SRC-03 |
| FR-063 | JTBD-08 | U03 | KPI-09 | G4-UX | SRC-01 |
| FR-064 | JTBD-08 | U03 | KPI-09 | G4-UX | SRC-01 |
| FR-065 | JTBD-08 | U03 | KPI-09 | G4-UX | SRC-01 |
| FR-066 | JTBD-08 | U03 | KPI-09 | G4-UX | SRC-01 |
| FR-067 | JTBD-08 | U03 | KPI-09 | G4-UX | SRC-01 |
| FR-068 | JTBD-08 | U03 | KPI-09 | G4-UX | SRC-01 |
| FR-069 | JTBD-08 | U03 | KPI-09 | G4-UX | SRC-01 |
| FR-070 | JTBD-08 | U03 | KPI-09 | G4-UX | SRC-01 |
| FR-071 | JTBD-07 | M03 | KPI-11 | G2/G5 | SRC-05 |
| FR-072 | JTBD-07 | M03 | KPI-11 | G2/G5 | SRC-05 |
| FR-073 | JTBD-07 | M03 | KPI-11 | G2/G5 | SRC-05 |
| FR-074 | JTBD-07 | M03 | KPI-11 | G2/G5 | SRC-05 |
| FR-075 | JTBD-07 | M03 | KPI-11 | G2/G5 | SRC-05 |
| FR-076 | JTBD-07 | M03 | KPI-11 | G2/G5 | SRC-05 |
| FR-077 | JTBD-07 | M03 | KPI-11 | G2/G5 | SRC-05 |
| FR-078 | JTBD-07 | M03 | KPI-11 | G2/G5 | SRC-05 |
| FR-079 | JTBD-07 | M03 | KPI-11 | G2/G5 | SRC-05 |
| FR-080 | JTBD-07 | M03 | KPI-11 | G2/G5 | SRC-05 |
| FR-081 | JTBD-07 | M03 | KPI-11 | G2/G5 | SRC-05 |
| FR-082 | JTBD-07 | M03 | KPI-11 | G2/G5 | SRC-05 |

## 26. Références et conformité documentaire
Références internes utilisées:
- /root/.openclaw/workspace/docs/BMAD-HYPER-ORCHESTRATION-THEORY.md
- /root/.openclaw/workspace/docs/BMAD-ULTRA-QUALITY-PROTOCOL.md
- /root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/brainstorming-report.md
- /root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/implementation-patterns.md
- /root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/competition-benchmark.md
- /root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/risks-constraints.md
- /root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/exemplebmad-analysis-2026-02-20.md

Référence externe explicite de calibrage qualité:
- https://github.com/XdreaMs404/ExempleBMAD

Ce PRD est conçu comme source de vérité H04 pour les handoffs H05/H07/H08.
Toute modification future devra préserver la traçabilité FR/NFR/AC, les Critères G2 et le lien preuves→décisions.

---
Fin du PRD H04 (relance réelle).
