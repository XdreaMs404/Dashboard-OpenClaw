import { buildArtifactStalenessIndicator } from './artifact-staleness-indicator.js';

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
  'INVALID_ARTIFACT_CONTEXT_FILTER_INPUT',
  'ARTIFACT_DIFF_NOT_ELIGIBLE',
  'INVALID_ARTIFACT_DIFF_INPUT',
  'EVIDENCE_LINK_INCOMPLETE',
  'DECISION_NOT_FOUND',
  'INVALID_EVIDENCE_GRAPH_INPUT',
  'ARTIFACT_STALENESS_DETECTED',
  'PROJECTION_REBUILD_TIMEOUT',
  'EVENT_LEDGER_GAP_DETECTED',
  'INVALID_STALENESS_INPUT',
  'PARSE_RETRY_LIMIT_REACHED',
  'PARSE_DLQ_REQUIRED',
  'INVALID_PARSE_DIAGNOSTIC_INPUT'
]);

const REASON_CODE_SET = new Set(REASON_CODES);

const UPSTREAM_BLOCKING_REASON_CODES = new Set([
  'ARTIFACT_PATH_NOT_ALLOWED',
  'UNSUPPORTED_ARTIFACT_TYPE',
  'ARTIFACT_READ_FAILED',
  'ARTIFACT_PARSE_FAILED',
  'ARTIFACT_METADATA_MISSING',
  'ARTIFACT_METADATA_INVALID',
  'ARTIFACT_SECTIONS_MISSING',
  'ARTIFACT_TABLES_MISSING',
  'INVALID_ARTIFACT_SEARCH_INPUT',
  'INVALID_ARTIFACT_CONTEXT_FILTER_INPUT',
  'ARTIFACT_DIFF_NOT_ELIGIBLE',
  'INVALID_ARTIFACT_DIFF_INPUT',
  'EVIDENCE_LINK_INCOMPLETE',
  'DECISION_NOT_FOUND',
  'INVALID_EVIDENCE_GRAPH_INPUT',
  'ARTIFACT_STALENESS_DETECTED',
  'PROJECTION_REBUILD_TIMEOUT',
  'EVENT_LEDGER_GAP_DETECTED',
  'INVALID_STALENESS_INPUT'
]);

const ERROR_TYPES = Object.freeze(['syntax', 'frontmatter', 'schema', 'encoding', 'unknown']);
const PARSE_STAGES = Object.freeze(['read', 'decode', 'frontmatter', 'schema', 'markdown', 'index']);

const RECOMMENDATION_BY_ERROR_TYPE = Object.freeze({
  syntax: 'Corriger la syntaxe Markdown (balises, indentation, tables) puis relancer le parsing.',
  frontmatter: 'Corriger le frontmatter YAML (format, clés obligatoires, types) puis relancer.',
  schema: 'Aligner la structure de métadonnées/sections/tables sur le schéma attendu.',
  encoding: 'Convertir le fichier en UTF-8 sans BOM et valider les caractères spéciaux.',
  unknown: 'Analyser les logs parse détaillés et reproduire localement avec dataset minimal.'
});

const ACTION_BY_REASON = Object.freeze({
  ARTIFACT_PATH_NOT_ALLOWED: 'RESTRICT_TO_ALLOWED_ROOTS',
  UNSUPPORTED_ARTIFACT_TYPE: 'REMOVE_UNSUPPORTED_ARTIFACTS',
  ARTIFACT_READ_FAILED: 'RETRY_ARTIFACT_READ',
  ARTIFACT_PARSE_FAILED: 'FIX_ARTIFACT_SYNTAX',
  ARTIFACT_METADATA_MISSING: 'ADD_REQUIRED_METADATA',
  ARTIFACT_METADATA_INVALID: 'FIX_INVALID_METADATA',
  ARTIFACT_SECTIONS_MISSING: 'ADD_STRUCTURED_HEADINGS',
  ARTIFACT_TABLES_MISSING: 'ADD_MARKDOWN_TABLES',
  INVALID_ARTIFACT_SEARCH_INPUT: 'FIX_SEARCH_INPUT',
  INVALID_ARTIFACT_CONTEXT_FILTER_INPUT: 'FIX_CONTEXT_FILTER_INPUT',
  ARTIFACT_DIFF_NOT_ELIGIBLE: 'REVIEW_DIFF_CANDIDATES',
  INVALID_ARTIFACT_DIFF_INPUT: 'FIX_DIFF_INPUT',
  EVIDENCE_LINK_INCOMPLETE: 'LINK_OR_RESTORE_EVIDENCE',
  DECISION_NOT_FOUND: 'VERIFY_DECISION_ID',
  INVALID_EVIDENCE_GRAPH_INPUT: 'FIX_EVIDENCE_GRAPH_INPUT',
  ARTIFACT_STALENESS_DETECTED: 'REFRESH_STALE_ARTIFACTS',
  PROJECTION_REBUILD_TIMEOUT: 'REBUILD_STALENESS_PROJECTION',
  EVENT_LEDGER_GAP_DETECTED: 'REPAIR_EVENT_LEDGER_GAP',
  INVALID_STALENESS_INPUT: 'FIX_STALENESS_INPUT',
  PARSE_RETRY_LIMIT_REACHED: 'SCHEDULE_PARSE_RETRY',
  PARSE_DLQ_REQUIRED: 'MOVE_TO_PARSE_DLQ',
  INVALID_PARSE_DIAGNOSTIC_INPUT: 'FIX_PARSE_DIAGNOSTIC_INPUT'
});

const DEFAULT_MAX_RETRIES = 3;

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneValue(entry));
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

function normalizeArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const deduped = [];
  const seen = new Set();

  for (const entry of value) {
    const normalized = normalizeText(String(entry ?? ''));

    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    deduped.push(normalized);
  }

  return deduped.sort((left, right) => left.localeCompare(right));
}

function toDurationMs(startedAtMs, endedAtMs) {
  const start = Number(startedAtMs);
  const end = Number(endedAtMs);
  const safeStart = Number.isFinite(start) ? start : 0;
  const duration = Number.isFinite(end) ? end - safeStart : 0;

  if (!Number.isFinite(duration) || duration < 0) {
    return 0;
  }

  return Math.trunc(duration);
}

function computePercentile(samples, percentile) {
  if (!Array.isArray(samples) || samples.length === 0) {
    return 0;
  }

  const sorted = [...samples].map((value) => Number(value)).sort((left, right) => left - right);
  const ratio = Math.min(100, Math.max(0, Number(percentile))) / 100;
  const index = Math.ceil(sorted.length * ratio) - 1;

  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function normalizeCorrectiveActions(reasonCode, correctiveActions) {
  const normalized = normalizeArray(correctiveActions);

  if (normalized.length > 0) {
    return normalized;
  }

  return [ACTION_BY_REASON[reasonCode]].filter((value) => typeof value === 'string');
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  parseIssues = [],
  recommendations = [],
  dlqCandidates = [],
  correctiveActions = []
}) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: {
      artifactsChecked: diagnostics.artifactsChecked,
      parseErrorCount: diagnostics.parseErrorCount,
      retryScheduledCount: diagnostics.retryScheduledCount,
      dlqCount: diagnostics.dlqCount,
      durationMs: diagnostics.durationMs,
      p95ParseDiagMs: diagnostics.p95ParseDiagMs,
      sourceReasonCode: diagnostics.sourceReasonCode
    },
    parseIssues: parseIssues.map((entry) => cloneValue(entry)),
    recommendations: recommendations.map((entry) => cloneValue(entry)),
    dlqCandidates: dlqCandidates.map((entry) => cloneValue(entry)),
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidInputResult(reason, context = {}) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_PARSE_DIAGNOSTIC_INPUT',
    reason,
    diagnostics: {
      artifactsChecked: 0,
      parseErrorCount: 0,
      retryScheduledCount: 0,
      dlqCount: 0,
      durationMs: toDurationMs(0, context.durationMs),
      p95ParseDiagMs: 0,
      sourceReasonCode: context.sourceReasonCode ?? 'INVALID_PARSE_DIAGNOSTIC_INPUT'
    },
    parseIssues: context.parseIssues ?? [],
    recommendations: context.recommendations ?? [],
    dlqCandidates: context.dlqCandidates ?? [],
    correctiveActions: context.correctiveActions ?? ['FIX_PARSE_DIAGNOSTIC_INPUT']
  });
}

function createBlockedResult({ reasonCode, reason, sourceReasonCode, durationMs, correctiveActions }) {
  return createResult({
    allowed: false,
    reasonCode,
    reason,
    diagnostics: {
      artifactsChecked: 0,
      parseErrorCount: 0,
      retryScheduledCount: 0,
      dlqCount: 0,
      durationMs,
      p95ParseDiagMs: 0,
      sourceReasonCode
    },
    parseIssues: [],
    recommendations: [],
    dlqCandidates: [],
    correctiveActions: normalizeCorrectiveActions(reasonCode, correctiveActions)
  });
}

function createRetryLimitReachedResult({
  reason,
  diagnostics,
  parseIssues,
  recommendations,
  dlqCandidates,
  sourceReasonCode,
  durationMs,
  p95ParseDiagMs
}) {
  return createResult({
    allowed: true,
    reasonCode: 'PARSE_RETRY_LIMIT_REACHED',
    reason,
    diagnostics: {
      artifactsChecked: diagnostics.artifactsChecked,
      parseErrorCount: diagnostics.parseErrorCount,
      retryScheduledCount: diagnostics.retryScheduledCount,
      dlqCount: diagnostics.dlqCount,
      durationMs,
      p95ParseDiagMs,
      sourceReasonCode
    },
    parseIssues,
    recommendations,
    dlqCandidates,
    correctiveActions: ['SCHEDULE_PARSE_RETRY']
  });
}

function createDlqRequiredResult({
  reason,
  diagnostics,
  parseIssues,
  recommendations,
  dlqCandidates,
  sourceReasonCode,
  durationMs,
  p95ParseDiagMs
}) {
  return createResult({
    allowed: false,
    reasonCode: 'PARSE_DLQ_REQUIRED',
    reason,
    diagnostics: {
      artifactsChecked: diagnostics.artifactsChecked,
      parseErrorCount: diagnostics.parseErrorCount,
      retryScheduledCount: diagnostics.retryScheduledCount,
      dlqCount: diagnostics.dlqCount,
      durationMs,
      p95ParseDiagMs,
      sourceReasonCode
    },
    parseIssues,
    recommendations,
    dlqCandidates,
    correctiveActions: ['MOVE_TO_PARSE_DLQ']
  });
}

function resolveNowProvider(runtimeOptions) {
  return typeof runtimeOptions.nowMs === 'function' ? runtimeOptions.nowMs : () => Date.now();
}

function resolveMaxRetries(payload, runtimeOptions) {
  const candidate = payload.maxRetries ?? runtimeOptions.defaultMaxRetries ?? DEFAULT_MAX_RETRIES;

  if (!Number.isInteger(candidate) || candidate < 1 || candidate > 3) {
    return {
      valid: false,
      reason: 'maxRetries invalide: entier entre 1 et 3 requis (politique NFR-016).'
    };
  }

  return {
    valid: true,
    maxRetries: candidate
  };
}

function normalizeStalenessResult(result) {
  if (!isObject(result)) {
    return {
      valid: false,
      reason: 'stalenessResult invalide: objet attendu.'
    };
  }

  if (typeof result.allowed !== 'boolean') {
    return {
      valid: false,
      reason: 'stalenessResult.allowed invalide: booléen attendu.'
    };
  }

  const reasonCode = normalizeText(result.reasonCode);

  if (!REASON_CODE_SET.has(reasonCode)) {
    return {
      valid: false,
      reason: `stalenessResult.reasonCode invalide: ${reasonCode || 'vide'}.`
    };
  }

  const sourceReasonCode = REASON_CODE_SET.has(normalizeText(result.diagnostics?.sourceReasonCode))
    ? normalizeText(result.diagnostics.sourceReasonCode)
    : reasonCode;

  if (!result.allowed) {
    if (!UPSTREAM_BLOCKING_REASON_CODES.has(reasonCode)) {
      return {
        valid: false,
        reason: `stalenessResult.reasonCode non propagable: ${reasonCode}.`
      };
    }

    return {
      valid: true,
      blocked: true,
      reasonCode,
      sourceReasonCode,
      reason: normalizeText(result.reason) || `Source staleness bloquée (${reasonCode}).`,
      correctiveActions: normalizeCorrectiveActions(reasonCode, result.correctiveActions)
    };
  }

  if (!isObject(result.stalenessBoard) || !Array.isArray(result.stalenessBoard.artifacts)) {
    return {
      valid: false,
      reason: 'stalenessResult.stalenessBoard.artifacts invalide: tableau attendu quand allowed=true.'
    };
  }

  return {
    valid: true,
    blocked: false,
    sourceReasonCode,
    stalenessArtifacts: result.stalenessBoard.artifacts.map((entry) => cloneValue(entry))
  };
}

function resolveSource(payload, runtimeOptions) {
  if (payload.stalenessResult !== undefined) {
    return normalizeStalenessResult(payload.stalenessResult);
  }

  if (payload.stalenessInput !== undefined) {
    if (!isObject(payload.stalenessInput)) {
      return {
        valid: false,
        reason: 'stalenessInput invalide: objet attendu.'
      };
    }

    const delegatedOptions = isObject(runtimeOptions.stalenessOptions) ? runtimeOptions.stalenessOptions : {};

    let delegatedResult;

    try {
      delegatedResult = buildArtifactStalenessIndicator(payload.stalenessInput, delegatedOptions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        reason: `buildArtifactStalenessIndicator a levé une exception: ${message}`
      };
    }

    return normalizeStalenessResult(delegatedResult);
  }

  return {
    valid: false,
    reason: 'Aucune source exploitable: fournir stalenessResult ou stalenessInput.'
  };
}

function normalizeParseEvents(payload) {
  if (payload.parseEvents === undefined) {
    return {
      valid: true,
      parseEvents: []
    };
  }

  if (!Array.isArray(payload.parseEvents)) {
    return {
      valid: false,
      reason: 'parseEvents invalide: tableau attendu.'
    };
  }

  return {
    valid: true,
    parseEvents: payload.parseEvents
  };
}

function resolveParseStage(value) {
  const normalized = normalizeText(value).toLowerCase();

  if (PARSE_STAGES.includes(normalized)) {
    return normalized;
  }

  return 'markdown';
}

function resolveErrorType(value) {
  const normalized = normalizeText(value).toLowerCase();

  if (ERROR_TYPES.includes(normalized)) {
    return normalized;
  }

  return 'unknown';
}

function resolveErrorLocation(rawEvent) {
  const line = Number(rawEvent.line ?? rawEvent.errorLine ?? rawEvent.location?.line);
  const column = Number(rawEvent.column ?? rawEvent.errorColumn ?? rawEvent.location?.column);

  return {
    line: Number.isInteger(line) && line >= 1 ? line : null,
    column: Number.isInteger(column) && column >= 1 ? column : null
  };
}

function buildIssueKey(artifactId, parseStage, errorType, line, column) {
  return `${artifactId}::${parseStage}::${errorType}::${line ?? 'na'}::${column ?? 'na'}`;
}

function normalizeRetryCount(rawEvent) {
  const retryCount = Number(rawEvent.retryCount ?? rawEvent.retries ?? rawEvent.retry?.count ?? 0);

  if (!Number.isInteger(retryCount) || retryCount < 0) {
    return null;
  }

  return retryCount;
}

function buildStalenessContextByArtifactId(stalenessArtifacts) {
  const byId = new Map();

  for (const rawArtifact of stalenessArtifacts) {
    if (!isObject(rawArtifact)) {
      continue;
    }

    const artifactId = normalizeText(rawArtifact.artifactId);

    if (artifactId.length === 0) {
      continue;
    }

    byId.set(artifactId, {
      isStale: Boolean(rawArtifact.isStale),
      ageSeconds: Number.isFinite(Number(rawArtifact.ageSeconds)) ? Math.trunc(Number(rawArtifact.ageSeconds)) : null,
      stalenessLevel: normalizeText(rawArtifact.stalenessLevel) || 'unknown'
    });
  }

  return byId;
}

function buildIssueSortKey(issue) {
  const line = issue.errorLocation.line ?? Number.MAX_SAFE_INTEGER;
  const column = issue.errorLocation.column ?? Number.MAX_SAFE_INTEGER;

  return [
    issue.artifactId,
    issue.parseStage,
    issue.errorType,
    String(line).padStart(16, '0'),
    String(column).padStart(16, '0'),
    issue.issueId
  ].join('::');
}

function compareIssues(left, right) {
  return buildIssueSortKey(left).localeCompare(buildIssueSortKey(right));
}

export function buildArtifactParseDiagnostics(input, options = {}) {
  const payload = isObject(input) ? input : {};
  const runtimeOptions = isObject(options) ? options : {};
  const nowMs = resolveNowProvider(runtimeOptions);
  const startedAtMs = nowMs();

  const maxRetriesResolution = resolveMaxRetries(payload, runtimeOptions);

  if (!maxRetriesResolution.valid) {
    return createInvalidInputResult(maxRetriesResolution.reason, {
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  const parseEventsResolution = normalizeParseEvents(payload);

  if (!parseEventsResolution.valid) {
    return createInvalidInputResult(parseEventsResolution.reason, {
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  const sourceResolution = resolveSource(payload, runtimeOptions);

  if (!sourceResolution.valid) {
    return createInvalidInputResult(sourceResolution.reason, {
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  if (sourceResolution.blocked) {
    return createBlockedResult({
      reasonCode: sourceResolution.reasonCode,
      reason: sourceResolution.reason,
      sourceReasonCode: sourceResolution.sourceReasonCode,
      correctiveActions: sourceResolution.correctiveActions,
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  const stalenessContextByArtifactId = buildStalenessContextByArtifactId(sourceResolution.stalenessArtifacts);
  const perIssueDurations = [];
  const parseIssuesByKey = new Map();

  for (let index = 0; index < parseEventsResolution.parseEvents.length; index += 1) {
    const issueStartedAtMs = nowMs();
    const rawEvent = parseEventsResolution.parseEvents[index];

    if (!isObject(rawEvent)) {
      return createInvalidInputResult(`parseEvents[${index}] invalide: objet attendu.`, {
        durationMs: toDurationMs(startedAtMs, nowMs()),
        sourceReasonCode: sourceResolution.sourceReasonCode
      });
    }

    const artifactId = normalizeText(rawEvent.artifactId);

    if (artifactId.length === 0) {
      return createInvalidInputResult(`parseEvents[${index}].artifactId invalide: chaîne non vide requise.`, {
        durationMs: toDurationMs(startedAtMs, nowMs()),
        sourceReasonCode: sourceResolution.sourceReasonCode
      });
    }

    const retryCount = normalizeRetryCount(rawEvent);

    if (retryCount === null) {
      return createInvalidInputResult(`parseEvents[${index}].retryCount invalide: entier >=0 requis.`, {
        durationMs: toDurationMs(startedAtMs, nowMs()),
        sourceReasonCode: sourceResolution.sourceReasonCode
      });
    }

    const parseStage = resolveParseStage(rawEvent.parseStage);
    const errorType = resolveErrorType(rawEvent.errorType);
    const errorMessage = normalizeText(rawEvent.errorMessage || rawEvent.message);
    const errorLocation = resolveErrorLocation(rawEvent);
    const recommendedFix =
      normalizeText(rawEvent.recommendedFix) || RECOMMENDATION_BY_ERROR_TYPE[errorType] || RECOMMENDATION_BY_ERROR_TYPE.unknown;

    const stalenessContext = stalenessContextByArtifactId.get(artifactId) ?? {
      isStale: null,
      ageSeconds: null,
      stalenessLevel: 'unknown'
    };

    const issueKey = buildIssueKey(artifactId, parseStage, errorType, errorLocation.line, errorLocation.column);

    if (parseIssuesByKey.has(issueKey)) {
      const existing = parseIssuesByKey.get(issueKey);
      existing.retryCount = Math.max(existing.retryCount, retryCount);

      if (errorMessage.length > 0 && existing.errorMessage.length === 0) {
        existing.errorMessage = errorMessage;
      }

      perIssueDurations.push(toDurationMs(issueStartedAtMs, nowMs()));
      continue;
    }

    parseIssuesByKey.set(issueKey, {
      issueId: `parse-issue-${parseIssuesByKey.size + 1}`,
      artifactId,
      artifactPath: normalizeText(rawEvent.artifactPath),
      parseStage,
      errorType,
      errorMessage,
      errorLocation,
      retryCount,
      maxRetries: maxRetriesResolution.maxRetries,
      recommendedFix,
      stalenessContext
    });

    perIssueDurations.push(toDurationMs(issueStartedAtMs, nowMs()));
  }

  const parseIssues = [...parseIssuesByKey.values()].sort(compareIssues);
  const artifactsChecked = sourceResolution.stalenessArtifacts.length;
  const parseErrorCount = parseIssues.length;

  const retryScheduledIssues = parseIssues.filter((issue) => issue.retryCount < maxRetriesResolution.maxRetries);
  const retryLimitReachedIssues = parseIssues.filter((issue) => issue.retryCount === maxRetriesResolution.maxRetries);
  const dlqIssues = parseIssues.filter((issue) => issue.retryCount > maxRetriesResolution.maxRetries);

  const recommendations = parseIssues.map((issue) => ({
    artifactId: issue.artifactId,
    parseStage: issue.parseStage,
    errorType: issue.errorType,
    recommendedFix: issue.recommendedFix,
    action: issue.retryCount > maxRetriesResolution.maxRetries ? 'MOVE_TO_PARSE_DLQ' : 'SCHEDULE_PARSE_RETRY'
  }));

  const dlqCandidates = dlqIssues.map((issue) => ({
    artifactId: issue.artifactId,
    artifactPath: issue.artifactPath,
    retryCount: issue.retryCount,
    maxRetries: issue.maxRetries,
    reason: 'Retry limit dépassé, escalade DLQ requise.'
  }));

  const baseDiagnostics = {
    artifactsChecked,
    parseErrorCount,
    retryScheduledCount: retryScheduledIssues.length,
    dlqCount: dlqCandidates.length,
    durationMs: toDurationMs(startedAtMs, nowMs()),
    p95ParseDiagMs: computePercentile(perIssueDurations, 95),
    sourceReasonCode: sourceResolution.sourceReasonCode
  };

  if (dlqCandidates.length > 0) {
    return createDlqRequiredResult({
      reason: `DLQ requis: ${dlqCandidates.length} artefact(s) ont dépassé maxRetries=${maxRetriesResolution.maxRetries}.`,
      diagnostics: baseDiagnostics,
      parseIssues,
      recommendations,
      dlqCandidates,
      sourceReasonCode: sourceResolution.sourceReasonCode,
      durationMs: baseDiagnostics.durationMs,
      p95ParseDiagMs: baseDiagnostics.p95ParseDiagMs
    });
  }

  if (retryLimitReachedIssues.length > 0) {
    return createRetryLimitReachedResult({
      reason: `Limite de retry atteinte pour ${retryLimitReachedIssues.length} artefact(s) (maxRetries=${maxRetriesResolution.maxRetries}).`,
      diagnostics: baseDiagnostics,
      parseIssues,
      recommendations,
      dlqCandidates,
      sourceReasonCode: sourceResolution.sourceReasonCode,
      durationMs: baseDiagnostics.durationMs,
      p95ParseDiagMs: baseDiagnostics.p95ParseDiagMs
    });
  }

  if (parseIssues.length > 0) {
    return createResult({
      allowed: true,
      reasonCode: 'ARTIFACT_PARSE_FAILED',
      reason: `Parse errors détectés: ${parseIssues.length} issue(s) sur ${artifactsChecked} artefact(s).`,
      diagnostics: baseDiagnostics,
      parseIssues,
      recommendations,
      dlqCandidates,
      correctiveActions: ['SCHEDULE_PARSE_RETRY']
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: `Diagnostic parse OK: ${artifactsChecked} artefact(s) vérifié(s), aucune parse issue.`,
    diagnostics: baseDiagnostics,
    parseIssues,
    recommendations,
    dlqCandidates,
    correctiveActions: []
  });
}
