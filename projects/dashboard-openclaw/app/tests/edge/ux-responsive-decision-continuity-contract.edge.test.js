import { describe, expect, it } from 'vitest';
import { buildUxResponsiveDecisionContinuityContract } from '../../src/ux-responsive-decision-continuity-contract.js';

function buildPayload() {
  return {
    windowRef: 'S064',
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
        decisionTimeSec: 73,
        keyboardValidated: true,
        focusVisibleValidated: true,
        contrastValidated: true,
        noHorizontalOverflow: true
      },
      {
        viewport: 'tablet',
        decisionTimeSec: 68,
        keyboardValidated: true,
        focusVisibleValidated: true,
        contrastValidated: true,
        noHorizontalOverflow: true
      },
      {
        viewport: 'desktop',
        decisionTimeSec: 62,
        keyboardValidated: true,
        focusVisibleValidated: true,
        contrastValidated: true,
        noHorizontalOverflow: true
      }
    ],
    responsiveDecisionProofs: [
      {
        viewportWidth: 360,
        viewport: 'mobile',
        decisionTimeSec: 78,
        criticalFlowValidated: true,
        keyboardValidated: true,
        focusVisibleValidated: true,
        noHorizontalOverflow: true,
        captureRef: 'proof://S064/360-mobile.png',
        g4UxVerdictRef: 'verdict://S064/mobile',
        g4UxSubgate: 'G4-UX'
      },
      {
        viewportWidth: 768,
        viewport: 'tablet',
        decisionTimeSec: 71,
        criticalFlowValidated: true,
        keyboardValidated: true,
        focusVisibleValidated: true,
        noHorizontalOverflow: true,
        captureRef: 'proof://S064/768-tablet.png',
        g4UxVerdictRef: 'verdict://S064/tablet',
        g4UxSubgate: 'G4-UX'
      },
      {
        viewportWidth: 1366,
        viewport: 'desktop',
        decisionTimeSec: 64,
        criticalFlowValidated: true,
        keyboardValidated: true,
        focusVisibleValidated: true,
        noHorizontalOverflow: true,
        captureRef: 'proof://S064/1366-desktop.png',
        g4UxVerdictRef: 'verdict://S064/desktop',
        g4UxSubgate: 'G4-UX'
      },
      {
        viewportWidth: 1920,
        viewport: 'desktop-wide',
        decisionTimeSec: 60,
        criticalFlowValidated: true,
        keyboardValidated: true,
        focusVisibleValidated: true,
        noHorizontalOverflow: true,
        captureRef: 'proof://S064/1920-desktop-wide.png',
        g4UxVerdictRef: 'verdict://S064/desktop-wide',
        g4UxSubgate: 'G4-UX'
      }
    ]
  };
}

describe('ux-responsive-decision-continuity-contract edge', () => {
  it('rejects malformed payload', () => {
    const result = buildUxResponsiveDecisionContinuityContract('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_UX_RESPONSIVE_DECISION_INPUT');
  });

  it('propagates base S063 viewport failures', () => {
    const payload = buildPayload();
    payload.responsiveDecisionJourneys = payload.responsiveDecisionJourneys.slice(0, 2);

    const result = buildUxResponsiveDecisionContinuityContract(payload, {
      nowMs: Date.parse('2026-03-17T12:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_RESPONSIVE_VIEWPORT_MISSING');
  });

  it('fails when one responsive decision proof is incomplete', () => {
    const payload = buildPayload();
    payload.responsiveDecisionProofs[0].noHorizontalOverflow = false;

    const result = buildUxResponsiveDecisionContinuityContract(payload, {
      nowMs: Date.parse('2026-03-17T12:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_RESPONSIVE_DECISION_INCOMPLETE');
  });

  it('fails when one width exceeds the decision-time budget', () => {
    const payload = buildPayload();
    payload.responsiveDecisionProofs[3].decisionTimeSec = 114;

    const result = buildUxResponsiveDecisionContinuityContract(payload, {
      nowMs: Date.parse('2026-03-17T12:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_DECISION_TIME_BUDGET_EXCEEDED');
    expect(result.diagnostics.budgetExceededProofs).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: 1920, decisionTimeSec: 114 })])
    );
  });
});
