import { describe, expect, it } from 'vitest';
import { buildAqcdMitigationClosureLinks } from '../../src/aqcd-mitigation-closure-links.js';

function buildPayload() {
  return {
    window: 'story',
    windowRef: 'S054',
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
        exposure: 64,
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

describe('aqcd-mitigation-closure-links edge', () => {
  it('rejects malformed top-level payload', () => {
    const result = buildAqcdMitigationClosureLinks('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_AQCD_MITIGATION_LINK_INPUT');
  });

  it('rejects missing mitigation task/proof links', () => {
    const payload = buildPayload();
    payload.riskRegister[0].mitigations = [];

    const result = buildAqcdMitigationClosureLinks(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_MITIGATION_LINKS_REQUIRED');
  });

  it('rejects invalid heatmap series payload', () => {
    const payload = buildPayload();
    payload.heatmapSeries[1].points[0].probability = 101;

    const result = buildAqcdMitigationClosureLinks(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_HEATMAP_SERIES_INVALID');
  });

  it('rejects non-continuous heatmap cadence', () => {
    const payload = buildPayload();
    payload.heatmapSeries[1].at = '2026-03-10T00:00:00.000Z';

    const result = buildAqcdMitigationClosureLinks(payload, {
      mitigationLinkRules: {
        heatmapMaxGapHours: 24
      }
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_HEATMAP_METRICS_NOT_CONTINUOUS');
  });
});
