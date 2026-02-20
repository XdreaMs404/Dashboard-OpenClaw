# Git auto-commit par story (BMAD)

## Objectif
À chaque `story-done-guard` réussi, un commit Git est créé automatiquement pour la story.

## Scripts
- `scripts/git-auto-commit-story.sh <SID>`
- `scripts/git-push-pending.sh`

## Comportement
1. `story-done-guard.sh` valide les artefacts + gates + status DONE.
2. Puis lance `git-auto-commit-story.sh <SID>`:
   - `git add bmad-total`
   - `git commit -m "feat(story): complete <SID>"`
   - `git push origin <branch>:master`
3. Si le push échoue (ex: auth manquante), la story n'est pas cassée:
   - un fichier de queue est écrit dans `runtime/git-sync/`.

## Variables utiles
- `BMAD_GIT_AUTOCOMMIT=0` : désactive l'auto-commit
- `BMAD_GIT_STRICT=1` : rend un échec push bloquant
- `BMAD_GIT_REMOTE=origin` : remote à utiliser
- `BMAD_GIT_TARGET_BRANCH=master` : branche cible
- `BMAD_GIT_REMOTE_URL=...` : URL remote (si remote absent)
- `BMAD_GIT_DRY_RUN=1` : test sans commit/push

## Auth GitHub (requise pour push)
Sans credentials GitHub, le commit local fonctionne mais le push est mis en queue.

Après configuration des credentials, relancer:

```bash
cd /root/.openclaw/workspace/bmad-total
bash scripts/git-push-pending.sh
```
