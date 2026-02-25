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
  INVALID_PARAMETER_VALUE: ['FIX_PARAMETER_VALUES'],
  UNSAFE_PARAMETER_VALUE: ['SANITIZE_COMMAND_PARAMETERS']
});

const UNSAFE_VALUE_PATTERN = /(;|&&|\|\||`|\$\(|\n|\r)/;

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

function createResult({ allowed, reasonCode, reason, diagnostics, catalog, executionGuard, correctiveActions }) {
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
  const strictRoleCheck = runtimeOptions.strictRoleCheck !== false;
  const activeProjectRoot = normalizeActiveProjectRoot(
    runtimeOptions.activeProjectRoot ?? payload.activeProjectRoot
  );

  const diagnostics = {
    catalogVersion: version,
    commandCount: commands.length,
    readCount: commands.filter((entry) => entry.mode === 'READ').length,
    writeCount: commands.filter((entry) => entry.mode === 'WRITE').length,
    criticalCount: commands.filter((entry) => entry.mode === 'CRITICAL').length,
    executionCount: executionRequests.length,
    activeProjectRoot: activeProjectRoot || null,
    outsideCatalogCount: 0,
    dryRunViolations: 0,
    roleViolations: 0,
    criticalRoleViolations: 0,
    doubleConfirmationMissingCount: 0,
    doubleConfirmationConflictCount: 0,
    doubleConfirmationSatisfiedCount: 0,
    impactPreviewProvidedCount: 0,
    impactPreviewMissingCount: 0,
    impactPreviewOutsideProjectCount: 0,
    validatedExecutions: 0
  };

  for (const request of executionRequests) {
    const commandId = normalizeIdentifier(request?.commandId ?? request?.id ?? request?.command);
    const normalizedRole = normalizeText(String(request?.role ?? payload.role ?? '')).toUpperCase();

    if (!commandById.has(commandId)) {
      diagnostics.outsideCatalogCount += 1;
      return createResult({
        allowed: false,
        reasonCode: 'COMMAND_OUTSIDE_CATALOG',
        reason: `Commande hors catalogue: ${commandId || 'unknown'}.`,
        diagnostics
      });
    }

    const catalogEntry = commandById.get(commandId);
    const requestDryRun = request?.dryRun !== false;
    const impactFiles = resolveImpactFiles(request, catalogEntry);
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

      return createResult({
        allowed: false,
        reasonCode: isCriticalRoleViolation ? 'CRITICAL_ACTION_ROLE_REQUIRED' : 'ROLE_PERMISSION_REQUIRED',
        reason: isCriticalRoleViolation
          ? `Rôle non autorisé pour action critique ${commandId}.`
          : `Rôle non autorisé pour commande ${commandId}.`,
        diagnostics: {
          ...diagnostics,
          commandId,
          commandMode: catalogEntry.mode,
          role: normalizedRole || 'UNKNOWN',
          allowedRoles: catalogEntry.allowedRoles
        }
      });
    }

    if (isHighImpactExecution) {
      const doubleConfirmation = resolveDoubleConfirmation(request);

      if (!doubleConfirmation.provided) {
        diagnostics.doubleConfirmationMissingCount += 1;

        return createResult({
          allowed: false,
          reasonCode: 'DOUBLE_CONFIRMATION_REQUIRED',
          reason: `Double confirmation requise pour action critique ${commandId}.`,
          diagnostics: {
            ...diagnostics,
            commandId,
            doubleConfirmation,
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

        return createResult({
          allowed: false,
          reasonCode: 'DOUBLE_CONFIRMATION_DISTINCT_ACTORS_REQUIRED',
          reason: `Les deux confirmateurs doivent être distincts pour ${commandId}.`,
          diagnostics: {
            ...diagnostics,
            commandId,
            doubleConfirmation,
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

      return createResult({
        allowed: false,
        reasonCode: 'DRY_RUN_REQUIRED_FOR_WRITE',
        reason: reasonWithImpactHint,
        diagnostics: {
          ...diagnostics,
          commandId,
          impactPreview: {
            commandId,
            files: impactFiles,
            allInsideActiveProjectRoot: impactInsideActiveProjectRoot,
            activeProjectRoot: activeProjectRoot || null
          }
        }
      });
    }

    const parameterValidation = validateExecutionArguments(catalogEntry.parameters, request?.args ?? {});

    if (!parameterValidation.valid) {
      return createResult({
        allowed: false,
        reasonCode: parameterValidation.reasonCode,
        reason: parameterValidation.reason,
        diagnostics: {
          ...diagnostics,
          commandId,
          ...(parameterValidation.diagnostics ?? {})
        }
      });
    }

    diagnostics.validatedExecutions += 1;
  }

  const executionGuard = {
    allFromCatalog: diagnostics.outsideCatalogCount === 0,
    dryRunByDefault: diagnostics.dryRunViolations === 0,
    rolePolicyCompliant: diagnostics.roleViolations === 0,
    criticalRoleCompliant: diagnostics.criticalRoleViolations === 0,
    doubleConfirmationReady:
      diagnostics.doubleConfirmationMissingCount === 0 &&
      diagnostics.doubleConfirmationConflictCount === 0,
    impactPreviewReadyForWrite: diagnostics.impactPreviewMissingCount === 0,
    activeProjectRootSafe: diagnostics.impactPreviewOutsideProjectCount === 0
  };

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: 'Catalogue allowlist versionné valide et exécutions contrôlées.',
    diagnostics,
    catalog: {
      version,
      commands
    },
    executionGuard
  });
}
