#!/usr/bin/env bash
set -euo pipefail

ROOT="/root/.openclaw/workspace/bmad-total"
STATUS_FILE="$ROOT/PROJECT_STATUS.md"
REGISTRY_FILE="$ROOT/runtime/agent-registry.json"
CRON_JOBS_FILE="/root/.openclaw/cron/jobs.json"
OPENCLAW_CONFIG_FILE="/root/.openclaw/openclaw.json"
LOOP_JOB_ID="${1:-24f417fe-1996-4671-89dd-7886bba3d8f0}"

FAILS=0
WARNS=0

ok()   { echo "✅ $*"; }
warn() { echo "⚠️  $*"; WARNS=$((WARNS+1)); }
fail() { echo "❌ $*"; FAILS=$((FAILS+1)); }

echo "== BMAD Autonomous Preflight =="
echo "Root: $ROOT"
echo "Loop job id: $LOOP_JOB_ID"

[[ -f "$STATUS_FILE" ]] || fail "Missing PROJECT_STATUS.md"
[[ -f "$REGISTRY_FILE" ]] || fail "Missing runtime/agent-registry.json"
[[ -f "$CRON_JOBS_FILE" ]] || fail "Missing /root/.openclaw/cron/jobs.json"
[[ -f "$OPENCLAW_CONFIG_FILE" ]] || fail "Missing /root/.openclaw/openclaw.json"

for script in \
  set-mode.sh progress.sh next-story.sh runtime-healthcheck.sh \
  run-quality-gates.sh run-ux-gates.sh run-story-gates.sh story-done-guard.sh \
  update-aqcd-score.sh git-auto-commit-story.sh git-push-pending.sh ; do
  if [[ -x "$ROOT/scripts/$script" ]]; then
    ok "Script present/executable: scripts/$script"
  else
    fail "Script missing or not executable: scripts/$script"
  fi
done

if command -v python3 >/dev/null 2>&1; then
  ok "python3 available: $(python3 --version 2>/dev/null || echo 'python3')"
else
  fail "python3 not found in PATH"
fi

if command -v python >/dev/null 2>&1; then
  pyv="$(python --version 2>/dev/null || true)"
  if [[ "$pyv" == Python\ 3* ]]; then
    ok "python shim available: $pyv"
  else
    warn "python exists but not Python 3: ${pyv:-unknown}"
  fi
else
  warn "python command missing (prefer python3 in all automation)"
fi

if command -v git >/dev/null 2>&1; then
  ok "git available"
  if git -C /root/.openclaw/workspace rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    ok "workspace git repository detected"
  else
    fail "workspace is not a git repository"
  fi

  if git -C /root/.openclaw/workspace remote get-url origin >/dev/null 2>&1; then
    remote_url="$(git -C /root/.openclaw/workspace remote get-url origin)"
    ok "git remote origin configured"
    if [[ "$remote_url" == "https://github.com/XdreaMs404/Dashboard-OpenClaw.git" || "$remote_url" == "git@github.com:XdreaMs404/Dashboard-OpenClaw.git" ]]; then
      ok "git origin target matches Dashboard-OpenClaw"
    else
      warn "git origin points to unexpected URL: $remote_url"
    fi

    if git -C /root/.openclaw/workspace push --dry-run origin HEAD:master >/dev/null 2>&1; then
      ok "git push auth check: OK"
    else
      warn "git push auth check failed (credentials likely missing)"
    fi
  else
    warn "git remote origin not configured"
  fi

  dirty_count="$(git -C /root/.openclaw/workspace status --porcelain -- bmad-total | wc -l | tr -d ' ')"
  if [[ "$dirty_count" -gt 0 ]]; then
    warn "git pending changes under bmad-total: $dirty_count (next story auto-commit will include them)"
  else
    ok "git working tree clean for bmad-total"
  fi

  if [[ -d "$ROOT/runtime/git-sync" ]]; then
    pending_count="$(find "$ROOT/runtime/git-sync" -type f -name '*push-failed*' | wc -l | tr -d ' ')"
    if [[ "$pending_count" -gt 0 ]]; then
      warn "pending git push failures queued: $pending_count"
    else
      ok "no queued git push failures"
    fi
  else
    ok "no queued git push failures"
  fi
else
  fail "git not found in PATH"
fi

if [[ -f "$STATUS_FILE" ]]; then
  MODE="$(awk -F': ' '/^mode:/ {print $2}' "$STATUS_FILE" | tr -d '\r' || true)"
  if [[ "$MODE" == "active" || "$MODE" == "idle" ]]; then
    ok "PROJECT_STATUS mode=$MODE"
  else
    fail "Invalid PROJECT_STATUS mode: '${MODE:-<empty>}'"
  fi
fi

NEXT_STORY="$(bash "$ROOT/scripts/next-story.sh" 2>/dev/null || true)"
if [[ -n "$NEXT_STORY" ]]; then
  ok "Next story detected: $NEXT_STORY"
else
  warn "No next story detected (all DONE or index issue)"
fi

MEMORY_CFG_CHECK="$(python3 - "$OPENCLAW_CONFIG_FILE" <<'PY'
import json,sys
cfg=json.load(open(sys.argv[1],encoding='utf-8'))
ms=((cfg.get('agents') or {}).get('defaults') or {}).get('memorySearch') or {}
print('memory_enabled=' + str(bool(ms.get('enabled'))).lower())
print('memory_provider=' + str(ms.get('provider','')))
print('memory_fallback=' + str(ms.get('fallback','')))
PY
)"

while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  case "$line" in
    memory_enabled=true) ok "memorySearch enabled" ;;
    memory_enabled=false) warn "memorySearch disabled in config" ;;
    memory_provider=local) ok "memorySearch provider=local (no external API key required)" ;;
    memory_provider=*) warn "memorySearch provider=${line#memory_provider=}" ;;
    memory_fallback=none) ok "memorySearch fallback=none" ;;
    memory_fallback=*) warn "memorySearch fallback=${line#memory_fallback=}" ;;
  esac
done <<< "$MEMORY_CFG_CHECK"

REG_CHECK="$(python3 - "$REGISTRY_FILE" <<'PY'
import json, os, sys
p = sys.argv[1]
reg = json.load(open(p, encoding='utf-8'))
core = reg.get('persistentCoreAgents') or reg.get('coreAgents') or []
workers = reg.get('runtimeWorkers') or reg.get('workerAgents') or []

print(f"core_count={len(core)}")
print(f"worker_count={len(workers)}")

not_ready = [c.get('agentId') or c.get('role') for c in core if c.get('status') and c.get('status') != 'READY']
if not_ready:
    print("not_ready=" + ",".join(not_ready))

missing_prompt = []
missing_source = []
for w in workers:
    label = w.get('label') or w.get('role') or 'unknown'
    pp = w.get('promptPath')
    sp = w.get('sourcePath')
    if pp and not os.path.exists(pp):
        missing_prompt.append(f"{label}:{pp}")
    if sp and not os.path.exists(sp):
        missing_source.append(f"{label}:{sp}")

print("missing_prompt=" + (";".join(missing_prompt) if missing_prompt else ""))
print("missing_source=" + (";".join(missing_source) if missing_source else ""))
PY
)"

while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  case "$line" in
    core_count=*)
      val="${line#core_count=}"
      if [[ "$val" -ge 11 ]]; then ok "Registry core agents: $val"; else fail "Registry core agents < 11 ($val)"; fi
      ;;
    worker_count=*)
      val="${line#worker_count=}"
      if [[ "$val" -ge 12 ]]; then ok "Registry runtime workers: $val"; else fail "Registry runtime workers < 12 ($val)"; fi
      ;;
    not_ready=*)
      val="${line#not_ready=}"
      [[ -n "$val" ]] && fail "Core agents not READY: $val"
      ;;
    missing_prompt=*)
      val="${line#missing_prompt=}"
      [[ -n "$val" ]] && fail "Missing worker promptPath files: $val" || ok "All worker promptPath files present"
      ;;
    missing_source=*)
      val="${line#missing_source=}"
      [[ -n "$val" ]] && fail "Missing worker sourcePath files: $val" || ok "All worker sourcePath files present"
      ;;
  esac
done <<< "$REG_CHECK"

AGENT_CHECK="$(openclaw agents list --json 2>/dev/null | python3 -c "import json,sys
wanted=['bmad-brainstorm','bmad-analyst','bmad-pm','bmad-ux-designer','bmad-architect','bmad-sm','bmad-dev','bmad-tea','bmad-reviewer','bmad-ux-qa','bmad-tech-writer']
try:
    arr=json.load(sys.stdin)
except Exception:
    print('error=parse')
    raise SystemExit(0)
ids={a.get('id') for a in arr if isinstance(a,dict)}
missing=[w for w in wanted if w not in ids]
print('present='+str(len(wanted)-len(missing)))
print('missing='+(','.join(missing) if missing else ''))")"

while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  case "$line" in
    error=parse) fail "Unable to parse 'openclaw agents list --json'" ;;
    present=*)
      val="${line#present=}"
      if [[ "$val" -eq 11 ]]; then ok "Persistent agents present: $val/11"; else fail "Persistent agents present: $val/11"; fi
      ;;
    missing=*)
      val="${line#missing=}"
      [[ -n "$val" ]] && fail "Missing persistent agents: $val"
      ;;
  esac
done <<< "$AGENT_CHECK"

CRON_CHECK="$(python3 - "$CRON_JOBS_FILE" "$LOOP_JOB_ID" <<'PY'
import json,sys
jobs=json.load(open(sys.argv[1],encoding='utf-8')).get('jobs',[])
job_id=sys.argv[2]
job=None
for j in jobs:
    if j.get('id')==job_id:
        job=j
        break
if not job:
    for j in jobs:
        if 'BMAD hyper runtime loop' in (j.get('name') or ''):
            job=j
            break
if not job:
    print('missing_job=1')
    raise SystemExit(0)
print('missing_job=0')
print('job_enabled='+str(bool(job.get('enabled'))).lower())
payload=(job.get('payload') or {}).get('message','')
print('uses_persistent_ids=' + ('true' if all(x in payload for x in ['bmad-pm','bmad-dev','bmad-ux-qa','bmad-tea','bmad-reviewer','bmad-tech-writer']) else 'false'))
print('has_watchdog=' + ('true' if 'timeoutSeconds=240' in payload and 'retry once' in payload else 'false'))
print('has_circuit_breaker=' + ('true' if 'Circuit breaker pre-check' in payload and 'set-mode.sh idle' in payload else 'false'))
print('has_python3_rule=' + ('true' if 'Never run `python - <<\'PY\'`' in payload and 'python3 - <<\'PY\'' in payload else 'false'))
mode_idx = payload.find('0) Read /root/.openclaw/workspace/bmad-total/PROJECT_STATUS.md')
breaker_idx = payload.find('1) Circuit breaker pre-check')
print('mode_check_first=' + ('true' if mode_idx != -1 and breaker_idx != -1 and mode_idx < breaker_idx else 'false'))
print('delivery_mode=' + str((job.get('delivery') or {}).get('mode','')))
print('session_target=' + str(job.get('sessionTarget','')))
state=job.get('state') or {}
print('last_status=' + str(state.get('lastStatus','')))
print('consecutive_errors=' + str(state.get('consecutiveErrors',0)))
PY
)"

while IFS= read -r line; do
  [[ -z "$line" ]] && continue
  case "$line" in
    missing_job=1) fail "Cron runtime loop job not found" ;;
    missing_job=0) ok "Cron runtime loop job found" ;;
    job_enabled=true) ok "Cron runtime loop job enabled" ;;
    job_enabled=false) fail "Cron runtime loop job disabled" ;;
    uses_persistent_ids=true) ok "Cron payload uses persistent agent IDs" ;;
    uses_persistent_ids=false) fail "Cron payload does not use persistent IDs" ;;
    has_watchdog=true) ok "Cron payload watchdog present (timeout/retry)" ;;
    has_watchdog=false) warn "Cron payload watchdog instructions not detected" ;;
    has_circuit_breaker=true) ok "Cron payload circuit breaker instructions present" ;;
    has_circuit_breaker=false) warn "Cron payload circuit breaker instructions not detected" ;;
    has_python3_rule=true) ok "Cron payload python3 rule present" ;;
    has_python3_rule=false) warn "Cron payload python3 rule missing" ;;
    mode_check_first=true) ok "Cron checks mode before circuit breaker" ;;
    mode_check_first=false) warn "Cron mode-check order may trigger noise while idle" ;;
    delivery_mode=none) warn "Cron delivery mode: none (no proactive alerts)" ;;
    delivery_mode=announce) ok "Cron delivery mode: announce (event notifications)" ;;
    delivery_mode=*) warn "Cron delivery mode: ${line#delivery_mode=}" ;;
    session_target=isolated) ok "Cron sessionTarget=isolated" ;;
    session_target=*) warn "Cron sessionTarget=${line#session_target=}" ;;
    last_status=*) ok "Cron lastStatus=${line#last_status=}" ;;
    consecutive_errors=*)
      val="${line#consecutive_errors=}"
      if [[ "$val" -ge 2 ]]; then warn "Cron consecutiveErrors=$val (breaker risk)"; else ok "Cron consecutiveErrors=$val"; fi
      ;;
  esac
done <<< "$CRON_CHECK"

RUNS_FILE="/root/.openclaw/cron/runs/${LOOP_JOB_ID}.jsonl"
if [[ -f "$RUNS_FILE" ]]; then
  HAZARDS="$(python3 - "$RUNS_FILE" <<'PY'
import json,sys
from collections import deque
p=sys.argv[1]
last=deque(maxlen=2)
for line in open(p,encoding='utf-8'):
    line=line.strip()
    if not line:
      continue
    try:
      j=json.loads(line)
    except Exception:
      continue
    if j.get('action')!='finished':
      continue
    status=str(j.get('status','')).lower()
    summary=(j.get('summary') or '').lower()
    err=(j.get('error') or '').lower()
    hazard=(status=='error') or ('blocked' in summary) or ('timeout' in summary) or ('timeout' in err)
    last.append((status,hazard))
if len(last)<2:
  print('last_two_hazard=unknown')
else:
  print('last_two_hazard=' + ('true' if all(h for _,h in last) else 'false'))
  print('last_two_status=' + ','.join(s for s,_ in last))
PY
)"
  while IFS= read -r line; do
    [[ -z "$line" ]] && continue
    case "$line" in
      last_two_hazard=true) warn "Last two cron runs look hazardous (timeout/BLOCKED/error)" ;;
      last_two_hazard=false) ok "Last two cron runs are not both hazardous" ;;
      last_two_hazard=unknown) warn "Not enough run history for 2-run hazard check" ;;
      last_two_status=*) ok "Last two finished statuses: ${line#last_two_status=}" ;;
    esac
  done <<< "$HAZARDS"
else
  warn "Run history file not found: $RUNS_FILE"
fi

echo "---"
if [[ "$FAILS" -gt 0 ]]; then
  echo "PREFLIGHT_FAIL (fails=$FAILS, warns=$WARNS)"
  exit 2
fi

echo "PREFLIGHT_OK (fails=0, warns=$WARNS)"
