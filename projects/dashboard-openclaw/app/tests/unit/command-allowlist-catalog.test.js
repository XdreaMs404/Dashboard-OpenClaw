import { describe, expect, it } from 'vitest';
import { buildCommandAllowlistCatalog } from '../../src/command-allowlist-catalog.js';
import { buildCommandAllowlistCatalog as buildCommandAllowlistCatalogFromIndex } from '../../src/index.js';

function buildCatalogInput() {
  return {
    catalogVersion: '2026.02.24-e04s01',
    commands: [
      {
        id: 'status.read',
        command: 'openclaw status',
        mode: 'READ',
        parameters: [{ name: 'verbose', type: 'boolean', required: false }]
      },
      {
        id: 'story.patch',
        command: 'bash scripts/update-story-status.sh',
        mode: 'WRITE',
        allowedRoles: ['DEV', 'TEA'],
        parameters: [
          { name: 'sid', type: 'string', required: true, pattern: '^S[0-9]{3}$' },
          { name: 'status', type: 'string', required: true, enum: ['OPEN', 'DONE'] }
        ]
      },
      {
        id: 'runtime.kill',
        command: 'openclaw gateway restart',
        mode: 'CRITICAL',
        allowedRoles: ['ADMIN'],
        parameters: [{ name: 'reason', type: 'string', required: true }]
      }
    ]
  };
}

describe('command-allowlist-catalog unit', () => {
  it('builds a versioned allowlist catalog and validates executions from catalog (AC-01/AC-04)', () => {
    const input = buildCatalogInput();
    input.executionRequests = [
      {
        commandId: 'status.read',
        dryRun: true,
        role: 'DEV',
        args: { verbose: true }
      },
      {
        commandId: 'story.patch',
        dryRun: true,
        role: 'DEV',
        args: { sid: 'S037', status: 'OPEN' }
      }
    ];

    const result = buildCommandAllowlistCatalog(input);

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        catalogVersion: '2026.02.24-e04s01',
        commandCount: 3,
        executionCount: 2,
        outsideCatalogCount: 0,
        validatedExecutions: 2
      },
      executionGuard: {
        allFromCatalog: true,
        dryRunByDefault: true,
        criticalRoleCompliant: true
      }
    });

    expect(result.catalog.commands).toHaveLength(3);
  });

  it('enforces dry-run by default for write commands (AC-02/FR-034)', () => {
    const input = buildCatalogInput();
    input.executionRequests = [
      {
        commandId: 'story.patch',
        dryRun: false,
        role: 'DEV',
        args: { sid: 'S037', status: 'DONE' }
      }
    ];

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('DRY_RUN_REQUIRED_FOR_WRITE');
    expect(result.correctiveActions).toContain('ENFORCE_DRY_RUN_FOR_WRITE');
  });

  it('fails when execution command is outside allowlist (AC-04/NFR-020)', () => {
    const input = buildCatalogInput();
    input.executionRequests = [
      {
        commandId: 'rm.rf',
        dryRun: true,
        role: 'DEV',
        args: {}
      }
    ];

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('COMMAND_OUTSIDE_CATALOG');
    expect(result.correctiveActions).toContain('BLOCK_NON_ALLOWLIST_COMMAND');
  });

  it('fails critical command execution when role is not authorized (AC-03/NFR-019)', () => {
    const input = buildCatalogInput();
    input.executionRequests = [
      {
        commandId: 'runtime.kill',
        dryRun: true,
        role: 'DEV',
        args: { reason: 'incident' }
      }
    ];

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('CRITICAL_ACTION_ROLE_REQUIRED');
    expect(result.correctiveActions).toContain('ENFORCE_CRITICAL_ROLE_POLICY');
  });

  it('blocks unsafe parameter values to reduce shell-injection risk (S02)', () => {
    const input = buildCatalogInput();
    input.executionRequests = [
      {
        commandId: 'runtime.kill',
        dryRun: true,
        role: 'ADMIN',
        args: { reason: 'incident && rm -rf /' }
      }
    ];

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UNSAFE_PARAMETER_VALUE');
    expect(result.correctiveActions).toContain('SANITIZE_COMMAND_PARAMETERS');
  });

  it('is exported from index', () => {
    const result = buildCommandAllowlistCatalogFromIndex(buildCatalogInput());

    expect(result.reasonCode).toBe('OK');
  });
});
