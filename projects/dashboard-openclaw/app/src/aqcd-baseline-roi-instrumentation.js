import { buildAqcdSponsorExecutiveView } from './aqcd-sponsor-executive-view.js';

const DEFAULT_DECISION_LATENCY_BUDGET_MS = 2500;
const DEFAULT_MINIMUM_SNAPSHOT_COUNT = 3;
const DEFAULT_TCD_BASELINE_DAYS = 21;

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_AQCD_BASELINE_ROI_INPUT: ['FIX_AQCD_BASELINE_ROI_INPUT_STRUCTURE'],
  AQCD_BASELINE_ROI_SPONSOR_VISIBILITY_REQUIRED: ['RESTORE_SPONSOR_EXECUTIVE_VIEW_VISIBILITY'],
  AQCD_BASELINE_ROI_SNAPSHOTS_REQUIRED: ['ADD_BASELINE_ROI_PERIODIC_SNAPSHOTS'],
  AQCD_BASELINE_ROI_READINESS_FACTORS_REQUIRED: ['EXPOSE_BASELINE_ROI_READINESS_FACTORS'],
  AQCD_BASELINE_ROI_RUNBOOK_REQUIRED: ['PROVIDE_BASELINE_ROI_RUNBOOK_PROOF'],
  AQCD_BASELINE_ROI_LATENCY_BUDGET_EXCEEDED: ['OPTIMIZE_BASELINE_ROI_PROJECTION_LATENCY']
});

const CLOSED_RISK_STATUSES = new Set(['MITIGATED', 'CLOSED']);

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

function resolveRules(payload, runtimeOptions) {
  const source =
    (isObject(runtimeOptions.baselineRoiRules) && runtimeOptions.baselineRoiRules) ||
    (isObject(payload.baselineRoiRules) && payload.baselineRoiRules) ||
    {};

  return {
    modelVersion:
      normalizeText(String(source.modelVersion ?? payload.baselineRoiModelVersion ?? 'S060-v1')) ||
      'S060-v1',
    minimumSnapshotCount: Math.max(
      2,
      Math.trunc(
        normalizeNumber(
          source.minimumSnapshotCount ??
            payload.minimumSnapshotCount ??
            runtimeOptions.minimumSnapshotCount ??
            DEFAULT_MINIMUM_SNAPSHOT_COUNT,
          DEFAULT_MINIMUM_SNAPSHOT_COUNT
        )
      )
    ),
    decisionLatencyBudgetMs: Math.max(
      1,
      normalizeNumber(
        source.decisionLatencyBudgetMs ??
          payload.decisionLatencyBudgetMs ??
          runtimeOptions.decisionLatencyBudgetMs ??
          DEFAULT_DECISION_LATENCY_BUDGET_MS,
        DEFAULT_DECISION_LATENCY_BUDGET_MS
      )
    ),
    tcdBaselineDays: Math.max(
      1,
      normalizeNumber(
        source.tcdBaselineDays ?? payload.tcdBaselineDays ?? runtimeOptions.tcdBaselineDays ?? DEFAULT_TCD_BASELINE_DAYS,
        DEFAULT_TCD_BASELINE_DAYS
      )
    ),
    roiReadinessWeight: Math.max(
      0,
      normalizeNumber(source.roiReadinessWeight ?? payload.roiReadinessWeight ?? 0.35, 0.35)
    ),
    roiQualityWeight: Math.max(
      0,
      normalizeNumber(source.roiQualityWeight ?? payload.roiQualityWeight ?? 0.65, 0.65)
    )
  };
}

function resolveRiskSummary(riskRegister) {
  const entries = Array.isArray(riskRegister?.entries)
    ? riskRegister.entries
    : Array.isArray(riskRegister)
      ? riskRegister
      : [];

  let openCount = 0;

  for (const entry of entries) {
    const status = normalizeText(String(entry?.status ?? '')).toUpperCase();
    if (!CLOSED_RISK_STATUSES.has(status)) {
      openCount += 1;
    }
  }

  return {
    count: entries.length,
    openCount
  };
}

function resolveSnapshotSummary(sponsorExecutiveView, rules) {
  const series = Array.isArray(sponsorExecutiveView?.trend?.series) ? sponsorExecutiveView.trend.series : [];

  if (series.length < rules.minimumSnapshotCount) {
    return {
      valid: false,
      reasonCode: 'AQCD_BASELINE_ROI_SNAPSHOTS_REQUIRED',
      reason: `Historique baseline/ROI insuffisant: ${rules.minimumSnapshotCount} snapshots minimum requis.`
    };
  }

  const baseline = series[0];
  const latest = series[series.length - 1];

  const baselineScore = Number(baseline?.globalScore);
  const latestScore = Number(latest?.globalScore);

  if (!Number.isFinite(baselineScore) || !Number.isFinite(latestScore)) {
    return {
      valid: false,
      reasonCode: 'AQCD_BASELINE_ROI_SNAPSHOTS_REQUIRED',
      reason: 'Snapshots baseline/ROI invalides: globalScore requis.'
    };
  }

  return {
    valid: true,
    summary: {
      snapshotCount: series.length,
      baselineSnapshotRef: normalizeText(String(baseline.windowRef ?? baseline.id ?? '')) || 'BASELINE',
      latestSnapshotRef: normalizeText(String(latest.windowRef ?? latest.id ?? '')) || 'LATEST',
      baselineGlobalScore: roundScore(baselineScore),
      latestGlobalScore: roundScore(latestScore),
      globalDelta: roundScore(latestScore - baselineScore)
    }
  };
}

function resolveReadinessFactors(readiness) {
  const factors = Array.isArray(readiness?.factors) ? readiness.factors : [];

  const normalizedFactors = factors
    .map((entry) => ({
      rule: normalizeText(String(entry?.rule ?? '')),
      score: roundScore(normalizeNumber(entry?.score, 0)),
      contribution: roundScore(normalizeNumber(entry?.contribution, 0)),
      source: normalizeText(String(entry?.source ?? entry?.detail ?? ''))
    }))
    .filter((entry) => entry.rule);

  if (normalizedFactors.length === 0) {
    return {
      valid: false,
      reasonCode: 'AQCD_BASELINE_ROI_READINESS_FACTORS_REQUIRED',
      reason: 'FR-047 non satisfait: facteurs readiness visibles requis.'
    };
  }

  return {
    valid: true,
    factors: normalizedFactors
  };
}

function resolveRunbookState(criticalRunbook) {
  const ref = normalizeText(String(criticalRunbook?.ref ?? criticalRunbook?.runbookRef ?? ''));
  const validated = criticalRunbook?.validated === true;
  const testedAt = normalizeText(String(criticalRunbook?.testedAt ?? criticalRunbook?.testedAtMs ?? ''));

  return {
    valid: Boolean(ref) && validated && Boolean(testedAt),
    runbook: {
      ref: ref || null,
      validated,
      testedAt: testedAt || null
    }
  };
}

function buildRoiProjection({
  payload,
  rules,
  snapshotSummary,
  readinessScore,
  validatedDecisionCost,
  retroClosureTracking,
  riskSummary
}) {
  const baselineCostPerDecision = Math.max(
    0.01,
    normalizeNumber(payload.baselineCostPerDecision, normalizeNumber(validatedDecisionCost?.averageCostPerValidatedDecision, 0))
  );

  const currentCostPerDecision = Math.max(
    0.01,
    normalizeNumber(validatedDecisionCost?.averageCostPerValidatedDecision, baselineCostPerDecision)
  );

  const costGainPerDecision = roundScore(baselineCostPerDecision - currentCostPerDecision);
  const costGainPct = roundScore((costGainPerDecision / baselineCostPerDecision) * 100);

  const normalizedReadiness = Math.max(0, Math.min(100, normalizeNumber(readinessScore, 0)));
  const qualitySignalScore = Math.max(0, snapshotSummary.globalDelta * 8);

  const weightedRoi =
    costGainPct * rules.roiQualityWeight +
    normalizedReadiness * rules.roiReadinessWeight +
    qualitySignalScore;

  const retroPending = Math.max(0, normalizeNumber(retroClosureTracking?.pendingActions, 0));
  const riskPenalty = roundScore(Math.min(55, riskSummary.openCount * 4 + retroPending * 9));
  const projectedRoiPct = roundScore(weightedRoi);
  const riskAdjustedRoiPct = roundScore(projectedRoiPct - riskPenalty);

  return {
    baselineCostPerDecision: roundScore(baselineCostPerDecision),
    currentCostPerDecision: roundScore(currentCostPerDecision),
    costGainPerDecision,
    costGainPct,
    projectedRoiPct,
    riskAdjustedRoiPct,
    riskPenaltyPct: riskPenalty,
    openRiskCount: riskSummary.openCount,
    retroPendingActions: retroPending
  };
}

function buildTcdBaseline(payload, rules, snapshotSummary) {
  const baselineDays = Math.max(1, normalizeNumber(payload.tcdBaselineDays, rules.tcdBaselineDays));

  const suggestedCurrent = baselineDays - Math.max(1, snapshotSummary.globalDelta / 2);
  const currentDays = Math.max(
    0.1,
    normalizeNumber(payload.tcdCurrentDays, suggestedCurrent)
  );

  const deltaDays = roundScore(baselineDays - currentDays);
  const improvementPct = roundScore((deltaDays / baselineDays) * 100);

  return {
    baselineDays: roundScore(baselineDays),
    currentDays: roundScore(currentDays),
    deltaDays,
    improvementPct
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  scorecard,
  formula,
  snapshots,
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
  retroClosureTracking,
  sponsorExecutiveView,
  baselineRoiInstrumentation,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode: normalizeText(String(reasonCode || 'INVALID_AQCD_BASELINE_ROI_INPUT')),
    reason,
    diagnostics: cloneValue(diagnostics ?? {}),
    scorecard: cloneValue(scorecard ?? null),
    formula: cloneValue(formula ?? null),
    snapshots: cloneValue(snapshots ?? null),
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
    retroClosureTracking: cloneValue(retroClosureTracking ?? null),
    sponsorExecutiveView: cloneValue(sponsorExecutiveView ?? null),
    baselineRoiInstrumentation: cloneValue(baselineRoiInstrumentation ?? null),
    correctiveActions: normalizeActions(correctiveActions, reasonCode)
  };
}

export function buildAqcdBaselineRoiInstrumentation(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_AQCD_BASELINE_ROI_INPUT',
      reason: 'Entrée S060 invalide: objet requis.'
    });
  }

  const rules = resolveRules(payload, runtimeOptions);

  const sponsorResult = buildAqcdSponsorExecutiveView(payload, runtimeOptions);

  if (!sponsorResult.allowed) {
    return createResult({
      allowed: false,
      reasonCode: sponsorResult.reasonCode,
      reason: sponsorResult.reason,
      diagnostics: {
        ...sponsorResult.diagnostics,
        baselineRoiModelVersion: rules.modelVersion
      },
      scorecard: sponsorResult.scorecard,
      formula: sponsorResult.formula,
      snapshots: sponsorResult.snapshots,
      readiness: sponsorResult.readiness,
      gateActions: sponsorResult.gateActions,
      riskRegister: sponsorResult.riskRegister,
      mitigationLinks: sponsorResult.mitigationLinks,
      mitigationClosureLinks: sponsorResult.mitigationClosureLinks,
      heatmap: sponsorResult.heatmap,
      heatmapDashboard: sponsorResult.heatmapDashboard,
      validatedDecisionCost: sponsorResult.validatedDecisionCost,
      criticalRunbook: sponsorResult.criticalRunbook,
      phaseWasteRatios: sponsorResult.phaseWasteRatios,
      wasteAlerts: sponsorResult.wasteAlerts,
      wasteAlerting: sponsorResult.wasteAlerting,
      retroClosureTracking: sponsorResult.retroClosureTracking,
      sponsorExecutiveView: sponsorResult.sponsorExecutiveView,
      baselineRoiInstrumentation: null,
      correctiveActions: sponsorResult.correctiveActions
    });
  }

  if (!isObject(sponsorResult.sponsorExecutiveView) || !Array.isArray(sponsorResult.sponsorExecutiveView.scoreCards)) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_BASELINE_ROI_SPONSOR_VISIBILITY_REQUIRED',
      reason: 'Risque M08 non couvert: vue sponsor AQCD visible requise.',
      diagnostics: {
        ...sponsorResult.diagnostics,
        baselineRoiModelVersion: rules.modelVersion,
        sponsorVisible: false
      },
      scorecard: sponsorResult.scorecard,
      formula: sponsorResult.formula,
      snapshots: sponsorResult.snapshots,
      readiness: sponsorResult.readiness,
      gateActions: sponsorResult.gateActions,
      riskRegister: sponsorResult.riskRegister,
      mitigationLinks: sponsorResult.mitigationLinks,
      mitigationClosureLinks: sponsorResult.mitigationClosureLinks,
      heatmap: sponsorResult.heatmap,
      heatmapDashboard: sponsorResult.heatmapDashboard,
      validatedDecisionCost: sponsorResult.validatedDecisionCost,
      criticalRunbook: sponsorResult.criticalRunbook,
      phaseWasteRatios: sponsorResult.phaseWasteRatios,
      wasteAlerts: sponsorResult.wasteAlerts,
      wasteAlerting: sponsorResult.wasteAlerting,
      retroClosureTracking: sponsorResult.retroClosureTracking,
      sponsorExecutiveView: sponsorResult.sponsorExecutiveView,
      baselineRoiInstrumentation: null,
      correctiveActions: ['RESTORE_SPONSOR_EXECUTIVE_VIEW_VISIBILITY']
    });
  }

  const snapshotSummaryResult = resolveSnapshotSummary(sponsorResult.sponsorExecutiveView, rules);

  if (!snapshotSummaryResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: snapshotSummaryResult.reasonCode,
      reason: snapshotSummaryResult.reason,
      diagnostics: {
        ...sponsorResult.diagnostics,
        baselineRoiModelVersion: rules.modelVersion,
        baselineRoiMinimumSnapshots: rules.minimumSnapshotCount,
        baselineRoiSnapshotCount: Array.isArray(sponsorResult.sponsorExecutiveView?.trend?.series)
          ? sponsorResult.sponsorExecutiveView.trend.series.length
          : 0
      },
      scorecard: sponsorResult.scorecard,
      formula: sponsorResult.formula,
      snapshots: sponsorResult.snapshots,
      readiness: sponsorResult.readiness,
      gateActions: sponsorResult.gateActions,
      riskRegister: sponsorResult.riskRegister,
      mitigationLinks: sponsorResult.mitigationLinks,
      mitigationClosureLinks: sponsorResult.mitigationClosureLinks,
      heatmap: sponsorResult.heatmap,
      heatmapDashboard: sponsorResult.heatmapDashboard,
      validatedDecisionCost: sponsorResult.validatedDecisionCost,
      criticalRunbook: sponsorResult.criticalRunbook,
      phaseWasteRatios: sponsorResult.phaseWasteRatios,
      wasteAlerts: sponsorResult.wasteAlerts,
      wasteAlerting: sponsorResult.wasteAlerting,
      retroClosureTracking: sponsorResult.retroClosureTracking,
      sponsorExecutiveView: sponsorResult.sponsorExecutiveView,
      baselineRoiInstrumentation: null,
      correctiveActions: ['ADD_BASELINE_ROI_PERIODIC_SNAPSHOTS']
    });
  }

  const readinessFactorResult = resolveReadinessFactors(sponsorResult.readiness);

  if (!readinessFactorResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: readinessFactorResult.reasonCode,
      reason: readinessFactorResult.reason,
      diagnostics: {
        ...sponsorResult.diagnostics,
        baselineRoiModelVersion: rules.modelVersion,
        baselineRoiReadinessVisible: false
      },
      scorecard: sponsorResult.scorecard,
      formula: sponsorResult.formula,
      snapshots: sponsorResult.snapshots,
      readiness: sponsorResult.readiness,
      gateActions: sponsorResult.gateActions,
      riskRegister: sponsorResult.riskRegister,
      mitigationLinks: sponsorResult.mitigationLinks,
      mitigationClosureLinks: sponsorResult.mitigationClosureLinks,
      heatmap: sponsorResult.heatmap,
      heatmapDashboard: sponsorResult.heatmapDashboard,
      validatedDecisionCost: sponsorResult.validatedDecisionCost,
      criticalRunbook: sponsorResult.criticalRunbook,
      phaseWasteRatios: sponsorResult.phaseWasteRatios,
      wasteAlerts: sponsorResult.wasteAlerts,
      wasteAlerting: sponsorResult.wasteAlerting,
      retroClosureTracking: sponsorResult.retroClosureTracking,
      sponsorExecutiveView: sponsorResult.sponsorExecutiveView,
      baselineRoiInstrumentation: null,
      correctiveActions: ['EXPOSE_BASELINE_ROI_READINESS_FACTORS']
    });
  }

  const runbookState = resolveRunbookState(sponsorResult.criticalRunbook);

  if (!runbookState.valid) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_BASELINE_ROI_RUNBOOK_REQUIRED',
      reason: 'NFR-035 non satisfait: runbook critique baseline/ROI requis et testé.',
      diagnostics: {
        ...sponsorResult.diagnostics,
        baselineRoiModelVersion: rules.modelVersion,
        baselineRoiRunbookRef: runbookState.runbook.ref,
        baselineRoiRunbookValidated: runbookState.runbook.validated,
        baselineRoiRunbookTestedAt: runbookState.runbook.testedAt
      },
      scorecard: sponsorResult.scorecard,
      formula: sponsorResult.formula,
      snapshots: sponsorResult.snapshots,
      readiness: sponsorResult.readiness,
      gateActions: sponsorResult.gateActions,
      riskRegister: sponsorResult.riskRegister,
      mitigationLinks: sponsorResult.mitigationLinks,
      mitigationClosureLinks: sponsorResult.mitigationClosureLinks,
      heatmap: sponsorResult.heatmap,
      heatmapDashboard: sponsorResult.heatmapDashboard,
      validatedDecisionCost: sponsorResult.validatedDecisionCost,
      criticalRunbook: sponsorResult.criticalRunbook,
      phaseWasteRatios: sponsorResult.phaseWasteRatios,
      wasteAlerts: sponsorResult.wasteAlerts,
      wasteAlerting: sponsorResult.wasteAlerting,
      retroClosureTracking: sponsorResult.retroClosureTracking,
      sponsorExecutiveView: sponsorResult.sponsorExecutiveView,
      baselineRoiInstrumentation: null,
      correctiveActions: ['PROVIDE_BASELINE_ROI_RUNBOOK_PROOF']
    });
  }

  const riskSummary = resolveRiskSummary(sponsorResult.riskRegister);

  const roiProjection = buildRoiProjection({
    payload,
    rules,
    snapshotSummary: snapshotSummaryResult.summary,
    readinessScore: sponsorResult.readiness?.score,
    validatedDecisionCost: sponsorResult.validatedDecisionCost,
    retroClosureTracking: sponsorResult.retroClosureTracking,
    riskSummary
  });

  const tcdBaseline = buildTcdBaseline(payload, rules, snapshotSummaryResult.summary);

  const latencySamples = Array.isArray(runtimeOptions.baselineRoiLatencySamplesMs)
    ? runtimeOptions.baselineRoiLatencySamplesMs
    : Array.isArray(payload.baselineRoiLatencySamplesMs)
      ? payload.baselineRoiLatencySamplesMs
      : Array.isArray(payload.decisionLatencySamplesMs)
        ? payload.decisionLatencySamplesMs
        : [];

  const p95DecisionMs = roundScore(computePercentile(latencySamples, 95));
  const latencyBudgetMet = p95DecisionMs <= rules.decisionLatencyBudgetMs;

  if (!latencyBudgetMet) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_BASELINE_ROI_LATENCY_BUDGET_EXCEEDED',
      reason: `NFR-009 non satisfait: p95 ${p95DecisionMs}ms > ${rules.decisionLatencyBudgetMs}ms.`,
      diagnostics: {
        ...sponsorResult.diagnostics,
        baselineRoiModelVersion: rules.modelVersion,
        p95DecisionMs,
        decisionLatencyBudgetMs: rules.decisionLatencyBudgetMs,
        decisionLatencyBudgetMet: false
      },
      scorecard: sponsorResult.scorecard,
      formula: sponsorResult.formula,
      snapshots: sponsorResult.snapshots,
      readiness: sponsorResult.readiness,
      gateActions: sponsorResult.gateActions,
      riskRegister: sponsorResult.riskRegister,
      mitigationLinks: sponsorResult.mitigationLinks,
      mitigationClosureLinks: sponsorResult.mitigationClosureLinks,
      heatmap: sponsorResult.heatmap,
      heatmapDashboard: sponsorResult.heatmapDashboard,
      validatedDecisionCost: sponsorResult.validatedDecisionCost,
      criticalRunbook: sponsorResult.criticalRunbook,
      phaseWasteRatios: sponsorResult.phaseWasteRatios,
      wasteAlerts: sponsorResult.wasteAlerts,
      wasteAlerting: sponsorResult.wasteAlerting,
      retroClosureTracking: sponsorResult.retroClosureTracking,
      sponsorExecutiveView: sponsorResult.sponsorExecutiveView,
      baselineRoiInstrumentation: null,
      correctiveActions: ['OPTIMIZE_BASELINE_ROI_PROJECTION_LATENCY']
    });
  }

  const nowMs = Number.isFinite(Number(runtimeOptions.nowMs))
    ? Number(runtimeOptions.nowMs)
    : Date.now();

  const baselineRoiInstrumentation = {
    model: 'AQCD_BASELINE_ROI_INSTRUMENTATION',
    modelVersion: rules.modelVersion,
    generatedAt: toIso(nowMs),
    baselineWindowRef: snapshotSummaryResult.summary.baselineSnapshotRef,
    currentWindowRef: snapshotSummaryResult.summary.latestSnapshotRef,
    summary: {
      baselineGlobalScore: snapshotSummaryResult.summary.baselineGlobalScore,
      currentGlobalScore: snapshotSummaryResult.summary.latestGlobalScore,
      globalDelta: snapshotSummaryResult.summary.globalDelta,
      readinessScore: roundScore(normalizeNumber(sponsorResult.readiness?.score, 0)),
      projectedRoiPct: roiProjection.projectedRoiPct,
      riskAdjustedRoiPct: roiProjection.riskAdjustedRoiPct,
      tcdImprovementPct: tcdBaseline.improvementPct
    },
    tcdBaseline,
    roiProjection,
    readinessFactors: readinessFactorResult.factors,
    riskContext: {
      riskCount: riskSummary.count,
      openRiskCount: riskSummary.openCount,
      retroPendingActions: Math.max(0, normalizeNumber(sponsorResult.retroClosureTracking?.pendingActions, 0))
    },
    governance: {
      runbook: runbookState.runbook,
      sponsorVisible: true,
      snapshotCount: snapshotSummaryResult.summary.snapshotCount
    }
  };

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: 'Instrumentation baseline TCD/ROI prête avec facteurs readiness visibles.',
    diagnostics: {
      ...sponsorResult.diagnostics,
      baselineRoiModelVersion: rules.modelVersion,
      baselineRoiSnapshotCount: snapshotSummaryResult.summary.snapshotCount,
      baselineRoiSnapshotBaselineRef: snapshotSummaryResult.summary.baselineSnapshotRef,
      baselineRoiSnapshotCurrentRef: snapshotSummaryResult.summary.latestSnapshotRef,
      baselineRoiProjectedRoiPct: roiProjection.projectedRoiPct,
      baselineRoiRiskAdjustedRoiPct: roiProjection.riskAdjustedRoiPct,
      baselineRoiTcdImprovementPct: tcdBaseline.improvementPct,
      p95DecisionMs,
      decisionLatencyBudgetMs: rules.decisionLatencyBudgetMs,
      decisionLatencyBudgetMet: true
    },
    scorecard: sponsorResult.scorecard,
    formula: sponsorResult.formula,
    snapshots: sponsorResult.snapshots,
    readiness: sponsorResult.readiness,
    gateActions: sponsorResult.gateActions,
    riskRegister: sponsorResult.riskRegister,
    mitigationLinks: sponsorResult.mitigationLinks,
    mitigationClosureLinks: sponsorResult.mitigationClosureLinks,
    heatmap: sponsorResult.heatmap,
    heatmapDashboard: sponsorResult.heatmapDashboard,
    validatedDecisionCost: sponsorResult.validatedDecisionCost,
    criticalRunbook: sponsorResult.criticalRunbook,
    phaseWasteRatios: sponsorResult.phaseWasteRatios,
    wasteAlerts: sponsorResult.wasteAlerts,
    wasteAlerting: sponsorResult.wasteAlerting,
    retroClosureTracking: sponsorResult.retroClosureTracking,
    sponsorExecutiveView: sponsorResult.sponsorExecutiveView,
    baselineRoiInstrumentation,
    correctiveActions: []
  });
}
