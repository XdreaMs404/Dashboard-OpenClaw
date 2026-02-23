# Story runtime logs

Un fichier est maintenu par story:
- `Sxxx-runtime.md`

Contenu:
- étapes PM/DEV/UXQA/TEA/Reviewer/TechWriter/final_gates,
- durée cumulée par étape (minutes),
- timeline des passages,
- blocages détectés,
- actions de déblocage,
- journal brut step-by-step.

Source de vérité runtime:
- `runtime/story-checkpoints/Sxxx.json`
- script: `bmad-total/scripts/runtime-story-checkpoint.sh`

Note:
- Pour les stories démarrées avant l’activation de ce journal, les premières lignes peuvent apparaître en mode `legacy` (tentatives cumulées), puis le suivi devient détaillé au fur et à mesure des transitions.
