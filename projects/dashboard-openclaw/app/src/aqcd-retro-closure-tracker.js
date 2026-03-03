import { buildAqcdValidatedDecisionCost } from './aqcd-validated-decision-cost.js';

const DEFAULT_REQUIRED_PHASES = Object.freeze(['H21', 'H22', 'H23']);
const DEFAULT_RETRO_METRICS_MAX_AGE_HOURS = 24;

const CLOSED_STATUSES = new Set(['DONE', 'CLOSED', 'VERIFIED', 'RESOLVED', 'MITIGATED']);

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_AQCD_RETRO_CLOSURE_INPUT: ['FIX_AQCD_RETRO_CLOSURE_INPUT_STRUCTURE'],
  AQCD_RETRO_ACTIONS_REQUIRED: ['ADD_RETRO_ACTIONS_H21_H22_H23'],
  AQCD_RETRO_ACTION_PHASE_INVALID: ['ALIGN_RETRO_ACTION_PHASE_IDS'],
  AQCD_RETRO_PHASE_MISSING: ['ADD_MISSING_RETRO_PHASE_ACTIONS'],
  AQCD_RETRO_CLOSURE_PENDING: ['CLOSE_REMAINING_RETRO_ACTIONS'],
  AQCD_RETRO_CLOSURE_EVIDENCE_REQUIRED: ['ATTACH_RETRO_CLOSURE_EVIDENCE'],
  AQCD_RETRO_METRICS_NOT_CONTINUOUS: ['RESTORE_RETRO_ACTION_METRICS_CADENCE'],
  AQCD_SCORECARD_VISIBILITY_REQUIRED: ['RESTORE_AQCD_SCORECARD_VISIBILITY']
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

function resolveRequiredPhases(payload, runtimeOptions) {
  const source =
    (Array.isArray(runtimeOptions.requiredRetroPhases) && runtimeOptions.requiredRetroPhases) ||
    (Array.isArray(payload.requiredRetroPhases) && payload.requiredRetroPhases) ||
    DEFAULT_REQUIRED_PHASES;

  const output = [];
  const seen = new Set();

  for (const entry of source) {
    const phase = normalizeText(String(entry ?? '')).toUpperCase();

    if (!phase || seen.has(phase)) {
      continue;
    }

    seen.add(phase);
    output.push(phase);
  }

  return output.length > 0 ? output : cloneValue(DEFAULT_REQUIRED_PHASES);
}

function resolveRules(payload, runtimeOptions) {
  const source =
    (isObject(runtimeOptions.retroClosureRules) && runtimeOptions.retroClosureRules) ||
    (isObject(payload.retroClosureRules) && payload.retroClosureRules) ||
    {};

  return {
    requiredPhases: resolveRequiredPhases(payload, runtimeOptions),
    retroMetricsMaxAgeHours: normalizeNumber(
      source.retroMetricsMaxAgeHours ??
        payload.retroMetricsMaxAgeHours ??
        runtimeOptions.retroMetricsMaxAgeHours ??
        DEFAULT_RETRO_METRICS_MAX_AGE_HOURS,
      DEFAULT_RETRO_METRICS_MAX_AGE_HOURS
    )
  };
}

function isClosedAction(entry) {
  if ((entry?.closed ?? false) === true) {
    return true;
  }

  const status = normalizeText(String(entry?.status ?? entry?.state ?? '')).toUpperCase();
  return CLOSED_STATUSES.has(status);
}

function normalizeActionEntry(entry, index, phaseSet) {
  if (!isObject(entry)) {
    return {
      valid: false,
      reasonCode: 'AQCD_RETRO_ACTIONS_REQUIRED',
      reason: `retroActions[${index}] invalide: objet requis.`
    };
  }

  const phase = normalizeText(String(entry.phase ?? entry.phaseId ?? entry.step ?? '')).toUpperCase();

  if (!phase || !phaseSet.has(phase)) {
    return {
      valid: false,
      reasonCode: 'AQCD_RETRO_ACTION_PHASE_INVALID',
      reason: `retroActions[${index}] invalide: phase H21/H22/H23 attendue.`
    };
  }

  const actionId = normalizeText(String(entry.actionId ?? entry.id ?? entry.ref ?? ''));

  if (!actionId) {
    return {
      valid: false,
      reasonCode: 'AQCD_RETRO_ACTIONS_REQUIRED',
      reason: `retroActions[${index}] invalide: actionId requis.`
    };
  }

  const owner = normalizeText(String(entry.owner ?? entry.assignee ?? ''));

  if (!owner) {
    return {
      valid: false,
      reasonCode: 'AQCD_RETRO_ACTIONS_REQUIRED',
      reason: `retroActions[${index}] invalide: owner requis.`
    };
  }

  const status = normalizeText(String(entry.status ?? entry.state ?? '')).toUpperCase() || 'OPEN';
  const closed = isClosedAction(entry);

  const closureEvidenceRef =
    normalizeText(
      String(
        entry.closureEvidenceRef ??
          entry.closureProofRef ??
          entry.closureEvidence ??
          entry.proofRef ??
          entry.evidenceRef ??
          ''
      )
    ) || null;

  if (closed && !closureEvidenceRef) {
    return {
      valid: false,
      reasonCode: 'AQCD_RETRO_CLOSURE_EVIDENCE_REQUIRED',
      reason: `Action ${actionId} clôturée sans preuve de clôture.`
    };
  }

  const updatedAtMs = parseTimestampMs(entry.updatedAt ?? entry.lastUpdatedAt ?? entry.observedAt ?? entry.at);

  return {
    valid: true,
    action: {
      phase,
      actionId,
      owner,
      status,
      closed,
      dueAt: normalizeText(String(entry.dueAt ?? '')) || null,
      closedAt: normalizeText(String(entry.closedAt ?? '')) || null,
      updatedAt: updatedAtMs === null ? null : toIso(updatedAtMs),
      updatedAtMs,
      closureEvidenceRef
    }
  };
}

function ensureScorecardVisibility(scorecard) {
  if (!isObject(scorecard)) {
    return false;
  }

  const scores = isObject(scorecard.scores) ? scorecard.scores : null;

  if (!scores) {
    return false;
  }

  const requiredKeys = ['autonomy', 'qualityTech', 'costEfficiency', 'designExcellence', 'global'];

  return requiredKeys.every((key) => Number.isFinite(Number(scores[key])));
}

function buildRetroClosureTracking(payload, rules, runtimeOptions) {
  const source =
    payload.retroActions ??
    payload.h21h22h23Actions ??
    payload.retroClosureActions ??
    (isObject(payload.retroLedger) ? payload.retroLedger.actions : null);

  if (!Array.isArray(source) || source.length === 0) {
    return {
      valid: false,
      reasonCode: 'AQCD_RETRO_ACTIONS_REQUIRED',
      reason: 'Suivi H21/H22/H23 requis: retroActions non fourni.',
      correctiveActions: ['ADD_RETRO_ACTIONS_H21_H22_H23']
    };
  }

  const phaseSet = new Set(rules.requiredPhases);
  const actions = [];

  for (let index = 0; index < source.length; index += 1) {
    const normalized = normalizeActionEntry(source[index], index, phaseSet);

    if (!normalized.valid) {
      return {
        valid: false,
        reasonCode: normalized.reasonCode,
        reason: normalized.reason,
        correctiveActions: DEFAULT_CORRECTIVE_ACTIONS[normalized.reasonCode]
      };
    }

    actions.push(normalized.action);
  }

  const actionsByPhase = new Map(rules.requiredPhases.map((phase) => [phase, []]));

  for (const action of actions) {
    actionsByPhase.get(action.phase)?.push(action);
  }

  const missingPhases = rules.requiredPhases.filter((phase) => (actionsByPhase.get(phase) ?? []).length === 0);

  if (missingPhases.length > 0) {
    return {
      valid: false,
      reasonCode: 'AQCD_RETRO_PHASE_MISSING',
      reason: `Phases rétro manquantes: ${missingPhases.join(', ')}.`,
      correctiveActions: ['ADD_MISSING_RETRO_PHASE_ACTIONS']
    };
  }

  const pendingActions = actions.filter((action) => action.closed !== true);

  if (pendingActions.length > 0) {
    const pendingIds = pendingActions.slice(0, 5).map((action) => action.actionId);

    return {
      valid: false,
      reasonCode: 'AQCD_RETRO_CLOSURE_PENDING',
      reason: `Clôture non vérifiée: actions encore ouvertes (${pendingIds.join(', ')}).`,
      correctiveActions: ['CLOSE_REMAINING_RETRO_ACTIONS'],
      tracking: {
        requiredPhases: rules.requiredPhases,
        totalActions: actions.length,
        closedActions: actions.length - pendingActions.length,
        pendingActions: pendingActions.length
      }
    };
  }

  const nowMs = Number.isFinite(Number(runtimeOptions.nowMs))
    ? Number(runtimeOptions.nowMs)
    : Date.now();

  const maxAgeMs = Math.max(1, normalizeNumber(rules.retroMetricsMaxAgeHours, DEFAULT_RETRO_METRICS_MAX_AGE_HOURS)) * 60 * 60 * 1000;
  let observedMaxAgeMs = 0;
  const staleActions = [];

  for (const action of actions) {
    if (!Number.isFinite(action.updatedAtMs)) {
      return {
        valid: false,
        reasonCode: 'AQCD_RETRO_METRICS_NOT_CONTINUOUS',
        reason: `Action ${action.actionId}: updatedAt requis pour continuité des métriques.`,
        correctiveActions: ['RESTORE_RETRO_ACTION_METRICS_CADENCE']
      };
    }

    const ageMs = Math.max(0, nowMs - action.updatedAtMs);
    observedMaxAgeMs = Math.max(observedMaxAgeMs, ageMs);

    if (ageMs > maxAgeMs) {
      staleActions.push(action.actionId);
    }
  }

  if (staleActions.length > 0) {
    return {
      valid: false,
      reasonCode: 'AQCD_RETRO_METRICS_NOT_CONTINUOUS',
      reason: `Métriques rétro obsolètes: ${staleActions.join(', ')} (>${roundScore(maxAgeMs / (60 * 60 * 1000))}h).`,
      correctiveActions: ['RESTORE_RETRO_ACTION_METRICS_CADENCE']
    };
  }

  const phaseSummaries = rules.requiredPhases.map((phase) => {
    const phaseActions = actionsByPhase.get(phase) ?? [];
    const closedCount = phaseActions.filter((action) => action.closed).length;
    const pendingCount = phaseActions.length - closedCount;
    const closedWithEvidenceCount = phaseActions.filter(
      (action) => action.closed && Boolean(action.closureEvidenceRef)
    ).length;

    const latestUpdatedAtMs = phaseActions.reduce((max, action) => {
      if (!Number.isFinite(action.updatedAtMs)) {
        return max;
      }

      return Math.max(max, action.updatedAtMs);
    }, 0);

    return {
      phase,
      totalActions: phaseActions.length,
      closedActions: closedCount,
      pendingActions: pendingCount,
      closureRatePct: phaseActions.length > 0 ? roundScore((closedCount / phaseActions.length) * 100) : 0,
      closureEvidenceCoveragePct:
        closedCount > 0 ? roundScore((closedWithEvidenceCount / closedCount) * 100) : 100,
      latestUpdatedAt: latestUpdatedAtMs > 0 ? toIso(latestUpdatedAtMs) : null
    };
  });

  const actionLedger = cloneValue(actions).sort((left, right) => {
    const phaseDelta = rules.requiredPhases.indexOf(left.phase) - rules.requiredPhases.indexOf(right.phase);

    if (phaseDelta !== 0) {
      return phaseDelta;
    }

    return left.actionId.localeCompare(right.actionId);
  });

  return {
    valid: true,
    tracking: {
      requiredPhases: rules.requiredPhases,
      totalActions: actions.length,
      closedActions: actions.length,
      pendingActions: 0,
      closureRatePct: 100,
      phaseSummaries,
      actionLedger,
      metrics: {
        retroMetricsMaxAgeHours: roundScore(maxAgeMs / (60 * 60 * 1000)),
        observedMaxAgeHours: roundScore(observedMaxAgeMs / (60 * 60 * 1000)),
        continuous: true
      },
      verifiedClosure: true
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
  retroClosureTracking,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode: normalizeText(String(reasonCode || 'INVALID_AQCD_RETRO_CLOSURE_INPUT')),
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
    retroClosureTracking: cloneValue(retroClosureTracking ?? null),
    correctiveActions: normalizeActions(correctiveActions, reasonCode)
  };
}

export function buildAqcdRetroClosureTracking(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_AQCD_RETRO_CLOSURE_INPUT',
      reason: 'Entrée S058 invalide: objet requis.'
    });
  }

  const rules = resolveRules(payload, runtimeOptions);
  const baseResult = buildAqcdValidatedDecisionCost(payload, runtimeOptions);

  if (!baseResult.allowed) {
    return createResult({
      allowed: false,
      reasonCode: baseResult.reasonCode,
      reason: baseResult.reason,
      diagnostics: baseResult.diagnostics,
      scorecard: baseResult.scorecard,
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
      retroClosureTracking: null,
      correctiveActions: baseResult.correctiveActions
    });
  }

  if (!ensureScorecardVisibility(baseResult.scorecard)) {
    return createResult({
      allowed: false,
      reasonCode: 'AQCD_SCORECARD_VISIBILITY_REQUIRED',
      reason: 'FR-045 non satisfait: scorecard AQCD complète (A/Q/C/D + global) requise.',
      diagnostics: {
        ...baseResult.diagnostics,
        scorecardVisible: false
      },
      scorecard: baseResult.scorecard,
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
      retroClosureTracking: null,
      correctiveActions: ['RESTORE_AQCD_SCORECARD_VISIBILITY']
    });
  }

  const trackingResult = buildRetroClosureTracking(payload, rules, runtimeOptions);

  if (!trackingResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: trackingResult.reasonCode,
      reason: trackingResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        requiredRetroPhases: rules.requiredPhases,
        retroMetricsMaxAgeHours: roundScore(rules.retroMetricsMaxAgeHours),
        scorecardVisible: true
      },
      scorecard: baseResult.scorecard,
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
      retroClosureTracking: trackingResult.tracking ?? null,
      correctiveActions: trackingResult.correctiveActions
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: 'Suivi actions H21/H22/H23 clôturé avec preuves vérifiées et AQCD visible.',
    diagnostics: {
      ...baseResult.diagnostics,
      requiredRetroPhases: rules.requiredPhases,
      retroMetricsMaxAgeHours: roundScore(rules.retroMetricsMaxAgeHours),
      retroActionCount: trackingResult.tracking.totalActions,
      retroPendingCount: trackingResult.tracking.pendingActions,
      retroClosureRatePct: trackingResult.tracking.closureRatePct,
      retroMetricsContinuous: trackingResult.tracking.metrics.continuous,
      scorecardVisible: true
    },
    scorecard: baseResult.scorecard,
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
    retroClosureTracking: trackingResult.tracking,
    correctiveActions: []
  });
}
