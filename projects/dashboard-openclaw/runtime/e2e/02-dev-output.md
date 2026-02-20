# 02 — DEV Output (Runtime E2E)

## Objectif implémentation
Implémenter `normalizeUserName(input)` en respectant strictement le scope runtime E2E :
- trim début/fin
- réduction des espaces internes multiples à un seul
- conservation de la casse et des accents
- erreur explicite si vide après trim

## Contrat technique proposé
- **Entrée attendue**: `string`
- **Sortie**: `string` normalisée
- **Erreurs**:
  - `TypeError("input doit être une chaîne")` si entrée non string
  - `Error("input vide après trim")` si `input.trim()` est vide

## Pseudo-implémentation JS
```js
/**
 * Normalise un nom utilisateur sans altérer accents/casse.
 * @param {string} input
 * @returns {string}
 * @throws {TypeError|Error}
 */
function normalizeUserName(input) {
  if (typeof input !== "string") {
    throw new TypeError("input doit être une chaîne");
  }

  const trimmed = input.trim();

  if (trimmed.length === 0) {
    throw new Error("input vide après trim");
  }

  // Réduit uniquement les espaces classiques internes (U+0020)
  // pour rester aligné au besoin exprimé sur les "espaces".
  const normalized = trimmed.replace(/ {2,}/g, " ");

  return normalized;
}
```

## Tests unitaires suggérés (Jest/Vitest style)
```js
describe("normalizeUserName", () => {
  it("trim + collapse espaces internes", () => {
    expect(normalizeUserName("  Jean   Dupont  ")).toBe("Jean Dupont");
  });

  it("préserve accents et casse", () => {
    expect(normalizeUserName("Élodie   Martin")).toBe("Élodie Martin");
  });

  it("lève erreur explicite pour string vide", () => {
    expect(() => normalizeUserName("")).toThrow("input vide après trim");
  });

  it("lève erreur explicite pour string espaces uniquement", () => {
    expect(() => normalizeUserName("  ")).toThrow("input vide après trim");
  });

  // Recommandés (robustesse)
  it("retourne inchangé si déjà normalisé", () => {
    expect(normalizeUserName("Alice Martin")).toBe("Alice Martin");
  });

  it("gère plusieurs groupes d'espaces", () => {
    expect(normalizeUserName("  Jean   Claude   Van   Damme ")).toBe("Jean Claude Van Damme");
  });

  it("rejette les entrées non string", () => {
    expect(() => normalizeUserName(null)).toThrow(TypeError);
    expect(() => normalizeUserName(undefined)).toThrow(TypeError);
    expect(() => normalizeUserName(42)).toThrow(TypeError);
  });
});
```

## Edge cases identifiés
1. **Tabs/newlines/espaces Unicode** (`\t`, `\n`, `\u00A0`) : comportement non explicitement demandé.
   - Décision actuelle: `trim()` gère les bords, mais la réduction interne cible les espaces simples (`U+0020`).
   - Alternative possible (si spec évolue): remplacer `/ {2,}/g` par `/\s+/g`.
2. **Entrées non string** : non couvert par AC, mais robuste de lever `TypeError`.
3. **Noms avec apostrophes/tirets** (`d'Artois`, `Anne-Marie`) : inchangés, car aucune normalisation lexicale.
4. **Casse mixte/accentuation forte** (`ÉLÈVE`, `Çınar`) : préservées (pas de `toLowerCase`/normalisation Unicode).

## Résultat attendu vs AC
- AC1 ✅ `"  Jean   Dupont  " -> "Jean Dupont"`
- AC2 ✅ `"Élodie   Martin" -> "Élodie Martin"`
- AC3 ✅ `"  "` lève erreur explicite
- AC4 ✅ `""` lève erreur explicite
