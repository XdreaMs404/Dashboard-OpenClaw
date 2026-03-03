const DIMENSION_SPECS = Object.freeze([
  {
    key: 'autonomy',
    metricsKey: 'autonomy',
    label: 'Autonomy',
    weightKey: 'autonomyWeights',
    defaultWeights: Object.freeze({ A1: 0.35, A2: 0.25, A3: 0.2, A4: 0.2 })
  },
  {
    key: 'qualityTech',
    metricsKey: 'qualityTech',
    label: 'QualityTech',
    weightKey: 'qualityTechWeights',
    defaultWeights: Object.freeze({ Q1: 0.3, Q2: 0.25, Q3: 0.2, Q4: 0.15, Q5: 0.1 })
  },
  {
    key: 'costEfficiency',
    metricsKey: 'costEfficiency',
    label: 'CostEfficiency',
    weightKey: 'costEfficiencyWeights',
    defaultWeights: Object.freeze({ C1: 0.3, C2: 0.3, C3: 0.2, C4: 0.2 })
  },
  {
    key: 'designExcellence',
    metricsKey: 'design',
    label: 'DesignExcellence',
    weightKey: 'designWeights',
    defaultWeights: Object.freeze({ D1: 0.25, D2: 0.2, D3: 0.15, D4: 0.15, D5: 0.15, D6: 0.1 })
  }
]);

const DEFAULT_SCORE_WEIGHTS = Object.freeze({
  qualityTech: 0.3,
  designExcellence: 0.25,
  autonomy: 0.25,
  costEfficiency: 0.2
});

const DEFAULT_BASELINE_TARGET = 65;
const DEFAULT_EXPORT_LATENCY_BUDGET_MS = 2500;

const BAND_ORDER = Object.freeze(['NON_ACCEPTABLE', 'FRAGILE', 'STABLE', 'INDUSTRIAL']);

const REASON_CODES = Object.freeze([
  'OK',
  'INVALID_AQCD_SCOREBOARD_INPUT',
  'AQCD_METRICS_INCOMPLETE',
  'AQCD_WEIGHTS_INVALID',
  'AQCD_FORMULA_SOURCE_MISSING',
  'AQCD_SNAPSHOT_SERIES_INVALID',
  'AQCD_BASELINE_BELOW_TARGET',
  'AQCD_LATENCY_BUDGET_EXCEEDED'
]);

const REASON_CODE_SET = new Set(REASON_CODES);

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_AQCD_SCOREBOARD_INPUT: ['FIX_AQCD_INPUT_STRUCTURE'],
  AQCD_METRICS_INCOMPLETE: ['COMPLETE_AQCD_METRICS'],
  AQCD_WEIGHTS_INVALID: ['ALIGN_AQCD_WEIGHTS'],
  AQCD_FORMULA_SOURCE_MISSING: ['LINK_AQCD_SOURCE_REFERENCES'],
  AQCD_SNAPSHOT_SERIES_INVALID: ['FIX_AQCD_SNAPSHOT_SERIES'],
  AQCD_BASELINE_BELOW_TARGET: ['IMPROVE_AQCD_READINESS_SCORE'],
  AQCD_LATENCY_BUDGET_EXCEEDED: ['OPTIMIZE_AQCD_PROJECTION_LATENCY']
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

  const clone = {};

  for (const [key, nested] of Object.entries(value)) {
    clone[key] = cloneValue(nested);
  }

  return clone;
}

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizeReasonCode(value) {
  const normalized = normalizeText(value);

  if (!REASON_CODE_SET.has(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function roundScore(value) {
  return Number(normalizeFiniteNumber(value).toFixed(2));
}

function computePercentile(samples, percentile) {
  if (!Array.isArray(samples) || samples.length === 0) {
    return 0;
  }

  const sorted = samples
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry))
    .sort((left, right) => left - right);

  if (sorted.length === 0) {
    return 0;
  }

  const ratio = Math.min(100, Math.max(0, Number(percentile))) / 100;
  const index = Math.ceil(sorted.length * ratio) - 1;

  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function parseTimestampMs(value) {
  if (value instanceof Date) {
    const parsedDate = value.getTime();
    return Number.isFinite(parsedDate) ? parsedDate : null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? Math.trunc(value) : null;
  }

  if (typeof value === 'string') {
    const normalized = normalizeText(value);

    if (normalized.length === 0) {
      return null;
    }

    const parsedDate = Date.parse(normalized);
    return Number.isFinite(parsedDate) ? parsedDate : null;
  }

  return null;
}

function toIso(valueMs) {
  return new Date(valueMs).toISOString();
}

function normalizeMetricSource(sourceMap, dimensionKey, metricKey) {
  if (!isObject(sourceMap)) {
    return null;
  }

  const direct = normalizeText(String(sourceMap[`${dimensionKey}.${metricKey}`] ?? ''));
  if (direct.length > 0) {
    return direct;
  }

  const grouped = isObject(sourceMap[dimensionKey])
    ? normalizeText(String(sourceMap[dimensionKey][metricKey] ?? ''))
    : '';

  if (grouped.length > 0) {
    return grouped;
  }

  return null;
}

function resolveBand(globalScore) {
  const score = normalizeFiniteNumber(globalScore);

  if (score >= 85) {
    return 'INDUSTRIAL';
  }

  if (score >= 70) {
    return 'STABLE';
  }

  if (score >= 55) {
    return 'FRAGILE';
  }

  return 'NON_ACCEPTABLE';
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  scorecard,
  formula,
  snapshots,
  correctiveActions
}) {
  const normalizedReasonCode = normalizeReasonCode(reasonCode) ?? 'INVALID_AQCD_SCOREBOARD_INPUT';
  const defaultActions = DEFAULT_CORRECTIVE_ACTIONS[normalizedReasonCode] ?? [];
  const actions = Array.isArray(correctiveActions)
    ? correctiveActions.filter((item) => normalizeText(String(item ?? '')).length > 0)
    : defaultActions;

  return {
    allowed,
    reasonCode: normalizedReasonCode,
    reason,
    diagnostics: cloneValue(diagnostics ?? {}),
    scorecard: cloneValue(scorecard ?? null),
    formula: cloneValue(formula ?? null),
    snapshots: cloneValue(snapshots ?? null),
    correctiveActions: cloneValue(actions)
  };
}

function resolveScoreWeights(payload, runtimeOptions) {
  const source =
    (isObject(runtimeOptions.scoreWeights) && runtimeOptions.scoreWeights) ||
    (isObject(payload.scoreWeights) && payload.scoreWeights) ||
    DEFAULT_SCORE_WEIGHTS;

  const output = {};

  for (const key of Object.keys(DEFAULT_SCORE_WEIGHTS)) {
    output[key] = normalizeFiniteNumber(source[key], DEFAULT_SCORE_WEIGHTS[key]);
  }

  return output;
}

function resolveDimensionWeights(payload, runtimeOptions, spec) {
  const source =
    (isObject(runtimeOptions[spec.weightKey]) && runtimeOptions[spec.weightKey]) ||
    (isObject(payload[spec.weightKey]) && payload[spec.weightKey]) ||
    spec.defaultWeights;

  const output = {};

  for (const metricKey of Object.keys(spec.defaultWeights)) {
    output[metricKey] = normalizeFiniteNumber(source[metricKey], spec.defaultWeights[metricKey]);
  }

  return output;
}

function computeDimensionScore({ spec, metricValues, metricSources, weights }) {
  if (!isObject(metricValues)) {
    return {
      valid: false,
      reasonCode: 'AQCD_METRICS_INCOMPLETE',
      reason: `Section métrique manquante: ${spec.metricsKey}.`
    };
  }

  const terms = [];
  let weightedSum = 0;

  for (const metricKey of Object.keys(weights)) {
    const metricValue = normalizeFiniteNumber(metricValues[metricKey], NaN);

    if (!Number.isFinite(metricValue)) {
      return {
        valid: false,
        reasonCode: 'AQCD_METRICS_INCOMPLETE',
        reason: `Métrique manquante/invalide: ${spec.metricsKey}.${metricKey}.`
      };
    }

    const metricWeight = normalizeFiniteNumber(weights[metricKey], NaN);

    if (!Number.isFinite(metricWeight)) {
      return {
        valid: false,
        reasonCode: 'AQCD_WEIGHTS_INVALID',
        reason: `Poids invalide: ${spec.weightKey}.${metricKey}.`
      };
    }

    const contribution = metricValue * metricWeight;
    weightedSum += contribution;

    const source = normalizeMetricSource(metricSources, spec.metricsKey, metricKey);
    if (!source) {
      return {
        valid: false,
        reasonCode: 'AQCD_FORMULA_SOURCE_MISSING',
        reason: `Source manquante pour ${spec.metricsKey}.${metricKey}.`
      };
    }

    terms.push({
      metricKey,
      value: roundScore(metricValue),
      weight: roundScore(metricWeight),
      contribution: roundScore(contribution),
      source
    });
  }

  const expression = terms
    .map((term) => `${term.metricKey}×${term.weight.toFixed(2)}`)
    .join(' + ');

  return {
    valid: true,
    key: spec.key,
    label: spec.label,
    metricsKey: spec.metricsKey,
    score: roundScore(weightedSum),
    terms,
    expression
  };
}

function normalizeSnapshotEntry(snapshot, index, scoreWeights) {
  if (!isObject(snapshot)) {
    return {
      valid: false,
      reason: 'Snapshot invalide: objet requis.'
    };
  }

  const scoresInput = isObject(snapshot.scores) ? snapshot.scores : {};

  const scores = {
    autonomy: roundScore(scoresInput.autonomy ?? snapshot.autonomy ?? 0),
    qualityTech: roundScore(scoresInput.qualityTech ?? snapshot.qualityTech ?? 0),
    costEfficiency: roundScore(scoresInput.costEfficiency ?? snapshot.costEfficiency ?? 0),
    designExcellence: roundScore(scoresInput.designExcellence ?? snapshot.designExcellence ?? 0)
  };

  const global = Number.isFinite(Number(scoresInput.global ?? snapshot.global))
    ? roundScore(scoresInput.global ?? snapshot.global)
    : roundScore(
        scores.autonomy * scoreWeights.autonomy +
          scores.qualityTech * scoreWeights.qualityTech +
          scores.costEfficiency * scoreWeights.costEfficiency +
          scores.designExcellence * scoreWeights.designExcellence
      );

  const timestampMs = parseTimestampMs(snapshot.updatedAt ?? snapshot.timestamp ?? snapshot.at);

  return {
    valid: true,
    snapshot: {
      id: normalizeText(String(snapshot.id ?? snapshot.windowRef ?? `SNAP-${index + 1}`)) || `SNAP-${index + 1}`,
      window: normalizeText(String(snapshot.window ?? 'period')) || 'period',
      windowRef: normalizeText(String(snapshot.windowRef ?? snapshot.id ?? `SNAP-${index + 1}`)) || `SNAP-${index + 1}`,
      updatedAt: Number.isFinite(timestampMs) ? toIso(timestampMs) : null,
      scores: {
        ...scores,
        global
      },
      band: resolveBand(global)
    }
  };
}

function normalizeSnapshots(payload, runtimeOptions, scoreWeights) {
  const source = Array.isArray(runtimeOptions.snapshots)
    ? runtimeOptions.snapshots
    : Array.isArray(payload.snapshots)
      ? payload.snapshots
      : Array.isArray(payload.historySnapshots)
        ? payload.historySnapshots
        : [];

  const series = [];

  for (let index = 0; index < source.length; index += 1) {
    const normalized = normalizeSnapshotEntry(source[index], index, scoreWeights);

    if (!normalized.valid) {
      return {
        valid: false,
        reasonCode: 'AQCD_SNAPSHOT_SERIES_INVALID',
        reason: normalized.reason
      };
    }

    series.push(normalized.snapshot);
  }

  series.sort((left, right) => {
    const leftTs = parseTimestampMs(left.updatedAt) ?? Number.POSITIVE_INFINITY;
    const rightTs = parseTimestampMs(right.updatedAt) ?? Number.POSITIVE_INFINITY;

    if (leftTs === rightTs) {
      return left.windowRef.localeCompare(right.windowRef);
    }

    return leftTs - rightTs;
  });

  return {
    valid: true,
    series
  };
}

export function buildAqcdExplainableScoreboard(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_AQCD_SCOREBOARD_INPUT',
      reason: 'Entrée AQCD invalide: objet requis.'
    });
  }

  const metrics = isObject(payload.metrics)
    ? payload.metrics
    : {
        autonomy: payload.autonomy,
        qualityTech: payload.qualityTech,
        costEfficiency: payload.costEfficiency,
        design: payload.design
      };

  if (!isObject(metrics)) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_METRICS_INCOMPLETE',
      reason: 'Bloc métriques AQCD manquant.'
    });
  }

  const metricSources =
    (isObject(runtimeOptions.metricSources) && runtimeOptions.metricSources) ||
    (isObject(payload.metricSources) && payload.metricSources) ||
    {};

  const scoreWeights = resolveScoreWeights(payload, runtimeOptions);
  const dimensionScores = {};
  const dimensionsFormula = {};

  for (const spec of DIMENSION_SPECS) {
    const weights = resolveDimensionWeights(payload, runtimeOptions, spec);
    const result = computeDimensionScore({
      spec,
      metricValues: metrics[spec.metricsKey],
      metricSources,
      weights
    });

    if (!result.valid) {
      return createResult({
        allowed: false,
        reasonCode: result.reasonCode,
        reason: result.reason,
        diagnostics: {
          dimension: spec.key,
          metricsKey: spec.metricsKey
        }
      });
    }

    dimensionScores[spec.key] = result.score;
    dimensionsFormula[spec.key] = {
      label: result.label,
      metricsKey: result.metricsKey,
      expression: result.expression,
      score: result.score,
      terms: result.terms,
      weights
    };
  }

  const globalScore = roundScore(
    dimensionScores.autonomy * scoreWeights.autonomy +
      dimensionScores.qualityTech * scoreWeights.qualityTech +
      dimensionScores.costEfficiency * scoreWeights.costEfficiency +
      dimensionScores.designExcellence * scoreWeights.designExcellence
  );

  const band = resolveBand(globalScore);
  const baselineTarget = normalizeFiniteNumber(
    runtimeOptions.baselineTarget ?? payload.baselineTarget ?? DEFAULT_BASELINE_TARGET,
    DEFAULT_BASELINE_TARGET
  );
  const baselineMet = globalScore >= baselineTarget;

  const latencySamples = Array.isArray(payload.latencySamplesMs) ? payload.latencySamplesMs : [];
  const p95LatencyMs = roundScore(computePercentile(latencySamples, 95));
  const latencyBudgetMs = normalizeFiniteNumber(
    runtimeOptions.latencyBudgetMs ?? payload.latencyBudgetMs ?? DEFAULT_EXPORT_LATENCY_BUDGET_MS,
    DEFAULT_EXPORT_LATENCY_BUDGET_MS
  );
  const latencyBudgetMet = p95LatencyMs <= latencyBudgetMs;

  const snapshots = normalizeSnapshots(payload, runtimeOptions, scoreWeights);
  if (!snapshots.valid) {
    return createResult({
      allowed: false,
      reasonCode: snapshots.reasonCode,
      reason: snapshots.reason
    });
  }

  const previousSnapshot = snapshots.series.length > 0 ? snapshots.series[snapshots.series.length - 1] : null;
  const trendDelta = previousSnapshot ? roundScore(globalScore - previousSnapshot.scores.global) : null;

  const trend = {
    currentGlobal: globalScore,
    previousGlobal: previousSnapshot?.scores?.global ?? null,
    deltaGlobal: trendDelta,
    direction:
      trendDelta === null ? 'stable' : trendDelta > 0 ? 'up' : trendDelta < 0 ? 'down' : 'stable',
    seriesCount: snapshots.series.length
  };

  const diagnostics = {
    window: normalizeText(String(payload.window ?? 'story')) || 'story',
    windowRef: normalizeText(String(payload.windowRef ?? payload.storyId ?? 'S000')) || 'S000',
    band,
    bandOrder: BAND_ORDER,
    scores: {
      autonomy: dimensionScores.autonomy,
      qualityTech: dimensionScores.qualityTech,
      costEfficiency: dimensionScores.costEfficiency,
      designExcellence: dimensionScores.designExcellence,
      global: globalScore
    },
    baselineTarget,
    baselineMet,
    latencyBudgetMs,
    p95LatencyMs,
    latencyBudgetMet,
    snapshotCount: snapshots.series.length
  };

  const formula = {
    scoreWeights,
    dimensions: dimensionsFormula,
    globalExpression:
      'qualityTech×scoreWeights.qualityTech + designExcellence×scoreWeights.designExcellence + autonomy×scoreWeights.autonomy + costEfficiency×scoreWeights.costEfficiency'
  };

  const scorecard = {
    model: 'AQCD',
    window: diagnostics.window,
    windowRef: diagnostics.windowRef,
    scores: diagnostics.scores,
    band,
    readiness: {
      baselineTarget,
      baselineMet
    }
  };

  const outputSnapshots = {
    series: snapshots.series,
    trend
  };

  if (!baselineMet) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_BASELINE_BELOW_TARGET',
      reason: `Readiness AQCD insuffisant: ${globalScore} < baseline ${baselineTarget}.`,
      diagnostics,
      scorecard,
      formula,
      snapshots: outputSnapshots
    });
  }

  if (!latencyBudgetMet) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_LATENCY_BUDGET_EXCEEDED',
      reason: `Latence p95 AQCD hors budget: ${p95LatencyMs}ms > ${latencyBudgetMs}ms.`,
      diagnostics,
      scorecard,
      formula,
      snapshots: outputSnapshots
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: 'Tableau AQCD explicable validé (formule + source + snapshots).',
    diagnostics,
    scorecard,
    formula,
    snapshots: outputSnapshots
  });
}
