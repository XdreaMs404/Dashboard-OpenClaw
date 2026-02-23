# Logs incidents projet dashboard-openclaw

Ce dossier conserve les erreurs/blocages récents pour post-mortem.

## Snapshot actuel (2 derniers jours)
- `errors-2026-02-22_2026-02-23.csv`
- `errors-2026-02-22_2026-02-23.json`
- `errors-2026-02-22_2026-02-23.summary.json`
- `postmortem-2026-02-22_2026-02-23.md`

## Convention
- Un fichier `errors-YYYY-MM-DD_YYYY-MM-DD.*` = extraction brute événements.
- Un fichier `postmortem-YYYY-MM-DD_YYYY-MM-DD.md` = analyse causes racines + impact + actions.

## Sources d’extraction
- Transcripts sessions: `/root/.openclaw/agents/main/sessions/*.jsonl`
- Scope job: `24f417fe-1996-4671-89dd-7886bba3d8f0`
- Checkpoint story active: `runtime/story-checkpoints/S023.json`
