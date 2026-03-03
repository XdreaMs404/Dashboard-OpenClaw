import { buildAqcdMitigationClosureLinks } from './aqcd-mitigation-closure-links.js';

const VALIDATED_STATUSES = new Set(['VALIDATED', 'APPROVED', 'DONE', 'CLOSED']);

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_AQCD_RISK_HEATMAP_INPUT: ['FIX_AQCD_RISK_HEATMAP_INPUT_STRUCTURE'],
  AQCD_VALIDATED_DECISION_COST_REQUIRED: ['ADD_VALIDATED_DECISION_COST_LOGS'],
  AQCD_VALIDATED_DECISION_COST_INVALID: ['FIX_VALIDATED_DECISION_COST_PAYLOAD'],
  AQCD_CRITICAL_RUNBOOK_REQUIRED: ['PROVIDE_CRITICAL_RUNBOOK_PROOF'],
  AQCD_HEATMAP_EVOLUTION_REQUIRED: ['ADD_AQCD_HEATMAP_SERIES'],
  AQCD_HEATMAP_SERIES_INVALID: ['FIX_AQCD_HEATMAP_SERIES_PAYLOAD'],
  AQCD_HEATMAP_METRICS_NOT_CONTINUOUS: ['RESTORE_AQCD_HEATMAP_CADENCE']
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

function isValidatedDecision(entry) {
  if (!isObject(entry)) {
    return false;
  }

  const explicit = entry.validated;

  if (explicit === true) {
    return true;
  }

  const status = normalizeText(String(entry.status ?? entry.state ?? '')).toUpperCase();

  return VALIDATED_STATUSES.has(status);
}

function extractDecisionCostSeries(payload) {
  const rawSeries =
    payload.decisionCostSeries ??
    payload.validatedDecisionCosts ??
    payload.costPerDecisionSeries ??
    payload.decisionLedger;

  const source = Array.isArray(rawSeries)
    ? rawSeries
    : isObject(rawSeries) && Array.isArray(rawSeries.entries)
      ? rawSeries.entries
      : [];

  if (source.length === 0) {
    return {
      valid: false,
      reasonCode: 'AQCD_VALIDATED_DECISION_COST_REQUIRED',
      reason: 'S055 requiert des coûts par décision validée (FR-052 garde anti-contournement).'
    };
  }

  const entries = [];

  for (let index = 0; index < source.length; index += 1) {
    const entry = source[index];

    if (!isObject(entry)) {
      return {
        valid: false,
        reasonCode: 'AQCD_VALIDATED_DECISION_COST_INVALID',
        reason: `decisionCostSeries[${index}] invalide: objet requis.`
      };
    }

    const decisionId = normalizeText(String(entry.decisionId ?? entry.id ?? entry.ref ?? ''));
    const cost = Number(entry.cost ?? entry.totalCost ?? entry.decisionCost ?? entry.usdCost);

    if (!decisionId) {
      return {
        valid: false,
        reasonCode: 'AQCD_VALIDATED_DECISION_COST_INVALID',
        reason: `decisionCostSeries[${index}] invalide: decisionId requis.`
      };
    }

    if (!Number.isFinite(cost) || cost < 0) {
      return {
        valid: false,
        reasonCode: 'AQCD_VALIDATED_DECISION_COST_INVALID',
        reason: `decisionCostSeries[${index}] invalide: cost >= 0 requis.`
      };
    }

    entries.push({
      decisionId,
      cost: roundScore(cost),
      validated: isValidatedDecision(entry),
      status: normalizeText(String(entry.status ?? entry.state ?? '')).toUpperCase(),
      decidedAt: normalizeText(String(entry.decidedAt ?? entry.at ?? entry.timestamp ?? '')) || null
    });
  }

  const validatedEntries = entries.filter((entry) => entry.validated);

  if (validatedEntries.length === 0) {
    return {
      valid: false,
      reasonCode: 'AQCD_VALIDATED_DECISION_COST_REQUIRED',
      reason: 'Aucune décision validée détectée pour calculer le coût moyen (FR-052).'
    };
  }

  const totalCost = roundScore(validatedEntries.reduce((sum, entry) => sum + entry.cost, 0));
  const averageCost = roundScore(totalCost / validatedEntries.length);

  return {
    valid: true,
    series: {
      entries,
      validatedEntries,
      totalCount: entries.length,
      validatedCount: validatedEntries.length,
      totalValidatedCost: totalCost,
      averageCostPerValidatedDecision: averageCost
    }
  };
}

function buildHeatmapDashboard(heatmap) {
  const snapshots = Array.isArray(heatmap?.snapshots) ? heatmap.snapshots : [];

  if (snapshots.length < 2) {
    return {
      valid: false,
      reasonCode: 'AQCD_HEATMAP_EVOLUTION_REQUIRED',
      reason: 'Heatmap et évolution requis (au moins 2 snapshots).'
    };
  }

  const latest = snapshots[snapshots.length - 1];
  const earliest = snapshots[0];

  const quadrantMatrix = {
    Q1_LOW_IMPACT_LOW_PROBABILITY: 0,
    Q2_LOW_IMPACT_HIGH_PROBABILITY: 0,
    Q3_HIGH_IMPACT_LOW_PROBABILITY: 0,
    Q4_HIGH_IMPACT_HIGH_PROBABILITY: 0
  };

  for (const point of latest.points ?? []) {
    const quadrant = normalizeText(String(point.quadrant ?? '')).toUpperCase();

    if (quadrant in quadrantMatrix) {
      quadrantMatrix[quadrant] += 1;
    }
  }

  const byRiskStart = new Map((earliest.points ?? []).map((point) => [point.riskId, point]));
  const byRiskEnd = new Map((latest.points ?? []).map((point) => [point.riskId, point]));
  const riskIds = new Set([...byRiskStart.keys(), ...byRiskEnd.keys()]);

  const riskEvolution = [];

  for (const riskId of riskIds) {
    const start = byRiskStart.get(riskId) ?? null;
    const end = byRiskEnd.get(riskId) ?? null;

    const startExposure = Number(start?.exposure ?? 0);
    const endExposure = Number(end?.exposure ?? 0);

    riskEvolution.push({
      riskId,
      startExposure: roundScore(startExposure),
      endExposure: roundScore(endExposure),
      deltaExposure: roundScore(endExposure - startExposure),
      startProbabilityPct: roundScore(Number(start?.probabilityPct ?? 0)),
      endProbabilityPct: roundScore(Number(end?.probabilityPct ?? 0)),
      startImpactPct: roundScore(Number(start?.impactPct ?? 0)),
      endImpactPct: roundScore(Number(end?.impactPct ?? 0))
    });
  }

  riskEvolution.sort((left, right) => Math.abs(right.deltaExposure) - Math.abs(left.deltaExposure));

  return {
    valid: true,
    dashboard: {
      snapshotWindow: {
        from: earliest.id,
        to: latest.id,
        fromAt: earliest.at,
        toAt: latest.at
      },
      quadrantMatrix,
      riskEvolution,
      topMovers: riskEvolution.slice(0, 5)
    }
  };
}

function resolveCriticalRunbook(payload) {
  const criticalRunbookRef =
    normalizeText(String(payload.criticalRunbookRef ?? payload.runbookRef ?? ''));
  const criticalRunbookValidated =
    (payload.criticalRunbookValidated ?? payload.runbookValidated ?? false) === true;
  const criticalRunbookTestedAt = normalizeText(String(payload.criticalRunbookTestedAt ?? ''));

  if (!criticalRunbookRef || !criticalRunbookValidated || !criticalRunbookTestedAt) {
    return {
      valid: false,
      reasonCode: 'AQCD_CRITICAL_RUNBOOK_REQUIRED',
      reason:
        'Runbook critique requis/testé pour S055 (criticalRunbookRef + criticalRunbookValidated + criticalRunbookTestedAt).'
    };
  }

  return {
    valid: true,
    runbook: {
      ref: criticalRunbookRef,
      validated: true,
      testedAt: criticalRunbookTestedAt
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
  correctiveActions
}) {
  return {
    allowed,
    reasonCode: normalizeText(String(reasonCode || 'INVALID_AQCD_RISK_HEATMAP_INPUT')),
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
    correctiveActions: normalizeActions(correctiveActions, reasonCode)
  };
}

export function buildAqcdRiskHeatmap(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_AQCD_RISK_HEATMAP_INPUT',
      reason: 'Entrée S055 invalide: objet requis.'
    });
  }

  const mitigationResult = buildAqcdMitigationClosureLinks(payload, runtimeOptions);

  if (!mitigationResult.allowed) {
    return createResult({
      allowed: false,
      reasonCode: mitigationResult.reasonCode,
      reason: mitigationResult.reason,
      diagnostics: mitigationResult.diagnostics,
      scorecard: mitigationResult.scorecard,
      readiness: mitigationResult.readiness,
      gateActions: mitigationResult.gateActions,
      riskRegister: mitigationResult.riskRegister,
      mitigationLinks: mitigationResult.mitigationLinks,
      mitigationClosureLinks: mitigationResult.mitigationClosureLinks,
      heatmap: mitigationResult.heatmap,
      heatmapDashboard: null,
      validatedDecisionCost: null,
      criticalRunbook: null,
      correctiveActions: mitigationResult.correctiveActions
    });
  }

  const heatmapDashboardResult = buildHeatmapDashboard(mitigationResult.heatmap);

  if (!heatmapDashboardResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: heatmapDashboardResult.reasonCode,
      reason: heatmapDashboardResult.reason,
      diagnostics: mitigationResult.diagnostics,
      scorecard: mitigationResult.scorecard,
      readiness: mitigationResult.readiness,
      gateActions: mitigationResult.gateActions,
      riskRegister: mitigationResult.riskRegister,
      mitigationLinks: mitigationResult.mitigationLinks,
      mitigationClosureLinks: mitigationResult.mitigationClosureLinks,
      heatmap: mitigationResult.heatmap,
      heatmapDashboard: null,
      validatedDecisionCost: null,
      criticalRunbook: null,
      correctiveActions: DEFAULT_CORRECTIVE_ACTIONS[heatmapDashboardResult.reasonCode]
    });
  }

  const decisionCostResult = extractDecisionCostSeries(payload);

  if (!decisionCostResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: decisionCostResult.reasonCode,
      reason: decisionCostResult.reason,
      diagnostics: {
        ...mitigationResult.diagnostics,
        heatmapEvolutionCount: heatmapDashboardResult.dashboard.riskEvolution.length
      },
      scorecard: mitigationResult.scorecard,
      readiness: mitigationResult.readiness,
      gateActions: mitigationResult.gateActions,
      riskRegister: mitigationResult.riskRegister,
      mitigationLinks: mitigationResult.mitigationLinks,
      mitigationClosureLinks: mitigationResult.mitigationClosureLinks,
      heatmap: mitigationResult.heatmap,
      heatmapDashboard: heatmapDashboardResult.dashboard,
      validatedDecisionCost: null,
      criticalRunbook: null,
      correctiveActions: DEFAULT_CORRECTIVE_ACTIONS[decisionCostResult.reasonCode]
    });
  }

  const runbookResult = resolveCriticalRunbook(payload);

  if (!runbookResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: runbookResult.reasonCode,
      reason: runbookResult.reason,
      diagnostics: {
        ...mitigationResult.diagnostics,
        heatmapEvolutionCount: heatmapDashboardResult.dashboard.riskEvolution.length,
        validatedDecisionCount: decisionCostResult.series.validatedCount,
        averageCostPerValidatedDecision: decisionCostResult.series.averageCostPerValidatedDecision
      },
      scorecard: mitigationResult.scorecard,
      readiness: mitigationResult.readiness,
      gateActions: mitigationResult.gateActions,
      riskRegister: mitigationResult.riskRegister,
      mitigationLinks: mitigationResult.mitigationLinks,
      mitigationClosureLinks: mitigationResult.mitigationClosureLinks,
      heatmap: mitigationResult.heatmap,
      heatmapDashboard: heatmapDashboardResult.dashboard,
      validatedDecisionCost: decisionCostResult.series,
      criticalRunbook: null,
      correctiveActions: DEFAULT_CORRECTIVE_ACTIONS[runbookResult.reasonCode]
    });
  }

  const diagnostics = {
    ...mitigationResult.diagnostics,
    heatmapEvolutionCount: heatmapDashboardResult.dashboard.riskEvolution.length,
    metricsContinuous: mitigationResult.diagnostics?.metricsContinuous === true,
    validatedDecisionCount: decisionCostResult.series.validatedCount,
    totalDecisionCount: decisionCostResult.series.totalCount,
    averageCostPerValidatedDecision: decisionCostResult.series.averageCostPerValidatedDecision,
    criticalRunbookReady: true
  };

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: 'Heatmap probabilité/impact et évolution validées avec coût moyen par décision validée.',
    diagnostics,
    scorecard: mitigationResult.scorecard,
    readiness: mitigationResult.readiness,
    gateActions: mitigationResult.gateActions,
    riskRegister: mitigationResult.riskRegister,
    mitigationLinks: mitigationResult.mitigationLinks,
    mitigationClosureLinks: mitigationResult.mitigationClosureLinks,
    heatmap: mitigationResult.heatmap,
    heatmapDashboard: heatmapDashboardResult.dashboard,
    validatedDecisionCost: decisionCostResult.series,
    criticalRunbook: runbookResult.runbook,
    correctiveActions: []
  });
}
