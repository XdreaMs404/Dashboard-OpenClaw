import { buildArtifactParseDiagnostics } from './artifact-parse-diagnostics.js';

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
  'INVALID_PARSE_DIAGNOSTIC_INPUT',
  'RISK_TAGS_MISSING',
  'RISK_ANNOTATION_CONFLICT',
  'INVALID_RISK_ANNOTATION_INPUT'
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
  'INVALID_STALENESS_INPUT',
  'PARSE_RETRY_LIMIT_REACHED',
  'PARSE_DLQ_REQUIRED',
  'INVALID_PARSE_DIAGNOSTIC_INPUT'
]);

const RISK_TAG_LABELS = Object.freeze({
  T01: 'Dérive format markdown/frontmatter',
  T02: 'Absence metadata obligatoire',
  P02: 'Handoff incomplet/ambigu',
  NFR016: 'Retries bornés + DLQ',
  NFR038: 'Risque rupture corpus référence'
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
  INVALID_PARSE_DIAGNOSTIC_INPUT: 'FIX_PARSE_DIAGNOSTIC_INPUT',
  RISK_TAGS_MISSING: 'ADD_RISK_TAGS',
  RISK_ANNOTATION_CONFLICT: 'RESOLVE_RISK_ANNOTATION_CONFLICT',
  INVALID_RISK_ANNOTATION_INPUT: 'FIX_RISK_ANNOTATION_INPUT'
});

const DEFAULT_OWNER_HINT = 'artifact-maintainer';

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

function compareObjectsByKeys(left, right, keys) {
  for (const key of keys) {
    const leftValue = normalizeText(left[key]);
    const rightValue = normalizeText(right[key]);

    if (leftValue === rightValue) {
      continue;
    }

    return leftValue.localeCompare(rightValue);
  }

  return 0;
}

function normalizeCorrectiveActions(reasonCode, correctiveActions) {
  const normalized = normalizeArray(correctiveActions);

  if (normalized.length > 0) {
    return normalized;
  }

  return [ACTION_BY_REASON[reasonCode]].filter((value) => typeof value === 'string');
}

function resolveNowProvider(runtimeOptions) {
  return typeof runtimeOptions.nowMs === 'function' ? runtimeOptions.nowMs : () => Date.now();
}

function toSeverityRank(level) {
  switch (level) {
    case 'critical':
      return 4;
    case 'high':
      return 3;
    case 'medium':
      return 2;
    default:
      return 1;
  }
}

function computeIssueSeverity(issue) {
  if (!isObject(issue)) {
    return 'low';
  }

  const retryCount = Number.isInteger(issue.retryCount) ? issue.retryCount : 0;
  const stalenessLevel = normalizeText(issue.stalenessContext?.stalenessLevel);
  const errorType = normalizeText(issue.errorType);

  if (retryCount > 3) {
    return 'critical';
  }

  if (retryCount === 3 || stalenessLevel === 'critical') {
    return 'high';
  }

  if (errorType === 'schema' || errorType === 'frontmatter' || stalenessLevel === 'warning') {
    return 'medium';
  }

  return 'low';
}

function deriveOwnerHint(issue) {
  const parseStage = normalizeText(issue.parseStage);
  const errorType = normalizeText(issue.errorType);

  if (parseStage === 'frontmatter' || errorType === 'frontmatter') {
    return 'metadata-owner';
  }

  if (parseStage === 'schema' || errorType === 'schema') {
    return 'schema-owner';
  }

  if (parseStage === 'decode' || errorType === 'encoding') {
    return 'encoding-owner';
  }

  return DEFAULT_OWNER_HINT;
}

function deriveIssueRiskTags(issue) {
  const tags = new Set(['T01']);
  const severity = computeIssueSeverity(issue);

  if (severity === 'critical' || severity === 'high') {
    tags.add('P02');
  }

  if (normalizeText(issue.errorType) === 'schema' || normalizeText(issue.parseStage) === 'frontmatter') {
    tags.add('T02');
  }

  const retryCount = Number.isInteger(issue.retryCount) ? issue.retryCount : 0;
  if (retryCount >= 3) {
    tags.add('NFR016');
  }

  const stalenessLevel = normalizeText(issue.stalenessContext?.stalenessLevel);
  if (stalenessLevel === 'critical') {
    tags.add('NFR038');
  }

  return [...tags].sort((left, right) => left.localeCompare(right));
}

function validateArtifactPath(pathValue) {
  const path = normalizeText(pathValue);

  if (path.length === 0) {
    return {
      valid: false,
      reason: 'artifactPath vide'
    };
  }

  if (!path.startsWith('/')) {
    return {
      valid: false,
      reason: 'artifactPath absolu requis'
    };
  }

  return {
    valid: true,
    value: path
  };
}

function normalizeTaggedArtifact(rawArtifact, index) {
  if (!isObject(rawArtifact)) {
    return {
      valid: false,
      reason: `taggedArtifacts[${index}] invalide: objet attendu.`
    };
  }

  const artifactId = normalizeText(rawArtifact.artifactId);

  if (artifactId.length === 0) {
    return {
      valid: false,
      reason: `taggedArtifacts[${index}].artifactId invalide: chaîne non vide requise.`
    };
  }

  const artifactPathResolution = validateArtifactPath(rawArtifact.artifactPath);

  if (!artifactPathResolution.valid) {
    return {
      valid: false,
      reason: `taggedArtifacts[${index}].artifactPath invalide: ${artifactPathResolution.reason}.`
    };
  }

  const tags = normalizeArray(rawArtifact.riskTags);

  const severity = normalizeText(rawArtifact.severity).toLowerCase();
  const ownerHint = normalizeText(rawArtifact.ownerHint);

  return {
    valid: true,
    artifact: {
      artifactId,
      artifactPath: artifactPathResolution.value,
      artifactType: normalizeText(rawArtifact.artifactType) || 'artifact',
      sourceIssueIds: normalizeArray(rawArtifact.sourceIssueIds),
      riskTags: tags,
      severity: ['critical', 'high', 'medium', 'low'].includes(severity) ? severity : 'low',
      ownerHint: ownerHint.length > 0 ? ownerHint : DEFAULT_OWNER_HINT
    }
  };
}

function normalizeContextAnnotation(rawAnnotation, index) {
  if (!isObject(rawAnnotation)) {
    return {
      valid: false,
      reason: `contextAnnotations[${index}] invalide: objet attendu.`
    };
  }

  const annotationId = normalizeText(rawAnnotation.annotationId) || `annotation-${index + 1}`;
  const artifactId = normalizeText(rawAnnotation.artifactId);

  if (artifactId.length === 0) {
    return {
      valid: false,
      reason: `contextAnnotations[${index}].artifactId invalide: chaîne non vide requise.`
    };
  }

  const artifactPathResolution = validateArtifactPath(rawAnnotation.artifactPath);

  if (!artifactPathResolution.valid) {
    return {
      valid: false,
      reason: `contextAnnotations[${index}].artifactPath invalide: ${artifactPathResolution.reason}.`
    };
  }

  const requiredTextFields = ['what', 'why', 'nextAction'];
  const normalizedTextFields = {};

  for (const field of requiredTextFields) {
    const value = normalizeText(rawAnnotation[field]);

    if (value.length === 0) {
      return {
        valid: false,
        reason: `contextAnnotations[${index}].${field} invalide: chaîne non vide requise.`
      };
    }

    normalizedTextFields[field] = value;
  }

  const severity = normalizeText(rawAnnotation.severity).toLowerCase();
  const issueRiskTags = normalizeArray(rawAnnotation.riskTags);

  if (issueRiskTags.length === 0) {
    return {
      valid: false,
      reason: `contextAnnotations[${index}].riskTags invalide: au moins un tag requis.`
    };
  }

  const ownerHint = normalizeText(rawAnnotation.ownerHint);

  return {
    valid: true,
    annotation: {
      annotationId,
      artifactId,
      artifactPath: artifactPathResolution.value,
      issueId: normalizeText(rawAnnotation.issueId),
      parseStage: normalizeText(rawAnnotation.parseStage) || 'markdown',
      errorType: normalizeText(rawAnnotation.errorType) || 'unknown',
      recommendedFix: normalizeText(rawAnnotation.recommendedFix),
      what: normalizedTextFields.what,
      why: normalizedTextFields.why,
      nextAction: normalizedTextFields.nextAction,
      severity: ['critical', 'high', 'medium', 'low'].includes(severity) ? severity : 'low',
      ownerHint: ownerHint.length > 0 ? ownerHint : DEFAULT_OWNER_HINT,
      riskTags: issueRiskTags
    }
  };
}

function normalizeRiskTagCatalog(rawCatalog) {
  if (rawCatalog === undefined) {
    return {
      valid: true,
      catalog: []
    };
  }

  if (!Array.isArray(rawCatalog)) {
    return {
      valid: false,
      reason: 'riskTagCatalog invalide: tableau attendu.'
    };
  }

  const normalized = [];

  for (let index = 0; index < rawCatalog.length; index += 1) {
    const entry = rawCatalog[index];

    if (!isObject(entry)) {
      return {
        valid: false,
        reason: `riskTagCatalog[${index}] invalide: objet attendu.`
      };
    }

    const riskTag = normalizeText(entry.riskTag);

    if (riskTag.length === 0) {
      return {
        valid: false,
        reason: `riskTagCatalog[${index}].riskTag invalide: chaîne non vide requise.`
      };
    }

    const count = Number(entry.count);

    if (!Number.isInteger(count) || count < 1) {
      return {
        valid: false,
        reason: `riskTagCatalog[${index}].count invalide: entier >=1 requis.`
      };
    }

    normalized.push({
      riskTag,
      label: normalizeText(entry.label) || RISK_TAG_LABELS[riskTag] || riskTag,
      count,
      highestSeverity: normalizeText(entry.highestSeverity) || 'low'
    });
  }

  normalized.sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    const severityDiff = toSeverityRank(right.highestSeverity) - toSeverityRank(left.highestSeverity);
    if (severityDiff !== 0) {
      return severityDiff;
    }

    return left.riskTag.localeCompare(right.riskTag);
  });

  return {
    valid: true,
    catalog: normalized
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  taggedArtifacts = [],
  contextAnnotations = [],
  riskTagCatalog = [],
  correctiveActions = []
}) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: {
      artifactsTaggedCount: diagnostics.artifactsTaggedCount,
      annotationsCount: diagnostics.annotationsCount,
      highRiskCount: diagnostics.highRiskCount,
      retryLimitedCount: diagnostics.retryLimitedCount,
      dlqCount: diagnostics.dlqCount,
      durationMs: diagnostics.durationMs,
      p95TaggingMs: diagnostics.p95TaggingMs,
      sourceReasonCode: diagnostics.sourceReasonCode
    },
    taggedArtifacts: taggedArtifacts.map((entry) => cloneValue(entry)),
    contextAnnotations: contextAnnotations.map((entry) => cloneValue(entry)),
    riskTagCatalog: riskTagCatalog.map((entry) => cloneValue(entry)),
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidInputResult(reason, context = {}) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_RISK_ANNOTATION_INPUT',
    reason,
    diagnostics: {
      artifactsTaggedCount: 0,
      annotationsCount: 0,
      highRiskCount: 0,
      retryLimitedCount: 0,
      dlqCount: 0,
      durationMs: toDurationMs(0, context.durationMs),
      p95TaggingMs: 0,
      sourceReasonCode: context.sourceReasonCode ?? 'INVALID_RISK_ANNOTATION_INPUT'
    },
    taggedArtifacts: context.taggedArtifacts ?? [],
    contextAnnotations: context.contextAnnotations ?? [],
    riskTagCatalog: context.riskTagCatalog ?? [],
    correctiveActions: context.correctiveActions ?? ['FIX_RISK_ANNOTATION_INPUT']
  });
}

function createBlockedResult({ reasonCode, reason, sourceReasonCode, durationMs, correctiveActions }) {
  return createResult({
    allowed: false,
    reasonCode,
    reason,
    diagnostics: {
      artifactsTaggedCount: 0,
      annotationsCount: 0,
      highRiskCount: 0,
      retryLimitedCount: 0,
      dlqCount: 0,
      durationMs,
      p95TaggingMs: 0,
      sourceReasonCode
    },
    taggedArtifacts: [],
    contextAnnotations: [],
    riskTagCatalog: [],
    correctiveActions: normalizeCorrectiveActions(reasonCode, correctiveActions)
  });
}

function normalizeParseDiagnosticsResult(result) {
  if (!isObject(result)) {
    return {
      valid: false,
      reason: 'parseDiagnosticsResult invalide: objet attendu.'
    };
  }

  if (typeof result.allowed !== 'boolean') {
    return {
      valid: false,
      reason: 'parseDiagnosticsResult.allowed invalide: booléen attendu.'
    };
  }

  const reasonCode = normalizeText(result.reasonCode);

  if (!REASON_CODE_SET.has(reasonCode)) {
    return {
      valid: false,
      reason: `parseDiagnosticsResult.reasonCode invalide: ${reasonCode || 'vide'}.`
    };
  }

  const sourceReasonCode = REASON_CODE_SET.has(normalizeText(result.diagnostics?.sourceReasonCode))
    ? normalizeText(result.diagnostics.sourceReasonCode)
    : reasonCode;

  if (!result.allowed) {
    if (!UPSTREAM_BLOCKING_REASON_CODES.has(reasonCode)) {
      return {
        valid: false,
        reason: `parseDiagnosticsResult.reasonCode non propagable: ${reasonCode}.`
      };
    }

    return {
      valid: true,
      blocked: true,
      reasonCode,
      sourceReasonCode,
      reason: normalizeText(result.reason) || `Source parse diagnostics bloquée (${reasonCode}).`,
      correctiveActions: normalizeCorrectiveActions(reasonCode, result.correctiveActions)
    };
  }

  if (!Array.isArray(result.parseIssues)) {
    return {
      valid: false,
      reason: 'parseDiagnosticsResult.parseIssues invalide: tableau attendu quand allowed=true.'
    };
  }

  if (!Array.isArray(result.recommendations)) {
    return {
      valid: false,
      reason: 'parseDiagnosticsResult.recommendations invalide: tableau attendu quand allowed=true.'
    };
  }

  if (!Array.isArray(result.dlqCandidates)) {
    return {
      valid: false,
      reason: 'parseDiagnosticsResult.dlqCandidates invalide: tableau attendu quand allowed=true.'
    };
  }

  return {
    valid: true,
    blocked: false,
    sourceReasonCode,
    parseIssues: result.parseIssues.map((entry) => cloneValue(entry)),
    recommendations: result.recommendations.map((entry) => cloneValue(entry)),
    dlqCandidates: result.dlqCandidates.map((entry) => cloneValue(entry)),
    reasonCode,
    reason: normalizeText(result.reason),
    diagnostics: cloneValue(result.diagnostics ?? {}),
    correctiveActions: normalizeArray(result.correctiveActions)
  };
}

function resolveSource(payload, runtimeOptions) {
  if (payload.parseDiagnosticsResult !== undefined) {
    return normalizeParseDiagnosticsResult(payload.parseDiagnosticsResult);
  }

  if (payload.parseDiagnosticsInput !== undefined) {
    if (!isObject(payload.parseDiagnosticsInput)) {
      return {
        valid: false,
        reason: 'parseDiagnosticsInput invalide: objet attendu.'
      };
    }

    const delegatedOptions = isObject(runtimeOptions.parseDiagnosticsOptions)
      ? runtimeOptions.parseDiagnosticsOptions
      : {};

    let delegatedResult;

    try {
      delegatedResult = buildArtifactParseDiagnostics(payload.parseDiagnosticsInput, delegatedOptions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        reason: `buildArtifactParseDiagnostics a levé une exception: ${message}`
      };
    }

    return normalizeParseDiagnosticsResult(delegatedResult);
  }

  return {
    valid: false,
    reason: 'Aucune source exploitable: fournir parseDiagnosticsResult ou parseDiagnosticsInput.'
  };
}

function buildDefaultArtifactsAndAnnotations(parseIssues, perAnnotationDurations, nowMs) {
  const artifactsById = new Map();
  const annotations = [];

  for (let index = 0; index < parseIssues.length; index += 1) {
    const annotationStartedAtMs = nowMs();
    const issue = parseIssues[index];

    if (!isObject(issue)) {
      return {
        valid: false,
        reason: `parseIssues[${index}] invalide: objet attendu.`
      };
    }

    const artifactId = normalizeText(issue.artifactId);

    if (artifactId.length === 0) {
      return {
        valid: false,
        reason: `parseIssues[${index}].artifactId invalide: chaîne non vide requise.`
      };
    }

    const artifactPathResolution = validateArtifactPath(issue.artifactPath);

    if (!artifactPathResolution.valid) {
      return {
        valid: false,
        reason: `parseIssues[${index}].artifactPath invalide: ${artifactPathResolution.reason}.`
      };
    }

    const severity = computeIssueSeverity(issue);
    const ownerHint = deriveOwnerHint(issue);
    const riskTags = deriveIssueRiskTags(issue);
    const issueId = normalizeText(issue.issueId) || `parse-issue-${index + 1}`;
    const parseStage = normalizeText(issue.parseStage) || 'markdown';
    const errorType = normalizeText(issue.errorType) || 'unknown';
    const recommendedFix = normalizeText(issue.recommendedFix);
    const errorMessage = normalizeText(issue.errorMessage);

    const annotationId = `annotation-${issueId}`;

    const what =
      errorMessage.length > 0
        ? `${artifactId}: erreur ${errorType} détectée au stage ${parseStage} (${errorMessage}).`
        : `${artifactId}: erreur ${errorType} détectée au stage ${parseStage}.`;

    const why = `Impact FR-031: le parsing échoue et la preuve n'est pas fiabilisée pour cet artefact.`;

    const nextAction =
      recommendedFix.length > 0
        ? `${recommendedFix} Priorité=${severity.toUpperCase()}.`
        : `Diagnostiquer puis corriger le parsing de ${artifactId}. Priorité=${severity.toUpperCase()}.`;

    annotations.push({
      annotationId,
      artifactId,
      artifactPath: artifactPathResolution.value,
      issueId,
      parseStage,
      errorType,
      recommendedFix,
      what,
      why,
      nextAction,
      severity,
      ownerHint,
      riskTags
    });

    const existingArtifact = artifactsById.get(artifactId);

    if (!existingArtifact) {
      artifactsById.set(artifactId, {
        artifactId,
        artifactPath: artifactPathResolution.value,
        artifactType: normalizeText(issue.artifactType) || 'artifact',
        sourceIssueIds: [issueId],
        riskTags,
        severity,
        ownerHint
      });
    } else {
      existingArtifact.sourceIssueIds = normalizeArray([...existingArtifact.sourceIssueIds, issueId]);
      existingArtifact.riskTags = normalizeArray([...existingArtifact.riskTags, ...riskTags]);

      if (toSeverityRank(severity) > toSeverityRank(existingArtifact.severity)) {
        existingArtifact.severity = severity;
      }
    }

    perAnnotationDurations.push(toDurationMs(annotationStartedAtMs, nowMs()));
  }

  const taggedArtifacts = [...artifactsById.values()].sort((left, right) =>
    compareObjectsByKeys(left, right, ['artifactId', 'artifactPath'])
  );

  annotations.sort((left, right) => compareObjectsByKeys(left, right, ['artifactId', 'annotationId']));

  return {
    valid: true,
    taggedArtifacts,
    contextAnnotations: annotations
  };
}

function normalizeInjectedArtifactsAndAnnotations(payload) {
  if (payload.taggedArtifacts === undefined && payload.contextAnnotations === undefined) {
    return {
      valid: true,
      taggedArtifacts: undefined,
      contextAnnotations: undefined,
      riskTagCatalog: undefined
    };
  }

  if (!Array.isArray(payload.taggedArtifacts)) {
    return {
      valid: false,
      reason: 'taggedArtifacts invalide: tableau attendu.'
    };
  }

  if (!Array.isArray(payload.contextAnnotations)) {
    return {
      valid: false,
      reason: 'contextAnnotations invalide: tableau attendu.'
    };
  }

  const taggedArtifacts = [];
  const contextAnnotations = [];

  for (let index = 0; index < payload.taggedArtifacts.length; index += 1) {
    const normalized = normalizeTaggedArtifact(payload.taggedArtifacts[index], index);

    if (!normalized.valid) {
      return normalized;
    }

    taggedArtifacts.push(normalized.artifact);
  }

  for (let index = 0; index < payload.contextAnnotations.length; index += 1) {
    const normalized = normalizeContextAnnotation(payload.contextAnnotations[index], index);

    if (!normalized.valid) {
      return normalized;
    }

    contextAnnotations.push(normalized.annotation);
  }

  const riskTagCatalogResolution = normalizeRiskTagCatalog(payload.riskTagCatalog);

  if (!riskTagCatalogResolution.valid) {
    return riskTagCatalogResolution;
  }

  taggedArtifacts.sort((left, right) => compareObjectsByKeys(left, right, ['artifactId', 'artifactPath']));
  contextAnnotations.sort((left, right) => compareObjectsByKeys(left, right, ['artifactId', 'annotationId']));

  return {
    valid: true,
    taggedArtifacts,
    contextAnnotations,
    riskTagCatalog: riskTagCatalogResolution.catalog
  };
}

function buildRiskTagCatalog(taggedArtifacts, contextAnnotations, fallbackCatalog) {
  if (Array.isArray(fallbackCatalog) && fallbackCatalog.length > 0) {
    return fallbackCatalog;
  }

  const riskTagStats = new Map();

  const consumeTag = (riskTag, severity) => {
    if (!riskTagStats.has(riskTag)) {
      riskTagStats.set(riskTag, {
        riskTag,
        label: RISK_TAG_LABELS[riskTag] || riskTag,
        count: 0,
        highestSeverity: 'low'
      });
    }

    const stat = riskTagStats.get(riskTag);
    stat.count += 1;

    if (toSeverityRank(severity) > toSeverityRank(stat.highestSeverity)) {
      stat.highestSeverity = severity;
    }
  };

  for (const artifact of taggedArtifacts) {
    for (const riskTag of artifact.riskTags) {
      consumeTag(riskTag, artifact.severity);
    }
  }

  for (const annotation of contextAnnotations) {
    for (const riskTag of annotation.riskTags) {
      consumeTag(riskTag, annotation.severity);
    }
  }

  const catalog = [...riskTagStats.values()];

  catalog.sort((left, right) => {
    if (right.count !== left.count) {
      return right.count - left.count;
    }

    const severityDiff = toSeverityRank(right.highestSeverity) - toSeverityRank(left.highestSeverity);

    if (severityDiff !== 0) {
      return severityDiff;
    }

    return left.riskTag.localeCompare(right.riskTag);
  });

  return catalog;
}

function getArtifactTagsById(taggedArtifacts) {
  const byId = new Map();

  for (const artifact of taggedArtifacts) {
    byId.set(artifact.artifactId, new Set(artifact.riskTags));
  }

  return byId;
}

function ensureConflictFreeAnnotations(taggedArtifacts, contextAnnotations) {
  const artifactTagsById = getArtifactTagsById(taggedArtifacts);

  for (const annotation of contextAnnotations) {
    const artifactTags = artifactTagsById.get(annotation.artifactId);

    if (!artifactTags) {
      return {
        valid: false,
        reason: `Annotation sans artefact correspondant: artifactId=${annotation.artifactId}.`
      };
    }

    for (const riskTag of annotation.riskTags) {
      if (!artifactTags.has(riskTag)) {
        return {
          valid: false,
          reason: `Conflit de contexte: annotation ${annotation.annotationId} porte ${riskTag} absent des tags artefact ${annotation.artifactId}.`
        };
      }
    }
  }

  return {
    valid: true
  };
}

function hasMissingRiskTags(taggedArtifacts) {
  return taggedArtifacts.some((artifact) => !Array.isArray(artifact.riskTags) || artifact.riskTags.length === 0);
}

function countRetryLimitedIssues(parseIssues) {
  return parseIssues.filter((issue) => isObject(issue) && Number(issue.retryCount) >= 3).length;
}

export function annotateArtifactRiskContext(input, options = {}) {
  const payload = isObject(input) ? input : {};
  const runtimeOptions = isObject(options) ? options : {};
  const nowMs = resolveNowProvider(runtimeOptions);
  const startedAtMs = nowMs();

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

  const injectedResolution = normalizeInjectedArtifactsAndAnnotations(payload);

  if (!injectedResolution.valid) {
    return createInvalidInputResult(injectedResolution.reason, {
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
    });
  }

  const perAnnotationDurations = [];

  const defaults = buildDefaultArtifactsAndAnnotations(sourceResolution.parseIssues, perAnnotationDurations, nowMs);

  if (!defaults.valid) {
    return createInvalidInputResult(defaults.reason, {
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
    });
  }

  const taggedArtifacts =
    injectedResolution.taggedArtifacts !== undefined
      ? injectedResolution.taggedArtifacts
      : defaults.taggedArtifacts;

  const contextAnnotations =
    injectedResolution.contextAnnotations !== undefined
      ? injectedResolution.contextAnnotations
      : defaults.contextAnnotations;

  const riskTagCatalog = buildRiskTagCatalog(
    taggedArtifacts,
    contextAnnotations,
    injectedResolution.riskTagCatalog
  );

  if (hasMissingRiskTags(taggedArtifacts)) {
    return createResult({
      allowed: false,
      reasonCode: 'RISK_TAGS_MISSING',
      reason: 'Au moins un artefact annoté ne contient aucun riskTag.',
      diagnostics: {
        artifactsTaggedCount: taggedArtifacts.length,
        annotationsCount: contextAnnotations.length,
        highRiskCount: taggedArtifacts.filter((artifact) => toSeverityRank(artifact.severity) >= 3).length,
        retryLimitedCount: countRetryLimitedIssues(sourceResolution.parseIssues),
        dlqCount: sourceResolution.dlqCandidates.length,
        durationMs: toDurationMs(startedAtMs, nowMs()),
        p95TaggingMs: computePercentile(perAnnotationDurations, 95),
        sourceReasonCode: sourceResolution.sourceReasonCode
      },
      taggedArtifacts,
      contextAnnotations,
      riskTagCatalog,
      correctiveActions: normalizeCorrectiveActions('RISK_TAGS_MISSING', payload.correctiveActions)
    });
  }

  const conflictResolution = ensureConflictFreeAnnotations(taggedArtifacts, contextAnnotations);

  if (!conflictResolution.valid) {
    return createResult({
      allowed: false,
      reasonCode: 'RISK_ANNOTATION_CONFLICT',
      reason: conflictResolution.reason,
      diagnostics: {
        artifactsTaggedCount: taggedArtifacts.length,
        annotationsCount: contextAnnotations.length,
        highRiskCount: taggedArtifacts.filter((artifact) => toSeverityRank(artifact.severity) >= 3).length,
        retryLimitedCount: countRetryLimitedIssues(sourceResolution.parseIssues),
        dlqCount: sourceResolution.dlqCandidates.length,
        durationMs: toDurationMs(startedAtMs, nowMs()),
        p95TaggingMs: computePercentile(perAnnotationDurations, 95),
        sourceReasonCode: sourceResolution.sourceReasonCode
      },
      taggedArtifacts,
      contextAnnotations,
      riskTagCatalog,
      correctiveActions: normalizeCorrectiveActions('RISK_ANNOTATION_CONFLICT', payload.correctiveActions)
    });
  }

  const highRiskCount = taggedArtifacts.filter((artifact) => toSeverityRank(artifact.severity) >= 3).length;
  const retryLimitedCount = countRetryLimitedIssues(sourceResolution.parseIssues);
  const dlqCount = sourceResolution.dlqCandidates.length;

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason:
      contextAnnotations.length > 0
        ? `Annotations risque générées: ${contextAnnotations.length} annotation(s) sur ${taggedArtifacts.length} artefact(s).`
        : 'Aucune parse issue à annoter: contexte risque nominal.',
    diagnostics: {
      artifactsTaggedCount: taggedArtifacts.length,
      annotationsCount: contextAnnotations.length,
      highRiskCount,
      retryLimitedCount,
      dlqCount,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      p95TaggingMs: computePercentile(perAnnotationDurations, 95),
      sourceReasonCode: sourceResolution.sourceReasonCode
    },
    taggedArtifacts,
    contextAnnotations,
    riskTagCatalog,
    correctiveActions: []
  });
}
