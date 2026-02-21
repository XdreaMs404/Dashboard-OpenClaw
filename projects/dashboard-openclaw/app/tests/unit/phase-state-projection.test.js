import { describe, expect, it } from 'vitest';
import { buildPhaseStateProjection } from '../../src/phase-state-projection.js';
import {
  buildPhaseStateProjection as buildFromIndex,
  validatePhaseTransition
} from '../../src/index.js';

const ALLOWED_STATUS = new Set(['pending', 'running', 'done', 'blocked']);

describe('phase-state-projection unit', () => {
  it('returns done with owner, timestamps and duration for completed phase', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H02',
      owner: '  Alex  ',
      startedAt: '2026-02-20T15:00:00.000Z',
      finishedAt: '2026-02-20T15:10:00.000Z',
      nowAt: '2026-02-20T15:20:00.000Z'
    });

    expect(result).toMatchObject({
      phaseId: 'H02',
      owner: 'Alex',
      started_at: '2026-02-20T15:00:00.000Z',
      finished_at: '2026-02-20T15:10:00.000Z',
      status: 'done',
      duration_ms: 600_000,
      blockingReasonCode: null,
      blockingReason: null,
      diagnostics: {
        startedMs: Date.parse('2026-02-20T15:00:00.000Z'),
        finishedMs: Date.parse('2026-02-20T15:10:00.000Z'),
        nowMs: Date.parse('2026-02-20T15:20:00.000Z')
      }
    });
  });

  it('returns running and uses injectable nowAt for deterministic duration', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H03',
      owner: 'Nora',
      startedAt: '2026-02-20T15:00:00.000Z',
      finishedAt: null,
      nowAt: '2026-02-20T15:03:00.000Z'
    });

    expect(result).toMatchObject({
      status: 'running',
      duration_ms: 180_000,
      blockingReasonCode: null,
      diagnostics: {
        startedMs: Date.parse('2026-02-20T15:00:00.000Z'),
        finishedMs: null,
        nowMs: Date.parse('2026-02-20T15:03:00.000Z')
      }
    });
  });

  it('returns pending when startedAt and finishedAt are missing without blocking', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H04',
      owner: 'Iris',
      startedAt: null,
      finishedAt: null,
      nowAt: '2026-02-20T15:03:00.000Z'
    });

    expect(result).toMatchObject({
      status: 'pending',
      duration_ms: null,
      blockingReasonCode: null,
      blockingReason: null
    });
  });

  it('returns blocked and re-exposes transition reason from S002 (missing notification)', () => {
    const transitionValidation = validatePhaseTransition({
      fromPhase: 'H02',
      toPhase: 'H03',
      transitionRequestedAt: '2026-02-20T15:10:00.000Z',
      notificationPublishedAt: null
    });

    const result = buildPhaseStateProjection({
      phaseId: 'H02',
      owner: 'Mina',
      startedAt: null,
      finishedAt: null,
      nowAt: '2026-02-20T15:10:00.000Z',
      transitionValidation
    });

    expect(result).toMatchObject({
      status: 'blocked',
      duration_ms: null,
      blockingReasonCode: 'PHASE_NOTIFICATION_MISSING'
    });
    expect(result.blockingReason).toContain('notificationPublishedAt');
  });

  it('returns blocked and re-exposes transition reason from S002 (SLA exceeded)', () => {
    const transitionValidation = validatePhaseTransition({
      fromPhase: 'H02',
      toPhase: 'H03',
      transitionRequestedAt: '2026-02-20T15:10:00.001Z',
      notificationPublishedAt: '2026-02-20T15:00:00.000Z'
    });

    const result = buildPhaseStateProjection({
      phaseId: 'H02',
      owner: 'Mina',
      startedAt: null,
      finishedAt: null,
      nowAt: '2026-02-20T15:10:00.001Z',
      transitionValidation
    });

    expect(result).toMatchObject({
      status: 'blocked',
      duration_ms: null,
      blockingReasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED'
    });
    expect(result.blockingReason).toContain('elapsedMs=600001');
  });

  it('returns blocked INVALID_PHASE_TIMESTAMPS when finishedAt < startedAt', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H05',
      owner: 'Sana',
      startedAt: '2026-02-20T15:10:00.000Z',
      finishedAt: '2026-02-20T15:09:59.999Z'
    });

    expect(result).toMatchObject({
      status: 'blocked',
      duration_ms: null,
      blockingReasonCode: 'INVALID_PHASE_TIMESTAMPS'
    });
  });

  it('returns blocked INVALID_PHASE_STATE for invalid phaseId or blank owner', () => {
    const invalidPhase = buildPhaseStateProjection({
      phaseId: 'H24',
      owner: 'Owner',
      startedAt: null,
      finishedAt: null
    });

    const invalidOwner = buildPhaseStateProjection({
      phaseId: 'H01',
      owner: '   ',
      startedAt: null,
      finishedAt: null
    });

    expect(invalidPhase).toMatchObject({
      status: 'blocked',
      blockingReasonCode: 'INVALID_PHASE_STATE'
    });
    expect(invalidOwner).toMatchObject({
      status: 'blocked',
      blockingReasonCode: 'INVALID_PHASE_STATE'
    });
  });

  it('keeps stable output contract and index export', () => {
    const result = buildFromIndex({
      phaseId: 'H01',
      owner: 'Kai',
      startedAt: null,
      finishedAt: null,
      transitionValidation: {
        allowed: false,
        reasonCode: 'TRANSITION_NOT_ALLOWED',
        reason: 'skip not allowed'
      }
    });

    expect(result).toHaveProperty('phaseId');
    expect(result).toHaveProperty('owner');
    expect(result).toHaveProperty('started_at');
    expect(result).toHaveProperty('finished_at');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('duration_ms');
    expect(result).toHaveProperty('blockingReasonCode');
    expect(result).toHaveProperty('blockingReason');
    expect(result).toHaveProperty('diagnostics');

    expect(ALLOWED_STATUS.has(result.status)).toBe(true);
    expect(
      typeof result.diagnostics.startedMs === 'number' || result.diagnostics.startedMs === null
    ).toBe(true);
    expect(
      typeof result.diagnostics.finishedMs === 'number' || result.diagnostics.finishedMs === null
    ).toBe(true);
    expect(typeof result.diagnostics.nowMs === 'number').toBe(true);
  });
});
