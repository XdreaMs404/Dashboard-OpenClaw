import { describe, expect, it } from 'vitest';
import { buildAqcdBaselineRoiInstrumentation } from '../../src/aqcd-baseline-roi-instrumentation.js';
import { buildAqcdBaselineRoiInstrumentation as buildFromIndex } from '../../src/index.js';

function buildPayload() {
  return {
    window: 'story',
    windowRef: 'S060',
    metrics: {
      autonomy: { A1: 92, A2: 90, A3: 87, A4: 91 },
      qualityTech: { Q1: 88, Q2: 86, Q3: 84, Q4: 83, Q5: 90 },
      costEfficiency: { C1: 77, C2: 80, C3: 81, C4: 76 },
      design: { D1: 92, D2: 91, D3: 89, D4: 88, D5: 90, D6: 87 }
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
        id: 'AQCD-S058-W1',
        windowRef: 'S058-W1',
        updatedAt: '2026-03-11T00:00:00.000Z',
        scores: { autonomy: 87, qualityTech: 84, costEfficiency: 79, designExcellence: 90, global: 85 }
      },
      {
        id: 'AQCD-S059-W1',
        windowRef: 'S059-W1',
        updatedAt: '2026-03-12T00:00:00.000Z',
        scores: { autonomy: 88, qualityTech: 85, costEfficiency: 80, designExcellence: 91, global: 86 }
      },
      {
        id: 'AQCD-S060-W1',
        windowRef: 'S060-W1',
        updatedAt: '2026-03-13T00:00:00.000Z',
        scores: { autonomy: 89, qualityTech: 86, costEfficiency: 81, designExcellence: 92, global: 87 }
      }
    ],
    gateActions: [
      {
        gate: 'G5',
        actionId: 'ACTION_G5_BASELINE_ROI',
        action: 'Instrumenter baseline TCD + ROI pour pilotage exécutif.',
        owner: 'PM',
        evidenceRef: '_bmad-output/implementation-artifacts/handoffs/S060-dev-to-tea.md',
        priorityScore: 96
      }
    ],
    riskRegister: [
      {
        id: 'P05',
        gate: 'G5',
        owner: 'SM',
        status: 'OPEN',
        dueAt: '2099-05-10T00:00:00.000Z',
        probability: 0.58,
        impact: 0.67,
        mitigations: [
          {
            taskId: 'TASK-P05-060',
            owner: 'SM',
            status: 'IN_PROGRESS',
            dueAt: '2099-05-08T00:00:00.000Z',
            proofRef: 'proof://mitigation/P05/060'
          }
        ]
      },
      {
        id: 'M08',
        gate: 'G4',
        owner: 'UX',
        status: 'MITIGATED',
        dueAt: '2099-05-12T00:00:00.000Z',
        exposure: 40,
        mitigations: [
          {
            taskId: 'TASK-M08-060',
            owner: 'UX',
            status: 'DONE',
            dueAt: '2099-05-09T00:00:00.000Z',
            proofRef: 'proof://mitigation/M08/060'
          }
        ]
      }
    ],
    heatmapSeries: [
      {
        id: 'HEATMAP-S059',
        at: '2026-03-12T00:00:00.000Z',
        points: [
          { riskId: 'P05', probability: 0.58, impact: 0.67 },
          { riskId: 'M08', probability: 0.4, impact: 0.4 }
        ]
      },
      {
        id: 'HEATMAP-S060',
        at: '2026-03-13T00:00:00.000Z',
        points: [
          { riskId: 'P05', probability: 0.52, impact: 0.61 },
          { riskId: 'M08', probability: 0.33, impact: 0.35 }
        ]
      }
    ],
    decisionCostSeries: [
      { decisionId: 'DEC-120', status: 'VALIDATED', cost: 2.3 },
      { decisionId: 'DEC-121', validated: true, cost: 2.1 },
      { decisionId: 'DEC-122', status: 'REVIEW', cost: 2.8 }
    ],
    phaseWasteSeries: [
      { phase: 'analysis', wasteRatioPct: 18.2, tokenWaste: 310, tokenTotal: 1700 },
      { phase: 'planning', wasteRatioPct: 20.5, tokenWaste: 385, tokenTotal: 1880 },
      { phase: 'implementation', wasteRatioPct: 23.4, tokenWaste: 930, tokenTotal: 3980 }
    ],
    wasteAlerting: {
      enabled: true,
      channels: ['ops-console'],
      notificationRef: 'ops://alerts/S060'
    },
    runbookRef: 'runbook://aqcd-priority-v1',
    runbookValidated: true,
    criticalRunbookRef: 'runbook://aqcd-critical-baseline-roi-v1',
    criticalRunbookValidated: true,
    criticalRunbookTestedAt: '2026-03-13T09:00:00.000Z',
    decisionLatencySamplesMs: [850, 1050, 1300, 1600, 2000],
    baselineThreshold: 0,
    readinessV1Threshold: 0,
    baselineCostPerDecision: 2.7,
    tcdBaselineDays: 22,
    tcdCurrentDays: 16,
    retroActions: [
      {
        phase: 'H21',
        actionId: 'RETRO-H21-060',
        owner: 'SM',
        status: 'DONE',
        closureEvidenceRef: 'proof://retro/H21/060',
        updatedAt: '2026-03-13T09:40:00.000Z'
      },
      {
        phase: 'H22',
        actionId: 'RETRO-H22-060',
        owner: 'PM',
        status: 'CLOSED',
        closureEvidenceRef: 'proof://retro/H22/060',
        updatedAt: '2026-03-13T09:45:00.000Z'
      },
      {
        phase: 'H23',
        actionId: 'RETRO-H23-060',
        owner: 'Jarvis',
        status: 'VERIFIED',
        closureEvidenceRef: 'proof://retro/H23/060',
        updatedAt: '2026-03-13T09:50:00.000Z'
      }
    ]
  };
}

describe('aqcd-baseline-roi-instrumentation unit', () => {
  it('builds baseline TCD + ROI instrumentation with visible readiness factors (S060/FR-046/FR-047)', () => {
    const result = buildAqcdBaselineRoiInstrumentation(buildPayload(), {
      nowMs: Date.parse('2026-03-13T12:00:00.000Z')
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.baselineRoiInstrumentation).toMatchObject({
      model: 'AQCD_BASELINE_ROI_INSTRUMENTATION',
      baselineWindowRef: 'S058-W1',
      currentWindowRef: 'S060-W1'
    });
    expect(result.baselineRoiInstrumentation.readinessFactors.length).toBeGreaterThan(0);
    expect(result.baselineRoiInstrumentation.summary.tcdImprovementPct).toBeGreaterThan(0);
    expect(result.baselineRoiInstrumentation.summary.riskAdjustedRoiPct).toBeLessThanOrEqual(
      result.baselineRoiInstrumentation.summary.projectedRoiPct
    );
  });

  it('fails when baseline snapshot history is below instrumentation minimum', () => {
    const payload = buildPayload();
    payload.snapshots = payload.snapshots.slice(1);

    const result = buildAqcdBaselineRoiInstrumentation(payload, {
      nowMs: Date.parse('2026-03-13T12:00:00.000Z'),
      sponsorExecutiveRules: { minimumSnapshotCount: 2 },
      minimumSnapshotCount: 3
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_BASELINE_ROI_SNAPSHOTS_REQUIRED');
  });

  it('fails when baseline ROI p95 latency exceeds NFR-009 budget', () => {
    const result = buildAqcdBaselineRoiInstrumentation(buildPayload(), {
      nowMs: Date.parse('2026-03-13T12:00:00.000Z'),
      baselineRoiLatencySamplesMs: [1200, 2100, 2800, 3200, 3500],
      decisionLatencyBudgetMs: 2500
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_BASELINE_ROI_LATENCY_BUDGET_EXCEEDED');
    expect(result.diagnostics.p95DecisionMs).toBe(3500);
  });

  it('is exported from index', () => {
    const result = buildFromIndex(buildPayload(), {
      nowMs: Date.parse('2026-03-13T12:00:00.000Z')
    });

    expect(result.reasonCode).toBe('OK');
  });
});
