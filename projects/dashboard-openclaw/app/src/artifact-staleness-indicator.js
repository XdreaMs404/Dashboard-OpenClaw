import { buildArtifactEvidenceGraph } from './artifact-evidence-graph.js';

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
  'INVALID_STALENESS_INPUT'
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
  'INVALID_EVIDENCE_GRAPH_INPUT'
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
  INVALID_STALENESS_INPUT: 'FIX_STALENESS_INPUT'
});

const DEFAULT_MAX_AGE_SECONDS = 3600;

const EMPTY_BOARD = Object.freeze({
  staleButAvailable: true,
  maxAgeSeconds: DEFAULT_MAX_AGE_SECONDS,
  artifacts: [],
  summary: {
    artifactsCount: 0,
    staleCount: 0,
    staleRatio: 0,
    maxAgeSeconds: DEFAULT_MAX_AGE_SECONDS,
    highestAgeSeconds: 0
  }
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
  stalenessBoard = EMPTY_BOARD,
  decisionFreshness = {},
  correctiveActions = []
}) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: {
      artifactsCount: diagnostics.artifactsCount,
      staleCount: diagnostics.staleCount,
      staleRatio: diagnostics.staleRatio,
      maxAgeSeconds: diagnostics.maxAgeSeconds,
      rebuildDurationMs: diagnostics.rebuildDurationMs,
      durationMs: diagnostics.durationMs,
      p95StalenessMs: diagnostics.p95StalenessMs,
      sourceReasonCode: diagnostics.sourceReasonCode
    },
    stalenessBoard: {
      staleButAvailable: Boolean(stalenessBoard.staleButAvailable),
      maxAgeSeconds: stalenessBoard.maxAgeSeconds,
      artifacts: stalenessBoard.artifacts.map((entry) => cloneValue(entry)),
      summary: cloneValue(stalenessBoard.summary)
    },
    decisionFreshness: cloneValue(decisionFreshness),
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidInputResult(reason, context = {}) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_STALENESS_INPUT',
    reason,
    diagnostics: {
      artifactsCount: 0,
      staleCount: 0,
      staleRatio: 0,
      maxAgeSeconds: context.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS,
      rebuildDurationMs: context.rebuildDurationMs ?? 0,
      durationMs: context.durationMs ?? 0,
      p95StalenessMs: 0,
      sourceReasonCode: context.sourceReasonCode ?? 'INVALID_STALENESS_INPUT'
    },
    stalenessBoard: context.stalenessBoard ?? EMPTY_BOARD,
    decisionFreshness: context.decisionFreshness ?? {},
    correctiveActions: context.correctiveActions ?? ['FIX_STALENESS_INPUT']
  });
}

function createBlockedResult({
  reasonCode,
  reason,
  sourceReasonCode,
  maxAgeSeconds,
  rebuildDurationMs,
  durationMs,
  correctiveActions
}) {
  return createResult({
    allowed: false,
    reasonCode,
    reason,
    diagnostics: {
      artifactsCount: 0,
      staleCount: 0,
      staleRatio: 0,
      maxAgeSeconds,
      rebuildDurationMs,
      durationMs,
      p95StalenessMs: 0,
      sourceReasonCode
    },
    stalenessBoard: {
      staleButAvailable: true,
      maxAgeSeconds,
      artifacts: [],
      summary: {
        artifactsCount: 0,
        staleCount: 0,
        staleRatio: 0,
        maxAgeSeconds,
        highestAgeSeconds: 0
      }
    },
    decisionFreshness: {},
    correctiveActions: normalizeCorrectiveActions(reasonCode, correctiveActions)
  });
}

function createTimeoutResult({ maxAgeSeconds, rebuildDurationMs, durationMs, sourceReasonCode }) {
  return createResult({
    allowed: false,
    reasonCode: 'PROJECTION_REBUILD_TIMEOUT',
    reason: `Projection staleness hors délai: rebuildDurationMs=${rebuildDurationMs}ms (>60000ms).`,
    diagnostics: {
      artifactsCount: 0,
      staleCount: 0,
      staleRatio: 0,
      maxAgeSeconds,
      rebuildDurationMs,
      durationMs,
      p95StalenessMs: 0,
      sourceReasonCode
    },
    stalenessBoard: {
      staleButAvailable: true,
      maxAgeSeconds,
      artifacts: [],
      summary: {
        artifactsCount: 0,
        staleCount: 0,
        staleRatio: 0,
        maxAgeSeconds,
        highestAgeSeconds: 0
      }
    },
    decisionFreshness: {},
    correctiveActions: ['REBUILD_STALENESS_PROJECTION']
  });
}

function createLedgerGapResult({ reason, maxAgeSeconds, rebuildDurationMs, durationMs, sourceReasonCode }) {
  return createResult({
    allowed: false,
    reasonCode: 'EVENT_LEDGER_GAP_DETECTED',
    reason,
    diagnostics: {
      artifactsCount: 0,
      staleCount: 0,
      staleRatio: 0,
      maxAgeSeconds,
      rebuildDurationMs,
      durationMs,
      p95StalenessMs: 0,
      sourceReasonCode
    },
    stalenessBoard: {
      staleButAvailable: true,
      maxAgeSeconds,
      artifacts: [],
      summary: {
        artifactsCount: 0,
        staleCount: 0,
        staleRatio: 0,
        maxAgeSeconds,
        highestAgeSeconds: 0
      }
    },
    decisionFreshness: {},
    correctiveActions: ['REPAIR_EVENT_LEDGER_GAP']
  });
}

function resolveNowProvider(runtimeOptions) {
  return typeof runtimeOptions.nowMs === 'function' ? runtimeOptions.nowMs : () => Date.now();
}

function resolveMaxAgeSeconds(payload, runtimeOptions) {
  const candidate = payload.maxAgeSeconds ?? runtimeOptions.defaultMaxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;

  if (!Number.isInteger(candidate) || candidate < 1 || candidate > 31_536_000) {
    return {
      valid: false,
      reason: 'maxAgeSeconds invalide: entier entre 1 et 31536000 requis.'
    };
  }

  return {
    valid: true,
    maxAgeSeconds: candidate
  };
}

function resolveRebuildDurationMs(payload) {
  const candidate = payload.rebuildDurationMs ?? payload.metrics?.rebuildDurationMs ?? 0;

  if (!Number.isFinite(candidate) || candidate < 0) {
    return {
      valid: false,
      reason: 'rebuildDurationMs invalide: nombre >= 0 requis.'
    };
  }

  return {
    valid: true,
    rebuildDurationMs: Math.trunc(candidate)
  };
}

function normalizeTimestampValue(value, label) {
  if (value === null || value === undefined || value === '') {
    return {
      valid: true,
      present: false,
      ms: null,
      iso: null
    };
  }

  let timestampMs;

  if (typeof value === 'number') {
    timestampMs = value;
  } else {
    const text = normalizeText(String(value));

    if (text.length === 0) {
      return {
        valid: true,
        present: false,
        ms: null,
        iso: null
      };
    }

    timestampMs = Number(text);

    if (!Number.isFinite(timestampMs)) {
      timestampMs = Date.parse(text);
    }
  }

  if (!Number.isFinite(timestampMs)) {
    return {
      valid: false,
      reason: `${label} invalide: timestamp ISO ou epoch milliseconds requis.`
    };
  }

  const date = new Date(timestampMs);

  if (Number.isNaN(date.getTime())) {
    return {
      valid: false,
      reason: `${label} invalide: date non reconnue.`
    };
  }

  return {
    valid: true,
    present: true,
    ms: date.getTime(),
    iso: date.toISOString()
  };
}

function resolveArtifactTimestampMap(payload) {
  if (payload.artifactTimestamps === undefined || payload.artifactTimestamps === null) {
    return {
      valid: true,
      byKey: new Map()
    };
  }

  if (!isObject(payload.artifactTimestamps)) {
    return {
      valid: false,
      reason: 'artifactTimestamps invalide: objet attendu.'
    };
  }

  const byKey = new Map();

  for (const [rawKey, rawValue] of Object.entries(payload.artifactTimestamps)) {
    const key = normalizeText(rawKey);

    if (key.length === 0) {
      return {
        valid: false,
        reason: 'artifactTimestamps contient une clé vide.'
      };
    }

    const normalizedTimestamp = normalizeTimestampValue(rawValue, `artifactTimestamps.${key}`);

    if (!normalizedTimestamp.valid) {
      return normalizedTimestamp;
    }

    if (!normalizedTimestamp.present) {
      continue;
    }

    byKey.set(key, {
      ms: normalizedTimestamp.ms,
      iso: normalizedTimestamp.iso
    });
  }

  return {
    valid: true,
    byKey
  };
}

function resolveEventLedger(payload) {
  if (payload.eventLedger === undefined || payload.eventLedger === null) {
    return {
      valid: true,
      gapDetected: false,
      reason: ''
    };
  }

  const ledger = payload.eventLedger;
  let source = null;

  if (Array.isArray(ledger)) {
    source = ledger;
  } else if (isObject(ledger) && Array.isArray(ledger.events)) {
    source = ledger.events;
  } else if (isObject(ledger) && Array.isArray(ledger.sequences)) {
    source = ledger.sequences;
  }

  if (!Array.isArray(source)) {
    return {
      valid: false,
      reason: 'eventLedger invalide: tableau ou objet {events|sequences} attendu.'
    };
  }

  if (source.length === 0) {
    return {
      valid: true,
      gapDetected: false,
      reason: ''
    };
  }

  const sequences = [];

  for (let index = 0; index < source.length; index += 1) {
    const entry = source[index];
    const candidate =
      typeof entry === 'number' ? entry : isObject(entry) ? entry.sequence ?? entry.seq ?? entry.id : NaN;

    if (!Number.isInteger(candidate) || candidate < 0) {
      return {
        valid: false,
        reason: `eventLedger[${index}] invalide: sequence entière >=0 requise.`
      };
    }

    sequences.push(candidate);
  }

  for (let index = 1; index < sequences.length; index += 1) {
    const expected = sequences[index - 1] + 1;

    if (sequences[index] !== expected) {
      return {
        valid: true,
        gapDetected: true,
        reason: `Gap ledger détecté: séquence attendue=${expected}, reçue=${sequences[index]} (index ${index}).`
      };
    }
  }

  if (isObject(ledger) && Number.isInteger(ledger.expectedSequenceStart) && ledger.expectedSequenceStart >= 0) {
    if (sequences[0] !== ledger.expectedSequenceStart) {
      return {
        valid: true,
        gapDetected: true,
        reason: `Gap ledger détecté: start attendu=${ledger.expectedSequenceStart}, reçu=${sequences[0]}.`
      };
    }
  }

  if (isObject(ledger) && Number.isInteger(ledger.expectedSequenceEnd) && ledger.expectedSequenceEnd >= 0) {
    if (sequences[sequences.length - 1] !== ledger.expectedSequenceEnd) {
      return {
        valid: true,
        gapDetected: true,
        reason: `Gap ledger détecté: end attendu=${ledger.expectedSequenceEnd}, reçu=${sequences[sequences.length - 1]}.`
      };
    }
  }

  return {
    valid: true,
    gapDetected: false,
    reason: ''
  };
}

function normalizeEvidenceGraphResult(result) {
  if (!isObject(result)) {
    return {
      valid: false,
      reason: 'evidenceGraphResult invalide: objet attendu.'
    };
  }

  if (typeof result.allowed !== 'boolean') {
    return {
      valid: false,
      reason: 'evidenceGraphResult.allowed invalide: booléen attendu.'
    };
  }

  const reasonCode = normalizeText(result.reasonCode);

  if (!REASON_CODE_SET.has(reasonCode)) {
    return {
      valid: false,
      reason: `evidenceGraphResult.reasonCode invalide: ${reasonCode || 'vide'}.`
    };
  }

  const sourceReasonCode = REASON_CODE_SET.has(normalizeText(result.diagnostics?.sourceReasonCode))
    ? normalizeText(result.diagnostics.sourceReasonCode)
    : reasonCode;

  if (!result.allowed) {
    if (!UPSTREAM_BLOCKING_REASON_CODES.has(reasonCode)) {
      return {
        valid: false,
        reason: `evidenceGraphResult.reasonCode non propagable: ${reasonCode}.`
      };
    }

    return {
      valid: true,
      blocked: true,
      reasonCode,
      sourceReasonCode,
      reason: normalizeText(result.reason) || `Source evidence graph bloquée (${reasonCode}).`,
      correctiveActions: normalizeCorrectiveActions(reasonCode, result.correctiveActions)
    };
  }

  if (!isObject(result.graph) || !Array.isArray(result.graph.nodes)) {
    return {
      valid: false,
      reason: 'evidenceGraphResult.graph.nodes invalide: tableau attendu quand allowed=true.'
    };
  }

  if (!isObject(result.decisionBacklinks)) {
    return {
      valid: false,
      reason: 'evidenceGraphResult.decisionBacklinks invalide: objet attendu quand allowed=true.'
    };
  }

  return {
    valid: true,
    blocked: false,
    sourceReasonCode,
    graphNodes: result.graph.nodes.map((entry) => cloneValue(entry)),
    decisionBacklinks: cloneValue(result.decisionBacklinks)
  };
}

function resolveSource(payload, runtimeOptions) {
  if (payload.evidenceGraphResult !== undefined) {
    return normalizeEvidenceGraphResult(payload.evidenceGraphResult);
  }

  if (payload.evidenceGraphInput !== undefined) {
    if (!isObject(payload.evidenceGraphInput)) {
      return {
        valid: false,
        reason: 'evidenceGraphInput invalide: objet attendu.'
      };
    }

    const delegatedOptions = isObject(runtimeOptions.evidenceGraphOptions)
      ? runtimeOptions.evidenceGraphOptions
      : {};

    let delegatedResult;

    try {
      delegatedResult = buildArtifactEvidenceGraph(payload.evidenceGraphInput, delegatedOptions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        reason: `buildArtifactEvidenceGraph a levé une exception: ${message}`
      };
    }

    return normalizeEvidenceGraphResult(delegatedResult);
  }

  return {
    valid: false,
    reason: 'Aucune source exploitable: fournir evidenceGraphResult ou evidenceGraphInput.'
  };
}

function normalizeArtifactNode(rawNode) {
  if (!isObject(rawNode) || normalizeText(rawNode.nodeType) !== 'artifact') {
    return null;
  }

  const artifactId =
    normalizeText(rawNode.artifactId) ||
    (normalizeText(rawNode.nodeId).startsWith('artifact:')
      ? normalizeText(rawNode.nodeId).slice('artifact:'.length)
      : '');

  if (artifactId.length === 0) {
    return null;
  }

  return {
    artifactId,
    artifactPath: normalizeText(rawNode.artifactPath),
    artifactType: normalizeText(rawNode.artifactType) || 'artifact',
    updatedAt:
      normalizeText(rawNode.updatedAt) ||
      normalizeText(rawNode.lastUpdatedAt) ||
      normalizeText(rawNode.generatedAt) ||
      normalizeText(rawNode.createdAt),
    decisionRefs: []
  };
}

function addArtifactRegistryEntry(registry, entry) {
  if (!registry.has(entry.artifactId)) {
    registry.set(entry.artifactId, {
      artifactId: entry.artifactId,
      artifactPath: entry.artifactPath,
      artifactType: entry.artifactType,
      updatedAt: entry.updatedAt,
      decisionRefs: normalizeArray(entry.decisionRefs)
    });
    return;
  }

  const existing = registry.get(entry.artifactId);

  if (existing.artifactPath.length === 0 && entry.artifactPath.length > 0) {
    existing.artifactPath = entry.artifactPath;
  }

  if (existing.artifactType === 'artifact' && entry.artifactType !== 'artifact') {
    existing.artifactType = entry.artifactType;
  }

  if (existing.updatedAt.length === 0 && entry.updatedAt.length > 0) {
    existing.updatedAt = entry.updatedAt;
  }

  existing.decisionRefs = normalizeArray([...existing.decisionRefs, ...entry.decisionRefs]);
}

function resolveArtifactRegistry(graphNodes, decisionBacklinks) {
  const registry = new Map();

  for (const rawNode of graphNodes) {
    const normalized = normalizeArtifactNode(rawNode);

    if (!normalized) {
      continue;
    }

    addArtifactRegistryEntry(registry, normalized);
  }

  for (const [decisionId, backlinks] of Object.entries(decisionBacklinks)) {
    const normalizedDecisionId = normalizeText(decisionId);

    if (normalizedDecisionId.length === 0 || !Array.isArray(backlinks)) {
      continue;
    }

    for (const backlink of backlinks) {
      if (!isObject(backlink)) {
        continue;
      }

      const artifactId = normalizeText(backlink.artifactId);

      if (artifactId.length === 0) {
        continue;
      }

      addArtifactRegistryEntry(registry, {
        artifactId,
        artifactPath: normalizeText(backlink.artifactPath),
        artifactType: normalizeText(backlink.artifactType) || 'artifact',
        updatedAt: normalizeText(backlink.updatedAt),
        decisionRefs: [normalizedDecisionId]
      });
    }
  }

  return registry;
}

function resolveArtifactTimestamp(artifact, timestampMap) {
  const byId = timestampMap.get(artifact.artifactId);

  if (byId) {
    return byId;
  }

  const byPath = timestampMap.get(artifact.artifactPath);

  if (byPath) {
    return byPath;
  }

  const normalizedFromArtifact = normalizeTimestampValue(artifact.updatedAt, `updatedAt(${artifact.artifactId})`);

  if (!normalizedFromArtifact.valid || !normalizedFromArtifact.present) {
    return null;
  }

  return {
    ms: normalizedFromArtifact.ms,
    iso: normalizedFromArtifact.iso
  };
}

function resolveStalenessLevel(ageSeconds, maxAgeSeconds) {
  if (ageSeconds <= maxAgeSeconds) {
    return 'fresh';
  }

  if (ageSeconds <= maxAgeSeconds * 2) {
    return 'warning';
  }

  return 'critical';
}

function compareArtifacts(left, right) {
  return left.artifactId.localeCompare(right.artifactId);
}

function buildDecisionFreshness(decisionBacklinks, artifactsById) {
  const output = {};

  for (const decisionId of Object.keys(decisionBacklinks).sort((left, right) => left.localeCompare(right))) {
    const backlinks = decisionBacklinks[decisionId];

    if (!Array.isArray(backlinks)) {
      continue;
    }

    const uniqueArtifacts = new Map();

    for (const backlink of backlinks) {
      if (!isObject(backlink)) {
        continue;
      }

      const artifactId = normalizeText(backlink.artifactId);

      if (artifactId.length === 0 || uniqueArtifacts.has(artifactId)) {
        continue;
      }

      const boardEntry = artifactsById.get(artifactId);

      if (!boardEntry) {
        continue;
      }

      uniqueArtifacts.set(artifactId, {
        artifactId: boardEntry.artifactId,
        artifactPath: boardEntry.artifactPath,
        artifactType: boardEntry.artifactType,
        updatedAt: boardEntry.updatedAt,
        ageSeconds: boardEntry.ageSeconds,
        isStale: boardEntry.isStale,
        stalenessLevel: boardEntry.stalenessLevel
      });
    }

    output[decisionId] = [...uniqueArtifacts.values()].sort(compareArtifacts);
  }

  return output;
}

export function buildArtifactStalenessIndicator(input, options = {}) {
  const payload = isObject(input) ? input : {};
  const runtimeOptions = isObject(options) ? options : {};
  const nowMs = resolveNowProvider(runtimeOptions);
  const startedAtMs = nowMs();

  const maxAgeResolution = resolveMaxAgeSeconds(payload, runtimeOptions);

  if (!maxAgeResolution.valid) {
    return createInvalidInputResult(maxAgeResolution.reason, {
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  const rebuildResolution = resolveRebuildDurationMs(payload);

  if (!rebuildResolution.valid) {
    return createInvalidInputResult(rebuildResolution.reason, {
      maxAgeSeconds: maxAgeResolution.maxAgeSeconds,
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  const sourceResolution = resolveSource(payload, runtimeOptions);

  if (!sourceResolution.valid) {
    return createInvalidInputResult(sourceResolution.reason, {
      maxAgeSeconds: maxAgeResolution.maxAgeSeconds,
      rebuildDurationMs: rebuildResolution.rebuildDurationMs,
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  if (sourceResolution.blocked) {
    return createBlockedResult({
      reasonCode: sourceResolution.reasonCode,
      reason: sourceResolution.reason,
      sourceReasonCode: sourceResolution.sourceReasonCode,
      maxAgeSeconds: maxAgeResolution.maxAgeSeconds,
      rebuildDurationMs: rebuildResolution.rebuildDurationMs,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      correctiveActions: sourceResolution.correctiveActions
    });
  }

  if (rebuildResolution.rebuildDurationMs > 60_000) {
    return createTimeoutResult({
      maxAgeSeconds: maxAgeResolution.maxAgeSeconds,
      rebuildDurationMs: rebuildResolution.rebuildDurationMs,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
    });
  }

  const ledgerResolution = resolveEventLedger(payload);

  if (!ledgerResolution.valid) {
    return createInvalidInputResult(ledgerResolution.reason, {
      maxAgeSeconds: maxAgeResolution.maxAgeSeconds,
      rebuildDurationMs: rebuildResolution.rebuildDurationMs,
      sourceReasonCode: sourceResolution.sourceReasonCode,
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  if (ledgerResolution.gapDetected) {
    return createLedgerGapResult({
      reason: ledgerResolution.reason,
      maxAgeSeconds: maxAgeResolution.maxAgeSeconds,
      rebuildDurationMs: rebuildResolution.rebuildDurationMs,
      sourceReasonCode: sourceResolution.sourceReasonCode,
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  const timestampMapResolution = resolveArtifactTimestampMap(payload);

  if (!timestampMapResolution.valid) {
    return createInvalidInputResult(timestampMapResolution.reason, {
      maxAgeSeconds: maxAgeResolution.maxAgeSeconds,
      rebuildDurationMs: rebuildResolution.rebuildDurationMs,
      sourceReasonCode: sourceResolution.sourceReasonCode,
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  const artifactRegistry = resolveArtifactRegistry(sourceResolution.graphNodes, sourceResolution.decisionBacklinks);
  const artifacts = [...artifactRegistry.values()].sort(compareArtifacts);
  const perArtifactDurations = [];
  const stalenessArtifacts = [];
  const artifactsById = new Map();

  for (const artifact of artifacts) {
    const artifactStartMs = nowMs();
    const resolvedTimestamp = resolveArtifactTimestamp(artifact, timestampMapResolution.byKey);

    let ageSeconds = maxAgeResolution.maxAgeSeconds + 1;
    let updatedAt = null;

    if (resolvedTimestamp) {
      ageSeconds = Math.max(0, Math.trunc((nowMs() - resolvedTimestamp.ms) / 1000));
      updatedAt = resolvedTimestamp.iso;
    }

    const stalenessLevel = resolveStalenessLevel(ageSeconds, maxAgeResolution.maxAgeSeconds);
    const isStale = ageSeconds > maxAgeResolution.maxAgeSeconds;

    const boardEntry = {
      artifactId: artifact.artifactId,
      artifactPath: artifact.artifactPath,
      artifactType: artifact.artifactType,
      updatedAt,
      ageSeconds,
      maxAgeSeconds: maxAgeResolution.maxAgeSeconds,
      isStale,
      stalenessLevel,
      decisionRefs: normalizeArray(artifact.decisionRefs)
    };

    if (isStale) {
      stalenessArtifacts.push(boardEntry);
    }

    artifactsById.set(boardEntry.artifactId, boardEntry);
    perArtifactDurations.push(toDurationMs(artifactStartMs, nowMs()));
  }

  const staleCount = stalenessArtifacts.length;
  const artifactsCount = artifacts.length;
  const staleRatio = artifactsCount === 0 ? 0 : Number((staleCount / artifactsCount).toFixed(4));

  const decisionFreshness = buildDecisionFreshness(sourceResolution.decisionBacklinks, artifactsById);
  const orderedArtifacts = [...artifactsById.values()].sort(compareArtifacts);
  const highestAgeSeconds = orderedArtifacts.reduce(
    (maxValue, artifact) => Math.max(maxValue, artifact.ageSeconds),
    0
  );

  const diagnostics = {
    artifactsCount,
    staleCount,
    staleRatio,
    maxAgeSeconds: maxAgeResolution.maxAgeSeconds,
    rebuildDurationMs: rebuildResolution.rebuildDurationMs,
    durationMs: toDurationMs(startedAtMs, nowMs()),
    p95StalenessMs: computePercentile(perArtifactDurations, 95),
    sourceReasonCode: sourceResolution.sourceReasonCode
  };

  const stalenessBoard = {
    staleButAvailable: true,
    maxAgeSeconds: maxAgeResolution.maxAgeSeconds,
    artifacts: orderedArtifacts,
    summary: {
      artifactsCount,
      staleCount,
      staleRatio,
      maxAgeSeconds: maxAgeResolution.maxAgeSeconds,
      highestAgeSeconds
    }
  };

  if (staleCount > 0) {
    return createResult({
      allowed: true,
      reasonCode: 'ARTIFACT_STALENESS_DETECTED',
      reason: `Staleness détecté: ${staleCount}/${artifactsCount} artefact(s) au-delà de maxAgeSeconds=${maxAgeResolution.maxAgeSeconds}.`,
      diagnostics,
      stalenessBoard,
      decisionFreshness,
      correctiveActions: ['REFRESH_STALE_ARTIFACTS']
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: `Staleness check OK: ${artifactsCount} artefact(s), staleCount=${staleCount}, maxAgeSeconds=${maxAgeResolution.maxAgeSeconds}.`,
    diagnostics,
    stalenessBoard,
    decisionFreshness,
    correctiveActions: []
  });
}
