# Runtime E2E Brief

Objectif: valider un sous-flux **Implementation** de la matrice BMAD (boucle H11→H19, avec focus de test local sur H13→H18), sans toucher aux stories réelles.

Référence canonique globale: `docs/BMAD-HYPER-ORCHESTRATION-THEORY.md` (H01→H23).

Contrainte:
- Ne pas modifier les stories S001-S100.
- Écrire uniquement dans `runtime/e2e/`.

Mini-cas:
- Fonction cible: `normalizeUserName(input)`
- Règles:
  - trim espaces début/fin
  - fusion espaces internes multiples
  - préserver accents/majuscules
  - erreur si input vide après trim

Livrables attendus:
1) `runtime/e2e/01-pm-plan.md` (préparation locale mini-cas)
2) `runtime/e2e/02-dev-output.md`
3) `runtime/e2e/03-ux-audit.md`
4) `runtime/e2e/04-review.md`
5) `runtime/e2e/05-summary.md`
