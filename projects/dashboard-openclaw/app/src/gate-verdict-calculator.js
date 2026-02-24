import { evaluateG4DualCorrelation } from './g4-dual-evaluation.js';

const REASON_CODES = Object.freeze([
  'OK',
  'INVALID_PHASE',
  'TRANSITION_NOT_ALLOWED',
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED',
  'PHASE_PREREQUISITES_MISSING',
  'PHASE_PREREQUISITES_INCOMPLETE',
  'INVALID_PHASE_PREREQUISITES',
  'OVERRIDE_NOT_ELIGIBLE',
  'OVERRIDE_REQUEST_MISSING',
  'OVERRIDE_JUSTIFICATION_REQUIRED',
  'OVERRIDE_APPROVER_REQUIRED',
  'OVERRIDE_APPROVER_CONFLICT',
  'DEPENDENCY_STATE_STALE',
  'INVALID_PHASE_DEPENDENCY_INPUT',
  'PHASE_SEQUENCE_GAP_DETECTED',
  'PHASE_SEQUENCE_REGRESSION_DETECTED',
  'REPEATED_BLOCKING_ANOMALY',
  'INVALID_PHASE_PROGRESSION_INPUT',
  'INVALID_GOVERNANCE_DECISION_INPUT',
  'GATE_STATUS_INCOMPLETE',
  'G4_SUBGATE_MISMATCH',
  'INVALID_GATE_CENTER_INPUT',
  'G4_SUBGATES_UNSYNC',
  'G4_DUAL_EVALUATION_FAILED',
  'INVALID_G4_DUAL_INPUT',
  'GATE_VERDICT_CONCERNS',
  'EVIDENCE_CHAIN_INCOMPLETE',
  'INVALID_GATE_VERDICT_INPUT'
]);

const REASON_CODE_SET = new Set(REASON_CODES);
const STATUS_SET = new Set(['PASS', 'CONCERNS', 'FAIL']);

const UPSTREAM_BLOCKING_REASON_CODES = new Set([
  'INVALID_PHASE',
  'TRANSITION_NOT_ALLOWED',
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED',
  'PHASE_PREREQUISITES_MISSING',
  'PHASE_PREREQUISITES_INCOMPLETE',
  'INVALID_PHASE_PREREQUISITES',
  'OVERRIDE_NOT_ELIGIBLE',
  'OVERRIDE_REQUEST_MISSING',
  'OVERRIDE_JUSTIFICATION_REQUIRED',
  'OVERRIDE_APPROVER_REQUIRED',
  'OVERRIDE_APPROVER_CONFLICT',
  'DEPENDENCY_STATE_STALE',
  'INVALID_PHASE_DEPENDENCY_INPUT',
  'PHASE_SEQUENCE_GAP_DETECTED',
  'PHASE_SEQUENCE_REGRESSION_DETECTED',
  'REPEATED_BLOCKING_ANOMALY',
  'INVALID_PHASE_PROGRESSION_INPUT',
  'INVALID_GOVERNANCE_DECISION_INPUT',
  'GATE_STATUS_INCOMPLETE',
  'G4_SUBGATE_MISMATCH',
  'INVALID_GATE_CENTER_INPUT',
  'G4_SUBGATES_UNSYNC',
  'G4_DUAL_EVALUATION_FAILED',
  'INVALID_G4_DUAL_INPUT'
]);

const ACTION_BY_REASON = Object.freeze({
  INVALID_PHASE: 'ALIGN_CANONICAL_PHASE',
  TRANSITION_NOT_ALLOWED: 'ALIGN_PHASE_SEQUENCE',
  PHASE_NOTIFICATION_MISSING: 'PUBLISH_PHASE_NOTIFICATION',
  PHASE_NOTIFICATION_SLA_EXCEEDED: 'PUBLISH_PHASE_NOTIFICATION',
  PHASE_PREREQUISITES_MISSING: 'COMPLETE_PREREQUISITES',
  PHASE_PREREQUISITES_INCOMPLETE: 'COMPLETE_PREREQUISITES',
  INVALID_PHASE_PREREQUISITES: 'FIX_PHASE_PREREQUISITES',
  OVERRIDE_NOT_ELIGIBLE: 'REVIEW_OVERRIDE_POLICY',
  OVERRIDE_REQUEST_MISSING: 'SUBMIT_OVERRIDE_REQUEST',
  OVERRIDE_JUSTIFICATION_REQUIRED: 'ADD_OVERRIDE_JUSTIFICATION',
  OVERRIDE_APPROVER_REQUIRED: 'ASSIGN_OVERRIDE_APPROVER',
  OVERRIDE_APPROVER_CONFLICT: 'RESOLVE_OVERRIDE_APPROVER_CONFLICT',
  DEPENDENCY_STATE_STALE: 'REFRESH_DEPENDENCY_MATRIX',
  INVALID_PHASE_DEPENDENCY_INPUT: 'FIX_PHASE_DEPENDENCY_INPUT',
  PHASE_SEQUENCE_GAP_DETECTED: 'REVIEW_PHASE_SEQUENCE',
  PHASE_SEQUENCE_REGRESSION_DETECTED: 'ROLLBACK_TO_CANONICAL_PHASE',
  REPEATED_BLOCKING_ANOMALY: 'ESCALATE_TO_PM',
  INVALID_PHASE_PROGRESSION_INPUT: 'FIX_PHASE_PROGRESSION_INPUT',
  INVALID_GOVERNANCE_DECISION_INPUT: 'FIX_GOVERNANCE_DECISION_INPUT',
  GATE_STATUS_INCOMPLETE: 'COMPLETE_GATE_STATUS_FIELDS',
  G4_SUBGATE_MISMATCH: 'ALIGN_G4_SUBGATES',
  INVALID_GATE_CENTER_INPUT: 'FIX_GATE_CENTER_INPUT',
  G4_SUBGATES_UNSYNC: 'SYNC_G4_SUBGATES',
  G4_DUAL_EVALUATION_FAILED: 'RETRY_G4_DUAL_EVALUATION',
  INVALID_G4_DUAL_INPUT: 'FIX_G4_DUAL_INPUT',
  GATE_VERDICT_CONCERNS: 'REVIEW_GATE_CONCERNS',
  EVIDENCE_CHAIN_INCOMPLETE: 'LINK_PRIMARY_EVIDENCE',
  INVALID_GATE_VERDICT_INPUT: 'FIX_GATE_VERDICT_INPUT'
});

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneValue(value) {
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

function normalizeCorrectiveActions(reasonCode, correctiveActions) {
  const normalized = normalizeArray(correctiveActions);

  if (normalized.length > 0) {
    return normalized;
  }

  return [ACTION_BY_REASON[reasonCode]].filter((entry) => typeof entry === 'string');
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
  const sorted = [...samples].map((value) => Number(value)).sort((left, right) => left - right);
  const ratio = Math.min(100, Math.max(0, Number(percentile))) / 100;
  const index = Math.ceil(sorted.length * ratio) - 1;

  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function resolveNowProvider(runtimeOptions) {
  return typeof runtimeOptions.nowMs === 'function' ? runtimeOptions.nowMs : () => Date.now();
}

function resolveInputGatesCount(payload) {
  if (Array.isArray(payload.gateStatuses)) {
    const set = new Set(
      payload.gateStatuses
        .map((entry) => normalizeText(entry?.gateId).toUpperCase())
        .filter((entry) => entry.length > 0)
    );

    if (set.size > 0) {
      return set.size;
    }
  }

  if (Number.isInteger(payload.inputGatesCount) && payload.inputGatesCount >= 0) {
    return payload.inputGatesCount;
  }

  return 5;
}

function normalizeDualSubGate(rawSubGate, expectedGateId, label) {
  if (!isObject(rawSubGate)) {
    return {
      valid: false,
      reason: `${label} invalide: objet attendu.`
    };
  }

  const gateId = normalizeText(rawSubGate.gateId).toUpperCase();

  if (gateId !== expectedGateId) {
    return {
      valid: false,
      reason: `${label}.gateId invalide: ${expectedGateId} attendu.`
    };
  }

  const status = normalizeStatus(rawSubGate.status);

  if (!status) {
    return {
      valid: false,
      reason: `${label}.status invalide: PASS|CONCERNS|FAIL attendu.`
    };
  }

  const owner = normalizeText(rawSubGate.owner);

  if (owner.length === 0) {
    return {
      valid: false,
      reason: `${label}.owner invalide: chaîne non vide requise.`
    };
  }

  const updatedAtMs = parseTimestampMs(rawSubGate.updatedAt);

  if (updatedAtMs === null) {
    return {
      valid: false,
      reason: `${label}.updatedAt invalide: timestamp ISO/date/number requis.`
    };
  }

  const evidenceCount =
    Number.isInteger(rawSubGate.evidenceCount) && rawSubGate.evidenceCount >= 0
      ? rawSubGate.evidenceCount
      : Array.isArray(rawSubGate.evidenceRefs)
        ? rawSubGate.evidenceRefs.length
        : 0;

  return {
    valid: true,
    subGate: {
      gateId,
      status,
      owner,
      updatedAt: toIso(updatedAtMs),
      updatedAtMs,
      evidenceCount,
      reasonCode: normalizeReasonCode(rawSubGate.reasonCode) ?? (status === 'PASS' ? 'OK' : null),
      sourceReasonCode:
        normalizeReasonCode(rawSubGate.sourceReasonCode) ??
        normalizeReasonCode(rawSubGate.reasonCode) ??
        (status === 'PASS' ? 'OK' : 'G4_DUAL_EVALUATION_FAILED')
    }
  };
}

function normalizeG4DualResult(result) {
  if (!isObject(result)) {
    return {
      valid: false,
      reason: 'g4DualResult invalide: objet attendu.'
    };
  }

  if (typeof result.allowed !== 'boolean') {
    return {
      valid: false,
      reason: 'g4DualResult.allowed invalide: booléen attendu.'
    };
  }

  const reasonCode = normalizeReasonCode(result.reasonCode);

  if (!reasonCode) {
    return {
      valid: false,
      reason: `g4DualResult.reasonCode invalide: ${normalizeText(result.reasonCode) || 'vide'}.`
    };
  }

  const sourceReasonCode = normalizeReasonCode(result.diagnostics?.sourceReasonCode) ?? reasonCode;

  if (!result.allowed) {
    if (!UPSTREAM_BLOCKING_REASON_CODES.has(reasonCode)) {
      return {
        valid: false,
        reason: `g4DualResult.reasonCode non propagable: ${reasonCode}.`
      };
    }

    return {
      valid: true,
      blocked: true,
      reasonCode,
      sourceReasonCode,
      reason: normalizeText(result.reason) || `Source G4 dual bloquée (${reasonCode}).`,
      correctiveActions: normalizeCorrectiveActions(reasonCode, result.correctiveActions),
      g4t: null,
      g4ux: null,
      dualVerdict: null,
      mismatchCount: 0,
      synchronized: false
    };
  }

  if (reasonCode !== 'OK') {
    return {
      valid: false,
      reason: `g4DualResult incohérent: allowed=true exige reasonCode=OK (reçu ${reasonCode}).`
    };
  }

  if (!isObject(result.g4DualStatus)) {
    return {
      valid: false,
      reason: 'g4DualResult.g4DualStatus invalide: objet attendu quand allowed=true.'
    };
  }

  const g4tResolution = normalizeDualSubGate(result.g4DualStatus.g4t, 'G4-T', 'g4DualStatus.g4t');

  if (!g4tResolution.valid) {
    return g4tResolution;
  }

  const g4uxResolution = normalizeDualSubGate(result.g4DualStatus.g4ux, 'G4-UX', 'g4DualStatus.g4ux');

  if (!g4uxResolution.valid) {
    return g4uxResolution;
  }

  const mismatchCount =
    Number.isInteger(result.diagnostics?.mismatchCount) && result.diagnostics.mismatchCount >= 0
      ? result.diagnostics.mismatchCount
      : 0;

  const dualVerdict =
    normalizeStatus(result.g4DualStatus.dualVerdict) ??
    normalizeStatus(result.diagnostics?.dualVerdict);

  return {
    valid: true,
    blocked: false,
    reasonCode,
    sourceReasonCode,
    reason: normalizeText(result.reason),
    correctiveActions: normalizeArray(result.correctiveActions),
    g4t: g4tResolution.subGate,
    g4ux: g4uxResolution.subGate,
    dualVerdict,
    mismatchCount,
    synchronized:
      typeof result.g4DualStatus.synchronized === 'boolean'
        ? result.g4DualStatus.synchronized
        : mismatchCount === 0
  };
}

function resolveSource(payload, runtimeOptions) {
  if (payload.g4DualResult !== undefined) {
    return normalizeG4DualResult(payload.g4DualResult);
  }

  if (payload.g4DualInput !== undefined) {
    if (!isObject(payload.g4DualInput)) {
      return {
        valid: false,
        reason: 'g4DualInput invalide: objet attendu.'
      };
    }

    const delegatedOptions = isObject(runtimeOptions.g4DualOptions)
      ? runtimeOptions.g4DualOptions
      : {};

    let delegatedResult;

    try {
      delegatedResult = evaluateG4DualCorrelation(payload.g4DualInput, delegatedOptions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        valid: false,
        reason: `evaluateG4DualCorrelation a levé une exception: ${message}`
      };
    }

    return normalizeG4DualResult(delegatedResult);
  }

  return {
    valid: false,
    reason: 'Aucune source exploitable: fournir g4DualResult ou g4DualInput.'
  };
}

function normalizeEvidenceRefs(payload) {
  const evidenceRefs = [];

  if (payload.evidenceRefs !== undefined) {
    if (!Array.isArray(payload.evidenceRefs)) {
      return {
        valid: false,
        reason: 'evidenceRefs invalide: tableau attendu si fourni.'
      };
    }

    evidenceRefs.push(...payload.evidenceRefs);
  }

  if (payload.evidenceByGateRefs !== undefined) {
    if (!isObject(payload.evidenceByGateRefs)) {
      return {
        valid: false,
        reason: 'evidenceByGateRefs invalide: objet attendu si fourni.'
      };
    }

    for (const [gateId, refs] of Object.entries(payload.evidenceByGateRefs)) {
      if (!Array.isArray(refs)) {
        return {
          valid: false,
          reason: `evidenceByGateRefs.${gateId} invalide: tableau attendu.`
        };
      }

      for (const ref of refs) {
        evidenceRefs.push(`${gateId}:${String(ref ?? '')}`);
      }
    }
  }

  if (payload.requireEvidenceRefs !== undefined && typeof payload.requireEvidenceRefs !== 'boolean') {
    return {
      valid: false,
      reason: 'requireEvidenceRefs invalide: booléen attendu si fourni.'
    };
  }

  return {
    valid: true,
    evidenceRefs: normalizeArray(evidenceRefs),
    requireEvidenceRefs: payload.requireEvidenceRefs !== false
  };
}

function normalizeAdditionalSignals(payload) {
  if (payload.additionalSignals === undefined) {
    return {
      valid: true,
      additionalSignals: []
    };
  }

  if (!Array.isArray(payload.additionalSignals)) {
    return {
      valid: false,
      reason: 'additionalSignals invalide: tableau attendu si fourni.'
    };
  }

  const normalized = [];

  for (let index = 0; index < payload.additionalSignals.length; index += 1) {
    const rawSignal = payload.additionalSignals[index];

    if (!isObject(rawSignal)) {
      return {
        valid: false,
        reason: `additionalSignals[${index}] invalide: objet attendu.`
      };
    }

    const signalId =
      normalizeText(rawSignal.signalId) ||
      normalizeText(rawSignal.id) ||
      `signal-${index + 1}`;

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

    normalized.push({
      signalId,
      severity,
      blocking: typeof rawSignal.blocking === 'boolean' ? rawSignal.blocking : severity === 'FAIL',
      detail: normalizeText(rawSignal.detail) || null,
      reasonCode:
        normalizeReasonCode(rawSignal.reasonCode) ??
        (severity === 'PASS' ? 'OK' : 'TRANSITION_NOT_ALLOWED')
    });
  }

  return {
    valid: true,
    additionalSignals: normalized
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  verdict,
  canMarkDone,
  contributingFactors,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: {
      inputGatesCount: diagnostics.inputGatesCount,
      evidenceCount: diagnostics.evidenceCount,
      g4tStatus: diagnostics.g4tStatus,
      g4uxStatus: diagnostics.g4uxStatus,
      durationMs: diagnostics.durationMs,
      p95VerdictMs: diagnostics.p95VerdictMs,
      sourceReasonCode: diagnostics.sourceReasonCode
    },
    verdict,
    canMarkDone,
    contributingFactors: contributingFactors.map((entry) => cloneValue(entry)),
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidInputResult({ reason, durationMs = 0, sourceReasonCode = 'INVALID_GATE_VERDICT_INPUT' }) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_GATE_VERDICT_INPUT',
    reason,
    diagnostics: {
      inputGatesCount: 0,
      evidenceCount: 0,
      g4tStatus: null,
      g4uxStatus: null,
      durationMs,
      p95VerdictMs: 0,
      sourceReasonCode
    },
    verdict: null,
    canMarkDone: false,
    contributingFactors: [],
    correctiveActions: ['FIX_GATE_VERDICT_INPUT']
  });
}

function createBlockedResult({ reasonCode, reason, sourceReasonCode, durationMs, correctiveActions }) {
  return createResult({
    allowed: false,
    reasonCode,
    reason,
    diagnostics: {
      inputGatesCount: 0,
      evidenceCount: 0,
      g4tStatus: null,
      g4uxStatus: null,
      durationMs,
      p95VerdictMs: 0,
      sourceReasonCode
    },
    verdict: null,
    canMarkDone: false,
    contributingFactors: [],
    correctiveActions: normalizeCorrectiveActions(reasonCode, correctiveActions)
  });
}

function resolveVerdict({ g4tStatus, g4uxStatus, mismatchCount, additionalSignals }) {
  let verdict = 'PASS';

  if (g4tStatus === 'FAIL' || g4uxStatus === 'FAIL') {
    verdict = 'FAIL';
  } else if (g4tStatus === 'CONCERNS' || g4uxStatus === 'CONCERNS') {
    verdict = 'CONCERNS';
  }

  if (mismatchCount > 0) {
    verdict = 'FAIL';
  }

  if (additionalSignals.some((signal) => signal.blocking || signal.severity === 'FAIL')) {
    verdict = 'FAIL';
  } else if (verdict !== 'FAIL' && additionalSignals.some((signal) => signal.severity === 'CONCERNS')) {
    verdict = 'CONCERNS';
  }

  return verdict;
}

function buildContributingFactors({ sourceResolution, additionalSignals, evidenceRefs, verdict }) {
  const factors = [
    {
      factorId: 'G4-T_STATUS',
      gateId: 'G4-T',
      status: sourceResolution.g4t.status,
      impact: sourceResolution.g4t.status === 'PASS' ? 'NEUTRAL' : 'DEGRADE',
      detail: `G4-T=${sourceResolution.g4t.status}`
    },
    {
      factorId: 'G4-UX_STATUS',
      gateId: 'G4-UX',
      status: sourceResolution.g4ux.status,
      impact: sourceResolution.g4ux.status === 'PASS' ? 'NEUTRAL' : 'DEGRADE',
      detail: `G4-UX=${sourceResolution.g4ux.status}`
    },
    {
      factorId: 'EVIDENCE_CHAIN',
      gateId: 'G4',
      status: evidenceRefs.length > 0 ? 'PASS' : 'FAIL',
      impact: evidenceRefs.length > 0 ? 'NEUTRAL' : 'BLOCK',
      detail: `evidenceRefs=${evidenceRefs.length}`
    }
  ];

  if (sourceResolution.mismatchCount > 0 || sourceResolution.synchronized === false) {
    factors.push({
      factorId: 'G4_DUAL_MISMATCH',
      gateId: 'G4',
      status: 'FAIL',
      impact: 'BLOCK',
      detail: `mismatchCount=${sourceResolution.mismatchCount}`
    });
  }

  for (const signal of additionalSignals) {
    factors.push({
      factorId: signal.signalId,
      gateId: 'GLOBAL',
      status: signal.severity,
      impact: signal.blocking || signal.severity === 'FAIL' ? 'BLOCK' : signal.severity === 'CONCERNS' ? 'DEGRADE' : 'NEUTRAL',
      detail: signal.detail ?? `signal=${signal.severity}`
    });
  }

  factors.push({
    factorId: 'FINAL_VERDICT',
    gateId: 'GLOBAL',
    status: verdict,
    impact: verdict === 'PASS' ? 'NEUTRAL' : 'BLOCK',
    detail: `verdict=${verdict}`
  });

  return factors;
}

function resolveFailReasonCode(sourceResolution, additionalSignals) {
  const candidates = [
    sourceResolution.g4t?.status === 'FAIL' ? sourceResolution.g4t.reasonCode : null,
    sourceResolution.g4ux?.status === 'FAIL' ? sourceResolution.g4ux.reasonCode : null,
    ...additionalSignals
      .filter((signal) => signal.blocking || signal.severity === 'FAIL')
      .map((signal) => signal.reasonCode),
    sourceResolution.sourceReasonCode,
    'TRANSITION_NOT_ALLOWED'
  ];

  for (const candidate of candidates) {
    const normalized = normalizeReasonCode(candidate);

    if (normalized && normalized !== 'OK') {
      return normalized;
    }
  }

  return 'TRANSITION_NOT_ALLOWED';
}

function ensureAction(actions, action) {
  if (!actions.includes(action)) {
    actions.push(action);
  }
}

export function calculateGateVerdict(input, options = {}) {
  const payload = isObject(input) ? input : {};
  const runtimeOptions = isObject(options) ? options : {};
  const nowMs = resolveNowProvider(runtimeOptions);
  const startedAtMs = nowMs();

  const sourceResolution = resolveSource(payload, runtimeOptions);

  if (!sourceResolution.valid) {
    return createInvalidInputResult({
      reason: sourceResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs())
    });
  }

  if (sourceResolution.blocked) {
    return createBlockedResult({
      reasonCode: sourceResolution.reasonCode,
      reason: sourceResolution.reason,
      sourceReasonCode: sourceResolution.sourceReasonCode,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      correctiveActions: sourceResolution.correctiveActions
    });
  }

  const evidenceResolution = normalizeEvidenceRefs(payload);

  if (!evidenceResolution.valid) {
    return createInvalidInputResult({
      reason: evidenceResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
    });
  }

  const additionalSignalsResolution = normalizeAdditionalSignals(payload);

  if (!additionalSignalsResolution.valid) {
    return createInvalidInputResult({
      reason: additionalSignalsResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
    });
  }

  const verdictSamples = [];
  const verdictStartedAtMs = nowMs();

  const verdict = resolveVerdict({
    g4tStatus: sourceResolution.g4t.status,
    g4uxStatus: sourceResolution.g4ux.status,
    mismatchCount: sourceResolution.mismatchCount,
    additionalSignals: additionalSignalsResolution.additionalSignals
  });

  verdictSamples.push(toDurationMs(verdictStartedAtMs, nowMs()));

  const inputGatesCount = resolveInputGatesCount(payload);
  const evidenceCount = evidenceResolution.evidenceRefs.length;

  const contributingFactors = buildContributingFactors({
    sourceResolution,
    additionalSignals: additionalSignalsResolution.additionalSignals,
    evidenceRefs: evidenceResolution.evidenceRefs,
    verdict
  });

  const correctiveActions = normalizeArray([
    ...normalizeArray(sourceResolution.correctiveActions),
    ...normalizeArray(payload.correctiveActions)
  ]);

  const g4Pass = sourceResolution.g4t.status === 'PASS' && sourceResolution.g4ux.status === 'PASS';

  if (!g4Pass) {
    ensureAction(correctiveActions, 'BLOCK_DONE_TRANSITION');
  }

  if (sourceResolution.g4ux.status !== 'PASS') {
    ensureAction(correctiveActions, 'REQUEST_UX_EVIDENCE_REFRESH');
  }

  if (verdict === 'CONCERNS') {
    ensureAction(correctiveActions, 'REVIEW_GATE_CONCERNS');
    ensureAction(correctiveActions, 'BLOCK_DONE_TRANSITION');
  }

  if (verdict === 'FAIL') {
    ensureAction(correctiveActions, 'BLOCK_DONE_TRANSITION');
  }

  if (evidenceResolution.requireEvidenceRefs && evidenceCount === 0) {
    ensureAction(correctiveActions, 'LINK_PRIMARY_EVIDENCE');
    ensureAction(correctiveActions, 'BLOCK_DONE_TRANSITION');

    return createResult({
      allowed: false,
      reasonCode: 'EVIDENCE_CHAIN_INCOMPLETE',
      reason: 'Chaîne de preuve incomplète: au moins une evidenceRef primaire est requise.',
      diagnostics: {
        inputGatesCount,
        evidenceCount,
        g4tStatus: sourceResolution.g4t.status,
        g4uxStatus: sourceResolution.g4ux.status,
        durationMs: toDurationMs(startedAtMs, nowMs()),
        p95VerdictMs: computePercentile(verdictSamples, 95),
        sourceReasonCode: sourceResolution.sourceReasonCode
      },
      verdict,
      canMarkDone: false,
      contributingFactors,
      correctiveActions: normalizeArray(correctiveActions)
    });
  }

  const canMarkDone = verdict === 'PASS' && g4Pass;

  if (!canMarkDone) {
    ensureAction(correctiveActions, 'BLOCK_DONE_TRANSITION');
  }

  const reasonCode =
    verdict === 'PASS'
      ? 'OK'
      : verdict === 'CONCERNS'
        ? 'GATE_VERDICT_CONCERNS'
        : resolveFailReasonCode(sourceResolution, additionalSignalsResolution.additionalSignals);

  const reason =
    verdict === 'PASS'
      ? `Verdict gate calculé: PASS (G4-T=${sourceResolution.g4t.status}, G4-UX=${sourceResolution.g4ux.status}).`
      : verdict === 'CONCERNS'
        ? `Verdict gate calculé: CONCERNS (G4-T=${sourceResolution.g4t.status}, G4-UX=${sourceResolution.g4ux.status}).`
        : `Verdict gate calculé: FAIL (G4-T=${sourceResolution.g4t.status}, G4-UX=${sourceResolution.g4ux.status}).`;

  return createResult({
    allowed: true,
    reasonCode,
    reason,
    diagnostics: {
      inputGatesCount,
      evidenceCount,
      g4tStatus: sourceResolution.g4t.status,
      g4uxStatus: sourceResolution.g4ux.status,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      p95VerdictMs: computePercentile(verdictSamples, 95),
      sourceReasonCode: sourceResolution.sourceReasonCode
    },
    verdict,
    canMarkDone,
    contributingFactors,
    correctiveActions: normalizeArray(correctiveActions)
  });
}
