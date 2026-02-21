import { buildPhaseStateProjection } from './phase-state-projection.js';
import { validatePhasePrerequisites } from './phase-prerequisites-validator.js';
import { evaluatePhaseTransitionOverride } from './phase-transition-override.js';
import { BMAD_PHASE_ORDER, validatePhaseTransition } from './phase-transition-validator.js';

const DEFAULT_MAX_REFRESH_INTERVAL_MS = 5_000;

const TRANSITION_REASON_CODES = new Set([
  'OK',
  'INVALID_PHASE',
  'TRANSITION_NOT_ALLOWED',
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED'
]);

const PREREQUISITES_REASON_CODES = new Set([
  'OK',
  'INVALID_PHASE',
  'TRANSITION_NOT_ALLOWED',
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED',
  'PHASE_PREREQUISITES_MISSING',
  'PHASE_PREREQUISITES_INCOMPLETE',
  'INVALID_PHASE_PREREQUISITES'
]);

const OVERRIDE_REASON_CODES = new Set([
  'OK',
  'INVALID_PHASE',
  'TRANSITION_NOT_ALLOWED',
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED',
  'OVERRIDE_NOT_ELIGIBLE',
  'OVERRIDE_REQUEST_MISSING',
  'OVERRIDE_JUSTIFICATION_REQUIRED',
  'OVERRIDE_APPROVER_REQUIRED',
  'OVERRIDE_APPROVER_CONFLICT',
  'INVALID_OVERRIDE_INPUT'
]);

const TRANSITION_BLOCKING_REASON_CODES = new Set([
  'INVALID_PHASE',
  'TRANSITION_NOT_ALLOWED',
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED'
]);

const OVERRIDE_ELIGIBLE_TRANSITION_REASON_CODES = new Set([
  'TRANSITION_NOT_ALLOWED',
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED'
]);

const PREREQUISITES_BLOCKING_REASON_CODES = new Set([
  'PHASE_PREREQUISITES_MISSING',
  'PHASE_PREREQUISITES_INCOMPLETE',
  'INVALID_PHASE_PREREQUISITES'
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

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizeReasonCode(value) {
  return normalizeText(value);
}

function hasReasonText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function normalizePhase(value) {
  const normalized = normalizeText(value).toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function toInteger(value) {
  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      return null;
    }

    return value;
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value);

    if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
      return null;
    }

    return parsed;
  }

  return null;
}

function resolvePhaseFromIndex(index) {
  if (!Number.isInteger(index) || index < 0 || index >= BMAD_PHASE_ORDER.length) {
    return null;
  }

  return BMAD_PHASE_ORDER[index];
}

function pushAction(actions, value) {
  actions.push(value);
}

function createDependency({ id, status, reasonCode, reason, blocking, owner }) {
  return {
    id,
    status,
    reasonCode,
    reason,
    blocking: Boolean(blocking),
    owner
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  dependencies,
  blockingDependencies,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: {
      fromPhase: diagnostics.fromPhase,
      toPhase: diagnostics.toPhase,
      owner: diagnostics.owner,
      snapshotAgeMs: diagnostics.snapshotAgeMs,
      maxRefreshIntervalMs: diagnostics.maxRefreshIntervalMs,
      isStale: diagnostics.isStale,
      totalDependencies: diagnostics.totalDependencies,
      blockedDependenciesCount: diagnostics.blockedDependenciesCount,
      sourceReasonCode: diagnostics.sourceReasonCode
    },
    dependencies: dependencies.map((dependency) => ({
      id: dependency.id,
      status: dependency.status,
      reasonCode: dependency.reasonCode,
      reason: dependency.reason,
      blocking: dependency.blocking,
      owner: dependency.owner
    })),
    blockingDependencies: blockingDependencies.map((dependency) => ({
      id: dependency.id,
      status: dependency.status,
      reasonCode: dependency.reasonCode,
      reason: dependency.reason,
      owner: dependency.owner
    })),
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidInputResult({
  reason,
  fromPhase,
  toPhase,
  owner,
  snapshotAgeMs,
  maxRefreshIntervalMs
}) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_PHASE_DEPENDENCY_INPUT',
    reason,
    diagnostics: {
      fromPhase,
      toPhase,
      owner,
      snapshotAgeMs,
      maxRefreshIntervalMs,
      isStale: false,
      totalDependencies: 0,
      blockedDependenciesCount: 0,
      sourceReasonCode: null
    },
    dependencies: [],
    blockingDependencies: [],
    correctiveActions: []
  });
}

function resolveMaxRefreshIntervalMs(payload, runtimeOptions) {
  const raw = payload.maxRefreshIntervalMs ?? runtimeOptions.maxRefreshIntervalMs;

  if (raw === undefined) {
    return {
      valid: true,
      value: DEFAULT_MAX_REFRESH_INTERVAL_MS
    };
  }

  const candidate = toInteger(raw);

  if (candidate === null || candidate < 1) {
    return {
      valid: false,
      value: DEFAULT_MAX_REFRESH_INTERVAL_MS,
      reason:
        'maxRefreshIntervalMs invalide. Un entier strictement positif est requis (défaut 5000).'
    };
  }

  return {
    valid: true,
    value: candidate
  };
}

function resolveSnapshotAgeMs(payload) {
  if (payload.snapshotAgeMs === undefined) {
    return {
      valid: true,
      value: 0
    };
  }

  const candidate = toInteger(payload.snapshotAgeMs);

  if (candidate === null || candidate < 0) {
    return {
      valid: false,
      value: 0,
      reason: 'snapshotAgeMs invalide. Un entier >= 0 est requis.'
    };
  }

  return {
    valid: true,
    value: candidate
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

function normalizePrerequisitesValidation(candidate) {
  if (!isObject(candidate)) {
    return {
      valid: false,
      reason: 'prerequisitesValidation doit être un objet valide.'
    };
  }

  if (typeof candidate.allowed !== 'boolean') {
    return {
      valid: false,
      reason: 'prerequisitesValidation.allowed doit être booléen.'
    };
  }

  const reasonCode = normalizeReasonCode(candidate.reasonCode);

  if (!PREREQUISITES_REASON_CODES.has(reasonCode)) {
    return {
      valid: false,
      reason: `prerequisitesValidation.reasonCode invalide: ${String(candidate.reasonCode)}.`
    };
  }

  if (!hasReasonText(candidate.reason)) {
    return {
      valid: false,
      reason: 'prerequisitesValidation.reason doit être une chaîne non vide.'
    };
  }

  if (candidate.allowed === true && reasonCode !== 'OK') {
    return {
      valid: false,
      reason:
        `Incohérence prerequisitesValidation: allowed=true exige reasonCode=OK (reçu ${reasonCode}).`
    };
  }

  if (candidate.allowed === false && reasonCode === 'OK') {
    return {
      valid: false,
      reason: 'Incohérence prerequisitesValidation: allowed=false ne peut pas utiliser reasonCode=OK.'
    };
  }

  return {
    valid: true,
    prerequisitesValidation: {
      allowed: candidate.allowed,
      reasonCode,
      reason: candidate.reason,
      diagnostics: isObject(candidate.diagnostics) ? cloneValue(candidate.diagnostics) : null
    }
  };
}

function normalizeOverrideEvaluation(candidate) {
  if (!isObject(candidate)) {
    return {
      valid: false,
      reason: 'overrideEvaluation doit être un objet valide.'
    };
  }

  if (typeof candidate.allowed !== 'boolean') {
    return {
      valid: false,
      reason: 'overrideEvaluation.allowed doit être booléen.'
    };
  }

  const reasonCode = normalizeReasonCode(candidate.reasonCode);

  if (!OVERRIDE_REASON_CODES.has(reasonCode)) {
    return {
      valid: false,
      reason: `overrideEvaluation.reasonCode invalide: ${String(candidate.reasonCode)}.`
    };
  }

  if (!hasReasonText(candidate.reason)) {
    return {
      valid: false,
      reason: 'overrideEvaluation.reason doit être une chaîne non vide.'
    };
  }

  if (candidate.allowed === true && reasonCode !== 'OK') {
    return {
      valid: false,
      reason: `Incohérence overrideEvaluation: allowed=true exige reasonCode=OK (reçu ${reasonCode}).`
    };
  }

  if (candidate.allowed === false && reasonCode === 'OK') {
    return {
      valid: false,
      reason: 'Incohérence overrideEvaluation: allowed=false ne peut pas utiliser reasonCode=OK.'
    };
  }

  if (!isObject(candidate.override)) {
    return {
      valid: false,
      reason: 'overrideEvaluation.override doit être un objet valide.'
    };
  }

  if (typeof candidate.override.required !== 'boolean') {
    return {
      valid: false,
      reason: 'overrideEvaluation.override.required doit être booléen.'
    };
  }

  if (typeof candidate.override.applied !== 'boolean') {
    return {
      valid: false,
      reason: 'overrideEvaluation.override.applied doit être booléen.'
    };
  }

  if (
    !Array.isArray(candidate.requiredActions) ||
    candidate.requiredActions.some((action) => typeof action !== 'string')
  ) {
    return {
      valid: false,
      reason: 'overrideEvaluation.requiredActions doit être un tableau de chaînes.'
    };
  }

  return {
    valid: true,
    overrideEvaluation: {
      allowed: candidate.allowed,
      reasonCode,
      reason: candidate.reason,
      diagnostics: isObject(candidate.diagnostics) ? cloneValue(candidate.diagnostics) : null,
      override: {
        required: candidate.override.required,
        applied: candidate.override.applied
      },
      requiredActions: [...candidate.requiredActions]
    }
  };
}

function resolveTransitionValidation(payload, runtimeOptions) {
  if (payload.transitionValidation !== undefined) {
    return normalizeTransitionValidation(payload.transitionValidation);
  }

  if (payload.transitionInput === undefined) {
    return {
      valid: false,
      reason: 'transitionValidation ou transitionInput est requis.'
    };
  }

  if (!isObject(payload.transitionInput)) {
    return {
      valid: false,
      reason: 'transitionInput doit être un objet valide.'
    };
  }

  const transitionValidator =
    typeof runtimeOptions.transitionValidator === 'function'
      ? runtimeOptions.transitionValidator
      : validatePhaseTransition;

  const validation = transitionValidator(cloneValue(payload.transitionInput));
  const normalized = normalizeTransitionValidation(validation);

  if (!normalized.valid) {
    return {
      valid: false,
      reason: `Résultat invalide depuis validatePhaseTransition: ${normalized.reason}`
    };
  }

  return normalized;
}

function resolvePrerequisitesValidation(payload, runtimeOptions, transitionValidation) {
  if (payload.prerequisitesValidation !== undefined) {
    return normalizePrerequisitesValidation(payload.prerequisitesValidation);
  }

  if (payload.prerequisitesInput === undefined) {
    return {
      valid: false,
      reason: 'prerequisitesValidation ou prerequisitesInput est requis.'
    };
  }

  if (!isObject(payload.prerequisitesInput)) {
    return {
      valid: false,
      reason: 'prerequisitesInput doit être un objet valide.'
    };
  }

  const prerequisitesValidator =
    typeof runtimeOptions.prerequisitesValidator === 'function'
      ? runtimeOptions.prerequisitesValidator
      : validatePhasePrerequisites;

  const prerequisitesPayload = cloneValue(payload.prerequisitesInput);

  if (prerequisitesPayload.transitionValidation === undefined) {
    prerequisitesPayload.transitionValidation = cloneValue(transitionValidation);
  }

  const validation = prerequisitesValidator(prerequisitesPayload);
  const normalized = normalizePrerequisitesValidation(validation);

  if (!normalized.valid) {
    return {
      valid: false,
      reason: `Résultat invalide depuis validatePhasePrerequisites: ${normalized.reason}`
    };
  }

  return normalized;
}

function resolveOverrideEvaluation(payload, runtimeOptions, transitionValidation) {
  if (payload.overrideEvaluation !== undefined) {
    const normalized = normalizeOverrideEvaluation(payload.overrideEvaluation);

    if (!normalized.valid) {
      return normalized;
    }

    return {
      ...normalized,
      provided: true
    };
  }

  if (payload.overrideInput === undefined) {
    return {
      valid: true,
      provided: false,
      overrideEvaluation: null
    };
  }

  if (!isObject(payload.overrideInput)) {
    return {
      valid: false,
      reason: 'overrideInput doit être un objet valide.'
    };
  }

  const overrideEvaluator =
    typeof runtimeOptions.overrideEvaluator === 'function'
      ? runtimeOptions.overrideEvaluator
      : evaluatePhaseTransitionOverride;

  const overridePayload = cloneValue(payload.overrideInput);

  if (overridePayload.transitionValidation === undefined) {
    overridePayload.transitionValidation = cloneValue(transitionValidation);
  }

  const evaluation = overrideEvaluator(overridePayload);
  const normalized = normalizeOverrideEvaluation(evaluation);

  if (!normalized.valid) {
    return {
      valid: false,
      reason: `Résultat invalide depuis evaluatePhaseTransitionOverride: ${normalized.reason}`
    };
  }

  return {
    ...normalized,
    provided: true
  };
}

function resolveOwner(payload, runtimeOptions) {
  const directOwner = normalizeText(payload.owner);

  if (directOwner.length > 0) {
    return {
      valid: true,
      owner: directOwner,
      phaseStateProjection: null
    };
  }

  if (payload.phaseStateProjection !== undefined) {
    if (!isObject(payload.phaseStateProjection)) {
      return {
        valid: false,
        reason: 'phaseStateProjection doit être un objet valide.'
      };
    }

    const projectionOwner = normalizeText(payload.phaseStateProjection.owner);

    if (projectionOwner.length === 0) {
      return {
        valid: false,
        reason: 'phaseStateProjection.owner est requis lorsque owner n’est pas fourni.'
      };
    }

    return {
      valid: true,
      owner: projectionOwner,
      phaseStateProjection: cloneValue(payload.phaseStateProjection)
    };
  }

  if (payload.phaseStateInput !== undefined) {
    if (!isObject(payload.phaseStateInput)) {
      return {
        valid: false,
        reason: 'phaseStateInput doit être un objet valide.'
      };
    }

    const phaseStateProjector =
      typeof runtimeOptions.phaseStateProjector === 'function'
        ? runtimeOptions.phaseStateProjector
        : buildPhaseStateProjection;

    const projection = phaseStateProjector(cloneValue(payload.phaseStateInput));

    if (!isObject(projection)) {
      return {
        valid: false,
        reason: 'Résultat invalide depuis buildPhaseStateProjection: objet requis.'
      };
    }

    const projectionOwner = normalizeText(projection.owner);

    if (projectionOwner.length === 0) {
      return {
        valid: false,
        reason:
          'Résultat invalide depuis buildPhaseStateProjection: owner requis lorsque owner n’est pas fourni.'
      };
    }

    return {
      valid: true,
      owner: projectionOwner,
      phaseStateProjection: cloneValue(projection)
    };
  }

  return {
    valid: false,
    reason: 'owner est requis pour construire la matrice de dépendances.'
  };
}

function resolveFromToPhases(payload, transitionValidation, prerequisitesValidation, phaseStateProjection) {
  const transitionInput = isObject(payload.transitionInput) ? payload.transitionInput : null;
  const prerequisitesInput = isObject(payload.prerequisitesInput) ? payload.prerequisitesInput : null;

  const transitionDiagnostics = isObject(transitionValidation?.diagnostics)
    ? transitionValidation.diagnostics
    : null;

  const prerequisitesDiagnostics = isObject(prerequisitesValidation?.diagnostics)
    ? prerequisitesValidation.diagnostics
    : null;

  const fromPhase =
    normalizePhase(payload.fromPhase) ??
    normalizePhase(transitionInput?.fromPhase) ??
    normalizePhase(prerequisitesInput?.fromPhase) ??
    normalizePhase(prerequisitesDiagnostics?.fromPhase) ??
    resolvePhaseFromIndex(transitionDiagnostics?.fromIndex) ??
    normalizePhase(phaseStateProjection?.phaseId);

  const toPhase =
    normalizePhase(payload.toPhase) ??
    normalizePhase(transitionInput?.toPhase) ??
    normalizePhase(prerequisitesInput?.toPhase) ??
    normalizePhase(prerequisitesDiagnostics?.toPhase) ??
    resolvePhaseFromIndex(transitionDiagnostics?.toIndex) ??
    null;

  return {
    fromPhase,
    toPhase
  };
}

function buildTransitionDependency(transitionValidation, owner) {
  const transitionBlocked =
    transitionValidation.allowed === false &&
    TRANSITION_BLOCKING_REASON_CODES.has(transitionValidation.reasonCode);

  if (transitionBlocked) {
    return createDependency({
      id: 'TRANSITION',
      status: 'blocked',
      reasonCode: transitionValidation.reasonCode,
      reason: `Transition bloquée pour owner=${owner}: ${transitionValidation.reason}`,
      blocking: true,
      owner
    });
  }

  return createDependency({
    id: 'TRANSITION',
    status: 'ready',
    reasonCode: transitionValidation.reasonCode,
    reason: `Transition valide pour owner=${owner}: ${transitionValidation.reason}`,
    blocking: false,
    owner
  });
}

function buildPrerequisitesDependency(prerequisitesValidation, owner, transitionDependency) {
  if (prerequisitesValidation.allowed) {
    return createDependency({
      id: 'PREREQUISITES',
      status: 'ready',
      reasonCode: prerequisitesValidation.reasonCode,
      reason: `Prérequis validés pour owner=${owner}: ${prerequisitesValidation.reason}`,
      blocking: false,
      owner
    });
  }

  if (PREREQUISITES_BLOCKING_REASON_CODES.has(prerequisitesValidation.reasonCode)) {
    return createDependency({
      id: 'PREREQUISITES',
      status: 'blocked',
      reasonCode: prerequisitesValidation.reasonCode,
      reason: `Prérequis bloquants pour owner=${owner}: ${prerequisitesValidation.reason}`,
      blocking: true,
      owner
    });
  }

  if (
    TRANSITION_BLOCKING_REASON_CODES.has(prerequisitesValidation.reasonCode) &&
    transitionDependency.status === 'blocked'
  ) {
    return createDependency({
      id: 'PREREQUISITES',
      status: 'warning',
      reasonCode: prerequisitesValidation.reasonCode,
      reason:
        `Prérequis dépendants du blocage transition pour owner=${owner}: ${prerequisitesValidation.reason}`,
      blocking: false,
      owner
    });
  }

  return createDependency({
    id: 'PREREQUISITES',
    status: 'blocked',
    reasonCode: prerequisitesValidation.reasonCode,
    reason: `Blocage prérequis pour owner=${owner}: ${prerequisitesValidation.reason}`,
    blocking: true,
    owner
  });
}

function buildOverrideDependency({
  owner,
  transitionValidation,
  overrideResolution,
  transitionDependency
}) {
  const transitionBlocked = transitionDependency.status === 'blocked';
  const overrideEligible = OVERRIDE_ELIGIBLE_TRANSITION_REASON_CODES.has(transitionValidation.reasonCode);

  if (overrideResolution.provided === false) {
    if (transitionBlocked && overrideEligible) {
      return createDependency({
        id: 'OVERRIDE',
        status: 'warning',
        reasonCode: 'OVERRIDE_REQUEST_MISSING',
        reason:
          `Override potentiellement requis pour owner=${owner}: évaluation override absente sur blocage ${transitionValidation.reasonCode}.`,
        blocking: false,
        owner
      });
    }

    return createDependency({
      id: 'OVERRIDE',
      status: 'ready',
      reasonCode: 'OK',
      reason: `Aucun override requis pour owner=${owner}.`,
      blocking: false,
      owner
    });
  }

  const override = overrideResolution.overrideEvaluation;

  if (override.override.applied) {
    return createDependency({
      id: 'OVERRIDE',
      status: 'overridden',
      reasonCode: override.reasonCode,
      reason: `Override appliqué pour owner=${owner}: ${override.reason}`,
      blocking: false,
      owner
    });
  }

  if (override.override.required) {
    return createDependency({
      id: 'OVERRIDE',
      status: 'blocked',
      reasonCode: override.reasonCode,
      reason: `Override requis pour owner=${owner}: ${override.reason}`,
      blocking: true,
      owner
    });
  }

  return createDependency({
    id: 'OVERRIDE',
    status: 'warning',
    reasonCode: override.reasonCode,
    reason: `Override non requis pour owner=${owner}: ${override.reason}`,
    blocking: false,
    owner
  });
}

function buildFreshnessDependency({ owner, snapshotAgeMs, maxRefreshIntervalMs, isStale }) {
  if (isStale) {
    return createDependency({
      id: 'FRESHNESS',
      status: 'stale',
      reasonCode: 'DEPENDENCY_STATE_STALE',
      reason:
        `Snapshot stale pour owner=${owner}: snapshotAgeMs=${snapshotAgeMs} dépasse maxRefreshIntervalMs=${maxRefreshIntervalMs}.`,
      blocking: true,
      owner
    });
  }

  return createDependency({
    id: 'FRESHNESS',
    status: 'ready',
    reasonCode: 'OK',
    reason:
      `Snapshot frais pour owner=${owner}: snapshotAgeMs=${snapshotAgeMs}, maxRefreshIntervalMs=${maxRefreshIntervalMs}.`,
    blocking: false,
    owner
  });
}

function applyOverrideOnTransition({ transitionDependency, overrideDependency, transitionValidation, owner }) {
  if (transitionDependency.status !== 'blocked') {
    return transitionDependency;
  }

  if (!OVERRIDE_ELIGIBLE_TRANSITION_REASON_CODES.has(transitionValidation.reasonCode)) {
    return transitionDependency;
  }

  if (overrideDependency.status !== 'overridden') {
    return transitionDependency;
  }

  return createDependency({
    id: 'TRANSITION',
    status: 'overridden',
    reasonCode: transitionValidation.reasonCode,
    reason:
      `Transition initialement bloquée (${transitionValidation.reasonCode}) puis override appliqué pour owner=${owner}.`,
    blocking: false,
    owner
  });
}

const TRANSITION_CORRECTIVE_ACTION_BY_REASON = Object.freeze({
  INVALID_PHASE: 'FIX_PHASE_IDENTIFIERS',
  TRANSITION_NOT_ALLOWED: 'ALIGN_PHASE_SEQUENCE',
  PHASE_NOTIFICATION_MISSING: 'PUBLISH_PHASE_NOTIFICATION',
  PHASE_NOTIFICATION_SLA_EXCEEDED: 'REMEDIATE_NOTIFICATION_SLA'
});

function resolveTransitionCorrectiveAction(reasonCode) {
  return TRANSITION_CORRECTIVE_ACTION_BY_REASON[reasonCode];
}

export function buildPhaseDependencyMatrix(input, options = {}) {
  const payload = isObject(input) ? input : {};
  const runtimeOptions = isObject(options) ? options : {};

  const maxRefreshResolution = resolveMaxRefreshIntervalMs(payload, runtimeOptions);

  const maxRefreshIntervalMs = maxRefreshResolution.value;
  const snapshotResolution = resolveSnapshotAgeMs(payload);
  const snapshotAgeMs = snapshotResolution.value;

  const fromPhaseFallback = normalizePhase(payload.fromPhase);
  const toPhaseFallback = normalizePhase(payload.toPhase);
  const ownerFallback = normalizeText(payload.owner) || null;

  if (!maxRefreshResolution.valid) {
    return createInvalidInputResult({
      reason: maxRefreshResolution.reason,
      fromPhase: fromPhaseFallback,
      toPhase: toPhaseFallback,
      owner: ownerFallback,
      snapshotAgeMs,
      maxRefreshIntervalMs
    });
  }

  if (!snapshotResolution.valid) {
    return createInvalidInputResult({
      reason: snapshotResolution.reason,
      fromPhase: fromPhaseFallback,
      toPhase: toPhaseFallback,
      owner: ownerFallback,
      snapshotAgeMs,
      maxRefreshIntervalMs
    });
  }

  const ownerResolution = resolveOwner(payload, runtimeOptions);

  if (!ownerResolution.valid) {
    return createInvalidInputResult({
      reason: ownerResolution.reason,
      fromPhase: fromPhaseFallback,
      toPhase: toPhaseFallback,
      owner: ownerFallback,
      snapshotAgeMs,
      maxRefreshIntervalMs
    });
  }

  const owner = ownerResolution.owner;

  const transitionResolution = resolveTransitionValidation(payload, runtimeOptions);

  if (!transitionResolution.valid) {
    return createInvalidInputResult({
      reason: transitionResolution.reason,
      fromPhase: fromPhaseFallback,
      toPhase: toPhaseFallback,
      owner,
      snapshotAgeMs,
      maxRefreshIntervalMs
    });
  }

  const transitionValidation = transitionResolution.transitionValidation;

  const prerequisitesResolution = resolvePrerequisitesValidation(
    payload,
    runtimeOptions,
    transitionValidation
  );

  if (!prerequisitesResolution.valid) {
    return createInvalidInputResult({
      reason: prerequisitesResolution.reason,
      fromPhase: fromPhaseFallback,
      toPhase: toPhaseFallback,
      owner,
      snapshotAgeMs,
      maxRefreshIntervalMs
    });
  }

  const prerequisitesValidation = prerequisitesResolution.prerequisitesValidation;

  const overrideResolution = resolveOverrideEvaluation(payload, runtimeOptions, transitionValidation);

  if (!overrideResolution.valid) {
    return createInvalidInputResult({
      reason: overrideResolution.reason,
      fromPhase: fromPhaseFallback,
      toPhase: toPhaseFallback,
      owner,
      snapshotAgeMs,
      maxRefreshIntervalMs
    });
  }

  const isStale = snapshotAgeMs > maxRefreshIntervalMs;

  let transitionDependency = buildTransitionDependency(transitionValidation, owner);
  let prerequisitesDependency = buildPrerequisitesDependency(
    prerequisitesValidation,
    owner,
    transitionDependency
  );
  const overrideDependency = buildOverrideDependency({
    owner,
    transitionValidation,
    overrideResolution,
    transitionDependency
  });

  transitionDependency = applyOverrideOnTransition({
    transitionDependency,
    overrideDependency,
    transitionValidation,
    owner
  });

  if (
    prerequisitesDependency.status === 'warning' &&
    transitionDependency.status === 'overridden' &&
    TRANSITION_BLOCKING_REASON_CODES.has(prerequisitesDependency.reasonCode)
  ) {
    prerequisitesDependency = createDependency({
      id: 'PREREQUISITES',
      status: 'warning',
      reasonCode: prerequisitesDependency.reasonCode,
      reason:
        `Prérequis à revalider après override pour owner=${owner}: ${prerequisitesValidation.reason}`,
      blocking: false,
      owner
    });
  }

  const freshnessDependency = buildFreshnessDependency({
    owner,
    snapshotAgeMs,
    maxRefreshIntervalMs,
    isStale
  });

  const dependencies = [
    transitionDependency,
    prerequisitesDependency,
    overrideDependency,
    freshnessDependency
  ];

  const blockingDependencies = dependencies.filter((dependency) => dependency.blocking);

  const fromTo = resolveFromToPhases(
    payload,
    transitionValidation,
    prerequisitesValidation,
    ownerResolution.phaseStateProjection
  );

  if (isStale) {
    return createResult({
      allowed: false,
      reasonCode: 'DEPENDENCY_STATE_STALE',
      reason:
        `Matrice de dépendances stale pour owner=${owner}: snapshotAgeMs=${snapshotAgeMs} > maxRefreshIntervalMs=${maxRefreshIntervalMs}.`,
      diagnostics: {
        fromPhase: fromTo.fromPhase,
        toPhase: fromTo.toPhase,
        owner,
        snapshotAgeMs,
        maxRefreshIntervalMs,
        isStale,
        totalDependencies: dependencies.length,
        blockedDependenciesCount: blockingDependencies.length,
        sourceReasonCode: transitionValidation.reasonCode
      },
      dependencies,
      blockingDependencies,
      correctiveActions: ['REFRESH_DEPENDENCY_MATRIX']
    });
  }

  const transitionBlocked = transitionDependency.blocking;
  const prerequisitesBlocked = prerequisitesDependency.blocking;
  const overrideBlocked = overrideDependency.blocking;

  const correctiveActions = [];

  if (prerequisitesBlocked) {
    pushAction(correctiveActions, 'COMPLETE_PREREQUISITES');
  }

  if (overrideBlocked) {
    pushAction(correctiveActions, 'REQUEST_OVERRIDE_APPROVAL');
  }

  if (transitionBlocked) {
    pushAction(correctiveActions, resolveTransitionCorrectiveAction(transitionDependency.reasonCode));
  }

  if (prerequisitesBlocked && PREREQUISITES_BLOCKING_REASON_CODES.has(prerequisitesDependency.reasonCode)) {
    return createResult({
      allowed: false,
      reasonCode: prerequisitesDependency.reasonCode,
      reason: prerequisitesDependency.reason,
      diagnostics: {
        fromPhase: fromTo.fromPhase,
        toPhase: fromTo.toPhase,
        owner,
        snapshotAgeMs,
        maxRefreshIntervalMs,
        isStale,
        totalDependencies: dependencies.length,
        blockedDependenciesCount: blockingDependencies.length,
        sourceReasonCode: prerequisitesDependency.reasonCode
      },
      dependencies,
      blockingDependencies,
      correctiveActions
    });
  }

  if (transitionBlocked && overrideBlocked && overrideResolution.provided) {
    const overrideEvaluation = overrideResolution.overrideEvaluation;

    return createResult({
      allowed: false,
      reasonCode: overrideEvaluation.reasonCode,
      reason: `Override requis pour owner=${owner}: ${overrideEvaluation.reason}`,
      diagnostics: {
        fromPhase: fromTo.fromPhase,
        toPhase: fromTo.toPhase,
        owner,
        snapshotAgeMs,
        maxRefreshIntervalMs,
        isStale,
        totalDependencies: dependencies.length,
        blockedDependenciesCount: blockingDependencies.length,
        sourceReasonCode: transitionValidation.reasonCode
      },
      dependencies,
      blockingDependencies,
      correctiveActions
    });
  }

  if (transitionBlocked) {
    return createResult({
      allowed: false,
      reasonCode: transitionDependency.reasonCode,
      reason: transitionDependency.reason,
      diagnostics: {
        fromPhase: fromTo.fromPhase,
        toPhase: fromTo.toPhase,
        owner,
        snapshotAgeMs,
        maxRefreshIntervalMs,
        isStale,
        totalDependencies: dependencies.length,
        blockedDependenciesCount: blockingDependencies.length,
        sourceReasonCode: transitionValidation.reasonCode
      },
      dependencies,
      blockingDependencies,
      correctiveActions
    });
  }

  if (overrideBlocked && overrideResolution.provided) {
    const overrideEvaluation = overrideResolution.overrideEvaluation;

    return createResult({
      allowed: false,
      reasonCode: overrideEvaluation.reasonCode,
      reason: `Override requis pour owner=${owner}: ${overrideEvaluation.reason}`,
      diagnostics: {
        fromPhase: fromTo.fromPhase,
        toPhase: fromTo.toPhase,
        owner,
        snapshotAgeMs,
        maxRefreshIntervalMs,
        isStale,
        totalDependencies: dependencies.length,
        blockedDependenciesCount: blockingDependencies.length,
        sourceReasonCode: transitionValidation.reasonCode
      },
      dependencies,
      blockingDependencies,
      correctiveActions
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: `Matrice de dépendances prête pour owner=${owner}: aucun blocage actif.`,
    diagnostics: {
      fromPhase: fromTo.fromPhase,
      toPhase: fromTo.toPhase,
      owner,
      snapshotAgeMs,
      maxRefreshIntervalMs,
      isStale,
      totalDependencies: dependencies.length,
      blockedDependenciesCount: blockingDependencies.length,
      sourceReasonCode: transitionValidation.reasonCode
    },
    dependencies,
    blockingDependencies,
    correctiveActions
  });
}
