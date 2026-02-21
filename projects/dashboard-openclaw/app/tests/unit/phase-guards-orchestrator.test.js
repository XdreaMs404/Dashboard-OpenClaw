import { describe, expect, it, vi } from 'vitest';
import { orchestratePhaseGuards } from '../../src/phase-guards-orchestrator.js';
import { orchestratePhaseGuards as orchestrateFromIndex } from '../../src/index.js';

const SEQUENCE_COMMAND =
  'bash /root/.openclaw/workspace/bmad-total/scripts/phase13-sequence-guard.sh';
const ULTRA_QUALITY_COMMAND =
  'bash /root/.openclaw/workspace/bmad-total/scripts/phase13-ultra-quality-check.sh';

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

function expectedCommands(phaseNumber) {
  return [
    `${SEQUENCE_COMMAND} ${phaseNumber}`,
    `${ULTRA_QUALITY_COMMAND} ${phaseNumber}`
  ];
}

describe('phase-guards-orchestrator unit', () => {
  it('returns ordered guard plan in simulation mode by default when prerequisites are allowed', async () => {
    const result = await orchestratePhaseGuards({
      phaseNumber: 2,
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
        phaseNumber: 2,
        simulate: true,
        blockedByPrerequisites: false,
        executedCount: 0,
        failedCommand: null
      },
      commands: expectedCommands(2),
      results: []
    });
  });

  it('executes both commands sequentially when simulate=false and executor succeeds', async () => {
    const commandExecutor = vi.fn(async ({ command, index }) => ({
      ok: true,
      exitCode: 0,
      stdout: `ok-${index}`,
      stderr: ''
    }));

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
    expect(commandExecutor.mock.calls[0][0]).toMatchObject({
      phaseNumber: 1,
      index: 0,
      command: `${SEQUENCE_COMMAND} 1`
    });
    expect(commandExecutor.mock.calls[1][0]).toMatchObject({
      phaseNumber: 1,
      index: 1,
      command: `${ULTRA_QUALITY_COMMAND} 1`
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        phaseNumber: 1,
        simulate: false,
        blockedByPrerequisites: false,
        executedCount: 2,
        failedCommand: null
      },
      commands: expectedCommands(1)
    });
    expect(result.results).toEqual([
      {
        command: `${SEQUENCE_COMMAND} 1`,
        index: 0,
        ok: true,
        exitCode: 0,
        stdout: 'ok-0',
        stderr: ''
      },
      {
        command: `${ULTRA_QUALITY_COMMAND} 1`,
        index: 1,
        ok: true,
        exitCode: 0,
        stdout: 'ok-1',
        stderr: ''
      }
    ]);
  });

  it('propagates prerequisites blocking reason and reasonCode without rewriting', async () => {
    const blockedValidation = {
      allowed: false,
      reasonCode: 'PHASE_PREREQUISITES_INCOMPLETE',
      reason: 'Prérequis requis incomplets: PR-002.'
    };

    const commandExecutor = vi.fn();

    const result = await orchestratePhaseGuards(
      {
        phaseNumber: 3,
        simulate: false,
        prerequisitesValidation: blockedValidation
      },
      { commandExecutor }
    );

    expect(commandExecutor).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      allowed: false,
      reasonCode: blockedValidation.reasonCode,
      reason: blockedValidation.reason,
      diagnostics: {
        phaseNumber: 3,
        simulate: false,
        blockedByPrerequisites: true,
        executedCount: 0,
        failedCommand: null
      },
      commands: expectedCommands(3),
      results: []
    });
  });

  it('returns INVALID_GUARD_PHASE for unsupported phase values without executing commands', async () => {
    const invalidInputs = [4, 'H03'];

    for (const phaseNumber of invalidInputs) {
      const result = await orchestratePhaseGuards({
        phaseNumber,
        prerequisitesValidation: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'Prérequis validés.'
        }
      });

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_GUARD_PHASE',
        diagnostics: {
          phaseNumber,
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

  it('stops immediately when first guard command fails and exposes failedCommand', async () => {
    const commandExecutor = vi.fn(async ({ index }) => {
      if (index === 0) {
        return {
          ok: false,
          exitCode: 41,
          stderr: 'sequence guard failed'
        };
      }

      return {
        ok: true,
        exitCode: 0,
        stdout: 'should-not-run'
      };
    });

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
      },
      commands: expectedCommands(1)
    });
    expect(result.results).toEqual([
      {
        command: `${SEQUENCE_COMMAND} 1`,
        index: 0,
        ok: false,
        exitCode: 41,
        stdout: '',
        stderr: 'sequence guard failed'
      }
    ]);
  });

  it('stops on second command exception and keeps ordered execution evidence', async () => {
    const commandExecutor = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, exitCode: 0, stdout: 'sequence-ok' })
      .mockRejectedValueOnce(new Error('ultra quality crash'));

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

    expect(commandExecutor).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'GUARD_EXECUTION_FAILED',
      diagnostics: {
        phaseNumber: 2,
        simulate: false,
        blockedByPrerequisites: false,
        executedCount: 2,
        failedCommand: `${ULTRA_QUALITY_COMMAND} 2`
      },
      commands: expectedCommands(2)
    });
    expect(result.results).toEqual([
      {
        command: `${SEQUENCE_COMMAND} 2`,
        index: 0,
        ok: true,
        exitCode: 0,
        stdout: 'sequence-ok',
        stderr: ''
      },
      {
        command: `${ULTRA_QUALITY_COMMAND} 2`,
        index: 1,
        ok: false,
        exitCode: 1,
        stdout: '',
        stderr: 'ultra quality crash'
      }
    ]);
  });

  it('uses injected prerequisitesValidator (S004 bridge) when prerequisitesValidation is not provided', async () => {
    const prerequisitesValidator = vi.fn(() => ({
      allowed: false,
      reasonCode: 'INVALID_PHASE_PREREQUISITES',
      reason: 'Checklist invalide: id manquant.'
    }));

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
        prerequisitesValidator
      }
    );

    expect(prerequisitesValidator).toHaveBeenCalledTimes(1);
    expect(prerequisitesValidator).toHaveBeenCalledWith({
      fromPhase: 'H03',
      toPhase: 'H04',
      prerequisites: []
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE_PREREQUISITES',
      diagnostics: {
        phaseNumber: 2,
        blockedByPrerequisites: true,
        executedCount: 0
      }
    });
  });

  it('keeps stable contract and index export', async () => {
    const result = await orchestrateFromIndex({
      phaseNumber: 1,
      prerequisitesValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Prérequis validés.'
      }
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('commands');
    expect(result).toHaveProperty('results');

    expect(ALLOWED_REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(typeof result.diagnostics.phaseNumber === 'number').toBe(true);
    expect(typeof result.diagnostics.simulate).toBe('boolean');
    expect(typeof result.diagnostics.blockedByPrerequisites).toBe('boolean');
    expect(typeof result.diagnostics.executedCount).toBe('number');
    expect(
      typeof result.diagnostics.failedCommand === 'string' || result.diagnostics.failedCommand === null
    ).toBe(true);
    expect(Array.isArray(result.commands)).toBe(true);
    expect(Array.isArray(result.results)).toBe(true);
  });
});
