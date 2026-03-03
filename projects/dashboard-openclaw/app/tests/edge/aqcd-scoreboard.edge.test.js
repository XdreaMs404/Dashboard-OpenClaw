import { describe, expect, it } from 'vitest';
import { buildAqcdExplainableScoreboard } from '../../src/aqcd-scoreboard.js';

function buildPayload() {
  return {
    window: 'story',
    windowRef: 'S049',
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
    latencySamplesMs: [400, 500, 700]
  };
}

describe('aqcd-scoreboard edge', () => {
  it('rejects malformed top-level payload', () => {
    const result = buildAqcdExplainableScoreboard('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_AQCD_SCOREBOARD_INPUT');
  });

  it('rejects malformed snapshots payload', () => {
    const payload = buildPayload();
    payload.snapshots = [null];

    const result = buildAqcdExplainableScoreboard(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_SNAPSHOT_SERIES_INVALID');
  });

  it('rejects p95 latency budget overflow (NFR-009)', () => {
    const payload = buildPayload();
    payload.latencySamplesMs = [2600, 2700, 2800];

    const result = buildAqcdExplainableScoreboard(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_LATENCY_BUDGET_EXCEEDED');
  });

  it('accepts historySnapshots alias and computes trend against latest snapshot', () => {
    const payload = buildPayload();
    payload.historySnapshots = [
      {
        id: 'AQCD-S047',
        windowRef: 'S047',
        updatedAt: '2026-03-03T03:00:00.000Z',
        scores: {
          autonomy: 74,
          qualityTech: 73,
          costEfficiency: 69,
          designExcellence: 77,
          global: 73.45
        }
      }
    ];

    const result = buildAqcdExplainableScoreboard(payload);

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.snapshots.series).toHaveLength(1);
    expect(result.snapshots.trend.previousGlobal).toBe(73.45);
    expect(result.snapshots.trend.deltaGlobal).toBeGreaterThan(0);
  });
});
