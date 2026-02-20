#!/usr/bin/env bash
set -euo pipefail

source "/root/.openclaw/workspace/bmad-total/scripts/project-env.sh"

PROJECT_NAME="${1:-}"
shift || true

if [[ -z "$PROJECT_NAME" ]]; then
  echo "Usage: bash scripts/project-create.sh <project_name> [--clone-current] [--no-activate] [--slug <slug>]"
  exit 1
fi

CLONE_CURRENT=0
ACTIVATE=1
CUSTOM_SLUG=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --clone-current)
      CLONE_CURRENT=1
      shift
      ;;
    --no-activate)
      ACTIVATE=0
      shift
      ;;
    --slug)
      CUSTOM_SLUG="${2:-}"
      shift 2
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

mkdir -p "$PROJECTS_ROOT"

slug_base="${CUSTOM_SLUG:-$(project_slugify "$PROJECT_NAME")}"
slug="$slug_base"
target="$PROJECTS_ROOT/$slug"
if [[ -e "$target" ]]; then
  slug="${slug_base}-$(date -u +%Y%m%d-%H%M%S)"
  target="$PROJECTS_ROOT/$slug"
fi

mkdir -p "$target"

active_source="$(get_active_project_root)"
seed_source="$CONTROL_ROOT"
if [[ "$CLONE_CURRENT" -eq 1 ]]; then
  seed_source="$active_source"
fi

copy_item() {
  local item="$1"
  if [[ -e "$seed_source/$item" ]]; then
    cp -a "$seed_source/$item" "$target/"
  fi
}

# Core project content
copy_item "app"
copy_item "docs"
copy_item "config"
copy_item "runtime"
copy_item "templates"
copy_item "scripts"
copy_item "README.md"
copy_item "WORKFLOW.md"
copy_item "BMAD_AGENT_PROMPT.md"
copy_item "COMMAND_PROTOCOL.md"
copy_item "PROJECT_STATUS.md"

mkdir -p "$target/_bmad-output"
if [[ "$CLONE_CURRENT" -eq 1 ]]; then
  if [[ -d "$seed_source/_bmad-output" ]]; then
    cp -a "$seed_source/_bmad-output/." "$target/_bmad-output/"
  fi
else
  mkdir -p "$target/_bmad-output/planning-artifacts/research"
  mkdir -p "$target/_bmad-output/planning-artifacts/epics"
  mkdir -p "$target/_bmad-output/implementation-artifacts/stories"
  mkdir -p "$target/_bmad-output/implementation-artifacts/reviews"
  mkdir -p "$target/_bmad-output/implementation-artifacts/summaries"
  mkdir -p "$target/_bmad-output/implementation-artifacts/retros"
  mkdir -p "$target/_bmad-output/implementation-artifacts/ux-audits"
  mkdir -p "$target/_bmad-output/implementation-artifacts/handoffs"
  mkdir -p "$target/_bmad-output/implementation-artifacts/scorecards"

  cat > "$target/_bmad-output/planning-artifacts/product-brief.md" <<'EOF'
# Product Brief

- Projet: à définir
- Contexte: à définir
- Objectifs: à définir
EOF

  cat > "$target/_bmad-output/planning-artifacts/prd.md" <<'EOF'
# PRD

## Objectif
À compléter en phase H04.
EOF

  cat > "$target/_bmad-output/planning-artifacts/ux.md" <<'EOF'
# UX

## Contrainte UX
À compléter en phase H05-H06.
EOF

  cat > "$target/_bmad-output/planning-artifacts/architecture.md" <<'EOF'
# Architecture

## Vue d'ensemble
À compléter en phase H08.
EOF

  cat > "$target/_bmad-output/planning-artifacts/epics.md" <<'EOF'
# Epics

À compléter en phase H09.
EOF

  cat > "$target/_bmad-output/planning-artifacts/epics-index.md" <<'EOF'
# EPICS_INDEX

| Epic | Title | Stories | Status | Retro |
|---|---|---|---|---|
EOF

  cat > "$target/_bmad-output/implementation-artifacts/stories/STORIES_INDEX.md" <<'EOF'
# STORIES_INDEX

| Story | Epic | Title | Status |
|---|---|---|---|
EOF

  cat > "$target/_bmad-output/implementation-artifacts/sprint-status.yaml" <<'EOF'
generated: auto
project: BMAD Project
development_status: {}
EOF

  cat > "$target/_bmad-output/implementation-artifacts/handoffs/HANDOFFS_LOG.md" <<'EOF'
# HANDOFFS_LOG

| Handoff | From(Hxx) | To(Hyy) | Story | Epic | Objective | Next Target | Status |
|---|---|---|---|---|---|---|---|
EOF

  if [[ -f "$seed_source/templates/AQCD_METRICS_TEMPLATE.json" ]]; then
    cp "$seed_source/templates/AQCD_METRICS_TEMPLATE.json" "$target/_bmad-output/implementation-artifacts/scorecards/aqcd-metrics.json"
  else
    cat > "$target/_bmad-output/implementation-artifacts/scorecards/aqcd-metrics.json" <<'EOF'
{
  "window": "story",
  "windowRef": "S000",
  "autonomy": {"planned": 1, "completedWithoutHumanIntervention": 0},
  "qualityTech": {"lint": false, "typecheck": false, "tests": false, "coveragePct": 0, "security": false, "build": false},
  "cost": {"budgetTokens": 0, "usedTokens": 0, "wastePct": 0},
  "design": {"designExcellence": 0, "accessibilityD2": 0}
}
EOF
  fi
fi

if [[ -d "$target/runtime/e2e" && "$CLONE_CURRENT" -eq 0 ]]; then
  for f in 01-pm-plan.md 02-dev-output.md 03-ux-audit.md 04-review.md 05-summary.md RUNTIME_E2E_RESULT.md; do
    if [[ ! -f "$target/runtime/e2e/$f" ]]; then
      printf "# %s\n\nà compléter\n" "$f" > "$target/runtime/e2e/$f"
    fi
  done
fi

if [[ -d "$target/runtime/git-sync" && "$CLONE_CURRENT" -eq 0 ]]; then
  find "$target/runtime/git-sync" -type f -name '*push-failed*' -delete || true
fi

cat > "$target/PROJECT_META.md" <<EOF
# PROJECT_META

name: $PROJECT_NAME
slug: $slug
created_at_utc: $(date -u +%Y-%m-%dT%H:%M:%SZ)
seed_source: $seed_source
clone_mode: $CLONE_CURRENT
EOF

if [[ "$ACTIVATE" -eq 1 ]]; then
  set_active_project_root "$target"
fi

echo "$target"
