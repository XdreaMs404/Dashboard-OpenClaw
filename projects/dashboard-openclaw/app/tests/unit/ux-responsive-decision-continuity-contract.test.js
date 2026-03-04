import { describe, expect, it } from 'vitest';
import { buildUxResponsiveDecisionContinuityContract } from '../../src/ux-responsive-decision-continuity-contract.js';
import { buildUxResponsiveDecisionContinuityContract as buildFromIndex } from '../../src/index.js';

function buildPayload() {
  return {
    windowRef: 'S064',
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
        noHorizontalOverflow: true
      },
      {
        viewport: 'tablet',
        decisionTimeSec: 67,
        keyboardValidated: true,
        focusVisibleValidated: true,
        contrastValidated: true,
        noHorizontalOverflow: true
      },
      {
        viewport: 'desktop',
        decisionTimeSec: 59,
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
        decisionTimeSec: 77,
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
        decisionTimeSec: 70,
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
        decisionTimeSec: 63,
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
        decisionTimeSec: 61,
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

describe('ux-responsive-decision-continuity-contract unit', () => {
  it('validates 360/768/1366/1920 continuity with G4-UX evidence links (S064/FR-066/FR-067)', () => {
    const result = buildUxResponsiveDecisionContinuityContract(buildPayload(), {
      nowMs: Date.parse('2026-03-17T12:00:00.000Z')
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.responsiveDecisionContinuityContract).toMatchObject({
      model: 'UX_RESPONSIVE_DECISION_CONTINUITY_CONTRACT',
      modelVersion: 'S064-v1',
      summary: {
        proofCount: 4,
        completeCount: 4,
        linkedEvidenceCount: 4,
        continuityCoveragePct: 100,
        worstDecisionTimeSec: 77,
        withinDecisionBudget: true
      }
    });
  });

  it('fails when one required width proof is missing', () => {
    const payload = buildPayload();
    payload.responsiveDecisionProofs = payload.responsiveDecisionProofs.filter(
      (entry) => entry.viewportWidth !== 1920
    );

    const result = buildUxResponsiveDecisionContinuityContract(payload, {
      nowMs: Date.parse('2026-03-17T12:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_RESPONSIVE_VIEWPORT_REQUIRED');
    expect(result.diagnostics.missingWidths).toEqual(expect.arrayContaining([1920]));
  });

  it('fails when a proof is not linked to G4-UX capture + verdict references', () => {
    const payload = buildPayload();
    payload.responsiveDecisionProofs[2].g4UxVerdictRef = '';

    const result = buildUxResponsiveDecisionContinuityContract(payload, {
      nowMs: Date.parse('2026-03-17T12:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_G4_UX_EVIDENCE_LINK_REQUIRED');
    expect(result.diagnostics.missingEvidenceLinks).toEqual(
      expect.arrayContaining([expect.objectContaining({ width: 1366 })])
    );
  });

  it('is exported from index', () => {
    const result = buildFromIndex(buildPayload(), {
      nowMs: Date.parse('2026-03-17T12:00:00.000Z')
    });

    expect(result.reasonCode).toBe('OK');
  });
});
