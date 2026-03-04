import { describe, expect, it } from 'vitest';
import { buildUxKeyboardFocusVisibilityContract } from '../../src/ux-keyboard-focus-visibility-contract.js';
import { buildUxKeyboardFocusVisibilityContract as buildFromIndex } from '../../src/index.js';

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
        label: 'Vue synthèse gate',
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
        label: 'Preuves UX',
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
    criticalSurfaces: [
      {
        id: 'gate-summary-card',
        label: 'Carte synthèse gate',
        foreground: '#0f172a',
        background: '#ffffff',
        minContrastRatio: 4.5
      },
      {
        id: 'focus-ring-primary',
        label: 'Focus ring primaire',
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
    }
  };
}

describe('ux-keyboard-focus-visibility-contract unit', () => {
  it('validates keyboard navigation, visible focus, WCAG contrast and responsive checkpoints (S062)', () => {
    const result = buildUxKeyboardFocusVisibilityContract(buildPayload(), {
      nowMs: Date.parse('2026-03-15T10:00:00.000Z')
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.keyboardFocusVisibilityContract).toMatchObject({
      model: 'UX_KEYBOARD_FOCUS_VISIBILITY_CONTRACT',
      modelVersion: 'S062-v1',
      summary: {
        contrastCoveragePct: 100,
        responsiveCoveragePct: 100,
        keyboardCoveragePct: 100,
        fourStateCoveragePct: 100
      }
    });
  });

  it('fails when a critical surface does not meet contrast ratio threshold', () => {
    const payload = buildPayload();
    payload.criticalSurfaces[0].foreground = '#9ca3af';

    const result = buildUxKeyboardFocusVisibilityContract(payload, {
      nowMs: Date.parse('2026-03-15T10:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_SURFACE_CONTRAST_REQUIRED');
    expect(result.diagnostics.surfacesContrastGap).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'gate-summary-card', passesContrast: false })
      ])
    );
  });

  it('is exported from index', () => {
    const result = buildFromIndex(buildPayload(), {
      nowMs: Date.parse('2026-03-15T10:00:00.000Z')
    });

    expect(result.reasonCode).toBe('OK');
  });
});
