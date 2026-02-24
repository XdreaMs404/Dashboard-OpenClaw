import { describe, expect, it } from 'vitest';
import { evaluateG4DualCorrelation } from '../../src/g4-dual-evaluation.js';

function validGateCenterResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    diagnostics: {
      sourceReasonCode: 'OK'
    },
    gateCenter: [
      {
        gateId: 'G1',
        status: 'PASS',
        owner: 'owner-g1',
        updatedAt: '2026-02-24T00:00:00.000Z',
        reasonCode: 'OK'
      },
      {
        gateId: 'G2',
        status: 'PASS',
        owner: 'owner-g2',
        updatedAt: '2026-02-24T00:00:01.000Z',
        reasonCode: 'OK'
      },
      {
        gateId: 'G3',
        status: 'PASS',
        owner: 'owner-g3',
        updatedAt: '2026-02-24T00:00:02.000Z',
        reasonCode: 'OK'
      },
      {
        gateId: 'G4',
        status: 'PASS',
        owner: 'owner-g4',
        updatedAt: '2026-02-24T00:00:03.000Z',
        reasonCode: 'OK'
      },
      {
        gateId: 'G5',
        status: 'PASS',
        owner: 'owner-g5',
        updatedAt: '2026-02-24T00:00:04.000Z',
        reasonCode: 'OK'
      }
    ],
    subGates: [
      {
        gateId: 'G4-T',
        parentGateId: 'G4',
        status: 'PASS',
        owner: 'owner-g4t',
        updatedAt: '2026-02-24T00:00:05.000Z',
        reasonCode: 'OK',
        evidenceCount: 2
      },
      {
        gateId: 'G4-UX',
        parentGateId: 'G4',
        status: 'PASS',
        owner: 'owner-g4ux',
        updatedAt: '2026-02-24T00:00:06.000Z',
        reasonCode: 'OK',
        evidenceCount: 3
      }
    ],
    correctiveActions: [],
    ...overrides
  };
}

describe('g4-dual-evaluation edge cases', () => {
  it('fails closed on non-object payloads', () => {
    const samples = [undefined, null, true, 42, 'S026', []];

    for (const sample of samples) {
      const result = evaluateG4DualCorrelation(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_G4_DUAL_INPUT',
        diagnostics: {
          dualVerdict: null,
          mismatchCount: 0
        },
        correctiveActions: ['FIX_G4_DUAL_INPUT']
      });
      expect(result.g4DualStatus.dualVerdict).toBeNull();
      expect(result.correlationMatrix).toHaveLength(9);
    }
  });

  it('rejects missing source and malformed source payloads', () => {
    const missingSource = evaluateG4DualCorrelation({});

    expect(missingSource.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(missingSource.reason).toContain('Aucune source exploitable');

    const invalidGateCenterResult = evaluateG4DualCorrelation({
      gateCenterResult: 'bad'
    });

    expect(invalidGateCenterResult.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(invalidGateCenterResult.reason).toContain('gateCenterResult invalide');

    const invalidGateCenterInput = evaluateG4DualCorrelation({
      gateCenterInput: 'bad'
    });

    expect(invalidGateCenterInput.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(invalidGateCenterInput.reason).toContain('gateCenterInput invalide');
  });

  it('rejects invalid gateCenterResult contracts and non-propagable blocked reasons', () => {
    const invalidAllowed = evaluateG4DualCorrelation({
      gateCenterResult: {
        allowed: 'true',
        reasonCode: 'OK',
        gateCenter: [],
        subGates: []
      }
    });

    expect(invalidAllowed.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(invalidAllowed.reason).toContain('allowed invalide');

    const invalidReasonCode = evaluateG4DualCorrelation({
      gateCenterResult: {
        allowed: true,
        reasonCode: 'BAD_CODE',
        gateCenter: [],
        subGates: []
      }
    });

    expect(invalidReasonCode.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(invalidReasonCode.reason).toContain('reasonCode invalide');

    const allowedReasonMismatch = evaluateG4DualCorrelation({
      gateCenterResult: {
        allowed: true,
        reasonCode: 'GATE_STATUS_INCOMPLETE',
        gateCenter: [],
        subGates: []
      }
    });

    expect(allowedReasonMismatch.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(allowedReasonMismatch.reason).toContain('allowed=true exige reasonCode=OK');

    const blockedNonPropagable = evaluateG4DualCorrelation({
      gateCenterResult: {
        allowed: false,
        reasonCode: 'G4_SUBGATES_UNSYNC',
        diagnostics: {
          sourceReasonCode: 'G4_SUBGATES_UNSYNC'
        }
      }
    });

    expect(blockedNonPropagable.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(blockedNonPropagable.reason).toContain('non propagable');

    const invalidGateCenterShape = evaluateG4DualCorrelation({
      gateCenterResult: {
        allowed: true,
        reasonCode: 'OK',
        gateCenter: 'bad',
        subGates: []
      }
    });

    expect(invalidGateCenterShape.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(invalidGateCenterShape.reason).toContain('gateCenter invalide');

    const invalidSubGatesShape = evaluateG4DualCorrelation({
      gateCenterResult: {
        allowed: true,
        reasonCode: 'OK',
        gateCenter: [],
        subGates: 'bad'
      }
    });

    expect(invalidSubGatesShape.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(invalidSubGatesShape.reason).toContain('subGates invalide');
  });

  it('rejects invalid maxSyncSkew and delegated buildGateCenterStatus exception', () => {
    const invalidSyncSkew = evaluateG4DualCorrelation({
      gateCenterResult: validGateCenterResult(),
      maxSyncSkewMs: -1
    });

    expect(invalidSyncSkew.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(invalidSyncSkew.reason).toContain('maxSyncSkewMs invalide');

    const delegatedException = evaluateG4DualCorrelation(
      {
        gateCenterInput: {
          governanceDecisionResult: {
            allowed: true,
            reasonCode: 'OK',
            diagnostics: {
              sourceReasonCode: 'OK'
            },
            decisionHistory: []
          }
        }
      },
      {
        gateCenterOptions: {
          nowMs: () => {
            throw new Error('boom');
          }
        }
      }
    );

    expect(delegatedException.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(delegatedException.reason).toContain('buildGateCenterStatus a levé une exception');
    expect(delegatedException.reason).toContain('boom');
  });

  it('rejects missing dual subgates and malformed dual subgate fields', () => {
    const missingSubGate = evaluateG4DualCorrelation({
      gateCenterResult: validGateCenterResult({
        subGates: [
          {
            gateId: 'G4-T',
            status: 'PASS',
            owner: 'owner-g4t',
            updatedAt: '2026-02-24T00:00:05.000Z'
          }
        ]
      })
    });

    expect(missingSubGate.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(missingSubGate.reason).toContain('doit contenir G4-T et G4-UX');

    const invalidSubGateObject = evaluateG4DualCorrelation({
      gateCenterResult: validGateCenterResult({
        subGates: [null, validGateCenterResult().subGates[1]]
      })
    });

    expect(invalidSubGateObject.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(invalidSubGateObject.reason).toContain('doit contenir G4-T et G4-UX');

    const invalidSubGateGateId = evaluateG4DualCorrelation({
      gateCenterResult: validGateCenterResult({
        subGates: [
          {
            gateId: 'G4-X',
            status: 'PASS',
            owner: 'owner-g4t',
            updatedAt: '2026-02-24T00:00:05.000Z'
          },
          validGateCenterResult().subGates[1]
        ]
      })
    });

    expect(invalidSubGateGateId.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(invalidSubGateGateId.reason).toContain('doit contenir G4-T et G4-UX');

    const invalidSubGateStatus = evaluateG4DualCorrelation({
      gateCenterResult: validGateCenterResult({
        subGates: [
          {
            gateId: 'G4-T',
            status: 'UNKNOWN',
            owner: 'owner-g4t',
            updatedAt: '2026-02-24T00:00:05.000Z'
          },
          validGateCenterResult().subGates[1]
        ]
      })
    });

    expect(invalidSubGateStatus.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(invalidSubGateStatus.reason).toContain('status invalide');

    const invalidSubGateOwner = evaluateG4DualCorrelation({
      gateCenterResult: validGateCenterResult({
        subGates: [
          {
            gateId: 'G4-T',
            status: 'PASS',
            owner: '   ',
            updatedAt: '2026-02-24T00:00:05.000Z'
          },
          validGateCenterResult().subGates[1]
        ]
      })
    });

    expect(invalidSubGateOwner.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(invalidSubGateOwner.reason).toContain('owner invalide');

    const invalidSubGateUpdatedAt = evaluateG4DualCorrelation({
      gateCenterResult: validGateCenterResult({
        subGates: [
          {
            gateId: 'G4-T',
            status: 'PASS',
            owner: 'owner-g4t',
            updatedAt: 'not-a-date'
          },
          validGateCenterResult().subGates[1]
        ]
      })
    });

    expect(invalidSubGateUpdatedAt.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(invalidSubGateUpdatedAt.reason).toContain('updatedAt invalide');
  });

  it('returns G4_SUBGATES_UNSYNC on owner/timestamp contradictions and keeps mismatch diagnostics', () => {
    const result = evaluateG4DualCorrelation({
      gateCenterResult: validGateCenterResult({
        gateCenter: validGateCenterResult().gateCenter.map((entry) =>
          entry.gateId === 'G4'
            ? {
                ...entry,
                status: 'FAIL',
                updatedAt: '2026-02-24T00:09:00.000Z',
                reasonCode: 'TRANSITION_NOT_ALLOWED'
              }
            : entry
        )
      }),
      expectedOwner: 'expected-owner',
      maxSyncSkewMs: 500
    });

    expect(result.reasonCode).toBe('G4_SUBGATES_UNSYNC');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('Décalage horodatage G4-T/G4-UX');
    expect(result.reason).toContain('Owner attendu');
    expect(result.reason).toContain('Décalage horodatage G4/global');
    expect(result.correctiveActions).toContain('SYNC_G4_SUBGATES');
    expect(result.correctiveActions).toContain('BLOCK_DONE_TRANSITION');
    expect(result.diagnostics.mismatchCount).toBeGreaterThan(0);
  });

  it('normalizes corrective actions and evidence fallback behavior', () => {
    const result = evaluateG4DualCorrelation({
      gateCenterResult: validGateCenterResult({
        subGates: validGateCenterResult().subGates.map((entry) => ({
          ...entry,
          evidenceRefs: ['a', 'b'],
          evidenceCount: undefined
        }))
      }),
      evidenceByGate: {
        'G4-T': -1,
        'G4-UX': 5
      },
      correctiveActions: ['BLOCK_DONE_TRANSITION', 'BLOCK_DONE_TRANSITION', null]
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.g4DualStatus.g4t.evidenceCount).toBe(2);
    expect(result.g4DualStatus.g4ux.evidenceCount).toBe(5);
    expect(result.correctiveActions.filter((entry) => entry === 'BLOCK_DONE_TRANSITION')).toHaveLength(1);
  });

  it('accepts non-object options and handles non-monotonic nowMs safely', () => {
    const okWithInvalidOptions = evaluateG4DualCorrelation(
      {
        gateCenterResult: validGateCenterResult()
      },
      'bad-options'
    );

    expect(okWithInvalidOptions.reasonCode).toBe('OK');

    const nowValues = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];
    const safeDurations = evaluateG4DualCorrelation(
      {
        gateCenterResult: validGateCenterResult()
      },
      {
        nowMs: () => nowValues.shift() ?? 0
      }
    );

    expect(safeDurations.reasonCode).toBe('OK');
    expect(safeDurations.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
    expect(safeDurations.diagnostics.p95DualEvalMs).toBeGreaterThanOrEqual(0);
  });

  it('covers timestamp parsing branches for Date/number/empty and invalid values', () => {
    const withDateAndNumber = evaluateG4DualCorrelation({
      gateCenterResult: validGateCenterResult({
        subGates: [
          {
            gateId: 'G4-T',
            status: 'PASS',
            owner: 'owner-g4t',
            updatedAt: new Date('2026-02-24T00:00:05.000Z'),
            reasonCode: undefined,
            sourceReasonCode: undefined
          },
          {
            gateId: 'G4-UX',
            status: 'PASS',
            owner: 'owner-g4ux',
            updatedAt: Date.parse('2026-02-24T00:00:06.000Z'),
            reasonCode: undefined,
            sourceReasonCode: undefined
          }
        ]
      })
    });

    expect(withDateAndNumber.reasonCode).toBe('OK');
    expect(withDateAndNumber.g4DualStatus.g4t.reasonCode).toBe('OK');
    expect(withDateAndNumber.g4DualStatus.g4ux.reasonCode).toBe('OK');

    const withInvalidDateObject = evaluateG4DualCorrelation({
      gateCenterResult: validGateCenterResult({
        subGates: [
          {
            gateId: 'G4-T',
            status: 'PASS',
            owner: 'owner-g4t',
            updatedAt: new Date(Number.NaN)
          },
          validGateCenterResult().subGates[1]
        ]
      })
    });

    expect(withInvalidDateObject.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(withInvalidDateObject.reason).toContain('updatedAt invalide');

    const withInvalidNumericTimestamp = evaluateG4DualCorrelation({
      gateCenterResult: validGateCenterResult({
        subGates: [
          {
            gateId: 'G4-T',
            status: 'PASS',
            owner: 'owner-g4t',
            updatedAt: Number.POSITIVE_INFINITY
          },
          validGateCenterResult().subGates[1]
        ]
      })
    });

    expect(withInvalidNumericTimestamp.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(withInvalidNumericTimestamp.reason).toContain('updatedAt invalide');

    const withEmptyTimestamp = evaluateG4DualCorrelation({
      gateCenterResult: validGateCenterResult({
        subGates: [
          {
            gateId: 'G4-T',
            status: 'PASS',
            owner: 'owner-g4t',
            updatedAt: ''
          },
          validGateCenterResult().subGates[1]
        ]
      })
    });

    expect(withEmptyTimestamp.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(withEmptyTimestamp.reason).toContain('updatedAt invalide');

    const withBooleanTimestamp = evaluateG4DualCorrelation({
      gateCenterResult: validGateCenterResult({
        subGates: [
          {
            gateId: 'G4-T',
            status: 'PASS',
            owner: 'owner-g4t',
            updatedAt: true
          },
          validGateCenterResult().subGates[1]
        ]
      })
    });

    expect(withBooleanTimestamp.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(withBooleanTimestamp.reason).toContain('updatedAt invalide');
  });

  it('uses fallback wording for empty reason payloads and delegated non-error exceptions', () => {
    const invalidEmptyReasonCode = evaluateG4DualCorrelation({
      gateCenterResult: {
        allowed: true,
        reasonCode: '',
        gateCenter: [],
        subGates: []
      }
    });

    expect(invalidEmptyReasonCode.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(invalidEmptyReasonCode.reason).toContain('vide');

    const blockedFallbackReason = evaluateG4DualCorrelation({
      gateCenterResult: {
        allowed: false,
        reasonCode: 'INVALID_PHASE',
        reason: '   ',
        diagnostics: {
          sourceReasonCode: 'INVALID_PHASE'
        }
      }
    });

    expect(blockedFallbackReason.reasonCode).toBe('INVALID_PHASE');
    expect(blockedFallbackReason.reason).toContain('Source Gate Center bloquée');
    expect(blockedFallbackReason.correctiveActions).toContain('ALIGN_CANONICAL_PHASE');

    const delegatedStringThrow = evaluateG4DualCorrelation(
      {
        gateCenterInput: {
          governanceDecisionResult: {
            allowed: true,
            reasonCode: 'OK',
            diagnostics: {
              sourceReasonCode: 'OK'
            },
            decisionHistory: []
          }
        }
      },
      {
        gateCenterOptions: {
          nowMs: () => {
            throw 'boom-string';
          }
        }
      }
    );

    expect(delegatedStringThrow.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(delegatedStringThrow.reason).toContain('boom-string');
  });

  it('rejects non-object or mutated subgates and invalid g4ux normalization paths', () => {
    const functionSubGate = function functionSubGate() {};
    functionSubGate.gateId = 'G4-T';
    functionSubGate.status = 'PASS';
    functionSubGate.owner = 'owner-g4t';
    functionSubGate.updatedAt = '2026-02-24T00:00:05.000Z';

    const invalidObject = evaluateG4DualCorrelation({
      gateCenterResult: validGateCenterResult({
        subGates: [functionSubGate, validGateCenterResult().subGates[1]]
      })
    });

    expect(invalidObject.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(invalidObject.reason).toContain('subGates[G4-T] invalide');

    const mutatingGateId = {
      _calls: 0,
      status: 'PASS',
      owner: 'owner-g4t',
      updatedAt: '2026-02-24T00:00:05.000Z'
    };
    Object.defineProperty(mutatingGateId, 'gateId', {
      enumerable: true,
      configurable: true,
      get() {
        this._calls += 1;
        return this._calls === 1 ? 'G4-T' : 'G4-X';
      }
    });

    const mismatchGateId = evaluateG4DualCorrelation({
      gateCenterResult: validGateCenterResult({
        subGates: [mutatingGateId, validGateCenterResult().subGates[1]]
      })
    });

    expect(mismatchGateId.reasonCode).toBe('OK');
    expect(mismatchGateId.g4DualStatus.g4t.gateId).toBe('G4-T');

    const invalidG4ux = evaluateG4DualCorrelation({
      gateCenterResult: validGateCenterResult({
        subGates: [
          validGateCenterResult().subGates[0],
          {
            gateId: 'G4-UX',
            status: 'UNKNOWN',
            owner: 'owner-g4ux',
            updatedAt: '2026-02-24T00:00:06.000Z'
          }
        ]
      })
    });

    expect(invalidG4ux.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(invalidG4ux.reason).toContain('subGates[G4-UX].status invalide');
  });

  it('handles missing source codes, missing global G4 and unsync action de-dup branches', () => {
    const missingReasonCodes = evaluateG4DualCorrelation({
      gateCenterResult: validGateCenterResult({
        gateCenter: validGateCenterResult().gateCenter.map((entry) =>
          entry.gateId === 'G4'
            ? {
                ...entry,
                owner: '   '
              }
            : entry
        ),
        subGates: [
          {
            gateId: 'G4-T',
            status: 'PASS',
            owner: 'owner-g4t',
            updatedAt: '2026-02-24T00:00:05.000Z',
            reasonCode: undefined,
            sourceReasonCode: undefined
          },
          {
            gateId: 'G4-UX',
            status: 'FAIL',
            owner: 'owner-g4ux',
            updatedAt: '2026-02-24T00:00:06.000Z',
            reasonCode: undefined,
            sourceReasonCode: undefined
          }
        ]
      })
    });

    expect(missingReasonCodes.reasonCode).toBe('OK');
    expect(missingReasonCodes.diagnostics.dualVerdict).toBe('FAIL');
    expect(missingReasonCodes.g4DualStatus.g4t.reasonCode).toBe('OK');
    expect(missingReasonCodes.g4DualStatus.g4ux.reasonCode).toBeNull();
    expect(missingReasonCodes.g4DualStatus.g4ux.sourceReasonCode).toBe('G4_DUAL_EVALUATION_FAILED');
    expect(missingReasonCodes.g4DualStatus.g4.owner).toBeNull();

    const noGlobalG4 = evaluateG4DualCorrelation({
      gateCenterResult: validGateCenterResult({
        gateCenter: validGateCenterResult().gateCenter.filter((entry) => entry.gateId !== 'G4')
      })
    });

    expect(noGlobalG4.reasonCode).toBe('OK');
    expect(noGlobalG4.g4DualStatus.g4.status).toBeNull();
    expect(noGlobalG4.g4DualStatus.g4.owner).toBeNull();
    expect(noGlobalG4.g4DualStatus.g4.updatedAt).toBeNull();

    const unsyncWithPreseededActions = evaluateG4DualCorrelation({
      gateCenterResult: validGateCenterResult({
        subGates: [
          {
            ...validGateCenterResult().subGates[0],
            owner: 'expected-owner'
          },
          {
            ...validGateCenterResult().subGates[1],
            owner: 'other-owner'
          }
        ],
        correctiveActions: ['SYNC_G4_SUBGATES', 'BLOCK_DONE_TRANSITION']
      }),
      expectedOwner: 'expected-owner',
      maxSyncSkewMs: 10_000,
      correctiveActions: ['SYNC_G4_SUBGATES', 'BLOCK_DONE_TRANSITION']
    });

    expect(unsyncWithPreseededActions.reasonCode).toBe('G4_SUBGATES_UNSYNC');
    expect(
      unsyncWithPreseededActions.correctiveActions.filter((entry) => entry === 'SYNC_G4_SUBGATES')
    ).toHaveLength(1);
    expect(
      unsyncWithPreseededActions.correctiveActions.filter((entry) => entry === 'BLOCK_DONE_TRANSITION')
    ).toHaveLength(1);
  });

  it('keeps duration safe when nowMs returns non-finite start/end values', () => {
    const nonFiniteStart = evaluateG4DualCorrelation(
      {
        gateCenterResult: validGateCenterResult()
      },
      {
        nowMs: (() => {
          const values = [Number.NaN, 100, 200, 300, 400, 500, 600];
          return () => values.shift() ?? 0;
        })()
      }
    );

    expect(nonFiniteStart.reasonCode).toBe('OK');
    expect(nonFiniteStart.diagnostics.durationMs).toBeGreaterThanOrEqual(0);

    const nonFiniteEnd = evaluateG4DualCorrelation(
      {},
      {
        nowMs: (() => {
          const values = [100, Number.NaN];
          return () => values.shift() ?? 0;
        })()
      }
    );

    expect(nonFiniteEnd.reasonCode).toBe('INVALID_G4_DUAL_INPUT');
    expect(nonFiniteEnd.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
  });
});
