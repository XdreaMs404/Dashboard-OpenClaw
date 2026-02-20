#!/usr/bin/env bash
set -euo pipefail

source "/root/.openclaw/workspace/bmad-total/scripts/project-env.sh"

mkdir -p "$PROJECTS_ROOT"
active="$(get_active_project_root)"

echo "# PROJECTS"
echo "active: $active"
for d in "$PROJECTS_ROOT"/*; do
  [[ -d "$d" ]] || continue
  name="$(basename "$d")"
  marker=""
  [[ "$d" == "$active" ]] && marker="*"
  echo "${marker}${name}: $d"
done
