import { buildPhaseDependencyMatrix } from './phase-dependency-matrix.js';
import { BMAD_PHASE_ORDER } from './phase-transition-validator.js';

const DEFAULT_LOOKBACK_ENTRIES = 20;
const DEFAULT_ESCALATION_THRESHOLD = 3;

const DEPENDENCY_MATRIX_REASON_CODES = new Set([
  'OK',
  'INVALID_PHASE',
  'TRANSITION_NOT_ALLOWED',
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED',
  'PHASE_PREREQUISITES_MISSING',
  'PHASE_PREREQUISITES_INCOMPLETE',
  'INVALID_PHASE_PREREQUISITES',
  'OVERRIDE_NOT_ELIGIBLE',
  'OVERRIDE_REQUEST_MISSING',
  'OVERRIDE_JUSTIFICATION_REQUIRED',
  'OVERRIDE_APPROVER_REQUIRED',
  'OVERRIDE_APPROVER_CONFLICT',
  'DEPENDENCY_STATE_STALE',
  'INVALID_PHASE_DEPENDENCY_INPUT'
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

function normalizePhase(value) {
  const normalized = normalizeText(value).toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function hasReasonText(value) {
  return typeof value === 'string' && value.trim().length > 0;
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

function parseTimestampMs(value) {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      return null;
    }

    return Math.trunc(value);
  }

  if (typeof value === 'string') {
    if (value.trim().length === 0) {
      return null;
    }

    const ms = Date.parse(value);

    if (!Number.isFinite(ms)) {
      return null;
    }

    return ms;
  }

  return null;
}

function isCanonicalPhase(phase) {
  return BMAD_PHASE_ORDER.includes(phase);
}

function resolvePhaseIndex(phase) {
  return BMAD_PHASE_ORDER.indexOf(phase);
}

function uniqueActions(actions) {
  const deduped = [];
  const seen = new Set();

  for (const action of actions) {
    if (!seen.has(action)) {
      seen.add(action);
      deduped.push(action);
    }
  }

  return deduped;
}

function createAnomaly(code, message) {
  return {
    code,
    message
  };
}

function normalizePositiveInteger(value, fallback, fieldName) {
  if (value === undefined) {
    return {
      valid: true,
      value: fallback
    };
  }

  const candidate = toInteger(value);

  if (candidate === null || candidate < 1) {
    return {
      valid: false,
      value: fallback,
      reason: `${fieldName} invalide: ${String(value)}. Un entier >= 1 est requis.`
    };
  }

  return {
    valid: true,
    value: candidate
  };
}

function normalizeHistoryEntry(entry, index) {
  if (!isObject(entry)) {
    return {
      valid: false,
      reason: `historyEntries[${index}] doit être un objet valide.`
    };
  }

  const fromPhase = normalizePhase(entry.fromPhase);
  const toPhase = normalizePhase(entry.toPhase);

  if (!fromPhase || !toPhase || !isCanonicalPhase(fromPhase) || !isCanonicalPhase(toPhase)) {
    return {
      valid: false,
      reason: `historyEntries[${index}] doit contenir fromPhase/toPhase canoniques (H01..H23).`
    };
  }

  if (typeof entry.allowed !== 'boolean') {
    return {
      valid: false,
      reason: `historyEntries[${index}].allowed doit être booléen.`
    };
  }

  const reasonCode = normalizeReasonCode(entry.reasonCode);

  if (!reasonCode) {
    return {
      valid: false,
      reason: `historyEntries[${index}].reasonCode doit être une chaîne non vide.`
    };
  }

  if (!hasReasonText(entry.reason)) {
    return {
      valid: false,
      reason: `historyEntries[${index}].reason doit être une chaîne non vide.`
    };
  }

  const timestampMs = parseTimestampMs(entry.timestamp ?? entry.recordedAt);

  if (timestampMs === null) {
    return {
      valid: false,
      reason: `historyEntries[${index}] doit contenir un timestamp/recordedAt parseable.`
    };
  }

  return {
    valid: true,
    entry: {
      fromPhase,
      toPhase,
      allowed: entry.allowed,
      reasonCode,
      reason: entry.reason,
      timestampMs,
      sortOrder: index
    }
  };
}

function resolveHistoryEntries(payload) {
  if (payload.historyEntries === undefined) {
    return {
      valid: true,
      entries: []
    };
  }

  if (!Array.isArray(payload.historyEntries)) {
    return {
      valid: false,
      reason: 'historyEntries doit être un tableau conforme au contrat S006.'
    };
  }

  const normalizedEntries = [];

  for (let index = 0; index < payload.historyEntries.length; index += 1) {
    const normalized = normalizeHistoryEntry(payload.historyEntries[index], index);

    if (!normalized.valid) {
      return normalized;
    }

    normalizedEntries.push(normalized.entry);
  }

  return {
    valid: true,
    entries: normalizedEntries
  };
}

function sortHistoryEntriesRecentFirst(entries) {
  return [...entries].sort((left, right) => {
    if (left.timestampMs !== right.timestampMs) {
      return right.timestampMs - left.timestampMs;
    }

    return right.sortOrder - left.sortOrder;
  });
}

function countBlockedEntries(historyEntries, lookbackEntries) {
  if (historyEntries.length === 0) {
    return 0;
  }

  const sorted = sortHistoryEntriesRecentFirst(historyEntries);
  const consulted = sorted.slice(0, lookbackEntries);

  let blockedCount = 0;

  for (const entry of consulted) {
    if (entry.allowed === false) {
      blockedCount += 1;
    }
  }

  return blockedCount;
}

function normalizeDependencyEntry(entry, index, fieldName) {
  if (!isObject(entry)) {
    return {
      valid: false,
      reason: `${fieldName}[${index}] doit être un objet valide.`
    };
  }

  const id = normalizeText(entry.id);

  if (!id) {
    return {
      valid: false,
      reason: `${fieldName}[${index}].id doit être une chaîne non vide.`
    };
  }

  const reasonCode = normalizeReasonCode(entry.reasonCode);

  if (!reasonCode) {
    return {
      valid: false,
      reason: `${fieldName}[${index}].reasonCode doit être une chaîne non vide.`
    };
  }

  const reason = hasReasonText(entry.reason) ? entry.reason : null;
  const owner = normalizeText(entry.owner) || null;

  return {
    valid: true,
    entry: {
      id,
      reasonCode,
      reason,
      owner
    }
  };
}

function normalizeDependencyMatrix(candidate) {
  if (!isObject(candidate)) {
    return {
      valid: false,
      reason: 'dependencyMatrix doit être un objet valide.'
    };
  }

  if (typeof candidate.allowed !== 'boolean') {
    return {
      valid: false,
      reason: 'dependencyMatrix.allowed doit être booléen.'
    };
  }

  const reasonCode = normalizeReasonCode(candidate.reasonCode);

  if (!DEPENDENCY_MATRIX_REASON_CODES.has(reasonCode)) {
    return {
      valid: false,
      reason: `dependencyMatrix.reasonCode invalide: ${String(candidate.reasonCode)}.`
    };
  }

  if (!hasReasonText(candidate.reason)) {
    return {
      valid: false,
      reason: 'dependencyMatrix.reason doit être une chaîne non vide.'
    };
  }

  if (candidate.allowed === true && reasonCode !== 'OK') {
    return {
      valid: false,
      reason: `Incohérence dependencyMatrix: allowed=true exige reasonCode=OK (reçu ${reasonCode}).`
    };
  }

  if (candidate.allowed === false && reasonCode === 'OK') {
    return {
      valid: false,
      reason: 'Incohérence dependencyMatrix: allowed=false ne peut pas utiliser reasonCode=OK.'
    };
  }

  if (!isObject(candidate.diagnostics)) {
    return {
      valid: false,
      reason: 'dependencyMatrix.diagnostics doit être un objet valide.'
    };
  }

  if (!Array.isArray(candidate.blockingDependencies)) {
    return {
      valid: false,
      reason: 'dependencyMatrix.blockingDependencies doit être un tableau.'
    };
  }

  if (
    !Array.isArray(candidate.correctiveActions) ||
    candidate.correctiveActions.some((action) => typeof action !== 'string')
  ) {
    return {
      valid: false,
      reason: 'dependencyMatrix.correctiveActions doit être un tableau de chaînes.'
    };
  }

  const blockingDependencies = [];

  for (let index = 0; index < candidate.blockingDependencies.length; index += 1) {
    const normalized = normalizeDependencyEntry(
      candidate.blockingDependencies[index],
      index,
      'dependencyMatrix.blockingDependencies'
    );

    if (!normalized.valid) {
      return normalized;
    }

    blockingDependencies.push(normalized.entry);
  }

  const diagnostics = candidate.diagnostics;

  const owner = normalizeText(diagnostics.owner) || null;
  const fromPhase = normalizePhase(diagnostics.fromPhase);
  const toPhase = normalizePhase(diagnostics.toPhase);

  const dependencyAgeCandidate =
    diagnostics.snapshotAgeMs === null || diagnostics.snapshotAgeMs === undefined
      ? null
      : toInteger(diagnostics.snapshotAgeMs);

  if (dependencyAgeCandidate === null && diagnostics.snapshotAgeMs !== undefined && diagnostics.snapshotAgeMs !== null) {
    return {
      valid: false,
      reason: 'dependencyMatrix.diagnostics.snapshotAgeMs doit être un entier >= 0 ou null.'
    };
  }

  if (dependencyAgeCandidate !== null && dependencyAgeCandidate < 0) {
    return {
      valid: false,
      reason: 'dependencyMatrix.diagnostics.snapshotAgeMs doit être >= 0.'
    };
  }

  if (diagnostics.isStale !== undefined && typeof diagnostics.isStale !== 'boolean') {
    return {
      valid: false,
      reason: 'dependencyMatrix.diagnostics.isStale doit être booléen lorsqu’il est fourni.'
    };
  }

  return {
    valid: true,
    dependencyMatrix: {
      allowed: candidate.allowed,
      reasonCode,
      reason: candidate.reason,
      diagnostics: {
        fromPhase,
        toPhase,
        owner,
        sourceReasonCode: normalizeReasonCode(diagnostics.sourceReasonCode) || null,
        snapshotAgeMs: dependencyAgeCandidate,
        isStale: diagnostics.isStale === true || reasonCode === 'DEPENDENCY_STATE_STALE'
      },
      blockingDependencies,
      correctiveActions: [...candidate.correctiveActions]
    }
  };
}

function resolveDependencyMatrix(payload, runtimeOptions) {
  if (payload.dependencyMatrix !== undefined) {
    return normalizeDependencyMatrix(payload.dependencyMatrix);
  }

  if (payload.dependencyMatrixInput === undefined) {
    return {
      valid: false,
      reason: 'dependencyMatrix ou dependencyMatrixInput est requis.'
    };
  }

  if (!isObject(payload.dependencyMatrixInput)) {
    return {
      valid: false,
      reason: 'dependencyMatrixInput doit être un objet valide.'
    };
  }

  const dependencyMatrixBuilder =
    typeof runtimeOptions.dependencyMatrixBuilder === 'function'
      ? runtimeOptions.dependencyMatrixBuilder
      : buildPhaseDependencyMatrix;

  const matrix = dependencyMatrixBuilder(cloneValue(payload.dependencyMatrixInput));
  const normalized = normalizeDependencyMatrix(matrix);

  if (!normalized.valid) {
    return {
      valid: false,
      reason: `Résultat invalide depuis buildPhaseDependencyMatrix: ${normalized.reason}`
    };
  }

  return normalized;
}

function resolveOwner(payload, dependencyMatrix) {
  const ownerFromPayload = normalizeText(payload.owner);

  if (payload.owner !== undefined && ownerFromPayload.length === 0) {
    return {
      valid: false,
      reason: 'owner invalide: une chaîne non vide est requise lorsqu’elle est fournie.'
    };
  }

  const owner = ownerFromPayload || dependencyMatrix.diagnostics.owner;

  if (!owner) {
    return {
      valid: false,
      reason: 'owner est requis pour évaluer une alerte de progression.'
    };
  }

  return {
    valid: true,
    owner
  };
}

function resolvePhases(payload, dependencyMatrix) {
  const hasFromPhaseInput = payload.fromPhase !== undefined;
  const hasToPhaseInput = payload.toPhase !== undefined;

  const fromPhaseInput = normalizePhase(payload.fromPhase);
  const toPhaseInput = normalizePhase(payload.toPhase);

  if (hasFromPhaseInput && !fromPhaseInput) {
    return {
      valid: false,
      reason: 'fromPhase invalide: une phase canonique H01..H23 est requise.'
    };
  }

  if (hasToPhaseInput && !toPhaseInput) {
    return {
      valid: false,
      reason: 'toPhase invalide: une phase canonique H01..H23 est requise.'
    };
  }

  const fromPhase = fromPhaseInput ?? dependencyMatrix.diagnostics.fromPhase;
  const toPhase = toPhaseInput ?? dependencyMatrix.diagnostics.toPhase;

  if (fromPhase !== null && !isCanonicalPhase(fromPhase)) {
    return {
      valid: false,
      reason: `fromPhase incohérente: ${String(fromPhase)}.`
    };
  }

  if (toPhase !== null && !isCanonicalPhase(toPhase)) {
    return {
      valid: false,
      reason: `toPhase incohérente: ${String(toPhase)}.`
    };
  }

  return {
    valid: true,
    fromPhase,
    toPhase
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  alert,
  anomalies,
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
      sourceReasonCode: diagnostics.sourceReasonCode,
      historyBlockedCount: diagnostics.historyBlockedCount,
      lookbackEntries: diagnostics.lookbackEntries,
      escalationThreshold: diagnostics.escalationThreshold,
      dependencyAgeMs: diagnostics.dependencyAgeMs,
      isStale: diagnostics.isStale,
      blockingDependencies: diagnostics.blockingDependencies.map((dependency) => ({
        id: dependency.id,
        reasonCode: dependency.reasonCode,
        reason: dependency.reason,
        owner: dependency.owner
      })),
      blockedDependenciesCount: diagnostics.blockedDependenciesCount
    },
    alert: {
      active: alert.active,
      severity: alert.severity,
      message: alert.message
    },
    anomalies: anomalies.map((anomaly) => ({
      code: anomaly.code,
      message: anomaly.message
    })),
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidInputResult({
  reason,
  fromPhase,
  toPhase,
  owner,
  lookbackEntries,
  escalationThreshold,
  historyBlockedCount,
  dependencyAgeMs,
  isStale,
  sourceReasonCode,
  blockingDependencies,
  correctiveActions
}) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_PHASE_PROGRESSION_INPUT',
    reason,
    diagnostics: {
      fromPhase,
      toPhase,
      owner,
      sourceReasonCode,
      historyBlockedCount,
      lookbackEntries,
      escalationThreshold,
      dependencyAgeMs,
      isStale,
      blockingDependencies,
      blockedDependenciesCount: blockingDependencies.length
    },
    alert: {
      active: false,
      severity: 'info',
      message: reason
    },
    anomalies: [],
    correctiveActions
  });
}

function resolveSequenceAnomaly(fromPhase, toPhase) {
  if (!fromPhase || !toPhase) {
    return null;
  }

  const fromIndex = resolvePhaseIndex(fromPhase);
  const toIndex = resolvePhaseIndex(toPhase);
  const indexDiff = toIndex - fromIndex;

  if (indexDiff > 1) {
    return {
      code: 'PHASE_SEQUENCE_GAP_DETECTED',
      message: `Saut de séquence canonique détecté: fromPhase=${fromPhase}, toPhase=${toPhase}, indexDiff=${indexDiff}.`
    };
  }

  if (indexDiff <= 0) {
    return {
      code: 'PHASE_SEQUENCE_REGRESSION_DETECTED',
      message: `Régression canonique détectée: fromPhase=${fromPhase}, toPhase=${toPhase}, indexDiff=${indexDiff}.`
    };
  }

  return null;
}

export function evaluatePhaseProgressionAlert(input, options = {}) {
  const payload = isObject(input) ? input : {};
  const runtimeOptions = isObject(options) ? options : {};

  const lookbackResolution = normalizePositiveInteger(
    payload.lookbackEntries,
    DEFAULT_LOOKBACK_ENTRIES,
    'lookbackEntries'
  );
  const escalationResolution = normalizePositiveInteger(
    payload.escalationThreshold,
    DEFAULT_ESCALATION_THRESHOLD,
    'escalationThreshold'
  );

  const lookbackEntries = lookbackResolution.value;
  const escalationThreshold = escalationResolution.value;

  const ownerFallback = normalizeText(payload.owner) || null;
  const fromPhaseFallback = normalizePhase(payload.fromPhase);
  const toPhaseFallback = normalizePhase(payload.toPhase);

  if (!lookbackResolution.valid) {
    return createInvalidInputResult({
      reason: lookbackResolution.reason,
      fromPhase: fromPhaseFallback,
      toPhase: toPhaseFallback,
      owner: ownerFallback,
      lookbackEntries,
      escalationThreshold,
      historyBlockedCount: 0,
      dependencyAgeMs: null,
      isStale: false,
      sourceReasonCode: null,
      blockingDependencies: [],
      correctiveActions: []
    });
  }

  if (!escalationResolution.valid) {
    return createInvalidInputResult({
      reason: escalationResolution.reason,
      fromPhase: fromPhaseFallback,
      toPhase: toPhaseFallback,
      owner: ownerFallback,
      lookbackEntries,
      escalationThreshold,
      historyBlockedCount: 0,
      dependencyAgeMs: null,
      isStale: false,
      sourceReasonCode: null,
      blockingDependencies: [],
      correctiveActions: []
    });
  }

  const historyResolution = resolveHistoryEntries(payload);

  if (!historyResolution.valid) {
    return createInvalidInputResult({
      reason: historyResolution.reason,
      fromPhase: fromPhaseFallback,
      toPhase: toPhaseFallback,
      owner: ownerFallback,
      lookbackEntries,
      escalationThreshold,
      historyBlockedCount: 0,
      dependencyAgeMs: null,
      isStale: false,
      sourceReasonCode: null,
      blockingDependencies: [],
      correctiveActions: []
    });
  }

  const dependencyResolution = resolveDependencyMatrix(payload, runtimeOptions);

  if (!dependencyResolution.valid) {
    return createInvalidInputResult({
      reason: dependencyResolution.reason,
      fromPhase: fromPhaseFallback,
      toPhase: toPhaseFallback,
      owner: ownerFallback,
      lookbackEntries,
      escalationThreshold,
      historyBlockedCount: countBlockedEntries(historyResolution.entries, lookbackEntries),
      dependencyAgeMs: null,
      isStale: false,
      sourceReasonCode: null,
      blockingDependencies: [],
      correctiveActions: []
    });
  }

  const dependencyMatrix = dependencyResolution.dependencyMatrix;

  const ownerResolution = resolveOwner(payload, dependencyMatrix);

  if (!ownerResolution.valid) {
    return createInvalidInputResult({
      reason: ownerResolution.reason,
      fromPhase: fromPhaseFallback ?? dependencyMatrix.diagnostics.fromPhase,
      toPhase: toPhaseFallback ?? dependencyMatrix.diagnostics.toPhase,
      owner: ownerFallback ?? dependencyMatrix.diagnostics.owner,
      lookbackEntries,
      escalationThreshold,
      historyBlockedCount: countBlockedEntries(historyResolution.entries, lookbackEntries),
      dependencyAgeMs: dependencyMatrix.diagnostics.snapshotAgeMs,
      isStale: dependencyMatrix.diagnostics.isStale,
      sourceReasonCode: dependencyMatrix.reasonCode,
      blockingDependencies: dependencyMatrix.blockingDependencies,
      correctiveActions: uniqueActions(dependencyMatrix.correctiveActions)
    });
  }

  const phasesResolution = resolvePhases(payload, dependencyMatrix);

  if (!phasesResolution.valid) {
    return createInvalidInputResult({
      reason: phasesResolution.reason,
      fromPhase: fromPhaseFallback ?? dependencyMatrix.diagnostics.fromPhase,
      toPhase: toPhaseFallback ?? dependencyMatrix.diagnostics.toPhase,
      owner: ownerResolution.owner,
      lookbackEntries,
      escalationThreshold,
      historyBlockedCount: countBlockedEntries(historyResolution.entries, lookbackEntries),
      dependencyAgeMs: dependencyMatrix.diagnostics.snapshotAgeMs,
      isStale: dependencyMatrix.diagnostics.isStale,
      sourceReasonCode: dependencyMatrix.reasonCode,
      blockingDependencies: dependencyMatrix.blockingDependencies,
      correctiveActions: uniqueActions(dependencyMatrix.correctiveActions)
    });
  }

  const fromPhase = phasesResolution.fromPhase;
  const toPhase = phasesResolution.toPhase;
  const owner = ownerResolution.owner;

  const historyBlockedCount = countBlockedEntries(historyResolution.entries, lookbackEntries);
  const dependencyAgeMs = dependencyMatrix.diagnostics.snapshotAgeMs;
  const isStale = dependencyMatrix.diagnostics.isStale;

  const diagnostics = {
    fromPhase,
    toPhase,
    owner,
    sourceReasonCode: dependencyMatrix.reasonCode,
    historyBlockedCount,
    lookbackEntries,
    escalationThreshold,
    dependencyAgeMs,
    isStale,
    blockingDependencies: dependencyMatrix.blockingDependencies,
    blockedDependenciesCount: dependencyMatrix.blockingDependencies.length
  };

  if (dependencyMatrix.allowed === false) {
    const anomalies = [];

    if (dependencyMatrix.reasonCode === 'DEPENDENCY_STATE_STALE') {
      anomalies.push(
        createAnomaly(
          'DEPENDENCY_STATE_STALE',
          `Dépendances stale détectées pour owner=${owner}: rafraîchissement requis.`
        )
      );
    }

    const result = createResult({
      allowed: false,
      reasonCode: dependencyMatrix.reasonCode,
      reason: dependencyMatrix.reason,
      diagnostics,
      alert: {
        active: true,
        severity: 'warning',
        message: `Alerte progression owner=${owner}: ${dependencyMatrix.reason}`
      },
      anomalies,
      correctiveActions: uniqueActions(dependencyMatrix.correctiveActions)
    });

    return result;
  }

  const sequenceAnomaly = resolveSequenceAnomaly(fromPhase, toPhase);

  if (sequenceAnomaly?.code === 'PHASE_SEQUENCE_GAP_DETECTED') {
    const result = createResult({
      allowed: false,
      reasonCode: 'PHASE_SEQUENCE_GAP_DETECTED',
      reason: sequenceAnomaly.message,
      diagnostics,
      alert: {
        active: true,
        severity: 'warning',
        message: `Alerte progression owner=${owner}: ${sequenceAnomaly.message}`
      },
      anomalies: [createAnomaly(sequenceAnomaly.code, sequenceAnomaly.message)],
      correctiveActions: ['REVIEW_PHASE_SEQUENCE']
    });

    return result;
  }

  if (sequenceAnomaly?.code === 'PHASE_SEQUENCE_REGRESSION_DETECTED') {
    const result = createResult({
      allowed: false,
      reasonCode: 'PHASE_SEQUENCE_REGRESSION_DETECTED',
      reason: sequenceAnomaly.message,
      diagnostics,
      alert: {
        active: true,
        severity: 'warning',
        message: `Alerte progression owner=${owner}: ${sequenceAnomaly.message}`
      },
      anomalies: [createAnomaly(sequenceAnomaly.code, sequenceAnomaly.message)],
      correctiveActions: ['ROLLBACK_TO_CANONICAL_PHASE']
    });

    return result;
  }

  if (historyBlockedCount >= escalationThreshold) {
    const reason =
      `Récurrence de blocages détectée pour owner=${owner}: historyBlockedCount=${historyBlockedCount}, ` +
      `lookbackEntries=${lookbackEntries}, escalationThreshold=${escalationThreshold}.`;

    const result = createResult({
      allowed: false,
      reasonCode: 'REPEATED_BLOCKING_ANOMALY',
      reason,
      diagnostics,
      alert: {
        active: true,
        severity: 'critical',
        message: reason
      },
      anomalies: [createAnomaly('REPEATED_BLOCKING_ANOMALY', reason)],
      correctiveActions: ['ESCALATE_TO_PM']
    });

    return result;
  }

  const result = createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: `Progression canonique valide pour owner=${owner}: aucune anomalie détectée.`,
    diagnostics,
    alert: {
      active: false,
      severity: 'info',
      message: 'Aucune anomalie de progression active.'
    },
    anomalies: [],
    correctiveActions: []
  });

  return result;
}

