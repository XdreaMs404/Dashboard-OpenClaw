import { describe, expect, it } from 'vitest';
import { buildPhaseStateProjection } from '../../src/phase-state-projection.js';

function makePrerequisitesOk(overrides = {}) {
  const diagnosticsOverrides =
    overrides.diagnostics && typeof overrides.diagnostics === 'object' ? overrides.diagnostics : {};

  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Prérequis validés.',
    diagnostics: {
      requiredCount: 1,
      satisfiedCount: 1,
      missingPrerequisiteIds: [],
      ...diagnosticsOverrides
    },
    ...overrides
  };
}

describe('phase-state-projection edge cases', () => {
  it('does not throw on non-object input and returns INVALID_PHASE_STATE', () => {
    const inputs = [undefined, null, 42, true, 'H01'];

    for (const input of inputs) {
      expect(() => buildPhaseStateProjection(input)).not.toThrow();

      const result = buildPhaseStateProjection(input);

      expect(result).toMatchObject({
        status: 'blocked',
        activationAllowed: false,
        blockingReasonCode: 'INVALID_PHASE_STATE'
      });
    }
  });

  it('blocks with INVALID_PHASE_TIMESTAMPS when startedAt is invalid', () => {
    const invalidString = buildPhaseStateProjection({
      phaseId: 'H01',
      owner: 'Owner',
      startedAt: 'invalid-date',
      finishedAt: null,
      prerequisiteValidation: makePrerequisitesOk()
    });

    const invalidType = buildPhaseStateProjection({
      phaseId: 'H01',
      owner: 'Owner',
      startedAt: 123,
      finishedAt: null,
      prerequisiteValidation: makePrerequisitesOk()
    });

    expect(invalidString).toMatchObject({
      status: 'blocked',
      duration_ms: null,
      activationAllowed: false,
      blockingReasonCode: 'INVALID_PHASE_TIMESTAMPS'
    });
    expect(invalidType).toMatchObject({
      status: 'blocked',
      duration_ms: null,
      activationAllowed: false,
      blockingReasonCode: 'INVALID_PHASE_TIMESTAMPS'
    });
  });

  it('blocks when finishedAt is provided without startedAt', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H01',
      owner: 'Owner',
      startedAt: null,
      finishedAt: '2026-02-20T15:10:00.000Z',
      prerequisiteValidation: makePrerequisitesOk()
    });

    expect(result).toMatchObject({
      status: 'blocked',
      duration_ms: null,
      activationAllowed: false,
      blockingReasonCode: 'INVALID_PHASE_TIMESTAMPS'
    });
    expect(result.blockingReason).toContain('sans startedAt');
  });

  it('blocks running state when nowAt is invalid or older than startedAt', () => {
    const invalidNow = buildPhaseStateProjection({
      phaseId: 'H03',
      owner: 'Owner',
      startedAt: '2026-02-20T15:10:00.000Z',
      finishedAt: null,
      nowAt: 'not-a-date',
      prerequisiteValidation: makePrerequisitesOk()
    });

    const olderNow = buildPhaseStateProjection({
      phaseId: 'H03',
      owner: 'Owner',
      startedAt: '2026-02-20T15:10:00.000Z',
      finishedAt: null,
      nowAt: '2026-02-20T15:09:59.000Z',
      prerequisiteValidation: makePrerequisitesOk()
    });

    expect(invalidNow).toMatchObject({
      status: 'blocked',
      activationAllowed: false,
      blockingReasonCode: 'INVALID_PHASE_TIMESTAMPS'
    });
    expect(olderNow).toMatchObject({
      status: 'blocked',
      activationAllowed: false,
      blockingReasonCode: 'INVALID_PHASE_TIMESTAMPS'
    });
  });

  it('supports transitionInput delegation and propagates SLA reason code', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H02',
      owner: 'Owner',
      startedAt: null,
      finishedAt: null,
      transitionInput: {
        fromPhase: 'H02',
        toPhase: 'H03',
        transitionRequestedAt: '2026-02-20T15:10:00.001Z',
        notificationPublishedAt: '2026-02-20T15:00:00.000Z'
      },
      prerequisiteValidation: makePrerequisitesOk()
    });

    expect(result).toMatchObject({
      status: 'blocked',
      activationAllowed: false,
      blockingReasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
      diagnostics: {
        transitionAllowed: false,
        transitionReasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED'
      }
    });
  });

  it('returns PHASE_PREREQUISITES_MISSING when prerequisites source is absent', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H08',
      owner: 'Owner',
      startedAt: '2026-02-20T15:00:00.000Z',
      finishedAt: null,
      nowAt: '2026-02-20T15:01:00.000Z'
    });

    expect(result).toMatchObject({
      status: 'blocked',
      activationAllowed: false,
      blockingReasonCode: 'PHASE_PREREQUISITES_MISSING',
      diagnostics: {
        prerequisiteReasonCode: 'PHASE_PREREQUISITES_MISSING'
      }
    });
  });

  it('returns INVALID_PHASE_PREREQUISITES when prerequisitesInput is not an object', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H08',
      owner: 'Owner',
      startedAt: null,
      finishedAt: null,
      prerequisitesInput: 'not-an-object'
    });

    expect(result).toMatchObject({
      status: 'blocked',
      activationAllowed: false,
      blockingReasonCode: 'INVALID_PHASE_PREREQUISITES'
    });
    expect(result.blockingReason).toContain('prerequisitesInput doit être un objet valide');
  });

  it('delegates prerequisitesInput to validator and blocks incomplete checklist', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H08',
      owner: 'Owner',
      startedAt: null,
      finishedAt: null,
      prerequisitesInput: {
        fromPhase: 'H08',
        toPhase: 'H09',
        transitionValidation: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'Transition autorisée.'
        },
        prerequisites: [
          { id: 'PR-001', required: true, status: 'pending' },
          { id: 'PR-002', required: true, status: 'done' }
        ]
      }
    });

    expect(result).toMatchObject({
      status: 'blocked',
      activationAllowed: false,
      blockingReasonCode: 'PHASE_PREREQUISITES_INCOMPLETE',
      prerequisites: {
        requiredCount: 2,
        satisfiedCount: 1,
        missingPrerequisiteIds: ['PR-001']
      }
    });
  });

  it('falls closed on malformed prerequisiteValidation shape', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H08',
      owner: 'Owner',
      startedAt: null,
      finishedAt: null,
      prerequisiteValidation: {
        allowed: 'yes',
        reasonCode: 404,
        reason: ''
      }
    });

    expect(result).toMatchObject({
      status: 'blocked',
      activationAllowed: false,
      blockingReasonCode: 'INVALID_PHASE_PREREQUISITES',
      diagnostics: {
        prerequisiteAllowed: null
      }
    });
  });

  it('treats blank timestamps as missing values', () => {
    const pending = buildPhaseStateProjection({
      phaseId: 'H08',
      owner: 'Owner',
      startedAt: '   ',
      finishedAt: '',
      prerequisiteValidation: makePrerequisitesOk()
    });

    expect(pending).toMatchObject({
      status: 'pending',
      duration_ms: null,
      activationAllowed: true,
      blockingReasonCode: null
    });
  });

  it('falls back to current time when nowAt is blank', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H09',
      owner: 'Owner',
      startedAt: '2000-01-01T00:00:00.000Z',
      finishedAt: null,
      nowAt: '   ',
      prerequisiteValidation: makePrerequisitesOk()
    });

    expect(result.status).toBe('running');
    expect(result.activationAllowed).toBe(true);
    expect(typeof result.diagnostics.nowMs).toBe('number');
    expect(result.duration_ms).toBeGreaterThan(0);
  });

  it('fails closed when prerequisiteValidation is provided with a non-object value', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H10',
      owner: 'Owner',
      startedAt: null,
      finishedAt: null,
      prerequisiteValidation: 'invalid-shape'
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockingReasonCode: 'INVALID_PHASE_PREREQUISITES'
    });
    expect(result.blockingReason).toContain('prerequisiteValidation doit être un objet valide');
  });

  it('fails closed when prerequisitesValidation alias is not an object', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H10',
      owner: 'Owner',
      startedAt: null,
      finishedAt: null,
      prerequisitesValidation: 'invalid-shape'
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockingReasonCode: 'INVALID_PHASE_PREREQUISITES'
    });
    expect(result.blockingReason).toContain('prerequisitesValidation doit être un objet valide');
  });

  it('accepts prerequisitesValidation alias object and keeps activationAllowed=true', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H10',
      owner: 'Owner',
      startedAt: null,
      finishedAt: null,
      prerequisitesValidation: makePrerequisitesOk({
        diagnostics: {
          requiredCount: 2,
          satisfiedCount: 2,
          missingPrerequisiteIds: []
        }
      })
    });

    expect(result).toMatchObject({
      status: 'pending',
      activationAllowed: true,
      prerequisites: {
        requiredCount: 2,
        satisfiedCount: 2,
        missingPrerequisiteIds: []
      }
    });
  });

  it('normalizes malformed prerequisite diagnostics counts and ids', () => {
    const normalizedArray = buildPhaseStateProjection({
      phaseId: 'H10',
      owner: 'Owner',
      startedAt: null,
      finishedAt: null,
      prerequisiteValidation: {
        allowed: false,
        reasonCode: 'PHASE_PREREQUISITES_INCOMPLETE',
        reason: 'missing',
        diagnostics: {
          requiredCount: -2,
          satisfiedCount: 99,
          missingPrerequisiteIds: [' PR-001 ', 123, '', 'PR-001']
        }
      }
    });

    const normalizedNonArray = buildPhaseStateProjection({
      phaseId: 'H10',
      owner: 'Owner',
      startedAt: null,
      finishedAt: null,
      prerequisiteValidation: {
        allowed: false,
        reasonCode: 'PHASE_PREREQUISITES_INCOMPLETE',
        reason: 'missing',
        diagnostics: {
          requiredCount: Number.NaN,
          satisfiedCount: -1,
          missingPrerequisiteIds: 'PR-002'
        }
      }
    });

    expect(normalizedArray.prerequisites).toEqual({
      requiredCount: 0,
      satisfiedCount: 0,
      missingPrerequisiteIds: ['PR-001']
    });

    expect(normalizedNonArray.prerequisites).toEqual({
      requiredCount: 0,
      satisfiedCount: 0,
      missingPrerequisiteIds: []
    });
  });

  it('falls back to TRANSITION_NOT_ALLOWED for unknown blocked transition reason', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H10',
      owner: 'Owner',
      startedAt: null,
      finishedAt: null,
      transitionValidation: {
        allowed: false,
        reasonCode: 'UPSTREAM_UNKNOWN',
        reason: 'opaque blocker'
      },
      prerequisiteValidation: makePrerequisitesOk()
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockingReasonCode: 'TRANSITION_NOT_ALLOWED'
    });
    expect(result.blockingReason).toContain('Blocage transition amont: opaque blocker');
  });

  it('propagates transition-like reason code returned by prerequisite validation', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H10',
      owner: 'Owner',
      startedAt: null,
      finishedAt: null,
      prerequisiteValidation: {
        allowed: false,
        reasonCode: 'TRANSITION_NOT_ALLOWED',
        reason: 'blocage transition amont',
        diagnostics: {
          requiredCount: 1,
          satisfiedCount: 0,
          missingPrerequisiteIds: ['PR-010']
        }
      }
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockingReasonCode: 'TRANSITION_NOT_ALLOWED',
      activationAllowed: false
    });
  });

  it('falls closed on unknown blocked reason code from prerequisite validation', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H10',
      owner: 'Owner',
      startedAt: null,
      finishedAt: null,
      prerequisiteValidation: {
        allowed: false,
        reasonCode: 'UNKNOWN_REASON',
        reason: 'unknown blocker',
        diagnostics: {
          requiredCount: 1,
          satisfiedCount: 1,
          missingPrerequisiteIds: []
        }
      }
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockingReasonCode: 'INVALID_PHASE_PREREQUISITES'
    });
    expect(result.blockingReason).toContain('reasonCode=UNKNOWN_REASON');
  });

  it('blocks when finishedAt is earlier than startedAt', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H10',
      owner: 'Owner',
      startedAt: '2026-02-20T15:10:00.000Z',
      finishedAt: '2026-02-20T15:09:59.000Z',
      prerequisiteValidation: makePrerequisitesOk()
    });

    expect(result).toMatchObject({
      status: 'blocked',
      blockingReasonCode: 'INVALID_PHASE_TIMESTAMPS',
      activationAllowed: false
    });
  });

  it('does not mutate input payload', () => {
    const input = {
      phaseId: 'H05',
      owner: 'Owner',
      startedAt: '2026-02-20T15:10:00.000Z',
      finishedAt: null,
      nowAt: '2026-02-20T15:12:00.000Z',
      transitionInput: {
        fromPhase: 'H05',
        toPhase: 'H06',
        transitionRequestedAt: '2026-02-20T15:12:00.000Z',
        notificationPublishedAt: '2026-02-20T15:11:00.000Z'
      },
      prerequisitesInput: {
        fromPhase: 'H05',
        toPhase: 'H06',
        transitionValidation: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'Transition autorisée.'
        },
        prerequisites: [{ id: 'PR-001', required: true, status: 'done', label: 'doc' }]
      }
    };

    const snapshot = JSON.parse(JSON.stringify(input));

    buildPhaseStateProjection(input);

    expect(input).toEqual(snapshot);
  });

  it('supports Date objects for timestamps', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H06',
      owner: 'Owner',
      startedAt: new Date('2026-02-20T15:00:00.000Z'),
      finishedAt: new Date('2026-02-20T15:02:00.000Z'),
      prerequisiteValidation: makePrerequisitesOk()
    });

    expect(result).toMatchObject({
      status: 'done',
      duration_ms: 120_000,
      activationAllowed: true,
      blockingReasonCode: null
    });
  });

  it('ignores non-blocking transitionValidation and keeps nominal status', () => {
    const result = buildPhaseStateProjection({
      phaseId: 'H07',
      owner: 'Owner',
      startedAt: null,
      finishedAt: null,
      transitionValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'allowed'
      },
      prerequisiteValidation: makePrerequisitesOk()
    });

    expect(result).toMatchObject({
      status: 'pending',
      activationAllowed: true,
      blockingReasonCode: null,
      diagnostics: {
        transitionAllowed: true,
        transitionReasonCode: 'OK',
        prerequisiteAllowed: true,
        prerequisiteReasonCode: 'OK'
      }
    });
  });
});
