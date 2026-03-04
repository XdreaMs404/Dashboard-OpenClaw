import { describe, expect, it } from 'vitest';
import { buildUxKeyboardFocusVisibleContract } from '../../src/ux-keyboard-focus-visible.js';

function buildPayload() {
  return {
    windowRef: 'S062',
    uxAudit: {
      score: 90,
      blockerCount: 0,
      wcagLevel: 'WCAG-2.2-AA'
    },
    criticalWidgets: [
      {
        id: 'gate-overview',
        states: {
          empty: { copy: 'Aucun résultat.' },
          loading: { copy: 'Chargement…' },
          error: { copy: 'Erreur.' },
          success: { copy: 'Succès.' }
        },
        keyboard: {
          focusOrder: ['period-filter', 'refresh-gates', 'open-proof'],
          focusVisible: true,
          logicalOrder: true,
          trapFree: true
        }
      }
    ],
    keyboardJourneys: [
      {
        id: 'journey-main',
        keyboardOnly: true,
        logicalOrder: true,
        trapFree: true,
        steps: [
          { target: 'period-filter', focusVisible: true, order: 1 },
          { target: 'refresh-gates', focusVisible: true, order: 2 }
        ]
      }
    ],
    contrastChecks: [{ id: 'gate-header', ratio: 5.2, requiredRatio: 4.5 }],
    responsiveChecks: [
      { viewport: 'mobile', status: 'PASS' },
      { viewport: 'tablet', status: 'PASS' },
      { viewport: 'desktop', status: 'PASS' }
    ]
  };
}

describe('ux-keyboard-focus-visible edge', () => {
  it('rejects malformed payload', () => {
    const result = buildUxKeyboardFocusVisibleContract('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_UX_KEYBOARD_FOCUS_INPUT');
  });

  it('propagates base contract failure when S061 state coverage is invalid', () => {
    const payload = buildPayload();
    delete payload.criticalWidgets[0].states.error;

    const result = buildUxKeyboardFocusVisibleContract(payload, {
      nowMs: Date.parse('2026-03-15T12:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_WIDGET_FOUR_STATES_REQUIRED');
  });

  it('fails when a keyboard journey is incomplete', () => {
    const payload = buildPayload();
    payload.keyboardJourneys[0].steps[1].focusVisible = false;

    const result = buildUxKeyboardFocusVisibleContract(payload, {
      nowMs: Date.parse('2026-03-15T12:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_KEYBOARD_JOURNEY_INCOMPLETE');
  });

  it('fails when a required viewport is missing from responsive checks', () => {
    const payload = buildPayload();
    payload.responsiveChecks = [{ viewport: 'mobile', status: 'PASS' }];

    const result = buildUxKeyboardFocusVisibleContract(payload, {
      nowMs: Date.parse('2026-03-15T12:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_RESPONSIVE_JOURNEY_REQUIRED');
  });
});
