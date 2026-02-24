import { describe, expect, it } from 'vitest';
import { buildCommandAllowlistCatalog } from '../../src/command-allowlist-catalog.js';

function buildBaseInput() {
  return {
    catalogVersion: '2026.02.24-edge',
    commands: [
      {
        id: 'status.read',
        command: 'openclaw status',
        mode: 'READ',
        parameters: [{ name: 'verbose', type: 'boolean', required: false }]
      },
      {
        id: 'runtime.kill',
        command: 'openclaw gateway restart',
        mode: 'CRITICAL',
        allowedRoles: ['ADMIN'],
        impactFiles: ['/root/.openclaw/workspace/projects/dashboard-openclaw/runtime/jobs.json'],
        parameters: [{ name: 'reason', type: 'string', required: true }]
      }
    ]
  };
}

describe('command-allowlist-catalog edge', () => {
  it('rejects malformed top-level input', () => {
    const result = buildCommandAllowlistCatalog('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_COMMAND_CATALOG_INPUT');
  });

  it('requires a catalog version', () => {
    const input = buildBaseInput();
    delete input.catalogVersion;

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('VERSION_REQUIRED');
  });

  it('rejects duplicated command ids', () => {
    const input = buildBaseInput();
    input.commands.push({
      id: 'status.read',
      command: 'openclaw status --json',
      mode: 'READ',
      parameters: [{ name: 'verbose', type: 'boolean', required: false }]
    });

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('DUPLICATE_COMMAND_ID');
  });

  it('rejects command entries without parameter schema', () => {
    const input = buildBaseInput();
    input.commands[0] = {
      id: 'status.read',
      command: 'openclaw status',
      mode: 'READ',
      parameters: []
    };

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('PARAMETER_SCHEMA_REQUIRED');
  });

  it('can bypass strict role checks in runtime options for simulation mode', () => {
    const input = buildBaseInput();
    input.executionRequests = [
      {
        commandId: 'runtime.kill',
        dryRun: true,
        role: 'DEV',
        args: { reason: 'maintenance' }
      }
    ];

    const result = buildCommandAllowlistCatalog(input, { strictRoleCheck: false });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
  });

  it('reports impact outside active project root on blocked apply attempts (NFR-021)', () => {
    const input = {
      catalogVersion: '2026.02.24-root',
      commands: [
        {
          id: 'story.patch',
          command: 'bash scripts/update-story-status.sh',
          mode: 'WRITE',
          parameters: [
            { name: 'sid', type: 'string', required: true },
            { name: 'status', type: 'string', required: true, enum: ['OPEN', 'DONE'] }
          ]
        }
      ],
      executionRequests: [
        {
          commandId: 'story.patch',
          dryRun: false,
          role: 'DEV',
          impactFiles: ['/etc/passwd'],
          args: { sid: 'S038', status: 'DONE' }
        }
      ]
    };

    const result = buildCommandAllowlistCatalog(input, {
      activeProjectRoot: '/root/.openclaw/workspace/projects/dashboard-openclaw'
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('DRY_RUN_REQUIRED_FOR_WRITE');
    expect(result.diagnostics.impactPreviewOutsideProjectCount).toBe(1);
    expect(result.diagnostics.impactPreview).toMatchObject({
      files: ['/etc/passwd'],
      allInsideActiveProjectRoot: false
    });
  });

  it('rejects enum mismatch in command arguments', () => {
    const input = {
      catalogVersion: '2026.02.24-enum',
      commands: [
        {
          id: 'story.patch',
          command: 'bash scripts/update-story-status.sh',
          mode: 'WRITE',
          parameters: [
            { name: 'sid', type: 'string', required: true },
            { name: 'status', type: 'string', required: true, enum: ['OPEN', 'DONE'] }
          ]
        }
      ],
      executionRequests: [
        {
          commandId: 'story.patch',
          dryRun: true,
          role: 'DEV',
          args: { sid: 'S037', status: 'IN_PROGRESS' }
        }
      ]
    };

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_PARAMETER_VALUE');
  });
});
