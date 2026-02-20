---
title: "H05 — Spécification UX approfondie et actionnable: Dashboard OpenClaw"
phase: "H05"
project: "dashboard-openclaw"
date: "2026-02-20"
workflowType: "BMAD Planning - UX Specification"
executionMode: "agent-by-agent + file-by-file"
referenceBenchmark: "https://github.com/XdreaMs404/ExempleBMAD"
qualityTarget: "G2-ready, transférable vers H06/H07/H08, orienté réduction TCD"
owners:
  ux: "UX Designer BMAD"
  product: "PM BMAD"
  qa: "UX QA Lead"
  architecture: "Architecte Plateforme"
stepsCompleted:
  - "Lecture complète des contraintes BMAD H01→H23 et des gates G1→G5"
  - "Lecture du protocole BMAD Ultra Quality et extraction des obligations H05"
  - "Analyse du brainstorming H01 (personas, JTBD, opportunités, hypothèses)"
  - "Analyse des patterns d’implémentation H02 (architecture data, observabilité, sécurité)"
  - "Analyse du benchmark concurrentiel H02 pour calibrer différenciation UX"
  - "Analyse du registre risques/contraintes H02 et sélection des garde-fous UX"
  - "Analyse du PRD H04 (FR/NFR/AC) et traduction en contraintes UI exploitables"
  - "Analyse de l’écart qualité vs référence ExempleBMAD et relèvement du niveau de détail"
  - "Conception de l’architecture de l’information et des parcours par rôle"
  - "Définition des states UI complets, design tokens, responsive et Accessibilité"
  - "Formalisation des règles de microcopie décisionnelle et garde-fous actions sensibles"
  - "Préparation du handoff structuré H06/H07/H08 avec décisions transférables"
inputDocuments:
  - "/root/.openclaw/workspace/docs/BMAD-HYPER-ORCHESTRATION-THEORY.md"
  - "/root/.openclaw/workspace/docs/BMAD-ULTRA-QUALITY-PROTOCOL.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/brainstorming-report.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/implementation-patterns.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/competition-benchmark.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/risks-constraints.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/prd.md"
  - "/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts/research/exemplebmad-analysis-2026-02-20.md"
---

# UX Specification — Dashboard OpenClaw

Ce document est la **source de vérité UX H05** pour Dashboard OpenClaw.
Il traduit la stratégie produit H04 en comportements UI mesurables et testables, sans ambiguïtés pour H06, H07 et H08.
La référence qualité explicitement visée est: https://github.com/XdreaMs404/ExempleBMAD.

## 1. Contexte H05, mandat UX et critères de succès

Le produit n’est pas un dashboard de monitoring générique.
Le produit est une **Control Tower de décision** qui doit réduire le Time-to-confident-decision (TCD) tout en gardant une traçabilité de preuve.

Objectif UX principal en phase H05:
- rendre les décisions phase/gate possibles en moins de 90 secondes pour les profils opérationnels;
- rendre les décisions contestables (preuve manquante, contexte ambigu, statut incomplet) immédiatement visibles;
- transformer chaque signal critique en action explicite (owner, délai, commande ou tâche).

| ID objectif UX | Description | Baseline PRD/H02 | Cible UX V1 | Méthode de validation |
|---|---|---|---|---|
| UX-OBJ-01 | Réduction TCD sur décision de gate | baseline à instrumenter | -30% minimum | test modéré sur cas réels PM/Orchestrateur |
| UX-OBJ-02 | Zéro faux DONE lié à oubli G4-UX | incidents historiques non consolidés | 0 faux DONE sur 2 sprints | vérification dual gate + audit UX QA |
| UX-OBJ-03 | Compréhension sponsor AQCD | lecture difficile aujourd’hui | >=80% compréhension en <3 min | test de compréhension scénarisé |
| UX-OBJ-04 | Fiabilité des actions sensibles | risque S01/S03/S05 élevé | 0 action critique sans garde-fou | tests e2e sécurité UX |
| UX-OBJ-05 | Lisibilité du contexte projet actif | incidents cross-project à prévenir | 0 confusion contexte sur actions write | tests de changement projet + confirmation |
| UX-OBJ-06 | Couverture états UI critiques | hétérogène dans outils du marché | 100% loading/empty/error/success | checklist G4-UX + screenshots |
| UX-OBJ-07 | Accessibilité opérationnelle | besoin explicite PRD NFR-030 | score >=85, 0 blocker WCAG | audit auto + revue manuelle |
| UX-OBJ-08 | Adoption role-based | surcharge d’une vue unique | >=60% activation pilote S3 | analytics usage par persona |

Conséquence directe: toute décision UX qui augmente la charge cognitive sans accélérer une décision réelle est rejetée.

## 2. Synthèse décisionnelle des entrées obligatoires

Les huit documents d’entrée convergent sur un point: il faut une interface orientée **décision + preuve + action**, et non une accumulation de widgets.

| Source | Signal extrait | Implication UX directe | Risque évité |
|---|---|---|---|
| BMAD-HYPER-ORCHESTRATION-THEORY.md | G4 = G4-T + G4-UX bloquant | Affichage côte-à-côte, dépendance explicite, statut global non ambigu | faux DONE technique-only |
| BMAD-ULTRA-QUALITY-PROTOCOL.md | agent/fichier/trace obligatoires | UI qui expose metadata, provenance, trace d’exécution | handoff implicite et non auditable |
| brainstorming-report.md | douleur principale: vision fragmentée et TCD long | architecture d’information centrée “next decision” | dispersion cognitive |
| implementation-patterns.md | AP-07 role-centric + AP-16 dry-run diff | vues par rôle et flux d’action sécurisés | erreurs d’exécution et adoption faible |
| competition-benchmark.md | trou marché sur dual gate + decision runtime | prioriser Gate Center + Evidence Graph | confusion “dashboard observabilité” |
| risks-constraints.md | top risques: S03, S01, T07, M02 | garde-fous UI critiques + instrumentation ROI | risque sécurité/process non maîtrisé |
| prd.md | FR-001..082 + NFR-001..040 | matrice de traçabilité FR/NFR vers composants UX | ambiguïtés de livraison H06/H08 |
| exemplebmad-analysis-2026-02-20.md | exigence de profondeur et traçabilité supérieure | densité documentaire, décisions testables, tables actionnables | livrable superficiel |

Décision H05: la homepage n’est pas un “overview vanity”, c’est une **Action Queue priorisée par rôle**.

## 3. Principes UX non négociables (conformité BMAD + PRD)

| Principe | Règle UX | Indicateur de conformité | Handoff cible |
|---|---|---|---|
| UX-P01 Décision avant visualisation | Chaque carte critique propose une action immédiate, pas seulement une métrique. | 100% cartes critiques avec CTA primaire | H06/H08 |
| UX-P02 Evidence-first | Une décision sans preuve liée est visuellement incomplète et non validable. | badge “preuve manquante” présent et bloquant | H06/H07 |
| UX-P03 Dual gate explicite | G4-T et G4-UX sont visibles, corrélés, et hiérarchisés. | aucune vue ne masque un sous-gate | H06/H08 |
| UX-P04 Sécurité par défaut | Les actions sensibles démarrent en dry-run. | 100% parcours sensibles avec simulation | H06/H08 |
| UX-P05 Contexte projet protégé | Le projet actif est toujours visible et confirmé avant write. | 0 write sans contexte explicite | H06/H08 |
| UX-P06 Role-centric | La densité et le wording varient selon persona. | presets par rôle disponibles | H06 |
| UX-P07 Accessibilité intrinsèque | Le parcours clavier est complet et testé. | 0 blocker a11y sur parcours critiques | H06/H07 |
| UX-P08 Progressive disclosure | Les détails avancés se déplient à la demande. | TCD médian <= 90 s sur PER-01 | H06 |
| UX-P09 Stale visible | Toute donnée possiblement ancienne porte un horodatage et un état. | 100% vues dérivées avec fraîcheur affichée | H08 |
| UX-P10 Microcopie opérationnelle | Le texte guide la décision et le risque, pas le jargon. | test compréhension >= 85% | H06/H07 |
| UX-P11 Auditabilité UX | Les preuves UX sont liées au gate concerné. | trace G4-UX accessible en 1 clic | H06/H08 |
| UX-P12 Réversibilité | Toute action critique indique rollback/contingence. | 100% actions critiques documentent rollback | H08 |

Règle d’arbitrage: en cas de conflit entre esthétique et sécurité opérationnelle, la sécurité opérationnelle prime.

## 4. Architecture de l’information (IA globale)

L’architecture de l’information suit un modèle à trois niveaux: **Décider → Vérifier → Agir**.

### 4.1 Carte IA de niveau 1
| Niveau 1 | But décisionnel | Modules niveau 2 | Persona principal |
|---|---|---|---|
| Décider | savoir quoi faire maintenant | Action Queue, Gate Center, Risk Radar | Orchestrateur, PM |
| Vérifier | confirmer preuve, qualité, contexte | Evidence Graph, Artifact Explorer, UX Evidence Lens | PM, Architecte, UX QA, TEA |
| Agir | exécuter sans risque et tracer | Command Console, Project Switcher, Export Bundle | Orchestrateur, Security, TEA |

### 4.2 Arborescence produit (niveau 2/3)
- Dashboard
  - Action Queue
  - Pipeline Board (H01→H23)
  - Gate Center (G1→G5 + G4-T/G4-UX)
- Evidence
  - Artifact Explorer
  - Decision Graph
  - UX Evidence Lens
- Quality
  - AQCD Cockpit
  - Risk Radar
  - Readiness Predictor
- Commandes
  - Command Catalog
  - Dry-run Preview
  - Apply Confirmation
- Collaboration
  - Notification Hub
  - Timeline inter-rôles
- Admin
  - Project Switcher
  - Policies & RBAC (lecture selon rôle)
  - Export & rétention

### 4.3 Invariants IA
- invariant IA-01: “projet actif” persisté dans le header global;
- invariant IA-02: bouton “preuves” disponible dans tout détail de décision;
- invariant IA-03: un seul CTA primaire par carte critique;
- invariant IA-04: le statut le plus grave est toujours visible sans scroll;
- invariant IA-05: aucun écran critique sans état de fraîcheur des données.

## 5. Navigation et structures d’écrans par rôle

La navigation n’est pas personnalisée “cosmétique”; elle est personnalisée selon les décisions attendues par persona.

| Rôle | Vue d’accueil par défaut | 3 actions prioritaires | Signaux critiques en tête |
|---|---|---|---|
| Orchestrateur (PER-01) | Action Queue + Gate Center | passer phase, traiter FAIL, valider notify | gate FAIL, notify manquant, risque critique |
| PM Produit (PER-02) | PRD Quality Lens + Artifact Explorer | lever ambiguïté FR, assigner correction, préparer handoff | FR sans preuve, AC non testable, gap UX |
| Architecte (PER-03) | Readiness + Risks Tech | valider faisabilité, arbitrer ADR, corriger dépendance | dette structurelle, latence, contrat cassé |
| TEA / QA Lead (PER-04) | Technical Evidence Lens | vérifier tests, qualifier gate, déclencher remediation | flakiness, coverage, fail critique |
| UX QA Lead (PER-05) | UX Evidence Lens + G4-UX | auditer a11y, valider states, bloquer DONE | blocker WCAG, état manquant, incohérence responsive |
| Scrum Master (PER-07) | Story Timeline | prioriser correction, suivre mitigation, replanifier | concerns vieillissants, backlog mitigation |
| Sponsor/Ops (PER-06) | Executive AQCD | comprendre dérive, arbitrer budget, décider cadence | TCD en hausse, coût/waste, faux DONE |
| Security/Admin (PER-08) | Policy & Command Audit | valider override, révoquer accès, analyser incident | write hors policy, tentative injection, export sensible |

### 5.1 Règles de navigation globale
- raccourci clavier `g g` ouvre Action Queue;
- raccourci clavier `g p` ouvre Pipeline Board;
- raccourci clavier `g c` ouvre Command Console;
- raccourci clavier `?` ouvre le glossaire BMAD contextuel;
- fil d’Ariane systématique pour éviter la perte de contexte.

## 6. Parcours utilisateurs détaillés par rôle (end-to-end)

### Parcours PER-01 Orchestrateur
| Moment | Description |
|---|---|
| Déclencheur | Une phase vient de finir et un passage est envisagé. |
| Étape 1 | Ouvrir Action Queue et filtrer sur criticité = haute. |
| Étape 2 | Lire Gate Center et vérifier G2/G3 selon contexte. |
| Étape 3 | Contrôler présence de preuves minimales et metadata ULTRA. |
| Étape 4 | Si blocage: assigner action + owner + échéance en 1 interaction. |
| Étape 5 | Si prêt: lancer script recommandé en dry-run puis confirmer. |
| Sortie | Décision tracée: go/no-go avec preuve et journal horodaté. |

### Parcours PER-02 PM Produit
| Moment | Description |
|---|---|
| Déclencheur | Une ambiguïté PRD ou UX ralentit H07/H08. |
| Étape 1 | Naviguer vers PRD Quality Lens depuis Action Queue. |
| Étape 2 | Ouvrir FR concerné et ses preuves liées. |
| Étape 3 | Comparer versions artefact avant/après correction. |
| Étape 4 | Valider impact sur AC et sur risques associés. |
| Étape 5 | Publier décision de cadrage avec microcopie normalisée. |
| Sortie | Handoff prêt vers H07/H08 avec ambiguïté levée. |

### Parcours PER-03 Architecte
| Moment | Description |
|---|---|
| Déclencheur | Préparation de H08, doute sur faisabilité ou résilience. |
| Étape 1 | Ouvrir Readiness Predictor et facteurs contributifs. |
| Étape 2 | Examiner risques T01/T04/T05 et dépendances D06/D07. |
| Étape 3 | Vérifier exigences UX bloquantes qui impactent architecture. |
| Étape 4 | Consulter Evidence Graph pour tracer cause racine. |
| Étape 5 | Documenter décision ADR liée au risque dominant. |
| Sortie | Décision technique alignée UX + sécurité + performance. |

### Parcours PER-04 TEA / QA Lead
| Moment | Description |
|---|---|
| Déclencheur | Un gate G4-T ou G4 global est en CONCERNS. |
| Étape 1 | Ouvrir Technical Evidence Lens sur story ciblée. |
| Étape 2 | Lire couverture, flakiness, et preuve de test clé. |
| Étape 3 | Vérifier corrélation avec G4-UX et états UI critiques. |
| Étape 4 | Créer plan correctif avec priorité et échéance. |
| Étape 5 | Rejouer vérification après correction. |
| Sortie | Verdict qualité traçable sans faux PASS. |

### Parcours PER-05 UX QA Lead
| Moment | Description |
|---|---|
| Déclencheur | Story candidate DONE mais doute sur UX. |
| Étape 1 | Ouvrir UX Evidence Lens filtré sur story. |
| Étape 2 | Vérifier loading/empty/error/success sur vue critique. |
| Étape 3 | Vérifier Accessibilité: focus, labels, contraste, clavier. |
| Étape 4 | Vérifier responsive sur mobile/tablette/desktop. |
| Étape 5 | Publier verdict G4-UX PASS/CONCERNS/FAIL + preuves. |
| Sortie | DONE autorisé seulement si dual gate complet. |

### Parcours PER-07 Scrum Master
| Moment | Description |
|---|---|
| Déclencheur | Backlog de corrections et mitigations augmente. |
| Étape 1 | Ouvrir Story Timeline et trier par risque/ancienneté. |
| Étape 2 | Identifier actions bloquantes non assignées. |
| Étape 3 | Affecter owner et intégrer sprint courant. |
| Étape 4 | Suivre SLA de résolution concerns. |
| Étape 5 | Mettre à jour statut avec preuve de clôture. |
| Sortie | Flux story stabilisé et rework réduit. |

### Parcours PER-06 Sponsor/Ops
| Moment | Description |
|---|---|
| Déclencheur | Revue hebdo de la performance du dispositif. |
| Étape 1 | Ouvrir Executive AQCD en mode synthèse. |
| Étape 2 | Comparer tendance TCD, coûts, qualité, design. |
| Étape 3 | Consulter 3 risques principaux et plans de mitigation. |
| Étape 4 | Valider décision budgétaire/cadence. |
| Étape 5 | Demander audit bundle si décision sensible. |
| Sortie | Arbitrage explicite valeur/coût/risque. |

### Parcours PER-08 Security/Admin
| Moment | Description |
|---|---|
| Déclencheur | Tentative d’override ou alerte sécurité élevée. |
| Étape 1 | Ouvrir Policy & Command Audit. |
| Étape 2 | Vérifier acteur, rôle, root actif, commande, justification. |
| Étape 3 | Autoriser/refuser selon policy et criticité. |
| Étape 4 | Si incident: activer kill-switch et lancer runbook. |
| Étape 5 | Journaliser et notifier les parties prenantes. |
| Sortie | Traçabilité sécurité complète et réversible. |

## 7. Modèle d’écrans critiques et contrats de contenu

| Écran | Objectif UX | Composants obligatoires | Règle d’action primaire | Erreur à éviter |
|---|---|---|---|---|
| Action Queue | Prioriser l’action immédiate | liste triée par criticité, owner, délai, preuve | 1 CTA primaire par item | afficher trop de CTA concurrents |
| Pipeline Board | Comprendre le flux H01→H23 | timeline phases, statut, durée, prérequis | cliquer phase = détail et blocage | masquer condition de blocage |
| Gate Center | Décider go/no-go | G1→G5 + sous-gates + preuves | action corrective contextualisée | verdict sans justification |
| SubGate Panel | Clarifier G4-T vs G4-UX | comparatif, score, checks manquants | “ouvrir preuve manquante” | fusionner tech/UX en une seule couleur |
| Artifact Explorer | Retrouver preuve rapidement | recherche, filtres, sections H2/H3, diff | ouvrir en contexte décision | recherche sans filtre par phase |
| Evidence Graph | Justifier une décision | nœuds décision/preuve/gate/commande | centrer sur décision active | graphe illisible non filtrable |
| Command Catalog | Exécuter sans surprise | catalogue allowlist, paramètres contrôlés | démarrer en dry-run | exécuter directement en apply |
| Dry-run Preview | Vérifier l’impact | fichiers touchés, diff, risques | confirmer ou annuler | preview incomplète |
| Apply Confirmation | Sécuriser write critique | confirmation contextualisée, phrase de consentement | exécuter avec double check | confirmation trop légère |
| Risk Radar | Prioriser risques | heatmap, score, owner, échéance | ouvrir mitigation | risque sans owner visible |
| AQCD Cockpit | Arbitrer valeur/coût/qualité/design | score, tendance, explication formule | lancer plan correctif ciblé | score opaque sans source |
| Notification Hub | Gérer le flux d’alertes | priorité, regroupement, ack, SLA | traiter critiques d’abord | fatigue d’alertes non filtrées |
| Project Switcher | Prévenir cross-project | projet actif visible, confirmation write | verrouiller contexte | contexte caché |
| Export Bundle | Préparer audit | format, périmètre, filtre sécurité | générer bundle traçable | export non filtré par rôle |
| Onboarding Wizard | Réduire time-to-value | setup 3 étapes par rôle | valider premier parcours | onboarding générique non contextualisé |

### 7.1 Contrat de contenu minimum pour chaque écran critique
- Titre orienté décision (“Que dois-je faire maintenant ?”).
- Sous-titre orienté preuve (“Pourquoi cette action est prioritaire ?”).
- Bloc “Risque si inaction”.
- Bloc “Preuves reliées”.
- Bloc “Action recommandée” avec owner par défaut.

## 8. Design tokens et système visuel opérationnel

Les tokens ci-dessous sont des contraintes de build, pas des suggestions.

### 8.1 Couleurs sémantiques
| Token | Valeur | Usage | Règle d’accessibilité |
|---|---|---|---|
| color.surface.default | #0F1115 | fond principal cockpit | contraste texte >= 12:1 avec texte primaire |
| color.surface.elevated | #151923 | cartes et panneaux | maintenir séparation via ombre faible + bordure |
| color.surface.muted | #1C2230 | zones secondaires | éviter pour contenu critique |
| color.text.primary | #F4F6FB | texte principal | jamais en dessous de 16px sur blocs denses |
| color.text.secondary | #C5CBDA | texte descriptif | contraste >= 7:1 sur fond principal |
| color.text.inverse | #0B0D12 | texte sur fond clair/alerte info | vérifier contraste sur badges |
| color.status.pass | #1DB954 | PASS | ne jamais coder l’état uniquement par couleur |
| color.status.concerns | #F5A524 | CONCERNS | ajouter icône + libellé explicite |
| color.status.fail | #E5484D | FAIL | priorité visuelle maximale + alerte sonore optionnelle |
| color.status.info | #3B82F6 | infos non bloquantes | pas de conflit avec actions primaires |
| color.status.stale | #7C8599 | données dégradées/stale | toujours couplé à timestamp |
| color.action.primary | #5B8CFF | CTA principal | contraste >= 4.5:1 sur bouton |
| color.action.primary.hover | #7AA2FF | survol CTA | transition <= 120ms |
| color.action.danger | #FF4D4F | action destructive | uniquement avec confirmation forte |
| color.border.default | #2A3244 | délimitation neutre | conserver 1px cohérent |
| color.focus.ring | #9CC2FF | focus visible | épaisseur min 2px, offset 2px |
| color.chart.autonomy | #60A5FA | AQCD autonomie | palette daltonisme-safe |
| color.chart.quality | #34D399 | AQCD qualité | palette daltonisme-safe |
| color.chart.cost | #F59E0B | AQCD coût | palette daltonisme-safe |
| color.chart.design | #F472B6 | AQCD design | palette daltonisme-safe |

### 8.2 Typographie
| Token | Valeur | Usage |
|---|---|---|
| font.family.base | Inter, system-ui, sans-serif | texte interface |
| font.family.mono | JetBrains Mono, monospace | chemins, commandes, IDs |
| font.size.12 | 12px / 16px | métadonnées secondaires |
| font.size.14 | 14px / 20px | texte standard dense |
| font.size.16 | 16px / 24px | texte standard confortable |
| font.size.18 | 18px / 26px | sous-titre section |
| font.size.20 | 20px / 28px | titre panneau |
| font.size.24 | 24px / 32px | titre écran |
| font.weight.medium | 500 | labels et boutons |
| font.weight.semibold | 600 | titre de cartes critiques |

### 8.3 Espacement et grille
| Token | Valeur | Usage typique |
|---|---|---|
| space.2 | 2px | séparations micro |
| space.4 | 4px | alignement label/icône |
| space.8 | 8px | micro-gaps composants |
| space.12 | 12px | marge interne cartes compactes |
| space.16 | 16px | marge interne standard |
| space.20 | 20px | séparation sections denses |
| space.24 | 24px | séparation sections principales |
| space.32 | 32px | respiration de layout desktop |
| radius.6 | 6px | champs, badges |
| radius.10 | 10px | cartes standards |
| radius.14 | 14px | panneaux larges |
| border.1 | 1px | bordure default |

### 8.4 Motion et feedback
| Token | Valeur | Règle |
|---|---|---|
| motion.fast | 120ms ease-out | hover/focus |
| motion.base | 180ms ease-out | ouverture panneau |
| motion.slow | 260ms ease-in-out | transition layout responsive |
| motion.attention | 420ms pulse (1x) | uniquement alerte critique |
| motion.reduce | 0ms | activé si prefers-reduced-motion |

Token policy: toute variation locale doit être convertie en token avant merge.

## 9. Règles de densité d’information et hiérarchie visuelle

La densité est pilotée par rôle et par contexte (normal vs incident).

| Mode densité | Hauteur ligne table | Cartes simultanées recommandées | Nombre de KPI au-dessus de la ligne de flottaison | Cas d’usage |
|---|---:|---:|---:|---|
| Compact | 32px | 6 à 8 | 6 max | opérateurs experts, incident actif |
| Standard | 40px | 4 à 6 | 4 max | usage quotidien PM/SM/TEA |
| Confort | 48px | 3 à 4 | 3 max | sponsor, onboarding, revue hebdo |

### 9.1 Règles de priorité visuelle
- règle DV-01: une seule alerte rouge dominante par viewport;
- règle DV-02: toute carte critique expose un “risque si inaction”;
- règle DV-03: si deux signaux sont critiques, trier par impact business puis par urgence;
- règle DV-04: les éléments secondaires restent en retrait chromatique (texte secondaire + surface muted);
- règle DV-05: utiliser les zones collapsibles pour les détails techniques non nécessaires à la décision immédiate.

### 9.2 Limites de charge cognitive
- max 7 éléments interactifs dans une carte décisionnelle;
- max 3 niveaux hiérarchiques visibles simultanément;
- max 90 caractères pour un libellé d’alerte principale;
- max 2 scrolls verticaux avant accès au CTA principal;
- interdiction des tableaux sans sticky header sur vues > 8 lignes.

## 10. Responsive et comportement multi-écrans

Le responsive suit une logique de continuité de décision: même décision possible sur mobile/tablette/desktop, avec profondeur adaptée.

| Breakpoint | Largeur | Layout | Navigation | Priorité de contenu |
|---|---|---|---|---|
| XS | 360–479 | 1 colonne | bottom tabs + drawer | alertes critiques, action queue courte |
| SM | 480–767 | 1 colonne enrichie | top bar + drawer | action queue, gate status, CTA principal |
| MD | 768–1023 | 2 colonnes | sidebar compressée | gate + preuve + risque |
| LG | 1024–1439 | 3 colonnes | sidebar complète | vue complète rôle-centric |
| XL | >=1440 | 4 colonnes modulaires | sidebar + panneau contexte | analytics et détails simultanés |

| Module | XS/SM | MD | LG/XL | Invariant décisionnel |
|---|---|---|---|---|
| Action Queue | cartes compactes, 1 CTA visible | split liste/détail | liste + détail + historique | action prioritaire accessible en 1 tap |
| Pipeline Board | timeline verticale | timeline + détail phase | timeline horizontale + métriques | blocage phase toujours visible |
| Gate Center | cartes empilées | dual panel compact | dual panel complet | G4-T/G4-UX jamais fusionnés |
| Artifact Explorer | recherche + résultat mono-colonne | résultat + preview | résultat + preview + meta | preuve atteignable en <=2 interactions |
| Command Console | lecture catalogue, apply protégé | dry-run et diff côte-à-côte léger | diff complet + logs | write toujours précédé dry-run |
| Risk Radar | top 5 risques | heatmap simplifiée | heatmap complète + drilldown | owner/échéance visibles |
| AQCD Cockpit | 4 tuiles synthèse | tuiles + tendance | dashboard complet | formule explicite accessible |
| Notification Hub | fil prioritaire | fil + filtres | fil + analytics fatigue | alertes critiques en haut |

Responsive QA obligatoire: 360x800, 768x1024, 1366x768, 1920x1080.

## 11. Accessibilité (WCAG 2.2 AA et utilisabilité inclusive)

La qualité Accessibilité est bloquante au même niveau que la qualité technique pour G4-UX.

| Axe Accessibilité | Exigence | Implémentation attendue | Méthode de test |
|---|---|---|---|
| Contraste | Texte normal >= 4.5:1, grand texte >= 3:1 | tokens color.text.* contrôlés | audit auto + manuel |
| Focus visible | Focus ring évident sur tous éléments interactifs | token color.focus.ring + offset | navigation clavier |
| Clavier complet | Parcours critiques sans souris | ordre tab logique, skip links | tests clavier role-based |
| Lecteurs d’écran | Informations critiques annoncées | labels ARIA, live region pour alertes | NVDA/VoiceOver smoke tests |
| États explicites | PASS/CONCERNS/FAIL non dépendants couleur | icône + texte + aria-label | vérification manuelle |
| Formulaires | Erreurs compréhensibles et localisées | message inline + résumé en haut | test erreurs intentional |
| Timeouts | Avertir avant expiration action critique | modal de prolongation + sauvegarde draft | test UX sécurité |
| Mouvement réduit | respecter prefers-reduced-motion | motion.reduce actif | test paramètre OS |
| Cibles tactiles | minimum 44x44 px en mobile | taille boutons/menus conformes | test tactile device |
| Langue | contenu principal en FR opérationnel | attribut lang=fr + glossaire termes BMAD | revue content design |
| Structure titres | hiérarchie H1/H2/H3 cohérente | composants heading sémantiques | audit structure DOM |
| Tableaux | headers, caption, navigation clavier | table semantics complète | test reader + tab |
| Alertes critiques | annonces non intrusives mais explicites | aria-live polite/assertive selon sévérité | simulation incident |
| Historique actions | compréhensible sans mémoire implicite | timeline textuelle + horodatage clair | test utilisateur novice |
| Export audit | lisible par outils assistifs | PDF taggé + markdown structuré | audit export |

### 11.1 Critères bloquants G4-UX (Accessibilité)
- critère A11Y-B01: absence de focus visible sur un CTA critique = FAIL;
- critère A11Y-B02: contraste insuffisant sur statut critique = FAIL;
- critère A11Y-B03: impossibilité de valider une décision au clavier = FAIL;
- critère A11Y-B04: absence de libellé accessible sur contrôle principal = FAIL.

## 12. States UI complets (loading / empty / error / success)

Chaque module critique doit implémenter les 4 états. Aucun “blank screen” n’est acceptable.

| Module | Loading | Empty | Error | Success | CTA recommandé |
|---|---|---|---|---|---|
| Action Queue | skeleton 3 cartes + timestamp sync | “Aucune action prioritaire” + proposition revue hebdo | “Impossible de charger les actions” + retry | liste triée par criticité affichée | retry / ouvrir runbook |
| Pipeline Board | barre progression animée + phases placeholders | “Aucune phase détectée” + vérifier projet actif | “Lecture des phases échouée” + détail parser | timeline + phase active + durée | ouvrir détails phase |
| Gate Center | chargement cartes G1..G5 | “Aucun gate évalué” + lancer évaluation | “Moteur gate indisponible” + fallback stale | verdicts + owners + preuves | traiter concerns |
| SubGate G4 | skeleton dual panel | “Story non évaluée” | “Données G4 incomplètes” | G4-T/G4-UX + statut global | ouvrir preuves manquantes |
| Artifact Explorer | placeholder recherche + lignes résultat | “Aucun artefact trouvé” + affiner filtre | “Erreur d’indexation” + voir logs | résultat + preview + metadata | comparer versions |
| Evidence Graph | canvas loading | “Pas de liens de preuve” | “Graph indisponible” | graphe interactif et filtrable | créer lien preuve |
| Command Catalog | tableau commandes skeleton | “Aucune commande autorisée pour ce rôle” | “Catalogue inaccessible” | commandes allowlist visibles | ouvrir dry-run |
| Dry-run Preview | spinner + estimation durée | “Aucun impact détecté” | “Simulation impossible” | diff + fichiers impactés | confirmer ou annuler |
| Apply Confirmation | verification policy en cours | n/a | “Contexte non valide” | confirmation prête | saisir phrase de consentement |
| Risk Radar | heatmap skeleton | “Aucun risque actif” | “Registre risque indisponible” | heatmap + top owners | ouvrir mitigation |
| AQCD Cockpit | tuiles placeholder | “Pas assez de données AQCD” | “Calcul AQCD en échec” | scores + tendances + formule | voir recommandations |
| Notification Hub | liste skeleton | “Aucune alerte en attente” | “Canal notifications indisponible” | fil priorisé + ack | traiter critique |
| Project Switcher | chargement projets | “Aucun projet disponible” | “Impossible de vérifier contexte” | projet actif mis en évidence | confirmer changement |
| Export Bundle | progression export | “Aucun élément exportable” | “Export échoué” + code erreur | bundle prêt + hash | télécharger / partager |
| Onboarding Wizard | étape en préparation | “Aucune tâche de setup” | “Setup interrompu” | étape validée | passer étape suivante |
| Readiness Predictor | calcul score en cours | “Données insuffisantes” | “Calcul indisponible” | score + facteurs visibles | lancer action prioritaire |
| Story Timeline | events loading | “Aucun événement story” | “Timeline indisponible” | événements ordonnés | ouvrir story |
| UX Evidence Lens | captures loading | “Pas de preuve UX” | “Capture non accessible” | captures + verdicts + commentaires | lancer audit UX |
| Policy Audit | logs loading | “Aucun événement policy” | “Audit log indisponible” | journal signé + filtres | ouvrir incident |
| Integrations Hub | connecteurs loading | “Aucun connecteur actif” | “Connexion échouée” | statut connecteurs + santé | reconnecter / diagnostiquer |

Règle d’implémentation: chaque état doit contenir au minimum un message explicatif et une action possible.

## 13. Microcopie décisionnelle et content design

La microcopie doit réduire l’ambiguïté, expliciter le risque, et orienter vers l’action correcte.

| Contexte | Microcopie recommandée | Intention UX | Ton |
|---|---|---|---|
| Gate PASS | "Gate validé. Vous pouvez passer à l’étape suivante." | confirmer sans triomphalisme | neutre affirmatif |
| Gate CONCERNS | "Gate en vigilance: corriger ces points avant passage." | guider correction | direct |
| Gate FAIL | "Passage bloqué: risque critique non couvert." | empêcher action dangereuse | ferme |
| G4-T PASS / G4-UX FAIL | "DONE impossible: validation UX manquante." | supprimer faux DONE | ferme pédagogique |
| Notify manquant | "Transition bloquée: notification de phase non publiée." | rappeler protocole | explicite |
| Preuve manquante | "Décision non auditable tant qu’aucune preuve primaire n’est liée." | imposer evidence-first | formel |
| Contexte projet ambigu | "Confirmez le projet actif avant toute écriture." | prévenir cross-project | prudent |
| Dry-run prêt | "Simulation terminée. Vérifiez les fichiers touchés avant d’appliquer." | encourager vérification | pragmatique |
| Apply destructif | "Action irréversible. Saisissez CONFIRMER pour continuer." | friction utile | ferme |
| Override policy | "Override exceptionnel: justification et approbateur obligatoires." | traçabilité | conformité |
| Export sensible | "Certains éléments ont été exclus selon vos droits." | transparence sécurité | neutre |
| AQCD dérive coût | "Le coût dérive de +18%. Priorisez les actions de réduction waste." | action FinOps | orienté résultat |
| AQCD design faible | "Qualité design sous seuil. Corrigez avant prochaine clôture." | protéger UX quality | ferme |
| Readiness faible | "Readiness insuffisant: 3 blocages doivent être levés." | prioriser | direct |
| Erreur parsing | "Format document non conforme. Ouvrez le guide de correction." | éviter frustration | assistif |
| Aucun résultat recherche | "Aucun résultat. Essayez phase, type d’artefact ou owner." | relancer exploration | aidant |
| Notification critique | "Action requise sous 10 minutes." | urgence explicite | court |
| Notification mineure | "Information enregistrée. Aucune action immédiate." | réduire stress | calme |
| Mitigation en retard | "Échéance dépassée: replanifiez ou escaladez." | relancer accountability | direct |
| Story bloquée UX | "Story bloquée côté UX. Corriger états et accessibilité." | aligner DoD | opérationnel |
| Incident sécurité | "Incident sécurité actif: commandes write suspendues." | protection immédiate | critique |
| Restauration contexte | "Contexte restauré. Vérifiez les impacts avant reprise." | reprise sécurisée | prudent |
| Onboarding étape 1 | "Commencez par relier vos artefacts critiques." | time-to-value | simple |
| Onboarding étape 2 | "Choisissez votre vue par rôle pour réduire le bruit." | personnalisation utile | guidant |
| Onboarding étape 3 | "Testez un dry-run pour valider votre flux sécurisé." | adoption broker | concret |
| Succès export | "Bundle généré avec succès. Hash d’audit copié." | preuve d’achèvement | rassurant |
| Erreur export | "Export incomplet. Vérifiez droits et disponibilité du service." | correction orientée | pragmatique |
| Data stale | "Données potentiellement anciennes (mise à jour il y a 3 min)." | transparence fraîcheur | factuel |
| Kill-switch actif | "Mode sécurisé activé: seules les actions en lecture sont autorisées." | réduire risque | ferme |
| Fin de parcours | "Décision enregistrée avec preuves liées et owner assigné." | clôture claire | confiant |

Règle textuelle: préférer des phrases de 8 à 16 mots, voix active, vocabulaire opérationnel FR-first.

## 14. Garde-fous UX pour actions sensibles et sécurité de commande

Les garde-fous UX traduisent les risques S01/S02/S03/S05/P07 en interactions concrètes.

| Action sensible | Risque dominant | Garde-fou UX obligatoire | Preuve attendue en audit |
|---|---|---|---|
| Changer de projet actif | P07/S01 | modal de confirmation avec nom projet source/destination | log de confirmation contextuelle |
| Lancer commande write | S01/S03 | dry-run imposé avant bouton apply | trace dry-run puis apply |
| Supprimer artefact | S01/S08 | double confirmation + motif + rôle autorisé | journal d’approbation signé |
| Override policy | S03/S04 | justification textuelle + approbateur nominatif | audit trail immuable |
| Export bundle externe | S06/S08 | filtre de classification + preview données exportées | rapport de conformité export |
| Révoquer accès | S07 | flow assisté avec impact utilisateur | historique IAM |
| Désactiver kill-switch | S03 | validation à deux personnes (4-eyes) | événement dual-control |
| Modifier seuil gate | P06/T07 | preview impact sur stories ouvertes | diff policy versionnée |
| Marquer gate PASS | T07/P06 | check preuve minimale + check owner | décision liée à preuves |
| Ignorer alerte critique | U06/S03 | motif obligatoire + durée de snooze bornée | registre des exceptions |
| Rejouer commande échouée | S02/T06 | afficher cause + paramètre validé | historique retry borné |
| Importer source externe | T01/S05 | validation format + scan secret | rapport de validation |
| Lancer purge données | S08 | simulation volume + période + confirmation forte | reçu de purge signé |
| Rétablir backup | S01/T08 | assistant en 3 étapes avec vérif intégrité | hash avant/après |
| Clore incident sécurité | S01/S05 | checklist post-mortem obligatoire | ticket incident complet |
| Modifier RBAC | S03 | vue diff permissions avant application | preuve de revue hebdo |
| Exécuter script hors maintenance | S09 | blocage + justification + approbation | journal exception horaire |
| Forcer passage phase | P01/P06 | bannière rouge + demande sponsor/orchestrateur | log override phase |
| Valider DONE story | T07/U03 | exigence dual PASS + check evidence UX | preuve G4-T + G4-UX |
| Dépublier notification de phase | P03 | avertissement impact gate + confirmation | traçabilité notify |

### 14.1 Pattern de confirmation forte (actions critiques)
1. rappeler le contexte (projet, phase, artefacts touchés);
2. afficher le risque principal si erreur;
3. demander une action volontaire explicite (saisie d’une phrase);
4. proposer un lien “voir contingence/rollback” avant confirmation.

## 15. Notifications, priorisation et stratégie anti-fatigue

Le système de notification doit augmenter la réactivité, pas le bruit.

| Niveau | Déclencheurs types | UX d’affichage | SLA d’accusé | Escalade |
|---|---|---|---|---|
| Critique | fail gate bloquant, sécurité, cross-project write | bannière persistante + son optionnel + top inbox | <10 min | orchestrateur + security |
| Élevé | concerns non traités, mitigation en retard | carte prioritaire en Action Queue | <30 min | owner + backup owner |
| Moyen | dérive KPI modérée, stale prolongé | badge discret + regroupement | <4 h | owner local |
| Faible | info système, succès non bloquants | feed standard | <24 h | aucune escalade auto |

| Mécanisme anti-fatigue | Règle | Valeur initiale |
|---|---|---|
| Grouping | regrouper alertes similaires sur 15 min | activé |
| Throttling | max 3 alertes critiques distinctes / 5 min / rôle | activé |
| Snooze contrôlé | uniquement sur niveau moyen/faible | 30 min max |
| Digest | synthèse des alertes faibles | 2 fois/jour |
| Déduplication | même cause racine = 1 notification master | activé |

Règle UX: le bouton “Accuser réception” n’est jamais placé plus loin que 1 scroll.

## 16. Evidence Graph UX: lisibilité de la preuve et confiance décisionnelle

Le graphe doit rester compréhensible par un PM en moins de 60 secondes.

| Type de nœud | Couleur/token | Données affichées | Interaction primaire |
|---|---|---|---|
| Decision | color.chart.design | owner, statut, date, impact | ouvrir justification |
| Gate | color.status.pass/concerns/fail | verdict, sous-gates, horodatage | ouvrir panel gate |
| Artifact | color.surface.elevated | path, version, fraîcheur | ouvrir preview document |
| Command | color.action.primary | commande, acteur, résultat | ouvrir run log |
| Risk | color.action.danger | score, owner, mitigation | ouvrir fiche risque |
| KPI | color.chart.autonomy/quality/cost/design | valeur, tendance, seuil | ouvrir détail métrique |

| Interaction | Comportement attendu | Critère UX |
|---|---|---|
| Filtre par décision | réduit le graphe au voisinage utile | <= 1.5 s de réponse |
| Zoom progressif | conserve la lisibilité des labels | labels lisibles à 2 niveaux de zoom |
| Highlight chemin critique | montre le chemin preuve→décision→action | 1 clic max |
| Export snapshot | exporte la vue courante avec contexte | hash et timestamp inclus |

Anti-pattern à éviter: afficher le graphe complet par défaut (surcharge et perte de sens).

## 17. Instrumentation UX, KPI et boucle d’amélioration

Instrumentation minimale à livrer pour mesurer la valeur UX réelle:

| KPI UX | Formule | Cible | Owner | Usage décisionnel |
|---|---|---|---|---|
| ux_tcd_median | médiane(temps ouverture écran → décision enregistrée) | -30% vs baseline | PM Produit | arbitrage roadmap et densité |
| ux_action_completion_rate | actions recommandées terminées / actions proposées | >=70% | Orchestrateur | qualité des next actions |
| ux_error_recovery_time | temps moyen de retour au flux après erreur | <3 min | UX Lead | qualité des messages d’erreur |
| ux_focus_trap_incidents | nb incidents clavier bloquant | 0 | UX QA | accessibilité opérationnelle |
| ux_state_coverage | widgets critiques avec 4 états / total widgets critiques | 100% | UX QA | readiness G4-UX |
| ux_notification_fatigue_index | alertes ignorées >24h / alertes totales | <15% | UX Lead | tuning notifications |
| ux_cross_project_misclick | tentative write mauvais contexte | 0 | Security | validation garde-fous |
| ux_microcopy_clarity_score | score test compréhension microcopy | >=85% | Content Design | amélioration wording |
| ux_responsive_task_success | parcours critiques réussis sur 3 breakpoints | >=95% | UX QA | priorisation responsive debt |
| ux_a11y_blocker_count | blockers WCAG ouverts | 0 | UX QA | blocage release |

### 17.1 Événements analytics à tracer
- ev_action_queue_opened
- ev_gate_decision_submitted
- ev_evidence_link_clicked
- ev_dry_run_started
- ev_apply_confirmed
- ev_apply_cancelled
- ev_context_switch_confirmed
- ev_accessibility_shortcut_used
- ev_notification_acknowledged
- ev_notification_snoozed
- ev_bundle_export_success
- ev_bundle_export_error

Chaque événement doit inclure `project_id`, `role`, `phase`, `timestamp`, `correlation_id`.

## 18. Plan de test UX / G4-UX (pré-H10)

Le plan de test couvre l’ergonomie, la conformité Accessibilité, la résilience des états UI et la sécurité d’interaction.

| ID test | Axe | Scénario | Résultat attendu | Gate impacté |
|---|---|---|---|---|
| TC-UX-001 | Parcours | Décision go/no-go depuis Gate Center | décision possible en <90s avec preuve liée | G2/G4-UX |
| TC-UX-002 | Parcours | Blocage phase sans notify | message bloquant explicite + CTA correction | G2 |
| TC-UX-003 | Parcours | G4-T PASS et G4-UX FAIL | DONE impossible + message non ambigu | G4 |
| TC-UX-004 | Parcours | Recherche artefact par phase+owner | résultat pertinent en <2s | G2 |
| TC-UX-005 | Parcours | Comparaison 2 versions artefact | diff lisible et actionnable | G2 |
| TC-UX-006 | Parcours | Consultation Evidence Graph sur décision | chemin preuve visible en 1 clic | G2/G3 |
| TC-UX-007 | Parcours | Dry-run commande write | preview impact complète | G3/G4 |
| TC-UX-008 | Parcours | Apply commande destructive | double confirmation obligatoire | G3/G4 |
| TC-UX-009 | Parcours | Switch projet avant write | confirmation contexte visible | G2/G3 |
| TC-UX-010 | Parcours | Export bundle audit | bundle généré + hash affiché | G2/G5 |
| TC-UX-011 | State | Action Queue loading | skeleton + timestamp présents | G4-UX |
| TC-UX-012 | State | Action Queue empty | message utile + action proposée | G4-UX |
| TC-UX-013 | State | Action Queue error | erreur explicite + retry | G4-UX |
| TC-UX-014 | State | Gate Center loading | cartes placeholders cohérentes | G4-UX |
| TC-UX-015 | State | Gate Center empty | absence gate expliquée | G4-UX |
| TC-UX-016 | State | Gate Center error | fallback stale explicité | G4-UX |
| TC-UX-017 | State | Artifact Explorer error parsing | guide correction proposé | G4-UX |
| TC-UX-018 | State | Risk Radar empty | aucun risque actif expliqué | G4-UX |
| TC-UX-019 | State | AQCD indisponible | message + prochaine action | G4-UX |
| TC-UX-020 | State | Notification hub empty | pas d’alerte en attente | G4-UX |
| TC-UX-021 | Accessibilité | Navigation clavier complète Action Queue | ordre tab logique sans piège | G4-UX |
| TC-UX-022 | Accessibilité | Focus visible sur CTA critique | focus ring conforme token | G4-UX |
| TC-UX-023 | Accessibilité | Contraste statuts gate | WCAG AA respecté | G4-UX |
| TC-UX-024 | Accessibilité | Lecteur écran sur Gate Center | annonce statut et owner | G4-UX |
| TC-UX-025 | Accessibilité | ARIA labels Command Console | contrôles correctement nommés | G4-UX |
| TC-UX-026 | Accessibilité | Mode reduced motion | animations réduites sans perte info | G4-UX |
| TC-UX-027 | Accessibilité | Taille cible tactile mobile | >=44x44 sur actions critiques | G4-UX |
| TC-UX-028 | Accessibilité | Tableaux avec headers sémantiques | navigation lecteur écran fiable | G4-UX |
| TC-UX-029 | Responsive | Parcours Orchestrateur en 360x800 | décision possible sans perte critique | G4-UX |
| TC-UX-030 | Responsive | Parcours PM en 768x1024 | lecture FR+preuves confortable | G4-UX |
| TC-UX-031 | Responsive | Parcours UX QA en 1366x768 | audit states complet réalisable | G4-UX |
| TC-UX-032 | Responsive | Parcours Sponsor en 1920x1080 | synthèse AQCD lisible <3 min | G4-UX |
| TC-UX-033 | Sécurité UX | Tentative commande hors allowlist | blocage et message policy | G3/G4 |
| TC-UX-034 | Sécurité UX | Tentative override sans approbateur | blocage + champ requis | G3/G4 |
| TC-UX-035 | Sécurité UX | Tentative export hors droits | données sensibles exclues | G2/G5 |
| TC-UX-036 | Sécurité UX | Context mismatch write | write interdit + incident créé | G3/G4 |
| TC-UX-037 | Content | Compréhension microcopie gate concerns | >=85% compréhension test | G2 |
| TC-UX-038 | Content | Compréhension message stale | utilisateur distingue stale vs fail | G2 |
| TC-UX-039 | Content | Next best action claire | >=70% exécution de l’action proposée | G2 |
| TC-UX-040 | Content | Glossaire BMAD contextuel | réduction ambiguïtés termes | G2 |
| TC-UX-041 | Qualité | Cohérence design tokens | aucun token rogue détecté | G4-UX |
| TC-UX-042 | Qualité | Cohérence spacing cartes critiques | respect grille définie | G4-UX |
| TC-UX-043 | Qualité | Hiérarchie visuelle incident | alerte critique dominante | G4-UX |
| TC-UX-044 | Qualité | Performance perçue sur vue lente | skeleton + feedback progressif | G4-UX |
| TC-UX-045 | Adoption | Onboarding role-based en 3 étapes | time-to-first-value <14 jours | G2 |
| TC-UX-046 | Adoption | Activation Action Queue | >=60% des pilotes actifs | G2 |
| TC-UX-047 | Adoption | Satisfaction sponsor vue executive | score >=4/5 | G2 |
| TC-UX-048 | Adoption | Fatigue notifications contrôlée | index fatigue <15% | G2 |

Critère de passage G4-UX: 0 blocker sur Accessibilité, sécurité UX, states critiques et dual-gate semantics.

## 19. Contraintes UX exploitables PM/Architect (H06, obligatoires)

Cette section est normative pour H06: chaque contrainte doit être reprise telle quelle dans la planification (H07) et la conception architecture (H08).  
Toute implémentation qui contourne une contrainte est classée **CONCERNS** minimum.

### 19.1 Registre contraignant H06 (max 10)

| ID H06 | Contrainte UX actionnable | Standard UI obligatoire testable | Impact architecture attendu (H08) | Critère de validation planning (H07) |
|---|---|---|---|---|
| H06-UXC-01 | Le dual gate G4-T/G4-UX est visible en continu sur toute vue story et gouverne le statut global DONE. | Affichage simultané des deux sous-gates + statut agrégé = pire des deux; DONE refusé si un sous-gate ≠ PASS. | API dual-subgate stable + moteur de policy gate-first. | H07-UX-01 PASS si cas E2E `G4-T=PASS/G4-UX=FAIL` bloque DONE à 100%. |
| H06-UXC-02 | Toute action write suit un flux sécurisé non contournable. | `dry-run` par défaut → preview diff impactée → confirmation contexte projet actif → double confirmation si destructif. | Endpoints séparés simulate/apply + contexte signé + audit immutable. | H07-UX-02 PASS si 100% commandes write testées passent par dry-run et contrôle contexte. |
| H06-UXC-03 | Les widgets critiques imposent 4 états explicites. | Chaque widget critique expose loading/empty/error/success avec message utile + CTA de recovery. | Contrat de state machine front/back + schéma d’erreur normalisé. | H07-UX-03 PASS si couverture 4 états = 100% (preuve capture + tests). |
| H06-UXC-04 | L’accessibilité est bloquante, pas cosmétique. | Navigation clavier complète, focus visible tokenisé, contraste WCAG 2.2 AA, labels SR valides, cibles tactiles >=44 px mobile. | Librairie de composants accessible-by-default + tests a11y automatisés CI. | H07-UX-04 PASS si score a11y >=85 et 0 blocker critique. |
| H06-UXC-05 | Le responsive préserve la capacité de décision. | Parcours critiques validés sans perte d’information/CTA sur 360x800, 768x1024, 1366x768, 1920x1080. | Contrats breakpoints + priorisation payload décisionnel. | H07-UX-05 PASS si tests visuels multi-breakpoints verts. |
| H06-UXC-06 | Une décision de gate n’est valide qu’avec preuve et responsabilité explicites. | Carte décision affiche preuve primaire, owner, échéance, “risque si inaction”; PASS impossible sans preuve liée. | Modèle de données décision↔preuve↔owner obligatoire dans gate service. | H07-UX-06 PASS si 0 décision orpheline (owner/preuve manquants). |
| H06-UXC-07 | La microcopie est normalisée pour éviter les ambiguïtés opérationnelles. | Lexique unique PASS/CONCERNS/FAIL/STALE + messages erreur = cause + impact + action suivante. | Catalogue microcopy versionné relié aux codes d’erreur backend. | H07-UX-07 PASS si compréhension utilisateur >=85% sur tests scénarisés. |
| H06-UXC-08 | Les notifications sont pilotées par priorité et fatigue. | Throttling par rôle, regroupement des alertes similaires, escalade uniquement pour criticité haute non accusée. | Service de policy notifications (quotas, dedup, escalade). | H07-UX-08 PASS si index fatigue <15% et ack critique <10 min. |
| H06-UXC-09 | Le design system est normatif. | 0 style rogue hors tokens (couleur/spacing/typo/motion) + support `prefers-reduced-motion`. | Pipeline design tokens + lint bloquant en CI. | H07-UX-09 PASS si aucune violation token sur composants critiques. |
| H06-UXC-10 | Les stories doivent expliciter l’intention décisionnelle et les cas limites. | Template story obligatoire: rôle, déclencheur, résultat attendu, garde-fou sécurité, états, cas négatif, preuve attendue. | Schéma story + readiness validator consommable par H08/H10. | H07-UX-10 PASS si 100% stories prêtes sans champ critique manquant. |

### 19.2 Standards UI obligatoires testables (lot minimal non négociable)

| Domaine | Standard UI obligatoire | Test de conformité | Seuil bloquant |
|---|---|---|---|
| Accessibilité | WCAG 2.2 AA + clavier + focus + SR + cibles tactiles >=44 px. | Audit auto (axe/lighthouse) + revue manuelle UX QA sur parcours critiques. | **FAIL** si blocker a11y ou score <85. |
| States UI | loading/empty/error/success sur 100% modules critiques. | Tests composants + captures par état + scénario recovery. | **FAIL** si un état critique manque. |
| Responsive | 4 classes d’écran obligatoires (360, 768, 1366, 1920). | Snapshots visuels + tests interaction sur parcours PER-01/02/05/06. | **FAIL** si perte CTA/information décisionnelle. |
| Interaction sécurité | write en dry-run first, contexte signé, double confirmation destructive, blocage hors allowlist/RBAC. | E2E sécurité (cas nominal + abus) + audit logs immutable. | **FAIL** à la première exécution write non conforme. |

## 20. Mapping explicite H06 → H08 (architecture) et H07 (planning validation)

| ID H06 | Exigence architecture dérivée (H08) | Critère de vérification planning (H07) | Risques adressés (H02) |
|---|---|---|---|
| H06-UXC-01 | API dual gate + policy engine bloquant DONE | Test E2E dual gate obligatoire dans checklist H07 | T07, D05 |
| H06-UXC-02 | Broker simulate/apply séparé + contexte signé + audit trail | AC sécurité write + preuve logs dry-run/apply | S01, P07, D03 |
| H06-UXC-03 | State contracts normalisés + composants états mutualisés | Matrice états jointe à chaque story critique | U02, D09 |
| H06-UXC-04 | Component library accessible-by-default + CI a11y | Score/rapport a11y joint au paquet H07 | U03, D09 |
| H06-UXC-05 | Contrats breakpoints + stratégie adaptive layout | Captures multi-device obligatoires en review H07 | U04, D09 |
| H06-UXC-06 | Modèle décision↔preuve↔owner versionné | Vérification champs obligatoires sur gate cards | T07, P02 |
| H06-UXC-07 | Taxonomie microcopy + mapping codes erreur | Test de compréhension + revue glossaire | U05, P02 |
| H06-UXC-08 | Service notification policy-aware (priorité/dedup/escalade) | KPI fatigue + ack critique présents avant GO H08 | U06, M02 |
| H06-UXC-09 | Build tokens + lint/design contract CI | Rapport “0 rogue token” dans H07 | D09, C05 |
| H06-UXC-10 | Schéma story readiness machine-checkable | Contrôle complétude story pack avant H08 | P02, C05 |

## 21. Micro-règles de décision anti-ambiguïté (à appliquer en story grooming)

| Règle | Si… | Alors… | Effet sur statut |
|---|---|---|---|
| MR-01 | une story contient une action write sans étape dry-run explicite | la story est rejetée et renvoyée en refinement | CONCERNS H07 |
| MR-02 | un AC décrit “clair/rapide/simple” sans métrique | transformer l’AC en seuil mesurable avant estimation | BLOCKER planning |
| MR-03 | un écran critique n’a pas ses 4 états décrits | ajouter la matrice d’états dans la story | CONCERNS H07 |
| MR-04 | un parcours critique n’a pas de preuve responsive 4 breakpoints | tests visuels obligatoires avant passage review | CONCERNS H07 |
| MR-05 | owner ou échéance absent sur carte CONCERNS/FAIL | interdiction de marquer PASS/DONE | BLOCKER gate |
| MR-06 | wording PASS/CONCERNS/FAIL diverge du glossaire | corriger microcopie avant merge | CONCERNS UX |
| MR-07 | composant hors design tokens détecté | PR bloquée jusqu’à correction tokenisée | FAIL G4-UX |
| MR-08 | exception a11y demandée sans mitigation datée | exception refusée | FAIL G4-UX |
| MR-09 | décision critique sans preuve primaire liée | PASS interdit, only CONCERNS/FAIL autorisé | BLOCKER gate |
| MR-10 | impact architecture H08 non renseigné pour contrainte UX | story non “ready for architecture” | BLOCKER H08 |

Condition de passage H06: les 10 contraintes ci-dessus sont traitées comme **contrat de livraison**, non comme recommandations.

## 22. Matrice de traçabilité FR (PRD) → décisions UX

Cette matrice assure que chaque exigence fonctionnelle H04 possède une traduction UX explicite et testable.

| FR ID | Module PRD | Exigence résumée | Décision UX associée | Composant cible | Priorité | Evidence G4-UX |
|---|---|---|---|---|---|---|
| FR-001 | Workflow & Phases | Le système doit afficher la progression de phase en respectant strictement l’ordre canonique... | Rendre la séquence H01→H23 lisible, avec blocages expliqués et CTA "Corriger" immédiat. | Pipeline Board / Phase Timeline | Must | capture desktop+mobile, keyboard path, état error explicite |
| FR-002 | Workflow & Phases | Le système doit empêcher toute transition non autorisée entre phases et afficher la raison d... | Rendre la séquence H01→H23 lisible, avec blocages expliqués et CTA "Corriger" immédiat. | Pipeline Board / Phase Timeline | Must | capture desktop+mobile, keyboard path, état error explicite |
| FR-003 | Workflow & Phases | Le système doit bloquer la transition si la notification de phase n’est pas publiée dans la ... | Rendre la séquence H01→H23 lisible, avec blocages expliqués et CTA "Corriger" immédiat. | Pipeline Board / Phase Timeline | Must | capture desktop+mobile, keyboard path, état error explicite |
| FR-004 | Workflow & Phases | Le système doit afficher owner, started_at, finished_at, statut et durée pour chaque phase. | Rendre la séquence H01→H23 lisible, avec blocages expliqués et CTA "Corriger" immédiat. | Pipeline Board / Phase Timeline | Must | capture desktop+mobile, keyboard path, état error explicite |
| FR-005 | Workflow & Phases | Le système doit exiger les prérequis déclarés avant activation de la phase suivante. | Rendre la séquence H01→H23 lisible, avec blocages expliqués et CTA "Corriger" immédiat. | Pipeline Board / Phase Timeline | Must | capture desktop+mobile, keyboard path, état error explicite |
| FR-006 | Workflow & Phases | Le système doit permettre l’exécution contrôlée des scripts sequence-guard et ultra-quality-... | Rendre la séquence H01→H23 lisible, avec blocages expliqués et CTA "Corriger" immédiat. | Pipeline Board / Phase Timeline | Must | capture desktop+mobile, keyboard path, état error explicite |
| FR-007 | Workflow & Phases | Le système doit conserver un historique consultable des transitions de phase et des verdicts... | Rendre la séquence H01→H23 lisible, avec blocages expliqués et CTA "Corriger" immédiat. | Pipeline Board / Phase Timeline | Must | capture desktop+mobile, keyboard path, état error explicite |
| FR-008 | Workflow & Phases | Le système doit signaler les dépassements de SLA de transition et proposer une action correc... | Rendre la séquence H01→H23 lisible, avec blocages expliqués et CTA "Corriger" immédiat. | Pipeline Board / Phase Timeline | Must | capture desktop+mobile, keyboard path, état error explicite |
| FR-009 | Workflow & Phases | Le système doit autoriser un override exceptionnel uniquement avec justification et approbat... | Rendre la séquence H01→H23 lisible, avec blocages expliqués et CTA "Corriger" immédiat. | Pipeline Board / Phase Timeline | Must | capture desktop+mobile, keyboard path, état error explicite |
| FR-010 | Workflow & Phases | Le système doit afficher les dépendances bloquantes inter-phases et leur état en temps réel. | Rendre la séquence H01→H23 lisible, avec blocages expliqués et CTA "Corriger" immédiat. | Pipeline Board / Phase Timeline | Must | capture desktop+mobile, keyboard path, état error explicite |
| FR-011 | Gate Control | Le système doit présenter G1→G5 dans une vue unique avec statut, owner et horodatage. | Afficher le verdict de gate avec preuves minimales, owner, délai et action suivante sans quitter l’écran. | Gate Control Center | Must | capture desktop+mobile, keyboard path, état error explicite |
| FR-012 | Gate Control | Le système doit afficher G4-T et G4-UX de manière distincte et corrélée. | Afficher le verdict de gate avec preuves minimales, owner, délai et action suivante sans quitter l’écran. | Gate Control Center | Must | capture desktop+mobile, keyboard path, état error explicite |
| FR-013 | Gate Control | Le système doit calculer automatiquement PASS/CONCERNS/FAIL selon les règles de gate en vigu... | Afficher le verdict de gate avec preuves minimales, owner, délai et action suivante sans quitter l’écran. | Gate Control Center | Must | capture desktop+mobile, keyboard path, état error explicite |
| FR-014 | Gate Control | Le système doit interdire DONE si G4-T ou G4-UX n’est pas PASS. | Afficher le verdict de gate avec preuves minimales, owner, délai et action suivante sans quitter l’écran. | Gate Control Center | Must | capture desktop+mobile, keyboard path, état error explicite |
| FR-015 | Gate Control | Le système doit exiger au moins une preuve primaire liée pour toute décision de gate. | Afficher le verdict de gate avec preuves minimales, owner, délai et action suivante sans quitter l’écran. | Gate Control Center | Must | capture desktop+mobile, keyboard path, état error explicite |
| FR-016 | Gate Control | Le système doit créer une action assignée avec échéance pour chaque gate en CONCERNS. | Afficher le verdict de gate avec preuves minimales, owner, délai et action suivante sans quitter l’écran. | Gate Control Center | Must | capture desktop+mobile, keyboard path, état error explicite |
| FR-017 | Gate Control | Le système doit versionner les règles de gate et historiser les changements. | Afficher le verdict de gate avec preuves minimales, owner, délai et action suivante sans quitter l’écran. | Gate Control Center | Must | capture desktop+mobile, keyboard path, état error explicite |
| FR-018 | Gate Control | Le système doit permettre une simulation de verdict avant soumission finale du gate. | Afficher le verdict de gate avec preuves minimales, owner, délai et action suivante sans quitter l’écran. | Gate Control Center | Must | capture desktop+mobile, keyboard path, état error explicite |
| FR-019 | Gate Control | Le système doit afficher les tendances PASS/CONCERNS/FAIL par phase et par période. | Afficher le verdict de gate avec preuves minimales, owner, délai et action suivante sans quitter l’écran. | Gate Control Center | Must | capture desktop+mobile, keyboard path, état error explicite |
| FR-020 | Gate Control | Le système doit exporter un rapport de gate incluant verdict, preuves et actions ouvertes. | Afficher le verdict de gate avec preuves minimales, owner, délai et action suivante sans quitter l’écran. | Gate Control Center | Must | capture desktop+mobile, keyboard path, état error explicite |
| FR-021 | Artifact & Evidence | Le système doit ingérer les artefacts markdown et yaml des dossiers BMAD autorisés. | Permettre la recherche contextualisée des artefacts avec provenance, fraîcheur et comparaison de versions. | Artifact Explorer + Evidence Graph | Must | preuve de provenance cliquable + diff lisible + état stale |
| FR-022 | Artifact & Evidence | Le système doit vérifier la présence de stepsCompleted et inputDocuments sur les artefacts m... | Permettre la recherche contextualisée des artefacts avec provenance, fraîcheur et comparaison de versions. | Artifact Explorer + Evidence Graph | Must | preuve de provenance cliquable + diff lisible + état stale |
| FR-023 | Artifact & Evidence | Le système doit extraire sections H2/H3 pour permettre une navigation structurée. | Permettre la recherche contextualisée des artefacts avec provenance, fraîcheur et comparaison de versions. | Artifact Explorer + Evidence Graph | Must | preuve de provenance cliquable + diff lisible + état stale |
| FR-024 | Artifact & Evidence | Le système doit indexer les tableaux markdown pour requêtes ciblées. | Permettre la recherche contextualisée des artefacts avec provenance, fraîcheur et comparaison de versions. | Artifact Explorer + Evidence Graph | Must | preuve de provenance cliquable + diff lisible + état stale |
| FR-025 | Artifact & Evidence | Le système doit fournir une recherche plein texte avec filtrage instantané par type d’artefact. | Permettre la recherche contextualisée des artefacts avec provenance, fraîcheur et comparaison de versions. | Artifact Explorer + Evidence Graph | Must | preuve de provenance cliquable + diff lisible + état stale |
| FR-026 | Artifact & Evidence | Le système doit filtrer par phase, agent, date, gate, owner et niveau de risque. | Permettre la recherche contextualisée des artefacts avec provenance, fraîcheur et comparaison de versions. | Artifact Explorer + Evidence Graph | Must | preuve de provenance cliquable + diff lisible + état stale |
| FR-027 | Artifact & Evidence | Le système doit comparer deux versions d’un artefact et souligner les changements structurants. | Permettre la recherche contextualisée des artefacts avec provenance, fraîcheur et comparaison de versions. | Artifact Explorer + Evidence Graph | Must | preuve de provenance cliquable + diff lisible + état stale |
| FR-028 | Artifact & Evidence | Le système doit visualiser les liens entre artefacts, décisions, gates et commandes. | Permettre la recherche contextualisée des artefacts avec provenance, fraîcheur et comparaison de versions. | Artifact Explorer + Evidence Graph | Must | preuve de provenance cliquable + diff lisible + état stale |
| FR-029 | Artifact & Evidence | Le système doit lister tous les artefacts qui justifient une décision donnée. | Permettre la recherche contextualisée des artefacts avec provenance, fraîcheur et comparaison de versions. | Artifact Explorer + Evidence Graph | Must | preuve de provenance cliquable + diff lisible + état stale |
| FR-030 | Artifact & Evidence | Le système doit marquer explicitement la fraîcheur/staleness des vues dérivées. | Permettre la recherche contextualisée des artefacts avec provenance, fraîcheur et comparaison de versions. | Artifact Explorer + Evidence Graph | Must | preuve de provenance cliquable + diff lisible + état stale |
| FR-031 | Artifact & Evidence | Le système doit expliquer les erreurs de parsing avec recommandations de correction. | Permettre la recherche contextualisée des artefacts avec provenance, fraîcheur et comparaison de versions. | Artifact Explorer + Evidence Graph | Must | preuve de provenance cliquable + diff lisible + état stale |
| FR-032 | Artifact & Evidence | Le système doit permettre des tags de risque et annotations contextuelles sur les artefacts. | Permettre la recherche contextualisée des artefacts avec provenance, fraîcheur et comparaison de versions. | Artifact Explorer + Evidence Graph | Must | preuve de provenance cliquable + diff lisible + état stale |
| FR-033 | Command Broker | Le système doit exposer un catalogue de commandes autorisées avec paramètres contrôlés. | Forcer un flux sécurisé dry-run → revue d’impact → confirmation forte avant toute écriture. | Command Console sécurisée | Must | video dry-run/apply + double confirmation + rollback message |
| FR-034 | Command Broker | Le système doit proposer un dry-run par défaut pour toute commande d’écriture. | Forcer un flux sécurisé dry-run → revue d’impact → confirmation forte avant toute écriture. | Command Console sécurisée | Must | video dry-run/apply + double confirmation + rollback message |
| FR-035 | Command Broker | Le système doit afficher les fichiers potentiellement impactés avant exécution réelle. | Forcer un flux sécurisé dry-run → revue d’impact → confirmation forte avant toute écriture. | Command Console sécurisée | Must | video dry-run/apply + double confirmation + rollback message |
| FR-036 | Command Broker | Le système doit imposer une double confirmation pour les commandes à impact élevé. | Forcer un flux sécurisé dry-run → revue d’impact → confirmation forte avant toute écriture. | Command Console sécurisée | Must | video dry-run/apply + double confirmation + rollback message |
| FR-037 | Command Broker | Le système doit vérifier les permissions role-based avant chaque exécution. | Forcer un flux sécurisé dry-run → revue d’impact → confirmation forte avant toute écriture. | Command Console sécurisée | Must | video dry-run/apply + double confirmation + rollback message |
| FR-038 | Command Broker | Le système doit signer active_project_root et refuser les exécutions ambiguës. | Forcer un flux sécurisé dry-run → revue d’impact → confirmation forte avant toute écriture. | Command Console sécurisée | Must | video dry-run/apply + double confirmation + rollback message |
| FR-039 | Command Broker | Le système doit enregistrer commande, acteur, approbateur, résultat dans un journal append-o... | Forcer un flux sécurisé dry-run → revue d’impact → confirmation forte avant toute écriture. | Command Console sécurisée | Must | video dry-run/apply + double confirmation + rollback message |
| FR-040 | Command Broker | Le système doit appliquer des timeouts, retries bornés et idempotency key pour les runs. | Forcer un flux sécurisé dry-run → revue d’impact → confirmation forte avant toute écriture. | Command Console sécurisée | Must | video dry-run/apply + double confirmation + rollback message |
| FR-041 | Command Broker | Le système doit séquencer les commandes concurrentes selon priorité et capacité. | Forcer un flux sécurisé dry-run → revue d’impact → confirmation forte avant toute écriture. | Command Console sécurisée | Must | video dry-run/apply + double confirmation + rollback message |
| FR-042 | Command Broker | Le système doit permettre l’arrêt immédiat des commandes d’écriture en cas d’incident critique. | Forcer un flux sécurisé dry-run → revue d’impact → confirmation forte avant toute écriture. | Command Console sécurisée | Must | video dry-run/apply + double confirmation + rollback message |
| FR-043 | Command Broker | Le système doit exiger approbation nominative pour tout override de policy. | Forcer un flux sécurisé dry-run → revue d’impact → confirmation forte avant toute écriture. | Command Console sécurisée | Must | video dry-run/apply + double confirmation + rollback message |
| FR-044 | Command Broker | Le système doit fournir des templates de commande validés pour réduire les erreurs humaines. | Forcer un flux sécurisé dry-run → revue d’impact → confirmation forte avant toute écriture. | Command Console sécurisée | Must | video dry-run/apply + double confirmation + rollback message |
| FR-045 | AQCD & Risk Intelligence | Le système doit afficher les scores A/Q/C/D avec formule et source de données. | Transformer les métriques en recommandations priorisées par rôle (next best action explicable). | AQCD Cockpit + Risk Radar | Must | tooltips formule + drilldown preuve + recommandation actionnable |
| FR-046 | AQCD & Risk Intelligence | Le système doit conserver des snapshots AQCD par période pour analyse de tendance. | Transformer les métriques en recommandations priorisées par rôle (next best action explicable). | AQCD Cockpit + Risk Radar | Must | tooltips formule + drilldown preuve + recommandation actionnable |
| FR-047 | AQCD & Risk Intelligence | Le système doit calculer un readiness score rules-based avec facteurs contributifs visibles. | Transformer les métriques en recommandations priorisées par rôle (next best action explicable). | AQCD Cockpit + Risk Radar | Must | tooltips formule + drilldown preuve + recommandation actionnable |
| FR-048 | AQCD & Risk Intelligence | Le système doit proposer les 3 actions prioritaires par gate avec owner et preuve. | Transformer les métriques en recommandations priorisées par rôle (next best action explicable). | AQCD Cockpit + Risk Radar | Must | tooltips formule + drilldown preuve + recommandation actionnable |
| FR-049 | AQCD & Risk Intelligence | Le système doit maintenir un registre risques avec owner, échéance, statut et exposition. | Transformer les métriques en recommandations priorisées par rôle (next best action explicable). | AQCD Cockpit + Risk Radar | Must | tooltips formule + drilldown preuve + recommandation actionnable |
| FR-050 | AQCD & Risk Intelligence | Le système doit lier chaque mitigation à une tâche et à une preuve de fermeture. | Transformer les métriques en recommandations priorisées par rôle (next best action explicable). | AQCD Cockpit + Risk Radar | Must | tooltips formule + drilldown preuve + recommandation actionnable |
| FR-051 | AQCD & Risk Intelligence | Le système doit afficher une heatmap probabilité/impact et son évolution. | Transformer les métriques en recommandations priorisées par rôle (next best action explicable). | AQCD Cockpit + Risk Radar | Must | tooltips formule + drilldown preuve + recommandation actionnable |
| FR-052 | AQCD & Risk Intelligence | Le système doit calculer le coût moyen par décision validée. | Transformer les métriques en recommandations priorisées par rôle (next best action explicable). | AQCD Cockpit + Risk Radar | Must | tooltips formule + drilldown preuve + recommandation actionnable |
| FR-053 | AQCD & Risk Intelligence | Le système doit mesurer le waste ratio par phase et déclencher alerte en dérive. | Transformer les métriques en recommandations priorisées par rôle (next best action explicable). | AQCD Cockpit + Risk Radar | Must | tooltips formule + drilldown preuve + recommandation actionnable |
| FR-054 | AQCD & Risk Intelligence | Le système doit suivre les actions H21/H22/H23 jusqu’à clôture vérifiée. | Transformer les métriques en recommandations priorisées par rôle (next best action explicable). | AQCD Cockpit + Risk Radar | Must | tooltips formule + drilldown preuve + recommandation actionnable |
| FR-055 | Collaboration & Notifications | Le système doit proposer des dashboards personnalisés par rôle (PM, Architecte, TEA, UX QA, ... | Réduire le bruit via priorisation, regroupement et escalade contextualisée des alertes. | Notification Hub + Action Queue | Must | preuve de throttling, ack, priorisation critique |
| FR-056 | Collaboration & Notifications | Le système doit générer une file d’actions priorisées et contextualisées par rôle. | Réduire le bruit via priorisation, regroupement et escalade contextualisée des alertes. | Notification Hub + Action Queue | Must | preuve de throttling, ack, priorisation critique |
| FR-057 | Collaboration & Notifications | Le système doit centraliser les notifications avec niveaux critique/élevé/moyen/faible. | Réduire le bruit via priorisation, regroupement et escalade contextualisée des alertes. | Notification Hub + Action Queue | Should | preuve de throttling, ack, priorisation critique |
| FR-058 | Collaboration & Notifications | Le système doit regrouper et limiter les alertes répétitives pour éviter la fatigue. | Réduire le bruit via priorisation, regroupement et escalade contextualisée des alertes. | Notification Hub + Action Queue | Should | preuve de throttling, ack, priorisation critique |
| FR-059 | Collaboration & Notifications | Le système doit mesurer le délai phase complete → notify et alerter les dépassements. | Réduire le bruit via priorisation, regroupement et escalade contextualisée des alertes. | Notification Hub + Action Queue | Should | preuve de throttling, ack, priorisation critique |
| FR-060 | Collaboration & Notifications | Le système doit permettre des threads de commentaires reliés aux décisions et gates. | Réduire le bruit via priorisation, regroupement et escalade contextualisée des alertes. | Notification Hub + Action Queue | Should | preuve de throttling, ack, priorisation critique |
| FR-061 | Collaboration & Notifications | Le système doit gérer les mentions directes et l’escalade automatique selon la sévérité. | Réduire le bruit via priorisation, regroupement et escalade contextualisée des alertes. | Notification Hub + Action Queue | Should | preuve de throttling, ack, priorisation critique |
| FR-062 | Collaboration & Notifications | Le système doit afficher une timeline inter-rôles des événements clés du projet. | Réduire le bruit via priorisation, regroupement et escalade contextualisée des alertes. | Notification Hub + Action Queue | Should | preuve de throttling, ack, priorisation critique |
| FR-063 | UX Quality Controls | Le système doit implémenter loading/empty/error/success sur toutes les vues critiques. | Imposer des règles UX bloquantes: states complets, accessibilité, responsive, cohérence design system. | UX Governance Layer | Should | audit a11y + responsive + checklist loading/empty/error/success |
| FR-064 | UX Quality Controls | Le système doit supporter une navigation clavier complète avec focus visible et logique. | Imposer des règles UX bloquantes: states complets, accessibilité, responsive, cohérence design system. | UX Governance Layer | Should | audit a11y + responsive + checklist loading/empty/error/success |
| FR-065 | UX Quality Controls | Le système doit respecter les contrastes WCAG 2.2 AA sur les surfaces critiques. | Imposer des règles UX bloquantes: states complets, accessibilité, responsive, cohérence design system. | UX Governance Layer | Should | audit a11y + responsive + checklist loading/empty/error/success |
| FR-066 | UX Quality Controls | Le système doit rester exploitable sur mobile, tablette et desktop standard. | Imposer des règles UX bloquantes: states complets, accessibilité, responsive, cohérence design system. | UX Governance Layer | Should | audit a11y + responsive + checklist loading/empty/error/success |
| FR-067 | UX Quality Controls | Le système doit lier captures et verdicts UX aux sous-gates G4-UX. | Imposer des règles UX bloquantes: states complets, accessibilité, responsive, cohérence design system. | UX Governance Layer | Should | audit a11y + responsive + checklist loading/empty/error/success |
| FR-068 | UX Quality Controls | Le système doit visualiser les dettes UX ouvertes et leur plan de réduction. | Imposer des règles UX bloquantes: states complets, accessibilité, responsive, cohérence design system. | UX Governance Layer | Should | audit a11y + responsive + checklist loading/empty/error/success |
| FR-069 | UX Quality Controls | Le système doit afficher des définitions BMAD contextuelles pour réduire ambiguïtés. | Imposer des règles UX bloquantes: states complets, accessibilité, responsive, cohérence design system. | UX Governance Layer | Should | audit a11y + responsive + checklist loading/empty/error/success |
| FR-070 | UX Quality Controls | Le système doit vérifier la cohérence spacing/typo/couleurs selon design system. | Imposer des règles UX bloquantes: states complets, accessibilité, responsive, cohérence design system. | UX Governance Layer | Should | audit a11y + responsive + checklist loading/empty/error/success |
| FR-071 | Integrations & Multi-Project | Le système doit offrir un switch de projet avec confirmation du contexte actif. | Protéger le contexte projet actif et afficher des garde-fous avant toute action inter-outils. | Project Switcher + Integrations Hub | Should | preuve blocage cross-project + confirmation contexte actif |
| FR-072 | Integrations & Multi-Project | Le système doit empêcher toute écriture sur un projet non actif. | Protéger le contexte projet actif et afficher des garde-fous avant toute action inter-outils. | Project Switcher + Integrations Hub | Should | preuve blocage cross-project + confirmation contexte actif |
| FR-073 | Integrations & Multi-Project | Le système doit ingérer les données Jira nécessaires au suivi story/gate. | Protéger le contexte projet actif et afficher des garde-fous avant toute action inter-outils. | Project Switcher + Integrations Hub | Should | preuve blocage cross-project + confirmation contexte actif |
| FR-074 | Integrations & Multi-Project | Le système doit ingérer les données Linear nécessaires au suivi story/gate. | Protéger le contexte projet actif et afficher des garde-fous avant toute action inter-outils. | Project Switcher + Integrations Hub | Should | preuve blocage cross-project + confirmation contexte actif |
| FR-075 | Integrations & Multi-Project | Le système doit indexer les pages Notion référencées comme preuves. | Protéger le contexte projet actif et afficher des garde-fous avant toute action inter-outils. | Project Switcher + Integrations Hub | Could | preuve blocage cross-project + confirmation contexte actif |
| FR-076 | Integrations & Multi-Project | Le système doit intégrer les résultats tests (unit/int/e2e/coverage). | Protéger le contexte projet actif et afficher des garde-fous avant toute action inter-outils. | Project Switcher + Integrations Hub | Could | preuve blocage cross-project + confirmation contexte actif |
| FR-077 | Integrations & Multi-Project | Le système doit intégrer les rapports de vulnérabilités et leur sévérité. | Protéger le contexte projet actif et afficher des garde-fous avant toute action inter-outils. | Project Switcher + Integrations Hub | Could | preuve blocage cross-project + confirmation contexte actif |
| FR-078 | Integrations & Multi-Project | Le système doit exporter des bundles de preuve dans les formats md/pdf/json. | Protéger le contexte projet actif et afficher des garde-fous avant toute action inter-outils. | Project Switcher + Integrations Hub | Could | preuve blocage cross-project + confirmation contexte actif |
| FR-079 | Integrations & Multi-Project | Le système doit exposer des endpoints API pour reporting externe contrôlé. | Protéger le contexte projet actif et afficher des garde-fous avant toute action inter-outils. | Project Switcher + Integrations Hub | Could | preuve blocage cross-project + confirmation contexte actif |
| FR-080 | Integrations & Multi-Project | Le système doit supporter backup/restauration des configurations critiques. | Protéger le contexte projet actif et afficher des garde-fous avant toute action inter-outils. | Project Switcher + Integrations Hub | Could | preuve blocage cross-project + confirmation contexte actif |
| FR-081 | Integrations & Multi-Project | Le système doit fournir un profil déploiement compatible self-host sécurisé. | Protéger le contexte projet actif et afficher des garde-fous avant toute action inter-outils. | Project Switcher + Integrations Hub | Could | preuve blocage cross-project + confirmation contexte actif |
| FR-082 | Integrations & Multi-Project | Le système doit appliquer une politique de rétention et purge par type de donnée. | Protéger le contexte projet actif et afficher des garde-fous avant toute action inter-outils. | Project Switcher + Integrations Hub | Could | preuve blocage cross-project + confirmation contexte actif |

## 23. Matrice de traçabilité NFR (PRD) → contraintes UX/interaction

| NFR ID | Domaine | Cible mesurable | Traduction UX concrète | Test UX/QA associé |
|---|---|---|---|---|
| NFR-001 | Performance | p95 < 2.0s | feedback progressif + skeleton + hiérarchie contenu pour préserver perception vitesse | TC-UX-044 + mesures p95 |
| NFR-002 | Performance | p95 < 2.5s | feedback progressif + skeleton + hiérarchie contenu pour préserver perception vitesse | TC-UX-044 + mesures p95 |
| NFR-003 | Performance | p95 < 5s | feedback progressif + skeleton + hiérarchie contenu pour préserver perception vitesse | TC-UX-044 + mesures p95 |
| NFR-004 | Performance | p95 < 2s sur 500 docs | feedback progressif + skeleton + hiérarchie contenu pour préserver perception vitesse | TC-UX-044 + mesures p95 |
| NFR-005 | Performance | p95 < 10s | feedback progressif + skeleton + hiérarchie contenu pour préserver perception vitesse | TC-UX-044 + mesures p95 |
| NFR-006 | Performance | < 60s | feedback progressif + skeleton + hiérarchie contenu pour préserver perception vitesse | TC-UX-044 + mesures p95 |
| NFR-007 | Performance | <= 2s après preuve | feedback progressif + skeleton + hiérarchie contenu pour préserver perception vitesse | TC-UX-044 + mesures p95 |
| NFR-008 | Performance | <= 1.5s | feedback progressif + skeleton + hiérarchie contenu pour préserver perception vitesse | TC-UX-044 + mesures p95 |
| NFR-009 | Performance | p95 < 2.5s | feedback progressif + skeleton + hiérarchie contenu pour préserver perception vitesse | TC-UX-044 + mesures p95 |
| NFR-010 | Performance | p95 < 2s | feedback progressif + skeleton + hiérarchie contenu pour préserver perception vitesse | TC-UX-044 + mesures p95 |
| NFR-011 | Fiabilité | >= 99.5% | messages de récupération explicites + affichage stale/fallback contrôlé | TC-UX-013/016/019 |
| NFR-012 | Fiabilité | 0 toléré | messages de récupération explicites + affichage stale/fallback contrôlé | TC-UX-013/016/019 |
| NFR-013 | Fiabilité | >= 95% | messages de récupération explicites + affichage stale/fallback contrôlé | TC-UX-013/016/019 |
| NFR-014 | Fiabilité | flakiness < 3% | messages de récupération explicites + affichage stale/fallback contrôlé | TC-UX-013/016/019 |
| NFR-015 | Fiabilité | bascule < 60s | messages de récupération explicites + affichage stale/fallback contrôlé | TC-UX-013/016/019 |
| NFR-016 | Fiabilité | max 3 retries + DLQ | messages de récupération explicites + affichage stale/fallback contrôlé | TC-UX-013/016/019 |
| NFR-017 | Fiabilité | < 10 min | messages de récupération explicites + affichage stale/fallback contrôlé | TC-UX-013/016/019 |
| NFR-018 | Fiabilité | >= 65% sur baseline | messages de récupération explicites + affichage stale/fallback contrôlé | TC-UX-013/016/019 |
| NFR-019 | Sécurité | 0 action critique hors rôle | confirmations fortes, blocages contextuels et visibilité policy | TC-UX-033..036 |
| NFR-020 | Sécurité | 100% commandes exécutées issues catalogue | confirmations fortes, blocages contextuels et visibilité policy | TC-UX-033..036 |
| NFR-021 | Sécurité | 0 exécution destructive hors projet actif | confirmations fortes, blocages contextuels et visibilité policy | TC-UX-033..036 |
| NFR-022 | Sécurité | intégrité vérifiée quotidienne | confirmations fortes, blocages contextuels et visibilité policy | TC-UX-033..036 |
| NFR-023 | Sécurité | 0 secret exposé dans logs persistés | confirmations fortes, blocages contextuels et visibilité policy | TC-UX-033..036 |
| NFR-024 | Sécurité | 100% overrides avec approbateur | confirmations fortes, blocages contextuels et visibilité policy | TC-UX-033..036 |
| NFR-025 | Sécurité | timeout max 120s | confirmations fortes, blocages contextuels et visibilité policy | TC-UX-033..036 |
| NFR-026 | Sécurité | <24h après changement rôle | confirmations fortes, blocages contextuels et visibilité policy | TC-UX-033..036 |
| NFR-027 | Conformité | politique appliquée par type de données | transparence des droits/export/rétention dans les flux UI | TC-UX-010/035 |
| NFR-028 | Conformité | 100% exports validés par policy | transparence des droits/export/rétention dans les flux UI | TC-UX-010/035 |
| NFR-029 | Conformité | chaîne preuve complète obligatoire | transparence des droits/export/rétention dans les flux UI | TC-UX-010/035 |
| NFR-030 | UX | score >= 85 + 0 blocker | règles bloquantes Accessibilité, states, responsive, lisibilité décisionnelle | TC-UX-021..032 + TC-UX-001 |
| NFR-031 | UX | 100% widgets critiques avec 4 états | règles bloquantes Accessibilité, states, responsive, lisibilité décisionnelle | TC-UX-021..032 + TC-UX-001 |
| NFR-032 | UX | parcours critiques validés mobile/tablette/desktop | règles bloquantes Accessibilité, states, responsive, lisibilité décisionnelle | TC-UX-021..032 + TC-UX-001 |
| NFR-033 | UX | décision critique en <90s pour PER-01 | règles bloquantes Accessibilité, states, responsive, lisibilité décisionnelle | TC-UX-021..032 + TC-UX-001 |
| NFR-034 | Opérabilité | métriques clés disponibles en continu | indicateurs de santé lisibles et runbooks accessibles depuis erreur | TC-UX-013/018 |
| NFR-035 | Opérabilité | runbook critique disponible et testé | indicateurs de santé lisibles et runbooks accessibles depuis erreur | TC-UX-013/018 |
| NFR-036 | Opérabilité | 100% changements avec version + migration | indicateurs de santé lisibles et runbooks accessibles depuis erreur | TC-UX-013/018 |
| NFR-037 | Maintenabilité | 100% modules critiques documentés | cohérence de composants et contrats interaction front/back versionnés | TC-UX-041/042 + contract tests |
| NFR-038 | Maintenabilité | aucune rupture sur corpus de référence | cohérence de composants et contrats interaction front/back versionnés | TC-UX-041/042 + contract tests |
| NFR-039 | Maintenabilité | build self-host reproductible | cohérence de composants et contrats interaction front/back versionnés | TC-UX-041/042 + contract tests |
| NFR-040 | Maintenabilité | time-to-first-value < 14 jours | cohérence de composants et contrats interaction front/back versionnés | TC-UX-041/042 + contract tests |

## 24. Décisions UX transférables (max 10) et anti-patterns à éviter

### 24.1 Top 10 décisions UX transférables vers H06/H07/H08
1. L’écran d’entrée est une Action Queue role-based, pas un dashboard KPI générique.
2. Le dual gate G4-T/G4-UX est toujours visible et bloque DONE tant que non PASS des deux côtés.
3. Toute action write impose dry-run, preview d’impact et confirmation forte contextualisée.
4. Le contexte projet actif est affiché globalement et revalidé avant commandes sensibles.
5. Les 4 états UI (loading/empty/error/success) sont obligatoires sur 100% des modules critiques.
6. Les règles Accessibilité WCAG 2.2 AA sont traitées comme des critères bloquants G4-UX.
7. Les design tokens sont normatifs; aucun composant ne bypass le système de tokens.
8. Les notifications sont priorisées, regroupées et throttlées pour limiter la fatigue d’alertes.
9. Chaque décision critique affiche explicitement “risque si inaction” + preuves liées + owner.
10. Les métriques UX (TCD, completion, fatigue, a11y) sont instrumentées dès V1 pour piloter les arbitrages.

### 24.2 Anti-patterns UX interdits
- anti-01: fusionner G4-T et G4-UX dans un seul badge sans détail;
- anti-02: afficher un statut PASS sans preuve primaire liée;
- anti-03: autoriser une commande write sans dry-run ni validation contexte;
- anti-04: masquer les erreurs techniques derrière un message générique;
- anti-05: traiter l’Accessibilité comme post-traitement non bloquant;
- anti-06: saturer la vue d’accueil de KPI sans action explicite;
- anti-07: laisser des notifications critiques sans owner ni SLA;
- anti-08: multiplier les CTA primaires concurrents dans une même carte;
- anti-09: stocker des microcopies incohérentes hors glossaire;
- anti-10: cacher la fraîcheur des données sur des vues de décision.

### 24.3 Conclusion H05
La spécification UX est prête pour exécution H06 (contraintes), validation H07 (complétude), et traduction H08 (architecture).
Elle respecte le cadre BMAD ULTRA et la cible de qualité documentaire calibrée sur https://github.com/XdreaMs404/ExempleBMAD.

## 25. Glossaire UX/BMAD opérationnel (référence rapide)

| Terme | Définition opérationnelle |
|---|---|
| Action Queue | File priorisée des actions immédiates par rôle. |
| AQCD | Score Autonomie, Qualité, Coût, Design utilisé pour arbitrer la cadence. |
| Artifact Explorer | Vue de recherche et lecture contextuelle des documents de preuve. |
| Concern | Statut intermédiaire: acceptable temporairement mais action corrective requise. |
| Control Tower | Interface de pilotage décisionnel qui relie signaux, preuves et actions. |
| Decision Record | Objet traçable contenant décision, owner, justification et statut. |
| Dry-run | Simulation d’une commande sans effet persistant. |
| Evidence Graph | Réseau de liens entre décisions, artefacts, gates et commandes. |
| Fail-safe | Mode dégradé qui préserve l’usage critique en cas d’incident. |
| G4-T | Sous-gate qualité technique d’une story. |
| G4-UX | Sous-gate qualité UX/UI d’une story. |
| Gate | Point de décision PASS/CONCERNS/FAIL pour valider progression. |
| Handoff | Transfert structuré entre agents avec objectif, inputs et output attendu. |
| Next Best Action | Action recommandée la plus utile selon contexte et risque. |
| Policy override | Exception contrôlée à une règle de sécurité/process. |
| Project root | Racine projet active servant de barrière anti cross-project. |
| Readiness score | Score explicable indiquant probabilité de passage gate sans blocage. |
| Responsive | Adaptation de l’interface aux classes d’écrans sans perte décisionnelle. |
| Risk Radar | Vue consolidée des risques et mitigations actives. |
| Stale data | Donnée potentiellement ancienne affichée avec indicateur de fraîcheur. |
| TCD | Time-to-confident-decision: délai pour décider avec preuve suffisante. |
| Token design | Variable de style normalisée (couleur, typo, spacing, motion). |
| UX Evidence Lens | Vue dédiée aux preuves UX pour G4-UX. |
| WCAG 2.2 AA | Référentiel accessibilité cible pour conformité minimum. |
| Write action | Action qui modifie un état persistant et nécessite garde-fous. |
| Workflow ULTRA | Discipline agent/fichier/trace et checks qualité bloquants. |
| Cross-project incident | Erreur due à action exécutée sur un mauvais projet. |
| Progressive disclosure | Affichage progressif des détails selon besoin. |
| Kill-switch | Mécanisme d’arrêt immédiat des actions sensibles. |
| Ownership | Responsable explicite d’une action, décision ou mitigation. |

