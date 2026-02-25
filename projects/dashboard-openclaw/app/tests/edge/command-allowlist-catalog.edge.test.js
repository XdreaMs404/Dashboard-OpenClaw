import { describe, expect, it } from 'vitest';
import { buildCommandAllowlistCatalog } from '../../src/command-allowlist-catalog.js';

function buildBaseInput() {
  return {
    catalogVersion: '2026.02.25-edge-s040',
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
        impactFiles: ['/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/implementation-artifacts/stories/S040.md'],
        parameters: [
          { name: 'sid', type: 'string', required: true },
          { name: 'status', type: 'string', required: true, enum: ['OPEN', 'DONE'] }
        ]
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
          args: { sid: 'S040', status: 'DONE' }
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

  it('blocks write command when role is not allowed (FR-037)', () => {
    const input = buildBaseInput();
    input.executionRequests = [
      {
        commandId: 'story.patch',
        dryRun: true,
        role: 'UXQA',
        args: { sid: 'S040', status: 'OPEN' }
      }
    ];

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ROLE_PERMISSION_REQUIRED');
  });

  it('blocks destructive critical command without double confirmation (FR-036)', () => {
    const input = buildBaseInput();
    input.executionRequests = [
      {
        commandId: 'runtime.kill',
        dryRun: false,
        role: 'ADMIN',
        args: { reason: 'incident-critical' }
      }
    ];

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('DOUBLE_CONFIRMATION_REQUIRED');
  });

  it('blocks destructive critical command when confirmations are not distinct (FR-036)', () => {
    const input = buildBaseInput();
    input.executionRequests = [
      {
        commandId: 'runtime.kill',
        dryRun: false,
        role: 'ADMIN',
        confirmation: {
          firstActor: 'alex.dev',
          secondActor: 'alex.dev'
        },
        args: { reason: 'incident-critical' }
      }
    ];

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('DOUBLE_CONFIRMATION_DISTINCT_ACTORS_REQUIRED');
  });

  it('accepts destructive critical command when role + double confirmation are valid', () => {
    const input = buildBaseInput();
    input.executionRequests = [
      {
        commandId: 'runtime.kill',
        dryRun: false,
        role: 'ADMIN',
        confirmation: {
          firstActor: 'alex.dev',
          secondActor: 'pm.owner',
          confirmationId: 'CONF-S040-EDGE-001'
        },
        args: { reason: 'incident-critical' }
      }
    ];

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.executionGuard.doubleConfirmationReady).toBe(true);
    expect(result.executionGuard.rolePolicyCompliant).toBe(true);
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
          args: { sid: 'S040', status: 'IN_PROGRESS' }
        }
      ]
    };

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_PARAMETER_VALUE');
  });
});
