---
title: "H08 — Architecture approfondie et exécutable: Dashboard OpenClaw"
phase: "H08"
project: "dashboard-openclaw"
date: "2026-02-20"
workflowType: "BMAD Solutioning - Architecture"
executionMode: "agent-by-agent + file-by-file"
referenceBenchmark: "https://github.com/XdreaMs404/ExempleBMAD"
qualityTarget: "G3-ready, aligné PRD/UX/Risques, profondeur documentaire supérieure"
owners:
  architecture: "Architecte Plateforme BMAD"
  product: "PM BMAD"
  ux: "UX Designer BMAD"
  security: "Security Lead"
  validation: "Orchestrateur Jarvis"
stepsCompleted:
  - "Lecture intégrale des contraintes BMAD H01→H23 et des gates G1→G5"
  - "Lecture intégrale du protocole BMAD ULTRA QUALITY et extraction des obligations H08"
  - "Analyse détaillée du PRD H04 (82 FR, 40 NFR, 164 AC, 30 KPI, dépendances D01..D20)"
  - "Analyse détaillée de la spécification UX H05 (contraintes H06-UXC-01..10 et standards bloquants)"
  - "Analyse du rapport H07 de validation planning (PASS G2 avec concerns explicites)"
  - "Analyse de la recherche implementation-patterns (AP-01..AP-16, pré-ADR-001..015)"
  - "Analyse du benchmark concurrence pour aligner architecture et différenciation produit"
  - "Analyse du registre risques/contraintes (T/P/U/S/C/M + top 10 critiques)"
  - "Conception de l’Architecture logique et de déploiement alignée avec risques et dépendances"
  - "Conception du modèle Event Ledger + Projections + modèles API + politiques sécurité"
  - "Définition des SLO, des runbooks, des stratégies de résilience et rollback"
  - "Préparation d’un paquet de décisions transférables vers H09 (epics) et H10 (readiness)"
  - "Consolidation des matrices de traçabilité FR/NFR/Risques → composants et contrôles"
inputDocuments:
  - "/root/.openclaw/workspace/docs/BMAD-HYPER-ORCHESTRATION-THEORY.md"
  - "/root/.openclaw/workspace/docs/BMAD-ULTRA-QUALITY-PROTOCOL.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/prd.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/ux.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/planning-validation.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/implementation-patterns.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/competition-benchmark.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/risks-constraints.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/exemplebmad-analysis-2026-02-20.md"
---

# Architecture — Dashboard OpenClaw (H08)

Cette Architecture H08 formalise une solution réelle et déployable pour la Control Tower BMAD.
Le document transforme les exigences PRD/UX/Risques en design logique, design de déploiement,
contrats de données, politiques de sécurité, API, observabilité, résilience et décisions transférables.
La qualité documentaire est calibrée explicitement sur la référence: https://github.com/XdreaMs404/ExempleBMAD.

## 1. Mandat H08, posture d’architecte et méthode d’exécution

Le mandat H08 est de livrer une Architecture prête à implémenter en H09/H10, sans zones floues majeures.
Le document suit le protocole ULTRA: une mission, un livrable principal, et traçabilité complète.

Méthode de conception appliquée:
- Traduction des FR/NFR/AC en décisions de structure (services, données, politiques).
- Validation systématique des impacts UX H06-UXC pour éviter tout écart G4-UX en aval.
- Réduction explicite des top risques critiques (S03, S01, T07, M02, M07, P01, P06, P07, S02, S05).
- Application des patterns AP-01..AP-16 avec arbitrages motivés (pas de collage aveugle).
- Conception orientée preuve: chaque décision est reliée à des contrôles observables et testables.
- Préparation du transfert H09/H10 via matrices de traçabilité et décisions bornées.

| Axe | Décision de méthode | Impact H08 | Vérification |
|---|---|---|---|
| METH-01 | Architecture contract-first (données, API, policy) | Réduit ambiguïtés story-level | Contrats versionnés + tests |
| METH-02 | Risk-first design sur top risques critiques | Réduit probabilité d’incident majeur | Matrice risques → contrôles |
| METH-03 | Dual-gate by design (G4-T/G4-UX) | Empêche faux DONE | Règles gate + tests E2E |
| METH-04 | Zero-trust command architecture | Réduit surface d’attaque | RBAC + allowlist + audit append-only |
| METH-05 | Event-ledger + projections matérialisées | Concilie auditabilité et performance | SLO projection + rebuild |
| METH-06 | UX contraintes comme NFR bloquants | Conserve qualité perçue et conformité | score a11y >=85 + states 100% |
| METH-07 | Observabilité process + technique unifiée | Décisions plus rapides et justifiables | SLI/SLO + runbooks |
| METH-08 | Architecture incrémentale V1→V1.2 | Limite risque de scope inflation | roadmap lotie avec gates |

## 2. Synthèse exécutive des décisions d’Architecture

Décisions structurantes retenues pour la V1:
| ID | Décision architecture | Pourquoi (sources) | Trade-off | Statut |
|---|---|---|---|---|
| ARC-01 | Adopter un Event Ledger append-only signé | PRD §14, AP-01, S04 | Coût stockage supérieur | ACCEPTÉ |
| ARC-02 | Séparer Write Model et Read Model | AP-02/06, NFR perf | Complexité projection | ACCEPTÉ |
| ARC-03 | Construire un Gate Engine policy-as-code | FR-011..020, P01/P06 | Nécessite gouvernance policy | ACCEPTÉ |
| ARC-04 | Traiter G4-T/G4-UX comme sous-gates bloquants natifs | FR-012/014, H06-UXC-01, T07 | UI plus dense | ACCEPTÉ |
| ARC-05 | Implémenter Command Broker simulate/apply séparés | FR-033..044, S01/S02/S03 | Friction initiale | ACCEPTÉ |
| ARC-06 | Isoler contexte multi-projets via active_project_root signé | FR-071/072, P07/S01 | Étape de confirmation en plus | ACCEPTÉ |
| ARC-07 | Adopter projections AQCD matérialisées | FR-045..054, M02 | Gestion invalidation | ACCEPTÉ |
| ARC-08 | Utiliser stale-but-available en mode dégradé | T08, AP-13 | Lecture potentiellement ancienne | ACCEPTÉ |
| ARC-09 | Versionner contrats API/événements/handoffs | T05, AP-03, NFR-036 | Overhead de versioning | ACCEPTÉ |
| ARC-10 | Prévoir déploiement cloud + self-host ready | M07, D12, FR-081 | Complexité ops accrue | ACCEPTÉ |
| ARC-11 | Centraliser observabilité + runbooks reliés alertes | PRD §17, NFR-034/035 | Effort discipline équipe | ACCEPTÉ |
| ARC-12 | Gérer rétention/purge classifiée par data domain | FR-082, S08, D14 | Nécessite governance légale | ACCEPTÉ |

Conclusion: la solution privilégie la fiabilité décisionnelle et la sécurité opérationnelle sur la simplicité superficielle.

## 3. Alignement explicite des entrées obligatoires

| Code | Document | Signal clé | Réponse Architecture |
|---|---|---|---|
| SRC-01 | BMAD-HYPER-ORCHESTRATION-THEORY | Ordre H01→H23, dual gate G4, handoff explicite | Machine d’état stricte + Gate Engine dual + contrats handoff versionnés |
| SRC-02 | BMAD-ULTRA-QUALITY-PROTOCOL | Agent/fichier/trace, metadata obligatoires | Ingestion bloquante sans metadata + trace events dédiés |
| SRC-03 | PRD H04 | 82 FR, 40 NFR, 164 AC, sécurité et auditabilité | Services modulaires + API + contrôles mesurables |
| SRC-04 | UX H05 | H06-UXC-01..10, standards UI bloquants | API dual gate + contrats d’états + contrôles a11y/responsive |
| SRC-05 | Planning Validation H07 | G2 PASS avec concerns non bloquants | Plan de mitigation intégré (M02, M07, D16, S08...) |
| SRC-06 | Implementation Patterns H02 | AP-01..AP-16 + pré-ADR | ADRs H08 confirmés/rejetés explicitement |
| SRC-07 | Competition Benchmark H02 | Différenciation decision-runtime vs observability-only | Priorité Gate Center + Evidence Graph + Action Queue |
| SRC-08 | Risks-Constraints H02 | Top risques critiques S/T/P/M | Design risk-first + runbooks + kill-switch |
| SRC-09 | ExempleBMAD Analysis | Profondeur doc, traçabilité et granularité attendues | Sections denses + tables traçables + transfert H09/H10 |

## 4. Drivers architecturaux (FR, NFR, UX et Risques)

Le tableau suivant structure les drivers à partir du PRD et de H05/H07.
| Module | FR couverts | Driver principal | Risques dominants | Composants cibles |
|---|---|---|---|---|
| WF | FR-001..010 | Machine d’état H01→H23 stricte, transitions autorisées | P01,P03,P06 | workflow-service + phase-policy-engine |
| GT | FR-011..020 | Gate center unifié + dual G4 bloquant | T07,P06,U03 | gate-engine + gate-projection |
| AR | FR-021..032 | Ingestion artefacts + evidence graph + staleness | T01,T02,T08 | artifact-ingestor + evidence-service |
| CM | FR-033..044 | Command broker sécurisé simulate/apply | S01,S02,S03,S05 | command-broker + policy-service |
| AQ | FR-045..054 | AQCD/readiness/risk intelligence explicables | M02,C01,P05 | aqcd-service + risk-service |
| CO | FR-055..062 | Notifications priorisées et anti-fatigue | U06,P03,M03 | notification-hub + escalation-engine |
| UX | FR-063..070 | States/a11y/responsive/design tokens | U02,U03,U04,C05 | ui-contract-service + ux-evidence |
| IN | FR-071..082 | Multi-project isolation + intégrations + export | P07,S08,M07 | context-service + integration-hub |

## 5. Vision contexte système et frontières (C4 niveau contexte)

Le système Dashboard OpenClaw opère comme une tour de contrôle au-dessus de l’existant client.
Il ne remplace pas Jira/Linear/CI/Notion; il orchestre la décision et l’auditabilité cross-outils.

| ID | Acteur/Système | Rôle | Interface |
|---|---|---|---|
| ACT-01 | Orchestrateur | Décision phase/gate et escalades | UI web, API workflow, notifications |
| ACT-02 | PM Produit | Arbitrage scope/risque/AC | UI evidence + API decision |
| ACT-03 | Architecte | Arbitrage technique, ADR, dépendances | UI readiness + API architecture |
| ACT-04 | TEA/QA | Qualité technique et gating | gate API + test evidence |
| ACT-05 | UX QA | Qualité UX bloquante (G4-UX) | ux evidence API + capture storage |
| ACT-06 | Sponsor/Ops | Pilotage AQCD et budget | executive read model |
| EXT-01 | Jira/Linear | Source stories/tickets | read-first connector |
| EXT-02 | Notion | Sources de preuve documentaire | indexed links connector |
| EXT-03 | CI/Test tools | Résultats unit/int/e2e/coverage | CI ingestion connector |
| EXT-04 | Security scanners | Vulnérabilités et conformité | security ingestion connector |
| EXT-05 | Storage objet | Captures UX, bundles exports | signed URL gateway |
| EXT-06 | Identity Provider | AuthN/SSO/JML | OIDC/SAML adapter |

## 6. Architecture logique cible (C4 niveau conteneurs)

L’Architecture logique sépare explicitement les responsabilités: ingestion, règles, exécution, projection, exposition API.
Ce découpage réduit le couplage et permet un scaling ciblé selon les charges (ingestion vs lecture vs commandes).

| Service | Responsabilité principale | State | Scalabilité | Zone réseau |
|---|---|---|---|---|
| svc-api-gateway | Entrée unique REST/GraphQL, authn/authz, rate limiting | Stateless | Horizontal | public edge |
| svc-authz | RBAC/ABAC/policy decision point | Redis + policy cache | Horizontal | private |
| svc-workflow | Machine d’état H01→H23 et transitions | PostgreSQL (write) | Vertical+replica | private |
| svc-gate-engine | Évaluation PASS/CONCERNS/FAIL et dual G4 | PostgreSQL + policy store | Horizontal | private |
| svc-artifact-ingestor | Parsing markdown/yaml, validation metadata | Queue + parser cache | Worker scale | private |
| svc-evidence-graph | Relations décision↔preuves↔gates↔commandes | Graph tables | Horizontal | private |
| svc-command-broker | simulate/apply, allowlist, idempotency | Broker DB + queue | Horizontal | private high-sec |
| svc-command-runner | Exécution isolée commandes approuvées | Ephemeral workers | Burst scale | isolated subnet |
| svc-risk | Registre risques + mitigations + heatmap | PostgreSQL | Horizontal | private |
| svc-aqcd | Calcul scores AQCD/readiness | Projection store | Horizontal | private |
| svc-notification | Priorisation, dedup, SLA ack, escalades | Queue + templates | Horizontal | private |
| svc-integration-hub | Connecteurs Jira/Linear/Notion/CI/Sec | Connector state DB | Horizontal | private |
| svc-projection-builder | Matérialisation read models | Projection DB | Worker scale | private |
| svc-search | Index plein texte + filtre phase/gate/risque | OpenSearch/PG trigram | Horizontal | private |
| svc-export-bundle | Génération md/pdf/json filtrée rôle | Object storage + jobs | Worker scale | private |
| svc-observability | Agrégation métriques/logs/traces | TSDB + log store | Horizontal | ops zone |
| svc-audit-ledger | Journal append-only signé | WORM storage | Vertical+replica | high-sec |
| svc-context | Gestion active_project_root signé | PostgreSQL + signer | Horizontal | private |
| svc-ux-evidence | Stockage preuves UX et verdicts G4-UX | Object storage + metadata | Horizontal | private |
| svc-reporting-api | API externe de reporting contrôlé | Read replica | Horizontal | dmz read-only |

### 6.1 Interactions critiques entre services

| ID | Flux | Commande/événement | Contrôle | Risque couvert |
|---|---|---|---|---|
| INT-01 | API Gateway -> Workflow | POST transition phase | Contrôle policy + event emit | P01/P03 |
| INT-02 | Workflow -> Gate Engine | Demande réévaluation gate | version policy + trace id | T07/P06 |
| INT-03 | Artifact Ingestor -> Event Ledger | artifact.parsed/failed | idempotency key + checksum | T01/T02 |
| INT-04 | Command Broker -> Context Service | Validation root actif signé | signature JWT + nonce | S01/P07 |
| INT-05 | Command Broker -> Command Runner | apply command approved | job token court + TTL | S02/S03 |
| INT-06 | Command Runner -> Audit Ledger | result append-only | signature + tamper check | S04/S05 |
| INT-07 | Risk Service -> AQCD Service | risk exposure update | event versioned schema | M02/C01 |
| INT-08 | Projection Builder -> Search | index projection delta | at-least-once + de-dup | T03/T04 |
| INT-09 | Notification -> External channels | critical alert dispatch | throttle + ack tracking | U06/P03 |
| INT-10 | Export Bundle -> Audit Ledger | bundle.generated event | role filter fingerprint | S06/S08 |
| INT-11 | UX Evidence -> Gate Engine | g4ux verdict update | proof required validation | T07/U02/U03 |
| INT-12 | Integration Hub -> Event Ledger | external sync events | connector scoped token | M03/T05 |

## 7. Architecture de déploiement (C4 niveau nœuds)

Le déploiement cible supporte deux modes: cloud managé (par défaut) et self-host enterprise (roadmap sécurisée).
Les artefacts critiques (audit ledger, secrets, backups) suivent des contrôles renforcés dès la V1.

| Environnement | Cible | Plateforme | Usage | Criticité |
|---|---|---|---|---|
| ENV-LOCAL | Développeur | docker compose | Tests unitaires/intégration locale | faible |
| ENV-CI | Intégration continue | k8s ephemeral | Tests contract/E2E/scan sécurité | moyen |
| ENV-STG | Staging | k8s dedicated | Pré-production + chaos game days | élevé |
| ENV-PROD-CLOUD | Production SaaS | k8s multi-AZ | Service principal V1 | critique |
| ENV-PROD-SELFHOST | Production client | k8s/on-prem | Segments régulés | critique |

### 7.1 Topologie réseau et zones de confiance

| Zone | Composants | Objectif | Contrôles |
|---|---|---|---|
| ZONE-EDGE | API Gateway + WAF | Entrée HTTP(s) | TLS, WAF, rate limit, bot defense |
| ZONE-APP | Workflow/Gate/Risk/AQCD APIs | Traitement métier | mTLS interne, service mesh policy |
| ZONE-DATA | PostgreSQL/Event ledger/Search | Persistences critiques | encryption at rest, ACL strictes |
| ZONE-RUNNER | Command runner isolated | Exécution commandes | egress control + seccomp/apparmor |
| ZONE-OPS | Observabilité/backup/runbook | Pilotage ops | accès restreint SRE/SecOps |
| ZONE-INT | Connecteurs externes | Sync outillage tiers | tokens scoped + egress allowlist |

### 7.2 Déploiement self-host readiness (M07)

| ID | Capacité self-host | Critère | Owner |
|---|---|---|---|
| SH-01 | Packaging Helm versionné | Chart installable en cluster air-gapped | Architecte |
| SH-02 | Secret management compatible Vault/KMS client | rotation <= 24h | Security Lead |
| SH-03 | Storage backend interchangeable | S3 compatible ou on-prem objet | Architecte |
| SH-04 | OIDC/SAML federation | RBAC/JML intégrable IAM client | Security Lead |
| SH-05 | Export compliance profile | templates filtrés par classification | TEA + Security |
| SH-06 | Runbook installation + upgrade + rollback | documentation validée en staging | SRE |
| SH-07 | Smoke tests post-install | >=95% checks green en 15 min | QA |
| SH-08 | Backup/restore playbook certifié | RPO/RTO contractualisable | SRE + Security |

## 8. Stratégie de données: Event Ledger, Write Model, Read Model

La stratégie de données suit le pattern AP-01 + AP-06:
- Toutes les mutations métier produisent un événement append-only signé.
- Les projections read-side sont matérialisées et reconstruites sans modifier l’historique source.
- Les décisions (gate/phase/command) restent auditablement traçables à la preuve primaire.

| Domaine | Objectif | Store principal | Contrainte |
|---|---|---|---|
| Write model | Intégrité transactionnelle, règles métier, événements sources | PostgreSQL + outbox | forte cohérence |
| Event ledger | Historique immuable corrélé | WORM log + signatures | append-only |
| Projection model | Lecture rapide orientée rôle | PostgreSQL read + search index | éventuelle (bornée) |
| Analytics AQCD | Tendance et décision sponsor | Timeseries/materialized views | batch + near-real-time |
| Audit bundles | Preuve exportable | Object storage + metadata index | immutabilité versionnée |

### 8.1 Modèle de cohérence et garanties

| ID | Garantie | Mécanisme | Source PRD |
|---|---|---|---|
| CONS-01 | Pas de perte événement critique | Outbox transactionnelle + retries + DLQ | NFR-012 |
| CONS-02 | Déduplication idempotente | idempotency_key par commande/ingestion | FR-040 |
| CONS-03 | Fraîcheur projection visible | timestamp source + age badge | FR-030 |
| CONS-04 | Rebuild projection déterministe | snapshot + replay séquentiel | NFR-006 |
| CONS-05 | Intégrité audit | hash chain + signature journalière | NFR-022 |
| CONS-06 | Compatibilité schéma | schema_version + adaptateurs | NFR-036 |
| CONS-07 | Isolation projet | project_id/root signé dans chaque event | NFR-021 |
| CONS-08 | Traçabilité preuve | evidence_ref obligatoire sur décisions critiques | NFR-029 |

## 9. Modèle de données détaillé (entités, champs, index, relations)

Le modèle ci-dessous étend la base PRD §14 et AP-02/AP-08 pour couvrir les besoins H09/H10 sans ambiguïté.

| Entité | Champ | Type | Obligatoire | Description |
|---|---|---|---|---|
| ProjectContext | project_id | uuid | oui | Identifiant projet |
| ProjectContext | active_project_root | text | oui | Racine active signée |
| ProjectContext | mode | enum(idle,active) | oui | Mode runtime |
| ProjectContext | signature_fingerprint | text | oui | Empreinte de contexte |
| PhaseState | phase_id | text | oui | H01..H23 |
| PhaseState | status | enum | oui | pending|running|done|blocked |
| PhaseState | owner | text | oui | Responsable |
| PhaseState | duration_ms | bigint | non | Durée calculée |
| PhaseTransition | transition_id | uuid | oui | ID transition |
| PhaseTransition | from_phase | text | oui | Phase source |
| PhaseTransition | to_phase | text | oui | Phase cible |
| PhaseTransition | reason | text | oui | Motif + policy ref |
| GateResult | gate_id | text | oui | G1..G5 |
| GateResult | verdict | enum | oui | PASS|CONCERNS|FAIL |
| GateResult | evaluated_at | timestamptz | oui | Horodatage verdict |
| GateResult | policy_version | text | oui | Version règle |
| SubGateResult | subgate_id | text | oui | G4-T/G4-UX |
| SubGateResult | verdict | enum | oui | PASS|CONCERNS|FAIL |
| SubGateResult | blocking_reason | text | non | raison blocage |
| SubGateResult | evidence_count | int | oui | Nb preuves liées |
| HandoffRecord | handoff_id | uuid | oui | ID handoff |
| HandoffRecord | from_agent | text | oui | Agent source |
| HandoffRecord | to_agent | text | oui | Agent cible |
| HandoffRecord | required_output_schema | text | oui | Schéma attendu |
| ArtifactRecord | artifact_id | uuid | oui | ID artefact |
| ArtifactRecord | path | text | oui | Chemin fichier |
| ArtifactRecord | hash_sha256 | text | oui | Intégrité contenu |
| ArtifactRecord | schema_version | text | oui | Version parse |
| ArtifactSection | section_id | uuid | oui | ID section |
| ArtifactSection | artifact_id | uuid | oui | FK artefact |
| ArtifactSection | heading_level | int | oui | Niveau H2/H3 |
| ArtifactSection | heading_text | text | oui | Titre section |
| ArtifactTableIndex | table_id | uuid | oui | ID table |
| ArtifactTableIndex | artifact_id | uuid | oui | FK artefact |
| ArtifactTableIndex | row_count | int | oui | Nombre lignes |
| ArtifactTableIndex | column_count | int | oui | Nombre colonnes |
| DecisionRecord | decision_id | uuid | oui | ID décision |
| DecisionRecord | decision_type | text | oui | gate|phase|risk|architecture |
| DecisionRecord | owner | text | oui | Décideur |
| DecisionRecord | status | enum | oui | draft|validated|revoked |
| EvidenceLink | link_id | uuid | oui | ID lien |
| EvidenceLink | decision_id | uuid | oui | FK décision |
| EvidenceLink | source_ref | text | oui | Référence preuve |
| EvidenceLink | confidence_score | numeric | oui | Confiance 0..1 |
| CommandTemplate | template_id | uuid | oui | ID template |
| CommandTemplate | command_family | text | oui | workflow|gate|ops |
| CommandTemplate | risk_level | enum | oui | low|medium|high |
| CommandTemplate | requires_dual_confirm | bool | oui | double validation |
| CommandExecution | execution_id | uuid | oui | ID exécution |
| CommandExecution | template_id | uuid | oui | FK template |
| CommandExecution | actor_role | text | oui | Rôle initiateur |
| CommandExecution | approved_by | text | non | Approbateur nominatif |
| CommandImpact | impact_id | uuid | oui | ID impact |
| CommandImpact | execution_id | uuid | oui | FK exécution |
| CommandImpact | file_path | text | oui | fichier impacté |
| CommandImpact | change_type | text | oui | create|update|delete |
| RiskItem | risk_id | text | oui | Txx/Pxx/... |
| RiskItem | domain | text | oui | Technique/Process/... |
| RiskItem | score | int | oui | P*I*D |
| RiskItem | owner | text | oui | Responsable |
| MitigationTask | task_id | uuid | oui | ID mitigation |
| MitigationTask | risk_id | text | oui | FK risque |
| MitigationTask | due_date | date | oui | échéance |
| MitigationTask | closure_evidence | text | non | preuve fermeture |
| AQCDSnapshot | snapshot_id | uuid | oui | ID snapshot |
| AQCDSnapshot | period_start | date | oui | début période |
| AQCDSnapshot | autonomy_score | numeric | oui | score A |
| AQCDSnapshot | design_score | numeric | oui | score D |
| ReadinessScore | readiness_id | uuid | oui | ID readiness |
| ReadinessScore | phase_id | text | oui | phase évaluée |
| ReadinessScore | score | numeric | oui | 0..100 |
| ReadinessScore | factor_json | jsonb | oui | facteurs contributifs |
| NotificationEvent | notification_id | uuid | oui | ID notif |
| NotificationEvent | severity | enum | oui | critical/high/medium/low |
| NotificationEvent | channel | text | oui | telegram/email/... |
| NotificationEvent | ack_at | timestamptz | non | date acquittement |
| PolicyVersion | policy_id | uuid | oui | ID policy |
| PolicyVersion | policy_scope | text | oui | gate|command|retention |
| PolicyVersion | version | text | oui | semver |
| PolicyVersion | changed_by | text | oui | acteur modif |
| BundleExport | bundle_id | uuid | oui | ID bundle |
| BundleExport | requested_by | text | oui | demandeur |
| BundleExport | format | enum | oui | md|pdf|json |
| BundleExport | classification | text | oui | public|internal|restricted |
| IntegrationCursor | cursor_id | uuid | oui | ID curseur |
| IntegrationCursor | connector | text | oui | jira|linear|ci|sec |
| IntegrationCursor | cursor_value | text | oui | offset/sync token |
| IntegrationCursor | last_sync_at | timestamptz | oui | dernière sync |
| AuditChain | chain_id | uuid | oui | ID chain |
| AuditChain | prev_hash | text | oui | hash précédent |
| AuditChain | entry_hash | text | oui | hash entrée |
| AuditChain | signature | text | oui | signature entrée |
| UXEvidence | ux_evidence_id | uuid | oui | ID preuve UX |
| UXEvidence | story_id | text | oui | story associée |
| UXEvidence | breakpoint | text | oui | mobile/tablet/desktop |
| UXEvidence | verdict | enum | oui | PASS|CONCERNS|FAIL |
| StoryQualitySnapshot | snapshot_id | uuid | oui | ID snapshot story |
| StoryQualitySnapshot | story_id | text | oui | story |
| StoryQualitySnapshot | tech_score | numeric | oui | score G4-T |
| StoryQualitySnapshot | ux_score | numeric | oui | score G4-UX |
| RunbookRef | runbook_id | uuid | oui | ID runbook |
| RunbookRef | alert_code | text | oui | AL-xx |
| RunbookRef | owner_team | text | oui | équipe |
| RunbookRef | last_drill_at | date | non | dernier test |
| SchemaRegistry | schema_id | uuid | oui | ID schéma |
| SchemaRegistry | subject | text | oui | event/api/handoff |
| SchemaRegistry | version | text | oui | version |
| SchemaRegistry | compatibility | text | oui | backward/forward |
| RetentionPolicy | policy_id | uuid | oui | ID rétention |
| RetentionPolicy | data_class | text | oui | audit/evidence/... |
| RetentionPolicy | retention_days | int | oui | durée conservation |
| RetentionPolicy | purge_mode | text | oui | soft/hard/legal-hold |
| TenantQuota | quota_id | uuid | oui | ID quota |
| TenantQuota | project_id | uuid | oui | FK projet |
| TenantQuota | token_budget_monthly | numeric | oui | budget token |
| TenantQuota | storage_budget_gb | numeric | oui | budget stockage |

### 9.1 Index et contraintes techniques recommandés

| ID | Index/contrainte | Type | Objectif |
|---|---|---|---|
| IDX-01 | ArtifactRecord(path, hash_sha256) | unique | Dédup ingestion |
| IDX-02 | PhaseState(phase_id, status) | btree | Timeline rapide |
| IDX-03 | GateResult(gate_id, evaluated_at desc) | btree | Dernier verdict |
| IDX-04 | SubGateResult(subgate_id, evaluated_at desc) | btree | Lecture dual gate |
| IDX-05 | CommandExecution(actor_role, created_at) | btree | Audit rôle |
| IDX-06 | CommandExecution(idempotency_key) | unique | Anti replay |
| IDX-07 | RiskItem(domain, score desc) | btree | Heatmap risques |
| IDX-08 | MitigationTask(due_date, status) | btree | Suivi échéances |
| IDX-09 | NotificationEvent(severity, ack_at) | btree | SLA notifications |
| IDX-10 | AQCDSnapshot(period_start) | btree | Trend AQCD |
| IDX-11 | ReadinessScore(phase_id, computed_at desc) | btree | Pré-gate score |
| IDX-12 | EvidenceLink(decision_id) | btree | Backlinks décision |
| IDX-13 | ArtifactSection(to_tsvector(heading_text)) | gin | Recherche sections |
| IDX-14 | ArtifactTableIndex(artifact_id) | btree | Recherche tables |
| IDX-15 | IntegrationCursor(connector) | unique | Sync connecteur |
| IDX-16 | AuditChain(entry_hash) | unique | Intégrité append-only |
| IDX-17 | UXEvidence(story_id, verdict) | btree | Evidence G4-UX |
| IDX-18 | StoryQualitySnapshot(story_id, created_at) | btree | Historique qualité story |
| IDX-19 | RetentionPolicy(data_class) | unique | Policy data lifecycle |
| IDX-20 | TenantQuota(project_id) | unique | Budgets FinOps |

## 10. Catalogue des événements (Event Ledger)

Chaque événement est versionné, horodaté, signé et corrélé à un `project_id` et `trace_id` uniques.
Le format d’enveloppe est stable pour permettre replay, audit et génération de projections.

### 10.1 Enveloppe standard d’événement

| Champ | Type | Required | Description |
|---|---|---|---|
| event_id | uuid | oui | Identifiant global unique |
| event_type | text | oui | Type métier (namespace.action) |
| event_version | text | oui | Version schéma événement |
| occurred_at | timestamptz | oui | Horodatage source |
| project_id | uuid | oui | Contexte projet |
| active_project_root | text | oui | Racine signée |
| actor_id | text | oui | Utilisateur/agent initiateur |
| actor_role | text | oui | Rôle RBAC |
| correlation_id | uuid | oui | Chaînage transversal |
| causation_id | uuid | non | Événement parent |
| idempotency_key | text | non | Déduplication |
| payload | jsonb | oui | Données métier |
| classification | text | oui | public/internal/restricted |
| signature | text | oui | Signature intégrité |
| schema_registry_ref | text | oui | Référence schéma validé |

### 10.2 Catalogue détaillé des événements métier

| Event type | Producer | Projection principale | Consommateurs | Rétention |
|---|---|---|---|---|
| phase.H01.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H01.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H01.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H01.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| phase.H02.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H02.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H02.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H02.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| phase.H03.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H03.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H03.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H03.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| phase.H04.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H04.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H04.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H04.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| phase.H05.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H05.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H05.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H05.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| phase.H06.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H06.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H06.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H06.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| phase.H07.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H07.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H07.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H07.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| phase.H08.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H08.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H08.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H08.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| phase.H09.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H09.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H09.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H09.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| phase.H10.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H10.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H10.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H10.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| phase.H11.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H11.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H11.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H11.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| phase.H12.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H12.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H12.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H12.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| phase.H13.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H13.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H13.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H13.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| phase.H14.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H14.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H14.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H14.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| phase.H15.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H15.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H15.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H15.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| phase.H16.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H16.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H16.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H16.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| phase.H17.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H17.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H17.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H17.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| phase.H18.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H18.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H18.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H18.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| phase.H19.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H19.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H19.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H19.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| phase.H20.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H20.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H20.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H20.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| phase.H21.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H21.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H21.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H21.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| phase.H22.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H22.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H22.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H22.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| phase.H23.started | svc-workflow | projection.phase.timeline | workflow,orchestrator | 365j |
| phase.H23.completed | svc-workflow | projection.phase.timeline | workflow,gate-engine | 365j |
| phase.H23.notify.sent | svc-notification | projection.phase.notify | workflow,orchestrator | 180j |
| phase.H23.transition.blocked | svc-workflow | projection.phase.blockers | workflow,pm,architect | 365j |
| gate.g1.evaluation.requested | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g1.evaluated.pass | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g1.evaluated.concerns | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g1.evaluated.fail | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g2.evaluation.requested | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g2.evaluated.pass | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g2.evaluated.concerns | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g2.evaluated.fail | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g3.evaluation.requested | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g3.evaluated.pass | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g3.evaluated.concerns | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g3.evaluated.fail | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g4_t.evaluation.requested | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g4_t.evaluated.pass | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g4_t.evaluated.concerns | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g4_t.evaluated.fail | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g4_ux.evaluation.requested | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g4_ux.evaluated.pass | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g4_ux.evaluated.concerns | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g4_ux.evaluated.fail | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g4.evaluation.requested | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g4.evaluated.pass | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g4.evaluated.concerns | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g4.evaluated.fail | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g5.evaluation.requested | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g5.evaluated.pass | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g5.evaluated.concerns | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| gate.g5.evaluated.fail | svc-gate-engine | projection.gate.status | gate-center,workflow | 365j |
| artifact.ingestion.requested | svc-artifact-ingestor | projection.artifact.explorer | search,evidence,pm | 365j |
| artifact.parsed.success | svc-artifact-ingestor | projection.artifact.explorer | search,evidence,pm | 365j |
| artifact.parsed.failed | svc-artifact-ingestor | projection.artifact.explorer | search,evidence,pm | 365j |
| artifact.metadata.missing | svc-artifact-ingestor | projection.artifact.explorer | search,evidence,pm | 365j |
| artifact.section.indexed | svc-artifact-ingestor | projection.artifact.explorer | search,evidence,pm | 365j |
| artifact.table.indexed | svc-artifact-ingestor | projection.artifact.explorer | search,evidence,pm | 365j |
| artifact.delta.detected | svc-artifact-ingestor | projection.artifact.explorer | search,evidence,pm | 365j |
| artifact.staleness.raised | svc-artifact-ingestor | projection.artifact.explorer | search,evidence,pm | 365j |
| artifact.schema.migrated | svc-artifact-ingestor | projection.artifact.explorer | search,evidence,pm | 365j |
| artifact.diff.generated | svc-artifact-ingestor | projection.artifact.explorer | search,evidence,pm | 365j |
| artifact.evidence.linked | svc-artifact-ingestor | projection.artifact.explorer | search,evidence,pm | 365j |
| artifact.evidence.unlinked | svc-artifact-ingestor | projection.artifact.explorer | search,evidence,pm | 365j |
| command.simulate.requested | svc-command-broker | projection.command.audit | security,workflow,ops | 730j |
| command.simulate.completed | svc-command-broker | projection.command.audit | security,workflow,ops | 730j |
| command.apply.requested | svc-command-broker | projection.command.audit | security,workflow,ops | 730j |
| command.apply.approved | svc-command-broker | projection.command.audit | security,workflow,ops | 730j |
| command.apply.rejected | svc-command-broker | projection.command.audit | security,workflow,ops | 730j |
| command.apply.started | svc-command-broker | projection.command.audit | security,workflow,ops | 730j |
| command.apply.completed | svc-command-broker | projection.command.audit | security,workflow,ops | 730j |
| command.apply.failed | svc-command-broker | projection.command.audit | security,workflow,ops | 730j |
| command.policy.denied | svc-command-broker | projection.command.audit | security,workflow,ops | 730j |
| command.context.mismatch | svc-command-broker | projection.command.audit | security,workflow,ops | 730j |
| command.override.requested | svc-command-broker | projection.command.audit | security,workflow,ops | 730j |
| command.override.approved | svc-command-broker | projection.command.audit | security,workflow,ops | 730j |
| command.override.rejected | svc-command-broker | projection.command.audit | security,workflow,ops | 730j |
| command.killswitch.activated | svc-command-broker | projection.command.audit | security,workflow,ops | 730j |
| command.killswitch.released | svc-command-broker | projection.command.audit | security,workflow,ops | 730j |
| command.audit.appended | svc-command-broker | projection.command.audit | security,workflow,ops | 730j |
| command.secret.redacted | svc-command-broker | projection.command.audit | security,workflow,ops | 730j |
| command.timeout.triggered | svc-command-broker | projection.command.audit | security,workflow,ops | 730j |
| command.retry.scheduled | svc-command-broker | projection.command.audit | security,workflow,ops | 730j |
| command.dlq.queued | svc-command-broker | projection.command.audit | security,workflow,ops | 730j |
| risk.registered | svc-risk/svc-aqcd | projection.risk.aqcd | pm,architect,sponsor | 365j |
| risk.score.updated | svc-risk/svc-aqcd | projection.risk.aqcd | pm,architect,sponsor | 365j |
| risk.owner.changed | svc-risk/svc-aqcd | projection.risk.aqcd | pm,architect,sponsor | 365j |
| risk.mitigation.created | svc-risk/svc-aqcd | projection.risk.aqcd | pm,architect,sponsor | 365j |
| risk.mitigation.completed | svc-risk/svc-aqcd | projection.risk.aqcd | pm,architect,sponsor | 365j |
| risk.heatmap.recomputed | svc-risk/svc-aqcd | projection.risk.aqcd | pm,architect,sponsor | 365j |
| aqcd.snapshot.generated | svc-risk/svc-aqcd | projection.risk.aqcd | pm,architect,sponsor | 365j |
| aqcd.drift.detected | svc-risk/svc-aqcd | projection.risk.aqcd | pm,architect,sponsor | 365j |
| readiness.score.computed | svc-risk/svc-aqcd | projection.risk.aqcd | pm,architect,sponsor | 365j |
| readiness.alert.triggered | svc-risk/svc-aqcd | projection.risk.aqcd | pm,architect,sponsor | 365j |
| retro.action.created | svc-risk/svc-aqcd | projection.risk.aqcd | pm,architect,sponsor | 365j |
| retro.action.closed | svc-risk/svc-aqcd | projection.risk.aqcd | pm,architect,sponsor | 365j |
| cost.budget.threshold.reached | svc-risk/svc-aqcd | projection.risk.aqcd | pm,architect,sponsor | 365j |
| cost.waste.alert.triggered | svc-risk/svc-aqcd | projection.risk.aqcd | pm,architect,sponsor | 365j |
| quality.flakiness.alert.triggered | svc-risk/svc-aqcd | projection.risk.aqcd | pm,architect,sponsor | 365j |
| design.accessibility.blocker.detected | svc-risk/svc-aqcd | projection.risk.aqcd | pm,architect,sponsor | 365j |
| design.responsive.blocker.detected | svc-risk/svc-aqcd | projection.risk.aqcd | pm,architect,sponsor | 365j |
| notification.fatigue.threshold.reached | svc-risk/svc-aqcd | projection.risk.aqcd | pm,architect,sponsor | 365j |
| bundle.export.generated | svc-risk/svc-aqcd | projection.risk.aqcd | pm,architect,sponsor | 365j |
| bundle.export.failed | svc-risk/svc-aqcd | projection.risk.aqcd | pm,architect,sponsor | 365j |
| integration.jira.synced | svc-integration-hub | projection.integration.health | pm,tea,architect | 180j |
| integration.linear.synced | svc-integration-hub | projection.integration.health | pm,tea,architect | 180j |
| integration.notion.synced | svc-integration-hub | projection.integration.health | pm,tea,architect | 180j |
| integration.ci.synced | svc-integration-hub | projection.integration.health | pm,tea,architect | 180j |
| integration.security.synced | svc-integration-hub | projection.integration.health | pm,tea,architect | 180j |
| integration.sync.failed | svc-integration-hub | projection.integration.health | pm,tea,architect | 180j |
| integration.cursor.advanced | svc-integration-hub | projection.integration.health | pm,tea,architect | 180j |
| integration.rate_limited | svc-integration-hub | projection.integration.health | pm,tea,architect | 180j |
| integration.contract.changed | svc-integration-hub | projection.integration.health | pm,tea,architect | 180j |
| integration.contract.break.detected | svc-integration-hub | projection.integration.health | pm,tea,architect | 180j |
| integration.readonly.mode.enabled | svc-integration-hub | projection.integration.health | pm,tea,architect | 180j |
| integration.readonly.mode.disabled | svc-integration-hub | projection.integration.health | pm,tea,architect | 180j |

## 11. Catalogue des projections read-side

Les projections matérialisées sont la clé de la latence <2.5s sur vues critiques.
Elles sont reconstruites depuis le ledger et portent systématiquement un indicateur de fraîcheur.

| Projection | Source events | Refresh target | Audience | Fallback |
|---|---|---|---|---|
| projection.phase.h01.summary | phase.H01.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.phase.h02.summary | phase.H02.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.phase.h03.summary | phase.H03.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.phase.h04.summary | phase.H04.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.phase.h05.summary | phase.H05.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.phase.h06.summary | phase.H06.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.phase.h07.summary | phase.H07.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.phase.h08.summary | phase.H08.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.phase.h09.summary | phase.H09.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.phase.h10.summary | phase.H10.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.phase.h11.summary | phase.H11.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.phase.h12.summary | phase.H12.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.phase.h13.summary | phase.H13.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.phase.h14.summary | phase.H14.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.phase.h15.summary | phase.H15.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.phase.h16.summary | phase.H16.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.phase.h17.summary | phase.H17.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.phase.h18.summary | phase.H18.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.phase.h19.summary | phase.H19.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.phase.h20.summary | phase.H20.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.phase.h21.summary | phase.H21.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.phase.h22.summary | phase.H22.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.phase.h23.summary | phase.H23.* | near-real-time (<5s) | orchestrator/pm | stale flag + replay |
| projection.gate.g1.status | gate.g1.* | near-real-time (<2s) | gate center | fallback last valid |
| projection.gate.g2.status | gate.g2.* | near-real-time (<2s) | gate center | fallback last valid |
| projection.gate.g3.status | gate.g3.* | near-real-time (<2s) | gate center | fallback last valid |
| projection.gate.g4_t.status | gate.g4_t.* | near-real-time (<2s) | gate center | fallback last valid |
| projection.gate.g4_ux.status | gate.g4_ux.* | near-real-time (<2s) | gate center | fallback last valid |
| projection.gate.g4.status | gate.g4.* | near-real-time (<2s) | gate center | fallback last valid |
| projection.gate.g5.status | gate.g5.* | near-real-time (<2s) | gate center | fallback last valid |
| projection.artifact.catalog | artifact.* / evidence.* / design.* | batch 1m + delta | pm/architect/uxqa | reindex + cache |
| projection.artifact.search | artifact.* / evidence.* / design.* | batch 1m + delta | pm/architect/uxqa | reindex + cache |
| projection.artifact.metadata-compliance | artifact.* / evidence.* / design.* | batch 1m + delta | pm/architect/uxqa | reindex + cache |
| projection.artifact.sections | artifact.* / evidence.* / design.* | batch 1m + delta | pm/architect/uxqa | reindex + cache |
| projection.artifact.tables | artifact.* / evidence.* / design.* | batch 1m + delta | pm/architect/uxqa | reindex + cache |
| projection.artifact.diffs | artifact.* / evidence.* / design.* | batch 1m + delta | pm/architect/uxqa | reindex + cache |
| projection.evidence.graph | artifact.* / evidence.* / design.* | batch 1m + delta | pm/architect/uxqa | reindex + cache |
| projection.evidence.by-decision | artifact.* / evidence.* / design.* | batch 1m + delta | pm/architect/uxqa | reindex + cache |
| projection.evidence.orphans | artifact.* / evidence.* / design.* | batch 1m + delta | pm/architect/uxqa | reindex + cache |
| projection.evidence.by-gate | artifact.* / evidence.* / design.* | batch 1m + delta | pm/architect/uxqa | reindex + cache |
| projection.staleness.board | artifact.* / evidence.* / design.* | batch 1m + delta | pm/architect/uxqa | reindex + cache |
| projection.parse-errors.dashboard | artifact.* / evidence.* / design.* | batch 1m + delta | pm/architect/uxqa | reindex + cache |
| projection.ux.evidence.by-story | artifact.* / evidence.* / design.* | batch 1m + delta | pm/architect/uxqa | reindex + cache |
| projection.ux.evidence.by-breakpoint | artifact.* / evidence.* / design.* | batch 1m + delta | pm/architect/uxqa | reindex + cache |
| projection.ux.debt.lane | artifact.* / evidence.* / design.* | batch 1m + delta | pm/architect/uxqa | reindex + cache |
| projection.command.audit | command.* | near-real-time (<3s) | security/ops | read replica |
| projection.command.denials | command.* | near-real-time (<3s) | security/ops | read replica |
| projection.command.context-errors | command.* | near-real-time (<3s) | security/ops | read replica |
| projection.command.override-log | command.* | near-real-time (<3s) | security/ops | read replica |
| projection.command.killswitch-state | command.* | near-real-time (<3s) | security/ops | read replica |
| projection.command.success-rate | command.* | near-real-time (<3s) | security/ops | read replica |
| projection.command.pending-approvals | command.* | near-real-time (<3s) | security/ops | read replica |
| projection.command.dlq | command.* | near-real-time (<3s) | security/ops | read replica |
| projection.command.impact-files | command.* | near-real-time (<3s) | security/ops | read replica |
| projection.command.security-findings | command.* | near-real-time (<3s) | security/ops | read replica |
| projection.command.by-role | command.* | near-real-time (<3s) | security/ops | read replica |
| projection.command.by-project | command.* | near-real-time (<3s) | security/ops | read replica |
| projection.command.dryrun-ratio | command.* | near-real-time (<3s) | security/ops | read replica |
| projection.command.timeout-ratio | command.* | near-real-time (<3s) | security/ops | read replica |
| projection.command.retry-trends | command.* | near-real-time (<3s) | security/ops | read replica |
| projection.risk.register | risk.* / aqcd.* / notification.* / cost.* | batch 1m-5m | pm/sponsor/ops | recompute job |
| projection.risk.heatmap | risk.* / aqcd.* / notification.* / cost.* | batch 1m-5m | pm/sponsor/ops | recompute job |
| projection.risk.overdue-mitigations | risk.* / aqcd.* / notification.* / cost.* | batch 1m-5m | pm/sponsor/ops | recompute job |
| projection.risk.by-domain | risk.* / aqcd.* / notification.* / cost.* | batch 1m-5m | pm/sponsor/ops | recompute job |
| projection.risk.by-owner | risk.* / aqcd.* / notification.* / cost.* | batch 1m-5m | pm/sponsor/ops | recompute job |
| projection.aqcd.latest | risk.* / aqcd.* / notification.* / cost.* | batch 1m-5m | pm/sponsor/ops | recompute job |
| projection.aqcd.trend-weekly | risk.* / aqcd.* / notification.* / cost.* | batch 1m-5m | pm/sponsor/ops | recompute job |
| projection.aqcd.trend-monthly | risk.* / aqcd.* / notification.* / cost.* | batch 1m-5m | pm/sponsor/ops | recompute job |
| projection.readiness.current | risk.* / aqcd.* / notification.* / cost.* | batch 1m-5m | pm/sponsor/ops | recompute job |
| projection.readiness.factor-breakdown | risk.* / aqcd.* / notification.* / cost.* | batch 1m-5m | pm/sponsor/ops | recompute job |
| projection.notifications.sla | risk.* / aqcd.* / notification.* / cost.* | batch 1m-5m | pm/sponsor/ops | recompute job |
| projection.notifications.fatigue | risk.* / aqcd.* / notification.* / cost.* | batch 1m-5m | pm/sponsor/ops | recompute job |
| projection.cost.budget-consumption | risk.* / aqcd.* / notification.* / cost.* | batch 1m-5m | pm/sponsor/ops | recompute job |
| projection.cost.waste-ratio | risk.* / aqcd.* / notification.* / cost.* | batch 1m-5m | pm/sponsor/ops | recompute job |
| projection.bundle.export-health | risk.* / aqcd.* / notification.* / cost.* | batch 1m-5m | pm/sponsor/ops | recompute job |
| projection.incident.mtta | risk.* / aqcd.* / notification.* / cost.* | batch 1m-5m | pm/sponsor/ops | recompute job |
| projection.incident.mttx | risk.* / aqcd.* / notification.* / cost.* | batch 1m-5m | pm/sponsor/ops | recompute job |
| projection.retro.action-status | risk.* / aqcd.* / notification.* / cost.* | batch 1m-5m | pm/sponsor/ops | recompute job |
| projection.quality.g4-ux-blockers | risk.* / aqcd.* / notification.* / cost.* | batch 1m-5m | pm/sponsor/ops | recompute job |
| projection.quality.g4-t-blockers | risk.* / aqcd.* / notification.* / cost.* | batch 1m-5m | pm/sponsor/ops | recompute job |
| projection.integration.sync-health | integration.* | batch 2m | architect/tea/pm | connector retry |
| projection.integration.contract-breaks | integration.* | batch 2m | architect/tea/pm | connector retry |
| projection.integration.backlog | integration.* | batch 2m | architect/tea/pm | connector retry |
| projection.integration.data-freshness | integration.* | batch 2m | architect/tea/pm | connector retry |
| projection.integration.auth-errors | integration.* | batch 2m | architect/tea/pm | connector retry |
| projection.integration.rate-limit-usage | integration.* | batch 2m | architect/tea/pm | connector retry |
| projection.integration.source-coverage | integration.* | batch 2m | architect/tea/pm | connector retry |
| projection.integration.mapping-errors | integration.* | batch 2m | architect/tea/pm | connector retry |
| projection.integration.readiness | integration.* | batch 2m | architect/tea/pm | connector retry |

## 12. Machine d’état BMAD H01→H23 et Gate Engine policy-as-code

La machine d’état implémente strictement l’ordre canonique BMAD. Aucun saut n’est permis sans override tracé.

| Phase | Transition autorisée | Gate | Précondition minimale | Règle |
|---|---|---|---|---|
| H01 | H02 | G1 | metadata+input docs valides | policy allow + evidence required |
| H02 | H03 | G1 | metadata+input docs valides | policy allow + evidence required |
| H03 | H04 | G1 | metadata+input docs valides | policy allow + evidence required |
| H04 | H05 | G2 | metadata+input docs valides | policy allow + evidence required |
| H05 | H06 | G2 | metadata+input docs valides | policy allow + evidence required |
| H06 | H07 | G2 | metadata+input docs valides | policy allow + evidence required |
| H07 | H08 | G2 | metadata+input docs valides | policy allow + evidence required |
| H08 | H09 | G3 | metadata+input docs valides | policy allow + evidence required |
| H09 | H10 | G3 | metadata+input docs valides | policy allow + evidence required |
| H10 | H11 | G3 | metadata+input docs valides | policy allow + evidence required |
| H11 | H12 | G4 | story/epic evidence validée | policy allow + evidence required |
| H12 | H13 | G4 | story/epic evidence validée | policy allow + evidence required |
| H13 | H14 | G4 | story/epic evidence validée | policy allow + evidence required |
| H14 | H15 | G4 | story/epic evidence validée | policy allow + evidence required |
| H15 | H16 | G4 | story/epic evidence validée | policy allow + evidence required |
| H16 | H17 | G4 | story/epic evidence validée | policy allow + evidence required |
| H17 | H18 | G4 | story/epic evidence validée | policy allow + evidence required |
| H18 | H19 | G4 | story/epic evidence validée | policy allow + evidence required |
| H19 | H20 | G4 | story/epic evidence validée | policy allow + evidence required |
| H20 | H21 | G5 | story/epic evidence validée | policy allow + evidence required |
| H21 | H22 | G5 | story/epic evidence validée | policy allow + evidence required |
| H22 | H23 | G5 | story/epic evidence validée | policy allow + evidence required |
| H23 | END | G5 | story/epic evidence validée | policy allow + evidence required |

### 12.1 Règles de gate codifiées

| ID règle | Scope | Condition | Action en non-conformité |
|---|---|---|---|
| RULE-G1-01 | G1 | Hypothèses testables + sources présentes | FAIL si source manquante sur risque critique |
| RULE-G2-01 | G2 | PRD + UX complets et traçables | FAIL si FR/NFR/AC non testables |
| RULE-G2-02 | G2 | metadata stepsCompleted/inputDocuments présentes | CONCERNS->FAIL après SLA correction |
| RULE-G3-01 | G3 | Architecture cohérente avec PRD/UX/risques | FAIL si risque critique non mitigeable |
| RULE-G4-01 | G4 | G4-T PASS ET G4-UX PASS | DONE interdit sinon |
| RULE-G4-02 | G4-UX | A11y >=85 et 0 blocker | FAIL immédiat en cas blocker |
| RULE-G4-03 | G4-UX | 4 états UI sur vues critiques | CONCERNS/FAIL si état absent |
| RULE-G5-01 | G5 | Rétro fermée + actions H21/H22 tracées | FAIL si actions critiques sans owner/due |
| RULE-CMD-01 | Command | simulate requis avant apply write | deny apply direct |
| RULE-CMD-02 | Command | active_project_root signé et validé | deny context mismatch |
| RULE-CMD-03 | Command | RBAC + allowlist + dual confirm high risk | deny + audit append-only |
| RULE-DATA-01 | Data | event schema compatible | reject event incompatible + DLQ |
| RULE-OBS-01 | Ops | alerte critique ack <10min | escalade auto sinon |
| RULE-RET-01 | Compliance | rétention/purge par classe data | block export hors policy |

## 13. Architecture Command Broker Zero-Trust (sécurité opérationnelle)

Le broker sépare strictement: intention -> simulation -> approbation -> exécution -> audit -> rollback.
Cette séparation adresse directement S01/S02/S03/S05/P07 et réduit les erreurs humaines en terminal.

### 13.1 Flux de commande sécurisé

| Étape | Action | Contrôle principal | Événement |
|---|---|---|---|
| STEP-01 | Capture intention | Template command sélectionné (allowlist) | command.template.selected |
| STEP-02 | Validation contexte | active_project_root signé + project_id | command.context.validated |
| STEP-03 | Contrôle RBAC | policy decision allow/deny | command.policy.checked |
| STEP-04 | Simulation dry-run | impact fichiers + risques | command.simulate.completed |
| STEP-05 | Approbation | double confirmation si high risk | command.apply.approved |
| STEP-06 | Exécution isolée | runner sandbox + timeout | command.apply.started/completed |
| STEP-07 | Audit append-only | hash chain + signature | command.audit.appended |
| STEP-08 | Projection & notification | mise à jour UI et alerts | command.projection.updated |
| STEP-09 | Rollback readiness | plan revert pré-calculé | command.rollback.plan.ready |

### 13.2 Matrice menaces -> contrôles -> preuves

| Risque | Scénario | Contrôle architectural | Preuve attendue |
|---|---|---|---|
| S01 | Commande destructive mauvais projet | Root signé + context confirm + dual confirm | 0 incident cross-project write |
| S02 | Injection argument shell | Arguments structurés + templates non concaténés | tests injection 100% pass |
| S03 | RBAC trop permissif | Least privilege + revue hebdo + SoD | 0 action critique hors rôle |
| S04 | Audit log altérable | Ledger append-only signé + vérification quotidienne | integrity checks green |
| S05 | Secrets dans logs | Redaction + scanners secrets post-run | 0 secret persistant |
| S06 | Exfiltration via export | Classification + filtrage rôle + watermark | 100% exports validés |
| S07 | Non-révocation accès | JML automatisé + revocation <24h | audit IAM mensuel OK |
| S08 | Non-conformité rétention | Retention policy engine + legal hold | rapport conformité mensuel |

### 13.3 Catalogue de templates de commandes V1

| Template ID | Commande | Famille | Risque | Précondition | Rôles autorisés |
|---|---|---|---|---|---|
| CMD-001 | openclaw gateway status | read | low | simulate obligatoire si write | Orchestrateur/PM/Architecte/TEA/UX QA/Security |
| CMD-002 | openclaw gateway start | write | high | simulate obligatoire si write | Orchestrateur/Security |
| CMD-003 | openclaw gateway stop | write | high | simulate obligatoire si write | Orchestrateur/Security |
| CMD-004 | openclaw gateway restart | write | high | simulate obligatoire si write | Orchestrateur/Security |
| CMD-005 | bash scripts/runtime-healthcheck.sh | read | low | simulate obligatoire si write | Orchestrateur/PM/TEA |
| CMD-006 | bash scripts/progress.sh | read | low | simulate obligatoire si write | Orchestrateur/PM/SM |
| CMD-007 | bash scripts/new-phase-trace.sh <args> | write-audit | medium | simulate obligatoire si write | Orchestrateur/PM/SM |
| CMD-008 | bash scripts/phase13-sequence-guard.sh <phase> | quality | medium | simulate obligatoire si write | PM/TEA/Orchestrateur |
| CMD-009 | bash scripts/phase13-ultra-quality-check.sh <phase> | quality | medium | simulate obligatoire si write | PM/TEA/Orchestrateur |
| CMD-010 | bash scripts/phase-complete.sh <phase> | state-change | high | simulate obligatoire si write | Orchestrateur |
| CMD-011 | bash scripts/phase-notify.sh <phase> <msg> | state-change | medium | simulate obligatoire si write | Orchestrateur/PM/SM |
| CMD-012 | bash scripts/run-quality-gates.sh | quality | medium | simulate obligatoire si write | TEA/Orchestrateur |
| CMD-013 | bash scripts/run-ux-gates.sh <sid> | quality | medium | simulate obligatoire si write | UX QA/TEA |
| CMD-014 | bash scripts/run-story-gates.sh <sid> | quality | medium | simulate obligatoire si write | TEA/Orchestrateur |
| CMD-015 | bash scripts/story-done-guard.sh <sid> | quality | medium | simulate obligatoire si write | TEA/Orchestrateur |
| CMD-016 | connector.sync.jira | integration | medium | simulate + dual confirm si high | Orchestrateur/Architecte/TEA |
| CMD-017 | connector.sync.linear | integration | medium | simulate + dual confirm si high | Orchestrateur/Architecte/TEA |
| CMD-018 | connector.sync.notion | integration | medium | simulate + dual confirm si high | Orchestrateur/Architecte/TEA |
| CMD-019 | connector.sync.ci | integration | medium | simulate + dual confirm si high | Orchestrateur/Architecte/TEA |
| CMD-020 | connector.sync.security | integration | high | simulate + dual confirm si high | Orchestrateur/Security |
| CMD-021 | bundle.export.md | export | medium | simulate + dual confirm si high | Orchestrateur/Architecte/TEA |
| CMD-022 | bundle.export.pdf | export | medium | simulate + dual confirm si high | Orchestrateur/Architecte/TEA |
| CMD-023 | bundle.export.json | export | medium | simulate + dual confirm si high | Orchestrateur/Architecte/TEA |
| CMD-024 | retention.dryrun | compliance | low | simulate + dual confirm si high | Orchestrateur/Architecte/TEA |
| CMD-025 | retention.apply | compliance | high | simulate + dual confirm si high | Orchestrateur/Security |
| CMD-026 | policy.preview | governance | low | simulate + dual confirm si high | Orchestrateur/Architecte/TEA |
| CMD-027 | policy.publish | governance | high | simulate + dual confirm si high | Orchestrateur/Security |
| CMD-028 | readiness.recompute | analytics | low | simulate + dual confirm si high | Orchestrateur/Architecte/TEA |
| CMD-029 | aqcd.recompute | analytics | low | simulate + dual confirm si high | Orchestrateur/Architecte/TEA |
| CMD-030 | projection.rebuild | ops | medium | simulate + dual confirm si high | Orchestrateur/Architecte/TEA |
| CMD-031 | projection.rebuild.full | ops | high | simulate + dual confirm si high | Orchestrateur/Security |
| CMD-032 | incident.killswitch.on | ops | high | simulate + dual confirm si high | Orchestrateur/Security |
| CMD-033 | incident.killswitch.off | ops | high | simulate + dual confirm si high | Orchestrateur/Security |
| CMD-034 | backup.snapshot.create | backup | medium | simulate + dual confirm si high | Orchestrateur/Architecte/TEA |
| CMD-035 | backup.restore.preview | backup | medium | simulate + dual confirm si high | Orchestrateur/Architecte/TEA |
| CMD-036 | backup.restore.apply | backup | high | simulate + dual confirm si high | Orchestrateur/Security |
| CMD-037 | schema.migrate.preview | schema | medium | simulate + dual confirm si high | Orchestrateur/Architecte/TEA |
| CMD-038 | schema.migrate.apply | schema | high | simulate + dual confirm si high | Orchestrateur/Security |
| CMD-039 | audit.verify.chain | audit | medium | simulate + dual confirm si high | Orchestrateur/Architecte/TEA |
| CMD-040 | audit.repair.pointer | audit | high | simulate + dual confirm si high | Orchestrateur/Security |
| CMD-041 | tenant.quota.update | finops | medium | simulate + dual confirm si high | Orchestrateur/Architecte/TEA |
| CMD-042 | tenant.quota.enforce | finops | high | simulate + dual confirm si high | Orchestrateur/Security |
| CMD-043 | notification.replay | notification | medium | simulate + dual confirm si high | Orchestrateur/Architecte/TEA |
| CMD-044 | notification.throttle.update | notification | medium | simulate + dual confirm si high | Orchestrateur/Architecte/TEA |
| CMD-045 | notification.escalation.test | notification | low | simulate + dual confirm si high | Orchestrateur/Architecte/TEA |

## 14. Architecture API (REST + stream événements + export)

Les API sont versionnées (`/api/v1`) et séparées en domaines cohérents pour limiter le couplage.
Chaque endpoint est défini avec stratégie idempotence, scope RBAC et contrat d’erreur normalisé.

| Domaine | Method | Endpoint | Usage | RBAC scope | Idempotence |
|---|---|---|---|---|---|
| workflow | GET | /api/v1/workflow/phases | Lister phases H01→H23 | all-read | n/a |
| workflow | GET | /api/v1/workflow/phases/{phaseId} | Détail phase + blockers | all-read | n/a |
| workflow | POST | /api/v1/workflow/phases/{phaseId}/start | Démarrer phase | orchestrator | idempotency-key |
| workflow | POST | /api/v1/workflow/phases/{phaseId}/complete | Clôturer phase | orchestrator | idempotency-key |
| workflow | POST | /api/v1/workflow/phases/{phaseId}/notify | Notifier phase | orchestrator/pm/sm | idempotency-key |
| workflow | POST | /api/v1/workflow/transitions/validate | Simuler transition | pm/architect/orchestrator | idempotency-key |
| workflow | GET | /api/v1/workflow/timeline | Timeline inter-phases | all-read | n/a |
| workflow | GET | /api/v1/workflow/handoffs | Liste handoffs | all-read | n/a |
| workflow | POST | /api/v1/workflow/handoffs | Créer handoff contractuel | pm/orchestrator | idempotency-key |
| workflow | GET | /api/v1/workflow/policies | Règles workflow actives | all-read | n/a |
| gate | POST | /api/v1/gates/{gateId}/evaluate | Action gate: evaluate | tea/uxqa/orchestrator | idempotency-key |
| gate | POST | /api/v1/gates/{gateId}/simulate | Action gate: simulate | tea/uxqa/orchestrator | idempotency-key |
| gate | POST | /api/v1/gates/{gateId}/override-request | Action gate: override-request | tea/uxqa/orchestrator | idempotency-key |
| gate | POST | /api/v1/gates/{gateId}/override-approve | Action gate: override-approve | tea/uxqa/orchestrator | idempotency-key |
| gate | POST | /api/v1/gates/{gateId}/override-reject | Action gate: override-reject | tea/uxqa/orchestrator | idempotency-key |
| gate | GET | /api/v1/gates | Consultation gate | all-read | n/a |
| gate | GET | /api/v1/gates/{gateId} | Consultation gate | all-read | n/a |
| gate | GET | /api/v1/gates/{gateId}/history | Consultation gate | all-read | n/a |
| gate | GET | /api/v1/gates/{gateId}/evidence | Consultation gate | all-read | n/a |
| gate | GET | /api/v1/gates/{gateId}/actions | Consultation gate | all-read | n/a |
| gate | POST | /api/v1/gates/g4/sync-subgates | Synchroniser G4-T/G4-UX | tea/uxqa | idempotency-key |
| gate | GET | /api/v1/gates/g4/compatibility-matrix | Lire matrice dual gate | all-read | n/a |
| artifact-evidence | GET | /api/v1/artifacts | Lister artefacts indexés | pm/architect/tea/uxqa/orchestrator | n/a |
| artifact-evidence | GET | /api/v1/artifacts/{artifactId} | Détail artefact | pm/architect/tea/uxqa/orchestrator | n/a |
| artifact-evidence | GET | /api/v1/artifacts/{artifactId}/sections | Sections H2/H3 | pm/architect/tea/uxqa/orchestrator | n/a |
| artifact-evidence | GET | /api/v1/artifacts/{artifactId}/tables | Tables indexées | pm/architect/tea/uxqa/orchestrator | n/a |
| artifact-evidence | GET | /api/v1/artifacts/search | Recherche full-text filtrée | pm/architect/tea/uxqa/orchestrator | n/a |
| artifact-evidence | GET | /api/v1/artifacts/{artifactId}/diff/{otherId} | Diff structuré | pm/architect/tea/uxqa/orchestrator | n/a |
| artifact-evidence | POST | /api/v1/artifacts/reindex | Reindex artefact ciblé | pm/architect/tea/uxqa/orchestrator | idempotency-key |
| artifact-evidence | POST | /api/v1/artifacts/validate-metadata | Valider metadata ULTRA | pm/architect/tea/uxqa/orchestrator | idempotency-key |
| artifact-evidence | GET | /api/v1/evidence/graph | Graph décision/proof | pm/architect/tea/uxqa/orchestrator | n/a |
| artifact-evidence | GET | /api/v1/evidence/decisions/{decisionId} | Preuves d’une décision | pm/architect/tea/uxqa/orchestrator | n/a |
| artifact-evidence | POST | /api/v1/evidence/links | Créer lien preuve | pm/architect/tea/uxqa/orchestrator | idempotency-key |
| artifact-evidence | DELETE | /api/v1/evidence/links/{linkId} | Supprimer lien preuve | pm/architect/tea/uxqa/orchestrator | idempotency-key |
| artifact-evidence | GET | /api/v1/evidence/orphans | Lister décisions orphelines | pm/architect/tea/uxqa/orchestrator | n/a |
| command | GET | /api/v1/commands/templates | Lister templates allowlist | roles command-enabled | n/a |
| command | POST | /api/v1/commands/simulate | Simuler commande | roles command-enabled | idempotency-key |
| command | POST | /api/v1/commands/apply | Exécuter commande approuvée | roles command-enabled | idempotency-key |
| command | POST | /api/v1/commands/approve | Approuver commande | roles command-enabled | idempotency-key |
| command | POST | /api/v1/commands/reject | Refuser commande | roles command-enabled | idempotency-key |
| command | POST | /api/v1/commands/killswitch/activate | Activer kill-switch | orchestrator/security/tea | idempotency-key |
| command | POST | /api/v1/commands/killswitch/release | Relâcher kill-switch | orchestrator/security/tea | idempotency-key |
| command | GET | /api/v1/commands/executions | Historique exécutions | roles command-enabled | n/a |
| command | GET | /api/v1/commands/executions/{executionId} | Détail exécution | roles command-enabled | n/a |
| command | GET | /api/v1/commands/executions/{executionId}/impact | Impact fichiers | roles command-enabled | n/a |
| command | GET | /api/v1/commands/overrides | Historique overrides | orchestrator/security/tea | n/a |
| command | POST | /api/v1/commands/overrides/request | Demander override | orchestrator/security/tea | idempotency-key |
| command | POST | /api/v1/commands/overrides/approve | Approuver override | orchestrator/security/tea | idempotency-key |
| command | POST | /api/v1/commands/overrides/reject | Refuser override | orchestrator/security/tea | idempotency-key |
| command | GET | /api/v1/commands/security/findings | Findings sécurité commandes | roles command-enabled | n/a |
| risk-aqcd | GET | /api/v1/risks | Lister registre risques | pm/architect/orchestrator/sponsor | n/a |
| risk-aqcd | POST | /api/v1/risks | Créer risque | pm/architect/orchestrator/sponsor | idempotency-key |
| risk-aqcd | PATCH | /api/v1/risks/{riskId} | Mettre à jour risque | pm/architect/orchestrator/sponsor | idempotency-key |
| risk-aqcd | GET | /api/v1/risks/heatmap | Heatmap risques | pm/architect/orchestrator/sponsor | n/a |
| risk-aqcd | POST | /api/v1/risks/{riskId}/mitigations | Créer mitigation | pm/architect/orchestrator/sponsor | idempotency-key |
| risk-aqcd | PATCH | /api/v1/mitigations/{taskId} | Mettre à jour mitigation | pm/architect/orchestrator/sponsor | idempotency-key |
| risk-aqcd | GET | /api/v1/mitigations/overdue | Mitigations en retard | pm/architect/orchestrator/sponsor | n/a |
| risk-aqcd | GET | /api/v1/aqcd/latest | Snapshot AQCD courant | pm/architect/orchestrator/sponsor | n/a |
| risk-aqcd | GET | /api/v1/aqcd/trends | Tendances AQCD | pm/architect/orchestrator/sponsor | n/a |
| risk-aqcd | POST | /api/v1/aqcd/recompute | Recalcul AQCD | pm/architect/orchestrator/sponsor | idempotency-key |
| risk-aqcd | GET | /api/v1/readiness/{phaseId} | Readiness phase | pm/architect/orchestrator/sponsor | n/a |
| risk-aqcd | POST | /api/v1/readiness/recompute | Recalcul readiness | pm/architect/orchestrator/sponsor | idempotency-key |
| risk-aqcd | GET | /api/v1/cost/budgets | Budgets FinOps | pm/architect/orchestrator/sponsor | n/a |
| risk-aqcd | GET | /api/v1/cost/waste | Waste ratio | pm/architect/orchestrator/sponsor | n/a |
| risk-aqcd | GET | /api/v1/cost/decision-unit | Coût par décision | pm/architect/orchestrator/sponsor | n/a |
| notification | GET | /api/v1/notifications | Lister notifications | orchestrator/pm/uxlead/security | n/a |
| notification | POST | /api/v1/notifications/ack | Acquitter notification | orchestrator/pm/uxlead/security | idempotency-key |
| notification | POST | /api/v1/notifications/escalate | Escalader notification | orchestrator/pm/uxlead/security | idempotency-key |
| notification | POST | /api/v1/notifications/throttle | Mettre à jour throttle | orchestrator/pm/uxlead/security | idempotency-key |
| notification | GET | /api/v1/notifications/policies | Lire policy notifications | orchestrator/pm/uxlead/security | n/a |
| notification | POST | /api/v1/notifications/policies | Publier policy notifications | orchestrator/pm/uxlead/security | idempotency-key |
| notification | GET | /api/v1/notifications/fatigue-index | Lire index fatigue | orchestrator/pm/uxlead/security | n/a |
| notification | GET | /api/v1/notifications/sla | Lire SLA notifications | orchestrator/pm/uxlead/security | n/a |
| notification | POST | /api/v1/notifications/replay | Rejouer notifications | orchestrator/pm/uxlead/security | idempotency-key |
| notification | GET | /api/v1/notifications/channels | Lister canaux actifs | orchestrator/pm/uxlead/security | n/a |
| integration | GET | /api/v1/integrations/jira/status | Statut connecteur jira | architect/tea/pm | n/a |
| integration | POST | /api/v1/integrations/jira/sync | Sync connecteur jira | architect/tea/pm | idempotency-key |
| integration | GET | /api/v1/integrations/jira/cursor | Curseur jira | architect/tea | n/a |
| integration | POST | /api/v1/integrations/jira/cursor/reset | Reset curseur jira | architect/security | idempotency-key |
| integration | GET | /api/v1/integrations/linear/status | Statut connecteur linear | architect/tea/pm | n/a |
| integration | POST | /api/v1/integrations/linear/sync | Sync connecteur linear | architect/tea/pm | idempotency-key |
| integration | GET | /api/v1/integrations/linear/cursor | Curseur linear | architect/tea | n/a |
| integration | POST | /api/v1/integrations/linear/cursor/reset | Reset curseur linear | architect/security | idempotency-key |
| integration | GET | /api/v1/integrations/notion/status | Statut connecteur notion | architect/tea/pm | n/a |
| integration | POST | /api/v1/integrations/notion/sync | Sync connecteur notion | architect/tea/pm | idempotency-key |
| integration | GET | /api/v1/integrations/notion/cursor | Curseur notion | architect/tea | n/a |
| integration | POST | /api/v1/integrations/notion/cursor/reset | Reset curseur notion | architect/security | idempotency-key |
| integration | GET | /api/v1/integrations/ci/status | Statut connecteur ci | architect/tea/pm | n/a |
| integration | POST | /api/v1/integrations/ci/sync | Sync connecteur ci | architect/tea/pm | idempotency-key |
| integration | GET | /api/v1/integrations/ci/cursor | Curseur ci | architect/tea | n/a |
| integration | POST | /api/v1/integrations/ci/cursor/reset | Reset curseur ci | architect/security | idempotency-key |
| integration | GET | /api/v1/integrations/security/status | Statut connecteur security | architect/tea/pm | n/a |
| integration | POST | /api/v1/integrations/security/sync | Sync connecteur security | architect/tea/pm | idempotency-key |
| integration | GET | /api/v1/integrations/security/cursor | Curseur security | architect/tea | n/a |
| integration | POST | /api/v1/integrations/security/cursor/reset | Reset curseur security | architect/security | idempotency-key |
| integration | GET | /api/v1/integrations/contracts | Lister contrats connecteurs | architect/tea | n/a |
| integration | POST | /api/v1/integrations/contracts/validate | Valider compatibilité contrats | architect/tea | idempotency-key |
| integration | GET | /api/v1/integrations/readiness | Readiness intégrations | architect/pm | n/a |
| admin-security | GET | /api/v1/admin/policies | Lire policies actives | security/admin/orchestrator | n/a |
| admin-security | POST | /api/v1/admin/policies/publish | Publier nouvelle policy | security/admin/orchestrator | idempotency-key |
| admin-security | GET | /api/v1/admin/policies/diff | Comparer versions policy | security/admin/orchestrator | n/a |
| admin-security | GET | /api/v1/admin/rbac/matrix | Lire matrice RBAC | security/admin/orchestrator | n/a |
| admin-security | POST | /api/v1/admin/rbac/review | Lancer revue RBAC | security/admin/orchestrator | idempotency-key |
| admin-security | POST | /api/v1/admin/context/switch | Changer projet actif | security/admin/orchestrator | idempotency-key |
| admin-security | GET | /api/v1/admin/context/current | Lire contexte actif | security/admin/orchestrator | n/a |
| admin-security | POST | /api/v1/exports/bundle | Générer bundle export | security/admin/orchestrator | idempotency-key |
| admin-security | GET | /api/v1/exports/{bundleId} | Lire statut export | security/admin/orchestrator | n/a |
| admin-security | GET | /api/v1/exports/{bundleId}/download | Télécharger bundle | security/admin/orchestrator | n/a |
| admin-security | POST | /api/v1/compliance/retention/preview | Prévisualiser purge | security/admin/orchestrator | idempotency-key |
| admin-security | POST | /api/v1/compliance/retention/apply | Appliquer purge | security/admin/orchestrator | idempotency-key |
| admin-security | GET | /api/v1/compliance/retention/policies | Lire policies rétention | security/admin/orchestrator | n/a |
| admin-security | GET | /api/v1/audit/chain/verify | Vérifier chaîne audit | security/admin/orchestrator | n/a |
| admin-security | GET | /api/v1/health/readiness | Readiness technique | security/admin/orchestrator | n/a |
| admin-security | GET | /api/v1/health/liveness | Liveness technique | security/admin/orchestrator | n/a |

## 15. Architecture des intégrations externes et stratégie read-first

Le principe V1 est read-first pour minimiser les risques de corruption inter-outils.
Les write-backs sont différés et strictement encadrés après maturité de la couche de contrôle.

| Connecteur | Données importées | Mode sync | Stratégie accès | Contrat |
|---|---|---|---|---|
| Jira | issues, statuses, assignees, links | polling + webhook hybride | read-first | INT-JIRA-01..04 |
| Linear | issues, cycles, states | polling API | read-first | INT-LIN-01..03 |
| Notion | pages référencées preuves | scheduled crawl | read-first | INT-NOT-01..02 |
| CI (GitHub/GitLab) | tests, coverage, build, flaky | webhook event | read-first | INT-CI-01..05 |
| Security scanners | vuln findings CVE/severity | batch import + webhook | read-first | INT-SEC-01..04 |
| Identity provider | users, roles, revocations | SCIM + OIDC | read/write IAM only | INT-IDP-01..04 |
| Object storage | captures UX, bundles export | signed URL | read/write scoped | INT-OBJ-01..03 |

### 15.1 Contrats de compatibilité connecteurs

| ID | Règle | Bénéfice |
|---|---|---|
| CONN-01 | Version API externe figée par minor | Aucun breaking change silencieux |
| CONN-02 | Mapping champs versionné | Régression détectable et rollbackable |
| CONN-03 | SLA sync explicite | Fraîcheur lisible dans UI |
| CONN-04 | Retries bornés + DLQ | Pas de blocage global ingestion |
| CONN-05 | Scopes OAuth minimaux | Principe least privilege |
| CONN-06 | Masking données sensibles importées | Conformité sécurité |
| CONN-07 | Monitoring contract-break | Alerte proactive avant dérive |
| CONN-08 | Mode degraded read-only | Continuité de lecture sans write-back |

## 16. Architecture UX technique (states, a11y, responsive, preuves G4-UX)

Cette section traduit les contraintes H06-UXC en contrats techniques implémentables.
| ID H06 | Contrainte UX | Implémentation architecture | Preuve test |
|---|---|---|---|
| H06-UXC-01 | Dual gate visible et bloquant | API subgates + composant GateComposite | E2E G4 PASS/FAIL matrix |
| H06-UXC-02 | Write sécurisé non contournable | simulate/apply endpoints + context signer | E2E abuse + audit |
| H06-UXC-03 | 4 états UI sur widgets critiques | state contract backend + component kit | tests visuels + snapshots |
| H06-UXC-04 | A11y bloquante | lint a11y CI + semantic components | axe/lighthouse + revue manuelle |
| H06-UXC-05 | Responsive sans perte décisionnelle | breakpoint contracts + content priority | tests 360/768/1366/1920 |
| H06-UXC-06 | Décision avec preuve + owner | decision schema required fields | 0 décision orpheline |
| H06-UXC-07 | Microcopy normalisée | error code -> copy catalog versionné | test compréhension >85% |
| H06-UXC-08 | Notifications anti-fatigue | throttle policy + dedup + escalation | fatigue index <15% |
| H06-UXC-09 | Design tokens normatifs | token pipeline + rogue style lint | 0 rogue token report |
| H06-UXC-10 | Stories prêtes sans ambiguïté | story schema validator + readiness API | 100% story pack compliant |

### 16.1 Contrat technique des widgets critiques

| Widget | States obligatoires | Keyboard nav | Focus visible | Responsive | Preuve G4-UX |
|---|---|---|---|---|---|
| ActionQueueCard | loading/empty/error/success | oui | oui | oui | capture evidence + test id |
| PipelinePhaseNode | loading/empty/error/success | oui | oui | oui | capture evidence + test id |
| GateStatusPanel | loading/empty/error/success | oui | oui | oui | capture evidence + test id |
| SubGatePanel | loading/empty/error/success | oui | oui | oui | capture evidence + test id |
| ArtifactSearchResult | loading/empty/error/success | oui | oui | oui | capture evidence + test id |
| EvidenceGraphView | loading/empty/error/success | oui | oui | oui | capture evidence + test id |
| CommandDryRunPreview | loading/empty/error/success | oui | oui | oui | capture evidence + test id |
| RiskHeatmap | loading/empty/error/success | oui | oui | oui | capture evidence + test id |
| AQCDScoreCard | loading/empty/error/success | oui | oui | oui | capture evidence + test id |
| NotificationCenter | loading/empty/error/success | oui | oui | oui | capture evidence + test id |
| ProjectSwitcher | loading/empty/error/success | oui | oui | oui | capture evidence + test id |
| ExportBundleWizard | loading/empty/error/success | oui | oui | oui | capture evidence + test id |

## 17. Observabilité unifiée et SLO/SLI opérationnels

L’observabilité couvre la stack technique et la discipline process BMAD (phase/gates/notify).
Les métriques sont reliées à des actions concrètes, pas à une logique vanity.

| Métrique | Définition | SLO cible | Fréquence | Owner |
|---|---|---|---|---|
| m_phase_transition_latency_ms | Latence transition phase | <30000 médiane | 5 min | orchestrator |
| m_gate_fail_rate | Taux FAIL gates | <10% hors incident | daily | tea |
| m_gate_concerns_resolution_time | Résolution concerns | <24h planning | daily | pm |
| m_handoff_rework_ratio | Retours handoff | <15% | weekly | pm |
| m_artifact_parse_error_rate | Erreurs parsing | <2% | 5 min | architect |
| m_artifact_staleness_seconds | Âge read models | <120s | 5 min | architect |
| m_index_queue_depth | Profondeur queue ingestion | <seuil dynamique | 1 min | architect |
| m_projection_rebuild_time | Temps rebuild projection | <60s | 5 min | architect |
| m_command_success_rate | Succès commandes | >95% | daily | ops |
| m_command_denied_rate | Refus policy commandes | pics justifiés | daily | security |
| m_dry_run_to_apply_ratio | Usage simulation | >0.6 onboarding | weekly | security |
| m_context_switch_error | Erreur contexte projet | 0 toléré write | real-time | orchestrator |
| m_policy_override_count | Overrides policy | tendre vers 0 | weekly | security |
| m_security_high_findings | Vulns high ouvertes | 0 RC | daily | security |
| m_bundle_export_success | Succès export bundle | >98% | daily | tea |
| m_bundle_generation_time | Temps génération bundle | <10s p95 | daily | architect |
| m_incident_mtta | Temps acquittement incident | <10 min critique | real-time | on-call |
| m_ux_gate_block_count | Blocages G4-UX | suivi tendance | daily | uxqa |
| m_ux_rework_after_done | Rework UX post-DONE | vers 0 | weekly | uxqa |
| m_aqcd_autonomy | Score autonomie | >=70 | weekly | orchestrator |
| m_aqcd_quality | Score qualité | >=80 | weekly | tea |
| m_aqcd_cost | Score coût | >=70 | weekly | finops |
| m_aqcd_design | Score design | >=80 | weekly | uxlead |
| m_readiness_score | Readiness pré-gate | alerte <65 | pre-gate | pm+architect |
| m_search_zero_result_rate | Recherche sans résultat | <20% | weekly | uxlead |
| m_user_action_to_decision_time | Temps action->décision | réduction continue | weekly | pm |
| m_notification_phase_delay | Delay complete->notify | <5 min | daily | orchestrator |
| m_tcd_reduction_pct | Réduction TCD | >=30% pilote | monthly | pm |
| m_adoption_activation_rate | Activation pilotes | >=60% | monthly | pmm |
| m_gate_fail_rate_g3 | Fail rate G3 | <15% | release | architect |
| m_retention_policy_coverage | Types data couverts policy | 100% | monthly | security |
| m_audit_integrity_check | Vérification chaîne audit | 100% pass | daily | security |
| m_command_timeout_ratio | Timeout commandes | <2% | daily | ops |
| m_command_retry_ratio | Retries commandes | <5% | daily | ops |
| m_integration_contract_breaks | Ruptures contrats connecteurs | 0 non traitée >24h | daily | architect |
| m_ux_accessibility_blockers | Blockers a11y ouverts | 0 | daily | uxqa |
| m_responsive_regressions | Régressions responsive | 0 blocking | release | uxqa |
| m_story_readiness_missing_fields | Stories incomplètes | 0 avant H13 | daily | sm |
| m_mitigation_overdue_count | Mitigations en retard | <5% | weekly | sm+tea |
| m_killswitch_activation_count | Activations kill-switch | justifiées + postmortem | monthly | security |

### 17.1 Règles d’alerte et runbooks associés

| Alerte | Déclencheur | Sévérité | Action | Runbook |
|---|---|---|---|---|
| AL-01 | phase notify manquant >30min | Critique | Bloquer transition + notifier orchestrateur | RB-01 |
| AL-02 | commande hors allowlist | Critique | Refus immédiat + audit sécurité | RB-02 |
| AL-03 | G4-T PASS && G4-UX FAIL | Élevée | DONE bloqué + correction UX | RB-03 |
| AL-04 | parse error rate >5% | Élevée | safe parser mode + escalade architecte | RB-04 |
| AL-05 | readiness <60 | Élevée | actions prioritaires avant gate | RB-05 |
| AL-06 | queue ingestion saturée >10min | Moyenne | backpressure + suspend jobs secondaires | RB-06 |
| AL-07 | AQCD qualité <65 deux cycles | Moyenne | kill-switch autonomie partielle | RB-07 |
| AL-08 | fatigue notifications >30% | Moyenne | throttling renforcé | RB-08 |
| AL-09 | context switch error write | Critique | stop commande + incident sécurité | RB-09 |
| AL-10 | security high finding détecté | Critique | bloquer release candidate | RB-10 |
| AL-11 | bundle export failure >2% | Moyenne | analyse export + retry | RB-11 |
| AL-12 | MTTA critique >10min | Élevée | escalade on-call immédiate | RB-12 |
| AL-13 | override non justifié | Élevée | annuler override + audit | RB-13 |
| AL-14 | TCD ne baisse pas sur 4 semaines | Moyenne | reprioriser roadmap décisionnelle | RB-14 |
| AL-15 | mitigation critique >1 sprint retard | Élevée | escalade CODIR + freeze scope | RB-15 |

## 18. Résilience, fallback, rollback et reprise après incident

Le design vise une résilience “stale-but-available” côté lecture et “safe-stop” côté écriture.
Chaque scénario majeur de panne dispose d’une stratégie de confinement et de retour à nominal.

| Incident | Scénario | Stratégie | Runbook | Critère sortie incident |
|---|---|---|---|---|
| INC-01 | Parser artefact en échec massif | safe parser mode + stale projections | RB-04 | service dégradé <=60 min |
| INC-02 | Queue ingestion message poison | DLQ + quarantine + replay sélectif | RB-06 | perte événement = 0 |
| INC-03 | Projection corruption logique | rollback snapshot projection + replay ledger | RB-16 | rebuild <60s cible |
| INC-04 | DB read model indisponible | failover replica + cache stale | RB-17 | SLO 99.5% maintenu |
| INC-05 | Command runner compromis | killswitch + isolate subnet + rotate creds | RB-18 | aucune exécution non autorisée |
| INC-06 | Violation RBAC détectée | downgrade permissions lecture seule | RB-19 | incident fermé <24h |
| INC-07 | Fuite secret logs | rotation secret + purge log + forensic | RB-20 | 0 secret exposé persistant |
| INC-08 | Cross-project write attempt | command abort + incident P1 | RB-09 | 0 write hors contexte |
| INC-09 | WORM ledger verification failed | freeze write + vérification chaîne + restore pointer | RB-21 | integrity rétablie |
| INC-10 | Externe Jira/Linear down | degraded integration mode + stale badge | RB-22 | lecture locale disponible |
| INC-11 | Service notifications saturé | batching + throttle emergency profile | RB-23 | ack critique <10min |
| INC-12 | Export bundle latence élevée | queue dédiée + scale workers | RB-11 | p95 <10s restauré |
| INC-13 | A11y blocker release candidate | release block + hotfix UX | RB-24 | score >=85 rétabli |
| INC-14 | Readiness faux positifs | switch explain mode + recalibration | RB-25 | précision >=65% |
| INC-15 | Policy version conflict | policy freeze + diff review mandatory | RB-26 | policy revalidée |

### 18.1 Politique backup / restore / DR

| ID | Donnée | Stratégie | RPO | RTO | Contrôle |
|---|---|---|---|---|---|
| BK-01 | Event ledger | snapshot + WAL continu | 4h | 15min | WORM + réplication cross-AZ |
| BK-02 | Write model PostgreSQL | snapshot + PITR | 1h | 15min | chiffrement + test restore hebdo |
| BK-03 | Read model projections | rebuild depuis ledger + snapshots | 24h | 60min | rebuild script automatisé |
| BK-04 | Object storage UX/bundles | versioning + lifecycle | 24h | 60min | immutability lock |
| BK-05 | Policy registry | snapshot signé | 24h | 30min | signature vérifiée |
| BK-06 | Secrets metadata | vault backup | 24h | 30min | rotation post-restore |
| BK-07 | Search index | reindex from source | 24h | 120min | pas de dépendance critique |
| BK-08 | Runbooks/config | gitops mirror | 24h | 30min | rollback git tag |

## 19. Sécurité, RBAC, conformité et auditabilité

La posture sécurité suit le principe “default deny”, compatible SOC2/ISO-like controls et exigences client régulé.

### 19.1 Matrice RBAC opérationnelle V1

| Capability | Orchestrateur | PM | Architecte | SM | DEV | TEA | UX QA | Sponsor | Admin Sec |
|---|---|---|---|---|---|---|---|---|---|
| Lire artefacts/projections | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Simuler commandes | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ |
| Appliquer commandes write | ✅ | — | — | ✅ | ✅ | — | — | — | ✅ |
| Approuver override policy | ✅ | — | — | — | — | — | — | — | ✅ |
| Modifier allowlist | — | — | — | — | — | — | — | — | ✅ |
| Activer kill-switch | ✅ | — | — | — | — | — | — | — | ✅ |
| Publier phase-notify | ✅ | ✅ | — | ✅ | — | — | — | — | — |
| Exporter bundles audit | ✅ | ✅ | — | — | — | ✅ | ✅ | — | ✅ |
| Changer contexte projet global | ✅ | — | — | — | — | — | — | — | ✅ |

### 19.2 Contrôles conformité et cycle de vie des données

| ID | Contrôle | Exigence | Implémentation |
|---|---|---|---|
| COMP-01 | Classification data | public/internal/restricted | filtrage export + UI badge |
| COMP-02 | Rétention policy | par classe de données | retention engine + purge logs |
| COMP-03 | Legal hold | bloque purge sur litige | flag hold + audit trail |
| COMP-04 | Data minimization | collecte minimale connecteurs | mapping strict champs |
| COMP-05 | Encryption at rest | AES-256 stores sensibles | KMS/Vault contrôlé |
| COMP-06 | Encryption in transit | TLS 1.2+ inter-services | mTLS service mesh |
| COMP-07 | JML process | joiner/mover/leaver <24h | sync IAM + audit |
| COMP-08 | Access review | revue hebdo rôles critiques | report signé security |
| COMP-09 | Audit immuable | hash chain + signature | verification job daily |
| COMP-10 | Export governance | approval policy par rôle | watermark + logs |
| COMP-11 | Secret redaction | pattern scanner + block persist | post-run scan |
| COMP-12 | Incident reporting | P1/P2 SLA définis | runbook + postmortem |
| COMP-13 | Schema governance | version + compatibilité déclarée | schema registry CI gate |
| COMP-14 | Third-party tokens | scopes minimaux + rotation | vault rotation policy |
| COMP-15 | Deletion traceability | soft-delete + hard-delete trace | audit events dédiés |

## 20. Performance, capacité et FinOps

L’Architecture est dimensionnée pour la baseline PRD (500 docs, 10k events/jour, 20 users simultanés).
La stratégie FinOps est native: budgets par projet, quotas, score AQCD cost, alertes dérive.

| ID | Axe capacité | Hypothèse | Mécanisme |
|---|---|---|---|
| CP-01 | Corpus markdown actif | 500 docs/projet | parse delta + cache sections/tables |
| CP-02 | Events journaliers | 10k/jour | ledger partition + projection workers |
| CP-03 | Concurrence utilisateurs | 20 simultanés | autoscaling API |
| CP-04 | Workers ingestion | 8 workers base | queue priority + backpressure |
| CP-05 | Burst commandes | 50/h | broker queue + admission control |
| CP-06 | Exports bundles | 100/jour | pool workers dédié export |
| CP-07 | Connecteurs externes | 5 connecteurs actifs | cursors persistés + retries |
| CP-08 | Readiness recompute | 24/jour | batch schedulé |
| CP-09 | AQCD recompute | 12/jour | materialized projections |
| CP-10 | SLA notifications critiques | <10 min ack | escalade automatique |

### 20.1 Budget et alertes FinOps

| ID | Indicateur FinOps | Cible | Action |
|---|---|---|---|
| FIN-01 | Coût token/jour | < budget journalier tenant | alert warning 80%, critical 95% |
| FIN-02 | Waste ratio | <25% | alerte + réduction concurrence workers |
| FIN-03 | Storage ledger | <budget GB/mois | tiering + compression + archive |
| FIN-04 | Coût export | <budget exports/mois | quotas + priorisation |
| FIN-05 | Coût commandes failed | tendance décroissante | templates + validations |
| FIN-06 | Coût rework UX | vers 0 post-DONE | gate G4-UX strict |
| FIN-07 | Cost per accepted decision | stabilisation trimestrielle | AQCD cost dashboard |
| FIN-08 | Run non productifs | réduction continue | observabilité run-level |

## 21. Gouvernance des données: rétention, purge, classification

La gouvernance data est conçue pour satisfaire S08 et D14 dès la V1.
Chaque classe de donnée possède une durée de conservation, un mode de purge et des exceptions legal hold.

| Classe | Type de donnée | Rétention (jours) | Politique purge | Legal hold |
|---|---|---|---|---|
| DATA-01 | Event ledger critique | 730 | hard-delete interdit (archive chiffrée) | oui |
| DATA-02 | Audit chain | 1095 | append-only + legal hold prioritaire | oui |
| DATA-03 | Projections read-side | 90 | rebuildable -> purge soft puis hard | non |
| DATA-04 | Artefacts index metadata | 365 | purge après inactivité + export | oui |
| DATA-05 | Captures UX | 180 | purge hard sauf evidence gate active | oui |
| DATA-06 | Bundles export | 180 | purge hard + journal trace conservé | oui |
| DATA-07 | Logs applicatifs | 30 | rotation + redaction | non |
| DATA-08 | Logs sécurité | 365 | immutability lock | oui |
| DATA-09 | Cursors connecteurs | 180 | soft delete + restore court | non |
| DATA-10 | Secrets metadata (pas valeur) | 90 | purge hard | non |
| DATA-11 | Policies versions | 730 | archive signée | oui |
| DATA-12 | Snapshots AQCD | 365 | aggregation + purge granulaire | non |
| DATA-13 | Readiness snapshots | 180 | aggregation + purge | non |
| DATA-14 | Mitigation tasks fermées | 365 | archive puis purge | oui |
| DATA-15 | Notifications ack history | 180 | purge hard | non |

## 22. Stratégie de testabilité et preuves de gate

L’Architecture garantit une testabilité multi-couches: contrat, intégration, sécurité, UX, performance, résilience.
Les suites de test sont alignées avec G2/G3/G4/G5 pour limiter les surprises en implémentation.

| Suite ID | Domaine | Couverture | Objectif | Gate | Mode |
|---|---|---|---|---|---|
| TS-WF | Workflow | FR-001..010 | Transitions autorisées + notify guards | G2/G3 | contract+e2e |
| TS-GT | Gate | FR-011..020 | Dual gate + policy engine | G3/G4 | contract+e2e |
| TS-AR | Artifact | FR-021..032 | Parsing/index/search/evidence | G2/G3 | contract+e2e |
| TS-CM | Command | FR-033..044 | simulate/apply/RBAC/allowlist | G3/G4 | contract+e2e |
| TS-AQ | AQCD-Risk | FR-045..054 | score/readiness/risk actions | G3/G5 | contract+e2e |
| TS-CO | Collaboration | FR-055..062 | notification SLA + anti-fatigue | G2/G3 | contract+e2e |
| TS-UX | UX quality | FR-063..070 | states/a11y/responsive | G4-UX | contract+e2e |
| TS-IN | Integration | FR-071..082 | context isolation + connectors | G3/G5 | contract+e2e |
| TS-NFR-001 | Performance | NFR-001 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-002 | Performance | NFR-002 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-003 | Performance | NFR-003 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-004 | Performance | NFR-004 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-005 | Performance | NFR-005 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-006 | Performance | NFR-006 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-007 | Performance | NFR-007 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-008 | Performance | NFR-008 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-009 | Performance | NFR-009 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-010 | Performance | NFR-010 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-011 | Fiabilité | NFR-011 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-012 | Fiabilité | NFR-012 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-013 | Fiabilité | NFR-013 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-014 | Fiabilité | NFR-014 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-015 | Fiabilité | NFR-015 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-016 | Fiabilité | NFR-016 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-017 | Fiabilité | NFR-017 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-018 | Fiabilité | NFR-018 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-019 | Sécurité | NFR-019 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-020 | Sécurité | NFR-020 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-021 | Sécurité | NFR-021 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-022 | Sécurité | NFR-022 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-023 | Sécurité | NFR-023 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-024 | Sécurité | NFR-024 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-025 | Sécurité | NFR-025 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-026 | Sécurité | NFR-026 | Vérification cible mesurable | G3/G4 | automated+manual |
| TS-NFR-027 | Conformité | NFR-027 | Vérification cible mesurable | G2/G4-UX | automated+manual |
| TS-NFR-028 | Conformité | NFR-028 | Vérification cible mesurable | G2/G4-UX | automated+manual |
| TS-NFR-029 | Conformité | NFR-029 | Vérification cible mesurable | G2/G4-UX | automated+manual |
| TS-NFR-030 | UX | NFR-030 | Vérification cible mesurable | G2/G4-UX | automated+manual |
| TS-NFR-031 | UX | NFR-031 | Vérification cible mesurable | G2/G4-UX | automated+manual |
| TS-NFR-032 | UX | NFR-032 | Vérification cible mesurable | G2/G4-UX | automated+manual |
| TS-NFR-033 | UX | NFR-033 | Vérification cible mesurable | G2/G4-UX | automated+manual |
| TS-NFR-034 | Opérabilité/Maintenabilité | NFR-034 | Vérification cible mesurable | G3/G5 | automated+manual |
| TS-NFR-035 | Opérabilité/Maintenabilité | NFR-035 | Vérification cible mesurable | G3/G5 | automated+manual |
| TS-NFR-036 | Opérabilité/Maintenabilité | NFR-036 | Vérification cible mesurable | G3/G5 | automated+manual |
| TS-NFR-037 | Opérabilité/Maintenabilité | NFR-037 | Vérification cible mesurable | G3/G5 | automated+manual |
| TS-NFR-038 | Opérabilité/Maintenabilité | NFR-038 | Vérification cible mesurable | G3/G5 | automated+manual |
| TS-NFR-039 | Opérabilité/Maintenabilité | NFR-039 | Vérification cible mesurable | G3/G5 | automated+manual |
| TS-NFR-040 | Opérabilité/Maintenabilité | NFR-040 | Vérification cible mesurable | G3/G5 | automated+manual |

## 23. Plan de livraison architecture et migration vers H09/H10

La livraison est incrémentale afin de limiter les risques techniques et organisationnels.
Le plan ci-dessous traduit la roadmap en unités transférables vers epics/stories H09.

| Lot | Horizon | Axe | Livrables |
|---|---|---|---|
| LOT-00 | Semaine 1 | Foundations | Ledger minimal + workflow state machine + metadata validator |
| LOT-01 | Semaine 2 | Gate center core | G1..G5 + dual G4 + policy registry |
| LOT-02 | Semaine 3 | Artifact/evidence | Ingestion delta + search + evidence graph |
| LOT-03 | Semaine 4 | Command read+simulate | Broker simulate + context signer + audit |
| LOT-04 | Semaine 5 | Command apply secure | approval flow + runner isolation + kill-switch |
| LOT-05 | Semaine 6 | AQCD/Risk | Risk register + AQCD snapshots + readiness engine |
| LOT-06 | Semaine 7 | Notifications | priority/dedup/escalation + SLA ack |
| LOT-07 | Semaine 8 | UX evidence | G4-UX proofs, states contract, a11y automation |
| LOT-08 | Semaine 9 | Integrations read-first | Jira/Linear/Notion/CI/Sec connectors |
| LOT-09 | Semaine 10 | Export/Compliance | bundle md/pdf/json + retention engine |
| LOT-10 | Semaine 11 | Resilience hardening | DLQ, stale mode, chaos drills, rollback tests |
| LOT-11 | Semaine 12 | Pre-GA readiness | SLO burn-in + sign-offs PM/Arch/UX/TEA/Sec |

### 23.1 Stratégie de migration depuis l’existant

| Étape migration | Action | Critère sortie |
|---|---|---|
| MIG-01 | Inventorier scripts et adapters legacy | Catalogue command templates initial |
| MIG-02 | Brancher parser metadata obligatoire | 0 livrable critique sans metadata |
| MIG-03 | Activer ledger en write-through | aucune mutation sans event |
| MIG-04 | Créer projections minimales workflow/gate | latence initiale conforme |
| MIG-05 | Basculer Gate Center sur engine policy | cohérence verdicts |
| MIG-06 | Introduire simulate/apply command broker | suppression exécution directe |
| MIG-07 | Indexer artefacts historiques | evidence graph utilisable |
| MIG-08 | Activer AQCD baseline | snapshot initial validé |
| MIG-09 | Connecter notifications avec SLA | ack critique mesurable |
| MIG-10 | Brancher intégrations externes read-first | données inter-outils visibles |
| MIG-11 | Activer export compliance | bundle filtré par rôle |
| MIG-12 | Durcir self-host package | readiness enterprise documentée |

## 24. ADR candidates (pré-décisions formalisées H08)

Cette section transforme les pré-ADRs H02 en décisions exploitables pour H09/H10.

| ADR | Décision | Statut H08 | Justification |
|---|---|---|---|
| ADR-001 | Event ledger append-only signé | ACCEPTÉ | Auditabilité non négociable |
| ADR-002 | Séparation write/read models | ACCEPTÉ | Performance + résilience |
| ADR-003 | Contrats handoff/artifact versionnés | ACCEPTÉ | Réduction dérive formats |
| ADR-004 | Command broker zero-trust | ACCEPTÉ | Sécurité opérationnelle |
| ADR-005 | RBAC minimal + SoD | ACCEPTÉ | Réduction surface attaque |
| ADR-006 | Policy-as-code pour gates | ACCEPTÉ | Traçabilité décisionnelle |
| ADR-007 | Indexation delta + cache | ACCEPTÉ | SLO recherche/perf |
| ADR-008 | Dual gate G4 explicite natif | ACCEPTÉ | Empêche faux DONE |
| ADR-009 | Readiness predictor rule-based v1 | ACCEPTÉ | Explicabilité > opacité |
| ADR-010 | Export bundle preuve multi-format | ACCEPTÉ | Audit client/sponsor |
| ADR-011 | Mode stale-but-available | ACCEPTÉ | Continuité service |
| ADR-012 | active_project_root signé obligatoire | ACCEPTÉ | Sécurité multi-projets |
| ADR-013 | AQCD via projections matérialisées | ACCEPTÉ | Coût/perf maîtrisés |
| ADR-014 | DLQ ingestion obligatoire | ACCEPTÉ | Résilience message poison |
| ADR-015 | Runbooks incidents critiques testés | ACCEPTÉ | Réponse répétable |

### ADR-001 — Event ledger append-only signé

- Statut: **ACCEPTÉ**
- Motif principal: Auditabilité non négociable.
- Impacts architecture: modèle de données, API, sécurité et runbook alignés.
- Coût/complexité: acceptable pour V1 avec plan incrémental et contrôles de risque.
- Vérification H10: check de readiness et preuves de test associées.

### ADR-002 — Séparation write/read models

- Statut: **ACCEPTÉ**
- Motif principal: Performance + résilience.
- Impacts architecture: modèle de données, API, sécurité et runbook alignés.
- Coût/complexité: acceptable pour V1 avec plan incrémental et contrôles de risque.
- Vérification H10: check de readiness et preuves de test associées.

### ADR-003 — Contrats handoff/artifact versionnés

- Statut: **ACCEPTÉ**
- Motif principal: Réduction dérive formats.
- Impacts architecture: modèle de données, API, sécurité et runbook alignés.
- Coût/complexité: acceptable pour V1 avec plan incrémental et contrôles de risque.
- Vérification H10: check de readiness et preuves de test associées.

### ADR-004 — Command broker zero-trust

- Statut: **ACCEPTÉ**
- Motif principal: Sécurité opérationnelle.
- Impacts architecture: modèle de données, API, sécurité et runbook alignés.
- Coût/complexité: acceptable pour V1 avec plan incrémental et contrôles de risque.
- Vérification H10: check de readiness et preuves de test associées.

### ADR-005 — RBAC minimal + SoD

- Statut: **ACCEPTÉ**
- Motif principal: Réduction surface attaque.
- Impacts architecture: modèle de données, API, sécurité et runbook alignés.
- Coût/complexité: acceptable pour V1 avec plan incrémental et contrôles de risque.
- Vérification H10: check de readiness et preuves de test associées.

### ADR-006 — Policy-as-code pour gates

- Statut: **ACCEPTÉ**
- Motif principal: Traçabilité décisionnelle.
- Impacts architecture: modèle de données, API, sécurité et runbook alignés.
- Coût/complexité: acceptable pour V1 avec plan incrémental et contrôles de risque.
- Vérification H10: check de readiness et preuves de test associées.

### ADR-007 — Indexation delta + cache

- Statut: **ACCEPTÉ**
- Motif principal: SLO recherche/perf.
- Impacts architecture: modèle de données, API, sécurité et runbook alignés.
- Coût/complexité: acceptable pour V1 avec plan incrémental et contrôles de risque.
- Vérification H10: check de readiness et preuves de test associées.

### ADR-008 — Dual gate G4 explicite natif

- Statut: **ACCEPTÉ**
- Motif principal: Empêche faux DONE.
- Impacts architecture: modèle de données, API, sécurité et runbook alignés.
- Coût/complexité: acceptable pour V1 avec plan incrémental et contrôles de risque.
- Vérification H10: check de readiness et preuves de test associées.

### ADR-009 — Readiness predictor rule-based v1

- Statut: **ACCEPTÉ**
- Motif principal: Explicabilité > opacité.
- Impacts architecture: modèle de données, API, sécurité et runbook alignés.
- Coût/complexité: acceptable pour V1 avec plan incrémental et contrôles de risque.
- Vérification H10: check de readiness et preuves de test associées.

### ADR-010 — Export bundle preuve multi-format

- Statut: **ACCEPTÉ**
- Motif principal: Audit client/sponsor.
- Impacts architecture: modèle de données, API, sécurité et runbook alignés.
- Coût/complexité: acceptable pour V1 avec plan incrémental et contrôles de risque.
- Vérification H10: check de readiness et preuves de test associées.

### ADR-011 — Mode stale-but-available

- Statut: **ACCEPTÉ**
- Motif principal: Continuité service.
- Impacts architecture: modèle de données, API, sécurité et runbook alignés.
- Coût/complexité: acceptable pour V1 avec plan incrémental et contrôles de risque.
- Vérification H10: check de readiness et preuves de test associées.

### ADR-012 — active_project_root signé obligatoire

- Statut: **ACCEPTÉ**
- Motif principal: Sécurité multi-projets.
- Impacts architecture: modèle de données, API, sécurité et runbook alignés.
- Coût/complexité: acceptable pour V1 avec plan incrémental et contrôles de risque.
- Vérification H10: check de readiness et preuves de test associées.

### ADR-013 — AQCD via projections matérialisées

- Statut: **ACCEPTÉ**
- Motif principal: Coût/perf maîtrisés.
- Impacts architecture: modèle de données, API, sécurité et runbook alignés.
- Coût/complexité: acceptable pour V1 avec plan incrémental et contrôles de risque.
- Vérification H10: check de readiness et preuves de test associées.

### ADR-014 — DLQ ingestion obligatoire

- Statut: **ACCEPTÉ**
- Motif principal: Résilience message poison.
- Impacts architecture: modèle de données, API, sécurité et runbook alignés.
- Coût/complexité: acceptable pour V1 avec plan incrémental et contrôles de risque.
- Vérification H10: check de readiness et preuves de test associées.

### ADR-015 — Runbooks incidents critiques testés

- Statut: **ACCEPTÉ**
- Motif principal: Réponse répétable.
- Impacts architecture: modèle de données, API, sécurité et runbook alignés.
- Coût/complexité: acceptable pour V1 avec plan incrémental et contrôles de risque.
- Vérification H10: check de readiness et preuves de test associées.

## 25. Registre des risques résiduels après design H08

Les risques ci-dessous restent présents après architecture, avec niveau résiduel et plan de traitement H09/H10.

| Risque | Description | Niveau résiduel | Plan de traitement |
|---|---|---|---|
| S03 | RBAC trop permissif | Moyen | revue hebdo + tests policy-as-code + SoD |
| S01 | Commande destructive mauvais projet | Faible | root signé + dual confirm + kill-switch drills |
| T07 | Faux DONE G4-UX | Faible | dual gate natif + evidence UX obligatoire |
| M02 | ROI TCD non démontré | Moyen | baseline + instrumentation mensuelle |
| M07 | Retard self-host readiness | Moyen | lot SH-01..08 datés |
| P01 | Transition phase illégitime | Faible | machine d’état stricte |
| P06 | Contournement ULTRA checks | Moyen | gates bloquants + audit |
| P07 | Erreur contexte multi-projets | Faible | context service signé + deny-by-default |
| S02 | Injection shell | Faible | templates structurés + tests fuzz |
| S05 | Fuite secrets logs | Faible | redaction + scanner + rotation |
| T04 | Latence projections | Moyen | capacity tuning + cache policies |
| T05 | Rupture contrats API | Moyen | contract tests + versioning strict |
| U03 | A11y non conforme | Faible | CI blockers + UX QA |
| U06 | Fatigue notifications | Moyen | throttle adaptatif + UX tuning |
| C01 | Explosion coût token | Moyen | budgets/quota + model routing |
| S08 | Rétention non conforme | Moyen | retention engine + audit legal |

## 26. Matrice de traçabilité FR -> composants -> API -> tests

La matrice suivante assure la transférabilité immédiate vers H09 (epics/stories) et H10 (readiness).

| FR | Module | Composants clés | API cibles | Suite test | Risques dominants |
|---|---|---|---|---|---|
| FR-001 | Workflow & Phases | svc-workflow | /workflow/* | TS-WF | T/P |
| FR-002 | Workflow & Phases | svc-workflow | /workflow/* | TS-WF | T/P |
| FR-003 | Workflow & Phases | svc-workflow | /workflow/* | TS-WF | T/P |
| FR-004 | Workflow & Phases | svc-workflow | /workflow/* | TS-WF | T/P |
| FR-005 | Workflow & Phases | svc-workflow | /workflow/* | TS-WF | T/P |
| FR-006 | Workflow & Phases | svc-workflow | /workflow/* | TS-WF | T/P |
| FR-007 | Workflow & Phases | svc-workflow | /workflow/* | TS-WF | T/P |
| FR-008 | Workflow & Phases | svc-workflow | /workflow/* | TS-WF | T/P |
| FR-009 | Workflow & Phases | svc-workflow | /workflow/* | TS-WF | T/P |
| FR-010 | Workflow & Phases | svc-workflow | /workflow/* | TS-WF | T/P |
| FR-011 | Gate Control | svc-gate-engine | /gates/* | TS-GT | T/P |
| FR-012 | Gate Control | svc-gate-engine | /gates/* | TS-GT | T/P |
| FR-013 | Gate Control | svc-gate-engine | /gates/* | TS-GT | T/P |
| FR-014 | Gate Control | svc-gate-engine | /gates/* | TS-GT | T/P |
| FR-015 | Gate Control | svc-gate-engine | /gates/* | TS-GT | T/P |
| FR-016 | Gate Control | svc-gate-engine | /gates/* | TS-GT | T/P |
| FR-017 | Gate Control | svc-gate-engine | /gates/* | TS-GT | T/P |
| FR-018 | Gate Control | svc-gate-engine | /gates/* | TS-GT | T/P |
| FR-019 | Gate Control | svc-gate-engine | /gates/* | TS-GT | T/P |
| FR-020 | Gate Control | svc-gate-engine | /gates/* | TS-GT | T/P |
| FR-021 | Artifact & Evidence | svc-artifact-ingestor + svc-evidence-graph | /artifacts/*,/evidence/* | TS-AR | T/U |
| FR-022 | Artifact & Evidence | svc-artifact-ingestor + svc-evidence-graph | /artifacts/*,/evidence/* | TS-AR | T/U |
| FR-023 | Artifact & Evidence | svc-artifact-ingestor + svc-evidence-graph | /artifacts/*,/evidence/* | TS-AR | T/U |
| FR-024 | Artifact & Evidence | svc-artifact-ingestor + svc-evidence-graph | /artifacts/*,/evidence/* | TS-AR | T/U |
| FR-025 | Artifact & Evidence | svc-artifact-ingestor + svc-evidence-graph | /artifacts/*,/evidence/* | TS-AR | T/U |
| FR-026 | Artifact & Evidence | svc-artifact-ingestor + svc-evidence-graph | /artifacts/*,/evidence/* | TS-AR | T/U |
| FR-027 | Artifact & Evidence | svc-artifact-ingestor + svc-evidence-graph | /artifacts/*,/evidence/* | TS-AR | T/U |
| FR-028 | Artifact & Evidence | svc-artifact-ingestor + svc-evidence-graph | /artifacts/*,/evidence/* | TS-AR | T/U |
| FR-029 | Artifact & Evidence | svc-artifact-ingestor + svc-evidence-graph | /artifacts/*,/evidence/* | TS-AR | T/U |
| FR-030 | Artifact & Evidence | svc-artifact-ingestor + svc-evidence-graph | /artifacts/*,/evidence/* | TS-AR | T/U |
| FR-031 | Artifact & Evidence | svc-artifact-ingestor + svc-evidence-graph | /artifacts/*,/evidence/* | TS-AR | T/U |
| FR-032 | Artifact & Evidence | svc-artifact-ingestor + svc-evidence-graph | /artifacts/*,/evidence/* | TS-AR | T/U |
| FR-033 | Command Broker | svc-command-broker + svc-command-runner | /commands/* | TS-CM | S/P |
| FR-034 | Command Broker | svc-command-broker + svc-command-runner | /commands/* | TS-CM | S/P |
| FR-035 | Command Broker | svc-command-broker + svc-command-runner | /commands/* | TS-CM | S/P |
| FR-036 | Command Broker | svc-command-broker + svc-command-runner | /commands/* | TS-CM | S/P |
| FR-037 | Command Broker | svc-command-broker + svc-command-runner | /commands/* | TS-CM | S/P |
| FR-038 | Command Broker | svc-command-broker + svc-command-runner | /commands/* | TS-CM | S/P |
| FR-039 | Command Broker | svc-command-broker + svc-command-runner | /commands/* | TS-CM | S/P |
| FR-040 | Command Broker | svc-command-broker + svc-command-runner | /commands/* | TS-CM | S/P |
| FR-041 | Command Broker | svc-command-broker + svc-command-runner | /commands/* | TS-CM | S/P |
| FR-042 | Command Broker | svc-command-broker + svc-command-runner | /commands/* | TS-CM | S/P |
| FR-043 | Command Broker | svc-command-broker + svc-command-runner | /commands/* | TS-CM | S/P |
| FR-044 | Command Broker | svc-command-broker + svc-command-runner | /commands/* | TS-CM | S/P |
| FR-045 | AQCD & Risk | svc-aqcd + svc-risk | /aqcd/*,/risks/* | TS-AQ | M/C |
| FR-046 | AQCD & Risk | svc-aqcd + svc-risk | /aqcd/*,/risks/* | TS-AQ | M/C |
| FR-047 | AQCD & Risk | svc-aqcd + svc-risk | /aqcd/*,/risks/* | TS-AQ | M/C |
| FR-048 | AQCD & Risk | svc-aqcd + svc-risk | /aqcd/*,/risks/* | TS-AQ | M/C |
| FR-049 | AQCD & Risk | svc-aqcd + svc-risk | /aqcd/*,/risks/* | TS-AQ | M/C |
| FR-050 | AQCD & Risk | svc-aqcd + svc-risk | /aqcd/*,/risks/* | TS-AQ | M/C |
| FR-051 | AQCD & Risk | svc-aqcd + svc-risk | /aqcd/*,/risks/* | TS-AQ | M/C |
| FR-052 | AQCD & Risk | svc-aqcd + svc-risk | /aqcd/*,/risks/* | TS-AQ | M/C |
| FR-053 | AQCD & Risk | svc-aqcd + svc-risk | /aqcd/*,/risks/* | TS-AQ | M/C |
| FR-054 | AQCD & Risk | svc-aqcd + svc-risk | /aqcd/*,/risks/* | TS-AQ | M/C |
| FR-055 | Collaboration & Notifications | svc-notification | /notifications/* | TS-CO | U/P |
| FR-056 | Collaboration & Notifications | svc-notification | /notifications/* | TS-CO | U/P |
| FR-057 | Collaboration & Notifications | svc-notification | /notifications/* | TS-CO | U/P |
| FR-058 | Collaboration & Notifications | svc-notification | /notifications/* | TS-CO | U/P |
| FR-059 | Collaboration & Notifications | svc-notification | /notifications/* | TS-CO | U/P |
| FR-060 | Collaboration & Notifications | svc-notification | /notifications/* | TS-CO | U/P |
| FR-061 | Collaboration & Notifications | svc-notification | /notifications/* | TS-CO | U/P |
| FR-062 | Collaboration & Notifications | svc-notification | /notifications/* | TS-CO | U/P |
| FR-063 | UX Quality Controls | svc-ux-evidence + gate-engine | /ux/*,/gates/g4/* | TS-UX | U/P |
| FR-064 | UX Quality Controls | svc-ux-evidence + gate-engine | /ux/*,/gates/g4/* | TS-UX | U/P |
| FR-065 | UX Quality Controls | svc-ux-evidence + gate-engine | /ux/*,/gates/g4/* | TS-UX | U/P |
| FR-066 | UX Quality Controls | svc-ux-evidence + gate-engine | /ux/*,/gates/g4/* | TS-UX | U/P |
| FR-067 | UX Quality Controls | svc-ux-evidence + gate-engine | /ux/*,/gates/g4/* | TS-UX | U/P |
| FR-068 | UX Quality Controls | svc-ux-evidence + gate-engine | /ux/*,/gates/g4/* | TS-UX | U/P |
| FR-069 | UX Quality Controls | svc-ux-evidence + gate-engine | /ux/*,/gates/g4/* | TS-UX | U/P |
| FR-070 | UX Quality Controls | svc-ux-evidence + gate-engine | /ux/*,/gates/g4/* | TS-UX | U/P |
| FR-071 | Integrations & Multi-Project | svc-context + svc-integration-hub + svc-export-bundle | /integrations/*,/admin/context/*,/exports/* | TS-IN | S/M |
| FR-072 | Integrations & Multi-Project | svc-context + svc-integration-hub + svc-export-bundle | /integrations/*,/admin/context/*,/exports/* | TS-IN | S/M |
| FR-073 | Integrations & Multi-Project | svc-context + svc-integration-hub + svc-export-bundle | /integrations/*,/admin/context/*,/exports/* | TS-IN | S/M |
| FR-074 | Integrations & Multi-Project | svc-context + svc-integration-hub + svc-export-bundle | /integrations/*,/admin/context/*,/exports/* | TS-IN | S/M |
| FR-075 | Integrations & Multi-Project | svc-context + svc-integration-hub + svc-export-bundle | /integrations/*,/admin/context/*,/exports/* | TS-IN | S/M |
| FR-076 | Integrations & Multi-Project | svc-context + svc-integration-hub + svc-export-bundle | /integrations/*,/admin/context/*,/exports/* | TS-IN | S/M |
| FR-077 | Integrations & Multi-Project | svc-context + svc-integration-hub + svc-export-bundle | /integrations/*,/admin/context/*,/exports/* | TS-IN | S/M |
| FR-078 | Integrations & Multi-Project | svc-context + svc-integration-hub + svc-export-bundle | /integrations/*,/admin/context/*,/exports/* | TS-IN | S/M |
| FR-079 | Integrations & Multi-Project | svc-context + svc-integration-hub + svc-export-bundle | /integrations/*,/admin/context/*,/exports/* | TS-IN | S/M |
| FR-080 | Integrations & Multi-Project | svc-context + svc-integration-hub + svc-export-bundle | /integrations/*,/admin/context/*,/exports/* | TS-IN | S/M |
| FR-081 | Integrations & Multi-Project | svc-context + svc-integration-hub + svc-export-bundle | /integrations/*,/admin/context/*,/exports/* | TS-IN | S/M |
| FR-082 | Integrations & Multi-Project | svc-context + svc-integration-hub + svc-export-bundle | /integrations/*,/admin/context/*,/exports/* | TS-IN | S/M |

## 27. Matrice de traçabilité NFR -> contrôles -> SLI/SLO

Chaque NFR est associé à un contrôle d’architecture et un signal de monitoring mesurable.

| NFR | Domaine | Contrôle architecture | Signal de preuve |
|---|---|---|---|
| NFR-001 | Performance | projections matérialisées + cache + autoscaling | m_projection_rebuild_time / latence p95 |
| NFR-002 | Performance | projections matérialisées + cache + autoscaling | m_projection_rebuild_time / latence p95 |
| NFR-003 | Performance | projections matérialisées + cache + autoscaling | m_projection_rebuild_time / latence p95 |
| NFR-004 | Performance | projections matérialisées + cache + autoscaling | m_projection_rebuild_time / latence p95 |
| NFR-005 | Performance | projections matérialisées + cache + autoscaling | m_projection_rebuild_time / latence p95 |
| NFR-006 | Performance | projections matérialisées + cache + autoscaling | m_projection_rebuild_time / latence p95 |
| NFR-007 | Performance | projections matérialisées + cache + autoscaling | m_projection_rebuild_time / latence p95 |
| NFR-008 | Performance | projections matérialisées + cache + autoscaling | m_projection_rebuild_time / latence p95 |
| NFR-009 | Performance | projections matérialisées + cache + autoscaling | m_projection_rebuild_time / latence p95 |
| NFR-010 | Performance | projections matérialisées + cache + autoscaling | m_projection_rebuild_time / latence p95 |
| NFR-011 | Fiabilité | outbox + retries bornés + DLQ + fallback stale | m_artifact_staleness_seconds / disponibilité |
| NFR-012 | Fiabilité | outbox + retries bornés + DLQ + fallback stale | m_artifact_staleness_seconds / disponibilité |
| NFR-013 | Fiabilité | outbox + retries bornés + DLQ + fallback stale | m_artifact_staleness_seconds / disponibilité |
| NFR-014 | Fiabilité | outbox + retries bornés + DLQ + fallback stale | m_artifact_staleness_seconds / disponibilité |
| NFR-015 | Fiabilité | outbox + retries bornés + DLQ + fallback stale | m_artifact_staleness_seconds / disponibilité |
| NFR-016 | Fiabilité | outbox + retries bornés + DLQ + fallback stale | m_artifact_staleness_seconds / disponibilité |
| NFR-017 | Fiabilité | outbox + retries bornés + DLQ + fallback stale | m_artifact_staleness_seconds / disponibilité |
| NFR-018 | Fiabilité | outbox + retries bornés + DLQ + fallback stale | m_artifact_staleness_seconds / disponibilité |
| NFR-019 | Sécurité | RBAC minimal + allowlist + signatures + redaction | m_command_denied_rate / findings sécurité |
| NFR-020 | Sécurité | RBAC minimal + allowlist + signatures + redaction | m_command_denied_rate / findings sécurité |
| NFR-021 | Sécurité | RBAC minimal + allowlist + signatures + redaction | m_command_denied_rate / findings sécurité |
| NFR-022 | Sécurité | RBAC minimal + allowlist + signatures + redaction | m_command_denied_rate / findings sécurité |
| NFR-023 | Sécurité | RBAC minimal + allowlist + signatures + redaction | m_command_denied_rate / findings sécurité |
| NFR-024 | Sécurité | RBAC minimal + allowlist + signatures + redaction | m_command_denied_rate / findings sécurité |
| NFR-025 | Sécurité | RBAC minimal + allowlist + signatures + redaction | m_command_denied_rate / findings sécurité |
| NFR-026 | Sécurité | RBAC minimal + allowlist + signatures + redaction | m_command_denied_rate / findings sécurité |
| NFR-027 | Conformité | retention policy engine + export governance | m_retention_policy_coverage / audit checks |
| NFR-028 | Conformité | retention policy engine + export governance | m_retention_policy_coverage / audit checks |
| NFR-029 | Conformité | retention policy engine + export governance | m_retention_policy_coverage / audit checks |
| NFR-030 | UX | contracts states + a11y CI + responsive tests | m_ux_accessibility_blockers / TCD |
| NFR-031 | UX | contracts states + a11y CI + responsive tests | m_ux_accessibility_blockers / TCD |
| NFR-032 | UX | contracts states + a11y CI + responsive tests | m_ux_accessibility_blockers / TCD |
| NFR-033 | UX | contracts states + a11y CI + responsive tests | m_ux_accessibility_blockers / TCD |
| NFR-034 | Opérabilité/Maintenabilité | runbooks + schema registry + docs DoD | m_incident_mtta / contract-break count |
| NFR-035 | Opérabilité/Maintenabilité | runbooks + schema registry + docs DoD | m_incident_mtta / contract-break count |
| NFR-036 | Opérabilité/Maintenabilité | runbooks + schema registry + docs DoD | m_incident_mtta / contract-break count |
| NFR-037 | Opérabilité/Maintenabilité | runbooks + schema registry + docs DoD | m_incident_mtta / contract-break count |
| NFR-038 | Opérabilité/Maintenabilité | runbooks + schema registry + docs DoD | m_incident_mtta / contract-break count |
| NFR-039 | Opérabilité/Maintenabilité | runbooks + schema registry + docs DoD | m_incident_mtta / contract-break count |
| NFR-040 | Opérabilité/Maintenabilité | runbooks + schema registry + docs DoD | m_incident_mtta / contract-break count |

## 28. Matrice de traçabilité risques -> contrôles -> runbooks

Cette matrice aligne le registre risques H02 avec les réponses architecture et l’exploitation incident.

| Risque | Contrôle architecture | Runbook | Owner |
|---|---|---|---|
| T01 | schema registry + parser compatibility tests | RB-01 | Architecte |
| T02 | metadata validator blocking ingestion | RB-02 | Architecte |
| T03 | backpressure + worker priority + DLQ | RB-03 | Architecte |
| T04 | materialized projections + query budgets | RB-04 | Architecte |
| T05 | API contract tests + semver policy | RB-05 | Architecte |
| T06 | adapter layer versionnée | RB-06 | Architecte |
| T07 | dual gate hard blocking + UX evidence required | RB-07 | Architecte |
| T08 | stale-but-available fail-safe | RB-08 | Architecte |
| P01 | workflow state machine strict | RB-09 | Orchestrateur/PM |
| P02 | handoff contract validator | RB-10 | Orchestrateur/PM |
| P03 | notify SLA guard + auto-alert | RB-11 | Orchestrateur/PM |
| P04 | owner mandatory + escalation rules | RB-12 | Orchestrateur/PM |
| P05 | mitigation task tracking + freeze policy | RB-13 | Orchestrateur/PM |
| P06 | ULTRA checks in gate pipeline | RB-14 | Orchestrateur/PM |
| P07 | context service signed root | RB-15 | Orchestrateur/PM |
| U01 | role-centric views + progressive disclosure | RB-16 | UX Lead |
| U02 | state contract enforcement | RB-17 | UX Lead |
| U03 | a11y CI blocker + manual audit gate | RB-18 | UX Lead |
| U04 | responsive contract tests | RB-19 | UX Lead |
| U05 | decision cards with owner/proof/action | RB-20 | UX Lead |
| U06 | notification dedup/throttle/escalation | RB-21 | UX Lead |
| S01 | dry-run + dual confirm + kill-switch | RB-22 | Security |
| S02 | structured args + command templates | RB-23 | Security |
| S03 | RBAC least privilege + review | RB-24 | Security |
| S04 | append-only signed audit chain | RB-25 | Security |
| S05 | secret redaction + post-run scans | RB-26 | Security |
| S06 | export filtering + watermark | RB-27 | Security |
| S07 | JML automation + revocation SLA | RB-28 | Security |
| S08 | retention/purge policy engine | RB-29 | Security |
| C01 | budget/quota + model routing | RB-30 | PM/Ops |
| C02 | storage tiering + compression | RB-31 | PM/Ops |
| C03 | connector prioritization | RB-32 | PM/Ops |
| C04 | guided onboarding + templates | RB-33 | PM/Ops |
| C05 | early UX QA + strict G4-UX | RB-34 | PM/Ops |
| M01 | positioning decision-runtime in product layer | RB-35 | PMM/PM |
| M02 | baseline TCD instrumentation | RB-36 | PMM/PM |
| M03 | read-first integrations, no forced migration | RB-37 | PMM/PM |
| M04 | scope guardrails V1 vs V1.1 | RB-38 | PMM/PM |
| M05 | compliance bundle package | RB-39 | PMM/PM |
| M06 | phase-gate-evidence narrative abstraction | RB-40 | PMM/PM |
| M07 | self-host roadmap + security hardening | RB-41 | PMM/PM |
| M08 | executive AQCD simplified views | RB-42 | PMM/PM |

## 29. Décisions transférables vers H09/H10 (max 10)

Décisions bornées, actionnables et directement convertibles en epics/stories/readiness checks:
- D-H09-01: Créer un epic “Core Event Ledger + Projections” avant tout module UI avancé.
- D-H09-02: Créer un epic “Gate Engine Dual G4” avec scénario bloquant DONE obligatoire.
- D-H09-03: Créer un epic “Command Broker Zero-Trust” découpé simulate/apply/approval/killswitch.
- D-H09-04: Rendre la story “Metadata validator ULTRA” prerequisite de tout flux ingestion.
- D-H09-05: Rendre les tests a11y/responsive/states obligatoires dans DoD stories UI critiques.
- D-H09-06: Introduire story “Context Service signed root” avant intégrations write.
- D-H09-07: Introduire story “Observability + Alert runbooks” avant readiness H10.
- D-H09-08: Introduire story “Retention & Export governance” avant tout pilote enterprise.
- D-H09-09: Exiger contract tests API/events à chaque merge touchant Gate/Command/Data.
- D-H09-10: Mesurer baseline TCD/AQCD dès sprint 1 pour sécuriser décision H10.

## 30. Conclusion Architecture et critères de sortie H08

Cette Architecture est cohérente avec PRD/UX/risques et exploitable immédiatement pour H09/H10.
Elle répond explicitement aux exigences demandées:
- Architecture logique et déploiement détaillés.
- Modèle données complet avec event-ledger + projections.
- Command broker sécurisé (simulate/apply, RBAC, allowlist, audit immuable).
- APIs versionnées et testables par domaine.
- Observabilité/SLO orientés décision et runbooks reliés.
- Résilience et rollback documentés scénario par scénario.
- ADR candidates formalisés et traçables.
- Risques résiduels exposés avec plans de traitement.

Critères de sortie H08 proposés:
- PASS si ADRs validés, top risques critiques couverts, et matrices traçabilité acceptées.
- CONCERNS si couverture partielle self-host/compliance/observabilité sans blocage immédiat.
- FAIL si dual gate, command security ou evidence traceability restent ambigus.

Fin du livrable H08 Architecture.
