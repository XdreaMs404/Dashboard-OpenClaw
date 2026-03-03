import { describe, expect, it } from 'vitest';
import { buildAqcdRiskRegister } from '../../src/aqcd-risk-register.js';
import { buildAqcdRiskRegister as buildAqcdRiskRegisterFromIndex } from '../../src/index.js';

function buildPayload() {
  return {
    window: 'story',
    windowRef: 'S053',
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
        id: 'AQCD-S050-W1',
        windowRef: 'S050-W1',
        updatedAt: '2026-03-03T00:00:00.000Z',
        scores: {
          autonomy: 80,
          qualityTech: 77,
          costEfficiency: 73,
          designExcellence: 83,
          global: 78.45
        }
      },
      {
        id: 'AQCD-S051-W1',
        windowRef: 'S051-W1',
        updatedAt: '2026-03-04T00:00:00.000Z',
        scores: {
          autonomy: 82,
          qualityTech: 79,
          costEfficiency: 74,
          designExcellence: 85,
          global: 80.15
        }
      }
    ],
    gateActions: [
      {
        gate: 'G4',
        actionId: 'ACTION_G4_COST_GUARD',
        action: 'Activer un budget guardrail token sur G4',
        owner: 'FinOps',
        evidenceRef: '_bmad-output/implementation-artifacts/handoffs/S053-dev-to-tea.md',
        priorityScore: 95
      },
      {
        gate: 'G5',
        actionId: 'ACTION_G5_RISK_TRIAGE',
        action: 'Triage hebdomadaire des risques exposition > 60',
        owner: 'SM',
        evidenceRef: '_bmad-output/implementation-artifacts/handoffs/S053-dev-to-uxqa.md',
        priorityScore: 92
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
    runbookRef: 'runbook://aqcd-priority-v1',
    runbookValidated: true,
    decisionLatencySamplesMs: [850, 1050, 1320, 1640, 1980]
  };
}

describe('aqcd-risk-register unit', () => {
  it('validates a living risk register with owner/due/status/exposure and linked mitigations (S053/FR-049/FR-050)', () => {
    const result = buildAqcdRiskRegister(buildPayload());

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.reason).toContain('Registre risques vivant validé');
    expect(result.diagnostics).toMatchObject({
      windowRef: 'S053',
      baselineMet: true,
      decisionLatencyBudgetMet: true
    });
    expect(result.riskRegister).toMatchObject({
      counts: {
        open: 1,
        mitigated: 1,
        closed: 0
      }
    });
    expect(result.mitigationLinks).toMatchObject({
      totalOpenRisks: 1,
      linkedOpenRisks: 1,
      missingLinkOpenRisks: 0,
      coveragePct: 100
    });
  });

  it('fails when open risks do not expose mitigation task/proof links (FR-050 abuse case)', () => {
    const payload = buildPayload();
    payload.riskRegister[0].mitigations = [];

    const result = buildAqcdRiskRegister(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_MITIGATION_LINKS_REQUIRED');
    expect(result.correctiveActions).toContain('LINK_MITIGATION_TASK_PROOF');
  });

  it('fails when baseline AQCD is below the configured threshold (NFR-018)', () => {
    const result = buildAqcdRiskRegister(buildPayload(), {
      riskRegisterRules: {
        baselineThreshold: 95
      }
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_BASELINE_THRESHOLD_UNMET');
    expect(result.diagnostics.baselineThreshold).toBe(95);
  });

  it('fails when risk-register p95 latency exceeds budget (NFR-009)', () => {
    const payload = buildPayload();
    payload.decisionLatencySamplesMs = [1400, 1900, 2200, 2900, 3300];

    const result = buildAqcdRiskRegister(payload, {
      priorityRules: {
        decisionLatencyBudgetMs: 4000
      },
      riskRegisterRules: {
        decisionLatencyBudgetMs: 2500
      }
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_RISK_REGISTER_LATENCY_BUDGET_EXCEEDED');
    expect(result.diagnostics.p95DecisionMs).toBe(3300);
    expect(result.diagnostics.decisionLatencyBudgetMet).toBe(false);
  });

  it('is exported from index', () => {
    const result = buildAqcdRiskRegisterFromIndex(buildPayload());

    expect(result.reasonCode).toBe('OK');
  });
});
