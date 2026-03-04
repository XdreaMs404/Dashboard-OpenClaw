import { describe, expect, it } from 'vitest';
import { buildUxWcagContrastConformity } from '../../src/ux-wcag-contrast-conformity.js';
import { buildUxWcagContrastConformity as buildFromIndex } from '../../src/index.js';

function buildPayload() {
  return {
    windowRef: 'S063',
    uxAudit: {
      score: 94,
      blockerCount: 0,
      wcagLevel: 'WCAG-2.2-AA'
    },
    criticalWidgets: [
      {
        id: 'gate-overview',
        states: {
          empty: { copy: 'Aucune donnée gate disponible.' },
          loading: { copy: 'Chargement des verdicts en cours…' },
          error: { copy: 'Impossible de charger les verdicts.' },
          success: { copy: 'Verdicts gate disponibles.' }
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
        id: 'gate-summary-card',
        foreground: '#0f172a',
        background: '#ffffff',
        minContrastRatio: 4.5
      },
      {
        id: 'focus-ring-primary',
        foreground: '#1d4ed8',
        background: '#ffffff',
        minContrastRatio: 3
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
        decisionTimeSec: 72,
        keyboardValidated: true,
        focusVisibleValidated: true,
        contrastValidated: true,
        noHorizontalOverflow: true,
        evidenceRef: 'proof://S063/mobile'
      },
      {
        viewport: 'tablet',
        decisionTimeSec: 67,
        keyboardValidated: true,
        focusVisibleValidated: true,
        contrastValidated: true,
        noHorizontalOverflow: true,
        evidenceRef: 'proof://S063/tablet'
      },
      {
        viewport: 'desktop',
        decisionTimeSec: 59,
        keyboardValidated: true,
        focusVisibleValidated: true,
        contrastValidated: true,
        noHorizontalOverflow: true,
        evidenceRef: 'proof://S063/desktop'
      }
    ]
  };
}

describe('ux-wcag-contrast-conformity unit', () => {
  it('validates WCAG AA contrast and responsive decision journeys under the NFR-033 budget (S063/FR-065/FR-066)', () => {
    const result = buildUxWcagContrastConformity(buildPayload(), {
      nowMs: Date.parse('2026-03-16T12:00:00.000Z')
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.wcagContrastConformity).toMatchObject({
      model: 'UX_WCAG_CONTRAST_CONFORMITY',
      modelVersion: 'S063-v1',
      summary: {
        viewportCount: 3,
        completeViewportCount: 3,
        responsiveCoveragePct: 100,
        worstDecisionTimeSec: 72,
        withinDecisionBudget: true
      }
    });
  });

  it('fails when critical decision time exceeds the NFR-033 threshold', () => {
    const payload = buildPayload();
    payload.responsiveDecisionJourneys[1].decisionTimeSec = 108;

    const result = buildUxWcagContrastConformity(payload, {
      nowMs: Date.parse('2026-03-16T12:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_DECISION_TIME_BUDGET_EXCEEDED');
    expect(result.diagnostics.budgetExceededViewports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ viewport: 'tablet', decisionTimeSec: 108 })
      ])
    );
  });

  it('is exported from index', () => {
    const result = buildFromIndex(buildPayload(), {
      nowMs: Date.parse('2026-03-16T12:00:00.000Z')
    });

    expect(result.reasonCode).toBe('OK');
  });
});
