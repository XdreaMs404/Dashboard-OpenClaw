import { describe, expect, it } from 'vitest';
import { buildAqcdSponsorExecutiveView } from '../../src/aqcd-sponsor-executive-view.js';

function buildPayload() {
  return {
    window: 'story',
    windowRef: 'S059',
    metrics: {
      autonomy: { A1: 91, A2: 89, A3: 86, A4: 90 },
      qualityTech: { Q1: 87, Q2: 85, Q3: 83, Q4: 82, Q5: 89 },
      costEfficiency: { C1: 76, C2: 79, C3: 80, C4: 75 },
      design: { D1: 91, D2: 90, D3: 88, D4: 87, D5: 89, D6: 86 }
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
        id: 'AQCD-S057-W1',
        windowRef: 'S057-W1',
        updatedAt: '2026-03-10T00:00:00.000Z',
        scores: { autonomy: 86, qualityTech: 83, costEfficiency: 78, designExcellence: 89, global: 84 }
      },
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
      }
    ],
    gateActions: [
      {
        gate: 'G5',
        actionId: 'ACTION_G5_SPONSOR_VIEW',
        action: 'Consolider une vue exécutive sponsor lisible avec preuves AQCD.',
        owner: 'PM',
        evidenceRef: '_bmad-output/implementation-artifacts/handoffs/S059-dev-to-tea.md',
        priorityScore: 95
      }
    ],
    riskRegister: [
      {
        id: 'M02',
        gate: 'G5',
        owner: 'PM',
        status: 'OPEN',
        dueAt: '2099-04-25T00:00:00.000Z',
        probability: 0.6,
        impact: 0.7,
        mitigations: [
          {
            taskId: 'TASK-M02-001',
            owner: 'PM',
            status: 'IN_PROGRESS',
            dueAt: '2099-04-22T00:00:00.000Z',
            proofRef: 'proof://mitigation/M02/001'
          }
        ]
      },
      {
        id: 'M08',
        gate: 'G4',
        owner: 'UX',
        status: 'MITIGATED',
        dueAt: '2099-04-26T00:00:00.000Z',
        exposure: 42,
        mitigations: [
          {
            taskId: 'TASK-M08-001',
            owner: 'UX',
            status: 'DONE',
            dueAt: '2099-04-21T00:00:00.000Z',
            proofRef: 'proof://mitigation/M08/001'
          }
        ]
      }
    ],
    heatmapSeries: [
      {
        id: 'HEATMAP-S058',
        at: '2026-03-11T00:00:00.000Z',
        points: [
          { riskId: 'M02', probability: 0.6, impact: 0.7 },
          { riskId: 'M08', probability: 0.42, impact: 0.42 }
        ]
      },
      {
        id: 'HEATMAP-S059',
        at: '2026-03-12T00:00:00.000Z',
        points: [
          { riskId: 'M02', probability: 0.55, impact: 0.63 },
          { riskId: 'M08', probability: 0.34, impact: 0.36 }
        ]
      }
    ],
    decisionCostSeries: [
      { decisionId: 'DEC-110', status: 'VALIDATED', cost: 2.4 },
      { decisionId: 'DEC-111', validated: true, cost: 2.0 },
      { decisionId: 'DEC-112', status: 'REVIEW', cost: 2.9 }
    ],
    phaseWasteSeries: [
      { phase: 'analysis', wasteRatioPct: 18.1, tokenWaste: 300, tokenTotal: 1660 },
      { phase: 'planning', wasteRatioPct: 20.6, tokenWaste: 390, tokenTotal: 1890 },
      { phase: 'implementation', wasteRatioPct: 23.5, tokenWaste: 940, tokenTotal: 4000 }
    ],
    wasteAlerting: {
      enabled: true,
      channels: ['ops-console'],
      notificationRef: 'ops://alerts/S059'
    },
    runbookRef: 'runbook://aqcd-priority-v1',
    runbookValidated: true,
    criticalRunbookRef: 'runbook://aqcd-critical-sponsor-v1',
    criticalRunbookValidated: true,
    criticalRunbookTestedAt: '2026-03-12T09:00:00.000Z',
    decisionLatencySamplesMs: [800, 1000, 1300, 1500, 2000],
    baselineThreshold: 0,
    readinessV1Threshold: 0,
    retroActions: [
      {
        phase: 'H21',
        actionId: 'RETRO-H21-010',
        owner: 'SM',
        status: 'DONE',
        closureEvidenceRef: 'proof://retro/H21/010',
        updatedAt: '2026-03-12T09:40:00.000Z'
      },
      {
        phase: 'H22',
        actionId: 'RETRO-H22-010',
        owner: 'PM',
        status: 'CLOSED',
        closureEvidenceRef: 'proof://retro/H22/010',
        updatedAt: '2026-03-12T09:45:00.000Z'
      },
      {
        phase: 'H23',
        actionId: 'RETRO-H23-010',
        owner: 'Jarvis',
        status: 'VERIFIED',
        closureEvidenceRef: 'proof://retro/H23/010',
        updatedAt: '2026-03-12T09:50:00.000Z'
      }
    ]
  };
}

describe('aqcd-sponsor-executive-view edge', () => {
  it('rejects malformed payload', () => {
    const result = buildAqcdSponsorExecutiveView('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_AQCD_SPONSOR_VIEW_INPUT');
  });

  it('rejects missing formula sources required for FR-045 transparency', () => {
    const payload = buildPayload();
    delete payload.metricSources.autonomy.A1;

    const result = buildAqcdSponsorExecutiveView(payload, {
      nowMs: Date.parse('2026-03-12T12:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_FORMULA_SOURCE_MISSING');
  });

  it('rejects sponsor view when snapshot history is too short for FR-046 trend analysis', () => {
    const payload = buildPayload();
    payload.snapshots = payload.snapshots.slice(1);

    const result = buildAqcdSponsorExecutiveView(payload, {
      nowMs: Date.parse('2026-03-12T12:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_SPONSOR_SNAPSHOT_HISTORY_REQUIRED');
  });

  it('rejects discontinuous sponsor snapshots even when retro metrics remain continuous', () => {
    const payload = buildPayload();
    payload.snapshots[2].updatedAt = '2026-03-20T00:00:00.000Z';

    for (const action of payload.retroActions) {
      action.updatedAt = '2026-03-20T00:30:00.000Z';
    }

    const result = buildAqcdSponsorExecutiveView(payload, {
      nowMs: Date.parse('2026-03-20T01:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_SNAPSHOT_CONTINUITY_GAP');
    expect(result.correctiveActions).toContain('RESTORE_AQCD_SNAPSHOT_CADENCE');
  });
});
