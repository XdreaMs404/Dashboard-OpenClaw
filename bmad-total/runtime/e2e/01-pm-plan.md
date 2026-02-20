# 01 — PM Plan (Runtime E2E)

## Scope
- Exécuter un mini-cycle BMAD E2E sur une fonction isolée: `normalizeUserName(input)`.
- Travailler **uniquement** dans `runtime/e2e/`.
- Ne pas modifier les stories réelles (`S001` à `S100`) ni les artefacts de prod.
- Cible fonctionnelle:
  - trim des espaces début/fin
  - réduction des espaces internes multiples à un seul
  - préservation des accents et de la casse
  - erreur si la valeur est vide après trim

## Risques
1. **Ambiguïté sur les espaces**: comportement attendu pour tabs/espaces non standards non précisé.
2. **Contrat d’erreur flou**: type/message d’erreur à standardiser pour éviter divergence DEV/REVIEW.
3. **Régression de casse/accents**: transformations involontaires (`toLowerCase`, normalisation Unicode agressive).
4. **Dépassement de périmètre**: tentative d’intégration dans code réel au lieu d’un livrable runtime isolé.

## Acceptance Criteria
1. `normalizeUserName("  Jean   Dupont  ")` retourne `"Jean Dupont"`.
2. `normalizeUserName("Élodie   Martin")` retourne `"Élodie Martin"` (accents/casse inchangés).
3. `normalizeUserName("  ")` lève une erreur explicite (input vide après trim).
4. `normalizeUserName("")` lève une erreur explicite.
5. Aucun fichier hors `runtime/e2e/` n’est créé/modifié.
6. Le livrable DEV inclut logique + tests de cas nominaux et limites.

## Plan handoff vers DEV
- **Input DEV**:
  - Brief runtime E2E validé
  - Ce plan PM (scope, risques, critères)
- **Tâches DEV**:
  1. Implémenter `normalizeUserName(input)` selon les règles.
  2. Définir un contrat d’erreur cohérent (ex: `Error("input vide après trim")`).
  3. Fournir tests minimaux couvrant les 4 cas d’acceptance principaux.
  4. Documenter décisions techniques et résultats dans `runtime/e2e/02-dev-output.md`.
- **Definition of Done DEV (pour passage UX/Review)**:
  - Critères 1–4 passants en tests.
  - Respect strict du périmètre runtime/e2e.
  - Sortie claire, reproductible et relisible pour UX QA + REVIEWER.
