import { describe, expect, it } from 'vitest';
import { buildSimulationTrendSnapshot } from '../../src/gate-simulation-trends.js';

describe('gate-simulation-trends edge', () => {
  it('rejects malformed trendWindow and malformed trendSamples payloads', () => {
    const malformedWindow = buildSimulationTrendSnapshot({
      simulatedVerdict: 'PASS',
      trendWindow: 'bad-window'
    });

    expect(malformedWindow.allowed).toBe(false);
    expect(malformedWindow.reasonCode).toBe('SIMULATION_TREND_WINDOW_INVALID');

    const malformedSamples = buildSimulationTrendSnapshot({
      simulatedVerdict: 'PASS',
      trendSamples: 'bad-samples'
    });

    expect(malformedSamples.allowed).toBe(false);
    expect(malformedSamples.reasonCode).toBe('INVALID_GATE_SIMULATION_INPUT');
  });

  it('filters out-of-window samples and keeps in-window consistency counters', () => {
    const result = buildSimulationTrendSnapshot(
      {
        phase: 'g4-ux',
        trendWindow: {
          startAt: '2026-02-10T00:00:00.000Z',
          endAt: '2026-02-20T00:00:00.000Z'
        },
        trendSamples: [
          { verdict: 'PASS', at: '2026-02-01T00:00:00.000Z' },
          { verdict: 'FAIL', at: '2026-02-12T00:00:00.000Z' },
          { verdict: 'CONCERNS', at: '2026-02-16T00:00:00.000Z' },
          { verdict: 'PASS', at: '2026-03-01T00:00:00.000Z' }
        ]
      },
      {
        nowMs: () => Date.parse('2026-02-20T00:00:00.000Z')
      }
    );

    expect(result.allowed).toBe(true);
    expect(result.trendSnapshot.phase).toBe('G4-UX');
    expect(result.trendSnapshot.totalCount).toBe(2);
    expect(result.trendSnapshot.failCount).toBe(1);
    expect(result.trendSnapshot.concernsCount).toBe(1);
  });

  it('returns invalid trend input when sample verdict/timestamp is malformed', () => {
    const invalidVerdict = buildSimulationTrendSnapshot({
      trendSamples: [{ verdict: 'UNKNOWN' }]
    });

    expect(invalidVerdict.allowed).toBe(false);
    expect(invalidVerdict.reasonCode).toBe('INVALID_GATE_SIMULATION_INPUT');

    const invalidTimestamp = buildSimulationTrendSnapshot({
      trendSamples: [{ verdict: 'PASS', at: 'not-a-date' }]
    });

    expect(invalidTimestamp.allowed).toBe(false);
    expect(invalidTimestamp.reasonCode).toBe('INVALID_GATE_SIMULATION_INPUT');
  });
});
