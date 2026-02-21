import { execFileSync } from 'node:child_process';
import { validatePhasePrerequisites } from './phase-prerequisites-validator.js';

const SEQUENCE_GUARD_SCRIPT =
  '/root/.openclaw/workspace/bmad-total/scripts/phase13-sequence-guard.sh';
const ULTRA_QUALITY_GUARD_SCRIPT =
  '/root/.openclaw/workspace/bmad-total/scripts/phase13-ultra-quality-check.sh';

const ALLOWED_GUARD_PHASES = new Set([1, 2, 3]);

const ALLOWED_REASON_CODES = new Set([
  'OK',
  'INVALID_PHASE',
  'TRANSITION_NOT_ALLOWED',
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED',
  'PHASE_PREREQUISITES_MISSING',
  'PHASE_PREREQUISITES_INCOMPLETE',
  'INVALID_PHASE_PREREQUISITES',
  'INVALID_GUARD_PHASE',
  'GUARD_EXECUTION_FAILED'
]);

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function normalizePhaseNumber(value) {
  if (typeof value === 'number' && Number.isInteger(value) && ALLOWED_GUARD_PHASES.has(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();

    if (/^[1-3]$/.test(trimmed)) {
      return Number.parseInt(trimmed, 10);
    }
  }

  return null;
}

function normalizeReasonCode(value, fallback) {
  if (typeof value === 'string' && ALLOWED_REASON_CODES.has(value)) {
    return value;
  }

  return fallback;
}

function normalizeReason(value, fallback) {
  if (typeof value === 'string' && value.trim().length > 0) {
    return value;
  }

  return fallback;
}

function resolveSimulationFlag(value) {
  return value !== false;
}

function buildCommandPlan(phaseNumber) {
  return [
    {
      id: 'CMD-008',
      scriptPath: SEQUENCE_GUARD_SCRIPT,
      args: [String(phaseNumber)],
      command: `bash ${SEQUENCE_GUARD_SCRIPT} ${phaseNumber}`
    },
    {
      id: 'CMD-009',
      scriptPath: ULTRA_QUALITY_GUARD_SCRIPT,
      args: [String(phaseNumber)],
      command: `bash ${ULTRA_QUALITY_GUARD_SCRIPT} ${phaseNumber}`
    }
  ];
}

function resolvePrerequisitesValidation(payload, prerequisitesValidator) {
  if (isObject(payload.prerequisitesValidation)) {
    return payload.prerequisitesValidation;
  }

  return prerequisitesValidator(payload.prerequisitesInput);
}

function normalizeExecutionResult(executionResult) {
  if (typeof executionResult === 'boolean') {
    return {
      ok: executionResult,
      exitCode: executionResult ? 0 : 1,
      stdout: '',
      stderr: ''
    };
  }

  if (!isObject(executionResult)) {
    return {
      ok: true,
      exitCode: 0,
      stdout: '',
      stderr: ''
    };
  }

  const ok =
    typeof executionResult.ok === 'boolean'
      ? executionResult.ok
      : Number.isFinite(executionResult.exitCode)
        ? executionResult.exitCode === 0
        : true;

  return {
    ok,
    exitCode: Number.isFinite(executionResult.exitCode)
      ? Math.trunc(executionResult.exitCode)
      : ok
        ? 0
        : 1,
    stdout: typeof executionResult.stdout === 'string' ? executionResult.stdout : '',
    stderr: typeof executionResult.stderr === 'string' ? executionResult.stderr : ''
  };
}

function toText(value) {
  if (typeof value === 'string') {
    return value;
  }

  if (value === null || value === undefined) {
    return '';
  }

  if (Buffer.isBuffer(value)) {
    return value.toString('utf8');
  }

  return String(value);
}

function executeGuardCommand(planItem, execRunner = execFileSync) {
  try {
    const stdout = execRunner('bash', [planItem.scriptPath, ...planItem.args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });

    return {
      ok: true,
      exitCode: 0,
      stdout: toText(stdout),
      stderr: ''
    };
  } catch (error) {
    const failure = isObject(error) ? error : {};

    return {
      ok: false,
      exitCode: Number.isInteger(failure.status) ? failure.status : 1,
      stdout: toText(failure.stdout),
      stderr: toText(failure.stderr) || toText(failure.message) || 'Unknown execution error.'
    };
  }
}

function createResult({ allowed, reasonCode, reason, diagnostics, commands, results }) {
  return {
    allowed,
    reasonCode,
    reason,
    diagnostics: {
      phaseNumber: diagnostics.phaseNumber,
      simulate: diagnostics.simulate,
      blockedByPrerequisites: diagnostics.blockedByPrerequisites,
      executedCount: diagnostics.executedCount,
      failedCommand: diagnostics.failedCommand
    },
    commands: [...commands],
    results: [...results]
  };
}

export async function orchestratePhaseGuards(input, options = {}) {
  const payload = isObject(input) ? input : {};
  const runtimeOptions = isObject(options) ? options : {};

  const simulate = resolveSimulationFlag(payload.simulate);
  const phaseNumber = normalizePhaseNumber(payload.phaseNumber);

  const diagnostics = {
    phaseNumber: phaseNumber ?? payload.phaseNumber ?? null,
    simulate,
    blockedByPrerequisites: false,
    executedCount: 0,
    failedCommand: null
  };

  if (phaseNumber === null) {
    return createResult({
      allowed: false,
      reasonCode: 'INVALID_GUARD_PHASE',
      reason: `Phase invalide pour l'orchestration des guards: phaseNumber=${String(payload.phaseNumber)}. Valeurs autorisées: 1|2|3.`,
      diagnostics,
      commands: [],
      results: []
    });
  }

  const commandPlan = buildCommandPlan(phaseNumber);
  const commands = commandPlan.map((item) => item.command);

  const prerequisitesValidator =
    typeof runtimeOptions.prerequisitesValidator === 'function'
      ? runtimeOptions.prerequisitesValidator
      : validatePhasePrerequisites;

  const prerequisitesValidation = resolvePrerequisitesValidation(payload, prerequisitesValidator);

  if (!isObject(prerequisitesValidation) || prerequisitesValidation.allowed !== true) {
    diagnostics.blockedByPrerequisites = true;

    return createResult({
      allowed: false,
      reasonCode: isObject(prerequisitesValidation)
        ? normalizeReasonCode(prerequisitesValidation.reasonCode, 'PHASE_PREREQUISITES_MISSING')
        : 'PHASE_PREREQUISITES_MISSING',
      reason: isObject(prerequisitesValidation)
        ? normalizeReason(
            prerequisitesValidation.reason,
            'Blocage de prérequis détecté sans détail explicite.'
          )
        : 'Blocage de prérequis détecté: validation S004 absente ou invalide.',
      diagnostics,
      commands,
      results: []
    });
  }

  if (simulate) {
    return createResult({
      allowed: true,
      reasonCode: 'OK',
      reason: `Simulation guards prête pour la phase ${phaseNumber}.`,
      diagnostics,
      commands,
      results: []
    });
  }

  const execRunner =
    typeof runtimeOptions.execRunner === 'function' ? runtimeOptions.execRunner : execFileSync;

  const commandExecutor =
    typeof runtimeOptions.commandExecutor === 'function'
      ? runtimeOptions.commandExecutor
      : (planItem) => executeGuardCommand(planItem, execRunner);

  const results = [];

  for (const [index, planItem] of commandPlan.entries()) {
    let normalizedExecution;

    try {
      const executionResult = await commandExecutor({
        ...planItem,
        phaseNumber,
        index
      });

      normalizedExecution = normalizeExecutionResult(executionResult);
    } catch (error) {
      normalizedExecution = {
        ok: false,
        exitCode: 1,
        stdout: '',
        stderr: error instanceof Error ? error.message : String(error)
      };
    }

    const entry = {
      command: planItem.command,
      index,
      ok: normalizedExecution.ok,
      exitCode: normalizedExecution.exitCode,
      stdout: normalizedExecution.stdout,
      stderr: normalizedExecution.stderr
    };

    results.push(entry);
    diagnostics.executedCount = results.length;

    if (!normalizedExecution.ok) {
      diagnostics.failedCommand = planItem.command;

      return createResult({
        allowed: false,
        reasonCode: 'GUARD_EXECUTION_FAILED',
        reason: `Échec exécution guard: command=${planItem.command}, exitCode=${normalizedExecution.exitCode}.`,
        diagnostics,
        commands,
        results
      });
    }
  }

  return createResult({
    allowed: true,
    reasonCode: 'OK',
    reason: `Guards exécutés avec succès pour la phase ${phaseNumber}.`,
    diagnostics,
    commands,
    results
  });
}
