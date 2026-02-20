---
title: "H02 — Recherche d'implémentation détaillée: Dashboard OpenClaw"
phase: "H02"
project: "dashboard-openclaw"
date: "2026-02-20"
workflowType: "BMAD Analysis - Technical Implementation Patterns"
referenceBenchmark: "https://github.com/XdreaMs404/ExempleBMAD"
executionMode: "agent-by-agent + file-by-file"
qualityTarget: "exploitable immédiatement par H03/H04/H08"
stepsCompleted:
  - "Lecture intégrale de BMAD-HYPER-ORCHESTRATION-THEORY (source de vérité H01→H23)"
  - "Lecture intégrale de BMAD-ULTRA-QUALITY-PROTOCOL (contraintes ULTRA)"
  - "Analyse du brainstorming H01 pour reprendre hypothèses, opportunités et risques"
  - "Analyse du benchmark ExempleBMAD pour calibrer profondeur documentaire cible"
  - "Définition des patterns d’architecture utilisables dès H08"
  - "Définition des patterns d’ingestion d’artefacts pour H03/H04"
  - "Conception d’un modèle d’observabilité orienté décisions go/no-go"
  - "Formalisation d’un modèle de sécurité pour exécution de commandes"
  - "Projection explicite du pipeline H01→H23 en capacités produit"
  - "Construction d’une stratégie de testabilité multi-couches (G1→G5)"
  - "Consolidation d’un registre de risques techniques avec mitigations concrètes"
  - "Préparation de décisions pré-ADR actionnables par l’Architecte (H08)"
inputDocuments:
  - "/root/.openclaw/workspace/docs/BMAD-HYPER-ORCHESTRATION-THEORY.md"
  - "/root/.openclaw/workspace/docs/BMAD-ULTRA-QUALITY-PROTOCOL.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/brainstorming-report.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/exemplebmad-analysis-2026-02-20.md"
---

# H02 — Implementation Patterns (Recherche technique approfondie)

Ce livrable transforme les hypothèses H01 en options d’implémentation concrètes pour le Dashboard OpenClaw.
Il sert de base de décision pour le Product Brief (H03), le PRD (H04) et l’Architecture (H08).
Le contenu privilégie les choix vérifiables, les compromis explicites et la traçabilité de bout en bout.

## 1) Mandat H02-tech, périmètre et méthode de recherche

### 1.1 Mandat opérationnel
- Produire une recherche d’implémentation non théorique, directement transposable en décisions produit et architecture.
- Couvrir explicitement les attentes exprimées dans H01: cockpit décisionnel, traçabilité forte, gouvernance des gates et maîtrise des coûts.
- Documenter des patterns réutilisables plutôt que des prescriptions rigides dépendantes d’un stack unique.
- Préparer des entrées actionnables pour les rôles PM (H03/H04) et Architecte (H08).
- Rester aligné avec la discipline BMAD: handoffs structurés, evidence-first, et contrôle de qualité documentaire.

### 1.2 Frontière de ce document
- Inclus: patterns d’architecture applicative et de données pour un dashboard de gouvernance BMAD.
- Inclus: ingestion des artefacts markdown/yaml/logs et stratégie de normalisation.
- Inclus: observabilité technique + observabilité process (gates, handoffs, notifications).
- Inclus: sécurité de l’exécution de commandes et modèle d’autorisations par rôle.
- Inclus: testabilité multi-couches et registre de risques techniques.
- Exclus: choix final d’UI détaillée pixel-perfect (traité principalement en H05/H06).
- Exclus: chiffrage financier final et priorisation business définitive (H03/H04).
- Exclus: ADR validés finaux, qui relèvent de H08 avec arbitrage architecture.

### 1.3 Méthode de production
La méthode suit un flux en six boucles pour éviter les recommandations superficielles:
1. Extraction des contraintes non négociables depuis les documents BMAD de référence.
2. Cartographie des exigences explicites du brainstorming H01 en capacités techniques.
3. Conception d’options de patterns avec compromis (latence, sécurité, complexité, maintenabilité).
4. Définition de contrats de données et de preuves attendues par gate.
5. Validation interne de cohérence H01→H23 (pas de trou de phase, pas de handoff implicite).
6. Formalisation de recommandations prêtes à consommer dans H03/H04/H08.

### 1.4 Principes directeurs retenus
| ID | Principe | Traduction technique immédiate |
|---|---|---|
| P1 | Traçabilité explicite | Toute décision affichée dans le dashboard doit pointer vers un artefact source et un horodatage. |
| P2 | Décision avant visualisation | Chaque écran doit permettre une action, pas seulement une lecture passive. |
| P3 | Sécurité par défaut | Aucune commande d’écriture n’est exécutable sans contrôle de rôle + allowlist. |
| P4 | Data contracts stables | Les formats internes versionnés protègent le système des variations de format markdown. |
| P5 | Progressive enhancement | Le système doit être utile en mode minimal avant d’ajouter des automatisations avancées. |
| P6 | UX comme gate réel | Le statut G4-UX est traité comme bloquant opérationnel, pas comme annotation secondaire. |
| P7 | Mesure anti-vanity | Les métriques retenues doivent influencer une décision concrète en <5 minutes. |
| P8 | Résilience de run | Une panne de parser ou de script ne doit pas casser toute la vue opérationnelle. |

## 2) Synthèse exécutive orientée H03/H04/H08

### 2.1 Conclusions clés
1. Le cœur de valeur du dashboard n’est pas la visualisation de statuts, mais la réduction du temps de décision go/no-go avec preuves liées.
2. Le pattern structurant le plus critique est un **ledger d’événements immuable** qui relie phase, agent, artefact et gate.
3. Un parser markdown simple suffit pour V1 si et seulement si un contrat de métadonnées minimal est appliqué strictement.
4. La séparation read-model / write-model est nécessaire pour éviter que l’ingestion d’artefacts n’impacte la réactivité UI.
5. Le moteur de gates doit unifier G1→G5 et distinguer explicitement G4-T et G4-UX pour éviter les faux DONE.
6. L’exécution de commandes doit passer par un courtier (command broker) avec allowlist, sandbox logique et audit trail inviolable.
7. Le modèle AQCD est exploitable dès V1 via projections matérialisées, sans attendre un entrepôt analytique complexe.
8. La testabilité doit inclure des tests de contrats documentaires (frontmatter, sections obligatoires, liens de preuves).
9. Les principaux risques techniques viennent de la dérive de formats, de la fatigue d’alertes et des permissions trop larges.
10. La projection H01→H23 doit être codée comme machine d’état explicite pour sécuriser les enchaînements de phase.

### 2.2 Décisions prêtes à transférer
| Cible | Décision recommandée | Pourquoi maintenant | Impact attendu |
|---|---|---|---|
| H03 Product Brief | Positionner le produit comme “Control Tower BMAD orientée décision”, pas comme monitoring générique. | Le différenciateur est déjà validé par les pain points H01. | Réduit le risque de scope inflation et clarifie la proposition de valeur. |
| H04 PRD | Définir une exigence fonctionnelle “Evidence Link obligatoire” pour chaque carte décisionnelle. | Empêche la création d'écrans décoratifs non actionnables. | Améliore auditabilité et adoption par PM/Architecte/QA. |
| H04 PRD | Inclure une exigence NFR de latence: <2s pour consultation de phase courante. | La valeur du cockpit dépend de la réactivité. | Diminue le temps perdu en exploration manuelle. |
| H08 Architecture | Adopter un modèle event-ledger + projections read-side. | Supporte simultanément traçabilité et performance d’affichage. | Facilite historique et analyses de tendance. |
| H08 Architecture | Mettre en place un Command Broker sécurisé et versionné. | Le risque de commande destructive est élevé sans contrôle dédié. | Réduit exposition sécurité + facilite conformité interne. |
| H08 Architecture | Prévoir un schéma de données versionné pour artefacts BMAD. | Les formats markdown évolueront avec les équipes. | Limite la casse lors des évolutions et migrations. |

## 3) Contraintes d’implémentation dérivées des documents de référence

### 3.1 Contraintes “BMAD-HYPER-ORCHESTRATION-THEORY”
- Ordre canonique H01→H23 non modifiable: le dashboard doit afficher les transitions autorisées et refuser les sauts illégitimes.
- Chaque handoff doit être matérialisé: le modèle de données doit capturer from_agent, to_agent, objective, inputs, output et statut.
- Les gates sont binaires/ternaires explicites: PASS / CONCERNS / FAIL avec justification obligatoire.
- G4 = G4-T + G4-UX: l’UI doit montrer les deux dimensions côte à côte pour éviter une lecture partielle.
- Amélioration continue H21/H22/H23: il faut stocker et relier les actions de rétro aux epics suivants.
- AQCD implique un calcul traçable des scores; pas de score opaque sans formule ou source.
- Le système doit rester gouvernable même en présence de workers éphémères concurrents.

### 3.2 Contraintes “BMAD-ULTRA-QUALITY-PROTOCOL”
- Agent par agent + fichier par fichier: le dashboard doit refléter cette granularité dans les traces.
- Frontmatter workflow obligatoire: parser et valider `stepsCompleted` + `inputDocuments` sur les livrables majeurs.
- Traçabilité d’exécution H01→H10: intégrer nativement les fichiers `execution-trace/Hxx*.md`.
- Notifications de phase bloquantes: intégrer un état “notify missing” qui interdit la progression.
- Checks qualité documentaire avant clôture: afficher les résultats des scripts sequence-guard et ultra-quality-check.
- Interdiction fast-but-shallow: inclure des indicateurs de profondeur documentaire (sections, tableaux, preuves).

### 3.3 Contraintes issues du brainstorming H01
| ID | Contrainte | Conséquence d’implémentation |
|---|---|---|
| C-H01-01 | Priorité à la réduction du Time-to-confident-decision (TCD). | Chaque écran doit réduire le coût cognitif de tri entre signal et bruit. |
| C-H01-02 | Gate Control Center obligatoire en V1. | Le pilotage go/no-go est le cœur de valeur produit. |
| C-H01-03 | Artifact Explorer relié au contexte décisionnel. | La consultation brute d’un document sans contexte n’apporte pas de valeur. |
| C-H01-04 | Risk Radar vivant. | Les risques doivent rester actionnables, pas figés dans un seul rapport. |
| C-H01-05 | Command Console sécurisée. | La valeur opérationnelle impose des actions, donc un niveau de sécurité explicite. |
| C-H01-06 | UX Evidence Lens pour G4-UX. | Le faux DONE UX est un problème déjà identifié dans les pain points. |
| C-H01-07 | Multi-project isolation. | Le risque d’erreur de contexte projet est réel et coûteux. |

## 4) Catalogue de patterns d’architecture recommandés

| Pattern | Problème traité | Décision d’implémentation | Compromis principal |
|---|---|---|---|
| AP-01 Execution Event Ledger immuable | Les traces d’exécution sont dispersées entre fichiers, logs shell et notifications. | Centraliser tous les événements runtime (phase, gate, command, artifact_update) dans un journal append-only. | Coût de stockage supérieur mais auditabilité radicalement meilleure. |
| AP-02 Handoff Contract-First | Les handoffs libres créent des trous d'information entre rôles. | Imposer un schéma de handoff versionné et validé avant acceptation d'un événement de transition. | Rigidité initiale plus élevée, mais baisse du rework. |
| AP-03 Artifact Snapshot + Delta Indexing | Reparser tous les documents à chaque changement crée des latences inutiles. | Stocker snapshot + hash et reparser seulement les deltas. | Complexité de cache supérieure mais performance stable. |
| AP-04 Dual Gate Engine (Tech + UX) | Les équipes lisent souvent G4-T sans vérifier G4-UX. | Modéliser G4 comme agrégat de deux sous-gates bloquants avec règles explicites. | UI plus dense à concevoir, mais verdict plus fiable. |
| AP-05 Command Broker Zero-Trust | L'exécution directe de scripts ouvre des risques de mauvaise commande ou d'escalade. | Interposer un broker qui applique allowlist, rôle, dry-run, journal d'audit et kill-switch. | Temps d'intégration initial plus important. |
| AP-06 AQCD Materialized Projections | Le calcul AQCD en temps réel sur historique brut coûte cher et ralentit l'UI. | Pré-calculer des vues agrégées par phase, par epic et par période. | Nécessite invalidation cohérente des projections. |
| AP-07 Role-Centric View Composition | Une vue unique surcharge les profils PM, TEA, UX QA et sponsor. | Assembler les écrans à partir de widgets selon rôle et objectif de décision. | Gestion de permissions et de presets plus complexe. |
| AP-08 Decision Graph with Provenance | Les décisions sont dissociées des preuves et deviennent contestables. | Représenter une décision comme nœud relié à artefacts, gates et commandes exécutées. | Schéma de graphe plus riche à maintenir. |
| AP-09 Backpressure-Aware Worker Queue | L'ingestion et les calculs peuvent saturer lorsque plusieurs agents écrivent en parallèle. | Utiliser une file avec priorités, retry borné et stratégie de backoff. | Complexité opérationnelle plus élevée mais meilleure stabilité. |
| AP-10 Policy-as-Code pour gates process | Les règles de passage de phase restent implicites ou changent selon les personnes. | Formaliser les conditions de passage dans des policies versionnées testables. | Nécessite gouvernance des règles et revues régulières. |
| AP-11 Temporal Baseline & Drift Detection | Sans baseline, on ne détecte pas les dérives de cycle time ou qualité documentaire. | Conserver des baselines par phase et alerter sur dérives significatives. | Risque de faux positifs sans calibration initiale. |
| AP-12 Evidence Bundle Packaging | Préparer un audit ou une revue nécessite de rassembler manuellement plusieurs preuves. | Générer un bundle exportable (md/pdf/json) pour chaque décision clé. | Process d'export additionnel à maintenir. |
| AP-13 Fail-Safe Read Models | Une erreur d'ingestion peut rendre la vue globale indisponible. | Servir la dernière projection valide avec drapeau de fraîcheur dégradée. | Risque de lire des données légèrement anciennes. |
| AP-14 Context Isolation by Active Project Root | Les erreurs de scope multi-projets entraînent des actions sur le mauvais dossier. | Signer chaque événement et commande avec `active_project_root` obligatoire. | Friction mineure lors des changements de contexte. |
| AP-15 Readiness Predictor Rule-Based (non ML au départ) | Les blocages de gate sont souvent détectés trop tard. | Calculer un score de readiness à base de règles transparentes avant chaque passage. | Précision inférieure à un modèle ML mais explicabilité forte. |
| AP-16 Command Dry-Run and Diff Preview | Les utilisateurs hésitent à déclencher des scripts sans voir l'impact attendu. | Fournir un mode dry-run affichant les fichiers potentiellement modifiés et commandes exactes. | Certaines commandes ne sont pas totalement simulables. |

### AP-01 — Execution Event Ledger immuable
- **Problème observé**: Les traces d’exécution sont dispersées entre fichiers, logs shell et notifications.
- **Décision recommandée**: Centraliser tous les événements runtime (phase, gate, command, artifact_update) dans un journal append-only.
- **Compromis assumé**: Coût de stockage supérieur mais auditabilité radicalement meilleure.
- **Impact pour H03**: Permet de justifier la promesse produit “preuve en un clic”.
- **Impact pour H04**: NFR d'audit et de rétention documentaire à formaliser.
- **Impact pour H08**: Nécessite un module ingestion→event-store→projection read-side.
- **Implémentation concrète (ordre conseillé)**:
  - Étape 1: Documenter le contrat de données et les préconditions de ce pattern.
  - Étape 2: Ajouter une instrumentation minimale pour observer le comportement réel dès la première itération.
  - Étape 3: Écrire des tests de non-régression ciblant le mode nominal et le mode dégradé.
  - Étape 4: Définir un rollback explicite en cas d’effet de bord sur la cadence H01→H23.
  - Étape 5: Ajouter une règle de monitoring qui signale une dérive avant impact utilisateur.

### AP-02 — Handoff Contract-First
- **Problème observé**: Les handoffs libres créent des trous d'information entre rôles.
- **Décision recommandée**: Imposer un schéma de handoff versionné et validé avant acceptation d'un événement de transition.
- **Compromis assumé**: Rigidité initiale plus élevée, mais baisse du rework.
- **Impact pour H03**: Clarifie les informations minimales exigées par rôle.
- **Impact pour H04**: FR de validation de contrat et gestion d'erreurs utilisateur.
- **Impact pour H08**: Schéma JSON/YAML versionné + validateur côté backend.
- **Implémentation concrète (ordre conseillé)**:
  - Étape 1: Documenter le contrat de données et les préconditions de ce pattern.
  - Étape 2: Ajouter une instrumentation minimale pour observer le comportement réel dès la première itération.
  - Étape 3: Écrire des tests de non-régression ciblant le mode nominal et le mode dégradé.
  - Étape 4: Définir un rollback explicite en cas d’effet de bord sur la cadence H01→H23.
  - Étape 5: Ajouter une règle de monitoring qui signale une dérive avant impact utilisateur.

### AP-03 — Artifact Snapshot + Delta Indexing
- **Problème observé**: Reparser tous les documents à chaque changement crée des latences inutiles.
- **Décision recommandée**: Stocker snapshot + hash et reparser seulement les deltas.
- **Compromis assumé**: Complexité de cache supérieure mais performance stable.
- **Impact pour H03**: Renforce le bénéfice “navigation rapide des artefacts”.
- **Impact pour H04**: NFR de fraîcheur des données + SLA de rafraîchissement.
- **Impact pour H08**: Pipeline watch filesystem + queue d'indexation incrémentale.
- **Implémentation concrète (ordre conseillé)**:
  - Étape 1: Documenter le contrat de données et les préconditions de ce pattern.
  - Étape 2: Ajouter une instrumentation minimale pour observer le comportement réel dès la première itération.
  - Étape 3: Écrire des tests de non-régression ciblant le mode nominal et le mode dégradé.
  - Étape 4: Définir un rollback explicite en cas d’effet de bord sur la cadence H01→H23.
  - Étape 5: Ajouter une règle de monitoring qui signale une dérive avant impact utilisateur.

### AP-04 — Dual Gate Engine (Tech + UX)
- **Problème observé**: Les équipes lisent souvent G4-T sans vérifier G4-UX.
- **Décision recommandée**: Modéliser G4 comme agrégat de deux sous-gates bloquants avec règles explicites.
- **Compromis assumé**: UI plus dense à concevoir, mais verdict plus fiable.
- **Impact pour H03**: Positionne la qualité UX comme dimension non négociable.
- **Impact pour H04**: ACs détaillés pour états PASS/CONCERNS/FAIL combinés.
- **Impact pour H08**: Moteur de règles + table de compatibilité des statuts.
- **Implémentation concrète (ordre conseillé)**:
  - Étape 1: Documenter le contrat de données et les préconditions de ce pattern.
  - Étape 2: Ajouter une instrumentation minimale pour observer le comportement réel dès la première itération.
  - Étape 3: Écrire des tests de non-régression ciblant le mode nominal et le mode dégradé.
  - Étape 4: Définir un rollback explicite en cas d’effet de bord sur la cadence H01→H23.
  - Étape 5: Ajouter une règle de monitoring qui signale une dérive avant impact utilisateur.

### AP-05 — Command Broker Zero-Trust
- **Problème observé**: L'exécution directe de scripts ouvre des risques de mauvaise commande ou d'escalade.
- **Décision recommandée**: Interposer un broker qui applique allowlist, rôle, dry-run, journal d'audit et kill-switch.
- **Compromis assumé**: Temps d'intégration initial plus important.
- **Impact pour H03**: Permet d'assumer la promesse “control tower actionnable”.
- **Impact pour H04**: Exigences sécurité et conformité formalisées dès le PRD.
- **Impact pour H08**: Architecture en façade sécurisée + runner isolé.
- **Implémentation concrète (ordre conseillé)**:
  - Étape 1: Documenter le contrat de données et les préconditions de ce pattern.
  - Étape 2: Ajouter une instrumentation minimale pour observer le comportement réel dès la première itération.
  - Étape 3: Écrire des tests de non-régression ciblant le mode nominal et le mode dégradé.
  - Étape 4: Définir un rollback explicite en cas d’effet de bord sur la cadence H01→H23.
  - Étape 5: Ajouter une règle de monitoring qui signale une dérive avant impact utilisateur.

### AP-06 — AQCD Materialized Projections
- **Problème observé**: Le calcul AQCD en temps réel sur historique brut coûte cher et ralentit l'UI.
- **Décision recommandée**: Pré-calculer des vues agrégées par phase, par epic et par période.
- **Compromis assumé**: Nécessite invalidation cohérente des projections.
- **Impact pour H03**: Rend crédible la promesse de pilotage sponsor-friendly.
- **Impact pour H04**: Définit clairement les indicateurs et leurs sources.
- **Impact pour H08**: Service analytics léger + tâches de recomputation.
- **Implémentation concrète (ordre conseillé)**:
  - Étape 1: Documenter le contrat de données et les préconditions de ce pattern.
  - Étape 2: Ajouter une instrumentation minimale pour observer le comportement réel dès la première itération.
  - Étape 3: Écrire des tests de non-régression ciblant le mode nominal et le mode dégradé.
  - Étape 4: Définir un rollback explicite en cas d’effet de bord sur la cadence H01→H23.
  - Étape 5: Ajouter une règle de monitoring qui signale une dérive avant impact utilisateur.

### AP-07 — Role-Centric View Composition
- **Problème observé**: Une vue unique surcharge les profils PM, TEA, UX QA et sponsor.
- **Décision recommandée**: Assembler les écrans à partir de widgets selon rôle et objectif de décision.
- **Compromis assumé**: Gestion de permissions et de presets plus complexe.
- **Impact pour H03**: Permet un angle persona clair dans le product brief.
- **Impact pour H04**: Décline les exigences par rôles et parcours.
- **Impact pour H08**: Moteur de composition UI + policy de visibilité.
- **Implémentation concrète (ordre conseillé)**:
  - Étape 1: Documenter le contrat de données et les préconditions de ce pattern.
  - Étape 2: Ajouter une instrumentation minimale pour observer le comportement réel dès la première itération.
  - Étape 3: Écrire des tests de non-régression ciblant le mode nominal et le mode dégradé.
  - Étape 4: Définir un rollback explicite en cas d’effet de bord sur la cadence H01→H23.
  - Étape 5: Ajouter une règle de monitoring qui signale une dérive avant impact utilisateur.

### AP-08 — Decision Graph with Provenance
- **Problème observé**: Les décisions sont dissociées des preuves et deviennent contestables.
- **Décision recommandée**: Représenter une décision comme nœud relié à artefacts, gates et commandes exécutées.
- **Compromis assumé**: Schéma de graphe plus riche à maintenir.
- **Impact pour H03**: Renforce la valeur “justifier rapidement un arbitrage”.
- **Impact pour H04**: Ajoute exigences sur liens de preuve obligatoires.
- **Impact pour H08**: Store relationnel + table d'edges ou graph layer dédié.
- **Implémentation concrète (ordre conseillé)**:
  - Étape 1: Documenter le contrat de données et les préconditions de ce pattern.
  - Étape 2: Ajouter une instrumentation minimale pour observer le comportement réel dès la première itération.
  - Étape 3: Écrire des tests de non-régression ciblant le mode nominal et le mode dégradé.
  - Étape 4: Définir un rollback explicite en cas d’effet de bord sur la cadence H01→H23.
  - Étape 5: Ajouter une règle de monitoring qui signale une dérive avant impact utilisateur.

### AP-09 — Backpressure-Aware Worker Queue
- **Problème observé**: L'ingestion et les calculs peuvent saturer lorsque plusieurs agents écrivent en parallèle.
- **Décision recommandée**: Utiliser une file avec priorités, retry borné et stratégie de backoff.
- **Compromis assumé**: Complexité opérationnelle plus élevée mais meilleure stabilité.
- **Impact pour H03**: Réduit le risque de latence visible en démo.
- **Impact pour H04**: NFR de disponibilité et de dégradation contrôlée.
- **Impact pour H08**: Queue manager + workers idempotents.
- **Implémentation concrète (ordre conseillé)**:
  - Étape 1: Documenter le contrat de données et les préconditions de ce pattern.
  - Étape 2: Ajouter une instrumentation minimale pour observer le comportement réel dès la première itération.
  - Étape 3: Écrire des tests de non-régression ciblant le mode nominal et le mode dégradé.
  - Étape 4: Définir un rollback explicite en cas d’effet de bord sur la cadence H01→H23.
  - Étape 5: Ajouter une règle de monitoring qui signale une dérive avant impact utilisateur.

### AP-10 — Policy-as-Code pour gates process
- **Problème observé**: Les règles de passage de phase restent implicites ou changent selon les personnes.
- **Décision recommandée**: Formaliser les conditions de passage dans des policies versionnées testables.
- **Compromis assumé**: Nécessite gouvernance des règles et revues régulières.
- **Impact pour H03**: Clarifie le périmètre du “mode gouverné”.
- **Impact pour H04**: FR de configuration + audit des changements de policy.
- **Impact pour H08**: Moteur de règles chargé dynamiquement.
- **Implémentation concrète (ordre conseillé)**:
  - Étape 1: Documenter le contrat de données et les préconditions de ce pattern.
  - Étape 2: Ajouter une instrumentation minimale pour observer le comportement réel dès la première itération.
  - Étape 3: Écrire des tests de non-régression ciblant le mode nominal et le mode dégradé.
  - Étape 4: Définir un rollback explicite en cas d’effet de bord sur la cadence H01→H23.
  - Étape 5: Ajouter une règle de monitoring qui signale une dérive avant impact utilisateur.

### AP-11 — Temporal Baseline & Drift Detection
- **Problème observé**: Sans baseline, on ne détecte pas les dérives de cycle time ou qualité documentaire.
- **Décision recommandée**: Conserver des baselines par phase et alerter sur dérives significatives.
- **Compromis assumé**: Risque de faux positifs sans calibration initiale.
- **Impact pour H03**: Permet de vendre la valeur de pilotage continu.
- **Impact pour H04**: Définition des seuils de dérive et modes d'alerte.
- **Impact pour H08**: Composant d'analyse temporelle + stockage historique.
- **Implémentation concrète (ordre conseillé)**:
  - Étape 1: Documenter le contrat de données et les préconditions de ce pattern.
  - Étape 2: Ajouter une instrumentation minimale pour observer le comportement réel dès la première itération.
  - Étape 3: Écrire des tests de non-régression ciblant le mode nominal et le mode dégradé.
  - Étape 4: Définir un rollback explicite en cas d’effet de bord sur la cadence H01→H23.
  - Étape 5: Ajouter une règle de monitoring qui signale une dérive avant impact utilisateur.

### AP-12 — Evidence Bundle Packaging
- **Problème observé**: Préparer un audit ou une revue nécessite de rassembler manuellement plusieurs preuves.
- **Décision recommandée**: Générer un bundle exportable (md/pdf/json) pour chaque décision clé.
- **Compromis assumé**: Process d'export additionnel à maintenir.
- **Impact pour H03**: Augmente confiance des sponsors et auditors.
- **Impact pour H04**: FR d'export et de sélection des preuves.
- **Impact pour H08**: Service d'assemblage de preuves + templates.
- **Implémentation concrète (ordre conseillé)**:
  - Étape 1: Documenter le contrat de données et les préconditions de ce pattern.
  - Étape 2: Ajouter une instrumentation minimale pour observer le comportement réel dès la première itération.
  - Étape 3: Écrire des tests de non-régression ciblant le mode nominal et le mode dégradé.
  - Étape 4: Définir un rollback explicite en cas d’effet de bord sur la cadence H01→H23.
  - Étape 5: Ajouter une règle de monitoring qui signale une dérive avant impact utilisateur.

### AP-13 — Fail-Safe Read Models
- **Problème observé**: Une erreur d'ingestion peut rendre la vue globale indisponible.
- **Décision recommandée**: Servir la dernière projection valide avec drapeau de fraîcheur dégradée.
- **Compromis assumé**: Risque de lire des données légèrement anciennes.
- **Impact pour H03**: Permet d'assumer la robustesse opérationnelle.
- **Impact pour H04**: NFR de continuité de service en mode dégradé.
- **Impact pour H08**: Gestion explicite de version de projection et fallback.
- **Implémentation concrète (ordre conseillé)**:
  - Étape 1: Documenter le contrat de données et les préconditions de ce pattern.
  - Étape 2: Ajouter une instrumentation minimale pour observer le comportement réel dès la première itération.
  - Étape 3: Écrire des tests de non-régression ciblant le mode nominal et le mode dégradé.
  - Étape 4: Définir un rollback explicite en cas d’effet de bord sur la cadence H01→H23.
  - Étape 5: Ajouter une règle de monitoring qui signale une dérive avant impact utilisateur.

### AP-14 — Context Isolation by Active Project Root
- **Problème observé**: Les erreurs de scope multi-projets entraînent des actions sur le mauvais dossier.
- **Décision recommandée**: Signer chaque événement et commande avec `active_project_root` obligatoire.
- **Compromis assumé**: Friction mineure lors des changements de contexte.
- **Impact pour H03**: Répond au pain point de fiabilité multi-projets.
- **Impact pour H04**: FR de validation de contexte et avertissements UI.
- **Impact pour H08**: Middleware de contexte + validation stricte des chemins.
- **Implémentation concrète (ordre conseillé)**:
  - Étape 1: Documenter le contrat de données et les préconditions de ce pattern.
  - Étape 2: Ajouter une instrumentation minimale pour observer le comportement réel dès la première itération.
  - Étape 3: Écrire des tests de non-régression ciblant le mode nominal et le mode dégradé.
  - Étape 4: Définir un rollback explicite en cas d’effet de bord sur la cadence H01→H23.
  - Étape 5: Ajouter une règle de monitoring qui signale une dérive avant impact utilisateur.

### AP-15 — Readiness Predictor Rule-Based (non ML au départ)
- **Problème observé**: Les blocages de gate sont souvent détectés trop tard.
- **Décision recommandée**: Calculer un score de readiness à base de règles transparentes avant chaque passage.
- **Compromis assumé**: Précision inférieure à un modèle ML mais explicabilité forte.
- **Impact pour H03**: Donne une fonctionnalité différenciante rapidement testable.
- **Impact pour H04**: FR de recommandations contextualisées.
- **Impact pour H08**: Moteur heuristique + scoring explicable.
- **Implémentation concrète (ordre conseillé)**:
  - Étape 1: Documenter le contrat de données et les préconditions de ce pattern.
  - Étape 2: Ajouter une instrumentation minimale pour observer le comportement réel dès la première itération.
  - Étape 3: Écrire des tests de non-régression ciblant le mode nominal et le mode dégradé.
  - Étape 4: Définir un rollback explicite en cas d’effet de bord sur la cadence H01→H23.
  - Étape 5: Ajouter une règle de monitoring qui signale une dérive avant impact utilisateur.

### AP-16 — Command Dry-Run and Diff Preview
- **Problème observé**: Les utilisateurs hésitent à déclencher des scripts sans voir l'impact attendu.
- **Décision recommandée**: Fournir un mode dry-run affichant les fichiers potentiellement modifiés et commandes exactes.
- **Compromis assumé**: Certaines commandes ne sont pas totalement simulables.
- **Impact pour H03**: Améliore la confiance d'adoption en phase initiale.
- **Impact pour H04**: ACs de confirmation explicite avant exécution réelle.
- **Impact pour H08**: Runner dual-mode (simulate/apply) + capture diff.
- **Implémentation concrète (ordre conseillé)**:
  - Étape 1: Documenter le contrat de données et les préconditions de ce pattern.
  - Étape 2: Ajouter une instrumentation minimale pour observer le comportement réel dès la première itération.
  - Étape 3: Écrire des tests de non-régression ciblant le mode nominal et le mode dégradé.
  - Étape 4: Définir un rollback explicite en cas d’effet de bord sur la cadence H01→H23.
  - Étape 5: Ajouter une règle de monitoring qui signale une dérive avant impact utilisateur.

## 5) Patterns d’ingestion et de normalisation des artefacts

### 5.1 Objectif d’ingestion
L’ingestion doit transformer des fichiers hétérogènes en objets cohérents, requêtables et reliés aux décisions de phase.
Le pipeline recommandé est conçu pour des artefacts markdown/yaml et des traces shell issues des scripts BMAD.

### 5.2 Chaîne d’ingestion en 9 étapes
| Étape | Nom | Détail opérationnel | Critère de réussite |
|---|---|---|---|
| IP-01 | Discovery | Scanner `active_project_root` en respectant une allowlist de répertoires BMAD. | 0 fichier hors scope projet importé |
| IP-02 | Fingerprint | Calculer hash + taille + mtime pour détecter les deltas sans reparsing global. | deltas détectés sans faux négatif |
| IP-03 | Classifier | Identifier type artefact (research/prd/ux/arch/story/review/trace) via chemin + signatures internes. | classification > 98% sur corpus connu |
| IP-04 | Parse | Parser frontmatter YAML, sections H2/H3, tables markdown et blocs code utiles. | frontmatter et sections extraits sans perte |
| IP-05 | Validate | Vérifier contraintes minimales: `stepsCompleted`, `inputDocuments`, sections obligatoires selon type. | violations remontées avec message actionnable |
| IP-06 | Normalize | Projeter dans un schéma interne versionné avec champs stables et tags de qualité. | schéma interne valide versionné |
| IP-07 | Link | Créer des liens de provenance entre artefacts, phases, gates, décisions et commandes. | liens provenance traçables en UI |
| IP-08 | Project | Mettre à jour les read-models (pipeline board, gate center, risk radar, AQCD). | read-model rafraîchi < 2s sur delta simple |
| IP-09 | Observe | Émettre métriques ingestion (latence, erreurs, drift de format, staleness). | dashboard observabilité alimenté en continu |

### 5.3 Matrice d’ingestion fichier-par-fichier
| Artefact | Type interne | Parser | Extraits clés | Validations minimales |
|---|---|---|---|---|
| `brainstorming-report.md` | research_h01 | markdown+frontmatter | hypothèses, opportunités, risques, décisions amont | title, phase, stepsCompleted, inputDocuments |
| `competition-benchmark.md` | research_competition | markdown | comparatifs concurrents, écarts, opportunités | segments, sources, score_confiance |
| `implementation-patterns.md` | research_implementation | markdown | patterns techniques, compromis, recommandations | patterns, risques, décisions_h03_h04_h08 |
| `risks-constraints.md` | research_risk | markdown | registre risques et mitigations | risk_id, owner, trigger, mitigation |
| `product-brief.md` | product_brief | markdown+frontmatter | positionnement, scope, KPI | problem, personas, north_star |
| `prd.md` | prd | markdown+frontmatter | FR/NFR/AC | functional_requirements, nfr, acceptance_criteria |
| `ux.md` | ux_spec | markdown+frontmatter | principes UX, états UI, accessibilité | states, a11y_rules, responsive_rules |
| `architecture.md` | architecture | markdown+frontmatter | ADRs, composants, flux | adrs, components, integrations |
| `epics.md` | epic_catalog | markdown | épics et liens story | epic_id, goal, dependencies |
| `epics-index.md` | epic_index | markdown | navigation synthétique des épics | epic_ref, status |
| `implementation-artifacts/sprint-status.yaml` | sprint_status | yaml | état sprint/epic/story | epic_status, story_status, updated_at |
| `implementation-artifacts/stories/Sxxx.md` | story | markdown+checklists | story, AC BDD, tâches, dev notes, preuves | story_id, ac_count, tasks_done |
| `implementation-artifacts/review/*.md` | review | markdown | constats qualité et verdicts | severity, findings, recommendation |
| `execution-trace/Hxx*.md` | execution_trace | markdown/yaml | trace phase/agent/temps/entrée/sortie | phase, agent_id, started_at, finished_at, status |
| `phase notifications logs` | phase_notify | text/structured | accusé de notification P1/P2/P3 | phase_number, notified_at, summary |
| `quality gate outputs` | gate_check | text/json | résultats sequence-guard et ultra-check | check_name, pass_fail, details |
| `aqcd snapshots` | aqcd_snapshot | json/markdown | scores et tendances | A,Q,C,D,period |
| `command execution logs` | command_log | jsonl | commande, arguments, résultat, acteur | command, actor, exit_code, duration_ms |
| `ux evidence captures` | ux_evidence | images+metadata | captures d'états UI + commentaires | story_id, viewport, state, verdict |
| `test reports` | test_report | xml/json/md | résultats unit/int/e2e/coverage | suite, status, pass_rate, coverage |
| `security scans` | security_scan | json/md | vulnérabilités et sévérité | package, severity, fix_version |
| `build artifacts` | build_artifact | metadata | build id, commit, status | build_id, commit, result |

### 5.4 Règles de qualité d’ingestion
- Refuser un document planning majeur sans frontmatter exploitable.
- Tagger `quality_warning` si `stepsCompleted` ou `inputDocuments` est absent.
- Limiter la profondeur de parsing markdown pour éviter les parseurs trop permissifs.
- Enregistrer la version du parser utilisée pour chaque extraction.
- Conserver une copie brute du document source pour audit comparatif.
- Indexer les tableaux comme objets interrogeables (pas seulement texte plein).
- Mesurer la dérive structurelle: variation du nombre de sections vs baseline.
- Déclencher une alerte si un fichier critique passe sous un seuil de profondeur documentaire.
- Empêcher les liens circulaires de décision sans preuve primaire.
- Conserver l’historique de toutes les normalisations pour faciliter le debug.

## 6) Modèle de données et contrats inter-phases H01→H23

### 6.1 Entités du noyau de données
| Entité | Champs clés | Usage principal |
|---|---|---|
| ProjectContext | project_id, active_project_root, mode | Contexte actif et isolation multi-projets. |
| PhaseState | phase_id, status, owner, started_at, finished_at | Suivi d'avancement H01→H23. |
| GateResult | gate_id, verdict, evidence_refs, evaluated_at | Verdict des gates G1→G5. |
| SubGateResult | subgate_id, verdict, details | Détail G4-T et G4-UX. |
| HandoffRecord | from_agent, to_agent, objective, inputs, output | Traçabilité structurée des handoffs. |
| ArtifactRecord | path, type, hash, metadata, extracted_sections | Indexation des artefacts documentaires. |
| DecisionRecord | decision_id, rationale, owner, status | Décisions et justification. |
| EvidenceLink | source_type, source_ref, confidence | Lien preuve↔décision↔gate. |
| CommandExecution | command, actor_role, approved_by, exit_code | Historique exécution commandes. |
| AlertEvent | alert_id, severity, rule, created_at, ack_by | Alerting technique et process. |
| MetricPoint | metric_name, value, dimensions, timestamp | Métriques observabilité et AQCD. |
| RiskItem | risk_id, probability, impact, owner, mitigation | Registre des risques actifs. |
| MitigationTask | task_id, risk_id, action, due_date, status | Suivi de traitement des risques. |
| ReadinessScore | phase_id, score, contributing_factors | Signal prédictif de blocage de phase. |
| UserRolePolicy | role, permissions, constraints | Politique d'accès RBAC. |
| NotificationEvent | phase, summary, sent_at, channel | Traçabilité des phase-notify. |
| StoryQualitySnapshot | story_id, tech_score, ux_score, status | Vue qualité story-level. |
| RetroAction | epic_id, action, owner, due, closure_evidence | Actions H21/H22/H23. |
| AQCDSnapshot | period, autonomy, quality, cost, design | Mesure consolidée AQCD. |
| ParserVersion | parser_name, version, compatibility_flags | Gestion évolutive des parseurs. |

### 6.2 Contrat minimal d’un handoff (proposition)
```yaml
handoff:
  from_agent: "bmad-analyst"
  to_agent: "bmad-pm"
  phase: "H02->H03"
  objective: "Transformer recherche en product brief actionnable"
  constraints:
    - "Conserver traçabilité des hypothèses critiques"
    - "Ne pas diluer les risques de sécurité commande"
  inputs:
    - "_bmad-output/planning-artifacts/research/implementation-patterns.md"
    - "_bmad-output/planning-artifacts/research/brainstorming-report.md"
  required_output_schema: "product-brief-template-v2"
  done_definition_local: "brief validé + hypothèses priorisées + KPI"
  deadline_or_timeout: "48h"
  escalation_rule: "si ambiguïté critique architecture => consulter architecte"
  design_requirements: "G4-UX doit rester un gate bloquant"
  ux_verification_required: true
```

### 6.3 Projection machine d’état H01→H23
| Phase | Fonction | Sortie attendue | Gate associé | Règle d’avancement |
|---|---|---|---|---|
| H01 | Brainstorming | Hypothèses testables et options produit | G1 | Passage autorisé si G1 != FAIL et preuves liées présentes. |
| H02 | Research | Recherche marché/tech/risques détaillée | G1 | Passage autorisé si G1 != FAIL et preuves liées présentes. |
| H03 | Product Brief | Brief actionnable PM | G1 | Passage autorisé si G1 != FAIL et preuves liées présentes. |
| H04 | PRD | PRD structuré et testable | G2 | Passage autorisé si G2 != FAIL et preuves liées présentes. |
| H05 | UX Specification | Spécification UX et standards | G2 | Passage autorisé si G2 != FAIL et preuves liées présentes. |
| H06 | UX Constraints Handoff | Contraintes UX exploitables | G2 | Passage autorisé si G2 != FAIL et preuves liées présentes. |
| H07 | Planning Completeness | Validation complétude planning | G2 | Passage autorisé si G2 != FAIL et preuves liées présentes. |
| H08 | Architecture | Architecture cible + ADR | G3 | Passage autorisé si G3 != FAIL et preuves liées présentes. |
| H09 | Epics & Stories Backbone | Epics et index de stories | G3 | Passage autorisé si G3 != FAIL et preuves liées présentes. |
| H10 | Readiness Check | Verdict PASS/CONCERNS/FAIL | G3 | Passage autorisé si G3 != FAIL et preuves liées présentes. |
| H11 | Sprint Initialization | sprint-status.yaml initial | G4 préparation | Passage autorisé si G4 préparation != FAIL et preuves liées présentes. |
| H12 | Next Story Creation | story Sxxx prête | G4 préparation | Passage autorisé si G4 préparation != FAIL et preuves liées présentes. |
| H13 | Story Pack Transfer | Pack complet vers DEV | G4 préparation | Passage autorisé si G4 préparation != FAIL et preuves liées présentes. |
| H14 | UX QA Evidence | Preuves UX/UI et états | G4-UX | Passage story-level autorisé uniquement si G4-T ET G4-UX satisfaits. |
| H15 | UX Verdict | PASS/CONCERNS/FAIL UX | G4-UX | Passage story-level autorisé uniquement si G4-T ET G4-UX satisfaits. |
| H16 | Technical QA Evidence | Tests et preuves techniques | G4-T | Passage story-level autorisé uniquement si G4-T ET G4-UX satisfaits. |
| H17 | TEA Quality Status | Statut qualité consolidé | G4-T | Passage story-level autorisé uniquement si G4-T ET G4-UX satisfaits. |
| H18 | Senior Review | approve/changes/blocked | G4 global | Passage story-level autorisé uniquement si G4-T ET G4-UX satisfaits. |
| H19 | Story Status Update | mise à jour et story suivante | G4 global | Passage story-level autorisé uniquement si G4-T ET G4-UX satisfaits. |
| H20 | Epic Candidate Complete | epic candidate done | G5 préparation | Passage autorisé si G5 préparation != FAIL et preuves liées présentes. |
| H21 | Epic Retrospective | rétro élargie tech+design | G5 | Passage epic-level autorisé après validation des actions de rétro. |
| H22 | Adaptation Plan | actions pour epic suivant | G5 | Passage epic-level autorisé après validation des actions de rétro. |
| H23 | Next Epic Activation | activation système sprint suivant | G5 | Passage epic-level autorisé après validation des actions de rétro. |

## 7) Observabilité end-to-end (technique + process)

### 7.1 Principes d’observabilité
- Observer à la fois le système logiciel et la qualité du processus BMAD.
- Corréler chaque alerte à une action corrective explicite.
- Conserver des traces compréhensibles par des rôles non purement techniques.
- Utiliser un identifiant de corrélation unique par run critique.
- Distinguer signal opérationnel (bloquant) et signal analytique (tendance).

### 7.2 Catalogue des métriques prioritaires
| Metric | Définition | Dimensions | Seuil cible |
|---|---|---|---|
| `m_phase_transition_latency_ms` | latence entre deux phases successives | phase_from, phase_to | < 30000 en médiane |
| `m_gate_fail_rate` | taux de FAIL par gate | gate_id, project | < 10% hors incidents exceptionnels |
| `m_gate_concerns_resolution_time` | temps de résolution CONCERNS | gate_id | < 24h pour planning |
| `m_handoff_rework_ratio` | retours arrière handoff | from_agent, to_agent | < 15% |
| `m_artifact_parse_error_rate` | erreurs parsing artefacts | artifact_type | < 2% |
| `m_artifact_staleness_seconds` | âge des read-models | view_name | < 120s en mode nominal |
| `m_command_success_rate` | succès commandes exécutées | command_family | > 95% |
| `m_command_denied_rate` | commandes refusées policy | role | surveiller pics anormaux |
| `m_dry_run_to_apply_ratio` | ratio simulation/exécution réelle | role | stabilité > 0.6 en onboarding |
| `m_notification_phase_delay` | délai phase complete -> notify | phase | < 5 min |
| `m_ux_gate_block_count` | stories bloquées par G4-UX | epic | suivi tendance, pas minimisation absolue |
| `m_ux_rework_after_done` | rework UX après DONE | story | tendre vers 0 |
| `m_test_flakiness` | instabilité des suites test | suite | < 3% |
| `m_coverage_useful` | couverture utile sur chemins critiques | module | > 80% selon criticité |
| `m_security_high_findings` | vulnérabilités high ouvertes | component | 0 en release candidate |
| `m_aqcd_autonomy` | score autonomie | period | >= 70 en phase stable |
| `m_aqcd_quality` | score qualité technique | period | >= 80 cible |
| `m_aqcd_cost` | score efficience coût | period | >= 70 sans dégrader qualité |
| `m_aqcd_design` | score excellence design | period | >= 80 obligatoire DONE |
| `m_readiness_score` | score prédictif de blocage | phase | alerte si < 65 |
| `m_index_queue_depth` | profondeur file ingestion | queue | < seuil dynamique |
| `m_index_worker_retry` | retries workers ingestion | worker | pic = signal de format drift |
| `m_projection_rebuild_time` | temps de rebuild projection | projection | < 60s |
| `m_user_action_to_decision_time` | temps action->décision | persona | réduction continue |
| `m_search_zero_result_rate` | recherches sans résultat utile | persona | < 20% |
| `m_context_switch_error` | erreurs de projet actif | project | 0 toléré en commande destructive |
| `m_policy_override_count` | overrides manuels policy | role | strictement justifiés |
| `m_bundle_export_success` | succès export preuve | format | > 98% |
| `m_bundle_generation_time` | temps génération bundle | format | < 10s médiane |
| `m_incident_mtta` | mean time to acknowledge | severity | < 10 min pour critique |

### 7.3 Politique d’alertes
| Alerte | Sévérité | Déclencheur | Réponse attendue |
|---|---|---|---|
| AL-01 | Critique | Notification de phase manquante > 30 min après clôture | Bloquer transition phase + notifier orchestrateur |
| AL-02 | Critique | Commande hors allowlist tentée | Refus immédiat + audit + revue sécurité |
| AL-03 | Élevée | G4-T PASS mais G4-UX FAIL sur story candidate DONE | Empêcher DONE et ouvrir tâche corrective UX |
| AL-04 | Élevée | Parse error rate > 5% sur artefacts critiques | Basculer parser mode sûr + escalade architecte |
| AL-05 | Élevée | Readiness score < 60 avant gate | Afficher recommandations de mitigation avant passage |
| AL-06 | Moyenne | Queue ingestion > seuil pendant 10 min | Activer backpressure et réduire jobs secondaires |
| AL-07 | Moyenne | Dérive AQCD qualité < 65 sur 2 cycles | Déclencher kill-switch autonomie partielle |
| AL-08 | Moyenne | Taux de recherches sans résultat > 30% | Revoir indexation et taxonomie artefacts |
| AL-09 | Moyenne | Overload notifications utilisateur | Activer throttling par rôle |
| AL-10 | Basse | Bundle export time > seuil | Optimiser templates et caching |

## 8) Sécurité de l’exécution de commandes et gouvernance d’accès

### 8.1 Menaces prioritaires
| Menace | Description | Niveau | Mitigation structurelle |
|---|---|---|---|
| T-01 | Commande destructive lancée sur mauvais projet | Élevée | Validation active_project_root + confirmation forte |
| T-02 | Injection argument shell dans commandes dynamiques | Élevée | Arguments structurés, pas de concaténation libre |
| T-03 | Escalade de privilèges via rôle mal configuré | Élevée | RBAC strict + revues périodiques de policy |
| T-04 | Exécution répétée non idempotente | Moyenne | Idempotency keys + verrou transactionnel |
| T-05 | Journal d’audit modifiable | Élevée | Stockage append-only signé |
| T-06 | Contournement mode dry-run | Moyenne | Séparation explicite simulate/apply + traces distinctes |
| T-07 | Fuite de secrets dans logs | Élevée | Redaction automatique + scans post-run |
| T-08 | Replay d’une commande ancienne | Moyenne | Nonce/expiration et scope de validité |
| T-09 | Exécution hors plage de maintenance | Moyenne | Fenêtres temporelles policy-as-code |
| T-10 | Suppression non autorisée d’artefacts critiques | Élevée | Interdire delete hors rôle admin + double validation |
| T-11 | Cross-project access involontaire | Élevée | Isolation stricte par racine projet signée |
| T-12 | Bypass des gates via commande ad hoc | Élevée | Commandes officielles wrappers uniquement |
| T-13 | DoS via flood de jobs ingestion | Moyenne | Rate limit + backpressure queue |
| T-14 | Policy drift silencieuse | Moyenne | Versioning policy + diff review obligatoire |
| T-15 | Commande ambiguë sans aperçu impact | Moyenne | Prévisualisation des impacts et fichiers touchés |
| T-16 | Exfiltration d’artefacts sensibles export bundle | Moyenne | Contrôle de périmètre export + watermark |
| T-17 | Erreurs humaines lors de copier/coller terminal | Moyenne | Templates de commande et validations interactives |
| T-18 | Non-révocation d’accès après changement de rôle | Élevée | Synchronisation IAM et revocation immédiate |
| T-19 | Absence de preuve de consentement opérationnel | Faible | Journal approval_by + timestamp |
| T-20 | Dépendance excessive à un opérateur super-admin | Moyenne | Segregation of duties + break-glass contrôlé |

### 8.2 Matrice RBAC recommandée
| Capability | Orchestrateur | PM | Architecte | SM | DEV | TEA | UX QA | Sponsor | Admin Sécurité |
|---|---|---|---|---|---|---|---|---|---|
| Lire artefacts et traces | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Déclencher scripts lecture seule | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | — | ✅ |
| Déclencher scripts d’écriture projet | ✅ | — | — | ✅ | ✅ | — | — | — | ✅ |
| Valider override policy | ✅ | — | — | — | — | — | — | — | ✅ |
| Modifier allowlist commandes | — | — | — | — | — | — | — | — | ✅ |
| Fermer une alerte critique | ✅ | — | — | — | — | — | — | — | ✅ |
| Publier phase-notify | ✅ | ✅ | — | ✅ | — | — | — | — | — |
| Exporter bundles audit | ✅ | ✅ | — | — | — | ✅ | ✅ | — | ✅ |
| Modifier mappings ingestion | — | — | ✅ | — | — | — | — | — | ✅ |
| Changer projet actif global | ✅ | — | — | — | — | — | — | — | ✅ |

### 8.3 Allowlist de commandes (exemple V1)
| Commande | Famille | Risque | Contrôle d’accès |
|---|---|---|---|
| `openclaw gateway status` | read-only | Faible | Tous rôles lecture |
| `openclaw gateway start` | state-change | Élevé | Orchestrateur/Admin seulement |
| `openclaw gateway stop` | state-change | Élevé | Orchestrateur/Admin seulement |
| `openclaw gateway restart` | state-change | Élevé | Orchestrateur/Admin seulement |
| `bash scripts/runtime-healthcheck.sh` | read-only | Faible | Rôles opérationnels |
| `bash scripts/progress.sh` | read-only | Faible | Rôles opérationnels |
| `bash scripts/new-phase-trace.sh ...` | write-audit | Moyen | Orchestrateur/PM/SM |
| `bash scripts/phase13-sequence-guard.sh ...` | quality-check | Moyen | PM/TEA/Orchestrateur |
| `bash scripts/phase13-ultra-quality-check.sh ...` | quality-check | Moyen | PM/TEA/Orchestrateur |
| `bash scripts/phase-complete.sh ...` | state-change | Élevé | Orchestrateur |
| `bash scripts/phase-notify.sh ...` | state-change | Moyen | Orchestrateur/PM/SM |
| `bash scripts/run-quality-gates.sh` | quality-check | Moyen | TEA/Orchestrateur |
| `bash scripts/run-ux-gates.sh <SID>` | quality-check | Moyen | UX QA/TEA |
| `bash scripts/run-story-gates.sh <SID>` | quality-check | Moyen | TEA/Orchestrateur |
| `bash scripts/story-done-guard.sh <SID>` | state-check | Moyen | TEA/Orchestrateur |

### 8.4 Contrôles obligatoires avant exécution réelle
- Validation syntaxique de la commande contre un template connu.
- Validation de contexte `active_project_root` avec affichage explicite à l'utilisateur.
- Vérification des permissions RBAC et des contraintes temporelles.
- Prévisualisation des fichiers potentiellement affectés (dry-run si disponible).
- Confirmation explicite pour commandes à impact élevé.
- Journalisation signée de la demande, de l'approbation et du résultat.
- Publication d'un événement `command_execution_completed` corrélé à la phase.

## 9) Projection produit du pipeline H01→H23

### 9.1 Table de projection phase → capacité dashboard
| Phase | Question décisionnelle couverte par le dashboard | Widget principal | Données minimales |
|---|---|---|---|
| H01 | Les hypothèses sont-elles formulées et priorisées pour recherche ? | Hypothesis Board | Hypothèses testables et options produit; gate G1; liens de preuves |
| H02 | La recherche technique couvre-t-elle architecture, risques et concurrence ? | Research Coverage Matrix | Recherche marché/tech/risques détaillée; gate G1; liens de preuves |
| H03 | Le brief traduit-il les hypothèses en scope et KPI ? | Brief Readiness Panel | Brief actionnable PM; gate G1; liens de preuves |
| H04 | Le PRD est-il testable et sans ambiguïtés critiques ? | PRD Quality Lens | PRD structuré et testable; gate G2; liens de preuves |
| H05 | Les contraintes UX sont-elles explicites et mesurables ? | UX Standards Board | Spécification UX et standards; gate G2; liens de preuves |
| H06 | Les règles UX sont-elles prêtes pour architecte et dev ? | UX Constraint Handoff | Contraintes UX exploitables; gate G2; liens de preuves |
| H07 | La complétude planning est-elle suffisante pour solutioning ? | Planning Completeness Gate | Validation complétude planning; gate G2; liens de preuves |
| H08 | L’architecture répond-elle aux FR/NFR et aux risques ? | Architecture Decision Hub | Architecture cible + ADR; gate G3; liens de preuves |
| H09 | Les epics et stories couvrent-ils le scope sans trous ? | Epic Coverage Map | Epics et index de stories; gate G3; liens de preuves |
| H10 | Le projet est-il réellement prêt pour implementation ? | Implementation Readiness Score | Verdict PASS/CONCERNS/FAIL; gate G3; liens de preuves |
| H11 | Le sprint est-il initialisé avec statut fiable ? | Sprint Bootstrap Card | sprint-status.yaml initial; gate G4 préparation; liens de preuves |
| H12 | La prochaine story est-elle prête et claire ? | Story Readiness Card | story Sxxx prête; gate G4 préparation; liens de preuves |
| H13 | Le pack story est-il complet pour DEV ? | Story Pack Checklist | Pack complet vers DEV; gate G4 préparation; liens de preuves |
| H14 | Les preuves UX/UI sont-elles complètes ? | UX Evidence Lens | Preuves UX/UI et états; gate G4-UX; liens de preuves |
| H15 | Le verdict UX permet-il progression ou correction ? | UX Verdict Tracker | PASS/CONCERNS/FAIL UX; gate G4-UX; liens de preuves |
| H16 | Les preuves techniques sont-elles suffisantes ? | Technical Evidence Lens | Tests et preuves techniques; gate G4-T; liens de preuves |
| H17 | Le statut TEA confirme-t-il la qualité ? | TEA Quality Card | Statut qualité consolidé; gate G4-T; liens de preuves |
| H18 | La revue senior confirme-t-elle l’acceptabilité ? | Review Decision Card | approve/changes/blocked; gate G4 global; liens de preuves |
| H19 | Le statut story est-il correctement mis à jour ? | Story Status Timeline | mise à jour et story suivante; gate G4 global; liens de preuves |
| H20 | L’epic est-il candidat crédible à clôture ? | Epic Candidate Panel | epic candidate done; gate G5 préparation; liens de preuves |
| H21 | La rétro epic couvre-t-elle technique et design ? | Retro Action Board | rétro élargie tech+design; gate G5; liens de preuves |
| H22 | Les actions de rétro sont-elles planifiées ? | Adaptation Planner | actions pour epic suivant; gate G5; liens de preuves |
| H23 | L’epic suivant peut-il démarrer sans dette critique ? | Next Epic Launcher | activation système sprint suivant; gate G5; liens de preuves |

### 9.2 Détail phase par phase (usage concret)
#### H01 — Brainstorming
- **Sortie cible**: `Hypothèses testables et options produit`
- **Gate de référence**: G1
- **Vue dashboard recommandée**: Les hypothèses sont-elles formulées et priorisées pour recherche ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: préserver la qualité de recherche et éviter les synthèses trop courtes non exploitables.

#### H02 — Research
- **Sortie cible**: `Recherche marché/tech/risques détaillée`
- **Gate de référence**: G1
- **Vue dashboard recommandée**: La recherche technique couvre-t-elle architecture, risques et concurrence ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: préserver la qualité de recherche et éviter les synthèses trop courtes non exploitables.

#### H03 — Product Brief
- **Sortie cible**: `Brief actionnable PM`
- **Gate de référence**: G1
- **Vue dashboard recommandée**: Le brief traduit-il les hypothèses en scope et KPI ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: préserver la qualité de recherche et éviter les synthèses trop courtes non exploitables.

#### H04 — PRD
- **Sortie cible**: `PRD structuré et testable`
- **Gate de référence**: G2
- **Vue dashboard recommandée**: Le PRD est-il testable et sans ambiguïtés critiques ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: éviter les ambiguïtés qui se traduiront en rework coûteux en H08/H09.

#### H05 — UX Specification
- **Sortie cible**: `Spécification UX et standards`
- **Gate de référence**: G2
- **Vue dashboard recommandée**: Les contraintes UX sont-elles explicites et mesurables ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: éviter les ambiguïtés qui se traduiront en rework coûteux en H08/H09.

#### H06 — UX Constraints Handoff
- **Sortie cible**: `Contraintes UX exploitables`
- **Gate de référence**: G2
- **Vue dashboard recommandée**: Les règles UX sont-elles prêtes pour architecte et dev ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: éviter les ambiguïtés qui se traduiront en rework coûteux en H08/H09.

#### H07 — Planning Completeness
- **Sortie cible**: `Validation complétude planning`
- **Gate de référence**: G2
- **Vue dashboard recommandée**: La complétude planning est-elle suffisante pour solutioning ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: éviter les ambiguïtés qui se traduiront en rework coûteux en H08/H09.

#### H08 — Architecture
- **Sortie cible**: `Architecture cible + ADR`
- **Gate de référence**: G3
- **Vue dashboard recommandée**: L’architecture répond-elle aux FR/NFR et aux risques ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: vérifier alignement architecture ↔ contraintes UX ↔ epics avant de lancer implémentation.

#### H09 — Epics & Stories Backbone
- **Sortie cible**: `Epics et index de stories`
- **Gate de référence**: G3
- **Vue dashboard recommandée**: Les epics et stories couvrent-ils le scope sans trous ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: vérifier alignement architecture ↔ contraintes UX ↔ epics avant de lancer implémentation.

#### H10 — Readiness Check
- **Sortie cible**: `Verdict PASS/CONCERNS/FAIL`
- **Gate de référence**: G3
- **Vue dashboard recommandée**: Le projet est-il réellement prêt pour implementation ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: vérifier alignement architecture ↔ contraintes UX ↔ epics avant de lancer implémentation.

#### H11 — Sprint Initialization
- **Sortie cible**: `sprint-status.yaml initial`
- **Gate de référence**: G4 préparation
- **Vue dashboard recommandée**: Le sprint est-il initialisé avec statut fiable ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: conserver le double regard qualité technique + qualité UX à chaque story.

#### H12 — Next Story Creation
- **Sortie cible**: `story Sxxx prête`
- **Gate de référence**: G4 préparation
- **Vue dashboard recommandée**: La prochaine story est-elle prête et claire ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: conserver le double regard qualité technique + qualité UX à chaque story.

#### H13 — Story Pack Transfer
- **Sortie cible**: `Pack complet vers DEV`
- **Gate de référence**: G4 préparation
- **Vue dashboard recommandée**: Le pack story est-il complet pour DEV ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: conserver le double regard qualité technique + qualité UX à chaque story.

#### H14 — UX QA Evidence
- **Sortie cible**: `Preuves UX/UI et états`
- **Gate de référence**: G4-UX
- **Vue dashboard recommandée**: Les preuves UX/UI sont-elles complètes ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: conserver le double regard qualité technique + qualité UX à chaque story.

#### H15 — UX Verdict
- **Sortie cible**: `PASS/CONCERNS/FAIL UX`
- **Gate de référence**: G4-UX
- **Vue dashboard recommandée**: Le verdict UX permet-il progression ou correction ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: conserver le double regard qualité technique + qualité UX à chaque story.

#### H16 — Technical QA Evidence
- **Sortie cible**: `Tests et preuves techniques`
- **Gate de référence**: G4-T
- **Vue dashboard recommandée**: Les preuves techniques sont-elles suffisantes ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: conserver le double regard qualité technique + qualité UX à chaque story.

#### H17 — TEA Quality Status
- **Sortie cible**: `Statut qualité consolidé`
- **Gate de référence**: G4-T
- **Vue dashboard recommandée**: Le statut TEA confirme-t-il la qualité ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: conserver le double regard qualité technique + qualité UX à chaque story.

#### H18 — Senior Review
- **Sortie cible**: `approve/changes/blocked`
- **Gate de référence**: G4 global
- **Vue dashboard recommandée**: La revue senior confirme-t-elle l’acceptabilité ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: conserver le double regard qualité technique + qualité UX à chaque story.

#### H19 — Story Status Update
- **Sortie cible**: `mise à jour et story suivante`
- **Gate de référence**: G4 global
- **Vue dashboard recommandée**: Le statut story est-il correctement mis à jour ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: conserver le double regard qualité technique + qualité UX à chaque story.

#### H20 — Epic Candidate Complete
- **Sortie cible**: `epic candidate done`
- **Gate de référence**: G5 préparation
- **Vue dashboard recommandée**: L’epic est-il candidat crédible à clôture ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: conserver le double regard qualité technique + qualité UX à chaque story.

#### H21 — Epic Retrospective
- **Sortie cible**: `rétro élargie tech+design`
- **Gate de référence**: G5
- **Vue dashboard recommandée**: La rétro epic couvre-t-elle technique et design ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: conserver le double regard qualité technique + qualité UX à chaque story.

#### H22 — Adaptation Plan
- **Sortie cible**: `actions pour epic suivant`
- **Gate de référence**: G5
- **Vue dashboard recommandée**: Les actions de rétro sont-elles planifiées ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: conserver le double regard qualité technique + qualité UX à chaque story.

#### H23 — Next Epic Activation
- **Sortie cible**: `activation système sprint suivant`
- **Gate de référence**: G5
- **Vue dashboard recommandée**: L’epic suivant peut-il démarrer sans dette critique ?
- **Règle d’implémentation**: l’UI doit afficher au moins une action corrective quand le statut est CONCERNS ou FAIL.
- **Point de vigilance**: conserver le double regard qualité technique + qualité UX à chaque story.

## 10) Stratégie de testabilité (produit, data, process, sécurité)

### 10.1 Principes
- Tester les contrats de données au même niveau de priorité que les endpoints applicatifs.
- Tester les règles de gate comme du code métier critique.
- Inclure des tests UX workflow-level (pas seulement snapshot visuel).
- Ajouter des tests de sécurité d’exécution de commandes (deny-by-default).
- Automatiser des tests de non-régression documentaire (frontmatter, sections, tableaux, sources).

### 10.2 Matrice de tests recommandée
| ID | Niveau | Cible | Objectif | Fréquence |
|---|---|---|---|---|
| TS-01 | Unit | Parser frontmatter | détecter metadata absente ou invalide | chaque commit parser |
| TS-02 | Unit | Extractor sections H2/H3 | conserver hiérarchie markdown | chaque commit parser |
| TS-03 | Unit | Hasher delta | détecter modifications exactes | chaque commit parser |
| TS-04 | Unit | Rule engine gate | évaluer PASS/CONCERNS/FAIL | chaque commit règles |
| TS-05 | Unit | RBAC evaluator | autoriser/refuser actions par rôle | chaque commit sécurité |
| TS-06 | Unit | Command allowlist matcher | bloquer commandes non prévues | chaque commit sécurité |
| TS-07 | Integration | Ingestion markdown→store | chaîne complète sans perte | nightly + PR critique |
| TS-08 | Integration | Ingestion yaml sprint-status | mapping correct des états story | nightly |
| TS-09 | Integration | Event ledger append | immutabilité et ordre temporel | nightly |
| TS-10 | Integration | Projection pipeline board | cohérence phase courante | nightly |
| TS-11 | Integration | Projection gate center | cohérence G4 dual | nightly |
| TS-12 | Integration | AQCD projection | formules et dimensions conformes | nightly |
| TS-13 | Contract | Handoff schema v1 | validation des champs requis | PR + nightly |
| TS-14 | Contract | Execution trace schema | phase/agent/status horodatés | PR + nightly |
| TS-15 | Contract | Decision record schema | liens de preuve obligatoires | PR + nightly |
| TS-16 | E2E | H02->H03 parcours | brief prêt avec preuves liées | release candidate |
| TS-17 | E2E | H04->H08 préparation | architecture inputs complets | release candidate |
| TS-18 | E2E | Story G4 double gate | DONE refusé si G4-UX FAIL | release candidate |
| TS-19 | E2E | Phase notify discipline | blocage progression si notify absent | release candidate |
| TS-20 | E2E | Command dry-run/apply | confirmation + audit cohérents | release candidate |
| TS-21 | Security | Injection shell arguments | refus systématique payload dangereux | PR sécurité |
| TS-22 | Security | Privilege escalation simulation | aucune escalade non autorisée | PR sécurité |
| TS-23 | Security | Cross-project boundary | impossibilité d’action hors root | nightly sécurité |
| TS-24 | Security | Audit log tampering | modification détectée/empêchée | nightly sécurité |
| TS-25 | Performance | Indexation delta 1 fichier | rafraîchissement <2s | nightly perf |
| TS-26 | Performance | Rebuild projection bulk | <60s sur corpus baseline | nightly perf |
| TS-27 | Performance | Concurrent workers stress | pas de perte d’événements | hebdo |
| TS-28 | UX QA | Lisibilité gate center | décision correcte en <90s | avant release |
| TS-29 | UX QA | A11y navigation clavier | WCAG AA sur vues critiques | avant release |
| TS-30 | UX QA | États loading/empty/error | cohérence sur widgets clés | avant release |
| TS-31 | Data quality | Détection docs incomplets | alertes pertinentes sans bruit | nightly |
| TS-32 | Data quality | Dérive structure documentaire | signal drift fiable | nightly |
| TS-33 | Resilience | Mode dégradé read-model | fallback dernière vue valide | hebdo |
| TS-34 | Resilience | Queue backlog recovery | retour nominal sans intervention | hebdo |
| TS-35 | Resilience | Rollback parser version | aucune perte de données | hebdo |

### 10.3 Exigences de preuve par gate
| Gate | Preuve minimale | Vérification automatisable |
|---|---|---|
| G1 | Hypothèses testables + risques majeurs + sources | links vers research/*.md + validation metadata |
| G2 | PRD actionnable + AC vérifiables + règles UX explicites | prd.md/ux.md + check ambiguïtés critiques |
| G3 | Cohérence PRD/UX/architecture/epics | architecture.md + epics coverage map + risques résiduels |
| G4-T | Lint/typecheck/tests/coverage/security/build + review | rapports CI + review artefacts |
| G4-UX | Design-system + accessibilité + responsive + états UI | preuves UX QA + captures + verdict |
| G5 | Rétro validée + actions concrètes planifiées | retro docs + tasks closure evidence |

## 11) Performance, scalabilité et résilience

### 11.1 Objectifs de service (SLO)
| SLO | Description | Cible | Mesure |
|---|---|---|---|
| SLO-01 | Latence chargement Pipeline Board | p95 < 2.0s | instrumentation front + backend |
| SLO-02 | Latence chargement Gate Center | p95 < 2.5s | trace requêtes agrégées |
| SLO-03 | Rafraîchissement après update artefact | p95 < 5s | event timestamp diff |
| SLO-04 | Disponibilité read-model principal | > 99.5% | health checks + synthetic tests |
| SLO-05 | Succès exécution commandes autorisées | > 95% | audit command logs |
| SLO-06 | Taux erreurs parsing critiques | < 2% | ingestion metrics |
| SLO-07 | Temps génération bundle preuve | p95 < 10s | export service metrics |
| SLO-08 | Temps reconnaissance alerte critique | MTTA < 10 min | alert lifecycle data |
| SLO-09 | Temps résolution concerns planning | p75 < 24h | phase event tracking |
| SLO-10 | Perte d’événement ingestion | 0 toléré | ledger sequence continuity |
| SLO-11 | Cross-project command error | 0 toléré | policy violation reports |
| SLO-12 | Stabilité tests critiques | flakiness < 3% | test analytics |

### 11.2 Stratégies de résilience recommandées
- Déployer les projections read-side avec version active + version standby pour rollback rapide.
- Séparer les workers ingestion critiques des jobs analytiques non bloquants.
- Utiliser une stratégie de circuit breaker pour les services externes non essentiels.
- Conserver une file de retry bornée avec dead-letter queue analysable.
- Appliquer un mode “stale but available” sur vues non critiques pendant incident parser.
- Tester régulièrement des scénarios de panne partielle (chaos léger) sur environnement de staging.

### 11.3 Plan de capacity planning initial
| ID | Axe | Hypothèse initiale | Action de validation |
|---|---|---|---|
| CP-01 | Corpus documentaire | 500 fichiers markdown actifs par projet | valider performances parse/index |
| CP-02 | Événements journaliers | 10k events/jour | dimensionner event ledger et projections |
| CP-03 | Concurrence utilisateurs | 20 utilisateurs simultanés | garantir lisibilité cockpit en équipe |
| CP-04 | Concurrence workers | 8 workers ingestion | éviter saturation I/O |
| CP-05 | Burst commandes | 50 commandes/heure | observer queue command broker |
| CP-06 | Exports bundles | 100 exports/jour | dimensionner service export |

## 12) Risques techniques prioritaires et mitigations concrètes

### 12.1 Registre de risques techniques
| ID | Risque | Probabilité | Impact | Mitigation concrète |
|---|---|---|---|---|
| R-01 | Dérive de format markdown entre équipes | Moyenne | Élevé | Écrire parseurs tolérants + validations strictes + versioning schéma. |
| R-02 | Absence de métadonnées obligatoires dans documents clés | Élevée | Élevé | Refus ingestion critique + alerte + guide correction. |
| R-03 | Surcharge ingestion lors de batch updates | Moyenne | Moyen | Backpressure + priorités + découpage des jobs. |
| R-04 | Latence excessive sur vues agrégées | Moyenne | Élevé | Projections matérialisées + cache invalidation contrôlée. |
| R-05 | Faux positifs readiness predictor | Moyenne | Moyen | Calibration sur historique + explications transparentes. |
| R-06 | Faux DONE si G4-UX mal relié | Moyenne | Élevé | Règle bloquante explicite dans gate engine + tests e2e. |
| R-07 | Permissions trop larges en phase MVP | Moyenne | Élevé | RBAC minimal + revue hebdo des droits. |
| R-08 | Exécution commande sur mauvais projet | Faible | Critique | Contexte projet signé + confirmation contextualisée. |
| R-09 | Logs contenant données sensibles | Moyenne | Élevé | Redaction patterns + scanners secrets post-run. |
| R-10 | Baisse adoption à cause complexité UI | Moyenne | Moyen | Vues par rôle + progressive disclosure. |
| R-11 | Dépendance trop forte aux scripts existants | Moyenne | Moyen | Adapter via command adapters versionnés. |
| R-12 | Échec de corrélation artefact↔décision | Moyenne | Élevé | Obliger evidence links pour décisions critiques. |
| R-13 | Flakiness tests de gates | Moyenne | Moyen | Stabiliser fixtures et isoler dépendances externes. |
| R-14 | Absence de baseline AQCD fiable | Élevée | Moyen | Collecte initiale contrôlée avant usage décisionnel fort. |
| R-15 | Fatigue d’alertes (alert storm) | Élevée | Moyen | Throttling + priorisation + grouping contextuel. |
| R-16 | Backlog de dette UX non visible | Moyenne | Élevé | Créer vue “UX debt lane” connectée à G4-UX. |
| R-17 | Non-respect des phase-notify | Moyenne | Moyen | Blocage automatisé transitions sans notification. |
| R-18 | Incohérence terminologique BMAD | Moyenne | Moyen | Glossaire central + lint terminologique docs. |
| R-19 | Perte de performance due aux exports massifs | Faible | Moyen | File dédiée exports + quotas par rôle. |
| R-20 | Contournement du broker via shell direct | Faible | Élevé | Limiter surfaces d’exécution + audit des bypass. |
| R-21 | Erreur humaine de configuration policy | Moyenne | Élevé | Policy review pair + tests policy-as-code. |
| R-22 | Absence d’owner pour risque critique | Moyenne | Élevé | Aucune entrée risque sans owner assigné. |
| R-23 | Échec migration parser version | Faible | Moyen | Canary parser + rollback versionné. |
| R-24 | Data race sur updates concurrentes | Moyenne | Moyen | Transactions idempotentes et verrouillage logique. |
| R-25 | Rupture compatibilité front/back data contract | Moyenne | Élevé | Contract tests obligatoires + versionnement API. |
| R-26 | Mauvaise priorisation des risques | Moyenne | Moyen | Score probabilité*impact*exposition recalculé hebdo. |
| R-27 | Documentation technique non maintenue | Moyenne | Moyen | Definition of done inclut mise à jour docs. |
| R-28 | Non-correspondance entre read-model et source | Faible | Élevé | Checksum projections + audits périodiques. |
| R-29 | Absence de traçabilité de suppression | Faible | Élevé | Soft delete + journaux immuables. |
| R-30 | Métriques vanity sans action associée | Moyenne | Moyen | Cataloguer métriques avec owner et action playbook. |
| R-31 | Recommandations readiness peu compréhensibles | Moyenne | Moyen | Explications en langage opérationnel + causes principales. |
| R-32 | Dégradation mobile inattendue | Faible | Faible | Validation responsive sur écrans essentiels. |
| R-33 | Conflits de version artefact pendant édition | Moyenne | Moyen | Détection conflit + merge assisté. |
| R-34 | Biais de confirmation dans scoring AQCD | Faible | Moyen | Audit trimestriel des formules et données. |
| R-35 | Queue bloquée par message poison | Faible | Élevé | Dead-letter queue + quarantine automatique. |
| R-36 | Exposition de chemins système dans UI | Faible | Moyen | Masquage partiel + politiques d’affichage. |
| R-37 | Retard dans traitement incidents critiques | Moyenne | Élevé | On-call clair + runbooks de réponse rapide. |
| R-38 | Absence de simulation avant release | Moyenne | Élevé | Game day mensuel sur scénario gate failure. |
| R-39 | Dépendances externes non pinées | Moyenne | Moyen | Lockfiles + scans de vulnérabilité automatisés. |
| R-40 | Mauvais alignement H03/H04/H08 | Moyenne | Critique | Checklists de handoff obligatoires et sign-off croisé. |
| R-41 | Perte confiance sponsor faute lisibilité | Moyenne | Moyen | Niveaux de lecture executive/ops/tech distincts. |
| R-42 | Absence d’historique décisionnel fiable | Faible | Élevé | Decision graph + bundles exportables. |
| R-43 | Calcul AQCD trop coûteux en runtime | Faible | Moyen | Batch + projections matérialisées. |
| R-44 | Régression de sécurité après upgrade | Moyenne | Élevé | Security regression suite obligatoire. |
| R-45 | Panne partielle non visible par opérateurs | Moyenne | Moyen | Tableau santé composant + synthetic monitors. |

### 12.2 Plan de mitigation prioritaire (Top 12)
1. **R-02** — Absence de métadonnées obligatoires dans documents clés
   - Action immédiate: Refus ingestion critique + alerte + guide correction.
   - Responsable recommandé: Orchestrateur + owner technique dédié selon domaine.
   - Preuve attendue: ticket mitigation fermé + lien artefact + validation gate concerné.
2. **R-06** — Faux DONE si G4-UX mal relié
   - Action immédiate: Règle bloquante explicite dans gate engine + tests e2e.
   - Responsable recommandé: Orchestrateur + owner technique dédié selon domaine.
   - Preuve attendue: ticket mitigation fermé + lien artefact + validation gate concerné.
3. **R-08** — Exécution commande sur mauvais projet
   - Action immédiate: Contexte projet signé + confirmation contextualisée.
   - Responsable recommandé: Orchestrateur + owner technique dédié selon domaine.
   - Preuve attendue: ticket mitigation fermé + lien artefact + validation gate concerné.
4. **R-09** — Logs contenant données sensibles
   - Action immédiate: Redaction patterns + scanners secrets post-run.
   - Responsable recommandé: Orchestrateur + owner technique dédié selon domaine.
   - Preuve attendue: ticket mitigation fermé + lien artefact + validation gate concerné.
5. **R-15** — Fatigue d’alertes (alert storm)
   - Action immédiate: Throttling + priorisation + grouping contextuel.
   - Responsable recommandé: Orchestrateur + owner technique dédié selon domaine.
   - Preuve attendue: ticket mitigation fermé + lien artefact + validation gate concerné.
6. **R-20** — Contournement du broker via shell direct
   - Action immédiate: Limiter surfaces d’exécution + audit des bypass.
   - Responsable recommandé: Orchestrateur + owner technique dédié selon domaine.
   - Preuve attendue: ticket mitigation fermé + lien artefact + validation gate concerné.
7. **R-21** — Erreur humaine de configuration policy
   - Action immédiate: Policy review pair + tests policy-as-code.
   - Responsable recommandé: Orchestrateur + owner technique dédié selon domaine.
   - Preuve attendue: ticket mitigation fermé + lien artefact + validation gate concerné.
8. **R-25** — Rupture compatibilité front/back data contract
   - Action immédiate: Contract tests obligatoires + versionnement API.
   - Responsable recommandé: Orchestrateur + owner technique dédié selon domaine.
   - Preuve attendue: ticket mitigation fermé + lien artefact + validation gate concerné.
9. **R-35** — Queue bloquée par message poison
   - Action immédiate: Dead-letter queue + quarantine automatique.
   - Responsable recommandé: Orchestrateur + owner technique dédié selon domaine.
   - Preuve attendue: ticket mitigation fermé + lien artefact + validation gate concerné.
10. **R-37** — Retard dans traitement incidents critiques
   - Action immédiate: On-call clair + runbooks de réponse rapide.
   - Responsable recommandé: Orchestrateur + owner technique dédié selon domaine.
   - Preuve attendue: ticket mitigation fermé + lien artefact + validation gate concerné.
11. **R-40** — Mauvais alignement H03/H04/H08
   - Action immédiate: Checklists de handoff obligatoires et sign-off croisé.
   - Responsable recommandé: Orchestrateur + owner technique dédié selon domaine.
   - Preuve attendue: ticket mitigation fermé + lien artefact + validation gate concerné.
12. **R-44** — Régression de sécurité après upgrade
   - Action immédiate: Security regression suite obligatoire.
   - Responsable recommandé: Orchestrateur + owner technique dédié selon domaine.
   - Preuve attendue: ticket mitigation fermé + lien artefact + validation gate concerné.

## 13) Plan de livraison incrémental V1 → V1.2

| Lot | Horizon | Axe | Livrables concrets |
|---|---|---|---|
| Lot 0 | Semaine 1 | Fondations data | Event ledger minimal, parser frontmatter, phase timeline |
| Lot 1 | Semaine 2 | Pipeline Board V1 | Vue H01→H23 + statuts + liens artefacts |
| Lot 2 | Semaine 3 | Gate Center V1 | G1→G5 + dual G4 affiché + filtres |
| Lot 3 | Semaine 4 | Artifact Explorer V1 | Recherche plein texte + sections + metadata |
| Lot 4 | Semaine 5 | Command Broker lecture | Allowlist read-only + audit log |
| Lot 5 | Semaine 6 | Command Broker écriture contrôlée | dry-run/apply + confirmations + RBAC |
| Lot 6 | Semaine 7 | Risk Radar + Decision Log | registre risques vivant + graph décision |
| Lot 7 | Semaine 8 | AQCD Cockpit baseline | scores calculés + tendances |
| Lot 8 | Semaine 9 | UX Evidence Lens | preuves G4-UX intégrées au flux story |
| Lot 9 | Semaine 10 | Readiness predictor rules | score explicable et recommandations |
| Lot 10 | Semaine 11 | Export bundles audit | exports md/pdf/json filtrés |
| Lot 11 | Semaine 12 | Hardening + runbooks | SLO monitors, alerting, procédures incident |

### 13.1 Alignement attendu avec H03/H04/H08
| Phase | Contribution de ce document | Action de la phase cible |
|---|---|---|
| H03 | Valider proposition de valeur “décision + preuve” | Confirmer personas et priorités widget par rôle. |
| H04 | Formaliser FR/NFR + AC testables | Transformer les patterns AP-01..AP-16 en exigences détaillées. |
| H08 | Arbitrer stack et architecture logique | Émettre ADRs finaux et stratégie de migration/évolutivité. |

## 14) Pré-ADRs prêts pour H08

| ADR | Décision | Statut | Justification courte |
|---|---|---|---|
| ADR-001 | Adopter un event ledger append-only | Proposé | Base d'audit et de corrélation unifiée. |
| ADR-002 | Séparer write-model et read-model | Proposé | Performance UI + résilience ingestion. |
| ADR-003 | Versionner les contrats handoff/artifact | Proposé | Évolutivité contrôlée des formats. |
| ADR-004 | Mettre en place Command Broker | Proposé | Sécurité opérationnelle de l’exécution. |
| ADR-005 | Appliquer RBAC minimal par défaut | Proposé | Réduction surface d'attaque. |
| ADR-006 | Formaliser policies de gate en code | Proposé | Transparence et testabilité des règles. |
| ADR-007 | Utiliser indexation delta + cache | Proposé | Réactivité sans surcharge CPU. |
| ADR-008 | Rendre G4 dual explicite | Proposé | Empêcher faux DONE technique-only. |
| ADR-009 | Implémenter readiness predictor rule-based | Proposé | Signal précoce sans boîte noire ML. |
| ADR-010 | Ajouter export bundles de preuve | Proposé | Auditabilité et communication sponsor. |
| ADR-011 | Support mode dégradé stale-but-available | Proposé | Continuité de service en incident parsing. |
| ADR-012 | Imposer active_project_root signé | Proposé | Sécurité multi-projets. |
| ADR-013 | Instrumenter AQCD via projections matérialisées | Proposé | Pilotage lisible et performant. |
| ADR-014 | Mettre en place dead-letter queue ingestion | Proposé | Résilience face messages poison. |
| ADR-015 | Documenter runbooks incidents critiques | Proposé | Réponse rapide et répétable. |

### ADR-001 — Adopter un event ledger append-only
- **Statut actuel**: Proposé
- **Motif**: Base d'audit et de corrélation unifiée.
- **Critère d’acceptation H08**: preuve de faisabilité technique + impact sur risques principaux documenté.
- **Question ouverte**: dépendance stack et coût opérationnel à 6 mois.

### ADR-002 — Séparer write-model et read-model
- **Statut actuel**: Proposé
- **Motif**: Performance UI + résilience ingestion.
- **Critère d’acceptation H08**: preuve de faisabilité technique + impact sur risques principaux documenté.
- **Question ouverte**: dépendance stack et coût opérationnel à 6 mois.

### ADR-003 — Versionner les contrats handoff/artifact
- **Statut actuel**: Proposé
- **Motif**: Évolutivité contrôlée des formats.
- **Critère d’acceptation H08**: preuve de faisabilité technique + impact sur risques principaux documenté.
- **Question ouverte**: dépendance stack et coût opérationnel à 6 mois.

### ADR-004 — Mettre en place Command Broker
- **Statut actuel**: Proposé
- **Motif**: Sécurité opérationnelle de l’exécution.
- **Critère d’acceptation H08**: preuve de faisabilité technique + impact sur risques principaux documenté.
- **Question ouverte**: dépendance stack et coût opérationnel à 6 mois.

### ADR-005 — Appliquer RBAC minimal par défaut
- **Statut actuel**: Proposé
- **Motif**: Réduction surface d'attaque.
- **Critère d’acceptation H08**: preuve de faisabilité technique + impact sur risques principaux documenté.
- **Question ouverte**: dépendance stack et coût opérationnel à 6 mois.

### ADR-006 — Formaliser policies de gate en code
- **Statut actuel**: Proposé
- **Motif**: Transparence et testabilité des règles.
- **Critère d’acceptation H08**: preuve de faisabilité technique + impact sur risques principaux documenté.
- **Question ouverte**: dépendance stack et coût opérationnel à 6 mois.

### ADR-007 — Utiliser indexation delta + cache
- **Statut actuel**: Proposé
- **Motif**: Réactivité sans surcharge CPU.
- **Critère d’acceptation H08**: preuve de faisabilité technique + impact sur risques principaux documenté.
- **Question ouverte**: dépendance stack et coût opérationnel à 6 mois.

### ADR-008 — Rendre G4 dual explicite
- **Statut actuel**: Proposé
- **Motif**: Empêcher faux DONE technique-only.
- **Critère d’acceptation H08**: preuve de faisabilité technique + impact sur risques principaux documenté.
- **Question ouverte**: dépendance stack et coût opérationnel à 6 mois.

### ADR-009 — Implémenter readiness predictor rule-based
- **Statut actuel**: Proposé
- **Motif**: Signal précoce sans boîte noire ML.
- **Critère d’acceptation H08**: preuve de faisabilité technique + impact sur risques principaux documenté.
- **Question ouverte**: dépendance stack et coût opérationnel à 6 mois.

### ADR-010 — Ajouter export bundles de preuve
- **Statut actuel**: Proposé
- **Motif**: Auditabilité et communication sponsor.
- **Critère d’acceptation H08**: preuve de faisabilité technique + impact sur risques principaux documenté.
- **Question ouverte**: dépendance stack et coût opérationnel à 6 mois.

### ADR-011 — Support mode dégradé stale-but-available
- **Statut actuel**: Proposé
- **Motif**: Continuité de service en incident parsing.
- **Critère d’acceptation H08**: preuve de faisabilité technique + impact sur risques principaux documenté.
- **Question ouverte**: dépendance stack et coût opérationnel à 6 mois.

### ADR-012 — Imposer active_project_root signé
- **Statut actuel**: Proposé
- **Motif**: Sécurité multi-projets.
- **Critère d’acceptation H08**: preuve de faisabilité technique + impact sur risques principaux documenté.
- **Question ouverte**: dépendance stack et coût opérationnel à 6 mois.

### ADR-013 — Instrumenter AQCD via projections matérialisées
- **Statut actuel**: Proposé
- **Motif**: Pilotage lisible et performant.
- **Critère d’acceptation H08**: preuve de faisabilité technique + impact sur risques principaux documenté.
- **Question ouverte**: dépendance stack et coût opérationnel à 6 mois.

### ADR-014 — Mettre en place dead-letter queue ingestion
- **Statut actuel**: Proposé
- **Motif**: Résilience face messages poison.
- **Critère d’acceptation H08**: preuve de faisabilité technique + impact sur risques principaux documenté.
- **Question ouverte**: dépendance stack et coût opérationnel à 6 mois.

### ADR-015 — Documenter runbooks incidents critiques
- **Statut actuel**: Proposé
- **Motif**: Réponse rapide et répétable.
- **Critère d’acceptation H08**: preuve de faisabilité technique + impact sur risques principaux documenté.
- **Question ouverte**: dépendance stack et coût opérationnel à 6 mois.

## 15) Annexes opérationnelles pour handoff H03/H04/H08

### 15.1 Checklist H03 (Product Brief)
- [ ] Le problème principal est formulé avec symptôme observable et impact mesurable.
- [ ] Les personas prioritaires sont reliés à des décisions concrètes attendues dans le dashboard.
- [ ] La proposition de valeur mentionne explicitement “décision + preuve + action”.
- [ ] Le périmètre V1 évite les fonctionnalités non essentielles de type “suite complète”.
- [ ] Les hypothèses critiques HYP-01/HYP-03/HYP-04/HYP-11/HYP-19/HYP-26 sont reprises.
- [ ] La North Star Metric TCD est conservée avec formule et baseline.
- [ ] Les principaux risques techniques (R-02, R-06, R-08, R-40) sont visibles dans le brief.
- [ ] Les dépendances vers H04/H08 sont explicites (pas implicites).

### 15.2 Checklist H04 (PRD)
- [ ] Chaque capacité (Pipeline Board, Gate Center, Artifact Explorer, Command Broker) a des AC vérifiables.
- [ ] Les NFR de latence, disponibilité, auditabilité et sécurité sont quantifiés.
- [ ] La logique dual gate G4-T/G4-UX est décrite sans ambiguïté.
- [ ] Les exigences de métadonnées `stepsCompleted` et `inputDocuments` sont formalisées.
- [ ] Les règles de permissions et validations pré-exécution sont incluses.
- [ ] Le plan de tests multi-couches (TS-01..TS-35) est référencé.
- [ ] Le registre de risques et owners est intégré au PRD.
- [ ] Les critères de sortie V1 et hors scope V1.1 sont explicitement bornés.

### 15.3 Checklist H08 (Architecture)
- [ ] Valider ou rejeter explicitement chaque pré-ADR avec justification.
- [ ] Définir le schéma interne versionné pour handoffs, gates, artefacts, commandes.
- [ ] Spécifier la stratégie de persistance pour event ledger et projections.
- [ ] Documenter les mécanismes de résilience (retry, DLQ, fallback read-model).
- [ ] Documenter les mécanismes de sécurité (RBAC, allowlist, audit log immuable).
- [ ] Préciser le modèle d’observabilité et la stack de métriques/logs/traces.
- [ ] Inclure le plan de migration et compatibilité future des parseurs.
- [ ] Définir la stratégie de déploiement progressive et rollback.

### 15.4 Matrice de consommation fichier-par-fichier
| Fichier/Artefact | Consommé en phase | Usage principal |
|---|---|---|
| brainstorming-report.md | H03 | hypothèses et opportunités priorisées |
| implementation-patterns.md | H03 | limitations techniques et options de valeur |
| implementation-patterns.md | H04 | exigences fonctionnelles/NFR à dériver |
| implementation-patterns.md | H08 | pré-ADRs et architecture logique |
| competition-benchmark.md | H03 | positionnement et différenciation |
| risks-constraints.md | H03 | risques à intégrer au brief |
| product-brief.md | H04 | scope validé et KPI |
| prd.md | H05 | base contraintes UX à raffiner |
| ux.md | H06 | standard UX à transmettre |
| ux.md | H08 | contraintes UX impactant architecture |
| architecture.md | H09 | découpage épics/stories cohérent |
| epics.md | H10 | readiness de couverture backlog |
| sprint-status.yaml | H11 | initialisation sprint et progression |
| stories/Sxxx.md | H13 | pack story vers DEV |
| stories/Sxxx.md | H14 | preuves attendues pour UX QA |
| review/*.md | H18 | décision de revue senior |
| execution-trace/Hxx*.md | Toutes | audit d’exécution phase par phase |
| phase notify logs | H07/H10/H23 | discipline de notification |
| quality gate outputs | H10/H19/H23 | evidence de passage de gate |
| aqcd snapshots | H21/H22 | ajustements rétrospective |
| command logs | Sécurité | contrôle et forensic |
| ux evidence captures | H15 | verdict UX documenté |
| test reports | H17 | verdict TEA |
| security scans | H17/H18 | risques sécurité avant approbation |
| bundle exports | Audit/Sponsor | preuve consolidée pour décision externe |

## Sources

- BMAD Hyper Orchestration Theory: /root/.openclaw/workspace/docs/BMAD-HYPER-ORCHESTRATION-THEORY.md
- BMAD Ultra Quality Protocol: /root/.openclaw/workspace/docs/BMAD-ULTRA-QUALITY-PROTOCOL.md
- H01 Brainstorming report: /root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/brainstorming-report.md
- Analyse benchmark ExempleBMAD: /root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/exemplebmad-analysis-2026-02-20.md
- Référence qualité documentaire externe: https://github.com/XdreaMs404/ExempleBMAD

Fin du livrable H02-tech.
