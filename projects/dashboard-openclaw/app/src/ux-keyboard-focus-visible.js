import { buildUxCriticalWidgetStateContract } from './ux-critical-widget-state-contract.js';

const DEFAULT_MIN_CONTRAST_RATIO = 4.5;
const DEFAULT_MIN_CONTRAST_RATIO_LARGE = 3;
const DEFAULT_REQUIRED_VIEWPORTS = Object.freeze(['mobile', 'tablet', 'desktop']);

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_UX_KEYBOARD_FOCUS_INPUT: ['FIX_UX_KEYBOARD_FOCUS_INPUT_STRUCTURE'],
  UX_KEYBOARD_JOURNEY_REQUIRED: ['DEFINE_KEYBOARD_JOURNEYS_WITH_LOGICAL_ORDER'],
  UX_KEYBOARD_JOURNEY_INCOMPLETE: ['RESTORE_FOCUS_VISIBLE_AND_TRAP_FREE_NAVIGATION'],
  UX_CONTRAST_AUDIT_REQUIRED: ['ADD_WCAG_CONTRAST_AUDIT_SURFACES'],
  UX_CONTRAST_WCAG_VIOLATION: ['RAISE_CONTRAST_TO_WCAG_2_2_AA'],
  UX_RESPONSIVE_JOURNEY_REQUIRED: ['ADD_RESPONSIVE_MOBILE_TABLET_DESKTOP_PROOFS']
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

function normalizeViewports(value) {
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

function resolveRules(payload, runtimeOptions) {
  const source =
    (isObject(runtimeOptions.keyboardFocusRules) && runtimeOptions.keyboardFocusRules) ||
    (isObject(payload.keyboardFocusRules) && payload.keyboardFocusRules) ||
    {};

  return {
    modelVersion:
      normalizeText(String(source.modelVersion ?? payload.keyboardFocusModelVersion ?? 'S062-v1')) ||
      'S062-v1',
    minContrastRatio: Math.max(
      1,
      normalizeNumber(
        source.minContrastRatio ?? payload.minContrastRatio ?? runtimeOptions.minContrastRatio ?? DEFAULT_MIN_CONTRAST_RATIO,
        DEFAULT_MIN_CONTRAST_RATIO
      )
    ),
    minContrastRatioLarge: Math.max(
      1,
      normalizeNumber(
        source.minContrastRatioLarge ??
          payload.minContrastRatioLarge ??
          runtimeOptions.minContrastRatioLarge ??
          DEFAULT_MIN_CONTRAST_RATIO_LARGE,
        DEFAULT_MIN_CONTRAST_RATIO_LARGE
      )
    ),
    requiredViewports: normalizeViewports(
      source.requiredViewports ?? payload.requiredViewports ?? runtimeOptions.requiredViewports
    )
  };
}

function resolveJourneys(payload) {
  const source = Array.isArray(payload.keyboardJourneys)
    ? payload.keyboardJourneys
    : Array.isArray(payload.navigationJourneys)
      ? payload.navigationJourneys
      : [];

  const journeys = [];

  for (let index = 0; index < source.length; index += 1) {
    const journey = source[index];

    if (!isObject(journey)) {
      return {
        valid: false,
        reason: `keyboardJourneys[${index}] invalide: objet requis.`
      };
    }

    const id = normalizeText(String(journey.id ?? `JOURNEY-${index + 1}`)) || `JOURNEY-${index + 1}`;
    const label = normalizeText(String(journey.label ?? id)) || id;
    const stepsSource = Array.isArray(journey.steps) ? journey.steps : [];

    if (stepsSource.length < 2) {
      return {
        valid: false,
        reason: `${id}: au moins 2 étapes clavier requises.`
      };
    }

    const steps = [];

    for (let stepIndex = 0; stepIndex < stepsSource.length; stepIndex += 1) {
      const step = stepsSource[stepIndex];
      const target = normalizeText(String(step?.target ?? step?.id ?? ''));

      if (!target) {
        return {
          valid: false,
          reason: `${id}: step[${stepIndex}] sans target.`
        };
      }

      steps.push({
        target,
        focusVisible: step?.focusVisible !== false,
        order: Number.isFinite(Number(step?.order)) ? Number(step.order) : stepIndex + 1,
        action: normalizeText(String(step?.action ?? 'tab')) || 'tab'
      });
    }

    let ordered = true;

    for (let i = 1; i < steps.length; i += 1) {
      if (steps[i].order < steps[i - 1].order) {
        ordered = false;
        break;
      }
    }

    const focusVisible = steps.every((step) => step.focusVisible === true);
    const trapFree = journey.trapFree !== false;
    const keyboardOnly = journey.keyboardOnly !== false;
    const logicalOrder = journey.logicalOrder !== false && ordered;

    journeys.push({
      id,
      label,
      stepCount: steps.length,
      focusVisible,
      trapFree,
      keyboardOnly,
      logicalOrder,
      complete: focusVisible && trapFree && keyboardOnly && logicalOrder,
      steps
    });
  }

  return {
    valid: true,
    journeys
  };
}

function resolveContrastChecks(payload, rules) {
  const source = Array.isArray(payload.contrastChecks)
    ? payload.contrastChecks
    : Array.isArray(payload.colorContrastChecks)
      ? payload.colorContrastChecks
      : [];

  if (source.length === 0) {
    return {
      valid: false,
      reasonCode: 'UX_CONTRAST_AUDIT_REQUIRED',
      reason: 'FR-065 non satisfait: aucune surface de contraste auditée.'
    };
  }

  const surfaces = [];

  for (let index = 0; index < source.length; index += 1) {
    const surface = source[index];

    if (!isObject(surface)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_KEYBOARD_FOCUS_INPUT',
        reason: `contrastChecks[${index}] invalide: objet requis.`
      };
    }

    const id = normalizeText(String(surface.id ?? `SURFACE-${index + 1}`)) || `SURFACE-${index + 1}`;
    const ratio = roundScore(normalizeNumber(surface.ratio, Number.NaN));

    if (!Number.isFinite(ratio)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_KEYBOARD_FOCUS_INPUT',
        reason: `${id}: ratio de contraste invalide.`
      };
    }

    const isLargeText = surface.isLargeText === true;
    const requiredRatio = roundScore(
      normalizeNumber(
        surface.requiredRatio,
        isLargeText ? rules.minContrastRatioLarge : rules.minContrastRatio
      )
    );

    const pass = ratio >= requiredRatio;

    surfaces.push({
      id,
      ratio,
      requiredRatio,
      isLargeText,
      pass
    });
  }

  const failing = surfaces.filter((surface) => surface.pass === false);

  if (failing.length > 0) {
    return {
      valid: false,
      reasonCode: 'UX_CONTRAST_WCAG_VIOLATION',
      reason: `FR-065 non satisfait: ${failing.length} surface(s) sous le ratio WCAG requis.`,
      surfaces,
      failing
    };
  }

  return {
    valid: true,
    surfaces,
    passingCount: surfaces.length
  };
}

function resolveResponsiveChecks(payload, rules) {
  const source = Array.isArray(payload.responsiveChecks)
    ? payload.responsiveChecks
    : Array.isArray(payload.responsiveScenarios)
      ? payload.responsiveScenarios
      : [];

  const map = new Map();

  for (const entry of source) {
    const viewport = normalizeText(String(entry?.viewport ?? entry?.name ?? '')).toLowerCase();

    if (!viewport) {
      continue;
    }

    const pass =
      entry?.pass === true ||
      entry?.status === 'PASS' ||
      entry?.status === 'pass' ||
      entry?.status === 'ok' ||
      entry?.status === 'OK';

    map.set(viewport, {
      viewport,
      pass,
      evidenceRef: normalizeText(String(entry?.evidenceRef ?? entry?.screenshot ?? '')) || null
    });
  }

  const checks = rules.requiredViewports.map((viewport) => {
    const existing = map.get(viewport);

    if (existing) {
      return existing;
    }

    return {
      viewport,
      pass: false,
      evidenceRef: null
    };
  });

  const failing = checks.filter((entry) => entry.pass === false);

  if (failing.length > 0) {
    return {
      valid: false,
      reasonCode: 'UX_RESPONSIVE_JOURNEY_REQUIRED',
      reason: `NFR-032 non satisfait: viewport(s) non validé(s): ${failing
        .map((entry) => entry.viewport)
        .join(', ')}.`,
      checks,
      failing
    };
  }

  return {
    valid: true,
    checks
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  uxAudit,
  criticalWidgetStateContract,
  keyboardFocusVisibleContract,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode: normalizeText(String(reasonCode || 'INVALID_UX_KEYBOARD_FOCUS_INPUT')),
    reason,
    diagnostics: cloneValue(diagnostics ?? {}),
    uxAudit: cloneValue(uxAudit ?? null),
    criticalWidgetStateContract: cloneValue(criticalWidgetStateContract ?? null),
    keyboardFocusVisibleContract: cloneValue(keyboardFocusVisibleContract ?? null),
    correctiveActions: normalizeActions(correctiveActions, reasonCode)
  };
}

export function buildUxKeyboardFocusVisibleContract(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_UX_KEYBOARD_FOCUS_INPUT',
      reason: 'Entrée S062 invalide: objet requis.'
    });
  }

  const rules = resolveRules(payload, runtimeOptions);
  const baseResult = buildUxCriticalWidgetStateContract(payload, runtimeOptions);

  if (!baseResult.allowed) {
    return createResult({
      allowed: false,
      reasonCode: baseResult.reasonCode,
      reason: baseResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        keyboardFocusModelVersion: rules.modelVersion
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      keyboardFocusVisibleContract: null,
      correctiveActions: baseResult.correctiveActions
    });
  }

  const journeysResult = resolveJourneys(payload);

  if (!journeysResult.valid || journeysResult.journeys.length === 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_KEYBOARD_JOURNEY_REQUIRED',
      reason:
        journeysResult.reason ||
        'FR-064 non satisfait: parcours clavier définis avec ordre logique et focus visible requis.',
      diagnostics: {
        ...baseResult.diagnostics,
        keyboardFocusModelVersion: rules.modelVersion,
        keyboardJourneyCount: 0
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      keyboardFocusVisibleContract: null
    });
  }

  const incompleteJourneys = journeysResult.journeys.filter((journey) => journey.complete === false);

  const contrastResult = resolveContrastChecks(payload, rules);

  const responsiveResult = resolveResponsiveChecks(payload, rules);

  const contract = {
    model: 'UX_KEYBOARD_FOCUS_VISIBLE_CONTRACT',
    modelVersion: rules.modelVersion,
    generatedAt: toIso(Number.isFinite(Number(runtimeOptions.nowMs)) ? Number(runtimeOptions.nowMs) : Date.now()),
    thresholds: {
      minContrastRatio: rules.minContrastRatio,
      minContrastRatioLarge: rules.minContrastRatioLarge,
      requiredViewports: cloneValue(rules.requiredViewports)
    },
    journeys: journeysResult.journeys,
    contrastChecks: contrastResult.surfaces ?? [],
    responsiveChecks: responsiveResult.checks ?? [],
    summary: {
      journeyCount: journeysResult.journeys.length,
      journeyCompleteCount: journeysResult.journeys.filter((journey) => journey.complete).length,
      contrastPassingCount: Array.isArray(contrastResult.surfaces)
        ? contrastResult.surfaces.filter((surface) => surface.pass).length
        : 0,
      contrastTotalCount: Array.isArray(contrastResult.surfaces) ? contrastResult.surfaces.length : 0,
      responsivePassCount: Array.isArray(responsiveResult.checks)
        ? responsiveResult.checks.filter((check) => check.pass).length
        : 0,
      responsiveTotalCount: Array.isArray(responsiveResult.checks) ? responsiveResult.checks.length : 0
    }
  };

  const diagnostics = {
    ...baseResult.diagnostics,
    keyboardFocusModelVersion: rules.modelVersion,
    keyboardJourneyCount: journeysResult.journeys.length,
    keyboardJourneyCompleteCount: journeysResult.journeys.filter((journey) => journey.complete).length,
    contrastSurfaceCount: Array.isArray(contrastResult.surfaces) ? contrastResult.surfaces.length : 0,
    responsiveViewportCount: Array.isArray(responsiveResult.checks) ? responsiveResult.checks.length : 0
  };

  if (incompleteJourneys.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_KEYBOARD_JOURNEY_INCOMPLETE',
      reason: `FR-064 non satisfait: ${incompleteJourneys.length} parcours clavier incomplet(s).`,
      diagnostics: {
        ...diagnostics,
        keyboardJourneysIncomplete: incompleteJourneys.map((journey) => ({
          id: journey.id,
          focusVisible: journey.focusVisible,
          trapFree: journey.trapFree,
          keyboardOnly: journey.keyboardOnly,
          logicalOrder: journey.logicalOrder
        }))
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      keyboardFocusVisibleContract: contract
    });
  }

  if (!contrastResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: contrastResult.reasonCode,
      reason: contrastResult.reason,
      diagnostics: {
        ...diagnostics,
        contrastFailing: (contrastResult.failing ?? []).map((surface) => ({
          id: surface.id,
          ratio: surface.ratio,
          requiredRatio: surface.requiredRatio
        }))
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      keyboardFocusVisibleContract: contract
    });
  }

  if (!responsiveResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: responsiveResult.reasonCode,
      reason: responsiveResult.reason,
      diagnostics: {
        ...diagnostics,
        responsiveFailing: (responsiveResult.failing ?? []).map((entry) => entry.viewport)
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      keyboardFocusVisibleContract: contract
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: 'Navigation clavier complète, focus visible et conformité contraste validées.',
    diagnostics,
    uxAudit: baseResult.uxAudit,
    criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
    keyboardFocusVisibleContract: contract,
    correctiveActions: []
  });
}
