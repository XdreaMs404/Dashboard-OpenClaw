import { createGateConcernsAction } from './gate-concerns-actions.js';
import { simulateGateVerdictBeforeSubmission } from './gate-pre-submit-simulation.js';

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
  'INVALID_CONCERNS_ACTION_INPUT',
  'POLICY_VERSION_NOT_ACTIVE',
  'GATE_POLICY_HISTORY_INCOMPLETE',
  'INVALID_GATE_POLICY_INPUT',
  'INVALID_GATE_SIMULATION_INPUT'
]);

const REASON_CODE_SET = new Set(REASON_CODES);
const STATUS_SET = new Set(['PASS', 'CONCERNS', 'FAIL']);
const CHANGE_TYPES = new Set(['CREATE', 'UPDATE']);

const SEMVER_REGEX =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-[0-9A-Za-z-.]+)?(?:\+[0-9A-Za-z-.]+)?$/;

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
  'INVALID_PRIMARY_EVIDENCE_INPUT',
  'GATE_POLICY_VERSION_MISSING',
  'CONCERNS_ACTION_HISTORY_INCOMPLETE',
  'INVALID_CONCERNS_ACTION_INPUT'
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
  INVALID_CONCERNS_ACTION_INPUT: 'FIX_CONCERNS_ACTION_INPUT',
  POLICY_VERSION_NOT_ACTIVE: 'SYNC_ACTIVE_POLICY_VERSION',
  GATE_POLICY_HISTORY_INCOMPLETE: 'COMPLETE_POLICY_HISTORY_ENTRY',
  INVALID_GATE_POLICY_INPUT: 'FIX_GATE_POLICY_INPUT',
  INVALID_GATE_SIMULATION_INPUT: 'FIX_GATE_SIMULATION_INPUT'
});

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

function isSemver(value) {
  return SEMVER_REGEX.test(normalizeText(value));
}

function normalizeConcernsActionResult(result) {
  if (!isObject(result)) {
    return {
      valid: false,
      reason: 'concernsActionResult invalide: objet attendu.'
    };
  }

  if (typeof result.allowed !== 'boolean') {
    return {
      valid: false,
      reason: 'concernsActionResult.allowed invalide: booléen attendu.'
    };
  }

  const reasonCode = normalizeReasonCode(result.reasonCode);

  if (!reasonCode) {
    return {
      valid: false,
      reason:
        `concernsActionResult.reasonCode invalide: ` +
        `${normalizeText(result.reasonCode) || 'vide'}.`
    };
  }

  const sourceReasonCode = normalizeReasonCode(result.diagnostics?.sourceReasonCode) ?? reasonCode;

  if (!result.allowed) {
    if (!UPSTREAM_BLOCKING_REASON_CODES.has(reasonCode)) {
      return {
        valid: false,
        reason: `concernsActionResult.reasonCode non propagable: ${reasonCode}.`
      };
    }

    return {
      valid: true,
      blocked: true,
      reasonCode,
      sourceReasonCode,
      reason:
        normalizeText(result.reason) ||
        `Source Concerns Action bloquée (${reasonCode}).`,
      correctiveActions: normalizeCorrectiveActions(reasonCode, result.correctiveActions),
      verdict: normalizeStatus(result.diagnostics?.verdict),
      concernsActionRequired: result.diagnostics?.concernsActionRequired === true,
      concernsAction: {
        actionId: null,
        gateId: null,
        storyId: null,
        assignee: null,
        dueAt: null,
        status: null,
        actionCreated: false
      },
      policySnapshot: {
        policyScope: null,
        version: null
      }
    };
  }

  if (reasonCode !== 'OK') {
    return {
      valid: false,
      reason: `concernsActionResult incohérent: allowed=true exige reasonCode=OK (reçu ${reasonCode}).`
    };
  }

  const verdict = normalizeStatus(result.diagnostics?.verdict);

  if (!verdict) {
    return {
      valid: false,
      reason: 'concernsActionResult.diagnostics.verdict invalide: PASS|CONCERNS|FAIL attendu.'
    };
  }

  const concernsActionRequired =
    result.diagnostics?.concernsActionRequired === true || verdict === 'CONCERNS';

  const concernsAction = isObject(result.concernsAction) ? result.concernsAction : {};

  const actionSeed = {
    actionId: normalizeText(concernsAction.actionId) || null,
    gateId: normalizeGateId(concernsAction.gateId),
    storyId: normalizeStoryId(concernsAction.storyId),
    assignee: normalizeText(concernsAction.assignee ?? concernsAction.owner) || null,
    dueAt: (() => {
      const parsed = parseTimestampMs(concernsAction.dueAt);
      return parsed === null ? null : toIso(parsed);
    })(),
    status: normalizeText(concernsAction.status).toUpperCase() || null,
    actionCreated:
      concernsAction.actionCreated === true || result.diagnostics?.actionCreated === true
  };

  if (concernsActionRequired) {
    const hasAssignee = normalizeText(actionSeed.assignee).length > 0;
    const hasDueAt = parseTimestampMs(actionSeed.dueAt) !== null;
    const hasOpenStatus = actionSeed.status === 'OPEN';

    if (!actionSeed.actionCreated || !hasAssignee || !hasDueAt || !hasOpenStatus) {
      return {
        valid: false,
        reason: 'concernsActionResult incohérent: action CONCERNS attendue (actionId/assignee/dueAt/status OPEN).'
      };
    }
  }

  const policySnapshot = isObject(result.policySnapshot) ? result.policySnapshot : {};

  return {
    valid: true,
    blocked: false,
    reasonCode,
    sourceReasonCode,
    reason: normalizeText(result.reason),
    correctiveActions: normalizeArray(result.correctiveActions),
    verdict,
    concernsActionRequired,
    concernsAction: actionSeed,
    policySnapshot: {
      policyScope: normalizeText(policySnapshot.policyScope).toLowerCase() || null,
      version: normalizeText(policySnapshot.version) || null
    }
  };
}

function resolveSource(payload, runtimeOptions) {
  if (payload.concernsActionResult !== undefined) {
    return normalizeConcernsActionResult(payload.concernsActionResult);
  }

  if (payload.concernsActionInput !== undefined) {
    if (!isObject(payload.concernsActionInput)) {
      return {
        valid: false,
        reason: 'concernsActionInput invalide: objet attendu.'
      };
    }

    const delegatedOptions = isObject(runtimeOptions.concernsActionOptions)
      ? runtimeOptions.concernsActionOptions
      : {};

    let delegatedResult;

    try {
      delegatedResult = createGateConcernsAction(payload.concernsActionInput, delegatedOptions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        valid: false,
        reason: `createGateConcernsAction a levé une exception: ${message}`
      };
    }

    return normalizeConcernsActionResult(delegatedResult);
  }

  return {
    valid: false,
    reason: 'Aucune source exploitable: fournir concernsActionResult ou concernsActionInput.'
  };
}

function normalizePolicyVersioning(payload, sourceResolution) {
  if (payload.policyVersioning !== undefined && !isObject(payload.policyVersioning)) {
    return {
      valid: false,
      reasonCode: 'INVALID_GATE_POLICY_INPUT',
      reason: 'policyVersioning invalide: objet attendu si fourni.'
    };
  }

  const policyVersioningInput = isObject(payload.policyVersioning) ? payload.policyVersioning : {};

  const policyScope = normalizeText(
    policyVersioningInput.policyScope ?? payload.policyScope ?? sourceResolution.policySnapshot.policyScope ?? 'gate'
  ).toLowerCase();

  const activeVersion = normalizeText(
    policyVersioningInput.activeVersion ??
      policyVersioningInput.version ??
      payload.activeVersion ??
      payload.policyVersion ??
      sourceResolution.policySnapshot.version
  );

  const requestedVersion = normalizeText(
    policyVersioningInput.requestedVersion ?? payload.requestedVersion ?? activeVersion
  );

  const gateId =
    normalizeGateId(
      policyVersioningInput.gateId ?? payload.gateId ?? sourceResolution.concernsAction.gateId ?? 'G4'
    ) ?? 'G4';

  const policyId =
    normalizeText(policyVersioningInput.policyId ?? payload.policyId ?? `POLICY-${gateId}`) ||
    `POLICY-${gateId}`;

  const previousVersion = normalizeText(
    policyVersioningInput.previousVersion ?? payload.previousVersion ?? sourceResolution.policySnapshot.version ?? activeVersion
  );

  const isActive =
    typeof policyVersioningInput.isActive === 'boolean'
      ? policyVersioningInput.isActive
      : requestedVersion === activeVersion;

  const policyVersioning = {
    policyId,
    policyScope: policyScope.length > 0 ? policyScope : null,
    activeVersion: activeVersion.length > 0 ? activeVersion : null,
    requestedVersion: requestedVersion.length > 0 ? requestedVersion : null,
    previousVersion: previousVersion.length > 0 ? previousVersion : null,
    nextVersion: activeVersion.length > 0 ? activeVersion : null,
    isActive
  };

  if (policyVersioning.policyScope !== 'gate' || !isSemver(policyVersioning.activeVersion)) {
    return {
      valid: false,
      reasonCode: 'GATE_POLICY_VERSION_MISSING',
      reason: 'policyVersioning invalide: policyScope="gate" et activeVersion semver requis.',
      policyVersioning
    };
  }

  if (!isSemver(policyVersioning.requestedVersion)) {
    return {
      valid: false,
      reasonCode: 'POLICY_VERSION_NOT_ACTIVE',
      reason: 'requestedVersion invalide ou non active: semver actif requis.',
      policyVersioning
    };
  }

  if (policyVersioning.previousVersion && !isSemver(policyVersioning.previousVersion)) {
    return {
      valid: false,
      reasonCode: 'GATE_POLICY_HISTORY_INCOMPLETE',
      reason: 'previousVersion invalide: semver attendu si fourni.',
      policyVersioning
    };
  }

  if (!policyVersioning.isActive || policyVersioning.requestedVersion !== policyVersioning.activeVersion) {
    return {
      valid: false,
      reasonCode: 'POLICY_VERSION_NOT_ACTIVE',
      reason:
        `Version policy inactive/stale: requested=${policyVersioning.requestedVersion}, ` +
        `active=${policyVersioning.activeVersion}.`,
      policyVersioning
    };
  }

  return {
    valid: true,
    policyVersioning
  };
}

function normalizeHistoryEntry(payload, policyVersioning, sourceResolution, nowMs) {
  if (payload.historyEntry !== undefined && !isObject(payload.historyEntry)) {
    return {
      valid: false,
      reasonCode: 'GATE_POLICY_HISTORY_INCOMPLETE',
      reason: 'historyEntry invalide: objet attendu si fourni.'
    };
  }

  const historyEntryInput = isObject(payload.historyEntry) ? payload.historyEntry : {};

  const policyId = normalizeText(historyEntryInput.policyId ?? policyVersioning.policyId);
  const previousVersion = normalizeText(
    historyEntryInput.previousVersion ?? policyVersioning.previousVersion ?? policyVersioning.activeVersion
  );
  const nextVersion = normalizeText(historyEntryInput.nextVersion ?? policyVersioning.activeVersion);
  const changedBy = normalizeText(
    historyEntryInput.changedBy ??
      payload.changedBy ??
      payload.actor ??
      sourceResolution.concernsAction.assignee ??
      'system'
  );
  const changeType = normalizeText(
    historyEntryInput.changeType ?? payload.changeType ?? (previousVersion === nextVersion ? 'UPDATE' : 'CREATE')
  ).toUpperCase();

  const changedAtMs = parseTimestampMs(historyEntryInput.changedAt ?? payload.changedAt ?? nowMs());

  const historyEntry = {
    policyId: policyId.length > 0 ? policyId : null,
    previousVersion: previousVersion.length > 0 ? previousVersion : null,
    nextVersion: nextVersion.length > 0 ? nextVersion : null,
    changedAt: changedAtMs === null ? null : toIso(changedAtMs),
    changedBy: changedBy.length > 0 ? changedBy : null,
    changeType: CHANGE_TYPES.has(changeType) ? changeType : null
  };

  if (
    !historyEntry.policyId ||
    !isSemver(historyEntry.previousVersion) ||
    !isSemver(historyEntry.nextVersion) ||
    changedAtMs === null ||
    !historyEntry.changedBy ||
    !historyEntry.changeType
  ) {
    return {
      valid: false,
      reasonCode: 'GATE_POLICY_HISTORY_INCOMPLETE',
      reason:
        'Historisation policy incomplète: policyId, previousVersion, nextVersion, changedAt, changedBy, changeType requis.',
      historyEntry
    };
  }

  return {
    valid: true,
    historyEntry
  };
}

function resolveSimulation(payload, sourceResolution, runtimeOptions) {
  const simulationPayload = {
    baseVerdict: sourceResolution.verdict,
    sourceReasonCode: sourceResolution.sourceReasonCode,
    simulationInput: payload.simulationInput ?? payload.simulation,
    additionalSignals: payload.additionalSignals,
    correctiveActions: payload.simulationCorrectiveActions
  };

  const simulationOptions = isObject(runtimeOptions.simulationOptions)
    ? runtimeOptions.simulationOptions
    : {};

  let simulationResult;

  try {
    simulationResult = simulateGateVerdictBeforeSubmission(simulationPayload, simulationOptions);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return {
      valid: false,
      reasonCode: 'INVALID_GATE_SIMULATION_INPUT',
      reason: `simulateGateVerdictBeforeSubmission a levé une exception: ${message}`,
      simulation: {
        eligible: false,
        simulatedVerdict: null,
        nonMutative: true,
        factors: [],
        evaluatedAt: null
      },
      correctiveActions: ['FIX_GATE_SIMULATION_INPUT']
    };
  }

  if (!simulationResult.allowed) {
    return {
      valid: false,
      reasonCode: 'INVALID_GATE_SIMULATION_INPUT',
      reason: normalizeText(simulationResult.reason),
      simulation: cloneValue(simulationResult.simulation),
      correctiveActions: normalizeArray([
        ...normalizeArray(simulationResult.correctiveActions),
        'FIX_GATE_SIMULATION_INPUT'
      ])
    };
  }

  const simulation = cloneValue(simulationResult.simulation);

  if (simulation.nonMutative !== true) {
    return {
      valid: false,
      reasonCode: 'INVALID_GATE_SIMULATION_INPUT',
      reason: 'Simulation invalide: mode non mutatif requis avant soumission finale.',
      simulation,
      correctiveActions: ['ENSURE_NON_MUTATIVE_SIMULATION', 'FIX_GATE_SIMULATION_INPUT']
    };
  }

  const simulatedVerdict = normalizeStatus(simulation.simulatedVerdict);

  if (!simulatedVerdict) {
    return {
      valid: false,
      reasonCode: 'INVALID_GATE_SIMULATION_INPUT',
      reason: 'Simulation invalide: simulatedVerdict PASS|CONCERNS|FAIL requis.',
      simulation,
      correctiveActions: ['FIX_GATE_SIMULATION_INPUT']
    };
  }

  simulation.simulatedVerdict = simulatedVerdict;
  simulation.eligible = simulation.eligible !== false;

  return {
    valid: true,
    simulation,
    simulatedVerdict,
    simulationEligible: simulation.eligible,
    p95SimulationMs:
      Number.isFinite(simulationResult.diagnostics?.p95SimulationMs) && simulationResult.diagnostics.p95SimulationMs >= 0
        ? Math.trunc(simulationResult.diagnostics.p95SimulationMs)
        : 0,
    correctiveActions: normalizeArray(simulationResult.correctiveActions)
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  policyVersioning,
  simulation,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: {
      policyVersion: diagnostics.policyVersion,
      historyEntryCount: diagnostics.historyEntryCount,
      simulationEligible: diagnostics.simulationEligible,
      simulatedVerdict: diagnostics.simulatedVerdict,
      durationMs: diagnostics.durationMs,
      p95SimulationMs: diagnostics.p95SimulationMs,
      sourceReasonCode: diagnostics.sourceReasonCode
    },
    policyVersioning: cloneValue(policyVersioning),
    simulation: cloneValue(simulation),
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidInputResult({
  reason,
  durationMs = 0,
  sourceReasonCode = 'INVALID_GATE_POLICY_INPUT'
}) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_GATE_POLICY_INPUT',
    reason,
    diagnostics: {
      policyVersion: null,
      historyEntryCount: 0,
      simulationEligible: false,
      simulatedVerdict: null,
      durationMs,
      p95SimulationMs: 0,
      sourceReasonCode
    },
    policyVersioning: {
      policyId: null,
      policyScope: null,
      activeVersion: null,
      requestedVersion: null,
      previousVersion: null,
      nextVersion: null,
      isActive: false,
      historyEntry: null
    },
    simulation: {
      eligible: false,
      simulatedVerdict: null,
      nonMutative: true,
      factors: [],
      evaluatedAt: null
    },
    correctiveActions: ['FIX_GATE_POLICY_INPUT']
  });
}

function createBlockedResult({
  reasonCode,
  reason,
  sourceReasonCode,
  durationMs,
  verdict,
  correctiveActions
}) {
  return createResult({
    allowed: false,
    reasonCode,
    reason,
    diagnostics: {
      policyVersion: null,
      historyEntryCount: 0,
      simulationEligible: false,
      simulatedVerdict: null,
      durationMs,
      p95SimulationMs: 0,
      sourceReasonCode
    },
    policyVersioning: {
      policyId: null,
      policyScope: null,
      activeVersion: null,
      requestedVersion: null,
      previousVersion: null,
      nextVersion: null,
      isActive: false,
      historyEntry: null,
      blockedByVerdict: verdict ?? null
    },
    simulation: {
      eligible: false,
      simulatedVerdict: null,
      nonMutative: true,
      factors: [],
      evaluatedAt: null
    },
    correctiveActions: normalizeCorrectiveActions(reasonCode, correctiveActions)
  });
}

export function versionGatePolicy(input, options = {}) {
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
      correctiveActions: sourceResolution.correctiveActions
    });
  }

  const samples = [];
  const evaluateStartedAtMs = nowMs();

  const correctiveActions = normalizeArray([
    ...normalizeArray(sourceResolution.correctiveActions),
    ...normalizeArray(payload.correctiveActions)
  ]);

  const policyResolution = normalizePolicyVersioning(payload, sourceResolution);

  if (!policyResolution.valid) {
    if (policyResolution.reasonCode === 'POLICY_VERSION_NOT_ACTIVE') {
      ensureAction(correctiveActions, 'SYNC_ACTIVE_POLICY_VERSION');
    }

    if (policyResolution.reasonCode === 'GATE_POLICY_VERSION_MISSING') {
      ensureAction(correctiveActions, 'LINK_GATE_POLICY_VERSION');
    }

    if (policyResolution.reasonCode === 'GATE_POLICY_HISTORY_INCOMPLETE') {
      ensureAction(correctiveActions, 'COMPLETE_POLICY_HISTORY_ENTRY');
    }

    return createResult({
      allowed: false,
      reasonCode: policyResolution.reasonCode,
      reason: policyResolution.reason,
      diagnostics: {
        policyVersion: policyResolution.policyVersioning?.activeVersion ?? null,
        historyEntryCount: 0,
        simulationEligible: false,
        simulatedVerdict: null,
        durationMs: toDurationMs(startedAtMs, nowMs()),
        p95SimulationMs: computePercentile(samples, 95),
        sourceReasonCode: sourceResolution.sourceReasonCode
      },
      policyVersioning: {
        ...(policyResolution.policyVersioning ?? {
          policyId: null,
          policyScope: null,
          activeVersion: null,
          requestedVersion: null,
          previousVersion: null,
          nextVersion: null,
          isActive: false
        }),
        historyEntry: null
      },
      simulation: {
        eligible: false,
        simulatedVerdict: null,
        nonMutative: true,
        factors: [],
        evaluatedAt: null
      },
      correctiveActions: normalizeArray(correctiveActions)
    });
  }

  const historyResolution = normalizeHistoryEntry(payload, policyResolution.policyVersioning, sourceResolution, nowMs);

  if (!historyResolution.valid) {
    ensureAction(correctiveActions, 'COMPLETE_POLICY_HISTORY_ENTRY');

    return createResult({
      allowed: false,
      reasonCode: historyResolution.reasonCode,
      reason: historyResolution.reason,
      diagnostics: {
        policyVersion: policyResolution.policyVersioning.activeVersion,
        historyEntryCount: 0,
        simulationEligible: false,
        simulatedVerdict: null,
        durationMs: toDurationMs(startedAtMs, nowMs()),
        p95SimulationMs: computePercentile(samples, 95),
        sourceReasonCode: sourceResolution.sourceReasonCode
      },
      policyVersioning: {
        ...policyResolution.policyVersioning,
        historyEntry: historyResolution.historyEntry ?? null
      },
      simulation: {
        eligible: false,
        simulatedVerdict: null,
        nonMutative: true,
        factors: [],
        evaluatedAt: null
      },
      correctiveActions: normalizeArray(correctiveActions)
    });
  }

  const simulationResolution = resolveSimulation(payload, sourceResolution, runtimeOptions);
  samples.push(toDurationMs(evaluateStartedAtMs, nowMs()));

  if (!simulationResolution.valid) {
    for (const action of simulationResolution.correctiveActions) {
      ensureAction(correctiveActions, action);
    }

    return createResult({
      allowed: false,
      reasonCode: simulationResolution.reasonCode,
      reason: simulationResolution.reason,
      diagnostics: {
        policyVersion: policyResolution.policyVersioning.activeVersion,
        historyEntryCount: 1,
        simulationEligible: false,
        simulatedVerdict: null,
        durationMs: toDurationMs(startedAtMs, nowMs()),
        p95SimulationMs: computePercentile(samples, 95),
        sourceReasonCode: sourceResolution.sourceReasonCode
      },
      policyVersioning: {
        ...policyResolution.policyVersioning,
        historyEntry: historyResolution.historyEntry
      },
      simulation: simulationResolution.simulation,
      correctiveActions: normalizeArray(correctiveActions)
    });
  }

  for (const action of simulationResolution.correctiveActions) {
    ensureAction(correctiveActions, action);
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: `Policy gate versionnée (${policyResolution.policyVersioning.activeVersion}) avec simulation pré-soumission ${simulationResolution.simulatedVerdict}.`,
    diagnostics: {
      policyVersion: policyResolution.policyVersioning.activeVersion,
      historyEntryCount: 1,
      simulationEligible: simulationResolution.simulationEligible,
      simulatedVerdict: simulationResolution.simulatedVerdict,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      p95SimulationMs: Math.max(
        computePercentile(samples, 95),
        simulationResolution.p95SimulationMs
      ),
      sourceReasonCode: sourceResolution.sourceReasonCode
    },
    policyVersioning: {
      ...policyResolution.policyVersioning,
      historyEntry: historyResolution.historyEntry
    },
    simulation: simulationResolution.simulation,
    correctiveActions: normalizeArray(correctiveActions)
  });
}
