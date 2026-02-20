#!/usr/bin/env bash
set -euo pipefail

source "/root/.openclaw/workspace/bmad-total/scripts/project-env.sh"

ROOT="$CONTROL_ROOT"
CMD_RAW="${1:-}"
ARG1="${2:-}"
ARG2="${3:-}"

if [[ -z "$CMD_RAW" ]]; then
  echo "Usage: bash scripts/control-command.sh </new|/start|/pause|/continue|/recap|/projects|/switch> [arg1] [arg2]"
  exit 1
fi

CMD="${CMD_RAW#/}"

case "$CMD" in
  new)
    IDEA="${ARG1:-Nouveau projet}"
    PROJECT_PATH="$(bash "$ROOT/scripts/project-create.sh" "$IDEA")"
    bash "$ROOT/scripts/set-mode.sh" idle "$IDEA"
    bash "$ROOT/scripts/set-lifecycle.sh" ideation false "/new" "$IDEA"
    echo "✅ /new pris en compte"
    echo "- mode=idle"
    echo "- lifecycle_state=ideation"
    echo "- active_project_root=$PROJECT_PATH"
    echo "- next: cadrage conversationnel exhaustif avant /start"
    ;;

  start)
    NOTE="${ARG1:-Démarrage autonome phases 1->3}"
    ACTIVE_PROJECT="$(get_active_project_root)"
    if [[ "$ACTIVE_PROJECT" == "$CONTROL_ROOT" ]]; then
      FALLBACK_NAME="$NOTE"
      if [[ -z "$FALLBACK_NAME" || "$FALLBACK_NAME" == "Démarrage autonome phases 1->3" ]]; then
        FALLBACK_NAME="${ARG2:-Projet BMAD}"
      fi
      ACTIVE_PROJECT="$(bash "$ROOT/scripts/project-create.sh" "$FALLBACK_NAME")"
    fi
    bash "$ROOT/scripts/set-mode.sh" active
    bash "$ROOT/scripts/set-lifecycle.sh" phase1_analysis false "/start" "$NOTE"
    echo "✅ /start pris en compte"
    echo "- mode=active"
    echo "- lifecycle_state=phase1_analysis"
    echo "- active_project_root=$ACTIVE_PROJECT"
    echo "- mission: exécuter strictement H01->H10 (phases 1 à 3), notifier fin de chaque phase"
    echo "- fin phase 3: repasser mode=idle + lifecycle_state=awaiting_validation"
    ;;

  pause)
    REASON="${ARG1:-Pause demandée par utilisateur}"
    bash "$ROOT/scripts/set-mode.sh" idle
    bash "$ROOT/scripts/set-lifecycle.sh" paused true "/pause" "$REASON"
    echo "⏸️  /pause pris en compte"
    echo "- mode=idle"
    echo "- lifecycle_state=paused"
    ;;

  continue)
    PHASE3="$(awk -F': ' '/^phase3_status:/ {print $2}' "$ROOT/PROJECT_STATUS.md" | tr -d '\r')"
    AWAIT="$(awk -F': ' '/^awaiting_user_validation:/ {print $2}' "$ROOT/PROJECT_STATUS.md" | tr -d '\r')"
    if [[ "$PHASE3" != "done" && "$PHASE3" != "DONE" ]]; then
      echo "❌ /continue refusé: phase3_status=$PHASE3 (attendu: done)"
      exit 2
    fi
    if [[ "$AWAIT" != "true" ]]; then
      echo "❌ /continue refusé: awaiting_user_validation=$AWAIT (attendu: true)"
      exit 2
    fi
    bash "$ROOT/scripts/set-mode.sh" active
    bash "$ROOT/scripts/set-lifecycle.sh" phase4_implementation false "/continue" "Validation utilisateur reçue"
    echo "✅ /continue pris en compte"
    echo "- mode=active"
    echo "- lifecycle_state=phase4_implementation"
    echo "- next: phase 4 BMAD (H11->H23)"
    ;;

  recap)
    echo "📌 RECAP"
    awk '/^mode:|^project_name:|^active_project_root:|^lifecycle_state:|^phase1_status:|^phase2_status:|^phase3_status:|^phase4_status:|^awaiting_user_validation:|^last_user_command:|^last_note:|^current_epic:|^current_story:|^last_update:/' "$ROOT/PROJECT_STATUS.md"
    echo "---"
    bash "$ROOT/scripts/progress.sh" || true
    ;;

  projects)
    bash "$ROOT/scripts/project-list.sh"
    ;;

  switch)
    TARGET="${ARG1:-}"
    if [[ -z "$TARGET" ]]; then
      echo "Usage: bash scripts/control-command.sh /switch <project-slug-or-path>"
      exit 1
    fi
    NEW_ROOT="$(bash "$ROOT/scripts/project-switch.sh" "$TARGET")"
    bash "$ROOT/scripts/set-lifecycle.sh" ideation false "/switch" "Switch projet"
    echo "✅ /switch pris en compte"
    echo "- active_project_root=$NEW_ROOT"
    ;;

  *)
    echo "Unknown command: $CMD_RAW"
    echo "Allowed: /new /start /pause /continue /recap /projects /switch"
    exit 1
    ;;
esac
