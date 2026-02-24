import { recordPhaseGateGovernanceDecision } from './phase-gate-governance-journal.js';

const GATE_ORDER = Object.freeze(['G1', 'G2', 'G3', 'G4', 'G5']);
const SUB_GATE_ORDER = Object.freeze(['G4-T', 'G4-UX']);
const GATE_SET = new Set([...GATE_ORDER, ...SUB_GATE_ORDER]);
const STATUS_SET = new Set(['PASS', 'CONCERNS', 'FAIL']);

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
  'INVALID_GATE_CENTER_INPUT'
]);

const REASON_CODE_SET = new Set(REASON_CODES);

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
  'INVALID_GOVERNANCE_DECISION_INPUT'
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
  INVALID_GATE_CENTER_INPUT: 'FIX_GATE_CENTER_INPUT'
});

const DEFAULT_STALE_AFTER_MS = 2_000;

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

function normalizeGateId(value) {
  const normalized = normalizeText(value).toUpperCase();

  if (!GATE_SET.has(normalized)) {
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

function resolveStaleAfterMs(payload, runtimeOptions) {
  const candidate = payload.staleAfterMs ?? runtimeOptions.staleAfterMs ?? DEFAULT_STALE_AFTER_MS;

  if (!Number.isInteger(candidate) || candidate < 0) {
    return {
      valid: false,
      reason: 'staleAfterMs invalide: entier >= 0 requis.'
    };
  }

  return {
    valid: true,
    staleAfterMs: candidate
  };
}

function normalizeCorrectiveActions(reasonCode, correctiveActions) {
  const normalized = normalizeArray(correctiveActions);

  if (normalized.length > 0) {
    return normalized;
  }

  return [ACTION_BY_REASON[reasonCode]].filter((value) => typeof value === 'string');
}

function normalizeGovernanceDecisionResult(result) {
  if (!isObject(result)) {
    return {
      valid: false,
      reason: 'governanceDecisionResult invalide: objet attendu.'
    };
  }

  if (typeof result.allowed !== 'boolean') {
    return {
      valid: false,
      reason: 'governanceDecisionResult.allowed invalide: booléen attendu.'
    };
  }

  const reasonCode = normalizeReasonCode(result.reasonCode);

  if (!reasonCode) {
    return {
      valid: false,
      reason: `governanceDecisionResult.reasonCode invalide: ${normalizeText(result.reasonCode) || 'vide'}.`
    };
  }

  const sourceReasonCode =
    normalizeReasonCode(result.diagnostics?.sourceReasonCode) ?? reasonCode;

  if (!result.allowed) {
    if (!UPSTREAM_BLOCKING_REASON_CODES.has(reasonCode)) {
      return {
        valid: false,
        reason: `governanceDecisionResult.reasonCode non propagable: ${reasonCode}.`
      };
    }

    return {
      valid: true,
      blocked: true,
      reasonCode,
      sourceReasonCode,
      reason:
        normalizeText(result.reason) ||
        `Source governance decision bloquée (${reasonCode}).`,
      correctiveActions: normalizeCorrectiveActions(reasonCode, result.correctiveActions),
      decisionHistory: [],
      decisionEntry: null
    };
  }

  if (reasonCode !== 'OK') {
    return {
      valid: false,
      reason: `governanceDecisionResult incohérent: allowed=true exige reasonCode=OK (reçu ${reasonCode}).`
    };
  }

  if (result.decisionHistory !== undefined && !Array.isArray(result.decisionHistory)) {
    return {
      valid: false,
      reason: 'governanceDecisionResult.decisionHistory invalide: tableau attendu si fourni.'
    };
  }

  if (
    result.decisionEntry !== undefined &&
    result.decisionEntry !== null &&
    !isObject(result.decisionEntry)
  ) {
    return {
      valid: false,
      reason: 'governanceDecisionResult.decisionEntry invalide: objet ou null attendu si fourni.'
    };
  }

  return {
    valid: true,
    blocked: false,
    reasonCode,
    sourceReasonCode,
    reason: normalizeText(result.reason) || 'Décision de gouvernance valide.',
    correctiveActions: normalizeArray(result.correctiveActions),
    decisionHistory: Array.isArray(result.decisionHistory)
      ? result.decisionHistory.map((entry) => cloneValue(entry))
      : [],
    decisionEntry: result.decisionEntry ? cloneValue(result.decisionEntry) : null
  };
}

function resolveSource(payload, runtimeOptions) {
  if (payload.governanceDecisionResult !== undefined) {
    return normalizeGovernanceDecisionResult(payload.governanceDecisionResult);
  }

  if (payload.governanceDecisionInput !== undefined) {
    if (!isObject(payload.governanceDecisionInput)) {
      return {
        valid: false,
        reason: 'governanceDecisionInput invalide: objet attendu.'
      };
    }

    const delegatedOptions = isObject(runtimeOptions.governanceDecisionOptions)
      ? runtimeOptions.governanceDecisionOptions
      : {};

    let delegatedResult;

    try {
      delegatedResult = recordPhaseGateGovernanceDecision(payload.governanceDecisionInput, delegatedOptions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      return {
        valid: false,
        reason: `recordPhaseGateGovernanceDecision a levé une exception: ${message}`
      };
    }

    return normalizeGovernanceDecisionResult(delegatedResult);
  }

  return {
    valid: false,
    reason:
      'Aucune source exploitable: fournir governanceDecisionResult ou governanceDecisionInput.'
  };
}

function deriveStatusFromSnapshot(rawSnapshot) {
  const explicitStatus = normalizeStatus(rawSnapshot.status);

  if (explicitStatus) {
    return explicitStatus;
  }

  if (typeof rawSnapshot.allowed === 'boolean') {
    return rawSnapshot.allowed ? 'PASS' : 'FAIL';
  }

  const reasonCode = normalizeReasonCode(rawSnapshot.reasonCode);

  if (reasonCode === 'OK') {
    return 'PASS';
  }

  if (reasonCode) {
    return 'FAIL';
  }

  return null;
}

function normalizeSnapshotParentGateId(gateId, rawSnapshot) {
  if (!SUB_GATE_ORDER.includes(gateId)) {
    return null;
  }

  const declaredParent = normalizeText(rawSnapshot.parentGateId).toUpperCase();

  if (declaredParent.length === 0) {
    return 'G4';
  }

  return declaredParent;
}

function normalizeGateSnapshot(rawSnapshot, label) {
  if (!isObject(rawSnapshot)) {
    return {
      valid: false,
      reason: `${label} invalide: objet attendu.`
    };
  }

  const gateId = normalizeGateId(rawSnapshot.gateId ?? rawSnapshot.gate);

  if (!gateId) {
    return {
      valid: false,
      reason: `${label}.gateId invalide: gate attendue parmi ${[...GATE_SET].join(', ')}.`
    };
  }

  const parentGateId = normalizeSnapshotParentGateId(gateId, rawSnapshot);

  if (SUB_GATE_ORDER.includes(gateId) && parentGateId !== 'G4') {
    return {
      valid: false,
      reason: `${label}.parentGateId invalide: G4 requis pour ${gateId}.`
    };
  }

  const status = deriveStatusFromSnapshot(rawSnapshot);
  const owner = normalizeText(rawSnapshot.owner) || null;
  const updatedAtMs = parseTimestampMs(
    rawSnapshot.updatedAt ?? rawSnapshot.decidedAt ?? rawSnapshot.timestamp
  );

  const explicitReasonCode = rawSnapshot.reasonCode !== undefined;
  const parsedReasonCode = normalizeReasonCode(rawSnapshot.reasonCode);

  if (explicitReasonCode && !parsedReasonCode) {
    return {
      valid: false,
      reason: `${label}.reasonCode invalide: ${normalizeText(rawSnapshot.reasonCode) || 'vide'}.`
    };
  }

  const reasonCode = parsedReasonCode ?? (status === 'PASS' ? 'OK' : null);

  const sourceReasonCode =
    normalizeReasonCode(rawSnapshot.sourceReasonCode) ??
    reasonCode ??
    'INVALID_GOVERNANCE_DECISION_INPUT';

  return {
    valid: true,
    snapshot: {
      gateId,
      parentGateId,
      status,
      owner,
      updatedAt: updatedAtMs !== null ? toIso(updatedAtMs) : null,
      updatedAtMs,
      reasonCode,
      sourceReasonCode,
      decisionId: normalizeText(rawSnapshot.decisionId) || null,
      severity: normalizeText(rawSnapshot.severity) || null
    }
  };
}

function collectSnapshots(payload, sourceResolution) {
  const snapshots = [];

  for (let index = 0; index < sourceResolution.decisionHistory.length; index += 1) {
    const normalized = normalizeGateSnapshot(
      sourceResolution.decisionHistory[index],
      `governanceDecisionResult.decisionHistory[${index}]`
    );

    if (!normalized.valid) {
      return normalized;
    }

    snapshots.push(normalized.snapshot);
  }

  if (sourceResolution.decisionEntry !== null) {
    const normalized = normalizeGateSnapshot(
      sourceResolution.decisionEntry,
      'governanceDecisionResult.decisionEntry'
    );

    if (!normalized.valid) {
      return normalized;
    }

    snapshots.push(normalized.snapshot);
  }

  if (payload.gateSnapshots !== undefined) {
    if (!Array.isArray(payload.gateSnapshots)) {
      return {
        valid: false,
        reason: 'gateSnapshots invalide: tableau attendu si fourni.'
      };
    }

    for (let index = 0; index < payload.gateSnapshots.length; index += 1) {
      const normalized = normalizeGateSnapshot(
        payload.gateSnapshots[index],
        `gateSnapshots[${index}]`
      );

      if (!normalized.valid) {
        return normalized;
      }

      snapshots.push(normalized.snapshot);
    }
  }

  return {
    valid: true,
    snapshots
  };
}

function isSnapshotNewer(candidate, current) {
  if (!current) {
    return true;
  }

  const candidateMsRaw = Number(candidate.updatedAtMs);
  const currentMsRaw = Number(current.updatedAtMs);

  const candidateHasTs =
    candidate.updatedAtMs !== null &&
    candidate.updatedAtMs !== undefined &&
    Number.isFinite(candidateMsRaw);
  const currentHasTs =
    current.updatedAtMs !== null &&
    current.updatedAtMs !== undefined &&
    Number.isFinite(currentMsRaw);

  if (candidateHasTs && currentHasTs) {
    return candidateMsRaw >= currentMsRaw;
  }

  if (candidateHasTs && !currentHasTs) {
    return true;
  }

  if (!candidateHasTs && currentHasTs) {
    return false;
  }

  return true;
}

function mergeSnapshotsByGateId(snapshots) {
  const byGateId = new Map();

  for (const snapshot of snapshots) {
    const current = byGateId.get(snapshot.gateId);

    if (isSnapshotNewer(snapshot, current)) {
      byGateId.set(snapshot.gateId, snapshot);
    }
  }

  return byGateId;
}

function createGatePlaceholder(gateId, parentGateId = null) {
  return {
    gateId,
    parentGateId,
    status: null,
    owner: null,
    updatedAt: null,
    updatedAtMs: null,
    reasonCode: null,
    sourceReasonCode: null,
    linkedSubGates: gateId === 'G4' ? [...SUB_GATE_ORDER] : []
  };
}

function buildGateCenterAndSubGates(byGateId, nowMs) {
  const buildSamples = [];

  const gateCenter = GATE_ORDER.map((gateId) => {
    const startedAtMs = nowMs();
    const snapshot = byGateId.get(gateId) ?? createGatePlaceholder(gateId);

    const gate = {
      gateId,
      status: snapshot.status,
      owner: snapshot.owner,
      updatedAt: snapshot.updatedAt,
      reasonCode: snapshot.reasonCode,
      sourceReasonCode: snapshot.sourceReasonCode,
      linkedSubGates: gateId === 'G4' ? [...SUB_GATE_ORDER] : []
    };

    buildSamples.push(toDurationMs(startedAtMs, nowMs()));
    return gate;
  });

  const subGates = SUB_GATE_ORDER.map((gateId) => {
    const startedAtMs = nowMs();
    const snapshot = byGateId.get(gateId) ?? createGatePlaceholder(gateId, 'G4');

    const subGate = {
      gateId,
      parentGateId: 'G4',
      status: snapshot.status,
      owner: snapshot.owner,
      updatedAt: snapshot.updatedAt,
      reasonCode: snapshot.reasonCode,
      sourceReasonCode: snapshot.sourceReasonCode
    };

    buildSamples.push(toDurationMs(startedAtMs, nowMs()));
    return subGate;
  });

  return {
    gateCenter,
    subGates,
    buildSamples
  };
}

function collectIncompleteFields(gateCenter, subGates) {
  const missingFields = [];

  const inspect = (entity) => {
    if (!entity.status) {
      missingFields.push(`${entity.gateId}.status`);
    }

    if (!entity.owner) {
      missingFields.push(`${entity.gateId}.owner`);
    }

    if (!entity.updatedAt) {
      missingFields.push(`${entity.gateId}.updatedAt`);
    }
  };

  for (const gate of gateCenter) {
    inspect(gate);
  }

  for (const subGate of subGates) {
    inspect(subGate);
  }

  return missingFields;
}

function deriveExpectedG4Status(subGates) {
  if (subGates.some((entry) => entry.status === null)) {
    return null;
  }

  if (subGates.every((entry) => entry.status === 'PASS')) {
    return 'PASS';
  }

  if (subGates.some((entry) => entry.status === 'FAIL')) {
    return 'FAIL';
  }

  return 'CONCERNS';
}

function hasNonPassSubGates(subGates) {
  return subGates.some((entry) => entry.status !== 'PASS');
}

function buildStaleCount(gateCenter, subGates, staleAfterMs, nowMsValue) {
  let staleCount = 0;

  const inspect = (entry) => {
    const updatedAtMs = parseTimestampMs(entry.updatedAt);

    if (updatedAtMs === null) {
      return;
    }

    if (nowMsValue - updatedAtMs > staleAfterMs) {
      staleCount += 1;
    }
  };

  for (const gate of gateCenter) {
    inspect(gate);
  }

  for (const subGate of subGates) {
    inspect(subGate);
  }

  return staleCount;
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  gateCenter = [],
  subGates = [],
  correctiveActions = []
}) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: {
      gatesCount: diagnostics.gatesCount,
      subGatesCount: diagnostics.subGatesCount,
      staleCount: diagnostics.staleCount,
      durationMs: diagnostics.durationMs,
      p95BuildMs: diagnostics.p95BuildMs,
      sourceReasonCode: diagnostics.sourceReasonCode
    },
    gateCenter: gateCenter.map((entry) => cloneValue(entry)),
    subGates: subGates.map((entry) => cloneValue(entry)),
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidInputResult({
  reason,
  durationMs = 0,
  sourceReasonCode = 'INVALID_GATE_CENTER_INPUT',
  gateCenter = [],
  subGates = [],
  p95BuildMs = 0,
  staleCount = 0,
  correctiveActions
}) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_GATE_CENTER_INPUT',
    reason,
    diagnostics: {
      gatesCount: gateCenter.length,
      subGatesCount: subGates.length,
      staleCount,
      durationMs,
      p95BuildMs,
      sourceReasonCode
    },
    gateCenter,
    subGates,
    correctiveActions: correctiveActions ?? ['FIX_GATE_CENTER_INPUT']
  });
}

function createBlockedResult({ reasonCode, reason, sourceReasonCode, durationMs, correctiveActions }) {
  return createResult({
    allowed: false,
    reasonCode,
    reason,
    diagnostics: {
      gatesCount: 0,
      subGatesCount: 0,
      staleCount: 0,
      durationMs,
      p95BuildMs: 0,
      sourceReasonCode
    },
    gateCenter: [],
    subGates: [],
    correctiveActions: normalizeCorrectiveActions(reasonCode, correctiveActions)
  });
}

export function buildGateCenterStatus(input, options = {}) {
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

  const staleResolution = resolveStaleAfterMs(payload, runtimeOptions);

  if (!staleResolution.valid) {
    return createInvalidInputResult({
      reason: staleResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
    });
  }

  const snapshotResolution = collectSnapshots(payload, sourceResolution);

  if (!snapshotResolution.valid) {
    return createInvalidInputResult({
      reason: snapshotResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
    });
  }

  const byGateId = mergeSnapshotsByGateId(snapshotResolution.snapshots);
  const buildResolution = buildGateCenterAndSubGates(byGateId, nowMs);

  const gateCenter = buildResolution.gateCenter;
  const subGates = buildResolution.subGates;
  const buildSamples = buildResolution.buildSamples;

  const staleCount = buildStaleCount(gateCenter, subGates, staleResolution.staleAfterMs, nowMs());
  const durationMs = toDurationMs(startedAtMs, nowMs());
  const p95BuildMs = computePercentile(buildSamples, 95);

  const missingFields = collectIncompleteFields(gateCenter, subGates);

  if (missingFields.length > 0) {
    const reason =
      `Gate metadata incomplète: ${missingFields.slice(0, 6).join(', ')}` +
      (missingFields.length > 6 ? ` (+${missingFields.length - 6} autres)` : '.');

    const correctiveActions = normalizeCorrectiveActions(
      'GATE_STATUS_INCOMPLETE',
      payload.correctiveActions
    );

    if (!correctiveActions.includes('BLOCK_DONE_TRANSITION')) {
      correctiveActions.push('BLOCK_DONE_TRANSITION');
    }

    return createResult({
      allowed: false,
      reasonCode: 'GATE_STATUS_INCOMPLETE',
      reason,
      diagnostics: {
        gatesCount: gateCenter.length,
        subGatesCount: subGates.length,
        staleCount,
        durationMs,
        p95BuildMs,
        sourceReasonCode: sourceResolution.sourceReasonCode
      },
      gateCenter,
      subGates,
      correctiveActions: normalizeArray(correctiveActions)
    });
  }

  const g4 = gateCenter.find((entry) => entry.gateId === 'G4');
  const expectedG4Status = deriveExpectedG4Status(subGates);

  if (g4 && expectedG4Status && g4.status !== expectedG4Status) {
    const correctiveActions = normalizeCorrectiveActions(
      'G4_SUBGATE_MISMATCH',
      payload.correctiveActions
    );

    if (!correctiveActions.includes('BLOCK_DONE_TRANSITION')) {
      correctiveActions.push('BLOCK_DONE_TRANSITION');
    }

    return createResult({
      allowed: false,
      reasonCode: 'G4_SUBGATE_MISMATCH',
      reason:
        `Incohérence G4: status=${g4.status} alors que sous-gates imposent ${expectedG4Status}.`,
      diagnostics: {
        gatesCount: gateCenter.length,
        subGatesCount: subGates.length,
        staleCount,
        durationMs,
        p95BuildMs,
        sourceReasonCode: sourceResolution.sourceReasonCode
      },
      gateCenter,
      subGates,
      correctiveActions: normalizeArray(correctiveActions)
    });
  }

  const correctiveActions = normalizeArray([
    ...normalizeArray(sourceResolution.correctiveActions),
    ...normalizeArray(payload.correctiveActions)
  ]);

  if (hasNonPassSubGates(subGates) && !correctiveActions.includes('BLOCK_DONE_TRANSITION')) {
    correctiveActions.push('BLOCK_DONE_TRANSITION');
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason:
      `Gate Center prêt: ${gateCenter.length} gates (${GATE_ORDER.join('→')}) et ` +
      `${subGates.length} sous-gates G4 corrélées.`,
    diagnostics: {
      gatesCount: gateCenter.length,
      subGatesCount: subGates.length,
      staleCount,
      durationMs,
      p95BuildMs,
      sourceReasonCode: sourceResolution.sourceReasonCode
    },
    gateCenter,
    subGates,
    correctiveActions: normalizeArray(correctiveActions)
  });
}
