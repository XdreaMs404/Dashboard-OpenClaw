import path from 'node:path';
import { annotateArtifactRiskContext } from './artifact-risk-annotations.js';

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
  'INVALID_RISK_ANNOTATION_INPUT',
  'BACKFILL_QUEUE_SATURATED',
  'BACKFILL_BATCH_FAILED',
  'MIGRATION_CORPUS_INCOMPATIBLE',
  'INVALID_BACKFILL_INPUT'
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
  'INVALID_PARSE_DIAGNOSTIC_INPUT',
  'RISK_TAGS_MISSING',
  'RISK_ANNOTATION_CONFLICT',
  'INVALID_RISK_ANNOTATION_INPUT'
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
  INVALID_RISK_ANNOTATION_INPUT: 'FIX_RISK_ANNOTATION_INPUT',
  BACKFILL_QUEUE_SATURATED: 'THROTTLE_BACKFILL_QUEUE',
  BACKFILL_BATCH_FAILED: 'RETRY_BACKFILL_BATCH',
  MIGRATION_CORPUS_INCOMPATIBLE: 'ALIGN_MIGRATION_CORPUS',
  INVALID_BACKFILL_INPUT: 'FIX_BACKFILL_INPUT'
});

const DEFAULT_ALLOWED_EXTENSIONS = new Set(['.md', '.markdown', '.yaml', '.yml']);
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_MAX_QUEUE_DEPTH = 500;

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

  const output = [];
  const seen = new Set();

  for (const item of value) {
    const normalized = normalizeText(String(item ?? ''));

    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(normalized);
  }

  return output.sort((left, right) => left.localeCompare(right));
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

function validateAbsolutePath(value) {
  const text = normalizeText(value);

  if (text.length === 0) {
    return {
      valid: false,
      reason: 'artifactPath vide'
    };
  }

  if (!text.startsWith('/')) {
    return {
      valid: false,
      reason: 'artifactPath absolu requis'
    };
  }

  return {
    valid: true,
    value: path.resolve(text)
  };
}

function isPathInsideAllowlist(pathValue, allowlistRoots) {
  return allowlistRoots.some((root) => pathValue === root || pathValue.startsWith(`${root}${path.sep}`));
}

function resolveAllowlistRoots(payload, runtimeOptions) {
  const source = payload.allowlistRoots ?? runtimeOptions.allowlistRoots;

  if (!Array.isArray(source) || source.length === 0) {
    return {
      valid: false,
      reason: 'allowlistRoots invalide: tableau non vide requis.'
    };
  }

  const roots = [];
  const seen = new Set();

  for (let index = 0; index < source.length; index += 1) {
    const resolution = validateAbsolutePath(source[index]);

    if (!resolution.valid) {
      return {
        valid: false,
        reason: `allowlistRoots[${index}] invalide: ${resolution.reason}.`
      };
    }

    if (!seen.has(resolution.value)) {
      seen.add(resolution.value);
      roots.push(resolution.value);
    }
  }

  roots.sort((left, right) => left.localeCompare(right));

  return {
    valid: true,
    allowlistRoots: roots
  };
}

function resolveAllowedExtensions(payload, runtimeOptions) {
  const source = payload.allowedExtensions ?? runtimeOptions.allowedExtensions;

  if (source === undefined) {
    return {
      valid: true,
      allowedExtensions: new Set(DEFAULT_ALLOWED_EXTENSIONS)
    };
  }

  if (!Array.isArray(source) || source.length === 0) {
    return {
      valid: false,
      reason: 'allowedExtensions invalide: tableau non vide requis si fourni.'
    };
  }

  const extensions = new Set();

  for (let index = 0; index < source.length; index += 1) {
    const extension = normalizeText(source[index]).toLowerCase();

    if (!extension.startsWith('.') || extension.length < 2) {
      return {
        valid: false,
        reason: `allowedExtensions[${index}] invalide: extension attendue au format .ext.`
      };
    }

    extensions.add(extension);
  }

  return {
    valid: true,
    allowedExtensions: extensions
  };
}

function resolveBatchSize(payload, runtimeOptions) {
  const candidate = payload.batchSize ?? runtimeOptions.defaultBatchSize ?? DEFAULT_BATCH_SIZE;

  if (!Number.isInteger(candidate) || candidate < 1 || candidate > 500) {
    return {
      valid: false,
      reason: 'batchSize invalide: entier requis entre 1 et 500.'
    };
  }

  return {
    valid: true,
    batchSize: candidate
  };
}

function resolveQueueState(payload, runtimeOptions) {
  const queueDepth = payload.queueDepth ?? runtimeOptions.queueDepth ?? 0;
  const maxQueueDepth = payload.maxQueueDepth ?? runtimeOptions.maxQueueDepth ?? DEFAULT_MAX_QUEUE_DEPTH;

  if (!Number.isInteger(queueDepth) || queueDepth < 0) {
    return {
      valid: false,
      reason: 'queueDepth invalide: entier >= 0 requis.'
    };
  }

  if (!Number.isInteger(maxQueueDepth) || maxQueueDepth < 1) {
    return {
      valid: false,
      reason: 'maxQueueDepth invalide: entier >= 1 requis.'
    };
  }

  return {
    valid: true,
    queueDepth,
    maxQueueDepth,
    saturated: queueDepth > maxQueueDepth
  };
}

function normalizeResumeToken(payload) {
  const source = payload.resumeToken;

  if (source === undefined) {
    return {
      valid: true,
      resumeToken: {
        nextOffset: 0,
        processedDedupKeys: []
      }
    };
  }

  let parsed = source;

  if (typeof source === 'string') {
    try {
      parsed = JSON.parse(source);
    } catch (error) {
      return {
        valid: false,
        reason: `resumeToken invalide: JSON non parsable (${String(error?.message ?? error)}).`
      };
    }
  }

  if (!isObject(parsed)) {
    return {
      valid: false,
      reason: 'resumeToken invalide: objet attendu.'
    };
  }

  const nextOffset = parsed.nextOffset ?? 0;

  if (!Number.isInteger(nextOffset) || nextOffset < 0) {
    return {
      valid: false,
      reason: 'resumeToken.nextOffset invalide: entier >= 0 requis.'
    };
  }

  return {
    valid: true,
    resumeToken: {
      nextOffset,
      processedDedupKeys: normalizeArray(parsed.processedDedupKeys)
    }
  };
}

function resolveBatchFailureAt(payload, runtimeOptions) {
  const candidate = payload.batchFailureAtBatchIndex ?? runtimeOptions.batchFailureAtBatchIndex;

  if (candidate === undefined) {
    return {
      valid: true,
      batchFailureAtBatchIndex: null
    };
  }

  if (!Number.isInteger(candidate) || candidate < 1) {
    return {
      valid: false,
      reason: 'batchFailureAtBatchIndex invalide: entier >= 1 requis si fourni.'
    };
  }

  return {
    valid: true,
    batchFailureAtBatchIndex: candidate
  };
}

function resolveCorpusCompatibility(payload) {
  const compatibility = normalizeText(payload.corpusCompatibility).toLowerCase();

  if (compatibility.length === 0 || compatibility === 'compatible') {
    return {
      valid: true,
      incompatible: false
    };
  }

  if (compatibility === 'incompatible') {
    return {
      valid: true,
      incompatible: true
    };
  }

  return {
    valid: false,
    reason: 'corpusCompatibility invalide: compatible|incompatible attendu si fourni.'
  };
}

function normalizeRiskAnnotationsResult(result) {
  if (!isObject(result)) {
    return {
      valid: false,
      reason: 'riskAnnotationsResult invalide: objet attendu.'
    };
  }

  if (typeof result.allowed !== 'boolean') {
    return {
      valid: false,
      reason: 'riskAnnotationsResult.allowed invalide: booléen attendu.'
    };
  }

  const reasonCode = normalizeText(result.reasonCode);

  if (!REASON_CODE_SET.has(reasonCode)) {
    return {
      valid: false,
      reason: `riskAnnotationsResult.reasonCode invalide: ${reasonCode || 'vide'}.`
    };
  }

  const sourceReasonCode = REASON_CODE_SET.has(normalizeText(result.diagnostics?.sourceReasonCode))
    ? normalizeText(result.diagnostics.sourceReasonCode)
    : reasonCode;

  if (!result.allowed) {
    if (!UPSTREAM_BLOCKING_REASON_CODES.has(reasonCode)) {
      return {
        valid: false,
        reason: `riskAnnotationsResult.reasonCode non propagable: ${reasonCode}.`
      };
    }

    return {
      valid: true,
      blocked: true,
      reasonCode,
      sourceReasonCode,
      reason: normalizeText(result.reason) || `Source risk annotations bloquée (${reasonCode}).`,
      correctiveActions: normalizeCorrectiveActions(reasonCode, result.correctiveActions)
    };
  }

  if (!Array.isArray(result.taggedArtifacts)) {
    return {
      valid: false,
      reason: 'riskAnnotationsResult.taggedArtifacts invalide: tableau attendu quand allowed=true.'
    };
  }

  if (!Array.isArray(result.contextAnnotations)) {
    return {
      valid: false,
      reason: 'riskAnnotationsResult.contextAnnotations invalide: tableau attendu quand allowed=true.'
    };
  }

  return {
    valid: true,
    blocked: false,
    sourceReasonCode,
    taggedArtifacts: result.taggedArtifacts.map((entry) => cloneValue(entry)),
    contextAnnotations: result.contextAnnotations.map((entry) => cloneValue(entry))
  };
}

function normalizeLegacyContextAnnotation(rawAnnotation, index, fallbackArtifact) {
  if (!isObject(rawAnnotation)) {
    return {
      valid: false,
      reason: `legacyArtifacts[${index}].contextAnnotations invalide: objet attendu.`
    };
  }

  const artifactId = normalizeText(rawAnnotation.artifactId) || fallbackArtifact.artifactId;
  const pathResolution = validateAbsolutePath(rawAnnotation.artifactPath ?? fallbackArtifact.artifactPath);

  if (!pathResolution.valid) {
    return {
      valid: false,
      reason: `legacyArtifacts[${index}].contextAnnotations artifactPath invalide: ${pathResolution.reason}.`
    };
  }

  const riskTags = normalizeArray(rawAnnotation.riskTags);

  return {
    valid: true,
    annotation: {
      annotationId: normalizeText(rawAnnotation.annotationId),
      artifactId,
      artifactPath: pathResolution.value,
      issueId: normalizeText(rawAnnotation.issueId),
      parseStage: normalizeText(rawAnnotation.parseStage) || 'legacy',
      errorType: normalizeText(rawAnnotation.errorType) || 'legacy',
      recommendedFix: normalizeText(rawAnnotation.recommendedFix),
      what:
        normalizeText(rawAnnotation.what) ||
        `Contexte legacy migré pour ${artifactId}: annotation historique conservée.`,
      why:
        normalizeText(rawAnnotation.why) ||
        'Préserver les annotations historiques est requis pour FR-032 après migration corpus.',
      nextAction:
        normalizeText(rawAnnotation.nextAction) ||
        `Vérifier la cohérence de l'annotation migrée pour ${artifactId}.`,
      severity: normalizeText(rawAnnotation.severity) || fallbackArtifact.severity,
      ownerHint: normalizeText(rawAnnotation.ownerHint) || fallbackArtifact.ownerHint,
      riskTags: riskTags.length > 0 ? riskTags : fallbackArtifact.riskTags,
      contentHash: normalizeText(rawAnnotation.contentHash)
    }
  };
}

function normalizeLegacyArtifacts(legacyArtifacts) {
  if (!Array.isArray(legacyArtifacts)) {
    return {
      valid: false,
      reason: 'legacyArtifacts invalide: tableau attendu.'
    };
  }

  const taggedArtifacts = [];
  const contextAnnotations = [];

  for (let index = 0; index < legacyArtifacts.length; index += 1) {
    const rawArtifact = legacyArtifacts[index];

    if (!isObject(rawArtifact)) {
      return {
        valid: false,
        reason: `legacyArtifacts[${index}] invalide: objet attendu.`
      };
    }

    const artifactId = normalizeText(rawArtifact.artifactId);

    if (artifactId.length === 0) {
      return {
        valid: false,
        reason: `legacyArtifacts[${index}].artifactId invalide: chaîne non vide requise.`
      };
    }

    const pathResolution = validateAbsolutePath(rawArtifact.artifactPath ?? rawArtifact.path);

    if (!pathResolution.valid) {
      return {
        valid: false,
        reason: `legacyArtifacts[${index}].artifactPath invalide: ${pathResolution.reason}.`
      };
    }

    const taggedArtifact = {
      artifactId,
      artifactPath: pathResolution.value,
      artifactType: normalizeText(rawArtifact.artifactType) || 'artifact',
      sourceIssueIds: normalizeArray(rawArtifact.sourceIssueIds),
      riskTags: normalizeArray(rawArtifact.riskTags),
      severity: normalizeText(rawArtifact.severity) || 'low',
      ownerHint: normalizeText(rawArtifact.ownerHint) || 'artifact-maintainer',
      contentHash: normalizeText(rawArtifact.contentHash)
    };

    taggedArtifacts.push(taggedArtifact);

    if (Array.isArray(rawArtifact.contextAnnotations)) {
      for (const rawAnnotation of rawArtifact.contextAnnotations) {
        const annotationResolution = normalizeLegacyContextAnnotation(rawAnnotation, index, taggedArtifact);

        if (!annotationResolution.valid) {
          return annotationResolution;
        }

        contextAnnotations.push(annotationResolution.annotation);
      }
    }
  }

  taggedArtifacts.sort((left, right) => compareObjectsByKeys(left, right, ['artifactPath', 'artifactId']));
  contextAnnotations.sort((left, right) => compareObjectsByKeys(left, right, ['artifactPath', 'annotationId']));

  return {
    valid: true,
    taggedArtifacts,
    contextAnnotations
  };
}

function resolveSource(payload, runtimeOptions) {
  if (payload.riskAnnotationsResult !== undefined) {
    return normalizeRiskAnnotationsResult(payload.riskAnnotationsResult);
  }

  if (payload.riskAnnotationsInput !== undefined) {
    if (!isObject(payload.riskAnnotationsInput)) {
      return {
        valid: false,
        reason: 'riskAnnotationsInput invalide: objet attendu.'
      };
    }

    const delegatedOptions = isObject(runtimeOptions.riskAnnotationsOptions)
      ? runtimeOptions.riskAnnotationsOptions
      : {};

    let delegatedResult;

    try {
      delegatedResult = annotateArtifactRiskContext(payload.riskAnnotationsInput, delegatedOptions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        reason: `annotateArtifactRiskContext a levé une exception: ${message}`
      };
    }

    return normalizeRiskAnnotationsResult(delegatedResult);
  }

  if (payload.legacyArtifacts !== undefined) {
    const legacyResolution = normalizeLegacyArtifacts(payload.legacyArtifacts);

    if (!legacyResolution.valid) {
      return legacyResolution;
    }

    return {
      valid: true,
      blocked: false,
      sourceReasonCode: 'OK',
      taggedArtifacts: legacyResolution.taggedArtifacts,
      contextAnnotations: legacyResolution.contextAnnotations
    };
  }

  return {
    valid: false,
    reason:
      'Aucune source exploitable: fournir riskAnnotationsResult, riskAnnotationsInput ou legacyArtifacts.'
  };
}

function buildArtifactCandidates(taggedArtifacts, contextAnnotations) {
  const byKey = new Map();

  const getCandidate = ({ artifactId, artifactPath, artifactType, severity, ownerHint, contentHash }) => {
    const key = `${artifactId}::${artifactPath}`;

    if (!byKey.has(key)) {
      byKey.set(key, {
        artifactId,
        artifactPath,
        artifactType,
        sourceIssueIds: [],
        riskTags: [],
        severity: normalizeText(severity) || 'low',
        ownerHint: normalizeText(ownerHint) || 'artifact-maintainer',
        contentHash: normalizeText(contentHash),
        contextAnnotations: []
      });
    }

    return byKey.get(key);
  };

  for (let index = 0; index < taggedArtifacts.length; index += 1) {
    const taggedArtifact = taggedArtifacts[index];

    if (!isObject(taggedArtifact)) {
      return {
        valid: false,
        reason: `taggedArtifacts[${index}] invalide: objet attendu.`
      };
    }

    const artifactId = normalizeText(taggedArtifact.artifactId);

    if (artifactId.length === 0) {
      return {
        valid: false,
        reason: `taggedArtifacts[${index}].artifactId invalide: chaîne non vide requise.`
      };
    }

    const pathResolution = validateAbsolutePath(taggedArtifact.artifactPath);

    if (!pathResolution.valid) {
      return {
        valid: false,
        reason: `taggedArtifacts[${index}].artifactPath invalide: ${pathResolution.reason}.`
      };
    }

    const candidate = getCandidate({
      artifactId,
      artifactPath: pathResolution.value,
      artifactType: normalizeText(taggedArtifact.artifactType) || 'artifact',
      severity: taggedArtifact.severity,
      ownerHint: taggedArtifact.ownerHint,
      contentHash: taggedArtifact.contentHash
    });

    candidate.sourceIssueIds = normalizeArray([...candidate.sourceIssueIds, ...normalizeArray(taggedArtifact.sourceIssueIds)]);
    candidate.riskTags = normalizeArray([...candidate.riskTags, ...normalizeArray(taggedArtifact.riskTags)]);

    if (candidate.contentHash.length === 0) {
      candidate.contentHash = normalizeText(taggedArtifact.contentHash);
    }
  }

  for (let index = 0; index < contextAnnotations.length; index += 1) {
    const annotation = contextAnnotations[index];

    if (!isObject(annotation)) {
      return {
        valid: false,
        reason: `contextAnnotations[${index}] invalide: objet attendu.`
      };
    }

    const artifactId = normalizeText(annotation.artifactId);

    if (artifactId.length === 0) {
      return {
        valid: false,
        reason: `contextAnnotations[${index}].artifactId invalide: chaîne non vide requise.`
      };
    }

    const pathResolution = validateAbsolutePath(annotation.artifactPath);

    if (!pathResolution.valid) {
      return {
        valid: false,
        reason: `contextAnnotations[${index}].artifactPath invalide: ${pathResolution.reason}.`
      };
    }

    const candidate = getCandidate({
      artifactId,
      artifactPath: pathResolution.value,
      artifactType: normalizeText(annotation.artifactType) || 'artifact',
      severity: annotation.severity,
      ownerHint: annotation.ownerHint,
      contentHash: annotation.contentHash
    });

    candidate.sourceIssueIds = normalizeArray([...candidate.sourceIssueIds, ...normalizeArray([annotation.issueId])]);
    candidate.riskTags = normalizeArray([...candidate.riskTags, ...normalizeArray(annotation.riskTags)]);

    candidate.contextAnnotations.push({
      annotationId: normalizeText(annotation.annotationId),
      artifactId,
      artifactPath: pathResolution.value,
      issueId: normalizeText(annotation.issueId),
      parseStage: normalizeText(annotation.parseStage),
      errorType: normalizeText(annotation.errorType),
      recommendedFix: normalizeText(annotation.recommendedFix),
      what: normalizeText(annotation.what),
      why: normalizeText(annotation.why),
      nextAction: normalizeText(annotation.nextAction),
      severity: normalizeText(annotation.severity) || 'low',
      ownerHint: normalizeText(annotation.ownerHint) || 'artifact-maintainer',
      riskTags: normalizeArray(annotation.riskTags),
      contentHash: normalizeText(annotation.contentHash)
    });
  }

  const candidates = [...byKey.values()].map((candidate) => ({
    ...candidate,
    contextAnnotations: candidate.contextAnnotations.sort((left, right) =>
      compareObjectsByKeys(left, right, ['artifactPath', 'annotationId'])
    )
  }));

  candidates.sort((left, right) => compareObjectsByKeys(left, right, ['artifactPath', 'artifactId']));

  return {
    valid: true,
    candidates
  };
}

function validateCandidatesForAllowlistAndType(candidates, allowlistRoots, allowedExtensions) {
  for (const candidate of candidates) {
    if (!isPathInsideAllowlist(candidate.artifactPath, allowlistRoots)) {
      return {
        valid: false,
        reasonCode: 'ARTIFACT_PATH_NOT_ALLOWED',
        reason: `Artefact hors allowlist: ${candidate.artifactPath}.`,
        failedArtifacts: [
          {
            artifactId: candidate.artifactId,
            artifactPath: candidate.artifactPath,
            reasonCode: 'ARTIFACT_PATH_NOT_ALLOWED',
            reason: `Chemin hors racines autorisées: ${candidate.artifactPath}.`
          }
        ]
      };
    }

    const extension = path.extname(candidate.artifactPath).toLowerCase();

    if (!allowedExtensions.has(extension)) {
      return {
        valid: false,
        reasonCode: 'UNSUPPORTED_ARTIFACT_TYPE',
        reason: `Extension non supportée pour backfill: ${extension || '(aucune)'}.`,
        failedArtifacts: [
          {
            artifactId: candidate.artifactId,
            artifactPath: candidate.artifactPath,
            reasonCode: 'UNSUPPORTED_ARTIFACT_TYPE',
            reason: `Extension non supportée: ${extension || '(aucune)'}.`
          }
        ]
      };
    }
  }

  return {
    valid: true
  };
}

function hashString(value) {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash.toString(16).padStart(8, '0');
}

function buildDedupKey(candidate) {
  const signature = JSON.stringify({
    artifactId: candidate.artifactId,
    artifactType: candidate.artifactType,
    sourceIssueIds: candidate.sourceIssueIds,
    riskTags: candidate.riskTags,
    contextAnnotations: candidate.contextAnnotations.map((annotation) => ({
      annotationId: annotation.annotationId,
      issueId: annotation.issueId,
      parseStage: annotation.parseStage,
      errorType: annotation.errorType,
      riskTags: annotation.riskTags
    }))
  });

  const digest = normalizeText(candidate.contentHash) || hashString(signature);

  return `${candidate.artifactPath}::${digest}`;
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  migratedArtifacts = [],
  skippedArtifacts = [],
  failedArtifacts = [],
  migrationReport = {
    batches: [],
    resumeToken: {
      nextOffset: 0,
      processedDedupKeys: []
    }
  },
  correctiveActions = []
}) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: {
      requestedCount: diagnostics.requestedCount,
      migratedCount: diagnostics.migratedCount,
      skippedCount: diagnostics.skippedCount,
      failedCount: diagnostics.failedCount,
      batchCount: diagnostics.batchCount,
      durationMs: diagnostics.durationMs,
      p95BatchMs: diagnostics.p95BatchMs,
      sourceReasonCode: diagnostics.sourceReasonCode
    },
    migratedArtifacts: migratedArtifacts.map((entry) => cloneValue(entry)),
    skippedArtifacts: skippedArtifacts.map((entry) => cloneValue(entry)),
    failedArtifacts: failedArtifacts.map((entry) => cloneValue(entry)),
    migrationReport: cloneValue(migrationReport),
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidInputResult({
  reason,
  durationMs = 0,
  sourceReasonCode = 'INVALID_BACKFILL_INPUT',
  migrationReport,
  correctiveActions
}) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_BACKFILL_INPUT',
    reason,
    diagnostics: {
      requestedCount: 0,
      migratedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      batchCount: 0,
      durationMs,
      p95BatchMs: 0,
      sourceReasonCode
    },
    migratedArtifacts: [],
    skippedArtifacts: [],
    failedArtifacts: [],
    migrationReport:
      migrationReport ?? {
        batches: [],
        resumeToken: {
          nextOffset: 0,
          processedDedupKeys: []
        }
      },
    correctiveActions: correctiveActions ?? ['FIX_BACKFILL_INPUT']
  });
}

function createBlockedResult({ reasonCode, reason, sourceReasonCode, durationMs, correctiveActions }) {
  return createResult({
    allowed: false,
    reasonCode,
    reason,
    diagnostics: {
      requestedCount: 0,
      migratedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      batchCount: 0,
      durationMs,
      p95BatchMs: 0,
      sourceReasonCode
    },
    migratedArtifacts: [],
    skippedArtifacts: [],
    failedArtifacts: [],
    migrationReport: {
      batches: [],
      resumeToken: {
        nextOffset: 0,
        processedDedupKeys: []
      }
    },
    correctiveActions: normalizeCorrectiveActions(reasonCode, correctiveActions)
  });
}

export function runArtifactCorpusBackfill(input, options = {}) {
  const payload = isObject(input) ? input : {};
  const runtimeOptions = isObject(options) ? options : {};
  const nowMs = resolveNowProvider(runtimeOptions);
  const startedAtMs = nowMs();

  const sourceResolution = resolveSource(payload, runtimeOptions);

  if (!sourceResolution.valid) {
    return createInvalidInputResult({
      reason: sourceResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  if (sourceResolution.blocked) {
    return createBlockedResult({
      reasonCode: sourceResolution.reasonCode,
      reason: sourceResolution.reason,
      sourceReasonCode: sourceResolution.sourceReasonCode,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      correctiveActions: sourceResolution.correctiveActions
    });
  }

  const allowlistResolution = resolveAllowlistRoots(payload, runtimeOptions);

  if (!allowlistResolution.valid) {
    return createInvalidInputResult({
      reason: allowlistResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
    });
  }

  const extensionsResolution = resolveAllowedExtensions(payload, runtimeOptions);

  if (!extensionsResolution.valid) {
    return createInvalidInputResult({
      reason: extensionsResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
    });
  }

  const batchSizeResolution = resolveBatchSize(payload, runtimeOptions);

  if (!batchSizeResolution.valid) {
    return createInvalidInputResult({
      reason: batchSizeResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
    });
  }

  const resumeTokenResolution = normalizeResumeToken(payload);

  if (!resumeTokenResolution.valid) {
    return createInvalidInputResult({
      reason: resumeTokenResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
    });
  }

  const queueStateResolution = resolveQueueState(payload, runtimeOptions);

  if (!queueStateResolution.valid) {
    return createInvalidInputResult({
      reason: queueStateResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
    });
  }

  if (queueStateResolution.saturated) {
    return createResult({
      allowed: false,
      reasonCode: 'BACKFILL_QUEUE_SATURATED',
      reason:
        `Queue backfill saturée: queueDepth=${queueStateResolution.queueDepth} > maxQueueDepth=${queueStateResolution.maxQueueDepth}.`,
      diagnostics: {
        requestedCount: 0,
        migratedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        batchCount: 0,
        durationMs: toDurationMs(startedAtMs, nowMs()),
        p95BatchMs: 0,
        sourceReasonCode: sourceResolution.sourceReasonCode
      },
      migratedArtifacts: [],
      skippedArtifacts: [],
      failedArtifacts: [],
      migrationReport: {
        batches: [],
        resumeToken: resumeTokenResolution.resumeToken
      },
      correctiveActions: ['THROTTLE_BACKFILL_QUEUE']
    });
  }

  const compatibilityResolution = resolveCorpusCompatibility(payload);

  if (!compatibilityResolution.valid) {
    return createInvalidInputResult({
      reason: compatibilityResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
    });
  }

  if (compatibilityResolution.incompatible) {
    return createResult({
      allowed: false,
      reasonCode: 'MIGRATION_CORPUS_INCOMPATIBLE',
      reason: 'Corpus de référence incompatible avec la cible de migration.',
      diagnostics: {
        requestedCount: 0,
        migratedCount: 0,
        skippedCount: 0,
        failedCount: 0,
        batchCount: 0,
        durationMs: toDurationMs(startedAtMs, nowMs()),
        p95BatchMs: 0,
        sourceReasonCode: sourceResolution.sourceReasonCode
      },
      migratedArtifacts: [],
      skippedArtifacts: [],
      failedArtifacts: [],
      migrationReport: {
        batches: [],
        resumeToken: resumeTokenResolution.resumeToken
      },
      correctiveActions: ['ALIGN_MIGRATION_CORPUS']
    });
  }

  const candidatesResolution = buildArtifactCandidates(
    sourceResolution.taggedArtifacts,
    sourceResolution.contextAnnotations
  );

  if (!candidatesResolution.valid) {
    return createInvalidInputResult({
      reason: candidatesResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
    });
  }

  const candidates = candidatesResolution.candidates;

  const allowlistAndTypeValidation = validateCandidatesForAllowlistAndType(
    candidates,
    allowlistResolution.allowlistRoots,
    extensionsResolution.allowedExtensions
  );

  if (!allowlistAndTypeValidation.valid) {
    return createResult({
      allowed: false,
      reasonCode: allowlistAndTypeValidation.reasonCode,
      reason: allowlistAndTypeValidation.reason,
      diagnostics: {
        requestedCount: candidates.length,
        migratedCount: 0,
        skippedCount: 0,
        failedCount: allowlistAndTypeValidation.failedArtifacts.length,
        batchCount: 0,
        durationMs: toDurationMs(startedAtMs, nowMs()),
        p95BatchMs: 0,
        sourceReasonCode: sourceResolution.sourceReasonCode
      },
      migratedArtifacts: [],
      skippedArtifacts: [],
      failedArtifacts: allowlistAndTypeValidation.failedArtifacts,
      migrationReport: {
        batches: [],
        resumeToken: {
          ...resumeTokenResolution.resumeToken,
          nextOffset: 0
        }
      },
      correctiveActions: normalizeCorrectiveActions(
        allowlistAndTypeValidation.reasonCode,
        payload.correctiveActions
      )
    });
  }

  const batchFailureResolution = resolveBatchFailureAt(payload, runtimeOptions);

  if (!batchFailureResolution.valid) {
    return createInvalidInputResult({
      reason: batchFailureResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
    });
  }

  const processedDedupKeys = new Set(resumeTokenResolution.resumeToken.processedDedupKeys);
  const migratedArtifacts = [];
  const skippedArtifacts = [];
  const failedArtifacts = [];
  const batches = [];
  const batchDurations = [];

  const startOffset = Math.min(resumeTokenResolution.resumeToken.nextOffset, candidates.length);

  for (let index = 0; index < startOffset; index += 1) {
    const candidate = candidates[index];
    const dedupKey = buildDedupKey(candidate);

    processedDedupKeys.add(dedupKey);
    skippedArtifacts.push({
      artifactId: candidate.artifactId,
      artifactPath: candidate.artifactPath,
      dedupKey,
      reasonCode: 'RESUME_TOKEN_ALREADY_PROCESSED',
      reason: 'Artefact déjà validé dans un lot précédent (resumeToken).'
    });
  }

  let currentOffset = startOffset;
  let batchIndex = 0;
  let failedBatchOffset = null;

  while (currentOffset < candidates.length) {
    batchIndex += 1;
    const batchStartedAtMs = nowMs();
    const batchCandidates = candidates.slice(currentOffset, currentOffset + batchSizeResolution.batchSize);

    if (
      batchFailureResolution.batchFailureAtBatchIndex !== null &&
      batchIndex === batchFailureResolution.batchFailureAtBatchIndex
    ) {
      for (const candidate of batchCandidates) {
        failedArtifacts.push({
          artifactId: candidate.artifactId,
          artifactPath: candidate.artifactPath,
          dedupKey: buildDedupKey(candidate),
          reasonCode: 'BACKFILL_BATCH_FAILED',
          reason: `Lot ${batchIndex} échoué pendant la migration.`
        });
      }

      failedBatchOffset = currentOffset;

      const batchDuration = toDurationMs(batchStartedAtMs, nowMs());
      batchDurations.push(batchDuration);

      batches.push({
        batchIndex,
        startOffset: currentOffset,
        requestedCount: batchCandidates.length,
        migratedCount: 0,
        skippedCount: 0,
        failedCount: batchCandidates.length,
        durationMs: batchDuration,
        status: 'failed'
      });

      break;
    }

    let migratedCount = 0;
    let skippedCount = 0;

    for (const candidate of batchCandidates) {
      const dedupKey = buildDedupKey(candidate);

      if (processedDedupKeys.has(dedupKey)) {
        skippedCount += 1;
        skippedArtifacts.push({
          artifactId: candidate.artifactId,
          artifactPath: candidate.artifactPath,
          dedupKey,
          reasonCode: 'DUPLICATE_ARTIFACT',
          reason: 'Artefact déjà migré (idempotence path+hash).'
        });
        continue;
      }

      processedDedupKeys.add(dedupKey);
      migratedCount += 1;

      migratedArtifacts.push({
        artifactId: candidate.artifactId,
        artifactPath: candidate.artifactPath,
        artifactType: candidate.artifactType,
        sourceIssueIds: [...candidate.sourceIssueIds],
        riskTags: [...candidate.riskTags],
        severity: candidate.severity,
        ownerHint: candidate.ownerHint,
        contextAnnotations: candidate.contextAnnotations.map((annotation) => cloneValue(annotation)),
        dedupKey,
        batchIndex
      });
    }

    const batchDuration = toDurationMs(batchStartedAtMs, nowMs());
    batchDurations.push(batchDuration);

    batches.push({
      batchIndex,
      startOffset: currentOffset,
      requestedCount: batchCandidates.length,
      migratedCount,
      skippedCount,
      failedCount: 0,
      durationMs: batchDuration,
      status: 'ok'
    });

    currentOffset += batchCandidates.length;
  }

  const nextOffset = failedBatchOffset === null ? candidates.length : failedBatchOffset;
  const sortedProcessedDedupKeys = [...processedDedupKeys].sort((left, right) => left.localeCompare(right));

  const diagnostics = {
    requestedCount: candidates.length,
    migratedCount: migratedArtifacts.length,
    skippedCount: skippedArtifacts.length,
    failedCount: failedArtifacts.length,
    batchCount: batches.length,
    durationMs: toDurationMs(startedAtMs, nowMs()),
    p95BatchMs: computePercentile(batchDurations, 95),
    sourceReasonCode: sourceResolution.sourceReasonCode
  };

  const migrationReport = {
    batches,
    resumeToken: {
      nextOffset,
      processedDedupKeys: sortedProcessedDedupKeys,
      completed: failedArtifacts.length === 0
    }
  };

  if (failedArtifacts.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'BACKFILL_BATCH_FAILED',
      reason: `Echec de migration lot ${batchFailureResolution.batchFailureAtBatchIndex}.`,
      diagnostics,
      migratedArtifacts,
      skippedArtifacts,
      failedArtifacts,
      migrationReport,
      correctiveActions: normalizeCorrectiveActions('BACKFILL_BATCH_FAILED', payload.correctiveActions)
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason:
      `Backfill terminé: ${diagnostics.migratedCount}/${diagnostics.requestedCount} migré(s), ` +
      `${diagnostics.skippedCount} ignoré(s), ${diagnostics.failedCount} en échec.`,
    diagnostics,
    migratedArtifacts,
    skippedArtifacts,
    failedArtifacts,
    migrationReport,
    correctiveActions: []
  });
}
