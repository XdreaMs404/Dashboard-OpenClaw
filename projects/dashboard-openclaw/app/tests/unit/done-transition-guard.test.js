import { describe, expect, it } from 'vitest';
import { guardDoneTransition } from '../../src/done-transition-guard.js';
import {
  calculateGateVerdict,
  guardDoneTransition as guardDoneTransitionFromIndex
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
  'INVALID_DONE_TRANSITION_INPUT'
]);

function g4DualResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Dual G4 validé.',
    diagnostics: {
      g4tStatus: 'PASS',
      g4uxStatus: 'PASS',
      dualVerdict: 'PASS',
      mismatchCount: 0,
      durationMs: 12,
      p95DualEvalMs: 4,
      sourceReasonCode: 'OK'
    },
    g4DualStatus: {
      g4: {
        status: 'PASS',
        owner: 'owner-g4',
        updatedAt: '2026-02-24T00:00:03.000Z'
      },
      g4t: {
        gateId: 'G4-T',
        status: 'PASS',
        owner: 'owner-g4t',
        updatedAt: '2026-02-24T00:00:05.000Z',
        evidenceCount: 2,
        reasonCode: 'OK',
        sourceReasonCode: 'OK'
      },
      g4ux: {
        gateId: 'G4-UX',
        status: 'PASS',
        owner: 'owner-g4ux',
        updatedAt: '2026-02-24T00:00:06.000Z',
        evidenceCount: 3,
        reasonCode: 'OK',
        sourceReasonCode: 'OK'
      },
      dualVerdict: 'PASS',
      synchronized: true
    },
    correlationMatrix: [],
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
      durationMs: 5,
      p95VerdictMs: 1,
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

describe('done-transition-guard unit', () => {
  it('allows DONE transition on nominal PASS verdict with evidence chain', () => {
    const result = guardDoneTransition({
      gateVerdictResult: gateVerdictResult(),
      evidenceRefs: ['proof-1'],
      targetState: 'DONE'
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        targetState: 'DONE',
        verdict: 'PASS',
        canMarkDone: true,
        g4tStatus: 'PASS',
        g4uxStatus: 'PASS',
        sourceReasonCode: 'OK'
      },
      doneTransition: {
        targetState: 'DONE',
        blocked: false,
        verdict: 'PASS',
        g4SubGates: {
          g4tStatus: 'PASS',
          g4uxStatus: 'PASS'
        }
      }
    });

    expect(result.reason).toContain('Transition DONE autorisée');
    expect(result.doneTransition.blockingReasons).toHaveLength(0);
  });

  it('blocks DONE on CONCERNS verdict (FR-014) with explicit block action', () => {
    const result = guardDoneTransition({
      gateVerdictResult: gateVerdictResult({
        reasonCode: 'GATE_VERDICT_CONCERNS',
        verdict: 'CONCERNS',
        canMarkDone: false,
        diagnostics: {
          ...gateVerdictResult().diagnostics,
          g4tStatus: 'CONCERNS'
        }
      }),
      evidenceRefs: ['proof-1']
    });

    expect(result.reasonCode).toBe('DONE_TRANSITION_BLOCKED');
    expect(result.allowed).toBe(false);
    expect(result.diagnostics.canMarkDone).toBe(false);
    expect(result.doneTransition.blocked).toBe(true);
    expect(result.doneTransition.blockingReasons.join(' ')).toContain('Verdict=CONCERNS');
    expect(result.correctiveActions).toContain('BLOCK_DONE_TRANSITION');
  });

  it('blocks DONE on FAIL verdict and requests UX evidence refresh when G4-UX is not PASS', () => {
    const result = guardDoneTransition({
      gateVerdictResult: gateVerdictResult({
        reasonCode: 'TRANSITION_NOT_ALLOWED',
        verdict: 'FAIL',
        canMarkDone: false,
        diagnostics: {
          ...gateVerdictResult().diagnostics,
          g4uxStatus: 'FAIL'
        }
      }),
      evidenceRefs: ['proof-1']
    });

    expect(result.reasonCode).toBe('DONE_TRANSITION_BLOCKED');
    expect(result.doneTransition.blocked).toBe(true);
    expect(result.doneTransition.blockingReasons.join(' ')).toContain('G4-UX=FAIL');
    expect(result.correctiveActions).toContain('BLOCK_DONE_TRANSITION');
    expect(result.correctiveActions).toContain('REQUEST_UX_EVIDENCE_REFRESH');
  });

  it('returns EVIDENCE_CHAIN_INCOMPLETE when primary evidence minimum is not met', () => {
    const result = guardDoneTransition({
      gateVerdictResult: gateVerdictResult({
        diagnostics: {
          ...gateVerdictResult().diagnostics,
          evidenceCount: 1
        }
      }),
      evidenceRefs: ['proof-1'],
      minEvidenceCount: 2
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'EVIDENCE_CHAIN_INCOMPLETE',
      diagnostics: {
        canMarkDone: false,
        evidenceCount: 1
      },
      doneTransition: {
        blocked: true
      }
    });

    expect(result.correctiveActions).toContain('LINK_PRIMARY_EVIDENCE');
    expect(result.correctiveActions).toContain('BLOCK_DONE_TRANSITION');
  });

  it('allows DONE when requirePrimaryEvidence=false and verdict remains PASS', () => {
    const result = guardDoneTransition({
      gateVerdictResult: gateVerdictResult({
        diagnostics: {
          ...gateVerdictResult().diagnostics,
          evidenceCount: 0
        }
      }),
      requirePrimaryEvidence: false,
      minEvidenceCount: 0
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.allowed).toBe(true);
    expect(result.diagnostics.canMarkDone).toBe(true);
  });

  it('prefers gateVerdictResult over gateVerdictInput', () => {
    const result = guardDoneTransition({
      gateVerdictResult: gateVerdictResult(),
      gateVerdictInput: {
        g4DualResult: {
          allowed: false,
          reasonCode: 'G4_SUBGATES_UNSYNC',
          diagnostics: {
            sourceReasonCode: 'G4_SUBGATES_UNSYNC'
          }
        }
      },
      evidenceRefs: ['proof-1']
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.doneTransition.blocked).toBe(false);
  });

  it('delegates to S027 when gateVerdictResult is absent', () => {
    const delegatedVerdict = calculateGateVerdict({
      g4DualResult: g4DualResult(),
      evidenceRefs: ['proof-1']
    });

    const result = guardDoneTransition({
      gateVerdictInput: {
        g4DualResult: g4DualResult(),
        evidenceRefs: ['proof-1']
      },
      evidenceRefs: ['proof-1']
    });

    expect(delegatedVerdict.reasonCode).toBe('OK');
    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        verdict: 'PASS',
        canMarkDone: true,
        g4tStatus: 'PASS',
        g4uxStatus: 'PASS',
        sourceReasonCode: 'OK'
      },
      doneTransition: {
        blocked: false,
        verdict: 'PASS'
      }
    });
  });

  it('propagates strict upstream blocking reason codes from S027', () => {
    const result = guardDoneTransition({
      gateVerdictResult: {
        allowed: false,
        reasonCode: 'G4_SUBGATES_UNSYNC',
        reason: 'Sous-gates non synchronisées.',
        diagnostics: {
          sourceReasonCode: 'G4_SUBGATES_UNSYNC'
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
      doneTransition: {
        blocked: true
      },
      correctiveActions: ['SYNC_G4_SUBGATES']
    });
  });

  it('blocks DONE when canMarkDone=false even with PASS verdict and PASS subgates', () => {
    const result = guardDoneTransition({
      gateVerdictResult: gateVerdictResult({
        verdict: 'PASS',
        canMarkDone: false
      }),
      evidenceRefs: ['proof-1']
    });

    expect(result.reasonCode).toBe('DONE_TRANSITION_BLOCKED');
    expect(result.doneTransition.blockingReasons.join(' ')).toContain('canMarkDone=false');
    expect(result.correctiveActions).toContain('BLOCK_DONE_TRANSITION');
  });

  it('keeps stable contract and index export compatibility', () => {
    const result = guardDoneTransitionFromIndex({
      gateVerdictResult: gateVerdictResult(),
      evidenceRefs: ['proof-1']
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('doneTransition');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(Array.isArray(result.correctiveActions)).toBe(true);

    expect(result.diagnostics).toHaveProperty('targetState');
    expect(result.diagnostics).toHaveProperty('verdict');
    expect(result.diagnostics).toHaveProperty('canMarkDone');
    expect(result.diagnostics).toHaveProperty('g4tStatus');
    expect(result.diagnostics).toHaveProperty('g4uxStatus');
    expect(result.diagnostics).toHaveProperty('evidenceCount');
    expect(result.diagnostics).toHaveProperty('durationMs');
    expect(result.diagnostics).toHaveProperty('p95GuardMs');
    expect(result.diagnostics).toHaveProperty('sourceReasonCode');
  });

  it('meets performance threshold on synthetic stream of 500 guard evaluations', () => {
    const durations = [];
    const p95Samples = [];

    for (let index = 0; index < 500; index += 1) {
      const startedAt = Date.now();

      const result = guardDoneTransition({
        gateVerdictResult: gateVerdictResult({
          verdict: index % 23 === 0 ? 'CONCERNS' : index % 31 === 0 ? 'FAIL' : 'PASS',
          canMarkDone: index % 23 === 0 || index % 31 === 0 ? false : true,
          diagnostics: {
            ...gateVerdictResult().diagnostics,
            g4tStatus: index % 23 === 0 ? 'CONCERNS' : 'PASS',
            g4uxStatus: index % 31 === 0 ? 'FAIL' : 'PASS',
            evidenceCount: index % 19 === 0 ? 0 : 2
          },
          correctiveActions: index % 7 === 0 ? ['BLOCK_DONE_TRANSITION'] : []
        }),
        evidenceRefs: index % 19 === 0 ? [] : ['proof-1']
      });

      durations.push(Date.now() - startedAt);
      p95Samples.push(result.diagnostics.p95GuardMs);
      expect(result.diagnostics.durationMs).toBeLessThan(60_000);
    }

    durations.sort((left, right) => left - right);
    p95Samples.sort((left, right) => left - right);

    const p95Duration = durations[Math.ceil(durations.length * 0.95) - 1] ?? 0;
    const p95Internal = p95Samples[Math.ceil(p95Samples.length * 0.95) - 1] ?? 0;

    expect(p95Duration).toBeLessThanOrEqual(2000);
    expect(p95Internal).toBeLessThanOrEqual(2000);
  });
});
