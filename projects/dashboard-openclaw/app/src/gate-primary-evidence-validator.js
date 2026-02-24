import { guardDoneTransition } from './done-transition-guard.js';

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
  'INVALID_DONE_TRANSITION_INPUT',
  'CONCERNS_ACTION_ASSIGNMENT_INVALID',
  'INVALID_PRIMARY_EVIDENCE_INPUT'
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
  'INVALID_GATE_VERDICT_INPUT',
  'DONE_TRANSITION_BLOCKED',
  'INVALID_DONE_TRANSITION_INPUT'
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
  INVALID_DONE_TRANSITION_INPUT: 'FIX_DONE_TRANSITION_INPUT',
  CONCERNS_ACTION_ASSIGNMENT_INVALID: 'ASSIGN_CONCERNS_OWNER',
  INVALID_PRIMARY_EVIDENCE_INPUT: 'FIX_PRIMARY_EVIDENCE_INPUT'
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

function normalizeDoneTransitionGuardResult(result) {
  if (!isObject(result)) {
    return {
      valid: false,
      reason: 'doneTransitionGuardResult invalide: objet attendu.'
    };
  }

  if (typeof result.allowed !== 'boolean') {
    return {
      valid: false,
      reason: 'doneTransitionGuardResult.allowed invalide: booléen attendu.'
    };
  }

  const reasonCode = normalizeReasonCode(result.reasonCode);

  if (!reasonCode) {
    return {
      valid: false,
      reason:
        `doneTransitionGuardResult.reasonCode invalide: ` +
        `${normalizeText(result.reasonCode) || 'vide'}.`
    };
  }

  const sourceReasonCode = normalizeReasonCode(result.diagnostics?.sourceReasonCode) ?? reasonCode;

  if (!result.allowed) {
    if (!UPSTREAM_BLOCKING_REASON_CODES.has(reasonCode)) {
      return {
        valid: false,
        reason: `doneTransitionGuardResult.reasonCode non propagable: ${reasonCode}.`
      };
    }

    return {
      valid: true,
      blocked: true,
      reasonCode,
      sourceReasonCode,
      reason:
        normalizeText(result.reason) ||
        `Source Done Transition bloquée (${reasonCode}).`,
      correctiveActions: normalizeCorrectiveActions(reasonCode, result.correctiveActions),
      verdict: normalizeStatus(result.diagnostics?.verdict),
      canMarkDone: false,
      evidenceCount:
        Number.isInteger(result.diagnostics?.evidenceCount) && result.diagnostics.evidenceCount >= 0
          ? result.diagnostics.evidenceCount
          : 0
    };
  }

  if (reasonCode !== 'OK') {
    return {
      valid: false,
      reason: `doneTransitionGuardResult incohérent: allowed=true exige reasonCode=OK (reçu ${reasonCode}).`
    };
  }

  if (
    isObject(result.doneTransition) &&
    typeof result.doneTransition.blocked === 'boolean' &&
    result.doneTransition.blocked
  ) {
    return {
      valid: false,
      reason: 'doneTransitionGuardResult incohérent: doneTransition.blocked=true avec allowed=true.'
    };
  }

  const verdict = normalizeStatus(result.diagnostics?.verdict ?? result.doneTransition?.verdict);

  if (!verdict) {
    return {
      valid: false,
      reason: 'doneTransitionGuardResult.diagnostics.verdict invalide: PASS|CONCERNS|FAIL attendu.'
    };
  }

  if (typeof result.diagnostics?.canMarkDone !== 'boolean') {
    return {
      valid: false,
      reason: 'doneTransitionGuardResult.diagnostics.canMarkDone invalide: booléen attendu.'
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
    canMarkDone: result.diagnostics.canMarkDone,
    evidenceCount
  };
}

function resolveSource(payload, runtimeOptions) {
  if (payload.doneTransitionGuardResult !== undefined) {
    return normalizeDoneTransitionGuardResult(payload.doneTransitionGuardResult);
  }

  if (payload.doneTransitionGuardInput !== undefined) {
    if (!isObject(payload.doneTransitionGuardInput)) {
      return {
        valid: false,
        reason: 'doneTransitionGuardInput invalide: objet attendu.'
      };
    }

    const delegatedOptions = isObject(runtimeOptions.doneTransitionGuardOptions)
      ? runtimeOptions.doneTransitionGuardOptions
      : {};

    let delegatedResult;

    try {
      delegatedResult = guardDoneTransition(payload.doneTransitionGuardInput, delegatedOptions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        valid: false,
        reason: `guardDoneTransition a levé une exception: ${message}`
      };
    }

    return normalizeDoneTransitionGuardResult(delegatedResult);
  }

  return {
    valid: false,
    reason: 'Aucune source exploitable: fournir doneTransitionGuardResult ou doneTransitionGuardInput.'
  };
}

function normalizePrimaryEvidence(payload, sourceResolution) {
  if (payload.primaryEvidenceRefs !== undefined && !Array.isArray(payload.primaryEvidenceRefs)) {
    return {
      valid: false,
      reason: 'primaryEvidenceRefs invalide: tableau attendu si fourni.'
    };
  }

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

  const minPrimaryEvidenceCount =
    payload.minPrimaryEvidenceCount === undefined
      ? 1
      : Number.isInteger(payload.minPrimaryEvidenceCount) && payload.minPrimaryEvidenceCount >= 0
        ? payload.minPrimaryEvidenceCount
        : null;

  if (minPrimaryEvidenceCount === null) {
    return {
      valid: false,
      reason: 'minPrimaryEvidenceCount invalide: entier >= 0 attendu si fourni.'
    };
  }

  const refs = normalizeArray([
    ...(Array.isArray(payload.primaryEvidenceRefs) ? payload.primaryEvidenceRefs : []),
    ...(Array.isArray(payload.evidenceRefs) ? payload.evidenceRefs : [])
  ]);

  const evidenceCount = Math.max(sourceResolution.evidenceCount, refs.length);

  return {
    valid: true,
    required: payload.requirePrimaryEvidence !== false,
    minPrimaryEvidenceCount,
    refs,
    evidenceCount,
    evidenceValid:
      payload.requirePrimaryEvidence === false || evidenceCount >= minPrimaryEvidenceCount
  };
}

function normalizeConcernsActionInput(payload) {
  if (payload.concernsAction === undefined) {
    return {
      valid: true,
      concernsAction: {
        provided: false,
        assignee: null,
        dueAtMs: null,
        dueAt: null,
        status: null
      }
    };
  }

  if (!isObject(payload.concernsAction)) {
    return {
      valid: false,
      reason: 'concernsAction invalide: objet attendu si fourni.'
    };
  }

  const assignee = normalizeText(payload.concernsAction.assignee ?? payload.concernsAction.owner);
  const dueAtMs = parseTimestampMs(payload.concernsAction.dueAt);
  const status = normalizeText(payload.concernsAction.status || 'OPEN').toUpperCase();

  if (payload.concernsAction.dueAt !== undefined && dueAtMs === null) {
    return {
      valid: false,
      reason: 'concernsAction.dueAt invalide: timestamp ISO/date/number requis.'
    };
  }

  if (status !== 'OPEN') {
    return {
      valid: false,
      reason: 'concernsAction.status invalide: OPEN requis.'
    };
  }

  return {
    valid: true,
    concernsAction: {
      provided: true,
      assignee: assignee.length > 0 ? assignee : null,
      dueAtMs,
      dueAt: dueAtMs === null ? null : toIso(dueAtMs),
      status
    }
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  primaryEvidence,
  concernsAction,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: {
      verdict: diagnostics.verdict,
      canMarkDone: diagnostics.canMarkDone,
      evidenceCount: diagnostics.evidenceCount,
      concernsActionRequired: diagnostics.concernsActionRequired,
      durationMs: diagnostics.durationMs,
      p95ValidationMs: diagnostics.p95ValidationMs,
      sourceReasonCode: diagnostics.sourceReasonCode
    },
    primaryEvidence: cloneValue(primaryEvidence),
    concernsAction: cloneValue(concernsAction),
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidInputResult({
  reason,
  durationMs = 0,
  sourceReasonCode = 'INVALID_PRIMARY_EVIDENCE_INPUT'
}) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_PRIMARY_EVIDENCE_INPUT',
    reason,
    diagnostics: {
      verdict: null,
      canMarkDone: false,
      evidenceCount: 0,
      concernsActionRequired: false,
      durationMs,
      p95ValidationMs: 0,
      sourceReasonCode
    },
    primaryEvidence: {
      required: true,
      valid: false,
      count: 0,
      minRequired: 1,
      refs: []
    },
    concernsAction: {
      required: false,
      valid: false,
      assignee: null,
      dueAt: null,
      status: null
    },
    correctiveActions: ['FIX_PRIMARY_EVIDENCE_INPUT']
  });
}

function createBlockedResult({
  reasonCode,
  reason,
  sourceReasonCode,
  durationMs,
  verdict,
  evidenceCount,
  correctiveActions
}) {
  return createResult({
    allowed: false,
    reasonCode,
    reason,
    diagnostics: {
      verdict,
      canMarkDone: false,
      evidenceCount,
      concernsActionRequired: verdict === 'CONCERNS',
      durationMs,
      p95ValidationMs: 0,
      sourceReasonCode
    },
    primaryEvidence: {
      required: true,
      valid: false,
      count: evidenceCount,
      minRequired: 1,
      refs: []
    },
    concernsAction: {
      required: verdict === 'CONCERNS',
      valid: false,
      assignee: null,
      dueAt: null,
      status: null
    },
    correctiveActions: normalizeCorrectiveActions(reasonCode, correctiveActions)
  });
}

export function validatePrimaryGateEvidence(input, options = {}) {
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
      verdict: sourceResolution.verdict,
      evidenceCount: sourceResolution.evidenceCount,
      correctiveActions: sourceResolution.correctiveActions
    });
  }

  const evidenceResolution = normalizePrimaryEvidence(payload, sourceResolution);

  if (!evidenceResolution.valid) {
    return createInvalidInputResult({
      reason: evidenceResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
    });
  }

  const concernsActionResolution = normalizeConcernsActionInput(payload);

  if (!concernsActionResolution.valid) {
    return createInvalidInputResult({
      reason: concernsActionResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
    });
  }

  const samples = [];
  const evaluateStartedAtMs = nowMs();

  const concernsActionRequired = sourceResolution.verdict === 'CONCERNS';
  const correctiveActions = normalizeArray([
    ...normalizeArray(sourceResolution.correctiveActions),
    ...normalizeArray(payload.correctiveActions)
  ]);

  const primaryEvidence = {
    required: evidenceResolution.required,
    valid: evidenceResolution.evidenceValid,
    count: evidenceResolution.evidenceCount,
    minRequired: evidenceResolution.minPrimaryEvidenceCount,
    refs: [...evidenceResolution.refs]
  };

  const concernsAction = {
    required: concernsActionRequired,
    valid: false,
    assignee: concernsActionResolution.concernsAction.assignee,
    dueAt: concernsActionResolution.concernsAction.dueAt,
    status: concernsActionResolution.concernsAction.status
  };

  samples.push(toDurationMs(evaluateStartedAtMs, nowMs()));

  if (!primaryEvidence.valid) {
    ensureAction(correctiveActions, 'LINK_PRIMARY_EVIDENCE');
    ensureAction(correctiveActions, 'BLOCK_DONE_TRANSITION');

    return createResult({
      allowed: false,
      reasonCode: 'EVIDENCE_CHAIN_INCOMPLETE',
      reason:
        `Chaîne de preuve primaire incomplète: evidenceCount=${primaryEvidence.count}, ` +
        `minimum=${primaryEvidence.minRequired}.`,
      diagnostics: {
        verdict: sourceResolution.verdict,
        canMarkDone: false,
        evidenceCount: primaryEvidence.count,
        concernsActionRequired,
        durationMs: toDurationMs(startedAtMs, nowMs()),
        p95ValidationMs: computePercentile(samples, 95),
        sourceReasonCode: sourceResolution.sourceReasonCode
      },
      primaryEvidence,
      concernsAction,
      correctiveActions: normalizeArray(correctiveActions)
    });
  }

  if (sourceResolution.verdict === 'FAIL') {
    ensureAction(correctiveActions, 'BLOCK_DONE_TRANSITION');

    return createResult({
      allowed: false,
      reasonCode: 'DONE_TRANSITION_BLOCKED',
      reason: 'Verdict FAIL reçu depuis la source amont: transition bloquée.',
      diagnostics: {
        verdict: sourceResolution.verdict,
        canMarkDone: false,
        evidenceCount: primaryEvidence.count,
        concernsActionRequired,
        durationMs: toDurationMs(startedAtMs, nowMs()),
        p95ValidationMs: computePercentile(samples, 95),
        sourceReasonCode: sourceResolution.sourceReasonCode
      },
      primaryEvidence,
      concernsAction,
      correctiveActions: normalizeArray(correctiveActions)
    });
  }

  if (concernsActionRequired) {
    const hasAssignee = normalizeText(concernsAction.assignee).length > 0;
    const hasDueAt = parseTimestampMs(concernsAction.dueAt) !== null;
    const hasOpenStatus = concernsAction.status === 'OPEN';

    concernsAction.valid = hasAssignee && hasDueAt && hasOpenStatus;

    if (!concernsAction.valid) {
      ensureAction(correctiveActions, 'ASSIGN_CONCERNS_OWNER');
      ensureAction(correctiveActions, 'SET_CONCERNS_DUE_DATE');

      return createResult({
        allowed: false,
        reasonCode: 'CONCERNS_ACTION_ASSIGNMENT_INVALID',
        reason:
          'Action CONCERNS invalide: assignee non vide, dueAt ISO valide et status OPEN requis.',
        diagnostics: {
          verdict: sourceResolution.verdict,
          canMarkDone: false,
          evidenceCount: primaryEvidence.count,
          concernsActionRequired,
          durationMs: toDurationMs(startedAtMs, nowMs()),
          p95ValidationMs: computePercentile(samples, 95),
          sourceReasonCode: sourceResolution.sourceReasonCode
        },
        primaryEvidence,
        concernsAction,
        correctiveActions: normalizeArray(correctiveActions)
      });
    }

    ensureAction(correctiveActions, 'TRACK_CONCERNS_ACTION');
  }

  if (sourceResolution.verdict === 'PASS' && sourceResolution.canMarkDone === false) {
    ensureAction(correctiveActions, 'BLOCK_DONE_TRANSITION');

    return createResult({
      allowed: false,
      reasonCode: 'DONE_TRANSITION_BLOCKED',
      reason: 'Signal amont incohérent: verdict PASS avec canMarkDone=false, blocage conservé.',
      diagnostics: {
        verdict: sourceResolution.verdict,
        canMarkDone: false,
        evidenceCount: primaryEvidence.count,
        concernsActionRequired,
        durationMs: toDurationMs(startedAtMs, nowMs()),
        p95ValidationMs: computePercentile(samples, 95),
        sourceReasonCode: sourceResolution.sourceReasonCode
      },
      primaryEvidence,
      concernsAction,
      correctiveActions: normalizeArray(correctiveActions)
    });
  }

  if (!concernsActionRequired) {
    concernsAction.valid = concernsAction.required === false;
    concernsAction.assignee = null;
    concernsAction.dueAt = null;
    concernsAction.status = null;
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason:
      sourceResolution.verdict === 'CONCERNS'
        ? 'Preuve primaire valide et action CONCERNS assignée avec échéance.'
        : 'Preuve primaire valide: décision de gate conforme.',
    diagnostics: {
      verdict: sourceResolution.verdict,
      canMarkDone: sourceResolution.canMarkDone,
      evidenceCount: primaryEvidence.count,
      concernsActionRequired,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      p95ValidationMs: computePercentile(samples, 95),
      sourceReasonCode: sourceResolution.sourceReasonCode
    },
    primaryEvidence,
    concernsAction,
    correctiveActions: normalizeArray(correctiveActions)
  });
}
