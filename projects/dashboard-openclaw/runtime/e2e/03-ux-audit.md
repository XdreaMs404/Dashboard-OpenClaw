# 03 — UX Audit (Runtime E2E)

## Périmètre audité
Analyse UX basée sur `02-dev-output.md` (fonction `normalizeUserName`).

## 1) Clarté des messages d’erreur
- `"input doit être une chaîne"` : compréhensible côté dev, mais vocabulaire mixte FR/EN (`input`) et orienté technique.
- `"input vide après trim"` : formulation technique (`trim`) peu adaptée à un utilisateur final.

**Évaluation:** partiellement clair, mais **insuffisant pour une UX user-facing**.

## 2) Lisibilité
- Messages courts et directs ✅
- Terminologie trop technique (`input`, `trim`) ⚠️
- Pas de contexte métier explicite (`nom utilisateur`) ⚠️

**Évaluation:** lisible pour développeurs, **moyennement lisible pour utilisateurs non techniques**.

## 3) Accessibilité texte
- Pour l’accessibilité cognitive, les messages devraient indiquer clairement quoi corriger, en langage naturel.
- Recommandé :
  - `"Le nom utilisateur doit être du texte."`
  - `"Le nom utilisateur ne peut pas être vide."`

**Évaluation:** accessibilité textuelle **à améliorer** si les messages sont affichés en UI.

## 4) Risques UX
1. **Compréhension utilisateur dégradée** si messages techniques remontent tels quels en interface.
2. **Perception d’incohérence** possible sur les espaces non standards (`tab`, `NBSP`) non normalisés en interne.
3. **Absence de message orienté action** (“que faire maintenant ?”).

## Verdict
**CONCERNS**

Implémentation techniquement cohérente, mais qualité UX textuelle insuffisante pour une exposition directe aux utilisateurs sans couche de reformulation métier.