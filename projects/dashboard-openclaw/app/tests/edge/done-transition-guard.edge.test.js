import { describe, expect, it } from 'vitest';
import { guardDoneTransition } from '../../src/done-transition-guard.js';

function validGateVerdictResult(overrides = {}) {
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
    contributingFactors: [],
    correctiveActions: [],
    ...overrides
  };
}

describe('done-transition-guard edge cases', () => {
  it('fails closed on non-object payloads', () => {
    const samples = [undefined, null, true, 42, 'S028', []];

    for (const sample of samples) {
      const result = guardDoneTransition(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_DONE_TRANSITION_INPUT',
        doneTransition: {
          blocked: true,
          verdict: null
        },
        correctiveActions: ['FIX_DONE_TRANSITION_INPUT']
      });
    }
  });

  it('rejects missing source and malformed source payloads', () => {
    const missingSource = guardDoneTransition({});

    expect(missingSource.reasonCode).toBe('INVALID_DONE_TRANSITION_INPUT');
    expect(missingSource.reason).toContain('Aucune source exploitable');

    const invalidGateVerdictResult = guardDoneTransition({
      gateVerdictResult: 'bad'
    });

    expect(invalidGateVerdictResult.reasonCode).toBe('INVALID_DONE_TRANSITION_INPUT');
    expect(invalidGateVerdictResult.reason).toContain('gateVerdictResult invalide');

    const invalidGateVerdictInput = guardDoneTransition({
      gateVerdictInput: 'bad'
    });

    expect(invalidGateVerdictInput.reasonCode).toBe('INVALID_DONE_TRANSITION_INPUT');
    expect(invalidGateVerdictInput.reason).toContain('gateVerdictInput invalide');
  });

  it('rejects invalid gateVerdictResult contracts and non-propagable blocked reasons', () => {
    const invalidAllowed = guardDoneTransition({
      gateVerdictResult: {
        allowed: 'true',
        reasonCode: 'OK'
      }
    });

    expect(invalidAllowed.reasonCode).toBe('INVALID_DONE_TRANSITION_INPUT');
    expect(invalidAllowed.reason).toContain('allowed invalide');

    const invalidReasonCode = guardDoneTransition({
      gateVerdictResult: {
        allowed: true,
        reasonCode: 'BAD_CODE'
      }
    });

    expect(invalidReasonCode.reasonCode).toBe('INVALID_DONE_TRANSITION_INPUT');
    expect(invalidReasonCode.reason).toContain('reasonCode invalide');

    const invalidNumericReasonCode = guardDoneTransition({
      gateVerdictResult: {
        allowed: true,
        reasonCode: 42
      }
    });

    expect(invalidNumericReasonCode.reasonCode).toBe('INVALID_DONE_TRANSITION_INPUT');
    expect(invalidNumericReasonCode.reason).toContain('reasonCode invalide');

    const blockedNonPropagable = guardDoneTransition({
      gateVerdictResult: {
        allowed: false,
        reasonCode: 'DONE_TRANSITION_BLOCKED',
        diagnostics: {
          sourceReasonCode: 'DONE_TRANSITION_BLOCKED'
        }
      }
    });

    expect(blockedNonPropagable.reasonCode).toBe('INVALID_DONE_TRANSITION_INPUT');
    expect(blockedNonPropagable.reason).toContain('non propagable');

    const blockedFallbackAction = guardDoneTransition({
      gateVerdictResult: {
        allowed: false,
        reasonCode: 'INVALID_PHASE',
        reason: 'phase invalide',
        diagnostics: {
          sourceReasonCode: 'INVALID_PHASE'
        }
      }
    });

    expect(blockedFallbackAction.reasonCode).toBe('INVALID_PHASE');
    expect(blockedFallbackAction.correctiveActions).toEqual(['ALIGN_CANONICAL_PHASE']);
  });

  it('rejects malformed allowed result fields from gateVerdictResult', () => {
    const invalidVerdict = guardDoneTransition({
      gateVerdictResult: validGateVerdictResult({
        verdict: 'UNKNOWN'
      })
    });

    expect(invalidVerdict.reasonCode).toBe('INVALID_DONE_TRANSITION_INPUT');
    expect(invalidVerdict.reason).toContain('verdict invalide');

    const invalidCanMarkDone = guardDoneTransition({
      gateVerdictResult: validGateVerdictResult({
        canMarkDone: 'true'
      })
    });

    expect(invalidCanMarkDone.reasonCode).toBe('INVALID_DONE_TRANSITION_INPUT');
    expect(invalidCanMarkDone.reason).toContain('canMarkDone invalide');

    const invalidG4Statuses = guardDoneTransition({
      gateVerdictResult: validGateVerdictResult({
        diagnostics: {
          ...validGateVerdictResult().diagnostics,
          g4tStatus: 'UNKNOWN'
        }
      })
    });

    expect(invalidG4Statuses.reasonCode).toBe('INVALID_DONE_TRANSITION_INPUT');
    expect(invalidG4Statuses.reason).toContain('g4tStatus/g4uxStatus invalides');
  });

  it('rejects invalid target and malformed evidence options', () => {
    const invalidTarget = guardDoneTransition({
      gateVerdictResult: validGateVerdictResult(),
      targetState: 'ARCHIVED'
    });

    expect(invalidTarget.reasonCode).toBe('INVALID_DONE_TRANSITION_INPUT');
    expect(invalidTarget.reason).toContain('targetState invalide');

    const invalidEvidenceRefs = guardDoneTransition({
      gateVerdictResult: validGateVerdictResult(),
      evidenceRefs: 'proof-1'
    });

    expect(invalidEvidenceRefs.reasonCode).toBe('INVALID_DONE_TRANSITION_INPUT');
    expect(invalidEvidenceRefs.reason).toContain('evidenceRefs invalide');

    const invalidRequirePrimaryEvidence = guardDoneTransition({
      gateVerdictResult: validGateVerdictResult(),
      requirePrimaryEvidence: 'true'
    });

    expect(invalidRequirePrimaryEvidence.reasonCode).toBe('INVALID_DONE_TRANSITION_INPUT');
    expect(invalidRequirePrimaryEvidence.reason).toContain('requirePrimaryEvidence invalide');

    const invalidMinEvidenceCount = guardDoneTransition({
      gateVerdictResult: validGateVerdictResult(),
      minEvidenceCount: -1
    });

    expect(invalidMinEvidenceCount.reasonCode).toBe('INVALID_DONE_TRANSITION_INPUT');
    expect(invalidMinEvidenceCount.reason).toContain('minEvidenceCount invalide');
  });

  it('covers delegated exception path from calculateGateVerdict with Error and non-Error throws', () => {
    const delegatedError = guardDoneTransition(
      {
        gateVerdictInput: {}
      },
      {
        gateVerdictOptions: {
          nowMs: () => {
            throw new Error('boom-error');
          }
        }
      }
    );

    expect(delegatedError.reasonCode).toBe('INVALID_DONE_TRANSITION_INPUT');
    expect(delegatedError.reason).toContain('calculateGateVerdict a levé une exception');
    expect(delegatedError.reason).toContain('boom-error');

    const delegatedStringThrow = guardDoneTransition(
      {
        gateVerdictInput: {}
      },
      {
        gateVerdictOptions: {
          nowMs: () => {
            throw 'boom-string';
          }
        }
      }
    );

    expect(delegatedStringThrow.reasonCode).toBe('INVALID_DONE_TRANSITION_INPUT');
    expect(delegatedStringThrow.reason).toContain('boom-string');
  });

  it('uses fallback wording for empty blocked reasons and deduplicates corrective actions', () => {
    const result = guardDoneTransition({
      gateVerdictResult: {
        allowed: false,
        reasonCode: 'INVALID_PHASE',
        reason: '   ',
        diagnostics: {
          sourceReasonCode: 'INVALID_PHASE'
        },
        correctiveActions: ['ALIGN_CANONICAL_PHASE', 'ALIGN_CANONICAL_PHASE']
      }
    });

    expect(result.reasonCode).toBe('INVALID_PHASE');
    expect(result.reason).toContain('Source Gate Verdict bloquée');
    expect(result.correctiveActions.filter((entry) => entry === 'ALIGN_CANONICAL_PHASE')).toHaveLength(1);
  });

  it('keeps duration and percentile safe on non-monotonic / non-finite nowMs values', () => {
    const nonMonotonic = guardDoneTransition(
      {
        gateVerdictResult: validGateVerdictResult(),
        evidenceRefs: ['proof-1']
      },
      {
        nowMs: (() => {
          const values = [100, 90, 80, 70, 60, 50];
          return () => values.shift() ?? 0;
        })()
      }
    );

    expect(nonMonotonic.reasonCode).toBe('OK');
    expect(nonMonotonic.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
    expect(nonMonotonic.diagnostics.p95GuardMs).toBeGreaterThanOrEqual(0);

    const nonFiniteStart = guardDoneTransition(
      {
        gateVerdictResult: validGateVerdictResult(),
        evidenceRefs: ['proof-1']
      },
      {
        nowMs: (() => {
          const values = [Number.NaN, 100, 200, 300, 400, 500];
          return () => values.shift() ?? 0;
        })()
      }
    );

    expect(nonFiniteStart.reasonCode).toBe('OK');
    expect(nonFiniteStart.diagnostics.durationMs).toBeGreaterThanOrEqual(0);

    const nonFiniteEnd = guardDoneTransition(
      {},
      {
        nowMs: (() => {
          const values = [100, Number.NaN];
          return () => values.shift() ?? 0;
        })()
      }
    );

    expect(nonFiniteEnd.reasonCode).toBe('INVALID_DONE_TRANSITION_INPUT');
    expect(nonFiniteEnd.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('handles evidence floor and explicit transitionTarget alias', () => {
    const insufficient = guardDoneTransition({
      gateVerdictResult: validGateVerdictResult({
        diagnostics: {
          ...validGateVerdictResult().diagnostics,
          evidenceCount: 0
        }
      }),
      transitionTarget: 'done',
      evidenceRefs: [],
      minEvidenceCount: 1
    });

    expect(insufficient.reasonCode).toBe('EVIDENCE_CHAIN_INCOMPLETE');
    expect(insufficient.doneTransition.targetState).toBe('DONE');
    expect(insufficient.doneTransition.blocked).toBe(true);

    const sufficient = guardDoneTransition({
      gateVerdictResult: validGateVerdictResult({
        diagnostics: {
          ...validGateVerdictResult().diagnostics,
          evidenceCount: 1
        }
      }),
      transitionTarget: 'DONE',
      evidenceRefs: [],
      minEvidenceCount: 1
    });

    expect(sufficient.reasonCode).toBe('OK');
    expect(sufficient.allowed).toBe(true);
  });
});
