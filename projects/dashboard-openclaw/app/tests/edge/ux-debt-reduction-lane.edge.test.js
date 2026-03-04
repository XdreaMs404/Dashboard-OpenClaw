import { describe, expect, it } from 'vitest';
import { buildUxDebtReductionLane } from '../../src/ux-debt-reduction-lane.js';

function buildPayload() {
  return {
    windowRef: 'S066',
    uxAudit: {
      score: 92,
      blockerCount: 0,
      wcagLevel: 'WCAG-2.2-AA'
    },
    criticalWidgets: [
      {
        id: 'ux-debt-lane',
        states: {
          empty: { copy: 'Aucune dette UX ouverte.' },
          loading: { copy: 'Chargement des dettes UX...' },
          error: { copy: 'Impossible de charger la lane UX.' },
          success: { copy: 'Lane UX disponible.' }
        },
        keyboard: {
          focusOrder: ['lane-filter', 'lane-refresh', 'lane-open-details'],
          focusVisible: true,
          logicalOrder: true,
          trapFree: true
        }
      }
    ],
    bmadDefinitions: [
      {
        id: 'BMAD-G4-UX',
        term: 'G4-UX',
        definition: 'Sous-gate UX bloquante qui valide design, accessibilité et responsive avant DONE.'
      },
      {
        id: 'BMAD-CONCERNS',
        term: 'CONCERNS',
        definition: 'Verdict intermédiaire nécessitant corrections avant passage au gate suivant.'
      }
    ],
    uxDebts: [
      {
        id: 'UXD-001',
        title: 'Dette ouverte',
        status: 'OPEN',
        severity: 'MAJOR',
        riskTags: ['T07'],
        definitionRefs: ['BMAD-CONCERNS'],
        reductionPlan: {
          owner: 'ux-qa-auditor',
          targetDate: '2026-03-20',
          successMetric: 'Plan validé',
          actions: ['Action 1']
        }
      },
      {
        id: 'UXD-002',
        title: 'Dette en cours',
        status: 'IN_PROGRESS',
        severity: 'MINOR',
        riskTags: ['U01'],
        definitionRefs: ['BMAD-G4-UX'],
        reductionPlan: {
          owner: 'bmad-pm',
          targetDate: '2026-03-22',
          successMetric: 'Plan in progress',
          actions: ['Action 2']
        }
      }
    ]
  };
}

describe('ux-debt-reduction-lane edge', () => {
  it('rejects malformed payload', () => {
    const result = buildUxDebtReductionLane('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_UX_DEBT_LANE_INPUT');
  });

  it('propagates base S061 failure when widget states are incomplete', () => {
    const payload = buildPayload();
    delete payload.criticalWidgets[0].states.success;

    const result = buildUxDebtReductionLane(payload, {
      nowMs: Date.parse('2026-03-18T10:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_WIDGET_FOUR_STATES_REQUIRED');
  });

  it('fails when BMAD contextual definitions are missing', () => {
    const payload = buildPayload();
    payload.bmadDefinitions = [];

    const result = buildUxDebtReductionLane(payload, {
      nowMs: Date.parse('2026-03-18T10:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_BMAD_DEFINITIONS_REQUIRED');
  });

  it('fails when no open or in-progress debt remains visible', () => {
    const payload = buildPayload();
    payload.uxDebts = payload.uxDebts.map((entry) => ({ ...entry, status: 'CLOSED' }));

    const result = buildUxDebtReductionLane(payload, {
      nowMs: Date.parse('2026-03-18T10:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_DEBT_OPEN_ITEMS_REQUIRED');
  });

  it('fails when required risk tags are not covered in open UX debt lane', () => {
    const payload = buildPayload();
    payload.uxDebts = payload.uxDebts.map((entry) => ({ ...entry, riskTags: ['T07'] }));

    const result = buildUxDebtReductionLane(payload, {
      nowMs: Date.parse('2026-03-18T10:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_DEBT_RISK_COVERAGE_REQUIRED');
    expect(result.diagnostics.missingRiskCoverage).toEqual(expect.arrayContaining(['U01']));
  });
});
