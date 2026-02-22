import { describe, expect, it, vi } from 'vitest';
import { recordPhaseGateGovernanceDecision } from '../../src/phase-gate-governance-journal.js';
import { recordPhaseGateGovernanceDecision as recordFromIndex } from '../../src/index.js';

const GOVERNANCE_REASON_CODES = new Set([
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
  'INVALID_GOVERNANCE_DECISION_INPUT'
]);

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
    decisionId: 'dec-existing-1',
    decisionType: 'phase-gate',
    phaseFrom: 'H08',
    phaseTo: 'H09',
    gateId: 'G3',
    owner: 'ops.lead',
    allowed: true,
    reasonCode: 'OK',
    reason: 'Décision nominale précédente.',
    severity: 'info',
    decidedAt: '2026-02-21T12:00:00.000Z',
    sourceReasonCode: 'OK',
    correctiveActions: [],
    evidenceRefs: ['evidence://hist-001'],
    ...overrides
  };
}

describe('phase-gate-governance-journal unit', () => {
  it('records nominal governance decision with deterministic decisionId and stable contract', () => {
    const result = recordPhaseGateGovernanceDecision(
      {
        gateId: 'g4-t',
        progressionAlert: progressionAlertOk(),
        decisionHistory: [historyEntry()],
        evidenceRefs: ['evidence://runbook/phase-transition']
      },
      {
        nowProvider: () => '2026-02-21T15:30:00.000Z',
        idGenerator: () => 'dec-0001'
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        phaseFrom: 'H09',
        phaseTo: 'H10',
        gateId: 'G4-T',
        owner: 'ops.lead',
        sourceReasonCode: 'OK',
        decisionCount: 2,
        returnedCount: 2,
        droppedCount: 0,
        blockedByGovernance: false,
        criticalAlertActive: false,
        mttaTargetMinutes: null
      },
      correctiveActions: []
    });

    expect(result.decisionEntry).toMatchObject({
      decisionId: 'dec-0001',
      decisionType: 'phase-gate',
      phaseFrom: 'H09',
      phaseTo: 'H10',
      gateId: 'G4-T',
      owner: 'ops.lead',
      allowed: true,
      reasonCode: 'OK',
      severity: 'info',
      decidedAt: '2026-02-21T15:30:00.000Z',
      sourceReasonCode: 'OK',
      correctiveActions: [],
      evidenceRefs: ['evidence://runbook/phase-transition']
    });

    expect(result.decisionHistory[0]).toMatchObject({
      decisionId: 'dec-0001',
      gateId: 'G4-T',
      reasonCode: 'OK'
    });
    expect(result.decisionHistory[1]).toMatchObject({
      decisionId: 'dec-existing-1',
      gateId: 'G3',
      reasonCode: 'OK'
    });
  });

  it('propagates FR-002/FR-003 blocking reason codes with owner and corrective actions', () => {
    const blockedReason =
      'Transition bloquée pour owner=alex.pm: Notification de phase manquante pour H09 -> H10.';

    const result = recordPhaseGateGovernanceDecision(
      {
        gateId: 'G2',
        progressionAlert: progressionAlertBlocked('PHASE_NOTIFICATION_MISSING', blockedReason, {
          diagnostics: {
            fromPhase: 'H09',
            toPhase: 'H10',
            owner: 'alex.pm',
            sourceReasonCode: 'PHASE_NOTIFICATION_MISSING'
          },
          correctiveActions: ['PUBLISH_PHASE_NOTIFICATION']
        }),
        correctiveActions: ['PUBLISH_PHASE_NOTIFICATION']
      },
      {
        nowProvider: () => '2026-02-21T15:35:00.000Z',
        idGenerator: () => 'dec-0002'
      }
    );

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_NOTIFICATION_MISSING',
      reason: blockedReason,
      diagnostics: {
        owner: 'alex.pm',
        gateId: 'G2',
        sourceReasonCode: 'PHASE_NOTIFICATION_MISSING',
        blockedByGovernance: true,
        criticalAlertActive: true,
        mttaTargetMinutes: 10
      },
      correctiveActions: ['PUBLISH_PHASE_NOTIFICATION']
    });

    expect(result.decisionEntry).toMatchObject({
      decisionId: 'dec-0002',
      owner: 'alex.pm',
      reasonCode: 'PHASE_NOTIFICATION_MISSING',
      severity: 'critical',
      correctiveActions: ['PUBLISH_PHASE_NOTIFICATION']
    });
  });

  it('delegates to progressionAlertInput evaluator when progressionAlert is not injected and keeps input immutable', () => {
    const input = {
      gateId: 'G4-UX',
      progressionAlertInput: {
        owner: 'ops.lead',
        dependencyMatrixInput: {
          fromPhase: 'H09',
          toPhase: 'H10',
          owner: 'ops.lead'
        },
        historyEntries: []
      },
      evidenceRefs: ['evidence://ui/snapshot-001']
    };

    const snapshot = JSON.parse(JSON.stringify(input));

    const progressionAlertEvaluator = vi.fn().mockImplementation((payload) => {
      payload.historyEntries.push({
        fromPhase: 'H08',
        toPhase: 'H09',
        allowed: true,
        reasonCode: 'OK',
        reason: 'mutated-by-evaluator',
        timestamp: '2026-02-21T12:00:00.000Z'
      });

      return progressionAlertOk({
        diagnostics: {
          fromPhase: 'H09',
          toPhase: 'H10',
          owner: payload.owner,
          sourceReasonCode: 'OK'
        }
      });
    });

    const result = recordPhaseGateGovernanceDecision(input, {
      progressionAlertEvaluator,
      idGenerator: () => 'dec-0003',
      nowProvider: () => '2026-02-21T15:40:00.000Z'
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        gateId: 'G4-UX',
        owner: 'ops.lead'
      }
    });

    expect(progressionAlertEvaluator).toHaveBeenCalledTimes(1);
    expect(input).toEqual(snapshot);
    expect(progressionAlertEvaluator.mock.calls[0][0].historyEntries).toHaveLength(1);
  });

  it('applies consultation filters phase/gate/owner/reason/allowed/date and stable descending sort', () => {
    const result = recordPhaseGateGovernanceDecision(
      {
        gateId: 'G4-T',
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
            decisionId: 'dec-existing-2',
            gateId: 'G4-T',
            owner: 'ops.lead',
            allowed: false,
            reasonCode: 'TRANSITION_NOT_ALLOWED',
            reason: 'Blocage précédent 1',
            severity: 'warning',
            decidedAt: '2026-02-21T14:10:00.000Z',
            sourceReasonCode: 'TRANSITION_NOT_ALLOWED',
            correctiveActions: ['ALIGN_PHASE_SEQUENCE']
          }),
          historyEntry({
            decisionId: 'dec-existing-3',
            gateId: 'G4-T',
            owner: 'qa.lead',
            allowed: false,
            reasonCode: 'PHASE_NOTIFICATION_MISSING',
            reason: 'Blocage hors filtre owner',
            severity: 'critical',
            decidedAt: '2026-02-21T14:12:00.000Z',
            sourceReasonCode: 'PHASE_NOTIFICATION_MISSING',
            correctiveActions: ['PUBLISH_PHASE_NOTIFICATION']
          })
        ],
        query: {
          phase: 'H09',
          gate: 'g4-t',
          owner: 'ops.lead',
          reasonCode: 'TRANSITION_NOT_ALLOWED',
          allowed: false,
          fromDate: '2026-02-21T14:00:00.000Z',
          toDate: '2026-02-21T15:00:00.000Z',
          limit: 5
        }
      },
      {
        idGenerator: () => 'dec-0004',
        nowProvider: () => '2026-02-21T14:30:00.000Z'
      }
    );

    expect(result.decisionHistory.map((entry) => entry.decisionId)).toEqual([
      'dec-0004',
      'dec-existing-2'
    ]);
    expect(result.decisionHistory).toHaveLength(2);
    expect(result.diagnostics.returnedCount).toBe(2);
  });

  it('returns INVALID_GOVERNANCE_DECISION_INPUT when mandatory context is missing', () => {
    const result = recordPhaseGateGovernanceDecision({
      progressionAlert: progressionAlertOk(),
      decisionHistory: [historyEntry()]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_GOVERNANCE_DECISION_INPUT',
      decisionEntry: null,
      correctiveActions: []
    });
    expect(result.reason).toContain('gateId est requis');
  });

  it('returns INVALID_GOVERNANCE_DECISION_INPUT on invalid query payload', () => {
    const result = recordPhaseGateGovernanceDecision({
      gateId: 'G2',
      progressionAlert: progressionAlertOk(),
      query: {
        fromDate: '2026-02-21T15:00:00.000Z',
        toDate: '2026-02-21T14:00:00.000Z'
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_GOVERNANCE_DECISION_INPUT'
    });
    expect(result.reason).toContain('query.fromDate doit être <= query.toDate');
  });

  it('keeps bounded retention and bounded query limit', () => {
    const history = Array.from({ length: 1100 }, (_, index) =>
      historyEntry({
        decisionId: `dec-${index}`,
        decidedAt: new Date(Date.parse('2026-02-21T10:00:00.000Z') + index * 1000).toISOString(),
        gateId: 'G3'
      })
    );

    const result = recordPhaseGateGovernanceDecision(
      {
        gateId: 'G3',
        progressionAlert: progressionAlertOk({
          diagnostics: {
            fromPhase: 'H09',
            toPhase: 'H10',
            owner: 'ops.lead',
            sourceReasonCode: 'OK'
          }
        }),
        decisionHistory: history,
        maxEntries: 5000,
        query: {
          limit: 5000
        }
      },
      {
        idGenerator: () => 'dec-final',
        nowProvider: () => '2026-02-22T00:00:00.000Z'
      }
    );

    expect(result.diagnostics.decisionCount).toBe(1000);
    expect(result.diagnostics.returnedCount).toBe(200);
    expect(result.diagnostics.droppedCount).toBe(101);
    expect(result.decisionHistory).toHaveLength(200);
  });

  it('keeps stable output contract and index export compatibility', () => {
    const result = recordFromIndex({
      gateId: 'G1',
      progressionAlert: progressionAlertOk()
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('decisionEntry');
    expect(result).toHaveProperty('decisionHistory');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(GOVERNANCE_REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(Array.isArray(result.decisionHistory)).toBe(true);
    expect(Array.isArray(result.correctiveActions)).toBe(true);

    expect(result.diagnostics).toHaveProperty('phaseFrom');
    expect(result.diagnostics).toHaveProperty('phaseTo');
    expect(result.diagnostics).toHaveProperty('gateId');
    expect(result.diagnostics).toHaveProperty('owner');
    expect(result.diagnostics).toHaveProperty('sourceReasonCode');
    expect(result.diagnostics).toHaveProperty('decisionCount');
    expect(result.diagnostics).toHaveProperty('returnedCount');
    expect(result.diagnostics).toHaveProperty('droppedCount');
    expect(result.diagnostics).toHaveProperty('blockedByGovernance');
    expect(result.diagnostics).toHaveProperty('criticalAlertActive');
    expect(result.diagnostics).toHaveProperty('mttaTargetMinutes');
  });
});
