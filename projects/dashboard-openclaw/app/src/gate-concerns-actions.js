import { randomUUID } from 'node:crypto';
import { validatePrimaryGateEvidence } from './gate-primary-evidence-validator.js';

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
  'INVALID_PRIMARY_EVIDENCE_INPUT',
  'GATE_POLICY_VERSION_MISSING',
  'CONCERNS_ACTION_HISTORY_INCOMPLETE',
  'INVALID_CONCERNS_ACTION_INPUT'
]);

const REASON_CODE_SET = new Set(REASON_CODES);
const STATUS_SET = new Set(['PASS', 'CONCERNS', 'FAIL']);
const CHANGE_TYPES = new Set(['CREATE', 'UPDATE']);

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
  'INVALID_DONE_TRANSITION_INPUT',
  'CONCERNS_ACTION_ASSIGNMENT_INVALID',
  'INVALID_PRIMARY_EVIDENCE_INPUT'
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
  INVALID_PRIMARY_EVIDENCE_INPUT: 'FIX_PRIMARY_EVIDENCE_INPUT',
  GATE_POLICY_VERSION_MISSING: 'LINK_GATE_POLICY_VERSION',
  CONCERNS_ACTION_HISTORY_INCOMPLETE: 'COMPLETE_CONCERNS_ACTION_HISTORY',
  INVALID_CONCERNS_ACTION_INPUT: 'FIX_CONCERNS_ACTION_INPUT'
});

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneValue(value) {
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

function normalizeGateId(value) {
  const normalized = normalizeText(value).toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeStoryId(value) {
  const normalized = normalizeText(value).toUpperCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizePrimaryEvidenceResult(result) {
  if (!isObject(result)) {
    return {
      valid: false,
      reason: 'primaryEvidenceResult invalide: objet attendu.'
    };
  }

  if (typeof result.allowed !== 'boolean') {
    return {
      valid: false,
      reason: 'primaryEvidenceResult.allowed invalide: booléen attendu.'
    };
  }

  const reasonCode = normalizeReasonCode(result.reasonCode);

  if (!reasonCode) {
    return {
      valid: false,
      reason:
        `primaryEvidenceResult.reasonCode invalide: ` +
        `${normalizeText(result.reasonCode) || 'vide'}.`
    };
  }

  const sourceReasonCode = normalizeReasonCode(result.diagnostics?.sourceReasonCode) ?? reasonCode;

  if (!result.allowed) {
    if (!UPSTREAM_BLOCKING_REASON_CODES.has(reasonCode)) {
      return {
        valid: false,
        reason: `primaryEvidenceResult.reasonCode non propagable: ${reasonCode}.`
      };
    }

    const verdict = normalizeStatus(result.diagnostics?.verdict);

    return {
      valid: true,
      blocked: true,
      reasonCode,
      sourceReasonCode,
      reason:
        normalizeText(result.reason) ||
        `Source Primary Evidence bloquée (${reasonCode}).`,
      correctiveActions: normalizeCorrectiveActions(reasonCode, result.correctiveActions),
      verdict,
      canMarkDone: false,
      concernsActionRequired:
        result.diagnostics?.concernsActionRequired === true || verdict === 'CONCERNS',
      evidenceCount:
        Number.isInteger(result.diagnostics?.evidenceCount) && result.diagnostics.evidenceCount >= 0
          ? result.diagnostics.evidenceCount
          : 0,
      concernsActionSeed: {
        assignee: null,
        dueAtMs: null,
        dueAt: null,
        status: null,
        actionId: null,
        gateId: null,
        storyId: null
      }
    };
  }

  if (reasonCode !== 'OK') {
    return {
      valid: false,
      reason: `primaryEvidenceResult incohérent: allowed=true exige reasonCode=OK (reçu ${reasonCode}).`
    };
  }

  const verdict = normalizeStatus(result.diagnostics?.verdict);

  if (!verdict) {
    return {
      valid: false,
      reason: 'primaryEvidenceResult.diagnostics.verdict invalide: PASS|CONCERNS|FAIL attendu.'
    };
  }

  if (verdict === 'FAIL') {
    return {
      valid: false,
      reason: 'primaryEvidenceResult incohérent: verdict FAIL ne peut pas être allowed=true.'
    };
  }

  if (typeof result.diagnostics?.canMarkDone !== 'boolean') {
    return {
      valid: false,
      reason: 'primaryEvidenceResult.diagnostics.canMarkDone invalide: booléen attendu.'
    };
  }

  const evidenceCount =
    Number.isInteger(result.diagnostics?.evidenceCount) && result.diagnostics.evidenceCount >= 0
      ? result.diagnostics.evidenceCount
      : Number.isInteger(result.primaryEvidence?.count) && result.primaryEvidence.count >= 0
        ? result.primaryEvidence.count
        : 0;

  const concernsActionSource = isObject(result.concernsAction) ? result.concernsAction : {};
  const dueAtMs = parseTimestampMs(concernsActionSource.dueAt);
  const dueAt = dueAtMs === null ? null : toIso(dueAtMs);

  return {
    valid: true,
    blocked: false,
    reasonCode,
    sourceReasonCode,
    reason: normalizeText(result.reason),
    correctiveActions: normalizeArray(result.correctiveActions),
    verdict,
    canMarkDone: result.diagnostics.canMarkDone,
    concernsActionRequired:
      result.diagnostics?.concernsActionRequired === true || verdict === 'CONCERNS',
    evidenceCount,
    concernsActionSeed: {
      assignee: normalizeText(concernsActionSource.assignee ?? concernsActionSource.owner) || null,
      dueAtMs,
      dueAt,
      status:
        normalizeText(concernsActionSource.status || 'OPEN').toUpperCase() || null,
      actionId: normalizeText(concernsActionSource.actionId) || null,
      gateId: normalizeGateId(concernsActionSource.gateId),
      storyId: normalizeStoryId(concernsActionSource.storyId)
    }
  };
}

function resolveSource(payload, runtimeOptions) {
  if (payload.primaryEvidenceResult !== undefined) {
    return normalizePrimaryEvidenceResult(payload.primaryEvidenceResult);
  }

  if (payload.primaryEvidenceInput !== undefined) {
    if (!isObject(payload.primaryEvidenceInput)) {
      return {
        valid: false,
        reason: 'primaryEvidenceInput invalide: objet attendu.'
      };
    }

    const delegatedOptions = isObject(runtimeOptions.primaryEvidenceOptions)
      ? runtimeOptions.primaryEvidenceOptions
      : {};

    let delegatedResult;

    try {
      delegatedResult = validatePrimaryGateEvidence(payload.primaryEvidenceInput, delegatedOptions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        valid: false,
        reason: `validatePrimaryGateEvidence a levé une exception: ${message}`
      };
    }

    return normalizePrimaryEvidenceResult(delegatedResult);
  }

  return {
    valid: false,
    reason: 'Aucune source exploitable: fournir primaryEvidenceResult ou primaryEvidenceInput.'
  };
}

function normalizeConcernsAction(payload, sourceResolution, runtimeOptions) {
  if (payload.concernsAction !== undefined && !isObject(payload.concernsAction)) {
    return {
      valid: false,
      reason: 'concernsAction invalide: objet attendu si fourni.'
    };
  }

  const concernsAction = isObject(payload.concernsAction) ? payload.concernsAction : {};

  const assignee =
    normalizeText(
      concernsAction.assignee ??
      concernsAction.owner ??
      sourceResolution.concernsActionSeed.assignee ??
      payload.concernsAssignee
    ) || null;

  const dueAtMs = parseTimestampMs(
    concernsAction.dueAt ?? sourceResolution.concernsActionSeed.dueAt ?? payload.concernsDueAt
  );

  const status = normalizeText(
    concernsAction.status ?? sourceResolution.concernsActionSeed.status ?? 'OPEN'
  ).toUpperCase();

  const gateId =
    normalizeGateId(
      concernsAction.gateId ?? sourceResolution.concernsActionSeed.gateId ?? payload.gateId ?? 'G4'
    ) ?? 'G4';

  const storyId =
    normalizeStoryId(
      concernsAction.storyId ?? sourceResolution.concernsActionSeed.storyId ?? payload.storyId ?? 'S030'
    ) ?? 'S030';

  const providedActionId = normalizeText(
    concernsAction.actionId ?? sourceResolution.concernsActionSeed.actionId
  );

  let actionId = providedActionId.length > 0 ? providedActionId : null;

  if (!actionId) {
    if (typeof runtimeOptions.actionIdGenerator === 'function') {
      actionId = normalizeText(runtimeOptions.actionIdGenerator()) || null;
    }

    if (!actionId && typeof runtimeOptions.idGenerator === 'function') {
      actionId = normalizeText(runtimeOptions.idGenerator()) || null;
    }

    if (!actionId) {
      actionId = randomUUID();
    }
  }

  return {
    valid: true,
    concernsAction: {
      actionCreated: false,
      actionId,
      gateId,
      storyId,
      assignee,
      dueAt: dueAtMs === null ? null : toIso(dueAtMs),
      status
    }
  };
}

function normalizePolicySnapshot(payload, concernsActionRequired) {
  if (payload.policySnapshot !== undefined && !isObject(payload.policySnapshot)) {
    return {
      valid: false,
      reasonCode: 'INVALID_CONCERNS_ACTION_INPUT',
      reason: 'policySnapshot invalide: objet attendu si fourni.'
    };
  }

  const policySnapshot = isObject(payload.policySnapshot) ? payload.policySnapshot : {};

  const policyScope = normalizeText(
    policySnapshot.policyScope ?? payload.policyScope ?? 'gate'
  ).toLowerCase();

  const version = normalizeText(policySnapshot.version ?? payload.policyVersion);

  const snapshot = {
    policyScope: policyScope.length > 0 ? policyScope : null,
    version: version.length > 0 ? version : null
  };

  if (concernsActionRequired && (snapshot.policyScope !== 'gate' || !snapshot.version)) {
    return {
      valid: false,
      reasonCode: 'GATE_POLICY_VERSION_MISSING',
      reason: 'Policy snapshot invalide: policyScope="gate" et version non vide requis.',
      policySnapshot: snapshot
    };
  }

  return {
    valid: true,
    policySnapshot: snapshot
  };
}

function normalizeHistoryEntry(payload, concernsAction, policySnapshot, nowMs) {
  if (payload.historyEntry !== undefined && !isObject(payload.historyEntry)) {
    return {
      valid: false,
      reasonCode: 'INVALID_CONCERNS_ACTION_INPUT',
      reason: 'historyEntry invalide: objet attendu si fourni.'
    };
  }

  const historyEntry = isObject(payload.historyEntry) ? payload.historyEntry : {};

  const actionId = normalizeText(historyEntry.actionId ?? concernsAction.actionId);
  const policyVersion = normalizeText(historyEntry.policyVersion ?? policySnapshot.version);
  const changedBy = normalizeText(
    historyEntry.changedBy ?? payload.changedBy ?? payload.actor ?? concernsAction.assignee ?? 'system'
  );

  const changeType = normalizeText(
    historyEntry.changeType ?? payload.changeType ?? (payload.concernsAction?.actionId ? 'UPDATE' : 'CREATE')
  ).toUpperCase();

  const changedAtMs = parseTimestampMs(historyEntry.changedAt ?? payload.changedAt ?? nowMs());

  if (
    actionId.length === 0 ||
    policyVersion.length === 0 ||
    changedBy.length === 0 ||
    changedAtMs === null ||
    !CHANGE_TYPES.has(changeType)
  ) {
    return {
      valid: false,
      reasonCode: 'CONCERNS_ACTION_HISTORY_INCOMPLETE',
      reason:
        'Historisation action CONCERNS incomplète: actionId, policyVersion, changedAt, changedBy, changeType requis.',
      historyEntry: {
        actionId,
        policyVersion,
        changedAt: changedAtMs === null ? null : toIso(changedAtMs),
        changedBy,
        changeType: CHANGE_TYPES.has(changeType) ? changeType : null
      }
    };
  }

  return {
    valid: true,
    historyEntry: {
      actionId,
      policyVersion,
      changedAt: toIso(changedAtMs),
      changedBy,
      changeType
    }
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  concernsAction,
  policySnapshot,
  historyEntry,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: {
      verdict: diagnostics.verdict,
      concernsActionRequired: diagnostics.concernsActionRequired,
      actionCreated: diagnostics.actionCreated,
      durationMs: diagnostics.durationMs,
      p95ActionMs: diagnostics.p95ActionMs,
      sourceReasonCode: diagnostics.sourceReasonCode,
      policyVersion: diagnostics.policyVersion
    },
    concernsAction: cloneValue(concernsAction),
    policySnapshot: cloneValue(policySnapshot),
    historyEntry: cloneValue(historyEntry),
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidInputResult({
  reason,
  durationMs = 0,
  sourceReasonCode = 'INVALID_CONCERNS_ACTION_INPUT'
}) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_CONCERNS_ACTION_INPUT',
    reason,
    diagnostics: {
      verdict: null,
      concernsActionRequired: false,
      actionCreated: false,
      durationMs,
      p95ActionMs: 0,
      sourceReasonCode,
      policyVersion: null
    },
    concernsAction: {
      actionCreated: false,
      actionId: null,
      gateId: null,
      storyId: null,
      assignee: null,
      dueAt: null,
      status: null
    },
    policySnapshot: {
      policyScope: null,
      version: null
    },
    historyEntry: {
      actionId: null,
      policyVersion: null,
      changedAt: null,
      changedBy: null,
      changeType: null
    },
    correctiveActions: ['FIX_CONCERNS_ACTION_INPUT']
  });
}

function createBlockedResult({
  reasonCode,
  reason,
  sourceReasonCode,
  durationMs,
  verdict,
  concernsActionRequired,
  correctiveActions
}) {
  return createResult({
    allowed: false,
    reasonCode,
    reason,
    diagnostics: {
      verdict,
      concernsActionRequired,
      actionCreated: false,
      durationMs,
      p95ActionMs: 0,
      sourceReasonCode,
      policyVersion: null
    },
    concernsAction: {
      actionCreated: false,
      actionId: null,
      gateId: null,
      storyId: null,
      assignee: null,
      dueAt: null,
      status: null
    },
    policySnapshot: {
      policyScope: null,
      version: null
    },
    historyEntry: {
      actionId: null,
      policyVersion: null,
      changedAt: null,
      changedBy: null,
      changeType: null
    },
    correctiveActions: normalizeCorrectiveActions(reasonCode, correctiveActions)
  });
}

export function createGateConcernsAction(input, options = {}) {
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
      concernsActionRequired: sourceResolution.concernsActionRequired,
      correctiveActions: sourceResolution.correctiveActions
    });
  }

  const samples = [];
  const evaluateStartedAtMs = nowMs();

  const correctiveActions = normalizeArray([
    ...normalizeArray(sourceResolution.correctiveActions),
    ...normalizeArray(payload.correctiveActions)
  ]);

  const concernsActionRequired = sourceResolution.verdict === 'CONCERNS';

  if (!concernsActionRequired) {
    samples.push(toDurationMs(evaluateStartedAtMs, nowMs()));

    return createResult({
      allowed: true,
      reasonCode: 'OK',
      reason: `Aucune action CONCERNS créée: verdict ${sourceResolution.verdict}.`,
      diagnostics: {
        verdict: sourceResolution.verdict,
        concernsActionRequired,
        actionCreated: false,
        durationMs: toDurationMs(startedAtMs, nowMs()),
        p95ActionMs: computePercentile(samples, 95),
        sourceReasonCode: sourceResolution.sourceReasonCode,
        policyVersion: null
      },
      concernsAction: {
        actionCreated: false,
        actionId: null,
        gateId: null,
        storyId: null,
        assignee: null,
        dueAt: null,
        status: null
      },
      policySnapshot: {
        policyScope: null,
        version: null
      },
      historyEntry: {
        actionId: null,
        policyVersion: null,
        changedAt: null,
        changedBy: null,
        changeType: null
      },
      correctiveActions: normalizeArray(correctiveActions)
    });
  }

  const concernsActionResolution = normalizeConcernsAction(payload, sourceResolution, runtimeOptions);

  if (!concernsActionResolution.valid) {
    return createInvalidInputResult({
      reason: concernsActionResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
    });
  }

  const concernsAction = concernsActionResolution.concernsAction;
  const hasAssignee = normalizeText(concernsAction.assignee).length > 0;
  const hasDueAt = parseTimestampMs(concernsAction.dueAt) !== null;
  const hasOpenStatus = concernsAction.status === 'OPEN';

  if (!hasAssignee || !hasDueAt || !hasOpenStatus) {
    ensureAction(correctiveActions, 'ASSIGN_CONCERNS_OWNER');
    ensureAction(correctiveActions, 'SET_CONCERNS_DUE_DATE');

    return createResult({
      allowed: false,
      reasonCode: 'CONCERNS_ACTION_ASSIGNMENT_INVALID',
      reason:
        'Action CONCERNS invalide: assignee non vide, dueAt ISO valide et status OPEN requis.',
      diagnostics: {
        verdict: sourceResolution.verdict,
        concernsActionRequired,
        actionCreated: false,
        durationMs: toDurationMs(startedAtMs, nowMs()),
        p95ActionMs: computePercentile(samples, 95),
        sourceReasonCode: sourceResolution.sourceReasonCode,
        policyVersion: null
      },
      concernsAction: {
        actionCreated: false,
        ...concernsAction
      },
      policySnapshot: {
        policyScope: null,
        version: null
      },
      historyEntry: {
        actionId: null,
        policyVersion: null,
        changedAt: null,
        changedBy: null,
        changeType: null
      },
      correctiveActions: normalizeArray(correctiveActions)
    });
  }

  const policyResolution = normalizePolicySnapshot(payload, concernsActionRequired);

  if (!policyResolution.valid) {
    if (policyResolution.reasonCode === 'GATE_POLICY_VERSION_MISSING') {
      ensureAction(correctiveActions, 'LINK_GATE_POLICY_VERSION');
    }

    return createResult({
      allowed: false,
      reasonCode: policyResolution.reasonCode,
      reason: policyResolution.reason,
      diagnostics: {
        verdict: sourceResolution.verdict,
        concernsActionRequired,
        actionCreated: false,
        durationMs: toDurationMs(startedAtMs, nowMs()),
        p95ActionMs: computePercentile(samples, 95),
        sourceReasonCode: sourceResolution.sourceReasonCode,
        policyVersion: policyResolution.policySnapshot?.version ?? null
      },
      concernsAction: {
        actionCreated: false,
        ...concernsAction
      },
      policySnapshot: {
        policyScope: policyResolution.policySnapshot?.policyScope ?? null,
        version: policyResolution.policySnapshot?.version ?? null
      },
      historyEntry: {
        actionId: null,
        policyVersion: null,
        changedAt: null,
        changedBy: null,
        changeType: null
      },
      correctiveActions: normalizeArray(correctiveActions)
    });
  }

  concernsAction.actionCreated = true;
  const policySnapshot = policyResolution.policySnapshot;

  const historyResolution = normalizeHistoryEntry(payload, concernsAction, policySnapshot, nowMs);

  if (!historyResolution.valid) {
    if (historyResolution.reasonCode === 'CONCERNS_ACTION_HISTORY_INCOMPLETE') {
      ensureAction(correctiveActions, 'COMPLETE_CONCERNS_ACTION_HISTORY');
    }

    return createResult({
      allowed: false,
      reasonCode: historyResolution.reasonCode,
      reason: historyResolution.reason,
      diagnostics: {
        verdict: sourceResolution.verdict,
        concernsActionRequired,
        actionCreated: false,
        durationMs: toDurationMs(startedAtMs, nowMs()),
        p95ActionMs: computePercentile(samples, 95),
        sourceReasonCode: sourceResolution.sourceReasonCode,
        policyVersion: policySnapshot.version
      },
      concernsAction: {
        actionCreated: false,
        ...concernsAction
      },
      policySnapshot,
      historyEntry: historyResolution.historyEntry ?? {
        actionId: null,
        policyVersion: null,
        changedAt: null,
        changedBy: null,
        changeType: null
      },
      correctiveActions: normalizeArray(correctiveActions)
    });
  }

  ensureAction(correctiveActions, 'TRACK_CONCERNS_ACTION');
  samples.push(toDurationMs(evaluateStartedAtMs, nowMs()));

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: 'Action CONCERNS créée automatiquement avec policy snapshot et historique.',
    diagnostics: {
      verdict: sourceResolution.verdict,
      concernsActionRequired,
      actionCreated: true,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      p95ActionMs: computePercentile(samples, 95),
      sourceReasonCode: sourceResolution.sourceReasonCode,
      policyVersion: policySnapshot.version
    },
    concernsAction,
    policySnapshot,
    historyEntry: historyResolution.historyEntry,
    correctiveActions: normalizeArray(correctiveActions)
  });
}
