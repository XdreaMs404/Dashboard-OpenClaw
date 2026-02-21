import { describe, expect, it } from 'vitest';
import { buildPhaseStateProjection } from '../../src/phase-state-projection.js';

describe('phase-state-projection edge cases', () => {
  it('does not throw on non-object input and returns INVALID_PHASE_STATE', () => {
    const inputs = [undefined, null, 42, true, 'H01'];

    for (const input of inputs) {
      expect(() => buildPhaseStateProjection(input)).not.toThrow();

      const result = buildPhaseStateProjection(input);

      expect(result).toMatchObject({
        status: 'blocked',
        blockingReasonCode: 'INVALID_PHASE_STATE'
      });
    }
  });

  it('blocks when startedAt is invalid', () => {
    const invalidString = buildPhaseStateProjection({
      phaseId: 'H01',
      owner: 'Owner',
      startedAt: 'invalid-date',
      finishedAt: null
    });

    const invalidType = buildPhaseStateProjection({
      phaseId: 'H01',
      owner: 'Owner',
      startedAt: 123,
      finishedAt: null
    });

    expect(invalidString).toMatchObject({
      status: 'blocked',
      duration_ms: null,
      blockingReasonCode: 'INVALID_PHASE_TIMESTAMPS'
    });
    expect(invalidType).toMatchObject({
      status: 'blocked',
      duration_ms: null,
      blockingReasonCode: 'INVALID_PHASE_TIMESTAMPS'
    });
  });

  it('blocks when finishedAt is provided without startedAt', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H01',
      owner: 'Owner',
      startedAt: null,
      finishedAt: '2026-02-20T15:10:00.000Z'
    });

    expect(result).toMatchObject({
      status: 'blocked',
      duration_ms: null,
      blockingReasonCode: 'INVALID_PHASE_TIMESTAMPS'
    });
    expect(result.blockingReason).toContain('sans startedAt');
  });

  it('blocks running state when nowAt is invalid or older than startedAt', () => {
    const invalidNow = buildPhaseStateProjection({
      phaseId: 'H03',
      owner: 'Owner',
      startedAt: '2026-02-20T15:10:00.000Z',
      finishedAt: null,
      nowAt: 'not-a-date'
    });

    const olderNow = buildPhaseStateProjection({
      phaseId: 'H03',
      owner: 'Owner',
      startedAt: '2026-02-20T15:10:00.000Z',
      finishedAt: null,
      nowAt: '2026-02-20T15:09:59.000Z'
    });

    expect(invalidNow).toMatchObject({
      status: 'blocked',
      blockingReasonCode: 'INVALID_PHASE_TIMESTAMPS'
    });
    expect(olderNow).toMatchObject({
      status: 'blocked',
      blockingReasonCode: 'INVALID_PHASE_TIMESTAMPS'
    });
  });

  it('supports transitionInput by delegating validation to S002', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H02',
      owner: 'Owner',
      startedAt: null,
      finishedAt: null,
      transitionInput: {
        fromPhase: 'H02',
        toPhase: 'H03',
        transitionRequestedAt: '2026-02-20T15:10:00.001Z',
        notificationPublishedAt: '2026-02-20T15:00:00.000Z'
      }
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockingReasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
      diagnostics: {
        transitionAllowed: false,
        transitionReasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED'
      }
    });
  });

  it('treats blank timestamps as missing values', () => {
    const pending = buildPhaseStateProjection({
      phaseId: 'H08',
      owner: 'Owner',
      startedAt: '   ',
      finishedAt: ''
    });

    expect(pending).toMatchObject({
      status: 'pending',
      duration_ms: null,
      blockingReasonCode: null
    });
  });

  it('falls back to current time when nowAt is blank', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H09',
      owner: 'Owner',
      startedAt: '2000-01-01T00:00:00.000Z',
      finishedAt: null,
      nowAt: '   '
    });

    expect(result.status).toBe('running');
    expect(typeof result.diagnostics.nowMs).toBe('number');
    expect(result.duration_ms).toBeGreaterThan(0);
  });

  it('does not mutate the input payload', () => {
    const input = {
      phaseId: 'H05',
      owner: 'Owner',
      startedAt: '2026-02-20T15:10:00.000Z',
      finishedAt: null,
      nowAt: '2026-02-20T15:12:00.000Z',
      transitionValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'allowed'
      }
    };

    const snapshot = JSON.parse(JSON.stringify(input));

    buildPhaseStateProjection(input);

    expect(input).toEqual(snapshot);
  });

  it('supports Date objects for timestamps', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H06',
      owner: 'Owner',
      startedAt: new Date('2026-02-20T15:00:00.000Z'),
      finishedAt: new Date('2026-02-20T15:02:00.000Z')
    });

    expect(result).toMatchObject({
      status: 'done',
      duration_ms: 120_000,
      blockingReasonCode: null
    });
  });

  it('ignores non-blocking transitionValidation and keeps nominal status', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H07',
      owner: 'Owner',
      startedAt: null,
      finishedAt: null,
      transitionValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'allowed'
      }
    });

    expect(result).toMatchObject({
      status: 'pending',
      blockingReasonCode: null,
      diagnostics: {
        transitionAllowed: true,
        transitionReasonCode: 'OK'
      }
    });
  });
});
