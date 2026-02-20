const DEFAULT_NOTIFICATION_SLA_MINUTES = 10;
const MINUTE_IN_MS = 60_000;

export const BMAD_PHASE_ORDER = Object.freeze(
  Array.from({ length: 23 }, (_, index) => `H${String(index + 1).padStart(2, '0')}`)
);

function parseDateToMs(value) {
  if (value instanceof Date) {
    const dateMs = value.getTime();
    return Number.isFinite(dateMs) ? dateMs : null;
  }

  if (typeof value === 'string') {
    if (value.trim().length === 0) {
      return null;
    }

    const dateMs = Date.parse(value);
    return Number.isFinite(dateMs) ? dateMs : null;
  }

  return null;
}

function resolveSlaMs(notificationSlaMinutes) {
  if (
    typeof notificationSlaMinutes !== 'number' ||
    !Number.isFinite(notificationSlaMinutes) ||
    notificationSlaMinutes <= 0
  ) {
    return DEFAULT_NOTIFICATION_SLA_MINUTES * MINUTE_IN_MS;
  }

  return Math.trunc(notificationSlaMinutes * MINUTE_IN_MS);
}

function createResult({ allowed, reasonCode, reason, fromIndex, toIndex, elapsedMs, slaMs }) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: {
      fromIndex,
      toIndex,
      elapsedMs,
      slaMs
    }
  };
}

export function validatePhaseTransition(input) {
  const payload = input && typeof input === 'object' ? input : {};
  const fromPhase = typeof payload.fromPhase === 'string' ? payload.fromPhase : '';
  const toPhase = typeof payload.toPhase === 'string' ? payload.toPhase : '';

  const fromIndex = BMAD_PHASE_ORDER.indexOf(fromPhase);
  const toIndex = BMAD_PHASE_ORDER.indexOf(toPhase);
  const slaMs = resolveSlaMs(payload.notificationSlaMinutes);

  if (fromIndex === -1 || toIndex === -1) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_PHASE',
      reason: `Phase invalide détectée: fromPhase=${String(fromPhase)}, toPhase=${String(toPhase)}. Phases autorisées: ${BMAD_PHASE_ORDER[0]}..${BMAD_PHASE_ORDER[BMAD_PHASE_ORDER.length - 1]}.`,
      fromIndex,
      toIndex,
      elapsedMs: null,
      slaMs
    });
  }

  const expectedToPhase = BMAD_PHASE_ORDER[fromIndex + 1] ?? null;

  if (expectedToPhase === null || toPhase !== expectedToPhase) {
    return createResult({
      allowed: false,
      reasonCode: 'TRANSITION_NOT_ALLOWED',
      reason: `Transition non autorisée: fromPhase=${fromPhase}, toPhase=${toPhase}, expectedToPhase=${expectedToPhase ?? 'NONE'}.`,
      fromIndex,
      toIndex,
      elapsedMs: null,
      slaMs
    });
  }

  const transitionRequestedMs = parseDateToMs(payload.transitionRequestedAt);

  if (transitionRequestedMs === null) {
    return createResult({
      allowed: false,
      reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
      reason: `transitionRequestedAt invalide pour fromPhase=${fromPhase}, toPhase=${toPhase}; validation SLA impossible.`,
      fromIndex,
      toIndex,
      elapsedMs: null,
      slaMs
    });
  }

  const notificationPublishedMs = parseDateToMs(payload.notificationPublishedAt);

  if (notificationPublishedMs === null) {
    return createResult({
      allowed: false,
      reasonCode: 'PHASE_NOTIFICATION_MISSING',
      reason: `Notification de phase manquante ou invalide: notificationPublishedAt requis pour fromPhase=${fromPhase}, toPhase=${toPhase}.`,
      fromIndex,
      toIndex,
      elapsedMs: null,
      slaMs
    });
  }

  const elapsedMs = transitionRequestedMs - notificationPublishedMs;

  if (elapsedMs < 0 || elapsedMs > slaMs) {
    return createResult({
      allowed: false,
      reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
      reason: `Notification hors SLA: elapsedMs=${elapsedMs}, slaMs=${slaMs}, fromPhase=${fromPhase}, toPhase=${toPhase}.`,
      fromIndex,
      toIndex,
      elapsedMs,
      slaMs
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: `Transition autorisée: fromPhase=${fromPhase}, toPhase=${toPhase}, elapsedMs=${elapsedMs}, slaMs=${slaMs}.`,
    fromIndex,
    toIndex,
    elapsedMs,
    slaMs
  });
}
