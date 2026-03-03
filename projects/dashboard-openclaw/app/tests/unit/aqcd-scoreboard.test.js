import { describe, expect, it } from 'vitest';
import { buildAqcdExplainableScoreboard } from '../../src/aqcd-scoreboard.js';
import { buildAqcdExplainableScoreboard as buildAqcdExplainableScoreboardFromIndex } from '../../src/index.js';

function buildNominalPayload() {
  return {
    window: 'story',
    windowRef: 'S049',
    metrics: {
      autonomy: { A1: 92, A2: 88, A3: 84, A4: 90 },
      qualityTech: { Q1: 86, Q2: 82, Q3: 79, Q4: 88, Q5: 91 },
      costEfficiency: { C1: 74, C2: 76, C3: 80, C4: 72 },
      design: { D1: 90, D2: 87, D3: 85, D4: 83, D5: 88, D6: 84 }
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
        id: 'AQCD-S048',
        window: 'story',
        windowRef: 'S048',
        updatedAt: '2026-03-03T04:00:00.000Z',
        scores: {
          autonomy: 78,
          qualityTech: 74,
          costEfficiency: 70,
          designExcellence: 80,
          global: 75.8
        }
      },
      {
        id: 'AQCD-S048-R2',
        window: 'story',
        windowRef: 'S048-R2',
        updatedAt: '2026-03-03T04:30:00.000Z',
        scores: {
          autonomy: 80,
          qualityTech: 76,
          costEfficiency: 72,
          designExcellence: 82,
          global: 77.6
        }
      }
    ],
    latencySamplesMs: [1200, 1600, 1900, 2100]
  };
}

describe('aqcd-scoreboard unit', () => {
  it('builds an explainable AQCD scorecard with formulas, sources and trend snapshots (S049/FR-045/FR-046)', () => {
    const result = buildAqcdExplainableScoreboard(buildNominalPayload());

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.scorecard).toMatchObject({
      model: 'AQCD',
      window: 'story',
      windowRef: 'S049'
    });
    expect(result.formula.scoreWeights).toMatchObject({
      qualityTech: 0.3,
      designExcellence: 0.25,
      autonomy: 0.25,
      costEfficiency: 0.2
    });
    expect(result.formula.dimensions.autonomy.terms).toHaveLength(4);
    expect(result.formula.dimensions.qualityTech.terms[0].source).toContain('telemetry://quality/');
    expect(result.snapshots.series).toHaveLength(2);
    expect(result.snapshots.trend.previousGlobal).toBe(77.6);
    expect(result.diagnostics.baselineMet).toBe(true);
    expect(result.diagnostics.latencyBudgetMet).toBe(true);
  });

  it('fails closed when a formula source is missing for one metric (S049)', () => {
    const payload = buildNominalPayload();
    delete payload.metricSources.qualityTech.Q3;

    const result = buildAqcdExplainableScoreboard(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_FORMULA_SOURCE_MISSING');
    expect(result.correctiveActions).toContain('LINK_AQCD_SOURCE_REFERENCES');
  });

  it('fails when readiness baseline threshold is not met (NFR-018)', () => {
    const payload = buildNominalPayload();
    payload.metrics.autonomy = { A1: 20, A2: 20, A3: 20, A4: 20 };
    payload.metrics.qualityTech = { Q1: 20, Q2: 20, Q3: 20, Q4: 20, Q5: 20 };
    payload.metrics.costEfficiency = { C1: 20, C2: 20, C3: 20, C4: 20 };
    payload.metrics.design = { D1: 20, D2: 20, D3: 20, D4: 20, D5: 20, D6: 20 };

    const result = buildAqcdExplainableScoreboard(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_BASELINE_BELOW_TARGET');
    expect(result.correctiveActions).toContain('IMPROVE_AQCD_READINESS_SCORE');
  });

  it('is exported from index', () => {
    const result = buildAqcdExplainableScoreboardFromIndex(buildNominalPayload());
    expect(result.reasonCode).toBe('OK');
  });
});
