import { describe, expect, it } from 'vitest';
import { buildAqcdRiskHeatmap } from '../../src/aqcd-risk-heatmap.js';

function buildPayload() {
  return {
    window: 'story',
    windowRef: 'S055',
    metrics: {
      autonomy: { A1: 88, A2: 84, A3: 82, A4: 86 },
      qualityTech: { Q1: 85, Q2: 83, Q3: 81, Q4: 79, Q5: 87 },
      costEfficiency: { C1: 72, C2: 74, C3: 76, C4: 70 },
      design: { D1: 86, D2: 88, D3: 84, D4: 82, D5: 85, D6: 83 }
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
        id: 'AQCD-S054-W1',
        windowRef: 'S054-W1',
        updatedAt: '2026-03-07T00:00:00.000Z',
        scores: {
          autonomy: 84,
          qualityTech: 81,
          costEfficiency: 76,
          designExcellence: 87,
          global: 82.05
        }
      },
      {
        id: 'AQCD-S055-W1',
        windowRef: 'S055-W1',
        updatedAt: '2026-03-08T00:00:00.000Z',
        scores: {
          autonomy: 85,
          qualityTech: 82,
          costEfficiency: 77,
          designExcellence: 88,
          global: 83.0
        }
      }
    ],
    gateActions: [
      {
        gate: 'G4',
        actionId: 'ACTION_G4_HEATMAP_VISIBILITY',
        action: 'Publier heatmap probabilité/impact et évolution quotidienne.',
        owner: 'PM',
        evidenceRef: '_bmad-output/implementation-artifacts/handoffs/S055-dev-to-tea.md',
        priorityScore: 94
      }
    ],
    riskRegister: [
      {
        id: 'M08',
        gate: 'G4',
        owner: 'UXLead',
        status: 'OPEN',
        dueAt: '2099-04-05T00:00:00.000Z',
        exposure: 54.4,
        mitigations: [
          {
            taskId: 'TASK-M08-001',
            owner: 'UXLead',
            status: 'IN_PROGRESS',
            dueAt: '2099-04-03T00:00:00.000Z',
            proofRef: 'proof://mitigation/M08/001'
          }
        ]
      },
      {
        id: 'P05',
        gate: 'G5',
        owner: 'SM',
        status: 'MITIGATED',
        dueAt: '2099-04-08T00:00:00.000Z',
        exposure: 45,
        mitigations: [
          {
            taskId: 'TASK-P05-001',
            owner: 'SM',
            status: 'DONE',
            dueAt: '2099-04-04T00:00:00.000Z',
            proofRef: 'proof://mitigation/P05/001'
          }
        ]
      }
    ],
    heatmapSeries: [
      {
        id: 'HEATMAP-S054',
        at: '2026-03-07T00:00:00.000Z',
        points: [
          { riskId: 'M08', probability: 0.68, impact: 0.8 },
          { riskId: 'P05', probability: 0.45, impact: 0.52 }
        ]
      },
      {
        id: 'HEATMAP-S055',
        at: '2026-03-08T00:00:00.000Z',
        points: [
          { riskId: 'M08', probability: 0.62, impact: 0.74 },
          { riskId: 'P05', probability: 0.35, impact: 0.4 }
        ]
      }
    ],
    decisionCostSeries: [
      { decisionId: 'DEC-001', status: 'VALIDATED', cost: 2.4 },
      { decisionId: 'DEC-002', validated: true, cost: 1.8 }
    ],
    runbookRef: 'runbook://aqcd-priority-v1',
    runbookValidated: true,
    criticalRunbookRef: 'runbook://aqcd-heatmap-critical-v1',
    criticalRunbookValidated: true,
    criticalRunbookTestedAt: '2026-03-08T09:00:00.000Z',
    decisionLatencySamplesMs: [850, 1050, 1320, 1640, 1980]
  };
}

describe('aqcd-risk-heatmap edge', () => {
  it('rejects malformed top-level payload', () => {
    const result = buildAqcdRiskHeatmap('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_AQCD_RISK_HEATMAP_INPUT');
  });

  it('rejects invalid decision cost entries', () => {
    const payload = buildPayload();
    payload.decisionCostSeries[0].cost = -1;

    const result = buildAqcdRiskHeatmap(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_VALIDATED_DECISION_COST_INVALID');
  });

  it('rejects missing heatmap evolution snapshots', () => {
    const payload = buildPayload();
    payload.heatmapSeries = payload.heatmapSeries.slice(0, 1);

    const result = buildAqcdRiskHeatmap(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_HEATMAP_EVOLUTION_REQUIRED');
  });

  it('rejects missing critical runbook fields', () => {
    const payload = buildPayload();
    payload.criticalRunbookTestedAt = '';

    const result = buildAqcdRiskHeatmap(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_CRITICAL_RUNBOOK_REQUIRED');
  });
});
