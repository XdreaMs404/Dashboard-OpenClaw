import { buildAqcdGatePriorityActions } from './aqcd-gate-priority-actions.js';

const DEFAULT_DECISION_LATENCY_BUDGET_MS = 2500;
const DEFAULT_BASELINE_THRESHOLD = 65;

const BASE_REASON_CODES = Object.freeze([
  'OK',
  'INVALID_AQCD_GATE_PRIORITY_INPUT',
  'AQCD_RISK_REGISTER_INVALID',
  'AQCD_GATE_ACTIONS_EMPTY',
  'AQCD_RUNBOOK_EVIDENCE_REQUIRED',
  'AQCD_DECISION_LATENCY_BUDGET_EXCEEDED',
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
  'INVALID_AQCD_RISK_REGISTER_INPUT',
  'AQCD_RISK_REGISTER_EMPTY',
  'AQCD_MITIGATION_LINKS_REQUIRED',
  'AQCD_RISK_REGISTER_LATENCY_BUDGET_EXCEEDED',
  'AQCD_BASELINE_THRESHOLD_UNMET'
]);

const REASON_CODE_SET = new Set(REASON_CODES);

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_AQCD_RISK_REGISTER_INPUT: ['FIX_AQCD_RISK_REGISTER_INPUT_STRUCTURE'],
  AQCD_RISK_REGISTER_INVALID: ['FIX_AQCD_RISK_REGISTER_INPUT'],
  AQCD_RISK_REGISTER_EMPTY: ['ADD_RISK_REGISTER_ENTRIES'],
  AQCD_MITIGATION_LINKS_REQUIRED: ['LINK_MITIGATION_TASK_PROOF'],
  AQCD_RISK_REGISTER_LATENCY_BUDGET_EXCEEDED: ['OPTIMIZE_AQCD_RISK_REGISTER_COMPUTATION'],
  AQCD_BASELINE_THRESHOLD_UNMET: ['IMPROVE_AQCD_BASELINE_SCORE'],
  AQCD_READINESS_THRESHOLD_UNMET: ['IMPROVE_AQCD_READINESS_FACTORS'],
  AQCD_COMPARATIVE_SNAPSHOTS_REQUIRED: ['ADD_AQCD_PERIODIC_SNAPSHOTS'],
  AQCD_SNAPSHOT_CONTINUITY_GAP: ['RESTORE_AQCD_SNAPSHOT_CADENCE']
});

const CLOSED_STATUSES = new Set(['MITIGATED', 'CLOSED']);

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

  for (const action of actions) {
    const normalized = normalizeText(String(action ?? ''));

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
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry))
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

function resolveSeverity(exposure) {
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
    (isObject(runtimeOptions.riskRegisterRules) && runtimeOptions.riskRegisterRules) ||
    (isObject(payload.riskRegisterRules) && payload.riskRegisterRules) ||
    {};

  return {
    modelVersion:
      normalizeText(String(source.modelVersion ?? payload.modelVersion ?? 'S053-v1')) ||
      'S053-v1',
    baselineThreshold: normalizeFiniteNumber(
      source.baselineThreshold ??
        payload.baselineThreshold ??
        runtimeOptions.baselineThreshold ??
        DEFAULT_BASELINE_THRESHOLD,
      DEFAULT_BASELINE_THRESHOLD
    ),
    decisionLatencyBudgetMs: normalizeFiniteNumber(
      source.decisionLatencyBudgetMs ??
        payload.decisionLatencyBudgetMs ??
        runtimeOptions.decisionLatencyBudgetMs ??
        DEFAULT_DECISION_LATENCY_BUDGET_MS,
      DEFAULT_DECISION_LATENCY_BUDGET_MS
    ),
    enforceMitigationLinks:
      (source.enforceMitigationLinks ?? payload.enforceMitigationLinks ?? true) === true
  };
}

function normalizeMitigation(entry, riskId, index) {
  if (!isObject(entry)) {
    return {
      valid: false,
      reason: `risk ${riskId} mitigation[${index}] invalide: objet requis.`
    };
  }

  const taskId = normalizeText(String(entry.taskId ?? entry.taskRef ?? entry.id ?? ''));
  const owner = normalizeText(String(entry.owner ?? ''));
  const status = normalizeText(String(entry.status ?? entry.state ?? '')).toUpperCase();
  const dueAtMs = parseTimestampMs(entry.dueAt ?? entry.dueDate ?? entry.deadline);
  const proofRef = normalizeText(String(entry.proofRef ?? entry.evidenceRef ?? entry.link ?? ''));

  if (!taskId) {
    return {
      valid: false,
      reason: `risk ${riskId} mitigation[${index}] invalide: taskId requis.`
    };
  }

  if (!owner) {
    return {
      valid: false,
      reason: `risk ${riskId} mitigation[${index}] invalide: owner requis.`
    };
  }

  if (!status) {
    return {
      valid: false,
      reason: `risk ${riskId} mitigation[${index}] invalide: status requis.`
    };
  }

  if (dueAtMs === null) {
    return {
      valid: false,
      reason: `risk ${riskId} mitigation[${index}] invalide: dueAt requis.`
    };
  }

  if (!proofRef) {
    return {
      valid: false,
      reason: `risk ${riskId} mitigation[${index}] invalide: proofRef requis.`
    };
  }

  return {
    valid: true,
    mitigation: {
      taskId,
      owner,
      status,
      dueAt: toIso(dueAtMs),
      dueAtMs,
      proofRef,
      description: normalizeText(String(entry.description ?? entry.label ?? taskId)) || taskId
    }
  };
}

function normalizeRiskEntry(entry, index) {
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

  if (!owner) {
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

  const mitigationsRaw = Array.isArray(entry.mitigations)
    ? entry.mitigations
    : Array.isArray(entry.links)
      ? entry.links
      : [];

  const mitigations = [];

  for (let mitigationIndex = 0; mitigationIndex < mitigationsRaw.length; mitigationIndex += 1) {
    const normalized = normalizeMitigation(mitigationsRaw[mitigationIndex], id, mitigationIndex);

    if (!normalized.valid) {
      return normalized;
    }

    mitigations.push(normalized.mitigation);
  }

  return {
    valid: true,
    risk: {
      id,
      gate,
      owner,
      status,
      dueAt: toIso(dueAtMs),
      dueAtMs,
      exposure,
      severity: resolveSeverity(exposure),
      description: normalizeText(String(entry.description ?? entry.title ?? id)) || id,
      mitigations
    }
  };
}

function resolveRiskRegister(payload) {
  const source = payload.riskRegister ?? payload.risks ?? payload.riskEntries ?? payload.riskRegistry;

  if (!Array.isArray(source)) {
    return {
      valid: false,
      reason: 'riskRegister invalide: tableau requis.'
    };
  }

  const entries = [];

  for (let index = 0; index < source.length; index += 1) {
    const normalized = normalizeRiskEntry(source[index], index);

    if (!normalized.valid) {
      return normalized;
    }

    entries.push(normalized.risk);
  }

  entries.sort((left, right) => right.exposure - left.exposure || left.dueAt.localeCompare(right.dueAt));

  return {
    valid: true,
    entries
  };
}

function buildRiskSummary(entries) {
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
    .filter((entry) => !CLOSED_STATUSES.has(normalizeText(String(entry.status ?? '')).toUpperCase()))
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
      (entry) => entry.dueAtMs < nowMs && !CLOSED_STATUSES.has(String(entry.status).toUpperCase())
    ).length
  };
}

function buildMitigationLinks(entries) {
  let totalOpenRisks = 0;
  let linkedOpenRisks = 0;
  let missingLinkOpenRisks = 0;
  let totalMitigationCount = 0;

  const missingRiskIds = [];

  for (const entry of entries) {
    const status = normalizeText(String(entry.status ?? '')).toUpperCase();
    const isOpen = !CLOSED_STATUSES.has(status);

    if (!isOpen) {
      totalMitigationCount += entry.mitigations.length;
      continue;
    }

    totalOpenRisks += 1;
    totalMitigationCount += entry.mitigations.length;

    if (entry.mitigations.length > 0) {
      linkedOpenRisks += 1;
    } else {
      missingLinkOpenRisks += 1;
      missingRiskIds.push(entry.id);
    }
  }

  const coveragePct =
    totalOpenRisks > 0 ? roundScore((linkedOpenRisks / totalOpenRisks) * 100) : 100;

  return {
    totalOpenRisks,
    linkedOpenRisks,
    missingLinkOpenRisks,
    totalMitigationCount,
    coveragePct,
    missingRiskIds
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
  riskRegister,
  mitigationLinks,
  correctiveActions
}) {
  const normalizedReasonCode = normalizeReasonCode(reasonCode) ?? 'INVALID_AQCD_RISK_REGISTER_INPUT';

  return {
    allowed,
    reasonCode: normalizedReasonCode,
    reason,
    diagnostics: cloneValue(diagnostics ?? {}),
    scorecard: cloneValue(scorecard ?? null),
    readiness: cloneValue(readiness ?? null),
    gateActions: cloneValue(gateActions ?? []),
    riskRegister: cloneValue(riskRegister ?? null),
    mitigationLinks: cloneValue(mitigationLinks ?? null),
    correctiveActions: normalizeActions(correctiveActions, normalizedReasonCode)
  };
}

export function buildAqcdRiskRegister(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_AQCD_RISK_REGISTER_INPUT',
      reason: 'Entrée S053 invalide: objet requis.'
    });
  }

  const startedAtMs = Date.now();
  const rules = resolveRules(payload, runtimeOptions);

  const gatePriorityResult = buildAqcdGatePriorityActions(payload, runtimeOptions);

  if (!gatePriorityResult.allowed) {
    return createResult({
      allowed: false,
      reasonCode: gatePriorityResult.reasonCode,
      reason: gatePriorityResult.reason,
      diagnostics: {
        ...gatePriorityResult.diagnostics,
        modelVersion: rules.modelVersion,
        baselineThreshold: rules.baselineThreshold
      },
      scorecard: gatePriorityResult.scorecard,
      readiness: gatePriorityResult.readiness,
      gateActions: gatePriorityResult.gateActions,
      riskRegister: gatePriorityResult.riskRegistry,
      mitigationLinks: null,
      correctiveActions: gatePriorityResult.correctiveActions
    });
  }

  const normalizedRegister = resolveRiskRegister(payload);

  if (!normalizedRegister.valid) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_RISK_REGISTER_INVALID',
      reason: normalizedRegister.reason
    });
  }

  if (normalizedRegister.entries.length === 0) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_RISK_REGISTER_EMPTY',
      reason: 'Registre risques vide: au moins une entrée est requise pour S053.'
    });
  }

  const riskRegister = buildRiskSummary(normalizedRegister.entries);
  const mitigationLinks = buildMitigationLinks(normalizedRegister.entries);

  if (rules.enforceMitigationLinks && mitigationLinks.missingLinkOpenRisks > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_MITIGATION_LINKS_REQUIRED',
      reason: `Liens mitigation manquants pour risques ouverts: ${mitigationLinks.missingRiskIds.join(', ')}.`,
      diagnostics: {
        window: normalizeText(String(payload.window ?? 'story')) || 'story',
        windowRef: normalizeText(String(payload.windowRef ?? payload.storyId ?? 'S053')) || 'S053',
        modelVersion: rules.modelVersion,
        baselineThreshold: rules.baselineThreshold,
        riskCount: riskRegister.entries.length,
        openRiskCount: riskRegister.counts.open
      },
      scorecard: gatePriorityResult.scorecard,
      readiness: gatePriorityResult.readiness,
      gateActions: gatePriorityResult.gateActions,
      riskRegister,
      mitigationLinks,
      correctiveActions: ['LINK_MITIGATION_TASK_PROOF']
    });
  }

  const baselineScore = normalizeFiniteNumber(gatePriorityResult.readiness?.score, 0);
  const baselineMet = baselineScore >= rules.baselineThreshold;

  if (!baselineMet) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_BASELINE_THRESHOLD_UNMET',
      reason: `Baseline AQCD insuffisant: ${baselineScore} < ${rules.baselineThreshold}.`,
      diagnostics: {
        window: normalizeText(String(payload.window ?? 'story')) || 'story',
        windowRef: normalizeText(String(payload.windowRef ?? payload.storyId ?? 'S053')) || 'S053',
        modelVersion: rules.modelVersion,
        baselineScore,
        baselineThreshold: rules.baselineThreshold,
        riskCount: riskRegister.entries.length
      },
      scorecard: gatePriorityResult.scorecard,
      readiness: gatePriorityResult.readiness,
      gateActions: gatePriorityResult.gateActions,
      riskRegister,
      mitigationLinks,
      correctiveActions: ['IMPROVE_AQCD_BASELINE_SCORE']
    });
  }

  const latencySamples = Array.isArray(payload.decisionLatencySamplesMs)
    ? payload.decisionLatencySamplesMs
    : Array.isArray(payload.latencySamplesMs)
      ? payload.latencySamplesMs
      : [Date.now() - startedAtMs];

  const p95DecisionMs = roundScore(computePercentile(latencySamples, 95));
  const latencyBudgetMet = p95DecisionMs <= rules.decisionLatencyBudgetMs;

  const diagnostics = {
    window: normalizeText(String(payload.window ?? 'story')) || 'story',
    windowRef: normalizeText(String(payload.windowRef ?? payload.storyId ?? 'S053')) || 'S053',
    modelVersion: rules.modelVersion,
    baselineScore,
    baselineThreshold: rules.baselineThreshold,
    baselineMet,
    riskCount: riskRegister.entries.length,
    openRiskCount: riskRegister.counts.open,
    mitigationCoveragePct: mitigationLinks.coveragePct,
    gateCount: Array.isArray(gatePriorityResult.gateActions) ? gatePriorityResult.gateActions.length : 0,
    actionCount: gatePriorityResult.diagnostics?.actionCount ?? null,
    p95DecisionMs,
    decisionLatencyBudgetMs: rules.decisionLatencyBudgetMs,
    decisionLatencyBudgetMet: latencyBudgetMet
  };

  if (!latencyBudgetMet) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_RISK_REGISTER_LATENCY_BUDGET_EXCEEDED',
      reason: `Latence p95 registre risques hors budget: ${p95DecisionMs}ms > ${rules.decisionLatencyBudgetMs}ms.`,
      diagnostics,
      scorecard: gatePriorityResult.scorecard,
      readiness: gatePriorityResult.readiness,
      gateActions: gatePriorityResult.gateActions,
      riskRegister,
      mitigationLinks,
      correctiveActions: ['OPTIMIZE_AQCD_RISK_REGISTER_COMPUTATION']
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: 'Registre risques vivant validé (owner/échéance/statut + liens mitigation).',
    diagnostics,
    scorecard: gatePriorityResult.scorecard,
    readiness: gatePriorityResult.readiness,
    gateActions: gatePriorityResult.gateActions,
    riskRegister,
    mitigationLinks,
    correctiveActions: []
  });
}
