import { describe, expect, it } from 'vitest';
import { validatePhasePrerequisites } from '../../src/phase-prerequisites-validator.js';
import {
  validatePhasePrerequisites as validateFromIndex,
  validatePhaseTransition
} from '../../src/index.js';

const REASON_CODES = new Set([
  'OK',
  'INVALID_PHASE',
  'TRANSITION_NOT_ALLOWED',
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED',
  'PHASE_PREREQUISITES_MISSING',
  'PHASE_PREREQUISITES_INCOMPLETE',
  'INVALID_PHASE_PREREQUISITES'
]);

describe('phase-prerequisites-validator unit', () => {
  it('allows canonical transition when all required prerequisites are done', () => {
    const transitionValidation = validatePhaseTransition({
      fromPhase: 'H03',
      toPhase: 'H04',
      transitionRequestedAt: '2026-02-21T11:00:00.000Z',
      notificationPublishedAt: '2026-02-21T10:55:00.000Z'
    });

    const result = validatePhasePrerequisites({
      fromPhase: 'H03',
      toPhase: 'H04',
      transitionValidation,
      prerequisites: [
        { id: 'PR-001', required: true, status: 'done' },
        { id: 'PR-002', required: true, status: 'done' },
        { id: 'PR-003', required: true, status: 'done' }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        fromPhase: 'H03',
        toPhase: 'H04',
        requiredCount: 3,
        satisfiedCount: 3,
        missingPrerequisiteIds: [],
        blockedByTransition: false
      }
    });
  });

  it('propagates blocked transition reason from S002 without rewriting reasonCode', () => {
    const transitionValidation = validatePhaseTransition({
      fromPhase: 'H03',
      toPhase: 'H05',
      transitionRequestedAt: '2026-02-21T11:00:00.000Z',
      notificationPublishedAt: '2026-02-21T10:55:00.000Z'
    });

    const result = validatePhasePrerequisites({
      fromPhase: 'H03',
      toPhase: 'H05',
      transitionValidation,
      prerequisites: [{ id: 'PR-001', required: true, status: 'done' }]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'TRANSITION_NOT_ALLOWED',
      reason: transitionValidation.reason,
      diagnostics: {
        blockedByTransition: true
      }
    });
  });

  it('returns PHASE_PREREQUISITES_MISSING when checklist is null, non-array, or empty', () => {
    const transitionValidation = {
      allowed: true,
      reasonCode: 'OK',
      reason: 'Transition autorisée.'
    };

    const inputs = [null, 'invalid', []];

    for (const prerequisites of inputs) {
      const result = validatePhasePrerequisites({
        fromPhase: 'H03',
        toPhase: 'H04',
        transitionValidation,
        prerequisites
      });

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'PHASE_PREREQUISITES_MISSING',
        diagnostics: {
          requiredCount: 0,
          satisfiedCount: 0,
          missingPrerequisiteIds: []
        }
      });
    }
  });

  it('returns PHASE_PREREQUISITES_INCOMPLETE with missing prerequisite ids', () => {
    const result = validatePhasePrerequisites({
      fromPhase: 'H03',
      toPhase: 'H04',
      transitionValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Transition autorisée.'
      },
      prerequisites: [
        { id: 'PR-001', required: true, status: 'done' },
        { id: 'PR-002', required: true, status: 'pending' },
        { id: 'PR-003', required: true, status: 'blocked' }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_PREREQUISITES_INCOMPLETE',
      diagnostics: {
        requiredCount: 3,
        satisfiedCount: 1,
        missingPrerequisiteIds: ['PR-002', 'PR-003']
      }
    });
    expect(result.reason).toContain('PR-002');
    expect(result.reason).toContain('PR-003');
  });

  it('does not block optional prerequisites when all required prerequisites are done', () => {
    const result = validatePhasePrerequisites({
      transitionInput: {
        fromPhase: 'H03',
        toPhase: 'H04',
        transitionRequestedAt: '2026-02-21T11:00:00.000Z',
        notificationPublishedAt: '2026-02-21T10:58:00.000Z',
        notificationSlaMinutes: 10
      },
      prerequisites: [
        { id: 'PR-001', required: true, status: 'done' },
        { id: 'PR-002', required: false, status: 'pending' },
        { id: 'PR-003', required: false, status: 'blocked' }
      ]
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        requiredCount: 1,
        satisfiedCount: 1,
        missingPrerequisiteIds: []
      }
    });
  });

  it('returns INVALID_PHASE_PREREQUISITES for invalid checklist entries (id/status/duplicate)', () => {
    const result = validatePhasePrerequisites({
      fromPhase: 'H03',
      toPhase: 'H04',
      transitionValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Transition autorisée.'
      },
      prerequisites: [
        { id: '   ', required: true, status: 'done' },
        { id: 'PR-001', required: true, status: 'unknown' },
        { id: 'PR-001', required: true, status: 'done' }
      ]
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE_PREREQUISITES'
    });
    expect(result.reason).toContain('id de prérequis manquant');
    expect(result.reason).toContain('status invalide');
    expect(result.reason).toContain('doublon');
  });

  it('returns stable output contract and index export', () => {
    const result = validateFromIndex({
      transitionInput: {
        fromPhase: 'H02',
        toPhase: 'H03',
        transitionRequestedAt: '2026-02-21T11:00:00.000Z',
        notificationPublishedAt: '2026-02-21T10:59:00.000Z'
      },
      prerequisites: [{ id: 'PR-001', required: true, status: 'done' }]
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');

    expect(REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(typeof result.diagnostics.fromPhase).toBe('string');
    expect(typeof result.diagnostics.toPhase).toBe('string');
    expect(typeof result.diagnostics.requiredCount).toBe('number');
    expect(typeof result.diagnostics.satisfiedCount).toBe('number');
    expect(Array.isArray(result.diagnostics.missingPrerequisiteIds)).toBe(true);
    expect(typeof result.diagnostics.blockedByTransition).toBe('boolean');
  });
});
