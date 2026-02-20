import { describe, expect, it } from 'vitest';
import { BMAD_PHASE_ORDER, validatePhaseTransition } from '../../src/phase-transition-validator.js';
import { BMAD_PHASE_ORDER as BMAD_PHASE_ORDER_FROM_INDEX, validatePhaseTransition as validateFromIndex } from '../../src/index.js';

const REASON_CODES = new Set([
  'OK',
  'INVALID_PHASE',
  'TRANSITION_NOT_ALLOWED',
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED'
]);

describe('phase-transition-validator unit', () => {
  it('allows canonical H01 -> H02 when notification exists and elapsed <= 10 minutes', () => {
    const transitionRequestedAt = new Date('2026-02-20T15:10:00.000Z');
    const notificationPublishedAt = new Date('2026-02-20T15:05:00.000Z');

    const result = validatePhaseTransition({
      fromPhase: 'H01',
      toPhase: 'H02',
      transitionRequestedAt,
      notificationPublishedAt
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        fromIndex: 0,
        toIndex: 1,
        elapsedMs: 300_000,
        slaMs: 600_000
      }
    });
  });

  it('blocks non-canonical transitions with explicit reason containing from/to/expected', () => {
    const result = validatePhaseTransition({
      fromPhase: 'H01',
      toPhase: 'H03',
      transitionRequestedAt: '2026-02-20T15:10:00.000Z',
      notificationPublishedAt: '2026-02-20T15:05:00.000Z'
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('TRANSITION_NOT_ALLOWED');
    expect(result.reason).toContain('fromPhase=H01');
    expect(result.reason).toContain('toPhase=H03');
    expect(result.reason).toContain('expectedToPhase=H02');
    expect(result.diagnostics.elapsedMs).toBeNull();
  });

  it('blocks backward transitions', () => {
    const result = validatePhaseTransition({
      fromPhase: 'H04',
      toPhase: 'H03',
      transitionRequestedAt: '2026-02-20T15:10:00.000Z',
      notificationPublishedAt: '2026-02-20T15:05:00.000Z'
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'TRANSITION_NOT_ALLOWED'
    });
  });

  it('returns PHASE_NOTIFICATION_MISSING when notificationPublishedAt is null', () => {
    const result = validatePhaseTransition({
      fromPhase: 'H02',
      toPhase: 'H03',
      transitionRequestedAt: '2026-02-20T15:10:00.000Z',
      notificationPublishedAt: null
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_NOTIFICATION_MISSING'
    });
  });

  it('returns PHASE_NOTIFICATION_SLA_EXCEEDED when elapsed > notificationSlaMinutes', () => {
    const result = validatePhaseTransition({
      fromPhase: 'H02',
      toPhase: 'H03',
      transitionRequestedAt: '2026-02-20T15:10:00.001Z',
      notificationPublishedAt: '2026-02-20T15:00:00.000Z',
      notificationSlaMinutes: 10
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
      diagnostics: {
        elapsedMs: 600_001,
        slaMs: 600_000
      }
    });
  });

  it('keeps boundary behavior at SLA threshold', () => {
    const atBoundary = validatePhaseTransition({
      fromPhase: 'H02',
      toPhase: 'H03',
      transitionRequestedAt: '2026-02-20T15:10:00.000Z',
      notificationPublishedAt: '2026-02-20T15:00:00.000Z'
    });

    const beyondBoundary = validatePhaseTransition({
      fromPhase: 'H02',
      toPhase: 'H03',
      transitionRequestedAt: '2026-02-20T15:10:00.001Z',
      notificationPublishedAt: '2026-02-20T15:00:00.000Z'
    });

    expect(atBoundary).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        elapsedMs: 600_000,
        slaMs: 600_000
      }
    });

    expect(beyondBoundary).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED'
    });
  });

  it('returns INVALID_PHASE for unknown phases without throwing', () => {
    const invalidFrom = validatePhaseTransition({
      fromPhase: 'H99',
      toPhase: 'H02',
      transitionRequestedAt: '2026-02-20T15:10:00.000Z',
      notificationPublishedAt: '2026-02-20T15:05:00.000Z'
    });

    const invalidTo = validatePhaseTransition({
      fromPhase: 'H01',
      toPhase: 'phase1',
      transitionRequestedAt: '2026-02-20T15:10:00.000Z',
      notificationPublishedAt: '2026-02-20T15:05:00.000Z'
    });

    expect(invalidFrom).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE'
    });
    expect(invalidTo).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE'
    });
  });

  it('returns stable output contract and exports via index', () => {
    const result = validateFromIndex({
      fromPhase: 'H01',
      toPhase: 'H02',
      transitionRequestedAt: '2026-02-20T15:10:00.000Z',
      notificationPublishedAt: '2026-02-20T15:08:00.000Z'
    });

    expect(BMAD_PHASE_ORDER).toHaveLength(23);
    expect(BMAD_PHASE_ORDER[0]).toBe('H01');
    expect(BMAD_PHASE_ORDER[22]).toBe('H23');
    expect(BMAD_PHASE_ORDER_FROM_INDEX).toEqual(BMAD_PHASE_ORDER);

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(typeof result.diagnostics.slaMs).toBe('number');
    expect(
      typeof result.diagnostics.elapsedMs === 'number' || result.diagnostics.elapsedMs === null
    ).toBe(true);
  });
});
