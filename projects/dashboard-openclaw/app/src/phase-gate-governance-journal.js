import { randomUUID } from 'node:crypto';
import { evaluatePhaseProgressionAlert } from './phase-progression-alert.js';
import { BMAD_PHASE_ORDER } from './phase-transition-validator.js';

const DEFAULT_QUERY_LIMIT = 50;
const MAX_QUERY_LIMIT = 200;
const DEFAULT_MAX_ENTRIES = 200;
const MAX_RETENTION_ENTRIES = 1000;
const MIN_SORT_MS = -8_640_000_000_000_000;
const MAX_SORT_MS = 8_640_000_000_000_000;

const ALLOWED_REASON_CODES = new Set([
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
  'INVALID_PHASE_DEPENDENCY_INPUT',
  'PHASE_SEQUENCE_GAP_DETECTED',
  'PHASE_SEQUENCE_REGRESSION_DETECTED',
  'REPEATED_BLOCKING_ANOMALY',
  'INVALID_PHASE_PROGRESSION_INPUT',
  'INVALID_GOVERNANCE_DECISION_INPUT'
]);

const CRITICAL_REASON_CODES = new Set([
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED',
  'REPEATED_BLOCKING_ANOMALY'
]);

const DEFAULT_ACTIONS_BY_REASON = {
  TRANSITION_NOT_ALLOWED: ['ALIGN_PHASE_SEQUENCE'],
  PHASE_NOTIFICATION_MISSING: ['PUBLISH_PHASE_NOTIFICATION'],
  PHASE_NOTIFICATION_SLA_EXCEEDED: ['PUBLISH_PHASE_NOTIFICATION', 'REVALIDATE_TRANSITION'],
  PHASE_SEQUENCE_GAP_DETECTED: ['REVIEW_PHASE_SEQUENCE'],
  PHASE_SEQUENCE_REGRESSION_DETECTED: ['ROLLBACK_TO_CANONICAL_PHASE'],
  REPEATED_BLOCKING_ANOMALY: ['ESCALATE_TO_PM'],
  DEPENDENCY_STATE_STALE: ['REFRESH_DEPENDENCY_MATRIX']
};

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

function normalizeGateId(value) {
  const normalized = normalizeText(value).toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizePhase(value) {
  const normalized = normalizeText(value).toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeOwner(value) {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
}

function hasReasonText(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidTimestampMs(ms) {
  return Number.isFinite(ms) && ms >= MIN_SORT_MS && ms <= MAX_SORT_MS;
}

function parseTimestampMs(value) {
  if (value instanceof Date) {
    const ms = value.getTime();
    return isValidTimestampMs(ms) ? Math.trunc(ms) : null;
  }

  if (typeof value === 'number') {
    const candidate = Math.trunc(value);
    return isValidTimestampMs(candidate) ? candidate : null;
  }

  if (typeof value === 'string') {
    if (value.trim().length === 0) {
      return null;
    }

    const ms = Date.parse(value);
    return isValidTimestampMs(ms) ? ms : null;
  }

  return null;
}

function toIso(ms) {
  return new Date(ms).toISOString();
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

function isCanonicalPhase(phase) {
  return BMAD_PHASE_ORDER.includes(phase);
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

function normalizeActions(value) {
  if (value === undefined) {
    return {
      valid: true,
      actions: []
    };
  }

  if (!Array.isArray(value) || value.some((action) => typeof action !== 'string')) {
    return {
      valid: false,
      reason: 'correctiveActions doit être un tableau de chaînes.'
    };
  }

  const normalized = value
    .map((action) => normalizeText(action))
    .filter((action) => action.length > 0);

  return {
    valid: true,
    actions: uniqueActions(normalized)
  };
}

function normalizeEvidenceRefs(value) {
  if (value === undefined) {
    return {
      valid: true,
      evidenceRefs: []
    };
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    return {
      valid: false,
      reason: 'evidenceRefs doit être un tableau de chaînes.'
    };
  }

  const normalized = value
    .map((item) => normalizeText(item))
    .filter((item) => item.length > 0);

  return {
    valid: true,
    evidenceRefs: uniqueActions(normalized)
  };
}

function resolveSeverity(allowed, reasonCode) {
  if (allowed === true) {
    return 'info';
  }

  if (CRITICAL_REASON_CODES.has(reasonCode)) {
    return 'critical';
  }

  return 'warning';
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

function resolveDecisionId(payload, runtimeOptions) {
  const fromPayload = normalizeText(payload.decisionId);

  if (fromPayload.length > 0) {
    return fromPayload;
  }

  if (typeof runtimeOptions.idGenerator === 'function') {
    const generated = runtimeOptions.idGenerator();
    const normalized = normalizeText(generated);

    if (normalized.length > 0) {
      return normalized;
    }
  }

  return randomUUID();
}

function resolveDecisionTimestampMs(payload, runtimeOptions) {
  const hasExplicitTimestamp = payload.decidedAt !== undefined || payload.timestamp !== undefined;
  const explicitTimestamp = payload.decidedAt ?? payload.timestamp;
  const candidate = parseTimestampMs(explicitTimestamp);

  if (hasExplicitTimestamp && candidate === null) {
    return {
      valid: false,
      reason: `decidedAt/timestamp invalide: ${String(explicitTimestamp)}.`
    };
  }

  if (candidate !== null) {
    return {
      valid: true,
      decidedAtMs: candidate
    };
  }

  return {
    valid: true,
    decidedAtMs: resolveNowMs(runtimeOptions)
  };
}

function resolveMaxEntries(value) {
  const candidate = toInteger(value);

  if (candidate === null || candidate <= 0) {
    return DEFAULT_MAX_ENTRIES;
  }

  return Math.min(MAX_RETENTION_ENTRIES, candidate);
}

function resolveQueryLimit(value) {
  const candidate = toInteger(value);

  if (candidate === null || candidate <= 0) {
    return DEFAULT_QUERY_LIMIT;
  }

  return Math.min(MAX_QUERY_LIMIT, candidate);
}

function normalizeQuery(query) {
  const normalized = isObject(query) ? query : {};

  const phase = normalizePhase(normalized.phase);

  if (normalized.phase !== undefined && (!phase || !isCanonicalPhase(phase))) {
    return {
      valid: false,
      reason: 'query.phase invalide: phase canonique H01..H23 requise.'
    };
  }

  const reasonCode = normalizeReasonCode(normalized.reasonCode) || null;

  if (reasonCode !== null && !ALLOWED_REASON_CODES.has(reasonCode)) {
    return {
      valid: false,
      reason: `query.reasonCode invalide: ${String(normalized.reasonCode)}.`
    };
  }

  const fromDate = normalized.fromDate ?? normalized.from;
  const toDate = normalized.toDate ?? normalized.to;

  const fromDateMs = fromDate === undefined ? null : parseTimestampMs(fromDate);
  const toDateMs = toDate === undefined ? null : parseTimestampMs(toDate);

  if (fromDate !== undefined && fromDateMs === null) {
    return {
      valid: false,
      reason: `query.fromDate invalide: ${String(fromDate)}.`
    };
  }

  if (toDate !== undefined && toDateMs === null) {
    return {
      valid: false,
      reason: `query.toDate invalide: ${String(toDate)}.`
    };
  }

  if (fromDateMs !== null && toDateMs !== null && fromDateMs > toDateMs) {
    return {
      valid: false,
      reason: 'query.fromDate doit être <= query.toDate.'
    };
  }

  return {
    valid: true,
    query: {
      phase,
      gateId: normalizeGateId(normalized.gate),
      owner: normalizeOwner(normalized.owner),
      reasonCode,
      allowed: typeof normalized.allowed === 'boolean' ? normalized.allowed : null,
      fromDateMs,
      toDateMs,
      limit: resolveQueryLimit(normalized.limit)
    }
  };
}

function normalizeProgressionAlert(candidate) {
  if (!isObject(candidate)) {
    return {
      valid: false,
      reason: 'progressionAlert doit être un objet valide.'
    };
  }

  if (typeof candidate.allowed !== 'boolean') {
    return {
      valid: false,
      reason: 'progressionAlert.allowed doit être booléen.'
    };
  }

  const reasonCode = normalizeReasonCode(candidate.reasonCode);

  if (!ALLOWED_REASON_CODES.has(reasonCode) || reasonCode === 'INVALID_GOVERNANCE_DECISION_INPUT') {
    return {
      valid: false,
      reason: `progressionAlert.reasonCode invalide: ${String(candidate.reasonCode)}.`
    };
  }

  if (!hasReasonText(candidate.reason)) {
    return {
      valid: false,
      reason: 'progressionAlert.reason doit être une chaîne non vide.'
    };
  }

  if (candidate.allowed === true && reasonCode !== 'OK') {
    return {
      valid: false,
      reason: `Incohérence progressionAlert: allowed=true exige reasonCode=OK (reçu ${reasonCode}).`
    };
  }

  if (candidate.allowed === false && reasonCode === 'OK') {
    return {
      valid: false,
      reason: 'Incohérence progressionAlert: allowed=false ne peut pas utiliser reasonCode=OK.'
    };
  }

  if (!isObject(candidate.diagnostics)) {
    return {
      valid: false,
      reason: 'progressionAlert.diagnostics doit être un objet valide.'
    };
  }

  const actionsResolution = normalizeActions(candidate.correctiveActions);

  if (!actionsResolution.valid) {
    return actionsResolution;
  }

  return {
    valid: true,
    progressionAlert: {
      allowed: candidate.allowed,
      reasonCode,
      reason: candidate.reason,
      diagnostics: {
        fromPhase: normalizePhase(candidate.diagnostics.fromPhase),
        toPhase: normalizePhase(candidate.diagnostics.toPhase),
        owner: normalizeOwner(candidate.diagnostics.owner),
        sourceReasonCode:
          normalizeReasonCode(candidate.diagnostics.sourceReasonCode) || reasonCode
      },
      correctiveActions: actionsResolution.actions
    }
  };
}

function resolveProgressionAlert(payload, runtimeOptions) {
  if (payload.progressionAlert !== undefined) {
    return normalizeProgressionAlert(payload.progressionAlert);
  }

  if (payload.progressionAlertInput === undefined) {
    return {
      valid: false,
      reason: 'progressionAlert ou progressionAlertInput est requis.'
    };
  }

  if (!isObject(payload.progressionAlertInput)) {
    return {
      valid: false,
      reason: 'progressionAlertInput doit être un objet valide.'
    };
  }

  const progressionAlertEvaluator =
    typeof runtimeOptions.progressionAlertEvaluator === 'function'
      ? runtimeOptions.progressionAlertEvaluator
      : evaluatePhaseProgressionAlert;

  let evaluated;

  try {
    evaluated = progressionAlertEvaluator(cloneValue(payload.progressionAlertInput));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      valid: false,
      reason: `evaluatePhaseProgressionAlert a levé une exception: ${message}`
    };
  }

  const normalized = normalizeProgressionAlert(evaluated);

  if (!normalized.valid) {
    return {
      valid: false,
      reason: `Résultat invalide depuis evaluatePhaseProgressionAlert: ${normalized.reason}`
    };
  }

  return normalized;
}

function resolveDecisionContext(payload, progressionAlert) {
  const phaseFrom = normalizePhase(payload.phaseFrom) ?? progressionAlert.diagnostics.fromPhase;
  const phaseTo = normalizePhase(payload.phaseTo) ?? progressionAlert.diagnostics.toPhase;
  const gateId = normalizeGateId(payload.gateId ?? payload.gate);
  const owner = normalizeOwner(payload.owner) ?? progressionAlert.diagnostics.owner;

  if (!phaseFrom || !isCanonicalPhase(phaseFrom)) {
    return {
      valid: false,
      reason: 'phaseFrom invalide: phase canonique H01..H23 requise.'
    };
  }

  if (!phaseTo || !isCanonicalPhase(phaseTo)) {
    return {
      valid: false,
      reason: 'phaseTo invalide: phase canonique H01..H23 requise.'
    };
  }

  if (!gateId) {
    return {
      valid: false,
      reason: 'gateId est requis (ex: G1, G2, G4-T, G4-UX, G5).'
    };
  }

  if (!owner) {
    return {
      valid: false,
      reason: 'owner est requis pour journaliser la décision de gouvernance.'
    };
  }

  return {
    valid: true,
    context: {
      phaseFrom,
      phaseTo,
      gateId,
      owner
    }
  };
}

function normalizeHistoryEntry(entry, index) {
  if (!isObject(entry)) {
    return null;
  }

  const decisionId = normalizeText(entry.decisionId);
  const decisionType = normalizeText(entry.decisionType) || 'phase-gate';
  const phaseFrom = normalizePhase(entry.phaseFrom);
  const phaseTo = normalizePhase(entry.phaseTo);
  const gateId = normalizeGateId(entry.gateId);
  const owner = normalizeOwner(entry.owner);
  const reasonCode = normalizeReasonCode(entry.reasonCode);
  const sourceReasonCode = normalizeReasonCode(entry.sourceReasonCode) || reasonCode;
  const severity = normalizeText(entry.severity).toLowerCase();
  const decidedAtMs = parseTimestampMs(entry.decidedAt);

  if (!decisionId || !phaseFrom || !phaseTo || !gateId || !owner || decidedAtMs === null) {
    return null;
  }

  if (!isCanonicalPhase(phaseFrom) || !isCanonicalPhase(phaseTo)) {
    return null;
  }

  if (typeof entry.allowed !== 'boolean') {
    return null;
  }

  if (!ALLOWED_REASON_CODES.has(reasonCode)) {
    return null;
  }

  if (!hasReasonText(entry.reason)) {
    return null;
  }

  const actionsResolution = normalizeActions(entry.correctiveActions);
  const evidenceResolution = normalizeEvidenceRefs(entry.evidenceRefs);

  if (!actionsResolution.valid || !evidenceResolution.valid) {
    return null;
  }

  const resolvedSeverity = ['info', 'warning', 'critical'].includes(severity)
    ? severity
    : resolveSeverity(entry.allowed, reasonCode);

  return {
    entry: {
      decisionId,
      decisionType,
      phaseFrom,
      phaseTo,
      gateId,
      owner,
      allowed: entry.allowed,
      reasonCode,
      reason: entry.reason,
      severity: resolvedSeverity,
      decidedAt: toIso(decidedAtMs),
      sourceReasonCode,
      correctiveActions: actionsResolution.actions,
      evidenceRefs: evidenceResolution.evidenceRefs
    },
    sortMs: decidedAtMs,
    sortOrder: index
  };
}

function sortRecentFirst(entries) {
  return [...entries].sort((left, right) => {
    if (left.sortMs !== right.sortMs) {
      return right.sortMs - left.sortMs;
    }

    return right.sortOrder - left.sortOrder;
  });
}

function applyRetention(entries, maxEntries) {
  if (entries.length <= maxEntries) {
    return {
      retained: entries,
      droppedCount: 0
    };
  }

  return {
    retained: entries.slice(0, maxEntries),
    droppedCount: entries.length - maxEntries
  };
}

function applyQuery(entries, query) {
  const filtered = entries.filter((wrapped) => {
    const candidate = wrapped.entry;
    const candidateOwner = candidate.owner.toLowerCase();

    if (query.phase && candidate.phaseFrom !== query.phase && candidate.phaseTo !== query.phase) {
      return false;
    }

    if (query.gateId && candidate.gateId !== query.gateId) {
      return false;
    }

    if (query.owner && candidateOwner !== query.owner.toLowerCase()) {
      return false;
    }

    if (query.reasonCode && candidate.reasonCode !== query.reasonCode) {
      return false;
    }

    if (query.allowed !== null && candidate.allowed !== query.allowed) {
      return false;
    }

    const decidedAtMs = parseTimestampMs(candidate.decidedAt);
    const normalizedDecisionMs = decidedAtMs ?? MIN_SORT_MS;

    if (query.fromDateMs !== null && normalizedDecisionMs < query.fromDateMs) {
      return false;
    }

    if (query.toDateMs !== null && normalizedDecisionMs > query.toDateMs) {
      return false;
    }

    return true;
  });

  return filtered.slice(0, query.limit);
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  decisionEntry,
  decisionHistory,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: {
      phaseFrom: diagnostics.phaseFrom,
      phaseTo: diagnostics.phaseTo,
      gateId: diagnostics.gateId,
      owner: diagnostics.owner,
      sourceReasonCode: diagnostics.sourceReasonCode,
      decisionCount: diagnostics.decisionCount,
      returnedCount: diagnostics.returnedCount,
      droppedCount: diagnostics.droppedCount,
      blockedByGovernance: diagnostics.blockedByGovernance,
      criticalAlertActive: diagnostics.criticalAlertActive,
      mttaTargetMinutes: diagnostics.mttaTargetMinutes
    },
    decisionEntry: decisionEntry ? cloneValue(decisionEntry) : null,
    decisionHistory: decisionHistory.map((item) => cloneValue(item)),
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidInputResult({
  reason,
  phaseFrom,
  phaseTo,
  gateId,
  owner,
  sourceReasonCode,
  decisionHistory,
  droppedCount
}) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_GOVERNANCE_DECISION_INPUT',
    reason,
    diagnostics: {
      phaseFrom,
      phaseTo,
      gateId,
      owner,
      sourceReasonCode,
      decisionCount: decisionHistory.length,
      returnedCount: decisionHistory.length,
      droppedCount,
      blockedByGovernance: false,
      criticalAlertActive: false,
      mttaTargetMinutes: null
    },
    decisionEntry: null,
    decisionHistory,
    correctiveActions: []
  });
}

function resolveDefaultActions(reasonCode) {
  const defaults = DEFAULT_ACTIONS_BY_REASON[reasonCode];
  return Array.isArray(defaults) ? [...defaults] : [];
}

export function recordPhaseGateGovernanceDecision(input, options = {}) {
  const payload = isObject(input) ? input : {};
  const runtimeOptions = isObject(options) ? options : {};

  if (payload.decisionHistory !== undefined && !Array.isArray(payload.decisionHistory)) {
    return createInvalidInputResult({
      reason: 'decisionHistory doit être un tableau.',
      phaseFrom: normalizePhase(payload.phaseFrom),
      phaseTo: normalizePhase(payload.phaseTo),
      gateId: normalizeGateId(payload.gateId ?? payload.gate),
      owner: normalizeOwner(payload.owner),
      sourceReasonCode: null,
      decisionHistory: [],
      droppedCount: 0
    });
  }

  const normalizedExistingHistory = Array.isArray(payload.decisionHistory)
    ? payload.decisionHistory
        .map((entry, index) => normalizeHistoryEntry(entry, index))
        .filter(Boolean)
    : [];

  const sortedExistingHistory = sortRecentFirst(normalizedExistingHistory);
  const maxEntries = resolveMaxEntries(payload.maxEntries);

  const queryResolution = normalizeQuery(payload.query);

  if (!queryResolution.valid) {
    const retained = applyRetention(sortedExistingHistory, maxEntries);
    const consulted = applyQuery(retained.retained, {
      phase: null,
      gateId: null,
      owner: null,
      reasonCode: null,
      allowed: null,
      fromDateMs: null,
      toDateMs: null,
      limit: DEFAULT_QUERY_LIMIT
    }).map((item) => item.entry);

    return createInvalidInputResult({
      reason: queryResolution.reason,
      phaseFrom: normalizePhase(payload.phaseFrom),
      phaseTo: normalizePhase(payload.phaseTo),
      gateId: normalizeGateId(payload.gateId ?? payload.gate),
      owner: normalizeOwner(payload.owner),
      sourceReasonCode: null,
      decisionHistory: consulted,
      droppedCount: retained.droppedCount
    });
  }

  const progressionResolution = resolveProgressionAlert(payload, runtimeOptions);

  if (!progressionResolution.valid) {
    const retained = applyRetention(sortedExistingHistory, maxEntries);
    const consulted = applyQuery(retained.retained, queryResolution.query).map((item) => item.entry);

    return createInvalidInputResult({
      reason: progressionResolution.reason,
      phaseFrom: normalizePhase(payload.phaseFrom),
      phaseTo: normalizePhase(payload.phaseTo),
      gateId: normalizeGateId(payload.gateId ?? payload.gate),
      owner: normalizeOwner(payload.owner),
      sourceReasonCode: null,
      decisionHistory: consulted,
      droppedCount: retained.droppedCount
    });
  }

  const progressionAlert = progressionResolution.progressionAlert;

  const contextResolution = resolveDecisionContext(payload, progressionAlert);

  if (!contextResolution.valid) {
    const retained = applyRetention(sortedExistingHistory, maxEntries);
    const consulted = applyQuery(retained.retained, queryResolution.query).map((item) => item.entry);

    return createInvalidInputResult({
      reason: contextResolution.reason,
      phaseFrom: normalizePhase(payload.phaseFrom) ?? progressionAlert.diagnostics.fromPhase,
      phaseTo: normalizePhase(payload.phaseTo) ?? progressionAlert.diagnostics.toPhase,
      gateId: normalizeGateId(payload.gateId ?? payload.gate),
      owner: normalizeOwner(payload.owner) ?? progressionAlert.diagnostics.owner,
      sourceReasonCode: progressionAlert.diagnostics.sourceReasonCode,
      decisionHistory: consulted,
      droppedCount: retained.droppedCount
    });
  }

  const actionsResolution = normalizeActions(payload.correctiveActions);

  if (!actionsResolution.valid) {
    const retained = applyRetention(sortedExistingHistory, maxEntries);
    const consulted = applyQuery(retained.retained, queryResolution.query).map((item) => item.entry);

    return createInvalidInputResult({
      reason: actionsResolution.reason,
      phaseFrom: contextResolution.context.phaseFrom,
      phaseTo: contextResolution.context.phaseTo,
      gateId: contextResolution.context.gateId,
      owner: contextResolution.context.owner,
      sourceReasonCode: progressionAlert.diagnostics.sourceReasonCode,
      decisionHistory: consulted,
      droppedCount: retained.droppedCount
    });
  }

  const evidenceResolution = normalizeEvidenceRefs(payload.evidenceRefs);

  if (!evidenceResolution.valid) {
    const retained = applyRetention(sortedExistingHistory, maxEntries);
    const consulted = applyQuery(retained.retained, queryResolution.query).map((item) => item.entry);

    return createInvalidInputResult({
      reason: evidenceResolution.reason,
      phaseFrom: contextResolution.context.phaseFrom,
      phaseTo: contextResolution.context.phaseTo,
      gateId: contextResolution.context.gateId,
      owner: contextResolution.context.owner,
      sourceReasonCode: progressionAlert.diagnostics.sourceReasonCode,
      decisionHistory: consulted,
      droppedCount: retained.droppedCount
    });
  }

  const decisionTimestampResolution = resolveDecisionTimestampMs(payload, runtimeOptions);

  if (!decisionTimestampResolution.valid) {
    const retained = applyRetention(sortedExistingHistory, maxEntries);
    const consulted = applyQuery(retained.retained, queryResolution.query).map((item) => item.entry);

    return createInvalidInputResult({
      reason: decisionTimestampResolution.reason,
      phaseFrom: contextResolution.context.phaseFrom,
      phaseTo: contextResolution.context.phaseTo,
      gateId: contextResolution.context.gateId,
      owner: contextResolution.context.owner,
      sourceReasonCode: progressionAlert.diagnostics.sourceReasonCode,
      decisionHistory: consulted,
      droppedCount: retained.droppedCount
    });
  }

  const decisionType = normalizeText(payload.decisionType) || 'phase-gate';
  const decidedAtMs = decisionTimestampResolution.decidedAtMs;
  const decisionId = resolveDecisionId(payload, runtimeOptions);

  const defaultActions = resolveDefaultActions(progressionAlert.reasonCode);
  const mergedActions = uniqueActions([
    ...progressionAlert.correctiveActions,
    ...actionsResolution.actions,
    ...defaultActions
  ]);

  const severity = resolveSeverity(progressionAlert.allowed, progressionAlert.reasonCode);
  const sourceReasonCode = progressionAlert.diagnostics.sourceReasonCode;

  const decisionEntry = {
    decisionId,
    decisionType,
    phaseFrom: contextResolution.context.phaseFrom,
    phaseTo: contextResolution.context.phaseTo,
    gateId: contextResolution.context.gateId,
    owner: contextResolution.context.owner,
    allowed: progressionAlert.allowed,
    reasonCode: progressionAlert.reasonCode,
    reason: progressionAlert.reason,
    severity,
    decidedAt: toIso(decidedAtMs),
    sourceReasonCode,
    correctiveActions: mergedActions,
    evidenceRefs: evidenceResolution.evidenceRefs
  };

  const wrappedNewEntry = {
    entry: decisionEntry,
    sortMs: decidedAtMs,
    sortOrder: normalizedExistingHistory.length
  };

  const sortedWithEntry = sortRecentFirst([...normalizedExistingHistory, wrappedNewEntry]);
  const retained = applyRetention(sortedWithEntry, maxEntries);
  const consulted = applyQuery(retained.retained, queryResolution.query).map((item) => item.entry);

  return createResult({
    allowed: progressionAlert.allowed,
    reasonCode: progressionAlert.reasonCode,
    reason: progressionAlert.reason,
    diagnostics: {
      phaseFrom: contextResolution.context.phaseFrom,
      phaseTo: contextResolution.context.phaseTo,
      gateId: contextResolution.context.gateId,
      owner: contextResolution.context.owner,
      sourceReasonCode,
      decisionCount: retained.retained.length,
      returnedCount: consulted.length,
      droppedCount: retained.droppedCount,
      blockedByGovernance: progressionAlert.allowed === false,
      criticalAlertActive: severity === 'critical',
      mttaTargetMinutes: severity === 'critical' ? 10 : null
    },
    decisionEntry,
    decisionHistory: consulted,
    correctiveActions: mergedActions
  });
}
