import { describe, expect, it } from 'vitest';
import { createGateConcernsAction } from '../../src/gate-concerns-actions.js';

function validPrimaryEvidenceResult(overrides = {}) {
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

describe('gate-concerns-actions edge cases', () => {
  it('fails closed on non-object payloads', () => {
    const samples = [undefined, null, true, 42, 'S030', []];

    for (const sample of samples) {
      const result = createGateConcernsAction(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_CONCERNS_ACTION_INPUT',
        correctiveActions: ['FIX_CONCERNS_ACTION_INPUT']
      });
    }
  });

  it('rejects missing source and malformed source payloads', () => {
    const missingSource = createGateConcernsAction({});

    expect(missingSource.reasonCode).toBe('INVALID_CONCERNS_ACTION_INPUT');
    expect(missingSource.reason).toContain('Aucune source exploitable');

    const invalidPrimaryEvidenceResult = createGateConcernsAction({
      primaryEvidenceResult: 'bad'
    });

    expect(invalidPrimaryEvidenceResult.reasonCode).toBe('INVALID_CONCERNS_ACTION_INPUT');
    expect(invalidPrimaryEvidenceResult.reason).toContain('primaryEvidenceResult invalide');

    const invalidPrimaryEvidenceInput = createGateConcernsAction({
      primaryEvidenceInput: 'bad'
    });

    expect(invalidPrimaryEvidenceInput.reasonCode).toBe('INVALID_CONCERNS_ACTION_INPUT');
    expect(invalidPrimaryEvidenceInput.reason).toContain('primaryEvidenceInput invalide');
  });

  it('rejects invalid primaryEvidenceResult contracts and non-propagable blocked reasons', () => {
    const invalidAllowed = createGateConcernsAction({
      primaryEvidenceResult: {
        allowed: 'true',
        reasonCode: 'OK'
      }
    });

    expect(invalidAllowed.reasonCode).toBe('INVALID_CONCERNS_ACTION_INPUT');
    expect(invalidAllowed.reason).toContain('allowed invalide');

    const invalidReasonCode = createGateConcernsAction({
      primaryEvidenceResult: {
        allowed: true,
        reasonCode: 'BAD_CODE'
      }
    });

    expect(invalidReasonCode.reasonCode).toBe('INVALID_CONCERNS_ACTION_INPUT');
    expect(invalidReasonCode.reason).toContain('reasonCode invalide');

    const blockedNonPropagable = createGateConcernsAction({
      primaryEvidenceResult: {
        allowed: false,
        reasonCode: 'GATE_POLICY_VERSION_MISSING',
        diagnostics: {
          sourceReasonCode: 'GATE_POLICY_VERSION_MISSING'
        }
      }
    });

    expect(blockedNonPropagable.reasonCode).toBe('INVALID_CONCERNS_ACTION_INPUT');
    expect(blockedNonPropagable.reason).toContain('non propagable');

    const allowedFail = createGateConcernsAction({
      primaryEvidenceResult: validPrimaryEvidenceResult({
        diagnostics: {
          ...validPrimaryEvidenceResult().diagnostics,
          verdict: 'FAIL'
        }
      })
    });

    expect(allowedFail.reasonCode).toBe('INVALID_CONCERNS_ACTION_INPUT');
    expect(allowedFail.reason).toContain('verdict FAIL');
  });

  it('rejects malformed concernsAction payloads', () => {
    const invalidConcernsActionObject = createGateConcernsAction({
      primaryEvidenceResult: validPrimaryEvidenceResult({
        diagnostics: {
          ...validPrimaryEvidenceResult().diagnostics,
          verdict: 'CONCERNS',
          concernsActionRequired: true,
          canMarkDone: false
        }
      }),
      concernsAction: 'bad'
    });

    expect(invalidConcernsActionObject.reasonCode).toBe('INVALID_CONCERNS_ACTION_INPUT');
    expect(invalidConcernsActionObject.reason).toContain('concernsAction invalide');

    const invalidPolicySnapshotObject = createGateConcernsAction({
      primaryEvidenceResult: validPrimaryEvidenceResult({
        diagnostics: {
          ...validPrimaryEvidenceResult().diagnostics,
          verdict: 'CONCERNS',
          concernsActionRequired: true,
          canMarkDone: false
        }
      }),
      concernsAction: {
        assignee: 'owner-1',
        dueAt: '2026-03-01T10:00:00.000Z'
      },
      policySnapshot: 'bad'
    });

    expect(invalidPolicySnapshotObject.reasonCode).toBe('INVALID_CONCERNS_ACTION_INPUT');
    expect(invalidPolicySnapshotObject.reason).toContain('policySnapshot invalide');

    const invalidHistoryEntryObject = createGateConcernsAction({
      primaryEvidenceResult: validPrimaryEvidenceResult({
        diagnostics: {
          ...validPrimaryEvidenceResult().diagnostics,
          verdict: 'CONCERNS',
          concernsActionRequired: true,
          canMarkDone: false
        }
      }),
      concernsAction: {
        assignee: 'owner-1',
        dueAt: '2026-03-01T10:00:00.000Z'
      },
      policySnapshot: {
        policyScope: 'gate',
        version: 'gate-policy-v3'
      },
      historyEntry: 'bad'
    });

    expect(invalidHistoryEntryObject.reasonCode).toBe('INVALID_CONCERNS_ACTION_INPUT');
    expect(invalidHistoryEntryObject.reason).toContain('historyEntry invalide');
  });

  it('covers delegated exception path from validatePrimaryGateEvidence with Error and non-Error throws', () => {
    const delegatedError = createGateConcernsAction(
      {
        primaryEvidenceInput: {}
      },
      {
        primaryEvidenceOptions: {
          nowMs: () => {
            throw new Error('boom-error');
          }
        }
      }
    );

    expect(delegatedError.reasonCode).toBe('INVALID_CONCERNS_ACTION_INPUT');
    expect(delegatedError.reason).toContain('validatePrimaryGateEvidence a levé une exception');
    expect(delegatedError.reason).toContain('boom-error');

    const delegatedStringThrow = createGateConcernsAction(
      {
        primaryEvidenceInput: {}
      },
      {
        primaryEvidenceOptions: {
          nowMs: () => {
            throw 'boom-string';
          }
        }
      }
    );

    expect(delegatedStringThrow.reasonCode).toBe('INVALID_CONCERNS_ACTION_INPUT');
    expect(delegatedStringThrow.reason).toContain('boom-string');
  });

  it('supports aliases/defaults and deterministic generators for CONCERNS action', () => {
    const result = createGateConcernsAction(
      {
        primaryEvidenceResult: validPrimaryEvidenceResult({
          diagnostics: {
            ...validPrimaryEvidenceResult().diagnostics,
            verdict: 'CONCERNS',
            concernsActionRequired: true,
            canMarkDone: false
          },
          concernsAction: {
            required: true,
            valid: true,
            assignee: 'seed-owner',
            dueAt: '2026-03-01T10:00:00.000Z',
            status: 'OPEN'
          }
        }),
        concernsAction: {
          owner: 'alias-owner',
          dueAt: Date.UTC(2026, 2, 1, 10, 0, 0)
        },
        policyVersion: 'gate-policy-v4',
        actor: 'qa-bot'
      },
      {
        idGenerator: () => 'fallback-id',
        nowMs: () => Date.parse('2026-02-24T04:15:00.000Z')
      }
    );

    expect(result.reasonCode).toBe('OK');
    expect(result.allowed).toBe(true);
    expect(result.concernsAction.actionCreated).toBe(true);
    expect(result.concernsAction.actionId).toBe('fallback-id');
    expect(result.concernsAction.gateId).toBe('G4');
    expect(result.concernsAction.storyId).toBe('S030');
    expect(result.concernsAction.assignee).toBe('alias-owner');
    expect(result.concernsAction.status).toBe('OPEN');
    expect(result.policySnapshot).toEqual({
      policyScope: 'gate',
      version: 'gate-policy-v4'
    });
    expect(result.historyEntry.changedBy).toBe('qa-bot');
  });

  it('handles duration and percentile safely on non-monotonic / non-finite nowMs values', () => {
    const nonMonotonic = createGateConcernsAction(
      {
        primaryEvidenceResult: validPrimaryEvidenceResult(),
        policySnapshot: {
          policyScope: 'gate',
          version: 'gate-policy-v3'
        }
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
    expect(nonMonotonic.diagnostics.p95ActionMs).toBeGreaterThanOrEqual(0);

    const nonFiniteStart = createGateConcernsAction(
      {
        primaryEvidenceResult: validPrimaryEvidenceResult(),
        policySnapshot: {
          policyScope: 'gate',
          version: 'gate-policy-v3'
        }
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

    const nonFiniteEnd = createGateConcernsAction(
      {},
      {
        nowMs: (() => {
          const values = [100, Number.NaN];
          return () => values.shift() ?? 0;
        })()
      }
    );

    expect(nonFiniteEnd.reasonCode).toBe('INVALID_CONCERNS_ACTION_INPUT');
    expect(nonFiniteEnd.diagnostics.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('validates history changeType and changedAt inputs', () => {
    const invalidChangeType = createGateConcernsAction({
      primaryEvidenceResult: validPrimaryEvidenceResult({
        diagnostics: {
          ...validPrimaryEvidenceResult().diagnostics,
          verdict: 'CONCERNS',
          concernsActionRequired: true,
          canMarkDone: false
        }
      }),
      concernsAction: {
        assignee: 'owner-1',
        dueAt: '2026-03-01T10:00:00.000Z'
      },
      policySnapshot: {
        policyScope: 'gate',
        version: 'gate-policy-v3'
      },
      historyEntry: {
        changeType: 'REMOVE'
      }
    });

    expect(invalidChangeType.reasonCode).toBe('CONCERNS_ACTION_HISTORY_INCOMPLETE');

    const invalidChangedAt = createGateConcernsAction({
      primaryEvidenceResult: validPrimaryEvidenceResult({
        diagnostics: {
          ...validPrimaryEvidenceResult().diagnostics,
          verdict: 'CONCERNS',
          concernsActionRequired: true,
          canMarkDone: false
        }
      }),
      concernsAction: {
        assignee: 'owner-1',
        dueAt: '2026-03-01T10:00:00.000Z'
      },
      policySnapshot: {
        policyScope: 'gate',
        version: 'gate-policy-v3'
      },
      historyEntry: {
        changedAt: 'not-a-date'
      }
    });

    expect(invalidChangedAt.reasonCode).toBe('CONCERNS_ACTION_HISTORY_INCOMPLETE');
  });

  it('covers additional allowed=true contract guards and evidence fallbacks', () => {
    const nonOkReasonCode = createGateConcernsAction({
      primaryEvidenceResult: {
        ...validPrimaryEvidenceResult(),
        reasonCode: 'EVIDENCE_CHAIN_INCOMPLETE'
      }
    });

    expect(nonOkReasonCode.reasonCode).toBe('INVALID_CONCERNS_ACTION_INPUT');
    expect(nonOkReasonCode.reason).toContain('allowed=true exige reasonCode=OK');

    const invalidVerdict = createGateConcernsAction({
      primaryEvidenceResult: {
        ...validPrimaryEvidenceResult(),
        diagnostics: {
          ...validPrimaryEvidenceResult().diagnostics,
          verdict: 'UNKNOWN'
        }
      }
    });

    expect(invalidVerdict.reasonCode).toBe('INVALID_CONCERNS_ACTION_INPUT');
    expect(invalidVerdict.reason).toContain('verdict invalide');

    const invalidCanMarkDone = createGateConcernsAction({
      primaryEvidenceResult: {
        ...validPrimaryEvidenceResult(),
        diagnostics: {
          ...validPrimaryEvidenceResult().diagnostics,
          canMarkDone: 'true'
        }
      }
    });

    expect(invalidCanMarkDone.reasonCode).toBe('INVALID_CONCERNS_ACTION_INPUT');
    expect(invalidCanMarkDone.reason).toContain('canMarkDone invalide');

    const evidenceFallback = createGateConcernsAction(
      {
        primaryEvidenceResult: {
          ...validPrimaryEvidenceResult(),
          diagnostics: {
            ...validPrimaryEvidenceResult().diagnostics,
            evidenceCount: undefined
          },
          primaryEvidence: {
            ...validPrimaryEvidenceResult().primaryEvidence,
            count: 3
          },
          concernsAction: {
            required: false,
            valid: true,
            assignee: '',
            dueAt: '',
            status: ''
          }
        },
        correctiveActions: ['CUSTOM_ACTION', 'CUSTOM_ACTION', '   ']
      },
      null
    );

    expect(evidenceFallback.reasonCode).toBe('OK');
    expect(evidenceFallback.diagnostics.actionCreated).toBe(false);
    expect(evidenceFallback.correctiveActions).toEqual(['CUSTOM_ACTION']);
  });

  it('covers id generation fallbacks, aliases, defaults and UPDATE history path', () => {
    const updateFlow = createGateConcernsAction(
      {
        primaryEvidenceResult: {
          ...validPrimaryEvidenceResult(),
          diagnostics: {
            ...validPrimaryEvidenceResult().diagnostics,
            verdict: 'CONCERNS',
            concernsActionRequired: true,
            canMarkDone: false
          },
          concernsAction: {
            required: true,
            valid: true,
            owner: 'seed-owner',
            dueAt: '2026-03-02T10:00:00.000Z',
            status: ''
          }
        },
        concernsAction: {
          actionId: 'existing-action',
          dueAt: new Date('2026-03-02T10:00:00.000Z'),
          gateId: 'g4-ux',
          storyId: 's030'
        },
        policySnapshot: {
          policyScope: 'gate',
          version: 'gate-policy-v5'
        }
      },
      {
        nowMs: () => Date.parse('2026-02-24T04:20:00.000Z')
      }
    );

    expect(updateFlow.reasonCode).toBe('OK');
    expect(updateFlow.concernsAction.actionId).toBe('existing-action');
    expect(updateFlow.concernsAction.assignee).toBe('seed-owner');
    expect(updateFlow.concernsAction.gateId).toBe('G4-UX');
    expect(updateFlow.concernsAction.storyId).toBe('S030');
    expect(updateFlow.historyEntry.changeType).toBe('UPDATE');

    const idGeneratorFallback = createGateConcernsAction(
      {
        primaryEvidenceResult: {
          ...validPrimaryEvidenceResult(),
          diagnostics: {
            ...validPrimaryEvidenceResult().diagnostics,
            verdict: 'CONCERNS',
            concernsActionRequired: true,
            canMarkDone: false
          }
        },
        concernsAssignee: 'payload-owner',
        concernsDueAt: '2026-03-03T10:00:00.000Z',
        policyScope: 'gate',
        policyVersion: 'gate-policy-v6'
      },
      {
        actionIdGenerator: () => '   ',
        idGenerator: () => 'fallback-id',
        nowMs: () => Date.parse('2026-02-24T04:21:00.000Z')
      }
    );

    expect(idGeneratorFallback.reasonCode).toBe('OK');
    expect(idGeneratorFallback.concernsAction.actionId).toBe('fallback-id');
    expect(idGeneratorFallback.concernsAction.gateId).toBe('G4');
    expect(idGeneratorFallback.concernsAction.storyId).toBe('S030');

    const uuidFallback = createGateConcernsAction(
      {
        primaryEvidenceResult: {
          ...validPrimaryEvidenceResult(),
          diagnostics: {
            ...validPrimaryEvidenceResult().diagnostics,
            verdict: 'CONCERNS',
            concernsActionRequired: true,
            canMarkDone: false
          }
        },
        concernsAction: {
          assignee: 'owner-1',
          dueAt: '2026-03-03T10:00:00.000Z'
        },
        policySnapshot: {
          policyScope: 'gate',
          version: 'gate-policy-v7'
        }
      },
      {
        actionIdGenerator: () => '',
        idGenerator: () => '',
        nowMs: () => Date.parse('2026-02-24T04:22:00.000Z')
      }
    );

    expect(uuidFallback.reasonCode).toBe('OK');
    expect(uuidFallback.concernsAction.actionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    );
  });

  it('handles invalid dueAt Date/number/string for assignment checks', () => {
    const baseInput = {
      primaryEvidenceResult: {
        ...validPrimaryEvidenceResult(),
        diagnostics: {
          ...validPrimaryEvidenceResult().diagnostics,
          verdict: 'CONCERNS',
          concernsActionRequired: true,
          canMarkDone: false
        }
      },
      policySnapshot: {
        policyScope: 'gate',
        version: 'gate-policy-v3'
      }
    };

    const invalidDateObject = createGateConcernsAction({
      ...baseInput,
      concernsAction: {
        assignee: 'owner-1',
        dueAt: new Date('invalid-date'),
        status: 'OPEN'
      }
    });

    expect(invalidDateObject.reasonCode).toBe('CONCERNS_ACTION_ASSIGNMENT_INVALID');

    const invalidNumber = createGateConcernsAction({
      ...baseInput,
      concernsAction: {
        assignee: 'owner-1',
        dueAt: Number.POSITIVE_INFINITY,
        status: 'OPEN'
      }
    });

    expect(invalidNumber.reasonCode).toBe('CONCERNS_ACTION_ASSIGNMENT_INVALID');

    const invalidEmptyString = createGateConcernsAction({
      ...baseInput,
      concernsAction: {
        assignee: 'owner-1',
        dueAt: '   ',
        status: 'OPEN'
      }
    });

    expect(invalidEmptyString.reasonCode).toBe('CONCERNS_ACTION_ASSIGNMENT_INVALID');
  });

  it('propagates blocked upstream results with fallback reason and corrective action', () => {
    const blockedFallback = createGateConcernsAction({
      primaryEvidenceResult: {
        allowed: false,
        reasonCode: 'INVALID_PHASE',
        reason: '  ',
        diagnostics: {
          sourceReasonCode: 'INVALID_PHASE'
        }
      }
    });

    expect(blockedFallback.reasonCode).toBe('INVALID_PHASE');
    expect(blockedFallback.reason).toContain('Source Primary Evidence bloquée');
    expect(blockedFallback.correctiveActions).toEqual(['ALIGN_CANONICAL_PHASE']);
  });
});
