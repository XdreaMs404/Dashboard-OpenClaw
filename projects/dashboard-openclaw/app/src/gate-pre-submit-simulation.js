import { buildSimulationTrendSnapshot } from './gate-simulation-trends.js';

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

function normalizeReasonCode(value) {
  const normalized = normalizeText(value);
  return normalized.length > 0 ? normalized : null;
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

function defaultTrendSnapshot() {
  return {
    phase: null,
    period: null,
    passCount: 0,
    concernsCount: 0,
    failCount: 0,
    totalCount: 0,
    trendDirection: 'FLAT',
    windowStartAt: null,
    windowEndAt: null
  };
}

function defaultEvidenceChain() {
  return {
    primaryEvidenceRefs: [],
    trendEvidenceRefs: []
  };
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
      impact:
        signal.blocking || signal.severity === 'FAIL'
          ? 'BLOCK'
          : signal.severity === 'CONCERNS'
            ? 'DEGRADE'
            : 'NEUTRAL',
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

function normalizePolicyResult(policyResult, fallbackBaseVerdict, fallbackSourceReasonCode) {
  if (!isObject(policyResult) || typeof policyResult.allowed !== 'boolean') {
    return {
      valid: false,
      reason:
        'policyVersionResult invalide: objet attendu avec { allowed:boolean, reasonCode:string, diagnostics? }.'
    };
  }

  const reasonCode = normalizeReasonCode(policyResult.reasonCode) ?? 'INVALID_GATE_SIMULATION_INPUT';
  const sourceReasonCode =
    normalizeReasonCode(policyResult.diagnostics?.sourceReasonCode) ??
    normalizeReasonCode(fallbackSourceReasonCode) ??
    reasonCode;

  if (!policyResult.allowed) {
    return {
      valid: true,
      blocked: true,
      reasonCode,
      sourceReasonCode,
      reason:
        normalizeText(policyResult.reason) ||
        `Blocage amont propagé sans réécriture (${reasonCode}).`,
      correctiveActions: normalizeArray(policyResult.correctiveActions)
    };
  }

  const baseVerdict = normalizeStatus(
    policyResult.diagnostics?.simulatedVerdict ??
      policyResult.diagnostics?.verdict ??
      fallbackBaseVerdict
  );

  if (!baseVerdict) {
    return {
      valid: false,
      reason:
        'policyVersionResult allowed=true mais verdict source introuvable (diagnostics.simulatedVerdict|verdict|baseVerdict).'
    };
  }

  return {
    valid: true,
    blocked: false,
    baseVerdict,
    sourceReasonCode,
    correctiveActions: normalizeArray(policyResult.correctiveActions)
  };
}

function resolveSource(payload, runtimeOptions) {
  const fallbackBaseVerdict = normalizeStatus(
    payload.baseVerdict ?? payload.verdict ?? payload.sourceVerdict
  );
  const fallbackSourceReasonCode = normalizeReasonCode(payload.sourceReasonCode) ?? 'OK';

  if (payload.policyVersionResult !== undefined) {
    return normalizePolicyResult(
      payload.policyVersionResult,
      fallbackBaseVerdict,
      fallbackSourceReasonCode
    );
  }

  if (payload.policyVersionInput !== undefined) {
    if (!isObject(payload.policyVersionInput)) {
      return {
        valid: false,
        reason: 'policyVersionInput invalide: objet attendu si fourni.'
      };
    }

    if (typeof runtimeOptions.versionGatePolicy !== 'function') {
      return {
        valid: false,
        reason:
          'policyVersionInput fourni sans delegate versionGatePolicy(options.versionGatePolicy).'
      };
    }

    const delegateOptions = isObject(runtimeOptions.versionGatePolicyOptions)
      ? runtimeOptions.versionGatePolicyOptions
      : {};

    let delegatedResult;

    try {
      delegatedResult = runtimeOptions.versionGatePolicy(payload.policyVersionInput, delegateOptions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        valid: false,
        reason: `versionGatePolicy a levé une exception: ${message}`
      };
    }

    return normalizePolicyResult(delegatedResult, fallbackBaseVerdict, fallbackSourceReasonCode);
  }

  if (!fallbackBaseVerdict) {
    return {
      valid: false,
      reason: 'baseVerdict/verdict/sourceVerdict invalide: PASS|CONCERNS|FAIL requis.'
    };
  }

  return {
    valid: true,
    blocked: false,
    baseVerdict: fallbackBaseVerdict,
    sourceReasonCode: fallbackSourceReasonCode,
    correctiveActions: []
  };
}

function normalizeEvidenceChain(payload, trendSnapshot, simulatedVerdict) {
  const evidenceInput = payload.evidenceChain;
  const strictEvidence = payload.requireEvidenceChain === true || evidenceInput !== undefined;

  if (evidenceInput !== undefined && !isObject(evidenceInput)) {
    return {
      valid: false,
      reason:
        'evidenceChain invalide: objet attendu avec primaryEvidenceRefs/trendEvidenceRefs.',
      correctiveActions: ['LINK_PRIMARY_EVIDENCE']
    };
  }

  const primaryEvidenceRefs = normalizeArray(
    evidenceInput?.primaryEvidenceRefs ?? payload.primaryEvidenceRefs
  );
  const trendEvidenceRefs = normalizeArray(
    evidenceInput?.trendEvidenceRefs ?? payload.trendEvidenceRefs
  );

  if (strictEvidence && (primaryEvidenceRefs.length === 0 || trendEvidenceRefs.length === 0)) {
    return {
      valid: false,
      reason:
        'Chaîne de preuve incomplète: primaryEvidenceRefs et trendEvidenceRefs sont requis.',
      correctiveActions: ['LINK_PRIMARY_EVIDENCE']
    };
  }

  const phase = normalizeText(trendSnapshot.phase) || 'G4';
  const period = normalizeText(trendSnapshot.period) || 'default';

  return {
    valid: true,
    evidenceChain: {
      primaryEvidenceRefs:
        primaryEvidenceRefs.length > 0
          ? primaryEvidenceRefs
          : [`simulation:${simulatedVerdict}`, `phase:${phase}`],
      trendEvidenceRefs:
        trendEvidenceRefs.length > 0
          ? trendEvidenceRefs
          : [`trend:${phase}:${period}`]
    }
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  simulation,
  trendSnapshot,
  evidenceChain,
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
    trendSnapshot: cloneValue(trendSnapshot),
    evidenceChain: cloneValue(evidenceChain),
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidInputResult({
  reason,
  durationMs = 0,
  sourceReasonCode = 'INVALID_GATE_SIMULATION_INPUT',
  correctiveActions = ['FIX_GATE_SIMULATION_INPUT']
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
    trendSnapshot: defaultTrendSnapshot(),
    evidenceChain: defaultEvidenceChain(),
    correctiveActions: normalizeArray(correctiveActions)
  });
}

function createBlockedSourceResult({
  reasonCode,
  reason,
  sourceReasonCode,
  durationMs,
  correctiveActions
}) {
  return createResult({
    allowed: false,
    reasonCode,
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
    trendSnapshot: defaultTrendSnapshot(),
    evidenceChain: defaultEvidenceChain(),
    correctiveActions:
      normalizeArray(correctiveActions).length > 0
        ? normalizeArray(correctiveActions)
        : ['FIX_GATE_SIMULATION_INPUT']
  });
}

export function simulateGateVerdictBeforeSubmission(input, options = {}) {
  const payload = isObject(input) ? input : {};
  const runtimeOptions = isObject(options) ? options : {};
  const nowMs = resolveNowProvider(runtimeOptions);
  const startedAtMs = nowMs();

  const sourceResolution = resolveSource(payload, runtimeOptions);

  if (!sourceResolution.valid) {
    return createInvalidInputResult({
      reason: sourceResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: normalizeReasonCode(payload.sourceReasonCode) ?? 'INVALID_GATE_SIMULATION_INPUT'
    });
  }

  if (sourceResolution.blocked) {
    return createBlockedSourceResult({
      reasonCode: sourceResolution.reasonCode,
      reason: sourceResolution.reason,
      sourceReasonCode: sourceResolution.sourceReasonCode,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      correctiveActions: sourceResolution.correctiveActions
    });
  }

  const baseVerdict = sourceResolution.baseVerdict;
  const simulationResolution = normalizeSimulationInput(payload);

  if (!simulationResolution.valid) {
    return createInvalidInputResult({
      reason: simulationResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
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
        sourceReasonCode: sourceResolution.sourceReasonCode
      },
      simulation: {
        eligible: false,
        simulatedVerdict: null,
        nonMutative: simulationResolution.simulationInput.readOnly,
        factors: [],
        evaluatedAt: null
      },
      trendSnapshot: defaultTrendSnapshot(),
      evidenceChain: defaultEvidenceChain(),
      correctiveActions
    });
  }

  const simulatedVerdict = resolveSimulatedVerdict(baseVerdict, simulationResolution.simulationInput);
  samples.push(toDurationMs(evaluateStartedAtMs, nowMs()));

  const evaluatedAtMs = parseTimestampMs(nowMs()) ?? Date.now();
  const durationMs = toDurationMs(startedAtMs, nowMs());
  samples.push(durationMs);

  const trendOptions = isObject(runtimeOptions.trendOptions) ? runtimeOptions.trendOptions : {};
  const trendResult = buildSimulationTrendSnapshot(
    {
      ...payload,
      baseVerdict,
      simulatedVerdict,
      sourceReasonCode: sourceResolution.sourceReasonCode
    },
    trendOptions
  );

  if (!trendResult.allowed) {
    const correctiveActions = normalizeArray([
      ...normalizeArray(payload.correctiveActions),
      ...normalizeArray(trendResult.correctiveActions),
      'FIX_TREND_WINDOW_INPUT'
    ]);

    return createResult({
      allowed: false,
      reasonCode: trendResult.reasonCode,
      reason: normalizeText(trendResult.reason) || 'Tendance simulation invalide.',
      diagnostics: {
        simulationEligible: true,
        simulatedVerdict,
        durationMs,
        p95SimulationMs: computePercentile(samples, 95),
        sourceReasonCode: sourceResolution.sourceReasonCode
      },
      simulation: {
        eligible: true,
        simulatedVerdict,
        nonMutative: simulationResolution.simulationInput.readOnly,
        factors: buildFactors(baseVerdict, simulatedVerdict, simulationResolution.simulationInput),
        evaluatedAt: new Date(evaluatedAtMs).toISOString()
      },
      trendSnapshot: isObject(trendResult.trendSnapshot)
        ? trendResult.trendSnapshot
        : defaultTrendSnapshot(),
      evidenceChain: defaultEvidenceChain(),
      correctiveActions
    });
  }

  const evidenceResolution = normalizeEvidenceChain(
    payload,
    trendResult.trendSnapshot,
    simulatedVerdict
  );

  if (!evidenceResolution.valid) {
    const correctiveActions = normalizeArray([
      ...normalizeArray(payload.correctiveActions),
      ...normalizeArray(evidenceResolution.correctiveActions)
    ]);

    return createResult({
      allowed: false,
      reasonCode: 'EVIDENCE_CHAIN_INCOMPLETE',
      reason: evidenceResolution.reason,
      diagnostics: {
        simulationEligible: true,
        simulatedVerdict,
        durationMs,
        p95SimulationMs: computePercentile(samples, 95),
        sourceReasonCode: sourceResolution.sourceReasonCode
      },
      simulation: {
        eligible: true,
        simulatedVerdict,
        nonMutative: simulationResolution.simulationInput.readOnly,
        factors: buildFactors(baseVerdict, simulatedVerdict, simulationResolution.simulationInput),
        evaluatedAt: new Date(evaluatedAtMs).toISOString()
      },
      trendSnapshot: trendResult.trendSnapshot,
      evidenceChain: defaultEvidenceChain(),
      correctiveActions
    });
  }

  const correctiveActions = normalizeArray(payload.correctiveActions);

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
      sourceReasonCode: sourceResolution.sourceReasonCode
    },
    simulation: {
      eligible: true,
      simulatedVerdict,
      nonMutative: simulationResolution.simulationInput.readOnly,
      factors: buildFactors(baseVerdict, simulatedVerdict, simulationResolution.simulationInput),
      evaluatedAt: new Date(evaluatedAtMs).toISOString()
    },
    trendSnapshot: trendResult.trendSnapshot,
    evidenceChain: evidenceResolution.evidenceChain,
    correctiveActions
  });
}
