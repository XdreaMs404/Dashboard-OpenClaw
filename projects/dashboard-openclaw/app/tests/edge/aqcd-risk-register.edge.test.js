import { describe, expect, it } from 'vitest';
import { buildAqcdRiskRegister } from '../../src/aqcd-risk-register.js';

function buildPayload() {
  return {
    window: 'story',
    windowRef: 'S053',
    metrics: {
      autonomy: { A1: 88, A2: 84, A3: 82, A4: 86 },
      qualityTech: { Q1: 85, Q2: 83, Q3: 81, Q4: 79, Q5: 87 },
      costEfficiency: { C1: 72, C2: 74, C3: 76, C4: 70 },
      design: { D1: 86, D2: 88, D3: 84, D4: 82, D5: 85, D6: 83 }
    },
    metricSources: {
      'autonomy.A1': 'telemetry://autonomy/A1',
      'autonomy.A2': 'telemetry://autonomy/A2',
      'autonomy.A3': 'telemetry://autonomy/A3',
      'autonomy.A4': 'telemetry://autonomy/A4',
      'qualityTech.Q1': 'telemetry://quality/Q1',
      'qualityTech.Q2': 'telemetry://quality/Q2',
      'qualityTech.Q3': 'telemetry://quality/Q3',
      'qualityTech.Q4': 'telemetry://quality/Q4',
      'qualityTech.Q5': 'telemetry://quality/Q5',
      'costEfficiency.C1': 'telemetry://cost/C1',
      'costEfficiency.C2': 'telemetry://cost/C2',
      'costEfficiency.C3': 'telemetry://cost/C3',
      'costEfficiency.C4': 'telemetry://cost/C4',
      'design.D1': 'telemetry://design/D1',
      'design.D2': 'telemetry://design/D2',
      'design.D3': 'telemetry://design/D3',
      'design.D4': 'telemetry://design/D4',
      'design.D5': 'telemetry://design/D5',
      'design.D6': 'telemetry://design/D6'
    },
    snapshots: [
      {
        id: 'AQCD-S052-W1',
        windowRef: 'S052-W1',
        updatedAt: '2026-03-05T00:00:00.000Z',
        scores: {
          autonomy: 84,
          qualityTech: 81,
          costEfficiency: 75,
          designExcellence: 86,
          global: 81.95
        }
      },
      {
        id: 'AQCD-S053-W1',
        windowRef: 'S053-W1',
        updatedAt: '2026-03-06T00:00:00.000Z',
        scores: {
          autonomy: 85,
          qualityTech: 82,
          costEfficiency: 76,
          designExcellence: 87,
          global: 82.95
        }
      }
    ],
    gateActions: [
      {
        gate: 'G4',
        actionId: 'ACTION_G4_LIMIT_STORAGE_DRIFT',
        action: 'Limiter la dérive de stockage projections.',
        owner: 'PM',
        evidenceRef: '_bmad-output/implementation-artifacts/stories/S053.md',
        priorityScore: 80
      }
    ],
    riskRegister: [
      {
        id: 'RISK-C02',
        gate: 'G4',
        owner: 'PM',
        status: 'OPEN',
        dueAt: '2026-03-10T12:00:00.000Z',
        exposure: 82,
        mitigations: [
          {
            taskId: 'TASK-MIT-100',
            owner: 'PM',
            status: 'OPEN',
            dueAt: '2026-03-09T12:00:00.000Z',
            proofRef: '_bmad-output/implementation-artifacts/handoffs/S053-dev-to-tea.md'
          }
        ]
      }
    ],
    runbookRef: 'runbook://aqcd-priority-v1',
    runbookValidated: true
  };
}

describe('aqcd-risk-register edge', () => {
  it('rejects malformed top-level payload', () => {
    const result = buildAqcdRiskRegister('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_AQCD_RISK_REGISTER_INPUT');
  });

  it('rejects malformed risk register entry fields', () => {
    const payload = buildPayload();
    payload.riskRegister[0].owner = '';

    const result = buildAqcdRiskRegister(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_RISK_REGISTER_INVALID');
  });

  it('rejects empty risk register', () => {
    const payload = buildPayload();
    payload.riskRegister = [];

    const result = buildAqcdRiskRegister(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_RISK_REGISTER_EMPTY');
  });

  it('propagates runbook requirement from S052 dependency', () => {
    const payload = buildPayload();
    payload.runbookValidated = false;

    const result = buildAqcdRiskRegister(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_RUNBOOK_EVIDENCE_REQUIRED');
  });
});
