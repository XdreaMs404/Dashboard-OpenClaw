import { buildAqcdSnapshotComparisons } from './aqcd-snapshot-comparisons.js';

const DEFAULT_RULE_WEIGHTS = Object.freeze({
  snapshotComparative: 30,
  trendStability: 25,
  continuityHealth: 25,
  freshnessHealth: 20
});

const DEFAULT_THRESHOLD = 70;

const BASE_REASON_CODES = Object.freeze([
  'OK',
  'INVALID_AQCD_SCOREBOARD_INPUT',
  'AQCD_METRICS_INCOMPLETE',
  'AQCD_WEIGHTS_INVALID',
  'AQCD_FORMULA_SOURCE_MISSING',
  'AQCD_SNAPSHOT_SERIES_INVALID',
  'AQCD_BASELINE_BELOW_TARGET',
  'AQCD_LATENCY_BUDGET_EXCEEDED',
  'INVALID_AQCD_SNAPSHOT_COMPARISON_INPUT',
  'AQCD_COMPARATIVE_SNAPSHOTS_REQUIRED',
  'AQCD_SNAPSHOT_CONTINUITY_GAP',
  'AQCD_READINESS_RULES_INCOMPLETE'
]);

const REASON_CODES = Object.freeze([
  ...BASE_REASON_CODES,
  'INVALID_AQCD_READINESS_INPUT',
  'AQCD_READINESS_RULES_INVALID',
  'AQCD_READINESS_THRESHOLD_UNMET'
]);

const REASON_CODE_SET = new Set(REASON_CODES);

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_AQCD_READINESS_INPUT: ['FIX_AQCD_READINESS_INPUT_STRUCTURE'],
  AQCD_READINESS_RULES_INVALID: ['ALIGN_AQCD_READINESS_RULES'],
  AQCD_READINESS_THRESHOLD_UNMET: ['IMPROVE_AQCD_READINESS_FACTORS'],
  AQCD_COMPARATIVE_SNAPSHOTS_REQUIRED: ['ADD_AQCD_PERIODIC_SNAPSHOTS'],
  AQCD_SNAPSHOT_CONTINUITY_GAP: ['RESTORE_AQCD_SNAPSHOT_CADENCE']
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

function clamp(value, min, max) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function resolveBand(score) {
  const normalized = normalizeFiniteNumber(score);

  if (normalized >= 85) {
    return 'INDUSTRIAL';
  }

  if (normalized >= 70) {
    return 'STABLE';
  }

  if (normalized >= 55) {
    return 'FRAGILE';
  }

  return 'NON_ACCEPTABLE';
}

function normalizeActions(actions, reasonCode) {
  const defaults = DEFAULT_CORRECTIVE_ACTIONS[reasonCode] ?? [];

  if (!Array.isArray(actions)) {
    return cloneValue(defaults);
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

  return output.length > 0 ? output : cloneValue(defaults);
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  scorecard,
  snapshots,
  readiness,
  recommendations,
  correctiveActions
}) {
  const normalizedReasonCode =
    normalizeReasonCode(reasonCode) ?? 'INVALID_AQCD_READINESS_INPUT';

  return {
    allowed,
    reasonCode: normalizedReasonCode,
    reason,
    diagnostics: cloneValue(diagnostics ?? {}),
    scorecard: cloneValue(scorecard ?? null),
    snapshots: cloneValue(snapshots ?? null),
    readiness: cloneValue(readiness ?? null),
    recommendations: cloneValue(recommendations ?? []),
    correctiveActions: normalizeActions(correctiveActions, normalizedReasonCode)
  };
}

function resolveRules(payload, runtimeOptions) {
  const source =
    (isObject(runtimeOptions.readinessV1Rules) && runtimeOptions.readinessV1Rules) ||
    (isObject(payload.readinessV1Rules) && payload.readinessV1Rules) ||
    {};

  const weightsSource = isObject(source.weights) ? source.weights : source;

  const weights = {
    snapshotComparative: normalizeFiniteNumber(
      weightsSource.snapshotComparative,
      DEFAULT_RULE_WEIGHTS.snapshotComparative
    ),
    trendStability: normalizeFiniteNumber(
      weightsSource.trendStability,
      DEFAULT_RULE_WEIGHTS.trendStability
    ),
    continuityHealth: normalizeFiniteNumber(
      weightsSource.continuityHealth,
      DEFAULT_RULE_WEIGHTS.continuityHealth
    ),
    freshnessHealth: normalizeFiniteNumber(
      weightsSource.freshnessHealth,
      DEFAULT_RULE_WEIGHTS.freshnessHealth
    )
  };

  const weightsValid = Object.values(weights).every(
    (value) => Number.isFinite(value) && value > 0
  );

  if (!weightsValid) {
    return {
      valid: false,
      reason:
        'readinessV1Rules invalides: tous les poids (snapshotComparative/trendStability/continuityHealth/freshnessHealth) doivent être > 0.',
      weights
    };
  }

  return {
    valid: true,
    rulesVersion:
      normalizeText(String(source.version ?? payload.readinessV1Version ?? 'S051-v1')) ||
      'S051-v1',
    threshold: normalizeFiniteNumber(
      source.threshold ?? payload.readinessV1Threshold ?? DEFAULT_THRESHOLD,
      DEFAULT_THRESHOLD
    ),
    weights
  };
}

function factorScoreSnapshotComparative(comparisons) {
  const count = Array.isArray(comparisons) ? comparisons.length : 0;

  if (count <= 0) {
    return 0;
  }

  return clamp(60 + count * 15, 0, 100);
}

function factorScoreTrend(trendDirection) {
  const normalized = normalizeText(String(trendDirection ?? '')).toLowerCase();

  if (normalized === 'up') {
    return 100;
  }

  if (normalized === 'stable') {
    return 75;
  }

  if (normalized === 'down') {
    return 35;
  }

  return 50;
}

function factorScoreContinuity(continuous) {
  return continuous === true ? 100 : 30;
}

function factorScoreFreshness(snapshotAgeMs, staleAfterHours) {
  const ageMs = normalizeFiniteNumber(snapshotAgeMs, Number.POSITIVE_INFINITY);
  const staleAfterMs = Math.max(1, staleAfterHours * 60 * 60 * 1000);

  if (!Number.isFinite(ageMs)) {
    return 0;
  }

  if (ageMs <= staleAfterMs) {
    return 100;
  }

  const overflowRatio = (ageMs - staleAfterMs) / staleAfterMs;
  const penalty = clamp(overflowRatio * 100, 0, 100);

  return roundScore(100 - penalty);
}

function resolveRecommendations({ factors, payload, runtimeOptions }) {
  const ownerOverrides = isObject(payload.recommendationOwners)
    ? payload.recommendationOwners
    : {};
  const evidenceOverrides = isObject(payload.recommendationEvidence)
    ? payload.recommendationEvidence
    : {};

  const defaultOwner =
    normalizeText(String(runtimeOptions.defaultRecommendationOwner ?? payload.defaultRecommendationOwner ?? 'PM')) ||
    'PM';

  const definitions = {
    SNAPSHOT_COMPARATIVE: {
      actionId: 'AQCD_ACTION_INCREASE_COMPARATIVE_DEPTH',
      gate: 'G4',
      owner: normalizeText(String(ownerOverrides.SNAPSHOT_COMPARATIVE ?? defaultOwner)) || defaultOwner,
      evidenceRef:
        normalizeText(
          String(
            evidenceOverrides.SNAPSHOT_COMPARATIVE ??
              '_bmad-output/implementation-artifacts/scorecards/aqcd-latest.json'
          )
        ) || '_bmad-output/implementation-artifacts/scorecards/aqcd-latest.json',
      action: 'Augmenter la profondeur des snapshots comparatifs (minimum 3 périodes glissantes).'
    },
    TREND_STABILITY: {
      actionId: 'AQCD_ACTION_STABILIZE_TREND',
      gate: 'G4',
      owner: normalizeText(String(ownerOverrides.TREND_STABILITY ?? 'TEA')) || 'TEA',
      evidenceRef:
        normalizeText(
          String(
            evidenceOverrides.TREND_STABILITY ??
              '_bmad-output/implementation-artifacts/handoffs/S051-dev-to-tea.md'
          )
        ) || '_bmad-output/implementation-artifacts/handoffs/S051-dev-to-tea.md',
      action: 'Réduire la variance négative des verdicts et stabiliser la tendance globale AQCD.'
    },
    CONTINUITY_HEALTH: {
      actionId: 'AQCD_ACTION_RESTORE_CADENCE',
      gate: 'G4',
      owner: normalizeText(String(ownerOverrides.CONTINUITY_HEALTH ?? 'SM')) || 'SM',
      evidenceRef:
        normalizeText(
          String(
            evidenceOverrides.CONTINUITY_HEALTH ??
              '_bmad-output/implementation-artifacts/story-runtimes/S051-runtime.md'
          )
        ) || '_bmad-output/implementation-artifacts/story-runtimes/S051-runtime.md',
      action: 'Restaurer la cadence périodique des snapshots pour garantir la continuité métrique.'
    },
    FRESHNESS_HEALTH: {
      actionId: 'AQCD_ACTION_REFRESH_SNAPSHOT',
      gate: 'G4',
      owner: normalizeText(String(ownerOverrides.FRESHNESS_HEALTH ?? defaultOwner)) || defaultOwner,
      evidenceRef:
        normalizeText(
          String(
            evidenceOverrides.FRESHNESS_HEALTH ??
              '_bmad-output/implementation-artifacts/scorecards/aqcd-latest.md'
          )
        ) || '_bmad-output/implementation-artifacts/scorecards/aqcd-latest.md',
      action: 'Rafraîchir les snapshots AQCD pour éviter la dérive de fraîcheur des données.'
    }
  };

  return factors
    .filter((factor) => factor.satisfied === false)
    .map((factor) => ({
      ...definitions[factor.rule],
      rule: factor.rule,
      priorityScore: roundScore(factor.impactGap),
      score: factor.score,
      targetScore: 80
    }))
    .filter((item) => isObject(item) && normalizeText(String(item.actionId ?? '')).length > 0)
    .sort((left, right) => right.priorityScore - left.priorityScore)
    .slice(0, 3);
}

export function buildAqcdReadinessRules(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_AQCD_READINESS_INPUT',
      reason: 'Entrée S051 invalide: objet requis.'
    });
  }

  const rules = resolveRules(payload, runtimeOptions);

  if (!rules.valid) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_READINESS_RULES_INVALID',
      reason: rules.reason,
      diagnostics: {
        rulesVersion: 'S051-v1',
        threshold: DEFAULT_THRESHOLD
      }
    });
  }

  const comparisonResult = buildAqcdSnapshotComparisons(payload, runtimeOptions);

  if (!comparisonResult.allowed) {
    return createResult({
      allowed: false,
      reasonCode: comparisonResult.reasonCode,
      reason: comparisonResult.reason,
      diagnostics: {
        ...comparisonResult.diagnostics,
        rulesVersion: rules.rulesVersion,
        threshold: roundScore(rules.threshold)
      },
      scorecard: comparisonResult.scorecard,
      snapshots: comparisonResult.snapshots,
      readiness: comparisonResult.readiness,
      recommendations: [],
      correctiveActions: comparisonResult.correctiveActions
    });
  }

  const comparisons = Array.isArray(comparisonResult.snapshots?.comparisons)
    ? comparisonResult.snapshots.comparisons
    : [];

  const trendDirection = normalizeText(
    String(comparisonResult.snapshots?.trend?.direction ?? 'stable')
  ).toLowerCase();

  const continuity = comparisonResult.snapshots?.continuity?.continuous === true;

  const snapshotAgeMs = normalizeFiniteNumber(
    comparisonResult.readiness?.context?.snapshotAgeMs,
    Number.POSITIVE_INFINITY
  );
  const staleAfterHours = normalizeFiniteNumber(
    comparisonResult.readiness?.context?.staleAfterHours,
    36
  );

  const factorValues = {
    SNAPSHOT_COMPARATIVE: factorScoreSnapshotComparative(comparisons),
    TREND_STABILITY: factorScoreTrend(trendDirection),
    CONTINUITY_HEALTH: factorScoreContinuity(continuity),
    FRESHNESS_HEALTH: factorScoreFreshness(snapshotAgeMs, staleAfterHours)
  };

  const weightedFactors = [
    {
      rule: 'SNAPSHOT_COMPARATIVE',
      label: 'Snapshots comparatifs disponibles',
      score: factorValues.SNAPSHOT_COMPARATIVE,
      weight: rules.weights.snapshotComparative,
      source: `comparisonCount=${comparisons.length}`
    },
    {
      rule: 'TREND_STABILITY',
      label: 'Stabilité de la tendance AQCD',
      score: factorValues.TREND_STABILITY,
      weight: rules.weights.trendStability,
      source: `trendDirection=${trendDirection || 'stable'}`
    },
    {
      rule: 'CONTINUITY_HEALTH',
      label: 'Continuité périodique des snapshots',
      score: factorValues.CONTINUITY_HEALTH,
      weight: rules.weights.continuityHealth,
      source: `continuous=${String(continuity)}`
    },
    {
      rule: 'FRESHNESS_HEALTH',
      label: 'Fraîcheur des snapshots',
      score: factorValues.FRESHNESS_HEALTH,
      weight: rules.weights.freshnessHealth,
      source: `snapshotAgeMs=${Number.isFinite(snapshotAgeMs) ? snapshotAgeMs : 'INF'}`
    }
  ];

  const maxWeight = weightedFactors.reduce((total, factor) => total + factor.weight, 0);

  const factors = weightedFactors.map((factor) => {
    const contribution = roundScore((factor.score / 100) * factor.weight);
    const satisfied = factor.score >= 80;

    return {
      rule: factor.rule,
      label: factor.label,
      score: roundScore(factor.score),
      targetScore: 80,
      weight: roundScore(factor.weight),
      contribution,
      satisfied,
      impactGap: roundScore((100 - factor.score) * factor.weight),
      source: factor.source
    };
  });

  const totalContribution = factors.reduce((total, factor) => total + factor.contribution, 0);
  const readinessScore = maxWeight > 0 ? roundScore((totalContribution / maxWeight) * 100) : 0;
  const met = readinessScore >= rules.threshold;

  const readiness = {
    model: 'AQCD_READINESS_RULES_V1',
    rulesVersion: rules.rulesVersion,
    threshold: roundScore(rules.threshold),
    score: readinessScore,
    met,
    band: resolveBand(readinessScore),
    factors
  };

  const recommendations = resolveRecommendations({ factors, payload, runtimeOptions });

  const diagnostics = {
    ...comparisonResult.diagnostics,
    rulesVersion: rules.rulesVersion,
    readinessScore,
    readinessThreshold: roundScore(rules.threshold),
    recommendationCount: recommendations.length
  };

  if (!met) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_READINESS_THRESHOLD_UNMET',
      reason: `Readiness S051 insuffisant: ${readinessScore} < ${roundScore(rules.threshold)}.`,
      diagnostics,
      scorecard: comparisonResult.scorecard,
      snapshots: comparisonResult.snapshots,
      readiness,
      recommendations,
      correctiveActions: ['IMPROVE_AQCD_READINESS_FACTORS']
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: 'Readiness score rule-based v1 validé (S051).',
    diagnostics,
    scorecard: comparisonResult.scorecard,
    snapshots: comparisonResult.snapshots,
    readiness,
    recommendations,
    correctiveActions: []
  });
}
