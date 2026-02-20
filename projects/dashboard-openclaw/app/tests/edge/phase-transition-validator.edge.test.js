import { describe, expect, it } from 'vitest';
import { validatePhaseTransition } from '../../src/phase-transition-validator.js';

describe('phase-transition-validator edge cases', () => {
  it('does not throw on non-object inputs and returns INVALID_PHASE', () => {
    const inputs = [undefined, null, 42, 'H01->H02', true];

    for (const input of inputs) {
      expect(() => validatePhaseTransition(input)).not.toThrow();
      const result = validatePhaseTransition(input);
      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_PHASE'
      });
    }
  });

  it('treats invalid notificationPublishedAt values as missing notification', () => {
    const result = validatePhaseTransition({
      fromPhase: 'H02',
      toPhase: 'H03',
      transitionRequestedAt: '2026-02-20T15:10:00.000Z',
      notificationPublishedAt: 'not-a-date'
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_NOTIFICATION_MISSING',
      diagnostics: {
        elapsedMs: null,
        slaMs: 600_000
      }
    });
  });

  it('blocks when transitionRequestedAt is invalid', () => {
    const result = validatePhaseTransition({
      fromPhase: 'H02',
      toPhase: 'H03',
      transitionRequestedAt: 'invalid-transition-date',
      notificationPublishedAt: '2026-02-20T15:05:00.000Z'
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
      diagnostics: {
        elapsedMs: null
      }
    });
    expect(result.reason).toContain('transitionRequestedAt invalide');
  });

  it('blocks when notification timestamp is after transition request (negative elapsed)', () => {
    const result = validatePhaseTransition({
      fromPhase: 'H02',
      toPhase: 'H03',
      transitionRequestedAt: '2026-02-20T15:00:00.000Z',
      notificationPublishedAt: '2026-02-20T15:00:01.000Z'
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED'
    });
    expect(result.diagnostics.elapsedMs).toBe(-1000);
  });

  it('returns TRANSITION_NOT_ALLOWED from terminal phase H23', () => {
    const result = validatePhaseTransition({
      fromPhase: 'H23',
      toPhase: 'H23',
      transitionRequestedAt: '2026-02-20T15:10:00.000Z',
      notificationPublishedAt: '2026-02-20T15:05:00.000Z'
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'TRANSITION_NOT_ALLOWED'
    });
    expect(result.reason).toContain('expectedToPhase=NONE');
  });

  it('supports custom SLA minutes and Date objects', () => {
    const transitionRequestedAt = new Date('2026-02-20T15:10:30.000Z');
    const notificationPublishedAt = new Date('2026-02-20T15:10:00.000Z');

    const allowed = validatePhaseTransition({
      fromPhase: 'H05',
      toPhase: 'H06',
      transitionRequestedAt,
      notificationPublishedAt,
      notificationSlaMinutes: 0.5
    });

    const blocked = validatePhaseTransition({
      fromPhase: 'H05',
      toPhase: 'H06',
      transitionRequestedAt: '2026-02-20T15:10:30.001Z',
      notificationPublishedAt: '2026-02-20T15:10:00.000Z',
      notificationSlaMinutes: 0.5
    });

    expect(allowed).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        elapsedMs: 30_000,
        slaMs: 30_000
      }
    });

    expect(blocked).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
      diagnostics: {
        elapsedMs: 30_001,
        slaMs: 30_000
      }
    });
  });

  it('falls back to default SLA when notificationSlaMinutes is invalid', () => {
    const invalidSlaValues = ['10', NaN, 0, -3];

    for (const notificationSlaMinutes of invalidSlaValues) {
      const result = validatePhaseTransition({
        fromPhase: 'H02',
        toPhase: 'H03',
        transitionRequestedAt: '2026-02-20T15:10:00.000Z',
        notificationPublishedAt: '2026-02-20T15:00:00.000Z',
        notificationSlaMinutes
      });

      expect(result.diagnostics.slaMs).toBe(600_000);
      expect(result.reasonCode).toBe('OK');
    }
  });

  it('does not mutate input payload', () => {
    const input = {
      fromPhase: 'H01',
      toPhase: 'H02',
      transitionRequestedAt: '2026-02-20T15:10:00.000Z',
      notificationPublishedAt: '2026-02-20T15:05:00.000Z',
      notificationSlaMinutes: 10
    };

    const snapshot = JSON.parse(JSON.stringify(input));

    validatePhaseTransition(input);

    expect(input).toEqual(snapshot);
  });
});
