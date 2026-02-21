import { describe, expect, it } from 'vitest';
import { evaluatePhaseSlaAlert } from '../../src/phase-sla-alert.js';
import { evaluatePhaseSlaAlert as evaluateFromIndex } from '../../src/index.js';

const ALLOWED_REASON_CODES = new Set([
  'OK',
  'INVALID_PHASE',
  'TRANSITION_NOT_ALLOWED',
  'PHASE_NOTIFICATION_MISSING',
  'PHASE_NOTIFICATION_SLA_EXCEEDED',
  'INVALID_SLA_ALERT_INPUT'
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

function makeTransitionSlaExceeded(overrides = {}) {
  return {
    allowed: false,
    reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
    reason: 'Notification hors SLA: elapsedMs=610000, slaMs=600000, fromPhase=H04, toPhase=H05.',
    diagnostics: {
      fromIndex: 3,
      toIndex: 4,
      elapsedMs: 610_000,
      slaMs: 600_000
    },
    ...overrides
  };
}

describe('phase-sla-alert unit', () => {
  it('returns OK without active alert when transition is nominal', () => {
    const result = evaluatePhaseSlaAlert({
      transitionValidation: makeTransitionOk(),
      history: []
    });

    expect(result).toMatchObject({
      allowed: true,
      reasonCode: 'OK',
      reason: 'Transition autorisée H04 -> H05.',
      diagnostics: {
        fromPhase: 'H04',
        toPhase: 'H05',
        elapsedMs: 180_000,
        slaMs: 600_000,
        recentSlaBreachCount: 0,
        lookbackMinutes: 60,
        escalationThreshold: 2,
        escalationRequired: false,
        sourceReasonCode: 'OK'
      },
      alert: {
        active: false,
        severity: 'none'
      },
      correctiveActions: []
    });
  });

  it('propagates current SLA breach with ordered warning corrective actions', () => {
    const result = evaluatePhaseSlaAlert(
      {
        transitionValidation: makeTransitionSlaExceeded(),
        history: []
      },
      {
        nowProvider: () => '2026-02-21T14:00:00.000Z'
      }
    );

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
      reason: 'Notification hors SLA: elapsedMs=610000, slaMs=600000, fromPhase=H04, toPhase=H05.',
      diagnostics: {
        recentSlaBreachCount: 1,
        escalationRequired: false,
        sourceReasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED'
      },
      alert: {
        active: true,
        severity: 'warning'
      }
    });

    expect(result.correctiveActions).toEqual(['PUBLISH_PHASE_NOTIFY', 'REVALIDATE_TRANSITION']);
  });

  it('escalates to critical when recurrence threshold is reached in lookback window', () => {
    const result = evaluatePhaseSlaAlert(
      {
        transitionValidation: makeTransitionSlaExceeded({
          reason:
            'Notification hors SLA: elapsedMs=620000, slaMs=600000, fromPhase=H04, toPhase=H05.'
        }),
        history: [
          {
            fromPhase: 'H03',
            toPhase: 'H04',
            allowed: false,
            reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
            reason: 'Incident précédent récent',
            timestamp: '2026-02-21T13:30:00.000Z'
          }
        ],
        lookbackMinutes: 60,
        escalationThreshold: 2
      },
      {
        nowProvider: () => '2026-02-21T14:00:00.000Z'
      }
    );

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
      diagnostics: {
        recentSlaBreachCount: 2,
        escalationRequired: true,
        lookbackMinutes: 60,
        escalationThreshold: 2
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

  it('delegates to validatePhaseTransition when transitionInput is provided', () => {
    const result = evaluatePhaseSlaAlert({
      transitionInput: {
        fromPhase: 'H04',
        toPhase: 'H05',
        transitionRequestedAt: '2026-02-21T14:00:00.000Z',
        notificationPublishedAt: null,
        notificationSlaMinutes: 10
      },
      history: []
    });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'PHASE_NOTIFICATION_MISSING',
      diagnostics: {
        fromPhase: 'H04',
        toPhase: 'H05',
        sourceReasonCode: 'PHASE_NOTIFICATION_MISSING'
      },
      alert: {
        active: false,
        severity: 'none'
      },
      correctiveActions: []
    });
    expect(result.reason).toContain('notificationPublishedAt requis');
  });

  it('returns INVALID_SLA_ALERT_INPUT when both transitionValidation and transitionInput are missing', () => {
    const result = evaluatePhaseSlaAlert({ history: [] });

    expect(result).toMatchObject({
      allowed: false,
      reasonCode: 'INVALID_SLA_ALERT_INPUT',
      diagnostics: {
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
    expect(result.reason).toContain('transitionValidation ou transitionInput est requis');
  });

  it('returns INVALID_SLA_ALERT_INPUT on invalid history/lookback/escalation payloads', () => {
    const invalidHistory = evaluatePhaseSlaAlert({
      transitionValidation: makeTransitionOk(),
      history: null
    });

    const invalidLookback = evaluatePhaseSlaAlert({
      transitionValidation: makeTransitionOk(),
      history: [],
      lookbackMinutes: 'abc'
    });

    const invalidEscalationThreshold = evaluatePhaseSlaAlert({
      transitionValidation: makeTransitionOk(),
      history: [],
      escalationThreshold: 0
    });

    expect(invalidHistory.reasonCode).toBe('INVALID_SLA_ALERT_INPUT');
    expect(invalidHistory.reason).toContain('history doit être un tableau');

    expect(invalidLookback.reasonCode).toBe('INVALID_SLA_ALERT_INPUT');
    expect(invalidLookback.reason).toContain('lookbackMinutes invalide');

    expect(invalidEscalationThreshold.reasonCode).toBe('INVALID_SLA_ALERT_INPUT');
    expect(invalidEscalationThreshold.reason).toContain('escalationThreshold invalide');
  });

  it('keeps stable output contract and index export', () => {
    const result = evaluateFromIndex({
      transitionValidation: makeTransitionOk(),
      history: []
    });

    expect(result).toHaveProperty('allowed');
    expect(result).toHaveProperty('reasonCode');
    expect(result).toHaveProperty('reason');
    expect(result).toHaveProperty('diagnostics');
    expect(result).toHaveProperty('alert');
    expect(result).toHaveProperty('correctiveActions');

    expect(typeof result.allowed).toBe('boolean');
    expect(ALLOWED_REASON_CODES.has(result.reasonCode)).toBe(true);
    expect(typeof result.reason).toBe('string');

    expect(result.diagnostics).toHaveProperty('fromPhase');
    expect(result.diagnostics).toHaveProperty('toPhase');
    expect(result.diagnostics).toHaveProperty('elapsedMs');
    expect(result.diagnostics).toHaveProperty('slaMs');
    expect(result.diagnostics).toHaveProperty('recentSlaBreachCount');
    expect(result.diagnostics).toHaveProperty('lookbackMinutes');
    expect(result.diagnostics).toHaveProperty('escalationThreshold');
    expect(result.diagnostics).toHaveProperty('escalationRequired');
    expect(result.diagnostics).toHaveProperty('sourceReasonCode');

    expect(result.alert).toHaveProperty('active');
    expect(result.alert).toHaveProperty('severity');
    expect(result.alert).toHaveProperty('message');
    expect(Array.isArray(result.correctiveActions)).toBe(true);
  });
});
