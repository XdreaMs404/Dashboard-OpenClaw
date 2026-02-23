import { applyArtifactContextFilters } from './artifact-context-filter.js';

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
  'INVALID_ARTIFACT_DIFF_INPUT'
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
  'INVALID_ARTIFACT_CONTEXT_FILTER_INPUT'
]);

const DEFAULT_ACTION_BY_REASON = Object.freeze({
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
  INVALID_ARTIFACT_DIFF_INPUT: 'FIX_DIFF_INPUT'
});

const DEFAULT_DIAGNOSTICS = Object.freeze({
  requestedCandidatesCount: 0,
  comparedPairsCount: 0,
  unresolvedCount: 0,
  durationMs: 0,
  p95DiffMs: 0,
  sourceReasonCode: 'OK'
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

function normalizeLower(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((entry) => normalizeText(String(entry ?? ''))).filter((entry) => entry.length > 0);
}

function normalizeStringSet(value) {
  return [...new Set(normalizeArray(value))].sort((left, right) => left.localeCompare(right));
}

function normalizeSectionArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => {
      if (typeof entry === 'string') {
        return normalizeText(entry);
      }

      if (!isObject(entry)) {
        return '';
      }

      return (
        normalizeText(entry.headingText) ||
        normalizeText(entry.title) ||
        normalizeText(entry.anchor) ||
        normalizeText(entry.content)
      );
    })
    .filter((entry) => entry.length > 0);
}

function normalizeTablesArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const rows = [];

  for (const table of value) {
    if (typeof table === 'string') {
      const normalized = normalizeText(table);

      if (normalized.length > 0) {
        rows.push(normalized);
      }

      continue;
    }

    if (!isObject(table)) {
      continue;
    }

    const headers = Array.isArray(table.headers)
      ? table.headers.map((cell) => normalizeText(String(cell ?? '')))
      : [];

    const tableRows = Array.isArray(table.rows)
      ? table.rows
          .filter((entry) => Array.isArray(entry))
          .map((entry) => entry.map((cell) => normalizeText(String(cell ?? ''))))
      : [];

    const lines = [];

    if (headers.length > 0) {
      lines.push(headers.join(' | '));
    }

    for (const row of tableRows) {
      lines.push(row.join(' | '));
    }

    const fallback = normalizeText(table.text) || normalizeText(table.snippet);
    const text = normalizeText(lines.join(' \n ')) || fallback;

    if (text.length > 0) {
      rows.push(text);
    }
  }

  return rows;
}

function normalizeMetadata(raw) {
  const metadata = isObject(raw) ? raw : {};
  const normalized = {};

  for (const [key, value] of Object.entries(metadata)) {
    const normalizedKey = normalizeText(key);

    if (normalizedKey.length === 0) {
      continue;
    }

    if (Array.isArray(value)) {
      normalized[normalizedKey] = normalizeArray(value);
      continue;
    }

    if (isObject(value)) {
      normalized[normalizedKey] = normalizeMetadata(value);
      continue;
    }

    if (value === null || value === undefined) {
      normalized[normalizedKey] = '';
      continue;
    }

    normalized[normalizedKey] = normalizeText(String(value));
  }

  return normalized;
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

function uniqueActions(values) {
  const normalized = [];
  const seen = new Set();

  for (const value of values) {
    const action = normalizeText(value);

    if (action.length === 0 || seen.has(action)) {
      continue;
    }

    seen.add(action);
    normalized.push(action);
  }

  return normalized;
}

function normalizeCorrectiveActions(reasonCode, correctiveActions) {
  const normalized = uniqueActions(Array.isArray(correctiveActions) ? correctiveActions : []);

  if (normalized.length > 0) {
    return normalized;
  }

  const fallback = DEFAULT_ACTION_BY_REASON[reasonCode];
  return fallback ? [fallback] : [];
}

function createDiagnostics(overrides = {}) {
  return {
    requestedCandidatesCount: Number.isInteger(overrides.requestedCandidatesCount)
      ? overrides.requestedCandidatesCount
      : DEFAULT_DIAGNOSTICS.requestedCandidatesCount,
    comparedPairsCount: Number.isInteger(overrides.comparedPairsCount)
      ? overrides.comparedPairsCount
      : DEFAULT_DIAGNOSTICS.comparedPairsCount,
    unresolvedCount: Number.isInteger(overrides.unresolvedCount)
      ? overrides.unresolvedCount
      : DEFAULT_DIAGNOSTICS.unresolvedCount,
    durationMs: Number.isFinite(overrides.durationMs)
      ? Math.max(0, Math.trunc(overrides.durationMs))
      : DEFAULT_DIAGNOSTICS.durationMs,
    p95DiffMs: Number.isFinite(overrides.p95DiffMs)
      ? Math.max(0, Math.trunc(overrides.p95DiffMs))
      : DEFAULT_DIAGNOSTICS.p95DiffMs,
    sourceReasonCode:
      REASON_CODE_SET.has(normalizeText(overrides.sourceReasonCode))
        ? normalizeText(overrides.sourceReasonCode)
        : DEFAULT_DIAGNOSTICS.sourceReasonCode
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  diffResults,
  unresolvedCandidates,
  provenanceLinks,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: createDiagnostics(diagnostics),
    diffResults: (Array.isArray(diffResults) ? diffResults : []).map((entry) => cloneValue(entry)),
    unresolvedCandidates: (Array.isArray(unresolvedCandidates) ? unresolvedCandidates : []).map((entry) =>
      cloneValue(entry)
    ),
    provenanceLinks: (Array.isArray(provenanceLinks) ? provenanceLinks : []).map((entry) => cloneValue(entry)),
    correctiveActions: [...(Array.isArray(correctiveActions) ? correctiveActions : [])]
  };
}

function createInvalidInputResult(reason, context = {}) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_ARTIFACT_DIFF_INPUT',
    reason,
    diagnostics: {
      requestedCandidatesCount: context.requestedCandidatesCount ?? 0,
      comparedPairsCount: 0,
      unresolvedCount: context.unresolvedCount ?? 0,
      durationMs: context.durationMs ?? 0,
      p95DiffMs: 0,
      sourceReasonCode: context.sourceReasonCode ?? 'INVALID_ARTIFACT_DIFF_INPUT'
    },
    diffResults: [],
    unresolvedCandidates: context.unresolvedCandidates ?? [],
    provenanceLinks: [],
    correctiveActions: context.correctiveActions ?? ['FIX_DIFF_INPUT']
  });
}

function createBlockedResult({
  reasonCode,
  reason,
  requestedCandidatesCount,
  sourceReasonCode,
  correctiveActions,
  durationMs
}) {
  return createResult({
    allowed: false,
    reasonCode,
    reason,
    diagnostics: {
      requestedCandidatesCount,
      comparedPairsCount: 0,
      unresolvedCount: 0,
      durationMs,
      p95DiffMs: 0,
      sourceReasonCode
    },
    diffResults: [],
    unresolvedCandidates: [],
    provenanceLinks: [],
    correctiveActions: normalizeCorrectiveActions(reasonCode, correctiveActions)
  });
}

function createNotEligibleResult({
  reason,
  requestedCandidatesCount,
  unresolvedCandidates,
  sourceReasonCode,
  durationMs
}) {
  return createResult({
    allowed: false,
    reasonCode: 'ARTIFACT_DIFF_NOT_ELIGIBLE',
    reason,
    diagnostics: {
      requestedCandidatesCount,
      comparedPairsCount: 0,
      unresolvedCount: unresolvedCandidates.length,
      durationMs,
      p95DiffMs: 0,
      sourceReasonCode: sourceReasonCode || 'ARTIFACT_DIFF_NOT_ELIGIBLE'
    },
    diffResults: [],
    unresolvedCandidates,
    provenanceLinks: [],
    correctiveActions: ['REVIEW_DIFF_CANDIDATES']
  });
}

function isComparableMetadataObject(value) {
  return isObject(value) || value === undefined || value === null;
}

function normalizeComparableArtifact(rawArtifact, label) {
  if (!isObject(rawArtifact)) {
    return {
      valid: false,
      reason: `${label} invalide: objet attendu.`
    };
  }

  const artifactId =
    normalizeText(rawArtifact.artifactId) ||
    normalizeText(rawArtifact.id) ||
    normalizeText(rawArtifact.versionId);

  if (artifactId.length === 0) {
    return {
      valid: false,
      reason: `${label}.artifactId invalide: chaîne non vide requise.`
    };
  }

  const artifactPath = normalizeText(rawArtifact.artifactPath || rawArtifact.path || rawArtifact.filePath);

  if (artifactPath.length === 0) {
    return {
      valid: false,
      reason: `${label}.artifactPath invalide: chaîne non vide requise.`
    };
  }

  const artifactType = normalizeLower(rawArtifact.artifactType || rawArtifact.type || 'artifact');

  const metadataSource = rawArtifact.metadata;

  if (!isComparableMetadataObject(metadataSource)) {
    return {
      valid: false,
      reason: `${label}.metadata invalide: objet attendu si fourni.`
    };
  }

  return {
    valid: true,
    artifact: {
      artifactId,
      artifactPath,
      artifactType: artifactType || 'artifact',
      metadata: normalizeMetadata(metadataSource),
      sections: normalizeSectionArray(rawArtifact.sections),
      tables: normalizeTablesArray(rawArtifact.tables),
      contentSummary: normalizeText(rawArtifact.contentSummary || rawArtifact.summary || rawArtifact.snippet),
      decisionRefs: normalizeStringSet(rawArtifact.decisionRefs),
      gateRefs: normalizeStringSet(rawArtifact.gateRefs),
      commandRefs: normalizeStringSet(rawArtifact.commandRefs),
      sourceGroupKey:
        normalizeText(rawArtifact.groupKey) ||
        normalizeText(rawArtifact.logicalArtifactId) ||
        normalizeText(rawArtifact.artifactLogicalId)
    }
  };
}

function normalizeArtifactPair(rawPair, index) {
  if (!isObject(rawPair)) {
    return {
      valid: false,
      reason: `artifactPairs[${index}] invalide: objet attendu.`
    };
  }

  const groupKey =
    normalizeText(rawPair.groupKey) || normalizeText(rawPair.candidateGroupKey) || `pair-${index + 1}`;

  const leftResolution = normalizeComparableArtifact(rawPair.left, `artifactPairs[${index}].left`);

  if (!leftResolution.valid) {
    return leftResolution;
  }

  const rightResolution = normalizeComparableArtifact(rawPair.right, `artifactPairs[${index}].right`);

  if (!rightResolution.valid) {
    return rightResolution;
  }

  return {
    valid: true,
    pair: {
      groupKey,
      left: leftResolution.artifact,
      right: rightResolution.artifact,
      candidateSource: 'artifactPairs'
    }
  };
}

function normalizeDirectArtifactPairs(payload) {
  if (!Array.isArray(payload.artifactPairs)) {
    return {
      valid: false,
      reason: 'artifactPairs invalide: tableau attendu.'
    };
  }

  const pairs = [];

  for (let index = 0; index < payload.artifactPairs.length; index += 1) {
    const pairResolution = normalizeArtifactPair(payload.artifactPairs[index], index);

    if (!pairResolution.valid) {
      return pairResolution;
    }

    pairs.push(pairResolution.pair);
  }

  return {
    valid: true,
    pairs,
    sourceReasonCode: 'OK'
  };
}

function normalizeContextFilterResult(result) {
  if (!isObject(result)) {
    return {
      valid: false,
      reason: 'contextFilterResult invalide: objet attendu.'
    };
  }

  if (typeof result.allowed !== 'boolean') {
    return {
      valid: false,
      reason: 'contextFilterResult.allowed invalide: booléen attendu.'
    };
  }

  const reasonCode = normalizeText(result.reasonCode);

  if (!REASON_CODE_SET.has(reasonCode)) {
    return {
      valid: false,
      reason: `contextFilterResult.reasonCode invalide: ${reasonCode || 'vide'}.`
    };
  }

  const reason = normalizeText(result.reason) || `Résultat S018 invalide (${reasonCode}).`;
  const sourceReasonCode = REASON_CODE_SET.has(normalizeText(result.diagnostics?.sourceReasonCode))
    ? normalizeText(result.diagnostics.sourceReasonCode)
    : reasonCode;

  if (!result.allowed) {
    if (!UPSTREAM_BLOCKING_REASON_CODES.has(reasonCode)) {
      return {
        valid: false,
        reason: `contextFilterResult.reasonCode non propagable: ${reasonCode}.`
      };
    }

    return {
      valid: true,
      blocked: true,
      reasonCode,
      reason,
      requestedCandidatesCount: Math.max(
        0,
        Math.trunc(result.diagnostics?.diffCandidateGroupsCount ?? result.diagnostics?.filteredCount ?? 0)
      ),
      sourceReasonCode,
      correctiveActions: normalizeCorrectiveActions(reasonCode, result.correctiveActions)
    };
  }

  if (!Array.isArray(result.diffCandidates)) {
    return {
      valid: false,
      reason: 'contextFilterResult.diffCandidates invalide: tableau attendu quand allowed=true.'
    };
  }

  const resultsById = new Map();

  if (Array.isArray(result.filteredResults)) {
    for (const rawEntry of result.filteredResults) {
      const artifactId = normalizeText(rawEntry?.artifactId);

      if (artifactId.length === 0) {
        continue;
      }

      resultsById.set(artifactId, rawEntry);
    }
  }

  const pairs = [];
  const unresolvedCandidates = [];

  for (let index = 0; index < result.diffCandidates.length; index += 1) {
    const candidate = result.diffCandidates[index];

    if (!isObject(candidate)) {
      unresolvedCandidates.push({
        groupKey: `candidate-${index + 1}`,
        reasonCode: 'ARTIFACT_DIFF_NOT_ELIGIBLE',
        reason: 'Candidate diff invalide: objet attendu.',
        candidateSource: 'contextFilterResult.diffCandidates'
      });
      continue;
    }

    const groupKey = normalizeText(candidate.groupKey) || `candidate-${index + 1}`;
    const artifactIds = normalizeStringSet(candidate.artifactIds);

    if (artifactIds.length < 2) {
      unresolvedCandidates.push({
        groupKey,
        reasonCode: 'ARTIFACT_DIFF_NOT_ELIGIBLE',
        reason: 'Candidate diff non éligible: au moins 2 versions requises.',
        candidateSource: 'contextFilterResult.diffCandidates'
      });
      continue;
    }

    const leftRaw = resultsById.get(artifactIds[0]);
    const rightRaw = resultsById.get(artifactIds[artifactIds.length - 1]);

    if (!leftRaw || !rightRaw) {
      unresolvedCandidates.push({
        groupKey,
        reasonCode: 'ARTIFACT_DIFF_NOT_ELIGIBLE',
        reason: 'Candidate diff non éligible: versions introuvables dans filteredResults.',
        candidateSource: 'contextFilterResult.diffCandidates',
        artifactIds
      });
      continue;
    }

    const leftResolution = normalizeComparableArtifact(
      {
        ...leftRaw,
        artifactId: artifactIds[0],
        groupKey,
        decisionRefs: leftRaw.decisionRefs,
        gateRefs: leftRaw.gateRefs,
        commandRefs: leftRaw.commandRefs,
        metadata: leftRaw.metadata,
        sections: leftRaw.sections,
        tables: leftRaw.tables,
        contentSummary: leftRaw.contentSummary || leftRaw.snippet
      },
      `contextFilterResult.filteredResults[artifactId=${artifactIds[0]}]`
    );

    if (!leftResolution.valid) {
      unresolvedCandidates.push({
        groupKey,
        reasonCode: 'ARTIFACT_DIFF_NOT_ELIGIBLE',
        reason: leftResolution.reason,
        candidateSource: 'contextFilterResult.diffCandidates',
        artifactIds
      });
      continue;
    }

    const rightResolution = normalizeComparableArtifact(
      {
        ...rightRaw,
        artifactId: artifactIds[artifactIds.length - 1],
        groupKey,
        decisionRefs: rightRaw.decisionRefs,
        gateRefs: rightRaw.gateRefs,
        commandRefs: rightRaw.commandRefs,
        metadata: rightRaw.metadata,
        sections: rightRaw.sections,
        tables: rightRaw.tables,
        contentSummary: rightRaw.contentSummary || rightRaw.snippet
      },
      `contextFilterResult.filteredResults[artifactId=${artifactIds[artifactIds.length - 1]}]`
    );

    if (!rightResolution.valid) {
      unresolvedCandidates.push({
        groupKey,
        reasonCode: 'ARTIFACT_DIFF_NOT_ELIGIBLE',
        reason: rightResolution.reason,
        candidateSource: 'contextFilterResult.diffCandidates',
        artifactIds
      });
      continue;
    }

    pairs.push({
      groupKey,
      left: leftResolution.artifact,
      right: rightResolution.artifact,
      candidateSource: 'contextFilterResult.diffCandidates',
      artifactIds
    });
  }

  return {
    valid: true,
    blocked: false,
    pairs,
    unresolvedCandidates,
    sourceReasonCode
  };
}

function resolveSource(payload, runtimeOptions) {
  if (payload.contextFilterResult !== undefined) {
    return normalizeContextFilterResult(payload.contextFilterResult);
  }

  if (payload.contextFilterInput !== undefined) {
    if (!isObject(payload.contextFilterInput)) {
      return {
        valid: false,
        reason: 'contextFilterInput invalide: objet attendu.'
      };
    }

    const delegatedOptions = isObject(runtimeOptions.contextFilterOptions)
      ? runtimeOptions.contextFilterOptions
      : {};

    const delegated = applyArtifactContextFilters(payload.contextFilterInput, delegatedOptions);
    return normalizeContextFilterResult(delegated);
  }

  if (payload.artifactPairs !== undefined) {
    return normalizeDirectArtifactPairs(payload);
  }

  return {
    valid: false,
    reason: 'Aucune source exploitable: fournir contextFilterResult, contextFilterInput ou artifactPairs.'
  };
}

function sortValues(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function diffSet(leftValues, rightValues) {
  const left = new Set(leftValues);
  const right = new Set(rightValues);

  const added = sortValues([...right].filter((value) => !left.has(value)));
  const removed = sortValues([...left].filter((value) => !right.has(value)));
  const unchanged = sortValues([...right].filter((value) => left.has(value)));

  return {
    added,
    removed,
    unchanged,
    changed: added.length > 0 || removed.length > 0
  };
}

function toComparable(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => toComparable(entry));
  }

  if (isObject(value)) {
    const keys = Object.keys(value).sort((left, right) => left.localeCompare(right));
    const normalized = {};

    for (const key of keys) {
      normalized[key] = toComparable(value[key]);
    }

    return normalized;
  }

  return value;
}

function valuesEqual(left, right) {
  return JSON.stringify(toComparable(left)) === JSON.stringify(toComparable(right));
}

function diffMetadata(leftMetadata, rightMetadata) {
  const leftKeys = Object.keys(leftMetadata).sort((left, right) => left.localeCompare(right));
  const rightKeys = Object.keys(rightMetadata).sort((left, right) => left.localeCompare(right));

  const leftSet = new Set(leftKeys);
  const rightSet = new Set(rightKeys);

  const added = [];
  const removed = [];
  const changed = [];
  const unchanged = [];

  for (const key of rightKeys) {
    if (!leftSet.has(key)) {
      added.push({ key, value: cloneValue(rightMetadata[key]) });
      continue;
    }

    if (!valuesEqual(leftMetadata[key], rightMetadata[key])) {
      changed.push({
        key,
        leftValue: cloneValue(leftMetadata[key]),
        rightValue: cloneValue(rightMetadata[key])
      });
      continue;
    }

    unchanged.push(key);
  }

  for (const key of leftKeys) {
    if (!rightSet.has(key)) {
      removed.push({ key, value: cloneValue(leftMetadata[key]) });
    }
  }

  return {
    added,
    removed,
    changed,
    unchanged: sortValues(unchanged)
  };
}

function buildContentSummary(leftSummary, rightSummary) {
  if (leftSummary.length === 0 && rightSummary.length === 0) {
    return {
      changed: false,
      left: '',
      right: ''
    };
  }

  return {
    changed: leftSummary !== rightSummary,
    left: leftSummary,
    right: rightSummary
  };
}

function comparePairs(leftPair, rightPair) {
  const groupCmp = leftPair.groupKey.localeCompare(rightPair.groupKey);

  if (groupCmp !== 0) {
    return groupCmp;
  }

  const leftCmp = leftPair.left.artifactId.localeCompare(rightPair.left.artifactId);

  if (leftCmp !== 0) {
    return leftCmp;
  }

  return leftPair.right.artifactId.localeCompare(rightPair.right.artifactId);
}

function compareDiffResults(left, right) {
  const groupCmp = left.groupKey.localeCompare(right.groupKey);

  if (groupCmp !== 0) {
    return groupCmp;
  }

  const leftCmp = left.leftArtifactId.localeCompare(right.leftArtifactId);

  if (leftCmp !== 0) {
    return leftCmp;
  }

  return left.rightArtifactId.localeCompare(right.rightArtifactId);
}

function compareUnresolved(left, right) {
  return normalizeText(left.groupKey).localeCompare(normalizeText(right.groupKey));
}

function compareProvenance(left, right) {
  return normalizeText(left.groupKey).localeCompare(normalizeText(right.groupKey));
}

function buildPairDiff(pair) {
  const metadata = diffMetadata(pair.left.metadata, pair.right.metadata);
  const sections = diffSet(pair.left.sections, pair.right.sections);
  const tables = diffSet(pair.left.tables, pair.right.tables);
  const contentSummary = buildContentSummary(pair.left.contentSummary, pair.right.contentSummary);

  return {
    groupKey: pair.groupKey,
    leftArtifactId: pair.left.artifactId,
    rightArtifactId: pair.right.artifactId,
    leftArtifactPath: pair.left.artifactPath,
    rightArtifactPath: pair.right.artifactPath,
    artifactType: pair.left.artifactType || pair.right.artifactType || 'artifact',
    changes: {
      metadata,
      sections,
      tables,
      contentSummary
    },
    changed:
      metadata.added.length > 0 ||
      metadata.removed.length > 0 ||
      metadata.changed.length > 0 ||
      sections.changed ||
      tables.changed ||
      contentSummary.changed,
    candidateSource: pair.candidateSource
  };
}

function buildProvenanceLink(pair) {
  return {
    groupKey: pair.groupKey,
    leftArtifactId: pair.left.artifactId,
    rightArtifactId: pair.right.artifactId,
    decisionRefs: normalizeStringSet([...pair.left.decisionRefs, ...pair.right.decisionRefs]),
    gateRefs: normalizeStringSet([...pair.left.gateRefs, ...pair.right.gateRefs]),
    commandRefs: normalizeStringSet([...pair.left.commandRefs, ...pair.right.commandRefs])
  };
}

function resolveNowProvider(runtimeOptions) {
  return typeof runtimeOptions.nowMs === 'function' ? runtimeOptions.nowMs : () => Date.now();
}

export function diffArtifactVersions(input, options = {}) {
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
      requestedCandidatesCount: sourceResolution.requestedCandidatesCount,
      sourceReasonCode: sourceResolution.sourceReasonCode,
      correctiveActions: sourceResolution.correctiveActions,
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  const unresolvedCandidates = Array.isArray(sourceResolution.unresolvedCandidates)
    ? sourceResolution.unresolvedCandidates.map((entry) => cloneValue(entry))
    : [];

  const pairs = Array.isArray(sourceResolution.pairs) ? sourceResolution.pairs.map((entry) => cloneValue(entry)) : [];

  if (pairs.length === 0) {
    const reason =
      unresolvedCandidates.length > 0
        ? 'Aucun candidat diff éligible: vérifier les versions et métadonnées de comparaison.'
        : 'Aucun candidat diff éligible: au moins une paire de versions est requise.';

    return createNotEligibleResult({
      reason,
      requestedCandidatesCount: unresolvedCandidates.length,
      unresolvedCandidates: unresolvedCandidates.sort(compareUnresolved),
      sourceReasonCode: sourceResolution.sourceReasonCode,
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  pairs.sort(comparePairs);

  const diffDurations = [];
  const diffResults = [];
  const provenanceLinks = [];

  for (const pair of pairs) {
    const pairStartedAtMs = nowMs();
    diffResults.push(buildPairDiff(pair));
    provenanceLinks.push(buildProvenanceLink(pair));
    diffDurations.push(toDurationMs(pairStartedAtMs, nowMs()));
  }

  diffResults.sort(compareDiffResults);
  provenanceLinks.sort(compareProvenance);
  unresolvedCandidates.sort(compareUnresolved);

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: `Diff version-vers-version exécuté: ${diffResults.length} paire(s) comparée(s), ${unresolvedCandidates.length} candidate(s) non éligible(s).`,
    diagnostics: {
      requestedCandidatesCount: diffResults.length + unresolvedCandidates.length,
      comparedPairsCount: diffResults.length,
      unresolvedCount: unresolvedCandidates.length,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      p95DiffMs: computePercentile(diffDurations, 95),
      sourceReasonCode: sourceResolution.sourceReasonCode || 'OK'
    },
    diffResults,
    unresolvedCandidates,
    provenanceLinks,
    correctiveActions: unresolvedCandidates.length > 0 ? ['REVIEW_DIFF_CANDIDATES'] : []
  });
}
