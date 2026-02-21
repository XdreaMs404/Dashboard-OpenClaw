import { BMAD_PHASE_ORDER } from './phase-transition-validator.js';

const DEFAULT_QUERY_LIMIT = 50;
const MAX_QUERY_LIMIT = 200;
const DEFAULT_MAX_ENTRIES = 200;
const MAX_RETENTION_ENTRIES = 1000;
const MIN_SORT_MS = -8_640_000_000_000_000;

const ALLOWED_REASON_CODES = new Set([
  'OK',
  'INVALID_PHASE',
  'TRANSITION_NOT_ALLOWED',
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED',
  'PHASE_PREREQUISITES_MISSING',
  'PHASE_PREREQUISITES_INCOMPLETE',
  'INVALID_PHASE_PREREQUISITES',
  'INVALID_GUARD_PHASE',
  'GUARD_EXECUTION_FAILED',
  'INVALID_TRANSITION_HISTORY'
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

function normalizePhase(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toUpperCase();
}

function isValidPhase(phase) {
  return BMAD_PHASE_ORDER.includes(phase);
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

function toIso(ms) {
  return new Date(ms).toISOString();
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

function resolveEntryTimestampMs(payload, options) {
  const fromPayload = parseTimestampMs(payload.recordedAt ?? payload.timestamp);

  if (fromPayload !== null) {
    return fromPayload;
  }

  return resolveNowMs(options);
}

function resolveRetentionLimit(maxEntries) {
  const candidate =
    typeof maxEntries === 'string' && maxEntries.trim().length > 0 ? Number(maxEntries) : maxEntries;

  if (typeof candidate !== 'number' || !Number.isFinite(candidate) || candidate <= 0) {
    return DEFAULT_MAX_ENTRIES;
  }

  return Math.min(MAX_RETENTION_ENTRIES, Math.trunc(candidate));
}

function resolveQueryLimit(queryLimit) {
  const candidate =
    typeof queryLimit === 'string' && queryLimit.trim().length > 0 ? Number(queryLimit) : queryLimit;

  if (typeof candidate !== 'number' || !Number.isFinite(candidate) || candidate <= 0) {
    return DEFAULT_QUERY_LIMIT;
  }

  return Math.min(MAX_QUERY_LIMIT, Math.trunc(candidate));
}

function normalizeQuery(query) {
  const normalizedQuery = isObject(query) ? query : {};

  return {
    fromPhase: normalizePhase(normalizedQuery.fromPhase) || null,
    toPhase: normalizePhase(normalizedQuery.toPhase) || null,
    reasonCode: normalizeReasonCode(normalizedQuery.reasonCode) || null,
    allowed: typeof normalizedQuery.allowed === 'boolean' ? normalizedQuery.allowed : null,
    limit: resolveQueryLimit(normalizedQuery.limit)
  };
}

function normalizeHistoryEntry(entry, index) {
  if (!isObject(entry)) {
    return null;
  }

  const timestampMs = parseTimestampMs(entry.timestamp ?? entry.recordedAt);

  const normalized = {
    ...cloneValue(entry),
    fromPhase: normalizePhase(entry.fromPhase) || '',
    toPhase: normalizePhase(entry.toPhase) || '',
    reasonCode: normalizeReasonCode(entry.reasonCode) || null,
    reason: typeof entry.reason === 'string' ? entry.reason : '',
    allowed: typeof entry.allowed === 'boolean' ? entry.allowed : null,
    timestamp: timestampMs === null ? null : toIso(timestampMs)
  };

  return {
    entry: normalized,
    sortMs: timestampMs === null ? MIN_SORT_MS : timestampMs,
    sortOrder: index
  };
}

function sortRecentFirst(historyEntries) {
  return [...historyEntries].sort((left, right) => {
    if (left.sortMs !== right.sortMs) {
      return right.sortMs - left.sortMs;
    }

    return right.sortOrder - left.sortOrder;
  });
}

function applyRetention(historyEntries, maxEntries) {
  if (historyEntries.length <= maxEntries) {
    return {
      retained: historyEntries,
      droppedCount: 0
    };
  }

  return {
    retained: historyEntries.slice(0, maxEntries),
    droppedCount: historyEntries.length - maxEntries
  };
}

function applyQuery(historyEntries, query) {
  const filtered = historyEntries.filter((wrappedEntry) => {
    const candidate = wrappedEntry.entry;

    if (query.fromPhase !== null && candidate.fromPhase !== query.fromPhase) {
      return false;
    }

    if (query.toPhase !== null && candidate.toPhase !== query.toPhase) {
      return false;
    }

    if (query.reasonCode !== null && candidate.reasonCode !== query.reasonCode) {
      return false;
    }

    if (query.allowed !== null && candidate.allowed !== query.allowed) {
      return false;
    }

    return true;
  });

  return filtered.slice(0, query.limit);
}

function normalizeGuardResult(guardResult) {
  if (!isObject(guardResult)) {
    return {
      valid: false,
      reason: 'guardResult est requis et doit être un objet.'
    };
  }

  if (typeof guardResult.allowed !== 'boolean') {
    return {
      valid: false,
      reason: 'guardResult.allowed doit être booléen.'
    };
  }

  const reasonCode = normalizeReasonCode(guardResult.reasonCode);

  if (!ALLOWED_REASON_CODES.has(reasonCode)) {
    return {
      valid: false,
      reason: `guardResult.reasonCode invalide: ${String(guardResult.reasonCode)}.`
    };
  }

  if (!hasReasonText(guardResult.reason)) {
    return {
      valid: false,
      reason: 'guardResult.reason doit être une chaîne non vide.'
    };
  }

  if (guardResult.allowed === true && reasonCode !== 'OK') {
    return {
      valid: false,
      reason: `Incohérence guardResult: allowed=true exige reasonCode=OK (reçu ${reasonCode}).`
    };
  }

  if (guardResult.allowed === false && reasonCode === 'OK') {
    return {
      valid: false,
      reason: 'Incohérence guardResult: allowed=false ne peut pas utiliser reasonCode=OK.'
    };
  }

  return {
    valid: true,
    guardResult: {
      allowed: guardResult.allowed,
      reasonCode,
      reason: guardResult.reason,
      diagnostics: isObject(guardResult.diagnostics) ? cloneValue(guardResult.diagnostics) : null
    }
  };
}

function createResult({ allowed, reasonCode, reason, diagnostics, entry, history }) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: {
      fromPhase: diagnostics.fromPhase,
      toPhase: diagnostics.toPhase,
      totalCount: diagnostics.totalCount,
      returnedCount: diagnostics.returnedCount,
      droppedCount: diagnostics.droppedCount,
      blockedByGuard: diagnostics.blockedByGuard
    },
    entry: entry ? cloneValue(entry) : null,
    history: history.map((item) => cloneValue(item))
  };
}

function buildInvalidHistoryResult({ fromPhase, toPhase, reason, existingHistory, query }) {
  const normalizedExisting = Array.isArray(existingHistory)
    ? existingHistory.map((entry, index) => normalizeHistoryEntry(entry, index)).filter(Boolean)
    : [];
  const sortedExisting = sortRecentFirst(normalizedExisting);
  const consulted = applyQuery(sortedExisting, query).map((item) => item.entry);

  return createResult({
    allowed: false,
    reasonCode: 'INVALID_TRANSITION_HISTORY',
    reason,
    diagnostics: {
      fromPhase,
      toPhase,
      totalCount: sortedExisting.length,
      returnedCount: consulted.length,
      droppedCount: 0,
      blockedByGuard: false
    },
    entry: null,
    history: consulted
  });
}

export function recordPhaseTransitionHistory(input, options = {}) {
  const payload = isObject(input) ? input : {};
  const fromPhase = normalizePhase(payload.fromPhase);
  const toPhase = normalizePhase(payload.toPhase);

  const diagnostics = {
    fromPhase,
    toPhase,
    totalCount: 0,
    returnedCount: 0,
    droppedCount: 0,
    blockedByGuard: false
  };

  const query = normalizeQuery(payload.query);

  if (!Array.isArray(payload.history)) {
    return buildInvalidHistoryResult({
      fromPhase,
      toPhase,
      reason: 'history doit être un tableau pour enregistrer une transition.',
      existingHistory: payload.history,
      query
    });
  }

  const guardValidation = normalizeGuardResult(payload.guardResult);

  if (!guardValidation.valid) {
    return buildInvalidHistoryResult({
      fromPhase,
      toPhase,
      reason: guardValidation.reason,
      existingHistory: payload.history,
      query
    });
  }

  if (!isValidPhase(fromPhase) || !isValidPhase(toPhase)) {
    const normalizedExisting = payload.history
      .map((entry, index) => normalizeHistoryEntry(entry, index))
      .filter(Boolean);
    const sortedExisting = sortRecentFirst(normalizedExisting);
    const consulted = applyQuery(sortedExisting, query).map((item) => item.entry);

    diagnostics.totalCount = sortedExisting.length;
    diagnostics.returnedCount = consulted.length;

    return createResult({
      allowed: false,
      reasonCode: 'INVALID_PHASE',
      reason: `Phase invalide détectée: fromPhase=${String(fromPhase)}, toPhase=${String(toPhase)}. Phases autorisées: ${BMAD_PHASE_ORDER[0]}..${BMAD_PHASE_ORDER[BMAD_PHASE_ORDER.length - 1]}.`,
      diagnostics,
      entry: null,
      history: consulted
    });
  }

  const entryTimestampMs = resolveEntryTimestampMs(payload, options);
  const normalizedHistory = payload.history
    .map((entry, index) => normalizeHistoryEntry(entry, index))
    .filter(Boolean);

  const entry = {
    fromPhase,
    toPhase,
    allowed: guardValidation.guardResult.allowed,
    reasonCode: guardValidation.guardResult.reasonCode,
    reason: guardValidation.guardResult.reason,
    timestamp: toIso(entryTimestampMs),
    guardDiagnostics: guardValidation.guardResult.diagnostics
  };

  const withNewEntry = [
    ...normalizedHistory,
    {
      entry,
      sortMs: entryTimestampMs,
      sortOrder: normalizedHistory.length
    }
  ];

  const orderedEntries = sortRecentFirst(withNewEntry);

  const retentionMax = resolveRetentionLimit(payload.maxEntries);
  const retention = applyRetention(orderedEntries, retentionMax);

  const consultedEntries = applyQuery(retention.retained, query).map((item) => item.entry);

  diagnostics.totalCount = retention.retained.length;
  diagnostics.returnedCount = consultedEntries.length;
  diagnostics.droppedCount = retention.droppedCount;
  diagnostics.blockedByGuard = guardValidation.guardResult.allowed === false;

  return createResult({
    allowed: guardValidation.guardResult.allowed,
    reasonCode: guardValidation.guardResult.reasonCode,
    reason: guardValidation.guardResult.reason,
    diagnostics,
    entry,
    history: consultedEntries
  });
}
