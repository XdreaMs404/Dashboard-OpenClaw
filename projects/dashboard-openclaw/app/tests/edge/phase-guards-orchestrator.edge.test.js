import { afterEach, describe, expect, it, vi } from 'vitest';
import { orchestratePhaseGuards } from '../../src/phase-guards-orchestrator.js';

const SEQUENCE_COMMAND =
  'bash /root/.openclaw/workspace/bmad-total/scripts/phase13-sequence-guard.sh';
const ULTRA_QUALITY_COMMAND =
  'bash /root/.openclaw/workspace/bmad-total/scripts/phase13-ultra-quality-check.sh';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('phase-guards-orchestrator edge cases', () => {
  it('does not throw on non-object inputs and fails closed with INVALID_GUARD_PHASE', async () => {
    const inputs = [undefined, null, 42, true, 'phase-1'];

    for (const input of inputs) {
      await expect(orchestratePhaseGuards(input)).resolves.toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_GUARD_PHASE',
        diagnostics: {
          phaseNumber: null,
          simulate: true,
          blockedByPrerequisites: false,
          executedCount: 0,
          failedCommand: null
        },
        commands: [],
        results: []
      });
    }
  });

  it('accepts string phase numbers in allowlist 1|2|3', async () => {
    const result = await orchestratePhaseGuards({
      phaseNumber: '3',
      prerequisitesValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Prérequis validés.'
      }
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        phaseNumber: 3,
        simulate: true,
        blockedByPrerequisites: false,
        executedCount: 0,
        failedCommand: null
      },
      commands: [`${SEQUENCE_COMMAND} 3`, `${ULTRA_QUALITY_COMMAND} 3`],
      results: []
    });
  });

  it('keeps simulation enabled by default and does not execute injected executor', async () => {
    const commandExecutor = vi.fn(async () => ({ ok: true, exitCode: 0 }));

    const result = await orchestratePhaseGuards(
      {
        phaseNumber: 1,
        simulate: undefined,
        prerequisitesValidation: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'Prérequis validés.'
        }
      },
      { commandExecutor }
    );

    expect(commandExecutor).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        simulate: true,
        executedCount: 0
      },
      results: []
    });
  });

  it('supports non-object options input by falling back to safe defaults', async () => {
    const result = await orchestratePhaseGuards(
      {
        phaseNumber: 1,
        prerequisitesValidation: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'Prérequis validés.'
        }
      },
      null
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        phaseNumber: 1,
        simulate: true,
        blockedByPrerequisites: false,
        executedCount: 0,
        failedCommand: null
      },
      results: []
    });
  });

  it('falls back to PHASE_PREREQUISITES_MISSING when upstream reasonCode is unknown', async () => {
    const result = await orchestratePhaseGuards({
      phaseNumber: 2,
      prerequisitesValidation: {
        allowed: false,
        reasonCode: 'UPSTREAM_UNKNOWN_CODE',
        reason: '   '
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_PREREQUISITES_MISSING',
      reason: 'Blocage de prérequis détecté sans détail explicite.',
      diagnostics: {
        phaseNumber: 2,
        blockedByPrerequisites: true,
        executedCount: 0,
        failedCommand: null
      }
    });
  });

  it('delegates to S004 validator when prerequisitesValidation is missing', async () => {
    const result = await orchestratePhaseGuards({
      phaseNumber: 1,
      prerequisitesInput: {
        fromPhase: 'H03',
        toPhase: 'H04',
        transitionValidation: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'Transition autorisée.'
        },
        prerequisites: null
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_PREREQUISITES_MISSING',
      diagnostics: {
        blockedByPrerequisites: true,
        executedCount: 0,
        failedCommand: null
      },
      commands: [`${SEQUENCE_COMMAND} 1`, `${ULTRA_QUALITY_COMMAND} 1`],
      results: []
    });
  });

  it('falls back to default prerequisite blocker message when injected validator returns non-object', async () => {
    const result = await orchestratePhaseGuards(
      {
        phaseNumber: 2,
        prerequisitesInput: {
          fromPhase: 'H03',
          toPhase: 'H04',
          prerequisites: []
        }
      },
      {
        prerequisitesValidator: () => null
      }
    );

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_PREREQUISITES_MISSING',
      reason: 'Blocage de prérequis détecté: validation S004 absente ou invalide.',
      diagnostics: {
        phaseNumber: 2,
        blockedByPrerequisites: true,
        executedCount: 0,
        failedCommand: null
      },
      commands: [`${SEQUENCE_COMMAND} 2`, `${ULTRA_QUALITY_COMMAND} 2`],
      results: []
    });
  });

  it('treats boolean executor results as canonical execution outcomes', async () => {
    const commandExecutor = vi
      .fn()
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const result = await orchestratePhaseGuards(
      {
        phaseNumber: 2,
        simulate: false,
        prerequisitesValidation: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'Prérequis validés.'
        }
      },
      { commandExecutor }
    );

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'GUARD_EXECUTION_FAILED',
      diagnostics: {
        phaseNumber: 2,
        simulate: false,
        blockedByPrerequisites: false,
        executedCount: 2,
        failedCommand: `${ULTRA_QUALITY_COMMAND} 2`
      }
    });
    expect(result.results).toEqual([
      {
        command: `${SEQUENCE_COMMAND} 2`,
        index: 0,
        ok: true,
        exitCode: 0,
        stdout: '',
        stderr: ''
      },
      {
        command: `${ULTRA_QUALITY_COMMAND} 2`,
        index: 1,
        ok: false,
        exitCode: 1,
        stdout: '',
        stderr: ''
      }
    ]);
  });

  it('interprets non-zero exitCode as failure when ok is omitted', async () => {
    const commandExecutor = vi
      .fn()
      .mockResolvedValueOnce({ exitCode: 0, stdout: 'ok' })
      .mockResolvedValueOnce({ exitCode: 127, stderr: 'missing dependency' });

    const result = await orchestratePhaseGuards(
      {
        phaseNumber: 3,
        simulate: false,
        prerequisitesValidation: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'Prérequis validés.'
        }
      },
      { commandExecutor }
    );

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'GUARD_EXECUTION_FAILED',
      diagnostics: {
        executedCount: 2,
        failedCommand: `${ULTRA_QUALITY_COMMAND} 3`
      }
    });
    expect(result.results[1]).toMatchObject({
      command: `${ULTRA_QUALITY_COMMAND} 3`,
      ok: false,
      exitCode: 127,
      stderr: 'missing dependency'
    });
  });

  it('treats object execution result without ok/exitCode as allowed success', async () => {
    const commandExecutor = vi.fn().mockResolvedValue({ stdout: 'partial' });

    const result = await orchestratePhaseGuards(
      {
        phaseNumber: 1,
        simulate: false,
        prerequisitesValidation: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'Prérequis validés.'
        }
      },
      { commandExecutor }
    );

    expect(commandExecutor).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        phaseNumber: 1,
        simulate: false,
        blockedByPrerequisites: false,
        executedCount: 2,
        failedCommand: null
      }
    });
    expect(result.results).toEqual([
      {
        command: `${SEQUENCE_COMMAND} 1`,
        index: 0,
        ok: true,
        exitCode: 0,
        stdout: 'partial',
        stderr: ''
      },
      {
        command: `${ULTRA_QUALITY_COMMAND} 1`,
        index: 1,
        ok: true,
        exitCode: 0,
        stdout: 'partial',
        stderr: ''
      }
    ]);
  });

  it('uses fallback exitCode=1 when execution result sets ok=false without exitCode', async () => {
    const commandExecutor = vi.fn().mockResolvedValue({ ok: false, stderr: 'no-exit-code' });

    const result = await orchestratePhaseGuards(
      {
        phaseNumber: 1,
        simulate: false,
        prerequisitesValidation: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'Prérequis validés.'
        }
      },
      { commandExecutor }
    );

    expect(commandExecutor).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'GUARD_EXECUTION_FAILED',
      diagnostics: {
        phaseNumber: 1,
        simulate: false,
        blockedByPrerequisites: false,
        executedCount: 1,
        failedCommand: `${SEQUENCE_COMMAND} 1`
      }
    });
    expect(result.results[0]).toEqual({
      command: `${SEQUENCE_COMMAND} 1`,
      index: 0,
      ok: false,
      exitCode: 1,
      stdout: '',
      stderr: 'no-exit-code'
    });
  });

  it('captures non-Error throws from commandExecutor using String(error)', async () => {
    const commandExecutor = vi.fn().mockRejectedValue('raw-command-failure');

    const result = await orchestratePhaseGuards(
      {
        phaseNumber: 3,
        simulate: false,
        prerequisitesValidation: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'Prérequis validés.'
        }
      },
      { commandExecutor }
    );

    expect(commandExecutor).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'GUARD_EXECUTION_FAILED',
      diagnostics: {
        phaseNumber: 3,
        simulate: false,
        executedCount: 1,
        failedCommand: `${SEQUENCE_COMMAND} 3`
      }
    });
    expect(result.results[0]).toEqual({
      command: `${SEQUENCE_COMMAND} 3`,
      index: 0,
      ok: false,
      exitCode: 1,
      stdout: '',
      stderr: 'raw-command-failure'
    });
  });

  it('does not mutate input or runtime options objects', async () => {
    const input = {
      phaseNumber: 1,
      simulate: false,
      prerequisitesValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Prérequis validés.'
      }
    };

    const options = {
      commandExecutor: async () => ({ ok: true, exitCode: 0 })
    };

    const inputSnapshot = JSON.parse(JSON.stringify(input));

    await orchestratePhaseGuards(input, options);

    expect(input).toEqual(inputSnapshot);
    expect(typeof options.commandExecutor).toBe('function');
  });

  it('treats non-object execution payload as success and continues sequence', async () => {
    const commandExecutor = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({ ok: true, exitCode: 0, stdout: 'done' });

    const result = await orchestratePhaseGuards(
      {
        phaseNumber: 1,
        simulate: false,
        prerequisitesValidation: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'Prérequis validés.'
        }
      },
      { commandExecutor }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        executedCount: 2,
        failedCommand: null
      }
    });
    expect(result.results).toEqual([
      {
        command: `${SEQUENCE_COMMAND} 1`,
        index: 0,
        ok: true,
        exitCode: 0,
        stdout: '',
        stderr: ''
      },
      {
        command: `${ULTRA_QUALITY_COMMAND} 1`,
        index: 1,
        ok: true,
        exitCode: 0,
        stdout: 'done',
        stderr: ''
      }
    ]);
  });

  it('uses default executor success path with strict allowlist commands', async () => {
    const execRunner = vi.fn().mockReturnValueOnce('sequence-ok').mockReturnValueOnce(42);

    const result = await orchestratePhaseGuards(
      {
        phaseNumber: 1,
        simulate: false,
        prerequisitesValidation: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'Prérequis validés.'
        }
      },
      {
        execRunner
      }
    );

    expect(execRunner).toHaveBeenCalledTimes(2);
    expect(execRunner.mock.calls[0]).toEqual([
      'bash',
      ['/root/.openclaw/workspace/bmad-total/scripts/phase13-sequence-guard.sh', '1'],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    ]);
    expect(execRunner.mock.calls[1]).toEqual([
      'bash',
      ['/root/.openclaw/workspace/bmad-total/scripts/phase13-ultra-quality-check.sh', '1'],
      {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe']
      }
    ]);

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        phaseNumber: 1,
        simulate: false,
        executedCount: 2,
        failedCommand: null
      },
      commands: [`${SEQUENCE_COMMAND} 1`, `${ULTRA_QUALITY_COMMAND} 1`]
    });
    expect(result.results).toEqual([
      {
        command: `${SEQUENCE_COMMAND} 1`,
        index: 0,
        ok: true,
        exitCode: 0,
        stdout: 'sequence-ok',
        stderr: ''
      },
      {
        command: `${ULTRA_QUALITY_COMMAND} 1`,
        index: 1,
        ok: true,
        exitCode: 0,
        stdout: '42',
        stderr: ''
      }
    ]);
  });

  it('uses default executor failure path with status/stdout/stderr propagation', async () => {
    const execRunner = vi.fn().mockImplementation(() => {
      throw {
        status: 9,
        stdout: Buffer.from('partial-output', 'utf8'),
        stderr: Buffer.from('guard-failed', 'utf8')
      };
    });

    const result = await orchestratePhaseGuards(
      {
        phaseNumber: 2,
        simulate: false,
        prerequisitesValidation: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'Prérequis validés.'
        }
      },
      {
        execRunner
      }
    );

    expect(execRunner).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'GUARD_EXECUTION_FAILED',
      diagnostics: {
        phaseNumber: 2,
        simulate: false,
        executedCount: 1,
        failedCommand: `${SEQUENCE_COMMAND} 2`
      }
    });
    expect(result.results[0]).toEqual({
      command: `${SEQUENCE_COMMAND} 2`,
      index: 0,
      ok: false,
      exitCode: 9,
      stdout: 'partial-output',
      stderr: 'guard-failed'
    });
  });

  it('falls back to Unknown execution error when default executor throws non-object', async () => {
    const execRunner = vi.fn().mockImplementation(() => {
      throw 'opaque-error';
    });

    const result = await orchestratePhaseGuards(
      {
        phaseNumber: 3,
        simulate: false,
        prerequisitesValidation: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'Prérequis validés.'
        }
      },
      {
        execRunner
      }
    );

    expect(execRunner).toHaveBeenCalledTimes(1);
    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'GUARD_EXECUTION_FAILED',
      diagnostics: {
        phaseNumber: 3,
        simulate: false,
        executedCount: 1,
        failedCommand: `${SEQUENCE_COMMAND} 3`
      }
    });
    expect(result.results[0]).toEqual({
      command: `${SEQUENCE_COMMAND} 3`,
      index: 0,
      ok: false,
      exitCode: 1,
      stdout: '',
      stderr: 'Unknown execution error.'
    });
  });
});
