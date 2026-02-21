import { describe, expect, it } from 'vitest';
import { evaluatePhaseTransitionOverride } from '../../src/phase-transition-override.js';
import { evaluatePhaseTransitionOverride as evaluateFromIndex } from '../../src/index.js';

const ALLOWED_REASON_CODES = new Set([
  'OK',
  'INVALID_PHASE',
  'TRANSITION_NOT_ALLOWED',
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED',
  'OVERRIDE_NOT_ELIGIBLE',
  'OVERRIDE_REQUEST_MISSING',
  'OVERRIDE_JUSTIFICATION_REQUIRED',
  'OVERRIDE_APPROVER_REQUIRED',
  'OVERRIDE_APPROVER_CONFLICT',
  'INVALID_OVERRIDE_INPUT'
]);

function makeTransitionOk(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Transition autorisée H04 -> H05.',
    diagnostics: {
      fromIndex: 3,
      toIndex: 4,
      elapsedMs: 180_000,
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
      elapsedMs: 620_000,
      slaMs: 600_000
    },
    ...overrides
  };
}

describe('phase-transition-override unit', () => {
  it('returns nominal OK result when transition is already allowed and no override is required', () => {
    const result = evaluatePhaseTransitionOverride({
      transitionValidation: makeTransitionOk()
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        fromPhase: 'H04',
        toPhase: 'H05',
        sourceReasonCode: 'OK',
        overrideEligible: false,
        overrideRequested: false,
        justificationLength: 0,
        approverPresent: false,
        approverDistinct: false,
        minJustificationLength: 20
      },
      override: {
        required: false,
        applied: false
      },
      requiredActions: []
    });
  });

  it('approves override on eligible blocked reason with complete request', () => {
    const result = evaluatePhaseTransitionOverride({
      transitionValidation: makeTransitionBlocked(
        'PHASE_NOTIFICATION_SLA_EXCEEDED',
        'Notification hors SLA: elapsedMs=620000, slaMs=600000.'
      ),
      overrideRequest: {
        requestedBy: 'ops.lead',
        approver: 'pm.owner',
        justification:
          'Incident critique en production, déblocage temporaire validé avec plan correctif immédiat.'
      }
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        sourceReasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
        overrideEligible: true,
        overrideRequested: true,
        approverPresent: true,
        approverDistinct: true,
        minJustificationLength: 20
      },
      override: {
        required: true,
        applied: true
      }
    });

    expect(result.requiredActions).toEqual(['REVALIDATE_TRANSITION', 'RECORD_OVERRIDE_AUDIT']);
    expect(result.reason).toContain('PHASE_NOTIFICATION_SLA_EXCEEDED');
  });

  it('returns OVERRIDE_REQUEST_MISSING when eligible blocked transition has no request', () => {
    const result = evaluatePhaseTransitionOverride({
      transitionValidation: makeTransitionBlocked(
        'TRANSITION_NOT_ALLOWED',
        'Transition non autorisée H05 -> H07.'
      )
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'OVERRIDE_REQUEST_MISSING',
      diagnostics: {
        sourceReasonCode: 'TRANSITION_NOT_ALLOWED',
        overrideEligible: true,
        overrideRequested: false
      },
      override: {
        required: true,
        applied: false
      }
    });

    expect(result.requiredActions).toEqual(['CAPTURE_JUSTIFICATION', 'CAPTURE_APPROVER']);
  });

  it('returns explicit validation errors for short justification and missing approver', () => {
    const shortJustification = evaluatePhaseTransitionOverride({
      transitionValidation: makeTransitionBlocked(
        'PHASE_NOTIFICATION_MISSING',
        'notificationPublishedAt requis.'
      ),
      overrideRequest: {
        requestedBy: 'ops.lead',
        approver: 'pm.owner',
        justification: 'trop court'
      }
    });

    expect(shortJustification).toMatchObject({
      allowed: false,
      reasonCode: 'OVERRIDE_JUSTIFICATION_REQUIRED',
      diagnostics: {
        sourceReasonCode: 'PHASE_NOTIFICATION_MISSING',
        justificationLength: 10,
        approverPresent: true,
        minJustificationLength: 20
      },
      override: {
        required: true,
        applied: false
      }
    });
    expect(shortJustification.requiredActions).toEqual(['CAPTURE_JUSTIFICATION']);

    const missingApprover = evaluatePhaseTransitionOverride({
      transitionValidation: makeTransitionBlocked(
        'PHASE_NOTIFICATION_MISSING',
        'notificationPublishedAt requis.'
      ),
      overrideRequest: {
        requestedBy: 'ops.lead',
        justification:
          'Justification détaillée conforme au niveau de gouvernance pour override exceptionnel.'
      }
    });

    expect(missingApprover).toMatchObject({
      allowed: false,
      reasonCode: 'OVERRIDE_APPROVER_REQUIRED',
      diagnostics: {
        sourceReasonCode: 'PHASE_NOTIFICATION_MISSING',
        approverPresent: false
      },
      override: {
        required: true,
        applied: false
      }
    });
    expect(missingApprover.requiredActions).toEqual(['CAPTURE_APPROVER']);
  });

  it('returns OVERRIDE_APPROVER_CONFLICT when approver equals requester and distinct rule is enabled', () => {
    const result = evaluatePhaseTransitionOverride({
      transitionValidation: makeTransitionBlocked(
        'TRANSITION_NOT_ALLOWED',
        'Transition non autorisée H08 -> H10.'
      ),
      overrideRequest: {
        requestedBy: 'alex.pm',
        approver: 'Alex.PM',
        justification:
          'Blocage critique validé en comité, correction en cours et suivi renforcé immédiat.'
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'OVERRIDE_APPROVER_CONFLICT',
      diagnostics: {
        sourceReasonCode: 'TRANSITION_NOT_ALLOWED',
        approverPresent: true,
        approverDistinct: false
      },
      override: {
        required: true,
        applied: false
      }
    });
    expect(result.requiredActions).toEqual(['CAPTURE_APPROVER']);
  });

  it('returns OVERRIDE_NOT_ELIGIBLE on blocked reasons that cannot be overridden', () => {
    const result = evaluatePhaseTransitionOverride({
      transitionValidation: makeTransitionBlocked('INVALID_PHASE', 'Phase invalide H00 -> H99.')
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'OVERRIDE_NOT_ELIGIBLE',
      diagnostics: {
        sourceReasonCode: 'INVALID_PHASE',
        overrideEligible: false
      },
      override: {
        required: false,
        applied: false
      },
      requiredActions: []
    });
    expect(result.reason).toContain('INVALID_PHASE');
  });

  it('delegates to S002 validator when transitionInput is provided', () => {
    const result = evaluatePhaseTransitionOverride({
      transitionInput: {
        fromPhase: 'H04',
        toPhase: 'H05',
        transitionRequestedAt: '2026-02-21T14:00:00.000Z',
        notificationPublishedAt: null,
        notificationSlaMinutes: 10
      },
      overrideRequest: {
        requestedBy: 'ops.lead',
        approver: 'pm.owner',
        justification:
          'Notification manquante corrigée, déblocage exceptionnel validé avec audit et revalidation immédiate.'
      }
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        fromPhase: 'H04',
        toPhase: 'H05',
        sourceReasonCode: 'PHASE_NOTIFICATION_MISSING',
        overrideEligible: true,
        overrideRequested: true,
        approverPresent: true,
        approverDistinct: true
      },
      override: {
        required: true,
        applied: true
      }
    });
  });

  it('returns INVALID_OVERRIDE_INPUT when required transition sources are missing', () => {
    const result = evaluatePhaseTransitionOverride({
      overrideRequest: {
        requestedBy: 'ops.lead',
        approver: 'pm.owner',
        justification:
          'Justification détaillée conforme au cadre de gouvernance et de traçabilité des overrides.'
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_OVERRIDE_INPUT',
      diagnostics: {
        sourceReasonCode: null,
        minJustificationLength: 20
      },
      override: {
        required: false,
        applied: false
      },
      requiredActions: []
    });
    expect(result.reason).toContain('transitionValidation ou transitionInput est requis');
  });

  it('keeps stable output contract and index export', () => {
    const result = evaluateFromIndex({
      transitionValidation: makeTransitionOk(),
      overrideRequest: {
        requestedBy: 'ops.lead',
        approver: 'pm.owner',
        justification:
          'Justification disponible même si non utilisée car la transition est déjà valide et conforme.'
      }
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('override');
    expect(result).toHaveProperty('requiredActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(ALLOWED_REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(typeof result.reason).toBe('string');

    expect(result.diagnostics).toHaveProperty('fromPhase');
    expect(result.diagnostics).toHaveProperty('toPhase');
    expect(result.diagnostics).toHaveProperty('sourceReasonCode');
    expect(result.diagnostics).toHaveProperty('overrideEligible');
    expect(result.diagnostics).toHaveProperty('overrideRequested');
    expect(result.diagnostics).toHaveProperty('justificationLength');
    expect(result.diagnostics).toHaveProperty('approverPresent');
    expect(result.diagnostics).toHaveProperty('approverDistinct');
    expect(result.diagnostics).toHaveProperty('minJustificationLength');

    expect(result.override).toHaveProperty('required');
    expect(result.override).toHaveProperty('applied');
    expect(Array.isArray(result.requiredActions)).toBe(true);
  });
});
