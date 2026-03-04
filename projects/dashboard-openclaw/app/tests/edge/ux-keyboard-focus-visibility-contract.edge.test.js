import { describe, expect, it } from 'vitest';
import { buildUxKeyboardFocusVisibilityContract } from '../../src/ux-keyboard-focus-visibility-contract.js';

function buildPayload() {
  return {
    windowRef: 'S062',
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
    ],
    criticalSurfaces: [
      {
        id: 'surface-primary',
        foreground: '#111827',
        background: '#ffffff',
        minContrastRatio: 4.5
      }
    ],
    responsive: {
      viewports: [
        {
          viewport: 'mobile',
          criticalFlowValidated: true,
          keyboardNavigationValidated: true,
          focusVisibleValidated: true,
          noHorizontalOverflow: true
        },
        {
          viewport: 'tablet',
          criticalFlowValidated: true,
          keyboardNavigationValidated: true,
          focusVisibleValidated: true,
          noHorizontalOverflow: true
        },
        {
          viewport: 'desktop',
          criticalFlowValidated: true,
          keyboardNavigationValidated: true,
          focusVisibleValidated: true,
          noHorizontalOverflow: true
        }
      ]
    }
  };
}

describe('ux-keyboard-focus-visibility-contract edge', () => {
  it('rejects malformed payload', () => {
    const result = buildUxKeyboardFocusVisibilityContract('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_UX_KEYBOARD_FOCUS_INPUT');
  });

  it('fails when no critical surface is declared', () => {
    const payload = buildPayload();
    payload.criticalSurfaces = [];

    const result = buildUxKeyboardFocusVisibilityContract(payload, {
      nowMs: Date.parse('2026-03-15T10:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_CRITICAL_SURFACES_REQUIRED');
  });

  it('fails when responsive coverage misses a required viewport', () => {
    const payload = buildPayload();
    payload.responsive.viewports[1].focusVisibleValidated = false;

    const result = buildUxKeyboardFocusVisibilityContract(payload, {
      nowMs: Date.parse('2026-03-15T10:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_RESPONSIVE_VALIDATION_REQUIRED');
    expect(result.diagnostics.missingResponsiveViewports).toEqual(expect.arrayContaining(['tablet']));
  });

  it('fails when S061 keyboard contract is not met', () => {
    const payload = buildPayload();
    payload.criticalWidgets[0].keyboard.focusVisible = false;

    const result = buildUxKeyboardFocusVisibilityContract(payload, {
      nowMs: Date.parse('2026-03-15T10:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_KEYBOARD_NAVIGATION_REQUIRED');
  });
});
