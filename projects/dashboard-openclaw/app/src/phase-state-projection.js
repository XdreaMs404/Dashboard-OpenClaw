import { validatePhasePrerequisites } from './phase-prerequisites-validator.js';
import { BMAD_PHASE_ORDER, validatePhaseTransition } from './phase-transition-validator.js';

const TRANSITION_BLOCKING_REASON_CODES = new Set([
  'TRANSITION_NOT_ALLOWED',
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED'
]);

const PREREQUISITES_BLOCKING_REASON_CODES = new Set([
  'PHASE_PREREQUISITES_MISSING',
  'INVALID_PHASE_PREREQUISITES',
  'PHASE_PREREQUISITES_INCOMPLETE'
]);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function parseTimestamp(value) {
  if (value === null || value === undefined) {
    return { state: 'missing', ms: null };
  }

  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? { state: 'valid', ms } : { state: 'invalid', ms: null };
  }

  if (typeof value === 'string') {
    if (value.trim().length === 0) {
      return { state: 'missing', ms: null };
    }

    const ms = Date.parse(value);
    return Number.isFinite(ms) ? { state: 'valid', ms } : { state: 'invalid', ms: null };
  }

  return { state: 'invalid', ms: null };
}

function resolveNow(nowAt) {
  if (nowAt === undefined || nowAt === null) {
    return { state: 'valid', ms: Date.now() };
  }

  const parsed = parseTimestamp(nowAt);

  if (parsed.state === 'missing') {
    return { state: 'valid', ms: Date.now() };
  }

  return parsed;
}

function normalizeOwner(owner) {
  if (typeof owner !== 'string') {
    return '';
  }

  return owner.trim();
}

function toIso(ms) {
  return new Date(ms).toISOString();
}

function normalizeReason(value, fallback) {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return fallback;
}

function resolveTransitionValidation(payload) {
  if (isObject(payload.transitionValidation)) {
    return payload.transitionValidation;
  }

  if (isObject(payload.transitionInput)) {
    return validatePhaseTransition(payload.transitionInput);
  }

  return null;
}

function resolvePrerequisiteValidation(payload) {
  if (payload.prerequisiteValidation !== undefined) {
    if (!isObject(payload.prerequisiteValidation)) {
      return {
        sourceState: 'invalid',
        validation: null,
        reason: 'prerequisiteValidation doit être un objet valide.'
      };
    }

    return {
      sourceState: 'provided',
      validation: payload.prerequisiteValidation,
      reason: null
    };
  }

  if (payload.prerequisitesValidation !== undefined) {
    if (!isObject(payload.prerequisitesValidation)) {
      return {
        sourceState: 'invalid',
        validation: null,
        reason: 'prerequisitesValidation doit être un objet valide.'
      };
    }

    return {
      sourceState: 'provided',
      validation: payload.prerequisitesValidation,
      reason: null
    };
  }

  if (payload.prerequisitesInput === undefined) {
    return {
      sourceState: 'missing',
      validation: null,
      reason: null
    };
  }

  if (!isObject(payload.prerequisitesInput)) {
    return {
      sourceState: 'invalid',
      validation: null,
      reason: 'prerequisitesInput doit être un objet valide.'
    };
  }

  return {
    sourceState: 'provided',
    validation: validatePhasePrerequisites(payload.prerequisitesInput),
    reason: null
  };
}

function normalizeCount(value) {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.trunc(value);
}

function normalizeMissingPrerequisiteIds(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set();

  for (const item of value) {
    if (typeof item !== 'string') {
      continue;
    }

    const normalized = item.trim();

    if (normalized.length > 0) {
      unique.add(normalized);
    }
  }

  return [...unique];
}

function resolvePrerequisitesSummary(prerequisiteValidation) {
  if (!isObject(prerequisiteValidation) || !isObject(prerequisiteValidation.diagnostics)) {
    return {
      requiredCount: 0,
      satisfiedCount: 0,
      missingPrerequisiteIds: []
    };
  }

  const requiredCount = normalizeCount(prerequisiteValidation.diagnostics.requiredCount);
  const satisfiedCountRaw = normalizeCount(prerequisiteValidation.diagnostics.satisfiedCount);
  const satisfiedCount = Math.min(requiredCount, satisfiedCountRaw);

  return {
    requiredCount,
    satisfiedCount,
    missingPrerequisiteIds: normalizeMissingPrerequisiteIds(
      prerequisiteValidation.diagnostics.missingPrerequisiteIds
    )
  };
}

function resolveTransitionBlock(transitionValidation) {
  if (!isObject(transitionValidation) || transitionValidation.allowed !== false) {
    return null;
  }

  const reasonCode =
    typeof transitionValidation.reasonCode === 'string'
      ? transitionValidation.reasonCode
      : 'TRANSITION_NOT_ALLOWED';

  const reason = normalizeReason(
    transitionValidation.reason,
    'Blocage transition détecté sans détail explicite.'
  );

  if (TRANSITION_BLOCKING_REASON_CODES.has(reasonCode)) {
    return {
      reasonCode,
      reason
    };
  }

  return {
    reasonCode: 'TRANSITION_NOT_ALLOWED',
    reason: `Blocage transition amont: ${reason}`
  };
}

function resolvePrerequisitesBlock(prerequisiteResolution) {
  if (prerequisiteResolution.sourceState === 'missing') {
    return {
      blocked: true,
      reasonCode: 'PHASE_PREREQUISITES_MISSING',
      reason:
        'Validation des prérequis absente: prerequisiteValidation ou prerequisitesInput est requis.'
    };
  }

  if (prerequisiteResolution.sourceState === 'invalid') {
    return {
      blocked: true,
      reasonCode: 'INVALID_PHASE_PREREQUISITES',
      reason: `Validation des prérequis invalide: ${prerequisiteResolution.reason}`
    };
  }

  const prerequisiteValidation = prerequisiteResolution.validation;

  if (!isObject(prerequisiteValidation)) {
    return {
      blocked: true,
      reasonCode: 'INVALID_PHASE_PREREQUISITES',
      reason: 'Résultat invalide depuis validatePhasePrerequisites: objet requis.'
    };
  }

  if (prerequisiteValidation.allowed === true) {
    return {
      blocked: false,
      reasonCode: 'OK',
      reason: 'Prérequis validés.'
    };
  }

  const reasonCode =
    typeof prerequisiteValidation.reasonCode === 'string'
      ? prerequisiteValidation.reasonCode
      : 'INVALID_PHASE_PREREQUISITES';

  const reason = normalizeReason(
    prerequisiteValidation.reason,
    'Blocage prérequis détecté sans détail explicite.'
  );

  if (PREREQUISITES_BLOCKING_REASON_CODES.has(reasonCode)) {
    return {
      blocked: true,
      reasonCode,
      reason
    };
  }

  if (TRANSITION_BLOCKING_REASON_CODES.has(reasonCode)) {
    return {
      blocked: true,
      reasonCode,
      reason
    };
  }

  return {
    blocked: true,
    reasonCode: 'INVALID_PHASE_PREREQUISITES',
    reason: `Validation des prérequis invalide: reasonCode=${reasonCode}. ${reason}`
  };
}

function resolveTemporalProjection(started, finished, now) {
  if (started.state === 'invalid' || finished.state === 'invalid') {
    return {
      status: 'blocked',
      durationMs: null,
      blockingReasonCode: 'INVALID_PHASE_TIMESTAMPS',
      blockingReason:
        'Horodatages invalides: startedAt et/ou finishedAt doivent être des dates valides.'
    };
  }

  if (started.state === 'missing' && finished.state === 'missing') {
    return {
      status: 'pending',
      durationMs: null,
      blockingReasonCode: null,
      blockingReason: null
    };
  }

  if (started.state === 'missing' && finished.state === 'valid') {
    return {
      status: 'blocked',
      durationMs: null,
      blockingReasonCode: 'INVALID_PHASE_TIMESTAMPS',
      blockingReason:
        'Horodatages invalides: finishedAt ne peut pas être renseigné sans startedAt.'
    };
  }

  if (started.state === 'valid' && finished.state === 'missing') {
    if (now.state !== 'valid') {
      return {
        status: 'blocked',
        durationMs: null,
        blockingReasonCode: 'INVALID_PHASE_TIMESTAMPS',
        blockingReason: 'Horodatage invalide: nowAt doit être une date valide.'
      };
    }

    const durationMs = now.ms - started.ms;

    if (!Number.isFinite(durationMs) || durationMs < 0) {
      return {
        status: 'blocked',
        durationMs: null,
        blockingReasonCode: 'INVALID_PHASE_TIMESTAMPS',
        blockingReason:
          'Horodatages invalides: nowAt doit être supérieur ou égal à startedAt pour une phase running.'
      };
    }

    return {
      status: 'running',
      durationMs,
      blockingReasonCode: null,
      blockingReason: null
    };
  }

  if (finished.ms < started.ms) {
    return {
      status: 'blocked',
      durationMs: null,
      blockingReasonCode: 'INVALID_PHASE_TIMESTAMPS',
      blockingReason: 'Horodatages invalides: finishedAt doit être supérieur ou égal à startedAt.'
    };
  }

  return {
    status: 'done',
    durationMs: finished.ms - started.ms,
    blockingReasonCode: null,
    blockingReason: null
  };
}

function createProjection({
  phaseId,
  owner,
  startedAt,
  finishedAt,
  status,
  durationMs,
  activationAllowed,
  prerequisites,
  blockingReasonCode,
  blockingReason,
  diagnostics
}) {
  return {
    phaseId,
    owner,
    started_at: startedAt,
    finished_at: finishedAt,
    status,
    duration_ms: durationMs,
    activationAllowed,
    prerequisites,
    blockingReasonCode,
    blockingReason,
    diagnostics
  };
}

export function buildPhaseStateProjection(input) {
  const payload = isObject(input) ? input : {};
  const phaseId = typeof payload.phaseId === 'string' ? payload.phaseId : '';
  const owner = normalizeOwner(payload.owner);

  const started = parseTimestamp(payload.startedAt);
  const finished = parseTimestamp(payload.finishedAt);
  const now = resolveNow(payload.nowAt);

  const startedAt = started.state === 'valid' ? toIso(started.ms) : null;
  const finishedAt = finished.state === 'valid' ? toIso(finished.ms) : null;

  const transitionValidation = resolveTransitionValidation(payload);
  const transitionBlock = resolveTransitionBlock(transitionValidation);

  const prerequisiteResolution = resolvePrerequisiteValidation(payload);
  const prerequisiteValidation = prerequisiteResolution.validation;
  const prerequisitesSummary = resolvePrerequisitesSummary(prerequisiteValidation);
  const prerequisitesBlock = resolvePrerequisitesBlock(prerequisiteResolution);

  const temporal = resolveTemporalProjection(started, finished, now);

  const transitionAllowed =
    isObject(transitionValidation) && typeof transitionValidation.allowed === 'boolean'
      ? transitionValidation.allowed
      : null;

  const transitionReasonCode =
    isObject(transitionValidation) && typeof transitionValidation.reasonCode === 'string'
      ? transitionValidation.reasonCode
      : null;

  const prerequisiteAllowed =
    isObject(prerequisiteValidation) && typeof prerequisiteValidation.allowed === 'boolean'
      ? prerequisiteValidation.allowed
      : null;

  const prerequisiteReasonCode =
    isObject(prerequisiteValidation) && typeof prerequisiteValidation.reasonCode === 'string'
      ? prerequisiteValidation.reasonCode
      : prerequisitesBlock.reasonCode;

  const diagnostics = {
    startedMs: started.ms,
    finishedMs: finished.ms,
    nowMs: now.ms,
    transitionAllowed,
    transitionReasonCode,
    prerequisiteAllowed,
    prerequisiteReasonCode,
    durationComputationMs: typeof temporal.durationMs === 'number' ? temporal.durationMs : null
  };

  const prerequisites = {
    requiredCount: prerequisitesSummary.requiredCount,
    satisfiedCount: prerequisitesSummary.satisfiedCount,
    missingPrerequisiteIds: [...prerequisitesSummary.missingPrerequisiteIds]
  };

  const phaseIsValid = BMAD_PHASE_ORDER.includes(phaseId);
  const ownerIsValid = owner.length > 0;

  let status = temporal.status;
  let blockingReasonCode = temporal.blockingReasonCode;
  let blockingReason = temporal.blockingReason;

  if (!phaseIsValid || !ownerIsValid) {
    status = 'blocked';
    blockingReasonCode = 'INVALID_PHASE_STATE';
    blockingReason = `État de phase invalide: phaseId=${String(phaseId)}, owner=${String(owner)}.`;
  } else if (transitionBlock) {
    status = 'blocked';
    blockingReasonCode = transitionBlock.reasonCode;
    blockingReason = transitionBlock.reason;
  } else if (temporal.blockingReasonCode) {
    status = 'blocked';
    blockingReasonCode = temporal.blockingReasonCode;
    blockingReason = temporal.blockingReason;
  } else if (prerequisitesBlock.blocked) {
    status = 'blocked';
    blockingReasonCode = prerequisitesBlock.reasonCode;
    blockingReason = prerequisitesBlock.reason;
  }

  const activationAllowed =
    status !== 'blocked' && prerequisiteAllowed === true && prerequisitesBlock.blocked === false;

  return createProjection({
    phaseId,
    owner,
    startedAt,
    finishedAt,
    status,
    durationMs: temporal.durationMs,
    activationAllowed,
    prerequisites,
    blockingReasonCode,
    blockingReason,
    diagnostics
  });
}
