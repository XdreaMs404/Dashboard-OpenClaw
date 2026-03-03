import { describe, expect, it } from 'vitest';
import {
  buildCommandAllowlistCatalog,
  signActiveProjectRoot
} from '../../src/command-allowlist-catalog.js';
import {
  buildCommandAllowlistCatalog as buildCommandAllowlistCatalogFromIndex,
  signActiveProjectRoot as signActiveProjectRootFromIndex
} from '../../src/index.js';

const ACTIVE_PROJECT_ROOT = '/root/.openclaw/workspace/projects/dashboard-openclaw';
const ACTIVE_PROJECT_ROOT_SIGNING_SECRET = 'unit-secret-s042';

function buildCatalogInput() {
  return {
    catalogVersion: '2026.02.25-e04s04',
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
        impactFiles: ['projects/dashboard-openclaw/_bmad-output/implementation-artifacts/stories/S040.md'],
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
        impactFiles: ['/root/.openclaw/workspace/bmad-total/PROJECT_STATUS.md'],
        parameters: [{ name: 'reason', type: 'string', required: true }]
      }
    ]
  };
}

function buildSignedRuntimeOptions() {
  return {
    activeProjectRoot: ACTIVE_PROJECT_ROOT,
    activeProjectRootSigningSecret: ACTIVE_PROJECT_ROOT_SIGNING_SECRET,
    activeProjectRootSignature: signActiveProjectRoot(
      ACTIVE_PROJECT_ROOT,
      ACTIVE_PROJECT_ROOT_SIGNING_SECRET
    )
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
        args: { sid: 'S040', status: 'OPEN' }
      }
    ];

    const result = buildCommandAllowlistCatalog(input);

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        catalogVersion: '2026.02.25-e04s04',
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
        args: { sid: 'S040', status: 'DONE' }
      }
    ];

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('DRY_RUN_REQUIRED_FOR_WRITE');
    expect(result.correctiveActions).toContain('ENFORCE_DRY_RUN_FOR_WRITE');
    expect(result.diagnostics.impactPreviewMissingCount).toBe(0);
    expect(result.diagnostics.impactPreview).toMatchObject({
      commandId: 'story.patch',
      files: ['projects/dashboard-openclaw/_bmad-output/implementation-artifacts/stories/S040.md']
    });
  });

  it('defaults write commands to dry-run when flag is omitted (AC-01/FR-034)', () => {
    const input = buildCatalogInput();
    input.executionRequests = [
      {
        commandId: 'story.patch',
        role: 'DEV',
        args: { sid: 'S040', status: 'OPEN' }
      }
    ];

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.executionGuard).toMatchObject({
      dryRunByDefault: true,
      impactPreviewReadyForWrite: true
    });
  });

  it('surfaces impact preview details before a blocked apply attempt (AC-02/FR-035)', () => {
    const input = buildCatalogInput();
    input.executionRequests = [
      {
        commandId: 'story.patch',
        dryRun: false,
        role: 'DEV',
        impactFiles: [
          '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/implementation-artifacts/stories/S040.md'
        ],
        args: { sid: 'S040', status: 'DONE' }
      }
    ];

    const result = buildCommandAllowlistCatalog(input, {
      ...buildSignedRuntimeOptions()
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('DRY_RUN_REQUIRED_FOR_WRITE');
    expect(result.diagnostics.impactPreviewProvidedCount).toBe(1);
    expect(result.diagnostics.impactPreview).toMatchObject({
      commandId: 'story.patch',
      files: [
        '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/implementation-artifacts/stories/S040.md'
      ],
      allInsideActiveProjectRoot: true
    });
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

  it('enforces role-based permissions for write commands before execution (FR-037)', () => {
    const input = buildCatalogInput();
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
    expect(result.correctiveActions).toContain('ENFORCE_ROLE_POLICY');
  });

  it('requires double confirmation for destructive critical apply attempts (FR-036)', () => {
    const input = buildCatalogInput();
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
    expect(result.correctiveActions).toContain('ENFORCE_DOUBLE_CONFIRMATION');
  });

  it('requires distinct actors for destructive critical double confirmation (FR-036)', () => {
    const input = buildCatalogInput();
    input.executionRequests = [
      {
        commandId: 'runtime.kill',
        dryRun: false,
        role: 'ADMIN',
        confirmation: {
          firstActor: 'alex.dev',
          secondActor: 'alex.dev',
          confirmationId: 'CONF-S040-001'
        },
        args: { reason: 'incident-critical' }
      }
    ];

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('DOUBLE_CONFIRMATION_DISTINCT_ACTORS_REQUIRED');
    expect(result.correctiveActions).toContain('ENFORCE_DISTINCT_CONFIRMERS');
  });

  it('allows destructive critical apply with valid role and double confirmation (FR-036/FR-037)', () => {
    const input = buildCatalogInput();
    input.executionRequests = [
      {
        commandId: 'runtime.kill',
        dryRun: false,
        role: 'ADMIN',
        confirmation: {
          firstActor: 'alex.dev',
          secondActor: 'pm.owner',
          confirmationId: 'CONF-S040-002'
        },
        idempotencyKey: 'IK-S044-ALLOW-001',
        args: { reason: 'incident-critical' }
      }
    ];

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.diagnostics.doubleConfirmationSatisfiedCount).toBe(1);
    expect(result.executionGuard).toMatchObject({
      rolePolicyCompliant: true,
      doubleConfirmationReady: true,
      criticalRoleCompliant: true
    });
  });

  it('requires active_project_root signature when context is provided (S042)', () => {
    const input = buildCatalogInput();
    input.executionRequests = [
      {
        commandId: 'status.read',
        dryRun: true,
        role: 'DEV',
        args: { verbose: true }
      }
    ];

    const result = buildCommandAllowlistCatalog(input, {
      activeProjectRoot: ACTIVE_PROJECT_ROOT,
      activeProjectRootSigningSecret: ACTIVE_PROJECT_ROOT_SIGNING_SECRET
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ACTIVE_PROJECT_ROOT_SIGNATURE_REQUIRED');
    expect(result.correctiveActions).toContain('SIGN_ACTIVE_PROJECT_ROOT_CONTEXT');
  });

  it('rejects invalid active_project_root signature (S042)', () => {
    const input = buildCatalogInput();
    input.executionRequests = [
      {
        commandId: 'status.read',
        dryRun: true,
        role: 'DEV',
        args: { verbose: true }
      }
    ];

    const result = buildCommandAllowlistCatalog(input, {
      activeProjectRoot: ACTIVE_PROJECT_ROOT,
      activeProjectRootSigningSecret: ACTIVE_PROJECT_ROOT_SIGNING_SECRET,
      activeProjectRootSignature: 'apr-v1-invalid'
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('ACTIVE_PROJECT_ROOT_SIGNATURE_INVALID');
    expect(result.correctiveActions).toContain('REGENERATE_ACTIVE_PROJECT_ROOT_SIGNATURE');
  });

  it('accepts valid signed active_project_root context (S042)', () => {
    const input = buildCatalogInput();
    input.executionRequests = [
      {
        commandId: 'status.read',
        dryRun: true,
        role: 'DEV',
        args: { verbose: true }
      }
    ];

    const result = buildCommandAllowlistCatalog(input, {
      ...buildSignedRuntimeOptions()
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.executionGuard.activeProjectRootSigned).toBe(true);
  });

  it('maintains an append-only command journal for allowed executions (S043/FR-039)', () => {
    const input = buildCatalogInput();
    input.executionRequests = [
      {
        commandId: 'status.read',
        dryRun: true,
        role: 'DEV',
        args: { verbose: true },
        idempotencyKey: 'IK-S043-001',
        timeoutMs: 120000,
        retryCount: 0,
        timestamp: '2026-03-02T22:00:00.000Z'
      }
    ];

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.commandJournal).toMatchObject({
      model: 'append-only-command-journal',
      appendOnly: true,
      entryCount: 1
    });
    expect(result.commandJournal.entries[0]).toMatchObject({
      commandId: 'status.read',
      result: 'ALLOWED',
      reasonCode: 'OK',
      idempotencyKey: 'IK-S043-001',
      timeoutMs: 120000,
      retryCount: 0
    });
    expect(result.commandJournal.entries[0].hash).toMatch(/^cj-v1-[a-f0-9]{16}$/);
  });

  it('detects command journal tampering and blocks execution (S043/S01)', () => {
    const baseline = buildCatalogInput();
    baseline.executionRequests = [
      {
        commandId: 'status.read',
        dryRun: true,
        role: 'DEV',
        args: { verbose: true },
        timestamp: '2026-03-02T22:05:00.000Z'
      }
    ];

    const baselineResult = buildCommandAllowlistCatalog(baseline);
    const tamperedJournal = structuredClone(baselineResult.commandJournal);
    tamperedJournal.entries[0].hash = 'cj-v1-tampered';

    const input = buildCatalogInput();
    input.commandJournal = tamperedJournal;
    input.executionRequests = [
      {
        commandId: 'status.read',
        dryRun: true,
        role: 'DEV',
        args: { verbose: true },
        timestamp: '2026-03-02T22:06:00.000Z'
      }
    ];

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('COMMAND_JOURNAL_TAMPER_DETECTED');
    expect(result.correctiveActions).toContain('RESTORE_APPEND_ONLY_COMMAND_JOURNAL');
  });

  it('enforces max timeout policy for command runs (S044/FR-040)', () => {
    const input = buildCatalogInput();
    input.executionRequests = [
      {
        commandId: 'runtime.kill',
        dryRun: false,
        role: 'ADMIN',
        confirmation: {
          firstActor: 'alex.dev',
          secondActor: 'pm.owner',
          confirmationId: 'CONF-S044-001'
        },
        idempotencyKey: 'IK-S044-TIMEOUT-001',
        timeoutMs: 120001,
        args: { reason: 'incident-critical' }
      }
    ];

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('TIMEOUT_POLICY_VIOLATION');
    expect(result.correctiveActions).toContain('ALIGN_TIMEOUT_POLICY');
  });

  it('enforces bounded retries for command runs (S044/FR-040)', () => {
    const input = buildCatalogInput();
    input.executionRequests = [
      {
        commandId: 'status.read',
        dryRun: true,
        role: 'DEV',
        idempotencyKey: 'IK-S044-RETRY-001',
        retryCount: 4,
        args: { verbose: true }
      }
    ];

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('RETRY_POLICY_VIOLATION');
    expect(result.correctiveActions).toContain('ALIGN_RETRY_POLICY');
  });

  it('requires idempotency key for apply/retry command runs (S044/FR-040)', () => {
    const input = buildCatalogInput();
    input.executionRequests = [
      {
        commandId: 'runtime.kill',
        dryRun: false,
        role: 'ADMIN',
        confirmation: {
          firstActor: 'alex.dev',
          secondActor: 'pm.owner',
          confirmationId: 'CONF-S044-002'
        },
        args: { reason: 'incident-critical' }
      }
    ];

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('IDEMPOTENCY_KEY_REQUIRED');
    expect(result.correctiveActions).toContain('SET_IDEMPOTENCY_KEY');
  });

  it('allows replay with same idempotency key when payload is identical (S044/FR-040)', () => {
    const input = buildCatalogInput();
    input.executionRequests = [
      {
        commandId: 'status.read',
        dryRun: true,
        role: 'DEV',
        idempotencyKey: 'IK-S044-REPLAY-001',
        retryCount: 1,
        args: { verbose: true }
      },
      {
        commandId: 'status.read',
        dryRun: true,
        role: 'DEV',
        idempotencyKey: 'IK-S044-REPLAY-001',
        retryCount: 1,
        args: { verbose: true }
      }
    ];

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.diagnostics.idempotencyReplayCount).toBe(1);
  });

  it('blocks idempotency key reuse with divergent payloads (S044/S01)', () => {
    const input = buildCatalogInput();
    input.executionRequests = [
      {
        commandId: 'status.read',
        dryRun: true,
        role: 'DEV',
        idempotencyKey: 'IK-S044-CONFLICT-001',
        retryCount: 1,
        args: { verbose: true }
      },
      {
        commandId: 'status.read',
        dryRun: true,
        role: 'DEV',
        idempotencyKey: 'IK-S044-CONFLICT-001',
        retryCount: 1,
        args: { verbose: false }
      }
    ];

    const result = buildCommandAllowlistCatalog(input);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('IDEMPOTENCY_KEY_REUSE_CONFLICT');
    expect(result.correctiveActions).toContain('ROTATE_IDEMPOTENCY_KEY');
  });

  it('sequences concurrent requests with priority and capacity slots (S044/FR-041)', () => {
    const input = buildCatalogInput();
    input.executionRequests = [
      {
        commandId: 'status.read',
        dryRun: true,
        role: 'DEV',
        priority: 'low',
        args: { verbose: true }
      },
      {
        commandId: 'story.patch',
        dryRun: true,
        role: 'DEV',
        priority: 'high',
        args: { sid: 'S040', status: 'OPEN' }
      },
      {
        commandId: 'runtime.kill',
        dryRun: true,
        role: 'ADMIN',
        priority: 'critical',
        args: { reason: 'maintenance' }
      }
    ];

    const result = buildCommandAllowlistCatalog(input, { executionCapacity: 2 });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.executionGuard.sequencingPolicyCompliant).toBe(true);
    expect(result.diagnostics.scheduledCommandOrder.map((entry) => entry.commandId)).toEqual([
      'runtime.kill',
      'story.patch',
      'status.read'
    ]);
    expect(result.diagnostics.scheduledCommandOrder.map((entry) => entry.capacitySlot)).toEqual([1, 2, 1]);
  });

  it('rejects scheduling metadata that conflicts with computed capacity order (S044/FR-041)', () => {
    const input = buildCatalogInput();
    input.executionRequests = [
      {
        commandId: 'status.read',
        dryRun: true,
        role: 'DEV',
        priority: 'low',
        queuePosition: 1,
        args: { verbose: true }
      },
      {
        commandId: 'runtime.kill',
        dryRun: true,
        role: 'ADMIN',
        priority: 'critical',
        args: { reason: 'maintenance' }
      }
    ];

    const result = buildCommandAllowlistCatalog(input, { executionCapacity: 1 });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('EXECUTION_CAPACITY_EXCEEDED');
    expect(result.correctiveActions).toContain('SEQUENCE_WITH_AVAILABLE_CAPACITY');
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
    const signature = signActiveProjectRootFromIndex(
      ACTIVE_PROJECT_ROOT,
      ACTIVE_PROJECT_ROOT_SIGNING_SECRET
    );

    expect(result.reasonCode).toBe('OK');
    expect(signature).toMatch(/^apr-v1-[a-f0-9]{16}$/);
  });
});
