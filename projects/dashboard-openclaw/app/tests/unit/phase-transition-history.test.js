import { describe, expect, it } from 'vitest';
import { recordPhaseTransitionHistory } from '../../src/phase-transition-history.js';
import { recordPhaseTransitionHistory as recordFromIndex } from '../../src/index.js';

function makeGuardOk(reason = 'Guards exécutés avec succès pour la phase 4.') {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason,
    diagnostics: {
      phaseNumber: 4,
      simulate: false,
      blockedByPrerequisites: false,
      executedCount: 2,
      failedCommand: null
    }
  };
}

function makeHistoryEntry({
  fromPhase,
  toPhase,
  allowed,
  reasonCode,
  reason,
  timestamp,
  extra = {}
}) {
  return {
    fromPhase,
    toPhase,
    allowed,
    reasonCode,
    reason,
    timestamp,
    ...extra
  };
}

describe('phase-transition-history unit', () => {
  it('records a nominal transition and appends an entry immutably', () => {
    const previousHistory = [
      makeHistoryEntry({
        fromPhase: 'H02',
        toPhase: 'H03',
        allowed: true,
        reasonCode: 'OK',
        reason: 'Transition autorisée H02 -> H03.',
        timestamp: '2026-02-20T10:00:00.000Z'
      })
    ];

    const result = recordPhaseTransitionHistory(
      {
        fromPhase: 'H03',
        toPhase: 'H04',
        guardResult: makeGuardOk('Transition H03 -> H04 validée par guards.'),
        history: previousHistory
      },
      {
        nowProvider: () => '2026-02-21T13:40:00.000Z'
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      reason: 'Transition H03 -> H04 validée par guards.',
      diagnostics: {
        fromPhase: 'H03',
        toPhase: 'H04',
        totalCount: 2,
        returnedCount: 2,
        droppedCount: 0,
        blockedByGuard: false
      }
    });

    expect(result.entry).toEqual({
      fromPhase: 'H03',
      toPhase: 'H04',
      allowed: true,
      reasonCode: 'OK',
      reason: 'Transition H03 -> H04 validée par guards.',
      timestamp: '2026-02-21T13:40:00.000Z',
      guardDiagnostics: {
        phaseNumber: 4,
        simulate: false,
        blockedByPrerequisites: false,
        executedCount: 2,
        failedCommand: null
      }
    });

    expect(result.history[0]).toMatchObject({
      fromPhase: 'H03',
      toPhase: 'H04',
      reasonCode: 'OK'
    });
    expect(result.history[1]).toMatchObject({
      fromPhase: 'H02',
      toPhase: 'H03',
      reasonCode: 'OK'
    });
    expect(previousHistory).toHaveLength(1);
  });

  it('propagates blocking guard verdict while still recording the event', () => {
    const result = recordPhaseTransitionHistory(
      {
        fromPhase: 'H04',
        toPhase: 'H05',
        guardResult: {
          allowed: false,
          reasonCode: 'PHASE_PREREQUISITES_INCOMPLETE',
          reason: 'Prérequis requis incomplets: PR-004.',
          diagnostics: {
            blockedByPrerequisites: true
          }
        },
        history: []
      },
      {
        nowProvider: () => '2026-02-21T13:41:00.000Z'
      }
    );

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_PREREQUISITES_INCOMPLETE',
      reason: 'Prérequis requis incomplets: PR-004.',
      diagnostics: {
        fromPhase: 'H04',
        toPhase: 'H05',
        totalCount: 1,
        returnedCount: 1,
        droppedCount: 0,
        blockedByGuard: true
      }
    });
    expect(result.entry).not.toBeNull();
    expect(result.history).toHaveLength(1);
    expect(result.history[0]).toMatchObject({
      fromPhase: 'H04',
      toPhase: 'H05',
      reasonCode: 'PHASE_PREREQUISITES_INCOMPLETE',
      allowed: false
    });
  });

  it('returns INVALID_PHASE without appending when from/to phase is not canonical', () => {
    const history = [
      makeHistoryEntry({
        fromPhase: 'H02',
        toPhase: 'H03',
        allowed: true,
        reasonCode: 'OK',
        reason: 'ok',
        timestamp: '2026-02-21T10:00:00.000Z'
      })
    ];
    const snapshot = JSON.parse(JSON.stringify(history));

    const result = recordPhaseTransitionHistory({
      fromPhase: 'H00',
      toPhase: 'H04',
      guardResult: makeGuardOk(),
      history
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE',
      diagnostics: {
        fromPhase: 'H00',
        toPhase: 'H04',
        totalCount: 1,
        returnedCount: 1,
        droppedCount: 0,
        blockedByGuard: false
      },
      entry: null
    });
    expect(result.history).toHaveLength(1);
    expect(history).toEqual(snapshot);
  });

  it('fails closed on invalid payloads (history missing or guardResult missing)', () => {
    const missingHistory = recordPhaseTransitionHistory({
      fromPhase: 'H03',
      toPhase: 'H04',
      guardResult: makeGuardOk(),
      history: null
    });

    expect(missingHistory).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_TRANSITION_HISTORY',
      entry: null,
      history: []
    });

    const missingGuard = recordPhaseTransitionHistory({
      fromPhase: 'H03',
      toPhase: 'H04',
      history: [
        makeHistoryEntry({
          fromPhase: 'H01',
          toPhase: 'H02',
          allowed: true,
          reasonCode: 'OK',
          reason: 'ok',
          timestamp: '2026-02-20T08:00:00.000Z'
        })
      ]
    });

    expect(missingGuard).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_TRANSITION_HISTORY',
      entry: null,
      diagnostics: {
        totalCount: 1,
        returnedCount: 1,
        droppedCount: 0,
        blockedByGuard: false
      }
    });
    expect(missingGuard.history).toHaveLength(1);
  });

  it('filters consulted history by query fields and returns newest entries first', () => {
    const result = recordPhaseTransitionHistory(
      {
        fromPhase: 'H05',
        toPhase: 'H06',
        guardResult: {
          allowed: false,
          reasonCode: 'GUARD_EXECUTION_FAILED',
          reason: 'Échec ultra-quality.',
          diagnostics: {
            failedCommand: 'CMD-009'
          }
        },
        history: [
          makeHistoryEntry({
            fromPhase: 'H04',
            toPhase: 'H05',
            allowed: false,
            reasonCode: 'GUARD_EXECUTION_FAILED',
            reason: 'Échec précédent',
            timestamp: '2026-02-21T13:00:00.000Z'
          }),
          makeHistoryEntry({
            fromPhase: 'H03',
            toPhase: 'H04',
            allowed: true,
            reasonCode: 'OK',
            reason: 'OK précédent',
            timestamp: '2026-02-21T12:00:00.000Z'
          }),
          makeHistoryEntry({
            fromPhase: 'H02',
            toPhase: 'H03',
            allowed: false,
            reasonCode: 'PHASE_PREREQUISITES_INCOMPLETE',
            reason: 'PR-002',
            timestamp: '2026-02-21T11:00:00.000Z'
          })
        ],
        query: {
          reasonCode: 'GUARD_EXECUTION_FAILED',
          allowed: false,
          limit: 2
        }
      },
      {
        nowProvider: () => '2026-02-21T13:45:00.000Z'
      }
    );

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'GUARD_EXECUTION_FAILED',
      diagnostics: {
        totalCount: 4,
        returnedCount: 2,
        droppedCount: 0,
        blockedByGuard: true
      }
    });

    expect(result.history).toHaveLength(2);
    expect(result.history[0]).toMatchObject({
      fromPhase: 'H05',
      toPhase: 'H06',
      reasonCode: 'GUARD_EXECUTION_FAILED'
    });
    expect(result.history[1]).toMatchObject({
      fromPhase: 'H04',
      toPhase: 'H05',
      reasonCode: 'GUARD_EXECUTION_FAILED'
    });
  });

  it('applies retention policy and reports droppedCount accurately', () => {
    const result = recordPhaseTransitionHistory(
      {
        fromPhase: 'H04',
        toPhase: 'H05',
        guardResult: makeGuardOk('OK H04 -> H05'),
        maxEntries: 2,
        history: [
          makeHistoryEntry({
            fromPhase: 'H01',
            toPhase: 'H02',
            allowed: true,
            reasonCode: 'OK',
            reason: 'first',
            timestamp: '2026-02-21T08:00:00.000Z'
          }),
          makeHistoryEntry({
            fromPhase: 'H02',
            toPhase: 'H03',
            allowed: true,
            reasonCode: 'OK',
            reason: 'second',
            timestamp: '2026-02-21T09:00:00.000Z'
          }),
          makeHistoryEntry({
            fromPhase: 'H03',
            toPhase: 'H04',
            allowed: true,
            reasonCode: 'OK',
            reason: 'third',
            timestamp: '2026-02-21T10:00:00.000Z'
          })
        ]
      },
      {
        nowProvider: () => '2026-02-21T11:00:00.000Z'
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        totalCount: 2,
        returnedCount: 2,
        droppedCount: 2,
        blockedByGuard: false
      }
    });

    expect(result.history).toHaveLength(2);
    expect(result.history[0]).toMatchObject({ fromPhase: 'H04', toPhase: 'H05' });
    expect(result.history[1]).toMatchObject({ fromPhase: 'H03', toPhase: 'H04' });
  });

  it('enforces consultation limit defaults and max cap', () => {
    const manyEntries = Array.from({ length: 260 }, (_, index) =>
      makeHistoryEntry({
        fromPhase: 'H03',
        toPhase: 'H04',
        allowed: true,
        reasonCode: 'OK',
        reason: `entry-${index}`,
        timestamp: new Date(Date.parse('2026-02-20T00:00:00.000Z') + index * 1_000).toISOString()
      })
    );

    const withMaxLimit = recordPhaseTransitionHistory(
      {
        fromPhase: 'H04',
        toPhase: 'H05',
        guardResult: makeGuardOk('OK with capped query limit'),
        history: manyEntries,
        query: {
          limit: 999
        }
      },
      {
        nowProvider: () => '2026-02-21T00:00:00.000Z'
      }
    );

    expect(withMaxLimit.diagnostics.totalCount).toBe(200);
    expect(withMaxLimit.diagnostics.returnedCount).toBe(200);
    expect(withMaxLimit.history).toHaveLength(200);

    const withDefaultLimit = recordPhaseTransitionHistory(
      {
        fromPhase: 'H04',
        toPhase: 'H05',
        guardResult: makeGuardOk('OK with default query limit'),
        history: []
      },
      {
        nowProvider: () => '2026-02-21T00:10:00.000Z'
      }
    );

    expect(withDefaultLimit.diagnostics.returnedCount).toBe(1);
    expect(withDefaultLimit.history).toHaveLength(1);
  });

  it('blocks override abuse without justification/approver and keeps trace in history', () => {
    const result = recordPhaseTransitionHistory(
      {
        fromPhase: 'H05',
        toPhase: 'H06',
        guardResult: makeGuardOk('Override demandé'),
        overrideAttempt: {
          requested: true,
          justification: '   ',
          approver: null,
          ticketId: 'OVR-001'
        },
        history: []
      },
      {
        nowProvider: () => '2026-02-21T13:55:00.000Z'
      }
    );

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'TRANSITION_NOT_ALLOWED',
      diagnostics: {
        blockedByGuard: true,
        totalCount: 1,
        returnedCount: 1
      }
    });

    expect(result.reason).toContain('Override exceptionnel refusé');
    expect(result.reason).toContain('justification, approver');

    expect(result.entry).toMatchObject({
      reasonCode: 'TRANSITION_NOT_ALLOWED',
      guardDiagnostics: {
        overrideAttempt: {
          requested: true,
          justification: null,
          approver: null,
          ticketId: 'OVR-001',
          missingFields: ['justification', 'approver']
        }
      }
    });

    expect(result.history[0]).toMatchObject({
      fromPhase: 'H05',
      toPhase: 'H06',
      reasonCode: 'TRANSITION_NOT_ALLOWED'
    });
  });

  it('allows traceable override attempt when justification and approver are provided', () => {
    const result = recordPhaseTransitionHistory(
      {
        fromPhase: 'H05',
        toPhase: 'H06',
        guardResult: makeGuardOk('Override exceptionnel approuvé.'),
        overrideAttempt: {
          requested: true,
          justification: 'Incident prod critique',
          approver: 'pm.owner',
          ticketId: 'OVR-002'
        },
        history: []
      },
      {
        nowProvider: () => '2026-02-21T13:56:00.000Z'
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        blockedByGuard: false,
        totalCount: 1,
        returnedCount: 1
      }
    });

    expect(result.entry).toMatchObject({
      reasonCode: 'OK',
      guardDiagnostics: {
        overrideAttempt: {
          requested: true,
          justification: 'Incident prod critique',
          approver: 'pm.owner',
          ticketId: 'OVR-002',
          missingFields: []
        }
      }
    });
  });

  it('keeps stable output contract and index export', () => {
    const result = recordFromIndex({
      fromPhase: 'H03',
      toPhase: 'H04',
      guardResult: makeGuardOk('contract'),
      history: []
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('entry');
    expect(result).toHaveProperty('history');

    expect(typeof result.allowed).toBe('boolean');
    expect(typeof result.reasonCode).toBe('string');
    expect(typeof result.reason).toBe('string');
    expect(typeof result.diagnostics.fromPhase).toBe('string');
    expect(typeof result.diagnostics.toPhase).toBe('string');
    expect(typeof result.diagnostics.totalCount).toBe('number');
    expect(typeof result.diagnostics.returnedCount).toBe('number');
    expect(typeof result.diagnostics.droppedCount).toBe('number');
    expect(typeof result.diagnostics.blockedByGuard).toBe('boolean');
    expect(result.entry).not.toBeNull();
    expect(Array.isArray(result.history)).toBe(true);
  });
});
