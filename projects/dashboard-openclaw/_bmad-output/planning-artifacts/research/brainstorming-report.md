---
title: "H01 — Brainstorming approfondi: Dashboard OpenClaw"
phase: "H01"
project: "dashboard-openclaw"
date: "2026-02-20"
workflowType: "BMAD Analysis"
referenceBenchmark: "https://github.com/XdreaMs404/ExempleBMAD"
executionMode: "agent-by-agent + file-by-file"
stepsCompleted:
  - "Cadrage explicite du mandat H01 et des critères G1"
  - "Lecture et synthèse de BMAD-HYPER-ORCHESTRATION-THEORY"
  - "Lecture et synthèse de BMAD-ULTRA-QUALITY-PROTOCOL"
  - "Lecture critique de l'analyse du repo ExempleBMAD"
  - "Extraction des problèmes prioritaires de pilotage multi-agents"
  - "Divergence d'options produit orientées décision"
  - "Convergence vers des hypothèses testables pour H02"
  - "Préparation du paquet de décisions amont pour H03"
inputDocuments:
  - "/root/.openclaw/workspace/docs/BMAD-HYPER-ORCHESTRATION-THEORY.md"
  - "/root/.openclaw/workspace/docs/BMAD-ULTRA-QUALITY-PROTOCOL.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/exemplebmad-analysis-2026-02-20.md"
---

# Dashboard OpenClaw — Rapport de brainstorming H01 (approfondi, orienté décision)

Ce document correspond à la phase **H01** du framework BMAD.
Il est conçu pour être immédiatement exploitable par H02 (recherche) puis H03 (product brief).
Le niveau de détail vise explicitement la référence: https://github.com/XdreaMs404/ExempleBMAD.

## 1. Mandat H01, objectifs et garde-fous

### 1.1 Mandat opérationnel
- Produire une vision initiale réaliste du produit "Dashboard OpenClaw" avant tout PRD.
- Réduire les ambiguïtés majeures sur la valeur, le périmètre et les risques.
- Formuler des hypothèses testables, et non des opinions vagues.
- Générer des options suffisamment distinctes pour éviter un design prématuré.
- Préparer les décisions qui doivent être prises en H03 côté PM.

### 1.2 Contraintes non négociables héritées de BMAD
- Ordre des phases imposé: H01 → H23 (pas de permutation).
- Gating explicite à chaque étape (PASS / CONCERNS / FAIL).
- Le DONE d'une story reste double (technique + UX), même si H01 est amont.
- L'exécution documentée doit rester auditable (trace, handoff, preuves).
- L'approche "fast but shallow" est explicitement interdite.

### 1.3 Définition de succès H01 pour ce projet
- Le problème principal et ses sous-problèmes sont nommés et priorisés.
- Les utilisateurs cibles sont différenciés par responsabilités réelles.
- Les opportunités sont mappées par valeur vs complexité.
- Les hypothèses sont testables dans H02 avec métriques et seuils.
- Un paquet de pré-décisions H03 est explicitement prêt à consommer.

### 1.4 Anti-objectifs (ce que H01 ne doit pas faire)
- Définir le schéma technique final (relève de H08).
- Figer un backlog de stories détaillées (relève de H09+).
- Confondre ambition produit et promesse marketing non vérifiée.
- Masquer les risques pour accélérer artificiellement la suite.

## 2. Synthèse des enseignements tirés des documents d'entrée

### 2.1 Enseignements de BMAD-HYPER-ORCHESTRATION-THEORY
- Le système cible n'est pas un simple tableau de bord, mais un cockpit de gouvernance multi-agents.
- Les handoffs structurés sont des objets produit de premier plan, pas un détail process.
- L'alignement H01→H23 exige visibilité continue sur phases, gates et dépendances.
- Le modèle AQCD indique que coût, qualité et design doivent être arbitrés ensemble.
- Le gate G4-UX confirme qu'un suivi UX natif est indispensable dans le dashboard.

### 2.2 Enseignements de BMAD-ULTRA-QUALITY-PROTOCOL
- Les livrables planning majeurs doivent porter des métadonnées workflow explicites.
- La production doit rester "agent par agent, fichier par fichier".
- Les notifications de phase sont bloquantes pour avancer proprement.
- La qualité documentaire est un livrable en soi, pas un vernis rédactionnel.
- Les scripts de contrôle qualité doivent être anticipés dès le cadrage.

### 2.3 Enseignements de l'analyse du repo ExempleBMAD
- Le différenciateur principal observé est la profondeur structurée, pas la longueur brute.
- Les artefacts sont reliés entre eux (recherche → brief → PRD → architecture → epics).
- La traçabilité frontmatter et la discipline de format évitent la perte de contexte.
- Les stories riches montrent que les décisions amont sont suffisamment précises.
- Le benchmark impose de penser la future industrialisation documentaire dès H01.

### 2.4 Implication directe pour Dashboard OpenClaw
- Le produit doit réduire la friction entre orchestration théorique et exécution réelle.
- Il doit rendre auditable l'état réel d'une exécution BMAD en quelques secondes.
- Il doit connecter artefacts, statut phase, qualité gates et coûts dans une seule vue.
- Il doit aider à décider: continuer, bloquer, corriger, ou replanifier.

## 3. Problèmes prioritaires à résoudre pour les équipes BMAD

### 3.1 Pain points observables côté orchestration
| ID | Problème | Symptôme visible | Impact opérationnel |
|---|---|---|---|
| P01 | Vision fragmentée du cycle H01→H23 | Statuts dispersés dans plusieurs fichiers | Décisions lentes et erreurs de sequencing |
| P02 | Traçabilité handoff faible | Difficulté à savoir qui a produit quoi | Rework et perte de confiance |
| P03 | Gate status peu lisible | PASS/FAIL non visibles au bon niveau | Risque de passer en force |
| P04 | Qualité UX sous-observée | Focus excessif sur lint/tests | Stories déclarées DONE trop tôt |
| P05 | Coût token peu piloté | Surconsommation non détectée | Budget dégradé sans alerte |
| P06 | Dépendances cachées | Blocages tardifs entre rôles | Cycle time imprévisible |
| P07 | Notifications phase irrégulières | Le flux ne reflète pas l'état réel | Mauvaise coordination humaine |
| P08 | Artefacts difficiles à explorer | Temps élevé pour retrouver une décision | Productivité PM/Architect en baisse |
| P09 | Pas de vue risque consolidée | Risques dans des docs isolés | Priorisation imprécise |
| P10 | Manque de vue historique | Tendances AQCD non visibles | Apprentissage faible d'epic en epic |
| P11 | Contrôle multi-projets fragile | Contexte projet parfois ambigu | Erreurs de commandes sur mauvais scope |
| P12 | Écarts process invisibles | Déviations au protocole non signalées | Dette opérationnelle cumulative |

### 3.2 Pain points côté utilisateurs métiers
- L'orchestrateur veut savoir immédiatement si la phase courante peut avancer sans risque.
- Le PM veut lire en 3 minutes ce qui est décidé, incertain, et bloquant.
- L'Architect veut distinguer dette structurelle et incident ponctuel.
- Le QA/TEA veut une chaîne de preuve exploitable sans fouille manuelle.
- Le sponsor veut comprendre la relation valeur créée vs coût consommé.

### 3.3 Problème racine formulé
Le problème central n'est pas l'absence de scripts, mais l'absence de **surface décisionnelle unifiée**
qui transforme des artefacts BMAD dispersés en signaux actionnables pour décider vite et bien.

### 3.4 Critères de résolution du problème racine
- Un opérateur identifie en <90 secondes le prochain point de blocage probable.
- Un PM peut justifier une décision go/no-go avec preuves liées en <5 minutes.
- Les écarts de protocole sont détectés automatiquement avant impact critique.
- Le rapport coût/qualité est lisible sans calcul manuel.

## 4. Personas opérationnels et jobs-to-be-done

### 4.1 Persona A — Orchestrateur principal (Jarvis/Alex)
- Contexte: pilote plusieurs phases et doit arbitrer rapidement.
- Job principal: maintenir cadence + qualité sans casser le protocole.
- Frustration: manque de vue synthétique des blocages et priorités.
- Décision clé attendue du dashboard: "où agir maintenant pour maximiser le flux".
- KPI persona: taux de passage phase sans rollback, temps moyen de décision.

### 4.2 Persona B — PM produit
- Contexte: transforme recherche en brief, PRD, epics cohérents.
- Job principal: sécuriser une continuité logique H02 → H03 → H04.
- Frustration: artefacts trop verbeux mais peu exploitables décisionnellement.
- Décision clé attendue: "quelles hypothèses sont prêtes à être traduites en scope".
- KPI persona: stabilité du scope, réduction des ambiguïtés critiques.

### 4.3 Persona C — Architecte solution
- Contexte: doit évaluer readiness et risques structurels.
- Job principal: relier besoins, contraintes UX, NFR et faisabilité.
- Frustration: signaux techniques noyés dans des documents process.
- Décision clé attendue: "quelles décisions architecture doivent être prises dès H08".
- KPI persona: incidents évités, taux de rework architecture.

### 4.4 Persona D — TEA / QA lead
- Contexte: responsable de la robustesse des gates techniques.
- Job principal: vérifier la chaîne de preuve et les écarts qualité.
- Frustration: données de test, coverage et review pas agrégées.
- Décision clé attendue: "le risque qualité est-il acceptable pour poursuivre".
- KPI persona: first-pass gate success, défauts échappés.

### 4.5 Persona E — UX QA auditor
- Contexte: garantit que G4-UX est traité comme bloquant réel.
- Job principal: valider accessibilité, responsive, états d'interface.
- Frustration: manque de visibilité des preuves UX dans la chaîne.
- Décision clé attendue: "la story peut-elle être DONE du point de vue design".
- KPI persona: défauts UX détectés avant merge, cohérence design-system.

### 4.6 Persona F — Sponsor / Ops manager
- Contexte: suit l'efficience globale plutôt que les détails techniques.
- Job principal: vérifier que l'exécution produit de la valeur à coût maîtrisé.
- Frustration: reporting difficilement lisible hors contexte expert.
- Décision clé attendue: "faut-il intensifier, stabiliser ou freiner l'autonomie".
- KPI persona: trend AQCD, coût/story acceptée, vélocité utile.

### 4.7 Jobs-to-be-done transverses
- JTBD-01: "Quand une phase se termine, je veux voir immédiatement les impacts sur la suite".
- JTBD-02: "Quand un gate échoue, je veux savoir quoi corriger et par qui".
- JTBD-03: "Quand je consulte un artefact, je veux son contexte de décision complet".
- JTBD-04: "Quand les coûts montent, je veux identifier les causes actionnables".
- JTBD-05: "Quand je prépare H03, je veux des hypothèses priorisées et testables".

## 5. Cartographie des opportunités produit (divergence structurée)

### 5.1 Domains d'opportunité identifiés
| Domaine | Opportunité | Valeur attendue | Complexité estimée | Dépendances clés |
|---|---|---|---|---|
| O1 Pipeline Board | Visualiser H01→H23 en temps réel | Réduction des erreurs de séquence | M | Parsing statuts + traces |
| O2 Gate Control Center | Vue unifiée G1→G5 + G4-T/G4-UX | Décisions go/no-go plus fiables | M | Connexion scripts quality |
| O3 Handoff Graph | Graphe des flux inter-agents | Détection des goulots de coordination | H | Normalisation artefacts handoff |
| O4 Artifact Explorer | Navigation sémantique des docs | Gain majeur de temps PM/Architect | M | Indexation markdown + metadata |
| O5 Decision Log | Journal des décisions et rationnels | Mémoire organisationnelle exploitable | M | Modèle décision + versioning |
| O6 Risk Radar | Registre risques vivant | Priorisation proactive des mitigations | M | Taxonomie risque commune |
| O7 AQCD Cockpit | Score AQCD et tendances | Pilotage autonomie/qualité/coût | H | Data pipeline multi-sources |
| O8 Cost & Capacity | Coûts token + capacité agents | Limitation du waste opérationnel | H | Collecte métriques runtime |
| O9 Notification Hub | Timeline des phase-notify | Discipline process renforcée | L | Intégration scripts notify |
| O10 UX Evidence Lens | Preuves UX associées à G4-UX | Réduction des faux DONE | M | Liens captures / audits UX |
| O11 Multi-project Switchboard | Contrôle de contexte projet | Moins d'erreurs cross-project | M | Gestion actif/inactif robuste |
| O12 Readiness Predictor | Signal précoce de FAIL possible | Réduction des surprises de gate | H | Heuristiques + historique |
| O13 Command Console | Lancement contrôlé des scripts | Exécution rapide et traçable | M | Sécurité commande + journaux |
| O14 Benchmark Tracker | Comparaison qualité vs référence | Maintien du niveau ULTRA | L | Grilles qualité documentaire |
| O15 Story Throughput Lens | Flux story-level H11→H19 | Pilotage sprint précis | M | Données sprint-status + stories |

### 5.2 Opportunités qui créent un avantage défendable
- Combiner gouvernance process + exécution technique dans une même surface.
- Traiter UX gating comme un citoyen de première classe du pilotage.
- Rendre explicite la relation entre qualité documentaire et qualité produit.
- Fournir des recommandations de priorisation actionnables plutôt qu'un simple reporting.

### 5.3 Opportunités différées (mais à garder visibles)
- Simulation prédictive de charge multi-agent selon backlog cible.
- Suggestions automatiques de route de handoff optimale.
- Corrélation assistée entre décisions H01-H03 et incidents H14-H18.

## 6. Scénarios de solution et arbitrage stratégique

### 6.1 Option A — Dashboard d'observabilité uniquement
- Description: lecture centralisée des statuts, sans actions de contrôle.
- Avantages: livraison plus rapide, risque technique modéré.
- Limites: faible impact sur la vitesse de résolution des blocages.
- Risque produit: devenir un "mur de métriques" peu décisionnel.

### 6.2 Option B — Control Tower opérationnelle (recommandée)
- Description: observabilité + actions guidées (scripts, handoff, notify).
- Avantages: impact direct sur le cycle time et la discipline process.
- Limites: nécessite sécurisation des commandes et permissions.
- Risque produit: surcharge si le design d'interaction est confus.

### 6.3 Option C — Copilote autonome orienté décisions
- Description: recommandations automatiques et auto-résolution partielle.
- Avantages: gain potentiel élevé à maturité AQCD.
- Limites: besoin de données historiques propres et gouvernance stricte.
- Risque produit: perte de confiance en cas de recommandations opaques.

### 6.4 Option D — Suite complète dès V1
- Description: embarquer A+B+C dès le premier incrément.
- Avantages: vision ambitieuse immédiate.
- Limites: complexité trop élevée pour un démarrage fiable.
- Risque produit: dette UX et dette technique dès l'amorce.

### 6.5 Matrice d'arbitrage
| Critère | Option A | Option B | Option C | Option D |
|---|---:|---:|---:|---:|
| Valeur à 90 jours | 2/5 | 4/5 | 3/5 | 4/5 |
| Faisabilité immédiate | 5/5 | 4/5 | 2/5 | 1/5 |
| Risque de dérive | 2/5 | 3/5 | 4/5 | 5/5 |
| Différenciation marché | 2/5 | 4/5 | 5/5 | 5/5 |
| Alignement BMAD ULTRA | 3/5 | 5/5 | 4/5 | 2/5 |
| Score total | 14 | 20 | 18 | 17 |

### 6.6 Conclusion d'arbitrage H01
- Recommandation: **Option B** comme cible V1 (Control Tower opérationnelle).
- Décision complémentaire: préparer un chemin d'upgrade vers Option C après stabilisation.
- Conditions: UX claire, sécurité commande, et modèle de permissions dès conception.

## 7. Hypothèses testables à confier à H02

### 7.1 Backlog d'hypothèses (priorisées)
| ID | Hypothèse | Type | Test H02 | Seuil de validation | Action si invalidée |
|---|---|---|---|---|---|
| HYP-01 | Les équipes multi-agents priorisent la visibilité de phase avant l'automatisation | Marché | 10 entretiens orchestrateurs | >=70% confirment | Réduire scope automation V1 |
| HYP-02 | Le manque de traçabilité handoff est un frein majeur à l'échelle | Marché | Analyse qualitative de 8 cas | >=6/8 cas | Renforcer Handoff Graph |
| HYP-03 | Un Gate Center unifié réduit le délai de décision go/no-go | Produit | Test maquette + benchmark temps | -30% temps médian | Repenser hiérarchie visuelle |
| HYP-04 | Le suivi explicite G4-UX réduit les faux DONE | Produit | Revue de 20 stories historiques | -40% rework UX tardif | Prioriser UX Evidence Lens |
| HYP-05 | Les sponsors comprennent AQCD si présenté en 3 niveaux | UX | Test de compréhension | >=80% réponses correctes | Simplifier modèle d'affichage |
| HYP-06 | Les utilisateurs acceptent un mode lecture seule en onboarding | Adoption | Test de préférence | >=60% favorables | Déployer mode guide progressif |
| HYP-07 | Le gain principal perçu vient de l'Artifact Explorer | Marché | Card sorting + interviews | top 3 des attentes | Monter priorité O4 |
| HYP-08 | Les alertes phase-notify doivent être contextualisées, pas brutes | UX | Prototype notifications | >=75% satisfaction | Redesign centre de notif |
| HYP-09 | La gestion multi-projets est critique dès V1 | Marché | Enquête sur 12 équipes | >=50% multi-projets actifs | Prioriser switchboard tôt |
| HYP-10 | Les coûts token sont mal pilotés sans visualisation temporelle | Ops | Audit données runtime | >=30% zones aveugles | Prioriser Cost timeline |
| HYP-11 | Les scripts existants couvrent 70% des actions nécessaires V1 | Tech | Inventaire scripts | >=70% couverture | Créer API wrappers dédiés |
| HYP-12 | Un parser markdown suffit pour indexer les artefacts v1 | Tech | Spike indexation 500 docs | <3s requête type | Basculer vers index plus robuste |
| HYP-13 | L'authentification locale est suffisante en phase initiale | Tech | Analyse risque environnement | risque <= moyen | Introduire RBAC dès V1.1 |
| HYP-14 | Les décisions de phase peuvent être modélisées en schéma simple | Produit | Atelier PM/Architect | consensus >=80% | Itérer modèle décision |
| HYP-15 | Le mode "next best action" est utile sans autonomie forte | UX | Test utilité sur 8 users | >=6 trouvent utile | Revoir phrasing recommandations |
| HYP-16 | Les utilisateurs veulent des vues par rôle et non une vue unique | UX | Test navigation par persona | >=70% préfèrent vues dédiées | Ajouter role presets |
| HYP-17 | Le bruit d'alertes est un risque d'abandon rapide | Adoption | Simu alertes sur 1 sprint | <15% alertes ignorées | Ajouter throttling/priority |
| HYP-18 | La valeur perçue augmente si chaque carte mène à une action | Produit | Test parcours | >=80% complétion tâche | Revoir affordances CTA |
| HYP-19 | Les équipes exigent export de preuve pour audit externe | Marché | Interviews QA/ops | >=60% demande explicite | Prioriser exports PDF/MD |
| HYP-20 | Le dashboard doit fonctionner en mode projet isolé offline | Tech | Analyse contexte déploiement | cas d'usage confirmés | Prévoir mode local-first |
| HYP-21 | La qualité de documentation corrèle avec le taux de gate pass | Data | Étude corrélation interne | corrélation positive nette | Reconsidérer métrique proxy |
| HYP-22 | Les PM veulent comparer versions d'un artefact facilement | UX | Test diff documentaire | >=70% utilisent diff | Prioriser vue comparaison |
| HYP-23 | Les décisions bloquées doivent afficher coût d'inaction | Produit | Prototype décision | >=75% compréhension | Ajouter estimation impact |
| HYP-24 | Le readiness predictor est utile même sans ML au départ | Produit | Heuristiques simples | précision >=65% | Reporter feature avancée |
| HYP-25 | Les workflows BMAD varient peu entre équipes cibles initiales | Marché | Benchmark 5 organisations | >=3 convergentes | Ajouter modèle configurable |
| HYP-26 | Un modèle de permissions par rôle est requis dès V1 | Risque | Atelier sécurité | risque élevé sans RBAC | Inclure RBAC dans scope V1 |
| HYP-27 | Les utilisateurs veulent lier décisions et commits/stories | Produit | Test traceabilité | >=70% intérêt élevé | Prioriser connecteur git |
| HYP-28 | L'usage mobile est secondaire pour ce produit | Marché | Survey + analytics proxy | desktop >=80% | Reprioriser responsive profond |
| HYP-29 | Les équipes valorisent un glossaire BMAD intégré | UX | Test comprehension | +20% score de compréhension | Limiter à tooltips contextuels |
| HYP-30 | Le benchmark ExempleBMAD est perçu comme crédible et utile | Gouvernance | Validation parties prenantes | accord explicite | Définir benchmark alternatif |

### 7.2 Hypothèses critiques (must-test en premier)
- HYP-01, HYP-03, HYP-04, HYP-11, HYP-19, HYP-26.
- Raison: elles conditionnent directement la proposition de valeur V1.

## 8. Registre des risques, contraintes et inconnues critiques

### 8.1 Registre initial
| ID | Risque | Probabilité | Impact | Niveau | Mitigation H02/H03 |
|---|---|---|---|---|---|
| R01 | Sous-estimation de la complexité d'indexation artefacts | M | H | Élevé | Spike technique précoce |
| R02 | Scope inflation via fonctionnalités "nice to have" | H | H | Élevé | Cadre strict V1 / V1.1 |
| R03 | Confusion entre monitoring et pilotage actif | M | M | Moyen | Clarifier parcours et CTA |
| R04 | Données runtime incomplètes pour AQCD fiable | M | H | Élevé | Définir minimum data contract |
| R05 | Résistance utilisateur si UX perçue comme complexe | M | H | Élevé | Tests UX précoces par persona |
| R06 | Alert fatigue due aux notifications | H | M | Élevé | Priorisation + seuils adaptatifs |
| R07 | Sécurité insuffisante sur exécution de scripts | M | H | Élevé | RBAC + allowlist commandes |
| R08 | Dépendance excessive à un format documentaire unique | M | M | Moyen | Adapter parser multi-format |
| R09 | Mesures de valeur mal choisies (vanity metrics) | M | H | Élevé | KPI orientés décisions réelles |
| R10 | Mauvaise qualité de métadonnées dans artefacts source | H | M | Élevé | Validation automatique metadata |
| R11 | Dérive entre exigences PM et contraintes architecte | M | H | Élevé | Ateliers de convergence H03/H08 |
| R12 | Non-respect des notifications de phase | M | M | Moyen | Blocage process automatisé |
| R13 | Surcharge visuelle sur dashboard principal | H | M | Élevé | Progressive disclosure UX |
| R14 | Incohérence terminologique BMAD selon rôles | M | M | Moyen | Glossaire contextuel |
| R15 | Coût de maintenance trop élevé vs gain opérationnel | M | H | Élevé | Priorisation ROI stricte |
| R16 | Biais de validation interne sans preuves externes | M | H | Élevé | Triangulation H02 concurrence |
| R17 | Mauvaise adoption par équipes non expertes BMAD | M | M | Moyen | Parcours onboarding guidé |
| R18 | Défaillance du contexte multi-projets | L | H | Moyen | Guardrails explicites de scope |
| R19 | KPI AQCD mal interprétés par sponsor | M | M | Moyen | Couches de lecture simplifiées |
| R20 | Couplage trop fort aux scripts existants | M | M | Moyen | Abstraction command adapters |
| R21 | Confidentialité des artefacts sensibles | L | H | Moyen | Masquage données + permissions |
| R22 | Latence perçue élevée sur vues agrégées | M | M | Moyen | Caching + chargement progressif |
| R23 | Faible comparabilité avec benchmark externe | L | M | Faible | Définir grille d'équivalence |
| R24 | Dette UX accumulée par vitesse d'implémentation | M | H | Élevé | UX QA gate bloquant réel |
| R25 | Ambiguïté de propriétaire décision par domaine | M | H | Élevé | RACI produit dès H03 |

### 8.2 Contraintes externes déjà visibles
- Contrainte C1: respect strict du protocole BMAD et de ses scripts existants.
- Contrainte C2: documentation en français opérationnel, lisible par plusieurs rôles.
- Contrainte C3: compatibilité avec structure `_bmad-output` actuelle.
- Contrainte C4: nécessité d'être utile sans dépendre d'un stack infra lourde.

## 9. Pré-décisions produit exploitables pour H03

### 9.1 Proposition de valeur candidate
Dashboard OpenClaw = **tour de contrôle BMAD** qui relie phases, gates, artefacts, coûts et décisions
pour permettre des arbitrages rapides, fiables et traçables sur des exécutions multi-agents.

### 9.2 Périmètre V1 recommandé
- Vue pipeline H01→H23 avec état, propriétaire, prochain blocage probable.
- Gate Control Center (G1→G5 + détail G4-T/G4-UX).
- Artifact Explorer avec recherche, filtres, et liens de dépendance.
- Notification timeline des événements de phase critiques.
- Journal de décision relié à artefacts et actions.
- Tableau AQCD de base (niveau synthèse + tendance).

### 9.3 Hors périmètre V1 (à documenter, pas à oublier)
- Exécution autonome de corrections de contenu/documentation.
- Prédiction avancée par machine learning.
- Intégrations externes multiples (Jira, Slack, etc.) en première itération.

### 9.4 North Star Metric candidate
- **Time-to-confident-decision (TCD)**: temps nécessaire pour prendre une décision phase/gate avec preuve suffisante.
- Objectif cible V1: réduction de 35% vs baseline manuel actuel.

### 9.5 KPI de support recommandés
- % phases clôturées sans rollback.
- Délai médian résolution d'un gate en CONCERNS/FAIL.
- % stories bloquées correctement par G4-UX quand nécessaire.
- Temps médian pour retrouver un artefact + décision associée.
- Ratio coût token / décision validée.

### 9.6 RACI décisionnel proposé pour H03
| Domaine | R (responsable) | A (accountable) | C (consulted) | I (informed) |
|---|---|---|---|---|
| Vision produit | PM | Orchestrateur | Architecte, UX | Sponsor |
| Scope V1 | PM | Orchestrateur | TEA, UX QA | Sponsor |
| Stratégie qualité | TEA | Orchestrateur | PM, UX QA | Sponsor |
| Gouvernance UX | UX QA | PM | Architecte | Orchestrateur |
| Politique coût/capacité | Ops Manager | Sponsor | Orchestrateur | PM |

## 10. Plan de recherche H02 (market / tech / risk)

### 10.1 Track A — Recherche marché et concurrence
Objectif: confirmer intensité du problème et positionnement différenciant.

Questions priorisées:
1. Quels profils d'équipes orchestrent réellement des workflows multi-agents aujourd'hui?
2. Quels outils utilisent-elles pour suivre phases, artefacts et qualité?
3. Quelle part du pilotage est encore gérée en fichiers/CLI sans vue unifiée?
4. Quels incidents fréquents sont liés au manque de visibilité process?
5. Quelle valeur est attribuée à la réduction du temps de décision go/no-go?
6. Quelles fonctionnalités sont jugées indispensables pour adopter un cockpit?
7. Quels segments sont prêts à payer (agence, équipe produit, R&D interne)?
8. Quels concurrents couvrent partiellement ce besoin (MLOps, PM, observabilité)?
9. Où se situe l'écart spécifique BMAD face aux outils généralistes?
10. Quel niveau de personnalisation est attendu par segment?
11. Les utilisateurs préfèrent-ils un produit local/self-hosted ou cloud?
12. Quel effort d'onboarding est acceptable (en jours) avant valeur perçue?
13. Quel est le frein principal à l'adoption: coût, complexité, confiance, sécurité?
14. Quelle granularité de reporting attend un sponsor non technique?
15. Quels critères déclenchent un changement d'outil dans ces équipes?

### 10.2 Track B — Recherche technique et faisabilité
Objectif: confirmer que V1 est réalisable vite sans dette ingérable.

Questions priorisées:
1. Quel modèle de données minimal couvre phases, gates, artefacts, décisions?
2. Quel parser/ingestion markdown offre le meilleur ratio robustesse/simplicité?
3. Comment lier de façon fiable un gate à ses preuves techniques/UX?
4. Quelle architecture permet d'isoler proprement les projets actifs?
5. Quel mécanisme de cache éviterait les temps de chargement élevés?
6. Comment sécuriser l'exécution des scripts (allowlist, sandbox, audit log)?
7. Quelle stratégie de permissions est la plus pragmatique en V1?
8. Quels événements runtime faut-il capter pour un AQCD crédible?
9. Quelle granularité d'historisation est nécessaire pour analyses de tendance?
10. Peut-on produire des vues décisionnelles avec l'existant sans refonte majeure?
11. Quels risques de couplage fort aux scripts actuels doivent être neutralisés?
12. Quelle structure API interne facilitera l'extension V1.1?
13. Quels tests end-to-end minimaux garantiront la fiabilité du cockpit?
14. Quels standards d'accessibilité doivent être imposés dès le départ?
15. Quels indicateurs de performance perçue doivent être monitorés côté UI?

### 10.3 Track C — Recherche risques, conformité et gouvernance
Objectif: éviter les angles morts qui cassent l'adoption après MVP.

Questions priorisées:
1. Quels risques juridiques émergent avec stockage d'artefacts décisionnels?
2. Quelles données doivent être masquées ou minimisées par défaut?
3. Quelles politiques de conservation/suppression sont nécessaires?
4. Quels mécanismes empêchent l'usage de commandes sensibles hors cadre?
5. Quel audit trail est requis pour un contrôle interne crédible?
6. Quelles obligations de sécurité diffèrent entre cloud et self-hosted?
7. Quel modèle d'escalade appliquer en cas de gate critique répété?
8. Quelle gouvernance pour maintenir la cohérence terminologique BMAD?
9. Quels signaux annoncent une dérive "automation sans contrôle"?
10. Quelle charte d'usage évite la surdépendance au dashboard?
11. Comment formaliser la responsabilité en cas de mauvaise décision assistée?
12. Quelle preuve minimale exigée pour qualifier un PASS de gate?
13. Comment éviter la manipulation d'indicateurs AQCD?
14. Quelle stratégie de revues périodiques garantit l'amélioration continue?
15. Quels mécanismes de kill-switch sont indispensables côté produit?

### 10.4 Livrables H02 attendus depuis ce brainstorming
- `competition-benchmark.md` orienté "qui résout quoi" + écarts BMAD.
- `implementation-patterns.md` orienté faisabilité V1 + choix techniques.
- `risks-constraints.md` orienté mitigations et décisions d'acceptation.
- Synthèse croisée explicitant impacts directs pour H03.

## 11. Pack de handoff vers H03 (Product Brief)

### 11.1 Décisions que H03 doit prendre en priorité
- Décision D1: confirmer le problème principal et le segment initial cible.
- Décision D2: figer le périmètre V1 et la frontière V1.1.
- Décision D3: valider la North Star Metric (TCD) et ses KPI de support.
- Décision D4: adopter le modèle RACI pour éviter les zones grises.
- Décision D5: acter les hypothèses critiques à valider avant PRD complet.

### 11.2 Structure recommandée du Product Brief H03
1. Contexte et problème prioritaire confirmé.
2. Segments utilisateurs et jobs-to-be-done validés.
3. Proposition de valeur et différenciation.
4. Périmètre V1 / hors périmètre.
5. KPI/North Star + objectifs trimestriels.
6. Risques majeurs et stratégies de mitigation.
7. Conditions de passage vers H04.

### 11.3 Artefacts de support à intégrer en annexe H03
- Tableau des hypothèses HYP-01 à HYP-30 avec statut de validation.
- Registre risques R01 à R25 avec niveau et owner.
- Matrice d'opportunités O1 à O15 avec score valeur/complexité.
- RACI décisionnel et glossaire des termes BMAD utilisés.

### 11.4 Critères de qualité pour juger H03 prêt
- Le brief permet de dire "non" aux demandes hors valeur V1.
- Chaque objectif possède un KPI et un propriétaire explicite.
- Les ambiguïtés critiques d'architecture sont identifiées et taggées.
- Les prérequis UX sont formulés en contraintes actionnables.

## 12. Check de sortie H01 et prochaines actions immédiates

### 12.1 Auto-évaluation G1 (pré-check)
- Hypothèses testables: **OK** (30 hypothèses formulées avec tests et seuils).
- Risques majeurs identifiés: **OK** (25 risques structurés avec mitigation).
- Sources minimales et référence méthodologique: **OK** (3 inputs + benchmark externe explicite).
- Orientation décisionnelle H02/H03: **OK** (plan de recherche + pré-décisions + RACI).

### 12.2 Actions immédiates recommandées (ordre d'exécution)
1. Lancer H02 Track A/B/C avec propriétaires dédiés et délais clairs.
2. Produire une synthèse H02 croisée centrée sur HYP critiques.
3. Démarrer H03 avec ce rapport comme entrée principale de cadrage.
4. Refuser toute extension de scope avant validation HYP-01/HYP-03/HYP-04.
5. Préparer dès H03 un protocole de mesure de la North Star TCD.

### 12.3 Signal de fin de phase
Ce rapport clôt **H01** pour `dashboard-openclaw` avec un niveau de détail exploitable.
La suite doit maintenant transformer ces hypothèses en preuves H02, puis en arbitrages H03.

### 12.4 Références
- BMAD Hyper Orchestration Theory (source de vérité process).
- BMAD Ultra Quality Protocol (source de vérité qualité documentaire).
- Analyse détaillée du repo de référence ExempleBMAD.
- Benchmark qualité visé: https://github.com/XdreaMs404/ExempleBMAD.
