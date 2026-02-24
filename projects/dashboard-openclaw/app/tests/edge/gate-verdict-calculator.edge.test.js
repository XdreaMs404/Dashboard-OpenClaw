import { describe, expect, it } from 'vitest';
import { calculateGateVerdict } from '../../src/gate-verdict-calculator.js';

function validG4DualResult(overrides = {}) {
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

describe('gate-verdict-calculator edge cases', () => {
  it('fails closed on non-object payloads', () => {
    const samples = [undefined, null, true, 42, 'S027', []];

    for (const sample of samples) {
      const result = calculateGateVerdict(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_GATE_VERDICT_INPUT',
        verdict: null,
        canMarkDone: false,
        diagnostics: {
          inputGatesCount: 0,
          evidenceCount: 0,
          g4tStatus: null,
          g4uxStatus: null
        },
        correctiveActions: ['FIX_GATE_VERDICT_INPUT']
      });
    }
  });

  it('rejects missing source and malformed source payloads', () => {
    const missingSource = calculateGateVerdict({});

    expect(missingSource.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(missingSource.reason).toContain('Aucune source exploitable');

    const invalidG4DualResult = calculateGateVerdict({
      g4DualResult: 'bad'
    });

    expect(invalidG4DualResult.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(invalidG4DualResult.reason).toContain('g4DualResult invalide');

    const invalidG4DualInput = calculateGateVerdict({
      g4DualInput: 'bad'
    });

    expect(invalidG4DualInput.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(invalidG4DualInput.reason).toContain('g4DualInput invalide');
  });

  it('rejects invalid g4DualResult contracts and non-propagable blocked reasons', () => {
    const invalidAllowed = calculateGateVerdict({
      g4DualResult: {
        allowed: 'true',
        reasonCode: 'OK'
      }
    });

    expect(invalidAllowed.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(invalidAllowed.reason).toContain('allowed invalide');

    const invalidReasonCode = calculateGateVerdict({
      g4DualResult: {
        allowed: true,
        reasonCode: 'BAD_CODE'
      }
    });

    expect(invalidReasonCode.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(invalidReasonCode.reason).toContain('reasonCode invalide');

    const allowedReasonMismatch = calculateGateVerdict({
      g4DualResult: {
        allowed: true,
        reasonCode: 'G4_SUBGATES_UNSYNC',
        g4DualStatus: {},
        diagnostics: {
          sourceReasonCode: 'G4_SUBGATES_UNSYNC'
        }
      }
    });

    expect(allowedReasonMismatch.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(allowedReasonMismatch.reason).toContain('allowed=true exige reasonCode=OK');

    const blockedNonPropagable = calculateGateVerdict({
      g4DualResult: {
        allowed: false,
        reasonCode: 'GATE_VERDICT_CONCERNS',
        diagnostics: {
          sourceReasonCode: 'GATE_VERDICT_CONCERNS'
        }
      }
    });

    expect(blockedNonPropagable.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(blockedNonPropagable.reason).toContain('non propagable');
  });

  it('rejects malformed g4DualStatus structures and dual subgate fields', () => {
    const invalidStatusShape = calculateGateVerdict({
      g4DualResult: validG4DualResult({
        g4DualStatus: 'bad'
      })
    });

    expect(invalidStatusShape.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(invalidStatusShape.reason).toContain('g4DualStatus invalide');

    const invalidG4tGateId = calculateGateVerdict({
      g4DualResult: validG4DualResult({
        g4DualStatus: {
          ...validG4DualResult().g4DualStatus,
          g4t: {
            ...validG4DualResult().g4DualStatus.g4t,
            gateId: 'G4-X'
          }
        }
      })
    });

    expect(invalidG4tGateId.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(invalidG4tGateId.reason).toContain('g4DualStatus.g4t.gateId invalide');

    const invalidG4uxStatus = calculateGateVerdict({
      g4DualResult: validG4DualResult({
        g4DualStatus: {
          ...validG4DualResult().g4DualStatus,
          g4ux: {
            ...validG4DualResult().g4DualStatus.g4ux,
            status: 'UNKNOWN'
          }
        }
      })
    });

    expect(invalidG4uxStatus.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(invalidG4uxStatus.reason).toContain('g4DualStatus.g4ux.status invalide');

    const invalidOwner = calculateGateVerdict({
      g4DualResult: validG4DualResult({
        g4DualStatus: {
          ...validG4DualResult().g4DualStatus,
          g4ux: {
            ...validG4DualResult().g4DualStatus.g4ux,
            owner: '   '
          }
        }
      })
    });

    expect(invalidOwner.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(invalidOwner.reason).toContain('owner invalide');

    const invalidUpdatedAt = calculateGateVerdict({
      g4DualResult: validG4DualResult({
        g4DualStatus: {
          ...validG4DualResult().g4DualStatus,
          g4ux: {
            ...validG4DualResult().g4DualStatus.g4ux,
            updatedAt: 'not-a-date'
          }
        }
      })
    });

    expect(invalidUpdatedAt.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(invalidUpdatedAt.reason).toContain('updatedAt invalide');
  });

  it('rejects malformed evidence payload variants', () => {
    const invalidEvidenceRefs = calculateGateVerdict({
      g4DualResult: validG4DualResult(),
      evidenceRefs: 'proof-1'
    });

    expect(invalidEvidenceRefs.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(invalidEvidenceRefs.reason).toContain('evidenceRefs invalide');

    const invalidEvidenceByGateRefs = calculateGateVerdict({
      g4DualResult: validG4DualResult(),
      evidenceByGateRefs: 'bad'
    });

    expect(invalidEvidenceByGateRefs.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(invalidEvidenceByGateRefs.reason).toContain('evidenceByGateRefs invalide');

    const invalidEvidenceByGateRefsEntry = calculateGateVerdict({
      g4DualResult: validG4DualResult(),
      evidenceByGateRefs: {
        G4: 'bad'
      }
    });

    expect(invalidEvidenceByGateRefsEntry.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(invalidEvidenceByGateRefsEntry.reason).toContain('evidenceByGateRefs.G4 invalide');

    const invalidRequireEvidenceRefs = calculateGateVerdict({
      g4DualResult: validG4DualResult(),
      requireEvidenceRefs: 'true'
    });

    expect(invalidRequireEvidenceRefs.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(invalidRequireEvidenceRefs.reason).toContain('requireEvidenceRefs invalide');
  });

  it('rejects malformed additional signals and normalizes fallback reasonCode for concerns', () => {
    const invalidSignalsArray = calculateGateVerdict({
      g4DualResult: validG4DualResult(),
      additionalSignals: 'bad'
    });

    expect(invalidSignalsArray.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(invalidSignalsArray.reason).toContain('additionalSignals invalide');

    const invalidSignalItem = calculateGateVerdict({
      g4DualResult: validG4DualResult(),
      additionalSignals: [null]
    });

    expect(invalidSignalItem.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(invalidSignalItem.reason).toContain('additionalSignals[0] invalide');

    const invalidSignalSeverity = calculateGateVerdict({
      g4DualResult: validG4DualResult(),
      additionalSignals: [
        {
          signalId: 'S1',
          severity: 'UNKNOWN'
        }
      ]
    });

    expect(invalidSignalSeverity.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(invalidSignalSeverity.reason).toContain('severity invalide');

    const invalidSignalBlocking = calculateGateVerdict({
      g4DualResult: validG4DualResult(),
      additionalSignals: [
        {
          signalId: 'S1',
          severity: 'PASS',
          blocking: 'true'
        }
      ]
    });

    expect(invalidSignalBlocking.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(invalidSignalBlocking.reason).toContain('blocking invalide');

    const concernsWithFallbackReason = calculateGateVerdict({
      g4DualResult: validG4DualResult(),
      evidenceRefs: ['proof-1'],
      additionalSignals: [
        {
          signalId: 'S-FALLBACK',
          severity: 'CONCERNS',
          reasonCode: 'BAD'
        }
      ]
    });

    expect(concernsWithFallbackReason.reasonCode).toBe('GATE_VERDICT_CONCERNS');
    expect(concernsWithFallbackReason.verdict).toBe('CONCERNS');
  });

  it('covers delegated exception path from evaluateG4DualCorrelation and fallback blocked reason wording', () => {
    const delegatedThrow = calculateGateVerdict(
      {
        g4DualInput: {
          gateCenterResult: validG4DualResult()
        }
      },
      {
        g4DualOptions: {
          nowMs: () => {
            throw new Error('boom');
          }
        }
      }
    );

    expect(delegatedThrow.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(delegatedThrow.reason).toContain('evaluateG4DualCorrelation a levé une exception');
    expect(delegatedThrow.reason).toContain('boom');

    const blockedFallback = calculateGateVerdict({
      g4DualResult: {
        allowed: false,
        reasonCode: 'INVALID_PHASE',
        reason: '   ',
        diagnostics: {
          sourceReasonCode: 'INVALID_PHASE'
        }
      }
    });

    expect(blockedFallback.reasonCode).toBe('INVALID_PHASE');
    expect(blockedFallback.reason).toContain('Source G4 dual bloquée');
    expect(blockedFallback.correctiveActions).toContain('ALIGN_CANONICAL_PHASE');
  });

  it('accepts non-object options and handles non-monotonic / non-finite nowMs safely', () => {
    const okWithInvalidOptions = calculateGateVerdict(
      {
        g4DualResult: validG4DualResult(),
        evidenceRefs: ['proof-1']
      },
      'bad-options'
    );

    expect(okWithInvalidOptions.reasonCode).toBe('OK');

    const nonMonotonicNow = calculateGateVerdict(
      {
        g4DualResult: validG4DualResult(),
        evidenceRefs: ['proof-1']
      },
      {
        nowMs: (() => {
          const values = [100, 90, 80, 70, 60, 50, 40];
          return () => values.shift() ?? 0;
        })()
      }
    );

    expect(nonMonotonicNow.reasonCode).toBe('OK');
    expect(nonMonotonicNow.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
    expect(nonMonotonicNow.diagnostics.p95VerdictMs).toBeGreaterThanOrEqual(0);

    const nonFiniteNow = calculateGateVerdict(
      {
        g4DualResult: validG4DualResult(),
        evidenceRefs: ['proof-1']
      },
      {
        nowMs: (() => {
          const values = [Number.NaN, 100, 200, 300, 400, 500, 600];
          return () => values.shift() ?? 0;
        })()
      }
    );

    expect(nonFiniteNow.reasonCode).toBe('OK');
    expect(nonFiniteNow.diagnostics.durationMs).toBeGreaterThanOrEqual(0);

    const nonFiniteEnd = calculateGateVerdict(
      {},
      {
        nowMs: (() => {
          const values = [100, Number.NaN];
          return () => values.shift() ?? 0;
        })()
      }
    );

    expect(nonFiniteEnd.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(nonFiniteEnd.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('covers normalization fallbacks for dual subgates, diagnostics and gateStatuses count', () => {
    const result = calculateGateVerdict({
      g4DualResult: validG4DualResult({
        diagnostics: {
          dualVerdict: 'FAIL'
        },
        g4DualStatus: {
          ...validG4DualResult().g4DualStatus,
          dualVerdict: 'UNKNOWN',
          synchronized: undefined,
          g4t: {
            ...validG4DualResult().g4DualStatus.g4t,
            updatedAt: new Date('2026-02-24T00:00:05.000Z'),
            evidenceCount: undefined,
            evidenceRefs: ['a'],
            reasonCode: undefined,
            sourceReasonCode: undefined
          },
          g4ux: {
            ...validG4DualResult().g4DualStatus.g4ux,
            status: 'FAIL',
            updatedAt: Date.parse('2026-02-24T00:00:06.000Z'),
            evidenceCount: undefined,
            evidenceRefs: ['b', 'c'],
            reasonCode: undefined,
            sourceReasonCode: undefined
          }
        }
      }),
      gateStatuses: [{ gateId: 'G1' }, { gateId: 'g1' }, { gateId: 'G2' }, { gateId: '   ' }],
      evidenceRefs: ['proof-1'],
      correctiveActions: [undefined, 'MANUAL_REVIEW']
    });

    expect(result.reasonCode).toBe('TRANSITION_NOT_ALLOWED');
    expect(result.verdict).toBe('FAIL');
    expect(result.canMarkDone).toBe(false);
    expect(result.diagnostics.inputGatesCount).toBe(2);
    expect(result.diagnostics.sourceReasonCode).toBe('OK');
    expect(result.correctiveActions).toContain('MANUAL_REVIEW');
    expect(result.correctiveActions).toContain('BLOCK_DONE_TRANSITION');
  });

  it('covers invalid timestamp variants and non-object subgate payload path', () => {
    const invalidDate = calculateGateVerdict({
      g4DualResult: validG4DualResult({
        g4DualStatus: {
          ...validG4DualResult().g4DualStatus,
          g4t: {
            ...validG4DualResult().g4DualStatus.g4t,
            updatedAt: new Date(Number.NaN)
          }
        }
      })
    });

    expect(invalidDate.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(invalidDate.reason).toContain('updatedAt invalide');

    const invalidNumber = calculateGateVerdict({
      g4DualResult: validG4DualResult({
        g4DualStatus: {
          ...validG4DualResult().g4DualStatus,
          g4t: {
            ...validG4DualResult().g4DualStatus.g4t,
            updatedAt: Number.POSITIVE_INFINITY
          }
        }
      })
    });

    expect(invalidNumber.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(invalidNumber.reason).toContain('updatedAt invalide');

    const emptyTimestamp = calculateGateVerdict({
      g4DualResult: validG4DualResult({
        g4DualStatus: {
          ...validG4DualResult().g4DualStatus,
          g4t: {
            ...validG4DualResult().g4DualStatus.g4t,
            updatedAt: ''
          }
        }
      })
    });

    expect(emptyTimestamp.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(emptyTimestamp.reason).toContain('updatedAt invalide');

    const invalidTypeTimestamp = calculateGateVerdict({
      g4DualResult: validG4DualResult({
        g4DualStatus: {
          ...validG4DualResult().g4DualStatus,
          g4t: {
            ...validG4DualResult().g4DualStatus.g4t,
            updatedAt: true
          }
        }
      })
    });

    expect(invalidTypeTimestamp.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(invalidTypeTimestamp.reason).toContain('updatedAt invalide');

    const nonObjectSubGate = calculateGateVerdict({
      g4DualResult: validG4DualResult({
        g4DualStatus: {
          ...validG4DualResult().g4DualStatus,
          g4t: () => {}
        }
      })
    });

    expect(nonObjectSubGate.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(nonObjectSubGate.reason).toContain('g4DualStatus.g4t invalide');
  });

  it('covers evidenceByGateRefs success path and additional signal fallback paths', () => {
    const withEvidenceByGateRefs = calculateGateVerdict({
      g4DualResult: validG4DualResult(),
      evidenceByGateRefs: {
        G4: [undefined, 'proof-2']
      },
      requireEvidenceRefs: false
    });

    expect(withEvidenceByGateRefs.reasonCode).toBe('OK');
    expect(withEvidenceByGateRefs.diagnostics.evidenceCount).toBe(2);

    const withSignalFallbacks = calculateGateVerdict({
      g4DualResult: validG4DualResult(),
      evidenceRefs: ['proof-1'],
      additionalSignals: [
        {
          id: 'SIG-ID',
          status: 'CONCERNS'
        },
        {
          severity: 'PASS',
          blocking: false,
          detail: 'signal nominal'
        }
      ]
    });

    expect(withSignalFallbacks.reasonCode).toBe('GATE_VERDICT_CONCERNS');
    expect(withSignalFallbacks.verdict).toBe('CONCERNS');

    const neutralSignalFactor = withSignalFallbacks.contributingFactors.find(
      (entry) => entry.factorId === 'signal-2'
    );

    expect(neutralSignalFactor).toMatchObject({
      status: 'PASS',
      impact: 'NEUTRAL'
    });
  });

  it('covers empty reasonCode fallback wording and delegated string exception path', () => {
    const invalidEmptyReasonCode = calculateGateVerdict({
      g4DualResult: {
        allowed: true,
        reasonCode: '',
        diagnostics: {
          sourceReasonCode: 'OK'
        },
        g4DualStatus: {}
      }
    });

    expect(invalidEmptyReasonCode.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(invalidEmptyReasonCode.reason).toContain('vide');

    const delegatedStringThrow = calculateGateVerdict(
      {
        g4DualInput: {
          gateCenterResult: validG4DualResult()
        }
      },
      {
        g4DualOptions: {
          nowMs: () => {
            throw 'boom-string';
          }
        }
      }
    );

    expect(delegatedStringThrow.reasonCode).toBe('INVALID_GATE_VERDICT_INPUT');
    expect(delegatedStringThrow.reason).toContain('boom-string');
  });
});
