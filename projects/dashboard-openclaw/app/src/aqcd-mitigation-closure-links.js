import { buildAqcdRiskRegister } from './aqcd-risk-register.js';

const DEFAULT_HEATMAP_MAX_GAP_HOURS = 24;
const DEFAULT_MIN_CLOSED_PROOFS = 1;

const CLOSED_STATUSES = new Set(['DONE', 'CLOSED', 'MITIGATED', 'RESOLVED']);

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_AQCD_MITIGATION_LINK_INPUT: ['FIX_AQCD_MITIGATION_INPUT_STRUCTURE'],
  AQCD_MITIGATION_TASK_PROOF_LINK_REQUIRED: ['LINK_MITIGATION_TASK_PROOF'],
  AQCD_MITIGATION_CLOSURE_PROOF_REQUIRED: ['ATTACH_CLOSURE_PROOF_TO_MITIGATION'],
  AQCD_HEATMAP_EVOLUTION_REQUIRED: ['ADD_AQCD_HEATMAP_SERIES'],
  AQCD_HEATMAP_SERIES_INVALID: ['FIX_AQCD_HEATMAP_SERIES_PAYLOAD'],
  AQCD_HEATMAP_METRICS_NOT_CONTINUOUS: ['RESTORE_AQCD_HEATMAP_CADENCE']
});

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneValue(entry));
  }

  if (!isObject(value)) {
    return value;
  }

  const out = {};

  for (const [key, nested] of Object.entries(value)) {
    out[key] = cloneValue(nested);
  }

  return out;
}

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function roundScore(value) {
  return Number(normalizeNumber(value).toFixed(2));
}

function parseTimestampMs(value) {
  if (value instanceof Date) {
    const parsed = value.getTime();
    return Number.isFinite(parsed) ? parsed : null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }

  if (typeof value === 'string') {
    const normalized = normalizeText(value);

    if (normalized.length === 0) {
      return null;
    }

    const parsed = Date.parse(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function normalizePercent(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  if (parsed < 0) {
    return null;
  }

  if (parsed <= 1) {
    return roundScore(parsed * 100);
  }

  if (parsed > 100) {
    return null;
  }

  return roundScore(parsed);
}

function resolveQuadrant(probabilityPct, impactPct) {
  const highProbability = probabilityPct >= 50;
  const highImpact = impactPct >= 50;

  if (highProbability && highImpact) {
    return 'Q4_HIGH_IMPACT_HIGH_PROBABILITY';
  }

  if (!highProbability && highImpact) {
    return 'Q3_HIGH_IMPACT_LOW_PROBABILITY';
  }

  if (highProbability && !highImpact) {
    return 'Q2_LOW_IMPACT_HIGH_PROBABILITY';
  }

  return 'Q1_LOW_IMPACT_LOW_PROBABILITY';
}

function resolveSeverity(exposure) {
  if (exposure >= 75) {
    return 'CRITICAL';
  }

  if (exposure >= 50) {
    return 'HIGH';
  }

  if (exposure >= 25) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function resolveRules(payload, runtimeOptions) {
  const source =
    (isObject(runtimeOptions.mitigationLinkRules) && runtimeOptions.mitigationLinkRules) ||
    (isObject(payload.mitigationLinkRules) && payload.mitigationLinkRules) ||
    {};

  return {
    heatmapMaxGapHours: normalizeNumber(
      source.heatmapMaxGapHours ?? payload.heatmapMaxGapHours ?? DEFAULT_HEATMAP_MAX_GAP_HOURS,
      DEFAULT_HEATMAP_MAX_GAP_HOURS
    ),
    minClosedProofs: Math.max(
      0,
      Math.trunc(
        normalizeNumber(source.minClosedProofs ?? payload.minClosedProofs, DEFAULT_MIN_CLOSED_PROOFS)
      )
    )
  };
}

function normalizeActions(actions, reasonCode) {
  const defaults = DEFAULT_CORRECTIVE_ACTIONS[reasonCode] ?? [];

  if (!Array.isArray(actions)) {
    return cloneValue(defaults);
  }

  const out = [];
  const seen = new Set();

  for (const action of actions) {
    const normalized = normalizeText(String(action ?? ''));

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    out.push(normalized);
  }

  return out.length > 0 ? out : cloneValue(defaults);
}

function buildMitigationClosureLinks(riskEntries) {
  const links = [];
  const missingLinks = [];

  for (const riskEntry of riskEntries) {
    const mitigations = Array.isArray(riskEntry.mitigations) ? riskEntry.mitigations : [];

    for (const mitigation of mitigations) {
      const taskId = normalizeText(String(mitigation.taskId ?? ''));
      const proofRef = normalizeText(String(mitigation.proofRef ?? ''));
      const mitigationStatus = normalizeText(String(mitigation.status ?? '')).toUpperCase();
      const closed = CLOSED_STATUSES.has(mitigationStatus);

      const link = {
        riskId: riskEntry.id,
        riskGate: riskEntry.gate,
        riskStatus: normalizeText(String(riskEntry.status ?? '')).toUpperCase(),
        taskId,
        mitigationStatus,
        dueAt: mitigation.dueAt ?? null,
        proofRef,
        closed,
        linked: Boolean(taskId) && Boolean(proofRef)
      };

      if (!link.linked) {
        missingLinks.push(`${riskEntry.id}:${taskId || 'missing-task'}:${proofRef || 'missing-proof'}`);
      }

      links.push(link);
    }
  }

  const total = links.length;
  const linked = links.filter((entry) => entry.linked).length;
  const closedTotal = links.filter((entry) => entry.closed).length;
  const closedWithProof = links.filter((entry) => entry.closed && Boolean(entry.proofRef)).length;

  return {
    links,
    missingLinks,
    total,
    linked,
    coveragePct: total > 0 ? roundScore((linked / total) * 100) : 100,
    closedTotal,
    closedWithProof,
    closureProofCoveragePct: closedTotal > 0 ? roundScore((closedWithProof / closedTotal) * 100) : 0
  };
}

function normalizeHeatmapPoint(point, snapshotLabel, index) {
  if (!isObject(point)) {
    return {
      valid: false,
      reason: `heatmap ${snapshotLabel} point[${index}] invalide: objet requis.`
    };
  }

  const riskId = normalizeText(String(point.riskId ?? point.id ?? ''));
  const probabilityPct = normalizePercent(point.probability ?? point.prob ?? point.probabilityPct);
  const impactPct = normalizePercent(point.impact ?? point.impactPct);

  if (!riskId) {
    return {
      valid: false,
      reason: `heatmap ${snapshotLabel} point[${index}] invalide: riskId requis.`
    };
  }

  if (probabilityPct === null) {
    return {
      valid: false,
      reason: `heatmap ${snapshotLabel} point[${index}] invalide: probability requise (0..1 ou 0..100).`
    };
  }

  if (impactPct === null) {
    return {
      valid: false,
      reason: `heatmap ${snapshotLabel} point[${index}] invalide: impact requis (0..1 ou 0..100).`
    };
  }

  const exposure = roundScore((probabilityPct * impactPct) / 100);

  return {
    valid: true,
    point: {
      riskId,
      probabilityPct,
      impactPct,
      exposure,
      severity: resolveSeverity(exposure),
      quadrant: resolveQuadrant(probabilityPct, impactPct)
    }
  };
}

function normalizeHeatmapSnapshot(snapshot, index) {
  if (!isObject(snapshot)) {
    return {
      valid: false,
      reason: `heatmapSeries[${index}] invalide: objet requis.`
    };
  }

  const snapshotId = normalizeText(String(snapshot.id ?? snapshot.windowRef ?? `H${index + 1}`)) ||
    `H${index + 1}`;
  const atMs = parseTimestampMs(snapshot.at ?? snapshot.updatedAt ?? snapshot.timestamp ?? snapshot.date);

  if (atMs === null) {
    return {
      valid: false,
      reason: `heatmap ${snapshotId} invalide: timestamp requis.`
    };
  }

  const pointsRaw = Array.isArray(snapshot.points)
    ? snapshot.points
    : Array.isArray(snapshot.risks)
      ? snapshot.risks
      : [];

  if (pointsRaw.length === 0) {
    return {
      valid: false,
      reason: `heatmap ${snapshotId} invalide: points requis.`
    };
  }

  const points = [];

  for (let pointIndex = 0; pointIndex < pointsRaw.length; pointIndex += 1) {
    const normalizedPoint = normalizeHeatmapPoint(pointsRaw[pointIndex], snapshotId, pointIndex);

    if (!normalizedPoint.valid) {
      return normalizedPoint;
    }

    points.push(normalizedPoint.point);
  }

  const exposures = points.map((point) => point.exposure);
  const avgExposure = roundScore(exposures.reduce((sum, value) => sum + value, 0) / exposures.length);
  const highOrCriticalCount = points.filter((point) => point.severity === 'HIGH' || point.severity === 'CRITICAL').length;

  return {
    valid: true,
    snapshot: {
      id: snapshotId,
      at: new Date(atMs).toISOString(),
      atMs,
      points,
      summary: {
        riskCount: points.length,
        avgExposure,
        maxExposure: roundScore(Math.max(...exposures)),
        highOrCriticalCount,
        buckets: {
          low: points.filter((point) => point.severity === 'LOW').length,
          medium: points.filter((point) => point.severity === 'MEDIUM').length,
          high: points.filter((point) => point.severity === 'HIGH').length,
          critical: points.filter((point) => point.severity === 'CRITICAL').length
        }
      }
    }
  };
}

function buildHeatmapEvolution(heatmapSeries, maxGapHours) {
  if (!Array.isArray(heatmapSeries) || heatmapSeries.length < 2) {
    return {
      valid: false,
      reasonCode: 'AQCD_HEATMAP_EVOLUTION_REQUIRED',
      reason: 'Heatmap probabilité/impact et son évolution requis (>= 2 snapshots).'
    };
  }

  const snapshots = [];

  for (let index = 0; index < heatmapSeries.length; index += 1) {
    const normalized = normalizeHeatmapSnapshot(heatmapSeries[index], index);

    if (!normalized.valid) {
      return {
        valid: false,
        reasonCode: 'AQCD_HEATMAP_SERIES_INVALID',
        reason: normalized.reason
      };
    }

    snapshots.push(normalized.snapshot);
  }

  snapshots.sort((left, right) => left.atMs - right.atMs);

  const maxGapMs = Math.max(1, normalizeNumber(maxGapHours, DEFAULT_HEATMAP_MAX_GAP_HOURS)) * 60 * 60 * 1000;
  const evolution = [];
  let observedMaxGapMs = 0;

  for (let index = 1; index < snapshots.length; index += 1) {
    const prev = snapshots[index - 1];
    const current = snapshots[index];
    const gapMs = Math.max(0, current.atMs - prev.atMs);

    observedMaxGapMs = Math.max(observedMaxGapMs, gapMs);

    const deltaExposure = roundScore(current.summary.avgExposure - prev.summary.avgExposure);
    const deltaHighCritical = current.summary.highOrCriticalCount - prev.summary.highOrCriticalCount;

    evolution.push({
      from: prev.id,
      to: current.id,
      gapHours: roundScore(gapMs / (60 * 60 * 1000)),
      deltaExposure,
      deltaHighCritical,
      trend: deltaExposure > 0 ? 'UP' : deltaExposure < 0 ? 'DOWN' : 'STABLE'
    });
  }

  if (observedMaxGapMs > maxGapMs) {
    return {
      valid: false,
      reasonCode: 'AQCD_HEATMAP_METRICS_NOT_CONTINUOUS',
      reason: `Heatmap non continu: gap max ${roundScore(observedMaxGapMs / (60 * 60 * 1000))}h > ${roundScore(maxGapMs / (60 * 60 * 1000))}h.`
    };
  }

  return {
    valid: true,
    heatmap: {
      snapshots,
      evolution,
      cadence: {
        maxGapHours: roundScore(maxGapMs / (60 * 60 * 1000)),
        observedMaxGapHours: roundScore(observedMaxGapMs / (60 * 60 * 1000)),
        continuous: true
      }
    }
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  scorecard,
  readiness,
  gateActions,
  riskRegister,
  mitigationLinks,
  mitigationClosureLinks,
  heatmap,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode: normalizeText(String(reasonCode || 'INVALID_AQCD_MITIGATION_LINK_INPUT')),
    reason,
    diagnostics: cloneValue(diagnostics ?? {}),
    scorecard: cloneValue(scorecard ?? null),
    readiness: cloneValue(readiness ?? null),
    gateActions: cloneValue(gateActions ?? []),
    riskRegister: cloneValue(riskRegister ?? null),
    mitigationLinks: cloneValue(mitigationLinks ?? null),
    mitigationClosureLinks: cloneValue(mitigationClosureLinks ?? null),
    heatmap: cloneValue(heatmap ?? null),
    correctiveActions: normalizeActions(correctiveActions, reasonCode)
  };
}

export function buildAqcdMitigationClosureLinks(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_AQCD_MITIGATION_LINK_INPUT',
      reason: 'Entrée S054 invalide: objet requis.'
    });
  }

  const rules = resolveRules(payload, runtimeOptions);
  const riskRegisterResult = buildAqcdRiskRegister(payload, runtimeOptions);

  if (!riskRegisterResult.allowed) {
    return createResult({
      allowed: false,
      reasonCode: riskRegisterResult.reasonCode,
      reason: riskRegisterResult.reason,
      diagnostics: riskRegisterResult.diagnostics,
      scorecard: riskRegisterResult.scorecard,
      readiness: riskRegisterResult.readiness,
      gateActions: riskRegisterResult.gateActions,
      riskRegister: riskRegisterResult.riskRegister,
      mitigationLinks: riskRegisterResult.mitigationLinks,
      mitigationClosureLinks: null,
      heatmap: null,
      correctiveActions: riskRegisterResult.correctiveActions
    });
  }

  const riskEntries = Array.isArray(riskRegisterResult.riskRegister?.entries)
    ? riskRegisterResult.riskRegister.entries
    : [];

  const mitigationClosureLinks = buildMitigationClosureLinks(riskEntries);

  if (mitigationClosureLinks.total === 0 || mitigationClosureLinks.missingLinks.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_MITIGATION_TASK_PROOF_LINK_REQUIRED',
      reason:
        mitigationClosureLinks.total === 0
          ? 'Aucune mitigation liée: taskId + proofRef requis pour S054.'
          : `Liens mitigation incomplets: ${mitigationClosureLinks.missingLinks.join(', ')}.`,
      diagnostics: {
        ...riskRegisterResult.diagnostics,
        mitigationTotal: mitigationClosureLinks.total,
        mitigationLinked: mitigationClosureLinks.linked,
        mitigationCoveragePct: mitigationClosureLinks.coveragePct
      },
      scorecard: riskRegisterResult.scorecard,
      readiness: riskRegisterResult.readiness,
      gateActions: riskRegisterResult.gateActions,
      riskRegister: riskRegisterResult.riskRegister,
      mitigationLinks: riskRegisterResult.mitigationLinks,
      mitigationClosureLinks,
      heatmap: null,
      correctiveActions: ['LINK_MITIGATION_TASK_PROOF']
    });
  }

  if (mitigationClosureLinks.closedWithProof < rules.minClosedProofs) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_MITIGATION_CLOSURE_PROOF_REQUIRED',
      reason: `Preuves de fermeture insuffisantes: ${mitigationClosureLinks.closedWithProof}/${rules.minClosedProofs} mitigation(s) fermée(s) attendue(s).`,
      diagnostics: {
        ...riskRegisterResult.diagnostics,
        mitigationTotal: mitigationClosureLinks.total,
        closedMitigationCount: mitigationClosureLinks.closedTotal,
        closedWithProof: mitigationClosureLinks.closedWithProof,
        minClosedProofs: rules.minClosedProofs
      },
      scorecard: riskRegisterResult.scorecard,
      readiness: riskRegisterResult.readiness,
      gateActions: riskRegisterResult.gateActions,
      riskRegister: riskRegisterResult.riskRegister,
      mitigationLinks: riskRegisterResult.mitigationLinks,
      mitigationClosureLinks,
      heatmap: null,
      correctiveActions: ['ATTACH_CLOSURE_PROOF_TO_MITIGATION']
    });
  }

  const heatmapResult = buildHeatmapEvolution(
    payload.heatmapSeries ?? payload.riskHeatmapSeries ?? payload.heatmaps,
    rules.heatmapMaxGapHours
  );

  if (!heatmapResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: heatmapResult.reasonCode,
      reason: heatmapResult.reason,
      diagnostics: {
        ...riskRegisterResult.diagnostics,
        mitigationTotal: mitigationClosureLinks.total,
        mitigationCoveragePct: mitigationClosureLinks.coveragePct,
        closedWithProof: mitigationClosureLinks.closedWithProof,
        minClosedProofs: rules.minClosedProofs,
        heatmapMaxGapHours: rules.heatmapMaxGapHours
      },
      scorecard: riskRegisterResult.scorecard,
      readiness: riskRegisterResult.readiness,
      gateActions: riskRegisterResult.gateActions,
      riskRegister: riskRegisterResult.riskRegister,
      mitigationLinks: riskRegisterResult.mitigationLinks,
      mitigationClosureLinks,
      heatmap: null,
      correctiveActions: DEFAULT_CORRECTIVE_ACTIONS[heatmapResult.reasonCode]
    });
  }

  const diagnostics = {
    ...riskRegisterResult.diagnostics,
    mitigationTotal: mitigationClosureLinks.total,
    mitigationCoveragePct: mitigationClosureLinks.coveragePct,
    closureProofCoveragePct: mitigationClosureLinks.closureProofCoveragePct,
    closedWithProof: mitigationClosureLinks.closedWithProof,
    minClosedProofs: rules.minClosedProofs,
    heatmapSnapshotCount: heatmapResult.heatmap.snapshots.length,
    heatmapEvolutionCount: heatmapResult.heatmap.evolution.length,
    heatmapContinuous: heatmapResult.heatmap.cadence.continuous,
    heatmapMaxGapHours: heatmapResult.heatmap.cadence.maxGapHours,
    heatmapObservedMaxGapHours: heatmapResult.heatmap.cadence.observedMaxGapHours,
    metricsContinuous: heatmapResult.heatmap.cadence.continuous
  };

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: 'Liens mitigation→task→preuve validés avec heatmap probabilité/impact continue.',
    diagnostics,
    scorecard: riskRegisterResult.scorecard,
    readiness: riskRegisterResult.readiness,
    gateActions: riskRegisterResult.gateActions,
    riskRegister: riskRegisterResult.riskRegister,
    mitigationLinks: riskRegisterResult.mitigationLinks,
    mitigationClosureLinks,
    heatmap: heatmapResult.heatmap,
    correctiveActions: []
  });
}
