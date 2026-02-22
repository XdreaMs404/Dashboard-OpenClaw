import { describe, expect, it } from 'vitest';
import { buildPhaseStateProjection } from '../../src/phase-state-projection.js';
import { validatePhasePrerequisites } from '../../src/phase-prerequisites-validator.js';
import {
  buildPhaseStateProjection as buildFromIndex,
  validatePhaseTransition
} from '../../src/index.js';

const ALLOWED_STATUS = new Set(['pending', 'running', 'done', 'blocked']);

function makePrerequisitesOk(overrides = {}) {
  const diagnosticsOverrides =
    overrides.diagnostics && typeof overrides.diagnostics === 'object' ? overrides.diagnostics : {};

  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Prérequis validés.',
    diagnostics: {
      requiredCount: 2,
      satisfiedCount: 2,
      missingPrerequisiteIds: [],
      ...diagnosticsOverrides
    },
    ...overrides
  };
}

describe('phase-state-projection unit', () => {
  it('returns done with owner, timestamps, duration and activationAllowed=true', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H02',
      owner: '  Alex  ',
      startedAt: '2026-02-20T15:00:00.000Z',
      finishedAt: '2026-02-20T15:10:00.000Z',
      nowAt: '2026-02-20T15:20:00.000Z',
      prerequisiteValidation: makePrerequisitesOk({
        diagnostics: {
          requiredCount: 3,
          satisfiedCount: 3,
          missingPrerequisiteIds: []
        }
      })
    });

    expect(result).toMatchObject({
      phaseId: 'H02',
      owner: 'Alex',
      started_at: '2026-02-20T15:00:00.000Z',
      finished_at: '2026-02-20T15:10:00.000Z',
      status: 'done',
      duration_ms: 600_000,
      activationAllowed: true,
      prerequisites: {
        requiredCount: 3,
        satisfiedCount: 3,
        missingPrerequisiteIds: []
      },
      blockingReasonCode: null,
      blockingReason: null,
      diagnostics: {
        startedMs: Date.parse('2026-02-20T15:00:00.000Z'),
        finishedMs: Date.parse('2026-02-20T15:10:00.000Z'),
        nowMs: Date.parse('2026-02-20T15:20:00.000Z'),
        prerequisiteReasonCode: 'OK',
        durationComputationMs: 600_000
      }
    });
  });

  it('returns running and delegates prerequisites validation from prerequisitesInput', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H03',
      owner: 'Nora',
      startedAt: '2026-02-20T15:00:00.000Z',
      finishedAt: null,
      nowAt: '2026-02-20T15:03:00.000Z',
      prerequisitesInput: {
        fromPhase: 'H03',
        toPhase: 'H04',
        transitionValidation: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'Transition autorisée.'
        },
        prerequisites: [
          { id: 'PR-001', required: true, status: 'done' },
          { id: 'PR-002', required: true, status: 'done' }
        ]
      }
    });

    expect(result).toMatchObject({
      status: 'running',
      duration_ms: 180_000,
      activationAllowed: true,
      prerequisites: {
        requiredCount: 2,
        satisfiedCount: 2,
        missingPrerequisiteIds: []
      },
      blockingReasonCode: null,
      diagnostics: {
        prerequisiteAllowed: true,
        prerequisiteReasonCode: 'OK'
      }
    });
  });

  it('returns pending when timestamps are missing and prerequisites are validated', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H04',
      owner: 'Iris',
      startedAt: null,
      finishedAt: null,
      nowAt: '2026-02-20T15:03:00.000Z',
      prerequisiteValidation: makePrerequisitesOk({
        diagnostics: {
          requiredCount: 1,
          satisfiedCount: 1,
          missingPrerequisiteIds: []
        }
      })
    });

    expect(result).toMatchObject({
      status: 'pending',
      duration_ms: null,
      activationAllowed: true,
      blockingReasonCode: null,
      blockingReason: null
    });
  });

  it('returns blocked and propagates transition reason from S002 (missing notification)', () => {
    const transitionValidation = validatePhaseTransition({
      fromPhase: 'H02',
      toPhase: 'H03',
      transitionRequestedAt: '2026-02-20T15:10:00.000Z',
      notificationPublishedAt: null
    });

    const result = buildPhaseStateProjection({
      phaseId: 'H02',
      owner: 'Mina',
      startedAt: null,
      finishedAt: null,
      nowAt: '2026-02-20T15:10:00.000Z',
      transitionValidation,
      prerequisiteValidation: makePrerequisitesOk()
    });

    expect(result).toMatchObject({
      status: 'blocked',
      duration_ms: null,
      activationAllowed: false,
      blockingReasonCode: 'PHASE_NOTIFICATION_MISSING',
      diagnostics: {
        transitionAllowed: false,
        transitionReasonCode: 'PHASE_NOTIFICATION_MISSING'
      }
    });
    expect(result.blockingReason).toContain('notificationPublishedAt');
  });

  it('returns blocked and propagates transition reason from S002 (SLA exceeded)', () => {
    const transitionValidation = validatePhaseTransition({
      fromPhase: 'H02',
      toPhase: 'H03',
      transitionRequestedAt: '2026-02-20T15:10:00.001Z',
      notificationPublishedAt: '2026-02-20T15:00:00.000Z'
    });

    const result = buildPhaseStateProjection({
      phaseId: 'H02',
      owner: 'Mina',
      startedAt: null,
      finishedAt: null,
      nowAt: '2026-02-20T15:10:00.001Z',
      transitionValidation,
      prerequisiteValidation: makePrerequisitesOk()
    });

    expect(result).toMatchObject({
      status: 'blocked',
      duration_ms: null,
      activationAllowed: false,
      blockingReasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
      diagnostics: {
        transitionAllowed: false,
        transitionReasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED'
      }
    });
    expect(result.blockingReason).toContain('elapsedMs=600001');
  });

  it('returns blocked PHASE_PREREQUISITES_MISSING when prerequisites source is absent', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H05',
      owner: 'Sana',
      startedAt: null,
      finishedAt: null,
      nowAt: '2026-02-20T15:10:00.000Z'
    });

    expect(result).toMatchObject({
      status: 'blocked',
      duration_ms: null,
      activationAllowed: false,
      blockingReasonCode: 'PHASE_PREREQUISITES_MISSING',
      prerequisites: {
        requiredCount: 0,
        satisfiedCount: 0,
        missingPrerequisiteIds: []
      }
    });
  });

  it('returns blocked PHASE_PREREQUISITES_INCOMPLETE with missing prerequisite ids', () => {
    const prerequisiteValidation = validatePhasePrerequisites({
      fromPhase: 'H05',
      toPhase: 'H06',
      transitionValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Transition autorisée.'
      },
      prerequisites: [
        { id: 'PR-001', required: true, status: 'done' },
        { id: 'PR-002', required: true, status: 'pending' }
      ]
    });

    const result = buildPhaseStateProjection({
      phaseId: 'H05',
      owner: 'Sana',
      startedAt: null,
      finishedAt: null,
      nowAt: '2026-02-20T15:10:00.000Z',
      prerequisiteValidation
    });

    expect(result).toMatchObject({
      status: 'blocked',
      activationAllowed: false,
      blockingReasonCode: 'PHASE_PREREQUISITES_INCOMPLETE',
      prerequisites: {
        requiredCount: 2,
        satisfiedCount: 1,
        missingPrerequisiteIds: ['PR-002']
      }
    });
    expect(result.blockingReason).toContain('PR-002');
  });

  it('returns blocked INVALID_PHASE_STATE for invalid phaseId or blank owner', () => {
    const invalidPhase = buildPhaseStateProjection({
      phaseId: 'H24',
      owner: 'Owner',
      startedAt: null,
      finishedAt: null,
      prerequisiteValidation: makePrerequisitesOk()
    });

    const invalidOwner = buildPhaseStateProjection({
      phaseId: 'H01',
      owner: '   ',
      startedAt: null,
      finishedAt: null,
      prerequisiteValidation: makePrerequisitesOk()
    });

    expect(invalidPhase).toMatchObject({
      status: 'blocked',
      blockingReasonCode: 'INVALID_PHASE_STATE',
      activationAllowed: false
    });
    expect(invalidOwner).toMatchObject({
      status: 'blocked',
      blockingReasonCode: 'INVALID_PHASE_STATE',
      activationAllowed: false
    });
  });

  it('keeps stable output contract and index export', () => {
    const result = buildFromIndex({
      phaseId: 'H01',
      owner: 'Kai',
      startedAt: null,
      finishedAt: null,
      transitionValidation: {
        allowed: false,
        reasonCode: 'TRANSITION_NOT_ALLOWED',
        reason: 'skip not allowed'
      },
      prerequisiteValidation: makePrerequisitesOk({
        diagnostics: {
          requiredCount: 1,
          satisfiedCount: 1,
          missingPrerequisiteIds: []
        }
      })
    });

    expect(result).toHaveProperty('phaseId');
    expect(result).toHaveProperty('owner');
    expect(result).toHaveProperty('started_at');
    expect(result).toHaveProperty('finished_at');
    expect(result).toHaveProperty('status');
    expect(result).toHaveProperty('duration_ms');
    expect(result).toHaveProperty('activationAllowed');
    expect(result).toHaveProperty('prerequisites');
    expect(result).toHaveProperty('blockingReasonCode');
    expect(result).toHaveProperty('blockingReason');
    expect(result).toHaveProperty('diagnostics');

    expect(ALLOWED_STATUS.has(result.status)).toBe(true);
    expect(typeof result.activationAllowed).toBe('boolean');

    expect(result.prerequisites).toHaveProperty('requiredCount');
    expect(result.prerequisites).toHaveProperty('satisfiedCount');
    expect(result.prerequisites).toHaveProperty('missingPrerequisiteIds');

    expect(result.diagnostics).toHaveProperty('startedMs');
    expect(result.diagnostics).toHaveProperty('finishedMs');
    expect(result.diagnostics).toHaveProperty('nowMs');
    expect(result.diagnostics).toHaveProperty('transitionReasonCode');
    expect(result.diagnostics).toHaveProperty('prerequisiteReasonCode');
    expect(result.diagnostics).toHaveProperty('durationComputationMs');

    expect(Array.isArray(result.prerequisites.missingPrerequisiteIds)).toBe(true);
  });

  it('meets S004 performance target (p95 < 5000ms) on 500 projections', () => {
    const durationsMs = [];

    for (let index = 0; index < 500; index += 1) {
      const start = performance.now();

      buildPhaseStateProjection({
        phaseId: 'H06',
        owner: `owner-${index}`,
        startedAt: '2026-02-20T15:00:00.000Z',
        finishedAt: '2026-02-20T15:02:00.000Z',
        prerequisiteValidation: makePrerequisitesOk({
          diagnostics: {
            requiredCount: 2,
            satisfiedCount: 2,
            missingPrerequisiteIds: []
          }
        })
      });

      durationsMs.push(performance.now() - start);
    }

    const ordered = [...durationsMs].sort((a, b) => a - b);
    const p95Index = Math.max(0, Math.ceil(ordered.length * 0.95) - 1);
    const p95 = ordered[p95Index];

    expect(p95).toBeLessThan(5000);
  });
});
