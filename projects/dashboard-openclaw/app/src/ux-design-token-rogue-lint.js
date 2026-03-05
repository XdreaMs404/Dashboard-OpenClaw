import { buildUxContextualGlossaryIntegration } from './ux-contextual-glossary-integration.js';

const DEFAULT_REQUIRED_VIEWPORTS = Object.freeze(['mobile', 'tablet', 'desktop']);
const DEFAULT_DECISION_TIME_BUDGET_SEC = 90;

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_UX_DESIGN_TOKEN_INPUT: ['FIX_UX_DESIGN_TOKEN_INPUT_STRUCTURE'],
  UX_DESIGN_TOKEN_POLICY_REQUIRED: ['DECLARE_DESIGN_TOKEN_POLICY_WITH_THRESHOLDS'],
  UX_DESIGN_TOKEN_ALLOWLIST_REQUIRED: ['DECLARE_SPACING_TYPO_COLOR_TOKEN_ALLOWLISTS'],
  UX_DESIGN_TOKEN_CRITICAL_VIEWS_REQUIRED: ['DECLARE_CRITICAL_VIEWS_FOR_TOKEN_AUDIT'],
  UX_CRITICAL_VIEW_FOUR_STATES_REQUIRED: ['RESTORE_EMPTY_LOADING_ERROR_SUCCESS_ON_ALL_CRITICAL_VIEWS'],
  UX_DESIGN_TOKEN_ROGUE_STYLE_DETECTED: ['REMOVE_ROGUE_INLINE_AND_ADHOC_STYLES'],
  UX_DESIGN_TOKEN_UNDECLARED_USAGE: ['REPLACE_UNDECLARED_VALUES_WITH_APPROVED_DESIGN_TOKENS'],
  UX_DESIGN_TOKEN_RESPONSIVE_COVERAGE_REQUIRED: ['VALIDATE_ALL_CRITICAL_VIEWS_ON_MOBILE_TABLET_DESKTOP'],
  UX_DESIGN_TOKEN_DECISION_BUDGET_EXCEEDED: ['OPTIMIZE_CRITICAL_DECISION_PATH_UNDER_90S']
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

function normalizeNumber(value, fallback = Number.NaN) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return numeric;
}

function roundScore(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Number(numeric.toFixed(2));
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

function normalizeViewportList(value) {
  if (!Array.isArray(value)) {
    return cloneValue(DEFAULT_REQUIRED_VIEWPORTS);
  }

  const output = [];
  const seen = new Set();

  for (const viewport of value) {
    const normalized = normalizeText(String(viewport ?? '')).toLowerCase();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(normalized);
  }

  return output.length > 0 ? output : cloneValue(DEFAULT_REQUIRED_VIEWPORTS);
}

function normalizeTokenList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const output = [];
  const seen = new Set();

  for (const token of value) {
    const normalized = normalizeText(String(token ?? ''));

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}

function resolveRules(payload, runtimeOptions) {
  const source =
    (isObject(runtimeOptions.designTokenPolicy) && runtimeOptions.designTokenPolicy) ||
    (isObject(payload.designTokenPolicy) && payload.designTokenPolicy) ||
    null;

  if (!source) {
    return {
      valid: false,
      reasonCode: 'UX_DESIGN_TOKEN_POLICY_REQUIRED',
      reason: 'FR-070 non satisfait: designTokenPolicy requis pour lint anti-style rogue.'
    };
  }

  const requiredViewports = normalizeViewportList(
    source.requiredViewports ?? payload.requiredViewports ?? runtimeOptions.requiredViewports
  );

  const allowedSpacingTokens = normalizeTokenList(source.allowedSpacingTokens);
  const allowedTypographyTokens = normalizeTokenList(source.allowedTypographyTokens);
  const allowedColorTokens = normalizeTokenList(source.allowedColorTokens);

  if (allowedSpacingTokens.length === 0 || allowedTypographyTokens.length === 0 || allowedColorTokens.length === 0) {
    return {
      valid: false,
      reasonCode: 'UX_DESIGN_TOKEN_ALLOWLIST_REQUIRED',
      reason: 'FR-070 non satisfait: allowlists spacing/typo/couleurs incomplètes.'
    };
  }

  return {
    valid: true,
    modelVersion:
      normalizeText(String(source.modelVersion ?? payload.designTokenModelVersion ?? 'S068-v1')) ||
      'S068-v1',
    requiredViewports,
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
    allowedSpacingTokens,
    allowedTypographyTokens,
    allowedColorTokens
  };
}

function resolveCriticalViews(payload) {
  const source = Array.isArray(payload.criticalViews)
    ? payload.criticalViews
    : Array.isArray(payload.views)
      ? payload.views
      : [];

  if (source.length === 0) {
    return {
      valid: false,
      reasonCode: 'UX_DESIGN_TOKEN_CRITICAL_VIEWS_REQUIRED',
      reason: 'FR-063 non satisfait: aucune vue critique déclarée pour le lint design tokens.'
    };
  }

  const views = [];

  for (let index = 0; index < source.length; index += 1) {
    const rawView = source[index];

    if (!isObject(rawView)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_DESIGN_TOKEN_INPUT',
        reason: `criticalViews[${index}] invalide: objet requis.`
      };
    }

    const id = normalizeText(String(rawView.id ?? rawView.viewId ?? `view-${index + 1}`)) || `view-${index + 1}`;

    const states = isObject(rawView.states) ? rawView.states : {};

    const emptyState = states.empty === true || isObject(states.empty);
    const loadingState = states.loading === true || isObject(states.loading);
    const errorState = states.error === true || isObject(states.error);
    const successState = states.success === true || isObject(states.success);

    const hasFourStates = emptyState && loadingState && errorState && successState;

    const tokenUsage = isObject(rawView.tokenUsage) ? rawView.tokenUsage : {};

    const spacingTokens = normalizeTokenList(tokenUsage.spacing);
    const typographyTokens = normalizeTokenList(tokenUsage.typography);
    const colorTokens = normalizeTokenList(tokenUsage.colors ?? tokenUsage.color);

    const rogueStyles = normalizeTokenList(rawView.rogueStyles ?? rawView.rogueDeclarations ?? []);

    views.push({
      id,
      states: {
        empty: emptyState,
        loading: loadingState,
        error: errorState,
        success: successState
      },
      hasFourStates,
      tokenUsage: {
        spacing: spacingTokens,
        typography: typographyTokens,
        colors: colorTokens
      },
      rogueStyles
    });
  }

  return {
    valid: true,
    views
  };
}

function evaluateTokenCompliance(views, rules) {
  const allowedSpacing = new Set(rules.allowedSpacingTokens);
  const allowedTypography = new Set(rules.allowedTypographyTokens);
  const allowedColor = new Set(rules.allowedColorTokens);

  const normalized = [];

  for (const view of views) {
    const undeclaredSpacing = view.tokenUsage.spacing.filter((token) => !allowedSpacing.has(token));
    const undeclaredTypography = view.tokenUsage.typography.filter((token) => !allowedTypography.has(token));
    const undeclaredColors = view.tokenUsage.colors.filter((token) => !allowedColor.has(token));

    const undeclaredTokenCount =
      undeclaredSpacing.length + undeclaredTypography.length + undeclaredColors.length;

    const rogueStyleCount = view.rogueStyles.length;

    normalized.push({
      ...view,
      undeclaredTokens: {
        spacing: undeclaredSpacing,
        typography: undeclaredTypography,
        colors: undeclaredColors
      },
      undeclaredTokenCount,
      rogueStyleCount,
      compliant: view.hasFourStates && undeclaredTokenCount === 0 && rogueStyleCount === 0
    });
  }

  return normalized;
}

function resolveJourneys(payload, criticalViewIds, requiredViewports) {
  const source = Array.isArray(payload.responsiveDecisionJourneys)
    ? payload.responsiveDecisionJourneys
    : Array.isArray(payload.decisionJourneys)
      ? payload.decisionJourneys
      : [];

  const byKey = new Map();

  for (let index = 0; index < source.length; index += 1) {
    const entry = source[index];

    if (!isObject(entry)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_DESIGN_TOKEN_INPUT',
        reason: `responsiveDecisionJourneys[${index}] invalide: objet requis.`
      };
    }

    const viewId = normalizeText(String(entry.viewId ?? entry.id ?? '')).trim();
    const viewport = normalizeText(String(entry.viewport ?? entry.breakpoint ?? '')).toLowerCase();
    const decisionTimeSec = normalizeNumber(
      entry.decisionTimeSec ?? entry.timeToDecisionSec ?? entry.per01DecisionTimeSec
    );

    if (!viewId || !viewport || !Number.isFinite(decisionTimeSec)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_DESIGN_TOKEN_INPUT',
        reason: `responsiveDecisionJourneys[${index}] incomplet: viewId, viewport et decisionTimeSec requis.`
      };
    }

    const key = `${viewId}::${viewport}`;

    byKey.set(key, {
      viewId,
      viewport,
      decisionTimeSec: roundScore(decisionTimeSec)
    });
  }

  const requiredPairs = [];
  const missingPairs = [];

  for (const viewId of criticalViewIds) {
    for (const viewport of requiredViewports) {
      const key = `${viewId}::${viewport}`;
      const found = byKey.get(key);

      if (found) {
        requiredPairs.push({
          ...found,
          exists: true
        });
        continue;
      }

      missingPairs.push({
        viewId,
        viewport
      });

      requiredPairs.push({
        viewId,
        viewport,
        decisionTimeSec: null,
        exists: false
      });
    }
  }

  const decisionSamples = requiredPairs
    .map((entry) => Number(entry.decisionTimeSec))
    .filter((value) => Number.isFinite(value));

  const worstDecisionTimeSec = decisionSamples.length > 0 ? roundScore(Math.max(...decisionSamples)) : null;

  const averageDecisionTimeSec =
    decisionSamples.length > 0
      ? roundScore(decisionSamples.reduce((sum, value) => sum + value, 0) / decisionSamples.length)
      : null;

  const coveragePct =
    requiredPairs.length === 0
      ? 0
      : roundScore(((requiredPairs.length - missingPairs.length) / requiredPairs.length) * 100);

  return {
    valid: true,
    requiredPairs,
    missingPairs,
    worstDecisionTimeSec,
    averageDecisionTimeSec,
    coveragePct
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  uxAudit,
  criticalWidgetStateContract,
  uxDebtReductionLane,
  contextualGlossaryIntegration,
  designTokenRogueLint,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode: normalizeText(String(reasonCode || 'INVALID_UX_DESIGN_TOKEN_INPUT')),
    reason,
    diagnostics: cloneValue(diagnostics ?? {}),
    uxAudit: cloneValue(uxAudit ?? null),
    criticalWidgetStateContract: cloneValue(criticalWidgetStateContract ?? null),
    uxDebtReductionLane: cloneValue(uxDebtReductionLane ?? null),
    contextualGlossaryIntegration: cloneValue(contextualGlossaryIntegration ?? null),
    designTokenRogueLint: cloneValue(designTokenRogueLint ?? null),
    correctiveActions: normalizeActions(correctiveActions, reasonCode)
  };
}

export function buildUxDesignTokenRogueLint(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_UX_DESIGN_TOKEN_INPUT',
      reason: 'Entrée S068 invalide: objet requis.'
    });
  }

  const baseResult = buildUxContextualGlossaryIntegration(payload, runtimeOptions);

  if (!baseResult.allowed) {
    return createResult({
      allowed: false,
      reasonCode: baseResult.reasonCode,
      reason: baseResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        designTokenModelVersion: 'S068-v1'
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: null,
      correctiveActions: baseResult.correctiveActions
    });
  }

  const rulesResult = resolveRules(payload, runtimeOptions);

  if (!rulesResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: rulesResult.reasonCode,
      reason: rulesResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        designTokenModelVersion: 'S068-v1'
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: null
    });
  }

  const rules = rulesResult;

  const viewsResult = resolveCriticalViews(payload);

  if (!viewsResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: viewsResult.reasonCode,
      reason: viewsResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        designTokenModelVersion: rules.modelVersion,
        requiredViewports: cloneValue(rules.requiredViewports)
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: null
    });
  }

  const criticalViews = evaluateTokenCompliance(viewsResult.views, rules);

  const fourStateGaps = criticalViews
    .filter((entry) => entry.hasFourStates === false)
    .map((entry) => ({
      id: entry.id,
      states: entry.states
    }));

  const rogueSurfaces = criticalViews
    .filter((entry) => entry.rogueStyleCount > 0)
    .map((entry) => ({
      id: entry.id,
      rogueStyles: entry.rogueStyles
    }));

  const undeclaredTokenSurfaces = criticalViews
    .filter((entry) => entry.undeclaredTokenCount > 0)
    .map((entry) => ({
      id: entry.id,
      undeclaredTokens: entry.undeclaredTokens
    }));

  const journeyResult = resolveJourneys(
    payload,
    criticalViews.map((entry) => entry.id),
    rules.requiredViewports
  );

  if (!journeyResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: journeyResult.reasonCode,
      reason: journeyResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        designTokenModelVersion: rules.modelVersion
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: null
    });
  }

  const budgetExceeded = journeyResult.requiredPairs
    .filter((entry) => Number.isFinite(Number(entry.decisionTimeSec)))
    .filter((entry) => Number(entry.decisionTimeSec) > rules.decisionTimeBudgetSec)
    .map((entry) => ({
      viewId: entry.viewId,
      viewport: entry.viewport,
      decisionTimeSec: entry.decisionTimeSec
    }));

  const compliantViewCount = criticalViews.filter((entry) => entry.compliant).length;
  const fourStateCoveragePct =
    criticalViews.length === 0
      ? 0
      : roundScore(((criticalViews.length - fourStateGaps.length) / criticalViews.length) * 100);

  const designTokenRogueLint = {
    model: 'UX_DESIGN_TOKEN_ROGUE_LINT',
    modelVersion: rules.modelVersion,
    generatedAt: toIso(Number.isFinite(Number(runtimeOptions.nowMs)) ? Number(runtimeOptions.nowMs) : Date.now()),
    thresholds: {
      requiredViewports: cloneValue(rules.requiredViewports),
      decisionTimeBudgetSec: rules.decisionTimeBudgetSec,
      allowedTokens: {
        spacing: cloneValue(rules.allowedSpacingTokens),
        typography: cloneValue(rules.allowedTypographyTokens),
        colors: cloneValue(rules.allowedColorTokens)
      }
    },
    criticalViews,
    responsiveDecisionJourneys: journeyResult.requiredPairs,
    summary: {
      criticalViewCount: criticalViews.length,
      compliantViewCount,
      fourStateCoveragePct,
      responsiveCoveragePct: journeyResult.coveragePct,
      rogueSurfaceCount: rogueSurfaces.length,
      undeclaredTokenSurfaceCount: undeclaredTokenSurfaces.length,
      worstDecisionTimeSec: journeyResult.worstDecisionTimeSec,
      averageDecisionTimeSec: journeyResult.averageDecisionTimeSec,
      decisionTimeBudgetSec: rules.decisionTimeBudgetSec,
      withinDecisionBudget: budgetExceeded.length === 0
    }
  };

  const diagnostics = {
    ...baseResult.diagnostics,
    designTokenModelVersion: rules.modelVersion,
    criticalViewCount: criticalViews.length,
    compliantViewCount,
    fourStateGapCount: fourStateGaps.length,
    rogueSurfaceCount: rogueSurfaces.length,
    undeclaredTokenSurfaceCount: undeclaredTokenSurfaces.length,
    responsiveMissingCount: journeyResult.missingPairs.length,
    decisionBudgetExceededCount: budgetExceeded.length,
    decisionTimeBudgetSec: rules.decisionTimeBudgetSec,
    worstDecisionTimeSec: journeyResult.worstDecisionTimeSec
  };

  if (fourStateGaps.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_CRITICAL_VIEW_FOUR_STATES_REQUIRED',
      reason: 'FR-063 non satisfait: chaque vue critique doit exposer empty/loading/error/success.',
      diagnostics: {
        ...diagnostics,
        fourStateGaps
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint
    });
  }

  if (rogueSurfaces.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_DESIGN_TOKEN_ROGUE_STYLE_DETECTED',
      reason: 'FR-070 non satisfait: styles rogue détectés hors design tokens autorisés.',
      diagnostics: {
        ...diagnostics,
        rogueSurfaces
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint
    });
  }

  if (undeclaredTokenSurfaces.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_DESIGN_TOKEN_UNDECLARED_USAGE',
      reason: 'FR-070 non satisfait: tokens non autorisés détectés sur vues critiques.',
      diagnostics: {
        ...diagnostics,
        undeclaredTokenSurfaces
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint
    });
  }

  if (journeyResult.missingPairs.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_DESIGN_TOKEN_RESPONSIVE_COVERAGE_REQUIRED',
      reason: 'NFR-032 non satisfait: parcours critiques incomplets sur mobile/tablette/desktop.',
      diagnostics: {
        ...diagnostics,
        missingResponsiveJourneys: journeyResult.missingPairs
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint
    });
  }

  if (budgetExceeded.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_DESIGN_TOKEN_DECISION_BUDGET_EXCEEDED',
      reason: `NFR-033 non satisfait: décision critique > ${rules.decisionTimeBudgetSec}s.`,
      diagnostics: {
        ...diagnostics,
        budgetExceeded
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: 'Lint anti-style rogue validé avec 4 états, responsive complet et décision PER-01 < 90s.',
    diagnostics,
    uxAudit: baseResult.uxAudit,
    criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
    uxDebtReductionLane: baseResult.uxDebtReductionLane,
    contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
    designTokenRogueLint,
    correctiveActions: []
  });
}
