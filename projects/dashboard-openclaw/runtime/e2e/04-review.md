# 04 — Review (Runtime E2E)

## Synthèse
Revue critique basée sur `02-dev-output.md` et `03-ux-audit.md`.

## Points forts
1. **Couverture du besoin fonctionnel (AC) bien cadrée** dans la proposition :
   - trim début/fin,
   - réduction des espaces internes multiples,
   - conservation accents/casse,
   - erreur explicite si vide.
2. **Contrat technique explicite** (types d’entrée/sortie, erreurs documentées).
3. **Approche défensive pertinente** avec `TypeError` pour entrées non-string.
4. **Jeu de tests proposé** couvrant nominal + erreurs + cas de robustesse.
5. **Analyse UX déjà initiée** (risques, clarté, accessibilité textuelle).

## Points faibles
1. **Absence de preuve d’implémentation effective** (artefact présenté = pseudo-code, pas de fichier source vérifié).
2. **Absence de preuve d’exécution des tests** (pas de rapport de tests ni statut pass/fail).
3. **Ambiguïté fonctionnelle sur les espaces non standards** (`\t`, `\n`, `NBSP`) :
   - comportement actuel partiel (`/ {2,}/g`),
   - risque d’incohérence perçue côté utilisateur.
4. **Messages d’erreur trop techniques pour UX user-facing** (`input`, `trim`), sans guidance actionnable.
5. **Terminologie mixte technique/métier** (cohérence produit perfectible).

## Conformité DoD (évaluation)
- **Conformité AC fonctionnels**: **PARTIELLE** (alignement documenté, mais non prouvé par exécution réelle).
- **Conformité qualité/tests**: **NON CONFORME** (tests suggérés mais non exécutés/attestés).
- **Conformité UX (si exposition UI)**: **NON CONFORME** (messages non orientés utilisateur final).
- **Prêt pour validation finale**: **NON**.

## Actions correctives bloquantes
1. **Implémenter réellement** `normalizeUserName` dans le codebase runtime (pas seulement pseudo-code), avec export/utilisation traçable.
2. **Exécuter et fournir les preuves de tests** (résultat CI/local) couvrant tous les AC + cas d’erreur.
3. **Décider et figer la spec whitespace** (espaces ASCII seuls vs tous les blancs Unicode), puis aligner code + tests + doc.
4. **Corriger les messages d’erreur exposables UI** en langage métier clair (ex. “Le nom utilisateur ne peut pas être vide.”).

## Actions correctives non bloquantes
1. Ajouter des tests ciblés supplémentaires : apostrophes, tirets, Unicode combiné, cas déjà normalisés.
2. Introduire des **codes d’erreur** (ex. `ERR_USERNAME_EMPTY`) pour faciliter i18n et mapping UI.
3. Documenter explicitement les limites (ex. choix sur tab/NBSP) dans la doc technique.
4. Uniformiser la terminologie FR métier dans les messages et la documentation.

## Verdict global
**CONCERNS — REFUS CONDITIONNEL**

Le design est techniquement prometteur, mais la DoD n’est pas atteinte à ce stade faute de preuve d’implémentation/test et d’un niveau UX acceptable pour exposition directe en interface. Validation possible après fermeture des actions bloquantes.
