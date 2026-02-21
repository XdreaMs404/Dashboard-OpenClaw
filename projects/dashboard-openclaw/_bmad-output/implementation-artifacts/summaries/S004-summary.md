# S004 — Summary

S004 est livré avec validation stricte des prérequis obligatoires avant activation de phase, en cohérence avec S002/S003 (reason codes + diagnostics) et avec evidence UX complète.

## Comment tester

1. Depuis la racine du projet:
   ```bash
   BMAD_PROJECT_ROOT=/root/.openclaw/workspace/projects/dashboard-openclaw \
   bash /root/.openclaw/workspace/bmad-total/scripts/run-story-gates.sh S004
   ```
2. Vérifier que les scénarios S004 passent:
   - transition autorisée + prérequis requis `done` => `allowed=true`, `reasonCode=OK`
   - checklist absente => `PHASE_PREREQUISITES_MISSING`
   - prérequis requis incomplet => `PHASE_PREREQUISITES_INCOMPLETE` + `missingPrerequisiteIds`
   - entrée invalide (id/status/doublon) => `INVALID_PHASE_PREREQUISITES`
   - blocage S002 propagé inchangé (`TRANSITION_NOT_ALLOWED`, etc.)
3. Vérifier l’UX e2e:
   - états `empty/loading/error/success`
   - affichage explicite `reasonCode/reason/missingPrerequisiteIds`
   - pas d’overflow horizontal mobile/tablette/desktop.

## Conclusion

GO
