import { describe, expect, it, vi } from 'vitest';
import { recordPhaseGateGovernanceDecision } from '../../src/phase-gate-governance-journal.js';

function progressionAlertOk(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Progression canonique valide pour owner=ops.lead: aucune anomalie détectée.',
    diagnostics: {
      fromPhase: 'H09',
      toPhase: 'H10',
      owner: 'ops.lead',
      sourceReasonCode: 'OK'
    },
    correctiveActions: [],
    ...overrides
  };
}

function progressionAlertBlocked(reasonCode, reason, overrides = {}) {
  return {
    allowed: false,
    reasonCode,
    reason,
    diagnostics: {
      fromPhase: 'H09',
      toPhase: 'H10',
      owner: 'ops.lead',
      sourceReasonCode: reasonCode
    },
    correctiveActions: [],
    ...overrides
  };
}

function historyEntry(overrides = {}) {
  return {
    decisionId: 'dec-hist-1',
    decisionType: 'phase-gate',
    phaseFrom: 'H08',
    phaseTo: 'H09',
    gateId: 'G3',
    owner: 'ops.lead',
    allowed: true,
    reasonCode: 'OK',
    reason: 'Nominal',
    severity: 'info',
    decidedAt: '2026-02-21T12:00:00.000Z',
    sourceReasonCode: 'OK',
    correctiveActions: [],
    evidenceRefs: [],
    ...overrides
  };
}

describe('phase-gate-governance-journal edge cases', () => {
  it('fails closed on non-object payloads', () => {
    const samples = [undefined, null, true, 42, 'S012'];

    for (const sample of samples) {
      const result = recordPhaseGateGovernanceDecision(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_GOVERNANCE_DECISION_INPUT',
        decisionEntry: null,
        decisionHistory: []
      });
    }
  });

  it('rejects invalid decisionHistory payload and invalid entries safely', () => {
    const invalidHistoryType = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      progressionAlert: progressionAlertOk(),
      decisionHistory: 'invalid'
    });

    expect(invalidHistoryType).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_GOVERNANCE_DECISION_INPUT'
    });
    expect(invalidHistoryType.reason).toContain('decisionHistory doit être un tableau');

    const resultWithInvalidRows = recordPhaseGateGovernanceDecision(
      {
        gateId: 'G2',
        progressionAlert: progressionAlertOk(),
        decisionHistory: [null, 42, historyEntry(), historyEntry({ decisionId: '' })]
      },
      {
        idGenerator: () => 'dec-edge-1',
        nowProvider: () => '2026-02-21T15:00:00.000Z'
      }
    );

    expect(resultWithInvalidRows.diagnostics.decisionCount).toBe(2);
    expect(resultWithInvalidRows.decisionHistory).toHaveLength(2);
    expect(resultWithInvalidRows.decisionHistory[0].decisionId).toBe('dec-edge-1');
  });

  it('rejects invalid progressionAlert contracts', () => {
    const invalidShape = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      progressionAlert: null
    });

    expect(invalidShape.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(invalidShape.reason).toContain('progressionAlert doit être un objet valide');

    const invalidAllowed = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      progressionAlert: {
        ...progressionAlertOk(),
        allowed: 'true'
      }
    });

    expect(invalidAllowed.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(invalidAllowed.reason).toContain('progressionAlert.allowed doit être booléen');

    const invalidReasonCode = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      progressionAlert: {
        ...progressionAlertOk(),
        reasonCode: 'UNKNOWN_REASON'
      }
    });

    expect(invalidReasonCode.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(invalidReasonCode.reason).toContain('progressionAlert.reasonCode invalide');

    const incoherentAllowed = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      progressionAlert: {
        ...progressionAlertOk(),
        allowed: true,
        reasonCode: 'TRANSITION_NOT_ALLOWED'
      }
    });

    expect(incoherentAllowed.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(incoherentAllowed.reason).toContain('allowed=true exige reasonCode=OK');
  });

  it('validates progressionAlertInput and delegated evaluator contract', () => {
    const invalidInput = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      progressionAlertInput: 'invalid-shape'
    });

    expect(invalidInput.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(invalidInput.reason).toContain('progressionAlertInput doit être un objet valide');

    const invalidEvaluatorContract = recordPhaseGateGovernanceDecision(
      {
        gateId: 'G2',
        progressionAlertInput: {
          fromPhase: 'H09',
          toPhase: 'H10',
          owner: 'ops.lead'
        }
      },
      {
        progressionAlertEvaluator: () => ({
          allowed: 'true',
          reasonCode: 'OK',
          reason: 'invalid delegated contract'
        })
      }
    );

    expect(invalidEvaluatorContract.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(invalidEvaluatorContract.reason).toContain(
      'Résultat invalide depuis evaluatePhaseProgressionAlert'
    );
  });

  it('prefers direct progressionAlert over progressionAlertInput delegation', () => {
    const progressionAlertEvaluator = vi.fn();

    const result = recordPhaseGateGovernanceDecision(
      {
        gateId: 'G2',
        progressionAlert: progressionAlertOk(),
        progressionAlertInput: {
          fromPhase: 'H01',
          toPhase: 'H02'
        }
      },
      {
        progressionAlertEvaluator
      }
    );

    expect(result.reasonCode).toBe('OK');
    expect(progressionAlertEvaluator).not.toHaveBeenCalled();
  });

  it('rejects invalid context fields gateId/owner/phase and query filters', () => {
    const missingOwner = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      progressionAlert: progressionAlertOk({
        diagnostics: {
          fromPhase: 'H09',
          toPhase: 'H10',
          owner: null,
          sourceReasonCode: 'OK'
        }
      })
    });

    expect(missingOwner.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(missingOwner.reason).toContain('owner est requis');

    const invalidPhase = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      phaseFrom: 'H99',
      progressionAlert: progressionAlertOk()
    });

    expect(invalidPhase.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(invalidPhase.reason).toContain('phaseFrom invalide');

    const invalidQueryPhase = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      progressionAlert: progressionAlertOk(),
      query: {
        phase: 'H99'
      }
    });

    expect(invalidQueryPhase.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(invalidQueryPhase.reason).toContain('query.phase invalide');

    const invalidQueryReasonCode = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      progressionAlert: progressionAlertOk(),
      query: {
        reasonCode: 'BAD'
      }
    });

    expect(invalidQueryReasonCode.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(invalidQueryReasonCode.reason).toContain('query.reasonCode invalide');
  });

  it('deduplicates correctiveActions from progression/direct/default mappings', () => {
    const result = recordPhaseGateGovernanceDecision(
      {
        gateId: 'G2',
        progressionAlert: progressionAlertBlocked(
          'TRANSITION_NOT_ALLOWED',
          'Transition non autorisée H09 -> H11.',
          {
            correctiveActions: ['ALIGN_PHASE_SEQUENCE', 'ALIGN_PHASE_SEQUENCE']
          }
        ),
        correctiveActions: ['ALIGN_PHASE_SEQUENCE', ' ALIGN_PHASE_SEQUENCE ']
      },
      {
        idGenerator: () => 'dec-edge-actions',
        nowProvider: () => '2026-02-21T16:00:00.000Z'
      }
    );

    expect(result.correctiveActions).toEqual(['ALIGN_PHASE_SEQUENCE']);
    expect(result.decisionEntry.correctiveActions).toEqual(['ALIGN_PHASE_SEQUENCE']);
  });

  it('maps critical severity and MTTA target for FR-003-related blockers', () => {
    const result = recordPhaseGateGovernanceDecision(
      {
        gateId: 'G2',
        progressionAlert: progressionAlertBlocked(
          'PHASE_NOTIFICATION_SLA_EXCEEDED',
          'Notification SLA dépassée pour owner=ops.lead.'
        )
      },
      {
        idGenerator: () => 'dec-edge-critical',
        nowProvider: () => '2026-02-21T16:30:00.000Z'
      }
    );

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
      diagnostics: {
        criticalAlertActive: true,
        mttaTargetMinutes: 10
      }
    });
    expect(result.decisionEntry.severity).toBe('critical');
  });

  it('accepts and sanitizes evidenceRefs/correctiveActions payloads', () => {
    const result = recordPhaseGateGovernanceDecision(
      {
        gateId: 'G4-UX',
        progressionAlert: progressionAlertOk(),
        evidenceRefs: ['evidence://ux/screen-1', '  evidence://ux/screen-1  ', '   '],
        correctiveActions: ['REVIEW_NOTES', 'REVIEW_NOTES', '  REVIEW_NOTES  ']
      },
      {
        idGenerator: () => 'dec-edge-evidence',
        nowProvider: () => '2026-02-21T17:00:00.000Z'
      }
    );

    expect(result.decisionEntry.evidenceRefs).toEqual(['evidence://ux/screen-1']);
    expect(result.correctiveActions).toEqual(['REVIEW_NOTES']);
  });

  it('rejects invalid evidenceRefs and correctiveActions types', () => {
    const invalidEvidence = recordPhaseGateGovernanceDecision({
      gateId: 'G4-UX',
      progressionAlert: progressionAlertOk(),
      evidenceRefs: 'invalid'
    });

    expect(invalidEvidence.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(invalidEvidence.reason).toContain('evidenceRefs doit être un tableau de chaînes');

    const invalidActions = recordPhaseGateGovernanceDecision({
      gateId: 'G4-UX',
      progressionAlert: progressionAlertOk(),
      correctiveActions: ['OK', 42]
    });

    expect(invalidActions.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(invalidActions.reason).toContain('correctiveActions doit être un tableau de chaînes');
  });

  it('accepts Date/number timestamps and explicit payload decisionId while keeping deterministic ordering', () => {
    const dateTimestamp = new Date('2026-02-21T17:10:00.000Z');
    const numberTimestamp = Date.parse('2026-02-21T17:11:00.000Z');

    const byDate = recordPhaseGateGovernanceDecision(
      {
        gateId: 'G2',
        decisionId: '  dec-from-payload  ',
        decidedAt: dateTimestamp,
        maxEntries: '3',
        progressionAlert: progressionAlertOk(),
        decisionHistory: [historyEntry()]
      },
      {
        idGenerator: () => 'ignored-id-generator'
      }
    );

    expect(byDate.decisionEntry.decisionId).toBe('dec-from-payload');
    expect(byDate.decisionEntry.decidedAt).toBe('2026-02-21T17:10:00.000Z');

    const byNumber = recordPhaseGateGovernanceDecision(
      {
        gateId: 'G2',
        decidedAt: numberTimestamp,
        progressionAlert: progressionAlertOk(),
        decisionHistory: [
          historyEntry({ decisionId: 'same-ts-a', decidedAt: '2026-02-21T17:11:00.000Z' }),
          historyEntry({ decisionId: 'same-ts-b', decidedAt: '2026-02-21T17:11:00.000Z' })
        ]
      },
      {
        idGenerator: () => 'dec-number-ts'
      }
    );

    expect(byNumber.decisionEntry.decidedAt).toBe('2026-02-21T17:11:00.000Z');
    expect(byNumber.decisionHistory[0].decisionId).toBe('dec-number-ts');
  });

  it('falls back to Date.now when nowProvider is invalid and idGenerator returns blank', () => {
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-02-21T17:20:00.000Z'));

    try {
      const result = recordPhaseGateGovernanceDecision(
        {
          gateId: 'G2',
          progressionAlert: progressionAlertOk(),
          decisionHistory: []
        },
        {
          nowProvider: () => ({ invalid: true }),
          idGenerator: () => '   '
        }
      );

      expect(result.decisionEntry.decidedAt).toBe('2026-02-21T17:20:00.000Z');
      expect(result.decisionEntry.decisionId).toBeTruthy();
      expect(result.decisionEntry.decisionId).not.toBe('');
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it('fails closed when decidedAt/timestamp payloads are out of JS Date range', () => {
    const outOfRange = 8_640_000_000_000_001;

    const decidedAtInvalid = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      decidedAt: outOfRange,
      progressionAlert: progressionAlertOk(),
      decisionHistory: [historyEntry()]
    });

    expect(decidedAtInvalid).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_GOVERNANCE_DECISION_INPUT',
      decisionEntry: null
    });
    expect(decidedAtInvalid.reason).toContain('decidedAt/timestamp invalide');

    const timestampInvalid = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      timestamp: outOfRange,
      progressionAlert: progressionAlertOk(),
      decisionHistory: [historyEntry()]
    });

    expect(timestampInvalid).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_GOVERNANCE_DECISION_INPUT',
      decisionEntry: null
    });
    expect(timestampInvalid.reason).toContain('decidedAt/timestamp invalide');
  });

  it('fails closed when progressionAlertEvaluator throws', () => {
    const result = recordPhaseGateGovernanceDecision(
      {
        gateId: 'G2',
        progressionAlertInput: {
          fromPhase: 'H09',
          toPhase: 'H10',
          owner: 'ops.lead'
        },
        decisionHistory: [historyEntry()]
      },
      {
        progressionAlertEvaluator: () => {
          throw new RangeError('evaluator exploded');
        }
      }
    );

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_GOVERNANCE_DECISION_INPUT',
      decisionEntry: null
    });
    expect(result.reason).toContain('evaluatePhaseProgressionAlert a levé une exception');
  });

  it('handles numeric parsing for maxEntries/query limit with invalid and decimal inputs', () => {
    const result = recordPhaseGateGovernanceDecision(
      {
        gateId: 'G2',
        maxEntries: 2.5,
        progressionAlert: progressionAlertOk(),
        decisionHistory: [historyEntry(), historyEntry({ decisionId: 'dec-hist-2' })],
        query: {
          limit: 'abc'
        }
      },
      {
        idGenerator: () => 'dec-parse-1',
        nowProvider: () => '2026-02-21T17:25:00.000Z'
      }
    );

    expect(result.diagnostics.decisionCount).toBe(3);
    expect(result.diagnostics.returnedCount).toBe(3);
  });

  it('returns invalid for malformed query dates and keeps consulted history mapped', () => {
    const fromDateInvalid = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      progressionAlert: progressionAlertOk(),
      decisionHistory: [historyEntry()],
      query: {
        fromDate: '   '
      }
    });

    expect(fromDateInvalid.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(fromDateInvalid.reason).toContain('query.fromDate invalide');
    expect(fromDateInvalid.decisionHistory).toHaveLength(1);

    const toDateInvalid = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      progressionAlert: progressionAlertOk(),
      decisionHistory: [historyEntry()],
      query: {
        toDate: 'not-a-date'
      }
    });

    expect(toDateInvalid.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(toDateInvalid.reason).toContain('query.toDate invalide');
    expect(toDateInvalid.decisionHistory).toHaveLength(1);
  });

  it('covers progression alert invalid combinations and missing diagnostics', () => {
    const emptyReason = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      progressionAlert: {
        ...progressionAlertOk(),
        reason: ' '
      }
    });

    expect(emptyReason.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(emptyReason.reason).toContain('progressionAlert.reason doit être une chaîne non vide');

    const allowedFalseWithOk = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      progressionAlert: {
        ...progressionAlertOk(),
        allowed: false,
        reasonCode: 'OK'
      }
    });

    expect(allowedFalseWithOk.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(allowedFalseWithOk.reason).toContain('allowed=false ne peut pas utiliser reasonCode=OK');

    const missingDiagnostics = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      progressionAlert: {
        ...progressionAlertOk(),
        diagnostics: null
      }
    });

    expect(missingDiagnostics.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(missingDiagnostics.reason).toContain('progressionAlert.diagnostics doit être un objet valide');

    const invalidProgressionActions = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      progressionAlert: {
        ...progressionAlertOk(),
        correctiveActions: ['VALID', 7]
      }
    });

    expect(invalidProgressionActions.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(invalidProgressionActions.reason).toContain('correctiveActions doit être un tableau de chaînes');
  });

  it('rejects invalid phaseTo context and invalid/degraded historic entry contracts', () => {
    const invalidPhaseTo = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      phaseTo: 'H99',
      progressionAlert: progressionAlertOk()
    });

    expect(invalidPhaseTo.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(invalidPhaseTo.reason).toContain('phaseTo invalide');

    const result = recordPhaseGateGovernanceDecision(
      {
        gateId: 'G2',
        progressionAlert: progressionAlertOk(),
        decisionHistory: [
          historyEntry({ decisionId: 'invalid-phase', phaseTo: 'H99' }),
          historyEntry({ decisionId: 'invalid-allowed', allowed: 'false' }),
          historyEntry({ decisionId: 'invalid-reasoncode', reasonCode: 'BAD_CODE' }),
          historyEntry({ decisionId: 'invalid-reason', reason: ' ' }),
          historyEntry({ decisionId: 'invalid-timestamp', decidedAt: 8_640_000_000_000_001 }),
          historyEntry({
            decisionId: 'invalid-actions',
            correctiveActions: ['OK', 123]
          }),
          historyEntry({ decisionId: 'valid-history' })
        ]
      },
      {
        idGenerator: () => 'dec-valid-after-invalid',
        nowProvider: () => '2026-02-21T17:30:00.000Z'
      }
    );

    expect(result.diagnostics.decisionCount).toBe(2);
    expect(result.decisionHistory.map((entry) => entry.decisionId)).toEqual([
      'dec-valid-after-invalid',
      'valid-history'
    ]);
  });

  it('covers query filter negative paths on phase/gate/reason/allowed/fromDate/toDate', () => {
    const shared = {
      gateId: 'G2',
      progressionAlert: progressionAlertBlocked(
        'TRANSITION_NOT_ALLOWED',
        'Transition non autorisée H09 -> H11.',
        {
          diagnostics: {
            fromPhase: 'H09',
            toPhase: 'H11',
            owner: 'ops.lead',
            sourceReasonCode: 'TRANSITION_NOT_ALLOWED'
          },
          correctiveActions: ['ALIGN_PHASE_SEQUENCE']
        }
      ),
      decisionHistory: [
        historyEntry({
          decisionId: 'dec-filter-base',
          gateId: 'G2',
          owner: 'ops.lead',
          allowed: false,
          reasonCode: 'TRANSITION_NOT_ALLOWED',
          severity: 'warning',
          decidedAt: '2026-02-21T17:35:00.000Z',
          sourceReasonCode: 'TRANSITION_NOT_ALLOWED',
          correctiveActions: ['ALIGN_PHASE_SEQUENCE']
        })
      ]
    };

    const phaseMismatch = recordPhaseGateGovernanceDecision({
      ...shared,
      query: { phase: 'H03' }
    });
    expect(phaseMismatch.decisionHistory).toHaveLength(0);

    const gateMismatch = recordPhaseGateGovernanceDecision({
      ...shared,
      query: { phase: 'H09', gate: 'G5' }
    });
    expect(gateMismatch.decisionHistory).toHaveLength(0);

    const reasonMismatch = recordPhaseGateGovernanceDecision({
      ...shared,
      query: { phase: 'H09', gate: 'G2', reasonCode: 'PHASE_NOTIFICATION_MISSING' }
    });
    expect(reasonMismatch.decisionHistory).toHaveLength(0);

    const allowedMismatch = recordPhaseGateGovernanceDecision({
      ...shared,
      query: { phase: 'H09', gate: 'G2', reasonCode: 'TRANSITION_NOT_ALLOWED', allowed: true }
    });
    expect(allowedMismatch.decisionHistory).toHaveLength(0);

    const fromDateMismatch = recordPhaseGateGovernanceDecision({
      ...shared,
      query: {
        phase: 'H09',
        gate: 'G2',
        reasonCode: 'TRANSITION_NOT_ALLOWED',
        allowed: false,
        fromDate: '2099-01-01T00:00:00.000Z'
      }
    });
    expect(fromDateMismatch.decisionHistory).toHaveLength(0);

    const toDateMismatch = recordPhaseGateGovernanceDecision({
      ...shared,
      query: {
        phase: 'H09',
        gate: 'G2',
        reasonCode: 'TRANSITION_NOT_ALLOWED',
        allowed: false,
        toDate: '2000-01-01T00:00:00.000Z'
      }
    });
    expect(toDateMismatch.decisionHistory).toHaveLength(0);
  });

  it('covers invalid progression/actions/evidence paths with non-empty retained history mapping', () => {
    const baseHistory = [historyEntry({ decisionId: 'dec-mapped-1' })];

    const progressionInvalid = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      decisionHistory: baseHistory
    });
    expect(progressionInvalid.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(progressionInvalid.decisionHistory).toHaveLength(1);

    const actionsInvalid = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      progressionAlert: progressionAlertOk(),
      decisionHistory: baseHistory,
      correctiveActions: [1]
    });
    expect(actionsInvalid.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(actionsInvalid.decisionHistory).toHaveLength(1);

    const evidenceInvalid = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      progressionAlert: progressionAlertOk(),
      decisionHistory: baseHistory,
      evidenceRefs: [1]
    });
    expect(evidenceInvalid.reasonCode).toBe('INVALID_GOVERNANCE_DECISION_INPUT');
    expect(evidenceInvalid.decisionHistory).toHaveLength(1);
  });
});
