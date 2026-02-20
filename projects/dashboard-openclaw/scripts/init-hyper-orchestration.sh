#!/usr/bin/env bash
set -euo pipefail

source "/root/.openclaw/workspace/bmad-total/scripts/project-env.sh"

ROOT="$(get_active_project_root)"
PLAN="$ROOT/_bmad-output/planning-artifacts"
IMPL="$ROOT/_bmad-output/implementation-artifacts"

mkdir -p "$ROOT/config" "$ROOT/templates"
mkdir -p "$IMPL/ux-audits" "$IMPL/handoffs" "$IMPL/scorecards"

if [ ! -f "$PLAN/design-system.md" ]; then
cat > "$PLAN/design-system.md" <<'EOF'
# Design System Baseline (BMAD Hyper-Orchestration)

## Objectif
Garantir un niveau UI/UX élevé, cohérent et mesurable sur toutes les stories.

## Règles de base
- Typographie cohérente et hiérarchie claire (H1/H2/H3, corps, labels).
- Échelle d'espacement stable (ex: 4/8/12/16/24/32).
- Palette et contrastes conformes WCAG 2.2 AA minimum.
- Composants réutilisables (boutons, inputs, cards, modales, tables).
- États obligatoires: loading, empty, error, success.
- Responsive obligatoire: mobile, tablette, desktop.
- Focus visible et navigation clavier systématique.

## Evidence UX attendue
Pour chaque story UI:
- captures des écrans clés
- preuve des états loading/empty/error/success
- check accessibilité (contraste + clavier + labels)
- verdict UX QA documenté
EOF
fi

if [ ! -f "$IMPL/ux-audits/README.md" ]; then
cat > "$IMPL/ux-audits/README.md" <<'EOF'
# UX Audits

Chaque story terminée doit avoir:
- `<SID>-ux-audit.json`

Format recommandé:
- Voir `templates/UX_AUDIT_TEMPLATE.json`

Gate bloquant:
- `bash scripts/run-ux-gates.sh <SID>`
EOF
fi

if [ ! -f "$IMPL/handoffs/HANDOFFS_LOG.md" ]; then
cat > "$IMPL/handoffs/HANDOFFS_LOG.md" <<'EOF'
# HANDOFFS_LOG

| Handoff | From(Hxx) | To(Hyy) | Story | Epic | Objective | Next Target | Status |
|---|---|---|---|---|---|---|---|
EOF
fi

if [ ! -f "$IMPL/scorecards/aqcd-metrics.json" ]; then
  cp "$ROOT/templates/AQCD_METRICS_TEMPLATE.json" "$IMPL/scorecards/aqcd-metrics.json"
fi

bash "$ROOT/scripts/enforce-story-template.sh"

echo "✅ Hyper-orchestration structure initialized"
