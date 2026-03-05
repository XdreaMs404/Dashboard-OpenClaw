import { buildUxVerdictMicrocopyCatalog } from './ux-verdict-microcopy-catalog.js';

const DEFAULT_REQUIRED_MODES = Object.freeze(['default', 'reduced']);
const DEFAULT_CONTRAST_RATIO_MIN = 4.5;
const DEFAULT_REDUCED_TRANSITION_MAX_MS = 120;
const DEFAULT_SCORE_MIN = 85;
const DEFAULT_BLOCKER_MAX = 0;
const DEFAULT_TTFV_MAX_DAYS = 14;

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_UX_MOTION_INPUT: ['FIX_UX_MOTION_INPUT_STRUCTURE'],
  UX_MOTION_PROFILES_REQUIRED: ['DECLARE_MOTION_PROFILES_FOR_DEFAULT_AND_REDUCED_MODES'],
  UX_MOTION_REQUIRED_MODE_MISSING: ['ADD_MISSING_REQUIRED_MOTION_MODE'],
  UX_MOTION_REDUCED_MODE_NON_COMPLIANT: ['DISABLE_NON_ESSENTIAL_ANIMATIONS_FOR_REDUCED_MODE'],
  UX_MOTION_KEYBOARD_ACCESS_REQUIRED: ['RESTORE_KEYBOARD_FLOW_AND_VISIBLE_FOCUS_WITH_MOTION_SETTINGS'],
  UX_MOTION_CONTRAST_AA_REQUIRED: ['RAISE_CONTRAST_TO_WCAG_AA_ON_CRITICAL_SURFACES'],
  UX_MOTION_QUALITY_SCORE_LOW: ['RAISE_UX_SCORE_TO_MINIMUM_THRESHOLD'],
  UX_MOTION_BLOCKERS_PRESENT: ['RESOLVE_ALL_UX_BLOCKERS_BEFORE_PROGRESSION'],
  UX_MOTION_TTFV_EXCEEDED: ['REDUCE_TIME_TO_FIRST_VALUE_UNDER_14_DAYS']
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

function normalizeModeList(value) {
  if (!Array.isArray(value)) {
    return cloneValue(DEFAULT_REQUIRED_MODES);
  }

  const output = [];
  const seen = new Set();

  for (const mode of value) {
    const normalized = normalizeText(String(mode ?? '')).toLowerCase();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(normalized);
  }

  return output.length > 0 ? output : cloneValue(DEFAULT_REQUIRED_MODES);
}

function resolveRules(payload, runtimeOptions) {
  const source =
    (isObject(runtimeOptions.motionPreferenceRules) && runtimeOptions.motionPreferenceRules) ||
    (isObject(payload.motionPreferenceRules) && payload.motionPreferenceRules) ||
    {};

  return {
    modelVersion:
      normalizeText(String(source.modelVersion ?? payload.motionPreferenceModelVersion ?? 'S070-v1')) ||
      'S070-v1',
    requiredModes: normalizeModeList(
      source.requiredModes ?? payload.requiredMotionModes ?? runtimeOptions.requiredModes
    ),
    contrastRatioMin: Math.max(
      1,
      normalizeNumber(
        source.contrastRatioMin ?? payload.contrastRatioMin ?? runtimeOptions.contrastRatioMin,
        DEFAULT_CONTRAST_RATIO_MIN
      )
    ),
    reducedTransitionMaxMs: Math.max(
      0,
      normalizeNumber(
        source.reducedTransitionMaxMs ??
          payload.reducedTransitionMaxMs ??
          runtimeOptions.reducedTransitionMaxMs,
        DEFAULT_REDUCED_TRANSITION_MAX_MS
      )
    ),
    scoreMin: Math.max(
      0,
      normalizeNumber(source.scoreMin ?? payload.scoreMin ?? runtimeOptions.scoreMin, DEFAULT_SCORE_MIN)
    ),
    blockerMax: Math.max(
      0,
      normalizeNumber(
        source.blockerMax ?? payload.blockerMax ?? runtimeOptions.blockerMax,
        DEFAULT_BLOCKER_MAX
      )
    ),
    ttfvMaxDays: Math.max(
      1,
      normalizeNumber(source.ttfvMaxDays ?? payload.ttfvMaxDays ?? runtimeOptions.ttfvMaxDays, DEFAULT_TTFV_MAX_DAYS)
    )
  };
}

function resolveMotionProfiles(payload) {
  const source = Array.isArray(payload.motionProfiles)
    ? payload.motionProfiles
    : Array.isArray(payload.prefersReducedMotionProfiles)
      ? payload.prefersReducedMotionProfiles
      : [];

  if (source.length === 0) {
    return {
      valid: false,
      reasonCode: 'UX_MOTION_PROFILES_REQUIRED',
      reason: 'Profils motion absents: modes default/reduced requis.'
    };
  }

  const byMode = new Map();
  const profiles = [];

  for (let index = 0; index < source.length; index += 1) {
    const entry = source[index];

    if (!isObject(entry)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_MOTION_INPUT',
        reason: `motionProfiles[${index}] invalide: objet requis.`
      };
    }

    const mode = normalizeText(String(entry.mode ?? entry.preference ?? entry.id ?? '')).toLowerCase();

    if (!mode) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_MOTION_INPUT',
        reason: `motionProfiles[${index}] sans mode.`
      };
    }

    if (byMode.has(mode)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_MOTION_INPUT',
        reason: `Mode motion dupliqué: ${mode}.`
      };
    }

    const transitionMs = normalizeNumber(entry.transitionMs ?? entry.motionDurationMs ?? entry.durationMs);

    const profile = {
      mode,
      transitionMs: Number.isFinite(transitionMs) ? roundScore(transitionMs) : null,
      autoplayEnabled:
        entry.autoplayEnabled === true || entry.autoAnimate === true || entry.autoPlay === true,
      parallaxEnabled: entry.parallaxEnabled === true || entry.parallax === true,
      respectReducedMotion:
        entry.respectReducedMotion === true || entry.respectsReducedMotion === true || mode !== 'reduced',
      focusVisibleMaintained:
        entry.focusVisibleMaintained === true || entry.focusVisible === true || entry.focusRingVisible === true,
      keyboardFlowValidated:
        entry.keyboardFlowValidated === true || entry.keyboardValidated === true || entry.keyboardNavigation === true,
      stateDurations: isObject(entry.stateDurations)
        ? {
            loadingMs: roundScore(normalizeNumber(entry.stateDurations.loadingMs ?? entry.stateDurations.loading, 0)),
            emptyMs: roundScore(normalizeNumber(entry.stateDurations.emptyMs ?? entry.stateDurations.empty, 0)),
            errorMs: roundScore(normalizeNumber(entry.stateDurations.errorMs ?? entry.stateDurations.error, 0)),
            successMs: roundScore(normalizeNumber(entry.stateDurations.successMs ?? entry.stateDurations.success, 0))
          }
        : {
            loadingMs: 0,
            emptyMs: 0,
            errorMs: 0,
            successMs: 0
          },
      evidenceRef: normalizeText(String(entry.evidenceRef ?? entry.captureRef ?? '')) || null
    };

    byMode.set(mode, profile);
    profiles.push(profile);
  }

  return {
    valid: true,
    profiles,
    byMode
  };
}

function resolveContrastChecks(payload, ratioMin) {
  const source = Array.isArray(payload.contrastChecks)
    ? payload.contrastChecks
    : Array.isArray(payload.motionContrastChecks)
      ? payload.motionContrastChecks
      : [];

  if (source.length === 0) {
    return {
      valid: false,
      reasonCode: 'UX_MOTION_CONTRAST_AA_REQUIRED',
      reason: 'Contrôles contraste absents pour surfaces critiques.'
    };
  }

  const checks = [];

  for (let index = 0; index < source.length; index += 1) {
    const entry = source[index];

    if (!isObject(entry)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_MOTION_INPUT',
        reason: `contrastChecks[${index}] invalide: objet requis.`
      };
    }

    const surfaceId =
      normalizeText(String(entry.surfaceId ?? entry.id ?? entry.surface ?? `surface-${index + 1}`)) ||
      `surface-${index + 1}`;

    const ratio = normalizeNumber(entry.ratio ?? entry.contrastRatio ?? entry.value);

    const aaPass =
      entry.aaPass === true ||
      entry.accessibilityAA === true ||
      entry.pass === true ||
      (Number.isFinite(ratio) && Number(ratio) >= ratioMin);

    checks.push({
      surfaceId,
      ratio: Number.isFinite(ratio) ? roundScore(ratio) : null,
      aaPass
    });
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
  uxDebtReductionLane,
  contextualGlossaryIntegration,
  designTokenRogueLint,
  verdictMicrocopyCatalog,
  motionPreferenceContract,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode: normalizeText(String(reasonCode || 'INVALID_UX_MOTION_INPUT')),
    reason,
    diagnostics: cloneValue(diagnostics ?? {}),
    uxAudit: cloneValue(uxAudit ?? null),
    criticalWidgetStateContract: cloneValue(criticalWidgetStateContract ?? null),
    uxDebtReductionLane: cloneValue(uxDebtReductionLane ?? null),
    contextualGlossaryIntegration: cloneValue(contextualGlossaryIntegration ?? null),
    designTokenRogueLint: cloneValue(designTokenRogueLint ?? null),
    verdictMicrocopyCatalog: cloneValue(verdictMicrocopyCatalog ?? null),
    motionPreferenceContract: cloneValue(motionPreferenceContract ?? null),
    correctiveActions: normalizeActions(correctiveActions, reasonCode)
  };
}

export function buildUxMotionPreferenceContract(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_UX_MOTION_INPUT',
      reason: 'Entrée S070 invalide: objet requis.'
    });
  }

  const baseResult = buildUxVerdictMicrocopyCatalog(payload, runtimeOptions);

  if (!baseResult.allowed) {
    return createResult({
      allowed: false,
      reasonCode: baseResult.reasonCode,
      reason: baseResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        motionPreferenceModelVersion: 'S070-v1'
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract: null,
      correctiveActions: baseResult.correctiveActions
    });
  }

  const rules = resolveRules(payload, runtimeOptions);

  const profileResult = resolveMotionProfiles(payload);

  if (!profileResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: profileResult.reasonCode,
      reason: profileResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        motionPreferenceModelVersion: rules.modelVersion
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract: null
    });
  }

  const contrastResult = resolveContrastChecks(payload, rules.contrastRatioMin);

  if (!contrastResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: contrastResult.reasonCode,
      reason: contrastResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        motionPreferenceModelVersion: rules.modelVersion
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract: null
    });
  }

  const missingModes = rules.requiredModes.filter((mode) => !profileResult.byMode.has(mode));

  const reducedProfile = profileResult.byMode.get('reduced') || null;

  const reducedNonCompliance = reducedProfile
    ? {
        autoplayEnabled: reducedProfile.autoplayEnabled,
        parallaxEnabled: reducedProfile.parallaxEnabled,
        respectReducedMotion: reducedProfile.respectReducedMotion,
        transitionMs: reducedProfile.transitionMs,
        exceedsTransitionLimit:
          Number.isFinite(Number(reducedProfile.transitionMs)) &&
          Number(reducedProfile.transitionMs) > rules.reducedTransitionMaxMs
      }
    : null;

  const keyboardGaps = profileResult.profiles
    .filter((profile) => profile.focusVisibleMaintained === false || profile.keyboardFlowValidated === false)
    .map((profile) => ({
      mode: profile.mode,
      focusVisibleMaintained: profile.focusVisibleMaintained,
      keyboardFlowValidated: profile.keyboardFlowValidated
    }));

  const contrastFailures = contrastResult.checks
    .filter((check) => check.aaPass === false)
    .map((check) => ({
      surfaceId: check.surfaceId,
      ratio: check.ratio
    }));

  const uxScore = normalizeNumber(baseResult.uxAudit?.score ?? payload.uxAudit?.score);
  const blockerCount = normalizeNumber(baseResult.uxAudit?.blockerCount ?? payload.uxAudit?.blockerCount);

  const maxTtfvDays = normalizeNumber(baseResult.verdictMicrocopyCatalog?.summary?.maxTtfvDays);

  const motionPreferenceContract = {
    model: 'UX_MOTION_PREFERENCE_CONTRACT',
    modelVersion: rules.modelVersion,
    generatedAt: toIso(Number.isFinite(Number(runtimeOptions.nowMs)) ? Number(runtimeOptions.nowMs) : Date.now()),
    thresholds: {
      requiredModes: cloneValue(rules.requiredModes),
      reducedTransitionMaxMs: rules.reducedTransitionMaxMs,
      contrastRatioMin: rules.contrastRatioMin,
      scoreMin: rules.scoreMin,
      blockerMax: rules.blockerMax,
      ttfvMaxDays: rules.ttfvMaxDays
    },
    motionProfiles: profileResult.profiles,
    contrastChecks: contrastResult.checks,
    summary: {
      profileCount: profileResult.profiles.length,
      missingModes,
      keyboardReadyCount: profileResult.profiles.filter(
        (profile) => profile.focusVisibleMaintained && profile.keyboardFlowValidated
      ).length,
      reducedModeCompliant:
        Boolean(reducedProfile) &&
        reducedProfile.autoplayEnabled === false &&
        reducedProfile.parallaxEnabled === false &&
        reducedProfile.respectReducedMotion === true &&
        (Number.isFinite(Number(reducedProfile.transitionMs))
          ? Number(reducedProfile.transitionMs) <= rules.reducedTransitionMaxMs
          : true),
      contrastPassCount: contrastResult.checks.filter((check) => check.aaPass).length,
      uxScore: Number.isFinite(uxScore) ? roundScore(uxScore) : null,
      blockerCount: Number.isFinite(blockerCount) ? blockerCount : null,
      maxTtfvDays: Number.isFinite(maxTtfvDays) ? roundScore(maxTtfvDays) : null
    }
  };

  const diagnostics = {
    ...baseResult.diagnostics,
    motionPreferenceModelVersion: rules.modelVersion,
    missingModes,
    keyboardGapCount: keyboardGaps.length,
    contrastFailureCount: contrastFailures.length,
    uxScore: Number.isFinite(uxScore) ? roundScore(uxScore) : null,
    blockerCount: Number.isFinite(blockerCount) ? blockerCount : null,
    maxTtfvDays: Number.isFinite(maxTtfvDays) ? roundScore(maxTtfvDays) : null,
    reducedTransitionMaxMs: rules.reducedTransitionMaxMs
  };

  if (missingModes.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_MOTION_REQUIRED_MODE_MISSING',
      reason: `Mode(s) motion manquant(s): ${missingModes.join(', ')}.`,
      diagnostics,
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract
    });
  }

  if (
    reducedProfile &&
    (reducedProfile.autoplayEnabled ||
      reducedProfile.parallaxEnabled ||
      reducedProfile.respectReducedMotion === false ||
      (Number.isFinite(Number(reducedProfile.transitionMs)) &&
        Number(reducedProfile.transitionMs) > rules.reducedTransitionMaxMs))
  ) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_MOTION_REDUCED_MODE_NON_COMPLIANT',
      reason: 'Mode reduced non conforme: animations non essentielles encore actives.',
      diagnostics: {
        ...diagnostics,
        reducedNonCompliance
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract
    });
  }

  if (keyboardGaps.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_MOTION_KEYBOARD_ACCESS_REQUIRED',
      reason: 'FR-064 non satisfait: navigation clavier/focus visible dégradée par la configuration motion.',
      diagnostics: {
        ...diagnostics,
        keyboardGaps
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract
    });
  }

  if (contrastFailures.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_MOTION_CONTRAST_AA_REQUIRED',
      reason: 'FR-065 non satisfait: contraste WCAG AA insuffisant sur surfaces critiques.',
      diagnostics: {
        ...diagnostics,
        contrastFailures
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract
    });
  }

  if (Number.isFinite(uxScore) && uxScore < rules.scoreMin) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_MOTION_QUALITY_SCORE_LOW',
      reason: `NFR-030 non satisfait: score UX ${uxScore} < ${rules.scoreMin}.`,
      diagnostics,
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract
    });
  }

  if (Number.isFinite(blockerCount) && blockerCount > rules.blockerMax) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_MOTION_BLOCKERS_PRESENT',
      reason: `NFR-030 non satisfait: blockerCount ${blockerCount} > ${rules.blockerMax}.`,
      diagnostics,
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract
    });
  }

  if (Number.isFinite(maxTtfvDays) && maxTtfvDays > rules.ttfvMaxDays) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_MOTION_TTFV_EXCEEDED',
      reason: `NFR-040 non satisfait: TTFV ${maxTtfvDays}j > ${rules.ttfvMaxDays}j.`,
      diagnostics,
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason:
      'Préférences motion conformes (prefers-reduced-motion), clavier/contraste préservés, score UX et TTFV validés.',
    diagnostics,
    uxAudit: baseResult.uxAudit,
    criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
    uxDebtReductionLane: baseResult.uxDebtReductionLane,
    contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
    designTokenRogueLint: baseResult.designTokenRogueLint,
    verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
    motionPreferenceContract,
    correctiveActions: []
  });
}
