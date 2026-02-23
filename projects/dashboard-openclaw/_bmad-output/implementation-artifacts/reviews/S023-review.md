# S023 — Revue finale (H18 Reviewer)

- Dernière vérification reviewer (UTC): 2026-02-23T19:20:30Z

## Verdict
**CHANGES_REQUESTED**

## Scope revu (STRICT S023)
- Story SoT: `_bmad-output/implementation-artifacts/stories/S023.md`
- Handoff TEA: `_bmad-output/implementation-artifacts/handoffs/S023-tea-to-reviewer.md`
- Gates techniques: `_bmad-output/implementation-artifacts/handoffs/S023-tech-gates.log`
- Audit UX: `_bmad-output/implementation-artifacts/ux-audits/S023-ux-audit.json`
- Code S023: `app/src/artifact-risk-annotations.js`
- Dépendance S022: `app/src/artifact-parse-diagnostics.js`

## Gates
- G4-T: PASS (logs présents et rejoués côté reviewer).
- G4-UX: PASS.

## Findings (bloquants)
### 1) CRITICAL — AC-01 violé (perte silencieuse de parse issues)
- `annotateArtifactRiskContext` ignore les parse issues dont `artifactPath` n’est pas absolu (ou vide) via `continue`.
- Preuve code: `app/src/artifact-risk-annotations.js:711-715`.
- Conséquence: des parse errors valides peuvent disparaître du résultat (`taggedArtifacts/contextAnnotations`), contraire à AC-01 (chaque parse issue convertie en annotation exploitable).

### 2) HIGH — AC-04 fragilisé (source parse failed peut ressortir en OK nominal)
- Quand toutes les issues sont filtrées, le module retourne `OK` + message nominal.
- Preuve code: `app/src/artifact-risk-annotations.js:1065-1067`.
- Repro reviewer: entrée `parseDiagnosticsInput` avec `artifactId` valide et `artifactPath` absent retourne `reasonCode=OK` + `annotationsCount=0` malgré parse error amont.

### 3) HIGH — Contrat amont S022 compatible avec ce cas (donc bug réellement atteignable)
- S022 n’impose pas `artifactPath` non vide; `artifactId` suffit pour accepter un parse event.
- Preuve code: `app/src/artifact-parse-diagnostics.js:589-596` (artifactId requis), `app/src/artifact-parse-diagnostics.js:637` (artifactPath normalisé, potentiellement vide).
- Donc la perte silencieuse de S023 est atteignable sans violer le contrat S022.

## Actions correctives requises (DEV)
1. Ne plus ignorer silencieusement les issues sans `artifactPath`:
   - soit fallback strict sur `artifactId` (annotation/tag générés),
   - soit fail-closed explicite `INVALID_RISK_ANNOTATION_INPUT`.
2. Empêcher le retour `OK` nominal quand parse issues amont existent mais ont été filtrées.
3. Ajouter tests unit/edge couvrant le cas `artifactPath` absent depuis `parseDiagnosticsInput` (S022 délégué) + assertion non-régression AC-01/AC-04.

## Décision H18
- **FIX_REVIEWER:Ne pas ignorer les parseIssues sans artifactPath; traiter via artifactId ou fail-closed explicite.**
