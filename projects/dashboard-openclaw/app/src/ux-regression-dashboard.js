import { buildUxRapidUsabilityHarness } from './ux-rapid-usability-harness.js';

const DEFAULT_REQUIRED_STATES = Object.freeze(['empty', 'loading', 'error', 'success']);
const DEFAULT_REQUIRED_VIEWPORTS = Object.freeze(['mobile', 'tablet', 'desktop']);
const DEFAULT_REQUIRED_SUBGATES = Object.freeze([
  'designSystemCompliance',
  'accessibilityAA',
  'responsiveCoverage',
  'interactionStates',
  'visualHierarchy',
  'perceivedPerformance'
]);
const DEFAULT_BLOCKER_OPEN_MAX = 0;

const VERDICT_SET = new Set(['PASS', 'CONCERNS', 'FAIL']);
const STATUS_SET = new Set(['OPEN', 'RESOLVED']);
const SEVERITY_SET = new Set(['BLOCKER', 'MAJOR', 'MINOR']);

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_UX_REGRESSION_INPUT: ['FIX_UX_REGRESSION_DASHBOARD_INPUT_STRUCTURE'],
  UX_REGRESSION_RECORDS_REQUIRED: ['DECLARE_UX_REGRESSION_RECORDS_FOR_G4_UX_DASHBOARD'],
  UX_REGRESSION_STATE_COVERAGE_REQUIRED: ['ADD_MISSING_EMPTY_LOADING_ERROR_SUCCESS_REGRESSION_ENTRIES'],
  UX_REGRESSION_VIEWPORT_COVERAGE_REQUIRED: ['ADD_MISSING_MOBILE_TABLET_DESKTOP_REGRESSION_ENTRIES'],
  UX_REGRESSION_G4_UX_LINKAGE_REQUIRED: ['LINK_EACH_G4_UX_SUBGATE_TO_REGRESSION_EVIDENCE'],
  UX_REGRESSION_EVIDENCE_LINK_REQUIRED: ['ATTACH_CAPTURE_REFERENCES_TO_EACH_REGRESSION_ENTRY'],
  UX_REGRESSION_BLOCKERS_PRESENT: ['RESOLVE_OPEN_BLOCKER_REGRESSIONS_BEFORE_G4_UX_PASS']
});

const VERDICT_PRIORITY = Object.freeze({
  PASS: 1,
  CONCERNS: 2,
  FAIL: 3
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

function normalizeList(value, fallback) {
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

function resolveRules(payload, runtimeOptions) {
  const source =
    (isObject(runtimeOptions.uxRegressionRules) && runtimeOptions.uxRegressionRules) ||
    (isObject(payload.uxRegressionRules) && payload.uxRegressionRules) ||
    {};

  return {
    modelVersion:
      normalizeText(String(source.modelVersion ?? payload.uxRegressionModelVersion ?? 'S072-v1')) || 'S072-v1',
    requiredStates: normalizeList(source.requiredStates ?? payload.requiredRegressionStates, DEFAULT_REQUIRED_STATES),
    requiredViewports: normalizeList(
      source.requiredViewports ?? payload.requiredRegressionViewports,
      DEFAULT_REQUIRED_VIEWPORTS
    ),
    requiredSubgates: normalizeStringList(
      Array.isArray(source.requiredSubgates)
        ? source.requiredSubgates
        : Array.isArray(payload.requiredRegressionSubgates)
          ? payload.requiredRegressionSubgates
          : DEFAULT_REQUIRED_SUBGATES
    ),
    requireEvidence: source.requireEvidence !== false && payload.requireRegressionEvidence !== false,
    blockerOpenMax: Math.max(0, normalizeNumber(source.blockerOpenMax ?? payload.blockerOpenMax, DEFAULT_BLOCKER_OPEN_MAX))
  };
}

function normalizeSubgate(value) {
  return normalizeText(String(value ?? '')).replace(/\s+/g, '');
}

function normalizeRegressionRecords(payload) {
  const source = Array.isArray(payload.uxRegressionRecords)
    ? payload.uxRegressionRecords
    : isObject(payload.regressionDashboard) && Array.isArray(payload.regressionDashboard.records)
      ? payload.regressionDashboard.records
      : isObject(payload.uxRegressionDashboard) && Array.isArray(payload.uxRegressionDashboard.records)
        ? payload.uxRegressionDashboard.records
        : [];

  if (source.length === 0) {
    return {
      valid: false,
      reasonCode: 'UX_REGRESSION_RECORDS_REQUIRED',
      reason: 'Aucune entrée de régression UX fournie pour S072.'
    };
  }

  const records = [];

  for (let index = 0; index < source.length; index += 1) {
    const entry = source[index];

    if (!isObject(entry)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_REGRESSION_INPUT',
        reason: `uxRegressionRecords[${index}] invalide: objet requis.`
      };
    }

    const id = normalizeText(String(entry.id ?? `reg-${index + 1}`)) || `reg-${index + 1}`;
    const state = normalizeText(String(entry.state ?? entry.uiState ?? '')).toLowerCase();
    const viewport = normalizeText(String(entry.viewport ?? entry.device ?? '')).toLowerCase();
    const verdict = normalizeText(String(entry.verdict ?? entry.statusVerdict ?? '')).toUpperCase();
    const subgate = normalizeSubgate(entry.subgate ?? entry.g4Subgate ?? entry.gateKey);

    let status = normalizeText(String(entry.status ?? entry.lifecycle ?? 'OPEN')).toUpperCase();
    if (status === 'CLOSED') {
      status = 'RESOLVED';
    }

    const severity = normalizeText(String(entry.severity ?? entry.level ?? 'MAJOR')).toUpperCase();
    const evidenceRefs = Array.isArray(entry.evidenceRefs)
      ? normalizeStringList(entry.evidenceRefs)
      : normalizeStringList([entry.evidenceRef ?? entry.captureRef ?? entry.capture]);

    if (!state || !viewport || !verdict || !subgate) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_REGRESSION_INPUT',
        reason: `${id}: state/viewport/verdict/subgate requis.`
      };
    }

    if (!VERDICT_SET.has(verdict)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_REGRESSION_INPUT',
        reason: `${id}: verdict invalide (${verdict}).`
      };
    }

    if (!STATUS_SET.has(status)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_REGRESSION_INPUT',
        reason: `${id}: status invalide (${status}).`
      };
    }

    if (!SEVERITY_SET.has(severity)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_REGRESSION_INPUT',
        reason: `${id}: severity invalide (${severity}).`
      };
    }

    records.push({
      id,
      state,
      viewport,
      verdict,
      subgate,
      status,
      severity,
      evidenceRefs
    });
  }

  return {
    valid: true,
    records
  };
}

function mergeWorstVerdict(previous, next) {
  if (!previous) {
    return next;
  }

  return VERDICT_PRIORITY[next] > VERDICT_PRIORITY[previous] ? next : previous;
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
  uxRegressionDashboard,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode: normalizeText(String(reasonCode || 'INVALID_UX_REGRESSION_INPUT')),
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
    uxRegressionDashboard: cloneValue(uxRegressionDashboard ?? null),
    correctiveActions: normalizeActions(correctiveActions, reasonCode)
  };
}

export function buildUxRegressionDashboard(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_UX_REGRESSION_INPUT',
      reason: 'Entrée S072 invalide: objet requis.'
    });
  }

  const baseResult = buildUxRapidUsabilityHarness(payload, runtimeOptions);

  if (!baseResult.allowed) {
    return createResult({
      allowed: false,
      reasonCode: baseResult.reasonCode,
      reason: baseResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        uxRegressionModelVersion: 'S072-v1'
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract: baseResult.motionPreferenceContract,
      rapidUsabilityHarness: baseResult.rapidUsabilityHarness,
      uxRegressionDashboard: null,
      correctiveActions: baseResult.correctiveActions
    });
  }

  const rules = resolveRules(payload, runtimeOptions);
  const recordResult = normalizeRegressionRecords(payload);

  if (!recordResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: recordResult.reasonCode,
      reason: recordResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        uxRegressionModelVersion: rules.modelVersion
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract: baseResult.motionPreferenceContract,
      rapidUsabilityHarness: baseResult.rapidUsabilityHarness,
      uxRegressionDashboard: null
    });
  }

  const records = recordResult.records;
  const coveredStates = new Set(records.map((entry) => entry.state));
  const coveredViewports = new Set(records.map((entry) => entry.viewport));
  const coveredSubgates = new Set(records.map((entry) => entry.subgate));

  const missingStates = rules.requiredStates.filter((state) => !coveredStates.has(state));
  const missingViewports = rules.requiredViewports.filter((viewport) => !coveredViewports.has(viewport));
  const missingSubgates = rules.requiredSubgates.filter((subgate) => !coveredSubgates.has(subgate));

  const evidenceGaps = rules.requireEvidence
    ? records.filter((entry) => entry.evidenceRefs.length === 0).map((entry) => entry.id)
    : [];

  const openBlockers = records.filter((entry) => entry.status === 'OPEN' && entry.severity === 'BLOCKER');

  const fourStateCoveragePct = normalizeNumber(baseResult.criticalWidgetStateContract?.summary?.fourStateCoveragePct, 0);
  const responsiveCoveragePct = normalizeNumber(baseResult.rapidUsabilityHarness?.summary?.viewportCoveragePct, 0);

  const matrix = {};
  for (const entry of records) {
    if (!isObject(matrix[entry.state])) {
      matrix[entry.state] = {};
    }

    const previousVerdict = matrix[entry.state][entry.viewport] ?? null;
    matrix[entry.state][entry.viewport] = mergeWorstVerdict(previousVerdict, entry.verdict);
  }

  const verdictDistribution = {
    PASS: records.filter((entry) => entry.verdict === 'PASS').length,
    CONCERNS: records.filter((entry) => entry.verdict === 'CONCERNS').length,
    FAIL: records.filter((entry) => entry.verdict === 'FAIL').length
  };

  const uxRegressionDashboard = {
    model: 'UX_REGRESSION_DASHBOARD',
    modelVersion: rules.modelVersion,
    generatedAt: toIso(Number.isFinite(Number(runtimeOptions.nowMs)) ? Number(runtimeOptions.nowMs) : Date.now()),
    thresholds: {
      requiredStates: cloneValue(rules.requiredStates),
      requiredViewports: cloneValue(rules.requiredViewports),
      requiredSubgates: cloneValue(rules.requiredSubgates),
      requireEvidence: rules.requireEvidence,
      blockerOpenMax: rules.blockerOpenMax
    },
    records,
    matrix,
    summary: {
      totalRecords: records.length,
      stateCoveragePct:
        rules.requiredStates.length === 0
          ? 100
          : roundScore(((rules.requiredStates.length - missingStates.length) / rules.requiredStates.length) * 100),
      viewportCoveragePct:
        rules.requiredViewports.length === 0
          ? 100
          : roundScore(((rules.requiredViewports.length - missingViewports.length) / rules.requiredViewports.length) * 100),
      subgateCoveragePct:
        rules.requiredSubgates.length === 0
          ? 100
          : roundScore(((rules.requiredSubgates.length - missingSubgates.length) / rules.requiredSubgates.length) * 100),
      evidenceCoveragePct:
        records.length === 0 ? 0 : roundScore(((records.length - evidenceGaps.length) / records.length) * 100),
      openBlockerCount: openBlockers.length,
      verdictDistribution,
      fourStateCoveragePct: roundScore(fourStateCoveragePct),
      responsiveCoveragePct: roundScore(responsiveCoveragePct)
    }
  };

  const diagnostics = {
    ...baseResult.diagnostics,
    uxRegressionModelVersion: rules.modelVersion,
    missingStates,
    missingViewports,
    missingSubgates,
    evidenceGapCount: evidenceGaps.length,
    openBlockerCount: openBlockers.length,
    fourStateCoveragePct: roundScore(fourStateCoveragePct),
    responsiveCoveragePct: roundScore(responsiveCoveragePct)
  };

  // NFR-031/NFR-032 are fail-closed by upstream contracts (S071).

  if (missingStates.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_REGRESSION_STATE_COVERAGE_REQUIRED',
      reason: `FR-066 non satisfait: états manquants (${missingStates.join(', ')}).`,
      diagnostics,
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract: baseResult.motionPreferenceContract,
      rapidUsabilityHarness: baseResult.rapidUsabilityHarness,
      uxRegressionDashboard
    });
  }

  if (missingViewports.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_REGRESSION_VIEWPORT_COVERAGE_REQUIRED',
      reason: `FR-066 non satisfait: viewports manquants (${missingViewports.join(', ')}).`,
      diagnostics,
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract: baseResult.motionPreferenceContract,
      rapidUsabilityHarness: baseResult.rapidUsabilityHarness,
      uxRegressionDashboard
    });
  }

  if (missingSubgates.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_REGRESSION_G4_UX_LINKAGE_REQUIRED',
      reason: `FR-067 non satisfait: sous-gates G4-UX non reliées (${missingSubgates.join(', ')}).`,
      diagnostics,
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract: baseResult.motionPreferenceContract,
      rapidUsabilityHarness: baseResult.rapidUsabilityHarness,
      uxRegressionDashboard
    });
  }

  if (evidenceGaps.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_REGRESSION_EVIDENCE_LINK_REQUIRED',
      reason: `FR-067 non satisfait: preuves manquantes pour ${evidenceGaps.join(', ')}.`,
      diagnostics,
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract: baseResult.motionPreferenceContract,
      rapidUsabilityHarness: baseResult.rapidUsabilityHarness,
      uxRegressionDashboard
    });
  }

  if (openBlockers.length > rules.blockerOpenMax) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_REGRESSION_BLOCKERS_PRESENT',
      reason: `Régressions BLOCKER ouvertes ${openBlockers.length} > ${rules.blockerOpenMax}.`,
      diagnostics: {
        ...diagnostics,
        openBlockerIds: openBlockers.map((entry) => entry.id)
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: baseResult.uxDebtReductionLane,
      contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
      designTokenRogueLint: baseResult.designTokenRogueLint,
      verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
      motionPreferenceContract: baseResult.motionPreferenceContract,
      rapidUsabilityHarness: baseResult.rapidUsabilityHarness,
      uxRegressionDashboard
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason:
      'Tableau de bord régressions UX validé: mobile/tablette/desktop couverts et preuves reliées aux sous-gates G4-UX.',
    diagnostics,
    uxAudit: baseResult.uxAudit,
    criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
    uxDebtReductionLane: baseResult.uxDebtReductionLane,
    contextualGlossaryIntegration: baseResult.contextualGlossaryIntegration,
    designTokenRogueLint: baseResult.designTokenRogueLint,
    verdictMicrocopyCatalog: baseResult.verdictMicrocopyCatalog,
    motionPreferenceContract: baseResult.motionPreferenceContract,
    rapidUsabilityHarness: baseResult.rapidUsabilityHarness,
    uxRegressionDashboard,
    correctiveActions: []
  });
}
