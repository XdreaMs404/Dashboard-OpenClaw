#!/usr/bin/env bash
set -euo pipefail

ROOT_WS="/root/.openclaw/workspace"
CORE_DIR="$ROOT_WS/agents-core"
DOCS_DIR="$ROOT_WS/docs"
RUNTIME_DIR="$ROOT_WS/bmad-total/runtime"
MODEL="openai-codex/gpt-5.3-codex"
UPGRADE_SCRIPT="$ROOT_WS/bmad-total/scripts/upgrade-agent-workspaces.js"
SMOKE=0

if [[ "${1:-}" == "--smoke" ]]; then
  SMOKE=1
fi

mkdir -p "$CORE_DIR" "$DOCS_DIR" "$RUNTIME_DIR"

# id|name|role|mission|theme|soul
SPECS=(
  "bmad-brainstorm|BMAD Brainstorm|Brainstorming Coach|Explorer les options, risques et angles morts avant décision.|créatif, structuré, pragmatique|Tu clarifies les options, risques et hypothèses avant toute décision produit."
  "bmad-analyst|BMAD Analyst|Analyst|Analyser exigences, dépendances, risques, hypothèses.|analytique, clair, factuel|Tu produis des analyses précises et vérifiables, sans blabla."
  "bmad-pm|BMAD PM|Product Manager|Définir scope, critères d'acceptation, priorités, handoffs.|précis, simple, orienté valeur|Tu transformes les besoins en critères testables et actionnables."
  "bmad-ux-designer|BMAD UX Designer|UX Designer|Garantir qualité UX/UI, flows, cohérence design-system.|design-first, lisible, orienté usage|Tu protèges l'expérience utilisateur et la cohérence visuelle."
  "bmad-architect|BMAD Architect|Solution Architect|Concevoir architecture robuste, évolutive et maintenable.|systémique, rigoureux, concret|Tu définis des solutions solides, simples à maintenir."
  "bmad-sm|BMAD SM|Scrum Master|Orchestrer stories, handoffs, rythme d'exécution.|organisé, cadencé, orienté livraison|Tu fais avancer la livraison story-by-story sans friction."
  "bmad-dev|BMAD Dev|Software Engineer|Implémenter proprement avec tests et robustesse.|pratique, rigoureux, orienté qualité|Tu écris du code propre, testé, robuste et lisible."
  "bmad-tea|BMAD TEA|Test Engineer Architect|Concevoir stratégie de tests et couverture edge cases.|exigeant, méthodique, orienté preuve|Tu garantis la qualité par des tests forts et traçables."
  "bmad-reviewer|BMAD Reviewer|Code Reviewer|Revue critique qualité/sécurité/maintenabilité.|franc, objectif, sans complaisance|Tu challenge le code et bloques toute dette critique."
  "bmad-ux-qa|BMAD UX QA|UX QA Auditor|Auditer UX, accessibilité, responsive, états UI.|exigeant UX, orienté standards|Tu bloques toute story qui ne respecte pas l'exigence UX."
  "bmad-tech-writer|BMAD Tech Writer|Technical Writer|Produire résumés clairs et docs actionnables.|pédagogue, simple, concret|Tu rends le travail compréhensible et actionnable pour Alex."
)

agent_exists() {
  local id="$1"
  openclaw agents list --json | node -e '
const fs = require("node:fs");
const id = process.argv[1];
const raw = fs.readFileSync(0, "utf8").trim();
const data = raw ? JSON.parse(raw) : [];
process.exit(Array.isArray(data) && data.some(a => a.id === id) ? 0 : 1);
' "$id"
}

SMOKE_REPORT=""

for spec in "${SPECS[@]}"; do
  IFS='|' read -r ID NAME ROLE MISSION THEME SOUL <<<"$spec"
  WS="$CORE_DIR/$ID"
  mkdir -p "$WS"

  if ! agent_exists "$ID"; then
    openclaw agents add "$ID" \
      --workspace "$WS" \
      --model "$MODEL" \
      --non-interactive \
      --json >/dev/null
    CREATED="yes"
  else
    CREATED="no"
  fi

  cat > "$WS/IDENTITY.md" <<EOF
# IDENTITY.md
- Name: $NAME
- Role: $ROLE
- Mission: $MISSION
- Vibe: $THEME
EOF

  cat > "$WS/SOUL.md" <<EOF
# SOUL.md
$SOUL
Toujours répondre en français simple, clair et orienté action.
EOF

  cat > "$WS/USER.md" <<'EOF'
# USER.md
- Name: Alex
- Communication: français simple, ton calme et direct.
EOF

  openclaw agents set-identity --agent "$ID" --workspace "$WS" --from-identity --json >/dev/null || true

  if [[ "$SMOKE" == "1" ]]; then
    OUT_JSON="$(openclaw agent --agent "$ID" --message "Réponds EXACTEMENT: READY_$ID" --json --timeout 120 || true)"
    SMOKE_OK="$(node -e '
const s = process.argv[1] || "";
try {
  const j = JSON.parse(s);
  const txt = j?.result?.payloads?.[0]?.text || "";
  process.stdout.write(txt.includes("READY_") ? "ok" : "fail");
} catch { process.stdout.write("fail"); }
' "$OUT_JSON")"
  else
    SMOKE_OK="skip"
  fi

  SMOKE_REPORT+="| $ID | $CREATED | $SMOKE_OK |
"
done

if [[ -f "$UPGRADE_SCRIPT" ]]; then
  echo "▶ Applying rich role instructions to agent workspaces"
  node "$UPGRADE_SCRIPT"
  # Sync OpenClaw identity metadata after rich identity files are written
  for spec in "${SPECS[@]}"; do
    IFS='|' read -r ID _ <<<"$spec"
    openclaw agents set-identity --agent "$ID" --workspace "$CORE_DIR/$ID" --from-identity --json >/dev/null || true
  done
else
  echo "⚠ Upgrade script not found: $UPGRADE_SCRIPT"
fi

cat > "$RUNTIME_DIR/agent-registry.json" <<'EOF'
{
  "version": "2.0.0",
  "strategy": "hybrid",
  "generatedBy": "setup-persistent-core-agents.sh",
  "notes": [
    "core agents are persistent OpenClaw agents with dedicated workspaces",
    "workers remain runtime/ephemeral by default",
    "canonical orchestration order is H01->H23 (see docs/BMAD-HYPER-ORCHESTRATION-THEORY.md)"
  ],
  "canonical": {
    "source": "/root/.openclaw/workspace/docs/BMAD-HYPER-ORCHESTRATION-THEORY.md",
    "forbidFutureVersionSplit": true,
    "order": [
      "H01","H02","H03","H04","H05","H06","H07","H08","H09","H10","H11","H12",
      "H13","H14","H15","H16","H17","H18","H19","H20","H21","H22","H23"
    ]
  },
  "persistentCoreAgents": [
    {"role":"BRAINSTORMING_COACH","agentId":"bmad-brainstorm","workspace":"/root/.openclaw/workspace/agents-core/bmad-brainstorm","status":"READY"},
    {"role":"ANALYST","agentId":"bmad-analyst","workspace":"/root/.openclaw/workspace/agents-core/bmad-analyst","status":"READY"},
    {"role":"PM","agentId":"bmad-pm","workspace":"/root/.openclaw/workspace/agents-core/bmad-pm","status":"READY"},
    {"role":"UX_DESIGNER","agentId":"bmad-ux-designer","workspace":"/root/.openclaw/workspace/agents-core/bmad-ux-designer","status":"READY"},
    {"role":"ARCHITECT","agentId":"bmad-architect","workspace":"/root/.openclaw/workspace/agents-core/bmad-architect","status":"READY"},
    {"role":"SM","agentId":"bmad-sm","workspace":"/root/.openclaw/workspace/agents-core/bmad-sm","status":"READY"},
    {"role":"DEV","agentId":"bmad-dev","workspace":"/root/.openclaw/workspace/agents-core/bmad-dev","status":"READY"},
    {"role":"TEA","agentId":"bmad-tea","workspace":"/root/.openclaw/workspace/agents-core/bmad-tea","status":"READY"},
    {"role":"REVIEWER","agentId":"bmad-reviewer","workspace":"/root/.openclaw/workspace/agents-core/bmad-reviewer","status":"READY"},
    {"role":"UX_QA_AUDITOR","agentId":"bmad-ux-qa","workspace":"/root/.openclaw/workspace/agents-core/bmad-ux-qa","status":"READY"},
    {"role":"TECH_WRITER","agentId":"bmad-tech-writer","workspace":"/root/.openclaw/workspace/agents-core/bmad-tech-writer","status":"READY"}
  ],
  "runtimeWorkers": [
    {"role":"WEB_RESEARCH_WORKER","label":"bmad-worker-web-research"},
    {"role":"FACT_CHECK_WORKER","label":"bmad-worker-fact-check"},
    {"role":"COMPETITIVE_SCAN_WORKER","label":"bmad-worker-competitive-scan"},
    {"role":"SECURITY_DEPENDENCY_WORKER","label":"bmad-worker-security-dependency"},
    {"role":"TEST_GENERATION_WORKER","label":"bmad-worker-test-generation"},
    {"role":"EDGE_CASE_WORKER","label":"bmad-worker-edge-case"},
    {"role":"BENCHMARK_PERF_WORKER","label":"bmad-worker-benchmark-perf"},
    {"role":"DOC_CONSISTENCY_WORKER","label":"bmad-worker-doc-consistency"},
    {"role":"VISUAL_QA_WORKER","label":"bmad-worker-visual-qa"},
    {"role":"ACCESSIBILITY_AUDIT_WORKER","label":"bmad-worker-accessibility-audit"},
    {"role":"RESPONSIVE_AUDIT_WORKER","label":"bmad-worker-responsive-audit"},
    {"role":"DESIGN_CONSISTENCY_WORKER","label":"bmad-worker-design-consistency"}
  ]
}
EOF

cat > "$DOCS_DIR/BMAD-PERSISTENT-AGENTS-SETUP-REPORT.md" <<EOF
# BMAD Persistent Agents Setup Report

Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)
Model: $MODEL
Workspace root: $CORE_DIR

## Core agents
| Agent ID | Created now | Smoke |
|---|---|---|
$SMOKE_REPORT

## Generated/updated files per agent
- IDENTITY.md
- USER.md
- BMAD_SOURCE_PROMPT.md
- SOUL.md
- AGENTS.md
- TOOLS.md
- HEARTBEAT.md
- BOOTSTRAP.md

## Runtime registry updated
- $RUNTIME_DIR/agent-registry.json

## Next step
- Use 'openclaw agent --agent <id> --message "..." --json' to run a specific persistent role.
EOF

echo "✅ Persistent core agents setup complete"
echo "- Registry: $RUNTIME_DIR/agent-registry.json"
echo "- Report:   $DOCS_DIR/BMAD-PERSISTENT-AGENTS-SETUP-REPORT.md"
