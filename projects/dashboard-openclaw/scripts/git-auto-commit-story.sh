#!/usr/bin/env bash
set -euo pipefail

source "/root/.openclaw/workspace/bmad-total/scripts/project-env.sh"

SID="${1:-}"
if [[ -z "$SID" ]]; then
  echo "Usage: bash scripts/git-auto-commit-story.sh S001"
  exit 1
fi

WORKSPACE_ROOT="/root/.openclaw/workspace"
PROJECT_ROOT="$(get_active_project_root)"
PROJECT_REL="${PROJECT_ROOT#$WORKSPACE_ROOT/}"
if [[ "$PROJECT_REL" == "$PROJECT_ROOT" ]]; then
  PROJECT_REL="bmad-total"
fi
REMOTE_NAME="${BMAD_GIT_REMOTE:-origin}"
REMOTE_URL_DEFAULT="${BMAD_GIT_REMOTE_URL:-https://github.com/XdreaMs404/Dashboard-OpenClaw.git}"
TARGET_BRANCH="${BMAD_GIT_TARGET_BRANCH:-master}"
STRICT_MODE="${BMAD_GIT_STRICT:-0}"
DRY_RUN="${BMAD_GIT_DRY_RUN:-0}"

warn() { echo "⚠️ $*"; }
ok()   { echo "✅ $*"; }

queue_push_failure() {
  mkdir -p "$PROJECT_ROOT/runtime/git-sync"
  local stamp file
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  file="$PROJECT_ROOT/runtime/git-sync/${SID}-push-failed-${stamp}.log"
  {
    echo "sid=$SID"
    echo "ts_utc=$stamp"
    echo "remote=$REMOTE_NAME"
    echo "remote_url=$(git remote get-url "$REMOTE_NAME" 2>/dev/null || echo unknown)"
    echo "source_branch=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
    echo "target_branch=$TARGET_BRANCH"
    echo "commit=$(git rev-parse HEAD 2>/dev/null || echo unknown)"
    echo "hint=Configure git credentials and rerun push manually."
  } > "$file"
  warn "GIT push failed for $SID (queued): $file"
}

if ! command -v git >/dev/null 2>&1; then
  warn "git not available; skip auto-commit for $SID"
  [[ "$STRICT_MODE" == "1" ]] && exit 1 || exit 0
fi

cd "$WORKSPACE_ROOT"
if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  warn "workspace is not a git repository; skip auto-commit for $SID"
  [[ "$STRICT_MODE" == "1" ]] && exit 1 || exit 0
fi

if ! git remote get-url "$REMOTE_NAME" >/dev/null 2>&1; then
  git remote add "$REMOTE_NAME" "$REMOTE_URL_DEFAULT"
fi

if [[ "$DRY_RUN" == "1" ]]; then
  changed="$(git status --porcelain -- "$PROJECT_REL" | wc -l | tr -d ' ')"
  ok "DRY_RUN: detected $changed pending file(s) under $PROJECT_REL for $SID"
  exit 0
fi

# Stage only BMAD project content to avoid unrelated commits.
git add "$PROJECT_REL"
# Never include queued push-failure logs in normal story commits.
git reset -q -- "$PROJECT_REL/runtime/git-sync" 2>/dev/null || true

if git diff --cached --quiet; then
  ok "No git changes to commit for $SID"
  exit 0
fi

if ! git commit -m "feat(story): complete ${SID}" >/dev/null 2>&1; then
  warn "git commit failed for $SID"
  [[ "$STRICT_MODE" == "1" ]] && exit 1 || exit 0
fi

src_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "$TARGET_BRANCH")"
if [[ -z "$src_branch" || "$src_branch" == "HEAD" ]]; then
  src_branch="$TARGET_BRANCH"
fi

if git push "$REMOTE_NAME" "$src_branch:$TARGET_BRANCH" >/dev/null 2>&1; then
  ok "GIT_COMMIT_PUSH_OK ($SID)"
  exit 0
fi

sleep 2
if git push "$REMOTE_NAME" "$src_branch:$TARGET_BRANCH" >/dev/null 2>&1; then
  ok "GIT_COMMIT_PUSH_OK ($SID)"
  exit 0
fi

queue_push_failure
[[ "$STRICT_MODE" == "1" ]] && exit 1 || exit 0
