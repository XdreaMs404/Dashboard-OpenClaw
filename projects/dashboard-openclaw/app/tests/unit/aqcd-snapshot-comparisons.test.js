import { describe, expect, it } from 'vitest';
import { buildAqcdSnapshotComparisons } from '../../src/aqcd-snapshot-comparisons.js';
import { buildAqcdSnapshotComparisons as buildAqcdSnapshotComparisonsFromIndex } from '../../src/index.js';

function buildPayload() {
  return {
    window: 'story',
    windowRef: 'S050',
    metrics: {
      autonomy: { A1: 90, A2: 88, A3: 85, A4: 89 },
      qualityTech: { Q1: 86, Q2: 84, Q3: 82, Q4: 80, Q5: 88 },
      costEfficiency: { C1: 74, C2: 77, C3: 79, C4: 73 },
      design: { D1: 90, D2: 89, D3: 87, D4: 86, D5: 88, D6: 85 }
    },
    metricSources: {
      autonomy: {
        A1: 'telemetry://autonomy/A1',
        A2: 'telemetry://autonomy/A2',
        A3: 'telemetry://autonomy/A3',
        A4: 'telemetry://autonomy/A4'
      },
      qualityTech: {
        Q1: 'telemetry://quality/Q1',
        Q2: 'telemetry://quality/Q2',
        Q3: 'telemetry://quality/Q3',
        Q4: 'telemetry://quality/Q4',
        Q5: 'telemetry://quality/Q5'
      },
      costEfficiency: {
        C1: 'telemetry://cost/C1',
        C2: 'telemetry://cost/C2',
        C3: 'telemetry://cost/C3',
        C4: 'telemetry://cost/C4'
      },
      design: {
        D1: 'telemetry://design/D1',
        D2: 'telemetry://design/D2',
        D3: 'telemetry://design/D3',
        D4: 'telemetry://design/D4',
        D5: 'telemetry://design/D5',
        D6: 'telemetry://design/D6'
      }
    },
    snapshots: [
      {
        id: 'AQCD-S048-W1',
        window: 'story',
        windowRef: 'S048-W1',
        updatedAt: '2026-03-01T00:00:00.000Z',
        scores: {
          autonomy: 74,
          qualityTech: 72,
          costEfficiency: 70,
          designExcellence: 78,
          global: 73.6
        }
      },
      {
        id: 'AQCD-S049-W1',
        window: 'story',
        windowRef: 'S049-W1',
        updatedAt: '2026-03-02T00:00:00.000Z',
        scores: {
          autonomy: 78,
          qualityTech: 75,
          costEfficiency: 71,
          designExcellence: 81,
          global: 76.55
        }
      },
      {
        id: 'AQCD-S050-W1',
        window: 'story',
        windowRef: 'S050-W1',
        updatedAt: '2026-03-03T00:00:00.000Z',
        scores: {
          autonomy: 80,
          qualityTech: 77,
          costEfficiency: 73,
          designExcellence: 83,
          global: 78.45
        }
      }
    ],
    latencySamplesMs: [1200, 1400, 1700, 1900]
  };
}

describe('aqcd-snapshot-comparisons unit', () => {
  it('builds periodic AQCD comparisons with visible readiness factors (S050 FR-046/FR-047)', () => {
    const result = buildAqcdSnapshotComparisons(buildPayload(), {
      nowMs: () => Date.parse('2026-03-03T01:00:00.000Z'),
      cadenceHours: 24
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.snapshots.comparisons).toHaveLength(2);
    expect(result.snapshots.continuity.continuous).toBe(true);
    expect(result.diagnostics.metricsContinuous).toBe(true);
    expect(result.readiness).toMatchObject({
      model: 'AQCD_READINESS_RULES',
      rulesVersion: 'S050-v1'
    });
    expect(result.readiness.factors).toHaveLength(4);
    expect(result.readiness.factors[0].rule).toBe('BASELINE_THRESHOLD');
    expect(result.scorecard.windowRef).toBe('S050');
  });

  it('fails when comparative snapshots are missing', () => {
    const payload = buildPayload();
    payload.snapshots = payload.snapshots.slice(0, 1);

    const result = buildAqcdSnapshotComparisons(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_COMPARATIVE_SNAPSHOTS_REQUIRED');
    expect(result.correctiveActions).toContain('ADD_AQCD_PERIODIC_SNAPSHOTS');
  });

  it('fails when periodic continuity is broken beyond allowed gap (NFR-034)', () => {
    const payload = buildPayload();
    payload.snapshots[2].updatedAt = '2026-03-08T00:00:00.000Z';

    const result = buildAqcdSnapshotComparisons(payload, {
      nowMs: () => Date.parse('2026-03-08T00:10:00.000Z'),
      cadenceHours: 24,
      continuityToleranceMultiplier: 1.5
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_SNAPSHOT_CONTINUITY_GAP');
    expect(result.correctiveActions).toContain('RESTORE_AQCD_SNAPSHOT_CADENCE');
  });

  it('is exported from index', () => {
    const result = buildAqcdSnapshotComparisonsFromIndex(buildPayload(), {
      nowMs: () => Date.parse('2026-03-03T01:00:00.000Z')
    });

    expect(result.reasonCode).toBe('OK');
  });
});
