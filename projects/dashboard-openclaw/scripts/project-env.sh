#!/usr/bin/env bash

WORKSPACE_ROOT="/root/.openclaw/workspace"
CONTROL_ROOT="$WORKSPACE_ROOT/bmad-total"
PROJECTS_ROOT="$WORKSPACE_ROOT/projects"
ACTIVE_PROJECT_FILE="$WORKSPACE_ROOT/.bmad-active-project"

get_active_project_root() {
  if [[ -n "${BMAD_PROJECT_ROOT:-}" && -d "${BMAD_PROJECT_ROOT:-}" ]]; then
    echo "$BMAD_PROJECT_ROOT"
    return 0
  fi

  if [[ -f "$ACTIVE_PROJECT_FILE" ]]; then
    local p
    p="$(head -n1 "$ACTIVE_PROJECT_FILE" | tr -d '\r')"
    if [[ -n "$p" && -d "$p" ]]; then
      echo "$p"
      return 0
    fi
  fi

  echo "$CONTROL_ROOT"
}

set_active_project_root() {
  local target="${1:-}"
  if [[ -z "$target" ]]; then
    echo "set_active_project_root: missing target path" >&2
    return 1
  fi
  mkdir -p "$PROJECTS_ROOT"
  printf "%s\n" "$target" > "$ACTIVE_PROJECT_FILE"
}

project_slugify() {
  local raw="${1:-project}"
  local slug
  slug="$(printf "%s" "$raw" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g; s/^-+//; s/-+$//; s/-+/-/g')"
  if [[ -z "$slug" ]]; then
    slug="project-$(date -u +%Y%m%d-%H%M%S)"
  fi
  printf "%s\n" "$slug"
}
