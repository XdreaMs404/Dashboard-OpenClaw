import { describe, expect, it } from 'vitest';
import { validatePrimaryGateEvidence } from '../../src/gate-primary-evidence-validator.js';

function validDoneTransitionGuardResult(overrides = {}) {
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

describe('gate-primary-evidence-validator edge cases', () => {
  it('fails closed on non-object payloads', () => {
    const samples = [undefined, null, true, 42, 'S029', []];

    for (const sample of samples) {
      const result = validatePrimaryGateEvidence(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_PRIMARY_EVIDENCE_INPUT',
        correctiveActions: ['FIX_PRIMARY_EVIDENCE_INPUT']
      });
    }
  });

  it('rejects missing source and malformed source payloads', () => {
    const missingSource = validatePrimaryGateEvidence({});

    expect(missingSource.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(missingSource.reason).toContain('Aucune source exploitable');

    const invalidDoneTransitionGuardResult = validatePrimaryGateEvidence({
      doneTransitionGuardResult: 'bad'
    });

    expect(invalidDoneTransitionGuardResult.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(invalidDoneTransitionGuardResult.reason).toContain('doneTransitionGuardResult invalide');

    const invalidDoneTransitionGuardInput = validatePrimaryGateEvidence({
      doneTransitionGuardInput: 'bad'
    });

    expect(invalidDoneTransitionGuardInput.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(invalidDoneTransitionGuardInput.reason).toContain('doneTransitionGuardInput invalide');
  });

  it('rejects invalid doneTransitionGuardResult contracts and non-propagable blocked reasons', () => {
    const invalidAllowed = validatePrimaryGateEvidence({
      doneTransitionGuardResult: {
        allowed: 'true',
        reasonCode: 'OK'
      }
    });

    expect(invalidAllowed.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(invalidAllowed.reason).toContain('allowed invalide');

    const invalidReasonCode = validatePrimaryGateEvidence({
      doneTransitionGuardResult: {
        allowed: true,
        reasonCode: 'BAD_CODE'
      }
    });

    expect(invalidReasonCode.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(invalidReasonCode.reason).toContain('reasonCode invalide');

    const invalidEmptyReasonCode = validatePrimaryGateEvidence({
      doneTransitionGuardResult: {
        allowed: true,
        reasonCode: null
      }
    });

    expect(invalidEmptyReasonCode.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(invalidEmptyReasonCode.reason).toContain('vide');

    const allowedNonOkReasonCode = validatePrimaryGateEvidence({
      doneTransitionGuardResult: {
        ...validDoneTransitionGuardResult(),
        reasonCode: 'DONE_TRANSITION_BLOCKED'
      }
    });

    expect(allowedNonOkReasonCode.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(allowedNonOkReasonCode.reason).toContain('allowed=true exige reasonCode=OK');

    const blockedNonPropagable = validatePrimaryGateEvidence({
      doneTransitionGuardResult: {
        allowed: false,
        reasonCode: 'CONCERNS_ACTION_ASSIGNMENT_INVALID',
        diagnostics: {
          sourceReasonCode: 'CONCERNS_ACTION_ASSIGNMENT_INVALID'
        }
      }
    });

    expect(blockedNonPropagable.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(blockedNonPropagable.reason).toContain('non propagable');

    const blockedValidWithoutEvidenceCount = validatePrimaryGateEvidence({
      doneTransitionGuardResult: {
        allowed: false,
        reasonCode: 'INVALID_PHASE',
        reason: 'phase invalide',
        diagnostics: {
          sourceReasonCode: 'INVALID_PHASE'
        }
      }
    });

    expect(blockedValidWithoutEvidenceCount.reasonCode).toBe('INVALID_PHASE');
    expect(blockedValidWithoutEvidenceCount.diagnostics.evidenceCount).toBe(0);
    expect(blockedValidWithoutEvidenceCount.correctiveActions).toEqual(['ALIGN_CANONICAL_PHASE']);
  });

  it('rejects malformed allowed result fields from doneTransitionGuardResult', () => {
    const blockedTrueWithAllowed = validatePrimaryGateEvidence({
      doneTransitionGuardResult: {
        ...validDoneTransitionGuardResult(),
        doneTransition: {
          ...validDoneTransitionGuardResult().doneTransition,
          blocked: true
        }
      }
    });

    expect(blockedTrueWithAllowed.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(blockedTrueWithAllowed.reason).toContain('doneTransition.blocked=true');

    const invalidVerdict = validatePrimaryGateEvidence({
      doneTransitionGuardResult: {
        ...validDoneTransitionGuardResult(),
        diagnostics: {
          ...validDoneTransitionGuardResult().diagnostics,
          verdict: 'UNKNOWN'
        }
      }
    });

    expect(invalidVerdict.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(invalidVerdict.reason).toContain('verdict invalide');

    const invalidCanMarkDone = validatePrimaryGateEvidence({
      doneTransitionGuardResult: {
        ...validDoneTransitionGuardResult(),
        diagnostics: {
          ...validDoneTransitionGuardResult().diagnostics,
          canMarkDone: 'true'
        }
      }
    });

    expect(invalidCanMarkDone.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(invalidCanMarkDone.reason).toContain('canMarkDone invalide');
  });

  it('rejects invalid primary evidence options', () => {
    const invalidPrimaryEvidenceRefs = validatePrimaryGateEvidence({
      doneTransitionGuardResult: validDoneTransitionGuardResult(),
      primaryEvidenceRefs: 'proof-1'
    });

    expect(invalidPrimaryEvidenceRefs.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(invalidPrimaryEvidenceRefs.reason).toContain('primaryEvidenceRefs invalide');

    const invalidEvidenceRefs = validatePrimaryGateEvidence({
      doneTransitionGuardResult: validDoneTransitionGuardResult(),
      evidenceRefs: 'proof-1'
    });

    expect(invalidEvidenceRefs.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(invalidEvidenceRefs.reason).toContain('evidenceRefs invalide');

    const invalidRequirePrimaryEvidence = validatePrimaryGateEvidence({
      doneTransitionGuardResult: validDoneTransitionGuardResult(),
      requirePrimaryEvidence: 'true'
    });

    expect(invalidRequirePrimaryEvidence.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(invalidRequirePrimaryEvidence.reason).toContain('requirePrimaryEvidence invalide');

    const invalidMinPrimaryEvidenceCount = validatePrimaryGateEvidence({
      doneTransitionGuardResult: validDoneTransitionGuardResult(),
      minPrimaryEvidenceCount: -1
    });

    expect(invalidMinPrimaryEvidenceCount.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(invalidMinPrimaryEvidenceCount.reason).toContain('minPrimaryEvidenceCount invalide');
  });

  it('rejects malformed concernsAction payloads', () => {
    const invalidConcernsActionObject = validatePrimaryGateEvidence({
      doneTransitionGuardResult: validDoneTransitionGuardResult(),
      concernsAction: 'bad'
    });

    expect(invalidConcernsActionObject.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(invalidConcernsActionObject.reason).toContain('concernsAction invalide');

    const invalidDueAt = validatePrimaryGateEvidence({
      doneTransitionGuardResult: validDoneTransitionGuardResult(),
      concernsAction: {
        assignee: 'owner-1',
        dueAt: 'not-a-date',
        status: 'OPEN'
      }
    });

    expect(invalidDueAt.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(invalidDueAt.reason).toContain('concernsAction.dueAt invalide');

    const invalidStatus = validatePrimaryGateEvidence({
      doneTransitionGuardResult: validDoneTransitionGuardResult(),
      concernsAction: {
        assignee: 'owner-1',
        dueAt: '2026-03-01T10:00:00.000Z',
        status: 'DONE'
      }
    });

    expect(invalidStatus.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(invalidStatus.reason).toContain('concernsAction.status invalide');

    const invalidDateObject = validatePrimaryGateEvidence({
      doneTransitionGuardResult: validDoneTransitionGuardResult(),
      concernsAction: {
        assignee: 'owner-1',
        dueAt: new Date('invalid-date'),
        status: 'OPEN'
      }
    });

    expect(invalidDateObject.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(invalidDateObject.reason).toContain('concernsAction.dueAt invalide');

    const invalidInfiniteDueAt = validatePrimaryGateEvidence({
      doneTransitionGuardResult: validDoneTransitionGuardResult(),
      concernsAction: {
        assignee: 'owner-1',
        dueAt: Number.POSITIVE_INFINITY,
        status: 'OPEN'
      }
    });

    expect(invalidInfiniteDueAt.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(invalidInfiniteDueAt.reason).toContain('concernsAction.dueAt invalide');

    const invalidEmptyStringDueAt = validatePrimaryGateEvidence({
      doneTransitionGuardResult: validDoneTransitionGuardResult(),
      concernsAction: {
        assignee: 'owner-1',
        dueAt: '   ',
        status: 'OPEN'
      }
    });

    expect(invalidEmptyStringDueAt.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(invalidEmptyStringDueAt.reason).toContain('concernsAction.dueAt invalide');
  });

  it('covers delegated exception path from guardDoneTransition with Error and non-Error throws', () => {
    const delegatedError = validatePrimaryGateEvidence(
      {
        doneTransitionGuardInput: {}
      },
      {
        doneTransitionGuardOptions: {
          nowMs: () => {
            throw new Error('boom-error');
          }
        }
      }
    );

    expect(delegatedError.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(delegatedError.reason).toContain('guardDoneTransition a levé une exception');
    expect(delegatedError.reason).toContain('boom-error');

    const delegatedStringThrow = validatePrimaryGateEvidence(
      {
        doneTransitionGuardInput: {}
      },
      {
        doneTransitionGuardOptions: {
          nowMs: () => {
            throw 'boom-string';
          }
        }
      }
    );

    expect(delegatedStringThrow.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(delegatedStringThrow.reason).toContain('boom-string');
  });

  it('uses fallback blocked reason wording and fallback corrective actions when absent', () => {
    const blockedFallback = validatePrimaryGateEvidence({
      doneTransitionGuardResult: {
        allowed: false,
        reasonCode: 'INVALID_PHASE',
        reason: '   ',
        diagnostics: {
          sourceReasonCode: 'INVALID_PHASE',
          verdict: null,
          canMarkDone: false,
          evidenceCount: 0
        }
      }
    });

    expect(blockedFallback.reasonCode).toBe('INVALID_PHASE');
    expect(blockedFallback.reason).toContain('Source Done Transition bloquée');
    expect(blockedFallback.correctiveActions).toEqual(['ALIGN_CANONICAL_PHASE']);
  });

  it('keeps duration and percentile safe on non-monotonic / non-finite nowMs values', () => {
    const nonMonotonic = validatePrimaryGateEvidence(
      {
        doneTransitionGuardResult: validDoneTransitionGuardResult(),
        primaryEvidenceRefs: ['proof-1']
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
    expect(nonMonotonic.diagnostics.p95ValidationMs).toBeGreaterThanOrEqual(0);

    const nonFiniteStart = validatePrimaryGateEvidence(
      {
        doneTransitionGuardResult: validDoneTransitionGuardResult(),
        primaryEvidenceRefs: ['proof-1']
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

    const nonFiniteEnd = validatePrimaryGateEvidence(
      {},
      {
        nowMs: (() => {
          const values = [100, Number.NaN];
          return () => values.shift() ?? 0;
        })()
      }
    );

    expect(nonFiniteEnd.reasonCode).toBe('INVALID_PRIMARY_EVIDENCE_INPUT');
    expect(nonFiniteEnd.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('accepts owner alias + numeric dueAt for CONCERNS action and allows optional proof requirement disable', () => {
    const concernsOwnerAlias = validatePrimaryGateEvidence({
      doneTransitionGuardResult: validDoneTransitionGuardResult({
        diagnostics: {
          ...validDoneTransitionGuardResult().diagnostics,
          verdict: 'CONCERNS',
          canMarkDone: false
        },
        doneTransition: {
          ...validDoneTransitionGuardResult().doneTransition,
          verdict: 'CONCERNS'
        }
      }),
      primaryEvidenceRefs: ['proof-1', null, 'proof-1', '   '],
      evidenceRefs: ['proof-2', 'proof-2'],
      concernsAction: {
        owner: 'owner-alias',
        dueAt: Date.UTC(2026, 2, 1, 10, 0, 0)
      }
    });

    expect(concernsOwnerAlias.reasonCode).toBe('OK');
    expect(concernsOwnerAlias.concernsAction.valid).toBe(true);
    expect(concernsOwnerAlias.concernsAction.assignee).toBe('owner-alias');
    expect(concernsOwnerAlias.concernsAction.status).toBe('OPEN');
    expect(concernsOwnerAlias.primaryEvidence.refs).toEqual(['proof-1', 'proof-2']);

    const optionalProof = validatePrimaryGateEvidence(
      {
        doneTransitionGuardResult: validDoneTransitionGuardResult({
          diagnostics: {
            ...validDoneTransitionGuardResult().diagnostics,
            evidenceCount: 0
          }
        }),
        requirePrimaryEvidence: false,
        minPrimaryEvidenceCount: 0,
        primaryEvidenceRefs: []
      },
      null
    );

    expect(optionalProof.reasonCode).toBe('OK');
    expect(optionalProof.allowed).toBe(true);
    expect(optionalProof.primaryEvidence.valid).toBe(true);
  });
});
