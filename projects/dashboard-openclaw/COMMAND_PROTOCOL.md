# COMMAND_PROTOCOL.md — Contrat d’orchestration utilisateur

Ce protocole est la référence pour piloter Starvis sur un nouveau projet.

## Commandes supportées

### `/new <idée>`
Objectif:
- Ouvrir un nouveau cadrage projet.
- Rester en `mode: idle`.
- Créer un dossier projet dédié sous `workspace/projects/<slug>/`.

Comportement attendu:
1. Création d’un projet isolé (code + docs + `_bmad-output` + runtime + templates + scripts).
2. Le projet devient l’`active_project_root` pour tous les scripts BMAD.
3. Discussion exhaustive avec Alex sur la meilleure solution complète (pas de report d’exigences critiques).
4. Aucune exécution autonome BMAD tant que `/start` n’est pas reçu.

### `/start [consignes]`
Objectif:
- Lancer l’exécution autonome **phases 1 à 3** strictement BMAD.

Comportement attendu:
1. Passer `mode: active`.
2. Exécuter H01→H10 sans raccourci.
3. Envoyer un message court à la fin de chaque phase:
   - fin phase 1 (Analysis)
   - fin phase 2 (Planning)
   - fin phase 3 (Solutioning)
4. En fin phase 3:
   - repasser `mode: idle`
   - marquer `awaiting_user_validation: true`
   - envoyer un récapitulatif complet des artefacts produits
   - (script utilitaire) `bash scripts/phase-complete.sh 3`
5. Attendre validation explicite avant phase 4.

### `/pause`
Objectif:
- Stop immédiat de l’autonomie.

Comportement attendu:
- Passer `mode: idle`
- Marquer état `paused`
- Retourner un statut court.

### `/continue`
Objectif:
- Reprendre après validation utilisateur.

Précondition:
- `phase3_status=done` et `awaiting_user_validation=true`

Comportement attendu:
- Passer `mode: active`
- Entrer en `phase4_implementation`
- Démarrer H11→H23.

### `/recap`
Objectif:
- Retour d’état lisible et vérifiable.

Comportement attendu:
- Afficher: mode, projet actif (`active_project_root`), lifecycle, états des phases, validation en attente, epic/story courants, progression.

### `/projects`
Objectif:
- Lister les projets séparés.

Comportement attendu:
- Afficher la liste de `workspace/projects/*` + marquage du projet actif.

### `/switch <slug|path>`
Objectif:
- Changer de projet actif.

Comportement attendu:
- Pointer `active_project_root` vers le projet ciblé.
- Revenir en état de cadrage (`ideation`) par sécurité.

---

## Règles non négociables
- Matrice officielle: `docs/BMAD-HYPER-ORCHESTRATION-THEORY.md`.
- Ordre strict H01→H23.
- Handoffs explicites à chaque étape.
- Analysis: minimum 3 recherches utiles (implémentation, concurrence, risques/contraintes).
- Aucun report d’exigence critique à une version future.
