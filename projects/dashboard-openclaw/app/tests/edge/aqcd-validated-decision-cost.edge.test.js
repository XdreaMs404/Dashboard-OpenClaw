import { describe, expect, it } from 'vitest';
import { buildAqcdValidatedDecisionCost } from '../../src/aqcd-validated-decision-cost.js';

function buildPayload() {
  return {
    window: 'story',
    windowRef: 'S056',
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
        id: 'AQCD-S055-W1',
        windowRef: 'S055-W1',
        updatedAt: '2026-03-08T00:00:00.000Z',
        scores: {
          autonomy: 85,
          qualityTech: 82,
          costEfficiency: 77,
          designExcellence: 88,
          global: 83
        }
      },
      {
        id: 'AQCD-S056-W1',
        windowRef: 'S056-W1',
        updatedAt: '2026-03-09T00:00:00.000Z',
        scores: {
          autonomy: 86,
          qualityTech: 83,
          costEfficiency: 78,
          designExcellence: 89,
          global: 84
        }
      }
    ],
    gateActions: [
      {
        gate: 'G4',
        actionId: 'ACTION_G4_COST_DECISION_CONTROL',
        action: 'Surveiller coût moyen décision validée.',
        owner: 'FinOps',
        evidenceRef: '_bmad-output/implementation-artifacts/handoffs/S056-dev-to-tea.md',
        priorityScore: 93
      }
    ],
    riskRegister: [
      {
        id: 'P05',
        gate: 'G5',
        owner: 'SM',
        status: 'OPEN',
        dueAt: '2099-04-15T00:00:00.000Z',
        exposure: 44,
        mitigations: [
          {
            taskId: 'TASK-P05-001',
            owner: 'SM',
            status: 'IN_PROGRESS',
            dueAt: '2099-04-12T00:00:00.000Z',
            proofRef: 'proof://mitigation/P05/001'
          }
        ]
      },
      {
        id: 'C01',
        gate: 'G4',
        owner: 'FinOps',
        status: 'MITIGATED',
        dueAt: '2099-04-18T00:00:00.000Z',
        exposure: 44,
        mitigations: [
          {
            taskId: 'TASK-C01-001',
            owner: 'FinOps',
            status: 'DONE',
            dueAt: '2099-04-10T00:00:00.000Z',
            proofRef: 'proof://mitigation/C01/001'
          }
        ]
      }
    ],
    heatmapSeries: [
      {
        id: 'HEATMAP-S055',
        at: '2026-03-08T00:00:00.000Z',
        points: [
          { riskId: 'P05', probability: 0.62, impact: 0.71 },
          { riskId: 'C01', probability: 0.48, impact: 0.44 }
        ]
      },
      {
        id: 'HEATMAP-S056',
        at: '2026-03-09T00:00:00.000Z',
        points: [
          { riskId: 'P05', probability: 0.55, impact: 0.64 },
          { riskId: 'C01', probability: 0.38, impact: 0.36 }
        ]
      }
    ],
    decisionCostSeries: [
      { decisionId: 'DEC-100', status: 'VALIDATED', cost: 2.2 },
      { decisionId: 'DEC-101', validated: true, cost: 1.9 }
    ],
    phaseWasteSeries: [
      { phase: 'analysis', wasteRatioPct: 18.5, tokenWaste: 320, tokenTotal: 1720 },
      { phase: 'planning', wasteRatioPct: 21.4, tokenWaste: 410, tokenTotal: 1916 }
    ],
    wasteAlerting: {
      enabled: true,
      channels: ['ops-console'],
      notificationRef: 'ops://alerts/S056'
    },
    runbookRef: 'runbook://aqcd-priority-v1',
    runbookValidated: true,
    criticalRunbookRef: 'runbook://aqcd-cost-critical-v1',
    criticalRunbookValidated: true,
    criticalRunbookTestedAt: '2026-03-09T09:00:00.000Z',
    decisionLatencySamplesMs: [900, 1100, 1400, 1800, 2100]
  };
}

describe('aqcd-validated-decision-cost edge', () => {
  it('rejects malformed top-level payload', () => {
    const result = buildAqcdValidatedDecisionCost('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_AQCD_VALIDATED_DECISION_COST_INPUT');
  });

  it('rejects invalid phase waste ratio entry', () => {
    const payload = buildPayload();
    payload.phaseWasteSeries[0].wasteRatioPct = 1000;

    const result = buildAqcdValidatedDecisionCost(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_PHASE_WASTE_RATIO_INVALID');
  });

  it('propagates validated decision cost guard from S055 dependency', () => {
    const payload = buildPayload();
    payload.decisionCostSeries = [
      { decisionId: 'DEC-100', status: 'DRAFT', cost: 2.2 },
      { decisionId: 'DEC-101', status: 'REVIEW', cost: 1.9 }
    ];

    const result = buildAqcdValidatedDecisionCost(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_VALIDATED_DECISION_COST_REQUIRED');
  });

  it('rejects drift alerts without notificationRef when required', () => {
    const payload = buildPayload();
    payload.phaseWasteSeries[1].wasteRatioPct = 48;
    payload.wasteAlerting = {
      enabled: true,
      channels: ['ops-console'],
      notificationRef: ''
    };

    const result = buildAqcdValidatedDecisionCost(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_WASTE_RATIO_ALERT_REQUIRED');
  });
});
