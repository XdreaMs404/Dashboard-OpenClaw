# S053 — Handoff DEV → UXQA

## Story
- ID: S053
- Canonical story: E05-S05
- Epic: E05
- Phase cible: H14 (UX QA Audit)
- Statut DEV: READY_FOR_UX_AUDIT
- checkpoint_token: READY_FOR_UX_AUDIT

## Scope implémenté (strict S053)
- `app/src/aqcd-risk-register.js` (nouveau)
- `app/src/index.js` (export `buildAqcdRiskRegister`)
- `app/tests/unit/aqcd-risk-register.test.js` (nouveau)
- `app/tests/edge/aqcd-risk-register.edge.test.js` (nouveau)

## Résultat livré (FR-049 / FR-050)
- Registre risques vivant avec validation stricte `owner`, `dueAt`, `status`, `exposure`.
- Liens mitigation obligatoires pour risques ouverts: `taskId` + `proofRef`.
- Sortie structurée: `riskRegister` (counts/open/overdue/highestExposure) et `mitigationLinks` (coverage/risques manquants).
- Contrôles fail-closed: input invalide, registre vide, baseline AQCD < seuil, p95 latence > budget.

## Vérifications DEV (preuves)
- `npm run lint` ✅
- `npm run typecheck` ✅
- `npx vitest run tests/unit/aqcd-risk-register.test.js tests/edge/aqcd-risk-register.edge.test.js` ✅
- `npm test` ✅

## États UX à auditer
- `empty` (registre vide -> `AQCD_RISK_REGISTER_EMPTY`)
- `error` (input invalide / mitigation manquante / baseline non conforme / latence dépassée)
- `success` (`OK`)
- `loading` non applicable côté fonction pure (pas d’I/O asynchrone)

## Next handoff
UXQA → DEV/TEA (H15)
