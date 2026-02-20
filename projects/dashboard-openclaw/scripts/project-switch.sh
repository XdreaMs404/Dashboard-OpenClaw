#!/usr/bin/env bash
set -euo pipefail

source "/root/.openclaw/workspace/bmad-total/scripts/project-env.sh"

TARGET="${1:-}"
if [[ -z "$TARGET" ]]; then
  echo "Usage: bash scripts/project-switch.sh <slug|absolute_path>"
  exit 1
fi

if [[ -d "$TARGET" ]]; then
  resolved="$TARGET"
elif [[ -d "$PROJECTS_ROOT/$TARGET" ]]; then
  resolved="$PROJECTS_ROOT/$TARGET"
else
  echo "Project not found: $TARGET"
  exit 1
fi

set_active_project_root "$resolved"
echo "$resolved"
