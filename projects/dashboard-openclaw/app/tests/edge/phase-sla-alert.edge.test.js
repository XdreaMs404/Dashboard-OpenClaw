import { describe, expect, it, vi } from 'vitest';
import { evaluatePhaseSlaAlert } from '../../src/phase-sla-alert.js';

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

function transitionSla(overrides = {}) {
  return {
    allowed: false,
    reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
    reason: 'Notification hors SLA',
    diagnostics: {
      fromIndex: 0,
      toIndex: 1,
      elapsedMs: 700_000,
      slaMs: 600_000
    },
    ...overrides
  };
}

describe('phase-sla-alert edge cases', () => {
  it('fails closed on non-object inputs', () => {
    const samples = [undefined, null, true, 42, 'S007'];

    for (const sample of samples) {
      const result = evaluatePhaseSlaAlert(sample);

      expect(result).toMatchObject({
        allowed: false,
        reasonCode: 'INVALID_SLA_ALERT_INPUT',
        diagnostics: {
          fromPhase: null,
          toPhase: null,
          lookbackMinutes: 60,
          escalationThreshold: 2,
          sourceReasonCode: null
        },
        alert: {
          active: false,
          severity: 'none'
        },
        correctiveActions: []
      });
    }
  });

  it('accepts numeric strings and counts only recent SLA breaches for escalation', () => {
    const result = evaluatePhaseSlaAlert(
      {
        transitionValidation: transitionSla({
          diagnostics: {
            fromIndex: 3,
            toIndex: 4,
            elapsedMs: 620_000,
            slaMs: 600_000
          }
        }),
        history: [
          {
            reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
            timestamp: '2026-02-21T13:50:00.000Z'
          },
          {
            reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
            timestamp: '2026-02-21T13:20:00.000Z'
          },
          {
            reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
            timestamp: '2026-02-21T14:10:00.000Z'
          },
          {
            reasonCode: 'OK',
            timestamp: '2026-02-21T13:55:00.000Z'
          },
          {
            reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
            timestamp: 'invalid-ts'
          }
        ],
        lookbackMinutes: '30',
        escalationThreshold: '2'
      },
      {
        nowProvider: () => '2026-02-21T14:00:00.000Z'
      }
    );

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
      diagnostics: {
        fromPhase: 'H04',
        toPhase: 'H05',
        lookbackMinutes: 30,
        escalationThreshold: 2,
        recentSlaBreachCount: 2,
        escalationRequired: true
      },
      alert: {
        active: true,
        severity: 'critical'
      }
    });

    expect(result.correctiveActions).toEqual([
      'PUBLISH_PHASE_NOTIFY',
      'REVALIDATE_TRANSITION',
      'ESCALATE_TO_PM'
    ]);
  });

  it('rejects non-object transitionInput payload', () => {
    const result = evaluatePhaseSlaAlert({
      transitionInput: 'H04->H05',
      history: []
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_SLA_ALERT_INPUT'
    });
    expect(result.reason).toContain('transitionInput doit être un objet');
  });

  it('rejects non-object transitionValidation payload', () => {
    const result = evaluatePhaseSlaAlert({
      transitionValidation: null,
      history: []
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_SLA_ALERT_INPUT'
    });
    expect(result.reason).toContain('transitionValidation doit être un objet valide');
  });

  it('rejects non-integer escalationThreshold values', () => {
    const result = evaluatePhaseSlaAlert({
      transitionValidation: transitionOk(),
      history: [],
      escalationThreshold: 1.5
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_SLA_ALERT_INPUT'
    });
    expect(result.reason).toContain('escalationThreshold invalide');
  });

  it('ignores non-object history rows and supports recordedAt Date/number timestamps', () => {
    const result = evaluatePhaseSlaAlert(
      {
        transitionValidation: transitionSla({
          diagnostics: {
            fromIndex: 2,
            toIndex: 3,
            elapsedMs: 601_000,
            slaMs: 600_000
          }
        }),
        history: [
          null,
          42,
          {
            reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
            recordedAt: new Date('2026-02-21T13:50:00.000Z')
          },
          {
            reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
            recordedAt: Date.parse('2026-02-21T13:55:00.000Z')
          },
          {
            reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
            recordedAt: '   '
          }
        ],
        lookbackMinutes: 30,
        escalationThreshold: 3
      },
      {
        nowProvider: () => '2026-02-21T14:00:00.000Z'
      }
    );

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
      diagnostics: {
        fromPhase: 'H03',
        toPhase: 'H04',
        recentSlaBreachCount: 3,
        escalationRequired: true
      },
      alert: {
        active: true,
        severity: 'critical'
      }
    });
  });

  it('rejects transitionValidation with unknown reason code', () => {
    const result = evaluatePhaseSlaAlert({
      transitionValidation: {
        allowed: false,
        reasonCode: 'UNKNOWN_REASON',
        reason: 'reason'
      },
      history: []
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_SLA_ALERT_INPUT'
    });
    expect(result.reason).toContain('transitionValidation.reasonCode invalide');
  });

  it('rejects transitionValidation when reasonCode is not a string', () => {
    const result = evaluatePhaseSlaAlert({
      transitionValidation: {
        allowed: false,
        reasonCode: null,
        reason: 'invalid type'
      },
      history: []
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_SLA_ALERT_INPUT'
    });
    expect(result.reason).toContain('transitionValidation.reasonCode invalide');
  });

  it('clones transitionInput arrays before validator call and falls back when nowProvider returns object', () => {
    const transitionInput = {
      fromPhase: 'H01',
      toPhase: 'H02',
      transitionRequestedAt: '2026-02-21T14:00:00.000Z',
      notificationPublishedAt: '2026-02-21T13:55:00.000Z',
      metadata: {
        tags: ['alpha', 'beta']
      }
    };

    const validator = vi.fn().mockImplementation((payload) => {
      payload.metadata.tags.push('mutated-in-validator');
      return transitionOk();
    });

    const result = evaluatePhaseSlaAlert(
      {
        transitionInput,
        history: []
      },
      {
        transitionValidator: validator,
        nowProvider: () => ({ invalid: true })
      }
    );

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      alert: {
        active: false,
        severity: 'none'
      }
    });

    expect(validator).toHaveBeenCalledTimes(1);
    const calledPayload = validator.mock.calls[0][0];
    expect(calledPayload).toEqual({
      fromPhase: 'H01',
      toPhase: 'H02',
      transitionRequestedAt: '2026-02-21T14:00:00.000Z',
      notificationPublishedAt: '2026-02-21T13:55:00.000Z',
      metadata: {
        tags: ['alpha', 'beta', 'mutated-in-validator']
      }
    });
    expect(calledPayload).not.toBe(transitionInput);
    expect(calledPayload.metadata).not.toBe(transitionInput.metadata);
    expect(calledPayload.metadata.tags).not.toBe(transitionInput.metadata.tags);
    expect(transitionInput.metadata.tags).toEqual(['alpha', 'beta']);
  });

  it('rejects transitionValidation with empty reason', () => {
    const result = evaluatePhaseSlaAlert({
      transitionValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: '   '
      },
      history: []
    });

    expect(result.reasonCode).toBe('INVALID_SLA_ALERT_INPUT');
    expect(result.reason).toContain('transitionValidation.reason doit être une chaîne non vide');
  });

  it('rejects incoherent transitionValidation contracts', () => {
    const allowedTrueNonOk = evaluatePhaseSlaAlert({
      transitionValidation: {
        allowed: true,
        reasonCode: 'PHASE_NOTIFICATION_MISSING',
        reason: 'incoherent'
      },
      history: []
    });

    const allowedFalseOk = evaluatePhaseSlaAlert({
      transitionValidation: {
        allowed: false,
        reasonCode: 'OK',
        reason: 'incoherent'
      },
      history: []
    });

    expect(allowedTrueNonOk.reasonCode).toBe('INVALID_SLA_ALERT_INPUT');
    expect(allowedTrueNonOk.reason).toContain('allowed=true exige reasonCode=OK');

    expect(allowedFalseOk.reasonCode).toBe('INVALID_SLA_ALERT_INPUT');
    expect(allowedFalseOk.reason).toContain('allowed=false ne peut pas utiliser reasonCode=OK');
  });

  it('uses injected transitionValidator when transitionInput is provided', () => {
    const validator = vi.fn().mockReturnValue({
      allowed: false,
      reasonCode: 'TRANSITION_NOT_ALLOWED',
      reason: 'Validation injectée',
      diagnostics: {
        fromIndex: 5,
        toIndex: 7,
        elapsedMs: null,
        slaMs: 600_000
      }
    });

    const transitionInput = {
      fromPhase: 'h06',
      toPhase: 'h08',
      transitionRequestedAt: '2026-02-21T14:00:00.000Z',
      notificationPublishedAt: '2026-02-21T13:59:00.000Z'
    };

    const result = evaluatePhaseSlaAlert(
      {
        transitionInput,
        history: []
      },
      {
        transitionValidator: validator
      }
    );

    expect(validator).toHaveBeenCalledTimes(1);
    expect(validator).toHaveBeenCalledWith(transitionInput);

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'TRANSITION_NOT_ALLOWED',
      reason: 'Validation injectée',
      diagnostics: {
        fromPhase: 'H06',
        toPhase: 'H08',
        sourceReasonCode: 'TRANSITION_NOT_ALLOWED'
      },
      alert: {
        active: false,
        severity: 'none'
      }
    });
  });

  it('does not invoke transitionValidator when transitionValidation is directly provided', () => {
    const validator = vi.fn().mockReturnValue(transitionSla());

    const result = evaluatePhaseSlaAlert(
      {
        transitionValidation: transitionOk({
          diagnostics: {
            fromIndex: 1,
            toIndex: 2,
            elapsedMs: 60_000,
            slaMs: 600_000
          }
        }),
        transitionInput: {
          fromPhase: 'H99',
          toPhase: 'H00'
        },
        history: []
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
      }
    });
  });

  it('falls back to Date.now when nowProvider returns invalid value', () => {
    const dateNowSpy = vi.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-02-21T14:00:00.000Z'));

    try {
      const result = evaluatePhaseSlaAlert(
        {
          transitionValidation: transitionSla(),
          history: [
            {
              reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
              timestamp: '2026-02-21T13:30:00.000Z'
            }
          ],
          lookbackMinutes: 60,
          escalationThreshold: 2
        },
        {
          nowProvider: () => 'invalid-now'
        }
      );

      expect(result.diagnostics.recentSlaBreachCount).toBe(2);
      expect(result.diagnostics.escalationRequired).toBe(true);
      expect(result.alert.severity).toBe('critical');
    } finally {
      dateNowSpy.mockRestore();
    }
  });

  it('returns INVALID_SLA_ALERT_INPUT if injected transition validator returns invalid contract', () => {
    const result = evaluatePhaseSlaAlert(
      {
        transitionInput: {
          fromPhase: 'H01',
          toPhase: 'H02',
          transitionRequestedAt: '2026-02-21T14:00:00.000Z',
          notificationPublishedAt: '2026-02-21T13:59:00.000Z'
        },
        history: []
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
      reasonCode: 'INVALID_SLA_ALERT_INPUT'
    });
    expect(result.reason).toContain('Résultat invalide depuis validatePhaseTransition');
  });

  it('keeps diagnostics numeric fields null when transition diagnostics are missing', () => {
    const result = evaluatePhaseSlaAlert({
      fromPhase: 'h02',
      toPhase: 'h03',
      transitionValidation: {
        allowed: false,
        reasonCode: 'INVALID_PHASE',
        reason: 'invalid phase payload',
        diagnostics: 'not-an-object'
      },
      history: []
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_PHASE',
      diagnostics: {
        fromPhase: 'H02',
        toPhase: 'H03',
        elapsedMs: null,
        slaMs: null,
        sourceReasonCode: 'INVALID_PHASE'
      }
    });
  });

  it('does not mutate input payload and nested history entries', () => {
    const input = {
      transitionValidation: transitionSla({
        diagnostics: {
          fromIndex: 2,
          toIndex: 3,
          elapsedMs: 601_000,
          slaMs: 600_000
        }
      }),
      history: [
        {
          fromPhase: 'H02',
          toPhase: 'H03',
          reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
          reason: 'prior breach',
          timestamp: '2026-02-21T13:40:00.000Z'
        }
      ],
      lookbackMinutes: 60,
      escalationThreshold: 2
    };

    const snapshot = JSON.parse(JSON.stringify(input));

    const result = evaluatePhaseSlaAlert(input, {
      nowProvider: () => '2026-02-21T14:00:00.000Z'
    });

    expect(input).toEqual(snapshot);
    expect(result.correctiveActions).toEqual([
      'PUBLISH_PHASE_NOTIFY',
      'REVALIDATE_TRANSITION',
      'ESCALATE_TO_PM'
    ]);
  });
});
