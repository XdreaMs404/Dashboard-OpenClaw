import { diffArtifactVersions } from './artifact-version-diff.js';

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
  'INVALID_EVIDENCE_GRAPH_INPUT'
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
  'INVALID_ARTIFACT_DIFF_INPUT'
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
  INVALID_EVIDENCE_GRAPH_INPUT: 'FIX_EVIDENCE_GRAPH_INPUT'
});

const EMPTY_GRAPH = Object.freeze({
  nodes: [],
  edges: [],
  clusters: []
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
  graph = EMPTY_GRAPH,
  decisionBacklinks = {},
  orphanEvidence = [],
  correctiveActions = []
}) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: {
      nodesCount: diagnostics.nodesCount,
      edgesCount: diagnostics.edgesCount,
      decisionsCount: diagnostics.decisionsCount,
      backlinkedArtifactsCount: diagnostics.backlinkedArtifactsCount,
      orphanCount: diagnostics.orphanCount,
      durationMs: diagnostics.durationMs,
      p95GraphMs: diagnostics.p95GraphMs,
      sourceReasonCode: diagnostics.sourceReasonCode
    },
    graph: {
      nodes: graph.nodes.map((entry) => cloneValue(entry)),
      edges: graph.edges.map((entry) => cloneValue(entry)),
      clusters: graph.clusters.map((entry) => cloneValue(entry))
    },
    decisionBacklinks: cloneValue(decisionBacklinks),
    orphanEvidence: orphanEvidence.map((entry) => cloneValue(entry)),
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidInputResult(reason, context = {}) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_EVIDENCE_GRAPH_INPUT',
    reason,
    diagnostics: {
      nodesCount: 0,
      edgesCount: 0,
      decisionsCount: 0,
      backlinkedArtifactsCount: 0,
      orphanCount: context.orphanCount ?? 0,
      durationMs: context.durationMs ?? 0,
      p95GraphMs: 0,
      sourceReasonCode: context.sourceReasonCode ?? 'INVALID_EVIDENCE_GRAPH_INPUT'
    },
    graph: context.graph ?? EMPTY_GRAPH,
    decisionBacklinks: context.decisionBacklinks ?? {},
    orphanEvidence: context.orphanEvidence ?? [],
    correctiveActions: context.correctiveActions ?? ['FIX_EVIDENCE_GRAPH_INPUT']
  });
}

function createBlockedResult({ reasonCode, reason, sourceReasonCode, durationMs, correctiveActions }) {
  return createResult({
    allowed: false,
    reasonCode,
    reason,
    diagnostics: {
      nodesCount: 0,
      edgesCount: 0,
      decisionsCount: 0,
      backlinkedArtifactsCount: 0,
      orphanCount: 0,
      durationMs,
      p95GraphMs: 0,
      sourceReasonCode
    },
    graph: EMPTY_GRAPH,
    decisionBacklinks: {},
    orphanEvidence: [],
    correctiveActions: normalizeCorrectiveActions(reasonCode, correctiveActions)
  });
}

function createIncompleteResult({
  reason,
  graph,
  decisionBacklinks,
  orphanEvidence,
  diagnostics,
  sourceReasonCode,
  durationMs,
  p95GraphMs
}) {
  return createResult({
    allowed: false,
    reasonCode: 'EVIDENCE_LINK_INCOMPLETE',
    reason,
    diagnostics: {
      nodesCount: diagnostics.nodesCount,
      edgesCount: diagnostics.edgesCount,
      decisionsCount: diagnostics.decisionsCount,
      backlinkedArtifactsCount: diagnostics.backlinkedArtifactsCount,
      orphanCount: orphanEvidence.length,
      durationMs,
      p95GraphMs,
      sourceReasonCode
    },
    graph,
    decisionBacklinks,
    orphanEvidence,
    correctiveActions: ['LINK_OR_RESTORE_EVIDENCE']
  });
}

function createDecisionNotFoundResult({
  decisionId,
  graph,
  decisionBacklinks,
  orphanEvidence,
  diagnostics,
  sourceReasonCode,
  durationMs,
  p95GraphMs
}) {
  return createResult({
    allowed: false,
    reasonCode: 'DECISION_NOT_FOUND',
    reason: `Aucune décision trouvée pour decisionId=${decisionId}.`,
    diagnostics: {
      nodesCount: diagnostics.nodesCount,
      edgesCount: diagnostics.edgesCount,
      decisionsCount: diagnostics.decisionsCount,
      backlinkedArtifactsCount: diagnostics.backlinkedArtifactsCount,
      orphanCount: orphanEvidence.length,
      durationMs,
      p95GraphMs,
      sourceReasonCode
    },
    graph,
    decisionBacklinks,
    orphanEvidence,
    correctiveActions: ['VERIFY_DECISION_ID']
  });
}

function buildPairKey(groupKey, leftArtifactId, rightArtifactId) {
  return `${groupKey}::${leftArtifactId}::${rightArtifactId}`;
}

function resolveDecisionQuery(payload) {
  const candidate = payload.decisionId ?? payload.query?.decisionId;

  if (candidate === undefined) {
    return {
      valid: true,
      decisionId: null
    };
  }

  const decisionId = normalizeText(String(candidate));

  if (decisionId.length === 0) {
    return {
      valid: false,
      reason: 'decisionId invalide: chaîne non vide requise.'
    };
  }

  return {
    valid: true,
    decisionId
  };
}

function toOrphanEvidence({ groupKey, artifactId, artifactPath, reason, candidateSource, details }) {
  return {
    groupKey,
    artifactId: artifactId || null,
    artifactPath: artifactPath || null,
    reasonCode: 'EVIDENCE_LINK_INCOMPLETE',
    reason,
    candidateSource,
    details: details ? cloneValue(details) : null
  };
}

function normalizeGraphEntry(rawEntry, index) {
  if (!isObject(rawEntry)) {
    return {
      valid: false,
      reason: `graphEntries[${index}] invalide: objet attendu.`
    };
  }

  const groupKey = normalizeText(rawEntry.groupKey) || `entry-${index + 1}`;
  const artifactId =
    normalizeText(rawEntry.artifactId) ||
    normalizeText(rawEntry.id) ||
    normalizeText(rawEntry.versionId);
  const artifactPath =
    normalizeText(rawEntry.artifactPath) ||
    normalizeText(rawEntry.path) ||
    normalizeText(rawEntry.filePath);
  const artifactType =
    normalizeText(rawEntry.artifactType) || normalizeText(rawEntry.type) || 'artifact';

  if (artifactId.length === 0 || artifactPath.length === 0) {
    return {
      valid: true,
      orphan: toOrphanEvidence({
        groupKey,
        artifactId,
        artifactPath,
        reason: 'Lien incomplet: artifactId/artifactPath requis.',
        candidateSource: 'graphEntries'
      })
    };
  }

  const decisionRefs = normalizeArray(rawEntry.decisionRefs);
  const gateRefs = normalizeArray(rawEntry.gateRefs);
  const commandRefs = normalizeArray(rawEntry.commandRefs);

  if (decisionRefs.length === 0 || gateRefs.length === 0 || commandRefs.length === 0) {
    return {
      valid: true,
      orphan: toOrphanEvidence({
        groupKey,
        artifactId,
        artifactPath,
        reason: 'Lien incomplet: decisionRefs/gateRefs/commandRefs requis.',
        candidateSource: 'graphEntries'
      })
    };
  }

  return {
    valid: true,
    entry: {
      groupKey,
      artifactId,
      artifactPath,
      artifactType,
      decisionRefs,
      gateRefs,
      commandRefs,
      candidateSource: 'graphEntries'
    }
  };
}

function normalizeGraphEntries(rawEntries) {
  if (!Array.isArray(rawEntries)) {
    return {
      valid: false,
      reason: 'graphEntries invalide: tableau attendu.'
    };
  }

  const entries = [];
  const orphanEvidence = [];

  for (let index = 0; index < rawEntries.length; index += 1) {
    const normalized = normalizeGraphEntry(rawEntries[index], index);

    if (!normalized.valid) {
      return normalized;
    }

    if (normalized.orphan) {
      orphanEvidence.push(normalized.orphan);
      continue;
    }

    entries.push(normalized.entry);
  }

  return {
    valid: true,
    blocked: false,
    sourceReasonCode: 'OK',
    entries,
    orphanEvidence
  };
}

function normalizeArtifactDiffResult(result) {
  if (!isObject(result)) {
    return {
      valid: false,
      reason: 'artifactDiffResult invalide: objet attendu.'
    };
  }

  if (typeof result.allowed !== 'boolean') {
    return {
      valid: false,
      reason: 'artifactDiffResult.allowed invalide: booléen attendu.'
    };
  }

  const reasonCode = normalizeText(result.reasonCode);

  if (!REASON_CODE_SET.has(reasonCode)) {
    return {
      valid: false,
      reason: `artifactDiffResult.reasonCode invalide: ${reasonCode || 'vide'}.`
    };
  }

  const sourceReasonCode = REASON_CODE_SET.has(normalizeText(result.diagnostics?.sourceReasonCode))
    ? normalizeText(result.diagnostics.sourceReasonCode)
    : reasonCode;

  if (!result.allowed) {
    if (!UPSTREAM_BLOCKING_REASON_CODES.has(reasonCode)) {
      return {
        valid: false,
        reason: `artifactDiffResult.reasonCode non propagable: ${reasonCode}.`
      };
    }

    return {
      valid: true,
      blocked: true,
      reasonCode,
      reason: normalizeText(result.reason) || `Diff bloqué (${reasonCode}).`,
      sourceReasonCode,
      correctiveActions: normalizeCorrectiveActions(reasonCode, result.correctiveActions)
    };
  }

  if (!Array.isArray(result.diffResults)) {
    return {
      valid: false,
      reason: 'artifactDiffResult.diffResults invalide: tableau attendu quand allowed=true.'
    };
  }

  if (!Array.isArray(result.provenanceLinks)) {
    return {
      valid: false,
      reason: 'artifactDiffResult.provenanceLinks invalide: tableau attendu quand allowed=true.'
    };
  }

  const provenanceByPairKey = new Map();

  for (const provenanceLink of result.provenanceLinks) {
    if (!isObject(provenanceLink)) {
      continue;
    }

    const groupKey = normalizeText(provenanceLink.groupKey);
    const leftArtifactId = normalizeText(provenanceLink.leftArtifactId);
    const rightArtifactId = normalizeText(provenanceLink.rightArtifactId);

    if (groupKey.length === 0 || leftArtifactId.length === 0 || rightArtifactId.length === 0) {
      continue;
    }

    provenanceByPairKey.set(buildPairKey(groupKey, leftArtifactId, rightArtifactId), provenanceLink);
  }

  const entries = [];
  const orphanEvidence = [];

  for (let index = 0; index < result.diffResults.length; index += 1) {
    const diffResult = result.diffResults[index];

    if (!isObject(diffResult)) {
      return {
        valid: false,
        reason: `artifactDiffResult.diffResults[${index}] invalide: objet attendu.`
      };
    }

    const groupKey = normalizeText(diffResult.groupKey) || `diff-${index + 1}`;
    const leftArtifactId = normalizeText(diffResult.leftArtifactId);
    const rightArtifactId = normalizeText(diffResult.rightArtifactId);
    const leftArtifactPath = normalizeText(diffResult.leftArtifactPath);
    const rightArtifactPath = normalizeText(diffResult.rightArtifactPath);
    const artifactType = normalizeText(diffResult.artifactType) || 'artifact';

    if (
      leftArtifactId.length === 0 ||
      rightArtifactId.length === 0 ||
      leftArtifactPath.length === 0 ||
      rightArtifactPath.length === 0
    ) {
      orphanEvidence.push(
        toOrphanEvidence({
          groupKey,
          artifactId: leftArtifactId || rightArtifactId,
          artifactPath: leftArtifactPath || rightArtifactPath,
          reason: 'Diff incomplet: artefacts gauche/droite requis.',
          candidateSource: 'artifactDiffResult.diffResults'
        })
      );
      continue;
    }

    const provenanceLink = provenanceByPairKey.get(buildPairKey(groupKey, leftArtifactId, rightArtifactId));

    if (!provenanceLink) {
      orphanEvidence.push(
        toOrphanEvidence({
          groupKey,
          artifactId: leftArtifactId,
          artifactPath: leftArtifactPath,
          reason: 'Aucun provenanceLink corrélé pour la paire diff.',
          candidateSource: 'artifactDiffResult.diffResults',
          details: {
            leftArtifactId,
            rightArtifactId
          }
        })
      );
      continue;
    }

    const decisionRefs = normalizeArray(provenanceLink.decisionRefs);
    const gateRefs = normalizeArray(provenanceLink.gateRefs);
    const commandRefs = normalizeArray(provenanceLink.commandRefs);

    if (decisionRefs.length === 0 || gateRefs.length === 0 || commandRefs.length === 0) {
      orphanEvidence.push(
        toOrphanEvidence({
          groupKey,
          artifactId: leftArtifactId,
          artifactPath: leftArtifactPath,
          reason: 'Provenance incomplète: decisionRefs/gateRefs/commandRefs requis.',
          candidateSource: 'artifactDiffResult.provenanceLinks',
          details: {
            decisionRefs,
            gateRefs,
            commandRefs
          }
        })
      );
      continue;
    }

    entries.push({
      groupKey,
      artifactId: leftArtifactId,
      artifactPath: leftArtifactPath,
      artifactType,
      decisionRefs,
      gateRefs,
      commandRefs,
      candidateSource: 'artifactDiffResult'
    });

    entries.push({
      groupKey,
      artifactId: rightArtifactId,
      artifactPath: rightArtifactPath,
      artifactType,
      decisionRefs,
      gateRefs,
      commandRefs,
      candidateSource: 'artifactDiffResult'
    });
  }

  return {
    valid: true,
    blocked: false,
    sourceReasonCode,
    entries,
    orphanEvidence
  };
}

function resolveSource(payload, runtimeOptions) {
  if (payload.artifactDiffResult !== undefined) {
    return normalizeArtifactDiffResult(payload.artifactDiffResult);
  }

  if (payload.artifactDiffInput !== undefined) {
    if (!isObject(payload.artifactDiffInput)) {
      return {
        valid: false,
        reason: 'artifactDiffInput invalide: objet attendu.'
      };
    }

    const delegatedOptions = isObject(runtimeOptions.artifactDiffOptions)
      ? runtimeOptions.artifactDiffOptions
      : {};

    let delegatedResult;

    try {
      delegatedResult = diffArtifactVersions(payload.artifactDiffInput, delegatedOptions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        reason: `diffArtifactVersions a levé une exception: ${message}`
      };
    }

    return normalizeArtifactDiffResult(delegatedResult);
  }

  if (payload.graphEntries !== undefined) {
    return normalizeGraphEntries(payload.graphEntries);
  }

  return {
    valid: false,
    reason: 'Aucune source exploitable: fournir artifactDiffResult, artifactDiffInput ou graphEntries.'
  };
}

function normalizeNodeId(nodeType, id) {
  return `${nodeType}:${id}`;
}

function buildEdgeId(fromNodeId, toNodeId, relation) {
  return `${fromNodeId}->${toNodeId}:${relation}`;
}

function sortByString(valueSelector) {
  return (left, right) => valueSelector(left).localeCompare(valueSelector(right));
}

function addNode(nodesById, node) {
  if (!nodesById.has(node.nodeId)) {
    nodesById.set(node.nodeId, node);
  }
}

function addEdge(edgesById, edge) {
  if (!edgesById.has(edge.edgeId)) {
    edgesById.set(edge.edgeId, edge);
  }
}

function addClusterNode(clustersByKey, clusterKey, nodeId) {
  if (!clustersByKey.has(clusterKey)) {
    clustersByKey.set(clusterKey, new Set());
  }

  clustersByKey.get(clusterKey).add(nodeId);
}

function addDecisionBacklink(backlinksByDecisionId, decisionId, artifact) {
  if (!backlinksByDecisionId.has(decisionId)) {
    backlinksByDecisionId.set(decisionId, new Map());
  }

  const byArtifactId = backlinksByDecisionId.get(decisionId);

  if (!byArtifactId.has(artifact.artifactId)) {
    byArtifactId.set(artifact.artifactId, artifact);
  }
}

function buildGraph(entries, nowMs) {
  const nodesById = new Map();
  const edgesById = new Map();
  const clustersByKey = new Map();
  const backlinksByDecisionId = new Map();
  const perEntryDurations = [];

  for (const entry of entries) {
    const entryStartedAtMs = nowMs();

    const artifactNodeId = normalizeNodeId('artifact', entry.artifactId);

    addNode(nodesById, {
      nodeId: artifactNodeId,
      nodeType: 'artifact',
      label: entry.artifactId,
      artifactId: entry.artifactId,
      artifactPath: entry.artifactPath,
      artifactType: entry.artifactType,
      groupKey: entry.groupKey
    });

    for (const decisionId of entry.decisionRefs) {
      const decisionNodeId = normalizeNodeId('decision', decisionId);

      addNode(nodesById, {
        nodeId: decisionNodeId,
        nodeType: 'decision',
        label: decisionId,
        decisionId,
        groupKey: entry.groupKey
      });

      addEdge(edgesById, {
        edgeId: buildEdgeId(artifactNodeId, decisionNodeId, 'JUSTIFIES_DECISION'),
        fromNodeId: artifactNodeId,
        toNodeId: decisionNodeId,
        relation: 'JUSTIFIES_DECISION',
        groupKey: entry.groupKey
      });

      addClusterNode(clustersByKey, decisionNodeId, decisionNodeId);
      addClusterNode(clustersByKey, decisionNodeId, artifactNodeId);

      addDecisionBacklink(backlinksByDecisionId, decisionId, {
        artifactId: entry.artifactId,
        artifactPath: entry.artifactPath,
        artifactType: entry.artifactType,
        groupKey: entry.groupKey
      });

      for (const gateId of entry.gateRefs) {
        const gateNodeId = normalizeNodeId('gate', gateId);

        addNode(nodesById, {
          nodeId: gateNodeId,
          nodeType: 'gate',
          label: gateId,
          gateId,
          groupKey: entry.groupKey
        });

        addEdge(edgesById, {
          edgeId: buildEdgeId(decisionNodeId, gateNodeId, 'VALIDATED_BY_GATE'),
          fromNodeId: decisionNodeId,
          toNodeId: gateNodeId,
          relation: 'VALIDATED_BY_GATE',
          groupKey: entry.groupKey
        });

        addClusterNode(clustersByKey, decisionNodeId, gateNodeId);
      }

      for (const commandId of entry.commandRefs) {
        const commandNodeId = normalizeNodeId('command', commandId);

        addNode(nodesById, {
          nodeId: commandNodeId,
          nodeType: 'command',
          label: commandId,
          commandId,
          groupKey: entry.groupKey
        });

        addEdge(edgesById, {
          edgeId: buildEdgeId(decisionNodeId, commandNodeId, 'EXECUTED_BY_COMMAND'),
          fromNodeId: decisionNodeId,
          toNodeId: commandNodeId,
          relation: 'EXECUTED_BY_COMMAND',
          groupKey: entry.groupKey
        });

        addClusterNode(clustersByKey, decisionNodeId, commandNodeId);
      }
    }

    perEntryDurations.push(toDurationMs(entryStartedAtMs, nowMs()));
  }

  const nodes = [...nodesById.values()].sort(sortByString((node) => node.nodeId));
  const edges = [...edgesById.values()].sort(sortByString((edge) => edge.edgeId));

  const clusters = [...clustersByKey.entries()]
    .map(([clusterKey, nodeIds]) => ({
      clusterKey,
      nodeIds: [...nodeIds].sort((left, right) => left.localeCompare(right))
    }))
    .sort(sortByString((cluster) => cluster.clusterKey));

  const decisionBacklinks = {};
  const uniqueBacklinkedArtifactIds = new Set();

  for (const decisionId of [...backlinksByDecisionId.keys()].sort((left, right) => left.localeCompare(right))) {
    const artifacts = [...backlinksByDecisionId.get(decisionId).values()].sort((left, right) =>
      left.artifactId.localeCompare(right.artifactId)
    );

    decisionBacklinks[decisionId] = artifacts;

    for (const artifact of artifacts) {
      uniqueBacklinkedArtifactIds.add(artifact.artifactId);
    }
  }

  return {
    graph: {
      nodes,
      edges,
      clusters
    },
    decisionBacklinks,
    diagnostics: {
      nodesCount: nodes.length,
      edgesCount: edges.length,
      decisionsCount: Object.keys(decisionBacklinks).length,
      backlinkedArtifactsCount: uniqueBacklinkedArtifactIds.size,
      p95GraphMs: computePercentile(perEntryDurations, 95)
    }
  };
}

function resolveNowProvider(runtimeOptions) {
  return typeof runtimeOptions.nowMs === 'function' ? runtimeOptions.nowMs : () => Date.now();
}

export function buildArtifactEvidenceGraph(input, options = {}) {
  const payload = isObject(input) ? input : {};
  const runtimeOptions = isObject(options) ? options : {};
  const nowMs = resolveNowProvider(runtimeOptions);
  const startedAtMs = nowMs();

  const decisionQueryResolution = resolveDecisionQuery(payload);

  if (!decisionQueryResolution.valid) {
    return createInvalidInputResult(decisionQueryResolution.reason, {
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

  const entries = sourceResolution.entries.map((entry) => cloneValue(entry));
  const orphanEvidence = sourceResolution.orphanEvidence.map((entry) => cloneValue(entry));

  const graphBuild = buildGraph(entries, nowMs);

  const baseDiagnostics = {
    nodesCount: graphBuild.diagnostics.nodesCount,
    edgesCount: graphBuild.diagnostics.edgesCount,
    decisionsCount: graphBuild.diagnostics.decisionsCount,
    backlinkedArtifactsCount: graphBuild.diagnostics.backlinkedArtifactsCount,
    orphanCount: orphanEvidence.length,
    durationMs: toDurationMs(startedAtMs, nowMs()),
    p95GraphMs: graphBuild.diagnostics.p95GraphMs,
    sourceReasonCode: sourceResolution.sourceReasonCode
  };

  if (orphanEvidence.length > 0) {
    return createIncompleteResult({
      reason: `Graph incomplet: ${orphanEvidence.length} preuve(s) orpheline(s) détectée(s).`,
      graph: graphBuild.graph,
      decisionBacklinks: graphBuild.decisionBacklinks,
      orphanEvidence,
      diagnostics: baseDiagnostics,
      sourceReasonCode: sourceResolution.sourceReasonCode,
      durationMs: baseDiagnostics.durationMs,
      p95GraphMs: baseDiagnostics.p95GraphMs
    });
  }

  if (
    decisionQueryResolution.decisionId &&
    graphBuild.decisionBacklinks[decisionQueryResolution.decisionId] === undefined
  ) {
    return createDecisionNotFoundResult({
      decisionId: decisionQueryResolution.decisionId,
      graph: graphBuild.graph,
      decisionBacklinks: graphBuild.decisionBacklinks,
      orphanEvidence,
      diagnostics: baseDiagnostics,
      sourceReasonCode: sourceResolution.sourceReasonCode,
      durationMs: baseDiagnostics.durationMs,
      p95GraphMs: baseDiagnostics.p95GraphMs
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: `Evidence graph construit: ${baseDiagnostics.nodesCount} nœud(s), ${baseDiagnostics.edgesCount} liaison(s), ${baseDiagnostics.decisionsCount} décision(s).`,
    diagnostics: baseDiagnostics,
    graph: graphBuild.graph,
    decisionBacklinks: graphBuild.decisionBacklinks,
    orphanEvidence,
    correctiveActions: []
  });
}
