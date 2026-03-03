import { buildAqcdRetroClosureTracking } from './aqcd-retro-closure-tracker.js';
import { buildAqcdExplainableScoreboard } from './aqcd-scoreboard.js';

const DEFAULT_MINIMUM_SNAPSHOT_COUNT = 3;
const DEFAULT_CADENCE_HOURS = 24;
const DEFAULT_CONTINUITY_TOLERANCE_MULTIPLIER = 2;

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_AQCD_SPONSOR_VIEW_INPUT: ['FIX_AQCD_SPONSOR_VIEW_INPUT_STRUCTURE'],
  AQCD_SPONSOR_SCORECARD_REQUIRED: ['RESTORE_AQCD_SPONSOR_SCORECARD_PAYLOAD'],
  AQCD_SPONSOR_FORMULA_SOURCE_REQUIRED: ['RESTORE_AQCD_FORMULA_SOURCE_REFERENCES'],
  AQCD_SPONSOR_SNAPSHOT_HISTORY_REQUIRED: ['ADD_SPONSOR_PERIODIC_SNAPSHOTS'],
  AQCD_SPONSOR_CONTINUITY_REQUIRED: ['RESTORE_SPONSOR_METRICS_CONTINUITY'],
  AQCD_SPONSOR_RUNBOOK_REQUIRED: ['PROVIDE_SPONSOR_CRITICAL_RUNBOOK_PROOF']
});

const SCORE_CARD_SPECS = Object.freeze([
  {
    id: 'A',
    key: 'autonomy',
    label: 'Autonomie',
    formulaKey: 'autonomy'
  },
  {
    id: 'Q',
    key: 'qualityTech',
    label: 'Qualité technique',
    formulaKey: 'qualityTech'
  },
  {
    id: 'C',
    key: 'costEfficiency',
    label: 'Efficience coût',
    formulaKey: 'costEfficiency'
  },
  {
    id: 'D',
    key: 'designExcellence',
    label: 'Excellence design',
    formulaKey: 'designExcellence'
  }
]);

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

    if (!normalized) {
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

function resolveBand(score) {
  const normalized = normalizeNumber(score);

  if (normalized >= 85) {
    return 'INDUSTRIAL';
  }

  if (normalized >= 70) {
    return 'STABLE';
  }

  if (normalized >= 55) {
    return 'FRAGILE';
  }

  return 'NON_ACCEPTABLE';
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

function resolveRules(payload, runtimeOptions) {
  const source =
    (isObject(runtimeOptions.sponsorExecutiveRules) && runtimeOptions.sponsorExecutiveRules) ||
    (isObject(payload.sponsorExecutiveRules) && payload.sponsorExecutiveRules) ||
    {};

  return {
    modelVersion:
      normalizeText(String(source.modelVersion ?? payload.sponsorExecutiveModelVersion ?? 'S059-v1')) ||
      'S059-v1',
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
    cadenceHours: Math.max(
      1,
      normalizeNumber(
        source.cadenceHours ?? payload.cadenceHours ?? runtimeOptions.cadenceHours ?? DEFAULT_CADENCE_HOURS,
        DEFAULT_CADENCE_HOURS
      )
    ),
    continuityToleranceMultiplier: Math.max(
      1,
      normalizeNumber(
        source.continuityToleranceMultiplier ??
          payload.continuityToleranceMultiplier ??
          runtimeOptions.continuityToleranceMultiplier ??
          DEFAULT_CONTINUITY_TOLERANCE_MULTIPLIER,
        DEFAULT_CONTINUITY_TOLERANCE_MULTIPLIER
      )
    )
  };
}

function collectSourceRefs(terms) {
  if (!Array.isArray(terms)) {
    return [];
  }

  const output = [];
  const seen = new Set();

  for (const term of terms) {
    const source = normalizeText(String(term?.source ?? term?.evidenceRef ?? ''));

    if (!source || seen.has(source)) {
      continue;
    }

    seen.add(source);
    output.push(source);
  }

  return output;
}

function buildScoreCards(scorecard, formula) {
  const cards = [];
  const globalSources = [];
  const seenGlobalSource = new Set();

  for (const spec of SCORE_CARD_SPECS) {
    const score = Number(scorecard?.scores?.[spec.key]);
    const dimensionFormula = formula?.dimensions?.[spec.formulaKey];
    const expression = normalizeText(String(dimensionFormula?.expression ?? ''));
    const sourceRefs = collectSourceRefs(dimensionFormula?.terms);

    if (!Number.isFinite(score)) {
      return {
        valid: false,
        reasonCode: 'AQCD_SPONSOR_SCORECARD_REQUIRED',
        reason: `Score AQCD manquant pour ${spec.key}.`
      };
    }

    if (!expression || sourceRefs.length === 0) {
      return {
        valid: false,
        reasonCode: 'AQCD_SPONSOR_FORMULA_SOURCE_REQUIRED',
        reason: `Formule/source manquante pour ${spec.key} (FR-045).`
      };
    }

    cards.push({
      id: spec.id,
      key: spec.key,
      label: spec.label,
      score: roundScore(score),
      band: resolveBand(score),
      formulaExpression: expression,
      sourceRefs
    });

    for (const source of sourceRefs) {
      if (seenGlobalSource.has(source)) {
        continue;
      }

      seenGlobalSource.add(source);
      globalSources.push(source);
    }
  }

  const globalScore = Number(scorecard?.scores?.global);
  const globalExpression = normalizeText(String(formula?.globalExpression ?? ''));

  if (!Number.isFinite(globalScore)) {
    return {
      valid: false,
      reasonCode: 'AQCD_SPONSOR_SCORECARD_REQUIRED',
      reason: 'Score global AQCD manquant pour la vue sponsor.'
    };
  }

  if (!globalExpression || globalSources.length === 0) {
    return {
      valid: false,
      reasonCode: 'AQCD_SPONSOR_FORMULA_SOURCE_REQUIRED',
      reason: 'Expression globale AQCD sans source exploitable (FR-045).'
    };
  }

  cards.push({
    id: 'GLOBAL',
    key: 'global',
    label: 'AQCD Global',
    score: roundScore(globalScore),
    band: resolveBand(globalScore),
    formulaExpression: globalExpression,
    sourceRefs: globalSources
  });

  return {
    valid: true,
    cards
  };
}

function buildTrendSummary(snapshotsSeries, rules) {
  if (!Array.isArray(snapshotsSeries) || snapshotsSeries.length < rules.minimumSnapshotCount) {
    return {
      valid: false,
      reasonCode: 'AQCD_SPONSOR_SNAPSHOT_HISTORY_REQUIRED',
      reason: `Historique snapshots insuffisant: ${rules.minimumSnapshotCount} snapshots minimum requis (FR-046).`
    };
  }

  const normalizedSeries = [];

  for (let index = 0; index < snapshotsSeries.length; index += 1) {
    const snapshot = snapshotsSeries[index];
    const updatedAtMs = parseTimestampMs(snapshot?.updatedAt);

    if (!isObject(snapshot) || !Number.isFinite(updatedAtMs)) {
      return {
        valid: false,
        reasonCode: 'AQCD_SPONSOR_SNAPSHOT_HISTORY_REQUIRED',
        reason: `snapshot[${index}] invalide: updatedAt requis pour analyse de tendance.`
      };
    }

    const globalScore = Number(snapshot?.scores?.global);

    if (!Number.isFinite(globalScore)) {
      return {
        valid: false,
        reasonCode: 'AQCD_SPONSOR_SNAPSHOT_HISTORY_REQUIRED',
        reason: `snapshot[${index}] invalide: scores.global requis.`
      };
    }

    normalizedSeries.push({
      id: normalizeText(String(snapshot.id ?? snapshot.windowRef ?? `SNAP-${index + 1}`)) || `SNAP-${index + 1}`,
      windowRef: normalizeText(String(snapshot.windowRef ?? snapshot.id ?? `SNAP-${index + 1}`)) || `SNAP-${index + 1}`,
      updatedAtMs,
      updatedAt: toIso(updatedAtMs),
      globalScore: roundScore(globalScore),
      band: normalizeText(String(snapshot.band ?? resolveBand(globalScore))) || resolveBand(globalScore)
    });
  }

  normalizedSeries.sort((left, right) => {
    if (left.updatedAtMs === right.updatedAtMs) {
      return left.windowRef.localeCompare(right.windowRef);
    }

    return left.updatedAtMs - right.updatedAtMs;
  });

  const intervalsMs = [];

  for (let index = 1; index < normalizedSeries.length; index += 1) {
    intervalsMs.push(Math.max(0, normalizedSeries[index].updatedAtMs - normalizedSeries[index - 1].updatedAtMs));
  }

  const maxGapMs = intervalsMs.length > 0 ? Math.max(...intervalsMs) : 0;
  const allowedGapMs = rules.cadenceHours * rules.continuityToleranceMultiplier * 60 * 60 * 1000;
  const continuity = {
    cadenceHours: roundScore(rules.cadenceHours),
    continuityToleranceMultiplier: roundScore(rules.continuityToleranceMultiplier),
    allowedGapHours: roundScore(allowedGapMs / (60 * 60 * 1000)),
    maxGapHours: roundScore(maxGapMs / (60 * 60 * 1000)),
    continuous: intervalsMs.length > 0 && maxGapMs <= allowedGapMs
  };

  const latest = normalizedSeries[normalizedSeries.length - 1];
  const previous = normalizedSeries[normalizedSeries.length - 2];
  const deltaGlobal = roundScore(latest.globalScore - previous.globalScore);

  return {
    valid: true,
    trend: {
      snapshotCount: normalizedSeries.length,
      latestSnapshotRef: latest.windowRef,
      previousSnapshotRef: previous.windowRef,
      trendDirection: deltaGlobal > 0 ? 'up' : deltaGlobal < 0 ? 'down' : 'stable',
      deltaGlobal,
      continuity,
      series: normalizedSeries.map((entry) => ({
        id: entry.id,
        windowRef: entry.windowRef,
        updatedAt: entry.updatedAt,
        globalScore: entry.globalScore,
        band: entry.band
      }))
    }
  };
}

function resolveRunbookState(criticalRunbook) {
  const ref = normalizeText(String(criticalRunbook?.ref ?? criticalRunbook?.runbookRef ?? ''));
  const testedAtMs = parseTimestampMs(criticalRunbook?.testedAt ?? criticalRunbook?.testedAtMs);

  return {
    ready: Boolean(ref) && criticalRunbook?.validated === true && Number.isFinite(testedAtMs),
    runbook: {
      ref: ref || null,
      validated: criticalRunbook?.validated === true,
      testedAt: Number.isFinite(testedAtMs) ? toIso(testedAtMs) : null
    }
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
  correctiveActions
}) {
  return {
    allowed,
    reasonCode: normalizeText(String(reasonCode || 'INVALID_AQCD_SPONSOR_VIEW_INPUT')),
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
    correctiveActions: normalizeActions(correctiveActions, reasonCode)
  };
}

export function buildAqcdSponsorExecutiveView(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_AQCD_SPONSOR_VIEW_INPUT',
      reason: 'Entrée S059 invalide: objet requis.'
    });
  }

  const rules = resolveRules(payload, runtimeOptions);

  const baseResult = buildAqcdRetroClosureTracking(payload, runtimeOptions);

  if (!baseResult.allowed) {
    return createResult({
      allowed: false,
      reasonCode: baseResult.reasonCode,
      reason: baseResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        sponsorModelVersion: rules.modelVersion
      },
      scorecard: baseResult.scorecard,
      formula: null,
      snapshots: null,
      readiness: baseResult.readiness,
      gateActions: baseResult.gateActions,
      riskRegister: baseResult.riskRegister,
      mitigationLinks: baseResult.mitigationLinks,
      mitigationClosureLinks: baseResult.mitigationClosureLinks,
      heatmap: baseResult.heatmap,
      heatmapDashboard: baseResult.heatmapDashboard,
      validatedDecisionCost: baseResult.validatedDecisionCost,
      criticalRunbook: baseResult.criticalRunbook,
      phaseWasteRatios: baseResult.phaseWasteRatios,
      wasteAlerts: baseResult.wasteAlerts,
      wasteAlerting: baseResult.wasteAlerting,
      retroClosureTracking: baseResult.retroClosureTracking,
      sponsorExecutiveView: null,
      correctiveActions: baseResult.correctiveActions
    });
  }

  const scoreboardResult = buildAqcdExplainableScoreboard(payload, runtimeOptions);

  if (!scoreboardResult.allowed) {
    return createResult({
      allowed: false,
      reasonCode: scoreboardResult.reasonCode,
      reason: scoreboardResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        ...scoreboardResult.diagnostics,
        sponsorModelVersion: rules.modelVersion
      },
      scorecard: baseResult.scorecard ?? scoreboardResult.scorecard,
      formula: scoreboardResult.formula,
      snapshots: scoreboardResult.snapshots,
      readiness: baseResult.readiness,
      gateActions: baseResult.gateActions,
      riskRegister: baseResult.riskRegister,
      mitigationLinks: baseResult.mitigationLinks,
      mitigationClosureLinks: baseResult.mitigationClosureLinks,
      heatmap: baseResult.heatmap,
      heatmapDashboard: baseResult.heatmapDashboard,
      validatedDecisionCost: baseResult.validatedDecisionCost,
      criticalRunbook: baseResult.criticalRunbook,
      phaseWasteRatios: baseResult.phaseWasteRatios,
      wasteAlerts: baseResult.wasteAlerts,
      wasteAlerting: baseResult.wasteAlerting,
      retroClosureTracking: baseResult.retroClosureTracking,
      sponsorExecutiveView: null,
      correctiveActions: scoreboardResult.correctiveActions
    });
  }

  const scorecard = baseResult.scorecard ?? scoreboardResult.scorecard;

  if (!isObject(scorecard) || !isObject(scorecard.scores)) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_SPONSOR_SCORECARD_REQUIRED',
      reason: 'Scorecard AQCD incomplet pour vue sponsor simplifiée.',
      diagnostics: {
        ...baseResult.diagnostics,
        ...scoreboardResult.diagnostics,
        sponsorModelVersion: rules.modelVersion
      },
      scorecard,
      formula: scoreboardResult.formula,
      snapshots: scoreboardResult.snapshots,
      readiness: baseResult.readiness,
      gateActions: baseResult.gateActions,
      riskRegister: baseResult.riskRegister,
      mitigationLinks: baseResult.mitigationLinks,
      mitigationClosureLinks: baseResult.mitigationClosureLinks,
      heatmap: baseResult.heatmap,
      heatmapDashboard: baseResult.heatmapDashboard,
      validatedDecisionCost: baseResult.validatedDecisionCost,
      criticalRunbook: baseResult.criticalRunbook,
      phaseWasteRatios: baseResult.phaseWasteRatios,
      wasteAlerts: baseResult.wasteAlerts,
      wasteAlerting: baseResult.wasteAlerting,
      retroClosureTracking: baseResult.retroClosureTracking,
      sponsorExecutiveView: null
    });
  }

  const scoreCardsResult = buildScoreCards(scorecard, scoreboardResult.formula);

  if (!scoreCardsResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: scoreCardsResult.reasonCode,
      reason: scoreCardsResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        ...scoreboardResult.diagnostics,
        sponsorModelVersion: rules.modelVersion
      },
      scorecard,
      formula: scoreboardResult.formula,
      snapshots: scoreboardResult.snapshots,
      readiness: baseResult.readiness,
      gateActions: baseResult.gateActions,
      riskRegister: baseResult.riskRegister,
      mitigationLinks: baseResult.mitigationLinks,
      mitigationClosureLinks: baseResult.mitigationClosureLinks,
      heatmap: baseResult.heatmap,
      heatmapDashboard: baseResult.heatmapDashboard,
      validatedDecisionCost: baseResult.validatedDecisionCost,
      criticalRunbook: baseResult.criticalRunbook,
      phaseWasteRatios: baseResult.phaseWasteRatios,
      wasteAlerts: baseResult.wasteAlerts,
      wasteAlerting: baseResult.wasteAlerting,
      retroClosureTracking: baseResult.retroClosureTracking,
      sponsorExecutiveView: null,
      correctiveActions: DEFAULT_CORRECTIVE_ACTIONS[scoreCardsResult.reasonCode]
    });
  }

  const trendResult = buildTrendSummary(scoreboardResult.snapshots?.series ?? [], rules);

  if (!trendResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: trendResult.reasonCode,
      reason: trendResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        ...scoreboardResult.diagnostics,
        sponsorModelVersion: rules.modelVersion,
        sponsorMinimumSnapshotCount: rules.minimumSnapshotCount
      },
      scorecard,
      formula: scoreboardResult.formula,
      snapshots: scoreboardResult.snapshots,
      readiness: baseResult.readiness,
      gateActions: baseResult.gateActions,
      riskRegister: baseResult.riskRegister,
      mitigationLinks: baseResult.mitigationLinks,
      mitigationClosureLinks: baseResult.mitigationClosureLinks,
      heatmap: baseResult.heatmap,
      heatmapDashboard: baseResult.heatmapDashboard,
      validatedDecisionCost: baseResult.validatedDecisionCost,
      criticalRunbook: baseResult.criticalRunbook,
      phaseWasteRatios: baseResult.phaseWasteRatios,
      wasteAlerts: baseResult.wasteAlerts,
      wasteAlerting: baseResult.wasteAlerting,
      retroClosureTracking: baseResult.retroClosureTracking,
      sponsorExecutiveView: null,
      correctiveActions: DEFAULT_CORRECTIVE_ACTIONS[trendResult.reasonCode]
    });
  }

  const retroMetricsContinuous = baseResult.retroClosureTracking?.metrics?.continuous === true;
  const snapshotMetricsContinuous = trendResult.trend.continuity.continuous === true;

  if (!retroMetricsContinuous || !snapshotMetricsContinuous) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_SPONSOR_CONTINUITY_REQUIRED',
      reason:
        'NFR-034 non satisfait: continuité métriques AQCD requise (retro actions + snapshots périodiques).',
      diagnostics: {
        ...baseResult.diagnostics,
        ...scoreboardResult.diagnostics,
        sponsorModelVersion: rules.modelVersion,
        sponsorRetroMetricsContinuous: retroMetricsContinuous,
        sponsorSnapshotMetricsContinuous: snapshotMetricsContinuous,
        sponsorSnapshotMaxGapHours: trendResult.trend.continuity.maxGapHours,
        sponsorSnapshotAllowedGapHours: trendResult.trend.continuity.allowedGapHours
      },
      scorecard,
      formula: scoreboardResult.formula,
      snapshots: scoreboardResult.snapshots,
      readiness: baseResult.readiness,
      gateActions: baseResult.gateActions,
      riskRegister: baseResult.riskRegister,
      mitigationLinks: baseResult.mitigationLinks,
      mitigationClosureLinks: baseResult.mitigationClosureLinks,
      heatmap: baseResult.heatmap,
      heatmapDashboard: baseResult.heatmapDashboard,
      validatedDecisionCost: baseResult.validatedDecisionCost,
      criticalRunbook: baseResult.criticalRunbook,
      phaseWasteRatios: baseResult.phaseWasteRatios,
      wasteAlerts: baseResult.wasteAlerts,
      wasteAlerting: baseResult.wasteAlerting,
      retroClosureTracking: baseResult.retroClosureTracking,
      sponsorExecutiveView: null,
      correctiveActions: ['RESTORE_SPONSOR_METRICS_CONTINUITY']
    });
  }

  const runbookState = resolveRunbookState(baseResult.criticalRunbook);

  if (!runbookState.ready) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_SPONSOR_RUNBOOK_REQUIRED',
      reason: 'NFR-035 non satisfait: runbook critique sponsor requis et testé.',
      diagnostics: {
        ...baseResult.diagnostics,
        ...scoreboardResult.diagnostics,
        sponsorModelVersion: rules.modelVersion,
        sponsorRunbookRef: runbookState.runbook.ref,
        sponsorRunbookValidated: runbookState.runbook.validated,
        sponsorRunbookTestedAt: runbookState.runbook.testedAt
      },
      scorecard,
      formula: scoreboardResult.formula,
      snapshots: scoreboardResult.snapshots,
      readiness: baseResult.readiness,
      gateActions: baseResult.gateActions,
      riskRegister: baseResult.riskRegister,
      mitigationLinks: baseResult.mitigationLinks,
      mitigationClosureLinks: baseResult.mitigationClosureLinks,
      heatmap: baseResult.heatmap,
      heatmapDashboard: baseResult.heatmapDashboard,
      validatedDecisionCost: baseResult.validatedDecisionCost,
      criticalRunbook: baseResult.criticalRunbook,
      phaseWasteRatios: baseResult.phaseWasteRatios,
      wasteAlerts: baseResult.wasteAlerts,
      wasteAlerting: baseResult.wasteAlerting,
      retroClosureTracking: baseResult.retroClosureTracking,
      sponsorExecutiveView: null,
      correctiveActions: ['PROVIDE_SPONSOR_CRITICAL_RUNBOOK_PROOF']
    });
  }

  const nowMs = Number.isFinite(Number(runtimeOptions.nowMs))
    ? Number(runtimeOptions.nowMs)
    : Date.now();

  const sponsorExecutiveView = {
    model: 'AQCD_SPONSOR_EXECUTIVE_VIEW',
    modelVersion: rules.modelVersion,
    audience: 'SPONSOR',
    window: scorecard.window,
    windowRef: scorecard.windowRef,
    generatedAt: toIso(nowMs),
    summary: {
      globalScore: roundScore(scorecard.scores.global),
      band: scorecard.band,
      trendDirection: trendResult.trend.trendDirection,
      trendDeltaGlobal: trendResult.trend.deltaGlobal,
      readinessScore: roundScore(baseResult.readiness?.score ?? 0),
      retroClosureRatePct: roundScore(baseResult.retroClosureTracking?.closureRatePct ?? 0)
    },
    scoreCards: scoreCardsResult.cards,
    trend: trendResult.trend,
    governance: {
      metricsContinuous: true,
      runbook: runbookState.runbook,
      retroPendingActions: baseResult.retroClosureTracking?.pendingActions ?? 0,
      retroRequiredPhases: cloneValue(baseResult.retroClosureTracking?.requiredPhases ?? [])
    }
  };

  const diagnostics = {
    ...baseResult.diagnostics,
    ...scoreboardResult.diagnostics,
    sponsorModelVersion: rules.modelVersion,
    sponsorSnapshotCount: trendResult.trend.snapshotCount,
    sponsorMinimumSnapshotCount: rules.minimumSnapshotCount,
    sponsorTrendDirection: trendResult.trend.trendDirection,
    sponsorTrendDeltaGlobal: trendResult.trend.deltaGlobal,
    sponsorMetricsContinuous: true,
    sponsorRunbookRef: runbookState.runbook.ref
  };

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason:
      'Vue exécutive sponsor simplifiée prête: scores AQCD sourcés et tendance périodique visibles.',
    diagnostics,
    scorecard,
    formula: scoreboardResult.formula,
    snapshots: scoreboardResult.snapshots,
    readiness: baseResult.readiness,
    gateActions: baseResult.gateActions,
    riskRegister: baseResult.riskRegister,
    mitigationLinks: baseResult.mitigationLinks,
    mitigationClosureLinks: baseResult.mitigationClosureLinks,
    heatmap: baseResult.heatmap,
    heatmapDashboard: baseResult.heatmapDashboard,
    validatedDecisionCost: baseResult.validatedDecisionCost,
    criticalRunbook: baseResult.criticalRunbook,
    phaseWasteRatios: baseResult.phaseWasteRatios,
    wasteAlerts: baseResult.wasteAlerts,
    wasteAlerting: baseResult.wasteAlerting,
    retroClosureTracking: baseResult.retroClosureTracking,
    sponsorExecutiveView,
    correctiveActions: []
  });
}
