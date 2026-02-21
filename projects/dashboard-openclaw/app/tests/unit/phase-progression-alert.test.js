import { describe, expect, it, vi } from 'vitest';
import { evaluatePhaseProgressionAlert } from '../../src/phase-progression-alert.js';
import { evaluatePhaseProgressionAlert as evaluateFromIndex } from '../../src/index.js';

const PROGRESSION_REASON_CODES = new Set([
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
  'INVALID_PHASE_PROGRESSION_INPUT'
]);

function makeMatrixOk(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Matrice de dépendances prête pour owner=ops.lead: aucun blocage actif.',
    diagnostics: {
      fromPhase: 'H09',
      toPhase: 'H10',
      owner: 'ops.lead',
      sourceReasonCode: 'OK',
      snapshotAgeMs: 120,
      isStale: false
    },
    blockingDependencies: [],
    correctiveActions: [],
    ...overrides
  };
}

function makeMatrixBlocked(reasonCode, reason, overrides = {}) {
  return {
    allowed: false,
    reasonCode,
    reason,
    diagnostics: {
      fromPhase: 'H09',
      toPhase: 'H10',
      owner: 'ops.lead',
      sourceReasonCode: reasonCode,
      snapshotAgeMs: 180,
      isStale: reasonCode === 'DEPENDENCY_STATE_STALE'
    },
    blockingDependencies: [
      {
        id: 'TRANSITION',
        reasonCode,
        reason,
        owner: 'ops.lead'
      }
    ],
    correctiveActions: ['PUBLISH_PHASE_NOTIFICATION'],
    ...overrides
  };
}

function makeHistoryEntry(overrides = {}) {
  return {
    fromPhase: 'H08',
    toPhase: 'H09',
    allowed: false,
    reasonCode: 'PHASE_PREREQUISITES_INCOMPLETE',
    reason: 'Prérequis incomplets PR-003.',
    timestamp: '2026-02-21T15:00:00.000Z',
    ...overrides
  };
}

describe('phase-progression-alert unit', () => {
  it('returns nominal OK alert when dependency matrix is ready and no anomaly is detected', () => {
    const result = evaluatePhaseProgressionAlert({
      dependencyMatrix: makeMatrixOk(),
      historyEntries: []
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        fromPhase: 'H09',
        toPhase: 'H10',
        owner: 'ops.lead',
        sourceReasonCode: 'OK',
        historyBlockedCount: 0,
        lookbackEntries: 20,
        escalationThreshold: 3,
        dependencyAgeMs: 120,
        isStale: false,
        blockedDependenciesCount: 0
      },
      alert: {
        active: false,
        severity: 'info'
      },
      anomalies: [],
      correctiveActions: []
    });
  });

  it('propagates dependency blockers strictly with owner context and corrective actions', () => {
    const matrixReason =
      'Transition bloquée pour owner=alex.pm: Notification de phase manquante pour H09 -> H10.';

    const result = evaluatePhaseProgressionAlert({
      dependencyMatrix: makeMatrixBlocked('PHASE_NOTIFICATION_MISSING', matrixReason, {
        diagnostics: {
          fromPhase: 'H09',
          toPhase: 'H10',
          owner: 'alex.pm',
          sourceReasonCode: 'PHASE_NOTIFICATION_MISSING',
          snapshotAgeMs: 220,
          isStale: false
        },
        blockingDependencies: [
          {
            id: 'TRANSITION',
            reasonCode: 'PHASE_NOTIFICATION_MISSING',
            reason: matrixReason,
            owner: 'alex.pm'
          }
        ],
        correctiveActions: ['PUBLISH_PHASE_NOTIFICATION']
      }),
      historyEntries: [
        makeHistoryEntry({
          timestamp: '2026-02-21T15:02:00.000Z',
          allowed: false,
          reasonCode: 'PHASE_NOTIFICATION_MISSING',
          reason: 'Notification absente en historique récent.'
        })
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_NOTIFICATION_MISSING',
      reason: matrixReason,
      diagnostics: {
        owner: 'alex.pm',
        sourceReasonCode: 'PHASE_NOTIFICATION_MISSING',
        blockedDependenciesCount: 1
      },
      alert: {
        active: true,
        severity: 'warning'
      },
      correctiveActions: ['PUBLISH_PHASE_NOTIFICATION']
    });

    expect(result.alert.message).toContain('owner=alex.pm');
    expect(result.diagnostics.blockingDependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'TRANSITION',
          reasonCode: 'PHASE_NOTIFICATION_MISSING'
        })
      ])
    );
  });

  it('detects canonical sequence gap and recommends REVIEW_PHASE_SEQUENCE', () => {
    const result = evaluatePhaseProgressionAlert({
      dependencyMatrix: makeMatrixOk({
        diagnostics: {
          fromPhase: 'H09',
          toPhase: 'H11',
          owner: 'ops.lead',
          sourceReasonCode: 'OK',
          snapshotAgeMs: 95,
          isStale: false
        }
      }),
      historyEntries: []
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_SEQUENCE_GAP_DETECTED',
      alert: {
        active: true,
        severity: 'warning'
      },
      anomalies: [
        {
          code: 'PHASE_SEQUENCE_GAP_DETECTED'
        }
      ],
      correctiveActions: ['REVIEW_PHASE_SEQUENCE']
    });
    expect(result.reason).toContain('fromPhase=H09');
    expect(result.reason).toContain('toPhase=H11');
  });

  it('detects canonical sequence regression and recommends ROLLBACK_TO_CANONICAL_PHASE', () => {
    const result = evaluatePhaseProgressionAlert({
      dependencyMatrix: makeMatrixOk({
        diagnostics: {
          fromPhase: 'H10',
          toPhase: 'H09',
          owner: 'ops.lead',
          sourceReasonCode: 'OK',
          snapshotAgeMs: 100,
          isStale: false
        }
      })
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_SEQUENCE_REGRESSION_DETECTED',
      alert: {
        active: true,
        severity: 'warning'
      },
      anomalies: [
        {
          code: 'PHASE_SEQUENCE_REGRESSION_DETECTED'
        }
      ],
      correctiveActions: ['ROLLBACK_TO_CANONICAL_PHASE']
    });
    expect(result.reason).toContain('indexDiff=-1');
  });

  it('escalates repeated blocking anomaly when threshold is reached in recent history', () => {
    const result = evaluatePhaseProgressionAlert({
      dependencyMatrix: makeMatrixOk(),
      lookbackEntries: 5,
      escalationThreshold: 3,
      historyEntries: [
        makeHistoryEntry({
          timestamp: '2026-02-21T15:05:00.000Z',
          allowed: false,
          reasonCode: 'PHASE_NOTIFICATION_MISSING',
          reason: 'Blocage 1'
        }),
        makeHistoryEntry({
          timestamp: '2026-02-21T15:04:00.000Z',
          allowed: true,
          reasonCode: 'OK',
          reason: 'Transition validée'
        }),
        makeHistoryEntry({
          timestamp: '2026-02-21T15:03:00.000Z',
          allowed: false,
          reasonCode: 'PHASE_PREREQUISITES_INCOMPLETE',
          reason: 'Blocage 2'
        }),
        makeHistoryEntry({
          timestamp: '2026-02-21T15:02:00.000Z',
          allowed: false,
          reasonCode: 'TRANSITION_NOT_ALLOWED',
          reason: 'Blocage 3'
        }),
        makeHistoryEntry({
          timestamp: '2026-02-21T15:01:00.000Z',
          allowed: true,
          reasonCode: 'OK',
          reason: 'Transition validée anciennement'
        })
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'REPEATED_BLOCKING_ANOMALY',
      diagnostics: {
        historyBlockedCount: 3,
        lookbackEntries: 5,
        escalationThreshold: 3
      },
      alert: {
        active: true,
        severity: 'critical'
      },
      anomalies: [
        {
          code: 'REPEATED_BLOCKING_ANOMALY'
        }
      ],
      correctiveActions: ['ESCALATE_TO_PM']
    });
    expect(result.reason).toContain('owner=ops.lead');
  });

  it('propagates stale dependency state and keeps refresh actions', () => {
    const staleReason =
      'Matrice de dépendances stale pour owner=ops.lead: snapshotAgeMs=7000 > maxRefreshIntervalMs=5000.';

    const result = evaluatePhaseProgressionAlert({
      dependencyMatrix: makeMatrixBlocked('DEPENDENCY_STATE_STALE', staleReason, {
        diagnostics: {
          fromPhase: 'H09',
          toPhase: 'H10',
          owner: 'ops.lead',
          sourceReasonCode: 'OK',
          snapshotAgeMs: 7000,
          isStale: true
        },
        blockingDependencies: [
          {
            id: 'FRESHNESS',
            reasonCode: 'DEPENDENCY_STATE_STALE',
            reason: staleReason,
            owner: 'ops.lead'
          }
        ],
        correctiveActions: ['REFRESH_DEPENDENCY_MATRIX']
      })
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'DEPENDENCY_STATE_STALE',
      diagnostics: {
        isStale: true,
        dependencyAgeMs: 7000,
        blockedDependenciesCount: 1
      },
      anomalies: [
        {
          code: 'DEPENDENCY_STATE_STALE'
        }
      ],
      correctiveActions: ['REFRESH_DEPENDENCY_MATRIX']
    });
  });

  it('delegates to S009 builder when dependencyMatrixInput is provided and preserves source immutability', () => {
    const input = {
      dependencyMatrixInput: {
        owner: 'ops.lead',
        metadata: {
          path: ['start']
        }
      },
      historyEntries: [
        makeHistoryEntry({
          allowed: true,
          reasonCode: 'OK',
          reason: 'Transition validée',
          timestamp: '2026-02-21T15:07:00.000Z'
        })
      ]
    };

    const snapshot = JSON.parse(JSON.stringify(input));

    const dependencyMatrixBuilder = vi.fn().mockImplementation((payload) => {
      payload.metadata.path.push('mutated-by-builder');

      return makeMatrixOk({
        diagnostics: {
          fromPhase: 'H09',
          toPhase: 'H10',
          owner: payload.owner,
          sourceReasonCode: 'OK',
          snapshotAgeMs: 110,
          isStale: false
        }
      });
    });

    const result = evaluatePhaseProgressionAlert(input, {
      dependencyMatrixBuilder
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        owner: 'ops.lead',
        sourceReasonCode: 'OK'
      }
    });

    expect(dependencyMatrixBuilder).toHaveBeenCalledTimes(1);
    expect(dependencyMatrixBuilder.mock.calls[0][0].metadata.path).toEqual([
      'start',
      'mutated-by-builder'
    ]);
    expect(input).toEqual(snapshot);
  });

  it('returns INVALID_PHASE_PROGRESSION_INPUT when dependency source is missing', () => {
    const result = evaluatePhaseProgressionAlert({
      historyEntries: []
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE_PROGRESSION_INPUT',
      anomalies: [],
      correctiveActions: []
    });
    expect(result.reason).toContain('dependencyMatrix ou dependencyMatrixInput est requis');
  });

  it('returns stable output contract and index export compatibility', () => {
    const result = evaluateFromIndex({
      dependencyMatrix: makeMatrixOk(),
      historyEntries: []
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('alert');
    expect(result).toHaveProperty('anomalies');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(PROGRESSION_REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(typeof result.reason).toBe('string');

    expect(result.diagnostics).toHaveProperty('fromPhase');
    expect(result.diagnostics).toHaveProperty('toPhase');
    expect(result.diagnostics).toHaveProperty('owner');
    expect(result.diagnostics).toHaveProperty('sourceReasonCode');
    expect(result.diagnostics).toHaveProperty('historyBlockedCount');
    expect(result.diagnostics).toHaveProperty('lookbackEntries');
    expect(result.diagnostics).toHaveProperty('escalationThreshold');
    expect(result.diagnostics).toHaveProperty('dependencyAgeMs');
    expect(result.diagnostics).toHaveProperty('isStale');
    expect(result.diagnostics).toHaveProperty('blockingDependencies');
    expect(result.diagnostics).toHaveProperty('blockedDependenciesCount');

    expect(result.alert).toHaveProperty('active');
    expect(result.alert).toHaveProperty('severity');
    expect(result.alert).toHaveProperty('message');

    expect(Array.isArray(result.anomalies)).toBe(true);
    expect(Array.isArray(result.correctiveActions)).toBe(true);
  });
});
