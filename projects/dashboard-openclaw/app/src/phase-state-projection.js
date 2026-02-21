import { BMAD_PHASE_ORDER, validatePhaseTransition } from './phase-transition-validator.js';

const TRANSITION_BLOCKING_REASON_CODES = new Set([
  'TRANSITION_NOT_ALLOWED',
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED'
]);

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

function resolveTransitionValidation(payload) {
  if (payload.transitionValidation && typeof payload.transitionValidation === 'object') {
    return payload.transitionValidation;
  }

  if (payload.transitionInput && typeof payload.transitionInput === 'object') {
    return validatePhaseTransition(payload.transitionInput);
  }

  return null;
}

function isTransitionBlocked(transitionValidation) {
  return Boolean(
    transitionValidation &&
      transitionValidation.allowed === false &&
      TRANSITION_BLOCKING_REASON_CODES.has(transitionValidation.reasonCode)
  );
}

function createProjection({
  phaseId,
  owner,
  startedAt,
  finishedAt,
  status,
  durationMs,
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
    blockingReasonCode,
    blockingReason,
    diagnostics
  };
}

export function buildPhaseStateProjection(input) {
  const payload = input && typeof input === 'object' ? input : {};
  const phaseId = typeof payload.phaseId === 'string' ? payload.phaseId : '';
  const owner = normalizeOwner(payload.owner);

  const started = parseTimestamp(payload.startedAt);
  const finished = parseTimestamp(payload.finishedAt);
  const now = resolveNow(payload.nowAt);

  const startedAt = started.state === 'valid' ? toIso(started.ms) : null;
  const finishedAt = finished.state === 'valid' ? toIso(finished.ms) : null;

  const transitionValidation = resolveTransitionValidation(payload);

  const diagnostics = {
    startedMs: started.ms,
    finishedMs: finished.ms,
    nowMs: now.ms,
    transitionAllowed:
      transitionValidation && typeof transitionValidation.allowed === 'boolean'
        ? transitionValidation.allowed
        : null,
    transitionReasonCode:
      transitionValidation && typeof transitionValidation.reasonCode === 'string'
        ? transitionValidation.reasonCode
        : null
  };

  const phaseIsValid = BMAD_PHASE_ORDER.includes(phaseId);
  const ownerIsValid = owner.length > 0;

  if (!phaseIsValid || !ownerIsValid) {
    return createProjection({
      phaseId,
      owner,
      startedAt,
      finishedAt,
      status: 'blocked',
      durationMs: null,
      blockingReasonCode: 'INVALID_PHASE_STATE',
      blockingReason: `État de phase invalide: phaseId=${String(phaseId)}, owner=${String(owner)}.`,
      diagnostics
    });
  }

  if (isTransitionBlocked(transitionValidation)) {
    return createProjection({
      phaseId,
      owner,
      startedAt,
      finishedAt,
      status: 'blocked',
      durationMs: null,
      blockingReasonCode: transitionValidation.reasonCode,
      blockingReason: String(transitionValidation.reason || transitionValidation.reasonCode),
      diagnostics
    });
  }

  if (started.state === 'invalid' || finished.state === 'invalid') {
    return createProjection({
      phaseId,
      owner,
      startedAt,
      finishedAt,
      status: 'blocked',
      durationMs: null,
      blockingReasonCode: 'INVALID_PHASE_TIMESTAMPS',
      blockingReason:
        'Horodatages invalides: startedAt et/ou finishedAt doivent être des dates valides.',
      diagnostics
    });
  }

  if (started.state === 'missing' && finished.state === 'missing') {
    return createProjection({
      phaseId,
      owner,
      startedAt,
      finishedAt,
      status: 'pending',
      durationMs: null,
      blockingReasonCode: null,
      blockingReason: null,
      diagnostics
    });
  }

  if (started.state === 'missing' && finished.state === 'valid') {
    return createProjection({
      phaseId,
      owner,
      startedAt,
      finishedAt,
      status: 'blocked',
      durationMs: null,
      blockingReasonCode: 'INVALID_PHASE_TIMESTAMPS',
      blockingReason:
        'Horodatages invalides: finishedAt ne peut pas être renseigné sans startedAt.',
      diagnostics
    });
  }

  if (started.state === 'valid' && finished.state === 'missing') {
    if (now.state !== 'valid') {
      return createProjection({
        phaseId,
        owner,
        startedAt,
        finishedAt,
        status: 'blocked',
        durationMs: null,
        blockingReasonCode: 'INVALID_PHASE_TIMESTAMPS',
        blockingReason: 'Horodatage invalide: nowAt doit être une date valide.',
        diagnostics
      });
    }

    const durationMs = now.ms - started.ms;

    if (!Number.isFinite(durationMs) || durationMs < 0) {
      return createProjection({
        phaseId,
        owner,
        startedAt,
        finishedAt,
        status: 'blocked',
        durationMs: null,
        blockingReasonCode: 'INVALID_PHASE_TIMESTAMPS',
        blockingReason:
          'Horodatages invalides: nowAt doit être supérieur ou égal à startedAt pour une phase running.',
        diagnostics
      });
    }

    return createProjection({
      phaseId,
      owner,
      startedAt,
      finishedAt,
      status: 'running',
      durationMs,
      blockingReasonCode: null,
      blockingReason: null,
      diagnostics
    });
  }

  if (finished.ms < started.ms) {
    return createProjection({
      phaseId,
      owner,
      startedAt,
      finishedAt,
      status: 'blocked',
      durationMs: null,
      blockingReasonCode: 'INVALID_PHASE_TIMESTAMPS',
      blockingReason:
        'Horodatages invalides: finishedAt doit être supérieur ou égal à startedAt.',
      diagnostics
    });
  }

  return createProjection({
    phaseId,
    owner,
    startedAt,
    finishedAt,
    status: 'done',
    durationMs: finished.ms - started.ms,
    blockingReasonCode: null,
    blockingReason: null,
    diagnostics
  });
}
