# H09 — Backlog Epics + Stories (Architect -> PM)

metadata:
  generatedAt: 2026-02-20T12:43:51.492593+00:00
  phase: H09
  handoff: Architect -> PM
  qualityProtocol: BMAD ULTRA QUALITY PROTOCOL
  referenceQualityBenchmark: https://github.com/XdreaMs404/ExempleBMAD
  executionMode: "agent_par_agent + fichier_par_fichier + réflexion profonde entre handoffs"
  stepsCompleted:
    - Lecture complète des 8 documents d’entrée obligatoires H09
    - Extraction structurée FR/NFR/AC/risques/H06/ADR pour alimenter le backlog
    - Construction d’une séquence d’Epic ordonnée et dépendante (E01 -> E12)
    - Décomposition en stories testables avec AC mesurables et DoD vérifiable
    - Mapping exhaustif FR -> Story et NFR -> Story pour traçabilité G3/H10
    - Intégration des risques par Epic avec mitigations prêtes à exécution
    - Définition des critères de handoff H10 (PASS/CONCERNS/FAIL)
    - Contrôle de conformité ULTRA (contenu riche, tables, preuves, contraintes UX)
  inputDocuments:
    - /root/.openclaw/workspace/docs/BMAD-HYPER-ORCHESTRATION-THEORY.md
    - /root/.openclaw/workspace/docs/BMAD-ULTRA-QUALITY-PROTOCOL.md
    - /root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/prd.md
    - /root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/ux.md
    - /root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/planning-validation.md
    - /root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/architecture.md
    - /root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/implementation-patterns.md
    - /root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/risks-constraints.md

## 1. Mandat et cadre d’exécution H09
- Ce livrable transforme PRD + UX + Architecture en backlog implémentable et traçable vers H10.
- Conformément à BMAD Hyper Orchestration, H09 doit préparer H10 avec cohérence PRD/UX/archi/epics.
- Conformément au protocole ULTRA, ce fichier est unique, détaillé, vérifiable et orienté preuve.
- La qualité cible est explicitement alignée (et visée supérieure) à la référence https://github.com/XdreaMs404/ExempleBMAD.
- Les Epics ci-dessous sont ordonnés pour limiter les risques S01/S03/T07/P01 avant extension du scope.

## 2. Résumé exécutif backlog orienté décision
- Le backlog est structuré en 12 Epic ordonnés, couvrant les 82 FR et 40 NFR du PRD.
- Chaque story contient des AC testables, une DoD complète G4-T + G4-UX et des preuves attendues.
- Les dépendances critiques (E01/E02/E03/E04) sont traitées en premier pour réduire le risque systémique.
- Les concerns H07 (ACT-01..ACT-08) sont absorbés dans E05/E07/E09/E11/E12 avec critères de fermeture.
- La sortie H10 est explicitée en section dédiée PASS/CONCERNS/FAIL avec checklists opérationnelles.

## 3. Décisions d’architecture reprises pour la planification
| Référence | Décision reprise | Traduction backlog H09 |
|---|---|---|
| D-H09-01 | Créer un epic “Core Event Ledger + Projections” avant tout module UI avancé. | Epic E02 en prérequis des capacités UI avancées |
| D-H09-02 | Créer un epic “Gate Engine Dual G4” avec scénario bloquant DONE obligatoire. | Epic E03 avec stories de blocage DONE dual gate |
| D-H09-03 | Créer un epic “Command Broker Zero-Trust” découpé simulate/apply/approval/killswitch. | Epic E04 découpé simulate/apply/approval/killswitch |
| D-H09-04 | Rendre la story “Metadata validator ULTRA” prerequisite de tout flux ingestion. | Story E02-S02 rendue dépendance d’ingestion |
| D-H09-05 | Rendre les tests a11y/responsive/states obligatoires dans DoD stories UI critiques. | DoD UI stories impose a11y/responsive/states |
| D-H09-06 | Introduire story “Context Service signed root” avant intégrations write. | Story E08-S03 "context service signed root" avant write |
| D-H09-07 | Introduire story “Observability + Alert runbooks” avant readiness H10. | Epic E11 inclut observabilité + runbooks avant H10 |
| D-H09-08 | Introduire story “Retention & Export governance” avant tout pilote enterprise. | Epic E09 inclut rétention/export governance |
| D-H09-09 | Exiger contract tests API/events à chaque merge touchant Gate/Command/Data. | Epic E10 inclut contract tests sur merge critique |
| D-H09-10 | Mesurer baseline TCD/AQCD dès sprint 1 pour sécuriser décision H10. | Story E05-S12 + E12-S05 pour baseline TCD/AQCD |

## 4. Principes de découpage Epic -> Story (testabilité maximale)
- 1 Epic = un incrément de capacité cohérent, démontrable et mesurable.
- 1 Story = une unité livrable en sprint, testable (AC), vérifiable (DoD), traçable (preuves).
- Les stories techniques et UX sont liées par design constraints H06, jamais séparées du risque métier.
- Aucune story ne peut prétendre DONE sans conformité G4-T ET G4-UX (règle BMAD non négociable).
- Les stories de sécurité write sont toutes adossées au triptyque dry-run -> preview -> apply contrôlé.
- Les stories de décision imposent preuve primaire + owner + échéance + risque si inaction.

## 5. Matrice globale FR -> Epic primaire
| FR | Module PRD | Epic primaire | Priorité | Résumé exigence |
|---|---|---|---|---|
| FR-001 | Workflow & Phases | E01 | Must | Le système doit afficher la progression de phase en respectant strictement l’ordre canonique BMAD. |
| FR-002 | Workflow & Phases | E01 | Must | Le système doit empêcher toute transition non autorisée entre phases et afficher la raison du blocage. |
| FR-003 | Workflow & Phases | E01 | Must | Le système doit bloquer la transition si la notification de phase n’est pas publiée dans la fenêtre SLA. |
| FR-004 | Workflow & Phases | E01 | Must | Le système doit afficher owner, started_at, finished_at, statut et durée pour chaque phase. |
| FR-005 | Workflow & Phases | E01 | Must | Le système doit exiger les prérequis déclarés avant activation de la phase suivante. |
| FR-006 | Workflow & Phases | E01 | Must | Le système doit permettre l’exécution contrôlée des scripts sequence-guard et ultra-quality-check. |
| FR-007 | Workflow & Phases | E01 | Must | Le système doit conserver un historique consultable des transitions de phase et des verdicts associés. |
| FR-008 | Workflow & Phases | E01 | Must | Le système doit signaler les dépassements de SLA de transition et proposer une action corrective. |
| FR-009 | Workflow & Phases | E01 | Must | Le système doit autoriser un override exceptionnel uniquement avec justification et approbateur. |
| FR-010 | Workflow & Phases | E01 | Must | Le système doit afficher les dépendances bloquantes inter-phases et leur état en temps réel. |
| FR-011 | Gate Control | E03 | Must | Le système doit présenter G1→G5 dans une vue unique avec statut, owner et horodatage. |
| FR-012 | Gate Control | E03 | Must | Le système doit afficher G4-T et G4-UX de manière distincte et corrélée. |
| FR-013 | Gate Control | E03 | Must | Le système doit calculer automatiquement PASS/CONCERNS/FAIL selon les règles de gate en vigueur. |
| FR-014 | Gate Control | E03 | Must | Le système doit interdire DONE si G4-T ou G4-UX n’est pas PASS. |
| FR-015 | Gate Control | E03 | Must | Le système doit exiger au moins une preuve primaire liée pour toute décision de gate. |
| FR-016 | Gate Control | E03 | Must | Le système doit créer une action assignée avec échéance pour chaque gate en CONCERNS. |
| FR-017 | Gate Control | E03 | Must | Le système doit versionner les règles de gate et historiser les changements. |
| FR-018 | Gate Control | E03 | Must | Le système doit permettre une simulation de verdict avant soumission finale du gate. |
| FR-019 | Gate Control | E03 | Must | Le système doit afficher les tendances PASS/CONCERNS/FAIL par phase et par période. |
| FR-020 | Gate Control | E03 | Must | Le système doit exporter un rapport de gate incluant verdict, preuves et actions ouvertes. |
| FR-021 | Artifact & Evidence | E02 | Must | Le système doit ingérer les artefacts markdown et yaml des dossiers BMAD autorisés. |
| FR-022 | Artifact & Evidence | E02 | Must | Le système doit vérifier la présence de stepsCompleted et inputDocuments sur les artefacts majeurs. |
| FR-023 | Artifact & Evidence | E02 | Must | Le système doit extraire sections H2/H3 pour permettre une navigation structurée. |
| FR-024 | Artifact & Evidence | E02 | Must | Le système doit indexer les tableaux markdown pour requêtes ciblées. |
| FR-025 | Artifact & Evidence | E02 | Must | Le système doit fournir une recherche plein texte avec filtrage instantané par type d’artefact. |
| FR-026 | Artifact & Evidence | E02 | Must | Le système doit filtrer par phase, agent, date, gate, owner et niveau de risque. |
| FR-027 | Artifact & Evidence | E02 | Must | Le système doit comparer deux versions d’un artefact et souligner les changements structurants. |
| FR-028 | Artifact & Evidence | E02 | Must | Le système doit visualiser les liens entre artefacts, décisions, gates et commandes. |
| FR-029 | Artifact & Evidence | E02 | Must | Le système doit lister tous les artefacts qui justifient une décision donnée. |
| FR-030 | Artifact & Evidence | E02 | Must | Le système doit marquer explicitement la fraîcheur/staleness des vues dérivées. |
| FR-031 | Artifact & Evidence | E02 | Must | Le système doit expliquer les erreurs de parsing avec recommandations de correction. |
| FR-032 | Artifact & Evidence | E02 | Must | Le système doit permettre des tags de risque et annotations contextuelles sur les artefacts. |
| FR-033 | Command Broker | E04 | Must | Le système doit exposer un catalogue de commandes autorisées avec paramètres contrôlés. |
| FR-034 | Command Broker | E04 | Must | Le système doit proposer un dry-run par défaut pour toute commande d’écriture. |
| FR-035 | Command Broker | E04 | Must | Le système doit afficher les fichiers potentiellement impactés avant exécution réelle. |
| FR-036 | Command Broker | E04 | Must | Le système doit imposer une double confirmation pour les commandes à impact élevé. |
| FR-037 | Command Broker | E04 | Must | Le système doit vérifier les permissions role-based avant chaque exécution. |
| FR-038 | Command Broker | E04 | Must | Le système doit signer active_project_root et refuser les exécutions ambiguës. |
| FR-039 | Command Broker | E04 | Must | Le système doit enregistrer commande, acteur, approbateur, résultat dans un journal append-only. |
| FR-040 | Command Broker | E04 | Must | Le système doit appliquer des timeouts, retries bornés et idempotency key pour les runs. |
| FR-041 | Command Broker | E04 | Must | Le système doit séquencer les commandes concurrentes selon priorité et capacité. |
| FR-042 | Command Broker | E04 | Must | Le système doit permettre l’arrêt immédiat des commandes d’écriture en cas d’incident critique. |
| FR-043 | Command Broker | E04 | Must | Le système doit exiger approbation nominative pour tout override de policy. |
| FR-044 | Command Broker | E04 | Must | Le système doit fournir des templates de commande validés pour réduire les erreurs humaines. |
| FR-045 | AQCD & Risk Intelligence | E05 | Must | Le système doit afficher les scores A/Q/C/D avec formule et source de données. |
| FR-046 | AQCD & Risk Intelligence | E05 | Must | Le système doit conserver des snapshots AQCD par période pour analyse de tendance. |
| FR-047 | AQCD & Risk Intelligence | E05 | Must | Le système doit calculer un readiness score rules-based avec facteurs contributifs visibles. |
| FR-048 | AQCD & Risk Intelligence | E05 | Must | Le système doit proposer les 3 actions prioritaires par gate avec owner et preuve. |
| FR-049 | AQCD & Risk Intelligence | E05 | Must | Le système doit maintenir un registre risques avec owner, échéance, statut et exposition. |
| FR-050 | AQCD & Risk Intelligence | E05 | Must | Le système doit lier chaque mitigation à une tâche et à une preuve de fermeture. |
| FR-051 | AQCD & Risk Intelligence | E05 | Must | Le système doit afficher une heatmap probabilité/impact et son évolution. |
| FR-052 | AQCD & Risk Intelligence | E05 | Must | Le système doit calculer le coût moyen par décision validée. |
| FR-053 | AQCD & Risk Intelligence | E05 | Must | Le système doit mesurer le waste ratio par phase et déclencher alerte en dérive. |
| FR-054 | AQCD & Risk Intelligence | E05 | Must | Le système doit suivre les actions H21/H22/H23 jusqu’à clôture vérifiée. |
| FR-055 | Collaboration & Notifications | E07 | Must | Le système doit proposer des dashboards personnalisés par rôle (PM, Architecte, TEA, UX QA, Sponsor). |
| FR-056 | Collaboration & Notifications | E07 | Must | Le système doit générer une file d’actions priorisées et contextualisées par rôle. |
| FR-057 | Collaboration & Notifications | E07 | Should | Le système doit centraliser les notifications avec niveaux critique/élevé/moyen/faible. |
| FR-058 | Collaboration & Notifications | E07 | Should | Le système doit regrouper et limiter les alertes répétitives pour éviter la fatigue. |
| FR-059 | Collaboration & Notifications | E07 | Should | Le système doit mesurer le délai phase complete → notify et alerter les dépassements. |
| FR-060 | Collaboration & Notifications | E07 | Should | Le système doit permettre des threads de commentaires reliés aux décisions et gates. |
| FR-061 | Collaboration & Notifications | E07 | Should | Le système doit gérer les mentions directes et l’escalade automatique selon la sévérité. |
| FR-062 | Collaboration & Notifications | E07 | Should | Le système doit afficher une timeline inter-rôles des événements clés du projet. |
| FR-063 | UX Quality Controls | E06 | Should | Le système doit implémenter loading/empty/error/success sur toutes les vues critiques. |
| FR-064 | UX Quality Controls | E06 | Should | Le système doit supporter une navigation clavier complète avec focus visible et logique. |
| FR-065 | UX Quality Controls | E06 | Should | Le système doit respecter les contrastes WCAG 2.2 AA sur les surfaces critiques. |
| FR-066 | UX Quality Controls | E06 | Should | Le système doit rester exploitable sur mobile, tablette et desktop standard. |
| FR-067 | UX Quality Controls | E06 | Should | Le système doit lier captures et verdicts UX aux sous-gates G4-UX. |
| FR-068 | UX Quality Controls | E06 | Should | Le système doit visualiser les dettes UX ouvertes et leur plan de réduction. |
| FR-069 | UX Quality Controls | E06 | Should | Le système doit afficher des définitions BMAD contextuelles pour réduire ambiguïtés. |
| FR-070 | UX Quality Controls | E06 | Should | Le système doit vérifier la cohérence spacing/typo/couleurs selon design system. |
| FR-071 | Integrations & Multi-Project | E08 | Should | Le système doit offrir un switch de projet avec confirmation du contexte actif. |
| FR-072 | Integrations & Multi-Project | E08 | Should | Le système doit empêcher toute écriture sur un projet non actif. |
| FR-073 | Integrations & Multi-Project | E08 | Should | Le système doit ingérer les données Jira nécessaires au suivi story/gate. |
| FR-074 | Integrations & Multi-Project | E08 | Should | Le système doit ingérer les données Linear nécessaires au suivi story/gate. |
| FR-075 | Integrations & Multi-Project | E09 | Could | Le système doit indexer les pages Notion référencées comme preuves. |
| FR-076 | Integrations & Multi-Project | E09 | Could | Le système doit intégrer les résultats tests (unit/int/e2e/coverage). |
| FR-077 | Integrations & Multi-Project | E09 | Could | Le système doit intégrer les rapports de vulnérabilités et leur sévérité. |
| FR-078 | Integrations & Multi-Project | E09 | Could | Le système doit exporter des bundles de preuve dans les formats md/pdf/json. |
| FR-079 | Integrations & Multi-Project | E09 | Could | Le système doit exposer des endpoints API pour reporting externe contrôlé. |
| FR-080 | Integrations & Multi-Project | E09 | Could | Le système doit supporter backup/restauration des configurations critiques. |
| FR-081 | Integrations & Multi-Project | E09 | Could | Le système doit fournir un profil déploiement compatible self-host sécurisé. |
| FR-082 | Integrations & Multi-Project | E09 | Could | Le système doit appliquer une politique de rétention et purge par type de donnée. |

## 6. Matrice globale NFR -> Epic primaire
| NFR | Catégorie | Epic primaire | Cible | Vérification |
|---|---|---|---|---|
| NFR-001 | Performance | E10 | p95 < 2.0s | test perf synthétique journalier |
| NFR-002 | Performance | E10 | p95 < 2.5s | test perf synthétique journalier |
| NFR-003 | Performance | E10 | p95 < 5s | test ingestion delta |
| NFR-004 | Performance | E10 | p95 < 2s sur 500 docs | test recherche charge |
| NFR-005 | Performance | E10 | p95 < 10s | test export périodique |
| NFR-006 | Performance | E10 | < 60s | test projection bulk |
| NFR-007 | Performance | E10 | <= 2s après preuve | test intégration gate |
| NFR-008 | Performance | E10 | <= 1.5s | test broker UI |
| NFR-009 | Performance | E10 | p95 < 2.5s | test perf dashboard |
| NFR-010 | Performance | E10 | p95 < 2s | test perf notifications |
| NFR-011 | Fiabilité | E11 | >= 99.5% | monitoring uptime |
| NFR-012 | Fiabilité | E11 | 0 toléré | audit séquence events |
| NFR-013 | Fiabilité | E11 | >= 95% | audit command logs |
| NFR-014 | Fiabilité | E11 | flakiness < 3% | analyse rapports tests |
| NFR-015 | Fiabilité | E11 | bascule < 60s | test résilience mensuel |
| NFR-016 | Fiabilité | E11 | max 3 retries + DLQ | test chaos ingestion |
| NFR-017 | Fiabilité | E11 | < 10 min | monitoring incidents |
| NFR-018 | Fiabilité | E11 | >= 65% sur baseline | validation historique |
| NFR-019 | Sécurité | E04 | 0 action critique hors rôle | test autorisation |
| NFR-020 | Sécurité | E04 | 100% commandes exécutées issues catalogue | audit broker |
| NFR-021 | Sécurité | E04 | 0 exécution destructive hors projet actif | test contexte |
| NFR-022 | Sécurité | E04 | intégrité vérifiée quotidienne | checksum/signature |
| NFR-023 | Sécurité | E04 | 0 secret exposé dans logs persistés | scan secret post-run |
| NFR-024 | Sécurité | E04 | 100% overrides avec approbateur | audit policy overrides |
| NFR-025 | Sécurité | E04 | timeout max 120s | test sécurité opérationnelle |
| NFR-026 | Sécurité | E04 | <24h après changement rôle | audit IAM mensuel |
| NFR-027 | Conformité | E09 | politique appliquée par type de données | audit conformité |
| NFR-028 | Conformité | E09 | 100% exports validés par policy | test export permissions |
| NFR-029 | Conformité | E09 | chaîne preuve complète obligatoire | audit bundle |
| NFR-030 | UX | E06 | score >= 85 + 0 blocker | audit WCAG 2.2 AA |
| NFR-031 | UX | E06 | 100% widgets critiques avec 4 états | tests visuels |
| NFR-032 | UX | E06 | parcours critiques validés mobile/tablette/desktop | tests responsive |
| NFR-033 | UX | E06 | décision critique en <90s pour PER-01 | test usability |
| NFR-034 | Opérabilité | E11 | métriques clés disponibles en continu | monitoring |
| NFR-035 | Opérabilité | E11 | runbook critique disponible et testé | game day mensuel |
| NFR-036 | Opérabilité | E11 | 100% changements avec version + migration | test contract |
| NFR-037 | Maintenabilité | E12 | 100% modules critiques documentés | revue doc mensuelle |
| NFR-038 | Maintenabilité | E12 | aucune rupture sur corpus de référence | test non-régression parser |
| NFR-039 | Maintenabilité | E12 | build self-host reproductible | test pipeline release |
| NFR-040 | Maintenabilité | E12 | time-to-first-value < 14 jours | mesure adoption |

## 7. Matrice risques -> Epic
| Risque | Intitulé | Epic primaire | Epic secondaire |
|---|---|---|---|
| C01 | Explosion des coûts token | E05 | E10 |
| C02 | Surcoût stockage ledger/projections | E09 | E11 |
| C03 | Sous-estimation des coûts d’intégration | E08 | E09 |
| C04 | Coût support onboarding supérieur au plan | E12 | E07 |
| C05 | Coût de rework UX après validation tardive | E06 | E12 |
| M01 | Confusion de catégorie produit | E12 | E05 |
| M02 | ROI TCD non démontré | E05 | E12 |
| M03 | Résistance au changement de stack | E07 | E12 |
| M04 | Scope inflation en V1 | E12 | E09 |
| M05 | Cycle de vente enterprise trop long | E12 | E09 |
| M06 | Dépendance excessive à la niche BMAD | E12 | E09 |
| M07 | Retard self-host readiness | E11 | E09 |
| M08 | Lisibilité AQCD insuffisante pour sponsor | E05 | E12 |
| P01 | Non-respect de l’ordre canonique H01→H23 | E01 | E03 |
| P02 | Handoffs incomplets ou ambigus | E12 | E01 |
| P03 | Notifications de phase manquantes | E07 | E01 |
| P04 | RACI décisionnel flou | E12 | E05 |
| P05 | Actions de mitigation non fermées | E05 | E12 |
| P06 | Contrôles ULTRA quality contournés | E03 | E01 |
| P07 | Erreur de contexte multi-projets | E08 | E04 |
| S01 | Commande destructive sur mauvais projet | E04 | E08 |
| S02 | Injection d’arguments shell | E04 | E08 |
| S03 | RBAC trop permissif | E11 | E04 |
| S04 | Journal d’audit altérable | E11 | E04 |
| S05 | Fuite de secrets dans les logs | E11 | E04 |
| S06 | Exfiltration via export de bundles | E09 | E11 |
| S07 | Non-révocation des accès | E11 | E04 |
| S08 | Non-conformité conservation/suppression | E09 | E11 |
| T01 | Dérive de format markdown/frontmatter | E02 | E10 |
| T02 | Absence de métadonnées obligatoires | E02 | E01 |
| T03 | Saturation de la file d’ingestion | E02 | E10 |
| T04 | Latence excessive sur projections critiques | E10 | E03 |
| T05 | Rupture des contrats front/back | E10 | E04 |
| T06 | Couplage excessif aux scripts legacy | E04 | E11 |
| T07 | Faux DONE via G4-UX mal câblé | E03 | E06 |
| T08 | Absence de mode dégradé read-model | E11 | E02 |
| U01 | Surcharge cognitive du cockpit | E06 | E07 |
| U02 | États UI incomplets | E06 | E03 |
| U03 | Non-conformité accessibilité WCAG 2.2 AA | E06 | E03 |
| U04 | Responsive dégradé sur tablettes/laptops denses | E06 | E07 |
| U05 | Next Best Action non compréhensible | E07 | E06 |
| U06 | Fatigue de notifications | E07 | E12 |

## 8. Dépendances inter-Epics (ordre d’exécution recommandé)
| Epic | Dépend de | Pourquoi cette dépendance est bloquante | Signal de levée de dépendance |
|---|---|---|---|
| E01 | Aucune (fondation) | Base de gouvernance H01→H23 requise pour tout le reste. | Transitions invalides bloquées à 100%, SLA notify mesuré. |
| E02 | E01 | Les preuves et métadonnées doivent être fiables avant décisions de gate. | Metadata validator et indexation artefacts opérationnels. |
| E03 | E01, E02 | Le moteur de gate dépend de la fiabilité workflow + evidence graph. | DONE bloqué automatiquement si G4-T ou G4-UX != PASS. |
| E04 | E01, E03 | Le broker dépend des règles de gate et du contexte workflow. | 100% commandes write passent par dry-run + approbation. |
| E05 | E02, E03 | AQCD exploite données fiables + verdicts stables. | AQCD + registre risques + recommandations actifs. |
| E06 | E03 | G4-UX doit se brancher sur gate engine opérationnel. | 0 blocker a11y, 4 états UI couverts, responsive validé. |
| E07 | E01, E05, E06 | La collaboration exploite AQCD + signaux UX/phase. | Fatigue notifications sous seuil et SLA ack monitoré. |
| E08 | E04 | Le multi-projet write-safe dépend du broker zero-trust. | 0 écriture cross-project non autorisée. |
| E09 | E02, E08 | L’intégration avancée dépend de l’isolation contexte + ingestion robuste. | Export/rétention gouvernés et testés par rôle. |
| E10 | E02, E03, E05 | Les optimisations dépendent du socle data/gate déjà en place. | SLO de latence et tests contrats en CI stables. |
| E11 | E04, E09 | Le hardening final dépend des flux write/export effectivement implémentés. | Runbooks testés + contrôles sécurité/conformité actifs. |
| E12 | E05, E07, E11 | Readiness H10 n’est crédible qu’après exécution des Epics 01→11. | Pack H10 complet PASS/CONCERNS/FAIL prêt. |

## 9. Contrat commun AC + DoD + Evidence (appliqué à chaque Story)
| Élément | Exigence minimale | Vérification de conformité |
|---|---|---|
| AC | Au moins 4 AC mesurables (nominal, négatif, seuil, preuve) | Revue PM/Architect + tests automatisés |
| DoD Technique | lint, typecheck, tests unit/int/e2e, sécurité, build, review | Rapport pipeline + logs signés |
| DoD UX | states, a11y, responsive, clarté microcopie | Audit UX QA + captures + score >=85 |
| Evidence | preuve primaire liée + owner + échéance + lien gate | Gate card sans champ manquant |
| Traçabilité | FR/NFR/Risk reliés à la story | Matrice FR/NFR->story section 35/36 |
| Sécurité write | dry-run/preview/apply contrôlé + RBAC | tests abus + audit broker |
| Observabilité | métriques + alertes + runbook associé | dashboard SLI/SLO + exercise runbook |
| Handoff | story pack prêt pour H11/H12/H13 sans ambiguïté | template story readiness complet |

## 10. Plan de release incrémental V1 -> V1.2
| Release | Epic ciblés | Objectif mesurable | Risque principal neutralisé |
|---|---|---|---|
| V1-R1 Fondation | E01, E02, E03 | workflow/gate/evidence fiabilisés | P01, T07, T02 |
| V1-R2 Sécurité exécution | E04, E08 | write-safe multi-projet | S01, S02, P07 |
| V1-R3 Intelligence décisionnelle | E05, E06, E07 | réduction TCD + qualité UX | M02, U02, U06 |
| V1-R4 Intégrations & conformité | E09, E10, E11 | enterprise readiness + performance | S08, T04, M07 |
| V1-R5 H10 readiness | E12 | décision go/no-go outillée | P02, M01, C04 |

## Epic E01 — Workflow canonique BMAD & gouvernance de phases
- **Objectif Epic:** Verrouiller l’ordre H01→H23, les transitions autorisées et la discipline ULTRA avant toute extension fonctionnelle.
- **Dépendances Epic:** Aucune
- **Contrainte H06 clés:** H06-UXC-01, H06-UXC-06, H06-UXC-10
- **FR couverts (primaire):** FR-001, FR-002, FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-009, FR-010
- **NFR couverts (primaire):** NFR-011, NFR-013, NFR-017, NFR-034, NFR-040
- **Risques adressés (priorité):** P01, P02, P03, P06, P07

| Axe Epic | Décision de backlog | KPI de succès | Handoff aval |
|---|---|---|---|
| Scope | Séquence E01 découpée en 12 stories indépendantes mais cohérentes | 12/12 stories prêtes H11 | PM + SM |
| Testabilité | Chaque story porte AC + DoD + preuves | 0 story sans AC/DoD | TEA + UX QA |
| Qualité UX | Règles H06 reliées aux stories de l’Epic | 0 violation H06 critique | UX Designer + UX QA |
| Risques | Mitigations alignées au registre H02 | baisse exposition risques P01, P02 | PM + Architect |
| Readiness H10 | Évidences consolidées pour décision PASS/CONCERNS/FAIL | dossier Epic prêt | Architect |

| Risque Epic | Description | Mitigation portée par stories | Trigger d’alerte |
|---|---|---|---|
| P01 | Non-respect de l’ordre canonique H01→H23 | Stories E01 associées + contrôle gate | Écart seuil/KPI sur P01 |
| P02 | Handoffs incomplets ou ambigus | Stories E01 associées + contrôle gate | Écart seuil/KPI sur P02 |
| P03 | Notifications de phase manquantes | Stories E01 associées + contrôle gate | Écart seuil/KPI sur P03 |
| P06 | Contrôles ULTRA quality contournés | Stories E01 associées + contrôle gate | Écart seuil/KPI sur P06 |
| P07 | Erreur de contexte multi-projets | Stories E01 associées + contrôle gate | Écart seuil/KPI sur P07 |

## Epic E01 — Stories détaillées
| Story ID | Titre | FR clés | NFR clés | Risques | Dépendance story |
|---|---|---|---|---|---|
| E01-S01 | Machine d’état canonique H01→H23 | FR-001, FR-002 | NFR-011, NFR-013 | P01, P02 | Aucune |
| E01-S02 | Validateur de transitions autorisées | FR-002, FR-003 | NFR-013, NFR-017 | P02, P03 | E01-S01 |
| E01-S03 | SLA de notification de phase et blocage | FR-003, FR-004 | NFR-017, NFR-034 | P03, P06 | E01-S02 |
| E01-S04 | Capture owner/horodatage/statut de phase | FR-004, FR-005 | NFR-034, NFR-040 | P06, P07 | E01-S03 |
| E01-S05 | Checklist prérequis avant activation de phase | FR-005, FR-006 | NFR-040, NFR-011 | P07, P01 | E01-S04 |
| E01-S06 | Orchestration sequence-guard depuis le cockpit | FR-006, FR-007 | NFR-011, NFR-013 | P01, P02 | E01-S05 |
| E01-S07 | Orchestration ultra-quality-check depuis le cockpit | FR-007, FR-008 | NFR-013, NFR-017 | P02, P03 | E01-S06 |
| E01-S08 | Historique consultable des transitions | FR-008, FR-009 | NFR-017, NFR-034 | P03, P06 | E01-S07 |
| E01-S09 | Workflow override exceptionnel avec approbateur | FR-009, FR-010 | NFR-034, NFR-040 | P06, P07 | E01-S08 |
| E01-S10 | Carte dépendances inter-phases en temps réel | FR-010, FR-001 | NFR-040, NFR-011 | P07, P01 | E01-S09 |
| E01-S11 | Détection anomalies de progression et alertes | FR-001, FR-002 | NFR-011, NFR-013 | P01, P02 | E01-S10 |
| E01-S12 | Journal décisionnel de gouvernance phase/gate | FR-002, FR-003 | NFR-013, NFR-017 | P02, P03 | E01-S11 |

### Story E01-S01 — Machine d’état canonique H01→H23
- **Epic parent:** E01 — Workflow canonique BMAD & gouvernance de phases
- **FR ciblés:** FR-001, FR-002
- **NFR ciblés:** NFR-011, NFR-013
- **Risques couverts:** P01 (Non-respect de l’ordre canonique H01→H23), P02 (Handoffs incomplets ou ambigus)
- **Dépendance de réalisation:** Aucune
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-001 est satisfaite: "Le système doit afficher la progression de phase en respectant strictement l’ordre canonique BMAD.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-002 sans contournement: "Le système doit empêcher toute transition non autorisée entre phases et afficher la raison du blocage.".
  - AC-03: Le seuil NFR est respecté: NFR-011 => >= 99.5%.
  - AC-04: Le second seuil de qualité est tenu: NFR-013 => >= 95%.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E01-S01 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E01-S02 — Validateur de transitions autorisées
- **Epic parent:** E01 — Workflow canonique BMAD & gouvernance de phases
- **FR ciblés:** FR-002, FR-003
- **NFR ciblés:** NFR-013, NFR-017
- **Risques couverts:** P02 (Handoffs incomplets ou ambigus), P03 (Notifications de phase manquantes)
- **Dépendance de réalisation:** E01-S01
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-002 est satisfaite: "Le système doit empêcher toute transition non autorisée entre phases et afficher la raison du blocage.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-003 sans contournement: "Le système doit bloquer la transition si la notification de phase n’est pas publiée dans la fenêtre SLA.".
  - AC-03: Le seuil NFR est respecté: NFR-013 => >= 95%.
  - AC-04: Le second seuil de qualité est tenu: NFR-017 => < 10 min.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E01-S02 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E01-S03 — SLA de notification de phase et blocage
- **Epic parent:** E01 — Workflow canonique BMAD & gouvernance de phases
- **FR ciblés:** FR-003, FR-004
- **NFR ciblés:** NFR-017, NFR-034
- **Risques couverts:** P03 (Notifications de phase manquantes), P06 (Contrôles ULTRA quality contournés)
- **Dépendance de réalisation:** E01-S02
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-003 est satisfaite: "Le système doit bloquer la transition si la notification de phase n’est pas publiée dans la fenêtre SLA.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-004 sans contournement: "Le système doit afficher owner, started_at, finished_at, statut et durée pour chaque phase.".
  - AC-03: Le seuil NFR est respecté: NFR-017 => < 10 min.
  - AC-04: Le second seuil de qualité est tenu: NFR-034 => métriques clés disponibles en continu.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E01-S03 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E01-S04 — Capture owner/horodatage/statut de phase
- **Epic parent:** E01 — Workflow canonique BMAD & gouvernance de phases
- **FR ciblés:** FR-004, FR-005
- **NFR ciblés:** NFR-034, NFR-040
- **Risques couverts:** P06 (Contrôles ULTRA quality contournés), P07 (Erreur de contexte multi-projets)
- **Dépendance de réalisation:** E01-S03
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-004 est satisfaite: "Le système doit afficher owner, started_at, finished_at, statut et durée pour chaque phase.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-005 sans contournement: "Le système doit exiger les prérequis déclarés avant activation de la phase suivante.".
  - AC-03: Le seuil NFR est respecté: NFR-034 => métriques clés disponibles en continu.
  - AC-04: Le second seuil de qualité est tenu: NFR-040 => time-to-first-value < 14 jours.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E01-S04 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E01-S05 — Checklist prérequis avant activation de phase
- **Epic parent:** E01 — Workflow canonique BMAD & gouvernance de phases
- **FR ciblés:** FR-005, FR-006
- **NFR ciblés:** NFR-040, NFR-011
- **Risques couverts:** P07 (Erreur de contexte multi-projets), P01 (Non-respect de l’ordre canonique H01→H23)
- **Dépendance de réalisation:** E01-S04
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-005 est satisfaite: "Le système doit exiger les prérequis déclarés avant activation de la phase suivante.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-006 sans contournement: "Le système doit permettre l’exécution contrôlée des scripts sequence-guard et ultra-quality-check.".
  - AC-03: Le seuil NFR est respecté: NFR-040 => time-to-first-value < 14 jours.
  - AC-04: Le second seuil de qualité est tenu: NFR-011 => >= 99.5%.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E01-S05 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E01-S06 — Orchestration sequence-guard depuis le cockpit
- **Epic parent:** E01 — Workflow canonique BMAD & gouvernance de phases
- **FR ciblés:** FR-006, FR-007
- **NFR ciblés:** NFR-011, NFR-013
- **Risques couverts:** P01 (Non-respect de l’ordre canonique H01→H23), P02 (Handoffs incomplets ou ambigus)
- **Dépendance de réalisation:** E01-S05
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-006 est satisfaite: "Le système doit permettre l’exécution contrôlée des scripts sequence-guard et ultra-quality-check.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-007 sans contournement: "Le système doit conserver un historique consultable des transitions de phase et des verdicts associés.".
  - AC-03: Le seuil NFR est respecté: NFR-011 => >= 99.5%.
  - AC-04: Le second seuil de qualité est tenu: NFR-013 => >= 95%.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E01-S06 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E01-S07 — Orchestration ultra-quality-check depuis le cockpit
- **Epic parent:** E01 — Workflow canonique BMAD & gouvernance de phases
- **FR ciblés:** FR-007, FR-008
- **NFR ciblés:** NFR-013, NFR-017
- **Risques couverts:** P02 (Handoffs incomplets ou ambigus), P03 (Notifications de phase manquantes)
- **Dépendance de réalisation:** E01-S06
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-007 est satisfaite: "Le système doit conserver un historique consultable des transitions de phase et des verdicts associés.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-008 sans contournement: "Le système doit signaler les dépassements de SLA de transition et proposer une action corrective.".
  - AC-03: Le seuil NFR est respecté: NFR-013 => >= 95%.
  - AC-04: Le second seuil de qualité est tenu: NFR-017 => < 10 min.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E01-S07 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E01-S08 — Historique consultable des transitions
- **Epic parent:** E01 — Workflow canonique BMAD & gouvernance de phases
- **FR ciblés:** FR-008, FR-009
- **NFR ciblés:** NFR-017, NFR-034
- **Risques couverts:** P03 (Notifications de phase manquantes), P06 (Contrôles ULTRA quality contournés)
- **Dépendance de réalisation:** E01-S07
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-008 est satisfaite: "Le système doit signaler les dépassements de SLA de transition et proposer une action corrective.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-009 sans contournement: "Le système doit autoriser un override exceptionnel uniquement avec justification et approbateur.".
  - AC-03: Le seuil NFR est respecté: NFR-017 => < 10 min.
  - AC-04: Le second seuil de qualité est tenu: NFR-034 => métriques clés disponibles en continu.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E01-S08 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E01-S09 — Workflow override exceptionnel avec approbateur
- **Epic parent:** E01 — Workflow canonique BMAD & gouvernance de phases
- **FR ciblés:** FR-009, FR-010
- **NFR ciblés:** NFR-034, NFR-040
- **Risques couverts:** P06 (Contrôles ULTRA quality contournés), P07 (Erreur de contexte multi-projets)
- **Dépendance de réalisation:** E01-S08
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-009 est satisfaite: "Le système doit autoriser un override exceptionnel uniquement avec justification et approbateur.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-010 sans contournement: "Le système doit afficher les dépendances bloquantes inter-phases et leur état en temps réel.".
  - AC-03: Le seuil NFR est respecté: NFR-034 => métriques clés disponibles en continu.
  - AC-04: Le second seuil de qualité est tenu: NFR-040 => time-to-first-value < 14 jours.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E01-S09 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E01-S10 — Carte dépendances inter-phases en temps réel
- **Epic parent:** E01 — Workflow canonique BMAD & gouvernance de phases
- **FR ciblés:** FR-010, FR-001
- **NFR ciblés:** NFR-040, NFR-011
- **Risques couverts:** P07 (Erreur de contexte multi-projets), P01 (Non-respect de l’ordre canonique H01→H23)
- **Dépendance de réalisation:** E01-S09
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-010 est satisfaite: "Le système doit afficher les dépendances bloquantes inter-phases et leur état en temps réel.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-001 sans contournement: "Le système doit afficher la progression de phase en respectant strictement l’ordre canonique BMAD.".
  - AC-03: Le seuil NFR est respecté: NFR-040 => time-to-first-value < 14 jours.
  - AC-04: Le second seuil de qualité est tenu: NFR-011 => >= 99.5%.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E01-S10 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E01-S11 — Détection anomalies de progression et alertes
- **Epic parent:** E01 — Workflow canonique BMAD & gouvernance de phases
- **FR ciblés:** FR-001, FR-002
- **NFR ciblés:** NFR-011, NFR-013
- **Risques couverts:** P01 (Non-respect de l’ordre canonique H01→H23), P02 (Handoffs incomplets ou ambigus)
- **Dépendance de réalisation:** E01-S10
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-001 est satisfaite: "Le système doit afficher la progression de phase en respectant strictement l’ordre canonique BMAD.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-002 sans contournement: "Le système doit empêcher toute transition non autorisée entre phases et afficher la raison du blocage.".
  - AC-03: Le seuil NFR est respecté: NFR-011 => >= 99.5%.
  - AC-04: Le second seuil de qualité est tenu: NFR-013 => >= 95%.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E01-S11 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E01-S12 — Journal décisionnel de gouvernance phase/gate
- **Epic parent:** E01 — Workflow canonique BMAD & gouvernance de phases
- **FR ciblés:** FR-002, FR-003
- **NFR ciblés:** NFR-013, NFR-017
- **Risques couverts:** P02 (Handoffs incomplets ou ambigus), P03 (Notifications de phase manquantes)
- **Dépendance de réalisation:** E01-S11
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-002 est satisfaite: "Le système doit empêcher toute transition non autorisée entre phases et afficher la raison du blocage.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-003 sans contournement: "Le système doit bloquer la transition si la notification de phase n’est pas publiée dans la fenêtre SLA.".
  - AC-03: Le seuil NFR est respecté: NFR-013 => >= 95%.
  - AC-04: Le second seuil de qualité est tenu: NFR-017 => < 10 min.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E01-S12 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

## Epic E02 — Artifact Ingestion, Metadata Validator & Evidence Graph
- **Objectif Epic:** Fiabiliser ingestion et traçabilité documentaire pour rendre chaque décision vérifiable et auditée.
- **Dépendances Epic:** E01
- **Contrainte H06 clés:** H06-UXC-06, H06-UXC-10
- **FR couverts (primaire):** FR-021, FR-022, FR-023, FR-024, FR-025, FR-026, FR-027, FR-028, FR-029, FR-030, FR-031, FR-032
- **NFR couverts (primaire):** NFR-003, NFR-004, NFR-006, NFR-012, NFR-016, NFR-038
- **Risques adressés (priorité):** T01, T02, T03, T08, P02

| Axe Epic | Décision de backlog | KPI de succès | Handoff aval |
|---|---|---|---|
| Scope | Séquence E02 découpée en 12 stories indépendantes mais cohérentes | 12/12 stories prêtes H11 | PM + SM |
| Testabilité | Chaque story porte AC + DoD + preuves | 0 story sans AC/DoD | TEA + UX QA |
| Qualité UX | Règles H06 reliées aux stories de l’Epic | 0 violation H06 critique | UX Designer + UX QA |
| Risques | Mitigations alignées au registre H02 | baisse exposition risques T01, T02 | PM + Architect |
| Readiness H10 | Évidences consolidées pour décision PASS/CONCERNS/FAIL | dossier Epic prêt | Architect |

| Risque Epic | Description | Mitigation portée par stories | Trigger d’alerte |
|---|---|---|---|
| T01 | Dérive de format markdown/frontmatter | Stories E02 associées + contrôle gate | Écart seuil/KPI sur T01 |
| T02 | Absence de métadonnées obligatoires | Stories E02 associées + contrôle gate | Écart seuil/KPI sur T02 |
| T03 | Saturation de la file d’ingestion | Stories E02 associées + contrôle gate | Écart seuil/KPI sur T03 |
| T08 | Absence de mode dégradé read-model | Stories E02 associées + contrôle gate | Écart seuil/KPI sur T08 |
| P02 | Handoffs incomplets ou ambigus | Stories E02 associées + contrôle gate | Écart seuil/KPI sur P02 |

## Epic E02 — Stories détaillées
| Story ID | Titre | FR clés | NFR clés | Risques | Dépendance story |
|---|---|---|---|---|---|
| E02-S01 | Pipeline ingestion markdown/yaml sous allowlist | FR-021, FR-022 | NFR-003, NFR-004 | T01, T02 | E01-S12 |
| E02-S02 | Validator metadata stepsCompleted + inputDocuments | FR-022, FR-023 | NFR-004, NFR-006 | T02, T03 | E02-S01 |
| E02-S03 | Extracteur sections H2/H3 pour navigation | FR-023, FR-024 | NFR-006, NFR-012 | T03, T08 | E02-S02 |
| E02-S04 | Indexeur tableaux markdown et schéma | FR-024, FR-025 | NFR-012, NFR-016 | T08, P02 | E02-S03 |
| E02-S05 | Recherche full-text avec filtres dynamiques | FR-025, FR-026 | NFR-016, NFR-038 | P02, T01 | E02-S04 |
| E02-S06 | Filtrage contextuel phase/agent/date/gate | FR-026, FR-027 | NFR-038, NFR-003 | T01, T02 | E02-S05 |
| E02-S07 | Moteur diff version-vers-version d’artefacts | FR-027, FR-028 | NFR-003, NFR-004 | T02, T03 | E02-S06 |
| E02-S08 | Evidence graph décision↔preuve↔gate↔commande | FR-028, FR-029 | NFR-004, NFR-006 | T03, T08 | E02-S07 |
| E02-S09 | Indicateur de fraîcheur/staleness des vues | FR-029, FR-030 | NFR-006, NFR-012 | T08, P02 | E02-S08 |
| E02-S10 | Diagnostic parse-errors et recommandations | FR-030, FR-031 | NFR-012, NFR-016 | P02, T01 | E02-S09 |
| E02-S11 | Tags risques et annotations contextuelles | FR-031, FR-032 | NFR-016, NFR-038 | T01, T02 | E02-S10 |
| E02-S12 | Backfill historique + migration corpus existant | FR-032, FR-021 | NFR-038, NFR-003 | T02, T03 | E02-S11 |

### Story E02-S01 — Pipeline ingestion markdown/yaml sous allowlist
- **Epic parent:** E02 — Artifact Ingestion, Metadata Validator & Evidence Graph
- **FR ciblés:** FR-021, FR-022
- **NFR ciblés:** NFR-003, NFR-004
- **Risques couverts:** T01 (Dérive de format markdown/frontmatter), T02 (Absence de métadonnées obligatoires)
- **Dépendance de réalisation:** E01-S12
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-021 est satisfaite: "Le système doit ingérer les artefacts markdown et yaml des dossiers BMAD autorisés.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-022 sans contournement: "Le système doit vérifier la présence de stepsCompleted et inputDocuments sur les artefacts majeurs.".
  - AC-03: Le seuil NFR est respecté: NFR-003 => p95 < 5s.
  - AC-04: Le second seuil de qualité est tenu: NFR-004 => p95 < 2s sur 500 docs.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E02-S01 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E02-S02 — Validator metadata stepsCompleted + inputDocuments
- **Epic parent:** E02 — Artifact Ingestion, Metadata Validator & Evidence Graph
- **FR ciblés:** FR-022, FR-023
- **NFR ciblés:** NFR-004, NFR-006
- **Risques couverts:** T02 (Absence de métadonnées obligatoires), T03 (Saturation de la file d’ingestion)
- **Dépendance de réalisation:** E02-S01
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-022 est satisfaite: "Le système doit vérifier la présence de stepsCompleted et inputDocuments sur les artefacts majeurs.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-023 sans contournement: "Le système doit extraire sections H2/H3 pour permettre une navigation structurée.".
  - AC-03: Le seuil NFR est respecté: NFR-004 => p95 < 2s sur 500 docs.
  - AC-04: Le second seuil de qualité est tenu: NFR-006 => < 60s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E02-S02 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E02-S03 — Extracteur sections H2/H3 pour navigation
- **Epic parent:** E02 — Artifact Ingestion, Metadata Validator & Evidence Graph
- **FR ciblés:** FR-023, FR-024
- **NFR ciblés:** NFR-006, NFR-012
- **Risques couverts:** T03 (Saturation de la file d’ingestion), T08 (Absence de mode dégradé read-model)
- **Dépendance de réalisation:** E02-S02
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-023 est satisfaite: "Le système doit extraire sections H2/H3 pour permettre une navigation structurée.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-024 sans contournement: "Le système doit indexer les tableaux markdown pour requêtes ciblées.".
  - AC-03: Le seuil NFR est respecté: NFR-006 => < 60s.
  - AC-04: Le second seuil de qualité est tenu: NFR-012 => 0 toléré.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E02-S03 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E02-S04 — Indexeur tableaux markdown et schéma
- **Epic parent:** E02 — Artifact Ingestion, Metadata Validator & Evidence Graph
- **FR ciblés:** FR-024, FR-025
- **NFR ciblés:** NFR-012, NFR-016
- **Risques couverts:** T08 (Absence de mode dégradé read-model), P02 (Handoffs incomplets ou ambigus)
- **Dépendance de réalisation:** E02-S03
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-024 est satisfaite: "Le système doit indexer les tableaux markdown pour requêtes ciblées.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-025 sans contournement: "Le système doit fournir une recherche plein texte avec filtrage instantané par type d’artefact.".
  - AC-03: Le seuil NFR est respecté: NFR-012 => 0 toléré.
  - AC-04: Le second seuil de qualité est tenu: NFR-016 => max 3 retries + DLQ.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E02-S04 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E02-S05 — Recherche full-text avec filtres dynamiques
- **Epic parent:** E02 — Artifact Ingestion, Metadata Validator & Evidence Graph
- **FR ciblés:** FR-025, FR-026
- **NFR ciblés:** NFR-016, NFR-038
- **Risques couverts:** P02 (Handoffs incomplets ou ambigus), T01 (Dérive de format markdown/frontmatter)
- **Dépendance de réalisation:** E02-S04
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-025 est satisfaite: "Le système doit fournir une recherche plein texte avec filtrage instantané par type d’artefact.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-026 sans contournement: "Le système doit filtrer par phase, agent, date, gate, owner et niveau de risque.".
  - AC-03: Le seuil NFR est respecté: NFR-016 => max 3 retries + DLQ.
  - AC-04: Le second seuil de qualité est tenu: NFR-038 => aucune rupture sur corpus de référence.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E02-S05 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E02-S06 — Filtrage contextuel phase/agent/date/gate
- **Epic parent:** E02 — Artifact Ingestion, Metadata Validator & Evidence Graph
- **FR ciblés:** FR-026, FR-027
- **NFR ciblés:** NFR-038, NFR-003
- **Risques couverts:** T01 (Dérive de format markdown/frontmatter), T02 (Absence de métadonnées obligatoires)
- **Dépendance de réalisation:** E02-S05
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-026 est satisfaite: "Le système doit filtrer par phase, agent, date, gate, owner et niveau de risque.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-027 sans contournement: "Le système doit comparer deux versions d’un artefact et souligner les changements structurants.".
  - AC-03: Le seuil NFR est respecté: NFR-038 => aucune rupture sur corpus de référence.
  - AC-04: Le second seuil de qualité est tenu: NFR-003 => p95 < 5s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E02-S06 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E02-S07 — Moteur diff version-vers-version d’artefacts
- **Epic parent:** E02 — Artifact Ingestion, Metadata Validator & Evidence Graph
- **FR ciblés:** FR-027, FR-028
- **NFR ciblés:** NFR-003, NFR-004
- **Risques couverts:** T02 (Absence de métadonnées obligatoires), T03 (Saturation de la file d’ingestion)
- **Dépendance de réalisation:** E02-S06
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-027 est satisfaite: "Le système doit comparer deux versions d’un artefact et souligner les changements structurants.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-028 sans contournement: "Le système doit visualiser les liens entre artefacts, décisions, gates et commandes.".
  - AC-03: Le seuil NFR est respecté: NFR-003 => p95 < 5s.
  - AC-04: Le second seuil de qualité est tenu: NFR-004 => p95 < 2s sur 500 docs.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E02-S07 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E02-S08 — Evidence graph décision↔preuve↔gate↔commande
- **Epic parent:** E02 — Artifact Ingestion, Metadata Validator & Evidence Graph
- **FR ciblés:** FR-028, FR-029
- **NFR ciblés:** NFR-004, NFR-006
- **Risques couverts:** T03 (Saturation de la file d’ingestion), T08 (Absence de mode dégradé read-model)
- **Dépendance de réalisation:** E02-S07
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-028 est satisfaite: "Le système doit visualiser les liens entre artefacts, décisions, gates et commandes.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-029 sans contournement: "Le système doit lister tous les artefacts qui justifient une décision donnée.".
  - AC-03: Le seuil NFR est respecté: NFR-004 => p95 < 2s sur 500 docs.
  - AC-04: Le second seuil de qualité est tenu: NFR-006 => < 60s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E02-S08 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E02-S09 — Indicateur de fraîcheur/staleness des vues
- **Epic parent:** E02 — Artifact Ingestion, Metadata Validator & Evidence Graph
- **FR ciblés:** FR-029, FR-030
- **NFR ciblés:** NFR-006, NFR-012
- **Risques couverts:** T08 (Absence de mode dégradé read-model), P02 (Handoffs incomplets ou ambigus)
- **Dépendance de réalisation:** E02-S08
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-029 est satisfaite: "Le système doit lister tous les artefacts qui justifient une décision donnée.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-030 sans contournement: "Le système doit marquer explicitement la fraîcheur/staleness des vues dérivées.".
  - AC-03: Le seuil NFR est respecté: NFR-006 => < 60s.
  - AC-04: Le second seuil de qualité est tenu: NFR-012 => 0 toléré.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E02-S09 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E02-S10 — Diagnostic parse-errors et recommandations
- **Epic parent:** E02 — Artifact Ingestion, Metadata Validator & Evidence Graph
- **FR ciblés:** FR-030, FR-031
- **NFR ciblés:** NFR-012, NFR-016
- **Risques couverts:** P02 (Handoffs incomplets ou ambigus), T01 (Dérive de format markdown/frontmatter)
- **Dépendance de réalisation:** E02-S09
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-030 est satisfaite: "Le système doit marquer explicitement la fraîcheur/staleness des vues dérivées.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-031 sans contournement: "Le système doit expliquer les erreurs de parsing avec recommandations de correction.".
  - AC-03: Le seuil NFR est respecté: NFR-012 => 0 toléré.
  - AC-04: Le second seuil de qualité est tenu: NFR-016 => max 3 retries + DLQ.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E02-S10 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E02-S11 — Tags risques et annotations contextuelles
- **Epic parent:** E02 — Artifact Ingestion, Metadata Validator & Evidence Graph
- **FR ciblés:** FR-031, FR-032
- **NFR ciblés:** NFR-016, NFR-038
- **Risques couverts:** T01 (Dérive de format markdown/frontmatter), T02 (Absence de métadonnées obligatoires)
- **Dépendance de réalisation:** E02-S10
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-031 est satisfaite: "Le système doit expliquer les erreurs de parsing avec recommandations de correction.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-032 sans contournement: "Le système doit permettre des tags de risque et annotations contextuelles sur les artefacts.".
  - AC-03: Le seuil NFR est respecté: NFR-016 => max 3 retries + DLQ.
  - AC-04: Le second seuil de qualité est tenu: NFR-038 => aucune rupture sur corpus de référence.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E02-S11 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E02-S12 — Backfill historique + migration corpus existant
- **Epic parent:** E02 — Artifact Ingestion, Metadata Validator & Evidence Graph
- **FR ciblés:** FR-032, FR-021
- **NFR ciblés:** NFR-038, NFR-003
- **Risques couverts:** T02 (Absence de métadonnées obligatoires), T03 (Saturation de la file d’ingestion)
- **Dépendance de réalisation:** E02-S11
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-032 est satisfaite: "Le système doit permettre des tags de risque et annotations contextuelles sur les artefacts.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-021 sans contournement: "Le système doit ingérer les artefacts markdown et yaml des dossiers BMAD autorisés.".
  - AC-03: Le seuil NFR est respecté: NFR-038 => aucune rupture sur corpus de référence.
  - AC-04: Le second seuil de qualité est tenu: NFR-003 => p95 < 5s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E02-S12 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

## Epic E03 — Gate Engine unifié G1→G5 avec dual G4 bloquant
- **Objectif Epic:** Éliminer les faux DONE grâce à un moteur policy-as-code, traçable, explicable et testable.
- **Dépendances Epic:** E01, E02
- **Contrainte H06 clés:** H06-UXC-01, H06-UXC-06
- **FR couverts (primaire):** FR-011, FR-012, FR-013, FR-014, FR-015, FR-016, FR-017, FR-018, FR-019, FR-020
- **NFR couverts (primaire):** NFR-002, NFR-007, NFR-018, NFR-029, NFR-031
- **Risques adressés (priorité):** T07, P05, P06, U03

| Axe Epic | Décision de backlog | KPI de succès | Handoff aval |
|---|---|---|---|
| Scope | Séquence E03 découpée en 12 stories indépendantes mais cohérentes | 12/12 stories prêtes H11 | PM + SM |
| Testabilité | Chaque story porte AC + DoD + preuves | 0 story sans AC/DoD | TEA + UX QA |
| Qualité UX | Règles H06 reliées aux stories de l’Epic | 0 violation H06 critique | UX Designer + UX QA |
| Risques | Mitigations alignées au registre H02 | baisse exposition risques T07, P05 | PM + Architect |
| Readiness H10 | Évidences consolidées pour décision PASS/CONCERNS/FAIL | dossier Epic prêt | Architect |

| Risque Epic | Description | Mitigation portée par stories | Trigger d’alerte |
|---|---|---|---|
| T07 | Faux DONE via G4-UX mal câblé | Stories E03 associées + contrôle gate | Écart seuil/KPI sur T07 |
| P05 | Actions de mitigation non fermées | Stories E03 associées + contrôle gate | Écart seuil/KPI sur P05 |
| P06 | Contrôles ULTRA quality contournés | Stories E03 associées + contrôle gate | Écart seuil/KPI sur P06 |
| U03 | Non-conformité accessibilité WCAG 2.2 AA | Stories E03 associées + contrôle gate | Écart seuil/KPI sur U03 |

## Epic E03 — Stories détaillées
| Story ID | Titre | FR clés | NFR clés | Risques | Dépendance story |
|---|---|---|---|---|---|
| E03-S01 | Gate Center unifié avec statut et owner | FR-011, FR-012 | NFR-002, NFR-007 | T07, P05 | E01-S12 |
| E03-S02 | Évaluation duale G4-T/G4-UX corrélée | FR-012, FR-013 | NFR-007, NFR-018 | P05, P06 | E03-S01 |
| E03-S03 | Calculateur verdict PASS/CONCERNS/FAIL | FR-013, FR-014 | NFR-018, NFR-029 | P06, U03 | E03-S02 |
| E03-S04 | Blocage DONE si sous-gate non PASS | FR-014, FR-015 | NFR-029, NFR-031 | U03, T07 | E03-S03 |
| E03-S05 | Validation preuve primaire obligatoire | FR-015, FR-016 | NFR-031, NFR-002 | T07, P05 | E03-S04 |
| E03-S06 | Création automatique actions CONCERNS | FR-016, FR-017 | NFR-002, NFR-007 | P05, P06 | E03-S05 |
| E03-S07 | Versioning des policies de gate | FR-017, FR-018 | NFR-007, NFR-018 | P06, U03 | E03-S06 |
| E03-S08 | Simulation de verdict pré-soumission | FR-018, FR-019 | NFR-018, NFR-029 | U03, T07 | E03-S07 |
| E03-S09 | Tableau tendances des verdicts | FR-019, FR-020 | NFR-029, NFR-031 | T07, P05 | E03-S08 |
| E03-S10 | Export rapport gate (verdict+preuves+actions) | FR-020, FR-011 | NFR-031, NFR-002 | P05, P06 | E03-S09 |
| E03-S11 | Pont d’ingestion des preuves UX vers G4-UX | FR-011, FR-012 | NFR-002, NFR-007 | P06, U03 | E03-S10 |
| E03-S12 | Gouvernance des exceptions de gate | FR-012, FR-013 | NFR-007, NFR-018 | U03, T07 | E03-S11 |

### Story E03-S01 — Gate Center unifié avec statut et owner
- **Epic parent:** E03 — Gate Engine unifié G1→G5 avec dual G4 bloquant
- **FR ciblés:** FR-011, FR-012
- **NFR ciblés:** NFR-002, NFR-007
- **Risques couverts:** T07 (Faux DONE via G4-UX mal câblé), P05 (Actions de mitigation non fermées)
- **Dépendance de réalisation:** E01-S12
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-011 est satisfaite: "Le système doit présenter G1→G5 dans une vue unique avec statut, owner et horodatage.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-012 sans contournement: "Le système doit afficher G4-T et G4-UX de manière distincte et corrélée.".
  - AC-03: Le seuil NFR est respecté: NFR-002 => p95 < 2.5s.
  - AC-04: Le second seuil de qualité est tenu: NFR-007 => <= 2s après preuve.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E03-S01 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E03-S02 — Évaluation duale G4-T/G4-UX corrélée
- **Epic parent:** E03 — Gate Engine unifié G1→G5 avec dual G4 bloquant
- **FR ciblés:** FR-012, FR-013
- **NFR ciblés:** NFR-007, NFR-018
- **Risques couverts:** P05 (Actions de mitigation non fermées), P06 (Contrôles ULTRA quality contournés)
- **Dépendance de réalisation:** E03-S01
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-012 est satisfaite: "Le système doit afficher G4-T et G4-UX de manière distincte et corrélée.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-013 sans contournement: "Le système doit calculer automatiquement PASS/CONCERNS/FAIL selon les règles de gate en vigueur.".
  - AC-03: Le seuil NFR est respecté: NFR-007 => <= 2s après preuve.
  - AC-04: Le second seuil de qualité est tenu: NFR-018 => >= 65% sur baseline.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E03-S02 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E03-S03 — Calculateur verdict PASS/CONCERNS/FAIL
- **Epic parent:** E03 — Gate Engine unifié G1→G5 avec dual G4 bloquant
- **FR ciblés:** FR-013, FR-014
- **NFR ciblés:** NFR-018, NFR-029
- **Risques couverts:** P06 (Contrôles ULTRA quality contournés), U03 (Non-conformité accessibilité WCAG 2.2 AA)
- **Dépendance de réalisation:** E03-S02
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-013 est satisfaite: "Le système doit calculer automatiquement PASS/CONCERNS/FAIL selon les règles de gate en vigueur.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-014 sans contournement: "Le système doit interdire DONE si G4-T ou G4-UX n’est pas PASS.".
  - AC-03: Le seuil NFR est respecté: NFR-018 => >= 65% sur baseline.
  - AC-04: Le second seuil de qualité est tenu: NFR-029 => chaîne preuve complète obligatoire.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E03-S03 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E03-S04 — Blocage DONE si sous-gate non PASS
- **Epic parent:** E03 — Gate Engine unifié G1→G5 avec dual G4 bloquant
- **FR ciblés:** FR-014, FR-015
- **NFR ciblés:** NFR-029, NFR-031
- **Risques couverts:** U03 (Non-conformité accessibilité WCAG 2.2 AA), T07 (Faux DONE via G4-UX mal câblé)
- **Dépendance de réalisation:** E03-S03
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-014 est satisfaite: "Le système doit interdire DONE si G4-T ou G4-UX n’est pas PASS.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-015 sans contournement: "Le système doit exiger au moins une preuve primaire liée pour toute décision de gate.".
  - AC-03: Le seuil NFR est respecté: NFR-029 => chaîne preuve complète obligatoire.
  - AC-04: Le second seuil de qualité est tenu: NFR-031 => 100% widgets critiques avec 4 états.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E03-S04 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E03-S05 — Validation preuve primaire obligatoire
- **Epic parent:** E03 — Gate Engine unifié G1→G5 avec dual G4 bloquant
- **FR ciblés:** FR-015, FR-016
- **NFR ciblés:** NFR-031, NFR-002
- **Risques couverts:** T07 (Faux DONE via G4-UX mal câblé), P05 (Actions de mitigation non fermées)
- **Dépendance de réalisation:** E03-S04
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-015 est satisfaite: "Le système doit exiger au moins une preuve primaire liée pour toute décision de gate.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-016 sans contournement: "Le système doit créer une action assignée avec échéance pour chaque gate en CONCERNS.".
  - AC-03: Le seuil NFR est respecté: NFR-031 => 100% widgets critiques avec 4 états.
  - AC-04: Le second seuil de qualité est tenu: NFR-002 => p95 < 2.5s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E03-S05 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E03-S06 — Création automatique actions CONCERNS
- **Epic parent:** E03 — Gate Engine unifié G1→G5 avec dual G4 bloquant
- **FR ciblés:** FR-016, FR-017
- **NFR ciblés:** NFR-002, NFR-007
- **Risques couverts:** P05 (Actions de mitigation non fermées), P06 (Contrôles ULTRA quality contournés)
- **Dépendance de réalisation:** E03-S05
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-016 est satisfaite: "Le système doit créer une action assignée avec échéance pour chaque gate en CONCERNS.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-017 sans contournement: "Le système doit versionner les règles de gate et historiser les changements.".
  - AC-03: Le seuil NFR est respecté: NFR-002 => p95 < 2.5s.
  - AC-04: Le second seuil de qualité est tenu: NFR-007 => <= 2s après preuve.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E03-S06 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E03-S07 — Versioning des policies de gate
- **Epic parent:** E03 — Gate Engine unifié G1→G5 avec dual G4 bloquant
- **FR ciblés:** FR-017, FR-018
- **NFR ciblés:** NFR-007, NFR-018
- **Risques couverts:** P06 (Contrôles ULTRA quality contournés), U03 (Non-conformité accessibilité WCAG 2.2 AA)
- **Dépendance de réalisation:** E03-S06
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-017 est satisfaite: "Le système doit versionner les règles de gate et historiser les changements.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-018 sans contournement: "Le système doit permettre une simulation de verdict avant soumission finale du gate.".
  - AC-03: Le seuil NFR est respecté: NFR-007 => <= 2s après preuve.
  - AC-04: Le second seuil de qualité est tenu: NFR-018 => >= 65% sur baseline.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E03-S07 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E03-S08 — Simulation de verdict pré-soumission
- **Epic parent:** E03 — Gate Engine unifié G1→G5 avec dual G4 bloquant
- **FR ciblés:** FR-018, FR-019
- **NFR ciblés:** NFR-018, NFR-029
- **Risques couverts:** U03 (Non-conformité accessibilité WCAG 2.2 AA), T07 (Faux DONE via G4-UX mal câblé)
- **Dépendance de réalisation:** E03-S07
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-018 est satisfaite: "Le système doit permettre une simulation de verdict avant soumission finale du gate.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-019 sans contournement: "Le système doit afficher les tendances PASS/CONCERNS/FAIL par phase et par période.".
  - AC-03: Le seuil NFR est respecté: NFR-018 => >= 65% sur baseline.
  - AC-04: Le second seuil de qualité est tenu: NFR-029 => chaîne preuve complète obligatoire.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E03-S08 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E03-S09 — Tableau tendances des verdicts
- **Epic parent:** E03 — Gate Engine unifié G1→G5 avec dual G4 bloquant
- **FR ciblés:** FR-019, FR-020
- **NFR ciblés:** NFR-029, NFR-031
- **Risques couverts:** T07 (Faux DONE via G4-UX mal câblé), P05 (Actions de mitigation non fermées)
- **Dépendance de réalisation:** E03-S08
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-019 est satisfaite: "Le système doit afficher les tendances PASS/CONCERNS/FAIL par phase et par période.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-020 sans contournement: "Le système doit exporter un rapport de gate incluant verdict, preuves et actions ouvertes.".
  - AC-03: Le seuil NFR est respecté: NFR-029 => chaîne preuve complète obligatoire.
  - AC-04: Le second seuil de qualité est tenu: NFR-031 => 100% widgets critiques avec 4 états.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E03-S09 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E03-S10 — Export rapport gate (verdict+preuves+actions)
- **Epic parent:** E03 — Gate Engine unifié G1→G5 avec dual G4 bloquant
- **FR ciblés:** FR-020, FR-011
- **NFR ciblés:** NFR-031, NFR-002
- **Risques couverts:** P05 (Actions de mitigation non fermées), P06 (Contrôles ULTRA quality contournés)
- **Dépendance de réalisation:** E03-S09
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-020 est satisfaite: "Le système doit exporter un rapport de gate incluant verdict, preuves et actions ouvertes.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-011 sans contournement: "Le système doit présenter G1→G5 dans une vue unique avec statut, owner et horodatage.".
  - AC-03: Le seuil NFR est respecté: NFR-031 => 100% widgets critiques avec 4 états.
  - AC-04: Le second seuil de qualité est tenu: NFR-002 => p95 < 2.5s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E03-S10 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E03-S11 — Pont d’ingestion des preuves UX vers G4-UX
- **Epic parent:** E03 — Gate Engine unifié G1→G5 avec dual G4 bloquant
- **FR ciblés:** FR-011, FR-012
- **NFR ciblés:** NFR-002, NFR-007
- **Risques couverts:** P06 (Contrôles ULTRA quality contournés), U03 (Non-conformité accessibilité WCAG 2.2 AA)
- **Dépendance de réalisation:** E03-S10
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-011 est satisfaite: "Le système doit présenter G1→G5 dans une vue unique avec statut, owner et horodatage.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-012 sans contournement: "Le système doit afficher G4-T et G4-UX de manière distincte et corrélée.".
  - AC-03: Le seuil NFR est respecté: NFR-002 => p95 < 2.5s.
  - AC-04: Le second seuil de qualité est tenu: NFR-007 => <= 2s après preuve.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E03-S11 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E03-S12 — Gouvernance des exceptions de gate
- **Epic parent:** E03 — Gate Engine unifié G1→G5 avec dual G4 bloquant
- **FR ciblés:** FR-012, FR-013
- **NFR ciblés:** NFR-007, NFR-018
- **Risques couverts:** U03 (Non-conformité accessibilité WCAG 2.2 AA), T07 (Faux DONE via G4-UX mal câblé)
- **Dépendance de réalisation:** E03-S11
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-012 est satisfaite: "Le système doit afficher G4-T et G4-UX de manière distincte et corrélée.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-013 sans contournement: "Le système doit calculer automatiquement PASS/CONCERNS/FAIL selon les règles de gate en vigueur.".
  - AC-03: Le seuil NFR est respecté: NFR-007 => <= 2s après preuve.
  - AC-04: Le second seuil de qualité est tenu: NFR-018 => >= 65% sur baseline.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E03-S12 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

## Epic E04 — Command Broker Zero-Trust
- **Objectif Epic:** Rendre toute commande write sûre, explicable et réversible avec contrôle d’accès strict.
- **Dépendances Epic:** E01, E03
- **Contrainte H06 clés:** H06-UXC-02
- **FR couverts (primaire):** FR-033, FR-034, FR-035, FR-036, FR-037, FR-038, FR-039, FR-040, FR-041, FR-042, FR-043, FR-044
- **NFR couverts (primaire):** NFR-019, NFR-020, NFR-021, NFR-022, NFR-023, NFR-024, NFR-025, NFR-026, NFR-020, NFR-021, NFR-022
- **Risques adressés (priorité):** S01, S02, S03, S04, S05, P07, T06

| Axe Epic | Décision de backlog | KPI de succès | Handoff aval |
|---|---|---|---|
| Scope | Séquence E04 découpée en 12 stories indépendantes mais cohérentes | 12/12 stories prêtes H11 | PM + SM |
| Testabilité | Chaque story porte AC + DoD + preuves | 0 story sans AC/DoD | TEA + UX QA |
| Qualité UX | Règles H06 reliées aux stories de l’Epic | 0 violation H06 critique | UX Designer + UX QA |
| Risques | Mitigations alignées au registre H02 | baisse exposition risques S01, S02 | PM + Architect |
| Readiness H10 | Évidences consolidées pour décision PASS/CONCERNS/FAIL | dossier Epic prêt | Architect |

| Risque Epic | Description | Mitigation portée par stories | Trigger d’alerte |
|---|---|---|---|
| S01 | Commande destructive sur mauvais projet | Stories E04 associées + contrôle gate | Écart seuil/KPI sur S01 |
| S02 | Injection d’arguments shell | Stories E04 associées + contrôle gate | Écart seuil/KPI sur S02 |
| S03 | RBAC trop permissif | Stories E04 associées + contrôle gate | Écart seuil/KPI sur S03 |
| S04 | Journal d’audit altérable | Stories E04 associées + contrôle gate | Écart seuil/KPI sur S04 |
| S05 | Fuite de secrets dans les logs | Stories E04 associées + contrôle gate | Écart seuil/KPI sur S05 |
| P07 | Erreur de contexte multi-projets | Stories E04 associées + contrôle gate | Écart seuil/KPI sur P07 |
| T06 | Couplage excessif aux scripts legacy | Stories E04 associées + contrôle gate | Écart seuil/KPI sur T06 |

## Epic E04 — Stories détaillées
| Story ID | Titre | FR clés | NFR clés | Risques | Dépendance story |
|---|---|---|---|---|---|
| E04-S01 | Catalogue commandes allowlist versionné | FR-033, FR-034 | NFR-019, NFR-020 | S01, S02 | E01-S12 |
| E04-S02 | Dry-run by default pour toute commande write | FR-034, FR-035 | NFR-020, NFR-021 | S02, S03 | E04-S01 |
| E04-S03 | Preview d’impact fichiers avant apply | FR-035, FR-036 | NFR-021, NFR-022 | S03, S04 | E04-S02 |
| E04-S04 | Double confirmation pour actions destructives | FR-036, FR-037 | NFR-022, NFR-023 | S04, S05 | E04-S03 |
| E04-S05 | Contrôle RBAC avant exécution | FR-037, FR-038 | NFR-023, NFR-024 | S05, P07 | E04-S04 |
| E04-S06 | Contexte actif signé active_project_root | FR-038, FR-039 | NFR-024, NFR-025 | P07, T06 | E04-S05 |
| E04-S07 | Journal append-only des commandes | FR-039, FR-040 | NFR-025, NFR-026 | T06, S01 | E04-S06 |
| E04-S08 | Timeout/retry/idempotency key pilotés | FR-040, FR-041 | NFR-026, NFR-020 | S01, S02 | E04-S07 |
| E04-S09 | Ordonnancement concurrent et backpressure | FR-041, FR-042 | NFR-020, NFR-021 | S02, S03 | E04-S08 |
| E04-S10 | Kill-switch opérationnel immédiat | FR-042, FR-043 | NFR-021, NFR-022 | S03, S04 | E04-S09 |
| E04-S11 | Override policy avec approbation nominative | FR-043, FR-044 | NFR-022, NFR-019 | S04, S05 | E04-S10 |
| E04-S12 | Bibliothèque templates de commandes validées | FR-044, FR-033 | NFR-019, NFR-020 | S05, P07 | E04-S11 |

### Story E04-S01 — Catalogue commandes allowlist versionné
- **Epic parent:** E04 — Command Broker Zero-Trust
- **FR ciblés:** FR-033, FR-034
- **NFR ciblés:** NFR-019, NFR-020
- **Risques couverts:** S01 (Commande destructive sur mauvais projet), S02 (Injection d’arguments shell)
- **Dépendance de réalisation:** E01-S12
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-033 est satisfaite: "Le système doit exposer un catalogue de commandes autorisées avec paramètres contrôlés.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-034 sans contournement: "Le système doit proposer un dry-run par défaut pour toute commande d’écriture.".
  - AC-03: Le seuil NFR est respecté: NFR-019 => 0 action critique hors rôle.
  - AC-04: Le second seuil de qualité est tenu: NFR-020 => 100% commandes exécutées issues catalogue.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E04-S01 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E04-S02 — Dry-run by default pour toute commande write
- **Epic parent:** E04 — Command Broker Zero-Trust
- **FR ciblés:** FR-034, FR-035
- **NFR ciblés:** NFR-020, NFR-021
- **Risques couverts:** S02 (Injection d’arguments shell), S03 (RBAC trop permissif)
- **Dépendance de réalisation:** E04-S01
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-034 est satisfaite: "Le système doit proposer un dry-run par défaut pour toute commande d’écriture.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-035 sans contournement: "Le système doit afficher les fichiers potentiellement impactés avant exécution réelle.".
  - AC-03: Le seuil NFR est respecté: NFR-020 => 100% commandes exécutées issues catalogue.
  - AC-04: Le second seuil de qualité est tenu: NFR-021 => 0 exécution destructive hors projet actif.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E04-S02 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E04-S03 — Preview d’impact fichiers avant apply
- **Epic parent:** E04 — Command Broker Zero-Trust
- **FR ciblés:** FR-035, FR-036
- **NFR ciblés:** NFR-021, NFR-022
- **Risques couverts:** S03 (RBAC trop permissif), S04 (Journal d’audit altérable)
- **Dépendance de réalisation:** E04-S02
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-035 est satisfaite: "Le système doit afficher les fichiers potentiellement impactés avant exécution réelle.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-036 sans contournement: "Le système doit imposer une double confirmation pour les commandes à impact élevé.".
  - AC-03: Le seuil NFR est respecté: NFR-021 => 0 exécution destructive hors projet actif.
  - AC-04: Le second seuil de qualité est tenu: NFR-022 => intégrité vérifiée quotidienne.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E04-S03 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E04-S04 — Double confirmation pour actions destructives
- **Epic parent:** E04 — Command Broker Zero-Trust
- **FR ciblés:** FR-036, FR-037
- **NFR ciblés:** NFR-022, NFR-023
- **Risques couverts:** S04 (Journal d’audit altérable), S05 (Fuite de secrets dans les logs)
- **Dépendance de réalisation:** E04-S03
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-036 est satisfaite: "Le système doit imposer une double confirmation pour les commandes à impact élevé.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-037 sans contournement: "Le système doit vérifier les permissions role-based avant chaque exécution.".
  - AC-03: Le seuil NFR est respecté: NFR-022 => intégrité vérifiée quotidienne.
  - AC-04: Le second seuil de qualité est tenu: NFR-023 => 0 secret exposé dans logs persistés.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E04-S04 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E04-S05 — Contrôle RBAC avant exécution
- **Epic parent:** E04 — Command Broker Zero-Trust
- **FR ciblés:** FR-037, FR-038
- **NFR ciblés:** NFR-023, NFR-024
- **Risques couverts:** S05 (Fuite de secrets dans les logs), P07 (Erreur de contexte multi-projets)
- **Dépendance de réalisation:** E04-S04
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-037 est satisfaite: "Le système doit vérifier les permissions role-based avant chaque exécution.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-038 sans contournement: "Le système doit signer active_project_root et refuser les exécutions ambiguës.".
  - AC-03: Le seuil NFR est respecté: NFR-023 => 0 secret exposé dans logs persistés.
  - AC-04: Le second seuil de qualité est tenu: NFR-024 => 100% overrides avec approbateur.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E04-S05 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E04-S06 — Contexte actif signé active_project_root
- **Epic parent:** E04 — Command Broker Zero-Trust
- **FR ciblés:** FR-038, FR-039
- **NFR ciblés:** NFR-024, NFR-025
- **Risques couverts:** P07 (Erreur de contexte multi-projets), T06 (Couplage excessif aux scripts legacy)
- **Dépendance de réalisation:** E04-S05
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-038 est satisfaite: "Le système doit signer active_project_root et refuser les exécutions ambiguës.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-039 sans contournement: "Le système doit enregistrer commande, acteur, approbateur, résultat dans un journal append-only.".
  - AC-03: Le seuil NFR est respecté: NFR-024 => 100% overrides avec approbateur.
  - AC-04: Le second seuil de qualité est tenu: NFR-025 => timeout max 120s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E04-S06 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E04-S07 — Journal append-only des commandes
- **Epic parent:** E04 — Command Broker Zero-Trust
- **FR ciblés:** FR-039, FR-040
- **NFR ciblés:** NFR-025, NFR-026
- **Risques couverts:** T06 (Couplage excessif aux scripts legacy), S01 (Commande destructive sur mauvais projet)
- **Dépendance de réalisation:** E04-S06
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-039 est satisfaite: "Le système doit enregistrer commande, acteur, approbateur, résultat dans un journal append-only.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-040 sans contournement: "Le système doit appliquer des timeouts, retries bornés et idempotency key pour les runs.".
  - AC-03: Le seuil NFR est respecté: NFR-025 => timeout max 120s.
  - AC-04: Le second seuil de qualité est tenu: NFR-026 => <24h après changement rôle.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E04-S07 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E04-S08 — Timeout/retry/idempotency key pilotés
- **Epic parent:** E04 — Command Broker Zero-Trust
- **FR ciblés:** FR-040, FR-041
- **NFR ciblés:** NFR-026, NFR-020
- **Risques couverts:** S01 (Commande destructive sur mauvais projet), S02 (Injection d’arguments shell)
- **Dépendance de réalisation:** E04-S07
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-040 est satisfaite: "Le système doit appliquer des timeouts, retries bornés et idempotency key pour les runs.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-041 sans contournement: "Le système doit séquencer les commandes concurrentes selon priorité et capacité.".
  - AC-03: Le seuil NFR est respecté: NFR-026 => <24h après changement rôle.
  - AC-04: Le second seuil de qualité est tenu: NFR-020 => 100% commandes exécutées issues catalogue.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E04-S08 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E04-S09 — Ordonnancement concurrent et backpressure
- **Epic parent:** E04 — Command Broker Zero-Trust
- **FR ciblés:** FR-041, FR-042
- **NFR ciblés:** NFR-020, NFR-021
- **Risques couverts:** S02 (Injection d’arguments shell), S03 (RBAC trop permissif)
- **Dépendance de réalisation:** E04-S08
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-041 est satisfaite: "Le système doit séquencer les commandes concurrentes selon priorité et capacité.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-042 sans contournement: "Le système doit permettre l’arrêt immédiat des commandes d’écriture en cas d’incident critique.".
  - AC-03: Le seuil NFR est respecté: NFR-020 => 100% commandes exécutées issues catalogue.
  - AC-04: Le second seuil de qualité est tenu: NFR-021 => 0 exécution destructive hors projet actif.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E04-S09 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E04-S10 — Kill-switch opérationnel immédiat
- **Epic parent:** E04 — Command Broker Zero-Trust
- **FR ciblés:** FR-042, FR-043
- **NFR ciblés:** NFR-021, NFR-022
- **Risques couverts:** S03 (RBAC trop permissif), S04 (Journal d’audit altérable)
- **Dépendance de réalisation:** E04-S09
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-042 est satisfaite: "Le système doit permettre l’arrêt immédiat des commandes d’écriture en cas d’incident critique.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-043 sans contournement: "Le système doit exiger approbation nominative pour tout override de policy.".
  - AC-03: Le seuil NFR est respecté: NFR-021 => 0 exécution destructive hors projet actif.
  - AC-04: Le second seuil de qualité est tenu: NFR-022 => intégrité vérifiée quotidienne.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E04-S10 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E04-S11 — Override policy avec approbation nominative
- **Epic parent:** E04 — Command Broker Zero-Trust
- **FR ciblés:** FR-043, FR-044
- **NFR ciblés:** NFR-022, NFR-019
- **Risques couverts:** S04 (Journal d’audit altérable), S05 (Fuite de secrets dans les logs)
- **Dépendance de réalisation:** E04-S10
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-043 est satisfaite: "Le système doit exiger approbation nominative pour tout override de policy.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-044 sans contournement: "Le système doit fournir des templates de commande validés pour réduire les erreurs humaines.".
  - AC-03: Le seuil NFR est respecté: NFR-022 => intégrité vérifiée quotidienne.
  - AC-04: Le second seuil de qualité est tenu: NFR-019 => 0 action critique hors rôle.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E04-S11 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E04-S12 — Bibliothèque templates de commandes validées
- **Epic parent:** E04 — Command Broker Zero-Trust
- **FR ciblés:** FR-044, FR-033
- **NFR ciblés:** NFR-019, NFR-020
- **Risques couverts:** S05 (Fuite de secrets dans les logs), P07 (Erreur de contexte multi-projets)
- **Dépendance de réalisation:** E04-S11
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-044 est satisfaite: "Le système doit fournir des templates de commande validés pour réduire les erreurs humaines.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-033 sans contournement: "Le système doit exposer un catalogue de commandes autorisées avec paramètres contrôlés.".
  - AC-03: Le seuil NFR est respecté: NFR-019 => 0 action critique hors rôle.
  - AC-04: Le second seuil de qualité est tenu: NFR-020 => 100% commandes exécutées issues catalogue.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E04-S12 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

## Epic E05 — AQCD & Risk Intelligence
- **Objectif Epic:** Transformer les signaux projet en recommandations actionnables pour réduire le Time-to-confident-decision.
- **Dépendances Epic:** E02, E03
- **Contrainte H06 clés:** H06-UXC-06, H06-UXC-08
- **FR couverts (primaire):** FR-045, FR-046, FR-047, FR-048, FR-049, FR-050, FR-051, FR-052, FR-053, FR-054
- **NFR couverts (primaire):** NFR-009, NFR-018, NFR-034, NFR-035
- **Risques adressés (priorité):** M02, M08, P05, C01, C02

| Axe Epic | Décision de backlog | KPI de succès | Handoff aval |
|---|---|---|---|
| Scope | Séquence E05 découpée en 12 stories indépendantes mais cohérentes | 12/12 stories prêtes H11 | PM + SM |
| Testabilité | Chaque story porte AC + DoD + preuves | 0 story sans AC/DoD | TEA + UX QA |
| Qualité UX | Règles H06 reliées aux stories de l’Epic | 0 violation H06 critique | UX Designer + UX QA |
| Risques | Mitigations alignées au registre H02 | baisse exposition risques M02, M08 | PM + Architect |
| Readiness H10 | Évidences consolidées pour décision PASS/CONCERNS/FAIL | dossier Epic prêt | Architect |

| Risque Epic | Description | Mitigation portée par stories | Trigger d’alerte |
|---|---|---|---|
| M02 | ROI TCD non démontré | Stories E05 associées + contrôle gate | Écart seuil/KPI sur M02 |
| M08 | Lisibilité AQCD insuffisante pour sponsor | Stories E05 associées + contrôle gate | Écart seuil/KPI sur M08 |
| P05 | Actions de mitigation non fermées | Stories E05 associées + contrôle gate | Écart seuil/KPI sur P05 |
| C01 | Explosion des coûts token | Stories E05 associées + contrôle gate | Écart seuil/KPI sur C01 |
| C02 | Surcoût stockage ledger/projections | Stories E05 associées + contrôle gate | Écart seuil/KPI sur C02 |

## Epic E05 — Stories détaillées
| Story ID | Titre | FR clés | NFR clés | Risques | Dépendance story |
|---|---|---|---|---|---|
| E05-S01 | Tableau AQCD explicable (formule + source) | FR-045, FR-046 | NFR-009, NFR-018 | M02, M08 | E02-S12 |
| E05-S02 | Snapshots AQCD périodiques et comparatifs | FR-046, FR-047 | NFR-018, NFR-034 | M08, P05 | E05-S01 |
| E05-S03 | Readiness score rule-based v1 | FR-047, FR-048 | NFR-034, NFR-035 | P05, C01 | E05-S02 |
| E05-S04 | Top 3 actions prioritaires par gate | FR-048, FR-049 | NFR-035, NFR-009 | C01, C02 | E05-S03 |
| E05-S05 | Registre risques vivant owner/échéance/statut | FR-049, FR-050 | NFR-009, NFR-018 | C02, M02 | E05-S04 |
| E05-S06 | Lien mitigation -> task -> preuve de fermeture | FR-050, FR-051 | NFR-018, NFR-034 | M02, M08 | E05-S05 |
| E05-S07 | Heatmap risques probabilité/impact | FR-051, FR-052 | NFR-034, NFR-035 | M08, P05 | E05-S06 |
| E05-S08 | Coût moyen par décision validée | FR-052, FR-053 | NFR-035, NFR-009 | P05, C01 | E05-S07 |
| E05-S09 | Waste ratio par phase + alertes dérive | FR-053, FR-054 | NFR-009, NFR-018 | C01, C02 | E05-S08 |
| E05-S10 | Suivi actions H21/H22/H23 jusqu’à clôture | FR-054, FR-045 | NFR-018, NFR-034 | C02, M02 | E05-S09 |
| E05-S11 | Vue exécutive sponsor simplifiée | FR-045, FR-046 | NFR-034, NFR-035 | M02, M08 | E05-S10 |
| E05-S12 | Instrumentation baseline TCD et ROI | FR-046, FR-047 | NFR-035, NFR-009 | M08, P05 | E05-S11 |

### Story E05-S01 — Tableau AQCD explicable (formule + source)
- **Epic parent:** E05 — AQCD & Risk Intelligence
- **FR ciblés:** FR-045, FR-046
- **NFR ciblés:** NFR-009, NFR-018
- **Risques couverts:** M02 (ROI TCD non démontré), M08 (Lisibilité AQCD insuffisante pour sponsor)
- **Dépendance de réalisation:** E02-S12
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-045 est satisfaite: "Le système doit afficher les scores A/Q/C/D avec formule et source de données.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-046 sans contournement: "Le système doit conserver des snapshots AQCD par période pour analyse de tendance.".
  - AC-03: Le seuil NFR est respecté: NFR-009 => p95 < 2.5s.
  - AC-04: Le second seuil de qualité est tenu: NFR-018 => >= 65% sur baseline.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E05-S01 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E05-S02 — Snapshots AQCD périodiques et comparatifs
- **Epic parent:** E05 — AQCD & Risk Intelligence
- **FR ciblés:** FR-046, FR-047
- **NFR ciblés:** NFR-018, NFR-034
- **Risques couverts:** M08 (Lisibilité AQCD insuffisante pour sponsor), P05 (Actions de mitigation non fermées)
- **Dépendance de réalisation:** E05-S01
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-046 est satisfaite: "Le système doit conserver des snapshots AQCD par période pour analyse de tendance.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-047 sans contournement: "Le système doit calculer un readiness score rules-based avec facteurs contributifs visibles.".
  - AC-03: Le seuil NFR est respecté: NFR-018 => >= 65% sur baseline.
  - AC-04: Le second seuil de qualité est tenu: NFR-034 => métriques clés disponibles en continu.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E05-S02 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E05-S03 — Readiness score rule-based v1
- **Epic parent:** E05 — AQCD & Risk Intelligence
- **FR ciblés:** FR-047, FR-048
- **NFR ciblés:** NFR-034, NFR-035
- **Risques couverts:** P05 (Actions de mitigation non fermées), C01 (Explosion des coûts token)
- **Dépendance de réalisation:** E05-S02
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-047 est satisfaite: "Le système doit calculer un readiness score rules-based avec facteurs contributifs visibles.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-048 sans contournement: "Le système doit proposer les 3 actions prioritaires par gate avec owner et preuve.".
  - AC-03: Le seuil NFR est respecté: NFR-034 => métriques clés disponibles en continu.
  - AC-04: Le second seuil de qualité est tenu: NFR-035 => runbook critique disponible et testé.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E05-S03 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E05-S04 — Top 3 actions prioritaires par gate
- **Epic parent:** E05 — AQCD & Risk Intelligence
- **FR ciblés:** FR-048, FR-049
- **NFR ciblés:** NFR-035, NFR-009
- **Risques couverts:** C01 (Explosion des coûts token), C02 (Surcoût stockage ledger/projections)
- **Dépendance de réalisation:** E05-S03
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-048 est satisfaite: "Le système doit proposer les 3 actions prioritaires par gate avec owner et preuve.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-049 sans contournement: "Le système doit maintenir un registre risques avec owner, échéance, statut et exposition.".
  - AC-03: Le seuil NFR est respecté: NFR-035 => runbook critique disponible et testé.
  - AC-04: Le second seuil de qualité est tenu: NFR-009 => p95 < 2.5s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E05-S04 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E05-S05 — Registre risques vivant owner/échéance/statut
- **Epic parent:** E05 — AQCD & Risk Intelligence
- **FR ciblés:** FR-049, FR-050
- **NFR ciblés:** NFR-009, NFR-018
- **Risques couverts:** C02 (Surcoût stockage ledger/projections), M02 (ROI TCD non démontré)
- **Dépendance de réalisation:** E05-S04
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-049 est satisfaite: "Le système doit maintenir un registre risques avec owner, échéance, statut et exposition.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-050 sans contournement: "Le système doit lier chaque mitigation à une tâche et à une preuve de fermeture.".
  - AC-03: Le seuil NFR est respecté: NFR-009 => p95 < 2.5s.
  - AC-04: Le second seuil de qualité est tenu: NFR-018 => >= 65% sur baseline.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E05-S05 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E05-S06 — Lien mitigation -> task -> preuve de fermeture
- **Epic parent:** E05 — AQCD & Risk Intelligence
- **FR ciblés:** FR-050, FR-051
- **NFR ciblés:** NFR-018, NFR-034
- **Risques couverts:** M02 (ROI TCD non démontré), M08 (Lisibilité AQCD insuffisante pour sponsor)
- **Dépendance de réalisation:** E05-S05
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-050 est satisfaite: "Le système doit lier chaque mitigation à une tâche et à une preuve de fermeture.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-051 sans contournement: "Le système doit afficher une heatmap probabilité/impact et son évolution.".
  - AC-03: Le seuil NFR est respecté: NFR-018 => >= 65% sur baseline.
  - AC-04: Le second seuil de qualité est tenu: NFR-034 => métriques clés disponibles en continu.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E05-S06 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E05-S07 — Heatmap risques probabilité/impact
- **Epic parent:** E05 — AQCD & Risk Intelligence
- **FR ciblés:** FR-051, FR-052
- **NFR ciblés:** NFR-034, NFR-035
- **Risques couverts:** M08 (Lisibilité AQCD insuffisante pour sponsor), P05 (Actions de mitigation non fermées)
- **Dépendance de réalisation:** E05-S06
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-051 est satisfaite: "Le système doit afficher une heatmap probabilité/impact et son évolution.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-052 sans contournement: "Le système doit calculer le coût moyen par décision validée.".
  - AC-03: Le seuil NFR est respecté: NFR-034 => métriques clés disponibles en continu.
  - AC-04: Le second seuil de qualité est tenu: NFR-035 => runbook critique disponible et testé.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E05-S07 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E05-S08 — Coût moyen par décision validée
- **Epic parent:** E05 — AQCD & Risk Intelligence
- **FR ciblés:** FR-052, FR-053
- **NFR ciblés:** NFR-035, NFR-009
- **Risques couverts:** P05 (Actions de mitigation non fermées), C01 (Explosion des coûts token)
- **Dépendance de réalisation:** E05-S07
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-052 est satisfaite: "Le système doit calculer le coût moyen par décision validée.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-053 sans contournement: "Le système doit mesurer le waste ratio par phase et déclencher alerte en dérive.".
  - AC-03: Le seuil NFR est respecté: NFR-035 => runbook critique disponible et testé.
  - AC-04: Le second seuil de qualité est tenu: NFR-009 => p95 < 2.5s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E05-S08 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E05-S09 — Waste ratio par phase + alertes dérive
- **Epic parent:** E05 — AQCD & Risk Intelligence
- **FR ciblés:** FR-053, FR-054
- **NFR ciblés:** NFR-009, NFR-018
- **Risques couverts:** C01 (Explosion des coûts token), C02 (Surcoût stockage ledger/projections)
- **Dépendance de réalisation:** E05-S08
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-053 est satisfaite: "Le système doit mesurer le waste ratio par phase et déclencher alerte en dérive.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-054 sans contournement: "Le système doit suivre les actions H21/H22/H23 jusqu’à clôture vérifiée.".
  - AC-03: Le seuil NFR est respecté: NFR-009 => p95 < 2.5s.
  - AC-04: Le second seuil de qualité est tenu: NFR-018 => >= 65% sur baseline.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E05-S09 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E05-S10 — Suivi actions H21/H22/H23 jusqu’à clôture
- **Epic parent:** E05 — AQCD & Risk Intelligence
- **FR ciblés:** FR-054, FR-045
- **NFR ciblés:** NFR-018, NFR-034
- **Risques couverts:** C02 (Surcoût stockage ledger/projections), M02 (ROI TCD non démontré)
- **Dépendance de réalisation:** E05-S09
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-054 est satisfaite: "Le système doit suivre les actions H21/H22/H23 jusqu’à clôture vérifiée.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-045 sans contournement: "Le système doit afficher les scores A/Q/C/D avec formule et source de données.".
  - AC-03: Le seuil NFR est respecté: NFR-018 => >= 65% sur baseline.
  - AC-04: Le second seuil de qualité est tenu: NFR-034 => métriques clés disponibles en continu.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E05-S10 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E05-S11 — Vue exécutive sponsor simplifiée
- **Epic parent:** E05 — AQCD & Risk Intelligence
- **FR ciblés:** FR-045, FR-046
- **NFR ciblés:** NFR-034, NFR-035
- **Risques couverts:** M02 (ROI TCD non démontré), M08 (Lisibilité AQCD insuffisante pour sponsor)
- **Dépendance de réalisation:** E05-S10
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-045 est satisfaite: "Le système doit afficher les scores A/Q/C/D avec formule et source de données.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-046 sans contournement: "Le système doit conserver des snapshots AQCD par période pour analyse de tendance.".
  - AC-03: Le seuil NFR est respecté: NFR-034 => métriques clés disponibles en continu.
  - AC-04: Le second seuil de qualité est tenu: NFR-035 => runbook critique disponible et testé.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E05-S11 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E05-S12 — Instrumentation baseline TCD et ROI
- **Epic parent:** E05 — AQCD & Risk Intelligence
- **FR ciblés:** FR-046, FR-047
- **NFR ciblés:** NFR-035, NFR-009
- **Risques couverts:** M08 (Lisibilité AQCD insuffisante pour sponsor), P05 (Actions de mitigation non fermées)
- **Dépendance de réalisation:** E05-S11
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-046 est satisfaite: "Le système doit conserver des snapshots AQCD par période pour analyse de tendance.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-047 sans contournement: "Le système doit calculer un readiness score rules-based avec facteurs contributifs visibles.".
  - AC-03: Le seuil NFR est respecté: NFR-035 => runbook critique disponible et testé.
  - AC-04: Le second seuil de qualité est tenu: NFR-009 => p95 < 2.5s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E05-S12 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

## Epic E06 — UX Quality Controls & Design Governance
- **Objectif Epic:** Assurer la conformité G4-UX (a11y, responsive, states, clarté) comme condition bloquante de DONE.
- **Dépendances Epic:** E03
- **Contrainte H06 clés:** H06-UXC-03, H06-UXC-04, H06-UXC-05, H06-UXC-07, H06-UXC-09
- **FR couverts (primaire):** FR-063, FR-064, FR-065, FR-066, FR-067, FR-068, FR-069, FR-070
- **NFR couverts (primaire):** NFR-030, NFR-031, NFR-032, NFR-033, NFR-040
- **Risques adressés (priorité):** U01, U02, U03, U04, C05, T07

| Axe Epic | Décision de backlog | KPI de succès | Handoff aval |
|---|---|---|---|
| Scope | Séquence E06 découpée en 12 stories indépendantes mais cohérentes | 12/12 stories prêtes H11 | PM + SM |
| Testabilité | Chaque story porte AC + DoD + preuves | 0 story sans AC/DoD | TEA + UX QA |
| Qualité UX | Règles H06 reliées aux stories de l’Epic | 0 violation H06 critique | UX Designer + UX QA |
| Risques | Mitigations alignées au registre H02 | baisse exposition risques U01, U02 | PM + Architect |
| Readiness H10 | Évidences consolidées pour décision PASS/CONCERNS/FAIL | dossier Epic prêt | Architect |

| Risque Epic | Description | Mitigation portée par stories | Trigger d’alerte |
|---|---|---|---|
| U01 | Surcharge cognitive du cockpit | Stories E06 associées + contrôle gate | Écart seuil/KPI sur U01 |
| U02 | États UI incomplets | Stories E06 associées + contrôle gate | Écart seuil/KPI sur U02 |
| U03 | Non-conformité accessibilité WCAG 2.2 AA | Stories E06 associées + contrôle gate | Écart seuil/KPI sur U03 |
| U04 | Responsive dégradé sur tablettes/laptops denses | Stories E06 associées + contrôle gate | Écart seuil/KPI sur U04 |
| C05 | Coût de rework UX après validation tardive | Stories E06 associées + contrôle gate | Écart seuil/KPI sur C05 |
| T07 | Faux DONE via G4-UX mal câblé | Stories E06 associées + contrôle gate | Écart seuil/KPI sur T07 |

## Epic E06 — Stories détaillées
| Story ID | Titre | FR clés | NFR clés | Risques | Dépendance story |
|---|---|---|---|---|---|
| E06-S01 | Contrat 4 états pour widgets critiques | FR-063, FR-064 | NFR-030, NFR-031 | U01, U02 | E03-S12 |
| E06-S02 | Navigation clavier complète + focus visible | FR-064, FR-065 | NFR-031, NFR-032 | U02, U03 | E06-S01 |
| E06-S03 | Conformité contraste WCAG 2.2 AA | FR-065, FR-066 | NFR-032, NFR-033 | U03, U04 | E06-S02 |
| E06-S04 | Responsive 360/768/1366/1920 sans perte décisionnelle | FR-066, FR-067 | NFR-033, NFR-040 | U04, C05 | E06-S03 |
| E06-S05 | Liaison captures UX et verdicts G4-UX | FR-067, FR-068 | NFR-040, NFR-030 | C05, T07 | E06-S04 |
| E06-S06 | UX debt lane et plan de réduction | FR-068, FR-069 | NFR-030, NFR-031 | T07, U01 | E06-S05 |
| E06-S07 | Glossaire BMAD contextuel intégré | FR-069, FR-070 | NFR-031, NFR-032 | U01, U02 | E06-S06 |
| E06-S08 | Lint design tokens anti-style rogue | FR-070, FR-063 | NFR-032, NFR-033 | U02, U03 | E06-S07 |
| E06-S09 | Catalogue microcopie PASS/CONCERNS/FAIL | FR-063, FR-064 | NFR-033, NFR-040 | U03, U04 | E06-S08 |
| E06-S10 | Préférences motion (prefers-reduced-motion) | FR-064, FR-065 | NFR-040, NFR-030 | U04, C05 | E06-S09 |
| E06-S11 | Harnais de tests usability rapides | FR-065, FR-066 | NFR-030, NFR-031 | C05, T07 | E06-S10 |
| E06-S12 | Tableau de bord régressions UX | FR-066, FR-067 | NFR-031, NFR-032 | T07, U01 | E06-S11 |

### Story E06-S01 — Contrat 4 états pour widgets critiques
- **Epic parent:** E06 — UX Quality Controls & Design Governance
- **FR ciblés:** FR-063, FR-064
- **NFR ciblés:** NFR-030, NFR-031
- **Risques couverts:** U01 (Surcharge cognitive du cockpit), U02 (États UI incomplets)
- **Dépendance de réalisation:** E03-S12
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-063 est satisfaite: "Le système doit implémenter loading/empty/error/success sur toutes les vues critiques.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-064 sans contournement: "Le système doit supporter une navigation clavier complète avec focus visible et logique.".
  - AC-03: Le seuil NFR est respecté: NFR-030 => score >= 85 + 0 blocker.
  - AC-04: Le second seuil de qualité est tenu: NFR-031 => 100% widgets critiques avec 4 états.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E06-S01 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E06-S02 — Navigation clavier complète + focus visible
- **Epic parent:** E06 — UX Quality Controls & Design Governance
- **FR ciblés:** FR-064, FR-065
- **NFR ciblés:** NFR-031, NFR-032
- **Risques couverts:** U02 (États UI incomplets), U03 (Non-conformité accessibilité WCAG 2.2 AA)
- **Dépendance de réalisation:** E06-S01
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-064 est satisfaite: "Le système doit supporter une navigation clavier complète avec focus visible et logique.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-065 sans contournement: "Le système doit respecter les contrastes WCAG 2.2 AA sur les surfaces critiques.".
  - AC-03: Le seuil NFR est respecté: NFR-031 => 100% widgets critiques avec 4 états.
  - AC-04: Le second seuil de qualité est tenu: NFR-032 => parcours critiques validés mobile/tablette/desktop.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E06-S02 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E06-S03 — Conformité contraste WCAG 2.2 AA
- **Epic parent:** E06 — UX Quality Controls & Design Governance
- **FR ciblés:** FR-065, FR-066
- **NFR ciblés:** NFR-032, NFR-033
- **Risques couverts:** U03 (Non-conformité accessibilité WCAG 2.2 AA), U04 (Responsive dégradé sur tablettes/laptops denses)
- **Dépendance de réalisation:** E06-S02
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-065 est satisfaite: "Le système doit respecter les contrastes WCAG 2.2 AA sur les surfaces critiques.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-066 sans contournement: "Le système doit rester exploitable sur mobile, tablette et desktop standard.".
  - AC-03: Le seuil NFR est respecté: NFR-032 => parcours critiques validés mobile/tablette/desktop.
  - AC-04: Le second seuil de qualité est tenu: NFR-033 => décision critique en <90s pour PER-01.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E06-S03 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E06-S04 — Responsive 360/768/1366/1920 sans perte décisionnelle
- **Epic parent:** E06 — UX Quality Controls & Design Governance
- **FR ciblés:** FR-066, FR-067
- **NFR ciblés:** NFR-033, NFR-040
- **Risques couverts:** U04 (Responsive dégradé sur tablettes/laptops denses), C05 (Coût de rework UX après validation tardive)
- **Dépendance de réalisation:** E06-S03
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-066 est satisfaite: "Le système doit rester exploitable sur mobile, tablette et desktop standard.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-067 sans contournement: "Le système doit lier captures et verdicts UX aux sous-gates G4-UX.".
  - AC-03: Le seuil NFR est respecté: NFR-033 => décision critique en <90s pour PER-01.
  - AC-04: Le second seuil de qualité est tenu: NFR-040 => time-to-first-value < 14 jours.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E06-S04 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E06-S05 — Liaison captures UX et verdicts G4-UX
- **Epic parent:** E06 — UX Quality Controls & Design Governance
- **FR ciblés:** FR-067, FR-068
- **NFR ciblés:** NFR-040, NFR-030
- **Risques couverts:** C05 (Coût de rework UX après validation tardive), T07 (Faux DONE via G4-UX mal câblé)
- **Dépendance de réalisation:** E06-S04
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-067 est satisfaite: "Le système doit lier captures et verdicts UX aux sous-gates G4-UX.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-068 sans contournement: "Le système doit visualiser les dettes UX ouvertes et leur plan de réduction.".
  - AC-03: Le seuil NFR est respecté: NFR-040 => time-to-first-value < 14 jours.
  - AC-04: Le second seuil de qualité est tenu: NFR-030 => score >= 85 + 0 blocker.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E06-S05 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E06-S06 — UX debt lane et plan de réduction
- **Epic parent:** E06 — UX Quality Controls & Design Governance
- **FR ciblés:** FR-068, FR-069
- **NFR ciblés:** NFR-030, NFR-031
- **Risques couverts:** T07 (Faux DONE via G4-UX mal câblé), U01 (Surcharge cognitive du cockpit)
- **Dépendance de réalisation:** E06-S05
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-068 est satisfaite: "Le système doit visualiser les dettes UX ouvertes et leur plan de réduction.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-069 sans contournement: "Le système doit afficher des définitions BMAD contextuelles pour réduire ambiguïtés.".
  - AC-03: Le seuil NFR est respecté: NFR-030 => score >= 85 + 0 blocker.
  - AC-04: Le second seuil de qualité est tenu: NFR-031 => 100% widgets critiques avec 4 états.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E06-S06 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E06-S07 — Glossaire BMAD contextuel intégré
- **Epic parent:** E06 — UX Quality Controls & Design Governance
- **FR ciblés:** FR-069, FR-070
- **NFR ciblés:** NFR-031, NFR-032
- **Risques couverts:** U01 (Surcharge cognitive du cockpit), U02 (États UI incomplets)
- **Dépendance de réalisation:** E06-S06
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-069 est satisfaite: "Le système doit afficher des définitions BMAD contextuelles pour réduire ambiguïtés.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-070 sans contournement: "Le système doit vérifier la cohérence spacing/typo/couleurs selon design system.".
  - AC-03: Le seuil NFR est respecté: NFR-031 => 100% widgets critiques avec 4 états.
  - AC-04: Le second seuil de qualité est tenu: NFR-032 => parcours critiques validés mobile/tablette/desktop.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E06-S07 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E06-S08 — Lint design tokens anti-style rogue
- **Epic parent:** E06 — UX Quality Controls & Design Governance
- **FR ciblés:** FR-070, FR-063
- **NFR ciblés:** NFR-032, NFR-033
- **Risques couverts:** U02 (États UI incomplets), U03 (Non-conformité accessibilité WCAG 2.2 AA)
- **Dépendance de réalisation:** E06-S07
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-070 est satisfaite: "Le système doit vérifier la cohérence spacing/typo/couleurs selon design system.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-063 sans contournement: "Le système doit implémenter loading/empty/error/success sur toutes les vues critiques.".
  - AC-03: Le seuil NFR est respecté: NFR-032 => parcours critiques validés mobile/tablette/desktop.
  - AC-04: Le second seuil de qualité est tenu: NFR-033 => décision critique en <90s pour PER-01.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E06-S08 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E06-S09 — Catalogue microcopie PASS/CONCERNS/FAIL
- **Epic parent:** E06 — UX Quality Controls & Design Governance
- **FR ciblés:** FR-063, FR-064
- **NFR ciblés:** NFR-033, NFR-040
- **Risques couverts:** U03 (Non-conformité accessibilité WCAG 2.2 AA), U04 (Responsive dégradé sur tablettes/laptops denses)
- **Dépendance de réalisation:** E06-S08
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-063 est satisfaite: "Le système doit implémenter loading/empty/error/success sur toutes les vues critiques.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-064 sans contournement: "Le système doit supporter une navigation clavier complète avec focus visible et logique.".
  - AC-03: Le seuil NFR est respecté: NFR-033 => décision critique en <90s pour PER-01.
  - AC-04: Le second seuil de qualité est tenu: NFR-040 => time-to-first-value < 14 jours.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E06-S09 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E06-S10 — Préférences motion (prefers-reduced-motion)
- **Epic parent:** E06 — UX Quality Controls & Design Governance
- **FR ciblés:** FR-064, FR-065
- **NFR ciblés:** NFR-040, NFR-030
- **Risques couverts:** U04 (Responsive dégradé sur tablettes/laptops denses), C05 (Coût de rework UX après validation tardive)
- **Dépendance de réalisation:** E06-S09
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-064 est satisfaite: "Le système doit supporter une navigation clavier complète avec focus visible et logique.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-065 sans contournement: "Le système doit respecter les contrastes WCAG 2.2 AA sur les surfaces critiques.".
  - AC-03: Le seuil NFR est respecté: NFR-040 => time-to-first-value < 14 jours.
  - AC-04: Le second seuil de qualité est tenu: NFR-030 => score >= 85 + 0 blocker.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E06-S10 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E06-S11 — Harnais de tests usability rapides
- **Epic parent:** E06 — UX Quality Controls & Design Governance
- **FR ciblés:** FR-065, FR-066
- **NFR ciblés:** NFR-030, NFR-031
- **Risques couverts:** C05 (Coût de rework UX après validation tardive), T07 (Faux DONE via G4-UX mal câblé)
- **Dépendance de réalisation:** E06-S10
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-065 est satisfaite: "Le système doit respecter les contrastes WCAG 2.2 AA sur les surfaces critiques.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-066 sans contournement: "Le système doit rester exploitable sur mobile, tablette et desktop standard.".
  - AC-03: Le seuil NFR est respecté: NFR-030 => score >= 85 + 0 blocker.
  - AC-04: Le second seuil de qualité est tenu: NFR-031 => 100% widgets critiques avec 4 états.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E06-S11 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E06-S12 — Tableau de bord régressions UX
- **Epic parent:** E06 — UX Quality Controls & Design Governance
- **FR ciblés:** FR-066, FR-067
- **NFR ciblés:** NFR-031, NFR-032
- **Risques couverts:** T07 (Faux DONE via G4-UX mal câblé), U01 (Surcharge cognitive du cockpit)
- **Dépendance de réalisation:** E06-S11
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-066 est satisfaite: "Le système doit rester exploitable sur mobile, tablette et desktop standard.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-067 sans contournement: "Le système doit lier captures et verdicts UX aux sous-gates G4-UX.".
  - AC-03: Le seuil NFR est respecté: NFR-031 => 100% widgets critiques avec 4 états.
  - AC-04: Le second seuil de qualité est tenu: NFR-032 => parcours critiques validés mobile/tablette/desktop.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E06-S12 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

## Epic E07 — Collaboration, Notifications & Role Workspaces
- **Objectif Epic:** Fluidifier la coordination inter-rôles sans générer de fatigue d’alertes.
- **Dépendances Epic:** E01, E05, E06
- **Contrainte H06 clés:** H06-UXC-07, H06-UXC-08
- **FR couverts (primaire):** FR-055, FR-056, FR-057, FR-058, FR-059, FR-060, FR-061, FR-062
- **NFR couverts (primaire):** NFR-010, NFR-017, NFR-033, NFR-040
- **Risques adressés (priorité):** U05, U06, P03, M03, C04

| Axe Epic | Décision de backlog | KPI de succès | Handoff aval |
|---|---|---|---|
| Scope | Séquence E07 découpée en 12 stories indépendantes mais cohérentes | 12/12 stories prêtes H11 | PM + SM |
| Testabilité | Chaque story porte AC + DoD + preuves | 0 story sans AC/DoD | TEA + UX QA |
| Qualité UX | Règles H06 reliées aux stories de l’Epic | 0 violation H06 critique | UX Designer + UX QA |
| Risques | Mitigations alignées au registre H02 | baisse exposition risques U05, U06 | PM + Architect |
| Readiness H10 | Évidences consolidées pour décision PASS/CONCERNS/FAIL | dossier Epic prêt | Architect |

| Risque Epic | Description | Mitigation portée par stories | Trigger d’alerte |
|---|---|---|---|
| U05 | Next Best Action non compréhensible | Stories E07 associées + contrôle gate | Écart seuil/KPI sur U05 |
| U06 | Fatigue de notifications | Stories E07 associées + contrôle gate | Écart seuil/KPI sur U06 |
| P03 | Notifications de phase manquantes | Stories E07 associées + contrôle gate | Écart seuil/KPI sur P03 |
| M03 | Résistance au changement de stack | Stories E07 associées + contrôle gate | Écart seuil/KPI sur M03 |
| C04 | Coût support onboarding supérieur au plan | Stories E07 associées + contrôle gate | Écart seuil/KPI sur C04 |

## Epic E07 — Stories détaillées
| Story ID | Titre | FR clés | NFR clés | Risques | Dépendance story |
|---|---|---|---|---|---|
| E07-S01 | Dashboards personnalisés par rôle | FR-055, FR-056 | NFR-010, NFR-017 | U05, U06 | E01-S12 |
| E07-S02 | File d’actions priorisées contextualisées | FR-056, FR-057 | NFR-017, NFR-033 | U06, P03 | E07-S01 |
| E07-S03 | Notification center multisévérité | FR-057, FR-058 | NFR-033, NFR-040 | P03, M03 | E07-S02 |
| E07-S04 | Throttling/dedup anti-fatigue | FR-058, FR-059 | NFR-040, NFR-010 | M03, C04 | E07-S03 |
| E07-S05 | Mesure SLA phase complete -> notify | FR-059, FR-060 | NFR-010, NFR-017 | C04, U05 | E07-S04 |
| E07-S06 | Threads commentaires liés aux décisions | FR-060, FR-061 | NFR-017, NFR-033 | U05, U06 | E07-S05 |
| E07-S07 | Mentions directes + escalade sévérité | FR-061, FR-062 | NFR-033, NFR-040 | U06, P03 | E07-S06 |
| E07-S08 | Timeline inter-rôles des événements clés | FR-062, FR-055 | NFR-040, NFR-010 | P03, M03 | E07-S07 |
| E07-S09 | Indice de fatigue notifications | FR-055, FR-056 | NFR-010, NFR-017 | M03, C04 | E07-S08 |
| E07-S10 | Reporting ack critique < 10 min | FR-056, FR-057 | NFR-017, NFR-033 | C04, U05 | E07-S09 |
| E07-S11 | Permissions collaboration orientées rôle | FR-057, FR-058 | NFR-033, NFR-040 | U05, U06 | E07-S10 |
| E07-S12 | Playbooks communication de crise | FR-058, FR-059 | NFR-040, NFR-010 | U06, P03 | E07-S11 |

### Story E07-S01 — Dashboards personnalisés par rôle
- **Epic parent:** E07 — Collaboration, Notifications & Role Workspaces
- **FR ciblés:** FR-055, FR-056
- **NFR ciblés:** NFR-010, NFR-017
- **Risques couverts:** U05 (Next Best Action non compréhensible), U06 (Fatigue de notifications)
- **Dépendance de réalisation:** E01-S12
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-055 est satisfaite: "Le système doit proposer des dashboards personnalisés par rôle (PM, Architecte, TEA, UX QA, Sponsor).".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-056 sans contournement: "Le système doit générer une file d’actions priorisées et contextualisées par rôle.".
  - AC-03: Le seuil NFR est respecté: NFR-010 => p95 < 2s.
  - AC-04: Le second seuil de qualité est tenu: NFR-017 => < 10 min.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E07-S01 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E07-S02 — File d’actions priorisées contextualisées
- **Epic parent:** E07 — Collaboration, Notifications & Role Workspaces
- **FR ciblés:** FR-056, FR-057
- **NFR ciblés:** NFR-017, NFR-033
- **Risques couverts:** U06 (Fatigue de notifications), P03 (Notifications de phase manquantes)
- **Dépendance de réalisation:** E07-S01
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-056 est satisfaite: "Le système doit générer une file d’actions priorisées et contextualisées par rôle.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-057 sans contournement: "Le système doit centraliser les notifications avec niveaux critique/élevé/moyen/faible.".
  - AC-03: Le seuil NFR est respecté: NFR-017 => < 10 min.
  - AC-04: Le second seuil de qualité est tenu: NFR-033 => décision critique en <90s pour PER-01.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E07-S02 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E07-S03 — Notification center multisévérité
- **Epic parent:** E07 — Collaboration, Notifications & Role Workspaces
- **FR ciblés:** FR-057, FR-058
- **NFR ciblés:** NFR-033, NFR-040
- **Risques couverts:** P03 (Notifications de phase manquantes), M03 (Résistance au changement de stack)
- **Dépendance de réalisation:** E07-S02
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-057 est satisfaite: "Le système doit centraliser les notifications avec niveaux critique/élevé/moyen/faible.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-058 sans contournement: "Le système doit regrouper et limiter les alertes répétitives pour éviter la fatigue.".
  - AC-03: Le seuil NFR est respecté: NFR-033 => décision critique en <90s pour PER-01.
  - AC-04: Le second seuil de qualité est tenu: NFR-040 => time-to-first-value < 14 jours.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E07-S03 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E07-S04 — Throttling/dedup anti-fatigue
- **Epic parent:** E07 — Collaboration, Notifications & Role Workspaces
- **FR ciblés:** FR-058, FR-059
- **NFR ciblés:** NFR-040, NFR-010
- **Risques couverts:** M03 (Résistance au changement de stack), C04 (Coût support onboarding supérieur au plan)
- **Dépendance de réalisation:** E07-S03
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-058 est satisfaite: "Le système doit regrouper et limiter les alertes répétitives pour éviter la fatigue.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-059 sans contournement: "Le système doit mesurer le délai phase complete → notify et alerter les dépassements.".
  - AC-03: Le seuil NFR est respecté: NFR-040 => time-to-first-value < 14 jours.
  - AC-04: Le second seuil de qualité est tenu: NFR-010 => p95 < 2s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E07-S04 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E07-S05 — Mesure SLA phase complete -> notify
- **Epic parent:** E07 — Collaboration, Notifications & Role Workspaces
- **FR ciblés:** FR-059, FR-060
- **NFR ciblés:** NFR-010, NFR-017
- **Risques couverts:** C04 (Coût support onboarding supérieur au plan), U05 (Next Best Action non compréhensible)
- **Dépendance de réalisation:** E07-S04
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-059 est satisfaite: "Le système doit mesurer le délai phase complete → notify et alerter les dépassements.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-060 sans contournement: "Le système doit permettre des threads de commentaires reliés aux décisions et gates.".
  - AC-03: Le seuil NFR est respecté: NFR-010 => p95 < 2s.
  - AC-04: Le second seuil de qualité est tenu: NFR-017 => < 10 min.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E07-S05 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E07-S06 — Threads commentaires liés aux décisions
- **Epic parent:** E07 — Collaboration, Notifications & Role Workspaces
- **FR ciblés:** FR-060, FR-061
- **NFR ciblés:** NFR-017, NFR-033
- **Risques couverts:** U05 (Next Best Action non compréhensible), U06 (Fatigue de notifications)
- **Dépendance de réalisation:** E07-S05
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-060 est satisfaite: "Le système doit permettre des threads de commentaires reliés aux décisions et gates.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-061 sans contournement: "Le système doit gérer les mentions directes et l’escalade automatique selon la sévérité.".
  - AC-03: Le seuil NFR est respecté: NFR-017 => < 10 min.
  - AC-04: Le second seuil de qualité est tenu: NFR-033 => décision critique en <90s pour PER-01.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E07-S06 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E07-S07 — Mentions directes + escalade sévérité
- **Epic parent:** E07 — Collaboration, Notifications & Role Workspaces
- **FR ciblés:** FR-061, FR-062
- **NFR ciblés:** NFR-033, NFR-040
- **Risques couverts:** U06 (Fatigue de notifications), P03 (Notifications de phase manquantes)
- **Dépendance de réalisation:** E07-S06
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-061 est satisfaite: "Le système doit gérer les mentions directes et l’escalade automatique selon la sévérité.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-062 sans contournement: "Le système doit afficher une timeline inter-rôles des événements clés du projet.".
  - AC-03: Le seuil NFR est respecté: NFR-033 => décision critique en <90s pour PER-01.
  - AC-04: Le second seuil de qualité est tenu: NFR-040 => time-to-first-value < 14 jours.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E07-S07 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E07-S08 — Timeline inter-rôles des événements clés
- **Epic parent:** E07 — Collaboration, Notifications & Role Workspaces
- **FR ciblés:** FR-062, FR-055
- **NFR ciblés:** NFR-040, NFR-010
- **Risques couverts:** P03 (Notifications de phase manquantes), M03 (Résistance au changement de stack)
- **Dépendance de réalisation:** E07-S07
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-062 est satisfaite: "Le système doit afficher une timeline inter-rôles des événements clés du projet.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-055 sans contournement: "Le système doit proposer des dashboards personnalisés par rôle (PM, Architecte, TEA, UX QA, Sponsor).".
  - AC-03: Le seuil NFR est respecté: NFR-040 => time-to-first-value < 14 jours.
  - AC-04: Le second seuil de qualité est tenu: NFR-010 => p95 < 2s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E07-S08 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E07-S09 — Indice de fatigue notifications
- **Epic parent:** E07 — Collaboration, Notifications & Role Workspaces
- **FR ciblés:** FR-055, FR-056
- **NFR ciblés:** NFR-010, NFR-017
- **Risques couverts:** M03 (Résistance au changement de stack), C04 (Coût support onboarding supérieur au plan)
- **Dépendance de réalisation:** E07-S08
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-055 est satisfaite: "Le système doit proposer des dashboards personnalisés par rôle (PM, Architecte, TEA, UX QA, Sponsor).".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-056 sans contournement: "Le système doit générer une file d’actions priorisées et contextualisées par rôle.".
  - AC-03: Le seuil NFR est respecté: NFR-010 => p95 < 2s.
  - AC-04: Le second seuil de qualité est tenu: NFR-017 => < 10 min.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E07-S09 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E07-S10 — Reporting ack critique < 10 min
- **Epic parent:** E07 — Collaboration, Notifications & Role Workspaces
- **FR ciblés:** FR-056, FR-057
- **NFR ciblés:** NFR-017, NFR-033
- **Risques couverts:** C04 (Coût support onboarding supérieur au plan), U05 (Next Best Action non compréhensible)
- **Dépendance de réalisation:** E07-S09
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-056 est satisfaite: "Le système doit générer une file d’actions priorisées et contextualisées par rôle.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-057 sans contournement: "Le système doit centraliser les notifications avec niveaux critique/élevé/moyen/faible.".
  - AC-03: Le seuil NFR est respecté: NFR-017 => < 10 min.
  - AC-04: Le second seuil de qualité est tenu: NFR-033 => décision critique en <90s pour PER-01.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E07-S10 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E07-S11 — Permissions collaboration orientées rôle
- **Epic parent:** E07 — Collaboration, Notifications & Role Workspaces
- **FR ciblés:** FR-057, FR-058
- **NFR ciblés:** NFR-033, NFR-040
- **Risques couverts:** U05 (Next Best Action non compréhensible), U06 (Fatigue de notifications)
- **Dépendance de réalisation:** E07-S10
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-057 est satisfaite: "Le système doit centraliser les notifications avec niveaux critique/élevé/moyen/faible.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-058 sans contournement: "Le système doit regrouper et limiter les alertes répétitives pour éviter la fatigue.".
  - AC-03: Le seuil NFR est respecté: NFR-033 => décision critique en <90s pour PER-01.
  - AC-04: Le second seuil de qualité est tenu: NFR-040 => time-to-first-value < 14 jours.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E07-S11 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E07-S12 — Playbooks communication de crise
- **Epic parent:** E07 — Collaboration, Notifications & Role Workspaces
- **FR ciblés:** FR-058, FR-059
- **NFR ciblés:** NFR-040, NFR-010
- **Risques couverts:** U06 (Fatigue de notifications), P03 (Notifications de phase manquantes)
- **Dépendance de réalisation:** E07-S11
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-058 est satisfaite: "Le système doit regrouper et limiter les alertes répétitives pour éviter la fatigue.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-059 sans contournement: "Le système doit mesurer le délai phase complete → notify et alerter les dépassements.".
  - AC-03: Le seuil NFR est respecté: NFR-040 => time-to-first-value < 14 jours.
  - AC-04: Le second seuil de qualité est tenu: NFR-010 => p95 < 2s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E07-S12 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

## Epic E08 — Multi-Project Context Isolation & Connecteurs cœur
- **Objectif Epic:** Empêcher les erreurs de contexte et préparer une base d’intégration read-first robuste.
- **Dépendances Epic:** E04
- **Contrainte H06 clés:** H06-UXC-02
- **FR couverts (primaire):** FR-071, FR-072, FR-073, FR-074
- **NFR couverts (primaire):** NFR-013, NFR-020, NFR-021, NFR-039
- **Risques adressés (priorité):** P07, S01, S02, C03, M07

| Axe Epic | Décision de backlog | KPI de succès | Handoff aval |
|---|---|---|---|
| Scope | Séquence E08 découpée en 12 stories indépendantes mais cohérentes | 12/12 stories prêtes H11 | PM + SM |
| Testabilité | Chaque story porte AC + DoD + preuves | 0 story sans AC/DoD | TEA + UX QA |
| Qualité UX | Règles H06 reliées aux stories de l’Epic | 0 violation H06 critique | UX Designer + UX QA |
| Risques | Mitigations alignées au registre H02 | baisse exposition risques P07, S01 | PM + Architect |
| Readiness H10 | Évidences consolidées pour décision PASS/CONCERNS/FAIL | dossier Epic prêt | Architect |

| Risque Epic | Description | Mitigation portée par stories | Trigger d’alerte |
|---|---|---|---|
| P07 | Erreur de contexte multi-projets | Stories E08 associées + contrôle gate | Écart seuil/KPI sur P07 |
| S01 | Commande destructive sur mauvais projet | Stories E08 associées + contrôle gate | Écart seuil/KPI sur S01 |
| S02 | Injection d’arguments shell | Stories E08 associées + contrôle gate | Écart seuil/KPI sur S02 |
| C03 | Sous-estimation des coûts d’intégration | Stories E08 associées + contrôle gate | Écart seuil/KPI sur C03 |
| M07 | Retard self-host readiness | Stories E08 associées + contrôle gate | Écart seuil/KPI sur M07 |

## Epic E08 — Stories détaillées
| Story ID | Titre | FR clés | NFR clés | Risques | Dépendance story |
|---|---|---|---|---|---|
| E08-S01 | Switcher projet avec confirmation contextuelle | FR-071, FR-072 | NFR-013, NFR-020 | P07, S01 | E04-S12 |
| E08-S02 | Blocage écriture cross-project | FR-072, FR-073 | NFR-020, NFR-021 | S01, S02 | E08-S01 |
| E08-S03 | Service de contexte signé | FR-073, FR-074 | NFR-021, NFR-039 | S02, C03 | E08-S02 |
| E08-S04 | Connecteur Jira read-only | FR-074, FR-071 | NFR-039, NFR-013 | C03, M07 | E08-S03 |
| E08-S05 | Connecteur Linear read-only | FR-071, FR-072 | NFR-013, NFR-020 | M07, P07 | E08-S04 |
| E08-S06 | Gestion secrets connecteurs en vault | FR-072, FR-073 | NFR-020, NFR-021 | P07, S01 | E08-S05 |
| E08-S07 | RBAC scoping par projet actif | FR-073, FR-074 | NFR-021, NFR-039 | S01, S02 | E08-S06 |
| E08-S08 | Segmentation vues multi-projets | FR-074, FR-071 | NFR-039, NFR-013 | S02, C03 | E08-S07 |
| E08-S09 | Gestion incidents mismatch de contexte | FR-071, FR-072 | NFR-013, NFR-020 | C03, M07 | E08-S08 |
| E08-S10 | Monitoring santé connecteurs | FR-072, FR-073 | NFR-020, NFR-021 | M07, P07 | E08-S09 |
| E08-S11 | Scheduler synchronisation read-first | FR-073, FR-074 | NFR-021, NFR-039 | P07, S01 | E08-S10 |
| E08-S12 | Assistant onboarding nouveau projet | FR-074, FR-071 | NFR-039, NFR-013 | S01, S02 | E08-S11 |

### Story E08-S01 — Switcher projet avec confirmation contextuelle
- **Epic parent:** E08 — Multi-Project Context Isolation & Connecteurs cœur
- **FR ciblés:** FR-071, FR-072
- **NFR ciblés:** NFR-013, NFR-020
- **Risques couverts:** P07 (Erreur de contexte multi-projets), S01 (Commande destructive sur mauvais projet)
- **Dépendance de réalisation:** E04-S12
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-071 est satisfaite: "Le système doit offrir un switch de projet avec confirmation du contexte actif.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-072 sans contournement: "Le système doit empêcher toute écriture sur un projet non actif.".
  - AC-03: Le seuil NFR est respecté: NFR-013 => >= 95%.
  - AC-04: Le second seuil de qualité est tenu: NFR-020 => 100% commandes exécutées issues catalogue.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E08-S01 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E08-S02 — Blocage écriture cross-project
- **Epic parent:** E08 — Multi-Project Context Isolation & Connecteurs cœur
- **FR ciblés:** FR-072, FR-073
- **NFR ciblés:** NFR-020, NFR-021
- **Risques couverts:** S01 (Commande destructive sur mauvais projet), S02 (Injection d’arguments shell)
- **Dépendance de réalisation:** E08-S01
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-072 est satisfaite: "Le système doit empêcher toute écriture sur un projet non actif.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-073 sans contournement: "Le système doit ingérer les données Jira nécessaires au suivi story/gate.".
  - AC-03: Le seuil NFR est respecté: NFR-020 => 100% commandes exécutées issues catalogue.
  - AC-04: Le second seuil de qualité est tenu: NFR-021 => 0 exécution destructive hors projet actif.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E08-S02 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E08-S03 — Service de contexte signé
- **Epic parent:** E08 — Multi-Project Context Isolation & Connecteurs cœur
- **FR ciblés:** FR-073, FR-074
- **NFR ciblés:** NFR-021, NFR-039
- **Risques couverts:** S02 (Injection d’arguments shell), C03 (Sous-estimation des coûts d’intégration)
- **Dépendance de réalisation:** E08-S02
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-073 est satisfaite: "Le système doit ingérer les données Jira nécessaires au suivi story/gate.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-074 sans contournement: "Le système doit ingérer les données Linear nécessaires au suivi story/gate.".
  - AC-03: Le seuil NFR est respecté: NFR-021 => 0 exécution destructive hors projet actif.
  - AC-04: Le second seuil de qualité est tenu: NFR-039 => build self-host reproductible.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E08-S03 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E08-S04 — Connecteur Jira read-only
- **Epic parent:** E08 — Multi-Project Context Isolation & Connecteurs cœur
- **FR ciblés:** FR-074, FR-071
- **NFR ciblés:** NFR-039, NFR-013
- **Risques couverts:** C03 (Sous-estimation des coûts d’intégration), M07 (Retard self-host readiness)
- **Dépendance de réalisation:** E08-S03
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-074 est satisfaite: "Le système doit ingérer les données Linear nécessaires au suivi story/gate.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-071 sans contournement: "Le système doit offrir un switch de projet avec confirmation du contexte actif.".
  - AC-03: Le seuil NFR est respecté: NFR-039 => build self-host reproductible.
  - AC-04: Le second seuil de qualité est tenu: NFR-013 => >= 95%.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E08-S04 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E08-S05 — Connecteur Linear read-only
- **Epic parent:** E08 — Multi-Project Context Isolation & Connecteurs cœur
- **FR ciblés:** FR-071, FR-072
- **NFR ciblés:** NFR-013, NFR-020
- **Risques couverts:** M07 (Retard self-host readiness), P07 (Erreur de contexte multi-projets)
- **Dépendance de réalisation:** E08-S04
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-071 est satisfaite: "Le système doit offrir un switch de projet avec confirmation du contexte actif.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-072 sans contournement: "Le système doit empêcher toute écriture sur un projet non actif.".
  - AC-03: Le seuil NFR est respecté: NFR-013 => >= 95%.
  - AC-04: Le second seuil de qualité est tenu: NFR-020 => 100% commandes exécutées issues catalogue.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E08-S05 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E08-S06 — Gestion secrets connecteurs en vault
- **Epic parent:** E08 — Multi-Project Context Isolation & Connecteurs cœur
- **FR ciblés:** FR-072, FR-073
- **NFR ciblés:** NFR-020, NFR-021
- **Risques couverts:** P07 (Erreur de contexte multi-projets), S01 (Commande destructive sur mauvais projet)
- **Dépendance de réalisation:** E08-S05
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-072 est satisfaite: "Le système doit empêcher toute écriture sur un projet non actif.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-073 sans contournement: "Le système doit ingérer les données Jira nécessaires au suivi story/gate.".
  - AC-03: Le seuil NFR est respecté: NFR-020 => 100% commandes exécutées issues catalogue.
  - AC-04: Le second seuil de qualité est tenu: NFR-021 => 0 exécution destructive hors projet actif.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E08-S06 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E08-S07 — RBAC scoping par projet actif
- **Epic parent:** E08 — Multi-Project Context Isolation & Connecteurs cœur
- **FR ciblés:** FR-073, FR-074
- **NFR ciblés:** NFR-021, NFR-039
- **Risques couverts:** S01 (Commande destructive sur mauvais projet), S02 (Injection d’arguments shell)
- **Dépendance de réalisation:** E08-S06
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-073 est satisfaite: "Le système doit ingérer les données Jira nécessaires au suivi story/gate.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-074 sans contournement: "Le système doit ingérer les données Linear nécessaires au suivi story/gate.".
  - AC-03: Le seuil NFR est respecté: NFR-021 => 0 exécution destructive hors projet actif.
  - AC-04: Le second seuil de qualité est tenu: NFR-039 => build self-host reproductible.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E08-S07 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E08-S08 — Segmentation vues multi-projets
- **Epic parent:** E08 — Multi-Project Context Isolation & Connecteurs cœur
- **FR ciblés:** FR-074, FR-071
- **NFR ciblés:** NFR-039, NFR-013
- **Risques couverts:** S02 (Injection d’arguments shell), C03 (Sous-estimation des coûts d’intégration)
- **Dépendance de réalisation:** E08-S07
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-074 est satisfaite: "Le système doit ingérer les données Linear nécessaires au suivi story/gate.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-071 sans contournement: "Le système doit offrir un switch de projet avec confirmation du contexte actif.".
  - AC-03: Le seuil NFR est respecté: NFR-039 => build self-host reproductible.
  - AC-04: Le second seuil de qualité est tenu: NFR-013 => >= 95%.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E08-S08 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E08-S09 — Gestion incidents mismatch de contexte
- **Epic parent:** E08 — Multi-Project Context Isolation & Connecteurs cœur
- **FR ciblés:** FR-071, FR-072
- **NFR ciblés:** NFR-013, NFR-020
- **Risques couverts:** C03 (Sous-estimation des coûts d’intégration), M07 (Retard self-host readiness)
- **Dépendance de réalisation:** E08-S08
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-071 est satisfaite: "Le système doit offrir un switch de projet avec confirmation du contexte actif.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-072 sans contournement: "Le système doit empêcher toute écriture sur un projet non actif.".
  - AC-03: Le seuil NFR est respecté: NFR-013 => >= 95%.
  - AC-04: Le second seuil de qualité est tenu: NFR-020 => 100% commandes exécutées issues catalogue.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E08-S09 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E08-S10 — Monitoring santé connecteurs
- **Epic parent:** E08 — Multi-Project Context Isolation & Connecteurs cœur
- **FR ciblés:** FR-072, FR-073
- **NFR ciblés:** NFR-020, NFR-021
- **Risques couverts:** M07 (Retard self-host readiness), P07 (Erreur de contexte multi-projets)
- **Dépendance de réalisation:** E08-S09
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-072 est satisfaite: "Le système doit empêcher toute écriture sur un projet non actif.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-073 sans contournement: "Le système doit ingérer les données Jira nécessaires au suivi story/gate.".
  - AC-03: Le seuil NFR est respecté: NFR-020 => 100% commandes exécutées issues catalogue.
  - AC-04: Le second seuil de qualité est tenu: NFR-021 => 0 exécution destructive hors projet actif.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E08-S10 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E08-S11 — Scheduler synchronisation read-first
- **Epic parent:** E08 — Multi-Project Context Isolation & Connecteurs cœur
- **FR ciblés:** FR-073, FR-074
- **NFR ciblés:** NFR-021, NFR-039
- **Risques couverts:** P07 (Erreur de contexte multi-projets), S01 (Commande destructive sur mauvais projet)
- **Dépendance de réalisation:** E08-S10
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-073 est satisfaite: "Le système doit ingérer les données Jira nécessaires au suivi story/gate.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-074 sans contournement: "Le système doit ingérer les données Linear nécessaires au suivi story/gate.".
  - AC-03: Le seuil NFR est respecté: NFR-021 => 0 exécution destructive hors projet actif.
  - AC-04: Le second seuil de qualité est tenu: NFR-039 => build self-host reproductible.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E08-S11 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E08-S12 — Assistant onboarding nouveau projet
- **Epic parent:** E08 — Multi-Project Context Isolation & Connecteurs cœur
- **FR ciblés:** FR-074, FR-071
- **NFR ciblés:** NFR-039, NFR-013
- **Risques couverts:** S01 (Commande destructive sur mauvais projet), S02 (Injection d’arguments shell)
- **Dépendance de réalisation:** E08-S11
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-074 est satisfaite: "Le système doit ingérer les données Linear nécessaires au suivi story/gate.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-071 sans contournement: "Le système doit offrir un switch de projet avec confirmation du contexte actif.".
  - AC-03: Le seuil NFR est respecté: NFR-039 => build self-host reproductible.
  - AC-04: Le second seuil de qualité est tenu: NFR-013 => >= 95%.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E08-S12 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

## Epic E09 — Integrations avancées, Export bundles & Data lifecycle
- **Objectif Epic:** Élargir l’écosystème tout en conservant conformité, auditabilité et gouvernance des données.
- **Dépendances Epic:** E02, E08
- **Contrainte H06 clés:** H06-UXC-06, H06-UXC-10
- **FR couverts (primaire):** FR-075, FR-076, FR-077, FR-078, FR-079, FR-080, FR-081, FR-082
- **NFR couverts (primaire):** NFR-005, NFR-027, NFR-028, NFR-029, NFR-039
- **Risques adressés (priorité):** S06, S08, M07, C02

| Axe Epic | Décision de backlog | KPI de succès | Handoff aval |
|---|---|---|---|
| Scope | Séquence E09 découpée en 12 stories indépendantes mais cohérentes | 12/12 stories prêtes H11 | PM + SM |
| Testabilité | Chaque story porte AC + DoD + preuves | 0 story sans AC/DoD | TEA + UX QA |
| Qualité UX | Règles H06 reliées aux stories de l’Epic | 0 violation H06 critique | UX Designer + UX QA |
| Risques | Mitigations alignées au registre H02 | baisse exposition risques S06, S08 | PM + Architect |
| Readiness H10 | Évidences consolidées pour décision PASS/CONCERNS/FAIL | dossier Epic prêt | Architect |

| Risque Epic | Description | Mitigation portée par stories | Trigger d’alerte |
|---|---|---|---|
| S06 | Exfiltration via export de bundles | Stories E09 associées + contrôle gate | Écart seuil/KPI sur S06 |
| S08 | Non-conformité conservation/suppression | Stories E09 associées + contrôle gate | Écart seuil/KPI sur S08 |
| M07 | Retard self-host readiness | Stories E09 associées + contrôle gate | Écart seuil/KPI sur M07 |
| C02 | Surcoût stockage ledger/projections | Stories E09 associées + contrôle gate | Écart seuil/KPI sur C02 |

## Epic E09 — Stories détaillées
| Story ID | Titre | FR clés | NFR clés | Risques | Dépendance story |
|---|---|---|---|---|---|
| E09-S01 | Connecteur Notion pour preuves référencées | FR-075, FR-076 | NFR-005, NFR-027 | S06, S08 | E02-S12 |
| E09-S02 | Ingestion rapports tests CI (unit/int/e2e/coverage) | FR-076, FR-077 | NFR-027, NFR-028 | S08, M07 | E09-S01 |
| E09-S03 | Ingestion rapports vulnérabilités | FR-077, FR-078 | NFR-028, NFR-029 | M07, C02 | E09-S02 |
| E09-S04 | Export bundles md/pdf/json | FR-078, FR-079 | NFR-029, NFR-039 | C02, S06 | E09-S03 |
| E09-S05 | API reporting externe contrôlée | FR-079, FR-080 | NFR-039, NFR-005 | S06, S08 | E09-S04 |
| E09-S06 | Backup/restauration configurations critiques | FR-080, FR-081 | NFR-005, NFR-027 | S08, M07 | E09-S05 |
| E09-S07 | Profil déploiement self-host sécurisé | FR-081, FR-082 | NFR-027, NFR-028 | M07, C02 | E09-S06 |
| E09-S08 | Politique rétention/purge par type de donnée | FR-082, FR-075 | NFR-028, NFR-029 | C02, S06 | E09-S07 |
| E09-S09 | Contrôle export par rôle et policy | FR-075, FR-076 | NFR-029, NFR-039 | S06, S08 | E09-S08 |
| E09-S10 | Classification et tagging des données | FR-076, FR-077 | NFR-039, NFR-005 | S08, M07 | E09-S09 |
| E09-S11 | Pack preuves conformité automatisé | FR-077, FR-078 | NFR-005, NFR-027 | M07, C02 | E09-S10 |
| E09-S12 | Checklist hardening enterprise pilote | FR-078, FR-079 | NFR-027, NFR-028 | C02, S06 | E09-S11 |

### Story E09-S01 — Connecteur Notion pour preuves référencées
- **Epic parent:** E09 — Integrations avancées, Export bundles & Data lifecycle
- **FR ciblés:** FR-075, FR-076
- **NFR ciblés:** NFR-005, NFR-027
- **Risques couverts:** S06 (Exfiltration via export de bundles), S08 (Non-conformité conservation/suppression)
- **Dépendance de réalisation:** E02-S12
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-075 est satisfaite: "Le système doit indexer les pages Notion référencées comme preuves.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-076 sans contournement: "Le système doit intégrer les résultats tests (unit/int/e2e/coverage).".
  - AC-03: Le seuil NFR est respecté: NFR-005 => p95 < 10s.
  - AC-04: Le second seuil de qualité est tenu: NFR-027 => politique appliquée par type de données.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E09-S01 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E09-S02 — Ingestion rapports tests CI (unit/int/e2e/coverage)
- **Epic parent:** E09 — Integrations avancées, Export bundles & Data lifecycle
- **FR ciblés:** FR-076, FR-077
- **NFR ciblés:** NFR-027, NFR-028
- **Risques couverts:** S08 (Non-conformité conservation/suppression), M07 (Retard self-host readiness)
- **Dépendance de réalisation:** E09-S01
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-076 est satisfaite: "Le système doit intégrer les résultats tests (unit/int/e2e/coverage).".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-077 sans contournement: "Le système doit intégrer les rapports de vulnérabilités et leur sévérité.".
  - AC-03: Le seuil NFR est respecté: NFR-027 => politique appliquée par type de données.
  - AC-04: Le second seuil de qualité est tenu: NFR-028 => 100% exports validés par policy.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E09-S02 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E09-S03 — Ingestion rapports vulnérabilités
- **Epic parent:** E09 — Integrations avancées, Export bundles & Data lifecycle
- **FR ciblés:** FR-077, FR-078
- **NFR ciblés:** NFR-028, NFR-029
- **Risques couverts:** M07 (Retard self-host readiness), C02 (Surcoût stockage ledger/projections)
- **Dépendance de réalisation:** E09-S02
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-077 est satisfaite: "Le système doit intégrer les rapports de vulnérabilités et leur sévérité.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-078 sans contournement: "Le système doit exporter des bundles de preuve dans les formats md/pdf/json.".
  - AC-03: Le seuil NFR est respecté: NFR-028 => 100% exports validés par policy.
  - AC-04: Le second seuil de qualité est tenu: NFR-029 => chaîne preuve complète obligatoire.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E09-S03 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E09-S04 — Export bundles md/pdf/json
- **Epic parent:** E09 — Integrations avancées, Export bundles & Data lifecycle
- **FR ciblés:** FR-078, FR-079
- **NFR ciblés:** NFR-029, NFR-039
- **Risques couverts:** C02 (Surcoût stockage ledger/projections), S06 (Exfiltration via export de bundles)
- **Dépendance de réalisation:** E09-S03
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-078 est satisfaite: "Le système doit exporter des bundles de preuve dans les formats md/pdf/json.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-079 sans contournement: "Le système doit exposer des endpoints API pour reporting externe contrôlé.".
  - AC-03: Le seuil NFR est respecté: NFR-029 => chaîne preuve complète obligatoire.
  - AC-04: Le second seuil de qualité est tenu: NFR-039 => build self-host reproductible.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E09-S04 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E09-S05 — API reporting externe contrôlée
- **Epic parent:** E09 — Integrations avancées, Export bundles & Data lifecycle
- **FR ciblés:** FR-079, FR-080
- **NFR ciblés:** NFR-039, NFR-005
- **Risques couverts:** S06 (Exfiltration via export de bundles), S08 (Non-conformité conservation/suppression)
- **Dépendance de réalisation:** E09-S04
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-079 est satisfaite: "Le système doit exposer des endpoints API pour reporting externe contrôlé.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-080 sans contournement: "Le système doit supporter backup/restauration des configurations critiques.".
  - AC-03: Le seuil NFR est respecté: NFR-039 => build self-host reproductible.
  - AC-04: Le second seuil de qualité est tenu: NFR-005 => p95 < 10s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E09-S05 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E09-S06 — Backup/restauration configurations critiques
- **Epic parent:** E09 — Integrations avancées, Export bundles & Data lifecycle
- **FR ciblés:** FR-080, FR-081
- **NFR ciblés:** NFR-005, NFR-027
- **Risques couverts:** S08 (Non-conformité conservation/suppression), M07 (Retard self-host readiness)
- **Dépendance de réalisation:** E09-S05
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-080 est satisfaite: "Le système doit supporter backup/restauration des configurations critiques.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-081 sans contournement: "Le système doit fournir un profil déploiement compatible self-host sécurisé.".
  - AC-03: Le seuil NFR est respecté: NFR-005 => p95 < 10s.
  - AC-04: Le second seuil de qualité est tenu: NFR-027 => politique appliquée par type de données.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E09-S06 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E09-S07 — Profil déploiement self-host sécurisé
- **Epic parent:** E09 — Integrations avancées, Export bundles & Data lifecycle
- **FR ciblés:** FR-081, FR-082
- **NFR ciblés:** NFR-027, NFR-028
- **Risques couverts:** M07 (Retard self-host readiness), C02 (Surcoût stockage ledger/projections)
- **Dépendance de réalisation:** E09-S06
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-081 est satisfaite: "Le système doit fournir un profil déploiement compatible self-host sécurisé.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-082 sans contournement: "Le système doit appliquer une politique de rétention et purge par type de donnée.".
  - AC-03: Le seuil NFR est respecté: NFR-027 => politique appliquée par type de données.
  - AC-04: Le second seuil de qualité est tenu: NFR-028 => 100% exports validés par policy.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E09-S07 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E09-S08 — Politique rétention/purge par type de donnée
- **Epic parent:** E09 — Integrations avancées, Export bundles & Data lifecycle
- **FR ciblés:** FR-082, FR-075
- **NFR ciblés:** NFR-028, NFR-029
- **Risques couverts:** C02 (Surcoût stockage ledger/projections), S06 (Exfiltration via export de bundles)
- **Dépendance de réalisation:** E09-S07
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-082 est satisfaite: "Le système doit appliquer une politique de rétention et purge par type de donnée.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-075 sans contournement: "Le système doit indexer les pages Notion référencées comme preuves.".
  - AC-03: Le seuil NFR est respecté: NFR-028 => 100% exports validés par policy.
  - AC-04: Le second seuil de qualité est tenu: NFR-029 => chaîne preuve complète obligatoire.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E09-S08 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E09-S09 — Contrôle export par rôle et policy
- **Epic parent:** E09 — Integrations avancées, Export bundles & Data lifecycle
- **FR ciblés:** FR-075, FR-076
- **NFR ciblés:** NFR-029, NFR-039
- **Risques couverts:** S06 (Exfiltration via export de bundles), S08 (Non-conformité conservation/suppression)
- **Dépendance de réalisation:** E09-S08
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-075 est satisfaite: "Le système doit indexer les pages Notion référencées comme preuves.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-076 sans contournement: "Le système doit intégrer les résultats tests (unit/int/e2e/coverage).".
  - AC-03: Le seuil NFR est respecté: NFR-029 => chaîne preuve complète obligatoire.
  - AC-04: Le second seuil de qualité est tenu: NFR-039 => build self-host reproductible.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E09-S09 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E09-S10 — Classification et tagging des données
- **Epic parent:** E09 — Integrations avancées, Export bundles & Data lifecycle
- **FR ciblés:** FR-076, FR-077
- **NFR ciblés:** NFR-039, NFR-005
- **Risques couverts:** S08 (Non-conformité conservation/suppression), M07 (Retard self-host readiness)
- **Dépendance de réalisation:** E09-S09
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-076 est satisfaite: "Le système doit intégrer les résultats tests (unit/int/e2e/coverage).".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-077 sans contournement: "Le système doit intégrer les rapports de vulnérabilités et leur sévérité.".
  - AC-03: Le seuil NFR est respecté: NFR-039 => build self-host reproductible.
  - AC-04: Le second seuil de qualité est tenu: NFR-005 => p95 < 10s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E09-S10 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E09-S11 — Pack preuves conformité automatisé
- **Epic parent:** E09 — Integrations avancées, Export bundles & Data lifecycle
- **FR ciblés:** FR-077, FR-078
- **NFR ciblés:** NFR-005, NFR-027
- **Risques couverts:** M07 (Retard self-host readiness), C02 (Surcoût stockage ledger/projections)
- **Dépendance de réalisation:** E09-S10
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-077 est satisfaite: "Le système doit intégrer les rapports de vulnérabilités et leur sévérité.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-078 sans contournement: "Le système doit exporter des bundles de preuve dans les formats md/pdf/json.".
  - AC-03: Le seuil NFR est respecté: NFR-005 => p95 < 10s.
  - AC-04: Le second seuil de qualité est tenu: NFR-027 => politique appliquée par type de données.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E09-S11 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E09-S12 — Checklist hardening enterprise pilote
- **Epic parent:** E09 — Integrations avancées, Export bundles & Data lifecycle
- **FR ciblés:** FR-078, FR-079
- **NFR ciblés:** NFR-027, NFR-028
- **Risques couverts:** C02 (Surcoût stockage ledger/projections), S06 (Exfiltration via export de bundles)
- **Dépendance de réalisation:** E09-S11
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-078 est satisfaite: "Le système doit exporter des bundles de preuve dans les formats md/pdf/json.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-079 sans contournement: "Le système doit exposer des endpoints API pour reporting externe contrôlé.".
  - AC-03: Le seuil NFR est respecté: NFR-027 => politique appliquée par type de données.
  - AC-04: Le second seuil de qualité est tenu: NFR-028 => 100% exports validés par policy.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E09-S12 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

## Epic E10 — API Contracts, Read Models Performance & Data Quality
- **Objectif Epic:** Industrialiser qualité des contrats, performance des projections et robustesse analytique.
- **Dépendances Epic:** E02, E03, E05
- **Contrainte H06 clés:** H06-UXC-03, H06-UXC-06
- **FR couverts (primaire):** FR-023, FR-024, FR-025, FR-026, FR-027, FR-028, FR-029, FR-030, FR-046, FR-047, FR-052, FR-053, FR-076, FR-079
- **NFR couverts (primaire):** NFR-001, NFR-002, NFR-003, NFR-004, NFR-006, NFR-007, NFR-008, NFR-009, NFR-010, NFR-034, NFR-035, NFR-036, NFR-038
- **Risques adressés (priorité):** T03, T04, T05, C01

| Axe Epic | Décision de backlog | KPI de succès | Handoff aval |
|---|---|---|---|
| Scope | Séquence E10 découpée en 12 stories indépendantes mais cohérentes | 12/12 stories prêtes H11 | PM + SM |
| Testabilité | Chaque story porte AC + DoD + preuves | 0 story sans AC/DoD | TEA + UX QA |
| Qualité UX | Règles H06 reliées aux stories de l’Epic | 0 violation H06 critique | UX Designer + UX QA |
| Risques | Mitigations alignées au registre H02 | baisse exposition risques T03, T04 | PM + Architect |
| Readiness H10 | Évidences consolidées pour décision PASS/CONCERNS/FAIL | dossier Epic prêt | Architect |

| Risque Epic | Description | Mitigation portée par stories | Trigger d’alerte |
|---|---|---|---|
| T03 | Saturation de la file d’ingestion | Stories E10 associées + contrôle gate | Écart seuil/KPI sur T03 |
| T04 | Latence excessive sur projections critiques | Stories E10 associées + contrôle gate | Écart seuil/KPI sur T04 |
| T05 | Rupture des contrats front/back | Stories E10 associées + contrôle gate | Écart seuil/KPI sur T05 |
| C01 | Explosion des coûts token | Stories E10 associées + contrôle gate | Écart seuil/KPI sur C01 |

## Epic E10 — Stories détaillées
| Story ID | Titre | FR clés | NFR clés | Risques | Dépendance story |
|---|---|---|---|---|---|
| E10-S01 | Registre versionné des contrats API/events | FR-023, FR-024 | NFR-001, NFR-002 | T03, T04 | E02-S12 |
| E10-S02 | Contract tests obligatoires Gate/Command/Data | FR-024, FR-025 | NFR-002, NFR-003 | T04, T05 | E10-S01 |
| E10-S03 | SLI latence read-models critiques | FR-025, FR-026 | NFR-003, NFR-004 | T05, C01 | E10-S02 |
| E10-S04 | Optimisation recherche artefacts p95 | FR-026, FR-027 | NFR-004, NFR-006 | C01, T03 | E10-S03 |
| E10-S05 | Rebuild projections bulk < 60s | FR-027, FR-028 | NFR-006, NFR-007 | T03, T04 | E10-S04 |
| E10-S06 | Indexation delta + cache intelligent | FR-028, FR-029 | NFR-007, NFR-008 | T04, T05 | E10-S05 |
| E10-S07 | Contrôles qualité données projection | FR-029, FR-030 | NFR-008, NFR-009 | T05, C01 | E10-S06 |
| E10-S08 | Backpressure queue ingestion workers | FR-030, FR-046 | NFR-009, NFR-010 | C01, T03 | E10-S07 |
| E10-S09 | Dashboard capacity planning | FR-046, FR-047 | NFR-010, NFR-034 | T03, T04 | E10-S08 |
| E10-S10 | Alertes FinOps budgets et dérives | FR-047, FR-052 | NFR-034, NFR-035 | T04, T05 | E10-S09 |
| E10-S11 | Automatisation SLO/error-budget | FR-052, FR-053 | NFR-035, NFR-036 | T05, C01 | E10-S10 |
| E10-S12 | Suite benchmarks performance continue | FR-053, FR-076 | NFR-036, NFR-038 | C01, T03 | E10-S11 |

### Story E10-S01 — Registre versionné des contrats API/events
- **Epic parent:** E10 — API Contracts, Read Models Performance & Data Quality
- **FR ciblés:** FR-023, FR-024
- **NFR ciblés:** NFR-001, NFR-002
- **Risques couverts:** T03 (Saturation de la file d’ingestion), T04 (Latence excessive sur projections critiques)
- **Dépendance de réalisation:** E02-S12
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-023 est satisfaite: "Le système doit extraire sections H2/H3 pour permettre une navigation structurée.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-024 sans contournement: "Le système doit indexer les tableaux markdown pour requêtes ciblées.".
  - AC-03: Le seuil NFR est respecté: NFR-001 => p95 < 2.0s.
  - AC-04: Le second seuil de qualité est tenu: NFR-002 => p95 < 2.5s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E10-S01 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E10-S02 — Contract tests obligatoires Gate/Command/Data
- **Epic parent:** E10 — API Contracts, Read Models Performance & Data Quality
- **FR ciblés:** FR-024, FR-025
- **NFR ciblés:** NFR-002, NFR-003
- **Risques couverts:** T04 (Latence excessive sur projections critiques), T05 (Rupture des contrats front/back)
- **Dépendance de réalisation:** E10-S01
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-024 est satisfaite: "Le système doit indexer les tableaux markdown pour requêtes ciblées.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-025 sans contournement: "Le système doit fournir une recherche plein texte avec filtrage instantané par type d’artefact.".
  - AC-03: Le seuil NFR est respecté: NFR-002 => p95 < 2.5s.
  - AC-04: Le second seuil de qualité est tenu: NFR-003 => p95 < 5s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E10-S02 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E10-S03 — SLI latence read-models critiques
- **Epic parent:** E10 — API Contracts, Read Models Performance & Data Quality
- **FR ciblés:** FR-025, FR-026
- **NFR ciblés:** NFR-003, NFR-004
- **Risques couverts:** T05 (Rupture des contrats front/back), C01 (Explosion des coûts token)
- **Dépendance de réalisation:** E10-S02
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-025 est satisfaite: "Le système doit fournir une recherche plein texte avec filtrage instantané par type d’artefact.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-026 sans contournement: "Le système doit filtrer par phase, agent, date, gate, owner et niveau de risque.".
  - AC-03: Le seuil NFR est respecté: NFR-003 => p95 < 5s.
  - AC-04: Le second seuil de qualité est tenu: NFR-004 => p95 < 2s sur 500 docs.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E10-S03 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E10-S04 — Optimisation recherche artefacts p95
- **Epic parent:** E10 — API Contracts, Read Models Performance & Data Quality
- **FR ciblés:** FR-026, FR-027
- **NFR ciblés:** NFR-004, NFR-006
- **Risques couverts:** C01 (Explosion des coûts token), T03 (Saturation de la file d’ingestion)
- **Dépendance de réalisation:** E10-S03
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-026 est satisfaite: "Le système doit filtrer par phase, agent, date, gate, owner et niveau de risque.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-027 sans contournement: "Le système doit comparer deux versions d’un artefact et souligner les changements structurants.".
  - AC-03: Le seuil NFR est respecté: NFR-004 => p95 < 2s sur 500 docs.
  - AC-04: Le second seuil de qualité est tenu: NFR-006 => < 60s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E10-S04 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E10-S05 — Rebuild projections bulk < 60s
- **Epic parent:** E10 — API Contracts, Read Models Performance & Data Quality
- **FR ciblés:** FR-027, FR-028
- **NFR ciblés:** NFR-006, NFR-007
- **Risques couverts:** T03 (Saturation de la file d’ingestion), T04 (Latence excessive sur projections critiques)
- **Dépendance de réalisation:** E10-S04
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-027 est satisfaite: "Le système doit comparer deux versions d’un artefact et souligner les changements structurants.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-028 sans contournement: "Le système doit visualiser les liens entre artefacts, décisions, gates et commandes.".
  - AC-03: Le seuil NFR est respecté: NFR-006 => < 60s.
  - AC-04: Le second seuil de qualité est tenu: NFR-007 => <= 2s après preuve.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E10-S05 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E10-S06 — Indexation delta + cache intelligent
- **Epic parent:** E10 — API Contracts, Read Models Performance & Data Quality
- **FR ciblés:** FR-028, FR-029
- **NFR ciblés:** NFR-007, NFR-008
- **Risques couverts:** T04 (Latence excessive sur projections critiques), T05 (Rupture des contrats front/back)
- **Dépendance de réalisation:** E10-S05
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-028 est satisfaite: "Le système doit visualiser les liens entre artefacts, décisions, gates et commandes.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-029 sans contournement: "Le système doit lister tous les artefacts qui justifient une décision donnée.".
  - AC-03: Le seuil NFR est respecté: NFR-007 => <= 2s après preuve.
  - AC-04: Le second seuil de qualité est tenu: NFR-008 => <= 1.5s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E10-S06 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E10-S07 — Contrôles qualité données projection
- **Epic parent:** E10 — API Contracts, Read Models Performance & Data Quality
- **FR ciblés:** FR-029, FR-030
- **NFR ciblés:** NFR-008, NFR-009
- **Risques couverts:** T05 (Rupture des contrats front/back), C01 (Explosion des coûts token)
- **Dépendance de réalisation:** E10-S06
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-029 est satisfaite: "Le système doit lister tous les artefacts qui justifient une décision donnée.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-030 sans contournement: "Le système doit marquer explicitement la fraîcheur/staleness des vues dérivées.".
  - AC-03: Le seuil NFR est respecté: NFR-008 => <= 1.5s.
  - AC-04: Le second seuil de qualité est tenu: NFR-009 => p95 < 2.5s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E10-S07 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E10-S08 — Backpressure queue ingestion workers
- **Epic parent:** E10 — API Contracts, Read Models Performance & Data Quality
- **FR ciblés:** FR-030, FR-046
- **NFR ciblés:** NFR-009, NFR-010
- **Risques couverts:** C01 (Explosion des coûts token), T03 (Saturation de la file d’ingestion)
- **Dépendance de réalisation:** E10-S07
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-030 est satisfaite: "Le système doit marquer explicitement la fraîcheur/staleness des vues dérivées.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-046 sans contournement: "Le système doit conserver des snapshots AQCD par période pour analyse de tendance.".
  - AC-03: Le seuil NFR est respecté: NFR-009 => p95 < 2.5s.
  - AC-04: Le second seuil de qualité est tenu: NFR-010 => p95 < 2s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E10-S08 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E10-S09 — Dashboard capacity planning
- **Epic parent:** E10 — API Contracts, Read Models Performance & Data Quality
- **FR ciblés:** FR-046, FR-047
- **NFR ciblés:** NFR-010, NFR-034
- **Risques couverts:** T03 (Saturation de la file d’ingestion), T04 (Latence excessive sur projections critiques)
- **Dépendance de réalisation:** E10-S08
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-046 est satisfaite: "Le système doit conserver des snapshots AQCD par période pour analyse de tendance.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-047 sans contournement: "Le système doit calculer un readiness score rules-based avec facteurs contributifs visibles.".
  - AC-03: Le seuil NFR est respecté: NFR-010 => p95 < 2s.
  - AC-04: Le second seuil de qualité est tenu: NFR-034 => métriques clés disponibles en continu.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E10-S09 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E10-S10 — Alertes FinOps budgets et dérives
- **Epic parent:** E10 — API Contracts, Read Models Performance & Data Quality
- **FR ciblés:** FR-047, FR-052
- **NFR ciblés:** NFR-034, NFR-035
- **Risques couverts:** T04 (Latence excessive sur projections critiques), T05 (Rupture des contrats front/back)
- **Dépendance de réalisation:** E10-S09
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-047 est satisfaite: "Le système doit calculer un readiness score rules-based avec facteurs contributifs visibles.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-052 sans contournement: "Le système doit calculer le coût moyen par décision validée.".
  - AC-03: Le seuil NFR est respecté: NFR-034 => métriques clés disponibles en continu.
  - AC-04: Le second seuil de qualité est tenu: NFR-035 => runbook critique disponible et testé.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E10-S10 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E10-S11 — Automatisation SLO/error-budget
- **Epic parent:** E10 — API Contracts, Read Models Performance & Data Quality
- **FR ciblés:** FR-052, FR-053
- **NFR ciblés:** NFR-035, NFR-036
- **Risques couverts:** T05 (Rupture des contrats front/back), C01 (Explosion des coûts token)
- **Dépendance de réalisation:** E10-S10
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-052 est satisfaite: "Le système doit calculer le coût moyen par décision validée.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-053 sans contournement: "Le système doit mesurer le waste ratio par phase et déclencher alerte en dérive.".
  - AC-03: Le seuil NFR est respecté: NFR-035 => runbook critique disponible et testé.
  - AC-04: Le second seuil de qualité est tenu: NFR-036 => 100% changements avec version + migration.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E10-S11 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E10-S12 — Suite benchmarks performance continue
- **Epic parent:** E10 — API Contracts, Read Models Performance & Data Quality
- **FR ciblés:** FR-053, FR-076
- **NFR ciblés:** NFR-036, NFR-038
- **Risques couverts:** C01 (Explosion des coûts token), T03 (Saturation de la file d’ingestion)
- **Dépendance de réalisation:** E10-S11
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-053 est satisfaite: "Le système doit mesurer le waste ratio par phase et déclencher alerte en dérive.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-076 sans contournement: "Le système doit intégrer les résultats tests (unit/int/e2e/coverage).".
  - AC-03: Le seuil NFR est respecté: NFR-036 => 100% changements avec version + migration.
  - AC-04: Le second seuil de qualité est tenu: NFR-038 => aucune rupture sur corpus de référence.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E10-S12 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

## Epic E11 — Security, Compliance, Resilience & Ops Readiness
- **Objectif Epic:** Réduire l’exposition opérationnelle et conformité avant montée enterprise et H10 final.
- **Dépendances Epic:** E04, E09
- **Contrainte H06 clés:** H06-UXC-02, H06-UXC-06
- **FR couverts (primaire):** FR-034, FR-037, FR-038, FR-039, FR-040, FR-041, FR-042, FR-043, FR-072, FR-080, FR-081, FR-082
- **NFR couverts (primaire):** NFR-011, NFR-012, NFR-014, NFR-015, NFR-016, NFR-019, NFR-022, NFR-023, NFR-024, NFR-025, NFR-026, NFR-027, NFR-028, NFR-034, NFR-035
- **Risques adressés (priorité):** T08, S03, S04, S05, S07, S08, M07

| Axe Epic | Décision de backlog | KPI de succès | Handoff aval |
|---|---|---|---|
| Scope | Séquence E11 découpée en 12 stories indépendantes mais cohérentes | 12/12 stories prêtes H11 | PM + SM |
| Testabilité | Chaque story porte AC + DoD + preuves | 0 story sans AC/DoD | TEA + UX QA |
| Qualité UX | Règles H06 reliées aux stories de l’Epic | 0 violation H06 critique | UX Designer + UX QA |
| Risques | Mitigations alignées au registre H02 | baisse exposition risques T08, S03 | PM + Architect |
| Readiness H10 | Évidences consolidées pour décision PASS/CONCERNS/FAIL | dossier Epic prêt | Architect |

| Risque Epic | Description | Mitigation portée par stories | Trigger d’alerte |
|---|---|---|---|
| T08 | Absence de mode dégradé read-model | Stories E11 associées + contrôle gate | Écart seuil/KPI sur T08 |
| S03 | RBAC trop permissif | Stories E11 associées + contrôle gate | Écart seuil/KPI sur S03 |
| S04 | Journal d’audit altérable | Stories E11 associées + contrôle gate | Écart seuil/KPI sur S04 |
| S05 | Fuite de secrets dans les logs | Stories E11 associées + contrôle gate | Écart seuil/KPI sur S05 |
| S07 | Non-révocation des accès | Stories E11 associées + contrôle gate | Écart seuil/KPI sur S07 |
| S08 | Non-conformité conservation/suppression | Stories E11 associées + contrôle gate | Écart seuil/KPI sur S08 |
| M07 | Retard self-host readiness | Stories E11 associées + contrôle gate | Écart seuil/KPI sur M07 |

## Epic E11 — Stories détaillées
| Story ID | Titre | FR clés | NFR clés | Risques | Dépendance story |
|---|---|---|---|---|---|
| E11-S01 | Mode stale-but-available piloté | FR-034, FR-037 | NFR-011, NFR-012 | T08, S03 | E04-S12 |
| E11-S02 | Runbooks DR/backup/restore testés | FR-037, FR-038 | NFR-012, NFR-014 | S03, S04 | E11-S01 |
| E11-S03 | Redaction automatique des secrets logs | FR-038, FR-039 | NFR-014, NFR-015 | S04, S05 | E11-S02 |
| E11-S04 | Workflow révocation accès < 24h | FR-039, FR-040 | NFR-015, NFR-016 | S05, S07 | E11-S03 |
| E11-S05 | Vérification intégrité audit logs quotidienne | FR-040, FR-041 | NFR-016, NFR-019 | S07, S08 | E11-S04 |
| E11-S06 | Routage alertes incidents critiques | FR-041, FR-042 | NFR-019, NFR-022 | S08, M07 | E11-S05 |
| E11-S07 | Chaos tests retries + DLQ ingestion | FR-042, FR-043 | NFR-022, NFR-023 | M07, T08 | E11-S06 |
| E11-S08 | Bibliothèque runbooks + game days | FR-043, FR-072 | NFR-023, NFR-024 | T08, S03 | E11-S07 |
| E11-S09 | Audit conformité rétention/export | FR-072, FR-080 | NFR-024, NFR-025 | S03, S04 | E11-S08 |
| E11-S10 | Tracker SLA remédiation vulnérabilités | FR-080, FR-081 | NFR-025, NFR-026 | S04, S05 | E11-S09 |
| E11-S11 | Hardening self-host security baseline | FR-081, FR-082 | NFR-026, NFR-027 | S05, S07 | E11-S10 |
| E11-S12 | Comité gouvernance overrides sécurité | FR-082, FR-034 | NFR-027, NFR-028 | S07, S08 | E11-S11 |

### Story E11-S01 — Mode stale-but-available piloté
- **Epic parent:** E11 — Security, Compliance, Resilience & Ops Readiness
- **FR ciblés:** FR-034, FR-037
- **NFR ciblés:** NFR-011, NFR-012
- **Risques couverts:** T08 (Absence de mode dégradé read-model), S03 (RBAC trop permissif)
- **Dépendance de réalisation:** E04-S12
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-034 est satisfaite: "Le système doit proposer un dry-run par défaut pour toute commande d’écriture.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-037 sans contournement: "Le système doit vérifier les permissions role-based avant chaque exécution.".
  - AC-03: Le seuil NFR est respecté: NFR-011 => >= 99.5%.
  - AC-04: Le second seuil de qualité est tenu: NFR-012 => 0 toléré.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E11-S01 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E11-S02 — Runbooks DR/backup/restore testés
- **Epic parent:** E11 — Security, Compliance, Resilience & Ops Readiness
- **FR ciblés:** FR-037, FR-038
- **NFR ciblés:** NFR-012, NFR-014
- **Risques couverts:** S03 (RBAC trop permissif), S04 (Journal d’audit altérable)
- **Dépendance de réalisation:** E11-S01
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-037 est satisfaite: "Le système doit vérifier les permissions role-based avant chaque exécution.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-038 sans contournement: "Le système doit signer active_project_root et refuser les exécutions ambiguës.".
  - AC-03: Le seuil NFR est respecté: NFR-012 => 0 toléré.
  - AC-04: Le second seuil de qualité est tenu: NFR-014 => flakiness < 3%.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E11-S02 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E11-S03 — Redaction automatique des secrets logs
- **Epic parent:** E11 — Security, Compliance, Resilience & Ops Readiness
- **FR ciblés:** FR-038, FR-039
- **NFR ciblés:** NFR-014, NFR-015
- **Risques couverts:** S04 (Journal d’audit altérable), S05 (Fuite de secrets dans les logs)
- **Dépendance de réalisation:** E11-S02
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-038 est satisfaite: "Le système doit signer active_project_root et refuser les exécutions ambiguës.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-039 sans contournement: "Le système doit enregistrer commande, acteur, approbateur, résultat dans un journal append-only.".
  - AC-03: Le seuil NFR est respecté: NFR-014 => flakiness < 3%.
  - AC-04: Le second seuil de qualité est tenu: NFR-015 => bascule < 60s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E11-S03 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E11-S04 — Workflow révocation accès < 24h
- **Epic parent:** E11 — Security, Compliance, Resilience & Ops Readiness
- **FR ciblés:** FR-039, FR-040
- **NFR ciblés:** NFR-015, NFR-016
- **Risques couverts:** S05 (Fuite de secrets dans les logs), S07 (Non-révocation des accès)
- **Dépendance de réalisation:** E11-S03
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-039 est satisfaite: "Le système doit enregistrer commande, acteur, approbateur, résultat dans un journal append-only.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-040 sans contournement: "Le système doit appliquer des timeouts, retries bornés et idempotency key pour les runs.".
  - AC-03: Le seuil NFR est respecté: NFR-015 => bascule < 60s.
  - AC-04: Le second seuil de qualité est tenu: NFR-016 => max 3 retries + DLQ.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E11-S04 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E11-S05 — Vérification intégrité audit logs quotidienne
- **Epic parent:** E11 — Security, Compliance, Resilience & Ops Readiness
- **FR ciblés:** FR-040, FR-041
- **NFR ciblés:** NFR-016, NFR-019
- **Risques couverts:** S07 (Non-révocation des accès), S08 (Non-conformité conservation/suppression)
- **Dépendance de réalisation:** E11-S04
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-040 est satisfaite: "Le système doit appliquer des timeouts, retries bornés et idempotency key pour les runs.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-041 sans contournement: "Le système doit séquencer les commandes concurrentes selon priorité et capacité.".
  - AC-03: Le seuil NFR est respecté: NFR-016 => max 3 retries + DLQ.
  - AC-04: Le second seuil de qualité est tenu: NFR-019 => 0 action critique hors rôle.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E11-S05 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E11-S06 — Routage alertes incidents critiques
- **Epic parent:** E11 — Security, Compliance, Resilience & Ops Readiness
- **FR ciblés:** FR-041, FR-042
- **NFR ciblés:** NFR-019, NFR-022
- **Risques couverts:** S08 (Non-conformité conservation/suppression), M07 (Retard self-host readiness)
- **Dépendance de réalisation:** E11-S05
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-041 est satisfaite: "Le système doit séquencer les commandes concurrentes selon priorité et capacité.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-042 sans contournement: "Le système doit permettre l’arrêt immédiat des commandes d’écriture en cas d’incident critique.".
  - AC-03: Le seuil NFR est respecté: NFR-019 => 0 action critique hors rôle.
  - AC-04: Le second seuil de qualité est tenu: NFR-022 => intégrité vérifiée quotidienne.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E11-S06 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E11-S07 — Chaos tests retries + DLQ ingestion
- **Epic parent:** E11 — Security, Compliance, Resilience & Ops Readiness
- **FR ciblés:** FR-042, FR-043
- **NFR ciblés:** NFR-022, NFR-023
- **Risques couverts:** M07 (Retard self-host readiness), T08 (Absence de mode dégradé read-model)
- **Dépendance de réalisation:** E11-S06
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-042 est satisfaite: "Le système doit permettre l’arrêt immédiat des commandes d’écriture en cas d’incident critique.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-043 sans contournement: "Le système doit exiger approbation nominative pour tout override de policy.".
  - AC-03: Le seuil NFR est respecté: NFR-022 => intégrité vérifiée quotidienne.
  - AC-04: Le second seuil de qualité est tenu: NFR-023 => 0 secret exposé dans logs persistés.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E11-S07 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E11-S08 — Bibliothèque runbooks + game days
- **Epic parent:** E11 — Security, Compliance, Resilience & Ops Readiness
- **FR ciblés:** FR-043, FR-072
- **NFR ciblés:** NFR-023, NFR-024
- **Risques couverts:** T08 (Absence de mode dégradé read-model), S03 (RBAC trop permissif)
- **Dépendance de réalisation:** E11-S07
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-043 est satisfaite: "Le système doit exiger approbation nominative pour tout override de policy.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-072 sans contournement: "Le système doit empêcher toute écriture sur un projet non actif.".
  - AC-03: Le seuil NFR est respecté: NFR-023 => 0 secret exposé dans logs persistés.
  - AC-04: Le second seuil de qualité est tenu: NFR-024 => 100% overrides avec approbateur.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E11-S08 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E11-S09 — Audit conformité rétention/export
- **Epic parent:** E11 — Security, Compliance, Resilience & Ops Readiness
- **FR ciblés:** FR-072, FR-080
- **NFR ciblés:** NFR-024, NFR-025
- **Risques couverts:** S03 (RBAC trop permissif), S04 (Journal d’audit altérable)
- **Dépendance de réalisation:** E11-S08
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-072 est satisfaite: "Le système doit empêcher toute écriture sur un projet non actif.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-080 sans contournement: "Le système doit supporter backup/restauration des configurations critiques.".
  - AC-03: Le seuil NFR est respecté: NFR-024 => 100% overrides avec approbateur.
  - AC-04: Le second seuil de qualité est tenu: NFR-025 => timeout max 120s.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E11-S09 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E11-S10 — Tracker SLA remédiation vulnérabilités
- **Epic parent:** E11 — Security, Compliance, Resilience & Ops Readiness
- **FR ciblés:** FR-080, FR-081
- **NFR ciblés:** NFR-025, NFR-026
- **Risques couverts:** S04 (Journal d’audit altérable), S05 (Fuite de secrets dans les logs)
- **Dépendance de réalisation:** E11-S09
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-080 est satisfaite: "Le système doit supporter backup/restauration des configurations critiques.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-081 sans contournement: "Le système doit fournir un profil déploiement compatible self-host sécurisé.".
  - AC-03: Le seuil NFR est respecté: NFR-025 => timeout max 120s.
  - AC-04: Le second seuil de qualité est tenu: NFR-026 => <24h après changement rôle.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E11-S10 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E11-S11 — Hardening self-host security baseline
- **Epic parent:** E11 — Security, Compliance, Resilience & Ops Readiness
- **FR ciblés:** FR-081, FR-082
- **NFR ciblés:** NFR-026, NFR-027
- **Risques couverts:** S05 (Fuite de secrets dans les logs), S07 (Non-révocation des accès)
- **Dépendance de réalisation:** E11-S10
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-081 est satisfaite: "Le système doit fournir un profil déploiement compatible self-host sécurisé.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-082 sans contournement: "Le système doit appliquer une politique de rétention et purge par type de donnée.".
  - AC-03: Le seuil NFR est respecté: NFR-026 => <24h après changement rôle.
  - AC-04: Le second seuil de qualité est tenu: NFR-027 => politique appliquée par type de données.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E11-S11 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E11-S12 — Comité gouvernance overrides sécurité
- **Epic parent:** E11 — Security, Compliance, Resilience & Ops Readiness
- **FR ciblés:** FR-082, FR-034
- **NFR ciblés:** NFR-027, NFR-028
- **Risques couverts:** S07 (Non-révocation des accès), S08 (Non-conformité conservation/suppression)
- **Dépendance de réalisation:** E11-S11
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-082 est satisfaite: "Le système doit appliquer une politique de rétention et purge par type de donnée.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-034 sans contournement: "Le système doit proposer un dry-run par défaut pour toute commande d’écriture.".
  - AC-03: Le seuil NFR est respecté: NFR-027 => politique appliquée par type de données.
  - AC-04: Le second seuil de qualité est tenu: NFR-028 => 100% exports validés par policy.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E11-S12 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

## Epic E12 — H10 Readiness, Rollout & Change Management
- **Objectif Epic:** Assembler les preuves PASS/CONCERNS/FAIL et sécuriser l’adoption opérationnelle en production.
- **Dépendances Epic:** E05, E07, E11
- **Contrainte H06 clés:** H06-UXC-08, H06-UXC-10
- **FR couverts (primaire):** FR-006, FR-008, FR-018, FR-019, FR-020, FR-048, FR-050, FR-054, FR-058, FR-059, FR-060, FR-061, FR-062, FR-078
- **NFR couverts (primaire):** NFR-033, NFR-035, NFR-037, NFR-039, NFR-040
- **Risques adressés (priorité):** P02, P04, M01, M02, M03, M04, M05, M06, C04, C05

| Axe Epic | Décision de backlog | KPI de succès | Handoff aval |
|---|---|---|---|
| Scope | Séquence E12 découpée en 12 stories indépendantes mais cohérentes | 12/12 stories prêtes H11 | PM + SM |
| Testabilité | Chaque story porte AC + DoD + preuves | 0 story sans AC/DoD | TEA + UX QA |
| Qualité UX | Règles H06 reliées aux stories de l’Epic | 0 violation H06 critique | UX Designer + UX QA |
| Risques | Mitigations alignées au registre H02 | baisse exposition risques P02, P04 | PM + Architect |
| Readiness H10 | Évidences consolidées pour décision PASS/CONCERNS/FAIL | dossier Epic prêt | Architect |

| Risque Epic | Description | Mitigation portée par stories | Trigger d’alerte |
|---|---|---|---|
| P02 | Handoffs incomplets ou ambigus | Stories E12 associées + contrôle gate | Écart seuil/KPI sur P02 |
| P04 | RACI décisionnel flou | Stories E12 associées + contrôle gate | Écart seuil/KPI sur P04 |
| M01 | Confusion de catégorie produit | Stories E12 associées + contrôle gate | Écart seuil/KPI sur M01 |
| M02 | ROI TCD non démontré | Stories E12 associées + contrôle gate | Écart seuil/KPI sur M02 |
| M03 | Résistance au changement de stack | Stories E12 associées + contrôle gate | Écart seuil/KPI sur M03 |
| M04 | Scope inflation en V1 | Stories E12 associées + contrôle gate | Écart seuil/KPI sur M04 |
| M05 | Cycle de vente enterprise trop long | Stories E12 associées + contrôle gate | Écart seuil/KPI sur M05 |
| M06 | Dépendance excessive à la niche BMAD | Stories E12 associées + contrôle gate | Écart seuil/KPI sur M06 |
| C04 | Coût support onboarding supérieur au plan | Stories E12 associées + contrôle gate | Écart seuil/KPI sur C04 |
| C05 | Coût de rework UX après validation tardive | Stories E12 associées + contrôle gate | Écart seuil/KPI sur C05 |

## Epic E12 — Stories détaillées
| Story ID | Titre | FR clés | NFR clés | Risques | Dépendance story |
|---|---|---|---|---|---|
| E12-S01 | Générateur checklist readiness H10 | FR-006, FR-008 | NFR-033, NFR-035 | P02, P04 | E05-S12 |
| E12-S02 | Compilateur packs preuves PASS/CONCERNS/FAIL | FR-008, FR-018 | NFR-035, NFR-037 | P04, M01 | E12-S01 |
| E12-S03 | Board scope freeze MUST/SHOULD/COULD | FR-018, FR-019 | NFR-037, NFR-039 | M01, M02 | E12-S02 |
| E12-S04 | Matrice sign-off nominative inter-rôles | FR-019, FR-020 | NFR-039, NFR-040 | M02, M03 | E12-S03 |
| E12-S05 | Publication baseline TCD/AQCD Sprint 1 | FR-020, FR-048 | NFR-040, NFR-033 | M03, M04 | E12-S04 |
| E12-S06 | Plan rollout pilote 30/60/90 jours | FR-048, FR-050 | NFR-033, NFR-035 | M04, M05 | E12-S05 |
| E12-S07 | Kit conduite du changement par rôle | FR-050, FR-054 | NFR-035, NFR-037 | M05, M06 | E12-S06 |
| E12-S08 | Parcours onboarding accéléré (<14 jours) | FR-054, FR-058 | NFR-037, NFR-039 | M06, C04 | E12-S07 |
| E12-S09 | Tracker concerns ACT-01..ACT-08 | FR-058, FR-059 | NFR-039, NFR-040 | C04, C05 | E12-S08 |
| E12-S10 | Atelier simulation go/no-go H10 | FR-059, FR-060 | NFR-040, NFR-033 | C05, P02 | E12-S09 |
| E12-S11 | Boucle feedback post-go-live | FR-060, FR-061 | NFR-033, NFR-035 | P02, P04 | E12-S10 |
| E12-S12 | Contrat de handoff final vers H10 | FR-061, FR-062 | NFR-035, NFR-037 | P04, M01 | E12-S11 |

### Story E12-S01 — Générateur checklist readiness H10
- **Epic parent:** E12 — H10 Readiness, Rollout & Change Management
- **FR ciblés:** FR-006, FR-008
- **NFR ciblés:** NFR-033, NFR-035
- **Risques couverts:** P02 (Handoffs incomplets ou ambigus), P04 (RACI décisionnel flou)
- **Dépendance de réalisation:** E05-S12
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-006 est satisfaite: "Le système doit permettre l’exécution contrôlée des scripts sequence-guard et ultra-quality-check.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-008 sans contournement: "Le système doit signaler les dépassements de SLA de transition et proposer une action corrective.".
  - AC-03: Le seuil NFR est respecté: NFR-033 => décision critique en <90s pour PER-01.
  - AC-04: Le second seuil de qualité est tenu: NFR-035 => runbook critique disponible et testé.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E12-S01 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E12-S02 — Compilateur packs preuves PASS/CONCERNS/FAIL
- **Epic parent:** E12 — H10 Readiness, Rollout & Change Management
- **FR ciblés:** FR-008, FR-018
- **NFR ciblés:** NFR-035, NFR-037
- **Risques couverts:** P04 (RACI décisionnel flou), M01 (Confusion de catégorie produit)
- **Dépendance de réalisation:** E12-S01
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-008 est satisfaite: "Le système doit signaler les dépassements de SLA de transition et proposer une action corrective.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-018 sans contournement: "Le système doit permettre une simulation de verdict avant soumission finale du gate.".
  - AC-03: Le seuil NFR est respecté: NFR-035 => runbook critique disponible et testé.
  - AC-04: Le second seuil de qualité est tenu: NFR-037 => 100% modules critiques documentés.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E12-S02 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E12-S03 — Board scope freeze MUST/SHOULD/COULD
- **Epic parent:** E12 — H10 Readiness, Rollout & Change Management
- **FR ciblés:** FR-018, FR-019
- **NFR ciblés:** NFR-037, NFR-039
- **Risques couverts:** M01 (Confusion de catégorie produit), M02 (ROI TCD non démontré)
- **Dépendance de réalisation:** E12-S02
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-018 est satisfaite: "Le système doit permettre une simulation de verdict avant soumission finale du gate.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-019 sans contournement: "Le système doit afficher les tendances PASS/CONCERNS/FAIL par phase et par période.".
  - AC-03: Le seuil NFR est respecté: NFR-037 => 100% modules critiques documentés.
  - AC-04: Le second seuil de qualité est tenu: NFR-039 => build self-host reproductible.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E12-S03 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E12-S04 — Matrice sign-off nominative inter-rôles
- **Epic parent:** E12 — H10 Readiness, Rollout & Change Management
- **FR ciblés:** FR-019, FR-020
- **NFR ciblés:** NFR-039, NFR-040
- **Risques couverts:** M02 (ROI TCD non démontré), M03 (Résistance au changement de stack)
- **Dépendance de réalisation:** E12-S03
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-019 est satisfaite: "Le système doit afficher les tendances PASS/CONCERNS/FAIL par phase et par période.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-020 sans contournement: "Le système doit exporter un rapport de gate incluant verdict, preuves et actions ouvertes.".
  - AC-03: Le seuil NFR est respecté: NFR-039 => build self-host reproductible.
  - AC-04: Le second seuil de qualité est tenu: NFR-040 => time-to-first-value < 14 jours.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E12-S04 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E12-S05 — Publication baseline TCD/AQCD Sprint 1
- **Epic parent:** E12 — H10 Readiness, Rollout & Change Management
- **FR ciblés:** FR-020, FR-048
- **NFR ciblés:** NFR-040, NFR-033
- **Risques couverts:** M03 (Résistance au changement de stack), M04 (Scope inflation en V1)
- **Dépendance de réalisation:** E12-S04
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-020 est satisfaite: "Le système doit exporter un rapport de gate incluant verdict, preuves et actions ouvertes.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-048 sans contournement: "Le système doit proposer les 3 actions prioritaires par gate avec owner et preuve.".
  - AC-03: Le seuil NFR est respecté: NFR-040 => time-to-first-value < 14 jours.
  - AC-04: Le second seuil de qualité est tenu: NFR-033 => décision critique en <90s pour PER-01.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E12-S05 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E12-S06 — Plan rollout pilote 30/60/90 jours
- **Epic parent:** E12 — H10 Readiness, Rollout & Change Management
- **FR ciblés:** FR-048, FR-050
- **NFR ciblés:** NFR-033, NFR-035
- **Risques couverts:** M04 (Scope inflation en V1), M05 (Cycle de vente enterprise trop long)
- **Dépendance de réalisation:** E12-S05
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-048 est satisfaite: "Le système doit proposer les 3 actions prioritaires par gate avec owner et preuve.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-050 sans contournement: "Le système doit lier chaque mitigation à une tâche et à une preuve de fermeture.".
  - AC-03: Le seuil NFR est respecté: NFR-033 => décision critique en <90s pour PER-01.
  - AC-04: Le second seuil de qualité est tenu: NFR-035 => runbook critique disponible et testé.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E12-S06 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E12-S07 — Kit conduite du changement par rôle
- **Epic parent:** E12 — H10 Readiness, Rollout & Change Management
- **FR ciblés:** FR-050, FR-054
- **NFR ciblés:** NFR-035, NFR-037
- **Risques couverts:** M05 (Cycle de vente enterprise trop long), M06 (Dépendance excessive à la niche BMAD)
- **Dépendance de réalisation:** E12-S06
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-050 est satisfaite: "Le système doit lier chaque mitigation à une tâche et à une preuve de fermeture.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-054 sans contournement: "Le système doit suivre les actions H21/H22/H23 jusqu’à clôture vérifiée.".
  - AC-03: Le seuil NFR est respecté: NFR-035 => runbook critique disponible et testé.
  - AC-04: Le second seuil de qualité est tenu: NFR-037 => 100% modules critiques documentés.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E12-S07 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E12-S08 — Parcours onboarding accéléré (<14 jours)
- **Epic parent:** E12 — H10 Readiness, Rollout & Change Management
- **FR ciblés:** FR-054, FR-058
- **NFR ciblés:** NFR-037, NFR-039
- **Risques couverts:** M06 (Dépendance excessive à la niche BMAD), C04 (Coût support onboarding supérieur au plan)
- **Dépendance de réalisation:** E12-S07
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-054 est satisfaite: "Le système doit suivre les actions H21/H22/H23 jusqu’à clôture vérifiée.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-058 sans contournement: "Le système doit regrouper et limiter les alertes répétitives pour éviter la fatigue.".
  - AC-03: Le seuil NFR est respecté: NFR-037 => 100% modules critiques documentés.
  - AC-04: Le second seuil de qualité est tenu: NFR-039 => build self-host reproductible.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E12-S08 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E12-S09 — Tracker concerns ACT-01..ACT-08
- **Epic parent:** E12 — H10 Readiness, Rollout & Change Management
- **FR ciblés:** FR-058, FR-059
- **NFR ciblés:** NFR-039, NFR-040
- **Risques couverts:** C04 (Coût support onboarding supérieur au plan), C05 (Coût de rework UX après validation tardive)
- **Dépendance de réalisation:** E12-S08
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-058 est satisfaite: "Le système doit regrouper et limiter les alertes répétitives pour éviter la fatigue.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-059 sans contournement: "Le système doit mesurer le délai phase complete → notify et alerter les dépassements.".
  - AC-03: Le seuil NFR est respecté: NFR-039 => build self-host reproductible.
  - AC-04: Le second seuil de qualité est tenu: NFR-040 => time-to-first-value < 14 jours.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E12-S09 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E12-S10 — Atelier simulation go/no-go H10
- **Epic parent:** E12 — H10 Readiness, Rollout & Change Management
- **FR ciblés:** FR-059, FR-060
- **NFR ciblés:** NFR-040, NFR-033
- **Risques couverts:** C05 (Coût de rework UX après validation tardive), P02 (Handoffs incomplets ou ambigus)
- **Dépendance de réalisation:** E12-S09
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-059 est satisfaite: "Le système doit mesurer le délai phase complete → notify et alerter les dépassements.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-060 sans contournement: "Le système doit permettre des threads de commentaires reliés aux décisions et gates.".
  - AC-03: Le seuil NFR est respecté: NFR-040 => time-to-first-value < 14 jours.
  - AC-04: Le second seuil de qualité est tenu: NFR-033 => décision critique en <90s pour PER-01.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E12-S10 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E12-S11 — Boucle feedback post-go-live
- **Epic parent:** E12 — H10 Readiness, Rollout & Change Management
- **FR ciblés:** FR-060, FR-061
- **NFR ciblés:** NFR-033, NFR-035
- **Risques couverts:** P02 (Handoffs incomplets ou ambigus), P04 (RACI décisionnel flou)
- **Dépendance de réalisation:** E12-S10
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-060 est satisfaite: "Le système doit permettre des threads de commentaires reliés aux décisions et gates.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-061 sans contournement: "Le système doit gérer les mentions directes et l’escalade automatique selon la sévérité.".
  - AC-03: Le seuil NFR est respecté: NFR-033 => décision critique en <90s pour PER-01.
  - AC-04: Le second seuil de qualité est tenu: NFR-035 => runbook critique disponible et testé.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E12-S11 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

### Story E12-S12 — Contrat de handoff final vers H10
- **Epic parent:** E12 — H10 Readiness, Rollout & Change Management
- **FR ciblés:** FR-061, FR-062
- **NFR ciblés:** NFR-035, NFR-037
- **Risques couverts:** P04 (RACI décisionnel flou), M01 (Confusion de catégorie produit)
- **Dépendance de réalisation:** E12-S11
- **Acceptance Criteria (AC):**
  - AC-01: Sur scénario nominal, l’exigence FR-061 est satisfaite: "Le système doit gérer les mentions directes et l’escalade automatique selon la sévérité.".
  - AC-02: Sur scénario négatif/abuse case, le système respecte FR-062 sans contournement: "Le système doit afficher une timeline inter-rôles des événements clés du projet.".
  - AC-03: Le seuil NFR est respecté: NFR-035 => runbook critique disponible et testé.
  - AC-04: Le second seuil de qualité est tenu: NFR-037 => 100% modules critiques documentés.
- **Definition of Done (DoD):**
  - DoD-01: tests unitaires + intégration + e2e verts sur cas nominal et cas d’échec critique.
  - DoD-02: contrôle sécurité (RBAC/allowlist/inputs) exécuté et sans finding bloquant.
  - DoD-03: preuve UX (states/a11y/responsive/microcopy) attachée si composant UI concerné.
  - DoD-04: instrumentation métriques + alertes + runbook mis à jour pour exploitation.
  - DoD-05: mapping FR/NFR/Risque + owner + échéance documentés et traçables dans la story.
  - DoD-06: dépendances aval vérifiées et aucune ambiguïté de handoff H11/H12/H13 restante.
- **Evidence attendue:**
  - Logs de tests, captures, et export de preuve liés à E12-S12 dans le dossier implementation-artifacts.
  - Lien explicite vers gate impacté (G1..G5) + décision PASS/CONCERNS/FAIL justifiée.

## 35. Couverture exhaustive FR -> Story
| FR | Module | Story(s) de couverture | Epic(s) | Risque PRD associé |
|---|---|---|---|---|
| FR-001 | Workflow & Phases | E01-S01, E01-S10, E01-S11 | E01 | P01,P03,P06,P07 |
| FR-002 | Workflow & Phases | E01-S01, E01-S02, E01-S11 | E01 | P01,P03,P06,P07 |
| FR-003 | Workflow & Phases | E01-S02, E01-S03, E01-S12 | E01 | P01,P03,P06,P07 |
| FR-004 | Workflow & Phases | E01-S03, E01-S04 | E01 | P01,P03,P06,P07 |
| FR-005 | Workflow & Phases | E01-S04, E01-S05 | E01 | P01,P03,P06,P07 |
| FR-006 | Workflow & Phases | E01-S05, E01-S06, E12-S01 | E01, E12 | P01,P03,P06,P07 |
| FR-007 | Workflow & Phases | E01-S06, E01-S07 | E01 | P01,P03,P06,P07 |
| FR-008 | Workflow & Phases | E01-S07, E01-S08, E12-S01 | E01, E12 | P01,P03,P06,P07 |
| FR-009 | Workflow & Phases | E01-S08, E01-S09 | E01 | P01,P03,P06,P07 |
| FR-010 | Workflow & Phases | E01-S09, E01-S10 | E01 | P01,P03,P06,P07 |
| FR-011 | Gate Control | E03-S01, E03-S10, E03-S11 | E03 | T07,P06,U03 |
| FR-012 | Gate Control | E03-S01, E03-S02, E03-S11 | E03 | T07,P06,U03 |
| FR-013 | Gate Control | E03-S02, E03-S03, E03-S12 | E03 | T07,P06,U03 |
| FR-014 | Gate Control | E03-S03, E03-S04, E12-S01 | E03, E12 | T07,P06,U03 |
| FR-015 | Gate Control | E03-S04, E03-S05 | E03 | T07,P06,U03 |
| FR-016 | Gate Control | E03-S05, E03-S06 | E03 | T07,P06,U03 |
| FR-017 | Gate Control | E03-S06, E03-S07 | E03 | T07,P06,U03 |
| FR-018 | Gate Control | E03-S07, E03-S08, E12-S02 | E03, E12 | T07,P06,U03 |
| FR-019 | Gate Control | E03-S08, E03-S09, E12-S03 | E03, E12 | T07,P06,U03 |
| FR-020 | Gate Control | E03-S09, E03-S10, E12-S04 | E03, E12 | T07,P06,U03 |
| FR-021 | Artifact & Evidence | E02-S01, E02-S12 | E02 | T01,T02,T08 |
| FR-022 | Artifact & Evidence | E02-S01, E02-S02, E12-S01 | E02, E12 | T01,T02,T08 |
| FR-023 | Artifact & Evidence | E02-S02, E02-S03, E10-S01 | E02, E10 | T01,T02,T08 |
| FR-024 | Artifact & Evidence | E02-S03, E02-S04, E10-S01 | E02, E10 | T01,T02,T08 |
| FR-025 | Artifact & Evidence | E02-S04, E02-S05, E10-S02 | E02, E10 | T01,T02,T08 |
| FR-026 | Artifact & Evidence | E02-S05, E02-S06, E10-S03 | E02, E10 | T01,T02,T08 |
| FR-027 | Artifact & Evidence | E02-S06, E02-S07, E10-S04 | E02, E10 | T01,T02,T08 |
| FR-028 | Artifact & Evidence | E02-S07, E02-S08, E10-S05 | E02, E10 | T01,T02,T08 |
| FR-029 | Artifact & Evidence | E02-S08, E02-S09, E10-S06 | E02, E10 | T01,T02,T08 |
| FR-030 | Artifact & Evidence | E02-S09, E02-S10, E10-S07 | E02, E10 | T01,T02,T08 |
| FR-031 | Artifact & Evidence | E02-S10, E02-S11 | E02 | T01,T02,T08 |
| FR-032 | Artifact & Evidence | E02-S11, E02-S12 | E02 | T01,T02,T08 |
| FR-033 | Command Broker | E04-S01, E04-S12 | E04 | S01,S02,S03,S05,P07 |
| FR-034 | Command Broker | E04-S01, E04-S02, E11-S01 | E04, E11, E12 | S01,S02,S03,S05,P07 |
| FR-035 | Command Broker | E04-S02, E04-S03 | E04 | S01,S02,S03,S05,P07 |
| FR-036 | Command Broker | E04-S03, E04-S04 | E04 | S01,S02,S03,S05,P07 |
| FR-037 | Command Broker | E04-S04, E04-S05, E11-S01 | E04, E11 | S01,S02,S03,S05,P07 |
| FR-038 | Command Broker | E04-S05, E04-S06, E11-S02 | E04, E11 | S01,S02,S03,S05,P07 |
| FR-039 | Command Broker | E04-S06, E04-S07, E11-S03 | E04, E11 | S01,S02,S03,S05,P07 |
| FR-040 | Command Broker | E04-S07, E04-S08, E11-S04 | E04, E11 | S01,S02,S03,S05,P07 |
| FR-041 | Command Broker | E04-S08, E04-S09, E11-S05 | E04, E11 | S01,S02,S03,S05,P07 |
| FR-042 | Command Broker | E04-S09, E04-S10, E11-S06 | E04, E11 | S01,S02,S03,S05,P07 |
| FR-043 | Command Broker | E04-S10, E04-S11, E11-S07 | E04, E11 | S01,S02,S03,S05,P07 |
| FR-044 | Command Broker | E04-S11, E04-S12 | E04 | S01,S02,S03,S05,P07 |
| FR-045 | AQCD & Risk Intelligence | E05-S01, E05-S10, E05-S11 | E05 | M02,C01,P05 |
| FR-046 | AQCD & Risk Intelligence | E05-S01, E05-S02, E05-S11 | E05, E10 | M02,C01,P05 |
| FR-047 | AQCD & Risk Intelligence | E05-S02, E05-S03, E05-S12 | E05, E10, E12 | M02,C01,P05 |
| FR-048 | AQCD & Risk Intelligence | E05-S03, E05-S04, E12-S05 | E05, E12 | M02,C01,P05 |
| FR-049 | AQCD & Risk Intelligence | E05-S04, E05-S05 | E05 | M02,C01,P05 |
| FR-050 | AQCD & Risk Intelligence | E05-S05, E05-S06, E12-S06 | E05, E12 | M02,C01,P05 |
| FR-051 | AQCD & Risk Intelligence | E05-S06, E05-S07 | E05 | M02,C01,P05 |
| FR-052 | AQCD & Risk Intelligence | E05-S07, E05-S08, E10-S10 | E05, E10 | M02,C01,P05 |
| FR-053 | AQCD & Risk Intelligence | E05-S08, E05-S09, E10-S11 | E05, E10 | M02,C01,P05 |
| FR-054 | AQCD & Risk Intelligence | E05-S09, E05-S10, E12-S07 | E05, E12 | M02,C01,P05 |
| FR-055 | Collaboration & Notifications | E07-S01, E07-S08, E07-S09 | E07 | U06,P03,M03 |
| FR-056 | Collaboration & Notifications | E07-S01, E07-S02, E07-S09 | E07 | U06,P03,M03 |
| FR-057 | Collaboration & Notifications | E07-S02, E07-S03, E07-S10 | E07 | U06,P03,M03 |
| FR-058 | Collaboration & Notifications | E07-S03, E07-S04, E07-S11 | E07, E12 | U06,P03,M03 |
| FR-059 | Collaboration & Notifications | E07-S04, E07-S05, E07-S12 | E07, E12 | U06,P03,M03 |
| FR-060 | Collaboration & Notifications | E07-S05, E07-S06, E12-S10 | E07, E12 | U06,P03,M03 |
| FR-061 | Collaboration & Notifications | E07-S06, E07-S07, E12-S11 | E07, E12 | U06,P03,M03 |
| FR-062 | Collaboration & Notifications | E07-S07, E07-S08, E12-S12 | E07, E12 | U06,P03,M03 |
| FR-063 | UX Quality Controls | E06-S01, E06-S08, E06-S09 | E06, E12 | U02,U03,U04,C05 |
| FR-064 | UX Quality Controls | E06-S01, E06-S02, E06-S09 | E06 | U02,U03,U04,C05 |
| FR-065 | UX Quality Controls | E06-S02, E06-S03, E06-S10 | E06 | U02,U03,U04,C05 |
| FR-066 | UX Quality Controls | E06-S03, E06-S04, E06-S11 | E06 | U02,U03,U04,C05 |
| FR-067 | UX Quality Controls | E06-S04, E06-S05, E06-S12 | E06 | U02,U03,U04,C05 |
| FR-068 | UX Quality Controls | E06-S05, E06-S06 | E06 | U02,U03,U04,C05 |
| FR-069 | UX Quality Controls | E06-S06, E06-S07 | E06 | U02,U03,U04,C05 |
| FR-070 | UX Quality Controls | E06-S07, E06-S08 | E06 | U02,U03,U04,C05 |
| FR-071 | Integrations & Multi-Project | E08-S01, E08-S04, E08-S05 | E08, E12 | M03,M07,S08,T05 |
| FR-072 | Integrations & Multi-Project | E08-S01, E08-S02, E08-S05 | E08, E11 | M03,M07,S08,T05 |
| FR-073 | Integrations & Multi-Project | E08-S02, E08-S03, E08-S06 | E08 | M03,M07,S08,T05 |
| FR-074 | Integrations & Multi-Project | E08-S03, E08-S04, E08-S07 | E08 | M03,M07,S08,T05 |
| FR-075 | Integrations & Multi-Project | E09-S01, E09-S08, E09-S09 | E09 | M03,M07,S08,T05 |
| FR-076 | Integrations & Multi-Project | E09-S01, E09-S02, E09-S09 | E09, E10 | M03,M07,S08,T05 |
| FR-077 | Integrations & Multi-Project | E09-S02, E09-S03, E09-S10 | E09 | M03,M07,S08,T05 |
| FR-078 | Integrations & Multi-Project | E09-S03, E09-S04, E09-S11 | E09, E12 | M03,M07,S08,T05 |
| FR-079 | Integrations & Multi-Project | E09-S04, E09-S05, E09-S12 | E09 | M03,M07,S08,T05 |
| FR-080 | Integrations & Multi-Project | E09-S05, E09-S06, E11-S09 | E09, E11 | M03,M07,S08,T05 |
| FR-081 | Integrations & Multi-Project | E09-S06, E09-S07, E11-S10 | E09, E11 | M03,M07,S08,T05 |
| FR-082 | Integrations & Multi-Project | E09-S07, E09-S08, E11-S11 | E09, E11 | M03,M07,S08,T05 |

## 36. Couverture exhaustive NFR -> Story
| NFR | Catégorie | Story(s) de couverture | Epic(s) | Cible mesurable |
|---|---|---|---|---|
| NFR-001 | Performance | E10-S01 | E10 | p95 < 2.0s |
| NFR-002 | Performance | E03-S01, E03-S05, E03-S06 | E03, E10 | p95 < 2.5s |
| NFR-003 | Performance | E02-S01, E02-S06, E02-S07 | E02, E10 | p95 < 5s |
| NFR-004 | Performance | E02-S01, E02-S02, E02-S07 | E02, E10 | p95 < 2s sur 500 docs |
| NFR-005 | Performance | E09-S01, E09-S05, E09-S06 | E09 | p95 < 10s |
| NFR-006 | Performance | E02-S02, E02-S03, E02-S08 | E02, E10 | < 60s |
| NFR-007 | Performance | E03-S01, E03-S02, E03-S06 | E03, E10 | <= 2s après preuve |
| NFR-008 | Performance | E10-S06, E10-S07 | E10 | <= 1.5s |
| NFR-009 | Performance | E05-S01, E05-S04, E05-S05 | E05, E10 | p95 < 2.5s |
| NFR-010 | Performance | E07-S01, E07-S04, E07-S05 | E07, E10 | p95 < 2s |
| NFR-011 | Fiabilité | E01-S01, E01-S05, E01-S06 | E01, E11 | >= 99.5% |
| NFR-012 | Fiabilité | E02-S03, E02-S04, E02-S09 | E02, E11 | 0 toléré |
| NFR-013 | Fiabilité | E01-S01, E01-S02, E01-S06 | E01, E08 | >= 95% |
| NFR-014 | Fiabilité | E11-S02, E11-S03 | E11 | flakiness < 3% |
| NFR-015 | Fiabilité | E11-S03, E11-S04 | E11 | bascule < 60s |
| NFR-016 | Fiabilité | E02-S04, E02-S05, E02-S10 | E02, E11 | max 3 retries + DLQ |
| NFR-017 | Fiabilité | E01-S02, E01-S03, E01-S07 | E01, E07 | < 10 min |
| NFR-018 | Fiabilité | E03-S02, E03-S03, E03-S07 | E03, E05 | >= 65% sur baseline |
| NFR-019 | Sécurité | E04-S01, E04-S11, E04-S12 | E04, E11 | 0 action critique hors rôle |
| NFR-020 | Sécurité | E04-S01, E04-S02, E04-S08 | E04, E08 | 100% commandes exécutées issues catalogue |
| NFR-021 | Sécurité | E04-S02, E04-S03, E04-S09 | E04, E08 | 0 exécution destructive hors projet actif |
| NFR-022 | Sécurité | E04-S03, E04-S04, E04-S10 | E04, E11 | intégrité vérifiée quotidienne |
| NFR-023 | Sécurité | E04-S04, E04-S05, E11-S07 | E04, E11 | 0 secret exposé dans logs persistés |
| NFR-024 | Sécurité | E04-S05, E04-S06, E11-S08 | E04, E11 | 100% overrides avec approbateur |
| NFR-025 | Sécurité | E04-S06, E04-S07, E11-S09 | E04, E11 | timeout max 120s |
| NFR-026 | Sécurité | E04-S07, E04-S08, E11-S10 | E04, E11 | <24h après changement rôle |
| NFR-027 | Conformité | E09-S01, E09-S02, E09-S06 | E09, E11 | politique appliquée par type de données |
| NFR-028 | Conformité | E09-S02, E09-S03, E09-S07 | E09, E11 | 100% exports validés par policy |
| NFR-029 | Conformité | E03-S03, E03-S04, E03-S08 | E03, E09 | chaîne preuve complète obligatoire |
| NFR-030 | UX | E06-S01, E06-S05, E06-S06 | E06, E11 | score >= 85 + 0 blocker |
| NFR-031 | UX | E03-S04, E03-S05, E03-S09 | E03, E06 | 100% widgets critiques avec 4 états |
| NFR-032 | UX | E06-S02, E06-S03, E06-S07 | E06 | parcours critiques validés mobile/tablette/desktop |
| NFR-033 | UX | E06-S03, E06-S04, E06-S08 | E06, E07, E12 | décision critique en <90s pour PER-01 |
| NFR-034 | Opérabilité | E01-S03, E01-S04, E01-S08 | E01, E05, E10, E11 | métriques clés disponibles en continu |
| NFR-035 | Opérabilité | E05-S03, E05-S04, E05-S07 | E05, E10, E12 | runbook critique disponible et testé |
| NFR-036 | Opérabilité | E10-S11, E10-S12 | E10 | 100% changements avec version + migration |
| NFR-037 | Maintenabilité | E12-S02, E12-S03, E12-S07 | E11, E12 | 100% modules critiques documentés |
| NFR-038 | Maintenabilité | E02-S05, E02-S06, E02-S11 | E02, E10 | aucune rupture sur corpus de référence |
| NFR-039 | Maintenabilité | E08-S03, E08-S04, E08-S07 | E08, E09, E12 | build self-host reproductible |
| NFR-040 | Maintenabilité | E01-S04, E01-S05, E01-S09 | E01, E06, E07, E12 | time-to-first-value < 14 jours |

## 37. Critères de handoff H10 (PASS / CONCERNS / FAIL)
| Axe H10 | Critère PASS | Critère CONCERNS | Critère FAIL | Evidence requise |
|---|---|---|---|---|
| Cohérence PRD/UX/Architecture/Epics | 100% FR/NFR couverts par stories testables | <=5 écarts mineurs avec plan daté | trous majeurs de couverture | matrices sections 35/36 + revue croisée |
| Qualité Gate | dual G4 bloquant opérationnel + preuves primaires | incidents ponctuels sans impact DONE | DONE possible avec sous-gate FAIL | logs gate engine + tests e2e |
| Sécurité exécution | 0 write hors dry-run/allowlist/RBAC | déviation corrigée sous SLA court | write non sécurisé reproductible | audits broker + journaux immuables |
| UX bloquante | 0 blocker a11y + states/responsive complets | dettes UX mineures planifiées | violations critiques persistantes | rapports UX QA + captures multi-breakpoint |
| Risques critiques | Top risques sous seuil accepté | 1-3 risques élevés avec mitigation active | risque critique sans owner/action | registre risques + preuves de mitigation |
| Opérabilité | observabilité + runbooks testés | couverture partielle avec date de rattrapage | absence runbooks/alertes | SLI/SLO dashboards + compte-rendu exercise |
| Adoption/rollout | plan 30/60/90 validé + sign-offs nominaux | sign-off partiel avec échéance proche | pas de plan de conduite du changement | pack E12 + matrice sign-off |

## 38. Registre de dépendances critiques pour H10
| Dépendance | Epic concerné | Condition de levée | Owner |
|---|---|---|---|
| Metadata validator ULTRA (stepsCompleted/inputDocuments) | E02 | 100% artefacts majeurs valides | Architect + PM |
| Dual gate G4 bloquant DONE | E03/E06 | test E2E PASS G4-T=PASS/G4-UX=FAIL -> DONE refusé | TEA + UX QA |
| Context service signed root | E04/E08 | 0 commande destructive hors projet actif | Security + Orchestrateur |
| Contract tests API/events | E10 | suite contractuelle en CI sur domaines Gate/Command/Data | Architect + DEV Lead |
| Rétention/export gouvernés | E09/E11 | policy validée Security/DPO + tests role-based | Security Lead |
| Baseline TCD/AQCD | E05/E12 | baseline publiée sprint 1 + suivi hebdo | PM Produit |
| Plan self-host readiness | E09/E11 | hardening + runbooks + checklist compliance datés | Architect + Security |
| Sign-off inter-rôles nominatif | E12 | PM/Architect/UX/TEA signent readiness pack | Orchestrateur |

## 39. Décisions backlog majeures (Top 12)
- 1) Prioriser E01/E02/E03 avant toute sophistication UI pour éliminer le risque de faux signal décisionnel.
- 2) Faire de E02-S02 (metadata validator ULTRA) une dépendance obligatoire de tous flux documentaires.
- 3) Imposer la règle dual gate bloquante DONE dans E03 et la dupliquer en tests E2E systématiques.
- 4) Découper E04 selon simulate/apply/approval/killswitch pour minimiser l’attaque surface write.
- 5) Introduire E08-S03 (context service signed root) avant connecteurs write ou export sensibles.
- 6) Relier chaque story à au moins 1 FR + 1 NFR + 1 risque, avec AC et DoD vérifiables.
- 7) Traiter l’UX comme gate bloquante via E06 (states/a11y/responsive/microcopy/tokens).
- 8) Utiliser E05 pour prouver la valeur business (baseline TCD/AQCD) dès sprint 1.
- 9) Placer E10 en socle de performance/contrats pour prévenir la dérive de latence et de schémas.
- 10) Encadrer E09/E11 pour conformité enterprise (rétention/export/audit/secret redaction).
- 11) Intégrer les concerns H07 ACT-01..ACT-08 dans E12 avec owners et dates de fermeture explicites.
- 12) Conditionner H10 à un pack de preuves standardisé PASS/CONCERNS/FAIL compilé automatiquement.

## 40. Check de conformité minimale du livrable H09
- Le livrable contient explicitement le terme **Epic** dans la structure et les sections de backlog.
- La référence de qualité documentaire est explicitement citée: https://github.com/XdreaMs404/ExempleBMAD.
- Les métadonnées `stepsCompleted` et `inputDocuments` sont présentes et complètes.
- Le contenu inclut: epics ordonnés, stories testables (AC + DoD), mapping FR/NFR->story, dépendances, risques, critères H10.
- Le backlog est utilisable immédiatement comme base de handoff H09 -> H10 puis H11/H12.

