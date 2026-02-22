import path from 'node:path';
import { searchArtifactsFullText } from './artifact-fulltext-search.js';

const REASON_CODES = Object.freeze([
  'OK',
  'ARTIFACT_PATH_NOT_ALLOWED',
  'UNSUPPORTED_ARTIFACT_TYPE',
  'ARTIFACT_READ_FAILED',
  'ARTIFACT_PARSE_FAILED',
  'ARTIFACT_METADATA_MISSING',
  'ARTIFACT_METADATA_INVALID',
  'ARTIFACT_SECTIONS_MISSING',
  'ARTIFACT_TABLES_MISSING',
  'INVALID_ARTIFACT_SEARCH_INPUT',
  'INVALID_ARTIFACT_CONTEXT_FILTER_INPUT'
]);

const REASON_CODE_SET = new Set(REASON_CODES);

const PROPAGABLE_REASON_CODES = new Set([
  'ARTIFACT_PATH_NOT_ALLOWED',
  'UNSUPPORTED_ARTIFACT_TYPE',
  'ARTIFACT_READ_FAILED',
  'ARTIFACT_PARSE_FAILED',
  'ARTIFACT_METADATA_MISSING',
  'ARTIFACT_METADATA_INVALID',
  'ARTIFACT_SECTIONS_MISSING',
  'ARTIFACT_TABLES_MISSING',
  'INVALID_ARTIFACT_SEARCH_INPUT'
]);

const ACTION_BY_REASON = Object.freeze({
  ARTIFACT_PATH_NOT_ALLOWED: 'RESTRICT_TO_ALLOWED_ROOTS',
  UNSUPPORTED_ARTIFACT_TYPE: 'REMOVE_UNSUPPORTED_ARTIFACTS',
  ARTIFACT_READ_FAILED: 'RETRY_ARTIFACT_READ',
  ARTIFACT_PARSE_FAILED: 'FIX_ARTIFACT_SYNTAX',
  ARTIFACT_METADATA_MISSING: 'ADD_REQUIRED_METADATA',
  ARTIFACT_METADATA_INVALID: 'FIX_INVALID_METADATA',
  ARTIFACT_SECTIONS_MISSING: 'ADD_STRUCTURED_HEADINGS',
  ARTIFACT_TABLES_MISSING: 'ADD_MARKDOWN_TABLES',
  INVALID_ARTIFACT_SEARCH_INPUT: 'FIX_SEARCH_INPUT'
});

const DEFAULT_FILTERS = Object.freeze({
  phase: [],
  agent: [],
  gate: [],
  owner: [],
  riskLevel: [],
  dateFrom: null,
  dateTo: null,
  dateFromMs: null,
  dateToMs: null
});

const DEFAULT_PAGINATION = Object.freeze({
  offset: 0,
  limit: 50
});

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneValue(entry));
  }

  if (isObject(value)) {
    const clone = {};

    for (const [key, entry] of Object.entries(value)) {
      clone[key] = cloneValue(entry);
    }

    return clone;
  }

  return value;
}

function normalizeText(value) {
  if (typeof value === 'string') {
    return value.trim();
  }

  return '';
}

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeDateInput(value, label) {
  const normalized = normalizeText(value);

  if (normalized.length === 0) {
    return {
      valid: false,
      reason: `${label} invalide: date ISO requise.`
    };
  }

  const parsedDate = new Date(normalized);

  if (Number.isNaN(parsedDate.getTime())) {
    return {
      valid: false,
      reason: `${label} invalide: date ISO non reconnue.`
    };
  }

  return {
    valid: true,
    iso: parsedDate.toISOString(),
    ms: parsedDate.getTime()
  };
}

function toDurationMs(startedAtMs, endedAtMs) {
  const start = Number.isFinite(startedAtMs) ? startedAtMs : 0;
  const end = Number.isFinite(endedAtMs) ? endedAtMs : start;

  if (end < start) {
    return 0;
  }

  return Math.max(0, Math.trunc(end - start));
}

function computePercentile(samples, percentile) {
  if (!Array.isArray(samples) || samples.length === 0) {
    return 0;
  }

  const sorted = samples
    .map((value) => Number(value))
    .map((value) => (Number.isFinite(value) && value >= 0 ? value : 0))
    .sort((left, right) => left - right);

  const ratio = Math.min(100, Math.max(0, Number(percentile))) / 100;
  const index = Math.ceil(sorted.length * ratio) - 1;

  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function normalizeList(value, label) {
  if (value === undefined || value === null) {
    return {
      valid: true,
      values: []
    };
  }

  const source = Array.isArray(value) ? value : [value];

  if (source.length === 0) {
    return {
      valid: false,
      reason: `${label} invalide: valeur non vide requise.`
    };
  }

  const values = [];
  const seen = new Set();

  for (let index = 0; index < source.length; index += 1) {
    const normalized = normalizeLower(String(source[index] ?? ''));

    if (normalized.length === 0) {
      return {
        valid: false,
        reason: `${label}[${index}] invalide: chaîne non vide requise.`
      };
    }

    if (!seen.has(normalized)) {
      seen.add(normalized);
      values.push(normalized);
    }
  }

  return {
    valid: true,
    values
  };
}

function resolvePagination(payload) {
  if (payload.pagination === undefined) {
    return {
      valid: true,
      pagination: cloneValue(DEFAULT_PAGINATION)
    };
  }

  if (!isObject(payload.pagination)) {
    return {
      valid: false,
      reason: 'pagination invalide: objet attendu.'
    };
  }

  const offset = payload.pagination.offset ?? DEFAULT_PAGINATION.offset;
  const limit = payload.pagination.limit ?? DEFAULT_PAGINATION.limit;

  if (!Number.isInteger(offset) || offset < 0) {
    return {
      valid: false,
      reason: 'pagination.offset invalide: entier >= 0 requis.'
    };
  }

  if (!Number.isInteger(limit) || limit < 1 || limit > 500) {
    return {
      valid: false,
      reason: 'pagination.limit invalide: entier entre 1 et 500 requis.'
    };
  }

  return {
    valid: true,
    pagination: {
      offset,
      limit
    }
  };
}

function resolveFilters(payload) {
  if (payload.filters === undefined) {
    return {
      valid: true,
      filters: cloneValue(DEFAULT_FILTERS)
    };
  }

  if (!isObject(payload.filters)) {
    return {
      valid: false,
      reason: 'filters invalide: objet attendu.'
    };
  }

  const allowedKeys = new Set(['phase', 'agent', 'gate', 'owner', 'riskLevel', 'dateFrom', 'dateTo']);
  const unknownKeys = Object.keys(payload.filters).filter((key) => !allowedKeys.has(key));

  if (unknownKeys.length > 0) {
    return {
      valid: false,
      reason: `filters contient des clés non supportées: ${unknownKeys.join(', ')}.`
    };
  }

  const phase = normalizeList(payload.filters.phase, 'filters.phase');

  if (!phase.valid) {
    return phase;
  }

  const agent = normalizeList(payload.filters.agent, 'filters.agent');

  if (!agent.valid) {
    return agent;
  }

  const gate = normalizeList(payload.filters.gate, 'filters.gate');

  if (!gate.valid) {
    return gate;
  }

  const owner = normalizeList(payload.filters.owner, 'filters.owner');

  if (!owner.valid) {
    return owner;
  }

  const riskLevel = normalizeList(payload.filters.riskLevel, 'filters.riskLevel');

  if (!riskLevel.valid) {
    return riskLevel;
  }

  let dateFrom = null;
  let dateFromMs = null;

  if (payload.filters.dateFrom !== undefined && payload.filters.dateFrom !== null) {
    const resolvedDateFrom = normalizeDateInput(payload.filters.dateFrom, 'filters.dateFrom');

    if (!resolvedDateFrom.valid) {
      return resolvedDateFrom;
    }

    dateFrom = resolvedDateFrom.iso;
    dateFromMs = resolvedDateFrom.ms;
  }

  let dateTo = null;
  let dateToMs = null;

  if (payload.filters.dateTo !== undefined && payload.filters.dateTo !== null) {
    const resolvedDateTo = normalizeDateInput(payload.filters.dateTo, 'filters.dateTo');

    if (!resolvedDateTo.valid) {
      return resolvedDateTo;
    }

    dateTo = resolvedDateTo.iso;
    dateToMs = resolvedDateTo.ms;
  }

  if (dateFromMs !== null && dateToMs !== null && dateFromMs > dateToMs) {
    return {
      valid: false,
      reason: 'filters.dateFrom doit être antérieure ou égale à filters.dateTo.'
    };
  }

  return {
    valid: true,
    filters: {
      phase: phase.values,
      agent: agent.values,
      gate: gate.values,
      owner: owner.values,
      riskLevel: riskLevel.values,
      dateFrom,
      dateTo,
      dateFromMs,
      dateToMs
    }
  };
}

function buildAppliedFilters(filters, pagination) {
  return {
    phase: [...filters.phase],
    agent: [...filters.agent],
    gate: [...filters.gate],
    owner: [...filters.owner],
    riskLevel: [...filters.riskLevel],
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    offset: pagination.offset,
    limit: pagination.limit
  };
}

function normalizeCorrectiveActions(reasonCode, correctiveActions) {
  if (Array.isArray(correctiveActions) && correctiveActions.length > 0) {
    const normalized = [];
    const seen = new Set();

    for (const action of correctiveActions) {
      const normalizedAction = normalizeText(action);

      if (normalizedAction.length === 0 || seen.has(normalizedAction)) {
        continue;
      }

      seen.add(normalizedAction);
      normalized.push(normalizedAction);
    }

    if (normalized.length > 0) {
      return normalized;
    }
  }

  const fallbackAction = ACTION_BY_REASON[reasonCode];

  return [fallbackAction].filter(Boolean);
}

function createDiagnostics({
  requestedCount,
  filteredCount,
  filteredOutCount,
  diffCandidateGroupsCount,
  durationMs,
  p95FilterMs,
  sourceReasonCode
}) {
  return {
    requestedCount,
    filteredCount,
    filteredOutCount,
    diffCandidateGroupsCount,
    durationMs,
    p95FilterMs,
    sourceReasonCode
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  filteredResults,
  appliedFilters,
  diffCandidates,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: createDiagnostics(diagnostics),
    filteredResults: filteredResults.map((entry) => cloneValue(entry)),
    appliedFilters: cloneValue(appliedFilters),
    diffCandidates: diffCandidates.map((entry) => cloneValue(entry)),
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidResult({ reason, appliedFilters, durationMs }) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_ARTIFACT_CONTEXT_FILTER_INPUT',
    reason,
    diagnostics: {
      requestedCount: 0,
      filteredCount: 0,
      filteredOutCount: 0,
      diffCandidateGroupsCount: 0,
      durationMs,
      p95FilterMs: 0,
      sourceReasonCode: 'INVALID_ARTIFACT_CONTEXT_FILTER_INPUT'
    },
    filteredResults: [],
    appliedFilters,
    diffCandidates: [],
    correctiveActions: []
  });
}

function createBlockedResult({
  reasonCode,
  reason,
  requestedCount,
  appliedFilters,
  sourceReasonCode,
  correctiveActions,
  durationMs
}) {
  return createResult({
    allowed: false,
    reasonCode,
    reason,
    diagnostics: {
      requestedCount,
      filteredCount: 0,
      filteredOutCount: 0,
      diffCandidateGroupsCount: 0,
      durationMs,
      p95FilterMs: 0,
      sourceReasonCode
    },
    filteredResults: [],
    appliedFilters,
    diffCandidates: [],
    correctiveActions
  });
}

function normalizeResultEntry(entry, index, label) {
  if (!isObject(entry)) {
    return {
      valid: false,
      reason: `${label}[${index}] invalide: objet attendu.`
    };
  }

  const artifactPathCandidate =
    normalizeText(String(entry.artifactPath ?? entry.path ?? entry.filePath ?? ''));

  if (artifactPathCandidate.length === 0) {
    return {
      valid: false,
      reason: `${label}[${index}].artifactPath invalide: chaîne non vide requise.`
    };
  }

  const score = Number(entry.score);

  if (!Number.isFinite(score)) {
    return {
      valid: false,
      reason: `${label}[${index}].score invalide: nombre fini requis.`
    };
  }

  const dateSource = entry.date ?? entry.dateAt ?? entry.updatedAt ?? entry.createdAt ?? entry.indexedAt;
  let date = '';
  let dateMs = null;

  if (dateSource !== undefined && dateSource !== null) {
    const normalizedDate = normalizeDateInput(dateSource, `${label}[${index}].date`);

    if (!normalizedDate.valid) {
      return normalizedDate;
    }

    date = normalizedDate.iso;
    dateMs = normalizedDate.ms;
  }

  const artifactId =
    normalizeText(entry.artifactId) ||
    normalizeText(entry.id) ||
    normalizeText(entry.versionId) ||
    path.resolve(artifactPathCandidate);

  return {
    valid: true,
    result: {
      ...cloneValue(entry),
      artifactPath: path.resolve(artifactPathCandidate),
      score,
      phase: normalizeLower(entry.phase),
      agent: normalizeLower(entry.agent),
      gate: normalizeLower(entry.gate),
      owner: normalizeLower(entry.owner),
      riskLevel: normalizeLower(entry.riskLevel ?? entry.risk),
      date,
      dateMs,
      artifactId
    }
  };
}

function toNonNegativeInteger(value, fallback = 0) {
  if (!Number.isInteger(value) || value < 0) {
    return fallback;
  }

  return value;
}

function resolveSourceReasonCode(reasonCode, diagnostics) {
  const candidate = normalizeText(diagnostics?.sourceReasonCode);

  if (REASON_CODE_SET.has(candidate)) {
    return candidate;
  }

  return reasonCode;
}

function resolveSearchResultSource(payload, runtimeOptions) {
  if (payload.searchResult !== undefined) {
    return normalizeSearchResult(payload.searchResult);
  }

  if (payload.searchInput !== undefined) {
    return normalizeSearchResult(
      searchArtifactsFullText(payload.searchInput, runtimeOptions.searchOptions ?? {})
    );
  }

  return {
    valid: false,
    reason: 'Aucune source exploitable: fournir searchResult ou searchInput.'
  };
}

function normalizeSearchResult(searchResult) {
  if (!isObject(searchResult)) {
    return {
      valid: false,
      reason: 'searchResult invalide: objet attendu.'
    };
  }

  if (typeof searchResult.allowed !== 'boolean') {
    return {
      valid: false,
      reason: 'searchResult.allowed invalide: booléen attendu.'
    };
  }

  const reasonCode = normalizeText(searchResult.reasonCode);

  if (!REASON_CODE_SET.has(reasonCode)) {
    return {
      valid: false,
      reason: `searchResult.reasonCode invalide: ${reasonCode || 'vide'}.`
    };
  }

  const reason = normalizeText(searchResult.reason) || `Résultat recherche sans raison explicite (${reasonCode}).`;
  const diagnostics = isObject(searchResult.diagnostics) ? searchResult.diagnostics : {};
  const sourceReasonCode = resolveSourceReasonCode(reasonCode, diagnostics);

  if (!searchResult.allowed) {
    if (!PROPAGABLE_REASON_CODES.has(reasonCode)) {
      return {
        valid: false,
        reason: `searchResult.reasonCode non propagable: ${reasonCode}.`
      };
    }

    const requestedCount = Math.max(
      toNonNegativeInteger(diagnostics.requestedCount),
      toNonNegativeInteger(diagnostics.matchedCount)
    );

    return {
      valid: true,
      blocked: true,
      reasonCode,
      reason,
      sourceReasonCode,
      requestedCount,
      correctiveActions: normalizeCorrectiveActions(reasonCode, searchResult.correctiveActions)
    };
  }

  const rawResults = searchResult.results ?? searchResult.filteredResults;

  if (!Array.isArray(rawResults)) {
    return {
      valid: false,
      reason: 'searchResult.results invalide: tableau attendu quand allowed=true.'
    };
  }

  const normalizedResults = [];

  for (let index = 0; index < rawResults.length; index += 1) {
    const resolution = normalizeResultEntry(rawResults[index], index, 'searchResult.results');

    if (!resolution.valid) {
      return resolution;
    }

    normalizedResults.push(resolution.result);
  }

  return {
    valid: true,
    blocked: false,
    reasonCode,
    sourceReasonCode,
    results: normalizedResults
  };
}

function passesFilters(result, filters) {
  if (filters.phase.length > 0 && !filters.phase.includes(result.phase)) {
    return false;
  }

  if (filters.agent.length > 0 && !filters.agent.includes(result.agent)) {
    return false;
  }

  if (filters.gate.length > 0 && !filters.gate.includes(result.gate)) {
    return false;
  }

  if (filters.owner.length > 0 && !filters.owner.includes(result.owner)) {
    return false;
  }

  if (filters.riskLevel.length > 0 && !filters.riskLevel.includes(result.riskLevel)) {
    return false;
  }

  if (filters.dateFromMs !== null || filters.dateToMs !== null) {
    if (result.dateMs === null) {
      return false;
    }

    if (filters.dateFromMs !== null && result.dateMs < filters.dateFromMs) {
      return false;
    }

    if (filters.dateToMs !== null && result.dateMs > filters.dateToMs) {
      return false;
    }
  }

  return true;
}

function compareResults(left, right) {
  if (right.score !== left.score) {
    return right.score - left.score;
  }

  return left.artifactPath.localeCompare(right.artifactPath);
}

function normalizeGroupToken(value) {
  return normalizeLower(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function deriveBaseGroupName(artifactPath) {
  const parsed = path.parse(artifactPath.toLowerCase());
  let baseName = normalizeGroupToken(parsed.name);

  baseName = baseName
    .replace(/(?:[-_](?:v)?\d+(?:\.\d+){0,3})$/i, '')
    .replace(/(?:[-_](?:20\d{2}[01]\d[0-3]\d(?:t[0-2]\d[0-5]\d[0-5]\d)?z?))$/i, '')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return baseName || 'artifact';
}

function deriveGroupKey(result) {
  const explicitGroupKey = normalizeGroupToken(
    result.groupKey ?? result.logicalArtifactId ?? result.artifactLogicalId
  );

  if (explicitGroupKey.length > 0) {
    return explicitGroupKey;
  }

  const artifactType = normalizeGroupToken(result.artifactType || 'artifact') || 'artifact';
  const baseName = deriveBaseGroupName(result.artifactPath);

  return `${artifactType}:${baseName}`;
}

function buildDiffCandidates(results) {
  const groups = new Map();

  for (const result of results) {
    const groupKey = deriveGroupKey(result);
    const artifactId = normalizeText(result.artifactId);

    if (!groups.has(groupKey)) {
      groups.set(groupKey, {
        groupKey,
        artifactIds: new Set(),
        artifactPaths: new Set()
      });
    }

    const group = groups.get(groupKey);
    group.artifactIds.add(artifactId);
    group.artifactPaths.add(result.artifactPath);
  }

  return [...groups.values()]
    .filter((group) => group.artifactIds.size >= 2)
    .map((group) => ({
      groupKey: group.groupKey,
      artifactIds: [...group.artifactIds].sort((left, right) => left.localeCompare(right)),
      artifactPaths: [...group.artifactPaths].sort((left, right) => left.localeCompare(right)),
      recommendedAction: 'RUN_ARTIFACT_DIFF'
    }))
    .sort((left, right) => left.groupKey.localeCompare(right.groupKey));
}

function deriveReason(filteredCount, requestedCount) {
  if (filteredCount === 0) {
    return `Filtrage contextuel exécuté: aucun résultat sur ${requestedCount} résultat(s) source.`;
  }

  return `Filtrage contextuel exécuté: ${filteredCount} résultat(s) retenu(s) sur ${requestedCount} résultat(s) source.`;
}

export function applyArtifactContextFilters(input, options = {}) {
  const payload = isObject(input) ? input : {};
  const runtimeOptions = isObject(options) ? options : {};
  const nowMs = typeof runtimeOptions.nowMs === 'function' ? runtimeOptions.nowMs : () => Date.now();
  const startedAtMs = nowMs();

  const paginationResolution = resolvePagination(payload);
  const fallbackAppliedFilters = buildAppliedFilters(
    cloneValue(DEFAULT_FILTERS),
    paginationResolution.valid ? paginationResolution.pagination : cloneValue(DEFAULT_PAGINATION)
  );

  if (!paginationResolution.valid) {
    return createInvalidResult({
      reason: paginationResolution.reason,
      appliedFilters: fallbackAppliedFilters,
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  const filtersResolution = resolveFilters(payload);

  if (!filtersResolution.valid) {
    return createInvalidResult({
      reason: filtersResolution.reason,
      appliedFilters: fallbackAppliedFilters,
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  const filters = filtersResolution.filters;
  const pagination = paginationResolution.pagination;
  const appliedFilters = buildAppliedFilters(filters, pagination);

  const sourceResolution = resolveSearchResultSource(payload, runtimeOptions);

  if (!sourceResolution.valid) {
    return createInvalidResult({
      reason: sourceResolution.reason,
      appliedFilters,
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  if (sourceResolution.blocked) {
    return createBlockedResult({
      reasonCode: sourceResolution.reasonCode,
      reason: sourceResolution.reason,
      requestedCount: sourceResolution.requestedCount,
      appliedFilters,
      sourceReasonCode: sourceResolution.sourceReasonCode,
      correctiveActions: sourceResolution.correctiveActions,
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  const filterDurations = [];
  const filtered = [];
  let filteredOutCount = 0;

  for (const result of sourceResolution.results) {
    const filterStartedAt = nowMs();

    if (!passesFilters(result, filters)) {
      filteredOutCount += 1;
      filterDurations.push(toDurationMs(filterStartedAt, nowMs()));
      continue;
    }

    filtered.push(cloneValue(result));
    filterDurations.push(toDurationMs(filterStartedAt, nowMs()));
  }

  filtered.sort(compareResults);

  const paginatedFilteredResults = filtered.slice(
    pagination.offset,
    pagination.offset + pagination.limit
  );

  const diffCandidates = buildDiffCandidates(filtered);
  const correctiveActions = diffCandidates.length > 0 ? ['RUN_ARTIFACT_DIFF'] : [];

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: deriveReason(filtered.length, sourceResolution.results.length),
    diagnostics: {
      requestedCount: sourceResolution.results.length,
      filteredCount: filtered.length,
      filteredOutCount,
      diffCandidateGroupsCount: diffCandidates.length,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      p95FilterMs: computePercentile(filterDurations, 95),
      sourceReasonCode: sourceResolution.sourceReasonCode
    },
    filteredResults: paginatedFilteredResults,
    appliedFilters,
    diffCandidates,
    correctiveActions
  });
}
