import { describe, expect, it } from 'vitest';
import { buildAqcdSnapshotComparisons } from '../../src/aqcd-snapshot-comparisons.js';

function buildPayload() {
  return {
    window: 'story',
    windowRef: 'S050',
    metrics: {
      autonomy: { A1: 88, A2: 84, A3: 82, A4: 86 },
      qualityTech: { Q1: 85, Q2: 83, Q3: 81, Q4: 79, Q5: 87 },
      costEfficiency: { C1: 72, C2: 74, C3: 76, C4: 70 },
      design: { D1: 86, D2: 88, D3: 84, D4: 82, D5: 85, D6: 83 }
    },
    metricSources: {
      'autonomy.A1': 'telemetry://autonomy/A1',
      'autonomy.A2': 'telemetry://autonomy/A2',
      'autonomy.A3': 'telemetry://autonomy/A3',
      'autonomy.A4': 'telemetry://autonomy/A4',
      'qualityTech.Q1': 'telemetry://quality/Q1',
      'qualityTech.Q2': 'telemetry://quality/Q2',
      'qualityTech.Q3': 'telemetry://quality/Q3',
      'qualityTech.Q4': 'telemetry://quality/Q4',
      'qualityTech.Q5': 'telemetry://quality/Q5',
      'costEfficiency.C1': 'telemetry://cost/C1',
      'costEfficiency.C2': 'telemetry://cost/C2',
      'costEfficiency.C3': 'telemetry://cost/C3',
      'costEfficiency.C4': 'telemetry://cost/C4',
      'design.D1': 'telemetry://design/D1',
      'design.D2': 'telemetry://design/D2',
      'design.D3': 'telemetry://design/D3',
      'design.D4': 'telemetry://design/D4',
      'design.D5': 'telemetry://design/D5',
      'design.D6': 'telemetry://design/D6'
    },
    snapshots: [
      {
        id: 'AQCD-S049-W1',
        windowRef: 'S049-W1',
        updatedAt: '2026-03-02T00:00:00.000Z',
        scores: {
          autonomy: 76,
          qualityTech: 74,
          costEfficiency: 72,
          designExcellence: 79,
          global: 75.3
        }
      },
      {
        id: 'AQCD-S050-W1',
        windowRef: 'S050-W1',
        updatedAt: '2026-03-03T00:00:00.000Z',
        scores: {
          autonomy: 79,
          qualityTech: 76,
          costEfficiency: 73,
          designExcellence: 82,
          global: 77.75
        }
      }
    ],
    latencySamplesMs: [500, 700, 900]
  };
}

describe('aqcd-snapshot-comparisons edge', () => {
  it('rejects malformed top-level payload', () => {
    const result = buildAqcdSnapshotComparisons('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_AQCD_SNAPSHOT_COMPARISON_INPUT');
  });

  it('rejects malformed readiness rules weights', () => {
    const payload = buildPayload();
    payload.readinessRules = {
      baseline: -10,
      trend: 25,
      continuity: 25,
      freshness: 15
    };

    const result = buildAqcdSnapshotComparisons(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_READINESS_RULES_INCOMPLETE');
  });

  it('propagates fail-closed source enforcement from AQCD explainable builder', () => {
    const payload = buildPayload();
    delete payload.metricSources['qualityTech.Q3'];

    const result = buildAqcdSnapshotComparisons(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_FORMULA_SOURCE_MISSING');
  });

  it('can bypass continuity blocking when explicit override is provided', () => {
    const payload = buildPayload();
    payload.snapshots[1].updatedAt = '2026-03-10T00:00:00.000Z';

    const result = buildAqcdSnapshotComparisons(payload, {
      nowMs: () => Date.parse('2026-03-10T00:00:00.000Z'),
      enforceContinuity: false
    });

    expect(result.allowed).toBe(true);
    expect(result.diagnostics.metricsContinuous).toBe(false);
    expect(result.readiness.factors.find((item) => item.rule === 'PERIODIC_CONTINUITY')?.satisfied).toBe(false);
  });
});
