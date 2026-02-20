---
title: "H02 — Risks & Constraints approfondis: Dashboard OpenClaw"
phase: "H02"
project: "dashboard-openclaw"
date: "2026-02-20"
workflowType: "BMAD Analysis - Risk & Constraints"
executionMode: "agent-by-agent + file-by-file"
qualityTarget: "actionnable pour H03/H04/H08"
referenceBenchmark: "https://github.com/XdreaMs404/ExempleBMAD"
stepsCompleted:
  - "Lecture des contraintes BMAD H01→H23 et des gates G1→G5"
  - "Lecture du protocole ULTRA quality avec extraction des exigences obligatoires"
  - "Analyse du brainstorming H01 pour reprendre hypothèses, pain points et risques initiaux"
  - "Analyse du benchmark technique implementation-patterns pour risques d’architecture"
  - "Analyse du benchmark concurrentiel pour risques de positionnement, adoption et pricing"
  - "Analyse du repo ExempleBMAD pour calibrer profondeur et traçabilité documentaire"
  - "Consolidation d’un registre structuré de Risque (tech/process/UX/sécurité/coût/adoption)"
  - "Définition des seuils d’acceptation, owners, mitigations et contingences"
  - "Construction d’un plan de monitoring relié à des indicateurs opérationnels"
  - "Préparation du handoff orienté décisions vers H03, H04 et H08"
inputDocuments:
  - "/root/.openclaw/workspace/docs/BMAD-HYPER-ORCHESTRATION-THEORY.md"
  - "/root/.openclaw/workspace/docs/BMAD-ULTRA-QUALITY-PROTOCOL.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/brainstorming-report.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/implementation-patterns.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/competition-benchmark.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/exemplebmad-analysis-2026-02-20.md"
---

# H02 — Analyse risques & contraintes (version exhaustive, actionnable H03/H04/H08)

Ce livrable consolide les **Risques** et contraintes majeures pour Dashboard OpenClaw.
Il est construit pour réduire l’incertitude de décision avant Product Brief (H03), PRD (H04) et Architecture (H08).
Le niveau de profondeur vise explicitement la référence documentaire: https://github.com/XdreaMs404/ExempleBMAD.

## 1) Mandat H02-risks, périmètre et méthode

- Produire un registre de Risque exploitable immédiatement en gouvernance de phase.
- Couvrir les dimensions: technique, process, UX, sécurité, coût, adoption marché.
- Donner pour chaque Risque: probabilité, impact, détection, owner, mitigation, contingence.
- Définir des seuils d’acceptation explicites, pas de formulation vague.
- Relier chaque Risque aux dépendances structurantes et au plan de monitoring.
- Rendre la sortie directement consommable par H03/H04/H08 sans retraitement lourd.
- Respecter le mode ULTRA: preuve-first, détail actionnable, traçabilité complète.

Méthode appliquée:
1. Extraction des contraintes non négociables depuis BMAD-HYPER et BMAD-ULTRA.
2. Croisement avec les risques déjà identifiés en H01 brainstorming.
3. Alignement avec les patterns techniques et menaces décrits en implementation-patterns.
4. Intégration des risques de positionnement/pricing issus du benchmark concurrence.
5. Construction d’un registre consolidé avec scoring homogène et ownership explicite.
6. Définition d’un plan de monitoring orienté décision (alertes, seuils, escalades).

## 2) Synthèse exécutive orientée H03/H04/H08

- Le Risque le plus critique est la sécurité opérationnelle du command broker (RBAC, contexte projet, injection).
- Le second Risque structurant est le faux DONE quand G4-UX n’est pas traité comme gate bloquant réel.
- Le troisième Risque majeur est la démonstration de ROI (réduction TCD) insuffisamment instrumentée.
- Les contraintes H03: figer proposition de valeur autour décision+preuve, éviter scope inflation.
- Les contraintes H04: formaliser FR/NFR vérifiables sur sécurité, dual-gate, observabilité et metadata.
- Les contraintes H08: choisir architecture event-ledger + read-models résilients + policy-as-code.
- Acceptation globale recommandée: aucun Risque Critique non mitigé ne doit rester sans owner+date.
- Priorité immédiate: top 10 risques critiques, plan 30/60/90 jours, et instrumentation des métriques clés.

## 3) Grille d’évaluation du Risque et seuils d’acceptation

Échelle retenue (homogène sur toutes les catégories):
- **Probabilité (P)**: 1=rare, 2=peu probable, 3=possible, 4=probable, 5=quasi certain.
- **Impact (I)**: 1=faible, 2=mineur, 3=significatif, 4=majeur, 5=critique.
- **Détection (D)**: 1=très détectable tôt, 5=difficile à détecter avant dommage.
- **Score d’exposition**: `P * I * D`.

| Zone | Score | Interprétation | Décision de gestion |
|---|---:|---|---|
| Critique | >= 60 | Risque intolérable sans traitement immédiat | Mitigation prioritaire + owner nommé + suivi hebdo CODIR |
| Élevé | 45-59 | Risque important, pilotage rapproché | Plan d’action dans sprint courant + preuve de progression |
| Modéré | 30-44 | Risque maîtrisable sous contrôle | Mitigation planifiée + monitoring standard |
| Surveillance | < 30 | Risque acceptable sous réserve de veille | Revue mensuelle et réévaluation périodique |

## 4) Dépendances critiques et contraintes structurantes

| Dépendance | Description | Type | Owner recommandé | Impact si indisponible | Phase sensible |
|---|---|---|---|---|---|
| D01 | Contrat frontmatter ULTRA (`stepsCompleted`, `inputDocuments`) appliqué à tous les livrables planning. | Process | Orchestrateur / PM | Retard ou contournement de contrôles critiques | H02→H04 |
| D02 | Scripts de traçabilité phase (`new-phase-trace`, `phase-notify`, guards) disponibles et exécutables. | Process | Orchestrateur / PM | Retard ou contournement de contrôles critiques | H02→H04 |
| D03 | Command Broker zero-trust avec allowlist, dry-run et confirmation explicite. | Sécurité | Security Lead | Retard ou contournement de contrôles critiques | H04→H08 |
| D04 | RBAC policy-as-code versionnée et revue hebdomadaire. | Sécurité | Security Lead | Retard ou contournement de contrôles critiques | H04→H08 |
| D05 | Dual Gate Engine G4-T/G4-UX câblé comme blocage réel de DONE. | UX/Gouvernance | UX QA / PM | Retard ou contournement de contrôles critiques | H04→H10 |
| D06 | Pipeline parser + delta indexing + fail-safe read-model (mode stale-but-available). | Technique | Architecte Plateforme | Retard ou contournement de contrôles critiques | H04→H08 |
| D07 | Event ledger append-only avec signatures d’audit et politique de rétention. | Data/FinOps | Architecte / Ops | Retard ou contournement de contrôles critiques | H03→H08 |
| D08 | Baselines AQCD + télémétrie minimale fiable avant lecture décisionnelle forte. | Data/FinOps | Architecte / Ops | Retard ou contournement de contrôles critiques | H03→H08 |
| D09 | Design system, règles WCAG 2.2 AA et états UI obligatoires documentés. | UX/Gouvernance | UX QA / PM | Retard ou contournement de contrôles critiques | H04→H10 |
| D10 | Runbooks d’incident + astreinte (on-call) + escalade horodatée. | Technique | Architecte Plateforme | Retard ou contournement de contrôles critiques | H04→H08 |
| D11 | Cadre FinOps: budget token, alertes de dérive et rapport coût/story. | Data/FinOps | Architecte / Ops | Retard ou contournement de contrôles critiques | H03→H08 |
| D12 | Préparation self-host: secrets management, durcissement, packages reproductibles. | Sécurité | Security Lead | Retard ou contournement de contrôles critiques | H04→H08 |
| D13 | Connecteurs inter-outils (Jira/Linear/Notion/CI observability) avec contrats stables. | Technique | Architecte Plateforme | Retard ou contournement de contrôles critiques | H04→H08 |
| D14 | Politique légale de conservation/suppression des artefacts et exports. | Sécurité | Security Lead | Retard ou contournement de contrôles critiques | H04→H08 |
| D15 | Plan de conduite du changement et formation par rôle (Orchestrateur, PM, TEA, UX QA). | UX/Gouvernance | UX QA / PM | Retard ou contournement de contrôles critiques | H04→H10 |
| D16 | Gouvernance de sign-off croisé PM + Architect + UX + TEA avant gates majeurs. | Process | Orchestrateur / PM | Retard ou contournement de contrôles critiques | H02→H04 |

Contraintes non négociables reprises des documents d’entrée:
- Ordre BMAD H01→H23 strict, sans permutation de phases.
- Gate G4 dual (tech + UX) bloquant pour toute déclaration DONE.
- Traçabilité exécution et metadata de workflow obligatoires.
- Exécution agent-par-agent et fichier-par-fichier (anti batch multi-livrables).
- Règles sécurité sur commandes (allowlist, RBAC, dry-run, audit trail).

## 5) Registre structuré des Risques (vue consolidée)

| Risque ID | Domaine | Risque (description courte) | P | I | D | Score | Niveau | Owner | Mitigation principale | Contingence | Seuil d’acceptation |
|---|---|---|---:|---:|---:|---:|---|---|---|---|---|
| C01 | Coût | Explosion des coûts token | 4 | 4 | 3 | 48 | Élevé | Ops Manager / FinOps | Budgets par phase, alertes de dérive et optimisation routing modèle. | Réduire concurrence agents et limiter runs non prioritaires. | Acceptable si score Efficience_Coût >= 70. |
| C02 | Coût | Surcoût stockage ledger/projections | 3 | 3 | 3 | 27 | Surveillance | Architecte Plateforme | Politiques de tiering, compression et archivage par criticité. | Purge contrôlée des données à faible valeur. | Acceptable si coût stockage par projet reste dans budget trimestriel. |
| C03 | Coût | Sous-estimation des coûts d’intégration | 3 | 4 | 3 | 36 | Modéré | PM Produit | Prioriser 1-2 connecteurs stratégiques en V1 et standardiser contrats. | Reporter intégrations non essentielles en V1.1. | Acceptable si capacité sprint absorbable sans impacter noyau Gate/Evidence. |
| C04 | Coût | Coût support onboarding supérieur au plan | 3 | 3 | 3 | 27 | Surveillance | Customer Success / PM | Templates par rôle, parcours guidés, documentation orientée tâches. | Offrir mode lecture seule initial + sessions de formation ciblées. | Acceptable si time-to-first-value < 14 jours pour segment S3. |
| C05 | Coût | Coût de rework UX après validation tardive | 4 | 4 | 3 | 48 | Élevé | UX QA Lead + TEA | Faire intervenir UX QA plus tôt et bloquer strictement G4-UX. | Plan de remédiation UX sprint dédié. | Acceptable si rework UX post-DONE tend vers 0. |
| M01 | Adoption | Confusion de catégorie produit | 4 | 4 | 3 | 48 | Élevé | PMM / PM Produit | Message centré TCD, dual gate et evidence graph. | Repositionner narratif et démonstrations sur cas de décision réels. | Acceptable si >65% prospects comprennent la différenciation en démo. |
| M02 | Adoption | ROI TCD non démontré | 4 | 5 | 3 | 60 | Critique | PM Produit | Mesurer baseline TCD dès POC et instrumenter gain mensuel. | Focus sur quick wins mesurables (Gate Center, Evidence links). | Acceptable si réduction TCD >= 30% sur pilote cible. |
| M03 | Adoption | Résistance au changement de stack | 4 | 4 | 3 | 48 | Élevé | PMM + Sales Engineering | Positionner OpenClaw en surcouche intégrable à la stack existante. | Prioriser connecteurs et mode read-only d’amorçage. | Acceptable si >70% pilotes démarrent sans migration complète. |
| M04 | Adoption | Scope inflation en V1 | 4 | 4 | 2 | 32 | Modéré | PM Produit | Cadre anti-scope documenté et gouverné par objectifs mesurables. | Rebaseliner roadmap et décaler éléments V1.1/V1.2. | Acceptable si >80% capacité sprint sur noyau différenciant. |
| M05 | Adoption | Cycle de vente enterprise trop long | 3 | 4 | 4 | 48 | Élevé | Sales + Security Lead | Préparer packs preuve sécurité/compliance standardisés. | Cibler d’abord segment mid-market S3/S6. | Acceptable si délai de qualification reste compatible runway commercial. |
| M06 | Adoption | Dépendance excessive à la niche BMAD | 3 | 3 | 3 | 27 | Surveillance | PMM | Abstraction narrative “phase-gate-evidence” au-delà du jargon BMAD. | Créer templates sectoriels avec nomenclature adaptable. | Acceptable si compréhension du message >70% hors public BMAD natif. |
| M07 | Adoption | Retard self-host readiness | 3 | 5 | 4 | 60 | Critique | Architecte + Security Lead | Planifier dès H08 les prérequis self-host et packaging reproductible. | Proposer mode hybride transitoire et roadmap contractualisée. | Acceptable si plan self-host daté et vérifiable existe avant GA. |
| M08 | Adoption | Lisibilité AQCD insuffisante pour sponsor | 3 | 4 | 3 | 36 | Modéré | PM Produit + Ops Manager | Créer vues executive simplifiées avec explication de formule et implications. | Mettre en place revue manuelle hebdo sponsor jusqu’à stabilisation. | Acceptable si compréhension sponsor >=80% sur dashboard exécutif. |
| P01 | Process | Non-respect de l’ordre canonique H01→H23 | 3 | 5 | 4 | 60 | Critique | Orchestrateur BMAD | Machine d’état stricte + phase guards automatisés. | Retour à la phase précédente avec plan de correction et traçabilité. | Acceptable si 0 transition illégitime sur phases 1→3. |
| P02 | Process | Handoffs incomplets ou ambigus | 4 | 4 | 3 | 48 | Élevé | PM BMAD | Contrat de handoff standard obligatoire et validé à l’entrée de chaque phase. | Bloquer handoff, demander compléments ciblés, relancer seulement après validation. | Acceptable si `m_handoff_rework_ratio` < 15%. |
| P03 | Process | Notifications de phase manquantes | 3 | 4 | 3 | 36 | Modéré | Orchestrateur BMAD | Automatiser blocage de transition si notify absent. | Notification corrective immédiate + audit de séquence. | Acceptable si 100% phases notifiées dans les 5 minutes. |
| P04 | Process | RACI décisionnel flou | 3 | 4 | 4 | 48 | Élevé | PM + Orchestrateur | Rendre owner obligatoire dans tout registre de Risque. | Escalade sponsor sous 24h pour arbitrage ownership. | Acceptable si 100% des risques Élevés/Critiques ont owner nommé. |
| P05 | Process | Actions de mitigation non fermées | 4 | 4 | 3 | 48 | Élevé | SM + TEA | Transformer chaque mitigation critique en tâche trackée avec échéance et preuve. | Freeze de nouvelles features tant que backlog critique non réduit. | Acceptable si >80% mitigations critiques fermées dans le sprint planifié. |
| P06 | Process | Contrôles ULTRA quality contournés | 3 | 5 | 4 | 60 | Critique | Orchestrateur BMAD | Rendre les checks bloquants et visibles dans Gate Center. | Revalidation complète du lot documentaire avant reprise. | Acceptable si 0 phase clôturée sans preuves de checks. |
| P07 | Process | Erreur de contexte multi-projets | 3 | 5 | 4 | 60 | Critique | Orchestrateur + Admin Sécurité | Signer chaque commande avec root actif et confirmation contextuelle. | Stop immédiat, rollback ciblé, rapport d’incident. | Acceptable si 0 incident cross-project sur commandes d’écriture. |
| S01 | Sécurité | Commande destructive sur mauvais projet | 3 | 5 | 5 | 75 | Critique | Admin Sécurité | Double validation + root signé + dry-run obligatoire pour opérations sensibles. | Kill-switch command broker, restauration depuis sauvegarde, post-mortem. | Acceptable si 0 exécution destructive hors contexte confirmé. |
| S02 | Sécurité | Injection d’arguments shell | 3 | 5 | 4 | 60 | Critique | Security Engineer | Templates de commande et arguments structurés; interdiction concaténation libre. | Bloquer endpoint concerné, rotation secrets, revue forensic. | Acceptable si tests d’injection passent à 100%. |
| S03 | Sécurité | RBAC trop permissif | 4 | 5 | 4 | 80 | Critique | Admin Sécurité + Orchestrateur | RBAC minimal, revues hebdo, séparation des devoirs, policy-as-code testée. | Réduction immédiate des droits à lecture seule + audit complet. | Acceptable si 0 action critique hors rôle autorisé. |
| S04 | Sécurité | Journal d’audit altérable | 2 | 5 | 5 | 50 | Élevé | Security Engineer | Ledger append-only signé et contrôles d’intégrité périodiques. | Basculer en mode investigation, geler opérations sensibles. | Acceptable si 100% des logs critiques sont immuables et vérifiables. |
| S05 | Sécurité | Fuite de secrets dans les logs | 3 | 5 | 4 | 60 | Critique | Security Engineer | Redaction automatique + scans secrets post-run + politique de masquage stricte. | Rotation immédiate des secrets compromis et purge contrôlée. | Acceptable si 0 secret exposé dans sorties persistées. |
| S06 | Sécurité | Exfiltration via export de bundles | 3 | 4 | 4 | 48 | Élevé | Security Engineer + TEA | Filtrage par rôle, watermark et classification des données exportables. | Désactiver temporairement exports externes et réviser templates. | Acceptable si 100% des exports critiques passent validation sécurité. |
| S07 | Sécurité | Non-révocation des accès | 3 | 4 | 4 | 48 | Élevé | Admin Sécurité | Processus JML (joiner/mover/leaver) automatisé et audit mensuel des droits. | Révocation massive + revue manuelle post-incident. | Acceptable si délai de révocation <24h pour tout changement de rôle. |
| S08 | Sécurité | Non-conformité conservation/suppression | 3 | 5 | 4 | 60 | Critique | DPO / Security Lead | Définir règles de rétention par type d’artefact et automatiser purge contrôlée. | Geler exports externes et lancer plan de conformité accéléré. | Acceptable si 100% types de données couverts par politique validée. |
| T01 | Technique | Dérive de format markdown/frontmatter | 4 | 5 | 3 | 60 | Critique | Architecte Plateforme | Versionner les schémas, ajouter tests de contrat documentaire et lint frontmatter en CI. | Basculer sur parser de secours + marquer vues dégradées + ouvrir correction prioritaire. | Acceptable si `m_artifact_parse_error_rate` < 2% et 0 rupture sur livrables critiques. |
| T02 | Technique | Absence de métadonnées obligatoires | 4 | 4 | 3 | 48 | Élevé | PM BMAD | Refuser l’ingestion bloquante en dessous des champs minimaux et fournir un correctif guidé. | Mettre le gate en CONCERNS, relancer mission de correction fichier-par-fichier. | Acceptable si 100% des livrables H01→H10 portent metadata minimale. |
| T03 | Technique | Saturation de la file d’ingestion | 3 | 4 | 3 | 36 | Modéré | Architecte Plateforme | Appliquer backpressure, prioriser jobs critiques et rendre les workers idempotents. | Activer mode lecture stale + suspendre jobs non critiques jusqu’au retour nominal. | Acceptable si p95 refresh delta < 5s et pas de perte d’événement. |
| T04 | Technique | Latence excessive sur projections critiques | 3 | 5 | 4 | 60 | Critique | Architecte Plateforme | Projections matérialisées, cache invalidation contrôlé, requêtes bornées par rôle. | Désactiver widgets lourds, prioriser les signaux bloquants, lancer tuning urgence. | Acceptable si SLO-01/SLO-02 tenus sur 2 semaines glissantes. |
| T05 | Technique | Rupture des contrats front/back | 3 | 5 | 4 | 60 | Critique | Lead Engineering | Versionner API, contract tests obligatoires et politique de dépréciation claire. | Rollback version API, freeze des features et correctif de compatibilité. | Acceptable si 0 breaking change non annoncé et 100% contract tests pass. |
| T06 | Technique | Couplage excessif aux scripts legacy | 4 | 4 | 3 | 48 | Élevé | Architecte Plateforme | Introduire des adapters versionnés entre cockpit et scripts existants. | Basculer en mode lecture seule + exécution manuelle contrôlée le temps d’aligner les adapters. | Acceptable si >70% commandes passent par wrappers validés. |
| T07 | Technique | Faux DONE via G4-UX mal câblé | 3 | 5 | 5 | 75 | Critique | TEA Lead + UX QA Lead | Rendre G4 dual bloquant au niveau moteur de gate + tests E2E dédiés. | Réouvrir stories affectées, geler release, appliquer correctif UX prioritaire. | Acceptable si 0 faux DONE sur 2 sprints. |
| T08 | Technique | Absence de mode dégradé read-model | 3 | 4 | 4 | 48 | Élevé | Architecte Plateforme | Implémenter stale-but-available avec indicateur de fraîcheur explicite. | Basculer sur dernière projection valide et ouvrir incident P1. | Acceptable si disponibilité read-model >99.5% et fallback testé mensuellement. |
| U01 | UX | Surcharge cognitive du cockpit | 4 | 3 | 3 | 36 | Modéré | UX Lead | Appliquer composition par rôle et progressive disclosure. | Réduire la densité des widgets et prioriser alertes bloquantes. | Acceptable si TCD médian diminue d’au moins 30% vs baseline. |
| U02 | UX | États UI incomplets | 3 | 4 | 3 | 36 | Modéré | UX QA Lead | Checklist états obligatoires par widget critique. | Bloquer release UX tant que les états ne sont pas couverts. | Acceptable si 100% vues critiques couvrent les 4 états. |
| U03 | UX | Non-conformité accessibilité WCAG 2.2 AA | 3 | 5 | 4 | 60 | Critique | UX QA Lead | Intégrer audit a11y automatisé + revue manuelle avant gate UX. | Suspendre publication des vues non conformes et corriger priorité haute. | Acceptable si score a11y >= 85 et 0 blocker WCAG. |
| U04 | UX | Responsive dégradé sur tablettes/laptops denses | 3 | 3 | 3 | 27 | Surveillance | UX Lead | Définir breakpoints cibles et tests visuels systématiques. | Activer mode simplifié avec cartes prioritaires. | Acceptable si principaux workflows validés sur 3 classes d’écrans. |
| U05 | UX | Next Best Action non compréhensible | 4 | 3 | 3 | 36 | Modéré | PM Produit | Relier chaque recommandation à owner, preuve et commande/sous-tâche concrète. | Basculer en mode recommandations minimales guidées par checklist. | Acceptable si >70% des recommandations mènent à action effective. |
| U06 | UX | Fatigue de notifications | 4 | 4 | 3 | 48 | Élevé | Orchestrateur + UX Lead | Prioriser alertes, throttling par rôle et regroupement contextuel. | Activer profil d’alerte minimal en incident de saturation. | Acceptable si alertes critiques accusées en <10 min. |

## 6) Risques techniques détaillés

Nombre de risques dans ce domaine: **8**.
Chaque fiche ci-dessous est structurée pour décision immédiate (owner + mitigation + contingence + seuil).

### Risque T01 — Dérive de format markdown/frontmatter
- Domaine: Technique
- Scénario de défaillance: Les parseurs ne reconnaissent plus correctement sections et metadata, ce qui casse la traçabilité H01→H10.
- Déclencheur principal: Augmentation des `parse_error` après ajout de nouveaux gabarits documentaires.
- Probabilité: 4/5
- Impact: 5/5
- Détection (difficulté): 3/5
- Score d’exposition: 60 (Critique)
- Owner: Architecte Plateforme
- Dépendances critiques: D01, D06, D16
- Mitigation proactive: Versionner les schémas, ajouter tests de contrat documentaire et lint frontmatter en CI.
- Plan de contingence: Basculer sur parser de secours + marquer vues dégradées + ouvrir correction prioritaire.
- Seuil d’acceptation résiduelle: Acceptable si `m_artifact_parse_error_rate` < 2% et 0 rupture sur livrables critiques.
- Indicateurs de monitoring: m_artifact_parse_error_rate, m_index_worker_retry, m_artifact_staleness_seconds
- Impact direct H03: Oblige à cadrer explicitement le contrat documentaire dans le brief.
- Impact direct H04: NFR de robustesse parser et AC de conformité metadata.
- Impact direct H08: Décision d’architecture sur versioning de schéma + fallback parser.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque T02 — Absence de métadonnées obligatoires
- Domaine: Technique
- Scénario de défaillance: Des documents majeurs arrivent sans `stepsCompleted` ou `inputDocuments`, rendant impossible l’audit de provenance.
- Déclencheur principal: Hausse des warnings qualité sur les livrables planning H02/H03/H04.
- Probabilité: 4/5
- Impact: 4/5
- Détection (difficulté): 3/5
- Score d’exposition: 48 (Élevé)
- Owner: PM BMAD
- Dépendances critiques: D01, D02, D16
- Mitigation proactive: Refuser l’ingestion bloquante en dessous des champs minimaux et fournir un correctif guidé.
- Plan de contingence: Mettre le gate en CONCERNS, relancer mission de correction fichier-par-fichier.
- Seuil d’acceptation résiduelle: Acceptable si 100% des livrables H01→H10 portent metadata minimale.
- Indicateurs de monitoring: m_gate_concerns_resolution_time, m_handoff_rework_ratio, m_readiness_score
- Impact direct H03: Nécessite de fixer des templates obligatoires dès le Product Brief.
- Impact direct H04: Ajout d’AC explicites sur metadata et profondeur documentaire.
- Impact direct H08: Validation des contrats de données d’ingestion.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque T03 — Saturation de la file d’ingestion
- Domaine: Technique
- Scénario de défaillance: Les updates simultanées de nombreux artefacts créent un backlog qui retarde les vues décisionnelles.
- Déclencheur principal: `m_index_queue_depth` dépasse le seuil dynamique pendant >10 minutes.
- Probabilité: 3/5
- Impact: 4/5
- Détection (difficulté): 3/5
- Score d’exposition: 36 (Modéré)
- Owner: Architecte Plateforme
- Dépendances critiques: D06, D07, D10
- Mitigation proactive: Appliquer backpressure, prioriser jobs critiques et rendre les workers idempotents.
- Plan de contingence: Activer mode lecture stale + suspendre jobs non critiques jusqu’au retour nominal.
- Seuil d’acceptation résiduelle: Acceptable si p95 refresh delta < 5s et pas de perte d’événement.
- Indicateurs de monitoring: m_index_queue_depth, m_projection_rebuild_time, m_artifact_staleness_seconds
- Impact direct H03: Ajuste la promesse time-to-value en onboarding.
- Impact direct H04: NFR de capacité et SLO ingestion explicites.
- Impact direct H08: Choix queue/backoff/DLQ et sizing initial.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque T04 — Latence excessive sur projections critiques
- Domaine: Technique
- Scénario de défaillance: Pipeline Board et Gate Center deviennent lents, ce qui augmente le Time-to-confident-decision.
- Déclencheur principal: p95 des vues critiques >2.5s sur plusieurs cycles.
- Probabilité: 3/5
- Impact: 5/5
- Détection (difficulté): 4/5
- Score d’exposition: 60 (Critique)
- Owner: Architecte Plateforme
- Dépendances critiques: D06, D08, D11
- Mitigation proactive: Projections matérialisées, cache invalidation contrôlé, requêtes bornées par rôle.
- Plan de contingence: Désactiver widgets lourds, prioriser les signaux bloquants, lancer tuning urgence.
- Seuil d’acceptation résiduelle: Acceptable si SLO-01/SLO-02 tenus sur 2 semaines glissantes.
- Indicateurs de monitoring: m_user_action_to_decision_time, m_projection_rebuild_time, m_phase_transition_latency_ms
- Impact direct H03: Renforce la proposition de valeur centrée sur décision rapide.
- Impact direct H04: NFR de performance détaillés et mesurables.
- Impact direct H08: Décision de séparation read/write model et stratégie cache.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque T05 — Rupture des contrats front/back
- Domaine: Technique
- Scénario de défaillance: Le front consomme un schéma différent du back et affiche des statuts erronés ou incomplets.
- Déclencheur principal: Échecs répétés des tests de contrat API et anomalies UI non reproductibles.
- Probabilité: 3/5
- Impact: 5/5
- Détection (difficulté): 4/5
- Score d’exposition: 60 (Critique)
- Owner: Lead Engineering
- Dépendances critiques: D06, D13, D16
- Mitigation proactive: Versionner API, contract tests obligatoires et politique de dépréciation claire.
- Plan de contingence: Rollback version API, freeze des features et correctif de compatibilité.
- Seuil d’acceptation résiduelle: Acceptable si 0 breaking change non annoncé et 100% contract tests pass.
- Indicateurs de monitoring: m_gate_fail_rate, m_test_flakiness, m_search_zero_result_rate
- Impact direct H03: Impose une promesse réaliste sur évolutivité V1→V1.2.
- Impact direct H04: AC de compatibilité descendante et versioning obligatoire.
- Impact direct H08: Décision d’architecture API contract-first.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque T06 — Couplage excessif aux scripts legacy
- Domaine: Technique
- Scénario de défaillance: Le cockpit dépend de scripts historiques non homogènes et devient fragile aux changements locaux.
- Déclencheur principal: Hausse des erreurs après mises à jour de scripts sans contrat stable.
- Probabilité: 4/5
- Impact: 4/5
- Détection (difficulté): 3/5
- Score d’exposition: 48 (Élevé)
- Owner: Architecte Plateforme
- Dépendances critiques: D02, D03, D13
- Mitigation proactive: Introduire des adapters versionnés entre cockpit et scripts existants.
- Plan de contingence: Basculer en mode lecture seule + exécution manuelle contrôlée le temps d’aligner les adapters.
- Seuil d’acceptation résiduelle: Acceptable si >70% commandes passent par wrappers validés.
- Indicateurs de monitoring: m_command_success_rate, m_command_denied_rate, m_policy_override_count
- Impact direct H03: Clarifie le périmètre V1 réalisable avec existant.
- Impact direct H04: Exigence d’abstraction command adapters dans le PRD.
- Impact direct H08: Architecture d’intégration anti-couplage dur.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque T07 — Faux DONE via G4-UX mal câblé
- Domaine: Technique
- Scénario de défaillance: Des stories passent DONE techniquement alors que les écarts UX bloquants persistent.
- Déclencheur principal: Cas `G4-T=PASS` et `G4-UX=FAIL` non bloqués automatiquement.
- Probabilité: 3/5
- Impact: 5/5
- Détection (difficulté): 5/5
- Score d’exposition: 75 (Critique)
- Owner: TEA Lead + UX QA Lead
- Dépendances critiques: D05, D09, D16
- Mitigation proactive: Rendre G4 dual bloquant au niveau moteur de gate + tests E2E dédiés.
- Plan de contingence: Réouvrir stories affectées, geler release, appliquer correctif UX prioritaire.
- Seuil d’acceptation résiduelle: Acceptable si 0 faux DONE sur 2 sprints.
- Indicateurs de monitoring: m_ux_gate_block_count, m_ux_rework_after_done, m_gate_fail_rate
- Impact direct H03: Rappelle que la qualité UX est une contrainte produit de premier ordre.
- Impact direct H04: AC explicites sur G4 dual et états de blocage.
- Impact direct H08: Design du moteur de règles dual gate.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque T08 — Absence de mode dégradé read-model
- Domaine: Technique
- Scénario de défaillance: Une panne parser rend toute la vue indisponible, y compris pour les décisions urgentes.
- Déclencheur principal: Erreur critique ingestion sans fallback actif.
- Probabilité: 3/5
- Impact: 4/5
- Détection (difficulté): 4/5
- Score d’exposition: 48 (Élevé)
- Owner: Architecte Plateforme
- Dépendances critiques: D06, D07, D10
- Mitigation proactive: Implémenter stale-but-available avec indicateur de fraîcheur explicite.
- Plan de contingence: Basculer sur dernière projection valide et ouvrir incident P1.
- Seuil d’acceptation résiduelle: Acceptable si disponibilité read-model >99.5% et fallback testé mensuellement.
- Indicateurs de monitoring: m_artifact_staleness_seconds, m_projection_rebuild_time, m_incident_mtta
- Impact direct H03: Permet d’assumer une promesse de continuité de service.
- Impact direct H04: NFR de résilience et mode dégradé obligatoire.
- Impact direct H08: Architecture de fallback read-side.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.


## 7) Risques process et gouvernance détaillés

Nombre de risques dans ce domaine: **7**.
Chaque fiche ci-dessous est structurée pour décision immédiate (owner + mitigation + contingence + seuil).

### Risque P01 — Non-respect de l’ordre canonique H01→H23
- Domaine: Process
- Scénario de défaillance: Des équipes sautent des étapes, ce qui dégrade la cohérence des décisions aval.
- Déclencheur principal: Transitions de phase observées sans prérequis gate validés.
- Probabilité: 3/5
- Impact: 5/5
- Détection (difficulté): 4/5
- Score d’exposition: 60 (Critique)
- Owner: Orchestrateur BMAD
- Dépendances critiques: D02, D05, D16
- Mitigation proactive: Machine d’état stricte + phase guards automatisés.
- Plan de contingence: Retour à la phase précédente avec plan de correction et traçabilité.
- Seuil d’acceptation résiduelle: Acceptable si 0 transition illégitime sur phases 1→3.
- Indicateurs de monitoring: m_phase_transition_latency_ms, m_gate_fail_rate, m_handoff_rework_ratio
- Impact direct H03: Sécurise la continuité recherche → brief.
- Impact direct H04: Exige des prérequis de phase formalisés dans PRD.
- Impact direct H08: Architecture de state machine et policy engine.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque P02 — Handoffs incomplets ou ambigus
- Domaine: Process
- Scénario de défaillance: Les livrables passent sans objectif, contraintes ou schéma attendu clairement renseignés.
- Déclencheur principal: Augmentation des retours arrière entre Analyst, PM et Architecte.
- Probabilité: 4/5
- Impact: 4/5
- Détection (difficulté): 3/5
- Score d’exposition: 48 (Élevé)
- Owner: PM BMAD
- Dépendances critiques: D01, D16, D02
- Mitigation proactive: Contrat de handoff standard obligatoire et validé à l’entrée de chaque phase.
- Plan de contingence: Bloquer handoff, demander compléments ciblés, relancer seulement après validation.
- Seuil d’acceptation résiduelle: Acceptable si `m_handoff_rework_ratio` < 15%.
- Indicateurs de monitoring: m_handoff_rework_ratio, m_gate_concerns_resolution_time, m_readiness_score
- Impact direct H03: Améliore la qualité du Product Brief et réduit ambiguïtés.
- Impact direct H04: Introduit AC sur schéma de handoff vérifiable.
- Impact direct H08: Contrat inter-phases versionné.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque P03 — Notifications de phase manquantes
- Domaine: Process
- Scénario de défaillance: La progression réelle diverge de la progression communiquée, provoquant des décisions au mauvais moment.
- Déclencheur principal: Délai phase complete → notify > 30 min.
- Probabilité: 3/5
- Impact: 4/5
- Détection (difficulté): 3/5
- Score d’exposition: 36 (Modéré)
- Owner: Orchestrateur BMAD
- Dépendances critiques: D02, D10
- Mitigation proactive: Automatiser blocage de transition si notify absent.
- Plan de contingence: Notification corrective immédiate + audit de séquence.
- Seuil d’acceptation résiduelle: Acceptable si 100% phases notifiées dans les 5 minutes.
- Indicateurs de monitoring: m_notification_phase_delay, m_phase_transition_latency_ms, m_gate_fail_rate
- Impact direct H03: Réduit le risque de brief construit sur statut périmé.
- Impact direct H04: Inclut exigence de discipline notify dans le PRD process.
- Impact direct H08: Architecture d’événements de notification.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque P04 — RACI décisionnel flou
- Domaine: Process
- Scénario de défaillance: Les risques critiques restent sans propriétaire et les mitigations stagnent.
- Déclencheur principal: Items risque sans owner ou avec owner multiple contradictoire.
- Probabilité: 3/5
- Impact: 4/5
- Détection (difficulté): 4/5
- Score d’exposition: 48 (Élevé)
- Owner: PM + Orchestrateur
- Dépendances critiques: D15, D16
- Mitigation proactive: Rendre owner obligatoire dans tout registre de Risque.
- Plan de contingence: Escalade sponsor sous 24h pour arbitrage ownership.
- Seuil d’acceptation résiduelle: Acceptable si 100% des risques Élevés/Critiques ont owner nommé.
- Indicateurs de monitoring: m_policy_override_count, m_gate_concerns_resolution_time, m_readiness_score
- Impact direct H03: RACI explicite dans brief.
- Impact direct H04: Exigences de gouvernance et rôles signés.
- Impact direct H08: Décisions d’architecture alignées sur ownership.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque P05 — Actions de mitigation non fermées
- Domaine: Process
- Scénario de défaillance: Le registre des risques existe mais n’est pas opéré, ce qui crée une dette de sécurité et qualité.
- Déclencheur principal: Backlog de mitigation > 2 sprints sans clôture.
- Probabilité: 4/5
- Impact: 4/5
- Détection (difficulté): 3/5
- Score d’exposition: 48 (Élevé)
- Owner: SM + TEA
- Dépendances critiques: D10, D15, D16
- Mitigation proactive: Transformer chaque mitigation critique en tâche trackée avec échéance et preuve.
- Plan de contingence: Freeze de nouvelles features tant que backlog critique non réduit.
- Seuil d’acceptation résiduelle: Acceptable si >80% mitigations critiques fermées dans le sprint planifié.
- Indicateurs de monitoring: m_gate_concerns_resolution_time, m_gate_fail_rate, m_incident_mtta
- Impact direct H03: Priorise les risques qui bloquent la proposition de valeur.
- Impact direct H04: Ajout d’un flux de suivi mitigation dans PRD.
- Impact direct H08: Mécanisme de task linkage risque↔preuve.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque P06 — Contrôles ULTRA quality contournés
- Domaine: Process
- Scénario de défaillance: Des livrables sont déclarés prêts sans passer sequence-guard ni ultra-quality-check.
- Déclencheur principal: Absence de traces d’exécution des scripts de contrôle avant phase-complete.
- Probabilité: 3/5
- Impact: 5/5
- Détection (difficulté): 4/5
- Score d’exposition: 60 (Critique)
- Owner: Orchestrateur BMAD
- Dépendances critiques: D02, D05, D16
- Mitigation proactive: Rendre les checks bloquants et visibles dans Gate Center.
- Plan de contingence: Revalidation complète du lot documentaire avant reprise.
- Seuil d’acceptation résiduelle: Acceptable si 0 phase clôturée sans preuves de checks.
- Indicateurs de monitoring: m_gate_fail_rate, m_handoff_rework_ratio, m_phase_transition_latency_ms
- Impact direct H03: Garantit fiabilité du brief à partir d’inputs validés.
- Impact direct H04: Formalise les contrôles minimums pré-clôture.
- Impact direct H08: Intègre policy-as-code sur gates process.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque P07 — Erreur de contexte multi-projets
- Domaine: Process
- Scénario de défaillance: Une action est déclenchée sur le mauvais `active_project_root`, impactant un autre projet.
- Déclencheur principal: Commandes exécutées avec root ambigu ou non confirmé.
- Probabilité: 3/5
- Impact: 5/5
- Détection (difficulté): 4/5
- Score d’exposition: 60 (Critique)
- Owner: Orchestrateur + Admin Sécurité
- Dépendances critiques: D03, D04, D12
- Mitigation proactive: Signer chaque commande avec root actif et confirmation contextuelle.
- Plan de contingence: Stop immédiat, rollback ciblé, rapport d’incident.
- Seuil d’acceptation résiduelle: Acceptable si 0 incident cross-project sur commandes d’écriture.
- Indicateurs de monitoring: m_context_switch_error, m_command_denied_rate, m_policy_override_count
- Impact direct H03: Conditionne crédibilité de la valeur multi-projet.
- Impact direct H04: Exigence de guardrails de contexte dans PRD.
- Impact direct H08: Architecture de contexte signé et validation chemins.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.


## 8) Risques UX / Design / usage détaillés

Nombre de risques dans ce domaine: **6**.
Chaque fiche ci-dessous est structurée pour décision immédiate (owner + mitigation + contingence + seuil).

### Risque U01 — Surcharge cognitive du cockpit
- Domaine: UX
- Scénario de défaillance: Les utilisateurs ne savent pas quelle action prendre face à trop de signaux simultanés.
- Déclencheur principal: Temps moyen décision >5 min malgré données disponibles.
- Probabilité: 4/5
- Impact: 3/5
- Détection (difficulté): 3/5
- Score d’exposition: 36 (Modéré)
- Owner: UX Lead
- Dépendances critiques: D09, D15, D16
- Mitigation proactive: Appliquer composition par rôle et progressive disclosure.
- Plan de contingence: Réduire la densité des widgets et prioriser alertes bloquantes.
- Seuil d’acceptation résiduelle: Acceptable si TCD médian diminue d’au moins 30% vs baseline.
- Indicateurs de monitoring: m_user_action_to_decision_time, m_search_zero_result_rate, m_readiness_score
- Impact direct H03: Confirme proposition de valeur orientée décision.
- Impact direct H04: FR/AC sur parcours décisionnels courts.
- Impact direct H08: Architecture UI role-centric.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque U02 — États UI incomplets
- Domaine: UX
- Scénario de défaillance: Absence ou incohérence des états loading/empty/error/success crée des malentendus sur le statut réel.
- Déclencheur principal: Incidents où utilisateur interprète une panne comme un succès.
- Probabilité: 3/5
- Impact: 4/5
- Détection (difficulté): 3/5
- Score d’exposition: 36 (Modéré)
- Owner: UX QA Lead
- Dépendances critiques: D09, D05
- Mitigation proactive: Checklist états obligatoires par widget critique.
- Plan de contingence: Bloquer release UX tant que les états ne sont pas couverts.
- Seuil d’acceptation résiduelle: Acceptable si 100% vues critiques couvrent les 4 états.
- Indicateurs de monitoring: m_ux_rework_after_done, m_gate_fail_rate, m_search_zero_result_rate
- Impact direct H03: Clarifie attentes d’expérience dans brief.
- Impact direct H04: AC détaillés sur états UI par fonctionnalité.
- Impact direct H08: Composants d’état centralisés.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque U03 — Non-conformité accessibilité WCAG 2.2 AA
- Domaine: UX
- Scénario de défaillance: Le produit exclut des profils utilisateurs et expose un risque réputationnel/conformité.
- Déclencheur principal: Échecs audit clavier/contraste/focus sur flux critiques.
- Probabilité: 3/5
- Impact: 5/5
- Détection (difficulté): 4/5
- Score d’exposition: 60 (Critique)
- Owner: UX QA Lead
- Dépendances critiques: D09, D10, D16
- Mitigation proactive: Intégrer audit a11y automatisé + revue manuelle avant gate UX.
- Plan de contingence: Suspendre publication des vues non conformes et corriger priorité haute.
- Seuil d’acceptation résiduelle: Acceptable si score a11y >= 85 et 0 blocker WCAG.
- Indicateurs de monitoring: m_aqcd_design, m_ux_gate_block_count, m_ux_rework_after_done
- Impact direct H03: Rend explicite l’engagement qualité UX.
- Impact direct H04: NFR accessibilité mesurables.
- Impact direct H08: Architecture composants accessible-by-default.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque U04 — Responsive dégradé sur tablettes/laptops denses
- Domaine: UX
- Scénario de défaillance: Les vues critiques deviennent illisibles hors desktop standard, réduisant adoption réelle.
- Déclencheur principal: Taux d’abandon plus élevé sur viewports intermédiaires.
- Probabilité: 3/5
- Impact: 3/5
- Détection (difficulté): 3/5
- Score d’exposition: 27 (Surveillance)
- Owner: UX Lead
- Dépendances critiques: D09, D15
- Mitigation proactive: Définir breakpoints cibles et tests visuels systématiques.
- Plan de contingence: Activer mode simplifié avec cartes prioritaires.
- Seuil d’acceptation résiduelle: Acceptable si principaux workflows validés sur 3 classes d’écrans.
- Indicateurs de monitoring: m_search_zero_result_rate, m_user_action_to_decision_time, m_aqcd_design
- Impact direct H03: Impacte priorisation des personas et contextes d’usage.
- Impact direct H04: Exigences responsive par écran critique.
- Impact direct H08: Architecture UI adaptive.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque U05 — Next Best Action non compréhensible
- Domaine: UX
- Scénario de défaillance: Les recommandations existent mais restent trop abstraites pour être exécutées rapidement.
- Déclencheur principal: Faible taux d’action après affichage recommandation.
- Probabilité: 4/5
- Impact: 3/5
- Détection (difficulté): 3/5
- Score d’exposition: 36 (Modéré)
- Owner: PM Produit
- Dépendances critiques: D08, D15, D16
- Mitigation proactive: Relier chaque recommandation à owner, preuve et commande/sous-tâche concrète.
- Plan de contingence: Basculer en mode recommandations minimales guidées par checklist.
- Seuil d’acceptation résiduelle: Acceptable si >70% des recommandations mènent à action effective.
- Indicateurs de monitoring: m_user_action_to_decision_time, m_readiness_score, m_gate_concerns_resolution_time
- Impact direct H03: Renforce la valeur différenciante du cockpit.
- Impact direct H04: AC sur actionnabilité des recommandations.
- Impact direct H08: Moteur de recommandation explicable.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque U06 — Fatigue de notifications
- Domaine: UX
- Scénario de défaillance: Le bruit d’alertes entraîne l’ignorance de signaux réellement critiques.
- Déclencheur principal: Taux d’alertes non lues/ignorées > 30%.
- Probabilité: 4/5
- Impact: 4/5
- Détection (difficulté): 3/5
- Score d’exposition: 48 (Élevé)
- Owner: Orchestrateur + UX Lead
- Dépendances critiques: D08, D10, D15
- Mitigation proactive: Prioriser alertes, throttling par rôle et regroupement contextuel.
- Plan de contingence: Activer profil d’alerte minimal en incident de saturation.
- Seuil d’acceptation résiduelle: Acceptable si alertes critiques accusées en <10 min.
- Indicateurs de monitoring: m_incident_mtta, m_notification_phase_delay, m_policy_override_count
- Impact direct H03: Cadre la proposition de valeur “signal utile, pas bruit”.
- Impact direct H04: Spécifie règles d’alerte et priorisation.
- Impact direct H08: Architecture eventing + policy d’alerte.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.


## 9) Risques sécurité, conformité et audit détaillés

Nombre de risques dans ce domaine: **8**.
Chaque fiche ci-dessous est structurée pour décision immédiate (owner + mitigation + contingence + seuil).

### Risque S01 — Commande destructive sur mauvais projet
- Domaine: Sécurité
- Scénario de défaillance: Une commande d’écriture est lancée avec le mauvais contexte, causant perte ou corruption d’artefacts.
- Déclencheur principal: Exécution sans confirmation contextualisée du `active_project_root`.
- Probabilité: 3/5
- Impact: 5/5
- Détection (difficulté): 5/5
- Score d’exposition: 75 (Critique)
- Owner: Admin Sécurité
- Dépendances critiques: D03, D04, D12
- Mitigation proactive: Double validation + root signé + dry-run obligatoire pour opérations sensibles.
- Plan de contingence: Kill-switch command broker, restauration depuis sauvegarde, post-mortem.
- Seuil d’acceptation résiduelle: Acceptable si 0 exécution destructive hors contexte confirmé.
- Indicateurs de monitoring: m_context_switch_error, m_command_denied_rate, m_policy_override_count
- Impact direct H03: Conditionne la confiance du segment cible.
- Impact direct H04: Exigence de sécurité bloquante sur commandes.
- Impact direct H08: Architecture zero-trust du broker.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque S02 — Injection d’arguments shell
- Domaine: Sécurité
- Scénario de défaillance: Des paramètres non contrôlés permettent une commande non prévue.
- Déclencheur principal: Entrées libres concaténées dans le shell sans validation stricte.
- Probabilité: 3/5
- Impact: 5/5
- Détection (difficulté): 4/5
- Score d’exposition: 60 (Critique)
- Owner: Security Engineer
- Dépendances critiques: D03, D04, D10
- Mitigation proactive: Templates de commande et arguments structurés; interdiction concaténation libre.
- Plan de contingence: Bloquer endpoint concerné, rotation secrets, revue forensic.
- Seuil d’acceptation résiduelle: Acceptable si tests d’injection passent à 100%.
- Indicateurs de monitoring: m_command_denied_rate, m_security_high_findings, m_policy_override_count
- Impact direct H03: Renforce message sécurité by-design.
- Impact direct H04: NFR sécurité d’input validation.
- Impact direct H08: Conception runner isolé et sandbox logique.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque S03 — RBAC trop permissif
- Domaine: Sécurité
- Scénario de défaillance: Des rôles non autorisés déclenchent des actions critiques, créant un risque d’escalade interne.
- Déclencheur principal: Overrides fréquents et permissions non revues.
- Probabilité: 4/5
- Impact: 5/5
- Détection (difficulté): 4/5
- Score d’exposition: 80 (Critique)
- Owner: Admin Sécurité + Orchestrateur
- Dépendances critiques: D04, D10, D16
- Mitigation proactive: RBAC minimal, revues hebdo, séparation des devoirs, policy-as-code testée.
- Plan de contingence: Réduction immédiate des droits à lecture seule + audit complet.
- Seuil d’acceptation résiduelle: Acceptable si 0 action critique hors rôle autorisé.
- Indicateurs de monitoring: m_policy_override_count, m_command_denied_rate, m_security_high_findings
- Impact direct H03: Impact direct sur faisabilité segment enterprise/agency.
- Impact direct H04: Exigence RBAC explicite dès V1.
- Impact direct H08: Architecture IAM/policy engine.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque S04 — Journal d’audit altérable
- Domaine: Sécurité
- Scénario de défaillance: L’absence d’immutabilité rend la preuve non fiable en audit interne/externe.
- Déclencheur principal: Possibilité de modifier/supprimer des logs sans trace.
- Probabilité: 2/5
- Impact: 5/5
- Détection (difficulté): 5/5
- Score d’exposition: 50 (Élevé)
- Owner: Security Engineer
- Dépendances critiques: D07, D10, D14
- Mitigation proactive: Ledger append-only signé et contrôles d’intégrité périodiques.
- Plan de contingence: Basculer en mode investigation, geler opérations sensibles.
- Seuil d’acceptation résiduelle: Acceptable si 100% des logs critiques sont immuables et vérifiables.
- Indicateurs de monitoring: m_bundle_export_success, m_policy_override_count, m_security_high_findings
- Impact direct H03: Soutient promesse de preuve audit.
- Impact direct H04: NFR auditabilité inviolable.
- Impact direct H08: Architecture ledger + signature.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque S05 — Fuite de secrets dans les logs
- Domaine: Sécurité
- Scénario de défaillance: Des tokens/identifiants se retrouvent dans traces ou exports et exposent l’environnement.
- Déclencheur principal: Scans secrets positifs dans logs de commande ou bundles.
- Probabilité: 3/5
- Impact: 5/5
- Détection (difficulté): 4/5
- Score d’exposition: 60 (Critique)
- Owner: Security Engineer
- Dépendances critiques: D03, D07, D12
- Mitigation proactive: Redaction automatique + scans secrets post-run + politique de masquage stricte.
- Plan de contingence: Rotation immédiate des secrets compromis et purge contrôlée.
- Seuil d’acceptation résiduelle: Acceptable si 0 secret exposé dans sorties persistées.
- Indicateurs de monitoring: m_security_high_findings, m_bundle_export_success, m_command_success_rate
- Impact direct H03: Objection sécurité levée plus tôt en discovery.
- Impact direct H04: Exigences de redaction et secret scanning.
- Impact direct H08: Architecture logs sécurisés et classification données.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque S06 — Exfiltration via export de bundles
- Domaine: Sécurité
- Scénario de défaillance: Les bundles de preuve contiennent des données sensibles non filtrées.
- Déclencheur principal: Exports réalisés sans politique de périmètre/masquage.
- Probabilité: 3/5
- Impact: 4/5
- Détection (difficulté): 4/5
- Score d’exposition: 48 (Élevé)
- Owner: Security Engineer + TEA
- Dépendances critiques: D07, D14, D16
- Mitigation proactive: Filtrage par rôle, watermark et classification des données exportables.
- Plan de contingence: Désactiver temporairement exports externes et réviser templates.
- Seuil d’acceptation résiduelle: Acceptable si 100% des exports critiques passent validation sécurité.
- Indicateurs de monitoring: m_bundle_export_success, m_bundle_generation_time, m_security_high_findings
- Impact direct H03: Clarifie valeur audit sans exposer données.
- Impact direct H04: FR de contrôle d’export par rôle.
- Impact direct H08: Service d’export sécurisé et traçable.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque S07 — Non-révocation des accès
- Domaine: Sécurité
- Scénario de défaillance: Les droits persistent après changement de rôle ou départ, augmentant le risque d’abus.
- Déclencheur principal: Comptes inactifs avec permissions d’écriture conservées.
- Probabilité: 3/5
- Impact: 4/5
- Détection (difficulté): 4/5
- Score d’exposition: 48 (Élevé)
- Owner: Admin Sécurité
- Dépendances critiques: D04, D10, D12
- Mitigation proactive: Processus JML (joiner/mover/leaver) automatisé et audit mensuel des droits.
- Plan de contingence: Révocation massive + revue manuelle post-incident.
- Seuil d’acceptation résiduelle: Acceptable si délai de révocation <24h pour tout changement de rôle.
- Indicateurs de monitoring: m_policy_override_count, m_command_denied_rate, m_security_high_findings
- Impact direct H03: Réduit objections sécurité dans segment enterprise.
- Impact direct H04: Exigences IAM opérationnelles.
- Impact direct H08: Architecture de provisioning/révocation.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque S08 — Non-conformité conservation/suppression
- Domaine: Sécurité
- Scénario de défaillance: La rétention des artefacts et logs ne respecte pas les obligations contractuelles ou réglementaires.
- Déclencheur principal: Absence de politique de cycle de vie des données ou exceptions non tracées.
- Probabilité: 3/5
- Impact: 5/5
- Détection (difficulté): 4/5
- Score d’exposition: 60 (Critique)
- Owner: DPO / Security Lead
- Dépendances critiques: D07, D14, D16
- Mitigation proactive: Définir règles de rétention par type d’artefact et automatiser purge contrôlée.
- Plan de contingence: Geler exports externes et lancer plan de conformité accéléré.
- Seuil d’acceptation résiduelle: Acceptable si 100% types de données couverts par politique validée.
- Indicateurs de monitoring: m_bundle_export_success, m_policy_override_count, m_security_high_findings
- Impact direct H03: Conditionne qualification des prospects sensibles.
- Impact direct H04: NFR conformité documentaire et logs.
- Impact direct H08: Architecture de rétention/purge et audit.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.


## 10) Risques coût, capacité et FinOps détaillés

Nombre de risques dans ce domaine: **5**.
Chaque fiche ci-dessous est structurée pour décision immédiate (owner + mitigation + contingence + seuil).

### Risque C01 — Explosion des coûts token
- Domaine: Coût
- Scénario de défaillance: Retries, prompts surdimensionnés et duplication d’analyses dégradent l’efficience coût.
- Déclencheur principal: `C2 waste ratio` > 25% sur 2 cycles consécutifs.
- Probabilité: 4/5
- Impact: 4/5
- Détection (difficulté): 3/5
- Score d’exposition: 48 (Élevé)
- Owner: Ops Manager / FinOps
- Dépendances critiques: D08, D11, D15
- Mitigation proactive: Budgets par phase, alertes de dérive et optimisation routing modèle.
- Plan de contingence: Réduire concurrence agents et limiter runs non prioritaires.
- Seuil d’acceptation résiduelle: Acceptable si score Efficience_Coût >= 70.
- Indicateurs de monitoring: m_aqcd_cost, m_command_success_rate, m_phase_transition_latency_ms
- Impact direct H03: Influence packaging/pricing narratif.
- Impact direct H04: NFR FinOps et observabilité coûts.
- Impact direct H08: Architecture telemetry coûts par flux.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque C02 — Surcoût stockage ledger/projections
- Domaine: Coût
- Scénario de défaillance: Rétention non optimisée augmente coûts infra sans bénéfice décisionnel équivalent.
- Déclencheur principal: Croissance volume > prévision capacity planning.
- Probabilité: 3/5
- Impact: 3/5
- Détection (difficulté): 3/5
- Score d’exposition: 27 (Surveillance)
- Owner: Architecte Plateforme
- Dépendances critiques: D07, D11, D14
- Mitigation proactive: Politiques de tiering, compression et archivage par criticité.
- Plan de contingence: Purge contrôlée des données à faible valeur.
- Seuil d’acceptation résiduelle: Acceptable si coût stockage par projet reste dans budget trimestriel.
- Indicateurs de monitoring: m_projection_rebuild_time, m_bundle_generation_time, m_aqcd_cost
- Impact direct H03: Ajuste hypothèses de modèle économique.
- Impact direct H04: NFR de conservation différentielle.
- Impact direct H08: Décision persistance chaude/froide.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque C03 — Sous-estimation des coûts d’intégration
- Domaine: Coût
- Scénario de défaillance: Les connecteurs externes demandent plus d’effort que prévu et décalent roadmap.
- Déclencheur principal: Slippage répété sur tâches connecteurs Jira/Notion/CI.
- Probabilité: 3/5
- Impact: 4/5
- Détection (difficulté): 3/5
- Score d’exposition: 36 (Modéré)
- Owner: PM Produit
- Dépendances critiques: D13, D15, D16
- Mitigation proactive: Prioriser 1-2 connecteurs stratégiques en V1 et standardiser contrats.
- Plan de contingence: Reporter intégrations non essentielles en V1.1.
- Seuil d’acceptation résiduelle: Acceptable si capacité sprint absorbable sans impacter noyau Gate/Evidence.
- Indicateurs de monitoring: m_gate_concerns_resolution_time, m_handoff_rework_ratio, m_aqcd_cost
- Impact direct H03: Évite promesses trop larges en brief.
- Impact direct H04: Scope PRD borné sur intégrations prioritaires.
- Impact direct H08: Architecture connecteurs découplés.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque C04 — Coût support onboarding supérieur au plan
- Domaine: Coût
- Scénario de défaillance: Le produit nécessite trop d’accompagnement humain pour être adopté.
- Déclencheur principal: Temps onboarding > cible et tickets d’aide récurrents.
- Probabilité: 3/5
- Impact: 3/5
- Détection (difficulté): 3/5
- Score d’exposition: 27 (Surveillance)
- Owner: Customer Success / PM
- Dépendances critiques: D15, D08
- Mitigation proactive: Templates par rôle, parcours guidés, documentation orientée tâches.
- Plan de contingence: Offrir mode lecture seule initial + sessions de formation ciblées.
- Seuil d’acceptation résiduelle: Acceptable si time-to-first-value < 14 jours pour segment S3.
- Indicateurs de monitoring: m_user_action_to_decision_time, m_search_zero_result_rate, m_aqcd_cost
- Impact direct H03: Ajuste ICP et promesse de déploiement.
- Impact direct H04: FR d’onboarding et doc embarquée.
- Impact direct H08: Architecture d’aide contextuelle.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque C05 — Coût de rework UX après validation tardive
- Domaine: Coût
- Scénario de défaillance: La détection tardive d’écarts UX augmente les coûts de correction.
- Déclencheur principal: Taux de rework UX post-DONE en hausse.
- Probabilité: 4/5
- Impact: 4/5
- Détection (difficulté): 3/5
- Score d’exposition: 48 (Élevé)
- Owner: UX QA Lead + TEA
- Dépendances critiques: D05, D09, D10
- Mitigation proactive: Faire intervenir UX QA plus tôt et bloquer strictement G4-UX.
- Plan de contingence: Plan de remédiation UX sprint dédié.
- Seuil d’acceptation résiduelle: Acceptable si rework UX post-DONE tend vers 0.
- Indicateurs de monitoring: m_ux_rework_after_done, m_ux_gate_block_count, m_aqcd_design
- Impact direct H03: Renforce argument “prévenir le rework”.
- Impact direct H04: AC UX gate-first explicites.
- Impact direct H08: Chaînage UX evidence dans architecture.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.


## 11) Risques marché et adoption détaillés

Nombre de risques dans ce domaine: **8**.
Chaque fiche ci-dessous est structurée pour décision immédiate (owner + mitigation + contingence + seuil).

### Risque M01 — Confusion de catégorie produit
- Domaine: Adoption
- Scénario de défaillance: OpenClaw est perçu comme un dashboard générique et non comme une tour de contrôle décisionnelle.
- Déclencheur principal: Retours prospects: “ça ressemble à notre outil existant”.
- Probabilité: 4/5
- Impact: 4/5
- Détection (difficulté): 3/5
- Score d’exposition: 48 (Élevé)
- Owner: PMM / PM Produit
- Dépendances critiques: D08, D15, D16
- Mitigation proactive: Message centré TCD, dual gate et evidence graph.
- Plan de contingence: Repositionner narratif et démonstrations sur cas de décision réels.
- Seuil d’acceptation résiduelle: Acceptable si >65% prospects comprennent la différenciation en démo.
- Indicateurs de monitoring: m_tcd_reduction_pct, m_adoption_activation_rate, m_search_zero_result_rate
- Impact direct H03: Décision de positionnement centrale du brief.
- Impact direct H04: Exigences produit alignées avec message différenciant.
- Impact direct H08: Architecture priorisant evidence + action.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque M02 — ROI TCD non démontré
- Domaine: Adoption
- Scénario de défaillance: Sans baseline et mesure après déploiement, la valeur business reste contestable.
- Déclencheur principal: Absence d’indicateur avant/après sur temps de décision.
- Probabilité: 4/5
- Impact: 5/5
- Détection (difficulté): 3/5
- Score d’exposition: 60 (Critique)
- Owner: PM Produit
- Dépendances critiques: D08, D11, D15
- Mitigation proactive: Mesurer baseline TCD dès POC et instrumenter gain mensuel.
- Plan de contingence: Focus sur quick wins mesurables (Gate Center, Evidence links).
- Seuil d’acceptation résiduelle: Acceptable si réduction TCD >= 30% sur pilote cible.
- Indicateurs de monitoring: m_tcd_reduction_pct, m_user_action_to_decision_time, m_gate_concerns_resolution_time
- Impact direct H03: North Star Metric confirmée.
- Impact direct H04: Instrumentation KPI obligatoire dans PRD.
- Impact direct H08: Architecture analytics dédiée TCD.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque M03 — Résistance au changement de stack
- Domaine: Adoption
- Scénario de défaillance: Les équipes refusent un remplacement outillage et bloquent l’adoption.
- Déclencheur principal: Objections répétées sur migration/rip-and-replace.
- Probabilité: 4/5
- Impact: 4/5
- Détection (difficulté): 3/5
- Score d’exposition: 48 (Élevé)
- Owner: PMM + Sales Engineering
- Dépendances critiques: D13, D15, D12
- Mitigation proactive: Positionner OpenClaw en surcouche intégrable à la stack existante.
- Plan de contingence: Prioriser connecteurs et mode read-only d’amorçage.
- Seuil d’acceptation résiduelle: Acceptable si >70% pilotes démarrent sans migration complète.
- Indicateurs de monitoring: m_adoption_activation_rate, m_bundle_export_success, m_tcd_reduction_pct
- Impact direct H03: Ajuste stratégie de go-to-market.
- Impact direct H04: FR d’intégration prioritaire.
- Impact direct H08: Architecture connecteurs et importeurs.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque M04 — Scope inflation en V1
- Domaine: Adoption
- Scénario de défaillance: La roadmap absorbe des fonctionnalités non essentielles, retardant la valeur cœur.
- Déclencheur principal: Ajouts successifs hors périmètre validé TCD/Gate/Evidence.
- Probabilité: 4/5
- Impact: 4/5
- Détection (difficulté): 2/5
- Score d’exposition: 32 (Modéré)
- Owner: PM Produit
- Dépendances critiques: D15, D16, D11
- Mitigation proactive: Cadre anti-scope documenté et gouverné par objectifs mesurables.
- Plan de contingence: Rebaseliner roadmap et décaler éléments V1.1/V1.2.
- Seuil d’acceptation résiduelle: Acceptable si >80% capacité sprint sur noyau différenciant.
- Indicateurs de monitoring: m_gate_concerns_resolution_time, m_handoff_rework_ratio, m_aqcd_cost
- Impact direct H03: Décisions de scope explicites.
- Impact direct H04: Priorisation FR/NFR stricte.
- Impact direct H08: Architecture modulaire pour différer extras.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque M05 — Cycle de vente enterprise trop long
- Domaine: Adoption
- Scénario de défaillance: Les exigences sécurité/compliance rallongent fortement la conversion.
- Déclencheur principal: Pipelines commerciaux bloqués sur questions self-host et audit.
- Probabilité: 3/5
- Impact: 4/5
- Détection (difficulté): 4/5
- Score d’exposition: 48 (Élevé)
- Owner: Sales + Security Lead
- Dépendances critiques: D12, D14, D16
- Mitigation proactive: Préparer packs preuve sécurité/compliance standardisés.
- Plan de contingence: Cibler d’abord segment mid-market S3/S6.
- Seuil d’acceptation résiduelle: Acceptable si délai de qualification reste compatible runway commercial.
- Indicateurs de monitoring: m_bundle_export_success, m_security_high_findings, m_adoption_activation_rate
- Impact direct H03: Ajuste ICP de lancement.
- Impact direct H04: Ajout d’exigences de preuve audit exportable.
- Impact direct H08: Architecture prête pour self-host sécurisé.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque M06 — Dépendance excessive à la niche BMAD
- Domaine: Adoption
- Scénario de défaillance: Le marché adressable se restreint si la proposition n’est pas formulée en langage plus universel.
- Déclencheur principal: Difficulté à convaincre équipes non familières BMAD.
- Probabilité: 3/5
- Impact: 3/5
- Détection (difficulté): 3/5
- Score d’exposition: 27 (Surveillance)
- Owner: PMM
- Dépendances critiques: D15, D13
- Mitigation proactive: Abstraction narrative “phase-gate-evidence” au-delà du jargon BMAD.
- Plan de contingence: Créer templates sectoriels avec nomenclature adaptable.
- Seuil d’acceptation résiduelle: Acceptable si compréhension du message >70% hors public BMAD natif.
- Indicateurs de monitoring: m_adoption_activation_rate, m_tcd_reduction_pct, m_search_zero_result_rate
- Impact direct H03: Travail de wording proposition de valeur.
- Impact direct H04: FR de personnalisation taxonomie.
- Impact direct H08: Architecture de configuration terminologique.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque M07 — Retard self-host readiness
- Domaine: Adoption
- Scénario de défaillance: Les prospects sécurité-first abandonnent faute de trajectoire self-host crédible.
- Déclencheur principal: Objection répétée sur hébergement et contrôle des données.
- Probabilité: 3/5
- Impact: 5/5
- Détection (difficulté): 4/5
- Score d’exposition: 60 (Critique)
- Owner: Architecte + Security Lead
- Dépendances critiques: D12, D14, D16
- Mitigation proactive: Planifier dès H08 les prérequis self-host et packaging reproductible.
- Plan de contingence: Proposer mode hybride transitoire et roadmap contractualisée.
- Seuil d’acceptation résiduelle: Acceptable si plan self-host daté et vérifiable existe avant GA.
- Indicateurs de monitoring: m_security_high_findings, m_bundle_export_success, m_adoption_activation_rate
- Impact direct H03: Impacte choix segment prioritaire.
- Impact direct H04: NFR sécurité/hébergement explicités.
- Impact direct H08: Architecture déployable on-prem.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

### Risque M08 — Lisibilité AQCD insuffisante pour sponsor
- Domaine: Adoption
- Scénario de défaillance: Les décideurs non techniques ne comprennent pas les signaux AQCD et freinent les arbitrages.
- Déclencheur principal: Décisions reportées faute de confiance dans les indicateurs.
- Probabilité: 3/5
- Impact: 4/5
- Détection (difficulté): 3/5
- Score d’exposition: 36 (Modéré)
- Owner: PM Produit + Ops Manager
- Dépendances critiques: D08, D15, D16
- Mitigation proactive: Créer vues executive simplifiées avec explication de formule et implications.
- Plan de contingence: Mettre en place revue manuelle hebdo sponsor jusqu’à stabilisation.
- Seuil d’acceptation résiduelle: Acceptable si compréhension sponsor >=80% sur dashboard exécutif.
- Indicateurs de monitoring: m_aqcd_autonomy, m_aqcd_quality, m_aqcd_cost, m_aqcd_design
- Impact direct H03: Guide la section KPI et gouvernance du brief.
- Impact direct H04: Exigences d’ergonomie décisionnelle des métriques.
- Impact direct H08: Architecture de projections AQCD lisibles.
- Décision immédiate recommandée: vérifier owner + date cible + preuve attendue au prochain point de gouvernance.

## 12) Plan de monitoring opérationnel (indicateurs, seuils, escalade)

Le monitoring doit rester orienté action; chaque métrique ci-dessous a un seuil et une réponse attendue.

| Métrique | Risques reliés | Seuil/objectif | Fréquence | Owner | Réponse attendue |
|---|---|---|---|---|---|
| m_phase_transition_latency_ms | P01,P03,T04 | médiane < 30000 | 5 min | Orchestrateur | Analyser blocage phase + ouvrir action corrective |
| m_gate_fail_rate | T07,P01,P06 | < 10% (hors incident) | quotidien | TEA | Revue des causes + mitigation prioritaire |
| m_gate_concerns_resolution_time | P02,P05,M04 | < 24h sur planning | quotidien | PM | Escalade owner si dépassement |
| m_handoff_rework_ratio | P02,P06,T02 | < 15% | hebdo | PM | Révision des contrats de handoff |
| m_artifact_parse_error_rate | T01,T02,T08 | < 2% | 5 min | Architecte | Basculer parser safe mode |
| m_artifact_staleness_seconds | T03,T08 | < 120s | 5 min | Architecte | Vérifier queue et projections |
| m_index_queue_depth | T03 | < seuil dynamique | 1 min | Architecte | Activer backpressure |
| m_index_worker_retry | T01,T03 | pas de pic anormal | 5 min | Architecte | Analyser drift format |
| m_projection_rebuild_time | T03,T04,C02 | < 60s | 5 min | Architecte | Optimiser projection et cache |
| m_command_success_rate | T06,C01 | > 95% | quotidien | Ops | Revue incidents commandes |
| m_command_denied_rate | S01,S02,S03 | pics justifiés | quotidien | Security | Vérifier tentatives hors policy |
| m_policy_override_count | S03,S07,P04 | tendre vers 0 | hebdo | Security | Audit des overrides et permissions |
| m_context_switch_error | P07,S01 | 0 toléré en écriture | temps réel | Orchestrateur | Stop commande + incident |
| m_security_high_findings | S02,S05,S08 | 0 en release candidate | quotidien | Security | Bloquer release et corriger |
| m_bundle_export_success | S04,S06,M05 | > 98% | quotidien | TEA | Analyser échecs export |
| m_bundle_generation_time | S06,C02 | p95 < 10s | quotidien | Architecte | Optimiser service export |
| m_incident_mtta | U06,S01,S03 | < 10 min critique | temps réel | On-call | Escalade immédiate |
| m_ux_gate_block_count | T07,U03,C05 | suivi tendance | quotidien | UX QA | Prioriser corrections UX |
| m_ux_rework_after_done | T07,U02,C05 | tendre vers 0 | hebdo | UX QA | Revoir DoD UX |
| m_aqcd_design | U03,U04,U06 | >= 80 | hebdo | UX Lead | Plan correctif design |
| m_aqcd_quality | P06,T05 | >= 80 | hebdo | TEA | Renforcer quality gates |
| m_aqcd_cost | C01,C02,C03 | >= 70 | hebdo | FinOps | Réduire waste et ajuster routage |
| m_aqcd_autonomy | P01,P05 | >= 70 | hebdo | Orchestrateur | Limiter autonomie si dérive |
| m_readiness_score | T04,P02,U05 | alerte si < 65 | avant gate | PM/Architecte | Mitiger avant passage de gate |
| m_search_zero_result_rate | U01,U04,M08 | < 20% | hebdo | UX Lead | Améliorer indexation et taxonomie |
| m_user_action_to_decision_time | U01,U05,M02 | réduction continue | hebdo | PM | Revoir parcours décision |
| m_notification_phase_delay | P03,U06 | < 5 min | quotidien | Orchestrateur | Rétablir discipline notify |
| m_tcd_reduction_pct | M01,M02 | >= 30% sur pilote | mensuel | PM | Ajuster proposition valeur/feature |
| m_adoption_activation_rate | M03,M06,M07 | >= 60% sur pilotes | mensuel | PMM | Renforcer onboarding et intégrations |
| m_gate_fail_rate_g3 | T05,M07 | < 15% | par release | Architecte | Réaligner H04/H08 avant implémentation |

Règles d’escalade monitoring:
- 1 alerte critique non acquittée >10 min => escalade Orchestrateur + Security/TEA selon domaine.
- 2 cycles consécutifs sous seuil AQCD qualité ou design => activation kill-switch autonomie partielle.
- 1 incident sécurité majeur (S01/S02/S03/S05) => freeze des commandes d’écriture jusqu’au correctif.
- 3 dépassements SLO latence d’affilée => bascule mode dégradé + plan de capacité sous 24h.

## 13) Plan de mitigation et contingence 30/60/90 jours

| Horizon | Objectif | Risques ciblés | Livrables attendus | Owner principal | Critère de réussite |
|---|---|---|---|---|---|
| J+30 | Stabiliser sécurité commandes | S01,S02,S03,S05,P07 | RBAC v1, allowlist, dry-run obligatoire, audit trail signé | Security Lead | 0 commande critique hors policy |
| J+30 | Sécuriser dual gate | T07,U02,U03,C05 | Règles G4-T/G4-UX bloquantes + tests E2E | TEA + UX QA | 0 faux DONE |
| J+30 | Assainir qualité documentaire | T01,T02,P02,P06 | Templates + lint metadata + contrôles CI | PM BMAD | 100% livrables conformes metadata |
| J+30 | Mesurer baseline ROI | M02,U01,U05 | Instrument TCD baseline + dashboard KPI | PM Produit | Baseline validée et partagée |
| J+60 | Renforcer résilience ingestion | T03,T04,T08,C02 | Backpressure, DLQ, stale mode testé | Architecte | SLO latence et disponibilité tenus |
| J+60 | Réduire dette process | P01,P03,P04,P05 | RACI final, discipline notify, backlog mitigation piloté | Orchestrateur | Retours arrière phase <15% |
| J+60 | Améliorer adoption UX | U01,U04,U06,M08 | Vues par rôle, alerting priorisé, glossaire contextuel | UX Lead | TCD en baisse, satisfaction en hausse |
| J+60 | Maitriser coûts | C01,C03,C04 | Cadre FinOps et budgets phase | Ops Manager | AQCD cost >=70 |
| J+90 | Préparer self-host crédible | M05,M07,S08 | Pack self-host + politique rétention validée | Architecte + Security | Objections conformité levées |
| J+90 | Consolider différenciation marché | M01,M03,M06 | Narratif décision+preuve, connecteurs prioritaires | PMM | Activation pilote >=60% |
| J+90 | Durcir gouvernance H03/H04/H08 | P02,P06,T05,M04 | Checklists sign-off inter-rôles et gates prévisibles | PM + Architecte | Moins de CONCERNS tardifs |

## 14) Seuils de passage G1/G2/G3 et critères d’acceptation résiduelle

| Gate | Conditions minimales côté risques | Seuil bloquant | Décision si seuil non atteint |
|---|---|---|---|
| G1 (Analysis) | Hypothèses testables + registre Risque avec owners + sources | Aucun Risque Critique sans mitigation planifiée | Stop passage vers H03 |
| G2 (Planning) | PRD/UX avec AC explicites sur sécurité, dual gate, monitoring | Taux ambiguïtés critiques = 0 | Rework H04/H05/H06 avant H07 |
| G3 (Readiness) | Alignement PRD/UX/Architecture/Epics + risque résiduel acceptable | 0 fail critique sécurité/process non couvert | Verdict CONCERNS/FAIL, pas de H11 |

Critères d’acceptation résiduelle recommandés:
- Tous les risques **Critiques** doivent avoir owner, date cible, mitigation active, contingence testée.
- Un risque **Élevé** peut être temporairement accepté seulement avec justification signée PM+Architecte+Orchestrateur.
- Aucun risque sécurité de niveau Critique n’est acceptable sans contrôle compensatoire immédiat.
- Les risques adoption (Mxx) restent acceptables uniquement si instrumentation ROI est active et revue mensuelle.

## 15) Handoff ciblé vers H03, H04 et H08

| Phase cible | Ce que la phase doit consommer depuis ce document | Décisions obligatoires | Sortie attendue |
|---|---|---|---|
| H03 Product Brief | Top risques critiques, contraintes de valeur, hypothèses ROI | Valider ICP, proposition TCD, anti-scope V1, ownership risques | Brief avec section risques priorisés et KPI |
| H04 PRD | Registre des exigences anti-risque (sécurité/process/UX/coût) | Transformer mitigations en FR/NFR/AC testables | PRD actionnable avec contrôles mesurables |
| H08 Architecture | Dépendances D01..D16 + risques techniques/sécurité | Arbitrer ADRs sur broker, ledger, policies, résilience | Architecture avec plan de mitigation intégré |

Checklist de transfert H03:
- [ ] Les 10 risques critiques sont bien repris avec owner et horizon.
- [ ] La North Star TCD est reliée aux risques M01/M02/U01/U05.
- [ ] Les contraintes sécurité S01-S08 sont résumées en langage décisionnel.
- [ ] Le scope V1 exclut explicitement les fonctionnalités à fort risque de dérive.

Checklist de transfert H04:
- [ ] Chaque risque critique a au moins un FR/NFR et un AC associés.
- [ ] Les seuils de monitoring sont convertis en critères de test et d’alerting.
- [ ] Le dual gate G4-T/G4-UX est bloquant et non optionnel.
- [ ] Les exigences metadata (`stepsCompleted`, `inputDocuments`) sont normées.

Checklist de transfert H08:
- [ ] Le design command broker zéro-trust est validé ou rejeté explicitement (pas implicite).
- [ ] La stratégie read-model fail-safe est documentée avec test de bascule.
- [ ] Le plan de rétention et d’audit log est compatible sécurité/conformité.
- [ ] Les risques de couplage scripts legacy et contrats API sont traités architecturalement.

## 16) Top 10 Risques critiques à traiter en priorité

| Rang | Risque ID | Domaine | Risque | Score | Owner | Action immédiate |
|---:|---|---|---|---:|---|---|
| 1 | S03 | Sécurité | RBAC trop permissif | 80 | Admin Sécurité + Orchestrateur | RBAC minimal, revues hebdo, séparation des devoirs, policy-as-code testée. |
| 2 | S01 | Sécurité | Commande destructive sur mauvais projet | 75 | Admin Sécurité | Double validation + root signé + dry-run obligatoire pour opérations sensibles. |
| 3 | T07 | Technique | Faux DONE via G4-UX mal câblé | 75 | TEA Lead + UX QA Lead | Rendre G4 dual bloquant au niveau moteur de gate + tests E2E dédiés. |
| 4 | M02 | Adoption | ROI TCD non démontré | 60 | PM Produit | Mesurer baseline TCD dès POC et instrumenter gain mensuel. |
| 5 | M07 | Adoption | Retard self-host readiness | 60 | Architecte + Security Lead | Planifier dès H08 les prérequis self-host et packaging reproductible. |
| 6 | P01 | Process | Non-respect de l’ordre canonique H01→H23 | 60 | Orchestrateur BMAD | Machine d’état stricte + phase guards automatisés. |
| 7 | P06 | Process | Contrôles ULTRA quality contournés | 60 | Orchestrateur BMAD | Rendre les checks bloquants et visibles dans Gate Center. |
| 8 | P07 | Process | Erreur de contexte multi-projets | 60 | Orchestrateur + Admin Sécurité | Signer chaque commande avec root actif et confirmation contextuelle. |
| 9 | S02 | Sécurité | Injection d’arguments shell | 60 | Security Engineer | Templates de commande et arguments structurés; interdiction concaténation libre. |
| 10 | S05 | Sécurité | Fuite de secrets dans les logs | 60 | Security Engineer | Redaction automatique + scans secrets post-run + politique de masquage stricte. |

Lecture recommandée de priorité:
1. Sécuriser l’exécution (S03, S01, S02) avant toute extension fonctionnelle.
2. Bloquer les faux DONE UX (T07) pour protéger la qualité délivrée.
3. Garantir robustesse des contrats et de l’ingestion (T01, T04, T05).
4. Mesurer et prouver le ROI TCD (M02) pour sécuriser adoption et budget.
5. Gérer conformité/rétention (S08) avant montée en segment enterprise.

## 17) Sources, traçabilité et limites

Sources primaires obligatoires utilisées:
- /root/.openclaw/workspace/docs/BMAD-HYPER-ORCHESTRATION-THEORY.md
- /root/.openclaw/workspace/docs/BMAD-ULTRA-QUALITY-PROTOCOL.md
- /root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/brainstorming-report.md
- /root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/implementation-patterns.md
- /root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/competition-benchmark.md
- /root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/exemplebmad-analysis-2026-02-20.md
- Référence qualité documentaire: https://github.com/XdreaMs404/ExempleBMAD

Limites assumées de cette analyse:
- Les scores P/I/D restent des estimations expertes et doivent être recalibrés après données d’exploitation réelle.
- Les priorités adoption marché dépendront des résultats des pilotes (E1..E6) et du contexte commercial.
- Les mesures de coût nécessitent télémétrie fiable; sans baseline, le risque C01 peut être sous-estimé.
- La présente version est orientée H03/H04/H08; une revue complémentaire sera nécessaire avant H10 readiness final.

Fin du livrable H02-risks (version relance réelle).
