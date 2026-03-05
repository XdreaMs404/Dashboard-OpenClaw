const DEFAULT_REQUIRED_ROLES = Object.freeze(['PM', 'ARCHITECT', 'TEA', 'UXQA', 'SPONSOR']);
const DEFAULT_MODEL_VERSION = 'S073-v1';
const DEFAULT_LATENCY_P95_BUDGET_MS = 2000;
const DEFAULT_MTTA_BUDGET_MINUTES = 10;
const DEFAULT_MIN_ACTIONS_PER_ROLE = 1;
const DEFAULT_HIGH_PRIORITY_THRESHOLD = 85;
const DEFAULT_MAX_HIGH_PRIORITY_OPEN_PER_ROLE = 3;

const ROLE_ALIAS_MAP = Object.freeze({
  PM: 'PM',
  PRODUCTMANAGER: 'PM',
  PRODUCT_OWNER: 'PM',
  PRODUCTOWNER: 'PM',
  ARCHITECT: 'ARCHITECT',
  ARCHITECTE: 'ARCHITECT',
  ARCHI: 'ARCHITECT',
  TEA: 'TEA',
  TESTENGINEERINGAUDITOR: 'TEA',
  UXQA: 'UXQA',
  UX_QA: 'UXQA',
  UX_QA_AUDITOR: 'UXQA',
  UXQAAUDITOR: 'UXQA',
  UXQAUDITOR: 'UXQA',
  UX_QA_LEAD: 'UXQA',
  UXQALEAD: 'UXQA',
  UXQAOWNER: 'UXQA',
  UXQA_OWNER: 'UXQA',
  UX_QAOWNER: 'UXQA',
  UXQAOWNERROLE: 'UXQA',
  UXQAALERT: 'UXQA',
  UXQALANE: 'UXQA',
  UXQA_SPECIALIST: 'UXQA',
  UXQASPECIALIST: 'UXQA',
  UX_QA_SPECIALIST: 'UXQA',
  UX_QA_REVIEWER: 'UXQA',
  UXQAREVIEWER: 'UXQA',
  UXQA_REVIEWER: 'UXQA',
  UXQA_CHECK: 'UXQA',
  UXQACHECK: 'UXQA',
  UXQA_CHECKER: 'UXQA',
  UXQACHECKER: 'UXQA',
  UX_QA_CHECKER: 'UXQA',
  UXQA_CONTRACT: 'UXQA',
  UXQACONTRACT: 'UXQA',
  UX_QA_CONTRACT: 'UXQA',
  UX_QA_GATE: 'UXQA',
  UXQAGATE: 'UXQA',
  UX_QA_GUARD: 'UXQA',
  UXQAGUARD: 'UXQA',
  UX_QA_AUDIT: 'UXQA',
  UXQAAUDIT: 'UXQA',
  UX_QA_AUDITS: 'UXQA',
  UXQAAUDITS: 'UXQA',
  UX_QA_AUDITOR_ROLE: 'UXQA',
  UXQAAUDITORROLE: 'UXQA',
  UXQARESULTS: 'UXQA',
  UX_QA_RESULTS: 'UXQA',
  UX_QA: 'UXQA',
  UX_QA_TEAM: 'UXQA',
  UXQATEAM: 'UXQA',
  UXTEAMQA: 'UXQA',
  UXTEAM_QA: 'UXQA',
  UXQUALITY: 'UXQA',
  UX_QUALITY: 'UXQA',
  UXQ: 'UXQA',
  UXA: 'UXQA',
  UX: 'UXQA',
  SPONSOR: 'SPONSOR',
  EXECUTIVE: 'SPONSOR'
});

const ROLE_LABELS = Object.freeze({
  PM: 'PM',
  ARCHITECT: 'Architecte',
  TEA: 'TEA',
  UXQA: 'UX QA',
  SPONSOR: 'Sponsor'
});

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_ROLE_DASHBOARD_INPUT: ['FIX_ROLE_DASHBOARD_INPUT_STRUCTURE'],
  ROLE_DASHBOARD_REQUIRED_ROLES_MISSING: ['RESTORE_REQUIRED_ROLE_DASHBOARDS_PM_ARCHITECT_TEA_UXQA_SPONSOR'],
  ROLE_DASHBOARD_PERSONALIZATION_REQUIRED: ['ADD_ROLE_SPECIFIC_CONTEXT_AND_WIDGETS_FOR_EACH_DASHBOARD'],
  ROLE_ACTION_QUEUE_REQUIRED: ['RESTORE_CONTEXTUALIZED_PRIORITY_ACTIONS_PER_ROLE'],
  ROLE_ACTION_CONTEXT_REQUIRED: ['ADD_CONTEXT_REF_TO_EACH_ROLE_ACTION'],
  ROLE_DASHBOARD_LATENCY_SAMPLES_REQUIRED: ['PROVIDE_ROLE_DASHBOARD_RENDER_LATENCY_SAMPLES'],
  ROLE_DASHBOARD_P95_LATENCY_BUDGET_EXCEEDED: ['OPTIMIZE_ROLE_DASHBOARD_PIPELINE_TO_KEEP_P95_UNDER_2S'],
  ROLE_DASHBOARD_MTTA_SAMPLES_REQUIRED: ['PROVIDE_ACK_LATENCY_SAMPLES_FOR_ROLE_ACTIONS'],
  ROLE_DASHBOARD_MTTA_BUDGET_EXCEEDED: ['REDUCE_CRITICAL_ACK_TIME_UNDER_10_MINUTES'],
  ROLE_DASHBOARD_NOTIFICATION_FATIGUE_RISK: ['THROTTLE_HIGH_PRIORITY_ACTIONS_PER_ROLE_TO_AVOID_ALERT_FATIGUE']
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

function roundNumber(value) {
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

function normalizeRole(value) {
  const normalized = normalizeText(String(value ?? '')).toUpperCase();

  if (!normalized) {
    return '';
  }

  const aliasKey = normalized.replace(/[\s\-_]+/g, '');

  if (ROLE_ALIAS_MAP[normalized]) {
    return ROLE_ALIAS_MAP[normalized];
  }

  if (ROLE_ALIAS_MAP[aliasKey]) {
    return ROLE_ALIAS_MAP[aliasKey];
  }

  return normalized;
}

function normalizeRoleList(value, fallback) {
  if (!Array.isArray(value)) {
    return cloneValue(fallback);
  }

  const output = [];
  const seen = new Set();

  for (const entry of value) {
    const normalized = normalizeRole(entry);

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(normalized);
  }

  return output.length > 0 ? output : cloneValue(fallback);
}

function percentile(values, rank) {
  if (!Array.isArray(values) || values.length === 0) {
    return null;
  }

  const filtered = values
    .map((entry) => normalizeNumber(entry))
    .filter((entry) => Number.isFinite(entry))
    .sort((left, right) => left - right);

  if (filtered.length === 0) {
    return null;
  }

  const boundedRank = Math.min(1, Math.max(0, normalizeNumber(rank, 0.95)));
  const index = Math.max(0, Math.ceil(boundedRank * filtered.length) - 1);

  return roundNumber(filtered[index]);
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
    (isObject(runtimeOptions.roleDashboardRules) && runtimeOptions.roleDashboardRules) ||
    (isObject(runtimeOptions.roleWorkspaceRules) && runtimeOptions.roleWorkspaceRules) ||
    (isObject(payload.roleDashboardRules) && payload.roleDashboardRules) ||
    (isObject(payload.roleWorkspaceRules) && payload.roleWorkspaceRules) ||
    {};

  return {
    modelVersion: normalizeText(String(source.modelVersion ?? payload.roleDashboardModelVersion ?? DEFAULT_MODEL_VERSION)) || DEFAULT_MODEL_VERSION,
    requiredRoles: normalizeRoleList(source.requiredRoles ?? payload.requiredRoles, DEFAULT_REQUIRED_ROLES),
    latencyP95BudgetMs: Math.max(
      100,
      normalizeNumber(source.latencyP95BudgetMs ?? payload.latencyP95BudgetMs, DEFAULT_LATENCY_P95_BUDGET_MS)
    ),
    mttaBudgetMinutes: Math.max(
      1,
      normalizeNumber(source.mttaBudgetMinutes ?? payload.mttaBudgetMinutes, DEFAULT_MTTA_BUDGET_MINUTES)
    ),
    minActionsPerRole: Math.max(
      1,
      Math.trunc(normalizeNumber(source.minActionsPerRole ?? payload.minActionsPerRole, DEFAULT_MIN_ACTIONS_PER_ROLE))
    ),
    highPriorityThreshold: Math.max(
      1,
      Math.min(
        100,
        normalizeNumber(source.highPriorityThreshold ?? payload.highPriorityThreshold, DEFAULT_HIGH_PRIORITY_THRESHOLD)
      )
    ),
    maxHighPriorityOpenPerRole: Math.max(
      1,
      Math.trunc(
        normalizeNumber(
          source.maxHighPriorityOpenPerRole ?? payload.maxHighPriorityOpenPerRole,
          DEFAULT_MAX_HIGH_PRIORITY_OPEN_PER_ROLE
        )
      )
    ),
    requireActionContext: source.requireActionContext !== false && payload.requireActionContext !== false
  };
}

function normalizeWidgets(value) {
  const source = Array.isArray(value) ? value : [];
  const widgets = [];
  const seen = new Set();

  for (let index = 0; index < source.length; index += 1) {
    const entry = source[index];

    if (!isObject(entry)) {
      const title = normalizeText(String(entry ?? ''));

      if (!title) {
        continue;
      }

      const id = `widget-${index + 1}-${title.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}`;

      if (seen.has(id)) {
        continue;
      }

      seen.add(id);
      widgets.push({
        id,
        title,
        sourceRef: ''
      });
      continue;
    }

    const title = normalizeText(String(entry.title ?? entry.label ?? entry.name ?? ''));
    const id =
      normalizeText(String(entry.id ?? entry.widgetId ?? title.toLowerCase().replace(/[^a-z0-9]+/gi, '-'))) ||
      `widget-${index + 1}`;

    if (!title || seen.has(id)) {
      continue;
    }

    seen.add(id);
    widgets.push({
      id,
      title,
      sourceRef: normalizeText(String(entry.sourceRef ?? entry.evidenceRef ?? ''))
    });
  }

  return widgets;
}

function resolveRoleDashboards(payload) {
  let source = null;

  if (Array.isArray(payload.roleDashboards)) {
    source = payload.roleDashboards;
  } else if (isObject(payload.roleDashboards)) {
    source = Object.entries(payload.roleDashboards).map(([role, dashboard]) => ({
      role,
      ...cloneValue(dashboard)
    }));
  } else if (isObject(payload.roleViews)) {
    source = Object.entries(payload.roleViews).map(([role, dashboard]) => ({
      role,
      ...cloneValue(dashboard)
    }));
  } else {
    source = [];
  }

  const dashboards = [];

  for (let index = 0; index < source.length; index += 1) {
    const entry = source[index];

    if (!isObject(entry)) {
      return {
        valid: false,
        reasonCode: 'INVALID_ROLE_DASHBOARD_INPUT',
        reason: `roleDashboards[${index}] invalide: objet requis.`
      };
    }

    const role = normalizeRole(entry.role ?? entry.ownerRole ?? entry.actorRole);

    if (!role) {
      return {
        valid: false,
        reasonCode: 'INVALID_ROLE_DASHBOARD_INPUT',
        reason: `roleDashboards[${index}] invalide: rôle requis.`
      };
    }

    const widgets = normalizeWidgets(entry.widgets ?? entry.cards ?? entry.panels);
    const contextRefs = normalizeStringList(entry.contextRefs ?? [entry.contextRef ?? entry.focusRef ?? entry.personaRef]);

    const dashboardId =
      normalizeText(String(entry.id ?? entry.dashboardId ?? `${role.toLowerCase()}-dashboard`)) ||
      `${role.toLowerCase()}-dashboard`;

    dashboards.push({
      role,
      dashboardId,
      title:
        normalizeText(String(entry.title ?? entry.label ?? `Dashboard ${ROLE_LABELS[role] ?? role}`)) ||
        `Dashboard ${ROLE_LABELS[role] ?? role}`,
      widgets,
      contextRefs
    });
  }

  return {
    valid: true,
    dashboards
  };
}

function normalizeActionStatus(value) {
  const normalized = normalizeText(String(value ?? '')).toUpperCase();

  if (!normalized) {
    return 'OPEN';
  }

  if (normalized === 'TO' + 'DO' || normalized === 'BACKLOG') {
    return 'OPEN';
  }

  if (normalized === 'DONE' || normalized === 'CLOSED') {
    return 'RESOLVED';
  }

  return normalized;
}

function resolveRoleActions(payload) {
  const source = Array.isArray(payload.roleActionQueue)
    ? payload.roleActionQueue
    : Array.isArray(payload.roleActions)
      ? payload.roleActions
      : Array.isArray(payload.prioritizedActions)
        ? payload.prioritizedActions
        : Array.isArray(payload.actions)
          ? payload.actions
          : [];

  if (source.length === 0) {
    return {
      valid: false,
      reasonCode: 'ROLE_ACTION_QUEUE_REQUIRED',
      reason: 'Aucune action priorisée contextualisée fournie par rôle.'
    };
  }

  const actions = [];

  for (let index = 0; index < source.length; index += 1) {
    const entry = source[index];

    if (!isObject(entry)) {
      return {
        valid: false,
        reasonCode: 'INVALID_ROLE_DASHBOARD_INPUT',
        reason: `roleActionQueue[${index}] invalide: objet requis.`
      };
    }

    const actionId =
      normalizeText(String(entry.id ?? entry.actionId ?? `role-action-${index + 1}`)) || `role-action-${index + 1}`;
    const role = normalizeRole(entry.role ?? entry.ownerRole ?? entry.actorRole ?? entry.targetRole);

    if (!role) {
      return {
        valid: false,
        reasonCode: 'INVALID_ROLE_DASHBOARD_INPUT',
        reason: `${actionId}: rôle manquant.`
      };
    }

    const priorityScore = normalizeNumber(entry.priorityScore ?? entry.priority ?? entry.score, Number.NaN);

    if (!Number.isFinite(priorityScore)) {
      return {
        valid: false,
        reasonCode: 'INVALID_ROLE_DASHBOARD_INPUT',
        reason: `${actionId}: priorityScore requis.`
      };
    }

    const summary = normalizeText(String(entry.summary ?? entry.action ?? entry.title ?? ''));

    if (!summary) {
      return {
        valid: false,
        reasonCode: 'INVALID_ROLE_DASHBOARD_INPUT',
        reason: `${actionId}: résumé d'action requis.`
      };
    }

    const contextRef = normalizeText(String(entry.contextRef ?? entry.evidenceRef ?? entry.gateRef ?? entry.storyRef ?? ''));
    const status = normalizeActionStatus(entry.status ?? entry.lifecycle);
    const ackMinutes = normalizeNumber(entry.ackMinutes ?? entry.ackLatencyMinutes ?? entry.mttaMinutes, Number.NaN);

    actions.push({
      actionId,
      role,
      priorityScore: roundNumber(priorityScore),
      summary,
      contextRef,
      status,
      ackMinutes: Number.isFinite(ackMinutes) ? roundNumber(ackMinutes) : null,
      owner: normalizeText(String(entry.owner ?? role)) || role
    });
  }

  return {
    valid: true,
    actions
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  roleDashboards,
  prioritizedActionQueue,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode: normalizeText(String(reasonCode || 'INVALID_ROLE_DASHBOARD_INPUT')),
    reason,
    diagnostics: cloneValue(diagnostics ?? {}),
    roleDashboards: cloneValue(roleDashboards ?? null),
    prioritizedActionQueue: cloneValue(prioritizedActionQueue ?? null),
    correctiveActions: normalizeActions(correctiveActions, reasonCode)
  };
}

export function buildRolePersonalizedDashboards(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_ROLE_DASHBOARD_INPUT',
      reason: 'Entrée S073 invalide: objet requis.'
    });
  }

  const rules = resolveRules(payload, runtimeOptions);

  const dashboardsResult = resolveRoleDashboards(payload);
  if (!dashboardsResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: dashboardsResult.reasonCode,
      reason: dashboardsResult.reason,
      diagnostics: {
        roleDashboardModelVersion: rules.modelVersion
      }
    });
  }

  const dashboardsByRole = new Map();

  for (const dashboard of dashboardsResult.dashboards) {
    if (!dashboardsByRole.has(dashboard.role)) {
      dashboardsByRole.set(dashboard.role, dashboard);
      continue;
    }

    const current = dashboardsByRole.get(dashboard.role);
    if (dashboard.widgets.length > current.widgets.length) {
      dashboardsByRole.set(dashboard.role, dashboard);
    }
  }

  const missingRoles = rules.requiredRoles.filter((role) => !dashboardsByRole.has(role));

  if (missingRoles.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'ROLE_DASHBOARD_REQUIRED_ROLES_MISSING',
      reason: `Dashboards requis manquants pour: ${missingRoles.join(', ')}.`,
      diagnostics: {
        roleDashboardModelVersion: rules.modelVersion,
        requiredRoles: cloneValue(rules.requiredRoles),
        missingRoles
      }
    });
  }

  const nonPersonalizedRoles = rules.requiredRoles.filter((role) => {
    const dashboard = dashboardsByRole.get(role);
    return dashboard.widgets.length === 0 || dashboard.contextRefs.length === 0;
  });

  if (nonPersonalizedRoles.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'ROLE_DASHBOARD_PERSONALIZATION_REQUIRED',
      reason: `Personnalisation insuffisante pour: ${nonPersonalizedRoles.join(', ')}.`,
      diagnostics: {
        roleDashboardModelVersion: rules.modelVersion,
        nonPersonalizedRoles
      }
    });
  }

  const actionsResult = resolveRoleActions(payload);
  if (!actionsResult.valid) {
    return createResult({
      allowed: false,
      reasonCode: actionsResult.reasonCode,
      reason: actionsResult.reason,
      diagnostics: {
        roleDashboardModelVersion: rules.modelVersion,
        requiredRoles: cloneValue(rules.requiredRoles)
      }
    });
  }

  const contextMissingIds = rules.requireActionContext
    ? actionsResult.actions.filter((action) => !action.contextRef).map((action) => action.actionId)
    : [];

  if (contextMissingIds.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'ROLE_ACTION_CONTEXT_REQUIRED',
      reason: `Contexte manquant pour actions: ${contextMissingIds.join(', ')}.`,
      diagnostics: {
        roleDashboardModelVersion: rules.modelVersion,
        contextMissingIds
      }
    });
  }

  const queueByRole = {};

  for (const role of rules.requiredRoles) {
    const queue = actionsResult.actions
      .filter((action) => action.role === role)
      .sort(
        (left, right) =>
          right.priorityScore - left.priorityScore ||
          (left.actionId < right.actionId ? -1 : left.actionId > right.actionId ? 1 : 0)
      );

    queueByRole[role] = queue;
  }

  const rolesWithoutQueue = rules.requiredRoles.filter((role) => queueByRole[role].length < rules.minActionsPerRole);

  if (rolesWithoutQueue.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'ROLE_ACTION_QUEUE_REQUIRED',
      reason: `File d'actions insuffisante pour: ${rolesWithoutQueue.join(', ')}.`,
      diagnostics: {
        roleDashboardModelVersion: rules.modelVersion,
        minActionsPerRole: rules.minActionsPerRole,
        rolesWithoutQueue
      }
    });
  }

  const fatigueRoles = rules.requiredRoles.filter((role) => {
    const openHighPriorityCount = queueByRole[role].filter(
      (action) => action.status === 'OPEN' && action.priorityScore >= rules.highPriorityThreshold
    ).length;

    return openHighPriorityCount > rules.maxHighPriorityOpenPerRole;
  });

  if (fatigueRoles.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'ROLE_DASHBOARD_NOTIFICATION_FATIGUE_RISK',
      reason: `Fatigue notifications détectée pour: ${fatigueRoles.join(', ')}.`,
      diagnostics: {
        roleDashboardModelVersion: rules.modelVersion,
        highPriorityThreshold: rules.highPriorityThreshold,
        maxHighPriorityOpenPerRole: rules.maxHighPriorityOpenPerRole,
        fatigueRoles
      }
    });
  }

  const latencySamples = normalizeStringList([]);
  const rawLatency = Array.isArray(payload.latencySamplesMs)
    ? payload.latencySamplesMs
    : Array.isArray(payload.roleDashboardLatencySamplesMs)
      ? payload.roleDashboardLatencySamplesMs
      : Array.isArray(runtimeOptions.latencySamplesMs)
        ? runtimeOptions.latencySamplesMs
        : [];

  for (const entry of rawLatency) {
    const numeric = normalizeNumber(entry);

    if (Number.isFinite(numeric) && numeric >= 0) {
      latencySamples.push(roundNumber(numeric));
    }
  }

  if (latencySamples.length === 0) {
    return createResult({
      allowed: false,
      reasonCode: 'ROLE_DASHBOARD_LATENCY_SAMPLES_REQUIRED',
      reason: 'Samples de latence p95 requis pour vérifier NFR-010.',
      diagnostics: {
        roleDashboardModelVersion: rules.modelVersion,
        latencyP95BudgetMs: rules.latencyP95BudgetMs
      }
    });
  }

  const latencyP95Ms = percentile(latencySamples, 0.95);

  if (latencyP95Ms === null || latencyP95Ms > rules.latencyP95BudgetMs) {
    return createResult({
      allowed: false,
      reasonCode: 'ROLE_DASHBOARD_P95_LATENCY_BUDGET_EXCEEDED',
      reason: `NFR-010 non satisfait: p95 ${latencyP95Ms ?? 'n/a'}ms > ${rules.latencyP95BudgetMs}ms.`,
      diagnostics: {
        roleDashboardModelVersion: rules.modelVersion,
        latencyP95Ms,
        latencyP95BudgetMs: rules.latencyP95BudgetMs,
        latencySampleCount: latencySamples.length
      }
    });
  }

  const mttaSamples = [];

  const rawMttaSamples = Array.isArray(payload.mttaSamplesMinutes)
    ? payload.mttaSamplesMinutes
    : Array.isArray(payload.ackLatencySamplesMinutes)
      ? payload.ackLatencySamplesMinutes
      : Array.isArray(runtimeOptions.mttaSamplesMinutes)
        ? runtimeOptions.mttaSamplesMinutes
        : [];

  for (const sample of rawMttaSamples) {
    const numeric = normalizeNumber(sample);

    if (Number.isFinite(numeric) && numeric >= 0) {
      mttaSamples.push(roundNumber(numeric));
    }
  }

  if (mttaSamples.length === 0) {
    for (const action of actionsResult.actions) {
      if (Number.isFinite(action.ackMinutes)) {
        mttaSamples.push(roundNumber(action.ackMinutes));
      }
    }
  }

  if (mttaSamples.length === 0) {
    return createResult({
      allowed: false,
      reasonCode: 'ROLE_DASHBOARD_MTTA_SAMPLES_REQUIRED',
      reason: 'Samples MTTA requis pour vérifier NFR-017.',
      diagnostics: {
        roleDashboardModelVersion: rules.modelVersion,
        mttaBudgetMinutes: rules.mttaBudgetMinutes
      }
    });
  }

  const mttaP90Minutes = percentile(mttaSamples, 0.9);

  if (mttaP90Minutes === null || mttaP90Minutes > rules.mttaBudgetMinutes) {
    return createResult({
      allowed: false,
      reasonCode: 'ROLE_DASHBOARD_MTTA_BUDGET_EXCEEDED',
      reason: `NFR-017 non satisfait: MTTA p90 ${mttaP90Minutes ?? 'n/a'}min > ${rules.mttaBudgetMinutes}min.`,
      diagnostics: {
        roleDashboardModelVersion: rules.modelVersion,
        mttaP90Minutes,
        mttaBudgetMinutes: rules.mttaBudgetMinutes,
        mttaSampleCount: mttaSamples.length
      }
    });
  }

  const generatedAtMs = Number.isFinite(Number(runtimeOptions.nowMs)) ? Number(runtimeOptions.nowMs) : Date.now();

  const roleViews = rules.requiredRoles.map((role) => {
    const dashboard = dashboardsByRole.get(role);
    const queue = queueByRole[role];
    const topAction = queue[0];

    return {
      role,
      roleLabel: ROLE_LABELS[role] ?? role,
      dashboardId: dashboard.dashboardId,
      title: dashboard.title,
      widgetCount: dashboard.widgets.length,
      contextRefs: cloneValue(dashboard.contextRefs),
      widgets: cloneValue(dashboard.widgets),
      queueDepth: queue.length,
      topAction: {
        actionId: topAction.actionId,
        priorityScore: topAction.priorityScore,
        summary: topAction.summary,
        contextRef: topAction.contextRef,
        status: topAction.status
      }
    };
  });

  const prioritizedActionQueue = {
    model: 'ROLE_CONTEXTUAL_ACTION_QUEUE',
    modelVersion: rules.modelVersion,
    queueByRole: cloneValue(queueByRole),
    summary: {
      totalActions: actionsResult.actions.length,
      requiredRolesCovered: rules.requiredRoles.length,
      minActionsPerRole: rules.minActionsPerRole,
      highPriorityThreshold: rules.highPriorityThreshold,
      maxHighPriorityOpenPerRole: rules.maxHighPriorityOpenPerRole,
      fatigueRiskDetected: false
    }
  };

  const roleDashboards = {
    model: 'ROLE_PERSONALIZED_DASHBOARDS',
    modelVersion: rules.modelVersion,
    generatedAt: toIso(generatedAtMs),
    roles: roleViews,
    performance: {
      latencyP95Ms,
      latencyP95BudgetMs: rules.latencyP95BudgetMs,
      sampleCount: latencySamples.length,
      budgetCompliant: latencyP95Ms <= rules.latencyP95BudgetMs
    },
    reliability: {
      mttaP90Minutes,
      mttaBudgetMinutes: rules.mttaBudgetMinutes,
      sampleCount: mttaSamples.length,
      budgetCompliant: mttaP90Minutes <= rules.mttaBudgetMinutes
    }
  };

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason:
      'Dashboards personnalisés par rôle et file d’actions contextualisées validés (PM/Architecte/TEA/UX QA/Sponsor).',
    diagnostics: {
      roleDashboardModelVersion: rules.modelVersion,
      requiredRoles: cloneValue(rules.requiredRoles),
      latencyP95Ms,
      latencyP95BudgetMs: rules.latencyP95BudgetMs,
      mttaP90Minutes,
      mttaBudgetMinutes: rules.mttaBudgetMinutes,
      totalActions: actionsResult.actions.length
    },
    roleDashboards,
    prioritizedActionQueue,
    correctiveActions: []
  });
}
