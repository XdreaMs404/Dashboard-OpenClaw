const STATUS_SET = new Set(['PASS', 'CONCERNS', 'FAIL']);

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

function normalizeStatus(value) {
  const normalized = normalizeText(value).toUpperCase();

  if (!STATUS_SET.has(normalized)) {
    return null;
  }

  return normalized;
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

function normalizeSimulationInput(payload) {
  const simulationInput = payload.simulationInput ?? payload.simulation ?? {};

  if (!isObject(simulationInput)) {
    return {
      valid: false,
      reason: 'simulationInput invalide: objet attendu si fourni.'
    };
  }

  const providedSignals = simulationInput.additionalSignals ?? payload.additionalSignals;

  if (providedSignals !== undefined && !Array.isArray(providedSignals)) {
    return {
      valid: false,
      reason: 'additionalSignals invalide: tableau attendu si fourni.'
    };
  }

  const additionalSignals = [];

  if (Array.isArray(providedSignals)) {
    for (let index = 0; index < providedSignals.length; index += 1) {
      const rawSignal = providedSignals[index];

      if (!isObject(rawSignal)) {
        return {
          valid: false,
          reason: `additionalSignals[${index}] invalide: objet attendu.`
        };
      }

      const severity = normalizeStatus(rawSignal.severity ?? rawSignal.status);

      if (!severity) {
        return {
          valid: false,
          reason: `additionalSignals[${index}].severity invalide: PASS|CONCERNS|FAIL attendu.`
        };
      }

      if (rawSignal.blocking !== undefined && typeof rawSignal.blocking !== 'boolean') {
        return {
          valid: false,
          reason: `additionalSignals[${index}].blocking invalide: booléen attendu si fourni.`
        };
      }

      const factorId = normalizeText(rawSignal.factorId ?? rawSignal.signalId) || `signal-${index + 1}`;
      const detail = normalizeText(rawSignal.detail) || null;

      additionalSignals.push({
        factorId,
        severity,
        blocking: typeof rawSignal.blocking === 'boolean' ? rawSignal.blocking : severity === 'FAIL',
        detail
      });
    }
  }

  if (simulationInput.readOnly !== undefined && typeof simulationInput.readOnly !== 'boolean') {
    return {
      valid: false,
      reason: 'simulationInput.readOnly invalide: booléen attendu si fourni.'
    };
  }

  const forcedVerdict = normalizeStatus(simulationInput.forcedVerdict);

  if (simulationInput.forcedVerdict !== undefined && !forcedVerdict) {
    return {
      valid: false,
      reason: 'simulationInput.forcedVerdict invalide: PASS|CONCERNS|FAIL attendu si fourni.'
    };
  }

  const eligible = simulationInput.eligible !== false;

  return {
    valid: true,
    simulationInput: {
      eligible,
      readOnly: simulationInput.readOnly !== false,
      forcedVerdict,
      additionalSignals
    }
  };
}

function resolveSimulatedVerdict(baseVerdict, simulationInput) {
  let simulatedVerdict = simulationInput.forcedVerdict ?? baseVerdict;

  if (simulationInput.additionalSignals.some((signal) => signal.blocking || signal.severity === 'FAIL')) {
    simulatedVerdict = 'FAIL';
  } else if (
    simulatedVerdict !== 'FAIL' &&
    simulationInput.additionalSignals.some((signal) => signal.severity === 'CONCERNS')
  ) {
    simulatedVerdict = 'CONCERNS';
  }

  return simulatedVerdict;
}

function buildFactors(baseVerdict, simulatedVerdict, simulationInput) {
  const factors = [
    {
      factorId: 'BASE_VERDICT',
      status: baseVerdict,
      impact: baseVerdict === 'PASS' ? 'NEUTRAL' : 'DEGRADE',
      detail: `base=${baseVerdict}`
    }
  ];

  for (const signal of simulationInput.additionalSignals) {
    factors.push({
      factorId: signal.factorId,
      status: signal.severity,
      impact: signal.blocking || signal.severity === 'FAIL' ? 'BLOCK' : signal.severity === 'CONCERNS' ? 'DEGRADE' : 'NEUTRAL',
      detail: signal.detail ?? `signal=${signal.severity}`
    });
  }

  factors.push({
    factorId: 'SIMULATED_VERDICT',
    status: simulatedVerdict,
    impact: simulatedVerdict === 'PASS' ? 'NEUTRAL' : 'BLOCK',
    detail: `simulated=${simulatedVerdict}`
  });

  return factors;
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  simulation,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: {
      simulationEligible: diagnostics.simulationEligible,
      simulatedVerdict: diagnostics.simulatedVerdict,
      durationMs: diagnostics.durationMs,
      p95SimulationMs: diagnostics.p95SimulationMs,
      sourceReasonCode: diagnostics.sourceReasonCode
    },
    simulation: cloneValue(simulation),
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidInputResult({
  reason,
  durationMs = 0,
  sourceReasonCode = 'INVALID_GATE_SIMULATION_INPUT'
}) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_GATE_SIMULATION_INPUT',
    reason,
    diagnostics: {
      simulationEligible: false,
      simulatedVerdict: null,
      durationMs,
      p95SimulationMs: 0,
      sourceReasonCode
    },
    simulation: {
      eligible: false,
      simulatedVerdict: null,
      nonMutative: true,
      factors: [],
      evaluatedAt: null
    },
    correctiveActions: ['FIX_GATE_SIMULATION_INPUT']
  });
}

export function simulateGateVerdictBeforeSubmission(input, options = {}) {
  const payload = isObject(input) ? input : {};
  const runtimeOptions = isObject(options) ? options : {};
  const nowMs = resolveNowProvider(runtimeOptions);
  const startedAtMs = nowMs();

  const baseVerdict = normalizeStatus(payload.baseVerdict ?? payload.verdict ?? payload.sourceVerdict);

  if (!baseVerdict) {
    return createInvalidInputResult({
      reason: 'baseVerdict/verdict/sourceVerdict invalide: PASS|CONCERNS|FAIL requis.',
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: normalizeText(payload.sourceReasonCode) || 'INVALID_GATE_SIMULATION_INPUT'
    });
  }

  const simulationResolution = normalizeSimulationInput(payload);

  if (!simulationResolution.valid) {
    return createInvalidInputResult({
      reason: simulationResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: normalizeText(payload.sourceReasonCode) || 'INVALID_GATE_SIMULATION_INPUT'
    });
  }

  const samples = [];
  const evaluateStartedAtMs = nowMs();

  if (!simulationResolution.simulationInput.eligible) {
    const correctiveActions = normalizeArray(payload.correctiveActions);
    ensureAction(correctiveActions, 'ENABLE_PRE_SUBMIT_SIMULATION');

    return createResult({
      allowed: false,
      reasonCode: 'INVALID_GATE_SIMULATION_INPUT',
      reason: 'Simulation inéligible: définir simulationInput.eligible=true.',
      diagnostics: {
        simulationEligible: false,
        simulatedVerdict: null,
        durationMs: toDurationMs(startedAtMs, nowMs()),
        p95SimulationMs: computePercentile(samples, 95),
        sourceReasonCode: normalizeText(payload.sourceReasonCode) || 'INVALID_GATE_SIMULATION_INPUT'
      },
      simulation: {
        eligible: false,
        simulatedVerdict: null,
        nonMutative: simulationResolution.simulationInput.readOnly,
        factors: [],
        evaluatedAt: null
      },
      correctiveActions
    });
  }

  const simulatedVerdict = resolveSimulatedVerdict(baseVerdict, simulationResolution.simulationInput);
  samples.push(toDurationMs(evaluateStartedAtMs, nowMs()));

  const evaluatedAtMs = parseTimestampMs(nowMs()) ?? Date.now();
  const correctiveActions = normalizeArray(payload.correctiveActions);
  const durationMs = toDurationMs(startedAtMs, nowMs());
  samples.push(durationMs);

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason:
      `Simulation pré-soumission exécutée sans mutation: base=${baseVerdict}, ` +
      `simulated=${simulatedVerdict}.`,
    diagnostics: {
      simulationEligible: true,
      simulatedVerdict,
      durationMs,
      p95SimulationMs: computePercentile(samples, 95),
      sourceReasonCode: normalizeText(payload.sourceReasonCode) || 'OK'
    },
    simulation: {
      eligible: true,
      simulatedVerdict,
      nonMutative: simulationResolution.simulationInput.readOnly,
      factors: buildFactors(baseVerdict, simulatedVerdict, simulationResolution.simulationInput),
      evaluatedAt: new Date(evaluatedAtMs).toISOString()
    },
    correctiveActions
  });
}
