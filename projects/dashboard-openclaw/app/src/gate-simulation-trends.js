const STATUS_SET = new Set(['PASS', 'CONCERNS', 'FAIL']);

const REASON_CODES = Object.freeze([
  'OK',
  'SIMULATION_TREND_WINDOW_INVALID',
  'INVALID_GATE_SIMULATION_INPUT'
]);

const REASON_CODE_SET = new Set(REASON_CODES);

const TREND_DIRECTIONS = Object.freeze(['UP', 'FLAT', 'DOWN']);
const MILLIS_IN_DAY = 24 * 60 * 60 * 1000;

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

  for (const entry of value) {
    const normalized = normalizeText(String(entry ?? ''));

    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(normalized);
  }

  return output.sort((left, right) => left.localeCompare(right));
}

function normalizeReasonCode(value) {
  const normalized = normalizeText(value);

  if (!REASON_CODE_SET.has(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeStatus(value) {
  const normalized = normalizeText(value).toUpperCase();

  if (!STATUS_SET.has(normalized)) {
    return null;
  }

  return normalized;
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
    const normalized = value.trim();

    if (normalized.length === 0) {
      return null;
    }

    const parsed = Date.parse(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toIso(valueMs) {
  return new Date(valueMs).toISOString();
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

function resolveNowProvider(runtimeOptions) {
  return typeof runtimeOptions.nowMs === 'function' ? runtimeOptions.nowMs : () => Date.now();
}

function ensureAction(actions, action) {
  if (!actions.includes(action)) {
    actions.push(action);
  }
}

function normalizePhase(payload) {
  const phase = normalizeText(
    payload.phase ?? payload.gatePhase ?? payload.trendSnapshot?.phase ?? 'G4'
  ).toUpperCase();

  return phase.length > 0 ? phase : 'G4';
}

function normalizeTrendWindow(payload, nowMs) {
  const rawWindow = payload.trendWindow ?? payload.periodWindow ?? payload.window ?? {};

  if (!isObject(rawWindow)) {
    return {
      valid: false,
      reason: 'trendWindow invalide: objet attendu si fourni.',
      trendWindow: {
        startAt: null,
        endAt: null,
        period: null,
        startMs: null,
        endMs: null
      }
    };
  }

  const rawStart = rawWindow.startAt ?? rawWindow.from ?? payload.periodStartAt ?? payload.startAt;
  const rawEnd = rawWindow.endAt ?? rawWindow.to ?? payload.periodEndAt ?? payload.endAt;

  const hasStart = rawStart !== undefined;
  const hasEnd = rawEnd !== undefined;

  let startMs = hasStart ? parseTimestampMs(rawStart) : null;
  let endMs = hasEnd ? parseTimestampMs(rawEnd) : null;

  if ((hasStart && startMs === null) || (hasEnd && endMs === null)) {
    return {
      valid: false,
      reason:
        'Fenêtre tendance invalide: startAt/endAt doivent être des timestamps ISO/date/number valides.',
      trendWindow: {
        startAt: startMs === null ? null : toIso(startMs),
        endAt: endMs === null ? null : toIso(endMs),
        period: normalizeText(rawWindow.period ?? payload.period) || null,
        startMs,
        endMs
      }
    };
  }

  if (!hasStart && !hasEnd) {
    endMs = parseTimestampMs(nowMs()) ?? Date.now();
    startMs = endMs - 7 * MILLIS_IN_DAY;
  } else if (hasStart && !hasEnd) {
    endMs = parseTimestampMs(nowMs()) ?? Date.now();
  } else if (!hasStart && hasEnd) {
    startMs = endMs - 7 * MILLIS_IN_DAY;
  }

  if (startMs === null || endMs === null || startMs > endMs) {
    return {
      valid: false,
      reason: 'Fenêtre tendance invalide: startAt <= endAt requis.',
      trendWindow: {
        startAt: startMs === null ? null : toIso(startMs),
        endAt: endMs === null ? null : toIso(endMs),
        period: normalizeText(rawWindow.period ?? payload.period) || null,
        startMs,
        endMs
      }
    };
  }

  const period =
    normalizeText(rawWindow.period ?? payload.period) ||
    `${toIso(startMs).slice(0, 10)}..${toIso(endMs).slice(0, 10)}`;

  return {
    valid: true,
    trendWindow: {
      startAt: toIso(startMs),
      endAt: toIso(endMs),
      period,
      startMs,
      endMs
    }
  };
}

function normalizeTrendSamples(payload, startMs, endMs) {
  const rawSamples =
    payload.trendSamples ?? payload.samples ?? payload.history ?? payload.simulationHistory;

  if (rawSamples !== undefined && !Array.isArray(rawSamples)) {
    return {
      valid: false,
      reason: 'trendSamples invalide: tableau attendu si fourni.'
    };
  }

  const normalized = [];

  if (Array.isArray(rawSamples)) {
    for (let index = 0; index < rawSamples.length; index += 1) {
      const sample = rawSamples[index];

      if (!isObject(sample)) {
        return {
          valid: false,
          reason: `trendSamples[${index}] invalide: objet attendu.`
        };
      }

      const verdict = normalizeStatus(sample.simulatedVerdict ?? sample.verdict ?? sample.status);

      if (!verdict) {
        return {
          valid: false,
          reason: `trendSamples[${index}].verdict invalide: PASS|CONCERNS|FAIL attendu.`
        };
      }

      const rawAt = sample.at ?? sample.timestamp ?? sample.evaluatedAt ?? sample.changedAt;
      const hasAt = rawAt !== undefined;
      const sampleAtMs = hasAt ? parseTimestampMs(rawAt) : null;

      if (hasAt && sampleAtMs === null) {
        return {
          valid: false,
          reason:
            `trendSamples[${index}] timestamp invalide: at/timestamp/evaluatedAt/changedAt ISO requis.`
        };
      }

      if (sampleAtMs !== null && (sampleAtMs < startMs || sampleAtMs > endMs)) {
        continue;
      }

      normalized.push({
        verdict,
        atMs: sampleAtMs
      });
    }
  }

  if (normalized.length === 0) {
    const fallbackVerdict = normalizeStatus(
      payload.simulatedVerdict ?? payload.baseVerdict ?? payload.verdict ?? payload.sourceVerdict
    );

    if (fallbackVerdict) {
      normalized.push({
        verdict: fallbackVerdict,
        atMs: endMs
      });
    }
  }

  return {
    valid: true,
    samples: normalized
  };
}

function scoreVerdict(verdict) {
  if (verdict === 'PASS') {
    return 2;
  }

  if (verdict === 'CONCERNS') {
    return 1;
  }

  return 0;
}

function computeTrendDirection(samples) {
  if (!Array.isArray(samples) || samples.length <= 1) {
    return 'FLAT';
  }

  const splitIndex = Math.floor(samples.length / 2);

  if (splitIndex <= 0 || splitIndex >= samples.length) {
    return 'FLAT';
  }

  const firstSegment = samples.slice(0, splitIndex);
  const secondSegment = samples.slice(splitIndex);

  const firstScore =
    firstSegment.reduce((total, sample) => total + scoreVerdict(sample.verdict), 0) /
    firstSegment.length;

  const secondScore =
    secondSegment.reduce((total, sample) => total + scoreVerdict(sample.verdict), 0) /
    secondSegment.length;

  const delta = secondScore - firstScore;

  if (delta > 0.1) {
    return 'UP';
  }

  if (delta < -0.1) {
    return 'DOWN';
  }

  return 'FLAT';
}

function countVerdicts(samples) {
  const counters = {
    passCount: 0,
    concernsCount: 0,
    failCount: 0
  };

  for (const sample of samples) {
    if (sample.verdict === 'PASS') {
      counters.passCount += 1;
    } else if (sample.verdict === 'CONCERNS') {
      counters.concernsCount += 1;
    } else {
      counters.failCount += 1;
    }
  }

  return counters;
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  trendSnapshot,
  correctiveActions
}) {
  const trendDirection = TREND_DIRECTIONS.includes(trendSnapshot.trendDirection)
    ? trendSnapshot.trendDirection
    : 'FLAT';

  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: {
      phase: diagnostics.phase,
      period: diagnostics.period,
      trendWindow: cloneValue(diagnostics.trendWindow),
      trendSamples: diagnostics.trendSamples,
      durationMs: diagnostics.durationMs,
      p95TrendMs: diagnostics.p95TrendMs,
      sourceReasonCode: diagnostics.sourceReasonCode
    },
    trendSnapshot: {
      phase: trendSnapshot.phase,
      period: trendSnapshot.period,
      passCount: trendSnapshot.passCount,
      concernsCount: trendSnapshot.concernsCount,
      failCount: trendSnapshot.failCount,
      totalCount: trendSnapshot.totalCount,
      trendDirection,
      windowStartAt: trendSnapshot.windowStartAt,
      windowEndAt: trendSnapshot.windowEndAt
    },
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidTrendWindowResult({
  reason,
  phase = 'G4',
  period = null,
  durationMs = 0,
  sourceReasonCode = 'SIMULATION_TREND_WINDOW_INVALID',
  correctiveActions = []
}) {
  const normalizedActions = normalizeArray(correctiveActions);
  ensureAction(normalizedActions, 'FIX_TREND_WINDOW_INPUT');

  return createResult({
    allowed: false,
    reasonCode: 'SIMULATION_TREND_WINDOW_INVALID',
    reason,
    diagnostics: {
      phase,
      period,
      trendWindow: {
        startAt: null,
        endAt: null
      },
      trendSamples: 0,
      durationMs,
      p95TrendMs: 0,
      sourceReasonCode
    },
    trendSnapshot: {
      phase,
      period,
      passCount: 0,
      concernsCount: 0,
      failCount: 0,
      totalCount: 0,
      trendDirection: 'FLAT',
      windowStartAt: null,
      windowEndAt: null
    },
    correctiveActions: normalizedActions
  });
}

function createInvalidInputResult({
  reason,
  phase = 'G4',
  period = null,
  durationMs = 0,
  sourceReasonCode = 'INVALID_GATE_SIMULATION_INPUT',
  correctiveActions = []
}) {
  const normalizedActions = normalizeArray(correctiveActions);
  ensureAction(normalizedActions, 'FIX_GATE_SIMULATION_INPUT');

  return createResult({
    allowed: false,
    reasonCode: 'INVALID_GATE_SIMULATION_INPUT',
    reason,
    diagnostics: {
      phase,
      period,
      trendWindow: {
        startAt: null,
        endAt: null
      },
      trendSamples: 0,
      durationMs,
      p95TrendMs: 0,
      sourceReasonCode
    },
    trendSnapshot: {
      phase,
      period,
      passCount: 0,
      concernsCount: 0,
      failCount: 0,
      totalCount: 0,
      trendDirection: 'FLAT',
      windowStartAt: null,
      windowEndAt: null
    },
    correctiveActions: normalizedActions
  });
}

export function buildSimulationTrendSnapshot(input, options = {}) {
  const payload = isObject(input) ? input : {};
  const runtimeOptions = isObject(options) ? options : {};
  const nowMs = resolveNowProvider(runtimeOptions);
  const startedAtMs = nowMs();
  const phase = normalizePhase(payload);

  if (!isObject(input)) {
    return createInvalidInputResult({
      reason: 'input invalide: objet attendu.',
      phase,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: 'INVALID_GATE_SIMULATION_INPUT',
      correctiveActions: normalizeArray(payload.correctiveActions)
    });
  }

  const sourceReasonCode =
    normalizeReasonCode(payload.sourceReasonCode) ??
    (normalizeText(payload.sourceReasonCode) || 'OK');

  const samples = [];
  const evaluateStartedAtMs = nowMs();

  const trendWindowResolution = normalizeTrendWindow(payload, nowMs);

  if (!trendWindowResolution.valid) {
    return createInvalidTrendWindowResult({
      reason: trendWindowResolution.reason,
      phase,
      period: normalizeText(payload.period) || null,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode,
      correctiveActions: normalizeArray(payload.correctiveActions)
    });
  }

  const trendWindow = trendWindowResolution.trendWindow;

  const trendSamplesResolution = normalizeTrendSamples(
    payload,
    trendWindow.startMs,
    trendWindow.endMs
  );

  if (!trendSamplesResolution.valid) {
    return createInvalidInputResult({
      reason: trendSamplesResolution.reason,
      phase,
      period: trendWindow.period,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode,
      correctiveActions: normalizeArray(payload.correctiveActions)
    });
  }

  const trendSamples = trendSamplesResolution.samples;
  const counters = countVerdicts(trendSamples);
  const totalCount = counters.passCount + counters.concernsCount + counters.failCount;

  const trendDirection = computeTrendDirection(trendSamples);
  samples.push(toDurationMs(evaluateStartedAtMs, nowMs()));

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: `Tendance calculée pour ${phase} sur ${trendWindow.period}.`,
    diagnostics: {
      phase,
      period: trendWindow.period,
      trendWindow: {
        startAt: trendWindow.startAt,
        endAt: trendWindow.endAt
      },
      trendSamples: totalCount,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      p95TrendMs: computePercentile(samples, 95),
      sourceReasonCode
    },
    trendSnapshot: {
      phase,
      period: trendWindow.period,
      passCount: counters.passCount,
      concernsCount: counters.concernsCount,
      failCount: counters.failCount,
      totalCount,
      trendDirection,
      windowStartAt: trendWindow.startAt,
      windowEndAt: trendWindow.endAt
    },
    correctiveActions: normalizeArray(payload.correctiveActions)
  });
}
