# STORIES_INDEX

| ID | Epic | Titre | Status |
|---|---|---|---|
| S001 | E01 | Normalisation de nom utilisateur | DONE |
| S002 | E01 | Validateur de transitions autorisées + blocage sans notification de phase | DONE |
| S003 | E01 | Story 3 | DONE |
| S004 | E01 | Story 4 | DONE |
| S005 | E01 | Story 5 | DONE |
| S006 | E01 | Story 6 | DONE |
| S007 | E01 | Story 7 | DONE |
| S008 | E01 | Story 8 | DONE |
| S009 | E01 | Story 9 | TODO |
| S010 | E01 | Story 10 | TODO |
| S011 | E02 | Story 11 | TODO |
| S012 | E02 | Story 12 | TODO |
| S013 | E02 | Story 13 | TODO |
| S014 | E02 | Story 14 | TODO |
| S015 | E02 | Story 15 | TODO |
| S016 | E02 | Story 16 | TODO |
| S017 | E02 | Story 17 | TODO |
| S018 | E02 | Story 18 | TODO |
| S019 | E02 | Story 19 | TODO |
| S020 | E02 | Story 20 | TODO |
| S021 | E03 | Story 21 | TODO |
| S022 | E03 | Story 22 | TODO |
| S023 | E03 | Story 23 | TODO |
| S024 | E03 | Story 24 | TODO |
| S025 | E03 | Story 25 | TODO |
| S026 | E03 | Story 26 | TODO |
| S027 | E03 | Story 27 | TODO |
| S028 | E03 | Story 28 | TODO |
| S029 | E03 | Story 29 | TODO |
| S030 | E03 | Story 30 | TODO |
| S031 | E04 | Story 31 | TODO |
| S032 | E04 | Story 32 | TODO |
| S033 | E04 | Story 33 | TODO |
| S034 | E04 | Story 34 | TODO |
| S035 | E04 | Story 35 | TODO |
| S036 | E04 | Story 36 | TODO |
| S037 | E04 | Story 37 | TODO |
| S038 | E04 | Story 38 | TODO |
| S039 | E04 | Story 39 | TODO |
| S040 | E04 | Story 40 | TODO |
| S041 | E05 | Story 41 | TODO |
| S042 | E05 | Story 42 | TODO |
| S043 | E05 | Story 43 | TODO |
| S044 | E05 | Story 44 | TODO |
| S045 | E05 | Story 45 | TODO |
| S046 | E05 | Story 46 | TODO |
| S047 | E05 | Story 47 | TODO |
| S048 | E05 | Story 48 | TODO |
| S049 | E05 | Story 49 | TODO |
| S050 | E05 | Story 50 | TODO |
| S051 | E06 | Story 51 | TODO |
| S052 | E06 | Story 52 | TODO |
| S053 | E06 | Story 53 | TODO |
| S054 | E06 | Story 54 | TODO |
| S055 | E06 | Story 55 | TODO |
| S056 | E06 | Story 56 | TODO |
| S057 | E06 | Story 57 | TODO |
| S058 | E06 | Story 58 | TODO |
| S059 | E06 | Story 59 | TODO |
| S060 | E06 | Story 60 | TODO |
| S061 | E07 | Story 61 | TODO |
| S062 | E07 | Story 62 | TODO |
| S063 | E07 | Story 63 | TODO |
| S064 | E07 | Story 64 | TODO |
| S065 | E07 | Story 65 | TODO |
| S066 | E07 | Story 66 | TODO |
| S067 | E07 | Story 67 | TODO |
| S068 | E07 | Story 68 | TODO |
| S069 | E07 | Story 69 | TODO |
| S070 | E07 | Story 70 | TODO |
| S071 | E08 | Story 71 | TODO |
| S072 | E08 | Story 72 | TODO |
| S073 | E08 | Story 73 | TODO |
| S074 | E08 | Story 74 | TODO |
| S075 | E08 | Story 75 | TODO |
| S076 | E08 | Story 76 | TODO |
| S077 | E08 | Story 77 | TODO |
| S078 | E08 | Story 78 | TODO |
| S079 | E08 | Story 79 | TODO |
| S080 | E08 | Story 80 | TODO |
| S081 | E09 | Story 81 | TODO |
| S082 | E09 | Story 82 | TODO |
| S083 | E09 | Story 83 | TODO |
| S084 | E09 | Story 84 | TODO |
| S085 | E09 | Story 85 | TODO |
| S086 | E09 | Story 86 | TODO |
| S087 | E09 | Story 87 | TODO |
| S088 | E09 | Story 88 | TODO |
| S089 | E09 | Story 89 | TODO |
| S090 | E09 | Story 90 | TODO |
| S091 | E10 | Story 91 | TODO |
| S092 | E10 | Story 92 | TODO |
| S093 | E10 | Story 93 | TODO |
| S094 | E10 | Story 94 | TODO |
| S095 | E10 | Story 95 | TODO |
| S096 | E10 | Story 96 | TODO |
| S097 | E10 | Story 97 | TODO |
| S098 | E10 | Story 98 | TODO |
| S099 | E10 | Story 99 | TODO |
| S100 | E10 | Story 100 | TODO |

## Quality Gates obligatoires
- [ ] lint
- [ ] typecheck
- [ ] tests unit/intégration
- [ ] tests e2e
- [ ] tests cas limites (edge)
- [ ] coverage >= seuil
- [ ] security scan dépendances
- [ ] build

## Règle Story DONE
- Interdit de passer DONE si un seul gate échoue (technique OU UX).
- Audit UX obligatoire: `_bmad-output/implementation-artifacts/ux-audits/<SID>-ux-audit.json` avec verdict PASS.
- Utiliser `bash scripts/story-done-guard.sh <SID>` pour valider la fin.

## UX Gates obligatoires
- [ ] conformité design-system (tokens, spacing, typo, composants)
- [ ] accessibilité WCAG 2.2 AA (minimum)
- [ ] responsive (mobile/tablet/desktop)
- [ ] états d'interface (loading/empty/error/success)
- [ ] hiérarchie visuelle et lisibilité
- [ ] evidence UX fournie (captures/rapports)

## Status
TODO
