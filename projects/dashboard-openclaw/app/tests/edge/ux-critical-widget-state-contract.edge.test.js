import { describe, expect, it } from 'vitest';
import { buildUxCriticalWidgetStateContract } from '../../src/ux-critical-widget-state-contract.js';

function buildPayload() {
  return {
    windowRef: 'S061',
    uxAudit: {
      score: 91,
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
    ]
  };
}

describe('ux-critical-widget-state-contract edge', () => {
  it('rejects malformed payload', () => {
    const result = buildUxCriticalWidgetStateContract('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_UX_CRITICAL_WIDGET_STATE_INPUT');
  });

  it('fails when no critical widget is declared', () => {
    const payload = buildPayload();
    payload.criticalWidgets = [];

    const result = buildUxCriticalWidgetStateContract(payload, {
      nowMs: Date.parse('2026-03-14T12:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_CRITICAL_WIDGETS_REQUIRED');
  });

  it('fails when keyboard navigation is incomplete', () => {
    const payload = buildPayload();
    payload.criticalWidgets[0].keyboard.focusVisible = false;

    const result = buildUxCriticalWidgetStateContract(payload, {
      nowMs: Date.parse('2026-03-14T12:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_KEYBOARD_NAVIGATION_REQUIRED');
  });

  it('fails when UX audit score is below threshold', () => {
    const payload = buildPayload();
    payload.uxAudit.score = 78;

    const result = buildUxCriticalWidgetStateContract(payload, {
      nowMs: Date.parse('2026-03-14T12:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_AUDIT_THRESHOLD_NOT_MET');
  });
});
