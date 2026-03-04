import { buildUxCriticalWidgetStateContract } from './ux-critical-widget-state-contract.js';

const DEFAULT_REQUIRED_RISK_TAGS = Object.freeze(['T07', 'U01']);

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_UX_DEBT_LANE_INPUT: ['FIX_UX_DEBT_LANE_INPUT_STRUCTURE'],
  UX_DEBT_ITEMS_REQUIRED: ['DECLARE_UX_DEBT_ITEMS_WITH_STATUS_AND_PLAN'],
  UX_DEBT_OPEN_ITEMS_REQUIRED: ['KEEP_OPEN_UX_DEBT_LANE_VISIBLE_WITH_REDUCTION_PLAN'],
  UX_DEBT_PLAN_INCOMPLETE: ['COMPLETE_REDUCTION_PLAN_FOR_OPEN_UX_DEBTS'],
  UX_BMAD_DEFINITIONS_REQUIRED: ['ADD_CONTEXTUAL_BMAD_DEFINITIONS'],
  UX_BMAD_DEFINITION_LINK_MISSING: ['LINK_EACH_UX_DEBT_TO_CONTEXTUAL_BMAD_DEFINITION'],
  UX_DEBT_RISK_COVERAGE_REQUIRED: ['COVER_REQUIRED_RISKS_T07_AND_U01_IN_UX_DEBT_LANE']
});

const STATUS_SET = new Set(['OPEN', 'IN_PROGRESS', 'CLOSED']);
const SEVERITY_SET = new Set(['BLOCKER', 'MAJOR', 'MINOR']);

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

function normalizeRiskTags(value, fallback = []) {
  if (!Array.isArray(value)) {
    return cloneValue(fallback);
  }

  const output = [];
  const seen = new Set();

  for (const risk of value) {
    const normalized = normalizeText(String(risk ?? '')).toUpperCase();

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
    (isObject(runtimeOptions.uxDebtRules) && runtimeOptions.uxDebtRules) ||
    (isObject(payload.uxDebtRules) && payload.uxDebtRules) ||
    {};

  const requiredRiskTags = normalizeRiskTags(
    source.requiredRiskTags ?? payload.requiredRiskTags ?? runtimeOptions.requiredRiskTags,
    cloneValue(DEFAULT_REQUIRED_RISK_TAGS)
  );

  return {
    modelVersion:
      normalizeText(String(source.modelVersion ?? payload.uxDebtModelVersion ?? 'S066-v1')) ||
      'S066-v1',
    requiredRiskTags:
      requiredRiskTags.length > 0 ? requiredRiskTags : cloneValue(DEFAULT_REQUIRED_RISK_TAGS),
    requireDefinitionRefs:
      source.requireDefinitionRefs !== false &&
      payload.requireDefinitionRefs !== false &&
      runtimeOptions.requireDefinitionRefs !== false
  };
}

function resolveDefinitions(payload) {
  const source = Array.isArray(payload.bmadDefinitions)
    ? payload.bmadDefinitions
    : Array.isArray(payload.contextualDefinitions)
      ? payload.contextualDefinitions
      : Array.isArray(payload.glossary)
        ? payload.glossary
        : [];

  if (source.length === 0) {
    return {
      valid: false,
      reasonCode: 'UX_BMAD_DEFINITIONS_REQUIRED',
      reason: 'FR-069 non satisfait: définitions BMAD contextuelles absentes.'
    };
  }

  const definitions = [];
  const byId = new Map();

  for (let index = 0; index < source.length; index += 1) {
    const entry = source[index];

    if (!isObject(entry)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_DEBT_LANE_INPUT',
        reason: `bmadDefinitions[${index}] invalide: objet requis.`
      };
    }

    const id = normalizeText(String(entry.id ?? entry.code ?? `DEF-${index + 1}`)) || `DEF-${index + 1}`;
    const term = normalizeText(String(entry.term ?? entry.label ?? ''));
    const definition = normalizeText(String(entry.definition ?? entry.description ?? ''));

    if (!term || !definition) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_DEBT_LANE_INPUT',
        reason: `${id}: term/definition requis dans bmadDefinitions.`
      };
    }

    if (byId.has(id)) {
      return {
        valid: false,
        reasonCode: 'INVALID_UX_DEBT_LANE_INPUT',
        reason: `bmadDefinitions dupliquée: ${id}.`
      };
    }

    const normalized = {
      id,
      term,
      definition,
      context: normalizeText(String(entry.context ?? entry.scope ?? '')) || null
    };

    byId.set(id, normalized);
    definitions.push(normalized);
  }

  return {
    valid: true,
    definitions,
    byId
  };
}

function normalizeDebtItem(item, index, definitionMap, rules) {
  if (!isObject(item)) {
    return {
      valid: false,
      reasonCode: 'INVALID_UX_DEBT_LANE_INPUT',
      reason: `uxDebts[${index}] invalide: objet requis.`
    };
  }

  const id = normalizeText(String(item.id ?? item.debtId ?? `UX-DEBT-${index + 1}`)) || `UX-DEBT-${index + 1}`;
  const title = normalizeText(String(item.title ?? item.summary ?? ''));

  if (!title) {
    return {
      valid: false,
      reasonCode: 'INVALID_UX_DEBT_LANE_INPUT',
      reason: `${id}: title requis.`
    };
  }

  const status = normalizeText(String(item.status ?? 'OPEN')).toUpperCase();
  if (!STATUS_SET.has(status)) {
    return {
      valid: false,
      reasonCode: 'INVALID_UX_DEBT_LANE_INPUT',
      reason: `${id}: status invalide (${status}).`
    };
  }

  const severity = normalizeText(String(item.severity ?? 'MAJOR')).toUpperCase();
  if (!SEVERITY_SET.has(severity)) {
    return {
      valid: false,
      reasonCode: 'INVALID_UX_DEBT_LANE_INPUT',
      reason: `${id}: severity invalide (${severity}).`
    };
  }

  const riskTags = normalizeRiskTags(item.riskTags ?? item.risks ?? []);

  const planSource = isObject(item.reductionPlan)
    ? item.reductionPlan
    : isObject(item.plan)
      ? item.plan
      : {};

  const plan = {
    owner: normalizeText(String(planSource.owner ?? planSource.assignee ?? '')) || null,
    targetDate: normalizeText(String(planSource.targetDate ?? planSource.dueDate ?? '')) || null,
    successMetric: normalizeText(String(planSource.successMetric ?? planSource.kpi ?? '')) || null,
    actions: Array.isArray(planSource.actions)
      ? planSource.actions
          .map((entry) => normalizeText(String(entry ?? '')))
          .filter((entry, idx, arr) => entry.length > 0 && arr.indexOf(entry) === idx)
      : []
  };

  const definitionRefs = Array.isArray(item.definitionRefs)
    ? item.definitionRefs
    : Array.isArray(item.contextRefs)
      ? item.contextRefs
      : [];

  const normalizedDefinitionRefs = definitionRefs
    .map((entry) => normalizeText(String(entry ?? '')))
    .filter((entry, idx, arr) => entry.length > 0 && arr.indexOf(entry) === idx);

  const missingDefinitionRefs = normalizedDefinitionRefs.filter((ref) => !definitionMap.has(ref));
  const hasDefinitionLinks = normalizedDefinitionRefs.length > 0 && missingDefinitionRefs.length === 0;

  const openDebt = status !== 'CLOSED';
  const hasReductionPlan =
    openDebt === false ||
    (plan.owner && plan.targetDate && plan.actions.length > 0 && plan.successMetric);

  const coversRequiredRisk = rules.requiredRiskTags.some((risk) => riskTags.includes(risk));

  return {
    valid: true,
    debt: {
      id,
      title,
      status,
      severity,
      gate: normalizeText(String(item.gate ?? item.sourceGate ?? 'G4-UX')) || 'G4-UX',
      riskTags,
      definitionRefs: normalizedDefinitionRefs,
      missingDefinitionRefs,
      hasDefinitionLinks,
      reductionPlan: plan,
      openDebt,
      hasReductionPlan,
      coversRequiredRisk
    }
  };
}

function resolveDebtLane(payload, definitionMap, rules) {
  const source = Array.isArray(payload.uxDebts)
    ? payload.uxDebts
    : Array.isArray(payload.uxDebtLane)
      ? payload.uxDebtLane
      : Array.isArray(payload.debtItems)
        ? payload.debtItems
        : [];

  if (source.length === 0) {
    return {
      valid: false,
      reasonCode: 'UX_DEBT_ITEMS_REQUIRED',
      reason: 'FR-068 non satisfait: aucune dette UX déclarée.'
    };
  }

  const debts = [];

  for (let index = 0; index < source.length; index += 1) {
    const normalized = normalizeDebtItem(source[index], index, definitionMap, rules);

    if (!normalized.valid) {
      return normalized;
    }

    debts.push(normalized.debt);
  }

  return {
    valid: true,
    debts
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
  correctiveActions
}) {
  return {
    allowed,
    reasonCode: normalizeText(String(reasonCode || 'INVALID_UX_DEBT_LANE_INPUT')),
    reason,
    diagnostics: cloneValue(diagnostics ?? {}),
    uxAudit: cloneValue(uxAudit ?? null),
    criticalWidgetStateContract: cloneValue(criticalWidgetStateContract ?? null),
    uxDebtReductionLane: cloneValue(uxDebtReductionLane ?? null),
    correctiveActions: normalizeActions(correctiveActions, reasonCode)
  };
}

export function buildUxDebtReductionLane(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_UX_DEBT_LANE_INPUT',
      reason: 'Entrée S066 invalide: objet requis.'
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
        uxDebtModelVersion: rules.modelVersion
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: null,
      correctiveActions: baseResult.correctiveActions
    });
  }

  const definitionsResult = resolveDefinitions(payload);

  if (!definitionsResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: definitionsResult.reasonCode,
      reason: definitionsResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        uxDebtModelVersion: rules.modelVersion,
        requiredRiskTags: cloneValue(rules.requiredRiskTags)
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: null
    });
  }

  const debtResult = resolveDebtLane(payload, definitionsResult.byId, rules);

  if (!debtResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: debtResult.reasonCode,
      reason: debtResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        uxDebtModelVersion: rules.modelVersion,
        requiredRiskTags: cloneValue(rules.requiredRiskTags)
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane: null
    });
  }

  const debts = debtResult.debts;
  const openDebts = debts.filter((entry) => entry.status === 'OPEN');
  const inProgressDebts = debts.filter((entry) => entry.status === 'IN_PROGRESS');
  const closedDebts = debts.filter((entry) => entry.status === 'CLOSED');

  const openLane = debts.filter((entry) => entry.openDebt);
  const blockerOpenCount = openLane.filter((entry) => entry.severity === 'BLOCKER').length;

  const reductionPlanGaps = openLane
    .filter((entry) => entry.hasReductionPlan === false)
    .map((entry) => ({ id: entry.id, owner: entry.reductionPlan.owner, targetDate: entry.reductionPlan.targetDate }));

  const definitionLinkGaps = debts
    .filter((entry) => (rules.requireDefinitionRefs ? entry.hasDefinitionLinks === false : entry.missingDefinitionRefs.length > 0))
    .map((entry) => ({
      id: entry.id,
      definitionRefs: entry.definitionRefs,
      missingDefinitionRefs: entry.missingDefinitionRefs
    }));

  const riskCoverage = {};

  for (const riskTag of rules.requiredRiskTags) {
    riskCoverage[riskTag] = openLane.some((entry) => entry.riskTags.includes(riskTag));
  }

  const missingRiskCoverage = Object.entries(riskCoverage)
    .filter(([, covered]) => covered === false)
    .map(([risk]) => risk);

  const nowMs = Number.isFinite(Number(runtimeOptions.nowMs))
    ? Number(runtimeOptions.nowMs)
    : Date.now();

  const uxDebtReductionLane = {
    model: 'UX_DEBT_REDUCTION_LANE',
    modelVersion: rules.modelVersion,
    generatedAt: toIso(nowMs),
    thresholds: {
      requiredRiskTags: cloneValue(rules.requiredRiskTags),
      requireDefinitionRefs: rules.requireDefinitionRefs
    },
    definitions: definitionsResult.definitions,
    lane: {
      open: openDebts,
      inProgress: inProgressDebts,
      closed: closedDebts
    },
    summary: {
      totalDebts: debts.length,
      openCount: openDebts.length,
      inProgressCount: inProgressDebts.length,
      closedCount: closedDebts.length,
      blockerOpenCount,
      reductionPlanCoveragePct: openLane.length === 0 ? 0 : roundScore(((openLane.length - reductionPlanGaps.length) / openLane.length) * 100),
      definitionLinkCoveragePct:
        debts.length === 0 ? 0 : roundScore(((debts.length - definitionLinkGaps.length) / debts.length) * 100),
      riskCoverage
    }
  };

  const diagnostics = {
    ...baseResult.diagnostics,
    uxDebtModelVersion: rules.modelVersion,
    totalDebts: debts.length,
    openDebtCount: openLane.length,
    blockerOpenCount,
    definitionCount: definitionsResult.definitions.length,
    requiredRiskTags: cloneValue(rules.requiredRiskTags),
    missingRiskCoverage
  };

  if (openLane.length === 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_DEBT_OPEN_ITEMS_REQUIRED',
      reason: 'FR-068 non satisfait: aucune dette UX ouverte/in-progress visible dans la lane.',
      diagnostics,
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane
    });
  }

  if (reductionPlanGaps.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_DEBT_PLAN_INCOMPLETE',
      reason: `FR-068 non satisfait: plan de réduction incomplet pour ${reductionPlanGaps.length} dette(s) ouverte(s).`,
      diagnostics: {
        ...diagnostics,
        reductionPlanGaps
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane
    });
  }

  if (definitionLinkGaps.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_BMAD_DEFINITION_LINK_MISSING',
      reason:
        'FR-069 non satisfait: chaque dette UX doit référencer des définitions BMAD contextuelles valides.',
      diagnostics: {
        ...diagnostics,
        definitionLinkGaps
      },
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane
    });
  }

  if (missingRiskCoverage.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'UX_DEBT_RISK_COVERAGE_REQUIRED',
      reason: `Risques non couverts dans la lane UX: ${missingRiskCoverage.join(', ')}.`,
      diagnostics,
      uxAudit: baseResult.uxAudit,
      criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
      uxDebtReductionLane
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: 'Lane de dettes UX ouverte avec plan de réduction et définitions BMAD contextuelles validés.',
    diagnostics,
    uxAudit: baseResult.uxAudit,
    criticalWidgetStateContract: baseResult.criticalWidgetStateContract,
    uxDebtReductionLane,
    correctiveActions: []
  });
}
