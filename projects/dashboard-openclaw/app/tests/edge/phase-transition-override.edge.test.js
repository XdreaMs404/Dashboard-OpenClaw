import { describe, expect, it, vi } from 'vitest';
import { evaluatePhaseTransitionOverride } from '../../src/phase-transition-override.js';

function transitionOk(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Transition OK',
    diagnostics: {
      fromIndex: 0,
      toIndex: 1,
      elapsedMs: 120_000,
      slaMs: 600_000
    },
    ...overrides
  };
}

function transitionBlocked(overrides = {}) {
  return {
    allowed: false,
    reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
    reason: 'Notification hors SLA',
    diagnostics: {
      fromIndex: 3,
      toIndex: 4,
      elapsedMs: 620_000,
      slaMs: 600_000
    },
    ...overrides
  };
}

describe('phase-transition-override edge cases', () => {
  it('fails closed on non-object input payloads', () => {
    const samples = [undefined, null, true, 42, 'S008'];

    for (const sample of samples) {
      const result = evaluatePhaseTransitionOverride(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_OVERRIDE_INPUT',
        diagnostics: {
          fromPhase: null,
          toPhase: null,
          sourceReasonCode: null,
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
    }
  });

  it('rejects invalid minJustificationLength values', () => {
    const invalidAlpha = evaluatePhaseTransitionOverride({
      transitionValidation: transitionBlocked(),
      minJustificationLength: 'abc'
    });

    const invalidZero = evaluatePhaseTransitionOverride({
      transitionValidation: transitionBlocked(),
      minJustificationLength: 0
    });

    const invalidDecimal = evaluatePhaseTransitionOverride({
      transitionValidation: transitionBlocked(),
      minJustificationLength: 10.5
    });

    const invalidObject = evaluatePhaseTransitionOverride({
      transitionValidation: transitionBlocked(),
      minJustificationLength: {
        min: 20
      }
    });

    expect(invalidAlpha.reasonCode).toBe('INVALID_OVERRIDE_INPUT');
    expect(invalidAlpha.reason).toContain('minJustificationLength invalide');

    expect(invalidZero.reasonCode).toBe('INVALID_OVERRIDE_INPUT');
    expect(invalidZero.reason).toContain('minJustificationLength invalide');

    expect(invalidDecimal.reasonCode).toBe('INVALID_OVERRIDE_INPUT');
    expect(invalidDecimal.reason).toContain('minJustificationLength invalide');

    expect(invalidObject.reasonCode).toBe('INVALID_OVERRIDE_INPUT');
    expect(invalidObject.reason).toContain('minJustificationLength invalide');
  });

  it('accepts numeric/string config and allows same approver when distinct rule is disabled', () => {
    const result = evaluatePhaseTransitionOverride(
      {
        transitionValidation: transitionBlocked({
          reasonCode: 'TRANSITION_NOT_ALLOWED',
          reason: 'Transition non autorisée H05 -> H07.'
        }),
        overrideRequest: {
          requestedBy: 'Alex',
          approver: 'alex',
          justification: 'Correction immédiate validée et tracée.'
        },
        minJustificationLength: '10',
        requireDistinctApprover: false
      },
      {
        requireDistinctApprover: true
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        sourceReasonCode: 'TRANSITION_NOT_ALLOWED',
        approverPresent: true,
        approverDistinct: false,
        minJustificationLength: 10
      },
      override: {
        required: true,
        applied: true
      }
    });
    expect(result.requiredActions).toEqual(['REVALIDATE_TRANSITION', 'RECORD_OVERRIDE_AUDIT']);
  });

  it('supports true string for requireDistinctApprover and detects conflict', () => {
    const result = evaluatePhaseTransitionOverride({
      transitionValidation: transitionBlocked({
        reasonCode: 'TRANSITION_NOT_ALLOWED',
        reason: 'Transition non autorisée H08 -> H10.'
      }),
      overrideRequest: {
        requestedBy: 'alex.pm',
        approver: 'Alex.PM',
        justification:
          'Blocage critique validé en comité, correction en cours et suivi renforcé immédiat.'
      },
      requireDistinctApprover: 'true'
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'OVERRIDE_APPROVER_CONFLICT',
      diagnostics: {
        approverDistinct: false,
        sourceReasonCode: 'TRANSITION_NOT_ALLOWED'
      }
    });
  });

  it('rejects non-object overrideRequest and non-object transitionInput payloads', () => {
    const invalidRequest = evaluatePhaseTransitionOverride({
      transitionValidation: transitionBlocked(),
      overrideRequest: 'override-now'
    });

    expect(invalidRequest).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_OVERRIDE_INPUT'
    });
    expect(invalidRequest.reason).toContain('overrideRequest doit être un objet valide');

    const invalidTransitionInput = evaluatePhaseTransitionOverride({
      transitionInput: 'H04->H05'
    });

    expect(invalidTransitionInput).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_OVERRIDE_INPUT'
    });
    expect(invalidTransitionInput.reason).toContain('transitionInput doit être un objet valide');
  });

  it('rejects invalid requireDistinctApprover values from payload and runtime options', () => {
    const invalidPayloadValue = evaluatePhaseTransitionOverride({
      transitionValidation: transitionBlocked(),
      requireDistinctApprover: 1
    });

    expect(invalidPayloadValue).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_OVERRIDE_INPUT'
    });
    expect(invalidPayloadValue.reason).toContain('requireDistinctApprover invalide');

    const invalidOptionValue = evaluatePhaseTransitionOverride(
      {
        transitionValidation: transitionBlocked()
      },
      {
        requireDistinctApprover: 'invalid-bool'
      }
    );

    expect(invalidOptionValue).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_OVERRIDE_INPUT'
    });
    expect(invalidOptionValue.reason).toContain('requireDistinctApprover invalide');
  });

  it('uses runtime option minJustificationLength when payload value is absent', () => {
    const result = evaluatePhaseTransitionOverride(
      {
        transitionValidation: transitionBlocked()
      },
      {
        minJustificationLength: 0
      }
    );

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_OVERRIDE_INPUT'
    });
    expect(result.reason).toContain('minJustificationLength invalide: 0');
  });

  it('rejects missing requestedBy with explicit INVALID_OVERRIDE_INPUT', () => {
    const result = evaluatePhaseTransitionOverride({
      transitionValidation: transitionBlocked(),
      overrideRequest: {
        approver: 'pm.owner',
        justification: 'Justification complète et auditée pour dérogation opérationnelle immédiate.'
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_OVERRIDE_INPUT'
    });
    expect(result.reason).toContain('overrideRequest.requestedBy est requis');
  });

  it('requests both justification and approver when both are missing on an eligible override', () => {
    const result = evaluatePhaseTransitionOverride({
      transitionValidation: transitionBlocked({
        reasonCode: 'TRANSITION_NOT_ALLOWED',
        reason: 'Transition non autorisée H05 -> H07.'
      }),
      overrideRequest: {
        requestedBy: 'ops.lead',
        justification: 'court'
      },
      minJustificationLength: 10
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'OVERRIDE_JUSTIFICATION_REQUIRED',
      diagnostics: {
        sourceReasonCode: 'TRANSITION_NOT_ALLOWED',
        justificationLength: 5,
        approverPresent: false
      },
      override: {
        required: true,
        applied: false
      }
    });
    expect(result.requiredActions).toEqual(['CAPTURE_JUSTIFICATION', 'CAPTURE_APPROVER']);
  });

  it('validates transitionValidation contract strictly', () => {
    const notObjectValidation = evaluatePhaseTransitionOverride({
      transitionValidation: null
    });

    expect(notObjectValidation.reasonCode).toBe('INVALID_OVERRIDE_INPUT');
    expect(notObjectValidation.reason).toContain('transitionValidation doit être un objet valide');

    const invalidReasonCode = evaluatePhaseTransitionOverride({
      transitionValidation: {
        allowed: false,
        reasonCode: 'UNKNOWN_REASON',
        reason: 'invalid'
      }
    });

    expect(invalidReasonCode.reasonCode).toBe('INVALID_OVERRIDE_INPUT');
    expect(invalidReasonCode.reason).toContain('transitionValidation.reasonCode invalide');

    const invalidReasonCodeType = evaluatePhaseTransitionOverride({
      transitionValidation: {
        allowed: false,
        reasonCode: null,
        reason: 'invalid type'
      }
    });

    expect(invalidReasonCodeType.reasonCode).toBe('INVALID_OVERRIDE_INPUT');
    expect(invalidReasonCodeType.reason).toContain('transitionValidation.reasonCode invalide');

    const invalidReasonText = evaluatePhaseTransitionOverride({
      transitionValidation: {
        allowed: false,
        reasonCode: 'TRANSITION_NOT_ALLOWED',
        reason: '   '
      }
    });

    expect(invalidReasonText.reasonCode).toBe('INVALID_OVERRIDE_INPUT');
    expect(invalidReasonText.reason).toContain('transitionValidation.reason doit être une chaîne non vide');

    const invalidAllowedTrue = evaluatePhaseTransitionOverride({
      transitionValidation: {
        allowed: true,
        reasonCode: 'TRANSITION_NOT_ALLOWED',
        reason: 'incoherent'
      }
    });

    expect(invalidAllowedTrue.reasonCode).toBe('INVALID_OVERRIDE_INPUT');
    expect(invalidAllowedTrue.reason).toContain('allowed=true exige reasonCode=OK');

    const invalidAllowedFalse = evaluatePhaseTransitionOverride({
      transitionValidation: {
        allowed: false,
        reasonCode: 'OK',
        reason: 'incoherent'
      }
    });

    expect(invalidAllowedFalse.reasonCode).toBe('INVALID_OVERRIDE_INPUT');
    expect(invalidAllowedFalse.reason).toContain('allowed=false ne peut pas utiliser reasonCode=OK');
  });

  it('uses injected transitionValidator on transitionInput and protects input from mutation', () => {
    const transitionInput = {
      fromPhase: 'H01',
      toPhase: 'H02',
      transitionRequestedAt: '2026-02-21T14:00:00.000Z',
      notificationPublishedAt: null,
      metadata: {
        tags: ['alpha', 'beta']
      }
    };

    const validator = vi.fn().mockImplementation((payload) => {
      payload.metadata.tags.push('mutated-in-validator');

      return {
        allowed: false,
        reasonCode: 'PHASE_NOTIFICATION_MISSING',
        reason: 'notificationPublishedAt requis',
        diagnostics: {
          fromIndex: 0,
          toIndex: 1,
          elapsedMs: null,
          slaMs: 600_000
        }
      };
    });

    const result = evaluatePhaseTransitionOverride(
      {
        transitionInput,
        overrideRequest: {
          requestedBy: 'ops.lead',
          approver: 'pm.owner',
          justification:
            'Notification manquante régularisée, override exceptionnel validé et journalisé pour audit.'
        }
      },
      {
        transitionValidator: validator
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        sourceReasonCode: 'PHASE_NOTIFICATION_MISSING',
        fromPhase: 'H01',
        toPhase: 'H02'
      }
    });

    expect(validator).toHaveBeenCalledTimes(1);

    const calledPayload = validator.mock.calls[0][0];
    expect(calledPayload).toEqual({
      fromPhase: 'H01',
      toPhase: 'H02',
      transitionRequestedAt: '2026-02-21T14:00:00.000Z',
      notificationPublishedAt: null,
      metadata: {
        tags: ['alpha', 'beta', 'mutated-in-validator']
      }
    });

    expect(calledPayload).not.toBe(transitionInput);
    expect(calledPayload.metadata).not.toBe(transitionInput.metadata);
    expect(calledPayload.metadata.tags).not.toBe(transitionInput.metadata.tags);
    expect(transitionInput.metadata.tags).toEqual(['alpha', 'beta']);
  });

  it('does not invoke injected transitionValidator when transitionValidation is provided', () => {
    const validator = vi.fn().mockReturnValue(transitionBlocked());

    const result = evaluatePhaseTransitionOverride(
      {
        transitionValidation: transitionOk({
          diagnostics: {
            fromIndex: 5,
            toIndex: 6,
            elapsedMs: 60_000,
            slaMs: 600_000
          }
        }),
        transitionInput: {
          fromPhase: 'H99',
          toPhase: 'H00'
        }
      },
      {
        transitionValidator: validator
      }
    );

    expect(validator).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        fromPhase: 'H99',
        toPhase: 'H00',
        sourceReasonCode: 'OK'
      },
      override: {
        required: false,
        applied: false
      }
    });
  });

  it('returns INVALID_OVERRIDE_INPUT when injected transition validator returns invalid contract', () => {
    const result = evaluatePhaseTransitionOverride(
      {
        transitionInput: {
          fromPhase: 'H01',
          toPhase: 'H02',
          transitionRequestedAt: '2026-02-21T14:00:00.000Z',
          notificationPublishedAt: '2026-02-21T13:59:00.000Z'
        }
      },
      {
        transitionValidator: () => ({
          allowed: 'true',
          reasonCode: 'OK',
          reason: 'bad-contract'
        })
      }
    );

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_OVERRIDE_INPUT'
    });
    expect(result.reason).toContain('Résultat invalide depuis validatePhaseTransition');
  });

  it('derives diagnostics phases from payload when transition diagnostics are missing', () => {
    const result = evaluatePhaseTransitionOverride({
      fromPhase: 'h02',
      toPhase: 'h03',
      transitionValidation: {
        allowed: false,
        reasonCode: 'INVALID_PHASE',
        reason: 'invalid phase payload',
        diagnostics: 'not-an-object'
      }
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'OVERRIDE_NOT_ELIGIBLE',
      diagnostics: {
        fromPhase: 'H02',
        toPhase: 'H03',
        sourceReasonCode: 'INVALID_PHASE',
        overrideEligible: false
      }
    });
  });

  it('normalizes blank phases to null and accepts non-object runtime options', () => {
    const result = evaluatePhaseTransitionOverride(
      {
        fromPhase: '   ',
        toPhase: '   ',
        transitionValidation: transitionOk({
          diagnostics: null
        })
      },
      'runtime-options-not-object'
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      diagnostics: {
        fromPhase: null,
        toPhase: null,
        sourceReasonCode: 'OK'
      },
      override: {
        required: false,
        applied: false
      },
      requiredActions: []
    });
  });
});
