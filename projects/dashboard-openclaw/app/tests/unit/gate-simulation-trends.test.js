import { describe, expect, it } from 'vitest';
import { buildSimulationTrendSnapshot } from '../../src/gate-simulation-trends.js';
import { buildSimulationTrendSnapshot as buildSimulationTrendSnapshotFromIndex } from '../../src/index.js';

describe('gate-simulation-trends unit', () => {
  it('builds phase/period trend counters with direction (AC-03)', () => {
    const result = buildSimulationTrendSnapshot(
      {
        phase: 'G4-UX',
        trendWindow: {
          startAt: '2026-02-01T00:00:00.000Z',
          endAt: '2026-02-08T00:00:00.000Z',
          period: '2026-W06'
        },
        trendSamples: [
          { verdict: 'FAIL', at: '2026-02-02T10:00:00.000Z' },
          { verdict: 'CONCERNS', at: '2026-02-04T10:00:00.000Z' },
          { verdict: 'PASS', at: '2026-02-07T10:00:00.000Z' }
        ]
      },
      {
        nowMs: () => Date.parse('2026-02-08T00:00:00.000Z')
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      trendSnapshot: {
        phase: 'G4-UX',
        period: '2026-W06',
        passCount: 1,
        concernsCount: 1,
        failCount: 1,
        totalCount: 3,
        trendDirection: 'UP'
      }
    });
  });

  it('blocks invalid trend window (AC-04)', () => {
    const result = buildSimulationTrendSnapshot({
      phase: 'G4-T',
      trendWindow: {
        startAt: '2026-02-10T00:00:00.000Z',
        endAt: '2026-02-01T00:00:00.000Z'
      }
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('SIMULATION_TREND_WINDOW_INVALID');
    expect(result.correctiveActions).toContain('FIX_TREND_WINDOW_INPUT');
  });

  it('falls back to current simulated verdict when no sample list is provided', () => {
    const result = buildSimulationTrendSnapshot(
      {
        phase: 'G4',
        simulatedVerdict: 'CONCERNS',
        sourceReasonCode: 'OK'
      },
      {
        nowMs: () => Date.parse('2026-02-24T12:00:00.000Z')
      }
    );

    expect(result.allowed).toBe(true);
    expect(result.trendSnapshot.totalCount).toBe(1);
    expect(result.trendSnapshot.concernsCount).toBe(1);
    expect(result.trendSnapshot.trendDirection).toBe('FLAT');
  });

  it('is exported from index', () => {
    const result = buildSimulationTrendSnapshotFromIndex({
      simulatedVerdict: 'PASS',
      sourceReasonCode: 'OK'
    });

    expect(result.reasonCode).toBe('OK');
  });
});
