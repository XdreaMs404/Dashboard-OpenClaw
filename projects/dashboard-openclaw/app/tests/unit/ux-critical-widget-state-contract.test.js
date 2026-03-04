import { describe, expect, it } from 'vitest';
import { buildUxCriticalWidgetStateContract } from '../../src/ux-critical-widget-state-contract.js';
import { buildUxCriticalWidgetStateContract as buildFromIndex } from '../../src/index.js';

function buildPayload() {
  return {
    windowRef: 'S061',
    uxAudit: {
      score: 92,
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
    ]
  };
}

describe('ux-critical-widget-state-contract unit', () => {
  it('validates four states and keyboard coverage on all critical widgets (S061/FR-063/FR-064)', () => {
    const result = buildUxCriticalWidgetStateContract(buildPayload(), {
      nowMs: Date.parse('2026-03-14T12:00:00.000Z')
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.criticalWidgetStateContract).toMatchObject({
      model: 'UX_CRITICAL_WIDGET_STATE_CONTRACT',
      modelVersion: 'S061-v1',
      summary: {
        criticalWidgetCount: 2,
        fullyCompliantCount: 2,
        fourStateCoveragePct: 100,
        keyboardCoveragePct: 100
      }
    });
  });

  it('fails when at least one critical widget misses a required state', () => {
    const payload = buildPayload();
    delete payload.criticalWidgets[1].states.error;

    const result = buildUxCriticalWidgetStateContract(payload, {
      nowMs: Date.parse('2026-03-14T12:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_WIDGET_FOUR_STATES_REQUIRED');
    expect(result.diagnostics.widgetsMissingStates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: 'ux-evidence-panel', missingStates: expect.arrayContaining(['error']) })
      ])
    );
  });

  it('is exported from index', () => {
    const result = buildFromIndex(buildPayload(), {
      nowMs: Date.parse('2026-03-14T12:00:00.000Z')
    });

    expect(result.reasonCode).toBe('OK');
  });
});
