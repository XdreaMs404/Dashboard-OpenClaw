# PROJECT_STATUS

mode: idle
project_name: En attente /new
lifecycle_state: ideation
phase1_status: pending
phase2_status: pending
phase3_status: pending
phase4_status: blocked_until_validation
awaiting_user_validation: false
last_user_command: /new
last_note: En attente /new
current_epic: 
current_story: 
last_update: 2026-02-20T09:14:36.727833+00:00

## Règles
- mode: active => exécution autonome autorisée
- mode: idle => aucune exécution autonome
- Phase 1→3 (H01→H10) doit être faite avant toute implémentation
- Fin phase 3 => retour en mode: idle + awaiting_user_validation: true
- Phase 4 (H11→H23) démarre uniquement après validation explicite utilisateur (/continue)
