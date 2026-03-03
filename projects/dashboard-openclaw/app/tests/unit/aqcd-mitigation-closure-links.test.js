import { describe, expect, it } from 'vitest';
import { buildAqcdMitigationClosureLinks } from '../../src/aqcd-mitigation-closure-links.js';
import { buildAqcdMitigationClosureLinks as buildFromIndex } from '../../src/index.js';

function buildPayload() {
  return {
    window: 'story',
    windowRef: 'S054',
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
        id: 'AQCD-S053-W1',
        windowRef: 'S053-W1',
        updatedAt: '2026-03-06T00:00:00.000Z',
        scores: {
          autonomy: 82,
          qualityTech: 79,
          costEfficiency: 74,
          designExcellence: 85,
          global: 80.15
        }
      },
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
      }
    ],
    gateActions: [
      {
        gate: 'G4',
        actionId: 'ACTION_G4_MITIGATION_CLOSURE_PROOF',
        action: 'Associer la mitigation à une preuve de fermeture horodatée.',
        owner: 'PM',
        evidenceRef: '_bmad-output/implementation-artifacts/handoffs/S054-dev-to-tea.md',
        priorityScore: 93
      }
    ],
    riskRegister: [
      {
        id: 'C02',
        gate: 'G5',
        owner: 'TechLead',
        status: 'OPEN',
        dueAt: '2099-03-12T00:00:00.000Z',
        probability: 0.72,
        impact: 0.89,
        description: 'Surcoût stockage ledger/projections',
        mitigations: [
          {
            taskId: 'TASK-C02-001',
            owner: 'TechLead',
            status: 'IN_PROGRESS',
            dueAt: '2099-03-10T00:00:00.000Z',
            proofRef: 'proof://mitigation/C02/001'
          }
        ]
      },
      {
        id: 'M02',
        gate: 'G4',
        owner: 'PM',
        status: 'MITIGATED',
        dueAt: '2099-03-18T00:00:00.000Z',
        exposure: 50,
        description: 'ROI TCD non démontré',
        mitigations: [
          {
            taskId: 'TASK-M02-001',
            owner: 'PM',
            status: 'DONE',
            dueAt: '2099-03-08T00:00:00.000Z',
            proofRef: 'proof://mitigation/M02/001'
          }
        ]
      }
    ],
    heatmapSeries: [
      {
        id: 'HEATMAP-S053',
        at: '2026-03-06T00:00:00.000Z',
        points: [
          { riskId: 'C02', probability: 0.72, impact: 0.89 },
          { riskId: 'M02', probability: 0.48, impact: 0.52 }
        ]
      },
      {
        id: 'HEATMAP-S054',
        at: '2026-03-07T00:00:00.000Z',
        points: [
          { riskId: 'C02', probability: 0.66, impact: 0.82 },
          { riskId: 'M02', probability: 0.36, impact: 0.43 }
        ]
      }
    ],
    runbookRef: 'runbook://aqcd-priority-v1',
    runbookValidated: true,
    decisionLatencySamplesMs: [850, 1050, 1320, 1640, 1980]
  };
}

describe('aqcd-mitigation-closure-links unit', () => {
  it('validates mitigation->task->proof closure links and heatmap evolution (S054/FR-050/FR-051)', () => {
    const result = buildAqcdMitigationClosureLinks(buildPayload());

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.reason).toContain('Liens mitigation→task→preuve validés');
    expect(result.mitigationClosureLinks).toMatchObject({
      total: 2,
      linked: 2,
      coveragePct: 100,
      closedTotal: 1,
      closedWithProof: 1
    });
    expect(result.heatmap).toMatchObject({
      cadence: {
        continuous: true
      }
    });
    expect(result.diagnostics).toMatchObject({
      windowRef: 'S054',
      metricsContinuous: true,
      heatmapEvolutionCount: 1
    });
  });

  it('fails when no closed mitigation has proof of closure', () => {
    const payload = buildPayload();
    payload.riskRegister[1].status = 'OPEN';
    payload.riskRegister[1].mitigations[0].status = 'IN_PROGRESS';

    const result = buildAqcdMitigationClosureLinks(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_MITIGATION_CLOSURE_PROOF_REQUIRED');
    expect(result.correctiveActions).toContain('ATTACH_CLOSURE_PROOF_TO_MITIGATION');
  });

  it('fails when heatmap evolution snapshots are missing', () => {
    const payload = buildPayload();
    payload.heatmapSeries = payload.heatmapSeries.slice(0, 1);

    const result = buildAqcdMitigationClosureLinks(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_HEATMAP_EVOLUTION_REQUIRED');
  });

  it('is exported from index', () => {
    const result = buildFromIndex(buildPayload());

    expect(result.reasonCode).toBe('OK');
  });
});
