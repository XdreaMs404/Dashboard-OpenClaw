import { BMAD_PHASE_ORDER, validatePhaseTransition } from './phase-transition-validator.js';

const DEFAULT_LOOKBACK_MINUTES = 60;
const DEFAULT_ESCALATION_THRESHOLD = 2;
const MINUTE_IN_MS = 60_000;

const TRANSITION_REASON_CODES = new Set([
  'OK',
  'INVALID_PHASE',
  'TRANSITION_NOT_ALLOWED',
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED'
]);

const SLA_BREACH_REASON_CODE = 'PHASE_NOTIFICATION_SLA_EXCEEDED';

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map((item) => cloneValue(item));
  }

  if (isObject(value)) {
    const clone = {};

    for (const [key, nested] of Object.entries(value)) {
      clone[key] = cloneValue(nested);
    }

    return clone;
  }

  return value;
}

function normalizeReasonCode(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function hasReasonText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizePhase(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function parseTimestampMs(value) {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    if (value.trim().length === 0) {
      return null;
    }

    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }

  return null;
}

function resolveNowMs(options) {
  if (isObject(options) && typeof options.nowProvider === 'function') {
    const provided = options.nowProvider();
    const parsed = parseTimestampMs(provided);

    if (parsed !== null) {
      return parsed;
    }
  }

  return Date.now();
}

function resolveNumericInput(value, fallback) {
  if (value === undefined) {
    return {
      valid: true,
      value: fallback
    };
  }

  const candidate =
    typeof value === 'string' && value.trim().length > 0
      ? Number(value)
      : typeof value === 'number'
        ? value
        : NaN;

  if (!Number.isFinite(candidate) || candidate <= 0) {
    return {
      valid: false,
      value: fallback
    };
  }

  return {
    valid: true,
    value: candidate
  };
}

function resolveLookbackMinutes(value) {
  return resolveNumericInput(value, DEFAULT_LOOKBACK_MINUTES);
}

function resolveEscalationThreshold(value) {
  const resolved = resolveNumericInput(value, DEFAULT_ESCALATION_THRESHOLD);

  if (!resolved.valid) {
    return resolved;
  }

  if (!Number.isInteger(resolved.value) || resolved.value < 1) {
    return {
      valid: false,
      value: DEFAULT_ESCALATION_THRESHOLD
    };
  }

  return {
    valid: true,
    value: Math.trunc(resolved.value)
  };
}

function normalizeTransitionValidation(candidate) {
  if (!isObject(candidate)) {
    return {
      valid: false,
      reason: 'transitionValidation doit être un objet valide.'
    };
  }

  if (typeof candidate.allowed !== 'boolean') {
    return {
      valid: false,
      reason: 'transitionValidation.allowed doit être booléen.'
    };
  }

  const reasonCode = normalizeReasonCode(candidate.reasonCode);

  if (!TRANSITION_REASON_CODES.has(reasonCode)) {
    return {
      valid: false,
      reason: `transitionValidation.reasonCode invalide: ${String(candidate.reasonCode)}.`
    };
  }

  if (!hasReasonText(candidate.reason)) {
    return {
      valid: false,
      reason: 'transitionValidation.reason doit être une chaîne non vide.'
    };
  }

  if (candidate.allowed === true && reasonCode !== 'OK') {
    return {
      valid: false,
      reason: `Incohérence transitionValidation: allowed=true exige reasonCode=OK (reçu ${reasonCode}).`
    };
  }

  if (candidate.allowed === false && reasonCode === 'OK') {
    return {
      valid: false,
      reason: 'Incohérence transitionValidation: allowed=false ne peut pas utiliser reasonCode=OK.'
    };
  }

  return {
    valid: true,
    transitionValidation: {
      allowed: candidate.allowed,
      reasonCode,
      reason: candidate.reason,
      diagnostics: isObject(candidate.diagnostics) ? cloneValue(candidate.diagnostics) : null
    }
  };
}

function resolveTransitionValidation(payload, options) {
  if (payload.transitionValidation !== undefined) {
    return normalizeTransitionValidation(payload.transitionValidation);
  }

  if (payload.transitionInput === undefined) {
    return {
      valid: false,
      reason:
        'transitionValidation ou transitionInput est requis pour évaluer l’alerte SLA de transition.'
    };
  }

  if (!isObject(payload.transitionInput)) {
    return {
      valid: false,
      reason: 'transitionInput doit être un objet valide.'
    };
  }

  const transitionValidator =
    isObject(options) && typeof options.transitionValidator === 'function'
      ? options.transitionValidator
      : validatePhaseTransition;

  const transitionValidation = transitionValidator(cloneValue(payload.transitionInput));
  const normalized = normalizeTransitionValidation(transitionValidation);

  if (!normalized.valid) {
    return {
      valid: false,
      reason: `Résultat invalide depuis validatePhaseTransition: ${normalized.reason}`
    };
  }

  return normalized;
}

function resolvePhaseFromIndex(index) {
  if (Number.isInteger(index) && index >= 0 && index < BMAD_PHASE_ORDER.length) {
    return BMAD_PHASE_ORDER[index];
  }

  return null;
}

function resolveFromToPhases(payload, transitionValidation) {
  const transitionInput = isObject(payload.transitionInput) ? payload.transitionInput : null;
  const validationDiagnostics = isObject(transitionValidation?.diagnostics)
    ? transitionValidation.diagnostics
    : null;

  const fromPhase =
    normalizePhase(transitionInput?.fromPhase) ??
    normalizePhase(payload.fromPhase) ??
    resolvePhaseFromIndex(validationDiagnostics?.fromIndex);

  const toPhase =
    normalizePhase(transitionInput?.toPhase) ??
    normalizePhase(payload.toPhase) ??
    resolvePhaseFromIndex(validationDiagnostics?.toIndex);

  return {
    fromPhase,
    toPhase
  };
}

function readNumericDiagnostic(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }

  return Math.trunc(value);
}

function countRecentSlaBreaches(history, lookbackMinutes, nowMs) {
  const lookbackMs = lookbackMinutes * MINUTE_IN_MS;
  const lookbackStartMs = nowMs - lookbackMs;

  let count = 0;

  for (const entry of history) {
    if (!isObject(entry)) {
      continue;
    }

    const reasonCode = normalizeReasonCode(entry.reasonCode);

    if (reasonCode !== SLA_BREACH_REASON_CODE) {
      continue;
    }

    const timestampMs = parseTimestampMs(entry.timestamp ?? entry.recordedAt);

    if (timestampMs === null || timestampMs < lookbackStartMs || timestampMs > nowMs) {
      continue;
    }

    count += 1;
  }

  return count;
}

function createResult({ allowed, reasonCode, reason, diagnostics, alert, correctiveActions }) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: {
      fromPhase: diagnostics.fromPhase,
      toPhase: diagnostics.toPhase,
      elapsedMs: diagnostics.elapsedMs,
      slaMs: diagnostics.slaMs,
      recentSlaBreachCount: diagnostics.recentSlaBreachCount,
      lookbackMinutes: diagnostics.lookbackMinutes,
      escalationThreshold: diagnostics.escalationThreshold,
      escalationRequired: diagnostics.escalationRequired,
      sourceReasonCode: diagnostics.sourceReasonCode
    },
    alert: {
      active: alert.active,
      severity: alert.severity,
      message: alert.message
    },
    correctiveActions: [...correctiveActions]
  };
}

function createDiagnosticsTemplate(payload, lookbackMinutes, escalationThreshold) {
  const fromTo = resolveFromToPhases(payload, null);

  return {
    fromPhase: fromTo.fromPhase,
    toPhase: fromTo.toPhase,
    elapsedMs: null,
    slaMs: null,
    recentSlaBreachCount: 0,
    lookbackMinutes,
    escalationThreshold,
    escalationRequired: false,
    sourceReasonCode: null
  };
}

function createInvalidInputResult(payload, reason, lookbackMinutes, escalationThreshold) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_SLA_ALERT_INPUT',
    reason,
    diagnostics: createDiagnosticsTemplate(payload, lookbackMinutes, escalationThreshold),
    alert: {
      active: false,
      severity: 'none',
      message: reason
    },
    correctiveActions: []
  });
}

export function evaluatePhaseSlaAlert(input, options = {}) {
  const payload = isObject(input) ? input : {};
  const runtimeOptions = isObject(options) ? options : {};

  const lookbackResolution = resolveLookbackMinutes(payload.lookbackMinutes);
  const escalationResolution = resolveEscalationThreshold(payload.escalationThreshold);

  const lookbackMinutes = lookbackResolution.value;
  const escalationThreshold = escalationResolution.value;

  if (!Array.isArray(payload.history)) {
    return createInvalidInputResult(
      payload,
      'history doit être un tableau pour évaluer la récurrence SLA.',
      lookbackMinutes,
      escalationThreshold
    );
  }

  if (!lookbackResolution.valid) {
    return createInvalidInputResult(
      payload,
      `lookbackMinutes invalide: ${String(payload.lookbackMinutes)}. Une valeur numérique > 0 est requise.`,
      lookbackMinutes,
      escalationThreshold
    );
  }

  if (!escalationResolution.valid) {
    return createInvalidInputResult(
      payload,
      `escalationThreshold invalide: ${String(payload.escalationThreshold)}. Un entier >= 1 est requis.`,
      lookbackMinutes,
      escalationThreshold
    );
  }

  const transitionResolution = resolveTransitionValidation(payload, runtimeOptions);

  if (!transitionResolution.valid) {
    return createInvalidInputResult(
      payload,
      transitionResolution.reason,
      lookbackMinutes,
      escalationThreshold
    );
  }

  const transitionValidation = transitionResolution.transitionValidation;
  const fromTo = resolveFromToPhases(payload, transitionValidation);

  const diagnostics = {
    fromPhase: fromTo.fromPhase,
    toPhase: fromTo.toPhase,
    elapsedMs: readNumericDiagnostic(transitionValidation.diagnostics?.elapsedMs),
    slaMs: readNumericDiagnostic(transitionValidation.diagnostics?.slaMs),
    recentSlaBreachCount: 0,
    lookbackMinutes,
    escalationThreshold,
    escalationRequired: false,
    sourceReasonCode: transitionValidation.reasonCode
  };

  const nowMs = resolveNowMs(runtimeOptions);
  const historicalSlaBreachCount = countRecentSlaBreaches(payload.history, lookbackMinutes, nowMs);
  const currentIncidentIsSla = transitionValidation.reasonCode === SLA_BREACH_REASON_CODE;

  diagnostics.recentSlaBreachCount = historicalSlaBreachCount + (currentIncidentIsSla ? 1 : 0);
  diagnostics.escalationRequired =
    currentIncidentIsSla && diagnostics.recentSlaBreachCount >= escalationThreshold;

  if (!currentIncidentIsSla) {
    return createResult({
      allowed: transitionValidation.allowed,
      reasonCode: transitionValidation.reasonCode,
      reason: transitionValidation.reason,
      diagnostics,
      alert: {
        active: false,
        severity: 'none',
        message: 'Aucun dépassement SLA courant détecté.'
      },
      correctiveActions: []
    });
  }

  const correctiveActions = ['PUBLISH_PHASE_NOTIFY', 'REVALIDATE_TRANSITION'];

  if (diagnostics.escalationRequired) {
    correctiveActions.push('ESCALATE_TO_PM');
  }

  return createResult({
    allowed: transitionValidation.allowed,
    reasonCode: transitionValidation.reasonCode,
    reason: transitionValidation.reason,
    diagnostics,
    alert: {
      active: true,
      severity: diagnostics.escalationRequired ? 'critical' : 'warning',
      message: transitionValidation.reason
    },
    correctiveActions
  });
}
