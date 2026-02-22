# S001 — TEA Test Challenge

## Verdict
CONCERNS

## Constats
1. **Couverture globale solide sur le nominal et les edges principaux** : unit + edge + e2e passent, avec validation des cas demandés (`Jean Dupont`, accents/casse, séparateurs mixtes, erreurs vide/non-string, long input >= 10k, flux UI empty/loading/error/success).
2. **Risque de faux positifs sur les messages "exacts"** : les tests edge utilisent `toThrow(expectedMessage)` (string), ce qui valide une **sous-chaîne** et pas une égalité stricte du message. Un message enrichi/préfixé pourrait passer malgré une régression de contrat.
3. **Traçabilité incomplète d’un AC** : AC d’export via `app/src/index.js` présent dans le code, mais **pas couvert par test automatisé** (imports des tests pointent `src/core.js`).
4. **Assertions E2E fragiles sur état transitoire** : vérification de `loading` juste après click sur un état court (150ms) → possible flakiness selon timing CI. De plus, l’état erreur vérifie le texte mais pas explicitement la visibilité (`toBeVisible`) ni la réactivation explicite du bouton.
5. **Risque de régression latent hors scope S001** : une branche de `clamp` reste non couverte (coverage signale ligne 39), ce qui affaiblit le garde-fou non-régression global.

## Recommandations actionnables
1. **Rendre les checks de message stricts** (priorité haute): remplacer `toThrow(string)` par une assertion stricte de `error.message === <message exact>` via helper dédié.
2. **Ajouter un test d’API publique** (priorité haute): test unitaire d’export depuis `src/index.js` (`normalizeUserName` présent et callable), pour fermer le trou de traçabilité AC.
3. **Durcir l’E2E** (priorité moyenne):
   - séparer flux erreur et flux succès en 2 tests,
   - vérifier explicitement `errorMessage` visible en état error,
   - vérifier bouton réactivé après traitement,
   - réduire flakiness sur `loading` (assertion de transition plus robuste).
4. **Compléter le filet non-régression** (priorité moyenne): ajouter test `clamp` sur arguments non numériques pour couvrir la branche manquante.

## Décision bloquante/non-bloquante
- **Points bloquants identifiés** : 0
- **Décision** : **Non bloquant pour DONE**
