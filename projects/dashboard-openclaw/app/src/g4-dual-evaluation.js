import { buildGateCenterStatus } from './gate-center-status.js';

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
  'INVALID_G4_DUAL_INPUT'
]);

const REASON_CODE_SET = new Set(REASON_CODES);
const STATUS_SET = new Set(['PASS', 'CONCERNS', 'FAIL']);
const SUB_GATE_IDS = Object.freeze(['G4-T', 'G4-UX']);
const DEFAULT_MAX_SYNC_SKEW_MS = 120_000;

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
  'INVALID_GATE_CENTER_INPUT'
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
  INVALID_G4_DUAL_INPUT: 'FIX_G4_DUAL_INPUT'
});

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneValue(value) {
  if (value instanceof Date) {
    return new Date(value.getTime());
  }

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

function normalizeCorrectiveActions(reasonCode, correctiveActions) {
  const normalized = normalizeArray(correctiveActions);

  if (normalized.length > 0) {
    return normalized;
  }

  return [ACTION_BY_REASON[reasonCode]].filter((entry) => typeof entry === 'string');
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

function resolveMaxSyncSkewMs(payload, runtimeOptions) {
  const candidate = payload.maxSyncSkewMs ?? runtimeOptions.maxSyncSkewMs ?? DEFAULT_MAX_SYNC_SKEW_MS;

  if (!Number.isInteger(candidate) || candidate < 0) {
    return {
      valid: false,
      reason: 'maxSyncSkewMs invalide: entier >= 0 requis.'
    };
  }

  return {
    valid: true,
    maxSyncSkewMs: candidate
  };
}

function normalizeGateCenterResult(result) {
  if (!isObject(result)) {
    return {
      valid: false,
      reason: 'gateCenterResult invalide: objet attendu.'
    };
  }

  if (typeof result.allowed !== 'boolean') {
    return {
      valid: false,
      reason: 'gateCenterResult.allowed invalide: booléen attendu.'
    };
  }

  const reasonCode = normalizeReasonCode(result.reasonCode);

  if (!reasonCode) {
    return {
      valid: false,
      reason: `gateCenterResult.reasonCode invalide: ${normalizeText(result.reasonCode) || 'vide'}.`
    };
  }

  const sourceReasonCode = normalizeReasonCode(result.diagnostics?.sourceReasonCode) ?? reasonCode;

  if (!result.allowed) {
    if (!UPSTREAM_BLOCKING_REASON_CODES.has(reasonCode)) {
      return {
        valid: false,
        reason: `gateCenterResult.reasonCode non propagable: ${reasonCode}.`
      };
    }

    return {
      valid: true,
      blocked: true,
      reasonCode,
      sourceReasonCode,
      reason: normalizeText(result.reason) || `Source Gate Center bloquée (${reasonCode}).`,
      correctiveActions: normalizeCorrectiveActions(reasonCode, result.correctiveActions),
      gateCenter: [],
      subGates: []
    };
  }

  if (reasonCode !== 'OK') {
    return {
      valid: false,
      reason: `gateCenterResult incohérent: allowed=true exige reasonCode=OK (reçu ${reasonCode}).`
    };
  }

  if (!Array.isArray(result.gateCenter)) {
    return {
      valid: false,
      reason: 'gateCenterResult.gateCenter invalide: tableau attendu quand allowed=true.'
    };
  }

  if (!Array.isArray(result.subGates)) {
    return {
      valid: false,
      reason: 'gateCenterResult.subGates invalide: tableau attendu quand allowed=true.'
    };
  }

  return {
    valid: true,
    blocked: false,
    reasonCode,
    sourceReasonCode,
    reason: normalizeText(result.reason),
    correctiveActions: normalizeArray(result.correctiveActions),
    gateCenter: result.gateCenter.map((entry) => cloneValue(entry)),
    subGates: result.subGates.map((entry) => cloneValue(entry))
  };
}

function resolveSource(payload, runtimeOptions) {
  if (payload.gateCenterResult !== undefined) {
    return normalizeGateCenterResult(payload.gateCenterResult);
  }

  if (payload.gateCenterInput !== undefined) {
    if (!isObject(payload.gateCenterInput)) {
      return {
        valid: false,
        reason: 'gateCenterInput invalide: objet attendu.'
      };
    }

    const delegatedOptions = isObject(runtimeOptions.gateCenterOptions)
      ? runtimeOptions.gateCenterOptions
      : {};

    let delegatedResult;

    try {
      delegatedResult = buildGateCenterStatus(payload.gateCenterInput, delegatedOptions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        valid: false,
        reason: `buildGateCenterStatus a levé une exception: ${message}`
      };
    }

    return normalizeGateCenterResult(delegatedResult);
  }

  return {
    valid: false,
    reason: 'Aucune source exploitable: fournir gateCenterResult ou gateCenterInput.'
  };
}

function resolveEvidenceCount(rawSubGate, payload, gateId) {
  if (isObject(payload.evidenceByGate)) {
    const fromPayload = payload.evidenceByGate[gateId];

    if (Number.isInteger(fromPayload) && fromPayload >= 0) {
      return fromPayload;
    }
  }

  if (Number.isInteger(rawSubGate.evidenceCount) && rawSubGate.evidenceCount >= 0) {
    return rawSubGate.evidenceCount;
  }

  if (Array.isArray(rawSubGate.evidenceRefs)) {
    return rawSubGate.evidenceRefs.length;
  }

  return 0;
}

function normalizeDualSubGate(rawSubGate, payload, expectedGateId, label) {
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

  return {
    valid: true,
    subGate: {
      gateId,
      status,
      owner,
      updatedAt: toIso(updatedAtMs),
      updatedAtMs,
      evidenceCount: resolveEvidenceCount(rawSubGate, payload, expectedGateId),
      reasonCode: normalizeReasonCode(rawSubGate.reasonCode) ?? (status === 'PASS' ? 'OK' : null),
      sourceReasonCode:
        normalizeReasonCode(rawSubGate.sourceReasonCode) ??
        (status === 'PASS' ? 'OK' : 'G4_DUAL_EVALUATION_FAILED')
    }
  };
}

function resolveDualInputFromGateCenter(sourceResolution, payload) {
  const byGateId = new Map();

  for (const subGate of sourceResolution.subGates) {
    const gateId = normalizeText(subGate?.gateId).toUpperCase();

    if (SUB_GATE_IDS.includes(gateId)) {
      byGateId.set(gateId, subGate);
    }
  }

  const g4tRaw = byGateId.get('G4-T');
  const g4uxRaw = byGateId.get('G4-UX');

  if (!g4tRaw || !g4uxRaw) {
    return {
      valid: false,
      reason: 'gateCenterResult.subGates doit contenir G4-T et G4-UX.'
    };
  }

  const g4tResolution = normalizeDualSubGate(g4tRaw, payload, 'G4-T', 'subGates[G4-T]');

  if (!g4tResolution.valid) {
    return g4tResolution;
  }

  const g4uxResolution = normalizeDualSubGate(g4uxRaw, payload, 'G4-UX', 'subGates[G4-UX]');

  if (!g4uxResolution.valid) {
    return g4uxResolution;
  }

  const g4Global = sourceResolution.gateCenter.find(
    (entry) => normalizeText(entry?.gateId).toUpperCase() === 'G4'
  );

  const normalizedG4 = isObject(g4Global)
    ? {
        gateId: 'G4',
        status: normalizeStatus(g4Global.status),
        owner: normalizeText(g4Global.owner) || null,
        updatedAt: parseTimestampMs(g4Global.updatedAt),
        sourceReasonCode: normalizeReasonCode(g4Global.sourceReasonCode)
      }
    : null;

  return {
    valid: true,
    g4t: g4tResolution.subGate,
    g4ux: g4uxResolution.subGate,
    g4: normalizedG4
  };
}

function buildCorrelationMatrix(g4tStatus, g4uxStatus) {
  const statuses = ['PASS', 'CONCERNS', 'FAIL'];

  return statuses.flatMap((leftStatus) =>
    statuses.map((rightStatus) => {
      let dualVerdict = 'CONCERNS';

      if (leftStatus === 'PASS' && rightStatus === 'PASS') {
        dualVerdict = 'PASS';
      } else if (leftStatus === 'FAIL' || rightStatus === 'FAIL') {
        dualVerdict = 'FAIL';
      }

      return {
        g4tStatus: leftStatus,
        g4uxStatus: rightStatus,
        dualVerdict,
        ruleId: 'RULE-G4-01',
        matched: leftStatus === g4tStatus && rightStatus === g4uxStatus
      };
    })
  );
}

function resolveDualVerdict(g4tStatus, g4uxStatus) {
  if (g4tStatus === 'PASS' && g4uxStatus === 'PASS') {
    return 'PASS';
  }

  if (g4tStatus === 'FAIL' || g4uxStatus === 'FAIL') {
    return 'FAIL';
  }

  if (g4tStatus === 'CONCERNS' || g4uxStatus === 'CONCERNS') {
    return 'CONCERNS';
  }

  return null;
}

function buildSyncDiagnostics({ g4t, g4ux, g4, dualVerdict, maxSyncSkewMs, payload }) {
  const unsyncReasons = [];
  const mismatchReasons = [];

  const timestampSkewMs = Math.abs(g4t.updatedAtMs - g4ux.updatedAtMs);

  if (timestampSkewMs > maxSyncSkewMs) {
    unsyncReasons.push(
      `Décalage horodatage G4-T/G4-UX=${timestampSkewMs}ms (> ${maxSyncSkewMs}ms).`
    );
  }

  const expectedOwner = normalizeText(payload.expectedOwner);

  if (expectedOwner.length > 0 && (g4t.owner !== expectedOwner || g4ux.owner !== expectedOwner)) {
    unsyncReasons.push(
      `Owner attendu=${expectedOwner} non respecté (G4-T=${g4t.owner}, G4-UX=${g4ux.owner}).`
    );
  }

  if (g4 && Number.isFinite(g4.updatedAt)) {
    const newestSubGateMs = Math.max(g4t.updatedAtMs, g4ux.updatedAtMs);
    const globalSkewMs = Math.abs(g4.updatedAt - newestSubGateMs);

    if (globalSkewMs > maxSyncSkewMs) {
      unsyncReasons.push(
        `Décalage horodatage G4/global=${globalSkewMs}ms (> ${maxSyncSkewMs}ms).`
      );
    }
  }

  if (g4 && g4.status && g4.status !== dualVerdict) {
    mismatchReasons.push(`Status G4=${g4.status} incohérent avec verdict dual=${dualVerdict}.`);
  }

  return {
    mismatchCount: mismatchReasons.length + unsyncReasons.length,
    mismatchReasons,
    unsyncReasons,
    timestampSkewMs
  };
}

function createCorrelationSeed() {
  return buildCorrelationMatrix('PASS', 'PASS').map((entry) => ({
    ...entry,
    matched: false
  }));
}

function createEmptyDualStatus() {
  return {
    g4: {
      status: null,
      owner: null,
      updatedAt: null
    },
    g4t: {
      status: null,
      owner: null,
      updatedAt: null,
      evidenceCount: 0
    },
    g4ux: {
      status: null,
      owner: null,
      updatedAt: null,
      evidenceCount: 0
    },
    dualVerdict: null,
    synchronized: false
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  g4DualStatus,
  correlationMatrix,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: {
      g4tStatus: diagnostics.g4tStatus,
      g4uxStatus: diagnostics.g4uxStatus,
      dualVerdict: diagnostics.dualVerdict,
      mismatchCount: diagnostics.mismatchCount,
      durationMs: diagnostics.durationMs,
      p95DualEvalMs: diagnostics.p95DualEvalMs,
      sourceReasonCode: diagnostics.sourceReasonCode
    },
    g4DualStatus: cloneValue(g4DualStatus),
    correlationMatrix: correlationMatrix.map((entry) => cloneValue(entry)),
    correctiveActions: [...correctiveActions]
  };
}

function createInvalidInputResult({ reason, durationMs = 0, sourceReasonCode = 'INVALID_G4_DUAL_INPUT' }) {
  return createResult({
    allowed: false,
    reasonCode: 'INVALID_G4_DUAL_INPUT',
    reason,
    diagnostics: {
      g4tStatus: null,
      g4uxStatus: null,
      dualVerdict: null,
      mismatchCount: 0,
      durationMs,
      p95DualEvalMs: 0,
      sourceReasonCode
    },
    g4DualStatus: createEmptyDualStatus(),
    correlationMatrix: createCorrelationSeed(),
    correctiveActions: ['FIX_G4_DUAL_INPUT']
  });
}

function createBlockedResult({ reasonCode, reason, sourceReasonCode, durationMs, correctiveActions }) {
  return createResult({
    allowed: false,
    reasonCode,
    reason,
    diagnostics: {
      g4tStatus: null,
      g4uxStatus: null,
      dualVerdict: null,
      mismatchCount: 0,
      durationMs,
      p95DualEvalMs: 0,
      sourceReasonCode
    },
    g4DualStatus: createEmptyDualStatus(),
    correlationMatrix: createCorrelationSeed(),
    correctiveActions: normalizeCorrectiveActions(reasonCode, correctiveActions)
  });
}

export function evaluateG4DualCorrelation(input, options = {}) {
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

  const maxSyncSkewResolution = resolveMaxSyncSkewMs(payload, runtimeOptions);

  if (!maxSyncSkewResolution.valid) {
    return createInvalidInputResult({
      reason: maxSyncSkewResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
    });
  }

  const dualInputResolution = resolveDualInputFromGateCenter(sourceResolution, payload);

  if (!dualInputResolution.valid) {
    return createInvalidInputResult({
      reason: dualInputResolution.reason,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      sourceReasonCode: sourceResolution.sourceReasonCode
    });
  }

  const dualSamples = [];
  const evaluateStartedAtMs = nowMs();

  const dualVerdict = resolveDualVerdict(dualInputResolution.g4t.status, dualInputResolution.g4ux.status);
  dualSamples.push(toDurationMs(evaluateStartedAtMs, nowMs()));

  if (!dualVerdict) {
    return createResult({
      allowed: false,
      reasonCode: 'G4_DUAL_EVALUATION_FAILED',
      reason: 'Verdict dual G4 indéterminable pour les statuts fournis.',
      diagnostics: {
        g4tStatus: dualInputResolution.g4t.status,
        g4uxStatus: dualInputResolution.g4ux.status,
        dualVerdict: null,
        mismatchCount: 0,
        durationMs: toDurationMs(startedAtMs, nowMs()),
        p95DualEvalMs: computePercentile(dualSamples, 95),
        sourceReasonCode: sourceResolution.sourceReasonCode
      },
      g4DualStatus: {
        g4: {
          status: dualInputResolution.g4?.status ?? null,
          owner: dualInputResolution.g4?.owner ?? null,
          updatedAt:
            Number.isFinite(dualInputResolution.g4?.updatedAt)
              ? toIso(dualInputResolution.g4.updatedAt)
              : null
        },
        g4t: {
          ...dualInputResolution.g4t
        },
        g4ux: {
          ...dualInputResolution.g4ux
        },
        dualVerdict: null,
        synchronized: false
      },
      correlationMatrix: buildCorrelationMatrix(
        dualInputResolution.g4t.status,
        dualInputResolution.g4ux.status
      ),
      correctiveActions: normalizeCorrectiveActions(
        'G4_DUAL_EVALUATION_FAILED',
        payload.correctiveActions
      )
    });
  }

  const syncStartedAtMs = nowMs();
  const syncDiagnostics = buildSyncDiagnostics({
    g4t: dualInputResolution.g4t,
    g4ux: dualInputResolution.g4ux,
    g4: dualInputResolution.g4,
    dualVerdict,
    maxSyncSkewMs: maxSyncSkewResolution.maxSyncSkewMs,
    payload
  });
  dualSamples.push(toDurationMs(syncStartedAtMs, nowMs()));

  const g4DualStatus = {
    g4: {
      status: dualInputResolution.g4?.status ?? null,
      owner: dualInputResolution.g4?.owner ?? null,
      updatedAt:
        Number.isFinite(dualInputResolution.g4?.updatedAt)
          ? toIso(dualInputResolution.g4.updatedAt)
          : null
    },
    g4t: cloneValue(dualInputResolution.g4t),
    g4ux: cloneValue(dualInputResolution.g4ux),
    dualVerdict,
    synchronized: syncDiagnostics.unsyncReasons.length === 0
  };

  const correlationMatrix = buildCorrelationMatrix(
    dualInputResolution.g4t.status,
    dualInputResolution.g4ux.status
  );

  const correctiveActions = normalizeArray([
    ...normalizeArray(sourceResolution.correctiveActions),
    ...normalizeArray(payload.correctiveActions)
  ]);

  if (dualVerdict !== 'PASS' && !correctiveActions.includes('BLOCK_DONE_TRANSITION')) {
    correctiveActions.push('BLOCK_DONE_TRANSITION');
  }

  if (dualInputResolution.g4ux.status !== 'PASS' && !correctiveActions.includes('REQUEST_UX_EVIDENCE_REFRESH')) {
    correctiveActions.push('REQUEST_UX_EVIDENCE_REFRESH');
  }

  if (syncDiagnostics.unsyncReasons.length > 0) {
    if (!correctiveActions.includes('SYNC_G4_SUBGATES')) {
      correctiveActions.push('SYNC_G4_SUBGATES');
    }

    if (!correctiveActions.includes('BLOCK_DONE_TRANSITION')) {
      correctiveActions.push('BLOCK_DONE_TRANSITION');
    }

    return createResult({
      allowed: false,
      reasonCode: 'G4_SUBGATES_UNSYNC',
      reason: syncDiagnostics.unsyncReasons.join(' '),
      diagnostics: {
        g4tStatus: dualInputResolution.g4t.status,
        g4uxStatus: dualInputResolution.g4ux.status,
        dualVerdict,
        mismatchCount: syncDiagnostics.mismatchCount,
        durationMs: toDurationMs(startedAtMs, nowMs()),
        p95DualEvalMs: computePercentile(dualSamples, 95),
        sourceReasonCode: sourceResolution.sourceReasonCode
      },
      g4DualStatus,
      correlationMatrix,
      correctiveActions: normalizeArray(correctiveActions)
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason:
      `Corrélation duale G4 évaluée: G4-T=${dualInputResolution.g4t.status}, ` +
      `G4-UX=${dualInputResolution.g4ux.status}, verdict=${dualVerdict}.`,
    diagnostics: {
      g4tStatus: dualInputResolution.g4t.status,
      g4uxStatus: dualInputResolution.g4ux.status,
      dualVerdict,
      mismatchCount: syncDiagnostics.mismatchCount,
      durationMs: toDurationMs(startedAtMs, nowMs()),
      p95DualEvalMs: computePercentile(dualSamples, 95),
      sourceReasonCode: sourceResolution.sourceReasonCode
    },
    g4DualStatus,
    correlationMatrix,
    correctiveActions: normalizeArray(correctiveActions)
  });
}
