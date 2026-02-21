import { BMAD_PHASE_ORDER, validatePhaseTransition } from './phase-transition-validator.js';

const DEFAULT_MIN_JUSTIFICATION_LENGTH = 20;

const TRANSITION_REASON_CODES = new Set([
  'OK',
  'INVALID_PHASE',
  'TRANSITION_NOT_ALLOWED',
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED'
]);

const OVERRIDE_ELIGIBLE_REASON_CODES = new Set([
  'TRANSITION_NOT_ALLOWED',
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED'
]);

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

function normalizeActor(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizeBooleanInput(value, fallback) {
  if (value === undefined) {
    return {
      valid: true,
      value: fallback
    };
  }

  if (typeof value === 'boolean') {
    return {
      valid: true,
      value
    };
  }

  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase();

    if (lowered === 'true') {
      return {
        valid: true,
        value: true
      };
    }

    if (lowered === 'false') {
      return {
        valid: true,
        value: false
      };
    }
  }

  return {
    valid: false,
    value: fallback
  };
}

function resolveRequireDistinctApprover(value) {
  return normalizeBooleanInput(value, true);
}

function resolveMinJustificationLength(value) {
  if (value === undefined) {
    return {
      valid: true,
      value: DEFAULT_MIN_JUSTIFICATION_LENGTH
    };
  }

  const candidate =
    typeof value === 'string' && value.trim().length > 0
      ? Number(value)
      : typeof value === 'number'
        ? value
        : NaN;

  if (!Number.isFinite(candidate) || !Number.isInteger(candidate) || candidate < 1) {
    return {
      valid: false,
      value: DEFAULT_MIN_JUSTIFICATION_LENGTH
    };
  }

  return {
    valid: true,
    value: Math.trunc(candidate)
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
        'transitionValidation ou transitionInput est requis pour évaluer un override exceptionnel.'
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

function resolveOverrideRequest(payload) {
  if (payload.overrideRequest === undefined) {
    return {
      valid: true,
      provided: false,
      request: null
    };
  }

  if (!isObject(payload.overrideRequest)) {
    return {
      valid: false,
      reason: 'overrideRequest doit être un objet valide.'
    };
  }

  const requestedBy = normalizeActor(payload.overrideRequest.requestedBy);
  const approver = normalizeActor(payload.overrideRequest.approver);
  const justification = normalizeActor(payload.overrideRequest.justification);

  return {
    valid: true,
    provided: true,
    request: {
      requestedBy,
      approver,
      justification,
      requestedByPresent: requestedBy.length > 0,
      approverPresent: approver.length > 0,
      justificationLength: justification.length
    }
  };
}

function isDistinctActor(requestedBy, approver) {
  if (requestedBy.length === 0 || approver.length === 0) {
    return false;
  }

  return requestedBy.toLocaleLowerCase() !== approver.toLocaleLowerCase();
}

function createDiagnosticsTemplate(payload, minJustificationLength) {
  const fromTo = resolveFromToPhases(payload, null);

  return {
    fromPhase: fromTo.fromPhase,
    toPhase: fromTo.toPhase,
    sourceReasonCode: null,
    overrideEligible: false,
    overrideRequested: false,
    justificationLength: 0,
    approverPresent: false,
    approverDistinct: false,
    minJustificationLength
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  override,
  requiredActions
}) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: {
      fromPhase: diagnostics.fromPhase,
      toPhase: diagnostics.toPhase,
      sourceReasonCode: diagnostics.sourceReasonCode,
      overrideEligible: diagnostics.overrideEligible,
      overrideRequested: diagnostics.overrideRequested,
      justificationLength: diagnostics.justificationLength,
      approverPresent: diagnostics.approverPresent,
      approverDistinct: diagnostics.approverDistinct,
      minJustificationLength: diagnostics.minJustificationLength
    },
    override: {
      required: override.required,
      applied: override.applied
    },
    requiredActions: [...requiredActions]
  };
}

function createInvalidInputResult(payload, reason, minJustificationLength) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_OVERRIDE_INPUT',
    reason,
    diagnostics: createDiagnosticsTemplate(payload, minJustificationLength),
    override: {
      required: false,
      applied: false
    },
    requiredActions: []
  });
}

function createCaptureActions({ needsJustification, needsApprover }) {
  const actions = [];

  if (needsJustification) {
    actions.push('CAPTURE_JUSTIFICATION');
  }

  if (needsApprover) {
    actions.push('CAPTURE_APPROVER');
  }

  return actions;
}

export function evaluatePhaseTransitionOverride(input, options = {}) {
  const payload = isObject(input) ? input : {};
  const runtimeOptions = isObject(options) ? options : {};

  const minJustificationResolution = resolveMinJustificationLength(
    payload.minJustificationLength ?? runtimeOptions.minJustificationLength
  );

  if (!minJustificationResolution.valid) {
    return createInvalidInputResult(
      payload,
      `minJustificationLength invalide: ${String(payload.minJustificationLength ?? runtimeOptions.minJustificationLength)}. Un entier >= 1 est requis.`,
      minJustificationResolution.value
    );
  }

  const minJustificationLength = minJustificationResolution.value;

  const requireDistinctApproverResolution = resolveRequireDistinctApprover(
    payload.requireDistinctApprover ?? runtimeOptions.requireDistinctApprover
  );

  if (!requireDistinctApproverResolution.valid) {
    return createInvalidInputResult(
      payload,
      `requireDistinctApprover invalide: ${String(payload.requireDistinctApprover ?? runtimeOptions.requireDistinctApprover)}. Valeur booléenne requise.`,
      minJustificationLength
    );
  }

  const requireDistinctApprover = requireDistinctApproverResolution.value;

  const transitionResolution = resolveTransitionValidation(payload, runtimeOptions);

  if (!transitionResolution.valid) {
    return createInvalidInputResult(payload, transitionResolution.reason, minJustificationLength);
  }

  const transitionValidation = transitionResolution.transitionValidation;
  const fromTo = resolveFromToPhases(payload, transitionValidation);

  const overrideRequestResolution = resolveOverrideRequest(payload);

  if (!overrideRequestResolution.valid) {
    return createInvalidInputResult(payload, overrideRequestResolution.reason, minJustificationLength);
  }

  const overrideRequest = overrideRequestResolution.request;
  const approverDistinct =
    overrideRequest === null
      ? false
      : isDistinctActor(overrideRequest.requestedBy, overrideRequest.approver);

  const diagnostics = {
    fromPhase: fromTo.fromPhase,
    toPhase: fromTo.toPhase,
    sourceReasonCode: transitionValidation.reasonCode,
    overrideEligible: OVERRIDE_ELIGIBLE_REASON_CODES.has(transitionValidation.reasonCode),
    overrideRequested: overrideRequestResolution.provided,
    justificationLength: overrideRequest?.justificationLength ?? 0,
    approverPresent: overrideRequest?.approverPresent ?? false,
    approverDistinct,
    minJustificationLength
  };

  if (transitionValidation.allowed) {
    return createResult({
      allowed: true,
      reasonCode: 'OK',
      reason: transitionValidation.reason,
      diagnostics,
      override: {
        required: false,
        applied: false
      },
      requiredActions: []
    });
  }

  if (!diagnostics.overrideEligible) {
    return createResult({
      allowed: false,
      reasonCode: 'OVERRIDE_NOT_ELIGIBLE',
      reason: `Override non éligible pour le motif amont ${transitionValidation.reasonCode}.`,
      diagnostics,
      override: {
        required: false,
        applied: false
      },
      requiredActions: []
    });
  }

  if (!overrideRequestResolution.provided) {
    return createResult({
      allowed: false,
      reasonCode: 'OVERRIDE_REQUEST_MISSING',
      reason: 'overrideRequest est requis pour un blocage de transition éligible à override.',
      diagnostics,
      override: {
        required: true,
        applied: false
      },
      requiredActions: ['CAPTURE_JUSTIFICATION', 'CAPTURE_APPROVER']
    });
  }

  if (overrideRequest.requestedByPresent === false) {
    return createInvalidInputResult(
      payload,
      'overrideRequest.requestedBy est requis pour tracer le demandeur de l’override.',
      minJustificationLength
    );
  }

  const justificationSufficient = overrideRequest.justificationLength >= minJustificationLength;

  if (!justificationSufficient) {
    return createResult({
      allowed: false,
      reasonCode: 'OVERRIDE_JUSTIFICATION_REQUIRED',
      reason: `Justification insuffisante: longueur=${overrideRequest.justificationLength}, minimum=${minJustificationLength}.`,
      diagnostics,
      override: {
        required: true,
        applied: false
      },
      requiredActions: createCaptureActions({
        needsJustification: true,
        needsApprover: overrideRequest.approverPresent === false
      })
    });
  }

  if (!overrideRequest.approverPresent) {
    return createResult({
      allowed: false,
      reasonCode: 'OVERRIDE_APPROVER_REQUIRED',
      reason: 'overrideRequest.approver est requis pour approuver un override exceptionnel.',
      diagnostics,
      override: {
        required: true,
        applied: false
      },
      requiredActions: ['CAPTURE_APPROVER']
    });
  }

  if (requireDistinctApprover && !diagnostics.approverDistinct) {
    return createResult({
      allowed: false,
      reasonCode: 'OVERRIDE_APPROVER_CONFLICT',
      reason:
        'overrideRequest.approver doit être distinct du demandeur lorsque requireDistinctApprover=true.',
      diagnostics,
      override: {
        required: true,
        applied: false
      },
      requiredActions: ['CAPTURE_APPROVER']
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: `Override exceptionnel approuvé pour le blocage ${transitionValidation.reasonCode}.`,
    diagnostics,
    override: {
      required: true,
      applied: true
    },
    requiredActions: ['REVALIDATE_TRANSITION', 'RECORD_OVERRIDE_AUDIT']
  });
}
