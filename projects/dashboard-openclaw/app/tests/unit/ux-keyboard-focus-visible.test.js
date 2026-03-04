import { describe, expect, it } from 'vitest';
import { buildUxKeyboardFocusVisibleContract } from '../../src/ux-keyboard-focus-visible.js';
import { buildUxKeyboardFocusVisibleContract as buildFromIndex } from '../../src/index.js';

function buildPayload() {
  return {
    windowRef: 'S062',
    uxAudit: {
      score: 93,
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
      },
      {
        id: 'ux-evidence-panel',
        states: {
          empty: { copy: 'Aucune capture UX enregistrée.' },
          loading: { copy: 'Indexation des captures UX…' },
          error: { copy: 'Erreur pendant l’indexation des captures UX.' },
          success: { copy: 'Preuves UX synchronisées.' }
        },
        keyboard: {
          focusOrder: ['view-mobile', 'view-tablet', 'view-desktop'],
          focusVisible: true,
          logicalOrder: true,
          trapFree: true
        }
      }
    ],
    keyboardJourneys: [
      {
        id: 'journey-gate-overview',
        label: 'Parcours synthèse gate',
        keyboardOnly: true,
        logicalOrder: true,
        trapFree: true,
        steps: [
          { target: 'period-filter', focusVisible: true, order: 1 },
          { target: 'refresh-gates', focusVisible: true, order: 2 },
          { target: 'open-proof', focusVisible: true, order: 3 }
        ]
      },
      {
        id: 'journey-ux-evidence',
        label: 'Parcours preuves UX',
        keyboardOnly: true,
        logicalOrder: true,
        trapFree: true,
        steps: [
          { target: 'view-mobile', focusVisible: true, order: 1 },
          { target: 'view-tablet', focusVisible: true, order: 2 },
          { target: 'view-desktop', focusVisible: true, order: 3 }
        ]
      }
    ],
    contrastChecks: [
      { id: 'gate-header', ratio: 5.1, requiredRatio: 4.5 },
      { id: 'focus-ring-primary', ratio: 4.8, requiredRatio: 3, isLargeText: true },
      { id: 'error-alert', ratio: 6.4, requiredRatio: 4.5 }
    ],
    responsiveChecks: [
      {
        viewport: 'mobile',
        status: 'PASS',
        evidenceRef: '_bmad-output/implementation-artifacts/ux-audits/evidence/S062/responsive-mobile.png'
      },
      {
        viewport: 'tablet',
        status: 'PASS',
        evidenceRef: '_bmad-output/implementation-artifacts/ux-audits/evidence/S062/responsive-tablet.png'
      },
      {
        viewport: 'desktop',
        status: 'PASS',
        evidenceRef: '_bmad-output/implementation-artifacts/ux-audits/evidence/S062/responsive-desktop.png'
      }
    ]
  };
}

describe('ux-keyboard-focus-visible unit', () => {
  it('validates full keyboard navigation with visible focus, WCAG contrast and responsive coverage (S062/FR-064/FR-065)', () => {
    const result = buildUxKeyboardFocusVisibleContract(buildPayload(), {
      nowMs: Date.parse('2026-03-15T12:00:00.000Z')
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.keyboardFocusVisibleContract).toMatchObject({
      model: 'UX_KEYBOARD_FOCUS_VISIBLE_CONTRACT',
      modelVersion: 'S062-v1',
      summary: {
        journeyCount: 2,
        journeyCompleteCount: 2,
        contrastPassingCount: 3,
        responsivePassCount: 3
      }
    });
  });

  it('fails when a contrast surface is below WCAG threshold', () => {
    const payload = buildPayload();
    payload.contrastChecks[0].ratio = 3.9;

    const result = buildUxKeyboardFocusVisibleContract(payload, {
      nowMs: Date.parse('2026-03-15T12:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_CONTRAST_WCAG_VIOLATION');
    expect(result.diagnostics.contrastFailing).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'gate-header', ratio: 3.9, requiredRatio: 4.5 })
      ])
    );
  });

  it('is exported from index', () => {
    const result = buildFromIndex(buildPayload(), {
      nowMs: Date.parse('2026-03-15T12:00:00.000Z')
    });

    expect(result.reasonCode).toBe('OK');
  });
});
