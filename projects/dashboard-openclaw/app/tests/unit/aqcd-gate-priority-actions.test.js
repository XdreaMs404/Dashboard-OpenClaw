import { describe, expect, it } from 'vitest';
import { buildAqcdGatePriorityActions } from '../../src/aqcd-gate-priority-actions.js';
import { buildAqcdGatePriorityActions as buildAqcdGatePriorityActionsFromIndex } from '../../src/index.js';

function buildPayload() {
  return {
    window: 'story',
    windowRef: 'S052',
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
        id: 'AQCD-S049-W1',
        windowRef: 'S049-W1',
        updatedAt: '2026-03-02T00:00:00.000Z',
        scores: {
          autonomy: 78,
          qualityTech: 75,
          costEfficiency: 71,
          designExcellence: 81,
          global: 76.55
        }
      },
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
        evidenceRef:
          '_bmad-output/implementation-artifacts/handoffs/S052-dev-to-tea.md',
        priorityScore: 95
      },
      {
        gate: 'G4',
        actionId: 'ACTION_G4_RBAC_REVIEW',
        action: 'Revue RBAC sur les étapes critiques du gate G4',
        owner: 'Security',
        evidenceRef: '_bmad-output/implementation-artifacts/ux-audits/S052-ux-audit.json',
        priorityScore: 88
      },
      {
        gate: 'G4',
        actionId: 'ACTION_G4_EVIDENCE_LINKING',
        action: 'Vérifier le chainage preuve -> owner -> gate',
        owner: 'QA',
        evidenceRef:
          '_bmad-output/implementation-artifacts/handoffs/S052-dev-to-uxqa.md',
        priorityScore: 81
      },
      {
        gate: 'G4',
        actionId: 'ACTION_G4_DOC_REFRESH',
        action: 'Mettre à jour la documentation de priorisation',
        owner: 'PM',
        evidenceRef: '_bmad-output/implementation-artifacts/stories/S052.md',
        priorityScore: 70
      },
      {
        gate: 'G5',
        actionId: 'ACTION_G5_RISK_TRIAGE',
        action: 'Triage hebdomadaire des risques exposition > 60',
        owner: 'SM',
        evidenceRef: '_bmad-output/implementation-artifacts/story-runtimes/S052-runtime.md',
        priorityScore: 92
      },
      {
        gate: 'G5',
        actionId: 'ACTION_G5_MITIGATION_TRACKING',
        action: 'Tracer les mitigations à échéance dans le registre',
        owner: 'TechLead',
        evidenceRef:
          '_bmad-output/implementation-artifacts/handoffs/S052-dev-to-tea.md',
        priorityScore: 84
      }
    ],
    riskRegister: [
      {
        id: 'C01',
        gate: 'G4',
        owner: 'FinOps',
        status: 'OPEN',
        dueAt: '2099-03-09T00:00:00.000Z',
        exposure: 93,
        evidenceRef: 'risk://C01',
        description: 'Explosion des coûts token'
      },
      {
        id: 'C02',
        gate: 'G5',
        owner: 'TechLead',
        status: 'OPEN',
        dueAt: '2099-03-12T00:00:00.000Z',
        probability: 0.72,
        impact: 0.89,
        evidenceRef: 'risk://C02',
        description: 'Surcoût stockage ledger/projections'
      },
      {
        id: 'M02',
        gate: 'G5',
        owner: 'PM',
        status: 'MITIGATED',
        dueAt: '2099-03-18T00:00:00.000Z',
        exposure: 50,
        evidenceRef: 'risk://M02',
        description: 'ROI TCD non démontré'
      }
    ],
    runbookRef: 'runbook://aqcd-priority-v1',
    runbookValidated: true,
    decisionLatencySamplesMs: [900, 1100, 1400, 1700, 1900]
  };
}

describe('aqcd-gate-priority-actions unit', () => {
  it('builds top 3 priority actions per gate with owner/proof and risk registry summary (S052/FR-048/FR-049)', () => {
    const result = buildAqcdGatePriorityActions(buildPayload(), {
      nowMs: Date.parse('2026-03-04T01:00:00.000Z')
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.diagnostics).toMatchObject({
      windowRef: 'S052',
      actionCountPerGate: 3,
      runbookRef: 'runbook://aqcd-priority-v1',
      decisionLatencyBudgetMet: true
    });

    expect(result.gateActions.length).toBeGreaterThan(0);

    for (const gate of result.gateActions) {
      expect(gate.actions.length).toBeLessThanOrEqual(3);
      expect(gate.actions.every((action) => action.owner && action.evidenceRef)).toBe(true);
    }

    expect(result.riskRegistry).toMatchObject({
      highestExposure: 93,
      counts: {
        open: 2,
        mitigated: 1,
        closed: 0
      }
    });
  });

  it('rejects when runbook evidence is not validated (NFR-035)', () => {
    const payload = buildPayload();
    payload.runbookValidated = false;

    const result = buildAqcdGatePriorityActions(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_RUNBOOK_EVIDENCE_REQUIRED');
    expect(result.correctiveActions).toContain('PROVIDE_RUNBOOK_EVIDENCE');
  });

  it('rejects invalid risk register entries missing owner/status/dueAt/exposure (FR-049 abuse case)', () => {
    const payload = buildPayload();
    payload.riskRegister = [
      {
        id: 'C01',
        gate: 'G4',
        status: 'OPEN',
        dueAt: '2099-03-09T00:00:00.000Z',
        exposure: 93
      }
    ];

    const result = buildAqcdGatePriorityActions(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_RISK_REGISTER_INVALID');
    expect(result.reason).toContain('owner requis');
  });

  it('fails when p95 decision latency exceeds the budget (NFR-009)', () => {
    const payload = buildPayload();
    payload.decisionLatencySamplesMs = [800, 1200, 1800, 2600, 3200];

    const result = buildAqcdGatePriorityActions(payload);

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('AQCD_DECISION_LATENCY_BUDGET_EXCEEDED');
    expect(result.diagnostics.p95DecisionMs).toBe(3200);
    expect(result.diagnostics.decisionLatencyBudgetMet).toBe(false);
  });

  it('is exported from index', () => {
    const result = buildAqcdGatePriorityActionsFromIndex(buildPayload(), {
      nowMs: Date.parse('2026-03-04T01:00:00.000Z')
    });

    expect(result.reasonCode).toBe('OK');
  });
});
