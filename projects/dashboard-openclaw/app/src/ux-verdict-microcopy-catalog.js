import { buildUxDesignTokenRogueLint } from './ux-design-token-rogue-lint.js';

const DEFAULT_REQUIRED_VERDICTS = Object.freeze(['PASS', 'CONCERNS', 'FAIL']);
const DEFAULT_REQUIRED_STATES = Object.freeze(['loading', 'empty', 'error', 'success']);
const DEFAULT_DECISION_TIME_BUDGET_SEC = 90;
const DEFAULT_TTFV_MAX_DAYS = 14;

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_UX_VERDICT_MICROCOPY_INPUT: ['FIX_UX_VERDICT_MICROCOPY_INPUT_STRUCTURE'],
  UX_MICROCOPY_CATALOG_REQUIRED: ['DECLARE_VERDICT_MICROCOPY_CATALOG'],
  UX_MICROCOPY_MISSING_VERDICT_ENTRY: ['ADD_MISSING_PASS_CONCERNS_FAIL_MICROCOPY_ENTRIES'],
  UX_MICROCOPY_ENTRY_INCOMPLETE: ['COMPLETE_VERDICT_MICROCOPY_FIELDS_AND_STATES'],
  UX_MICROCOPY_KEYBOARD_FLOW_REQUIRED: ['RESTORE_KEYBOARD_NAVIGATION_WITH_VISIBLE_FOCUS'],
  UX_MICROCOPY_DECISION_BUDGET_EXCEEDED: ['OPTIMIZE_PER01_DECISION_PATH_UNDER_90S'],
  UX_MICROCOPY_TTFV_EXCEEDED: ['REDUCE_TIME_TO_FIRST_VALUE_UNDER_14_DAYS']
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

function normalizeVerdictList(value) {
  if (!Array.isArray(value)) {
    return cloneValue(DEFAULT_REQUIRED_VERDICTS);
  }

  const output = [];
  const seen = new Set();

  for (const verdict of value) {
    const normalized = normalizeText(String(verdict ?? '')).toUpperCase();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(normalized);
  }

  return output.length > 0 ? output : cloneValue(DEFAULT_REQUIRED_VERDICTS);
}

function normalizeStateList(value) {
  if (!Array.isArray(value)) {
    return cloneValue(DEFAULT_REQUIRED_STATES);
  }

  const output = [];
  const seen = new Set();

  for (const state of value) {
    const normalized = normalizeText(String(state ?? '')).toLowerCase();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(normalized);
  }

  return output.length > 0 ? output : cloneValue(DEFAULT_REQUIRED_STATES);
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const output = [];
  const seen = new Set();

  for (const entry of value) {
    const normalized = normalizeText(String(entry ?? ''));

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}

function readStateCopy(stateValue) {
  if (typeof stateValue === 'string') {
    return normalizeText(stateValue);
  }

  if (isObject(stateValue)) {
    return normalizeText(String(stateValue.copy ?? stateValue.label ?? stateValue.text ?? ''));
  }

  return '';
}

function resolveRules(payload, runtimeOptions) {
  const source =
    (isObject(runtimeOptions.microcopyCatalogRules) && runtimeOptions.microcopyCatalogRules) ||
    (isObject(payload.microcopyCatalogRules) && payload.microcopyCatalogRules) ||
    {};

  return {
    modelVersion:
      normalizeText(String(source.modelVersion ?? payload.microcopyCatalogModelVersion ?? 'S069-v1')) ||
      'S069-v1',
    requiredVerdicts: normalizeVerdictList(
      source.requiredVerdicts ?? payload.requiredVerdicts ?? runtimeOptions.requiredVerdicts
    ),
    requiredStates: normalizeStateList(
      source.requiredStates ?? payload.requiredStates ?? runtimeOptions.requiredStates
    ),
    decisionTimeBudgetSec: Math.max(
      1,
      normalizeNumber(
        source.decisionTimeBudgetSec ??
          payload.decisionTimeBudgetSec ??
          payload.designTokenPolicy?.decisionTimeBudgetSec ??
          runtimeOptions.decisionTimeBudgetSec ??
          DEFAULT_DECISION_TIME_BUDGET_SEC,
        DEFAULT_DECISION_TIME_BUDGET_SEC
      )
    ),
    ttfvMaxDays: Math.max(
      1,
      normalizeNumber(
        source.ttfvMaxDays ??
          payload.ttfvMaxDays ??
          runtimeOptions.ttfvMaxDays ??
          DEFAULT_TTFV_MAX_DAYS,
        DEFAULT_TTFV_MAX_DAYS
      )
    ),
    requireKeyboardFlow:
      source.requireKeyboardFlow !== false &&
      payload.requireKeyboardFlow !== false &&
      runtimeOptions.requireKeyboardFlow !== false
  };
}

function resolveCatalogEntries(payload, rules) {
  const source = Array.isArray(payload.microcopyCatalog)
    ? payload.microcopyCatalog
    : Array.isArray(payload.verdictMicrocopyCatalog)
      ? payload.verdictMicrocopyCatalog
      : Array.isArray(payload.copyCatalog)
        ? payload.copyCatalog
        : [];

  if (source.length === 0) {
    return {
      valid: false,
      reasonCode: 'UX_MICROCOPY_CATALOG_REQUIRED',
      reason: 'Catalogue microcopie PASS/CONCERNS/FAIL absent pour S069.'
    };
  }

  const entries = [];
  const byVerdict = new Map();

  for (let index = 0; index < source.length; index += 1) {
    const entry = source[index];

    if (!isObject(entry)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_VERDICT_MICROCOPY_INPUT',
        reason: `microcopyCatalog[${index}] invalide: objet requis.`
      };
    }

    const verdict = normalizeText(String(entry.verdict ?? entry.status ?? entry.id ?? '')).toUpperCase();

    if (!verdict) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_VERDICT_MICROCOPY_INPUT',
        reason: `microcopyCatalog[${index}] sans verdict.`
      };
    }

    if (byVerdict.has(verdict)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_VERDICT_MICROCOPY_INPUT',
        reason: `Entrée microcopie dupliquée pour verdict=${verdict}.`
      };
    }

    const title = normalizeText(String(entry.title ?? entry.label ?? ''));
    const helperText = normalizeText(String(entry.helperText ?? entry.description ?? entry.body ?? ''));
    const actionLabel = normalizeText(String(entry.actionLabel ?? entry.cta ?? entry.primaryAction ?? ''));

    const statesSource = isObject(entry.states) ? entry.states : {};
    const states = {};
    const missingStates = [];

    for (const stateName of rules.requiredStates) {
      const copy = readStateCopy(statesSource[stateName]);
      states[stateName] = copy;

      if (!copy) {
        missingStates.push(stateName);
      }
    }

    const keyboardSource = isObject(entry.keyboardFlow)
      ? entry.keyboardFlow
      : isObject(entry.keyboard)
        ? entry.keyboard
        : {};

    const focusOrder = normalizeStringList(keyboardSource.focusOrder);

    const keyboardFlow = {
      focusOrder,
      focusVisible: keyboardSource.focusVisible === true,
      logicalOrder: keyboardSource.logicalOrder === true,
      trapFree: keyboardSource.trapFree === true
    };

    const keyboardValid =
      focusOrder.length > 0 &&
      keyboardFlow.focusVisible &&
      keyboardFlow.logicalOrder &&
      keyboardFlow.trapFree;

    const decisionTimeSec = normalizeNumber(
      entry.decisionTimeSec ?? entry.per01DecisionTimeSec ?? entry.timeToDecisionSec
    );

    const ttfvDays = normalizeNumber(entry.ttfvDays ?? entry.timeToFirstValueDays ?? entry.ttfv?.days);

    const hasCoreCopy = Boolean(title) && Boolean(helperText) && Boolean(actionLabel);
    const hasMetrics = Number.isFinite(decisionTimeSec) && Number.isFinite(ttfvDays);

    const normalized = {
      verdict,
      title,
      helperText,
      actionLabel,
      tone: normalizeText(String(entry.tone ?? entry.intent ?? '')) || null,
      states,
      missingStates,
      keyboardFlow,
      keyboardValid,
      decisionTimeSec: Number.isFinite(decisionTimeSec) ? roundScore(decisionTimeSec) : null,
      ttfvDays: Number.isFinite(ttfvDays) ? roundScore(ttfvDays) : null,
      complete: hasCoreCopy && missingStates.length === 0 && hasMetrics,
      withinDecisionBudget:
        Number.isFinite(decisionTimeSec) && Number(decisionTimeSec) <= rules.decisionTimeBudgetSec,
      withinTtfvThreshold: Number.isFinite(ttfvDays) && Number(ttfvDays) <= rules.ttfvMaxDays
    };

    byVerdict.set(verdict, normalized);
    entries.push(normalized);
  }

  return {
    valid: true,
    entries,
    byVerdict
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
  verdictMicrocopyCatalog,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode: normalizeText(String(reasonCode || 'INVALID_UX_VERDICT_MICROCOPY_INPUT')),
    reason,
    diagnostics: cloneValue(diagnostics ?? {}),
    uxAudit: cloneValue(uxAudit ?? null),
    criticalWidgetStateContract: cloneValue(criticalWidgetStateContract ?? null),
    uxDebtReductionLane: cloneValue(uxDebtReductionLane ?? null),
    contextualGlossaryIntegration: cloneValue(contextualGlossaryIntegration ?? null),
    designTokenRogueLint: cloneValue(designTokenRogueLint ?? null),
    verdictMicrocopyCatalog: cloneValue(verdictMicrocopyCatalog ?? null),
    correctiveActions: normalizeActions(correctiveActions, reasonCode)
  };
}

export function buildUxVerdictMicrocopyCatalog(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_UX_VERDICT_MICROCOPY_INPUT',
      reason: 'Entrée S069 invalide: objet requis.'
    });
  }

  const baseResult = buildUxDesignTokenRogueLint(payload, runtimeOptions);

  if (!baseResult.allowed) {
    return createResult({
      allowed: false,
      reasonCode: baseResult.reasonCode,
      reason: baseResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        microcopyCatalogModelVersion: 'S069-v1'
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: null,
      correctiveActions: baseResult.correctiveActions
    });
  }

  const rules = resolveRules(payload, runtimeOptions);
  const catalogResult = resolveCatalogEntries(payload, rules);

  if (!catalogResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: catalogResult.reasonCode,
      reason: catalogResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        microcopyCatalogModelVersion: rules.modelVersion
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: null
    });
  }

  const entries = catalogResult.entries;

  const missingVerdicts = rules.requiredVerdicts.filter((verdict) => !catalogResult.byVerdict.has(verdict));
  const incompleteEntries = entries
    .filter((entry) => entry.complete === false)
    .map((entry) => ({
      verdict: entry.verdict,
      missingStates: entry.missingStates,
      hasTitle: Boolean(entry.title),
      hasHelperText: Boolean(entry.helperText),
      hasActionLabel: Boolean(entry.actionLabel),
      hasDecisionTimeSec: Number.isFinite(Number(entry.decisionTimeSec)),
      hasTtfvDays: Number.isFinite(Number(entry.ttfvDays))
    }));

  const keyboardGaps = entries
    .filter((entry) => entry.keyboardValid === false)
    .map((entry) => ({
      verdict: entry.verdict,
      focusOrder: entry.keyboardFlow.focusOrder,
      focusVisible: entry.keyboardFlow.focusVisible,
      logicalOrder: entry.keyboardFlow.logicalOrder,
      trapFree: entry.keyboardFlow.trapFree
    }));

  const budgetExceeded = entries
    .filter((entry) => entry.withinDecisionBudget === false)
    .map((entry) => ({
      verdict: entry.verdict,
      decisionTimeSec: entry.decisionTimeSec
    }));

  const ttfvExceeded = entries
    .filter((entry) => entry.withinTtfvThreshold === false)
    .map((entry) => ({
      verdict: entry.verdict,
      ttfvDays: entry.ttfvDays
    }));

  const stateSlots = entries.length * rules.requiredStates.length;
  const stateCopies = entries.reduce((count, entry) => {
    return (
      count +
      rules.requiredStates.filter((stateName) => {
        return normalizeText(String(entry.states[stateName] ?? '')).length > 0;
      }).length
    );
  }, 0);

  const keyboardReadyCount = entries.filter((entry) => entry.keyboardValid).length;
  const completeEntryCount = entries.filter((entry) => entry.complete).length;
  const decisionSamples = entries
    .map((entry) => Number(entry.decisionTimeSec))
    .filter((value) => Number.isFinite(value));
  const ttfvSamples = entries
    .map((entry) => Number(entry.ttfvDays))
    .filter((value) => Number.isFinite(value));

  const verdictMicrocopyCatalog = {
    model: 'UX_VERDICT_MICROCOPY_CATALOG',
    modelVersion: rules.modelVersion,
    generatedAt: toIso(Number.isFinite(Number(runtimeOptions.nowMs)) ? Number(runtimeOptions.nowMs) : Date.now()),
    thresholds: {
      requiredVerdicts: cloneValue(rules.requiredVerdicts),
      requiredStates: cloneValue(rules.requiredStates),
      decisionTimeBudgetSec: rules.decisionTimeBudgetSec,
      ttfvMaxDays: rules.ttfvMaxDays,
      requireKeyboardFlow: rules.requireKeyboardFlow
    },
    entries,
    summary: {
      entryCount: entries.length,
      coveredVerdicts: entries.map((entry) => entry.verdict),
      missingVerdicts,
      completeEntryCount,
      keyboardReadyCount,
      stateCoveragePct: stateSlots === 0 ? 0 : roundScore((stateCopies / stateSlots) * 100),
      keyboardFlowCoveragePct:
        entries.length === 0 ? 0 : roundScore((keyboardReadyCount / entries.length) * 100),
      worstDecisionTimeSec: decisionSamples.length > 0 ? roundScore(Math.max(...decisionSamples)) : null,
      maxTtfvDays: ttfvSamples.length > 0 ? roundScore(Math.max(...ttfvSamples)) : null,
      withinDecisionBudget: budgetExceeded.length === 0,
      withinTtfvThreshold: ttfvExceeded.length === 0
    }
  };

  const diagnostics = {
    ...baseResult.diagnostics,
    microcopyCatalogModelVersion: rules.modelVersion,
    requiredVerdicts: cloneValue(rules.requiredVerdicts),
    requiredStates: cloneValue(rules.requiredStates),
    missingVerdicts,
    incompleteEntryCount: incompleteEntries.length,
    keyboardGapCount: keyboardGaps.length,
    decisionBudgetExceededCount: budgetExceeded.length,
    ttfvExceededCount: ttfvExceeded.length,
    decisionTimeBudgetSec: rules.decisionTimeBudgetSec,
    ttfvMaxDays: rules.ttfvMaxDays
  };

  if (missingVerdicts.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_MICROCOPY_MISSING_VERDICT_ENTRY',
      reason: `Catalogue microcopie incomplet: verdict(s) manquant(s): ${missingVerdicts.join(', ')}.`,
      diagnostics,
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog
    });
  }

  if (incompleteEntries.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_MICROCOPY_ENTRY_INCOMPLETE',
      reason: `Catalogue microcopie incomplet pour ${incompleteEntries.length} verdict(s).`,
      diagnostics: {
        ...diagnostics,
        incompleteEntries
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog
    });
  }

  if (rules.requireKeyboardFlow && keyboardGaps.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_MICROCOPY_KEYBOARD_FLOW_REQUIRED',
      reason: 'FR-064 non satisfait: navigation clavier/focus visible/logique incomplète.',
      diagnostics: {
        ...diagnostics,
        keyboardGaps
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog
    });
  }

  if (budgetExceeded.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_MICROCOPY_DECISION_BUDGET_EXCEEDED',
      reason: `NFR-033 non satisfait: décision critique > ${rules.decisionTimeBudgetSec}s.`,
      diagnostics: {
        ...diagnostics,
        budgetExceeded
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog
    });
  }

  if (ttfvExceeded.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_MICROCOPY_TTFV_EXCEEDED',
      reason: `NFR-040 non satisfait: time-to-first-value > ${rules.ttfvMaxDays} jours.`,
      diagnostics: {
        ...diagnostics,
        ttfvExceeded
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason:
      'Catalogue microcopie PASS/CONCERNS/FAIL complet, clavier valide, décision < 90s et TTFV < 14 jours.',
    diagnostics,
    uxAudit: baseResult.uxAudit,
    criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
    uxDebtReductionLane: baseResult.uxDebtReductionLane,
    contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
    designTokenRogueLint: baseResult.designTokenRogueLint,
    verdictMicrocopyCatalog,
    correctiveActions: []
  });
}
