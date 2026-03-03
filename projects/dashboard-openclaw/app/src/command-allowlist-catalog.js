const MODE_SET = new Set(['READ', 'WRITE', 'CRITICAL']);
const PARAM_TYPE_SET = new Set(['string', 'number', 'boolean']);

const REASON_CODES = Object.freeze([
  'OK',
  'INVALID_COMMAND_CATALOG_INPUT',
  'VERSION_REQUIRED',
  'INVALID_COMMAND_ENTRY',
  'DUPLICATE_COMMAND_ID',
  'PARAMETER_SCHEMA_REQUIRED',
  'COMMAND_OUTSIDE_CATALOG',
  'DRY_RUN_REQUIRED_FOR_WRITE',
  'DOUBLE_CONFIRMATION_REQUIRED',
  'DOUBLE_CONFIRMATION_DISTINCT_ACTORS_REQUIRED',
  'CRITICAL_ACTION_ROLE_REQUIRED',
  'ROLE_PERMISSION_REQUIRED',
  'ACTIVE_PROJECT_ROOT_SIGNATURE_REQUIRED',
  'ACTIVE_PROJECT_ROOT_SIGNATURE_INVALID',
  'COMMAND_JOURNAL_TAMPER_DETECTED',
  'TIMEOUT_POLICY_VIOLATION',
  'RETRY_POLICY_VIOLATION',
  'IDEMPOTENCY_KEY_REQUIRED',
  'IDEMPOTENCY_KEY_REUSE_CONFLICT',
  'EXECUTION_CAPACITY_EXCEEDED',
  'WRITE_KILL_SWITCH_ACTIVE',
  'POLICY_OVERRIDE_APPROVAL_REQUIRED',
  'POLICY_OVERRIDE_TEMPLATE_REQUIRED',
  'INVALID_PARAMETER_VALUE',
  'UNSAFE_PARAMETER_VALUE'
]);

const REASON_CODE_SET = new Set(REASON_CODES);

const DEFAULT_CORRECTIVE_ACTIONS = Object.freeze({
  INVALID_COMMAND_CATALOG_INPUT: ['FIX_COMMAND_CATALOG_INPUT'],
  VERSION_REQUIRED: ['SET_CATALOG_VERSION'],
  INVALID_COMMAND_ENTRY: ['FIX_COMMAND_ENTRY_FIELDS'],
  DUPLICATE_COMMAND_ID: ['DEDUP_COMMAND_IDS'],
  PARAMETER_SCHEMA_REQUIRED: ['DEFINE_PARAMETER_SCHEMA'],
  COMMAND_OUTSIDE_CATALOG: ['BLOCK_NON_ALLOWLIST_COMMAND'],
  DRY_RUN_REQUIRED_FOR_WRITE: ['ENFORCE_DRY_RUN_FOR_WRITE'],
  DOUBLE_CONFIRMATION_REQUIRED: ['ENFORCE_DOUBLE_CONFIRMATION'],
  DOUBLE_CONFIRMATION_DISTINCT_ACTORS_REQUIRED: ['ENFORCE_DISTINCT_CONFIRMERS'],
  CRITICAL_ACTION_ROLE_REQUIRED: ['ENFORCE_CRITICAL_ROLE_POLICY'],
  ROLE_PERMISSION_REQUIRED: ['ENFORCE_ROLE_POLICY'],
  ACTIVE_PROJECT_ROOT_SIGNATURE_REQUIRED: ['SIGN_ACTIVE_PROJECT_ROOT_CONTEXT'],
  ACTIVE_PROJECT_ROOT_SIGNATURE_INVALID: ['REGENERATE_ACTIVE_PROJECT_ROOT_SIGNATURE'],
  COMMAND_JOURNAL_TAMPER_DETECTED: ['RESTORE_APPEND_ONLY_COMMAND_JOURNAL'],
  TIMEOUT_POLICY_VIOLATION: ['ALIGN_TIMEOUT_POLICY'],
  RETRY_POLICY_VIOLATION: ['ALIGN_RETRY_POLICY'],
  IDEMPOTENCY_KEY_REQUIRED: ['SET_IDEMPOTENCY_KEY'],
  IDEMPOTENCY_KEY_REUSE_CONFLICT: ['ROTATE_IDEMPOTENCY_KEY'],
  EXECUTION_CAPACITY_EXCEEDED: ['SEQUENCE_WITH_AVAILABLE_CAPACITY'],
  WRITE_KILL_SWITCH_ACTIVE: ['RELEASE_WRITE_KILL_SWITCH_AFTER_INCIDENT_REVIEW'],
  POLICY_OVERRIDE_APPROVAL_REQUIRED: ['REQUIRE_NOMINATIVE_POLICY_APPROVAL'],
  POLICY_OVERRIDE_TEMPLATE_REQUIRED: ['USE_VALIDATED_COMMAND_TEMPLATE'],
  INVALID_PARAMETER_VALUE: ['FIX_PARAMETER_VALUES'],
  UNSAFE_PARAMETER_VALUE: ['SANITIZE_COMMAND_PARAMETERS']
});

const UNSAFE_VALUE_PATTERN = /(;|&&|\|\||`|\$\(|\n|\r)/;
const DEFAULT_ACTIVE_PROJECT_ROOT_SIGNING_SECRET = 'bmad-active-project-root-signature-v1';
const DEFAULT_MAX_TIMEOUT_MS = 120000;
const DEFAULT_MAX_RETRY_COUNT = 3;
const DEFAULT_EXECUTION_CAPACITY = 1;
const DEFAULT_MAX_QUEUE_DEPTH_MULTIPLIER = 4;

const PRIORITY_WEIGHT_BY_MODE = Object.freeze({
  CRITICAL: 0,
  WRITE: 1,
  READ: 2
});

const PRIORITY_WEIGHT_BY_LABEL = Object.freeze({
  p0: 0,
  critical: 0,
  urgent: 0,
  high: 1,
  p1: 1,
  normal: 2,
  medium: 2,
  p2: 2,
  low: 3,
  p3: 3
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

  const clone = {};

  for (const [key, nested] of Object.entries(value)) {
    clone[key] = cloneValue(nested);
  }

  return clone;
}

function normalizeText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizeIdentifier(value) {
  return normalizeText(String(value ?? '')).toLowerCase();
}

function normalizeReasonCode(value) {
  const normalized = normalizeText(value);

  if (!REASON_CODE_SET.has(normalized)) {
    return null;
  }

  return normalized;
}

function normalizeRoles(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const output = [];
  const seen = new Set();

  for (const item of value) {
    const role = normalizeText(String(item ?? '')).toUpperCase();

    if (role.length === 0 || seen.has(role)) {
      continue;
    }

    seen.add(role);
    output.push(role);
  }

  return output;
}

function normalizeImpactFiles(value) {
  const source = Array.isArray(value) ? value : [];
  const output = [];
  const seen = new Set();

  for (const entry of source) {
    const normalized = normalizeText(String(entry ?? ''));

    if (normalized.length === 0 || seen.has(normalized)) {
      continue;
    }

    seen.add(normalized);
    output.push(normalized);
  }

  return output;
}

function normalizeActiveProjectRoot(value) {
  const normalized = normalizeText(String(value ?? ''));

  if (normalized.length === 0) {
    return '';
  }

  return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
}

function hashSignatureInput(value) {
  let h1 = 0xdeadbeef ^ value.length;
  let h2 = 0x41c6ce57 ^ value.length;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }

  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

  const partA = (h1 >>> 0).toString(16).padStart(8, '0');
  const partB = (h2 >>> 0).toString(16).padStart(8, '0');

  return `${partA}${partB}`;
}

export function signActiveProjectRoot(activeProjectRoot, signingSecret = DEFAULT_ACTIVE_PROJECT_ROOT_SIGNING_SECRET) {
  const normalizedRoot = normalizeActiveProjectRoot(activeProjectRoot);
  const normalizedSecret = normalizeText(String(signingSecret ?? ''));

  if (normalizedRoot.length === 0) {
    return '';
  }

  const signatureInput = `${normalizedRoot}|${normalizedSecret || DEFAULT_ACTIVE_PROJECT_ROOT_SIGNING_SECRET}`;
  const digest = hashSignatureInput(signatureInput);

  return `apr-v1-${digest}`;
}

function normalizeJournalTimestamp(value) {
  const normalized = normalizeText(String(value ?? ''));

  if (normalized.length === 0) {
    return new Date().toISOString();
  }

  return normalized;
}

function normalizeJournalInteger(value, fallback = 0) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.max(0, Math.trunc(parsed));
}

function buildCommandJournalHashPayload(entry) {
  return {
    index: normalizeJournalInteger(entry.index, 0),
    prevHash: normalizeText(entry.prevHash),
    commandId: normalizeIdentifier(entry.commandId),
    mode: normalizeText(String(entry.mode ?? '')).toUpperCase(),
    actor: normalizeText(String(entry.actor ?? '')).toUpperCase(),
    approver: normalizeText(String(entry.approver ?? '')) || null,
    result: normalizeText(String(entry.result ?? '')).toUpperCase(),
    reasonCode: normalizeText(String(entry.reasonCode ?? '')),
    dryRun: Boolean(entry.dryRun),
    idempotencyKey: normalizeText(String(entry.idempotencyKey ?? '')) || null,
    retryCount: normalizeJournalInteger(entry.retryCount, 0),
    timeoutMs: normalizeJournalInteger(entry.timeoutMs, 0),
    timestamp: normalizeJournalTimestamp(entry.timestamp)
  };
}

function computeCommandJournalHash(entry) {
  const payload = buildCommandJournalHashPayload(entry);
  const digest = hashSignatureInput(JSON.stringify(payload));

  return `cj-v1-${digest}`;
}

function normalizeCommandJournalEntry(rawEntry, index, prevHash) {
  const payload = buildCommandJournalHashPayload({
    ...rawEntry,
    index,
    prevHash
  });

  const entry = {
    ...payload,
    hash: normalizeText(String(rawEntry?.hash ?? ''))
  };

  return entry;
}

function initializeCommandJournal(commandJournal) {
  const entriesInput = Array.isArray(commandJournal?.entries) ? commandJournal.entries : [];
  const entries = [];
  let prevHash = 'cj-v1-genesis';

  for (let idx = 0; idx < entriesInput.length; idx += 1) {
    const normalized = normalizeCommandJournalEntry(entriesInput[idx], idx + 1, prevHash);

    if (normalized.hash.length === 0) {
      return {
        valid: false,
        reason: 'missing_hash',
        entries,
        lastHash: prevHash
      };
    }

    const expectedHash = computeCommandJournalHash(normalized);
    if (normalized.hash !== expectedHash) {
      return {
        valid: false,
        reason: 'hash_mismatch',
        entries,
        lastHash: prevHash
      };
    }

    entries.push({
      ...normalized,
      hash: expectedHash
    });
    prevHash = expectedHash;
  }

  return {
    valid: true,
    reason: 'ok',
    entries,
    lastHash: prevHash
  };
}

function appendCommandJournalEntry(journalState, rawEntry) {
  const index = journalState.entries.length + 1;
  const entry = normalizeCommandJournalEntry(rawEntry, index, journalState.lastHash);
  const hash = computeCommandJournalHash(entry);

  const storedEntry = {
    ...entry,
    hash
  };

  journalState.entries.push(storedEntry);
  journalState.lastHash = hash;

  return storedEntry;
}

function buildCommandJournalSnapshot(journalState) {
  return {
    model: 'append-only-command-journal',
    version: 'cj-v1',
    appendOnly: true,
    entryCount: journalState.entries.length,
    lastHash: journalState.lastHash,
    entries: journalState.entries.map((entry) => ({ ...entry }))
  };
}

function normalizePolicyInteger(value, fallback, minimum, maximum) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  const rounded = Math.trunc(parsed);
  return Math.min(maximum, Math.max(minimum, rounded));
}

function resolveExecutionPolicy(runtimeOptions, payload) {
  const maxTimeoutMs = normalizePolicyInteger(
    runtimeOptions.maxTimeoutMs ?? payload.maxTimeoutMs ?? DEFAULT_MAX_TIMEOUT_MS,
    DEFAULT_MAX_TIMEOUT_MS,
    1000,
    DEFAULT_MAX_TIMEOUT_MS
  );

  const maxRetryCount = normalizePolicyInteger(
    runtimeOptions.maxRetryCount ?? payload.maxRetryCount ?? DEFAULT_MAX_RETRY_COUNT,
    DEFAULT_MAX_RETRY_COUNT,
    0,
    10
  );

  const executionCapacity = normalizePolicyInteger(
    runtimeOptions.executionCapacity ?? payload.executionCapacity ?? DEFAULT_EXECUTION_CAPACITY,
    DEFAULT_EXECUTION_CAPACITY,
    1,
    32
  );

  const defaultMaxQueueDepth = Math.max(
    executionCapacity,
    executionCapacity * DEFAULT_MAX_QUEUE_DEPTH_MULTIPLIER
  );

  const maxQueueDepth = normalizePolicyInteger(
    runtimeOptions.maxQueueDepth ?? payload.maxQueueDepth ?? defaultMaxQueueDepth,
    defaultMaxQueueDepth,
    executionCapacity,
    256
  );

  return {
    maxTimeoutMs,
    maxRetryCount,
    executionCapacity,
    maxQueueDepth
  };
}

function normalizeKillSwitchState(runtimeOptions, payload) {
  const source =
    (isObject(runtimeOptions.writeKillSwitch) && runtimeOptions.writeKillSwitch) ||
    (isObject(payload.writeKillSwitch) && payload.writeKillSwitch) ||
    (isObject(payload.killSwitch) && payload.killSwitch) ||
    {};

  const active =
    source.active === true ||
    source.enabled === true ||
    normalizeText(String(source.state ?? '')).toLowerCase() === 'active';

  const reason = normalizeText(String(source.reason ?? source.message ?? '')) || null;
  const incidentId =
    normalizeText(String(source.incidentId ?? source.incident ?? source.ticket ?? '')) || null;
  const activatedAt =
    normalizeText(String(source.activatedAt ?? source.since ?? source.timestamp ?? '')) || null;
  const activatedBy =
    normalizeText(String(source.activatedBy ?? source.actor ?? source.owner ?? '')) || null;

  return {
    active,
    reason,
    incidentId,
    activatedAt,
    activatedBy
  };
}

function resolvePolicyOverrideState(request) {
  const rawOverride = request?.policyOverride ?? request?.overridePolicy ?? request?.policy?.override;
  const source = isObject(rawOverride) ? rawOverride : {};

  const requested =
    rawOverride === true ||
    request?.overrideRequested === true ||
    request?.policyOverrideRequested === true ||
    (isObject(rawOverride) && rawOverride.requested !== false);

  const approver = normalizeText(
    String(
      source.approvedBy ??
        source.approver ??
        source.approvalActor ??
        source.approvalOwner ??
        request?.overrideApprovedBy ??
        request?.overrideApprover ??
        ''
    )
  );

  const approvalId = normalizeText(
    String(
      source.approvalId ??
        source.approvalTicket ??
        source.ticket ??
        source.reference ??
        request?.overrideApprovalId ??
        request?.overrideTicket ??
        ''
    )
  );

  const reason = normalizeText(
    String(source.reason ?? source.justification ?? request?.overrideReason ?? request?.policyOverrideReason ?? '')
  );

  const requestedBy = normalizeText(
    String(
      source.requestedBy ??
        source.actor ??
        request?.requestedBy ??
        request?.actor ??
        request?.initiatedBy ??
        request?.role ??
        ''
    )
  );

  const approverDistinctFromRequester =
    approver.length === 0 ||
    requestedBy.length === 0 ||
    approver.toLocaleLowerCase() !== requestedBy.toLocaleLowerCase();

  return {
    requested,
    approver,
    approvalId,
    reason,
    requestedBy,
    approverDistinctFromRequester,
    approved: approver.length > 0 && approvalId.length > 0 && reason.length > 0
  };
}

function resolvePolicyOverrideTemplateRef(request) {
  const source = isObject(request?.policyOverride) ? request.policyOverride : {};

  return normalizeIdentifier(
    source.templateId ??
      source.templateRef ??
      source.template ??
      request?.overrideTemplateId ??
      request?.commandTemplateId ??
      request?.templateId ??
      request?.template
  );
}

function resolveCommandTemplateCatalog(payload, runtimeOptions = {}) {
  const source = Array.isArray(runtimeOptions.commandTemplates)
    ? runtimeOptions.commandTemplates
    : Array.isArray(payload.commandTemplates)
      ? payload.commandTemplates
      : Array.isArray(payload.catalog?.commandTemplates)
        ? payload.catalog.commandTemplates
        : [];

  const templates = [];
  const byId = new Map();

  for (const rawTemplate of source) {
    if (!isObject(rawTemplate)) {
      continue;
    }

    const id = normalizeIdentifier(rawTemplate.id ?? rawTemplate.templateId ?? rawTemplate.name);
    const commandId = normalizeIdentifier(
      rawTemplate.commandId ?? rawTemplate.command ?? rawTemplate.forCommand ?? rawTemplate.commandRef
    );

    if (id.length === 0 || commandId.length === 0 || byId.has(id)) {
      continue;
    }

    const modeCandidate = normalizeText(String(rawTemplate.mode ?? '')).toUpperCase();
    const status = normalizeText(String(rawTemplate.status ?? rawTemplate.state ?? '')).toLowerCase();

    const template = {
      id,
      commandId,
      mode: MODE_SET.has(modeCandidate) ? modeCandidate : null,
      validated: rawTemplate.validated !== false && status !== 'draft',
      label:
        normalizeText(String(rawTemplate.label ?? rawTemplate.title ?? rawTemplate.description ?? '')) || null,
      version: normalizeText(String(rawTemplate.version ?? rawTemplate.schemaVersion ?? '')) || null
    };

    byId.set(id, template);
    templates.push(template);
  }

  return {
    templates,
    byId
  };
}

function resolvePriorityWeight(priorityValue, mode) {
  if (typeof priorityValue === 'number' && Number.isFinite(priorityValue)) {
    return normalizePolicyInteger(priorityValue, PRIORITY_WEIGHT_BY_MODE[mode] ?? 2, 0, 9);
  }

  const label = normalizeText(String(priorityValue ?? '')).toLowerCase();
  if (label.length > 0 && PRIORITY_WEIGHT_BY_LABEL[label] !== undefined) {
    return PRIORITY_WEIGHT_BY_LABEL[label];
  }

  return PRIORITY_WEIGHT_BY_MODE[mode] ?? 2;
}

function resolveExecutionSchedule(executionRequests, commandById, executionCapacity) {
  return executionRequests
    .map((request, originalIndex) => {
      const commandId = normalizeIdentifier(request?.commandId ?? request?.id ?? request?.command);
      const commandMode = commandById.get(commandId)?.mode ?? 'UNKNOWN';
      const priorityWeight = resolvePriorityWeight(
        request?.priority ?? request?.queuePriority ?? request?.runPriority,
        commandMode
      );

      return {
        request,
        originalIndex,
        commandId,
        commandMode,
        priorityWeight
      };
    })
    .sort((left, right) => left.priorityWeight - right.priorityWeight || left.originalIndex - right.originalIndex)
    .map((entry, index) => ({
      ...entry,
      queuePosition: index + 1,
      capacitySlot: (index % executionCapacity) + 1
    }));
}

function normalizeIdempotencyKey(value) {
  return normalizeText(String(value ?? ''));
}

function canonicalizeValue(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalizeValue(entry));
  }

  if (!isObject(value)) {
    return value;
  }

  const output = {};
  const keys = Object.keys(value).sort();

  for (const key of keys) {
    output[key] = canonicalizeValue(value[key]);
  }

  return output;
}

function buildIdempotencyFingerprint(request, commandId, commandMode) {
  const args = isObject(request?.args) ? request.args : {};
  const impactFiles = normalizeImpactFiles(request?.impactFiles ?? request?.impactedFiles ?? request?.preview?.files);
  const policyOverride = resolvePolicyOverrideState(request);
  const policyOverrideTemplateId = resolvePolicyOverrideTemplateRef(request) || null;

  const payload = {
    commandId,
    commandMode,
    dryRun: request?.dryRun !== false,
    role: normalizeText(String(request?.role ?? '')).toUpperCase() || 'UNKNOWN',
    args: canonicalizeValue(args),
    impactFiles,
    confirmation: canonicalizeValue(isObject(request?.confirmation) ? request.confirmation : {}),
    policyOverrideTemplateId,
    policyOverride: {
      requested: policyOverride.requested,
      approver: policyOverride.approver || null,
      approvalId: policyOverride.approvalId || null,
      reason: policyOverride.reason || null,
      requestedBy: policyOverride.requestedBy || null,
      approverDistinctFromRequester: policyOverride.approverDistinctFromRequester,
      approved: policyOverride.approved,
      templateId: policyOverrideTemplateId
    }
  };

  return JSON.stringify(payload);
}

function isPathWithinActiveProjectRoot(pathValue, activeProjectRoot) {
  if (activeProjectRoot.length === 0) {
    return true;
  }

  return pathValue === activeProjectRoot || pathValue.startsWith(`${activeProjectRoot}/`);
}

function resolveImpactFiles(request, catalogEntry) {
  const requestImpactFiles = normalizeImpactFiles(
    request?.impactFiles ?? request?.impactedFiles ?? request?.preview?.files
  );

  if (requestImpactFiles.length > 0) {
    return requestImpactFiles;
  }

  return normalizeImpactFiles(catalogEntry?.impactFiles ?? []);
}

function resolveDoubleConfirmation(request) {
  const confirmation = isObject(request?.confirmation) ? request.confirmation : {};

  let firstActor = normalizeText(
    confirmation.firstActor ?? confirmation.primaryActor ?? confirmation.requestedBy ?? confirmation.first
  );
  let secondActor = normalizeText(
    confirmation.secondActor ??
      confirmation.secondaryActor ??
      confirmation.approvedBy ??
      confirmation.approver ??
      confirmation.second
  );

  if ((firstActor.length === 0 || secondActor.length === 0) && Array.isArray(request?.confirmations)) {
    const actors = request.confirmations
      .map((entry) => {
        if (typeof entry === 'string') {
          return normalizeText(entry);
        }

        if (!isObject(entry)) {
          return '';
        }

        return normalizeText(entry.actor ?? entry.by ?? entry.name ?? entry.id);
      })
      .filter((entry) => entry.length > 0);

    if (firstActor.length === 0 && actors.length > 0) {
      firstActor = actors[0];
    }

    if (secondActor.length === 0 && actors.length > 1) {
      secondActor = actors[1];
    }
  }

  const confirmationId = normalizeText(
    confirmation.confirmationId ??
      confirmation.token ??
      confirmation.ticket ??
      request?.confirmationId ??
      request?.confirmationToken
  );

  const firstActorNormalized = firstActor.toLocaleLowerCase();
  const secondActorNormalized = secondActor.toLocaleLowerCase();

  return {
    required: true,
    firstActor,
    secondActor,
    confirmationId: confirmationId || null,
    provided: firstActor.length > 0 && secondActor.length > 0,
    distinctActors:
      firstActor.length > 0 && secondActor.length > 0 && firstActorNormalized !== secondActorNormalized
  };
}

function createResult({
  allowed,
  reasonCode,
  reason,
  diagnostics,
  catalog,
  executionGuard,
  commandJournal,
  correctiveActions
}) {
  const normalizedReasonCode = normalizeReasonCode(reasonCode) ?? 'INVALID_COMMAND_CATALOG_INPUT';
  const defaultActions = DEFAULT_CORRECTIVE_ACTIONS[normalizedReasonCode] ?? [];
  const actions = Array.isArray(correctiveActions)
    ? correctiveActions.filter((item) => normalizeText(String(item ?? '')).length > 0)
    : defaultActions;

  return {
    allowed,
    reasonCode: normalizedReasonCode,
    reason,
    diagnostics: cloneValue(diagnostics ?? {}),
    catalog: cloneValue(catalog ?? null),
    executionGuard: cloneValue(executionGuard ?? null),
    commandJournal: cloneValue(commandJournal ?? null),
    correctiveActions: cloneValue(actions)
  };
}

function validateParameterSchema(parameters) {
  if (!Array.isArray(parameters) || parameters.length === 0) {
    return {
      valid: false,
      reasonCode: 'PARAMETER_SCHEMA_REQUIRED',
      reason: 'Chaque commande doit définir un schéma de paramètres contrôlés.'
    };
  }

  const normalizedParameters = [];
  const seen = new Set();

  for (const parameter of parameters) {
    if (!isObject(parameter)) {
      return {
        valid: false,
        reasonCode: 'INVALID_COMMAND_ENTRY',
        reason: 'Paramètre invalide: objet attendu.'
      };
    }

    const name = normalizeIdentifier(parameter.name ?? parameter.key ?? parameter.param);
    const type = normalizeText(String(parameter.type ?? 'string')).toLowerCase();

    if (name.length === 0 || !PARAM_TYPE_SET.has(type)) {
      return {
        valid: false,
        reasonCode: 'INVALID_COMMAND_ENTRY',
        reason: 'Paramètre invalide: name/type requis.'
      };
    }

    if (seen.has(name)) {
      return {
        valid: false,
        reasonCode: 'INVALID_COMMAND_ENTRY',
        reason: `Paramètre dupliqué: ${name}.`
      };
    }

    seen.add(name);

    const enumValues = Array.isArray(parameter.enum)
      ? parameter.enum.map((item) => String(item)).filter((item) => normalizeText(item).length > 0)
      : [];

    let pattern = null;
    if (typeof parameter.pattern === 'string' && normalizeText(parameter.pattern).length > 0) {
      try {
        pattern = new RegExp(parameter.pattern);
      } catch {
        return {
          valid: false,
          reasonCode: 'INVALID_COMMAND_ENTRY',
          reason: `Pattern invalide pour ${name}.`
        };
      }
    }

    normalizedParameters.push({
      name,
      type,
      required: Boolean(parameter.required),
      enumValues,
      pattern
    });
  }

  return {
    valid: true,
    parameters: normalizedParameters
  };
}

function validateExecutionArguments(parameters, args) {
  if (!isObject(args)) {
    return {
      valid: false,
      reasonCode: 'INVALID_PARAMETER_VALUE',
      reason: 'Les arguments de commande doivent être un objet clé/valeur.',
      diagnostics: {
        argsType: typeof args
      }
    };
  }

  for (const parameter of parameters) {
    const value = args[parameter.name];

    if ((value === undefined || value === null || value === '') && parameter.required) {
      return {
        valid: false,
        reasonCode: 'INVALID_PARAMETER_VALUE',
        reason: `Paramètre requis manquant: ${parameter.name}.`,
        diagnostics: {
          parameter: parameter.name,
          rule: 'required'
        }
      };
    }

    if (value === undefined || value === null || value === '') {
      continue;
    }

    if (parameter.type === 'string' && typeof value !== 'string') {
      return {
        valid: false,
        reasonCode: 'INVALID_PARAMETER_VALUE',
        reason: `Type invalide pour ${parameter.name}: string attendu.`,
        diagnostics: {
          parameter: parameter.name,
          expectedType: 'string'
        }
      };
    }

    if (parameter.type === 'number' && (typeof value !== 'number' || Number.isNaN(value))) {
      return {
        valid: false,
        reasonCode: 'INVALID_PARAMETER_VALUE',
        reason: `Type invalide pour ${parameter.name}: number attendu.`,
        diagnostics: {
          parameter: parameter.name,
          expectedType: 'number'
        }
      };
    }

    if (parameter.type === 'boolean' && typeof value !== 'boolean') {
      return {
        valid: false,
        reasonCode: 'INVALID_PARAMETER_VALUE',
        reason: `Type invalide pour ${parameter.name}: boolean attendu.`,
        diagnostics: {
          parameter: parameter.name,
          expectedType: 'boolean'
        }
      };
    }

    if (typeof value === 'string' && UNSAFE_VALUE_PATTERN.test(value)) {
      return {
        valid: false,
        reasonCode: 'UNSAFE_PARAMETER_VALUE',
        reason: `Valeur potentiellement dangereuse détectée pour ${parameter.name}.`,
        diagnostics: {
          parameter: parameter.name
        }
      };
    }

    if (parameter.enumValues.length > 0 && !parameter.enumValues.includes(String(value))) {
      return {
        valid: false,
        reasonCode: 'INVALID_PARAMETER_VALUE',
        reason: `Valeur hors enum pour ${parameter.name}.`,
        diagnostics: {
          parameter: parameter.name,
          enumValues: parameter.enumValues
        }
      };
    }

    if (parameter.pattern instanceof RegExp && !parameter.pattern.test(String(value))) {
      return {
        valid: false,
        reasonCode: 'INVALID_PARAMETER_VALUE',
        reason: `Valeur hors pattern pour ${parameter.name}.`,
        diagnostics: {
          parameter: parameter.name,
          pattern: String(parameter.pattern)
        }
      };
    }
  }

  return {
    valid: true
  };
}

export function buildCommandAllowlistCatalog(payload, runtimeOptions = {}) {
  if (!isObject(payload)) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_COMMAND_CATALOG_INPUT',
      reason: 'Entrée invalide: objet attendu.',
      diagnostics: {
        inputType: typeof payload
      }
    });
  }

  const version = normalizeText(payload.catalogVersion ?? payload.version ?? payload.catalog?.version);

  if (version.length === 0) {
    return createResult({
      allowed: false,
      reasonCode: 'VERSION_REQUIRED',
      reason: 'catalogVersion est requis pour versionner l’allowlist.',
      diagnostics: {
        catalogVersion: version
      }
    });
  }

  const rawCommands = payload.commands ?? payload.catalog?.commands;

  if (!Array.isArray(rawCommands) || rawCommands.length === 0) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_COMMAND_CATALOG_INPUT',
      reason: 'Le catalogue doit contenir au moins une commande autorisée.',
      diagnostics: {
        commandCount: 0
      }
    });
  }

  const commands = [];
  const commandById = new Map();

  for (const entry of rawCommands) {
    if (!isObject(entry)) {
      return createResult({
        allowed: false,
        reasonCode: 'INVALID_COMMAND_ENTRY',
        reason: 'Entrée commande invalide: objet attendu.'
      });
    }

    const id = normalizeIdentifier(entry.id ?? entry.commandId ?? entry.name);
    const command = normalizeText(entry.command ?? entry.shell ?? entry.template);
    const mode = normalizeText(String(entry.mode ?? 'READ')).toUpperCase();

    if (id.length === 0 || command.length === 0 || !MODE_SET.has(mode)) {
      return createResult({
        allowed: false,
        reasonCode: 'INVALID_COMMAND_ENTRY',
        reason: 'Entrée commande invalide: id/command/mode requis.',
        diagnostics: {
          id,
          command,
          mode
        }
      });
    }

    if (commandById.has(id)) {
      return createResult({
        allowed: false,
        reasonCode: 'DUPLICATE_COMMAND_ID',
        reason: `Commande dupliquée: ${id}.`
      });
    }

    const parameterValidation = validateParameterSchema(entry.parameters ?? entry.args ?? []);

    if (!parameterValidation.valid) {
      return createResult({
        allowed: false,
        reasonCode: parameterValidation.reasonCode,
        reason: parameterValidation.reason,
        diagnostics: {
          commandId: id
        }
      });
    }

    const normalizedEntry = {
      id,
      command,
      mode,
      allowDryRun: mode === 'READ' ? Boolean(entry.allowDryRun) : true,
      allowedRoles: normalizeRoles(entry.allowedRoles ?? entry.roles),
      impactFiles: normalizeImpactFiles(entry.impactFiles ?? entry.impactedFiles ?? entry.preview?.files),
      parameters: parameterValidation.parameters.map((parameter) => ({
        name: parameter.name,
        type: parameter.type,
        required: parameter.required,
        enumValues: [...parameter.enumValues],
        pattern: parameter.pattern ? String(parameter.pattern) : null
      }))
    };

    commandById.set(id, {
      ...normalizedEntry,
      parameters: parameterValidation.parameters
    });
    commands.push(normalizedEntry);
  }

  const executionRequests = Array.isArray(payload.executionRequests) ? payload.executionRequests : [];
  const executionPolicy = resolveExecutionPolicy(runtimeOptions, payload);
  const scheduledExecutionRequests = resolveExecutionSchedule(
    executionRequests,
    commandById,
    executionPolicy.executionCapacity
  );
  const killSwitchState = normalizeKillSwitchState(runtimeOptions, payload);
  const commandTemplateCatalog = resolveCommandTemplateCatalog(payload, runtimeOptions);
  const strictRoleCheck = runtimeOptions.strictRoleCheck !== false;
  const activeProjectRoot = normalizeActiveProjectRoot(
    runtimeOptions.activeProjectRoot ?? payload.activeProjectRoot
  );

  const enforceSignedActiveProjectRoot =
    activeProjectRoot.length > 0 && runtimeOptions.enforceSignedActiveProjectRoot !== false;

  const activeProjectRootSigningSecret = normalizeText(
    String(
      runtimeOptions.activeProjectRootSigningSecret ??
        payload.activeProjectRootSigningSecret ??
        DEFAULT_ACTIVE_PROJECT_ROOT_SIGNING_SECRET
    )
  );

  const activeProjectRootSignature = normalizeText(
    String(runtimeOptions.activeProjectRootSignature ?? payload.activeProjectRootSignature ?? '')
  );

  const expectedActiveProjectRootSignature = signActiveProjectRoot(
    activeProjectRoot,
    activeProjectRootSigningSecret
  );

  const diagnostics = {
    catalogVersion: version,
    commandCount: commands.length,
    commandTemplateCount: commandTemplateCatalog.templates.length,
    readCount: commands.filter((entry) => entry.mode === 'READ').length,
    writeCount: commands.filter((entry) => entry.mode === 'WRITE').length,
    criticalCount: commands.filter((entry) => entry.mode === 'CRITICAL').length,
    executionCount: executionRequests.length,
    sequencedExecutionCount: scheduledExecutionRequests.length,
    maxTimeoutMs: executionPolicy.maxTimeoutMs,
    maxRetryCount: executionPolicy.maxRetryCount,
    executionCapacity: executionPolicy.executionCapacity,
    maxQueueDepth: executionPolicy.maxQueueDepth,
    scheduledCommandOrder: scheduledExecutionRequests.map((entry) => ({
      commandId: entry.commandId,
      mode: entry.commandMode,
      priorityWeight: entry.priorityWeight,
      queuePosition: entry.queuePosition,
      capacitySlot: entry.capacitySlot,
      originalIndex: entry.originalIndex
    })),
    activeProjectRoot: activeProjectRoot || null,
    activeProjectRootSigned: enforceSignedActiveProjectRoot
      ? activeProjectRootSignature.length > 0 && activeProjectRootSignature === expectedActiveProjectRootSignature
      : null,
    writeKillSwitch: {
      active: killSwitchState.active,
      reason: killSwitchState.reason,
      incidentId: killSwitchState.incidentId,
      activatedAt: killSwitchState.activatedAt,
      activatedBy: killSwitchState.activatedBy
    },
    outsideCatalogCount: 0,
    dryRunViolations: 0,
    roleViolations: 0,
    criticalRoleViolations: 0,
    doubleConfirmationMissingCount: 0,
    doubleConfirmationConflictCount: 0,
    doubleConfirmationSatisfiedCount: 0,
    timeoutPolicyViolations: 0,
    retryPolicyViolations: 0,
    idempotencyRequiredCount: 0,
    idempotencyReplayCount: 0,
    idempotencyConflictCount: 0,
    capacityViolations: 0,
    queueDepthViolations: 0,
    writeKillSwitchViolations: 0,
    policyOverrideRequestedCount: 0,
    policyOverrideViolations: 0,
    policyOverrideApprovedCount: 0,
    commandTemplateUsageCount: 0,
    commandTemplateViolations: 0,
    impactPreviewProvidedCount: 0,
    impactPreviewMissingCount: 0,
    impactPreviewOutsideProjectCount: 0,
    validatedExecutions: 0
  };

  const commandJournalState = initializeCommandJournal(payload.commandJournal);

  const buildResultWithJournal = ({
    allowed,
    reasonCode,
    reason,
    diagnosticsValue,
    catalogValue = null,
    executionGuardValue = null,
    correctiveActions
  }) =>
    createResult({
      allowed,
      reasonCode,
      reason,
      diagnostics: diagnosticsValue,
      catalog: catalogValue,
      executionGuard: executionGuardValue,
      commandJournal: buildCommandJournalSnapshot(commandJournalState),
      correctiveActions
    });

  const appendExecutionJournal = ({ request, reasonCode, commandMode = 'UNKNOWN', commandIdOverride }) => {
    const confirmation = isObject(request?.confirmation) ? request.confirmation : {};
    const policyOverride = resolvePolicyOverrideState(request);
    const approver = normalizeText(
      policyOverride.approver ??
        confirmation.secondActor ??
        confirmation.approvedBy ??
        confirmation.approver ??
        request?.approvedBy ??
        request?.approver
    );

    appendCommandJournalEntry(commandJournalState, {
      commandId:
        normalizeIdentifier(commandIdOverride ?? request?.commandId ?? request?.id ?? request?.command) || 'unknown',
      mode: normalizeText(String(commandMode ?? 'UNKNOWN')).toUpperCase() || 'UNKNOWN',
      actor: normalizeText(String(request?.role ?? payload.role ?? 'UNKNOWN')).toUpperCase() || 'UNKNOWN',
      approver: approver || null,
      result: reasonCode === 'OK' ? 'ALLOWED' : 'BLOCKED',
      reasonCode,
      dryRun: request?.dryRun !== false,
      idempotencyKey: normalizeText(String(request?.idempotencyKey ?? request?.idempotency_key ?? '')) || null,
      retryCount: normalizeJournalInteger(request?.retryCount ?? request?.retry ?? 0, 0),
      timeoutMs: normalizeJournalInteger(request?.timeoutMs ?? request?.timeout ?? 0, 0),
      timestamp: normalizeJournalTimestamp(request?.timestamp ?? request?.requestedAt)
    });
  };

  if (!commandJournalState.valid) {
    return buildResultWithJournal({
      allowed: false,
      reasonCode: 'COMMAND_JOURNAL_TAMPER_DETECTED',
      reason: 'Journal append-only invalide: intégrité rompue.',
      diagnosticsValue: {
        ...diagnostics,
        commandJournalIntegrity: 'invalid',
        commandJournalFailureReason: commandJournalState.reason
      }
    });
  }

  if (enforceSignedActiveProjectRoot && executionRequests.length > 0) {
    const firstRequest = executionRequests[0];

    if (activeProjectRootSignature.length === 0) {
      appendExecutionJournal({
        request: firstRequest,
        reasonCode: 'ACTIVE_PROJECT_ROOT_SIGNATURE_REQUIRED',
        commandIdOverride: firstRequest?.commandId ?? firstRequest?.id ?? firstRequest?.command
      });

      return buildResultWithJournal({
        allowed: false,
        reasonCode: 'ACTIVE_PROJECT_ROOT_SIGNATURE_REQUIRED',
        reason: 'Signature active_project_root requise avant exécution.',
        diagnosticsValue: diagnostics
      });
    }

    if (activeProjectRootSignature !== expectedActiveProjectRootSignature) {
      appendExecutionJournal({
        request: firstRequest,
        reasonCode: 'ACTIVE_PROJECT_ROOT_SIGNATURE_INVALID',
        commandIdOverride: firstRequest?.commandId ?? firstRequest?.id ?? firstRequest?.command
      });

      return buildResultWithJournal({
        allowed: false,
        reasonCode: 'ACTIVE_PROJECT_ROOT_SIGNATURE_INVALID',
        reason: 'Signature active_project_root invalide ou altérée.',
        diagnosticsValue: {
          ...diagnostics,
          activeProjectRootSignaturePrefix: activeProjectRootSignature.slice(0, 12),
          expectedSignaturePrefix: expectedActiveProjectRootSignature.slice(0, 12)
        }
      });
    }
  }

  if (scheduledExecutionRequests.length > executionPolicy.maxQueueDepth) {
    diagnostics.capacityViolations += 1;
    diagnostics.queueDepthViolations += 1;

    const firstRequest = scheduledExecutionRequests[0]?.request ?? executionRequests[0];
    if (firstRequest) {
      appendExecutionJournal({
        request: firstRequest,
        reasonCode: 'EXECUTION_CAPACITY_EXCEEDED',
        commandMode: 'UNKNOWN',
        commandIdOverride: firstRequest?.commandId ?? firstRequest?.id ?? firstRequest?.command
      });
    }

    return buildResultWithJournal({
      allowed: false,
      reasonCode: 'EXECUTION_CAPACITY_EXCEEDED',
      reason: `Backpressure active: queue depth ${scheduledExecutionRequests.length} > max ${executionPolicy.maxQueueDepth}.`,
      diagnosticsValue: {
        ...diagnostics,
        queueDepth: scheduledExecutionRequests.length,
        maxQueueDepth: executionPolicy.maxQueueDepth,
        queuedCommandIds: scheduledExecutionRequests.map((entry) => entry.commandId)
      }
    });
  }

  const idempotencyRegistry = new Map();

  for (const scheduledRequest of scheduledExecutionRequests) {
    const {
      request,
      commandId,
      commandMode,
      queuePosition,
      capacitySlot,
      originalIndex,
      priorityWeight
    } = scheduledRequest;

    const normalizedRole = normalizeText(String(request?.role ?? payload.role ?? '')).toUpperCase();

    const requestedQueuePosition = Number(request?.queuePosition ?? request?.scheduledQueuePosition ?? NaN);
    if (Number.isFinite(requestedQueuePosition) && Math.trunc(requestedQueuePosition) !== queuePosition) {
      diagnostics.capacityViolations += 1;
      appendExecutionJournal({ request, reasonCode: 'EXECUTION_CAPACITY_EXCEEDED', commandMode, commandIdOverride: commandId });
      return buildResultWithJournal({
        allowed: false,
        reasonCode: 'EXECUTION_CAPACITY_EXCEEDED',
        reason: `Ordonnancement invalide pour ${commandId || 'unknown'}: queuePosition attendue ${queuePosition}.`,
        diagnosticsValue: {
          ...diagnostics,
          commandId,
          queuePositionExpected: queuePosition,
          queuePositionReceived: Math.trunc(requestedQueuePosition),
          originalIndex,
          priorityWeight
        }
      });
    }

    const requestedCapacitySlot = Number(request?.capacitySlot ?? request?.scheduledCapacitySlot ?? NaN);
    if (Number.isFinite(requestedCapacitySlot) && Math.trunc(requestedCapacitySlot) !== capacitySlot) {
      diagnostics.capacityViolations += 1;
      appendExecutionJournal({ request, reasonCode: 'EXECUTION_CAPACITY_EXCEEDED', commandMode, commandIdOverride: commandId });
      return buildResultWithJournal({
        allowed: false,
        reasonCode: 'EXECUTION_CAPACITY_EXCEEDED',
        reason: `Capacité invalide pour ${commandId || 'unknown'}: slot attendu ${capacitySlot}.`,
        diagnosticsValue: {
          ...diagnostics,
          commandId,
          capacitySlotExpected: capacitySlot,
          capacitySlotReceived: Math.trunc(requestedCapacitySlot),
          originalIndex,
          priorityWeight
        }
      });
    }

    if (!commandById.has(commandId)) {
      diagnostics.outsideCatalogCount += 1;
      appendExecutionJournal({ request, reasonCode: 'COMMAND_OUTSIDE_CATALOG', commandIdOverride: commandId });
      return buildResultWithJournal({
        allowed: false,
        reasonCode: 'COMMAND_OUTSIDE_CATALOG',
        reason: `Commande hors catalogue: ${commandId || 'unknown'}.`,
        diagnosticsValue: {
          ...diagnostics,
          queuePosition,
          capacitySlot,
          originalIndex,
          priorityWeight
        }
      });
    }

    const catalogEntry = commandById.get(commandId);
    const requestDryRun = request?.dryRun !== false;
    const timeoutMs = normalizeJournalInteger(
      request?.timeoutMs ?? request?.timeout ?? executionPolicy.maxTimeoutMs,
      executionPolicy.maxTimeoutMs
    );
    const retryCount = normalizeJournalInteger(request?.retryCount ?? request?.retry ?? 0, 0);
    const idempotencyKey = normalizeIdempotencyKey(request?.idempotencyKey ?? request?.idempotency_key);

    const requestWithPolicy = {
      ...request,
      timeoutMs,
      retryCount,
      idempotencyKey
    };

    const isWriteClassExecution =
      requestDryRun === false && (catalogEntry.mode === 'WRITE' || catalogEntry.mode === 'CRITICAL');
    const policyOverride = resolvePolicyOverrideState(requestWithPolicy);
    const policyOverrideTemplateId = resolvePolicyOverrideTemplateRef(requestWithPolicy);

    if (policyOverride.requested) {
      diagnostics.policyOverrideRequestedCount += 1;

      if (!policyOverride.approved || !policyOverride.approverDistinctFromRequester) {
        diagnostics.policyOverrideViolations += 1;
        appendExecutionJournal({
          request: requestWithPolicy,
          reasonCode: 'POLICY_OVERRIDE_APPROVAL_REQUIRED',
          commandMode: catalogEntry.mode
        });

        return buildResultWithJournal({
          allowed: false,
          reasonCode: 'POLICY_OVERRIDE_APPROVAL_REQUIRED',
          reason: `Override policy refusé pour ${commandId}: approbation nominative valide requise.`,
          diagnosticsValue: {
            ...diagnostics,
            commandId,
            queuePosition,
            capacitySlot,
            originalIndex,
            priorityWeight,
            policyOverride: {
              requested: true,
              approver: policyOverride.approver || null,
              approvalId: policyOverride.approvalId || null,
              reason: policyOverride.reason || null,
              requestedBy: policyOverride.requestedBy || null,
              approverDistinctFromRequester: policyOverride.approverDistinctFromRequester,
              approved: policyOverride.approved
            }
          }
        });
      }

      const policyOverrideTemplate = commandTemplateCatalog.byId.get(policyOverrideTemplateId);
      const hasValidatedTemplate = Boolean(policyOverrideTemplate?.validated);
      const templateMatchesCommand = Boolean(
        policyOverrideTemplate && policyOverrideTemplate.commandId === commandId
      );
      const templateModeCompatible =
        policyOverrideTemplate?.mode === null || policyOverrideTemplate?.mode === catalogEntry.mode;

      if (!policyOverrideTemplateId || !hasValidatedTemplate || !templateMatchesCommand || !templateModeCompatible) {
        diagnostics.policyOverrideViolations += 1;
        diagnostics.commandTemplateViolations += 1;
        appendExecutionJournal({
          request: requestWithPolicy,
          reasonCode: 'POLICY_OVERRIDE_TEMPLATE_REQUIRED',
          commandMode: catalogEntry.mode
        });

        return buildResultWithJournal({
          allowed: false,
          reasonCode: 'POLICY_OVERRIDE_TEMPLATE_REQUIRED',
          reason: `Override policy refusé pour ${commandId}: template validé requis pour l'action ciblée.`,
          diagnosticsValue: {
            ...diagnostics,
            commandId,
            queuePosition,
            capacitySlot,
            originalIndex,
            priorityWeight,
            policyOverride: {
              requested: true,
              approver: policyOverride.approver || null,
              approvalId: policyOverride.approvalId || null,
              reason: policyOverride.reason || null,
              requestedBy: policyOverride.requestedBy || null,
              approverDistinctFromRequester: policyOverride.approverDistinctFromRequester,
              approved: policyOverride.approved,
              templateId: policyOverrideTemplateId || null
            },
            commandTemplate: {
              templateId: policyOverrideTemplateId || null,
              exists: Boolean(policyOverrideTemplate),
              validated: hasValidatedTemplate,
              commandId: policyOverrideTemplate?.commandId ?? null,
              commandMatches: templateMatchesCommand,
              mode: policyOverrideTemplate?.mode ?? null,
              modeMatches: templateModeCompatible
            }
          }
        });
      }

      diagnostics.commandTemplateUsageCount += 1;
      diagnostics.policyOverrideApprovedCount += 1;
    }

    if (killSwitchState.active && isWriteClassExecution && !policyOverride.requested) {
      diagnostics.writeKillSwitchViolations += 1;
      appendExecutionJournal({
        request: requestWithPolicy,
        reasonCode: 'WRITE_KILL_SWITCH_ACTIVE',
        commandMode: catalogEntry.mode
      });

      return buildResultWithJournal({
        allowed: false,
        reasonCode: 'WRITE_KILL_SWITCH_ACTIVE',
        reason: `Exécution bloquée: write kill-switch actif pour ${commandId}.`,
        diagnosticsValue: {
          ...diagnostics,
          commandId,
          queuePosition,
          capacitySlot,
          originalIndex,
          priorityWeight,
          writeKillSwitch: {
            active: killSwitchState.active,
            reason: killSwitchState.reason,
            incidentId: killSwitchState.incidentId,
            activatedAt: killSwitchState.activatedAt,
            activatedBy: killSwitchState.activatedBy
          }
        }
      });
    }

    if (timeoutMs > executionPolicy.maxTimeoutMs) {
      diagnostics.timeoutPolicyViolations += 1;
      appendExecutionJournal({
        request: requestWithPolicy,
        reasonCode: 'TIMEOUT_POLICY_VIOLATION',
        commandMode: catalogEntry.mode
      });

      return buildResultWithJournal({
        allowed: false,
        reasonCode: 'TIMEOUT_POLICY_VIOLATION',
        reason: `Timeout max dépassé pour ${commandId}: ${timeoutMs}ms > ${executionPolicy.maxTimeoutMs}ms.`,
        diagnosticsValue: {
          ...diagnostics,
          commandId,
          timeoutMs,
          maxTimeoutMs: executionPolicy.maxTimeoutMs,
          queuePosition,
          capacitySlot,
          originalIndex,
          priorityWeight
        }
      });
    }

    if (retryCount > executionPolicy.maxRetryCount) {
      diagnostics.retryPolicyViolations += 1;
      appendExecutionJournal({
        request: requestWithPolicy,
        reasonCode: 'RETRY_POLICY_VIOLATION',
        commandMode: catalogEntry.mode
      });

      return buildResultWithJournal({
        allowed: false,
        reasonCode: 'RETRY_POLICY_VIOLATION',
        reason: `Retry max dépassé pour ${commandId}: ${retryCount} > ${executionPolicy.maxRetryCount}.`,
        diagnosticsValue: {
          ...diagnostics,
          commandId,
          retryCount,
          maxRetryCount: executionPolicy.maxRetryCount,
          queuePosition,
          capacitySlot,
          originalIndex,
          priorityWeight
        }
      });
    }

    const impactFiles = resolveImpactFiles(requestWithPolicy, catalogEntry);
    const impactInsideActiveProjectRoot =
      activeProjectRoot.length === 0 ||
      impactFiles.every((filePath) => isPathWithinActiveProjectRoot(filePath, activeProjectRoot));
    const isHighImpactExecution = catalogEntry.mode === 'CRITICAL' && requestDryRun === false;

    if (impactFiles.length > 0) {
      diagnostics.impactPreviewProvidedCount += 1;
    }

    if (!impactInsideActiveProjectRoot) {
      diagnostics.impactPreviewOutsideProjectCount += 1;
    }

    if (
      strictRoleCheck &&
      catalogEntry.allowedRoles.length > 0 &&
      !catalogEntry.allowedRoles.includes(normalizedRole)
    ) {
      diagnostics.roleViolations += 1;

      const isCriticalRoleViolation = catalogEntry.mode === 'CRITICAL';
      if (isCriticalRoleViolation) {
        diagnostics.criticalRoleViolations += 1;
      }

      const reasonCode = isCriticalRoleViolation ? 'CRITICAL_ACTION_ROLE_REQUIRED' : 'ROLE_PERMISSION_REQUIRED';
      appendExecutionJournal({ request: requestWithPolicy, reasonCode, commandMode: catalogEntry.mode });

      return buildResultWithJournal({
        allowed: false,
        reasonCode,
        reason: isCriticalRoleViolation
          ? `Rôle non autorisé pour action critique ${commandId}.`
          : `Rôle non autorisé pour commande ${commandId}.`,
        diagnosticsValue: {
          ...diagnostics,
          commandId,
          commandMode: catalogEntry.mode,
          role: normalizedRole || 'UNKNOWN',
          allowedRoles: catalogEntry.allowedRoles,
          queuePosition,
          capacitySlot,
          originalIndex,
          priorityWeight
        }
      });
    }

    if (isHighImpactExecution) {
      const doubleConfirmation = resolveDoubleConfirmation(requestWithPolicy);

      if (!doubleConfirmation.provided) {
        diagnostics.doubleConfirmationMissingCount += 1;

        appendExecutionJournal({
          request: requestWithPolicy,
          reasonCode: 'DOUBLE_CONFIRMATION_REQUIRED',
          commandMode: catalogEntry.mode
        });

        return buildResultWithJournal({
          allowed: false,
          reasonCode: 'DOUBLE_CONFIRMATION_REQUIRED',
          reason: `Double confirmation requise pour action critique ${commandId}.`,
          diagnosticsValue: {
            ...diagnostics,
            commandId,
            doubleConfirmation,
            queuePosition,
            capacitySlot,
            originalIndex,
            priorityWeight,
            impactPreview: {
              commandId,
              files: impactFiles,
              allInsideActiveProjectRoot: impactInsideActiveProjectRoot,
              activeProjectRoot: activeProjectRoot || null
            }
          }
        });
      }

      if (!doubleConfirmation.distinctActors) {
        diagnostics.doubleConfirmationConflictCount += 1;

        appendExecutionJournal({
          request: requestWithPolicy,
          reasonCode: 'DOUBLE_CONFIRMATION_DISTINCT_ACTORS_REQUIRED',
          commandMode: catalogEntry.mode
        });

        return buildResultWithJournal({
          allowed: false,
          reasonCode: 'DOUBLE_CONFIRMATION_DISTINCT_ACTORS_REQUIRED',
          reason: `Les deux confirmateurs doivent être distincts pour ${commandId}.`,
          diagnosticsValue: {
            ...diagnostics,
            commandId,
            doubleConfirmation,
            queuePosition,
            capacitySlot,
            originalIndex,
            priorityWeight,
            impactPreview: {
              commandId,
              files: impactFiles,
              allInsideActiveProjectRoot: impactInsideActiveProjectRoot,
              activeProjectRoot: activeProjectRoot || null
            }
          }
        });
      }

      diagnostics.doubleConfirmationSatisfiedCount += 1;
    }

    if (catalogEntry.mode === 'WRITE' && !requestDryRun) {
      diagnostics.dryRunViolations += 1;

      if (impactFiles.length === 0) {
        diagnostics.impactPreviewMissingCount += 1;
      }

      const baseReason = `Dry-run obligatoire pour ${commandId}.`;
      const reasonWithImpactHint =
        impactFiles.length === 0
          ? `${baseReason} Preview d'impact requis avant exécution réelle.`
          : !impactInsideActiveProjectRoot
            ? `${baseReason} Impact hors projet actif détecté.`
            : baseReason;

      appendExecutionJournal({
        request: requestWithPolicy,
        reasonCode: 'DRY_RUN_REQUIRED_FOR_WRITE',
        commandMode: catalogEntry.mode
      });

      return buildResultWithJournal({
        allowed: false,
        reasonCode: 'DRY_RUN_REQUIRED_FOR_WRITE',
        reason: reasonWithImpactHint,
        diagnosticsValue: {
          ...diagnostics,
          commandId,
          queuePosition,
          capacitySlot,
          originalIndex,
          priorityWeight,
          impactPreview: {
            commandId,
            files: impactFiles,
            allInsideActiveProjectRoot: impactInsideActiveProjectRoot,
            activeProjectRoot: activeProjectRoot || null
          }
        }
      });
    }

    const requiresIdempotencyKey = requestDryRun === false || retryCount > 0;

    if (requiresIdempotencyKey && idempotencyKey.length === 0) {
      diagnostics.idempotencyRequiredCount += 1;
      appendExecutionJournal({
        request: requestWithPolicy,
        reasonCode: 'IDEMPOTENCY_KEY_REQUIRED',
        commandMode: catalogEntry.mode
      });

      return buildResultWithJournal({
        allowed: false,
        reasonCode: 'IDEMPOTENCY_KEY_REQUIRED',
        reason: `Idempotency key requise pour ${commandId} (apply/retry).`,
        diagnosticsValue: {
          ...diagnostics,
          commandId,
          queuePosition,
          capacitySlot,
          originalIndex,
          priorityWeight,
          requestDryRun,
          retryCount
        }
      });
    }

    if (idempotencyKey.length > 0) {
      const fingerprint = buildIdempotencyFingerprint(requestWithPolicy, commandId, catalogEntry.mode);
      const previousFingerprint = idempotencyRegistry.get(idempotencyKey);

      if (previousFingerprint !== undefined) {
        if (previousFingerprint === fingerprint) {
          diagnostics.idempotencyReplayCount += 1;
        } else {
          diagnostics.idempotencyConflictCount += 1;
          appendExecutionJournal({
            request: requestWithPolicy,
            reasonCode: 'IDEMPOTENCY_KEY_REUSE_CONFLICT',
            commandMode: catalogEntry.mode
          });

          return buildResultWithJournal({
            allowed: false,
            reasonCode: 'IDEMPOTENCY_KEY_REUSE_CONFLICT',
            reason: `Idempotency key réutilisée avec payload différent pour ${commandId}.`,
            diagnosticsValue: {
              ...diagnostics,
              commandId,
              idempotencyKey,
              queuePosition,
              capacitySlot,
              originalIndex,
              priorityWeight
            }
          });
        }
      } else {
        idempotencyRegistry.set(idempotencyKey, fingerprint);
      }
    }

    const parameterValidation = validateExecutionArguments(catalogEntry.parameters, requestWithPolicy?.args ?? {});

    if (!parameterValidation.valid) {
      appendExecutionJournal({
        request: requestWithPolicy,
        reasonCode: parameterValidation.reasonCode,
        commandMode: catalogEntry.mode
      });

      return buildResultWithJournal({
        allowed: false,
        reasonCode: parameterValidation.reasonCode,
        reason: parameterValidation.reason,
        diagnosticsValue: {
          ...diagnostics,
          commandId,
          queuePosition,
          capacitySlot,
          originalIndex,
          priorityWeight,
          ...(parameterValidation.diagnostics ?? {})
        }
      });
    }

    diagnostics.validatedExecutions += 1;
    appendExecutionJournal({ request: requestWithPolicy, reasonCode: 'OK', commandMode: catalogEntry.mode });
  }

  const executionGuard = {
    allFromCatalog: diagnostics.outsideCatalogCount === 0,
    dryRunByDefault: diagnostics.dryRunViolations === 0,
    rolePolicyCompliant: diagnostics.roleViolations === 0,
    criticalRoleCompliant: diagnostics.criticalRoleViolations === 0,
    doubleConfirmationReady:
      diagnostics.doubleConfirmationMissingCount === 0 &&
      diagnostics.doubleConfirmationConflictCount === 0,
    timeoutPolicyCompliant: diagnostics.timeoutPolicyViolations === 0,
    retryPolicyCompliant: diagnostics.retryPolicyViolations === 0,
    idempotencyPolicyCompliant:
      diagnostics.idempotencyRequiredCount === 0 && diagnostics.idempotencyConflictCount === 0,
    capacityPolicyCompliant: diagnostics.capacityViolations === 0,
    queueDepthCompliant: diagnostics.queueDepthViolations === 0,
    writeKillSwitchCompliant: diagnostics.writeKillSwitchViolations === 0,
    policyOverrideCompliant: diagnostics.policyOverrideViolations === 0,
    commandTemplatePolicyCompliant: diagnostics.commandTemplateViolations === 0,
    sequencingPolicyCompliant:
      diagnostics.capacityViolations === 0 && diagnostics.sequencedExecutionCount === diagnostics.executionCount,
    impactPreviewReadyForWrite: diagnostics.impactPreviewMissingCount === 0,
    activeProjectRootSafe: diagnostics.impactPreviewOutsideProjectCount === 0,
    activeProjectRootSigned:
      !enforceSignedActiveProjectRoot || activeProjectRootSignature === expectedActiveProjectRootSignature,
    maxTimeoutMs: executionPolicy.maxTimeoutMs,
    maxRetryCount: executionPolicy.maxRetryCount,
    executionCapacity: executionPolicy.executionCapacity,
    maxQueueDepth: executionPolicy.maxQueueDepth,
    writeKillSwitchActive: killSwitchState.active
  };

  return buildResultWithJournal({
    allowed: true,
    reasonCode: 'OK',
    reason: 'Catalogue allowlist versionné valide et exécutions contrôlées.',
    diagnosticsValue: diagnostics,
    catalogValue: {
      version,
      commands,
      commandTemplates: commandTemplateCatalog.templates.map((template) => ({ ...template }))
    },
    executionGuardValue: executionGuard
  });
}
