#!/usr/bin/env bash
set -euo pipefail

source "/root/.openclaw/workspace/bmad-total/scripts/project-env.sh"

ROOT="$(get_active_project_root)"
IMPL="$ROOT/_bmad-output/implementation-artifacts"
STORIES_DIR="$IMPL/stories"

python3 - "$STORIES_DIR" <<'PY'
from pathlib import Path
import sys

stories_dir = Path(sys.argv[1])

ux_block = """
## UX Gates obligatoires
- [ ] conformité design-system (tokens, spacing, typo, composants)
- [ ] accessibilité WCAG 2.2 AA (minimum)
- [ ] responsive (mobile/tablet/desktop)
- [ ] états d'interface (loading/empty/error/success)
- [ ] hiérarchie visuelle et lisibilité
- [ ] evidence UX fournie (captures/rapports)
""".strip()

done_rule_old = """## Règle Story DONE
- Interdit de passer DONE si un seul gate échoue.
- Utiliser `bash scripts/story-done-guard.sh <SID>` pour valider la fin.
""".strip()

done_rule_new = """## Règle Story DONE
- Interdit de passer DONE si un seul gate échoue (technique OU UX).
- Audit UX obligatoire: `_bmad-output/implementation-artifacts/ux-audits/<SID>-ux-audit.json` avec verdict PASS.
- Utiliser `bash scripts/story-done-guard.sh <SID>` pour valider la fin.
""".strip()

for p in sorted(stories_dir.glob('S*.md')):
    t = p.read_text(encoding='utf-8')

    if done_rule_old in t:
        t = t.replace(done_rule_old, done_rule_new)
    elif "## Règle Story DONE" in t and "Audit UX obligatoire" not in t:
        t = t.replace("## Règle Story DONE", done_rule_new.splitlines()[0], 1)
        if "- Interdit de passer DONE" in t:
            t = t.replace("- Interdit de passer DONE si un seul gate échoue.", "- Interdit de passer DONE si un seul gate échoue (technique OU UX).", 1)
        if "- Utiliser `bash scripts/story-done-guard.sh <SID>` pour valider la fin." in t:
            t = t.replace(
                "- Utiliser `bash scripts/story-done-guard.sh <SID>` pour valider la fin.",
                "- Audit UX obligatoire: `_bmad-output/implementation-artifacts/ux-audits/<SID>-ux-audit.json` avec verdict PASS.\n- Utiliser `bash scripts/story-done-guard.sh <SID>` pour valider la fin.",
                1
            )

    if "## UX Gates obligatoires" not in t:
        if "## Status" in t:
            t = t.replace("## Status", ux_block + "\n\n## Status", 1)
        else:
            t += "\n\n" + ux_block + "\n"

    p.write_text(t, encoding='utf-8')

idx = stories_dir / 'STORIES_INDEX.md'
if idx.exists():
    t = idx.read_text(encoding='utf-8')

    if "## UX Gates obligatoires" not in t:
        ux_idx = """
## UX Gates obligatoires
- [ ] conformité design-system
- [ ] accessibilité WCAG 2.2 AA
- [ ] responsive mobile/tablet/desktop
- [ ] états loading/empty/error/success
- [ ] audit UX JSON disponible avec verdict PASS
""".strip()
        if "## Règle Story DONE" in t:
            t = t.replace("## Règle Story DONE", ux_idx + "\n\n## Règle Story DONE", 1)
        else:
            t += "\n\n" + ux_idx + "\n"

    if done_rule_old in t:
        t = t.replace(done_rule_old, done_rule_new)
    elif "## Règle Story DONE" in t and "Audit UX obligatoire" not in t:
        t = t.replace("- Interdit de passer DONE si un seul gate échoue.", "- Interdit de passer DONE si un seul gate échoue (technique OU UX).")
        t = t.replace(
            "- Utiliser `bash scripts/story-done-guard.sh <SID>` pour valider la fin.",
            "- Audit UX obligatoire: `_bmad-output/implementation-artifacts/ux-audits/<SID>-ux-audit.json` avec verdict PASS.\n- Utiliser `bash scripts/story-done-guard.sh <SID>` pour valider la fin."
        )

    idx.write_text(t, encoding='utf-8')

print('✅ Story template UX enforcement complete')
PY
