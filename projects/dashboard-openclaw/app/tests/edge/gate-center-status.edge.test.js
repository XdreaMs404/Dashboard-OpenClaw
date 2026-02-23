import { describe, expect, it } from 'vitest';
import { buildGateCenterStatus } from '../../src/gate-center-status.js';

function validGovernanceDecisionResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Source gouvernance valide.',
    diagnostics: {
      sourceReasonCode: 'OK'
    },
    decisionHistory: [
      {
        decisionId: 'dec-g1',
        gateId: 'G1',
        owner: 'owner-g1',
        status: 'PASS',
        reasonCode: 'OK',
        sourceReasonCode: 'OK',
        updatedAt: '2026-02-23T21:00:00.000Z'
      },
      {
        decisionId: 'dec-g2',
        gateId: 'G2',
        owner: 'owner-g2',
        status: 'PASS',
        reasonCode: 'OK',
        sourceReasonCode: 'OK',
        updatedAt: '2026-02-23T21:00:01.000Z'
      },
      {
        decisionId: 'dec-g3',
        gateId: 'G3',
        owner: 'owner-g3',
        status: 'PASS',
        reasonCode: 'OK',
        sourceReasonCode: 'OK',
        updatedAt: '2026-02-23T21:00:02.000Z'
      },
      {
        decisionId: 'dec-g4',
        gateId: 'G4',
        owner: 'owner-g4',
        status: 'PASS',
        reasonCode: 'OK',
        sourceReasonCode: 'OK',
        updatedAt: '2026-02-23T21:00:03.000Z'
      },
      {
        decisionId: 'dec-g5',
        gateId: 'G5',
        owner: 'owner-g5',
        status: 'PASS',
        reasonCode: 'OK',
        sourceReasonCode: 'OK',
        updatedAt: '2026-02-23T21:00:04.000Z'
      },
      {
        decisionId: 'dec-g4-t',
        gateId: 'G4-T',
        parentGateId: 'G4',
        owner: 'owner-g4t',
        status: 'PASS',
        reasonCode: 'OK',
        sourceReasonCode: 'OK',
        updatedAt: '2026-02-23T21:00:05.000Z'
      },
      {
        decisionId: 'dec-g4-ux',
        gateId: 'G4-UX',
        parentGateId: 'G4',
        owner: 'owner-g4ux',
        status: 'PASS',
        reasonCode: 'OK',
        sourceReasonCode: 'OK',
        updatedAt: '2026-02-23T21:00:06.000Z'
      }
    ],
    decisionEntry: null,
    correctiveActions: [],
    ...overrides
  };
}

describe('gate-center-status edge cases', () => {
  it('fails closed on non-object payloads', () => {
    const samples = [undefined, null, true, 42, 'S025', []];

    for (const sample of samples) {
      const result = buildGateCenterStatus(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_GATE_CENTER_INPUT',
        gateCenter: [],
        subGates: [],
        correctiveActions: ['FIX_GATE_CENTER_INPUT']
      });
    }
  });

  it('rejects missing source and malformed source payloads', () => {
    const missingSource = buildGateCenterStatus({});

    expect(missingSource.reasonCode).toBe('INVALID_GATE_CENTER_INPUT');
    expect(missingSource.reason).toContain('Aucune source exploitable');

    const invalidGovernanceResult = buildGateCenterStatus({
      governanceDecisionResult: 'bad'
    });

    expect(invalidGovernanceResult.reasonCode).toBe('INVALID_GATE_CENTER_INPUT');
    expect(invalidGovernanceResult.reason).toContain('governanceDecisionResult invalide');

    const invalidGovernanceInput = buildGateCenterStatus({
      governanceDecisionInput: 'bad'
    });

    expect(invalidGovernanceInput.reasonCode).toBe('INVALID_GATE_CENTER_INPUT');
    expect(invalidGovernanceInput.reason).toContain('governanceDecisionInput invalide');
  });

  it('rejects invalid governanceDecisionResult contracts', () => {
    const invalidAllowed = buildGateCenterStatus({
      governanceDecisionResult: {
        allowed: 'true',
        reasonCode: 'OK'
      }
    });

    expect(invalidAllowed.reasonCode).toBe('INVALID_GATE_CENTER_INPUT');
    expect(invalidAllowed.reason).toContain('allowed invalide');

    const invalidReasonCode = buildGateCenterStatus({
      governanceDecisionResult: {
        allowed: true,
        reasonCode: 'BAD_CODE',
        decisionHistory: [],
        decisionEntry: null
      }
    });

    expect(invalidReasonCode.reasonCode).toBe('INVALID_GATE_CENTER_INPUT');
    expect(invalidReasonCode.reason).toContain('reasonCode invalide');

    const invalidAllowedReasonConsistency = buildGateCenterStatus({
      governanceDecisionResult: {
        allowed: true,
        reasonCode: 'PHASE_NOTIFICATION_MISSING',
        decisionHistory: [],
        decisionEntry: null
      }
    });

    expect(invalidAllowedReasonConsistency.reasonCode).toBe('INVALID_GATE_CENTER_INPUT');
    expect(invalidAllowedReasonConsistency.reason).toContain('allowed=true exige reasonCode=OK');

    const blockedNonPropagable = buildGateCenterStatus({
      governanceDecisionResult: {
        allowed: false,
        reasonCode: 'GATE_STATUS_INCOMPLETE',
        diagnostics: {
          sourceReasonCode: 'GATE_STATUS_INCOMPLETE'
        }
      }
    });

    expect(blockedNonPropagable.reasonCode).toBe('INVALID_GATE_CENTER_INPUT');
    expect(blockedNonPropagable.reason).toContain('non propagable');

    const invalidDecisionHistoryShape = buildGateCenterStatus({
      governanceDecisionResult: {
        allowed: true,
        reasonCode: 'OK',
        decisionHistory: 'bad',
        decisionEntry: null
      }
    });

    expect(invalidDecisionHistoryShape.reasonCode).toBe('INVALID_GATE_CENTER_INPUT');
    expect(invalidDecisionHistoryShape.reason).toContain('decisionHistory invalide');

    const invalidDecisionEntryShape = buildGateCenterStatus({
      governanceDecisionResult: {
        allowed: true,
        reasonCode: 'OK',
        decisionHistory: [],
        decisionEntry: 'bad'
      }
    });

    expect(invalidDecisionEntryShape.reasonCode).toBe('INVALID_GATE_CENTER_INPUT');
    expect(invalidDecisionEntryShape.reason).toContain('decisionEntry invalide');
  });

  it('rejects invalid staleAfterMs and gateSnapshots payload', () => {
    const invalidStaleAfter = buildGateCenterStatus({
      governanceDecisionResult: validGovernanceDecisionResult(),
      staleAfterMs: -1
    });

    expect(invalidStaleAfter.reasonCode).toBe('INVALID_GATE_CENTER_INPUT');
    expect(invalidStaleAfter.reason).toContain('staleAfterMs invalide');

    const invalidSnapshotsShape = buildGateCenterStatus({
      governanceDecisionResult: validGovernanceDecisionResult(),
      gateSnapshots: 'bad'
    });

    expect(invalidSnapshotsShape.reasonCode).toBe('INVALID_GATE_CENTER_INPUT');
    expect(invalidSnapshotsShape.reason).toContain('gateSnapshots invalide');
  });

  it('rejects invalid gate snapshots coming from decision history, decision entry and direct snapshots', () => {
    const invalidHistorySnapshot = buildGateCenterStatus({
      governanceDecisionResult: validGovernanceDecisionResult({
        decisionHistory: [null]
      })
    });

    expect(invalidHistorySnapshot.reasonCode).toBe('INVALID_GATE_CENTER_INPUT');
    expect(invalidHistorySnapshot.reason).toContain('decisionHistory[0] invalide');

    const invalidHistoryGateId = buildGateCenterStatus({
      governanceDecisionResult: validGovernanceDecisionResult({
        decisionHistory: [
          {
            gateId: 'G9',
            owner: 'owner',
            status: 'PASS',
            updatedAt: '2026-02-23T21:00:00.000Z',
            reasonCode: 'OK'
          }
        ]
      })
    });

    expect(invalidHistoryGateId.reasonCode).toBe('INVALID_GATE_CENTER_INPUT');
    expect(invalidHistoryGateId.reason).toContain('gateId invalide');

    const invalidHistoryReasonCode = buildGateCenterStatus({
      governanceDecisionResult: validGovernanceDecisionResult({
        decisionHistory: [
          {
            gateId: 'G1',
            owner: 'owner',
            status: 'PASS',
            updatedAt: '2026-02-23T21:00:00.000Z',
            reasonCode: 'BAD'
          }
        ]
      })
    });

    expect(invalidHistoryReasonCode.reasonCode).toBe('INVALID_GATE_CENTER_INPUT');
    expect(invalidHistoryReasonCode.reason).toContain('reasonCode invalide');

    const invalidEntrySnapshot = buildGateCenterStatus({
      governanceDecisionResult: validGovernanceDecisionResult({
        decisionHistory: [],
        decisionEntry: {
          gateId: 'G4-T',
          parentGateId: 'G2',
          owner: 'owner-g4t',
          status: 'PASS',
          updatedAt: '2026-02-23T21:00:00.000Z',
          reasonCode: 'OK'
        }
      })
    });

    expect(invalidEntrySnapshot.reasonCode).toBe('INVALID_GATE_CENTER_INPUT');
    expect(invalidEntrySnapshot.reason).toContain('parentGateId invalide');

    const invalidDirectSnapshot = buildGateCenterStatus({
      governanceDecisionResult: validGovernanceDecisionResult(),
      gateSnapshots: [
        {
          gateId: 'G4-UX',
          parentGateId: 'G3',
          owner: 'owner-g4ux',
          status: 'PASS',
          updatedAt: '2026-02-23T21:00:00.000Z',
          reasonCode: 'OK'
        }
      ]
    });

    expect(invalidDirectSnapshot.reasonCode).toBe('INVALID_GATE_CENTER_INPUT');
    expect(invalidDirectSnapshot.reason).toContain('parentGateId invalide');
  });

  it('supports status fallback from allowed/reasonCode and latest direct snapshots override older history', () => {
    const result = buildGateCenterStatus({
      governanceDecisionResult: validGovernanceDecisionResult({
        decisionHistory: validGovernanceDecisionResult().decisionHistory.map((entry) => ({
          gateId: entry.gateId,
          owner: entry.owner,
          allowed: true,
          decidedAt: entry.updatedAt,
          reasonCode: 'OK'
        }))
      }),
      gateSnapshots: [
        {
          gateId: 'G1',
          owner: 'owner-override',
          status: 'PASS',
          updatedAt: '2026-02-23T21:59:00.000Z',
          reasonCode: 'OK'
        }
      ]
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.gateCenter.find((entry) => entry.gateId === 'G1')).toMatchObject({
      owner: 'owner-override',
      status: 'PASS'
    });
  });

  it('propagates INVALID_GOVERNANCE_DECISION_INPUT when delegated governance evaluation fails', () => {
    const result = buildGateCenterStatus(
      {
        governanceDecisionInput: {
          gateId: 'G2',
          progressionAlertInput: {
            owner: 'ops.lead',
            fromPhase: 'H09',
            toPhase: 'H10'
          }
        }
      },
      {
        governanceDecisionOptions: {
          progressionAlertEvaluator: () => {
            throw new Error('boom');
          }
        }
      }
    );

    expect(result.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(result.reason).toContain('evaluatePhaseProgressionAlert a levé une exception');
    expect(result.correctiveActions).toEqual(['FIX_GOVERNANCE_DECISION_INPUT']);
  });

  it('applies default corrective action for blocked upstream when actions are absent', () => {
    const result = buildGateCenterStatus({
      governanceDecisionResult: {
        allowed: false,
        reasonCode: 'TRANSITION_NOT_ALLOWED',
        diagnostics: {
          sourceReasonCode: 'TRANSITION_NOT_ALLOWED'
        }
      }
    });

    expect(result.reasonCode).toBe('TRANSITION_NOT_ALLOWED');
    expect(result.correctiveActions).toEqual(['ALIGN_PHASE_SEQUENCE']);
  });

  it('accepts non-object options and handles non-monotonic nowMs safely', () => {
    const okWithInvalidOptions = buildGateCenterStatus(
      {
        governanceDecisionResult: validGovernanceDecisionResult()
      },
      'bad-options'
    );

    expect(okWithInvalidOptions.reasonCode).toBe('OK');

    const nowValues = [100, 90, 80, 70, 60, 50, 40, 30, 20, 10];

    const safeDurations = buildGateCenterStatus(
      {
        governanceDecisionResult: validGovernanceDecisionResult()
      },
      {
        nowMs: () => nowValues.shift() ?? 0
      }
    );

    expect(safeDurations.reasonCode).toBe('OK');
    expect(safeDurations.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
    expect(safeDurations.diagnostics.p95BuildMs).toBeGreaterThanOrEqual(0);
  });

  it('covers placeholder-heavy incomplete branch with deduped actions and BLOCK_DONE already present', () => {
    const result = buildGateCenterStatus({
      governanceDecisionResult: validGovernanceDecisionResult({
        reason: '   ',
        decisionHistory: [
          {
            gateId: 'G1',
            owner: 'owner-g1',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:00.000Z'
          }
        ],
        correctiveActions: ['BLOCK_DONE_TRANSITION', 'BLOCK_DONE_TRANSITION', null]
      }),
      correctiveActions: [null, 'BLOCK_DONE_TRANSITION', 'COMPLETE_GATE_STATUS_FIELDS']
    });

    expect(result.reasonCode).toBe('GATE_STATUS_INCOMPLETE');
    expect(result.reason).toContain('(+');
    expect(result.correctiveActions).toContain('BLOCK_DONE_TRANSITION');
    expect(result.correctiveActions.filter((entry) => entry === 'BLOCK_DONE_TRANSITION')).toHaveLength(1);
  });

  it('covers timestamp parsing branches and status derivation from allowed/reasonCode fallbacks', () => {
    const result = buildGateCenterStatus({
      governanceDecisionResult: validGovernanceDecisionResult({
        decisionHistory: [
          {
            gateId: 'G1',
            owner: 'owner-g1',
            status: null,
            reasonCode: 'OK',
            updatedAt: new Date('2026-02-23T21:00:00.000Z')
          },
          {
            gateId: 'G2',
            owner: 'owner-g2',
            allowed: false,
            updatedAt: Date.parse('2026-02-23T21:00:01.000Z')
          },
          {
            gateId: 'G3',
            owner: 'owner-g3',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: new Date('invalid-date')
          },
          {
            gateId: 'G4',
            owner: 'owner-g4',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: Number.POSITIVE_INFINITY
          },
          {
            gateId: 'G5',
            owner: 'owner-g5',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '  '
          },
          {
            gateId: 'G4-T',
            owner: 'owner-g4t',
            status: null,
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:05.000Z'
          },
          {
            gateId: 'G4-UX',
            owner: 'owner-g4ux',
            status: null,
            reasonCode: 'TRANSITION_NOT_ALLOWED',
            updatedAt: '2026-02-23T21:00:06.000Z'
          }
        ]
      })
    });

    expect(result.reasonCode).toBe('GATE_STATUS_INCOMPLETE');
    expect(result.reason).toContain('G3.updatedAt');
    expect(result.reason).toContain('G4.updatedAt');
    expect(result.reason).toContain('G5.updatedAt');

    const g1 = result.gateCenter.find((entry) => entry.gateId === 'G1');
    const g2 = result.gateCenter.find((entry) => entry.gateId === 'G2');
    const g4ux = result.subGates.find((entry) => entry.gateId === 'G4-UX');

    expect(g1.status).toBe('PASS');
    expect(g2.status).toBe('FAIL');
    expect(g4ux.status).toBe('FAIL');
  });

  it('covers resolveSource catch branches for Error and non-Error thrown by delegated governance call', () => {
    const baseInput = {
      governanceDecisionInput: {
        gateId: 'G2',
        progressionAlert: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'ok',
          diagnostics: {
            fromPhase: 'H09',
            toPhase: 'H10',
            owner: 'ops.lead',
            sourceReasonCode: 'OK'
          },
          correctiveActions: []
        }
      }
    };

    const errorBranch = buildGateCenterStatus(baseInput, {
      governanceDecisionOptions: {
        nowProvider: () => {
          throw new Error('boom-error');
        }
      }
    });

    expect(errorBranch.reasonCode).toBe('INVALID_GATE_CENTER_INPUT');
    expect(errorBranch.reason).toContain('recordPhaseGateGovernanceDecision a levé une exception');
    expect(errorBranch.reason).toContain('boom-error');

    const nonErrorBranch = buildGateCenterStatus(baseInput, {
      governanceDecisionOptions: {
        nowProvider: () => {
          throw 'boom-string';
        }
      }
    });

    expect(nonErrorBranch.reasonCode).toBe('INVALID_GATE_CENTER_INPUT');
    expect(nonErrorBranch.reason).toContain('recordPhaseGateGovernanceDecision a levé une exception');
    expect(nonErrorBranch.reason).toContain('boom-string');
  });

  it('covers gate alias input and explicit empty reasonCode rendering as vide', () => {
    const result = buildGateCenterStatus({
      governanceDecisionResult: validGovernanceDecisionResult(),
      gateSnapshots: [
        {
          gate: 'G1',
          owner: 'owner-via-gate-alias',
          status: 'PASS',
          updatedAt: '2026-02-23T21:00:00.000Z',
          reasonCode: '   '
        }
      ]
    });

    expect(result.reasonCode).toBe('INVALID_GATE_CENTER_INPUT');
    expect(result.reason).toContain('gateSnapshots[0].reasonCode invalide: vide');
  });

  it('covers snapshot recency branches for ts/non-ts combinations', () => {
    const result = buildGateCenterStatus({
      governanceDecisionResult: validGovernanceDecisionResult({
        decisionHistory: [
          {
            gateId: 'G1',
            owner: 'owner-g1-old-no-ts',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: null
          },
          {
            gateId: 'G1',
            owner: 'owner-g1-new-ts',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:00.000Z'
          },
          {
            gateId: 'G2',
            owner: 'owner-g2-old-ts',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:01.000Z'
          },
          {
            gateId: 'G2',
            owner: 'owner-g2-new-no-ts',
            status: 'FAIL',
            reasonCode: 'TRANSITION_NOT_ALLOWED',
            updatedAt: null
          },
          {
            gateId: 'G3',
            owner: 'owner-g3-old-no-ts',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: null
          },
          {
            gateId: 'G3',
            owner: 'owner-g3-new-no-ts',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: null
          },
          {
            gateId: 'G4',
            owner: 'owner-g4',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:03.000Z'
          },
          {
            gateId: 'G5',
            owner: 'owner-g5',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:04.000Z'
          },
          {
            gateId: 'G4-T',
            owner: 'owner-g4t',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:05.000Z'
          },
          {
            gateId: 'G4-UX',
            owner: 'owner-g4ux',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:06.000Z'
          }
        ]
      })
    });

    expect(result.reasonCode).toBe('GATE_STATUS_INCOMPLETE');
    expect(result.gateCenter.find((entry) => entry.gateId === 'G1').owner).toBe('owner-g1-new-ts');
    expect(result.gateCenter.find((entry) => entry.gateId === 'G2').owner).toBe('owner-g2-old-ts');
    expect(result.gateCenter.find((entry) => entry.gateId === 'G3').owner).toBe('owner-g3-new-no-ts');
  });

  it('keeps provided BLOCK_DONE_TRANSITION untouched on allowed flow with non-pass subgates', () => {
    const result = buildGateCenterStatus({
      governanceDecisionResult: validGovernanceDecisionResult({
        decisionHistory: [
          {
            gateId: 'G1',
            owner: 'owner-g1',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:00.000Z'
          },
          {
            gateId: 'G2',
            owner: 'owner-g2',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:01.000Z'
          },
          {
            gateId: 'G3',
            owner: 'owner-g3',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:02.000Z'
          },
          {
            gateId: 'G4',
            owner: 'owner-g4',
            status: 'CONCERNS',
            reasonCode: 'TRANSITION_NOT_ALLOWED',
            updatedAt: '2026-02-23T21:00:03.000Z'
          },
          {
            gateId: 'G5',
            owner: 'owner-g5',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:04.000Z'
          },
          {
            gateId: 'G4-T',
            owner: 'owner-g4t',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:05.000Z'
          },
          {
            gateId: 'G4-UX',
            owner: 'owner-g4ux',
            status: 'CONCERNS',
            reasonCode: 'TRANSITION_NOT_ALLOWED',
            updatedAt: '2026-02-23T21:00:06.000Z'
          }
        ]
      }),
      correctiveActions: ['BLOCK_DONE_TRANSITION', 'BLOCK_DONE_TRANSITION']
    });

    expect(result.reasonCode).toBe('OK');
    expect(result.correctiveActions).toEqual(['BLOCK_DONE_TRANSITION']);
  });
});
