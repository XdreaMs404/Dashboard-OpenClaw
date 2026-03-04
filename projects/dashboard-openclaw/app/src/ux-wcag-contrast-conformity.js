import { buildUxKeyboardFocusVisibilityContract } from './ux-keyboard-focus-visibility-contract.js';

const DEFAULT_DECISION_TIME_BUDGET_SEC = 90;
const DEFAULT_REQUIRED_VIEWPORTS = Object.freeze(['mobile', 'tablet', 'desktop']);

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_UX_WCAG_CONFORMITY_INPUT: ['FIX_UX_WCAG_CONFORMITY_INPUT_STRUCTURE'],
  UX_RESPONSIVE_DECISION_JOURNEYS_REQUIRED: ['ADD_RESPONSIVE_DECISION_JOURNEYS'],
  UX_RESPONSIVE_VIEWPORT_MISSING: ['COMPLETE_MISSING_VIEWPORT_JOURNEYS'],
  UX_RESPONSIVE_JOURNEY_INCOMPLETE: ['RESTORE_VIEWPORT_KEYBOARD_CONTRAST_READINESS'],
  UX_DECISION_TIME_BUDGET_EXCEEDED: ['OPTIMIZE_CRITICAL_DECISION_PATH_UNDER_90S']
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

function resolveRules(payload, runtimeOptions) {
  const source =
    (isObject(runtimeOptions.wcagConformityRules) && runtimeOptions.wcagConformityRules) ||
    (isObject(payload.wcagConformityRules) && payload.wcagConformityRules) ||
    {};

  const requiredViewports = Array.isArray(
    source.requiredViewports ?? payload.requiredViewports ?? runtimeOptions.requiredViewports
  )
    ? (source.requiredViewports ?? payload.requiredViewports ?? runtimeOptions.requiredViewports)
        .map((viewport) => normalizeText(String(viewport ?? '')).toLowerCase())
        .filter((viewport, index, array) => viewport && array.indexOf(viewport) === index)
    : cloneValue(DEFAULT_REQUIRED_VIEWPORTS);

  return {
    modelVersion:
      normalizeText(String(source.modelVersion ?? payload.wcagConformityModelVersion ?? 'S063-v1')) ||
      'S063-v1',
    decisionTimeBudgetSec: Math.max(
      1,
      normalizeNumber(
        source.decisionTimeBudgetSec ??
          payload.decisionTimeBudgetSec ??
          runtimeOptions.decisionTimeBudgetSec ??
          DEFAULT_DECISION_TIME_BUDGET_SEC,
        DEFAULT_DECISION_TIME_BUDGET_SEC
      )
    ),
    requiredViewports: requiredViewports.length > 0 ? requiredViewports : cloneValue(DEFAULT_REQUIRED_VIEWPORTS)
  };
}

function resolveJourneyEntries(payload) {
  const source = Array.isArray(payload.responsiveDecisionJourneys)
    ? payload.responsiveDecisionJourneys
    : Array.isArray(payload.responsiveJourneys)
      ? payload.responsiveJourneys
      : [];

  if (source.length === 0) {
    return {
      valid: false,
      reasonCode: 'UX_RESPONSIVE_DECISION_JOURNEYS_REQUIRED',
      reason: 'FR-066 non satisfait: parcours responsive décisionnels non fournis.'
    };
  }

  const byViewport = new Map();

  for (let index = 0; index < source.length; index += 1) {
    const entry = source[index];

    if (!isObject(entry)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_WCAG_CONFORMITY_INPUT',
        reason: `responsiveDecisionJourneys[${index}] invalide: objet requis.`
      };
    }

    const viewport = normalizeText(String(entry.viewport ?? entry.name ?? '')).toLowerCase();

    if (!viewport) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_WCAG_CONFORMITY_INPUT',
        reason: `responsiveDecisionJourneys[${index}] sans viewport.`
      };
    }

    const decisionTimeSec = normalizeNumber(
      entry.decisionTimeSec ?? entry.criticalDecisionTimeSec ?? entry.timeToDecisionSec,
      Number.NaN
    );

    const keyboardValidated =
      entry.keyboardValidated === true ||
      entry.keyboardNavigationValidated === true ||
      entry.keyboardOnly === true;

    const focusVisibleValidated =
      entry.focusVisibleValidated === true || entry.focusRingValidated === true;

    const contrastValidated =
      entry.contrastValidated === true ||
      entry.wcagContrastValidated === true ||
      entry.accessibilityAA === true;

    const noHorizontalOverflow =
      entry.noHorizontalOverflow === true ||
      entry.horizontalOverflowPx === 0 ||
      entry.horizontalOverflow === false;

    byViewport.set(viewport, {
      viewport,
      decisionTimeSec: Number.isFinite(decisionTimeSec) ? roundScore(decisionTimeSec) : null,
      keyboardValidated,
      focusVisibleValidated,
      contrastValidated,
      noHorizontalOverflow,
      evidenceRef: normalizeText(String(entry.evidenceRef ?? entry.screenshot ?? '')) || null
    });
  }

  return {
    valid: true,
    byViewport
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  uxAudit,
  criticalWidgetStateContract,
  keyboardFocusVisibilityContract,
  wcagContrastConformity,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode: normalizeText(String(reasonCode || 'INVALID_UX_WCAG_CONFORMITY_INPUT')),
    reason,
    diagnostics: cloneValue(diagnostics ?? {}),
    uxAudit: cloneValue(uxAudit ?? null),
    criticalWidgetStateContract: cloneValue(criticalWidgetStateContract ?? null),
    keyboardFocusVisibilityContract: cloneValue(keyboardFocusVisibilityContract ?? null),
    wcagContrastConformity: cloneValue(wcagContrastConformity ?? null),
    correctiveActions: normalizeActions(correctiveActions, reasonCode)
  };
}

export function buildUxWcagContrastConformity(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_UX_WCAG_CONFORMITY_INPUT',
      reason: 'Entrée S063 invalide: objet requis.'
    });
  }

  const rules = resolveRules(payload, runtimeOptions);

  const baseResult = buildUxKeyboardFocusVisibilityContract(payload, runtimeOptions);

  if (!baseResult.allowed) {
    return createResult({
      allowed: false,
      reasonCode: baseResult.reasonCode,
      reason: baseResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        wcagConformityModelVersion: rules.modelVersion
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      keyboardFocusVisibilityContract: baseResult.keyboardFocusVisibilityContract,
      wcagContrastConformity: null,
      correctiveActions: baseResult.correctiveActions
    });
  }

  const journeysResult = resolveJourneyEntries(payload);

  if (!journeysResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: journeysResult.reasonCode,
      reason: journeysResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        wcagConformityModelVersion: rules.modelVersion,
        requiredViewports: cloneValue(rules.requiredViewports)
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      keyboardFocusVisibilityContract: baseResult.keyboardFocusVisibilityContract,
      wcagContrastConformity: null
    });
  }

  const viewports = [];
  const missingViewports = [];

  for (const viewport of rules.requiredViewports) {
    const entry = journeysResult.byViewport.get(viewport);

    if (!entry) {
      missingViewports.push(viewport);
      continue;
    }

    const complete =
      entry.keyboardValidated &&
      entry.focusVisibleValidated &&
      entry.contrastValidated &&
      entry.noHorizontalOverflow &&
      Number.isFinite(Number(entry.decisionTimeSec));

    viewports.push({
      ...entry,
      complete,
      withinDecisionBudget:
        Number.isFinite(Number(entry.decisionTimeSec)) &&
        Number(entry.decisionTimeSec) <= rules.decisionTimeBudgetSec
    });
  }

  const nowMs = Number.isFinite(Number(runtimeOptions.nowMs))
    ? Number(runtimeOptions.nowMs)
    : Date.now();

  const completeCount = viewports.filter((entry) => entry.complete).length;
  const responsiveCoveragePct =
    rules.requiredViewports.length === 0
      ? 0
      : roundScore((completeCount / rules.requiredViewports.length) * 100);

  const decisionSamples = viewports
    .map((entry) => Number(entry.decisionTimeSec))
    .filter((entry) => Number.isFinite(entry));

  const worstDecisionTimeSec = decisionSamples.length > 0 ? roundScore(Math.max(...decisionSamples)) : null;
  const averageDecisionTimeSec =
    decisionSamples.length > 0
      ? roundScore(decisionSamples.reduce((sum, value) => sum + value, 0) / decisionSamples.length)
      : null;

  const budgetExceededViewports = viewports
    .filter((entry) => entry.withinDecisionBudget === false)
    .map((entry) => ({ viewport: entry.viewport, decisionTimeSec: entry.decisionTimeSec }));

  const incompleteViewports = viewports
    .filter((entry) => entry.complete === false)
    .map((entry) => ({
      viewport: entry.viewport,
      keyboardValidated: entry.keyboardValidated,
      focusVisibleValidated: entry.focusVisibleValidated,
      contrastValidated: entry.contrastValidated,
      noHorizontalOverflow: entry.noHorizontalOverflow,
      decisionTimeSec: entry.decisionTimeSec
    }));

  const wcagContrastConformity = {
    model: 'UX_WCAG_CONTRAST_CONFORMITY',
    modelVersion: rules.modelVersion,
    generatedAt: toIso(nowMs),
    thresholds: {
      decisionTimeBudgetSec: rules.decisionTimeBudgetSec,
      requiredViewports: cloneValue(rules.requiredViewports)
    },
    summary: {
      viewportCount: rules.requiredViewports.length,
      completeViewportCount: completeCount,
      responsiveCoveragePct,
      worstDecisionTimeSec,
      averageDecisionTimeSec,
      withinDecisionBudget: budgetExceededViewports.length === 0
    },
    viewports
  };

  const diagnostics = {
    ...baseResult.diagnostics,
    wcagConformityModelVersion: rules.modelVersion,
    requiredViewports: cloneValue(rules.requiredViewports),
    responsiveCoveragePct,
    worstDecisionTimeSec,
    decisionTimeBudgetSec: rules.decisionTimeBudgetSec,
    completeViewportCount: completeCount
  };

  if (missingViewports.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_RESPONSIVE_VIEWPORT_MISSING',
      reason: `FR-066 non satisfait: viewport(s) manquant(s): ${missingViewports.join(', ')}.`,
      diagnostics: {
        ...diagnostics,
        missingViewports
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      keyboardFocusVisibilityContract: baseResult.keyboardFocusVisibilityContract,
      wcagContrastConformity
    });
  }

  if (incompleteViewports.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_RESPONSIVE_JOURNEY_INCOMPLETE',
      reason: `FR-066 non satisfait: parcours responsive incomplet(s) (${incompleteViewports.length}).`,
      diagnostics: {
        ...diagnostics,
        incompleteViewports
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      keyboardFocusVisibilityContract: baseResult.keyboardFocusVisibilityContract,
      wcagContrastConformity
    });
  }

  if (budgetExceededViewports.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_DECISION_TIME_BUDGET_EXCEEDED',
      reason: `NFR-033 non satisfait: décision > ${rules.decisionTimeBudgetSec}s (${budgetExceededViewports
        .map((entry) => `${entry.viewport}:${entry.decisionTimeSec}s`)
        .join(', ')}).`,
      diagnostics: {
        ...diagnostics,
        budgetExceededViewports
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      keyboardFocusVisibilityContract: baseResult.keyboardFocusVisibilityContract,
      wcagContrastConformity
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason:
      'Conformité WCAG 2.2 AA validée avec parcours responsive complets et décision critique sous 90s.',
    diagnostics,
    uxAudit: baseResult.uxAudit,
    criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
    keyboardFocusVisibilityContract: baseResult.keyboardFocusVisibilityContract,
    wcagContrastConformity,
    correctiveActions: []
  });
}
