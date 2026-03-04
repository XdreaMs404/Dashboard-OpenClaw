import { buildUxWcagContrastConformity } from './ux-wcag-contrast-conformity.js';

const DEFAULT_REQUIRED_WIDTHS = Object.freeze([360, 768, 1366, 1920]);
const DEFAULT_DECISION_TIME_BUDGET_SEC = 90;
const DEFAULT_REQUIRED_G4_SUBGATE = 'G4-UX';

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_UX_RESPONSIVE_DECISION_INPUT: ['FIX_UX_RESPONSIVE_DECISION_INPUT_STRUCTURE'],
  UX_RESPONSIVE_PROOFS_REQUIRED: ['DECLARE_RESPONSIVE_DECISION_PROOFS_FOR_ALL_WIDTHS'],
  UX_RESPONSIVE_VIEWPORT_REQUIRED: ['ADD_MISSING_RESPONSIVE_WIDTH_PROOFS'],
  UX_RESPONSIVE_DECISION_INCOMPLETE: ['RESTORE_RESPONSIVE_DECISION_FLOW_COMPLETENESS'],
  UX_G4_UX_EVIDENCE_LINK_REQUIRED: ['LINK_CAPTURE_AND_VERDICT_TO_G4_UX_SUBGATE'],
  UX_DECISION_TIME_BUDGET_EXCEEDED: ['OPTIMIZE_RESPONSIVE_DECISION_PATH_UNDER_90S']
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

function normalizeRequiredWidths(value) {
  if (!Array.isArray(value)) {
    return cloneValue(DEFAULT_REQUIRED_WIDTHS);
  }

  const output = [];
  const seen = new Set();

  for (const width of value) {
    const normalized = Math.trunc(normalizeNumber(width, Number.NaN));

    if (!Number.isFinite(normalized) || normalized <= 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(normalized);
  }

  return output.length > 0 ? output : cloneValue(DEFAULT_REQUIRED_WIDTHS);
}

function resolveRules(payload, runtimeOptions) {
  const source =
    (isObject(runtimeOptions.responsiveDecisionRules) && runtimeOptions.responsiveDecisionRules) ||
    (isObject(payload.responsiveDecisionRules) && payload.responsiveDecisionRules) ||
    {};

  return {
    modelVersion:
      normalizeText(String(source.modelVersion ?? payload.responsiveDecisionModelVersion ?? 'S064-v1')) ||
      'S064-v1',
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
    requiredWidths: normalizeRequiredWidths(
      source.requiredWidths ?? payload.requiredWidths ?? runtimeOptions.requiredWidths
    ),
    requiredG4Subgate:
      normalizeText(
        String(
          source.requiredG4Subgate ??
            payload.requiredG4Subgate ??
            runtimeOptions.requiredG4Subgate ??
            DEFAULT_REQUIRED_G4_SUBGATE
        )
      ) || DEFAULT_REQUIRED_G4_SUBGATE
  };
}

function resolveResponsiveProofEntries(payload) {
  const source = Array.isArray(payload.responsiveDecisionProofs)
    ? payload.responsiveDecisionProofs
    : Array.isArray(payload.responsiveDecisionContinuity)
      ? payload.responsiveDecisionContinuity
      : Array.isArray(payload.responsiveEvidence)
        ? payload.responsiveEvidence
        : [];

  if (source.length === 0) {
    return {
      valid: false,
      reasonCode: 'UX_RESPONSIVE_PROOFS_REQUIRED',
      reason: 'FR-066 non satisfait: preuves responsive décisionnelles absentes.'
    };
  }

  const byWidth = new Map();

  for (let index = 0; index < source.length; index += 1) {
    const entry = source[index];

    if (!isObject(entry)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_RESPONSIVE_DECISION_INPUT',
        reason: `responsiveDecisionProofs[${index}] invalide: objet requis.`
      };
    }

    const width = Math.trunc(
      normalizeNumber(entry.viewportWidth ?? entry.width ?? entry.viewport?.width, Number.NaN)
    );

    if (!Number.isFinite(width) || width <= 0) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_RESPONSIVE_DECISION_INPUT',
        reason: `responsiveDecisionProofs[${index}] sans viewportWidth valide.`
      };
    }

    if (byWidth.has(width)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_RESPONSIVE_DECISION_INPUT',
        reason: `responsiveDecisionProofs dupliqué pour viewportWidth=${width}.`
      };
    }

    const decisionTimeSec = normalizeNumber(
      entry.decisionTimeSec ?? entry.timeToDecisionSec ?? entry.criticalDecisionTimeSec,
      Number.NaN
    );

    byWidth.set(width, {
      width,
      viewport: normalizeText(String(entry.viewport ?? entry.name ?? `${width}px`)).toLowerCase() || `${width}px`,
      decisionTimeSec: Number.isFinite(decisionTimeSec) ? roundScore(decisionTimeSec) : null,
      criticalFlowValidated:
        entry.criticalFlowValidated === true ||
        entry.decisionFlowValidated === true ||
        entry.criticalDecisionFlowValidated === true,
      keyboardValidated:
        entry.keyboardValidated === true ||
        entry.keyboardNavigationValidated === true ||
        entry.keyboardOnly === true,
      focusVisibleValidated:
        entry.focusVisibleValidated === true ||
        entry.focusRingValidated === true,
      noHorizontalOverflow:
        entry.noHorizontalOverflow === true ||
        entry.horizontalOverflowPx === 0 ||
        entry.horizontalOverflow === false,
      captureRef:
        normalizeText(String(entry.captureRef ?? entry.screenshotRef ?? entry.evidenceRef ?? '')) || null,
      g4UxVerdictRef:
        normalizeText(String(entry.g4UxVerdictRef ?? entry.verdictRef ?? entry.uxVerdictRef ?? '')) || null,
      g4UxSubgate:
        normalizeText(String(entry.g4UxSubgate ?? entry.subgate ?? DEFAULT_REQUIRED_G4_SUBGATE)) ||
        DEFAULT_REQUIRED_G4_SUBGATE
    });
  }

  return {
    valid: true,
    byWidth
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
  responsiveDecisionContinuityContract,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode: normalizeText(String(reasonCode || 'INVALID_UX_RESPONSIVE_DECISION_INPUT')),
    reason,
    diagnostics: cloneValue(diagnostics ?? {}),
    uxAudit: cloneValue(uxAudit ?? null),
    criticalWidgetStateContract: cloneValue(criticalWidgetStateContract ?? null),
    keyboardFocusVisibilityContract: cloneValue(keyboardFocusVisibilityContract ?? null),
    wcagContrastConformity: cloneValue(wcagContrastConformity ?? null),
    responsiveDecisionContinuityContract: cloneValue(responsiveDecisionContinuityContract ?? null),
    correctiveActions: normalizeActions(correctiveActions, reasonCode)
  };
}

export function buildUxResponsiveDecisionContinuityContract(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_UX_RESPONSIVE_DECISION_INPUT',
      reason: 'Entrée S064 invalide: objet requis.'
    });
  }

  const rules = resolveRules(payload, runtimeOptions);

  const baseResult = buildUxWcagContrastConformity(payload, runtimeOptions);

  if (!baseResult.allowed) {
    return createResult({
      allowed: false,
      reasonCode: baseResult.reasonCode,
      reason: baseResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        responsiveDecisionModelVersion: rules.modelVersion
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      keyboardFocusVisibilityContract: baseResult.keyboardFocusVisibilityContract,
      wcagContrastConformity: baseResult.wcagContrastConformity,
      responsiveDecisionContinuityContract: null,
      correctiveActions: baseResult.correctiveActions
    });
  }

  const entriesResult = resolveResponsiveProofEntries(payload);

  if (!entriesResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: entriesResult.reasonCode,
      reason: entriesResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        responsiveDecisionModelVersion: rules.modelVersion,
        requiredWidths: cloneValue(rules.requiredWidths)
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      keyboardFocusVisibilityContract: baseResult.keyboardFocusVisibilityContract,
      wcagContrastConformity: baseResult.wcagContrastConformity,
      responsiveDecisionContinuityContract: null
    });
  }

  const proofs = [];
  const missingWidths = [];

  for (const width of rules.requiredWidths) {
    const entry = entriesResult.byWidth.get(width);

    if (!entry) {
      missingWidths.push(width);
      continue;
    }

    const complete =
      Number.isFinite(Number(entry.decisionTimeSec)) &&
      entry.criticalFlowValidated &&
      entry.keyboardValidated &&
      entry.focusVisibleValidated &&
      entry.noHorizontalOverflow;

    const linkedToG4Ux =
      Boolean(entry.captureRef) &&
      Boolean(entry.g4UxVerdictRef) &&
      normalizeText(entry.g4UxSubgate) === rules.requiredG4Subgate;

    proofs.push({
      ...entry,
      complete,
      linkedToG4Ux,
      withinDecisionBudget:
        Number.isFinite(Number(entry.decisionTimeSec)) &&
        Number(entry.decisionTimeSec) <= rules.decisionTimeBudgetSec
    });
  }

  const completeCount = proofs.filter((entry) => entry.complete).length;
  const linkedEvidenceCount = proofs.filter((entry) => entry.linkedToG4Ux).length;
  const continuityCoveragePct =
    rules.requiredWidths.length === 0
      ? 0
      : roundScore((completeCount / rules.requiredWidths.length) * 100);

  const decisionSamples = proofs
    .map((entry) => Number(entry.decisionTimeSec))
    .filter((value) => Number.isFinite(value));

  const worstDecisionTimeSec = decisionSamples.length > 0 ? roundScore(Math.max(...decisionSamples)) : null;
  const averageDecisionTimeSec =
    decisionSamples.length > 0
      ? roundScore(decisionSamples.reduce((sum, value) => sum + value, 0) / decisionSamples.length)
      : null;

  const incompleteProofs = proofs
    .filter((entry) => entry.complete === false)
    .map((entry) => ({
      width: entry.width,
      decisionTimeSec: entry.decisionTimeSec,
      criticalFlowValidated: entry.criticalFlowValidated,
      keyboardValidated: entry.keyboardValidated,
      focusVisibleValidated: entry.focusVisibleValidated,
      noHorizontalOverflow: entry.noHorizontalOverflow
    }));

  const missingEvidenceLinks = proofs
    .filter((entry) => entry.linkedToG4Ux === false)
    .map((entry) => ({
      width: entry.width,
      captureRef: entry.captureRef,
      g4UxVerdictRef: entry.g4UxVerdictRef,
      g4UxSubgate: entry.g4UxSubgate
    }));

  const budgetExceededProofs = proofs
    .filter((entry) => entry.withinDecisionBudget === false)
    .map((entry) => ({ width: entry.width, decisionTimeSec: entry.decisionTimeSec }));

  const nowMs = Number.isFinite(Number(runtimeOptions.nowMs))
    ? Number(runtimeOptions.nowMs)
    : Date.now();

  const responsiveDecisionContinuityContract = {
    model: 'UX_RESPONSIVE_DECISION_CONTINUITY_CONTRACT',
    modelVersion: rules.modelVersion,
    generatedAt: toIso(nowMs),
    thresholds: {
      requiredWidths: cloneValue(rules.requiredWidths),
      decisionTimeBudgetSec: rules.decisionTimeBudgetSec,
      requiredG4Subgate: rules.requiredG4Subgate
    },
    summary: {
      proofCount: proofs.length,
      completeCount,
      linkedEvidenceCount,
      continuityCoveragePct,
      worstDecisionTimeSec,
      averageDecisionTimeSec,
      withinDecisionBudget: budgetExceededProofs.length === 0
    },
    proofs
  };

  const diagnostics = {
    ...baseResult.diagnostics,
    responsiveDecisionModelVersion: rules.modelVersion,
    requiredWidths: cloneValue(rules.requiredWidths),
    decisionTimeBudgetSec: rules.decisionTimeBudgetSec,
    continuityCoveragePct,
    completeCount,
    linkedEvidenceCount,
    worstDecisionTimeSec
  };

  if (missingWidths.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_RESPONSIVE_VIEWPORT_REQUIRED',
      reason: `FR-066 non satisfait: viewport(s) responsive manquant(s): ${missingWidths.join(', ')}.`,
      diagnostics: {
        ...diagnostics,
        missingWidths
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      keyboardFocusVisibilityContract: baseResult.keyboardFocusVisibilityContract,
      wcagContrastConformity: baseResult.wcagContrastConformity,
      responsiveDecisionContinuityContract
    });
  }

  if (incompleteProofs.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_RESPONSIVE_DECISION_INCOMPLETE',
      reason: `FR-066 non satisfait: preuves responsive incomplètes (${incompleteProofs.length}).`,
      diagnostics: {
        ...diagnostics,
        incompleteProofs
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      keyboardFocusVisibilityContract: baseResult.keyboardFocusVisibilityContract,
      wcagContrastConformity: baseResult.wcagContrastConformity,
      responsiveDecisionContinuityContract
    });
  }

  if (missingEvidenceLinks.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_G4_UX_EVIDENCE_LINK_REQUIRED',
      reason:
        'FR-067 non satisfait: chaque preuve responsive doit lier capture + verdict vers la sous-gate G4-UX.',
      diagnostics: {
        ...diagnostics,
        missingEvidenceLinks
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      keyboardFocusVisibilityContract: baseResult.keyboardFocusVisibilityContract,
      wcagContrastConformity: baseResult.wcagContrastConformity,
      responsiveDecisionContinuityContract
    });
  }

  if (budgetExceededProofs.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_DECISION_TIME_BUDGET_EXCEEDED',
      reason: `NFR-033 non satisfait: décision > ${rules.decisionTimeBudgetSec}s (${budgetExceededProofs
        .map((entry) => `${entry.width}px:${entry.decisionTimeSec}s`)
        .join(', ')}).`,
      diagnostics: {
        ...diagnostics,
        budgetExceededProofs
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      keyboardFocusVisibilityContract: baseResult.keyboardFocusVisibilityContract,
      wcagContrastConformity: baseResult.wcagContrastConformity,
      responsiveDecisionContinuityContract
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason:
      'Responsive 360/768/1366/1920 validé sans perte décisionnelle, avec liens capture/verdict vers G4-UX.',
    diagnostics,
    uxAudit: baseResult.uxAudit,
    criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
    keyboardFocusVisibilityContract: baseResult.keyboardFocusVisibilityContract,
    wcagContrastConformity: baseResult.wcagContrastConformity,
    responsiveDecisionContinuityContract,
    correctiveActions: []
  });
}
