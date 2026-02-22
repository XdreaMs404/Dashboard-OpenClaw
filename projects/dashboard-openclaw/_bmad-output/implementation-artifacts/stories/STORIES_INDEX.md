# STORIES_INDEX

| ID | Epic | Titre | Status |
|---|---|---|---|
| S001 | E01 | Machine d’état canonique H01→H23 | DONE |
| S002 | E01 | Validateur de transitions autorisées | DONE |
| S003 | E01 | SLA de notification de phase et blocage | DONE |
| S004 | E01 | Capture owner/horodatage/statut de phase | DONE |
| S005 | E01 | Checklist prérequis avant activation de phase | DONE |
| S006 | E01 | Orchestration sequence-guard depuis le cockpit | TODO |
| S007 | E01 | Orchestration ultra-quality-check depuis le cockpit | TODO |
| S008 | E01 | Historique consultable des transitions | TODO |
| S009 | E01 | Workflow override exceptionnel avec approbateur | TODO |
| S010 | E01 | Carte dépendances inter-phases en temps réel | TODO |
| S011 | E01 | Détection anomalies de progression et alertes | DONE |
| S012 | E01 | Journal décisionnel de gouvernance phase/gate | TODO |
| S013 | E02 | Pipeline ingestion markdown/yaml sous allowlist | DONE |
| S014 | E02 | Validator metadata stepsCompleted + inputDocuments | DONE |
| S015 | E02 | Extracteur sections H2/H3 pour navigation | DONE |
| S016 | E02 | Indexeur tableaux markdown et schéma | DONE |
| S017 | E02 | Recherche full-text avec filtres dynamiques | DONE |
| S018 | E02 | Filtrage contextuel phase/agent/date/gate | TODO |
| S019 | E02 | Moteur diff version-vers-version d’artefacts | TODO |
| S020 | E02 | Evidence graph décision↔preuve↔gate↔commande | TODO |
| S021 | E02 | Indicateur de fraîcheur/staleness des vues | TODO |
| S022 | E02 | Diagnostic parse-errors et recommandations | TODO |
| S023 | E02 | Tags risques et annotations contextuelles | TODO |
| S024 | E02 | Backfill historique + migration corpus existant | TODO |
| S025 | E03 | Gate Center unifié avec statut et owner | TODO |
| S026 | E03 | Évaluation duale G4-T/G4-UX corrélée | TODO |
| S027 | E03 | Calculateur verdict PASS/CONCERNS/FAIL | TODO |
| S028 | E03 | Blocage DONE si sous-gate non PASS | TODO |
| S029 | E03 | Validation preuve primaire obligatoire | TODO |
| S030 | E03 | Création automatique actions CONCERNS | TODO |
| S031 | E03 | Versioning des policies de gate | TODO |
| S032 | E03 | Simulation de verdict pré-soumission | TODO |
| S033 | E03 | Tableau tendances des verdicts | TODO |
| S034 | E03 | Export rapport gate (verdict+preuves+actions) | TODO |
| S035 | E03 | Pont d’ingestion des preuves UX vers G4-UX | TODO |
| S036 | E03 | Gouvernance des exceptions de gate | TODO |
| S037 | E04 | Catalogue commandes allowlist versionné | TODO |
| S038 | E04 | Dry-run by default pour toute commande write | TODO |
| S039 | E04 | Preview d’impact fichiers avant apply | TODO |
| S040 | E04 | Double confirmation pour actions destructives | TODO |
| S041 | E04 | Contrôle RBAC avant exécution | TODO |
| S042 | E04 | Contexte actif signé active_project_root | TODO |
| S043 | E04 | Journal append-only des commandes | TODO |
| S044 | E04 | Timeout/retry/idempotency key pilotés | TODO |
| S045 | E04 | Ordonnancement concurrent et backpressure | TODO |
| S046 | E04 | Kill-switch opérationnel immédiat | TODO |
| S047 | E04 | Override policy avec approbation nominative | TODO |
| S048 | E04 | Bibliothèque templates de commandes validées | TODO |
| S049 | E05 | Tableau AQCD explicable (formule + source) | TODO |
| S050 | E05 | Snapshots AQCD périodiques et comparatifs | TODO |
| S051 | E05 | Readiness score rule-based v1 | TODO |
| S052 | E05 | Top 3 actions prioritaires par gate | TODO |
| S053 | E05 | Registre risques vivant owner/échéance/statut | TODO |
| S054 | E05 | Lien mitigation -> task -> preuve de fermeture | TODO |
| S055 | E05 | Heatmap risques probabilité/impact | TODO |
| S056 | E05 | Coût moyen par décision validée | TODO |
| S057 | E05 | Waste ratio par phase + alertes dérive | TODO |
| S058 | E05 | Suivi actions H21/H22/H23 jusqu’à clôture | TODO |
| S059 | E05 | Vue exécutive sponsor simplifiée | TODO |
| S060 | E05 | Instrumentation baseline TCD et ROI | TODO |
| S061 | E06 | Contrat 4 états pour widgets critiques | TODO |
| S062 | E06 | Navigation clavier complète + focus visible | TODO |
| S063 | E06 | Conformité contraste WCAG 2.2 AA | TODO |
| S064 | E06 | Responsive 360/768/1366/1920 sans perte décisionnelle | TODO |
| S065 | E06 | Liaison captures UX et verdicts G4-UX | TODO |
| S066 | E06 | UX debt lane et plan de réduction | TODO |
| S067 | E06 | Glossaire BMAD contextuel intégré | TODO |
| S068 | E06 | Lint design tokens anti-style rogue | TODO |
| S069 | E06 | Catalogue microcopie PASS/CONCERNS/FAIL | TODO |
| S070 | E06 | Préférences motion (prefers-reduced-motion) | TODO |
| S071 | E06 | Harnais de tests usability rapides | TODO |
| S072 | E06 | Tableau de bord régressions UX | TODO |
| S073 | E07 | Dashboards personnalisés par rôle | TODO |
| S074 | E07 | File d’actions priorisées contextualisées | TODO |
| S075 | E07 | Notification center multisévérité | TODO |
| S076 | E07 | Throttling/dedup anti-fatigue | TODO |
| S077 | E07 | Mesure SLA phase complete -> notify | TODO |
| S078 | E07 | Threads commentaires liés aux décisions | TODO |
| S079 | E07 | Mentions directes + escalade sévérité | TODO |
| S080 | E07 | Timeline inter-rôles des événements clés | TODO |
| S081 | E07 | Indice de fatigue notifications | TODO |
| S082 | E07 | Reporting ack critique < 10 min | TODO |
| S083 | E07 | Permissions collaboration orientées rôle | TODO |
| S084 | E07 | Playbooks communication de crise | TODO |
| S085 | E08 | Switcher projet avec confirmation contextuelle | TODO |
| S086 | E08 | Blocage écriture cross-project | TODO |
| S087 | E08 | Service de contexte signé | TODO |
| S088 | E08 | Connecteur Jira read-only | TODO |
| S089 | E08 | Connecteur Linear read-only | TODO |
| S090 | E08 | Gestion secrets connecteurs en vault | TODO |
| S091 | E08 | RBAC scoping par projet actif | TODO |
| S092 | E08 | Segmentation vues multi-projets | TODO |
| S093 | E08 | Gestion incidents mismatch de contexte | TODO |
| S094 | E08 | Monitoring santé connecteurs | TODO |
| S095 | E08 | Scheduler synchronisation read-first | TODO |
| S096 | E08 | Assistant onboarding nouveau projet | TODO |
| S097 | E09 | Connecteur Notion pour preuves référencées | TODO |
| S098 | E09 | Ingestion rapports tests CI (unit/int/e2e/coverage) | TODO |
| S099 | E09 | Ingestion rapports vulnérabilités | TODO |
| S100 | E09 | Export bundles md/pdf/json | TODO |
| S101 | E09 | API reporting externe contrôlée | TODO |
| S102 | E09 | Backup/restauration configurations critiques | TODO |
| S103 | E09 | Profil déploiement self-host sécurisé | TODO |
| S104 | E09 | Politique rétention/purge par type de donnée | TODO |
| S105 | E09 | Contrôle export par rôle et policy | TODO |
| S106 | E09 | Classification et tagging des données | TODO |
| S107 | E09 | Pack preuves conformité automatisé | TODO |
| S108 | E09 | Checklist hardening enterprise pilote | TODO |
| S109 | E10 | Registre versionné des contrats API/events | TODO |
| S110 | E10 | Contract tests obligatoires Gate/Command/Data | TODO |
| S111 | E10 | SLI latence read-models critiques | TODO |
| S112 | E10 | Optimisation recherche artefacts p95 | TODO |
| S113 | E10 | Rebuild projections bulk < 60s | TODO |
| S114 | E10 | Indexation delta + cache intelligent | TODO |
| S115 | E10 | Contrôles qualité données projection | TODO |
| S116 | E10 | Backpressure queue ingestion workers | TODO |
| S117 | E10 | Dashboard capacity planning | TODO |
| S118 | E10 | Alertes FinOps budgets et dérives | TODO |
| S119 | E10 | Automatisation SLO/error-budget | TODO |
| S120 | E10 | Suite benchmarks performance continue | TODO |
| S121 | E11 | Mode stale-but-available piloté | TODO |
| S122 | E11 | Runbooks DR/backup/restore testés | TODO |
| S123 | E11 | Redaction automatique des secrets logs | TODO |
| S124 | E11 | Workflow révocation accès < 24h | TODO |
| S125 | E11 | Vérification intégrité audit logs quotidienne | TODO |
| S126 | E11 | Routage alertes incidents critiques | TODO |
| S127 | E11 | Chaos tests retries + DLQ ingestion | TODO |
| S128 | E11 | Bibliothèque runbooks + game days | TODO |
| S129 | E11 | Audit conformité rétention/export | TODO |
| S130 | E11 | Tracker SLA remédiation vulnérabilités | TODO |
| S131 | E11 | Hardening self-host security baseline | TODO |
| S132 | E11 | Comité gouvernance overrides sécurité | TODO |
| S133 | E12 | Générateur checklist readiness H10 | TODO |
| S134 | E12 | Compilateur packs preuves PASS/CONCERNS/FAIL | TODO |
| S135 | E12 | Board scope freeze MUST/SHOULD/COULD | TODO |
| S136 | E12 | Matrice sign-off nominative inter-rôles | TODO |
| S137 | E12 | Publication baseline TCD/AQCD Sprint 1 | TODO |
| S138 | E12 | Plan rollout pilote 30/60/90 jours | TODO |
| S139 | E12 | Kit conduite du changement par rôle | TODO |
| S140 | E12 | Parcours onboarding accéléré (<14 jours) | TODO |
| S141 | E12 | Tracker concerns ACT-01..ACT-08 | TODO |
| S142 | E12 | Atelier simulation go/no-go H10 | TODO |
| S143 | E12 | Boucle feedback post-go-live | TODO |
| S144 | E12 | Contrat de handoff final vers H10 | TODO |

## Quality Gates obligatoires
- [ ] lint
- [ ] typecheck
- [ ] tests unit/intégration
- [ ] tests e2e
- [ ] tests cas limites (edge)
- [ ] coverage >= seuil
- [ ] security scan dépendances
- [ ] build

## Règle Story DONE
- Interdit de passer DONE si un seul gate échoue (technique OU UX).
- Audit UX obligatoire: `_bmad-output/implementation-artifacts/ux-audits/<SID>-ux-audit.json` avec verdict PASS.
- Utiliser `bash scripts/story-done-guard.sh <SID>` pour valider la fin.

## UX Gates obligatoires
- [ ] conformité design-system (tokens, spacing, typo, composants)
- [ ] accessibilité WCAG 2.2 AA (minimum)
- [ ] responsive (mobile/tablet/desktop)
- [ ] états d'interface (loading/empty/error/success)
- [ ] hiérarchie visuelle et lisibilité
- [ ] evidence UX fournie (captures/rapports)

## Status
TODO
