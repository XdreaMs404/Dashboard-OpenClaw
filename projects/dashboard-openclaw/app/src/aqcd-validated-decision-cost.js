import { buildAqcdRiskHeatmap } from './aqcd-risk-heatmap.js';

const DEFAULT_DECISION_LATENCY_BUDGET_MS = 2500;
const DEFAULT_WASTE_RATIO_ALERT_THRESHOLD_PCT = 25;

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_AQCD_VALIDATED_DECISION_COST_INPUT: ['FIX_AQCD_VALIDATED_DECISION_COST_INPUT_STRUCTURE'],
  AQCD_PHASE_WASTE_RATIO_REQUIRED: ['ADD_PHASE_WASTE_RATIO_SERIES'],
  AQCD_PHASE_WASTE_RATIO_INVALID: ['FIX_PHASE_WASTE_RATIO_PAYLOAD'],
  AQCD_WASTE_RATIO_ALERT_REQUIRED: ['CONFIGURE_WASTE_RATIO_ALERTING'],
  AQCD_DECISION_LATENCY_BUDGET_EXCEEDED: ['OPTIMIZE_AQCD_DECISION_COST_COMPUTATION'],
  AQCD_VALIDATED_DECISION_COST_REQUIRED: ['ADD_VALIDATED_DECISION_COST_LOGS'],
  AQCD_CRITICAL_RUNBOOK_REQUIRED: ['PROVIDE_CRITICAL_RUNBOOK_PROOF']
});

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

  const output = {};

  for (const [key, nested] of Object.entries(value)) {
    output[key] = cloneValue(nested);
  }

  return output;
}

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizeNumber(value, fallback = 0) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return parsed;
}

function roundScore(value) {
  return Number(normalizeNumber(value).toFixed(2));
}

function normalizePercent(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return null;
  }

  if (parsed < 0) {
    return null;
  }

  if (parsed <= 1) {
    return roundScore(parsed * 100);
  }

  if (parsed > 100) {
    return null;
  }

  return roundScore(parsed);
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

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(normalized);
  }

  return output.length > 0 ? output : cloneValue(defaults);
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

function resolveRules(payload, runtimeOptions) {
  const source =
    (isObject(runtimeOptions.validatedDecisionCostRules) && runtimeOptions.validatedDecisionCostRules) ||
    (isObject(payload.validatedDecisionCostRules) && payload.validatedDecisionCostRules) ||
    {};

  return {
    decisionLatencyBudgetMs: normalizeNumber(
      source.decisionLatencyBudgetMs ??
        payload.decisionLatencyBudgetMs ??
        runtimeOptions.decisionLatencyBudgetMs ??
        DEFAULT_DECISION_LATENCY_BUDGET_MS,
      DEFAULT_DECISION_LATENCY_BUDGET_MS
    ),
    wasteRatioAlertThresholdPct: normalizeNumber(
      source.wasteRatioAlertThresholdPct ??
        payload.wasteRatioAlertThresholdPct ??
        runtimeOptions.wasteRatioAlertThresholdPct ??
        DEFAULT_WASTE_RATIO_ALERT_THRESHOLD_PCT,
      DEFAULT_WASTE_RATIO_ALERT_THRESHOLD_PCT
    ),
    requireDriftAlerting:
      (source.requireDriftAlerting ?? payload.requireDriftAlerting ?? true) === true,
    requireAlertNotificationRef:
      (source.requireAlertNotificationRef ?? payload.requireAlertNotificationRef ?? true) === true
  };
}

function extractPhaseWasteSeries(payload) {
  const source =
    payload.phaseWasteSeries ?? payload.wasteRatioByPhase ?? payload.phaseWasteRatios ?? payload.wasteByPhase;

  if (!Array.isArray(source) || source.length === 0) {
    return {
      valid: false,
      reasonCode: 'AQCD_PHASE_WASTE_RATIO_REQUIRED',
      reason: 'S056 requiert la mesure du waste ratio par phase (FR-053).'
    };
  }

  const entries = [];

  for (let index = 0; index < source.length; index += 1) {
    const entry = source[index];

    if (!isObject(entry)) {
      return {
        valid: false,
        reasonCode: 'AQCD_PHASE_WASTE_RATIO_INVALID',
        reason: `phaseWasteSeries[${index}] invalide: objet requis.`
      };
    }

    const phase = normalizeText(String(entry.phase ?? entry.phaseId ?? entry.id ?? '')).toLowerCase();
    const wasteRatioPct = normalizePercent(
      entry.wasteRatioPct ?? entry.wasteRatio ?? entry.ratio ?? entry.wastePct
    );

    if (!phase) {
      return {
        valid: false,
        reasonCode: 'AQCD_PHASE_WASTE_RATIO_INVALID',
        reason: `phaseWasteSeries[${index}] invalide: phase requise.`
      };
    }

    if (wasteRatioPct === null) {
      return {
        valid: false,
        reasonCode: 'AQCD_PHASE_WASTE_RATIO_INVALID',
        reason: `phaseWasteSeries[${index}] invalide: wasteRatioPct requis (0..1 ou 0..100).`
      };
    }

    const tokenWaste = Math.max(0, roundScore(normalizeNumber(entry.tokenWaste ?? entry.wasteTokens, 0)));
    const tokenTotal = Math.max(0, roundScore(normalizeNumber(entry.tokenTotal ?? entry.totalTokens, 0)));

    entries.push({
      phase,
      wasteRatioPct,
      tokenWaste,
      tokenTotal,
      alertThresholdPct: normalizePercent(entry.alertThresholdPct) ?? null
    });
  }

  entries.sort((left, right) => right.wasteRatioPct - left.wasteRatioPct || left.phase.localeCompare(right.phase));

  const meanWasteRatioPct =
    entries.length > 0
      ? roundScore(entries.reduce((sum, entry) => sum + entry.wasteRatioPct, 0) / entries.length)
      : 0;

  return {
    valid: true,
    series: {
      entries,
      meanWasteRatioPct,
      maxWasteRatioPct: entries.length > 0 ? entries[0].wasteRatioPct : 0,
      minWasteRatioPct: entries.length > 0 ? entries[entries.length - 1].wasteRatioPct : 0
    }
  };
}

function buildWasteAlerts(series, rules) {
  const thresholdPct = roundScore(rules.wasteRatioAlertThresholdPct);

  const alerts = series.entries
    .filter((entry) => entry.wasteRatioPct > (entry.alertThresholdPct ?? thresholdPct))
    .map((entry) => ({
      phase: entry.phase,
      wasteRatioPct: entry.wasteRatioPct,
      thresholdPct: entry.alertThresholdPct ?? thresholdPct,
      severity: entry.wasteRatioPct >= 2 * (entry.alertThresholdPct ?? thresholdPct) ? 'CRITICAL' : 'WARNING',
      reason: `Waste ratio ${entry.phase} en dérive: ${entry.wasteRatioPct}% > ${
        entry.alertThresholdPct ?? thresholdPct
      }%.`
    }));

  return {
    thresholdPct,
    hasDrift: alerts.length > 0,
    driftCount: alerts.length,
    alerts
  };
}

function validateAlertingPolicy(payload, rules, wasteAlerts) {
  if (!rules.requireDriftAlerting || !wasteAlerts.hasDrift) {
    return {
      valid: true,
      policy: {
        enabled: true,
        channels: [],
        notificationRef: null
      }
    };
  }

  const source = isObject(payload.wasteAlerting) ? payload.wasteAlerting : {};

  const enabled = source.enabled === true;
  const channels = Array.isArray(source.channels)
    ? source.channels.map((entry) => normalizeText(String(entry))).filter(Boolean)
    : [];
  const notificationRef = normalizeText(String(source.notificationRef ?? source.evidenceRef ?? ''));

  if (!enabled || channels.length === 0) {
    return {
      valid: false,
      reasonCode: 'AQCD_WASTE_RATIO_ALERT_REQUIRED',
      reason: 'Dérive waste ratio détectée: configuration d’alerte requise (wasteAlerting.enabled + channels).'
    };
  }

  if (rules.requireAlertNotificationRef && !notificationRef) {
    return {
      valid: false,
      reasonCode: 'AQCD_WASTE_RATIO_ALERT_REQUIRED',
      reason: 'Dérive waste ratio détectée: notificationRef requis pour preuve d’alerte.'
    };
  }

  return {
    valid: true,
    policy: {
      enabled,
      channels,
      notificationRef: notificationRef || null
    }
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
  mitigationClosureLinks,
  heatmap,
  heatmapDashboard,
  validatedDecisionCost,
  criticalRunbook,
  phaseWasteRatios,
  wasteAlerts,
  wasteAlerting,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode: normalizeText(String(reasonCode || 'INVALID_AQCD_VALIDATED_DECISION_COST_INPUT')),
    reason,
    diagnostics: cloneValue(diagnostics ?? {}),
    scorecard: cloneValue(scorecard ?? null),
    readiness: cloneValue(readiness ?? null),
    gateActions: cloneValue(gateActions ?? []),
    riskRegister: cloneValue(riskRegister ?? null),
    mitigationLinks: cloneValue(mitigationLinks ?? null),
    mitigationClosureLinks: cloneValue(mitigationClosureLinks ?? null),
    heatmap: cloneValue(heatmap ?? null),
    heatmapDashboard: cloneValue(heatmapDashboard ?? null),
    validatedDecisionCost: cloneValue(validatedDecisionCost ?? null),
    criticalRunbook: cloneValue(criticalRunbook ?? null),
    phaseWasteRatios: cloneValue(phaseWasteRatios ?? null),
    wasteAlerts: cloneValue(wasteAlerts ?? null),
    wasteAlerting: cloneValue(wasteAlerting ?? null),
    correctiveActions: normalizeActions(correctiveActions, reasonCode)
  };
}

export function buildAqcdValidatedDecisionCost(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_AQCD_VALIDATED_DECISION_COST_INPUT',
      reason: 'Entrée S056 invalide: objet requis.'
    });
  }

  const startedAtMs = Date.now();
  const rules = resolveRules(payload, runtimeOptions);
  const heatmapResult = buildAqcdRiskHeatmap(payload, runtimeOptions);

  if (!heatmapResult.allowed) {
    return createResult({
      allowed: false,
      reasonCode: heatmapResult.reasonCode,
      reason: heatmapResult.reason,
      diagnostics: heatmapResult.diagnostics,
      scorecard: heatmapResult.scorecard,
      readiness: heatmapResult.readiness,
      gateActions: heatmapResult.gateActions,
      riskRegister: heatmapResult.riskRegister,
      mitigationLinks: heatmapResult.mitigationLinks,
      mitigationClosureLinks: heatmapResult.mitigationClosureLinks,
      heatmap: heatmapResult.heatmap,
      heatmapDashboard: heatmapResult.heatmapDashboard,
      validatedDecisionCost: heatmapResult.validatedDecisionCost,
      criticalRunbook: heatmapResult.criticalRunbook,
      phaseWasteRatios: null,
      wasteAlerts: null,
      wasteAlerting: null,
      correctiveActions: heatmapResult.correctiveActions
    });
  }

  const wasteSeriesResult = extractPhaseWasteSeries(payload);

  if (!wasteSeriesResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: wasteSeriesResult.reasonCode,
      reason: wasteSeriesResult.reason,
      diagnostics: heatmapResult.diagnostics,
      scorecard: heatmapResult.scorecard,
      readiness: heatmapResult.readiness,
      gateActions: heatmapResult.gateActions,
      riskRegister: heatmapResult.riskRegister,
      mitigationLinks: heatmapResult.mitigationLinks,
      mitigationClosureLinks: heatmapResult.mitigationClosureLinks,
      heatmap: heatmapResult.heatmap,
      heatmapDashboard: heatmapResult.heatmapDashboard,
      validatedDecisionCost: heatmapResult.validatedDecisionCost,
      criticalRunbook: heatmapResult.criticalRunbook,
      phaseWasteRatios: null,
      wasteAlerts: null,
      wasteAlerting: null,
      correctiveActions: DEFAULT_CORRECTIVE_ACTIONS[wasteSeriesResult.reasonCode]
    });
  }

  const wasteAlerts = buildWasteAlerts(wasteSeriesResult.series, rules);
  const alertPolicyResult = validateAlertingPolicy(payload, rules, wasteAlerts);

  if (!alertPolicyResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: alertPolicyResult.reasonCode,
      reason: alertPolicyResult.reason,
      diagnostics: {
        ...heatmapResult.diagnostics,
        phaseCount: wasteSeriesResult.series.entries.length,
        wasteRatioDriftCount: wasteAlerts.driftCount,
        wasteRatioAlertThresholdPct: wasteAlerts.thresholdPct
      },
      scorecard: heatmapResult.scorecard,
      readiness: heatmapResult.readiness,
      gateActions: heatmapResult.gateActions,
      riskRegister: heatmapResult.riskRegister,
      mitigationLinks: heatmapResult.mitigationLinks,
      mitigationClosureLinks: heatmapResult.mitigationClosureLinks,
      heatmap: heatmapResult.heatmap,
      heatmapDashboard: heatmapResult.heatmapDashboard,
      validatedDecisionCost: heatmapResult.validatedDecisionCost,
      criticalRunbook: heatmapResult.criticalRunbook,
      phaseWasteRatios: wasteSeriesResult.series,
      wasteAlerts,
      wasteAlerting: null,
      correctiveActions: DEFAULT_CORRECTIVE_ACTIONS[alertPolicyResult.reasonCode]
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
    ...heatmapResult.diagnostics,
    phaseCount: wasteSeriesResult.series.entries.length,
    averageCostPerValidatedDecision:
      heatmapResult.validatedDecisionCost?.averageCostPerValidatedDecision ?? null,
    meanWasteRatioPct: wasteSeriesResult.series.meanWasteRatioPct,
    maxWasteRatioPct: wasteSeriesResult.series.maxWasteRatioPct,
    wasteRatioAlertThresholdPct: wasteAlerts.thresholdPct,
    wasteRatioDriftCount: wasteAlerts.driftCount,
    wasteRatioDriftDetected: wasteAlerts.hasDrift,
    p95DecisionMs,
    decisionLatencyBudgetMs: rules.decisionLatencyBudgetMs,
    decisionLatencyBudgetMet: latencyBudgetMet
  };

  if (!latencyBudgetMet) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_DECISION_LATENCY_BUDGET_EXCEEDED',
      reason: `Latence p95 hors budget: ${p95DecisionMs}ms > ${rules.decisionLatencyBudgetMs}ms.`,
      diagnostics,
      scorecard: heatmapResult.scorecard,
      readiness: heatmapResult.readiness,
      gateActions: heatmapResult.gateActions,
      riskRegister: heatmapResult.riskRegister,
      mitigationLinks: heatmapResult.mitigationLinks,
      mitigationClosureLinks: heatmapResult.mitigationClosureLinks,
      heatmap: heatmapResult.heatmap,
      heatmapDashboard: heatmapResult.heatmapDashboard,
      validatedDecisionCost: heatmapResult.validatedDecisionCost,
      criticalRunbook: heatmapResult.criticalRunbook,
      phaseWasteRatios: wasteSeriesResult.series,
      wasteAlerts,
      wasteAlerting: alertPolicyResult.policy,
      correctiveActions: ['OPTIMIZE_AQCD_DECISION_COST_COMPUTATION']
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason:
      'Coût moyen par décision validée calculé, waste ratio par phase monitoré et alertes dérive actives.',
    diagnostics,
    scorecard: heatmapResult.scorecard,
    readiness: heatmapResult.readiness,
    gateActions: heatmapResult.gateActions,
    riskRegister: heatmapResult.riskRegister,
    mitigationLinks: heatmapResult.mitigationLinks,
    mitigationClosureLinks: heatmapResult.mitigationClosureLinks,
    heatmap: heatmapResult.heatmap,
    heatmapDashboard: heatmapResult.heatmapDashboard,
    validatedDecisionCost: heatmapResult.validatedDecisionCost,
    criticalRunbook: heatmapResult.criticalRunbook,
    phaseWasteRatios: wasteSeriesResult.series,
    wasteAlerts,
    wasteAlerting: alertPolicyResult.policy,
    correctiveActions: []
  });
}
