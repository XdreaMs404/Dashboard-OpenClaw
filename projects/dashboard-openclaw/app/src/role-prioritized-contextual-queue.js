import { buildRolePersonalizedDashboards } from './role-personalized-dashboards.js';

const DEFAULT_MODEL_VERSION = 'S074-v1';
const DEFAULT_REQUIRED_SEVERITIES = Object.freeze(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']);
const DEFAULT_CRITICAL_DECISION_BUDGET_SECONDS = 90;
const DEFAULT_MTTA_BUDGET_MINUTES = 10;
const DEFAULT_MAX_OPEN_CRITICAL = 3;

const SEVERITY_RANK = Object.freeze({
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1
});

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_ROLE_PRIORITY_QUEUE_INPUT: ['FIX_ROLE_PRIORITY_QUEUE_INPUT_STRUCTURE'],
  ROLE_NOTIFICATION_CENTER_REQUIRED: ['DECLARE_CENTRALIZED_NOTIFICATION_QUEUE_WITH_SEVERITIES'],
  ROLE_NOTIFICATION_SEVERITY_REQUIRED: ['NORMALIZE_NOTIFICATION_SEVERITY_TO_CRITICAL_HIGH_MEDIUM_LOW'],
  ROLE_NOTIFICATION_SEVERITY_COVERAGE_REQUIRED: ['COVER_CRITICAL_HIGH_MEDIUM_LOW_IN_NOTIFICATION_CENTER'],
  ROLE_NOTIFICATION_CONTEXT_REQUIRED: ['ATTACH_CONTEXT_REF_TO_EACH_NOTIFICATION_ACTION'],
  ROLE_NOTIFICATION_CRITICAL_BACKLOG_EXCEEDED: ['REDUCE_OPEN_CRITICAL_NOTIFICATIONS_TO_AVOID_ALERT_FATIGUE'],
  ROLE_NOTIFICATION_DECISION_LATENCY_SAMPLES_REQUIRED: ['ADD_CRITICAL_DECISION_LATENCY_SAMPLES'],
  ROLE_NOTIFICATION_DECISION_LATENCY_BUDGET_EXCEEDED: ['REDUCE_CRITICAL_DECISION_LATENCY_BELOW_90_SECONDS'],
  ROLE_NOTIFICATION_MTTA_SAMPLES_REQUIRED: ['ADD_NOTIFICATION_MTTA_SAMPLES'],
  ROLE_NOTIFICATION_MTTA_BUDGET_EXCEEDED: ['REDUCE_NOTIFICATION_MTTA_BELOW_10_MINUTES']
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

function normalizeSeverity(value, priorityScore) {
  const normalized = normalizeText(String(value ?? '')).toUpperCase();

  if (normalized === 'CRITICAL' || normalized === 'CRITIQUE' || normalized === 'P0') {
    return 'CRITICAL';
  }

  if (normalized === 'HIGH' || normalized === 'ELEVATED' || normalized === 'ÉLEVÉ' || normalized === 'ELEVE' || normalized === 'P1') {
    return 'HIGH';
  }

  if (normalized === 'MEDIUM' || normalized === 'MOYEN' || normalized === 'P2') {
    return 'MEDIUM';
  }

  if (normalized === 'LOW' || normalized === 'FAIBLE' || normalized === 'P3') {
    return 'LOW';
  }

  const score = normalizeNumber(priorityScore, Number.NaN);

  if (Number.isFinite(score) && score >= 90) {
    return 'CRITICAL';
  }

  if (Number.isFinite(score) && score >= 80) {
    return 'HIGH';
  }

  if (Number.isFinite(score) && score >= 70) {
    return 'MEDIUM';
  }

  if (Number.isFinite(score)) {
    return 'LOW';
  }

  return '';
}

function normalizeStatus(value) {
  const normalized = normalizeText(String(value ?? '')).toUpperCase();

  if (!normalized || normalized === 'OPEN' || normalized === 'TO' + 'DO' || normalized === 'BACKLOG') {
    return 'OPEN';
  }

  if (normalized === 'DONE' || normalized === 'CLOSED' || normalized === 'RESOLVED' || normalized === 'ACKED') {
    return 'RESOLVED';
  }

  return 'OPEN';
}

function resolveRules(payload, runtimeOptions) {
  const source =
    (isObject(runtimeOptions.priorityQueueRules) && runtimeOptions.priorityQueueRules) ||
    (isObject(payload.priorityQueueRules) && payload.priorityQueueRules) ||
    {};

  const requiredSeverities = Array.isArray(source.requiredSeverities)
    ? source.requiredSeverities
    : Array.isArray(payload.requiredSeverities)
      ? payload.requiredSeverities
      : DEFAULT_REQUIRED_SEVERITIES;

  const normalizedSeverities = [];
  const seen = new Set();

  for (const severity of requiredSeverities) {
    const normalized = normalizeSeverity(severity, Number.NaN);

    if (!normalized || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    normalizedSeverities.push(normalized);
  }

  return {
    modelVersion:
      normalizeText(String(source.modelVersion ?? payload.priorityQueueModelVersion ?? DEFAULT_MODEL_VERSION)) ||
      DEFAULT_MODEL_VERSION,
    requiredSeverities:
      normalizedSeverities.length > 0 ? normalizedSeverities : cloneValue(DEFAULT_REQUIRED_SEVERITIES),
    criticalDecisionBudgetSeconds: Math.max(
      1,
      normalizeNumber(
        source.criticalDecisionBudgetSeconds ??
          payload.criticalDecisionBudgetSeconds ??
          DEFAULT_CRITICAL_DECISION_BUDGET_SECONDS,
        DEFAULT_CRITICAL_DECISION_BUDGET_SECONDS
      )
    ),
    mttaBudgetMinutes: Math.max(
      1,
      normalizeNumber(source.mttaBudgetMinutes ?? payload.mttaBudgetMinutes ?? DEFAULT_MTTA_BUDGET_MINUTES, DEFAULT_MTTA_BUDGET_MINUTES)
    ),
    maxOpenCritical: Math.max(
      0,
      Math.trunc(normalizeNumber(source.maxOpenCritical ?? payload.maxOpenCritical ?? DEFAULT_MAX_OPEN_CRITICAL, DEFAULT_MAX_OPEN_CRITICAL))
    ),
    requireContext: source.requireContext !== false && payload.requireNotificationContext !== false
  };
}

function resolveNotificationSource(payload) {
  if (Array.isArray(payload.notificationCenter)) {
    return payload.notificationCenter;
  }

  if (isObject(payload.notificationCenter) && Array.isArray(payload.notificationCenter.items)) {
    return payload.notificationCenter.items;
  }

  if (Array.isArray(payload.notificationQueue)) {
    return payload.notificationQueue;
  }

  if (Array.isArray(payload.notifications)) {
    return payload.notifications;
  }

  return [];
}

function normalizeNotifications(payload, rules) {
  const source = resolveNotificationSource(payload);

  if (source.length === 0) {
    return {
      valid: false,
      reasonCode: 'ROLE_NOTIFICATION_CENTER_REQUIRED',
      reason: 'Aucune file de notifications centralisée fournie (FR-057).'
    };
  }

  const notifications = [];

  for (let index = 0; index < source.length; index += 1) {
    const entry = source[index];

    if (!isObject(entry)) {
      return {
        valid: false,
        reasonCode: 'INVALID_ROLE_PRIORITY_QUEUE_INPUT',
        reason: `notificationCenter[${index}] invalide: objet requis.`
      };
    }

    const notificationId =
      normalizeText(String(entry.id ?? entry.notificationId ?? `notification-${index + 1}`)) ||
      `notification-${index + 1}`;
    const role =
      normalizeText(String(entry.role ?? entry.ownerRole ?? entry.targetRole ?? entry.actorRole ?? '')).toUpperCase() ||
      '';
    const priorityScore = normalizeNumber(entry.priorityScore ?? entry.priority ?? entry.score, Number.NaN);
    const severity = normalizeSeverity(entry.severity ?? entry.level ?? entry.priorityLabel, priorityScore);
    const summary = normalizeText(String(entry.summary ?? entry.message ?? entry.title ?? entry.action ?? ''));
    const status = normalizeStatus(entry.status ?? entry.lifecycle);
    const contextRef = normalizeText(String(entry.contextRef ?? entry.evidenceRef ?? entry.gateRef ?? entry.storyRef ?? ''));
    const ackMinutes = normalizeNumber(entry.ackMinutes ?? entry.ackLatencyMinutes ?? entry.mttaMinutes, Number.NaN);
    const decisionLatencySeconds = normalizeNumber(
      entry.decisionLatencySeconds ?? entry.decisionSeconds ?? entry.latencySeconds,
      Number.NaN
    );

    if (!role || !summary) {
      return {
        valid: false,
        reasonCode: 'INVALID_ROLE_PRIORITY_QUEUE_INPUT',
        reason: `${notificationId}: role et summary requis.`
      };
    }

    if (!severity || !SEVERITY_RANK[severity]) {
      return {
        valid: false,
        reasonCode: 'ROLE_NOTIFICATION_SEVERITY_REQUIRED',
        reason: `${notificationId}: sévérité invalide (CRITICAL/HIGH/MEDIUM/LOW).`
      };
    }

    if (rules.requireContext && !contextRef) {
      return {
        valid: false,
        reasonCode: 'ROLE_NOTIFICATION_CONTEXT_REQUIRED',
        reason: `${notificationId}: contexte manquant pour action contextualisée.`
      };
    }

    notifications.push({
      notificationId,
      role,
      severity,
      priorityScore: Number.isFinite(priorityScore) ? roundNumber(priorityScore) : 0,
      summary,
      status,
      contextRef,
      ackMinutes: Number.isFinite(ackMinutes) ? roundNumber(ackMinutes) : null,
      decisionLatencySeconds: Number.isFinite(decisionLatencySeconds) ? roundNumber(decisionLatencySeconds) : null
    });
  }

  return {
    valid: true,
    notifications
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  roleDashboards,
  prioritizedActionQueue,
  notificationCenter,
  correctiveActions
}) {
  return {
    allowed,
    reasonCode: normalizeText(String(reasonCode || 'INVALID_ROLE_PRIORITY_QUEUE_INPUT')),
    reason,
    diagnostics: cloneValue(diagnostics ?? {}),
    roleDashboards: cloneValue(roleDashboards ?? null),
    prioritizedActionQueue: cloneValue(prioritizedActionQueue ?? null),
    notificationCenter: cloneValue(notificationCenter ?? null),
    correctiveActions: normalizeActions(correctiveActions, reasonCode)
  };
}

export function buildRolePrioritizedContextualQueue(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_ROLE_PRIORITY_QUEUE_INPUT',
      reason: 'Entrée S074 invalide: objet requis.'
    });
  }

  const baseResult = buildRolePersonalizedDashboards(payload, runtimeOptions);

  if (!baseResult.allowed) {
    return createResult({
      allowed: false,
      reasonCode: baseResult.reasonCode,
      reason: baseResult.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        priorityQueueModelVersion: DEFAULT_MODEL_VERSION
      },
      roleDashboards: baseResult.roleDashboards,
      prioritizedActionQueue: baseResult.prioritizedActionQueue,
      notificationCenter: null,
      correctiveActions: baseResult.correctiveActions
    });
  }

  const rules = resolveRules(payload, runtimeOptions);
  const normalizedNotifications = normalizeNotifications(payload, rules);

  if (!normalizedNotifications.valid) {
    return createResult({
      allowed: false,
      reasonCode: normalizedNotifications.reasonCode,
      reason: normalizedNotifications.reason,
      diagnostics: {
        ...baseResult.diagnostics,
        priorityQueueModelVersion: rules.modelVersion
      },
      roleDashboards: baseResult.roleDashboards,
      prioritizedActionQueue: baseResult.prioritizedActionQueue,
      notificationCenter: null
    });
  }

  const notifications = normalizedNotifications.notifications
    .slice()
    .sort(
      (left, right) =>
        SEVERITY_RANK[right.severity] - SEVERITY_RANK[left.severity] ||
        right.priorityScore - left.priorityScore ||
        left.notificationId.localeCompare(right.notificationId)
    );

  const severityDistribution = {
    CRITICAL: notifications.filter((entry) => entry.severity === 'CRITICAL').length,
    HIGH: notifications.filter((entry) => entry.severity === 'HIGH').length,
    MEDIUM: notifications.filter((entry) => entry.severity === 'MEDIUM').length,
    LOW: notifications.filter((entry) => entry.severity === 'LOW').length
  };

  const missingSeverities = rules.requiredSeverities.filter((severity) => severityDistribution[severity] === 0);

  if (missingSeverities.length > 0) {
    return createResult({
      allowed: false,
      reasonCode: 'ROLE_NOTIFICATION_SEVERITY_COVERAGE_REQUIRED',
      reason: `FR-057 non satisfait: niveaux manquants (${missingSeverities.join(', ')}).`,
      diagnostics: {
        ...baseResult.diagnostics,
        priorityQueueModelVersion: rules.modelVersion,
        missingSeverities
      },
      roleDashboards: baseResult.roleDashboards,
      prioritizedActionQueue: baseResult.prioritizedActionQueue,
      notificationCenter: {
        model: 'ROLE_PRIORITIZED_CONTEXTUAL_QUEUE',
        modelVersion: rules.modelVersion,
        queue: notifications,
        summary: {
          severityDistribution
        }
      }
    });
  }

  const openCriticalCount = notifications.filter(
    (entry) => entry.severity === 'CRITICAL' && entry.status === 'OPEN'
  ).length;

  if (openCriticalCount > rules.maxOpenCritical) {
    return createResult({
      allowed: false,
      reasonCode: 'ROLE_NOTIFICATION_CRITICAL_BACKLOG_EXCEEDED',
      reason: `Backlog critique ouvert ${openCriticalCount} > ${rules.maxOpenCritical}.`,
      diagnostics: {
        ...baseResult.diagnostics,
        priorityQueueModelVersion: rules.modelVersion,
        openCriticalCount,
        maxOpenCritical: rules.maxOpenCritical
      },
      roleDashboards: baseResult.roleDashboards,
      prioritizedActionQueue: baseResult.prioritizedActionQueue,
      notificationCenter: {
        model: 'ROLE_PRIORITIZED_CONTEXTUAL_QUEUE',
        modelVersion: rules.modelVersion,
        queue: notifications,
        summary: {
          severityDistribution,
          openCriticalCount
        }
      }
    });
  }

  const decisionSamples = Array.isArray(payload.criticalDecisionSamplesSec)
    ? payload.criticalDecisionSamplesSec
    : notifications
        .filter((entry) => entry.severity === 'CRITICAL' && Number.isFinite(entry.decisionLatencySeconds))
        .map((entry) => entry.decisionLatencySeconds);

  const normalizedDecisionSamples = decisionSamples
    .map((entry) => normalizeNumber(entry))
    .filter((entry) => Number.isFinite(entry) && entry >= 0)
    .map((entry) => roundNumber(entry));

  if (normalizedDecisionSamples.length === 0) {
    return createResult({
      allowed: false,
      reasonCode: 'ROLE_NOTIFICATION_DECISION_LATENCY_SAMPLES_REQUIRED',
      reason: 'Samples de latence décision critique requis pour NFR-033.',
      diagnostics: {
        ...baseResult.diagnostics,
        priorityQueueModelVersion: rules.modelVersion,
        criticalDecisionBudgetSeconds: rules.criticalDecisionBudgetSeconds
      },
      roleDashboards: baseResult.roleDashboards,
      prioritizedActionQueue: baseResult.prioritizedActionQueue,
      notificationCenter: {
        model: 'ROLE_PRIORITIZED_CONTEXTUAL_QUEUE',
        modelVersion: rules.modelVersion,
        queue: notifications
      }
    });
  }

  const p95CriticalDecisionSec = percentile(normalizedDecisionSamples, 0.95);

  if (p95CriticalDecisionSec === null || p95CriticalDecisionSec > rules.criticalDecisionBudgetSeconds) {
    return createResult({
      allowed: false,
      reasonCode: 'ROLE_NOTIFICATION_DECISION_LATENCY_BUDGET_EXCEEDED',
      reason: `NFR-033 non satisfait: p95 décision critique ${p95CriticalDecisionSec ?? 'n/a'}s > ${rules.criticalDecisionBudgetSeconds}s.`,
      diagnostics: {
        ...baseResult.diagnostics,
        priorityQueueModelVersion: rules.modelVersion,
        p95CriticalDecisionSec,
        criticalDecisionBudgetSeconds: rules.criticalDecisionBudgetSeconds
      },
      roleDashboards: baseResult.roleDashboards,
      prioritizedActionQueue: baseResult.prioritizedActionQueue,
      notificationCenter: {
        model: 'ROLE_PRIORITIZED_CONTEXTUAL_QUEUE',
        modelVersion: rules.modelVersion,
        queue: notifications
      }
    });
  }

  const mttaSamples = Array.isArray(payload.notificationMttaSamplesMinutes)
    ? payload.notificationMttaSamplesMinutes
    : notifications.filter((entry) => Number.isFinite(entry.ackMinutes)).map((entry) => entry.ackMinutes);

  const normalizedMttaSamples = mttaSamples
    .map((entry) => normalizeNumber(entry))
    .filter((entry) => Number.isFinite(entry) && entry >= 0)
    .map((entry) => roundNumber(entry));

  if (normalizedMttaSamples.length === 0) {
    return createResult({
      allowed: false,
      reasonCode: 'ROLE_NOTIFICATION_MTTA_SAMPLES_REQUIRED',
      reason: 'Samples MTTA notifications requis pour NFR-017.',
      diagnostics: {
        ...baseResult.diagnostics,
        priorityQueueModelVersion: rules.modelVersion,
        mttaBudgetMinutes: rules.mttaBudgetMinutes
      },
      roleDashboards: baseResult.roleDashboards,
      prioritizedActionQueue: baseResult.prioritizedActionQueue,
      notificationCenter: {
        model: 'ROLE_PRIORITIZED_CONTEXTUAL_QUEUE',
        modelVersion: rules.modelVersion,
        queue: notifications
      }
    });
  }

  const p90MttaMinutes = percentile(normalizedMttaSamples, 0.9);

  if (p90MttaMinutes === null || p90MttaMinutes > rules.mttaBudgetMinutes) {
    return createResult({
      allowed: false,
      reasonCode: 'ROLE_NOTIFICATION_MTTA_BUDGET_EXCEEDED',
      reason: `NFR-017 non satisfait: MTTA p90 ${p90MttaMinutes ?? 'n/a'}min > ${rules.mttaBudgetMinutes}min.`,
      diagnostics: {
        ...baseResult.diagnostics,
        priorityQueueModelVersion: rules.modelVersion,
        p90MttaMinutes,
        mttaBudgetMinutes: rules.mttaBudgetMinutes
      },
      roleDashboards: baseResult.roleDashboards,
      prioritizedActionQueue: baseResult.prioritizedActionQueue,
      notificationCenter: {
        model: 'ROLE_PRIORITIZED_CONTEXTUAL_QUEUE',
        modelVersion: rules.modelVersion,
        queue: notifications
      }
    });
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason:
      'File d’actions priorisées contextualisées validée avec notification center multi-sévérité (FR-056/FR-057).',
    diagnostics: {
      ...baseResult.diagnostics,
      priorityQueueModelVersion: rules.modelVersion,
      p95CriticalDecisionSec,
      criticalDecisionBudgetSeconds: rules.criticalDecisionBudgetSeconds,
      p90MttaMinutes,
      mttaBudgetMinutes: rules.mttaBudgetMinutes,
      openCriticalCount,
      totalNotifications: notifications.length
    },
    roleDashboards: baseResult.roleDashboards,
    prioritizedActionQueue: baseResult.prioritizedActionQueue,
    notificationCenter: {
      model: 'ROLE_PRIORITIZED_CONTEXTUAL_QUEUE',
      modelVersion: rules.modelVersion,
      queue: notifications,
      summary: {
        totalNotifications: notifications.length,
        openNotifications: notifications.filter((entry) => entry.status === 'OPEN').length,
        severityDistribution,
        openCriticalCount,
        p95CriticalDecisionSec,
        criticalDecisionBudgetSeconds: rules.criticalDecisionBudgetSeconds,
        p90MttaMinutes,
        mttaBudgetMinutes: rules.mttaBudgetMinutes
      }
    },
    correctiveActions: []
  });
}
