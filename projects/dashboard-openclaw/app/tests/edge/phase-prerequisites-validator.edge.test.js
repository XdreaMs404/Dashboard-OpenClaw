import { describe, expect, it } from 'vitest';
import { validatePhasePrerequisites } from '../../src/phase-prerequisites-validator.js';

describe('phase-prerequisites-validator edge cases', () => {
  it('does not throw on non-object inputs and fails closed with INVALID_PHASE', () => {
    const inputs = [undefined, null, 42, true, 'H03->H04'];

    for (const input of inputs) {
      expect(() => validatePhasePrerequisites(input)).not.toThrow();

      const result = validatePhasePrerequisites(input);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_PHASE'
      });
    }
  });

  it('propagates PHASE_NOTIFICATION_MISSING from transitionInput (S002)', () => {
    const result = validatePhasePrerequisites({
      transitionInput: {
        fromPhase: 'H03',
        toPhase: 'H04',
        transitionRequestedAt: '2026-02-21T11:00:00.000Z',
        notificationPublishedAt: null,
        notificationSlaMinutes: 10
      },
      prerequisites: [{ id: 'PR-001', required: true, status: 'done' }]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_NOTIFICATION_MISSING',
      diagnostics: {
        blockedByTransition: true,
        transitionAllowed: false,
        transitionReasonCode: 'PHASE_NOTIFICATION_MISSING'
      }
    });
  });

  it('propagates PHASE_NOTIFICATION_SLA_EXCEEDED from transitionInput (S002)', () => {
    const result = validatePhasePrerequisites({
      transitionInput: {
        fromPhase: 'H03',
        toPhase: 'H04',
        transitionRequestedAt: '2026-02-21T11:10:00.001Z',
        notificationPublishedAt: '2026-02-21T11:00:00.000Z',
        notificationSlaMinutes: 10
      },
      prerequisites: [{ id: 'PR-001', required: true, status: 'done' }]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
      diagnostics: {
        blockedByTransition: true,
        transitionAllowed: false,
        transitionReasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED'
      }
    });
  });

  it('fails with INVALID_PHASE when from/to are invalid even if transitionValidation is forged as allowed', () => {
    const result = validatePhasePrerequisites({
      fromPhase: 'H99',
      toPhase: 'H04',
      transitionValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'fake allowed'
      },
      prerequisites: [{ id: 'PR-001', required: true, status: 'done' }]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE'
    });
  });

  it('falls back to TRANSITION_NOT_ALLOWED on unknown blocked transition reason code', () => {
    const result = validatePhasePrerequisites({
      fromPhase: 'H03',
      toPhase: 'H04',
      transitionValidation: {
        allowed: false,
        reasonCode: 'UPSTREAM_UNKNOWN',
        reason: 'opaque upstream blocker'
      },
      prerequisites: [{ id: 'PR-001', required: true, status: 'done' }]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'TRANSITION_NOT_ALLOWED',
      diagnostics: {
        blockedByTransition: true
      }
    });
    expect(result.reason).toContain('opaque upstream blocker');
  });

  it('rejects invalid checklist entries including non-object item and invalid required type', () => {
    const result = validatePhasePrerequisites({
      fromPhase: 'H03',
      toPhase: 'H04',
      transitionValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'allowed'
      },
      prerequisites: [
        null,
        { id: 'PR-001', required: 'yes', status: 'done' },
        { id: 'PR-002', required: true, status: 'DONE' }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE_PREREQUISITES'
    });
    expect(result.reason).toContain('objet requis');
    expect(result.reason).toContain('required doit être booléen');
    expect(result.reason).toContain('status invalide');
  });

  it('derives phases from transition diagnostics when direct from/to are not provided', () => {
    const result = validatePhasePrerequisites({
      transitionValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'allowed',
        diagnostics: {
          fromIndex: 2,
          toIndex: 3
        }
      },
      prerequisites: [{ id: 'PR-001', required: true, status: 'done' }]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        fromPhase: 'H03',
        toPhase: 'H04',
        requiredCount: 1,
        satisfiedCount: 1,
        missingPrerequisiteIds: []
      }
    });
  });

  it('trims prerequisite ids and reports missing required ids with normalized values', () => {
    const result = validatePhasePrerequisites({
      fromPhase: 'H03',
      toPhase: 'H04',
      transitionValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'allowed'
      },
      prerequisites: [
        { id: ' PR-001 ', required: true, status: 'pending' },
        { id: ' PR-002 ', required: true, status: 'done' }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_PREREQUISITES_INCOMPLETE',
      diagnostics: {
        missingPrerequisiteIds: ['PR-001']
      }
    });
  });

  it('uses fallback reason text when transition block reason is empty', () => {
    const result = validatePhasePrerequisites({
      fromPhase: 'H03',
      toPhase: 'H04',
      transitionValidation: {
        allowed: false,
        reasonCode: 'TRANSITION_NOT_ALLOWED',
        reason: '   '
      },
      prerequisites: [{ id: 'PR-001', required: true, status: 'done' }]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'TRANSITION_NOT_ALLOWED',
      reason: 'Blocage détecté sans détail explicite.'
    });
  });

  it('flags non-string id and non-string status as invalid checklist entries', () => {
    const result = validatePhasePrerequisites({
      fromPhase: 'H03',
      toPhase: 'H04',
      transitionValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'allowed'
      },
      prerequisites: [
        { id: 123, required: true, status: 'done' },
        { id: 'PR-001', required: true, status: 404 }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE_PREREQUISITES'
    });
    expect(result.reason).toContain('id de prérequis manquant');
    expect(result.reason).toContain('status invalide');
  });

  it('keeps transition diagnostics null when transitionValidation shape is incomplete', () => {
    const result = validatePhasePrerequisites({
      fromPhase: 'H03',
      toPhase: 'H04',
      transitionValidation: {
        allowed: 'yes',
        reasonCode: 404,
        reason: 'not canonical shape'
      },
      prerequisites: [{ id: 'PR-001', required: true, status: 'done' }]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        transitionAllowed: null,
        transitionReasonCode: null
      }
    });
  });

  it('fails closed with INVALID_PHASE when diagnostics indexes are not integers', () => {
    const result = validatePhasePrerequisites({
      transitionValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'allowed',
        diagnostics: {
          fromIndex: '2',
          toIndex: null
        }
      },
      prerequisites: [{ id: 'PR-001', required: true, status: 'done' }]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE',
      diagnostics: {
        fromPhase: '',
        toPhase: ''
      }
    });
  });

  it('returns TRANSITION_NOT_ALLOWED from terminal phase H23 when expected next phase is none', () => {
    const result = validatePhasePrerequisites({
      fromPhase: 'H23',
      toPhase: 'H23',
      transitionValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'forged allowed'
      },
      prerequisites: [{ id: 'PR-001', required: true, status: 'done' }]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'TRANSITION_NOT_ALLOWED'
    });
    expect(result.reason).toContain('expectedToPhase=NONE');
  });

  it('does not mutate input payload', () => {
    const input = {
      transitionInput: {
        fromPhase: 'H03',
        toPhase: 'H04',
        transitionRequestedAt: '2026-02-21T11:00:00.000Z',
        notificationPublishedAt: '2026-02-21T10:59:30.000Z',
        notificationSlaMinutes: 10
      },
      prerequisites: [
        { id: 'PR-001', required: true, status: 'done', label: 'doc' },
        { id: 'PR-002', required: false, status: 'pending', label: 'ux' }
      ]
    };

    const snapshot = JSON.parse(JSON.stringify(input));

    validatePhasePrerequisites(input);

    expect(input).toEqual(snapshot);
  });
});
