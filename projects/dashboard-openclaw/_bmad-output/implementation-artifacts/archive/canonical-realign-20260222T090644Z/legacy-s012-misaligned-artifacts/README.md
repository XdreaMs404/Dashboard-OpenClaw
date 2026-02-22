# Legacy S012 artifacts archived during canonical realignment (2026-02-22)

## Why these files were moved
`planning-artifacts/epics.md` is the source of truth (12 epics × 12 stories).
After canonical sync, `S012` maps to `E01-S12` (Journal décisionnel de gouvernance phase/gate) and is **TODO**.

The files moved here were legacy artifacts generated before/while the backlog mapping was drifting.
They described a different story scope (metadata validator, now mapped in E02 stories), so keeping them in active folders would create false DONE signals for `S012`.

## Action taken
- Moved misaligned `S012` review/summary/ux-audit/handoff files out of active implementation folders.
- Kept full traceability in this archive folder.
- Active `S012` now remains TODO until implemented/validated against canonical scope from `epics.md`.

## Source of truth
- `_bmad-output/planning-artifacts/epics.md`
- `_bmad-output/implementation-artifacts/stories/STORIES_INDEX.md`
- `_bmad-output/implementation-artifacts/sprint-status.yaml`
