import { describe, expect, it } from 'vitest';
import { buildAqcdRiskHeatmap } from '../../src/aqcd-risk-heatmap.js';
import { buildAqcdRiskHeatmap as buildFromIndex } from '../../src/index.js';

function buildPayload() {
  return {
    window: 'story',
    windowRef: 'S055',
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
        probability: 0.68,
        impact: 0.8,
        description: 'Lisibilité AQCD insuffisante pour sponsor',
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
        description: 'Actions de mitigation non fermées',
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
      { decisionId: 'DEC-002', validated: true, cost: 1.8 },
      { decisionId: 'DEC-003', status: 'REVIEW', cost: 3.1 }
    ],
    runbookRef: 'runbook://aqcd-priority-v1',
    runbookValidated: true,
    criticalRunbookRef: 'runbook://aqcd-heatmap-critical-v1',
    criticalRunbookValidated: true,
    criticalRunbookTestedAt: '2026-03-08T09:00:00.000Z',
    decisionLatencySamplesMs: [850, 1050, 1320, 1640, 1980]
  };
}

describe('aqcd-risk-heatmap unit', () => {
  it('validates heatmap evolution and computes average cost per validated decision (S055/FR-051/FR-052)', () => {
    const result = buildAqcdRiskHeatmap(buildPayload());

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.reason).toContain('Heatmap probabilité/impact');
    expect(result.heatmapDashboard).toMatchObject({
      snapshotWindow: {
        from: 'HEATMAP-S054',
        to: 'HEATMAP-S055'
      }
    });
    expect(result.validatedDecisionCost).toMatchObject({
      validatedCount: 2,
      totalCount: 3,
      averageCostPerValidatedDecision: 2.1
    });
    expect(result.diagnostics).toMatchObject({
      windowRef: 'S055',
      metricsContinuous: true,
      validatedDecisionCount: 2,
      averageCostPerValidatedDecision: 2.1,
      criticalRunbookReady: true
    });
  });

  it('fails when no validated decision exists for FR-052 anti-bypass guard', () => {
    const payload = buildPayload();
    payload.decisionCostSeries = [
      { decisionId: 'DEC-001', status: 'DRAFT', cost: 2.4 },
      { decisionId: 'DEC-002', status: 'REVIEW', cost: 1.8 }
    ];

    const result = buildAqcdRiskHeatmap(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_VALIDATED_DECISION_COST_REQUIRED');
    expect(result.correctiveActions).toContain('ADD_VALIDATED_DECISION_COST_LOGS');
  });

  it('fails when critical runbook proof is missing or untested', () => {
    const payload = buildPayload();
    payload.criticalRunbookValidated = false;

    const result = buildAqcdRiskHeatmap(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_CRITICAL_RUNBOOK_REQUIRED');
    expect(result.correctiveActions).toContain('PROVIDE_CRITICAL_RUNBOOK_PROOF');
  });

  it('is exported from index', () => {
    const result = buildFromIndex(buildPayload());

    expect(result.reasonCode).toBe('OK');
  });
});
