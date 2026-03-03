import { buildAqcdExplainableScoreboard } from './aqcd-scoreboard.js';

const DEFAULT_CADENCE_HOURS = 24;
const DEFAULT_CONTINUITY_TOLERANCE_MULTIPLIER = 2;
const DEFAULT_READINESS_THRESHOLD = 65;
const DEFAULT_STALE_AFTER_HOURS = 36;

const DEFAULT_READINESS_RULE_WEIGHTS = Object.freeze({
  baseline: 35,
  trend: 25,
  continuity: 25,
  freshness: 15
});

const BASE_REASON_CODES = Object.freeze([
  'OK',
  'INVALID_AQCD_SCOREBOARD_INPUT',
  'AQCD_METRICS_INCOMPLETE',
  'AQCD_WEIGHTS_INVALID',
  'AQCD_FORMULA_SOURCE_MISSING',
  'AQCD_SNAPSHOT_SERIES_INVALID',
  'AQCD_BASELINE_BELOW_TARGET',
  'AQCD_LATENCY_BUDGET_EXCEEDED'
]);

const REASON_CODES = Object.freeze([
  ...BASE_REASON_CODES,
  'INVALID_AQCD_SNAPSHOT_COMPARISON_INPUT',
  'AQCD_COMPARATIVE_SNAPSHOTS_REQUIRED',
  'AQCD_SNAPSHOT_CONTINUITY_GAP',
  'AQCD_READINESS_RULES_INCOMPLETE'
]);

const REASON_CODE_SET = new Set(REASON_CODES);

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_AQCD_SNAPSHOT_COMPARISON_INPUT: ['FIX_AQCD_SNAPSHOT_COMPARISON_INPUT'],
  AQCD_COMPARATIVE_SNAPSHOTS_REQUIRED: ['ADD_AQCD_PERIODIC_SNAPSHOTS'],
  AQCD_SNAPSHOT_CONTINUITY_GAP: ['RESTORE_AQCD_SNAPSHOT_CADENCE'],
  AQCD_READINESS_RULES_INCOMPLETE: ['COMPLETE_AQCD_READINESS_RULES'],
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

function resolveNowMs(runtimeOptions) {
  if (typeof runtimeOptions.nowMs === 'function') {
    const resolved = Number(runtimeOptions.nowMs());
    return Number.isFinite(resolved) ? resolved : Date.now();
  }

  const direct = Number(runtimeOptions.nowMs);

  if (Number.isFinite(direct)) {
    return Math.trunc(direct);
  }

  return Date.now();
}

function resolveBand(value) {
  const score = normalizeFiniteNumber(value);

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

function directionFromDelta(delta) {
  if (delta > 0) {
    return 'up';
  }

  if (delta < 0) {
    return 'down';
  }

  return 'stable';
}

function normalizeCorrectiveActions(actions, reasonCode) {
  const defaultActions = DEFAULT_CORRECTIVE_ACTIONS[reasonCode] ?? [];

  if (!Array.isArray(actions)) {
    return cloneValue(defaultActions);
  }

  const output = [];
  const seen = new Set();

  for (const action of actions) {
    const normalized = normalizeText(String(action ?? ''));

    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(normalized);
  }

  return output.length > 0 ? output : cloneValue(defaultActions);
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  scorecard,
  formula,
  snapshots,
  readiness,
  correctiveActions
}) {
  const normalizedReasonCode =
    normalizeReasonCode(reasonCode) ?? 'INVALID_AQCD_SNAPSHOT_COMPARISON_INPUT';

  return {
    allowed,
    reasonCode: normalizedReasonCode,
    reason,
    diagnostics: cloneValue(diagnostics ?? {}),
    scorecard: cloneValue(scorecard ?? null),
    formula: cloneValue(formula ?? null),
    snapshots: cloneValue(snapshots ?? null),
    readiness: cloneValue(readiness ?? null),
    correctiveActions: normalizeCorrectiveActions(correctiveActions, normalizedReasonCode)
  };
}

function resolveReadinessRules(payload, runtimeOptions) {
  const source =
    (isObject(runtimeOptions.readinessRules) && runtimeOptions.readinessRules) ||
    (isObject(payload.readinessRules) && payload.readinessRules) ||
    {};

  const weightsSource = isObject(source.weights) ? source.weights : source;
  const weights = {
    baseline: normalizeFiniteNumber(
      weightsSource.baseline,
      DEFAULT_READINESS_RULE_WEIGHTS.baseline
    ),
    trend: normalizeFiniteNumber(weightsSource.trend, DEFAULT_READINESS_RULE_WEIGHTS.trend),
    continuity: normalizeFiniteNumber(
      weightsSource.continuity,
      DEFAULT_READINESS_RULE_WEIGHTS.continuity
    ),
    freshness: normalizeFiniteNumber(
      weightsSource.freshness,
      DEFAULT_READINESS_RULE_WEIGHTS.freshness
    )
  };

  const weightsValid = Object.values(weights).every(
    (value) => Number.isFinite(value) && value > 0
  );

  if (!weightsValid) {
    return {
      valid: false,
      reason:
        'readinessRules invalides: chaque poids (baseline/trend/continuity/freshness) doit être > 0.',
      weights
    };
  }

  return {
    valid: true,
    rulesVersion:
      normalizeText(String(source.version ?? payload.readinessRulesVersion ?? 'S050-v1')) ||
      'S050-v1',
    weights,
    threshold: normalizeFiniteNumber(
      source.threshold ?? payload.readinessThreshold ?? DEFAULT_READINESS_THRESHOLD,
      DEFAULT_READINESS_THRESHOLD
    ),
    staleAfterHours: normalizeFiniteNumber(
      source.staleAfterHours ??
        payload.staleAfterHours ??
        runtimeOptions.staleAfterHours ??
        DEFAULT_STALE_AFTER_HOURS,
      DEFAULT_STALE_AFTER_HOURS
    )
  };
}

function resolveCadence(payload, runtimeOptions) {
  const cadenceHours = normalizeFiniteNumber(
    runtimeOptions.cadenceHours ?? payload.cadenceHours ?? DEFAULT_CADENCE_HOURS,
    DEFAULT_CADENCE_HOURS
  );

  const toleranceMultiplier = normalizeFiniteNumber(
    runtimeOptions.continuityToleranceMultiplier ??
      payload.continuityToleranceMultiplier ??
      DEFAULT_CONTINUITY_TOLERANCE_MULTIPLIER,
    DEFAULT_CONTINUITY_TOLERANCE_MULTIPLIER
  );

  if (!Number.isFinite(cadenceHours) || cadenceHours <= 0) {
    return {
      valid: false,
      reason: 'cadenceHours invalide: valeur > 0 requise.'
    };
  }

  if (!Number.isFinite(toleranceMultiplier) || toleranceMultiplier <= 0) {
    return {
      valid: false,
      reason: 'continuityToleranceMultiplier invalide: valeur > 0 requise.'
    };
  }

  return {
    valid: true,
    cadenceHours,
    toleranceMultiplier,
    cadenceMs: cadenceHours * 60 * 60 * 1000,
    allowedGapMs: cadenceHours * toleranceMultiplier * 60 * 60 * 1000
  };
}

function buildComparisons(series) {
  const comparisons = [];
  const intervalsMs = [];

  for (let index = 1; index < series.length; index += 1) {
    const previous = series[index - 1];
    const current = series[index];

    const previousTs = parseTimestampMs(previous.updatedAt);
    const currentTs = parseTimestampMs(current.updatedAt);

    const intervalMs =
      previousTs !== null && currentTs !== null
        ? Math.max(0, currentTs - previousTs)
        : null;

    if (Number.isFinite(intervalMs)) {
      intervalsMs.push(intervalMs);
    }

    const delta = {
      autonomy: roundScore(current.scores.autonomy - previous.scores.autonomy),
      qualityTech: roundScore(current.scores.qualityTech - previous.scores.qualityTech),
      costEfficiency: roundScore(
        current.scores.costEfficiency - previous.scores.costEfficiency
      ),
      designExcellence: roundScore(
        current.scores.designExcellence - previous.scores.designExcellence
      ),
      global: roundScore(current.scores.global - previous.scores.global)
    };

    comparisons.push({
      fromRef: previous.windowRef,
      toRef: current.windowRef,
      fromAt: previous.updatedAt ?? null,
      toAt: current.updatedAt ?? null,
      intervalMs,
      delta,
      direction: directionFromDelta(delta.global)
    });
  }

  return {
    comparisons,
    intervalsMs
  };
}

function buildReadiness({
  baseResult,
  comparisons,
  metricsContinuous,
  staleAfterHours,
  readinessRules,
  nowMs,
  latestSnapshotTs
}) {
  const maxScore = Object.values(readinessRules.weights).reduce(
    (total, value) => total + value,
    0
  );

  const lastComparison = comparisons.length > 0 ? comparisons[comparisons.length - 1] : null;
  const trendDelta = lastComparison ? lastComparison.delta.global : 0;

  const trendSatisfaction = trendDelta > 0 ? 1 : trendDelta === 0 ? 0.6 : 0.2;
  const baselineSatisfaction = baseResult.diagnostics?.baselineMet === true ? 1 : 0;
  const continuitySatisfaction = metricsContinuous ? 1 : 0;

  const staleAfterMs = staleAfterHours * 60 * 60 * 1000;
  const snapshotAgeMs =
    latestSnapshotTs === null ? Number.POSITIVE_INFINITY : Math.max(0, nowMs - latestSnapshotTs);
  const freshnessSatisfaction = snapshotAgeMs <= staleAfterMs ? 1 : 0;

  const factors = [
    {
      rule: 'BASELINE_THRESHOLD',
      weight: readinessRules.weights.baseline,
      satisfied: baselineSatisfaction === 1,
      contribution: roundScore(readinessRules.weights.baseline * baselineSatisfaction),
      detail: `global=${baseResult.diagnostics?.scores?.global ?? 0} baseline=${baseResult.diagnostics?.baselineTarget ?? 0}`
    },
    {
      rule: 'TREND_DIRECTION',
      weight: readinessRules.weights.trend,
      satisfied: trendSatisfaction > 0,
      contribution: roundScore(readinessRules.weights.trend * trendSatisfaction),
      detail: `deltaGlobal=${trendDelta}`
    },
    {
      rule: 'PERIODIC_CONTINUITY',
      weight: readinessRules.weights.continuity,
      satisfied: continuitySatisfaction === 1,
      contribution: roundScore(readinessRules.weights.continuity * continuitySatisfaction),
      detail: `continuous=${String(metricsContinuous)}`
    },
    {
      rule: 'SNAPSHOT_FRESHNESS',
      weight: readinessRules.weights.freshness,
      satisfied: freshnessSatisfaction === 1,
      contribution: roundScore(readinessRules.weights.freshness * freshnessSatisfaction),
      detail: `ageMs=${Number.isFinite(snapshotAgeMs) ? snapshotAgeMs : 'INF'} staleAfterHours=${staleAfterHours}`
    }
  ];

  const earnedScore = roundScore(
    factors.reduce((total, factor) => total + factor.contribution, 0)
  );

  const readinessScore =
    maxScore > 0 ? roundScore((earnedScore / maxScore) * 100) : 0;

  return {
    model: 'AQCD_READINESS_RULES',
    rulesVersion: readinessRules.rulesVersion,
    threshold: roundScore(readinessRules.threshold),
    score: readinessScore,
    met: readinessScore >= readinessRules.threshold,
    band: resolveBand(readinessScore),
    factors,
    context: {
      maxScore: roundScore(maxScore),
      earnedScore,
      staleAfterHours: roundScore(staleAfterHours),
      snapshotAgeMs: Number.isFinite(snapshotAgeMs) ? Math.trunc(snapshotAgeMs) : null
    }
  };
}

export function buildAqcdSnapshotComparisons(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_AQCD_SNAPSHOT_COMPARISON_INPUT',
      reason: 'Entrée S050 invalide: objet requis.'
    });
  }

  const cadence = resolveCadence(payload, runtimeOptions);
  if (!cadence.valid) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_AQCD_SNAPSHOT_COMPARISON_INPUT',
      reason: cadence.reason
    });
  }

  const readinessRules = resolveReadinessRules(payload, runtimeOptions);
  if (!readinessRules.valid) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_READINESS_RULES_INCOMPLETE',
      reason: readinessRules.reason
    });
  }

  const baseResult = buildAqcdExplainableScoreboard(payload, runtimeOptions);

  if (!baseResult.allowed) {
    return createResult({
      allowed: false,
      reasonCode: baseResult.reasonCode,
      reason: baseResult.reason,
      diagnostics: baseResult.diagnostics,
      scorecard: baseResult.scorecard,
      formula: baseResult.formula,
      snapshots: baseResult.snapshots,
      readiness: null,
      correctiveActions: baseResult.correctiveActions
    });
  }

  const series = Array.isArray(baseResult.snapshots?.series)
    ? cloneValue(baseResult.snapshots.series)
    : [];

  if (series.length < 2) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_COMPARATIVE_SNAPSHOTS_REQUIRED',
      reason: 'Comparatif S050 indisponible: au moins 2 snapshots AQCD sont requis.',
      diagnostics: {
        ...baseResult.diagnostics,
        cadenceHours: cadence.cadenceHours,
        continuityToleranceMultiplier: cadence.toleranceMultiplier,
        snapshotCount: series.length
      },
      scorecard: baseResult.scorecard,
      formula: baseResult.formula,
      snapshots: {
        ...baseResult.snapshots,
        comparisons: []
      },
      readiness: null,
      correctiveActions: ['ADD_AQCD_PERIODIC_SNAPSHOTS']
    });
  }

  const comparisonsPayload = buildComparisons(series);
  const intervalsMs = comparisonsPayload.intervalsMs;

  const maxGapMs =
    intervalsMs.length > 0 ? Math.max(...intervalsMs) : Number.POSITIVE_INFINITY;
  const averageGapMs =
    intervalsMs.length > 0
      ? roundScore(intervalsMs.reduce((total, value) => total + value, 0) / intervalsMs.length)
      : 0;

  const metricsContinuous = intervalsMs.length > 0 && maxGapMs <= cadence.allowedGapMs;

  const nowMs = resolveNowMs(runtimeOptions);
  const latestSnapshot = series[series.length - 1] ?? null;
  const latestSnapshotTs = parseTimestampMs(latestSnapshot?.updatedAt ?? null);

  const readiness = buildReadiness({
    baseResult,
    comparisons: comparisonsPayload.comparisons,
    metricsContinuous,
    staleAfterHours: readinessRules.staleAfterHours,
    readinessRules,
    nowMs,
    latestSnapshotTs
  });

  const outputSnapshots = {
    ...baseResult.snapshots,
    cadenceHours: cadence.cadenceHours,
    continuity: {
      allowedGapMs: Math.trunc(cadence.allowedGapMs),
      maxGapMs: Number.isFinite(maxGapMs) ? Math.trunc(maxGapMs) : null,
      averageGapMs: Math.trunc(averageGapMs),
      continuous: metricsContinuous
    },
    comparisons: comparisonsPayload.comparisons
  };

  const diagnostics = {
    ...baseResult.diagnostics,
    cadenceHours: cadence.cadenceHours,
    continuityToleranceMultiplier: cadence.toleranceMultiplier,
    comparisonCount: comparisonsPayload.comparisons.length,
    metricsContinuous,
    readinessScore: readiness.score,
    readinessThreshold: readiness.threshold
  };

  const enforceContinuity = runtimeOptions.enforceContinuity !== false;

  if (enforceContinuity && !metricsContinuous) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_SNAPSHOT_CONTINUITY_GAP',
      reason: `Continuité snapshots AQCD rompue: maxGapMs=${Math.trunc(maxGapMs)} > allowedGapMs=${Math.trunc(cadence.allowedGapMs)}.`,
      diagnostics,
      scorecard: baseResult.scorecard,
      formula: baseResult.formula,
      snapshots: outputSnapshots,
      readiness,
      correctiveActions: ['RESTORE_AQCD_SNAPSHOT_CADENCE']
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: 'Snapshots AQCD périodiques et comparatifs validés (S050).',
    diagnostics,
    scorecard: baseResult.scorecard,
    formula: baseResult.formula,
    snapshots: outputSnapshots,
    readiness,
    correctiveActions: []
  });
}
