import { describe, expect, it } from 'vitest';
import { versionGatePolicy } from '../../src/gate-policy-versioning.js';
import {
  createGateConcernsAction,
  simulateGateVerdictBeforeSubmission,
  versionGatePolicy as versionGatePolicyFromIndex
} from '../../src/index.js';

const REASON_CODES = new Set([
  'OK',
  'INVALID_PHASE',
  'TRANSITION_NOT_ALLOWED',
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED',
  'PHASE_PREREQUISITES_MISSING',
  'PHASE_PREREQUISITES_INCOMPLETE',
  'INVALID_PHASE_PREREQUISITES',
  'OVERRIDE_NOT_ELIGIBLE',
  'OVERRIDE_REQUEST_MISSING',
  'OVERRIDE_JUSTIFICATION_REQUIRED',
  'OVERRIDE_APPROVER_REQUIRED',
  'OVERRIDE_APPROVER_CONFLICT',
  'DEPENDENCY_STATE_STALE',
  'INVALID_PHASE_DEPENDENCY_INPUT',
  'PHASE_SEQUENCE_GAP_DETECTED',
  'PHASE_SEQUENCE_REGRESSION_DETECTED',
  'REPEATED_BLOCKING_ANOMALY',
  'INVALID_PHASE_PROGRESSION_INPUT',
  'INVALID_GOVERNANCE_DECISION_INPUT',
  'GATE_STATUS_INCOMPLETE',
  'G4_SUBGATE_MISMATCH',
  'INVALID_GATE_CENTER_INPUT',
  'G4_SUBGATES_UNSYNC',
  'G4_DUAL_EVALUATION_FAILED',
  'INVALID_G4_DUAL_INPUT',
  'GATE_VERDICT_CONCERNS',
  'EVIDENCE_CHAIN_INCOMPLETE',
  'INVALID_GATE_VERDICT_INPUT',
  'DONE_TRANSITION_BLOCKED',
  'INVALID_DONE_TRANSITION_INPUT',
  'CONCERNS_ACTION_ASSIGNMENT_INVALID',
  'INVALID_PRIMARY_EVIDENCE_INPUT',
  'GATE_POLICY_VERSION_MISSING',
  'CONCERNS_ACTION_HISTORY_INCOMPLETE',
  'INVALID_CONCERNS_ACTION_INPUT',
  'POLICY_VERSION_NOT_ACTIVE',
  'GATE_POLICY_HISTORY_INCOMPLETE',
  'INVALID_GATE_POLICY_INPUT',
  'INVALID_GATE_SIMULATION_INPUT'
]);

function concernsActionResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Action CONCERNS créée automatiquement avec policy snapshot et historique.',
    diagnostics: {
      verdict: 'CONCERNS',
      concernsActionRequired: true,
      actionCreated: true,
      durationMs: 6,
      p95ActionMs: 2,
      sourceReasonCode: 'GATE_VERDICT_CONCERNS',
      policyVersion: '1.2.0'
    },
    concernsAction: {
      actionCreated: true,
      actionId: 'act-001',
      gateId: 'G4-UX',
      storyId: 'S030',
      assignee: 'qa-owner',
      dueAt: '2026-03-03T10:00:00.000Z',
      status: 'OPEN'
    },
    policySnapshot: {
      policyScope: 'gate',
      version: '1.2.0'
    },
    historyEntry: {
      actionId: 'act-001',
      policyVersion: '1.2.0',
      changedAt: '2026-02-24T05:20:00.000Z',
      changedBy: 'dev-bot',
      changeType: 'CREATE'
    },
    correctiveActions: ['TRACK_CONCERNS_ACTION'],
    ...overrides
  };
}

function primaryEvidenceResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Preuve primaire valide: décision de gate conforme.',
    diagnostics: {
      verdict: 'CONCERNS',
      canMarkDone: false,
      evidenceCount: 1,
      concernsActionRequired: true,
      durationMs: 5,
      p95ValidationMs: 1,
      sourceReasonCode: 'GATE_VERDICT_CONCERNS'
    },
    primaryEvidence: {
      required: true,
      valid: true,
      count: 1,
      minRequired: 1,
      refs: ['proof-1']
    },
    concernsAction: {
      required: true,
      valid: true,
      assignee: 'qa-owner',
      dueAt: '2026-03-03T10:00:00.000Z',
      status: 'OPEN'
    },
    correctiveActions: ['TRACK_CONCERNS_ACTION'],
    ...overrides
  };
}

function doneTransitionGuardResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Transition DONE autorisée: G4-T et G4-UX sont PASS avec chaîne de preuve complète.',
    diagnostics: {
      targetState: 'DONE',
      verdict: 'CONCERNS',
      canMarkDone: false,
      g4tStatus: 'PASS',
      g4uxStatus: 'CONCERNS',
      evidenceCount: 2,
      durationMs: 5,
      p95GuardMs: 1,
      sourceReasonCode: 'GATE_VERDICT_CONCERNS'
    },
    doneTransition: {
      targetState: 'DONE',
      blocked: true,
      blockingReasons: ['Verdict=CONCERNS.'],
      verdict: 'CONCERNS',
      g4SubGates: {
        g4tStatus: 'PASS',
        g4uxStatus: 'CONCERNS'
      }
    },
    correctiveActions: ['BLOCK_DONE_TRANSITION'],
    ...overrides
  };
}

describe('gate-policy-versioning unit', () => {
  it('validates active policy version and immutable history with simulation (AC-01/AC-02/AC-04)', () => {
    const result = versionGatePolicy(
      {
        concernsActionResult: concernsActionResult(),
        policyVersioning: {
          policyId: 'POLICY-G4-UX',
          policyScope: 'gate',
          activeVersion: '1.2.0',
          requestedVersion: '1.2.0',
          previousVersion: '1.1.5',
          gateId: 'G4-UX',
          isActive: true
        },
        simulationInput: {
          eligible: true,
          readOnly: true,
          additionalSignals: [{ signalId: 'dry-run', severity: 'PASS' }]
        },
        changedBy: 'dev-bot'
      },
      {
        nowMs: () => Date.parse('2026-02-24T05:30:00.000Z')
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        policyVersion: '1.2.0',
        historyEntryCount: 1,
        simulationEligible: true,
        simulatedVerdict: 'CONCERNS',
        sourceReasonCode: 'GATE_VERDICT_CONCERNS'
      },
      policyVersioning: {
        policyId: 'POLICY-G4-UX',
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: '1.1.5',
        nextVersion: '1.2.0',
        isActive: true,
        historyEntry: {
          policyId: 'POLICY-G4-UX',
          previousVersion: '1.1.5',
          nextVersion: '1.2.0',
          changedAt: '2026-02-24T05:30:00.000Z',
          changedBy: 'dev-bot',
          changeType: 'CREATE'
        }
      },
      simulation: {
        eligible: true,
        simulatedVerdict: 'CONCERNS',
        nonMutative: true
      }
    });
  });

  it('fails when active policy version is missing/invalid (AC-01)', () => {
    const result = versionGatePolicy({
      concernsActionResult: concernsActionResult(),
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: 'invalid-semver',
        requestedVersion: 'invalid-semver'
      }
    });

    expect(result.reasonCode).toBe('GATE_POLICY_VERSION_MISSING');
    expect(result.allowed).toBe(false);
    expect(result.correctiveActions).toContain('LINK_GATE_POLICY_VERSION');
  });

  it('fails on stale/inactive requested policy version (AC-03)', () => {
    const result = versionGatePolicy({
      concernsActionResult: concernsActionResult(),
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.1.0',
        previousVersion: '1.1.0',
        isActive: true
      }
    });

    expect(result.reasonCode).toBe('POLICY_VERSION_NOT_ACTIVE');
    expect(result.allowed).toBe(false);
    expect(result.correctiveActions).toContain('SYNC_ACTIVE_POLICY_VERSION');
  });

  it('fails on incomplete policy history entry (AC-02)', () => {
    const result = versionGatePolicy({
      concernsActionResult: concernsActionResult(),
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: '1.1.5'
      },
      historyEntry: {
        changeType: 'REMOVE'
      }
    });

    expect(result.reasonCode).toBe('GATE_POLICY_HISTORY_INCOMPLETE');
    expect(result.allowed).toBe(false);
    expect(result.correctiveActions).toContain('COMPLETE_POLICY_HISTORY_ENTRY');
  });

  it('fails when simulation input is invalid (AC-05)', () => {
    const result = versionGatePolicy({
      concernsActionResult: concernsActionResult(),
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: '1.1.5'
      },
      simulationInput: {
        eligible: false
      }
    });

    expect(result.reasonCode).toBe('INVALID_GATE_SIMULATION_INPUT');
    expect(result.allowed).toBe(false);
    expect(result.diagnostics.simulationEligible).toBe(false);
  });

  it('resolves source strictly: concernsActionResult has priority over concernsActionInput (AC-06)', () => {
    const result = versionGatePolicy({
      concernsActionResult: concernsActionResult(),
      concernsActionInput: {},
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: '1.1.5'
      }
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.allowed).toBe(true);
    expect(result.diagnostics.policyVersion).toBe('1.2.0');
  });

  it('delegates to S030 when concernsActionResult is absent (AC-06)', () => {
    const delegatedConcerns = createGateConcernsAction(
      {
        primaryEvidenceResult: primaryEvidenceResult(),
        concernsAction: {
          assignee: 'qa-owner',
          dueAt: '2026-03-03T10:00:00.000Z',
          gateId: 'G4-UX',
          storyId: 'S030'
        },
        policySnapshot: {
          policyScope: 'gate',
          version: '1.2.0'
        },
        changedBy: 'dev-bot'
      },
      {
        actionIdGenerator: () => 'act-001',
        nowMs: () => Date.parse('2026-02-24T05:20:00.000Z')
      }
    );

    const result = versionGatePolicy(
      {
        concernsActionInput: {
          primaryEvidenceResult: primaryEvidenceResult(),
          concernsAction: {
            assignee: 'qa-owner',
            dueAt: '2026-03-03T10:00:00.000Z',
            gateId: 'G4-UX',
            storyId: 'S030'
          },
          policySnapshot: {
            policyScope: 'gate',
            version: '1.2.0'
          },
          changedBy: 'dev-bot'
        },
        policyVersioning: {
          policyScope: 'gate',
          activeVersion: '1.2.0',
          requestedVersion: '1.2.0',
          previousVersion: '1.1.5'
        }
      },
      {
        concernsActionOptions: {
          actionIdGenerator: () => 'act-001',
          nowMs: () => Date.parse('2026-02-24T05:20:00.000Z')
        },
        nowMs: () => Date.parse('2026-02-24T05:30:00.000Z')
      }
    );

    expect(delegatedConcerns.reasonCode).toBe('OK');
    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        policyVersion: '1.2.0',
        simulationEligible: true,
        simulatedVerdict: 'CONCERNS',
        sourceReasonCode: 'GATE_VERDICT_CONCERNS'
      }
    });
  });

  it('propagates strict upstream blocking reason codes (AC-07)', () => {
    const result = versionGatePolicy({
      concernsActionResult: {
        allowed: false,
        reasonCode: 'EVIDENCE_CHAIN_INCOMPLETE',
        reason: 'Chaîne de preuve primaire incomplète.',
        diagnostics: {
          verdict: null,
          concernsActionRequired: false,
          actionCreated: false,
          sourceReasonCode: 'EVIDENCE_CHAIN_INCOMPLETE'
        },
        correctiveActions: ['LINK_PRIMARY_EVIDENCE']
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'EVIDENCE_CHAIN_INCOMPLETE',
      diagnostics: {
        sourceReasonCode: 'EVIDENCE_CHAIN_INCOMPLETE'
      },
      correctiveActions: ['LINK_PRIMARY_EVIDENCE']
    });
  });

  it('keeps stable contract and index export compatibility (AC-08)', () => {
    const result = versionGatePolicyFromIndex({
      concernsActionResult: concernsActionResult(),
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: '1.1.5'
      }
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('policyVersioning');
    expect(result).toHaveProperty('simulation');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(Array.isArray(result.correctiveActions)).toBe(true);

    expect(result.diagnostics).toHaveProperty('policyVersion');
    expect(result.diagnostics).toHaveProperty('historyEntryCount');
    expect(result.diagnostics).toHaveProperty('simulationEligible');
    expect(result.diagnostics).toHaveProperty('simulatedVerdict');
    expect(result.diagnostics).toHaveProperty('durationMs');
    expect(result.diagnostics).toHaveProperty('p95SimulationMs');
    expect(result.diagnostics).toHaveProperty('sourceReasonCode');
  });

  it('meets performance threshold and baseline precision on synthetic stream of 500 simulations (AC-09/AC-10)', () => {
    const durations = [];
    const p95Samples = [];
    const expected = [];
    const observed = [];

    const baselineDataset = [
      {
        verdict: 'PASS',
        simulationInput: { additionalSignals: [] },
        expectedVerdict: 'PASS'
      },
      {
        verdict: 'PASS',
        simulationInput: { additionalSignals: [{ signalId: 'ux', severity: 'CONCERNS' }] },
        expectedVerdict: 'CONCERNS'
      },
      {
        verdict: 'PASS',
        simulationInput: { additionalSignals: [{ signalId: 'risk', severity: 'FAIL' }] },
        expectedVerdict: 'FAIL'
      },
      {
        verdict: 'CONCERNS',
        simulationInput: { additionalSignals: [{ signalId: 'risk', severity: 'PASS' }] },
        expectedVerdict: 'CONCERNS'
      },
      {
        verdict: 'CONCERNS',
        simulationInput: { forcedVerdict: 'PASS' },
        expectedVerdict: 'PASS'
      },
      {
        verdict: 'CONCERNS',
        simulationInput: {
          forcedVerdict: 'PASS',
          additionalSignals: [{ signalId: 'quality', severity: 'FAIL' }]
        },
        expectedVerdict: 'FAIL'
      },
      {
        verdict: 'FAIL',
        simulationInput: { additionalSignals: [] },
        expectedVerdict: 'FAIL'
      },
      {
        verdict: 'FAIL',
        simulationInput: { forcedVerdict: 'PASS' },
        expectedVerdict: 'PASS'
      },
      {
        verdict: 'PASS',
        simulationInput: {
          forcedVerdict: 'CONCERNS',
          additionalSignals: [{ signalId: 'add', severity: 'PASS' }]
        },
        expectedVerdict: 'CONCERNS'
      }
    ];

    for (let index = 0; index < 500; index += 1) {
      const startedAt = Date.now();
      const scenario = baselineDataset[index % baselineDataset.length];

      const result = versionGatePolicy({
        concernsActionResult: concernsActionResult({
          diagnostics: {
            ...concernsActionResult().diagnostics,
            verdict: scenario.verdict,
            sourceReasonCode: scenario.verdict === 'PASS' ? 'OK' : 'GATE_VERDICT_CONCERNS'
          }
        }),
        policyVersioning: {
          policyScope: 'gate',
          activeVersion: '1.2.0',
          requestedVersion: '1.2.0',
          previousVersion: '1.1.5'
        },
        simulationInput: {
          eligible: true,
          readOnly: true,
          ...scenario.simulationInput
        }
      });

      durations.push(Date.now() - startedAt);
      p95Samples.push(result.diagnostics.p95SimulationMs);
      expected.push(scenario.expectedVerdict);
      observed.push(result.diagnostics.simulatedVerdict);

      expect(result.allowed).toBe(true);
      expect(result.diagnostics.durationMs).toBeLessThanOrEqual(2000);
    }

    durations.sort((left, right) => left - right);
    p95Samples.sort((left, right) => left - right);

    const p95Duration = durations[Math.ceil(durations.length * 0.95) - 1] ?? 0;
    const p95Internal = p95Samples[Math.ceil(p95Samples.length * 0.95) - 1] ?? 0;

    expect(p95Duration).toBeLessThanOrEqual(2000);
    expect(p95Internal).toBeLessThanOrEqual(2000);

    let correct = 0;

    for (let index = 0; index < expected.length; index += 1) {
      if (expected[index] === observed[index]) {
        correct += 1;
      }
    }

    const accuracy = expected.length === 0 ? 0 : (correct / expected.length) * 100;

    expect(accuracy).toBeGreaterThanOrEqual(65);
  });

  it('exposes simulation helper from index and validates non-mutative simulation contract', () => {
    const simulation = simulateGateVerdictBeforeSubmission({
      baseVerdict: 'PASS',
      simulationInput: {
        eligible: true,
        readOnly: true,
        forcedVerdict: 'CONCERNS'
      }
    });

    expect(simulation.reasonCode).toBe('OK');
    expect(simulation.simulation.nonMutative).toBe(true);
    expect(simulation.simulation.simulatedVerdict).toBe('CONCERNS');
  });
});
