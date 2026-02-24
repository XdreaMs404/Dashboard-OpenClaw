import { calculateGateVerdict } from './gate-verdict-calculator.js';

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
  'INVALID_GATE_VERDICT_INPUT',
  'DONE_TRANSITION_BLOCKED',
  'INVALID_DONE_TRANSITION_INPUT'
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
  'INVALID_G4_DUAL_INPUT',
  'EVIDENCE_CHAIN_INCOMPLETE',
  'INVALID_GATE_VERDICT_INPUT'
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
  INVALID_GATE_VERDICT_INPUT: 'FIX_GATE_VERDICT_INPUT',
  DONE_TRANSITION_BLOCKED: 'BLOCK_DONE_TRANSITION',
  INVALID_DONE_TRANSITION_INPUT: 'FIX_DONE_TRANSITION_INPUT'
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

  if (Array.isArray(value)) {
    return value.map((entry) => cloneValue(entry));
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

function ensureAction(actions, action) {
  if (!actions.includes(action)) {
    actions.push(action);
  }
}

function resolveTargetState(payload) {
  const targetState = normalizeText((payload.targetState ?? payload.transitionTarget) || 'DONE').toUpperCase();

  if (targetState !== 'DONE') {
    return {
      valid: false,
      reason: `targetState invalide: DONE requis (reçu ${targetState || 'vide'}).`
    };
  }

  return {
    valid: true,
    targetState
  };
}

function normalizeEvidenceRequirements(payload) {
  if (payload.evidenceRefs !== undefined && !Array.isArray(payload.evidenceRefs)) {
    return {
      valid: false,
      reason: 'evidenceRefs invalide: tableau attendu si fourni.'
    };
  }

  if (
    payload.requirePrimaryEvidence !== undefined &&
    typeof payload.requirePrimaryEvidence !== 'boolean'
  ) {
    return {
      valid: false,
      reason: 'requirePrimaryEvidence invalide: booléen attendu si fourni.'
    };
  }

  const minEvidenceCount =
    payload.minEvidenceCount === undefined
      ? 1
      : Number.isInteger(payload.minEvidenceCount) && payload.minEvidenceCount >= 0
        ? payload.minEvidenceCount
        : null;

  if (minEvidenceCount === null) {
    return {
      valid: false,
      reason: 'minEvidenceCount invalide: entier >= 0 attendu si fourni.'
    };
  }

  return {
    valid: true,
    evidenceRefs: normalizeArray(payload.evidenceRefs),
    requirePrimaryEvidence: payload.requirePrimaryEvidence !== false,
    minEvidenceCount
  };
}

function normalizeGateVerdictResult(result) {
  if (!isObject(result)) {
    return {
      valid: false,
      reason: 'gateVerdictResult invalide: objet attendu.'
    };
  }

  if (typeof result.allowed !== 'boolean') {
    return {
      valid: false,
      reason: 'gateVerdictResult.allowed invalide: booléen attendu.'
    };
  }

  const reasonCode = normalizeReasonCode(result.reasonCode);

  if (!reasonCode) {
    return {
      valid: false,
      reason: `gateVerdictResult.reasonCode invalide: ${normalizeText(result.reasonCode) || 'vide'}.`
    };
  }

  const sourceReasonCode = normalizeReasonCode(result.diagnostics?.sourceReasonCode) ?? reasonCode;

  if (!result.allowed) {
    if (!UPSTREAM_BLOCKING_REASON_CODES.has(reasonCode)) {
      return {
        valid: false,
        reason: `gateVerdictResult.reasonCode non propagable: ${reasonCode}.`
      };
    }

    return {
      valid: true,
      blocked: true,
      reasonCode,
      sourceReasonCode,
      reason: normalizeText(result.reason) || `Source Gate Verdict bloquée (${reasonCode}).`,
      correctiveActions: normalizeCorrectiveActions(reasonCode, result.correctiveActions),
      verdict: null,
      canMarkDone: false,
      g4tStatus: null,
      g4uxStatus: null,
      evidenceCount: 0
    };
  }

  const verdict = normalizeStatus(result.verdict);

  if (!verdict) {
    return {
      valid: false,
      reason: 'gateVerdictResult.verdict invalide: PASS|CONCERNS|FAIL attendu.'
    };
  }

  if (typeof result.canMarkDone !== 'boolean') {
    return {
      valid: false,
      reason: 'gateVerdictResult.canMarkDone invalide: booléen attendu.'
    };
  }

  const g4tStatus = normalizeStatus(result.diagnostics?.g4tStatus);
  const g4uxStatus = normalizeStatus(result.diagnostics?.g4uxStatus);

  if (!g4tStatus || !g4uxStatus) {
    return {
      valid: false,
      reason: 'gateVerdictResult.diagnostics.g4tStatus/g4uxStatus invalides: PASS|CONCERNS|FAIL requis.'
    };
  }

  const evidenceCount =
    Number.isInteger(result.diagnostics?.evidenceCount) && result.diagnostics.evidenceCount >= 0
      ? result.diagnostics.evidenceCount
      : 0;

  return {
    valid: true,
    blocked: false,
    reasonCode,
    sourceReasonCode,
    reason: normalizeText(result.reason),
    correctiveActions: normalizeArray(result.correctiveActions),
    verdict,
    canMarkDone: result.canMarkDone,
    g4tStatus,
    g4uxStatus,
    evidenceCount
  };
}

function resolveSource(payload, runtimeOptions) {
  if (payload.gateVerdictResult !== undefined) {
    return normalizeGateVerdictResult(payload.gateVerdictResult);
  }

  if (payload.gateVerdictInput !== undefined) {
    if (!isObject(payload.gateVerdictInput)) {
      return {
        valid: false,
        reason: 'gateVerdictInput invalide: objet attendu.'
      };
    }

    const delegatedOptions = isObject(runtimeOptions.gateVerdictOptions)
      ? runtimeOptions.gateVerdictOptions
      : {};

    let delegatedResult;

    try {
      delegatedResult = calculateGateVerdict(payload.gateVerdictInput, delegatedOptions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        valid: false,
        reason: `calculateGateVerdict a levé une exception: ${message}`
      };
    }

    return normalizeGateVerdictResult(delegatedResult);
  }

  return {
    valid: false,
    reason: 'Aucune source exploitable: fournir gateVerdictResult ou gateVerdictInput.'
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  doneTransition,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: {
      targetState: diagnostics.targetState,
      verdict: diagnostics.verdict,
      canMarkDone: diagnostics.canMarkDone,
      g4tStatus: diagnostics.g4tStatus,
      g4uxStatus: diagnostics.g4uxStatus,
      evidenceCount: diagnostics.evidenceCount,
      durationMs: diagnostics.durationMs,
      p95GuardMs: diagnostics.p95GuardMs,
      sourceReasonCode: diagnostics.sourceReasonCode
    },
    doneTransition: cloneValue(doneTransition),
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidInputResult({ reason, durationMs = 0, sourceReasonCode = 'INVALID_DONE_TRANSITION_INPUT' }) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_DONE_TRANSITION_INPUT',
    reason,
    diagnostics: {
      targetState: 'DONE',
      verdict: null,
      canMarkDone: false,
      g4tStatus: null,
      g4uxStatus: null,
      evidenceCount: 0,
      durationMs,
      p95GuardMs: 0,
      sourceReasonCode
    },
    doneTransition: {
      targetState: 'DONE',
      blocked: true,
      blockingReasons: [],
      verdict: null,
      g4SubGates: {
        g4tStatus: null,
        g4uxStatus: null
      }
    },
    correctiveActions: ['FIX_DONE_TRANSITION_INPUT']
  });
}

function createBlockedResult({ reasonCode, reason, sourceReasonCode, durationMs, correctiveActions }) {
  return createResult({
    allowed: false,
    reasonCode,
    reason,
    diagnostics: {
      targetState: 'DONE',
      verdict: null,
      canMarkDone: false,
      g4tStatus: null,
      g4uxStatus: null,
      evidenceCount: 0,
      durationMs,
      p95GuardMs: 0,
      sourceReasonCode
    },
    doneTransition: {
      targetState: 'DONE',
      blocked: true,
      blockingReasons: [reasonCode],
      verdict: null,
      g4SubGates: {
        g4tStatus: null,
        g4uxStatus: null
      }
    },
    correctiveActions: normalizeCorrectiveActions(reasonCode, correctiveActions)
  });
}

export function guardDoneTransition(input, options = {}) {
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

  const targetResolution = resolveTargetState(payload);

  if (!targetResolution.valid) {
    return createInvalidInputResult({
      reason: targetResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
    });
  }

  const evidenceResolution = normalizeEvidenceRequirements(payload);

  if (!evidenceResolution.valid) {
    return createInvalidInputResult({
      reason: evidenceResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
    });
  }

  const samples = [];
  const evaluateStartedAtMs = nowMs();

  const evidenceCount = Math.max(sourceResolution.evidenceCount, evidenceResolution.evidenceRefs.length);
  const blockingReasons = [];

  if (sourceResolution.verdict !== 'PASS') {
    blockingReasons.push(`Verdict=${sourceResolution.verdict}.`);
  }

  if (sourceResolution.g4tStatus !== 'PASS' || sourceResolution.g4uxStatus !== 'PASS') {
    blockingReasons.push(
      `Sous-gates non PASS: G4-T=${sourceResolution.g4tStatus}, G4-UX=${sourceResolution.g4uxStatus}.`
    );
  }

  if (!sourceResolution.canMarkDone) {
    blockingReasons.push('Signal amont canMarkDone=false.');
  }

  samples.push(toDurationMs(evaluateStartedAtMs, nowMs()));

  const correctiveActions = normalizeArray([
    ...normalizeArray(sourceResolution.correctiveActions),
    ...normalizeArray(payload.correctiveActions)
  ]);

  const doneTransition = {
    targetState: targetResolution.targetState,
    blocked: false,
    blockingReasons: [],
    verdict: sourceResolution.verdict,
    g4SubGates: {
      g4tStatus: sourceResolution.g4tStatus,
      g4uxStatus: sourceResolution.g4uxStatus
    }
  };

  if (
    evidenceResolution.requirePrimaryEvidence &&
    evidenceCount < evidenceResolution.minEvidenceCount
  ) {
    ensureAction(correctiveActions, 'LINK_PRIMARY_EVIDENCE');
    ensureAction(correctiveActions, 'BLOCK_DONE_TRANSITION');

    doneTransition.blocked = true;
    doneTransition.blockingReasons = [
      `Chaîne de preuve incomplète: evidenceCount=${evidenceCount}, minimum=${evidenceResolution.minEvidenceCount}.`
    ];

    return createResult({
      allowed: false,
      reasonCode: 'EVIDENCE_CHAIN_INCOMPLETE',
      reason: doneTransition.blockingReasons[0],
      diagnostics: {
        targetState: targetResolution.targetState,
        verdict: sourceResolution.verdict,
        canMarkDone: false,
        g4tStatus: sourceResolution.g4tStatus,
        g4uxStatus: sourceResolution.g4uxStatus,
        evidenceCount,
        durationMs: toDurationMs(startedAtMs, nowMs()),
        p95GuardMs: computePercentile(samples, 95),
        sourceReasonCode: sourceResolution.sourceReasonCode
      },
      doneTransition,
      correctiveActions: normalizeArray(correctiveActions)
    });
  }

  if (blockingReasons.length > 0) {
    ensureAction(correctiveActions, 'BLOCK_DONE_TRANSITION');

    if (sourceResolution.g4uxStatus !== 'PASS') {
      ensureAction(correctiveActions, 'REQUEST_UX_EVIDENCE_REFRESH');
    }

    doneTransition.blocked = true;
    doneTransition.blockingReasons = blockingReasons;

    return createResult({
      allowed: false,
      reasonCode: 'DONE_TRANSITION_BLOCKED',
      reason: blockingReasons.join(' '),
      diagnostics: {
        targetState: targetResolution.targetState,
        verdict: sourceResolution.verdict,
        canMarkDone: false,
        g4tStatus: sourceResolution.g4tStatus,
        g4uxStatus: sourceResolution.g4uxStatus,
        evidenceCount,
        durationMs: toDurationMs(startedAtMs, nowMs()),
        p95GuardMs: computePercentile(samples, 95),
        sourceReasonCode: sourceResolution.sourceReasonCode
      },
      doneTransition,
      correctiveActions: normalizeArray(correctiveActions)
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: 'Transition DONE autorisée: G4-T et G4-UX sont PASS avec chaîne de preuve complète.',
    diagnostics: {
      targetState: targetResolution.targetState,
      verdict: sourceResolution.verdict,
      canMarkDone: true,
      g4tStatus: sourceResolution.g4tStatus,
      g4uxStatus: sourceResolution.g4uxStatus,
      evidenceCount,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      p95GuardMs: computePercentile(samples, 95),
      sourceReasonCode: sourceResolution.sourceReasonCode
    },
    doneTransition,
    correctiveActions: normalizeArray(correctiveActions)
  });
}
