import { describe, expect, it } from 'vitest';
import { buildUxWcagContrastConformity } from '../../src/ux-wcag-contrast-conformity.js';

function buildPayload() {
  return {
    windowRef: 'S063',
    uxAudit: {
      score: 92,
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
    },
    responsiveDecisionJourneys: [
      {
        viewport: 'mobile',
        decisionTimeSec: 76,
        keyboardValidated: true,
        focusVisibleValidated: true,
        contrastValidated: true,
        noHorizontalOverflow: true
      },
      {
        viewport: 'tablet',
        decisionTimeSec: 71,
        keyboardValidated: true,
        focusVisibleValidated: true,
        contrastValidated: true,
        noHorizontalOverflow: true
      },
      {
        viewport: 'desktop',
        decisionTimeSec: 65,
        keyboardValidated: true,
        focusVisibleValidated: true,
        contrastValidated: true,
        noHorizontalOverflow: true
      }
    ]
  };
}

describe('ux-wcag-contrast-conformity edge', () => {
  it('rejects malformed payload', () => {
    const result = buildUxWcagContrastConformity('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_UX_WCAG_CONFORMITY_INPUT');
  });

  it('fails when at least one required viewport journey is missing', () => {
    const payload = buildPayload();
    payload.responsiveDecisionJourneys = payload.responsiveDecisionJourneys.slice(0, 2);

    const result = buildUxWcagContrastConformity(payload, {
      nowMs: Date.parse('2026-03-16T12:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_RESPONSIVE_VIEWPORT_MISSING');
    expect(result.diagnostics.missingViewports).toEqual(expect.arrayContaining(['desktop']));
  });

  it('fails when a responsive journey is incomplete', () => {
    const payload = buildPayload();
    payload.responsiveDecisionJourneys[0].contrastValidated = false;

    const result = buildUxWcagContrastConformity(payload, {
      nowMs: Date.parse('2026-03-16T12:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_RESPONSIVE_JOURNEY_INCOMPLETE');
  });

  it('propagates base S062 contrast failures', () => {
    const payload = buildPayload();
    payload.criticalSurfaces[0].foreground = '#9ca3af';

    const result = buildUxWcagContrastConformity(payload, {
      nowMs: Date.parse('2026-03-16T12:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_SURFACE_CONTRAST_REQUIRED');
  });
});
