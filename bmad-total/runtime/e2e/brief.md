# Runtime E2E Brief

Objectif: valider la chaîne multi-agent BMAD (PM → DEV → UX QA → REVIEWER → TECH WRITER) sur un mini-cas sans toucher aux stories réelles.

Contrainte:
- Ne pas modifier les stories S001-S100.
- Écrire uniquement dans `runtime/e2e/`.

Mini-cas:
- Fonction cible: `normalizeUserName(input)`
- Règles:
  - trim espaces en début/fin
  - remplacer multiples espaces internes par un seul
  - préserver accents/majuscules
  - retourner erreur si input vide après trim

Livrables attendus:
1) `runtime/e2e/01-pm-plan.md`
2) `runtime/e2e/02-dev-output.md`
3) `runtime/e2e/03-ux-audit.md`
4) `runtime/e2e/04-review.md`
5) `runtime/e2e/05-summary.md`
