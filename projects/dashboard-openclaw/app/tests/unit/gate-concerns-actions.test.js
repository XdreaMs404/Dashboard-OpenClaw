import { describe, expect, it } from 'vitest';
import { createGateConcernsAction } from '../../src/gate-concerns-actions.js';
import {
  createGateConcernsAction as createGateConcernsActionFromIndex,
  validatePrimaryGateEvidence
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
  'INVALID_CONCERNS_ACTION_INPUT'
]);

function primaryEvidenceResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Preuve primaire valide: décision de gate conforme.',
    diagnostics: {
      verdict: 'PASS',
      canMarkDone: true,
      evidenceCount: 1,
      concernsActionRequired: false,
      durationMs: 5,
      p95ValidationMs: 1,
      sourceReasonCode: 'OK'
    },
    primaryEvidence: {
      required: true,
      valid: true,
      count: 1,
      minRequired: 1,
      refs: ['proof-1']
    },
    concernsAction: {
      required: false,
      valid: true,
      assignee: null,
      dueAt: null,
      status: null
    },
    correctiveActions: [],
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
      verdict: 'PASS',
      canMarkDone: true,
      g4tStatus: 'PASS',
      g4uxStatus: 'PASS',
      evidenceCount: 2,
      durationMs: 5,
      p95GuardMs: 1,
      sourceReasonCode: 'OK'
    },
    doneTransition: {
      targetState: 'DONE',
      blocked: false,
      blockingReasons: [],
      verdict: 'PASS',
      g4SubGates: {
        g4tStatus: 'PASS',
        g4uxStatus: 'PASS'
      }
    },
    correctiveActions: [],
    ...overrides
  };
}

describe('gate-concerns-actions unit', () => {
  it('creates CONCERNS action automatically with assignment, due date, policy snapshot and history (AC-01/AC-04/AC-05)', () => {
    const result = createGateConcernsAction(
      {
        primaryEvidenceResult: primaryEvidenceResult({
          diagnostics: {
            ...primaryEvidenceResult().diagnostics,
            verdict: 'CONCERNS',
            canMarkDone: false,
            concernsActionRequired: true,
            sourceReasonCode: 'GATE_VERDICT_CONCERNS'
          },
          concernsAction: {
            required: true,
            valid: true,
            assignee: 'qa-owner',
            dueAt: '2026-03-03T10:00:00.000Z',
            status: 'OPEN'
          }
        }),
        concernsAction: {
          assignee: 'qa-owner',
          dueAt: '2026-03-03T10:00:00.000Z',
          gateId: 'G4-UX',
          storyId: 'S030'
        },
        policySnapshot: {
          policyScope: 'gate',
          version: 'gate-policy-v3'
        },
        changedBy: 'dev-bot'
      },
      {
        actionIdGenerator: () => 'act-001',
        nowMs: () => Date.parse('2026-02-24T04:12:00.000Z')
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        verdict: 'CONCERNS',
        concernsActionRequired: true,
        actionCreated: true,
        sourceReasonCode: 'GATE_VERDICT_CONCERNS',
        policyVersion: 'gate-policy-v3'
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
        version: 'gate-policy-v3'
      },
      historyEntry: {
        actionId: 'act-001',
        policyVersion: 'gate-policy-v3',
        changedAt: '2026-02-24T04:12:00.000Z',
        changedBy: 'dev-bot',
        changeType: 'CREATE'
      }
    });

    expect(result.correctiveActions).toContain('TRACK_CONCERNS_ACTION');
  });

  it('does not create CONCERNS action for PASS verdict (AC-02)', () => {
    const result = createGateConcernsAction({
      primaryEvidenceResult: primaryEvidenceResult(),
      policySnapshot: {
        policyScope: 'gate',
        version: 'gate-policy-v3'
      }
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        verdict: 'PASS',
        concernsActionRequired: false,
        actionCreated: false,
        policyVersion: null
      },
      concernsAction: {
        actionCreated: false,
        actionId: null
      },
      policySnapshot: {
        policyScope: null,
        version: null
      }
    });
  });

  it('fails on CONCERNS assignment invalid payload (AC-03)', () => {
    const result = createGateConcernsAction({
      primaryEvidenceResult: primaryEvidenceResult({
        diagnostics: {
          ...primaryEvidenceResult().diagnostics,
          verdict: 'CONCERNS',
          canMarkDone: false,
          concernsActionRequired: true
        },
        concernsAction: {
          required: true,
          valid: false,
          assignee: null,
          dueAt: null,
          status: null
        }
      }),
      concernsAction: {
        assignee: '  ',
        dueAt: null,
        status: 'OPEN'
      },
      policySnapshot: {
        policyScope: 'gate',
        version: 'gate-policy-v3'
      }
    });

    expect(result.reasonCode).toBe('CONCERNS_ACTION_ASSIGNMENT_INVALID');
    expect(result.allowed).toBe(false);
    expect(result.diagnostics.actionCreated).toBe(false);
    expect(result.correctiveActions).toContain('ASSIGN_CONCERNS_OWNER');
    expect(result.correctiveActions).toContain('SET_CONCERNS_DUE_DATE');
  });

  it('fails when policy snapshot is missing for CONCERNS (AC-04)', () => {
    const result = createGateConcernsAction({
      primaryEvidenceResult: primaryEvidenceResult({
        diagnostics: {
          ...primaryEvidenceResult().diagnostics,
          verdict: 'CONCERNS',
          canMarkDone: false,
          concernsActionRequired: true
        },
        concernsAction: {
          required: true,
          valid: true,
          assignee: 'qa-owner',
          dueAt: '2026-03-03T10:00:00.000Z',
          status: 'OPEN'
        }
      }),
      concernsAction: {
        assignee: 'qa-owner',
        dueAt: '2026-03-03T10:00:00.000Z',
        status: 'OPEN'
      },
      policySnapshot: {
        policyScope: 'gate',
        version: ' '
      }
    });

    expect(result.reasonCode).toBe('GATE_POLICY_VERSION_MISSING');
    expect(result.allowed).toBe(false);
    expect(result.correctiveActions).toContain('LINK_GATE_POLICY_VERSION');
  });

  it('fails when history entry is incomplete for CONCERNS action (AC-05)', () => {
    const result = createGateConcernsAction(
      {
        primaryEvidenceResult: primaryEvidenceResult({
          diagnostics: {
            ...primaryEvidenceResult().diagnostics,
            verdict: 'CONCERNS',
            canMarkDone: false,
            concernsActionRequired: true
          },
          concernsAction: {
            required: true,
            valid: true,
            assignee: 'qa-owner',
            dueAt: '2026-03-03T10:00:00.000Z',
            status: 'OPEN'
          }
        }),
        concernsAction: {
          assignee: 'qa-owner',
          dueAt: '2026-03-03T10:00:00.000Z',
          status: 'OPEN'
        },
        policySnapshot: {
          policyScope: 'gate',
          version: 'gate-policy-v3'
        },
        historyEntry: {
          changeType: 'INVALID'
        }
      },
      {
        actionIdGenerator: () => 'act-001',
        nowMs: () => Date.parse('2026-02-24T04:12:00.000Z')
      }
    );

    expect(result.reasonCode).toBe('CONCERNS_ACTION_HISTORY_INCOMPLETE');
    expect(result.allowed).toBe(false);
    expect(result.correctiveActions).toContain('COMPLETE_CONCERNS_ACTION_HISTORY');
  });

  it('resolves source strictly: primaryEvidenceResult has priority over primaryEvidenceInput (AC-06)', () => {
    const result = createGateConcernsAction({
      primaryEvidenceResult: primaryEvidenceResult(),
      primaryEvidenceInput: {},
      policySnapshot: {
        policyScope: 'gate',
        version: 'gate-policy-v3'
      }
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.allowed).toBe(true);
    expect(result.diagnostics.verdict).toBe('PASS');
  });

  it('delegates to S029 when primaryEvidenceResult is absent (AC-06)', () => {
    const delegatedPrimary = validatePrimaryGateEvidence({
      doneTransitionGuardResult: doneTransitionGuardResult({
        diagnostics: {
          ...doneTransitionGuardResult().diagnostics,
          verdict: 'CONCERNS',
          canMarkDone: false,
          sourceReasonCode: 'GATE_VERDICT_CONCERNS'
        },
        doneTransition: {
          ...doneTransitionGuardResult().doneTransition,
          verdict: 'CONCERNS'
        }
      }),
      primaryEvidenceRefs: ['proof-1'],
      concernsAction: {
        assignee: 'ux-owner',
        dueAt: '2026-03-01T10:00:00.000Z',
        status: 'OPEN'
      }
    });

    const result = createGateConcernsAction(
      {
        primaryEvidenceInput: {
          doneTransitionGuardResult: doneTransitionGuardResult({
            diagnostics: {
              ...doneTransitionGuardResult().diagnostics,
              verdict: 'CONCERNS',
              canMarkDone: false,
              sourceReasonCode: 'GATE_VERDICT_CONCERNS'
            },
            doneTransition: {
              ...doneTransitionGuardResult().doneTransition,
              verdict: 'CONCERNS'
            }
          }),
          primaryEvidenceRefs: ['proof-1'],
          concernsAction: {
            assignee: 'ux-owner',
            dueAt: '2026-03-01T10:00:00.000Z',
            status: 'OPEN'
          }
        },
        policySnapshot: {
          policyScope: 'gate',
          version: 'gate-policy-v3'
        },
        changedBy: 'dev-bot'
      },
      {
        actionIdGenerator: () => 'act-s029-seed',
        nowMs: () => Date.parse('2026-02-24T04:13:00.000Z')
      }
    );

    expect(delegatedPrimary.reasonCode).toBe('OK');
    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        verdict: 'CONCERNS',
        concernsActionRequired: true,
        actionCreated: true,
        policyVersion: 'gate-policy-v3',
        sourceReasonCode: 'GATE_VERDICT_CONCERNS'
      },
      concernsAction: {
        actionId: 'act-s029-seed',
        assignee: 'ux-owner',
        dueAt: '2026-03-01T10:00:00.000Z',
        status: 'OPEN'
      }
    });
  });

  it('propagates strict upstream blocking reason codes (AC-07)', () => {
    const result = createGateConcernsAction({
      primaryEvidenceResult: {
        allowed: false,
        reasonCode: 'EVIDENCE_CHAIN_INCOMPLETE',
        reason: 'Chaîne de preuve primaire incomplète.',
        diagnostics: {
          verdict: null,
          canMarkDone: false,
          evidenceCount: 0,
          concernsActionRequired: false,
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
    const result = createGateConcernsActionFromIndex({
      primaryEvidenceResult: primaryEvidenceResult(),
      policySnapshot: {
        policyScope: 'gate',
        version: 'gate-policy-v3'
      }
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('concernsAction');
    expect(result).toHaveProperty('policySnapshot');
    expect(result).toHaveProperty('historyEntry');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(Array.isArray(result.correctiveActions)).toBe(true);

    expect(result.diagnostics).toHaveProperty('verdict');
    expect(result.diagnostics).toHaveProperty('concernsActionRequired');
    expect(result.diagnostics).toHaveProperty('actionCreated');
    expect(result.diagnostics).toHaveProperty('durationMs');
    expect(result.diagnostics).toHaveProperty('p95ActionMs');
    expect(result.diagnostics).toHaveProperty('sourceReasonCode');
    expect(result.diagnostics).toHaveProperty('policyVersion');
  });

  it('meets performance threshold on synthetic stream of 500 action evaluations (AC-09/AC-10)', () => {
    const durations = [];
    const p95Samples = [];

    for (let index = 0; index < 500; index += 1) {
      const startedAt = Date.now();
      const concerns = index % 11 === 0;

      const result = createGateConcernsAction({
        primaryEvidenceResult: primaryEvidenceResult({
          diagnostics: {
            ...primaryEvidenceResult().diagnostics,
            verdict: concerns ? 'CONCERNS' : 'PASS',
            canMarkDone: concerns ? false : true,
            concernsActionRequired: concerns,
            sourceReasonCode: concerns ? 'GATE_VERDICT_CONCERNS' : 'OK'
          },
          concernsAction: concerns
            ? {
                required: true,
                valid: true,
                assignee: 'owner-1',
                dueAt: '2026-03-01T10:00:00.000Z',
                status: 'OPEN'
              }
            : {
                required: false,
                valid: true,
                assignee: null,
                dueAt: null,
                status: null
              }
        }),
        concernsAction: concerns
          ? {
              assignee: index % 29 === 0 ? '' : 'owner-1',
              dueAt: index % 29 === 0 ? null : '2026-03-01T10:00:00.000Z',
              status: 'OPEN'
            }
          : undefined,
        policySnapshot: {
          policyScope: 'gate',
          version: index % 31 === 0 && concerns ? '' : 'gate-policy-v3'
        },
        changedBy: 'dev-bot'
      });

      durations.push(Date.now() - startedAt);
      p95Samples.push(result.diagnostics.p95ActionMs);
      expect(result.diagnostics.durationMs).toBeLessThanOrEqual(2000);
    }

    durations.sort((left, right) => left - right);
    p95Samples.sort((left, right) => left - right);

    const p95Duration = durations[Math.ceil(durations.length * 0.95) - 1] ?? 0;
    const p95Internal = p95Samples[Math.ceil(p95Samples.length * 0.95) - 1] ?? 0;

    expect(p95Duration).toBeLessThanOrEqual(2500);
    expect(p95Internal).toBeLessThanOrEqual(2500);
  });
});
