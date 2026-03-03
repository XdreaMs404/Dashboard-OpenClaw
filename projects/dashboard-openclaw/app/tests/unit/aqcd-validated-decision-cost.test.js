import { describe, expect, it } from 'vitest';
import { buildAqcdValidatedDecisionCost } from '../../src/aqcd-validated-decision-cost.js';
import { buildAqcdValidatedDecisionCost as buildFromIndex } from '../../src/index.js';

function buildPayload() {
  return {
    window: 'story',
    windowRef: 'S056',
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
        probability: 0.62,
        impact: 0.71,
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
      { decisionId: 'DEC-101', validated: true, cost: 1.9 },
      { decisionId: 'DEC-102', status: 'REVIEW', cost: 2.8 }
    ],
    phaseWasteSeries: [
      { phase: 'analysis', wasteRatioPct: 18.5, tokenWaste: 320, tokenTotal: 1720 },
      { phase: 'planning', wasteRatioPct: 21.4, tokenWaste: 410, tokenTotal: 1916 },
      { phase: 'implementation', wasteRatioPct: 24.1, tokenWaste: 980, tokenTotal: 4066 }
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

describe('aqcd-validated-decision-cost unit', () => {
  it('computes average cost per validated decision and tracks phase waste ratios with alert policy (S056/FR-052/FR-053)', () => {
    const result = buildAqcdValidatedDecisionCost(buildPayload());

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.validatedDecisionCost).toMatchObject({
      validatedCount: 2,
      totalCount: 3,
      averageCostPerValidatedDecision: 2.05
    });
    expect(result.phaseWasteRatios).toMatchObject({
      entries: expect.any(Array),
      meanWasteRatioPct: 21.33
    });
    expect(result.wasteAlerts).toMatchObject({
      hasDrift: false,
      driftCount: 0
    });
    expect(result.diagnostics).toMatchObject({
      windowRef: 'S056',
      averageCostPerValidatedDecision: 2.05,
      decisionLatencyBudgetMet: true
    });
  });

  it('fails when phase waste ratios are missing (FR-053 anti-bypass)', () => {
    const payload = buildPayload();
    payload.phaseWasteSeries = [];

    const result = buildAqcdValidatedDecisionCost(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_PHASE_WASTE_RATIO_REQUIRED');
  });

  it('fails when drift is detected without alerting configuration', () => {
    const payload = buildPayload();
    payload.phaseWasteSeries[2].wasteRatioPct = 41;
    payload.wasteAlerting = {
      enabled: false,
      channels: []
    };

    const result = buildAqcdValidatedDecisionCost(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_WASTE_RATIO_ALERT_REQUIRED');
    expect(result.correctiveActions).toContain('CONFIGURE_WASTE_RATIO_ALERTING');
  });

  it('fails when p95 latency exceeds NFR-009 budget', () => {
    const payload = buildPayload();
    payload.decisionLatencySamplesMs = [1200, 2100, 2800, 3200, 3500];

    const result = buildAqcdValidatedDecisionCost(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_DECISION_LATENCY_BUDGET_EXCEEDED');
    expect(result.diagnostics.p95DecisionMs).toBe(3500);
  });

  it('is exported from index', () => {
    const result = buildFromIndex(buildPayload());

    expect(result.reasonCode).toBe('OK');
  });
});
