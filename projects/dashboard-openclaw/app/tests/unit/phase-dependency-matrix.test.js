import { describe, expect, it } from 'vitest';
import { buildPhaseDependencyMatrix } from '../../src/phase-dependency-matrix.js';
import { buildPhaseDependencyMatrix as buildFromIndex } from '../../src/index.js';

const MATRIX_REASON_CODES = new Set([
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
  'INVALID_PHASE_DEPENDENCY_INPUT'
]);

function makeTransitionOk(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Transition autorisée H04 -> H05.',
    diagnostics: {
      fromIndex: 3,
      toIndex: 4,
      elapsedMs: 120_000,
      slaMs: 600_000
    },
    ...overrides
  };
}

function makeTransitionBlocked(reasonCode, reason, overrides = {}) {
  return {
    allowed: false,
    reasonCode,
    reason,
    diagnostics: {
      fromIndex: 3,
      toIndex: 4,
      elapsedMs: null,
      slaMs: 600_000
    },
    ...overrides
  };
}

function makePrerequisitesOk(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Prérequis validés pour transition H04 -> H05.',
    diagnostics: {
      fromPhase: 'H04',
      toPhase: 'H05',
      requiredCount: 2,
      satisfiedCount: 2,
      missingPrerequisiteIds: []
    },
    ...overrides
  };
}

function makePrerequisitesBlocked(reasonCode, reason, overrides = {}) {
  return {
    allowed: false,
    reasonCode,
    reason,
    diagnostics: {
      fromPhase: 'H04',
      toPhase: 'H05',
      requiredCount: 3,
      satisfiedCount: 1,
      missingPrerequisiteIds: ['PR-002', 'PR-003']
    },
    ...overrides
  };
}

describe('phase-dependency-matrix unit', () => {
  it('returns nominal OK matrix without blockers when transition and prerequisites are valid', () => {
    const result = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: makeTransitionOk(),
      prerequisitesValidation: makePrerequisitesOk(),
      snapshotAgeMs: 800,
      maxRefreshIntervalMs: 5_000
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        fromPhase: 'H04',
        toPhase: 'H05',
        owner: 'ops.lead',
        snapshotAgeMs: 800,
        maxRefreshIntervalMs: 5_000,
        isStale: false,
        totalDependencies: 4,
        blockedDependenciesCount: 0,
        sourceReasonCode: 'OK'
      },
      blockingDependencies: [],
      correctiveActions: []
    });

    expect(result.dependencies).toHaveLength(4);
    expect(result.dependencies.find((dependency) => dependency.id === 'TRANSITION')).toMatchObject({
      status: 'ready',
      blocking: false,
      reasonCode: 'OK'
    });
    expect(
      result.dependencies.find((dependency) => dependency.id === 'PREREQUISITES')
    ).toMatchObject({
      status: 'ready',
      blocking: false,
      reasonCode: 'OK'
    });
    expect(result.dependencies.find((dependency) => dependency.id === 'OVERRIDE')).toMatchObject({
      status: 'ready',
      blocking: false,
      reasonCode: 'OK'
    });
    expect(result.dependencies.find((dependency) => dependency.id === 'FRESHNESS')).toMatchObject({
      status: 'ready',
      blocking: false,
      reasonCode: 'OK'
    });
  });

  it('blocks on transition failures with explicit owner in reason and blocker list', () => {
    const result = buildPhaseDependencyMatrix({
      owner: 'alex.pm',
      transitionValidation: makeTransitionBlocked(
        'TRANSITION_NOT_ALLOWED',
        'Transition non autorisée H04 -> H06.'
      ),
      prerequisitesValidation: makePrerequisitesOk(),
      snapshotAgeMs: 50
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'TRANSITION_NOT_ALLOWED',
      diagnostics: {
        owner: 'alex.pm',
        sourceReasonCode: 'TRANSITION_NOT_ALLOWED'
      }
    });
    expect(result.reason).toContain('owner=alex.pm');

    expect(result.blockingDependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'TRANSITION',
          reasonCode: 'TRANSITION_NOT_ALLOWED'
        })
      ])
    );
    expect(result.correctiveActions).toContain('ALIGN_PHASE_SEQUENCE');
  });

  it('propagates prerequisites blockers and recommends COMPLETE_PREREQUISITES', () => {
    const result = buildPhaseDependencyMatrix({
      owner: 'ux.owner',
      transitionValidation: makeTransitionOk(),
      prerequisitesValidation: makePrerequisitesBlocked(
        'PHASE_PREREQUISITES_INCOMPLETE',
        'Prérequis requis incomplets: PR-002, PR-003.'
      )
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_PREREQUISITES_INCOMPLETE',
      diagnostics: {
        owner: 'ux.owner',
        sourceReasonCode: 'PHASE_PREREQUISITES_INCOMPLETE'
      }
    });
    expect(result.blockingDependencies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'PREREQUISITES',
          reasonCode: 'PHASE_PREREQUISITES_INCOMPLETE'
        })
      ])
    );
    expect(result.correctiveActions).toContain('COMPLETE_PREREQUISITES');
  });

  it('integrates override context and recommends REQUEST_OVERRIDE_APPROVAL when override is not applied', () => {
    const result = buildPhaseDependencyMatrix({
      owner: 'qa.owner',
      transitionValidation: makeTransitionBlocked(
        'PHASE_NOTIFICATION_MISSING',
        'notificationPublishedAt requis.'
      ),
      prerequisitesValidation: makePrerequisitesOk(),
      overrideEvaluation: {
        allowed: false,
        reasonCode: 'OVERRIDE_REQUEST_MISSING',
        reason: 'overrideRequest est requis pour un blocage éligible.',
        diagnostics: {
          sourceReasonCode: 'PHASE_NOTIFICATION_MISSING'
        },
        override: {
          required: true,
          applied: false
        },
        requiredActions: ['CAPTURE_JUSTIFICATION', 'CAPTURE_APPROVER']
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'OVERRIDE_REQUEST_MISSING',
      diagnostics: {
        owner: 'qa.owner',
        sourceReasonCode: 'PHASE_NOTIFICATION_MISSING'
      }
    });

    expect(result.dependencies.find((dependency) => dependency.id === 'OVERRIDE')).toMatchObject({
      status: 'blocked',
      blocking: true,
      reasonCode: 'OVERRIDE_REQUEST_MISSING'
    });
    expect(result.correctiveActions).toEqual(
      expect.arrayContaining(['REQUEST_OVERRIDE_APPROVAL', 'PUBLISH_PHASE_NOTIFICATION'])
    );
  });

  it('marks transition as overridden and lifts transition blocker when override is applied', () => {
    const result = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: makeTransitionBlocked(
        'TRANSITION_NOT_ALLOWED',
        'Transition non autorisée H04 -> H06.'
      ),
      prerequisitesValidation: makePrerequisitesOk(),
      overrideEvaluation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Override exceptionnel approuvé pour le blocage TRANSITION_NOT_ALLOWED.',
        diagnostics: {
          sourceReasonCode: 'TRANSITION_NOT_ALLOWED'
        },
        override: {
          required: true,
          applied: true
        },
        requiredActions: ['REVALIDATE_TRANSITION', 'RECORD_OVERRIDE_AUDIT']
      }
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      blockingDependencies: []
    });

    expect(result.dependencies.find((dependency) => dependency.id === 'TRANSITION')).toMatchObject({
      status: 'overridden',
      blocking: false,
      reasonCode: 'TRANSITION_NOT_ALLOWED'
    });
    expect(result.dependencies.find((dependency) => dependency.id === 'OVERRIDE')).toMatchObject({
      status: 'overridden',
      blocking: false,
      reasonCode: 'OK'
    });
  });

  it('detects stale matrix state and returns DEPENDENCY_STATE_STALE with refresh action', () => {
    const result = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: makeTransitionOk(),
      prerequisitesValidation: makePrerequisitesOk(),
      snapshotAgeMs: 5_001,
      maxRefreshIntervalMs: 5_000
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'DEPENDENCY_STATE_STALE',
      diagnostics: {
        isStale: true,
        snapshotAgeMs: 5_001,
        maxRefreshIntervalMs: 5_000
      },
      correctiveActions: ['REFRESH_DEPENDENCY_MATRIX']
    });

    expect(result.dependencies.find((dependency) => dependency.id === 'FRESHNESS')).toMatchObject({
      status: 'stale',
      blocking: true,
      reasonCode: 'DEPENDENCY_STATE_STALE'
    });
  });

  it('delegates to S002 and S004 when transitionInput and prerequisitesInput are provided', () => {
    const result = buildPhaseDependencyMatrix({
      owner: 'dev.owner',
      transitionInput: {
        fromPhase: 'H04',
        toPhase: 'H05',
        transitionRequestedAt: '2026-02-21T15:30:00.000Z',
        notificationPublishedAt: '2026-02-21T15:26:00.000Z',
        notificationSlaMinutes: 10
      },
      prerequisitesInput: {
        prerequisites: [
          { id: 'PR-001', required: true, status: 'done' },
          { id: 'PR-002', required: true, status: 'done' }
        ]
      },
      snapshotAgeMs: 120
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        fromPhase: 'H04',
        toPhase: 'H05',
        owner: 'dev.owner',
        sourceReasonCode: 'OK'
      }
    });
  });

  it('uses owner from phaseStateInput (S003) when owner is not provided directly', () => {
    const result = buildFromIndex({
      transitionValidation: makeTransitionOk(),
      prerequisitesValidation: makePrerequisitesOk(),
      phaseStateInput: {
        phaseId: 'H04',
        owner: 'fallback.owner',
        startedAt: '2026-02-21T15:20:00.000Z',
        finishedAt: null,
        nowAt: '2026-02-21T15:30:00.000Z'
      }
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        owner: 'fallback.owner'
      }
    });
  });

  it('returns INVALID_PHASE_DEPENDENCY_INPUT when required sources are missing', () => {
    const result = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      snapshotAgeMs: 100
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE_DEPENDENCY_INPUT',
      dependencies: [],
      blockingDependencies: [],
      correctiveActions: []
    });
    expect(result.reason).toContain('transitionValidation ou transitionInput est requis');
  });

  it('keeps stable output contract and reasonCode set', () => {
    const result = buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: makeTransitionOk(),
      prerequisitesValidation: makePrerequisitesOk()
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('dependencies');
    expect(result).toHaveProperty('blockingDependencies');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(MATRIX_REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(typeof result.reason).toBe('string');

    expect(result.diagnostics).toHaveProperty('fromPhase');
    expect(result.diagnostics).toHaveProperty('toPhase');
    expect(result.diagnostics).toHaveProperty('owner');
    expect(result.diagnostics).toHaveProperty('snapshotAgeMs');
    expect(result.diagnostics).toHaveProperty('maxRefreshIntervalMs');
    expect(result.diagnostics).toHaveProperty('isStale');
    expect(result.diagnostics).toHaveProperty('totalDependencies');
    expect(result.diagnostics).toHaveProperty('blockedDependenciesCount');
    expect(result.diagnostics).toHaveProperty('sourceReasonCode');

    expect(Array.isArray(result.dependencies)).toBe(true);
    expect(Array.isArray(result.blockingDependencies)).toBe(true);
    expect(Array.isArray(result.correctiveActions)).toBe(true);
  });
});
