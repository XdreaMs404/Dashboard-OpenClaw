import { describe, expect, it, vi } from 'vitest';
import { recordPhaseTransitionHistory } from '../../src/phase-transition-history.js';

function guardOk(reasonCode = 'OK', reason = 'Guards OK') {
  return {
    allowed: true,
    reasonCode,
    reason,
    diagnostics: {
      executedCount: 2
    }
  };
}

function guardBlocked(reasonCode = 'GUARD_EXECUTION_FAILED', reason = 'Guard KO') {
  return {
    allowed: false,
    reasonCode,
    reason,
    diagnostics: {
      failedCommand: 'CMD-009'
    }
  };
}

function entry(index, reasonCode = 'OK', allowed = true) {
  return {
    fromPhase: 'H03',
    toPhase: 'H04',
    allowed,
    reasonCode,
    reason: `entry-${index}`,
    timestamp: new Date(Date.parse('2026-02-21T00:00:00.000Z') + index * 1_000).toISOString()
  };
}

describe('phase-transition-history edge cases', () => {
  it('fails closed on non-object input', () => {
    const samples = [undefined, null, true, 42, 'S006'];

    for (const sample of samples) {
      const result = recordPhaseTransitionHistory(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_TRANSITION_HISTORY',
        entry: null,
        history: []
      });
    }
  });

  it('normalizes lowercase/trimmed phase values to canonical Hxx', () => {
    const result = recordPhaseTransitionHistory(
      {
        fromPhase: ' h03 ',
        toPhase: ' h04 ',
        guardResult: guardOk('OK', 'Normalized phases'),
        history: []
      },
      {
        nowProvider: () => '2026-02-21T15:00:00.000Z'
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        fromPhase: 'H03',
        toPhase: 'H04'
      }
    });
    expect(result.entry).toMatchObject({
      fromPhase: 'H03',
      toPhase: 'H04'
    });
  });

  it('rejects guardResult when reasonCode is unknown', () => {
    const result = recordPhaseTransitionHistory({
      fromPhase: 'H03',
      toPhase: 'H04',
      history: [entry(1)],
      guardResult: {
        allowed: false,
        reasonCode: 'UPSTREAM_UNKNOWN',
        reason: 'unknown code'
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_TRANSITION_HISTORY',
      diagnostics: {
        totalCount: 1,
        returnedCount: 1,
        blockedByGuard: false
      },
      entry: null
    });
  });

  it('rejects guardResult when reason is empty', () => {
    const result = recordPhaseTransitionHistory({
      fromPhase: 'H03',
      toPhase: 'H04',
      history: [],
      guardResult: {
        allowed: true,
        reasonCode: 'OK',
        reason: '   '
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_TRANSITION_HISTORY',
      entry: null,
      history: []
    });
  });

  it('rejects incoherent guard contracts (allowed=true with non-OK code)', () => {
    const result = recordPhaseTransitionHistory({
      fromPhase: 'H04',
      toPhase: 'H05',
      history: [entry(1)],
      guardResult: guardOk('TRANSITION_NOT_ALLOWED', 'incoherent')
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_TRANSITION_HISTORY',
      entry: null
    });
  });

  it('rejects incoherent guard contracts (allowed=false with OK code)', () => {
    const result = recordPhaseTransitionHistory({
      fromPhase: 'H04',
      toPhase: 'H05',
      history: [entry(1)],
      guardResult: {
        allowed: false,
        reasonCode: 'OK',
        reason: 'incoherent'
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_TRANSITION_HISTORY',
      entry: null
    });
  });

  it('ignores non-object history entries without throwing', () => {
    const result = recordPhaseTransitionHistory(
      {
        fromPhase: 'H05',
        toPhase: 'H06',
        guardResult: guardOk(),
        history: [null, 42, 'raw', entry(1)]
      },
      {
        nowProvider: () => '2026-02-21T15:10:00.000Z'
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        totalCount: 2,
        returnedCount: 2,
        droppedCount: 0
      }
    });
  });

  it('applies default consultation limit=50 when query is missing/invalid', () => {
    const history = Array.from({ length: 80 }, (_, index) => entry(index));

    const resultMissingQuery = recordPhaseTransitionHistory(
      {
        fromPhase: 'H06',
        toPhase: 'H07',
        guardResult: guardOk(),
        history
      },
      { nowProvider: () => '2026-02-21T16:00:00.000Z' }
    );

    expect(resultMissingQuery.diagnostics.totalCount).toBe(81);
    expect(resultMissingQuery.diagnostics.returnedCount).toBe(50);
    expect(resultMissingQuery.history).toHaveLength(50);

    const resultInvalidQuery = recordPhaseTransitionHistory(
      {
        fromPhase: 'H06',
        toPhase: 'H07',
        guardResult: guardOk(),
        history,
        query: 'not-an-object'
      },
      { nowProvider: () => '2026-02-21T16:00:10.000Z' }
    );

    expect(resultInvalidQuery.diagnostics.returnedCount).toBe(50);
  });

  it('caps retention maxEntries to 1000 when higher value is requested', () => {
    const history = Array.from({ length: 1200 }, (_, index) => entry(index));

    const result = recordPhaseTransitionHistory(
      {
        fromPhase: 'H07',
        toPhase: 'H08',
        guardResult: guardOk(),
        history,
        maxEntries: 5000,
        query: { limit: 200 }
      },
      {
        nowProvider: () => '2026-02-21T17:00:00.000Z'
      }
    );

    expect(result.diagnostics.totalCount).toBe(1000);
    expect(result.diagnostics.droppedCount).toBe(201);
    expect(result.history).toHaveLength(200);
  });

  it('accepts string values for maxEntries and query.limit', () => {
    const result = recordPhaseTransitionHistory(
      {
        fromPhase: 'H08',
        toPhase: 'H09',
        guardResult: guardOk(),
        history: [entry(1), entry(2), entry(3)],
        maxEntries: '2',
        query: {
          limit: '1'
        }
      },
      {
        nowProvider: () => '2026-02-21T18:00:00.000Z'
      }
    );

    expect(result.diagnostics.totalCount).toBe(2);
    expect(result.diagnostics.returnedCount).toBe(1);
    expect(result.history).toHaveLength(1);
  });

  it('filters by query.fromPhase/query.toPhase/query.allowed/query.reasonCode together', () => {
    const result = recordPhaseTransitionHistory(
      {
        fromPhase: 'H09',
        toPhase: 'H10',
        guardResult: guardBlocked('GUARD_EXECUTION_FAILED', 'new-blocked'),
        history: [
          {
            fromPhase: 'H09',
            toPhase: 'H10',
            allowed: false,
            reasonCode: 'GUARD_EXECUTION_FAILED',
            reason: 'prev-blocked',
            timestamp: '2026-02-21T10:00:00.000Z'
          },
          {
            fromPhase: 'H09',
            toPhase: 'H10',
            allowed: true,
            reasonCode: 'OK',
            reason: 'prev-ok',
            timestamp: '2026-02-21T11:00:00.000Z'
          },
          {
            fromPhase: 'H08',
            toPhase: 'H09',
            allowed: false,
            reasonCode: 'GUARD_EXECUTION_FAILED',
            reason: 'other-transition',
            timestamp: '2026-02-21T12:00:00.000Z'
          }
        ],
        query: {
          fromPhase: 'h09',
          toPhase: ' h10 ',
          allowed: false,
          reasonCode: 'GUARD_EXECUTION_FAILED',
          limit: 10
        }
      },
      {
        nowProvider: () => '2026-02-21T13:00:00.000Z'
      }
    );

    expect(result.history).toHaveLength(2);
    expect(result.history[0]).toMatchObject({
      fromPhase: 'H09',
      toPhase: 'H10',
      reasonCode: 'GUARD_EXECUTION_FAILED',
      allowed: false,
      reason: 'new-blocked'
    });
    expect(result.history[1]).toMatchObject({
      fromPhase: 'H09',
      toPhase: 'H10',
      reasonCode: 'GUARD_EXECUTION_FAILED',
      allowed: false,
      reason: 'prev-blocked'
    });
  });

  it('treats entries with invalid timestamps as oldest in sorting', () => {
    const result = recordPhaseTransitionHistory(
      {
        fromPhase: 'H10',
        toPhase: 'H11',
        guardResult: guardOk('OK', 'newest'),
        history: [
          {
            fromPhase: 'H01',
            toPhase: 'H02',
            allowed: true,
            reasonCode: 'OK',
            reason: 'invalid-ts',
            timestamp: 'not-a-date'
          },
          {
            fromPhase: 'H02',
            toPhase: 'H03',
            allowed: true,
            reasonCode: 'OK',
            reason: 'older-valid',
            timestamp: '2026-02-21T00:00:00.000Z'
          }
        ]
      },
      {
        nowProvider: () => '2026-02-21T19:00:00.000Z'
      }
    );

    expect(result.history[0]).toMatchObject({ reason: 'newest' });
    expect(result.history[1]).toMatchObject({ reason: 'older-valid' });
    expect(result.history[2]).toMatchObject({ reason: 'invalid-ts' });
  });

  it('uses payload recordedAt/timestamp when provided', () => {
    const withRecordedAt = recordPhaseTransitionHistory({
      fromPhase: 'H11',
      toPhase: 'H12',
      guardResult: guardOk('OK', 'recordedAt-used'),
      history: [],
      recordedAt: '2026-02-21T20:00:00.000Z'
    });

    expect(withRecordedAt.entry).toMatchObject({
      timestamp: '2026-02-21T20:00:00.000Z'
    });

    const withTimestamp = recordPhaseTransitionHistory({
      fromPhase: 'H11',
      toPhase: 'H12',
      guardResult: guardOk('OK', 'timestamp-used'),
      history: [],
      timestamp: '2026-02-21T20:10:00.000Z'
    });

    expect(withTimestamp.entry).toMatchObject({
      timestamp: '2026-02-21T20:10:00.000Z'
    });
  });

  it('falls back to Date.now when nowProvider returns invalid value', () => {
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-02-21T21:00:00.000Z'));

    try {
      const result = recordPhaseTransitionHistory(
        {
          fromPhase: 'H12',
          toPhase: 'H13',
          guardResult: guardOk(),
          history: []
        },
        {
          nowProvider: () => 'invalid-now'
        }
      );

      expect(result.entry).toMatchObject({ timestamp: '2026-02-21T21:00:00.000Z' });
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it('does not mutate input payload and source history objects', () => {
    const sourceHistory = [entry(1), entry(2)];

    const input = {
      fromPhase: 'H13',
      toPhase: 'H14',
      guardResult: guardBlocked('PHASE_PREREQUISITES_MISSING', 'missing prereq'),
      history: sourceHistory,
      query: {
        allowed: false,
        limit: 5
      }
    };

    const snapshot = JSON.parse(JSON.stringify(input));

    const result = recordPhaseTransitionHistory(input, {
      nowProvider: () => '2026-02-21T22:00:00.000Z'
    });

    expect(input).toEqual(snapshot);
    expect(result.history).not.toBe(sourceHistory);
    expect(result.history[0]).not.toBe(sourceHistory[0]);
  });

  it('keeps existing consulted history on invalid phase and does not append', () => {
    const history = [
      {
        fromPhase: 'H01',
        toPhase: 'H02',
        allowed: true,
        reasonCode: 'OK',
        reason: 'first',
        timestamp: '2026-02-21T10:00:00.000Z'
      },
      {
        fromPhase: 'H02',
        toPhase: 'H03',
        allowed: true,
        reasonCode: 'OK',
        reason: 'second',
        timestamp: '2026-02-21T11:00:00.000Z'
      }
    ];

    const result = recordPhaseTransitionHistory({
      fromPhase: 'H98',
      toPhase: 'H03',
      guardResult: guardOk(),
      history,
      query: {
        limit: 1
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE',
      entry: null,
      diagnostics: {
        totalCount: 2,
        returnedCount: 1,
        droppedCount: 0,
        blockedByGuard: false
      }
    });
    expect(result.history).toHaveLength(1);
    expect(result.history[0]).toMatchObject({ reason: 'second' });
  });

  it('rejects guardResult when allowed is not boolean', () => {
    const result = recordPhaseTransitionHistory({
      fromPhase: 'H03',
      toPhase: 'H04',
      history: [entry(1)],
      guardResult: {
        allowed: 'false',
        reasonCode: 'PHASE_PREREQUISITES_MISSING',
        reason: 'invalid type'
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_TRANSITION_HISTORY',
      entry: null,
      diagnostics: {
        totalCount: 1,
        returnedCount: 1
      }
    });
  });

  it('covers Date/number/blank timestamps, tie-break ordering and fallback normalized entry fields', () => {
    const sameMs = Date.parse('2026-02-21T23:00:00.000Z');

    const result = recordPhaseTransitionHistory(
      {
        fromPhase: 'H14',
        toPhase: 'H15',
        guardResult: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'new-entry',
          diagnostics: {
            commands: ['CMD-008', 'CMD-009']
          }
        },
        history: [
          {
            fromPhase: 'H01',
            toPhase: 'H02',
            allowed: true,
            reasonCode: 'OK',
            reason: 'date-ts',
            timestamp: new Date(sameMs)
          },
          {
            fromPhase: 'H01',
            toPhase: 'H02',
            allowed: true,
            reasonCode: 'OK',
            reason: 'number-ts',
            timestamp: sameMs
          },
          {
            fromPhase: 42,
            toPhase: null,
            allowed: 'yes',
            reasonCode: '',
            reason: 0,
            timestamp: ''
          }
        ],
        recordedAt: '2026-02-22T00:00:00.000Z',
        query: {
          limit: 10
        }
      },
      {
        nowProvider: () => '2026-02-22T00:01:00.000Z'
      }
    );

    expect(result.history[0]).toMatchObject({ reason: 'new-entry' });
    expect(result.history[1]).toMatchObject({ reason: 'number-ts' });
    expect(result.history[2]).toMatchObject({ reason: 'date-ts' });
    expect(result.history[3]).toMatchObject({
      fromPhase: '',
      toPhase: '',
      allowed: null,
      reasonCode: null,
      reason: '',
      timestamp: null
    });

    expect(result.entry.guardDiagnostics).toEqual({
      commands: ['CMD-008', 'CMD-009']
    });
  });

  it('applies query.toPhase mismatch filtering branch and keeps diagnostics null when absent', () => {
    const result = recordPhaseTransitionHistory(
      {
        fromPhase: 'H15',
        toPhase: 'H16',
        guardResult: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'query-mismatch',
          diagnostics: 'not-an-object'
        },
        history: [
          {
            fromPhase: 'H15',
            toPhase: 'H16',
            allowed: true,
            reasonCode: 'OK',
            reason: 'previous',
            timestamp: '2026-02-21T10:00:00.000Z'
          }
        ],
        query: {
          fromPhase: 'H15',
          toPhase: 'H99',
          limit: 10
        }
      },
      {
        nowProvider: () => '2026-02-21T10:10:00.000Z'
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        totalCount: 2,
        returnedCount: 0
      }
    });
    expect(result.entry).toMatchObject({
      guardDiagnostics: null
    });
    expect(result.history).toHaveLength(0);
  });
});
