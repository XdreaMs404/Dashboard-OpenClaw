import { describe, expect, it } from 'vitest';
import { validatePrimaryGateEvidence } from '../../src/gate-primary-evidence-validator.js';
import {
  guardDoneTransition,
  validatePrimaryGateEvidence as validatePrimaryGateEvidenceFromIndex
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
  'INVALID_PRIMARY_EVIDENCE_INPUT'
]);

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
      evidenceCount: 1,
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

function gateVerdictResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Verdict gate calculé: PASS (G4-T=PASS, G4-UX=PASS).',
    diagnostics: {
      inputGatesCount: 5,
      evidenceCount: 2,
      g4tStatus: 'PASS',
      g4uxStatus: 'PASS',
      durationMs: 6,
      p95VerdictMs: 2,
      sourceReasonCode: 'OK'
    },
    verdict: 'PASS',
    canMarkDone: true,
    contributingFactors: [
      {
        factorId: 'FINAL_VERDICT',
        gateId: 'GLOBAL',
        status: 'PASS',
        impact: 'NEUTRAL'
      }
    ],
    correctiveActions: [],
    ...overrides
  };
}

describe('gate-primary-evidence-validator unit', () => {
  it('passes nominal validation with primary evidence present (AC-02)', () => {
    const result = validatePrimaryGateEvidence({
      doneTransitionGuardResult: doneTransitionGuardResult(),
      primaryEvidenceRefs: ['primary-proof-1']
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        verdict: 'PASS',
        canMarkDone: true,
        evidenceCount: 1,
        concernsActionRequired: false,
        sourceReasonCode: 'OK'
      },
      primaryEvidence: {
        required: true,
        valid: true,
        count: 1,
        minRequired: 1,
        refs: ['primary-proof-1']
      },
      concernsAction: {
        required: false,
        valid: true,
        assignee: null,
        dueAt: null,
        status: null
      }
    });

    expect(result.reason).toContain('Preuve primaire valide');
  });

  it('fails closed without primary evidence (AC-01)', () => {
    const result = validatePrimaryGateEvidence({
      doneTransitionGuardResult: doneTransitionGuardResult({
        diagnostics: {
          ...doneTransitionGuardResult().diagnostics,
          evidenceCount: 0
        }
      }),
      primaryEvidenceRefs: []
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'EVIDENCE_CHAIN_INCOMPLETE',
      diagnostics: {
        canMarkDone: false,
        evidenceCount: 0,
        concernsActionRequired: false
      },
      primaryEvidence: {
        required: true,
        valid: false,
        count: 0
      }
    });

    expect(result.correctiveActions).toContain('LINK_PRIMARY_EVIDENCE');
    expect(result.correctiveActions).toContain('BLOCK_DONE_TRANSITION');
  });

  it('requires and validates a CONCERNS action when verdict is CONCERNS (AC-03)', () => {
    const result = validatePrimaryGateEvidence({
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
      primaryEvidenceRefs: ['primary-proof-1'],
      concernsAction: {
        assignee: 'ux-owner',
        dueAt: '2026-03-01T10:00:00.000Z',
        status: 'OPEN'
      }
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        verdict: 'CONCERNS',
        canMarkDone: false,
        concernsActionRequired: true,
        sourceReasonCode: 'GATE_VERDICT_CONCERNS'
      },
      concernsAction: {
        required: true,
        valid: true,
        assignee: 'ux-owner',
        status: 'OPEN'
      }
    });

    expect(result.concernsAction.dueAt).toBe('2026-03-01T10:00:00.000Z');
    expect(result.correctiveActions).toContain('TRACK_CONCERNS_ACTION');
  });

  it('blocks CONCERNS without valid assignment and due date (AC-04)', () => {
    const result = validatePrimaryGateEvidence({
      doneTransitionGuardResult: doneTransitionGuardResult({
        diagnostics: {
          ...doneTransitionGuardResult().diagnostics,
          verdict: 'CONCERNS',
          canMarkDone: false
        },
        doneTransition: {
          ...doneTransitionGuardResult().doneTransition,
          verdict: 'CONCERNS'
        }
      }),
      primaryEvidenceRefs: ['primary-proof-1'],
      concernsAction: {
        assignee: '   ',
        status: 'OPEN'
      }
    });

    expect(result.reasonCode).toBe('CONCERNS_ACTION_ASSIGNMENT_INVALID');
    expect(result.allowed).toBe(false);
    expect(result.diagnostics.canMarkDone).toBe(false);
    expect(result.concernsAction.required).toBe(true);
    expect(result.concernsAction.valid).toBe(false);
    expect(result.correctiveActions).toContain('ASSIGN_CONCERNS_OWNER');
    expect(result.correctiveActions).toContain('SET_CONCERNS_DUE_DATE');
  });

  it('resolves source strictly: doneTransitionGuardResult has priority over doneTransitionGuardInput (AC-05)', () => {
    const result = validatePrimaryGateEvidence({
      doneTransitionGuardResult: doneTransitionGuardResult(),
      doneTransitionGuardInput: {},
      primaryEvidenceRefs: ['primary-proof-1']
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.allowed).toBe(true);
  });

  it('delegates to S028 when doneTransitionGuardResult is absent (AC-05)', () => {
    const delegatedGuard = guardDoneTransition({
      gateVerdictResult: gateVerdictResult(),
      evidenceRefs: ['primary-proof-1']
    });

    const result = validatePrimaryGateEvidence({
      doneTransitionGuardInput: {
        gateVerdictResult: gateVerdictResult(),
        evidenceRefs: ['primary-proof-1']
      },
      primaryEvidenceRefs: ['primary-proof-1']
    });

    expect(delegatedGuard.reasonCode).toBe('OK');
    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        verdict: 'PASS',
        canMarkDone: true,
        evidenceCount: 2,
        concernsActionRequired: false,
        sourceReasonCode: 'OK'
      },
      primaryEvidence: {
        valid: true
      }
    });
  });

  it('propagates upstream blocking reason codes without rewrite (AC-06)', () => {
    const result = validatePrimaryGateEvidence({
      doneTransitionGuardResult: {
        allowed: false,
        reasonCode: 'G4_SUBGATES_UNSYNC',
        reason: 'Sous-gates non synchronisées.',
        diagnostics: {
          sourceReasonCode: 'G4_SUBGATES_UNSYNC',
          verdict: null,
          canMarkDone: false,
          evidenceCount: 0
        },
        correctiveActions: ['SYNC_G4_SUBGATES']
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'G4_SUBGATES_UNSYNC',
      diagnostics: {
        sourceReasonCode: 'G4_SUBGATES_UNSYNC'
      },
      correctiveActions: ['SYNC_G4_SUBGATES']
    });
  });

  it('blocks on PASS verdict if canMarkDone remains false (guard consistency)', () => {
    const result = validatePrimaryGateEvidence({
      doneTransitionGuardResult: doneTransitionGuardResult({
        diagnostics: {
          ...doneTransitionGuardResult().diagnostics,
          verdict: 'PASS',
          canMarkDone: false
        }
      }),
      primaryEvidenceRefs: ['primary-proof-1']
    });

    expect(result.reasonCode).toBe('DONE_TRANSITION_BLOCKED');
    expect(result.allowed).toBe(false);
    expect(result.correctiveActions).toContain('BLOCK_DONE_TRANSITION');
  });

  it('blocks when upstream verdict is FAIL even with primary evidence present', () => {
    const result = validatePrimaryGateEvidence({
      doneTransitionGuardResult: doneTransitionGuardResult({
        diagnostics: {
          ...doneTransitionGuardResult().diagnostics,
          verdict: 'FAIL',
          canMarkDone: false,
          sourceReasonCode: 'TRANSITION_NOT_ALLOWED'
        },
        doneTransition: {
          ...doneTransitionGuardResult().doneTransition,
          verdict: 'FAIL'
        }
      }),
      primaryEvidenceRefs: ['primary-proof-1']
    });

    expect(result.reasonCode).toBe('DONE_TRANSITION_BLOCKED');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Verdict FAIL reçu');
    expect(result.correctiveActions).toContain('BLOCK_DONE_TRANSITION');
  });

  it('accepts verdict fallback from doneTransition when diagnostics.verdict is missing', () => {
    const result = validatePrimaryGateEvidence({
      doneTransitionGuardResult: doneTransitionGuardResult({
        diagnostics: {
          ...doneTransitionGuardResult().diagnostics,
          verdict: undefined,
          evidenceCount: undefined,
          sourceReasonCode: undefined
        },
        doneTransition: {
          ...doneTransitionGuardResult().doneTransition,
          verdict: 'PASS'
        }
      }),
      primaryEvidenceRefs: ['primary-proof-1']
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.allowed).toBe(true);
    expect(result.diagnostics.verdict).toBe('PASS');
    expect(result.diagnostics.sourceReasonCode).toBe('OK');
  });

  it('keeps stable contract and index export compatibility (AC-07/AC-08)', () => {
    const result = validatePrimaryGateEvidenceFromIndex({
      doneTransitionGuardResult: doneTransitionGuardResult(),
      primaryEvidenceRefs: ['primary-proof-1']
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('primaryEvidence');
    expect(result).toHaveProperty('concernsAction');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(Array.isArray(result.correctiveActions)).toBe(true);

    expect(result.diagnostics).toHaveProperty('verdict');
    expect(result.diagnostics).toHaveProperty('canMarkDone');
    expect(result.diagnostics).toHaveProperty('evidenceCount');
    expect(result.diagnostics).toHaveProperty('concernsActionRequired');
    expect(result.diagnostics).toHaveProperty('durationMs');
    expect(result.diagnostics).toHaveProperty('p95ValidationMs');
    expect(result.diagnostics).toHaveProperty('sourceReasonCode');
  });

  it('meets performance threshold on synthetic stream of 500 validations (AC-10)', () => {
    const durations = [];
    const p95Samples = [];

    for (let index = 0; index < 500; index += 1) {
      const startedAt = Date.now();
      const verdict = index % 13 === 0 ? 'CONCERNS' : 'PASS';

      const result = validatePrimaryGateEvidence({
        doneTransitionGuardResult: doneTransitionGuardResult({
          diagnostics: {
            ...doneTransitionGuardResult().diagnostics,
            verdict,
            canMarkDone: verdict === 'PASS'
          },
          doneTransition: {
            ...doneTransitionGuardResult().doneTransition,
            verdict
          }
        }),
        primaryEvidenceRefs: index % 17 === 0 ? [] : ['primary-proof-1'],
        concernsAction:
          verdict === 'CONCERNS'
            ? {
                assignee: 'qa-owner',
                dueAt: '2026-03-01T10:00:00.000Z',
                status: 'OPEN'
              }
            : undefined
      });

      durations.push(Date.now() - startedAt);
      p95Samples.push(result.diagnostics.p95ValidationMs);
      expect(result.diagnostics.durationMs).toBeLessThan(60_000);
    }

    durations.sort((left, right) => left - right);
    p95Samples.sort((left, right) => left - right);

    const p95Duration = durations[Math.ceil(durations.length * 0.95) - 1] ?? 0;
    const p95Internal = p95Samples[Math.ceil(p95Samples.length * 0.95) - 1] ?? 0;

    expect(p95Duration).toBeLessThanOrEqual(2500);
    expect(p95Internal).toBeLessThanOrEqual(2500);
  });
});
