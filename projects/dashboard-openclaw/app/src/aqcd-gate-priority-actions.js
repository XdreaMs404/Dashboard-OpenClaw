import { buildAqcdReadinessRules } from './aqcd-readiness-rules.js';

const DEFAULT_DECISION_LATENCY_BUDGET_MS = 2500;

const BASE_REASON_CODES = Object.freeze([
  'OK',
  'INVALID_AQCD_READINESS_INPUT',
  'AQCD_READINESS_RULES_INVALID',
  'AQCD_READINESS_THRESHOLD_UNMET',
  'INVALID_AQCD_SCOREBOARD_INPUT',
  'AQCD_METRICS_INCOMPLETE',
  'AQCD_WEIGHTS_INVALID',
  'AQCD_FORMULA_SOURCE_MISSING',
  'AQCD_SNAPSHOT_SERIES_INVALID',
  'AQCD_BASELINE_BELOW_TARGET',
  'AQCD_LATENCY_BUDGET_EXCEEDED',
  'INVALID_AQCD_SNAPSHOT_COMPARISON_INPUT',
  'AQCD_COMPARATIVE_SNAPSHOTS_REQUIRED',
  'AQCD_SNAPSHOT_CONTINUITY_GAP',
  'AQCD_READINESS_RULES_INCOMPLETE'
]);

const REASON_CODES = Object.freeze([
  ...BASE_REASON_CODES,
  'INVALID_AQCD_GATE_PRIORITY_INPUT',
  'AQCD_RISK_REGISTER_INVALID',
  'AQCD_GATE_ACTIONS_EMPTY',
  'AQCD_RUNBOOK_EVIDENCE_REQUIRED',
  'AQCD_DECISION_LATENCY_BUDGET_EXCEEDED'
]);

const REASON_CODE_SET = new Set(REASON_CODES);

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_AQCD_GATE_PRIORITY_INPUT: ['FIX_AQCD_GATE_PRIORITY_INPUT'],
  AQCD_RISK_REGISTER_INVALID: ['FIX_AQCD_RISK_REGISTER_INPUT'],
  AQCD_GATE_ACTIONS_EMPTY: ['PROVIDE_PRIORITY_ACTION_SOURCES'],
  AQCD_RUNBOOK_EVIDENCE_REQUIRED: ['PROVIDE_RUNBOOK_EVIDENCE'],
  AQCD_DECISION_LATENCY_BUDGET_EXCEEDED: ['OPTIMIZE_AQCD_PRIORITY_COMPUTATION'],
  AQCD_READINESS_THRESHOLD_UNMET: ['IMPROVE_AQCD_READINESS_FACTORS'],
  AQCD_COMPARATIVE_SNAPSHOTS_REQUIRED: ['ADD_AQCD_PERIODIC_SNAPSHOTS'],
  AQCD_SNAPSHOT_CONTINUITY_GAP: ['RESTORE_AQCD_SNAPSHOT_CADENCE']
});

const CLOSED_RISK_STATUSES = new Set(['CLOSED', 'MITIGATED']);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => cloneValue(entry));
  }

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

function normalizeFiniteNumber(value, fallback = 0) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function roundScore(value) {
  return Number(normalizeFiniteNumber(value).toFixed(2));
}

function normalizeReasonCode(value) {
  const normalized = normalizeText(value);

  if (!REASON_CODE_SET.has(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeActions(actions, reasonCode) {
  const defaults = DEFAULT_CORRECTIVE_ACTIONS[reasonCode] ?? [];

  if (!Array.isArray(actions)) {
    return cloneValue(defaults);
  }

  const output = [];
  const seen = new Set();

  for (const entry of actions) {
    const normalized = normalizeText(String(entry ?? ''));

    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(normalized);
  }

  return output.length > 0 ? output : cloneValue(defaults);
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
    const normalized = normalizeText(value);

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

function computePercentile(samples, percentile) {
  if (!Array.isArray(samples) || samples.length === 0) {
    return 0;
  }

  const sorted = samples
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right);

  if (sorted.length === 0) {
    return 0;
  }

  const ratio = Math.min(100, Math.max(0, Number(percentile))) / 100;
  const index = Math.ceil(sorted.length * ratio) - 1;

  return sorted[Math.max(0, Math.min(sorted.length - 1, index))];
}

function resolveExposure(entry) {
  if (Number.isFinite(Number(entry.exposure))) {
    return roundScore(entry.exposure);
  }

  const probability = Number(entry.probability);
  const impact = Number(entry.impact);

  if (Number.isFinite(probability) && Number.isFinite(impact)) {
    return roundScore(probability * impact * 100);
  }

  return null;
}

function resolveRiskSeverity(exposure) {
  const normalized = normalizeFiniteNumber(exposure);

  if (normalized >= 80) {
    return 'CRITICAL';
  }

  if (normalized >= 60) {
    return 'HIGH';
  }

  if (normalized >= 40) {
    return 'MEDIUM';
  }

  return 'LOW';
}

function resolveRules(payload, runtimeOptions) {
  const source =
    (isObject(runtimeOptions.priorityRules) && runtimeOptions.priorityRules) ||
    (isObject(payload.priorityRules) && payload.priorityRules) ||
    {};

  return {
    actionCountPerGate: Math.max(
      1,
      Math.trunc(
        normalizeFiniteNumber(source.actionCountPerGate ?? payload.actionCountPerGate ?? 3, 3)
      )
    ),
    decisionLatencyBudgetMs: normalizeFiniteNumber(
      source.decisionLatencyBudgetMs ??
        payload.decisionLatencyBudgetMs ??
        DEFAULT_DECISION_LATENCY_BUDGET_MS,
      DEFAULT_DECISION_LATENCY_BUDGET_MS
    ),
    runbookRef:
      normalizeText(String(source.runbookRef ?? payload.runbookRef ?? 'runbook://aqcd-priority-v1')) ||
      'runbook://aqcd-priority-v1',
    runbookValidated:
      (source.runbookValidated ?? payload.runbookValidated ?? true) === true,
    modelVersion:
      normalizeText(String(source.modelVersion ?? payload.modelVersion ?? 'S052-v1')) ||
      'S052-v1'
  };
}

function resolveRiskRegister(payload) {
  const source =
    payload.riskRegister ?? payload.risks ?? payload.riskEntries ?? payload.riskRegistry;

  if (source === undefined) {
    return {
      valid: true,
      entries: []
    };
  }

  if (!Array.isArray(source)) {
    return {
      valid: false,
      reason: 'riskRegister invalide: tableau requis.'
    };
  }

  const entries = [];

  for (let index = 0; index < source.length; index += 1) {
    const entry = source[index];

    if (!isObject(entry)) {
      return {
        valid: false,
        reason: `riskRegister[${index}] invalide: objet requis.`
      };
    }

    const id = normalizeText(String(entry.id ?? entry.riskId ?? `RISK-${index + 1}`)) || `RISK-${index + 1}`;
    const gate = normalizeText(String(entry.gate ?? entry.gateId ?? 'G4')).toUpperCase() || 'G4';
    const owner = normalizeText(String(entry.owner ?? ''));
    const status = normalizeText(String(entry.status ?? entry.state ?? '')).toUpperCase();
    const dueAtMs = parseTimestampMs(entry.dueAt ?? entry.dueDate ?? entry.deadline);
    const exposure = resolveExposure(entry);

    if (owner.length === 0) {
      return {
        valid: false,
        reason: `riskRegister[${index}] invalide: owner requis.`
      };
    }

    if (!status) {
      return {
        valid: false,
        reason: `riskRegister[${index}] invalide: status requis.`
      };
    }

    if (dueAtMs === null) {
      return {
        valid: false,
        reason: `riskRegister[${index}] invalide: dueAt requis.`
      };
    }

    if (exposure === null) {
      return {
        valid: false,
        reason: `riskRegister[${index}] invalide: exposure requis.`
      };
    }

    entries.push({
      id,
      gate,
      owner,
      status,
      dueAt: toIso(dueAtMs),
      dueAtMs,
      exposure,
      severity: resolveRiskSeverity(exposure),
      evidenceRef:
        normalizeText(String(entry.evidenceRef ?? entry.proofRef ?? `risk://${id}`)) || `risk://${id}`,
      description: normalizeText(String(entry.description ?? entry.title ?? id)) || id
    });
  }

  entries.sort((left, right) => right.exposure - left.exposure || left.dueAt.localeCompare(right.dueAt));

  return {
    valid: true,
    entries
  };
}

function collectCandidateActions({ payload, readinessResult, riskEntries }) {
  const candidates = [];

  const explicitActions = Array.isArray(payload.gateActions)
    ? payload.gateActions
    : Array.isArray(payload.priorityActions)
      ? payload.priorityActions
      : [];

  for (const action of explicitActions) {
    if (!isObject(action)) {
      continue;
    }

    const actionId = normalizeText(String(action.actionId ?? action.id ?? ''));
    const gate = normalizeText(String(action.gate ?? action.gateId ?? 'G4')).toUpperCase() || 'G4';
    const owner = normalizeText(String(action.owner ?? ''));
    const evidenceRef = normalizeText(String(action.evidenceRef ?? action.proofRef ?? ''));

    if (!actionId || !owner || !evidenceRef) {
      continue;
    }

    candidates.push({
      gate,
      actionId,
      action: normalizeText(String(action.action ?? action.label ?? actionId)) || actionId,
      owner,
      evidenceRef,
      source: 'explicit',
      priorityScore: roundScore(normalizeFiniteNumber(action.priorityScore, 50))
    });
  }

  for (const recommendation of readinessResult.recommendations ?? []) {
    if (!isObject(recommendation)) {
      continue;
    }

    const actionId = normalizeText(String(recommendation.actionId ?? ''));
    const gate = normalizeText(String(recommendation.gate ?? 'G4')).toUpperCase() || 'G4';
    const owner = normalizeText(String(recommendation.owner ?? ''));
    const evidenceRef = normalizeText(String(recommendation.evidenceRef ?? ''));

    if (!actionId || !owner || !evidenceRef) {
      continue;
    }

    candidates.push({
      gate,
      actionId,
      action: normalizeText(String(recommendation.action ?? recommendation.label ?? actionId)) || actionId,
      owner,
      evidenceRef,
      source: 'readiness',
      priorityScore: roundScore(normalizeFiniteNumber(recommendation.priorityScore, 70))
    });
  }

  for (const risk of riskEntries) {
    const status = normalizeText(String(risk.status ?? '')).toUpperCase();

    if (CLOSED_RISK_STATUSES.has(status)) {
      continue;
    }

    candidates.push({
      gate: risk.gate,
      actionId: `MITIGATE_${risk.id}`,
      action: `Mitiger ${risk.id}: ${risk.description}`,
      owner: risk.owner,
      evidenceRef: risk.evidenceRef,
      source: 'risk-register',
      priorityScore: roundScore(risk.exposure)
    });
  }

  return candidates;
}

function prioritizeActions(candidates, actionCountPerGate) {
  const byKey = new Map();

  for (const action of candidates) {
    const gate = normalizeText(String(action.gate ?? '')).toUpperCase() || 'G4';
    const actionId = normalizeText(String(action.actionId ?? ''));
    const owner = normalizeText(String(action.owner ?? ''));
    const evidenceRef = normalizeText(String(action.evidenceRef ?? ''));

    if (!actionId || !owner || !evidenceRef) {
      continue;
    }

    const key = `${gate}::${actionId}`;
    const normalized = {
      gate,
      actionId,
      action: normalizeText(String(action.action ?? actionId)) || actionId,
      owner,
      evidenceRef,
      source: normalizeText(String(action.source ?? 'derived')) || 'derived',
      priorityScore: roundScore(normalizeFiniteNumber(action.priorityScore, 0))
    };

    if (!byKey.has(key) || byKey.get(key).priorityScore < normalized.priorityScore) {
      byKey.set(key, normalized);
    }
  }

  const byGate = new Map();

  for (const action of byKey.values()) {
    if (!byGate.has(action.gate)) {
      byGate.set(action.gate, []);
    }

    byGate.get(action.gate).push(action);
  }

  const groups = [];

  for (const [gate, actions] of byGate.entries()) {
    actions.sort((left, right) => right.priorityScore - left.priorityScore || left.actionId.localeCompare(right.actionId));

    groups.push({
      gate,
      actions: actions.slice(0, actionCountPerGate)
    });
  }

  groups.sort((left, right) => left.gate.localeCompare(right.gate));

  return groups;
}

function buildRiskRegistrySummary(entries) {
  const nowMs = Date.now();

  let openCount = 0;
  let mitigatedCount = 0;
  let closedCount = 0;

  for (const entry of entries) {
    const status = normalizeText(String(entry.status ?? '')).toUpperCase();

    if (status === 'MITIGATED') {
      mitigatedCount += 1;
    } else if (status === 'CLOSED') {
      closedCount += 1;
    } else {
      openCount += 1;
    }
  }

  const highestExposure = entries.length > 0 ? entries[0].exposure : 0;

  const nextDueEntry = entries
    .filter((entry) => !CLOSED_RISK_STATUSES.has(normalizeText(String(entry.status ?? '')).toUpperCase()))
    .sort((left, right) => left.dueAtMs - right.dueAtMs)[0];

  return {
    entries,
    counts: {
      open: openCount,
      mitigated: mitigatedCount,
      closed: closedCount
    },
    highestExposure: roundScore(highestExposure),
    nextDueAt: nextDueEntry ? nextDueEntry.dueAt : null,
    overdueCount: entries.filter(
      (entry) => entry.dueAtMs < nowMs && !CLOSED_RISK_STATUSES.has(String(entry.status).toUpperCase())
    ).length
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  scorecard,
  readiness,
  gateActions,
  riskRegistry,
  correctiveActions
}) {
  const normalizedReasonCode = normalizeReasonCode(reasonCode) ?? 'INVALID_AQCD_GATE_PRIORITY_INPUT';

  return {
    allowed,
    reasonCode: normalizedReasonCode,
    reason,
    diagnostics: cloneValue(diagnostics ?? {}),
    scorecard: cloneValue(scorecard ?? null),
    readiness: cloneValue(readiness ?? null),
    gateActions: cloneValue(gateActions ?? []),
    riskRegistry: cloneValue(riskRegistry ?? null),
    correctiveActions: normalizeActions(correctiveActions, normalizedReasonCode)
  };
}

export function buildAqcdGatePriorityActions(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_AQCD_GATE_PRIORITY_INPUT',
      reason: 'Entrée S052 invalide: objet requis.'
    });
  }

  const startedAt = Date.now();
  const rules = resolveRules(payload, runtimeOptions);

  if (!rules.runbookRef || !rules.runbookValidated) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_RUNBOOK_EVIDENCE_REQUIRED',
      reason: 'Runbook critique requis pour S052 (runbookRef + runbookValidated=true).',
      diagnostics: {
        window: normalizeText(String(payload.window ?? 'story')) || 'story',
        windowRef: normalizeText(String(payload.windowRef ?? payload.storyId ?? 'S052')) || 'S052',
        modelVersion: rules.modelVersion,
        runbookRef: rules.runbookRef,
        runbookValidated: rules.runbookValidated
      }
    });
  }

  const readinessResult = buildAqcdReadinessRules(payload, runtimeOptions);

  const readinessFailureAllowed = readinessResult.reasonCode === 'AQCD_READINESS_THRESHOLD_UNMET';

  if (!readinessResult.allowed && !readinessFailureAllowed) {
    return createResult({
      allowed: false,
      reasonCode: readinessResult.reasonCode,
      reason: readinessResult.reason,
      diagnostics: {
        ...readinessResult.diagnostics,
        modelVersion: rules.modelVersion,
        runbookRef: rules.runbookRef,
        runbookValidated: rules.runbookValidated
      },
      scorecard: readinessResult.scorecard,
      readiness: readinessResult.readiness,
      gateActions: [],
      riskRegistry: null,
      correctiveActions: readinessResult.correctiveActions
    });
  }

  const riskRegister = resolveRiskRegister(payload);

  if (!riskRegister.valid) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_RISK_REGISTER_INVALID',
      reason: riskRegister.reason
    });
  }

  const candidates = collectCandidateActions({
    payload,
    readinessResult,
    riskEntries: riskRegister.entries
  });

  const gateActions = prioritizeActions(candidates, rules.actionCountPerGate);

  const actionCount = gateActions.reduce((total, entry) => total + entry.actions.length, 0);

  if (actionCount === 0) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_GATE_ACTIONS_EMPTY',
      reason: 'Aucune action prioritaire dérivée pour les gates.'
    });
  }

  const riskRegistry = buildRiskRegistrySummary(riskRegister.entries);

  const decisionLatencySamples = Array.isArray(payload.decisionLatencySamplesMs)
    ? payload.decisionLatencySamplesMs
    : Array.isArray(payload.latencySamplesMs)
      ? payload.latencySamplesMs
      : [Date.now() - startedAt];

  const p95DecisionMs = roundScore(computePercentile(decisionLatencySamples, 95));
  const latencyBudgetMet = p95DecisionMs <= rules.decisionLatencyBudgetMs;

  const diagnostics = {
    window: normalizeText(String(payload.window ?? 'story')) || 'story',
    windowRef: normalizeText(String(payload.windowRef ?? payload.storyId ?? 'S052')) || 'S052',
    modelVersion: rules.modelVersion,
    rulesVersion: readinessResult.readiness?.rulesVersion ?? null,
    gateCount: gateActions.length,
    actionCount,
    actionCountPerGate: rules.actionCountPerGate,
    riskCount: riskRegister.entries.length,
    readinessScore: readinessResult.readiness?.score ?? null,
    readinessMet: readinessResult.readiness?.met ?? null,
    runbookRef: rules.runbookRef,
    runbookValidated: rules.runbookValidated,
    p95DecisionMs,
    decisionLatencyBudgetMs: rules.decisionLatencyBudgetMs,
    decisionLatencyBudgetMet: latencyBudgetMet
  };

  if (!latencyBudgetMet) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_DECISION_LATENCY_BUDGET_EXCEEDED',
      reason: `Latence p95 priorisation hors budget: ${p95DecisionMs}ms > ${rules.decisionLatencyBudgetMs}ms.`,
      diagnostics,
      scorecard: readinessResult.scorecard,
      readiness: readinessResult.readiness,
      gateActions,
      riskRegistry,
      correctiveActions: ['OPTIMIZE_AQCD_PRIORITY_COMPUTATION']
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: 'Top 3 actions prioritaires par gate généré avec registre risques (S052).',
    diagnostics,
    scorecard: readinessResult.scorecard,
    readiness: readinessResult.readiness,
    gateActions,
    riskRegistry,
    correctiveActions: []
  });
}
