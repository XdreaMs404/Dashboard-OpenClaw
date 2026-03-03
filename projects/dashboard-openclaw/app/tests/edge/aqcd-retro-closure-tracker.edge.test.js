import { describe, expect, it } from 'vitest';
import { buildAqcdRetroClosureTracking } from '../../src/aqcd-retro-closure-tracker.js';

function buildPayload() {
  return {
    window: 'story',
    windowRef: 'S058',
    metrics: {
      autonomy: { A1: 90, A2: 88, A3: 85, A4: 89 },
      qualityTech: { Q1: 86, Q2: 84, Q3: 82, Q4: 80, Q5: 88 },
      costEfficiency: { C1: 74, C2: 77, C3: 79, C4: 73 },
      design: { D1: 90, D2: 89, D3: 87, D4: 86, D5: 88, D6: 85 }
    },
    metricSources: {
      autonomy: { A1: 's://A1', A2: 's://A2', A3: 's://A3', A4: 's://A4' },
      qualityTech: { Q1: 's://Q1', Q2: 's://Q2', Q3: 's://Q3', Q4: 's://Q4', Q5: 's://Q5' },
      costEfficiency: { C1: 's://C1', C2: 's://C2', C3: 's://C3', C4: 's://C4' },
      design: { D1: 's://D1', D2: 's://D2', D3: 's://D3', D4: 's://D4', D5: 's://D5', D6: 's://D6' }
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
      }
    ],
    gateActions: [
      {
        gate: 'G5',
        actionId: 'ACTION_G5_RETRO_TRACKING',
        action: 'Suivre fermeture H21/H22/H23 avec preuves vérifiées.',
        owner: 'PM',
        evidenceRef: 'proof://handoff/S058'
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
          { taskId: 'TASK-P05-001', owner: 'SM', status: 'IN_PROGRESS', dueAt: '2099-04-12T00:00:00.000Z', proofRef: 'proof://mitigation/P05/001' }
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
          { taskId: 'TASK-C01-001', owner: 'FinOps', status: 'DONE', dueAt: '2099-04-10T00:00:00.000Z', proofRef: 'proof://mitigation/C01/001' }
        ]
      }
    ],
    heatmapSeries: [
      {
        id: 'HEATMAP-S057',
        at: '2026-03-10T00:00:00.000Z',
        points: [
          { riskId: 'P05', probability: 0.62, impact: 0.71 },
          { riskId: 'C01', probability: 0.48, impact: 0.44 }
        ]
      },
      {
        id: 'HEATMAP-S058',
        at: '2026-03-11T00:00:00.000Z',
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
      { phase: 'planning', wasteRatioPct: 21.4, tokenWaste: 410, tokenTotal: 1916 },
      { phase: 'implementation', wasteRatioPct: 24.1, tokenWaste: 980, tokenTotal: 4066 }
    ],
    wasteAlerting: {
      enabled: true,
      channels: ['ops-console'],
      notificationRef: 'ops://alerts/S058'
    },
    runbookRef: 'runbook://aqcd-priority-v1',
    runbookValidated: true,
    criticalRunbookRef: 'runbook://aqcd-cost-critical-v1',
    criticalRunbookValidated: true,
    criticalRunbookTestedAt: '2026-03-11T09:00:00.000Z',
    decisionLatencySamplesMs: [900, 1100, 1400, 1800, 2100],
    readinessV1Threshold: 0,
    baselineThreshold: 0,
    retroActions: [
      {
        phase: 'H21',
        actionId: 'RETRO-H21-001',
        owner: 'SM',
        status: 'DONE',
        closureEvidenceRef: 'proof://retro/H21/001',
        updatedAt: '2026-03-11T09:46:00.000Z'
      },
      {
        phase: 'H22',
        actionId: 'RETRO-H22-001',
        owner: 'PM',
        status: 'CLOSED',
        closureEvidenceRef: 'proof://retro/H22/001',
        updatedAt: '2026-03-11T09:51:00.000Z'
      },
      {
        phase: 'H23',
        actionId: 'RETRO-H23-001',
        owner: 'Jarvis',
        status: 'VERIFIED',
        closureEvidenceRef: 'proof://retro/H23/001',
        updatedAt: '2026-03-11T09:56:00.000Z'
      }
    ]
  };
}

describe('aqcd-retro-closure-tracker edge', () => {
  it('rejects malformed payload', () => {
    const result = buildAqcdRetroClosureTracking('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_AQCD_RETRO_CLOSURE_INPUT');
  });

  it('rejects invalid retro phase', () => {
    const payload = buildPayload();
    payload.retroActions[0].phase = 'H24';

    const result = buildAqcdRetroClosureTracking(payload, {
      nowMs: Date.parse('2026-03-11T12:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_RETRO_ACTION_PHASE_INVALID');
  });

  it('rejects pending retro closure', () => {
    const payload = buildPayload();
    payload.retroActions[1].status = 'IN_PROGRESS';

    const result = buildAqcdRetroClosureTracking(payload, {
      nowMs: Date.parse('2026-03-11T12:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_RETRO_CLOSURE_PENDING');
  });

  it('rejects stale retro metrics cadence', () => {
    const payload = buildPayload();

    const result = buildAqcdRetroClosureTracking(payload, {
      nowMs: Date.parse('2026-03-14T12:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_RETRO_METRICS_NOT_CONTINUOUS');
  });
});
