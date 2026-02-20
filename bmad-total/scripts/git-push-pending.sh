#!/usr/bin/env bash
set -euo pipefail

QUEUE_DIR="/root/.openclaw/workspace/bmad-total/runtime/git-sync"
WORKSPACE_ROOT="/root/.openclaw/workspace"

if [[ ! -d "$QUEUE_DIR" ]]; then
  echo "No pending git push queue directory."
  exit 0
fi

shopt -s nullglob
files=("$QUEUE_DIR"/*push-failed*.log)
if [[ ${#files[@]} -eq 0 ]]; then
  echo "No pending git push items."
  exit 0
fi

cd "$WORKSPACE_ROOT"

ok=0
fail=0
for f in "${files[@]}"; do
  commit="$(grep '^commit=' "$f" | head -n1 | cut -d'=' -f2- || true)"
  remote="$(grep '^remote=' "$f" | head -n1 | cut -d'=' -f2- || true)"
  target="$(grep '^target_branch=' "$f" | head -n1 | cut -d'=' -f2- || true)"

  if [[ -z "$commit" || -z "$remote" || -z "$target" ]]; then
    echo "⚠️ malformed queue file: $f"
    fail=$((fail+1))
    continue
  fi

  if git push "$remote" "$commit:$target" >/dev/null 2>&1; then
    rm -f "$f"
    echo "✅ pushed queued commit $commit -> $remote/$target"
    ok=$((ok+1))
  else
    echo "⚠️ push still failing for $commit -> $remote/$target"
    fail=$((fail+1))
  fi
done

echo "Queue flush summary: ok=$ok fail=$fail"
[[ "$fail" -gt 0 ]] && exit 1 || exit 0
