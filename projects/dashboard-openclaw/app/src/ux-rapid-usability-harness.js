import { buildUxMotionPreferenceContract } from './ux-motion-preference-contract.js';

const DEFAULT_REQUIRED_STATES = Object.freeze(['empty', 'loading', 'error', 'success']);
const DEFAULT_REQUIRED_VIEWPORTS = Object.freeze(['mobile', 'tablet', 'desktop']);
const DEFAULT_MIN_CONTRAST_RATIO = 4.5;
const DEFAULT_MAX_SUITE_DURATION_MS = 3000;
const DEFAULT_SCORE_MIN = 85;
const DEFAULT_BLOCKER_MAX = 0;

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_UX_USABILITY_HARNESS_INPUT: ['FIX_UX_USABILITY_HARNESS_INPUT_STRUCTURE'],
  UX_USABILITY_SUITES_REQUIRED: ['DECLARE_USABILITY_SUITES_WITH_STATE_AND_VIEWPORT'],
  UX_USABILITY_REQUIRED_STATE_MISSING: ['COVER_EMPTY_LOADING_ERROR_SUCCESS_IN_USABILITY_HARNESS'],
  UX_USABILITY_REQUIRED_VIEWPORT_MISSING: ['COVER_MOBILE_TABLET_DESKTOP_IN_USABILITY_HARNESS'],
  UX_USABILITY_CONTRAST_AA_REQUIRED: ['RESTORE_WCAG_AA_CONTRAST_ON_CRITICAL_SURFACES'],
  UX_USABILITY_SUITE_FAILURE_PRESENT: ['FIX_FAILING_USABILITY_SUITES_BEFORE_G4_UX'],
  UX_USABILITY_SUITE_DURATION_EXCEEDED: ['REDUCE_USABILITY_SUITE_RUNTIME_TO_KEEP_FEEDBACK_FAST'],
  UX_USABILITY_EVIDENCE_MISSING: ['ATTACH_SCREENSHOT_OR_LOG_EVIDENCE_FOR_EACH_PASSING_SUITE'],
  UX_USABILITY_SCORE_LOW: ['RAISE_UX_AUDIT_SCORE_TO_MINIMUM_THRESHOLD'],
  UX_USABILITY_BLOCKERS_PRESENT: ['RESOLVE_UX_BLOCKERS_BEFORE_TECH_GATE']
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

function normalizeList(value, fallback = []) {
  if (!Array.isArray(value)) {
    return cloneValue(fallback);
  }

  const output = [];
  const seen = new Set();

  for (const entry of value) {
    const normalized = normalizeText(String(entry ?? '')).toLowerCase();

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(normalized);
  }

  return output.length > 0 ? output : cloneValue(fallback);
}

function resolveRules(payload, runtimeOptions) {
  const source =
    (isObject(runtimeOptions.rapidUsabilityHarnessRules) && runtimeOptions.rapidUsabilityHarnessRules) ||
    (isObject(runtimeOptions.usabilityHarnessRules) && runtimeOptions.usabilityHarnessRules) ||
    (isObject(payload.rapidUsabilityHarnessRules) && payload.rapidUsabilityHarnessRules) ||
    (isObject(payload.usabilityHarnessRules) && payload.usabilityHarnessRules) ||
    {};

  return {
    modelVersion:
      normalizeText(String(source.modelVersion ?? payload.usabilityHarnessModelVersion ?? 'S071-v1')) ||
      'S071-v1',
    requiredStates: normalizeList(
      source.requiredStates ?? payload.requiredUsabilityStates ?? runtimeOptions.requiredUsabilityStates,
      cloneValue(DEFAULT_REQUIRED_STATES)
    ),
    requiredViewports: normalizeList(
      source.requiredViewports ?? payload.requiredUsabilityViewports ?? runtimeOptions.requiredUsabilityViewports,
      cloneValue(DEFAULT_REQUIRED_VIEWPORTS)
    ),
    minContrastRatio: Math.max(
      1,
      normalizeNumber(
        source.minContrastRatio ?? payload.minContrastRatio ?? runtimeOptions.minContrastRatio,
        DEFAULT_MIN_CONTRAST_RATIO
      )
    ),
    maxSuiteDurationMs: Math.max(
      100,
      normalizeNumber(
        source.maxSuiteDurationMs ?? payload.maxSuiteDurationMs ?? runtimeOptions.maxSuiteDurationMs,
        DEFAULT_MAX_SUITE_DURATION_MS
      )
    ),
    scoreMin: Math.max(0, normalizeNumber(source.scoreMin ?? payload.scoreMin ?? runtimeOptions.scoreMin, DEFAULT_SCORE_MIN)),
    blockerMax: Math.max(
      0,
      normalizeNumber(source.blockerMax ?? payload.blockerMax ?? runtimeOptions.blockerMax, DEFAULT_BLOCKER_MAX)
    )
  };
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

function resolveUsabilitySuites(payload) {
  const source = Array.isArray(payload.usabilitySuites)
    ? payload.usabilitySuites
    : Array.isArray(payload.rapidUsabilitySuites)
      ? payload.rapidUsabilitySuites
      : Array.isArray(payload.quickUsabilityTests)
        ? payload.quickUsabilityTests
        : isObject(payload.usabilityHarness) && Array.isArray(payload.usabilityHarness.suites)
          ? payload.usabilityHarness.suites
          : [];

  if (source.length === 0) {
    return {
      valid: false,
      reasonCode: 'UX_USABILITY_SUITES_REQUIRED',
      reason: 'Aucune suite usability rapide déclarée pour S071.'
    };
  }

  const suites = [];

  for (let index = 0; index < source.length; index += 1) {
    const entry = source[index];

    if (!isObject(entry)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_USABILITY_HARNESS_INPUT',
        reason: `usabilitySuites[${index}] invalide: objet requis.`
      };
    }

    const id = normalizeText(String(entry.id ?? entry.suiteId ?? `suite-${index + 1}`)) || `suite-${index + 1}`;
    const scenario = normalizeText(String(entry.scenario ?? entry.name ?? 'nominal')) || 'nominal';
    const state = normalizeText(String(entry.state ?? entry.uiState ?? '')).toLowerCase();
    const viewport = normalizeText(String(entry.viewport ?? entry.device ?? entry.breakpoint ?? '')).toLowerCase();

    if (!state || !viewport) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_USABILITY_HARNESS_INPUT',
        reason: `${id}: state et viewport sont requis.`
      };
    }

    const durationMs = normalizeNumber(entry.durationMs ?? entry.duration ?? entry.runMs);

    const passed =
      entry.pass === true ||
      entry.passed === true ||
      entry.success === true ||
      normalizeText(String(entry.status ?? '')).toUpperCase() === 'PASS' ||
      normalizeText(String(entry.result ?? '')).toUpperCase() === 'PASS';

    const assertions = normalizeStringList(entry.assertions ?? entry.checks);

    const evidenceRefs = Array.isArray(entry.evidenceRefs)
      ? normalizeStringList(entry.evidenceRefs)
      : normalizeStringList([entry.evidenceRef ?? entry.evidence ?? entry.capture]);

    suites.push({
      id,
      scenario,
      state,
      viewport,
      durationMs: Number.isFinite(durationMs) ? roundScore(durationMs) : null,
      passed,
      assertions,
      evidenceRefs
    });
  }

  return {
    valid: true,
    suites
  };
}

function resolveContrastChecks(baseResult, payload) {
  const fromMotion = Array.isArray(baseResult.motionPreferenceContract?.contrastChecks)
    ? baseResult.motionPreferenceContract.contrastChecks
    : [];

  if (fromMotion.length > 0) {
    return fromMotion.map((entry, index) => ({
      surfaceId:
        normalizeText(String(entry.surfaceId ?? entry.id ?? entry.surface ?? `surface-${index + 1}`)) ||
        `surface-${index + 1}`,
      ratio: normalizeNumber(entry.ratio ?? entry.contrastRatio ?? entry.value),
      aaPass:
        entry.aaPass === true ||
        entry.pass === true ||
        entry.accessibilityAA === true ||
        normalizeText(String(entry.status ?? '')).toUpperCase() === 'PASS'
    }));
  }

  const fallback = Array.isArray(payload.contrastChecks)
    ? payload.contrastChecks
    : Array.isArray(payload.motionContrastChecks)
      ? payload.motionContrastChecks
      : [];

  return fallback
    .filter((entry) => isObject(entry))
    .map((entry, index) => ({
      surfaceId:
        normalizeText(String(entry.surfaceId ?? entry.id ?? entry.surface ?? `surface-${index + 1}`)) ||
        `surface-${index + 1}`,
      ratio: normalizeNumber(entry.ratio ?? entry.contrastRatio ?? entry.value),
      aaPass:
        entry.aaPass === true ||
        entry.pass === true ||
        entry.accessibilityAA === true ||
        normalizeText(String(entry.status ?? '')).toUpperCase() === 'PASS'
    }));
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
  rapidUsabilityHarness,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode: normalizeText(String(reasonCode || 'INVALID_UX_USABILITY_HARNESS_INPUT')),
    reason,
    diagnostics: cloneValue(diagnostics ?? {}),
    uxAudit: cloneValue(uxAudit ?? null),
    criticalWidgetStateContract: cloneValue(criticalWidgetStateContract ?? null),
    uxDebtReductionLane: cloneValue(uxDebtReductionLane ?? null),
    contextualGlossaryIntegration: cloneValue(contextualGlossaryIntegration ?? null),
    designTokenRogueLint: cloneValue(designTokenRogueLint ?? null),
    verdictMicrocopyCatalog: cloneValue(verdictMicrocopyCatalog ?? null),
    motionPreferenceContract: cloneValue(motionPreferenceContract ?? null),
    rapidUsabilityHarness: cloneValue(rapidUsabilityHarness ?? null),
    correctiveActions: normalizeActions(correctiveActions, reasonCode)
  };
}

export function buildUxRapidUsabilityHarness(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_UX_USABILITY_HARNESS_INPUT',
      reason: 'Entrée S071 invalide: objet requis.'
    });
  }

  const baseResult = buildUxMotionPreferenceContract(payload, runtimeOptions);

  if (!baseResult.allowed) {
    return createResult({
      allowed: false,
      reasonCode: baseResult.reasonCode,
      reason: baseResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        usabilityHarnessModelVersion: 'S071-v1'
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract: baseResult.motionPreferenceContract,
      rapidUsabilityHarness: null,
      correctiveActions: baseResult.correctiveActions
    });
  }

  const rules = resolveRules(payload, runtimeOptions);
  const suitesResult = resolveUsabilitySuites(payload);

  if (!suitesResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: suitesResult.reasonCode,
      reason: suitesResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        usabilityHarnessModelVersion: rules.modelVersion
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract: baseResult.motionPreferenceContract,
      rapidUsabilityHarness: null
    });
  }

  const suites = suitesResult.suites;
  const passingSuites = suites.filter((suite) => suite.passed);
  const failingSuites = suites.filter((suite) => suite.passed === false);

  const coveredStates = new Set(passingSuites.map((suite) => suite.state));
  const coveredViewports = new Set(passingSuites.map((suite) => suite.viewport));

  const missingStates = rules.requiredStates.filter((state) => !coveredStates.has(state));
  const missingViewports = rules.requiredViewports.filter((viewport) => !coveredViewports.has(viewport));

  const slowSuites = suites
    .filter((suite) => Number.isFinite(Number(suite.durationMs)) && Number(suite.durationMs) > rules.maxSuiteDurationMs)
    .map((suite) => ({ id: suite.id, durationMs: suite.durationMs }));

  const evidenceGaps = passingSuites
    .filter((suite) => suite.evidenceRefs.length === 0)
    .map((suite) => suite.id);

  const contrastChecks = resolveContrastChecks(baseResult, payload);
  const contrastFailures = contrastChecks
    .filter(
      (check) =>
        check.aaPass === false ||
        !Number.isFinite(Number(check.ratio)) ||
        Number(check.ratio) < rules.minContrastRatio
    )
    .map((check) => ({ surfaceId: check.surfaceId, ratio: check.ratio }));

  const uxScore = normalizeNumber(baseResult.uxAudit?.score ?? payload.uxAudit?.score);
  const blockerCount = normalizeNumber(baseResult.uxAudit?.blockerCount ?? payload.uxAudit?.blockerCount);

  const durations = suites
    .map((suite) => normalizeNumber(suite.durationMs))
    .filter((duration) => Number.isFinite(duration));

  const rapidUsabilityHarness = {
    model: 'UX_RAPID_USABILITY_HARNESS',
    modelVersion: rules.modelVersion,
    generatedAt: toIso(Number.isFinite(Number(runtimeOptions.nowMs)) ? Number(runtimeOptions.nowMs) : Date.now()),
    thresholds: {
      requiredStates: cloneValue(rules.requiredStates),
      requiredViewports: cloneValue(rules.requiredViewports),
      minContrastRatio: rules.minContrastRatio,
      maxSuiteDurationMs: rules.maxSuiteDurationMs,
      scoreMin: rules.scoreMin,
      blockerMax: rules.blockerMax
    },
    suites,
    summary: {
      totalSuites: suites.length,
      passCount: passingSuites.length,
      failCount: failingSuites.length,
      stateCoveragePct:
        rules.requiredStates.length === 0
          ? 100
          : roundScore(((rules.requiredStates.length - missingStates.length) / rules.requiredStates.length) * 100),
      viewportCoveragePct:
        rules.requiredViewports.length === 0
          ? 100
          : roundScore(
              ((rules.requiredViewports.length - missingViewports.length) / rules.requiredViewports.length) * 100
            ),
      contrastPassCount: Math.max(contrastChecks.length - contrastFailures.length, 0),
      contrastFailureCount: contrastFailures.length,
      averageSuiteDurationMs:
        durations.length === 0 ? 0 : roundScore(durations.reduce((sum, value) => sum + value, 0) / durations.length),
      maxSuiteDurationMs: durations.length === 0 ? 0 : roundScore(Math.max(...durations)),
      uxScore: Number.isFinite(uxScore) ? roundScore(uxScore) : null,
      blockerCount: Number.isFinite(blockerCount) ? blockerCount : null
    }
  };

  const diagnostics = {
    ...baseResult.diagnostics,
    usabilityHarnessModelVersion: rules.modelVersion,
    requiredStates: cloneValue(rules.requiredStates),
    requiredViewports: cloneValue(rules.requiredViewports),
    missingStates,
    missingViewports,
    failingSuiteCount: failingSuites.length,
    slowSuiteCount: slowSuites.length,
    evidenceGapCount: evidenceGaps.length,
    contrastFailureCount: contrastFailures.length,
    uxScore: Number.isFinite(uxScore) ? roundScore(uxScore) : null,
    blockerCount: Number.isFinite(blockerCount) ? blockerCount : null
  };

  if (missingStates.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_USABILITY_REQUIRED_STATE_MISSING',
      reason: `États manquants dans le harnais usability: ${missingStates.join(', ')}.`,
      diagnostics,
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract: baseResult.motionPreferenceContract,
      rapidUsabilityHarness
    });
  }

  if (missingViewports.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_USABILITY_REQUIRED_VIEWPORT_MISSING',
      reason: `Viewports manquants dans le harnais usability: ${missingViewports.join(', ')}.`,
      diagnostics,
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract: baseResult.motionPreferenceContract,
      rapidUsabilityHarness
    });
  }

  if (contrastFailures.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_USABILITY_CONTRAST_AA_REQUIRED',
      reason: 'FR-065 non satisfait: contraste WCAG AA insuffisant sur les surfaces critiques.',
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
      motionPreferenceContract: baseResult.motionPreferenceContract,
      rapidUsabilityHarness
    });
  }

  if (Number.isFinite(uxScore) && uxScore < rules.scoreMin) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_USABILITY_SCORE_LOW',
      reason: `NFR-030 non satisfait: score UX ${uxScore} < ${rules.scoreMin}.`,
      diagnostics,
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract: baseResult.motionPreferenceContract,
      rapidUsabilityHarness
    });
  }

  if (Number.isFinite(blockerCount) && blockerCount > rules.blockerMax) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_USABILITY_BLOCKERS_PRESENT',
      reason: `NFR-030 non satisfait: blockerCount ${blockerCount} > ${rules.blockerMax}.`,
      diagnostics,
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract: baseResult.motionPreferenceContract,
      rapidUsabilityHarness
    });
  }

  if (failingSuites.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_USABILITY_SUITE_FAILURE_PRESENT',
      reason: `Suites usability en échec: ${failingSuites.map((suite) => suite.id).join(', ')}.`,
      diagnostics,
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract: baseResult.motionPreferenceContract,
      rapidUsabilityHarness
    });
  }

  if (slowSuites.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_USABILITY_SUITE_DURATION_EXCEEDED',
      reason: `Suites trop lentes (> ${rules.maxSuiteDurationMs}ms): ${slowSuites
        .map((suite) => `${suite.id}(${suite.durationMs}ms)`)
        .join(', ')}.`,
      diagnostics: {
        ...diagnostics,
        slowSuites
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract: baseResult.motionPreferenceContract,
      rapidUsabilityHarness
    });
  }

  if (evidenceGaps.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_USABILITY_EVIDENCE_MISSING',
      reason: `Preuves manquantes pour les suites PASS: ${evidenceGaps.join(', ')}.`,
      diagnostics,
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract: baseResult.motionPreferenceContract,
      rapidUsabilityHarness
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason:
      'Harnais usability rapide validé: 4 états couverts, mobile/tablette/desktop couverts, contraste AA conforme.',
    diagnostics,
    uxAudit: baseResult.uxAudit,
    criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
    uxDebtReductionLane: baseResult.uxDebtReductionLane,
    contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
    designTokenRogueLint: baseResult.designTokenRogueLint,
    verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
    motionPreferenceContract: baseResult.motionPreferenceContract,
    rapidUsabilityHarness,
    correctiveActions: []
  });
}
