import { BMAD_PHASE_ORDER, validatePhaseTransition } from './phase-transition-validator.js';

const TRANSITION_BLOCKING_REASON_CODES = new Set([
  'INVALID_PHASE',
  'TRANSITION_NOT_ALLOWED',
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED'
]);

const ALLOWED_PREREQUISITE_STATUS = new Set(['done', 'pending', 'blocked']);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizePhase(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeReason(value) {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return 'Blocage détecté sans détail explicite.';
}

function resolveTransitionValidation(payload, fromPhase, toPhase) {
  if (isObject(payload.transitionValidation)) {
    return payload.transitionValidation;
  }

  if (isObject(payload.transitionInput)) {
    return validatePhaseTransition(payload.transitionInput);
  }

  return validatePhaseTransition({
    fromPhase,
    toPhase,
    transitionRequestedAt: payload.transitionRequestedAt,
    notificationPublishedAt: payload.notificationPublishedAt,
    notificationSlaMinutes: payload.notificationSlaMinutes
  });
}

function derivePhaseFromTransitionDiagnostics(transitionValidation, key) {
  if (!isObject(transitionValidation) || !isObject(transitionValidation.diagnostics)) {
    return '';
  }

  const indexKey = key === 'fromPhase' ? 'fromIndex' : 'toIndex';
  const indexValue = transitionValidation.diagnostics[indexKey];

  if (!Number.isInteger(indexValue)) {
    return '';
  }

  return BMAD_PHASE_ORDER[indexValue] ?? '';
}

function resolvePhase(payload, transitionValidation, key) {
  const directValue = normalizePhase(payload[key]);

  if (directValue.length > 0) {
    return directValue;
  }

  if (isObject(payload.transitionInput)) {
    const transitionInputValue = normalizePhase(payload.transitionInput[key]);

    if (transitionInputValue.length > 0) {
      return transitionInputValue;
    }
  }

  return derivePhaseFromTransitionDiagnostics(transitionValidation, key);
}

function analyzePrerequisites(prerequisites) {
  if (!Array.isArray(prerequisites) || prerequisites.length === 0) {
    return {
      state: 'missing',
      requiredCount: 0,
      satisfiedCount: 0,
      missingPrerequisiteIds: [],
      issues: []
    };
  }

  const seenIds = new Set();
  const normalizedItems = [];
  const issues = [];

  for (const [index, prerequisite] of prerequisites.entries()) {
    if (!isObject(prerequisite)) {
      issues.push(`index=${index}: item de prérequis invalide (objet requis).`);
      continue;
    }

    const id = typeof prerequisite.id === 'string' ? prerequisite.id.trim() : '';

    if (id.length === 0) {
      issues.push(`index=${index}: id de prérequis manquant ou vide.`);
      continue;
    }

    if (seenIds.has(id)) {
      issues.push(`id en doublon détecté: ${id}.`);
    } else {
      seenIds.add(id);
    }

    const required = prerequisite.required;
    if (typeof required !== 'boolean') {
      issues.push(`id=${id}: required doit être booléen.`);
    }

    const status = typeof prerequisite.status === 'string' ? prerequisite.status.trim() : '';
    if (!ALLOWED_PREREQUISITE_STATUS.has(status)) {
      issues.push(`id=${id}: status invalide (${String(prerequisite.status)}).`);
    }

    normalizedItems.push({ id, required, status });
  }

  const requiredItems = normalizedItems.filter((item) => item.required === true);
  const missingPrerequisiteIds = requiredItems
    .filter((item) => item.status !== 'done')
    .map((item) => item.id);

  if (issues.length > 0) {
    return {
      state: 'invalid',
      requiredCount: requiredItems.length,
      satisfiedCount: requiredItems.length - missingPrerequisiteIds.length,
      missingPrerequisiteIds,
      issues
    };
  }

  return {
    state: 'valid',
    requiredCount: requiredItems.length,
    satisfiedCount: requiredItems.length - missingPrerequisiteIds.length,
    missingPrerequisiteIds,
    issues: []
  };
}

function createResult({ allowed, reasonCode, reason, diagnostics }) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics
  };
}

export function validatePhasePrerequisites(input) {
  const payload = isObject(input) ? input : {};

  const transitionValidation = resolveTransitionValidation(
    payload,
    normalizePhase(payload.fromPhase),
    normalizePhase(payload.toPhase)
  );

  const fromPhase = resolvePhase(payload, transitionValidation, 'fromPhase');
  const toPhase = resolvePhase(payload, transitionValidation, 'toPhase');

  const checklistAnalysis = analyzePrerequisites(payload.prerequisites);

  const diagnostics = {
    fromPhase,
    toPhase,
    requiredCount: checklistAnalysis.requiredCount,
    satisfiedCount: checklistAnalysis.satisfiedCount,
    missingPrerequisiteIds: [...checklistAnalysis.missingPrerequisiteIds],
    blockedByTransition: false,
    transitionAllowed:
      isObject(transitionValidation) && typeof transitionValidation.allowed === 'boolean'
        ? transitionValidation.allowed
        : null,
    transitionReasonCode:
      isObject(transitionValidation) && typeof transitionValidation.reasonCode === 'string'
        ? transitionValidation.reasonCode
        : null
  };

  if (isObject(transitionValidation) && transitionValidation.allowed === false) {
    diagnostics.blockedByTransition = true;

    if (TRANSITION_BLOCKING_REASON_CODES.has(transitionValidation.reasonCode)) {
      return createResult({
        allowed: false,
        reasonCode: transitionValidation.reasonCode,
        reason: normalizeReason(transitionValidation.reason),
        diagnostics
      });
    }

    return createResult({
      allowed: false,
      reasonCode: 'TRANSITION_NOT_ALLOWED',
      reason: `Blocage transition amont: ${normalizeReason(transitionValidation.reason)}`,
      diagnostics
    });
  }

  const fromIndex = BMAD_PHASE_ORDER.indexOf(fromPhase);
  const toIndex = BMAD_PHASE_ORDER.indexOf(toPhase);

  if (fromIndex === -1 || toIndex === -1) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_PHASE',
      reason: `Phase invalide détectée: fromPhase=${String(fromPhase)}, toPhase=${String(toPhase)}.`,
      diagnostics
    });
  }

  const expectedToPhase = BMAD_PHASE_ORDER[fromIndex + 1] ?? null;

  if (expectedToPhase === null || expectedToPhase !== toPhase) {
    return createResult({
      allowed: false,
      reasonCode: 'TRANSITION_NOT_ALLOWED',
      reason: `Transition non autorisée: fromPhase=${fromPhase}, toPhase=${toPhase}, expectedToPhase=${expectedToPhase ?? 'NONE'}.`,
      diagnostics
    });
  }

  if (checklistAnalysis.state === 'missing') {
    return createResult({
      allowed: false,
      reasonCode: 'PHASE_PREREQUISITES_MISSING',
      reason: 'Checklist de prérequis absente, vide ou invalide (tableau requis).',
      diagnostics
    });
  }

  if (checklistAnalysis.state === 'invalid') {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_PHASE_PREREQUISITES',
      reason: `Checklist de prérequis invalide: ${checklistAnalysis.issues.join(' ')}`,
      diagnostics
    });
  }

  if (checklistAnalysis.missingPrerequisiteIds.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'PHASE_PREREQUISITES_INCOMPLETE',
      reason: `Prérequis requis incomplets: ${checklistAnalysis.missingPrerequisiteIds.join(', ')}.`,
      diagnostics
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: `Prérequis validés pour transition ${fromPhase} -> ${toPhase}.`,
    diagnostics
  });
}
