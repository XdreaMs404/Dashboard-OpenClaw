import { describe, expect, it } from 'vitest';
import { buildUxDebtReductionLane } from '../../src/ux-debt-reduction-lane.js';
import { buildUxDebtReductionLane as buildFromIndex } from '../../src/index.js';

function buildPayload() {
  return {
    windowRef: 'S066',
    uxAudit: {
      score: 93,
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
        definition: 'Sous-gate UX bloquante qui valide design, accessibilité et responsive avant DONE.',
        context: 'Story gating'
      },
      {
        id: 'BMAD-CONCERNS',
        term: 'CONCERNS',
        definition: 'Verdict intermédiaire nécessitant corrections avant passage au gate suivant.',
        context: 'Gate lifecycle'
      }
    ],
    uxDebts: [
      {
        id: 'UXD-001',
        title: 'Réduire ambiguïté du statut CONCERNS dans la lane',
        status: 'OPEN',
        severity: 'BLOCKER',
        gate: 'G4-UX',
        riskTags: ['T07'],
        definitionRefs: ['BMAD-CONCERNS'],
        reductionPlan: {
          owner: 'ux-qa-auditor',
          targetDate: '2026-03-20',
          successMetric: '0 ambiguïté dans les tests usability rapides',
          actions: ['Aligner la microcopy', 'Ajouter exemples contextualisés']
        }
      },
      {
        id: 'UXD-002',
        title: 'Clarifier dépendance G4-UX pour éviter faux DONE',
        status: 'IN_PROGRESS',
        severity: 'MAJOR',
        gate: 'G4-UX',
        riskTags: ['U01'],
        definitionRefs: ['BMAD-G4-UX'],
        reductionPlan: {
          owner: 'bmad-pm',
          targetDate: '2026-03-22',
          successMetric: '100% stories E06 avec définitions contextualisées',
          actions: ['Ajouter résumé contextuel', 'Relier preuves UX au verdict G4-UX']
        }
      },
      {
        id: 'UXD-003',
        title: 'Ancienne dette close',
        status: 'CLOSED',
        severity: 'MINOR',
        gate: 'G4-UX',
        riskTags: ['U01'],
        definitionRefs: ['BMAD-G4-UX'],
        reductionPlan: {
          owner: 'ux-qa-auditor',
          targetDate: '2026-03-10',
          successMetric: 'Dette close',
          actions: ['Close']
        }
      }
    ]
  };
}

describe('ux-debt-reduction-lane unit', () => {
  it('validates open UX debt lane + reduction plan + contextual BMAD definitions (S066/FR-068/FR-069)', () => {
    const result = buildUxDebtReductionLane(buildPayload(), {
      nowMs: Date.parse('2026-03-18T10:00:00.000Z')
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.uxDebtReductionLane).toMatchObject({
      model: 'UX_DEBT_REDUCTION_LANE',
      modelVersion: 'S066-v1',
      summary: {
        totalDebts: 3,
        openCount: 1,
        inProgressCount: 1,
        closedCount: 1,
        blockerOpenCount: 1,
        reductionPlanCoveragePct: 100,
        definitionLinkCoveragePct: 100,
        riskCoverage: {
          T07: true,
          U01: true
        }
      }
    });
  });

  it('fails when an open debt has an incomplete reduction plan', () => {
    const payload = buildPayload();
    payload.uxDebts[0].reductionPlan.actions = [];

    const result = buildUxDebtReductionLane(payload, {
      nowMs: Date.parse('2026-03-18T10:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_DEBT_PLAN_INCOMPLETE');
    expect(result.diagnostics.reductionPlanGaps).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: 'UXD-001' })])
    );
  });

  it('fails when debt definitions are not linked to contextual BMAD definitions', () => {
    const payload = buildPayload();
    payload.uxDebts[1].definitionRefs = ['UNKNOWN-DEF'];

    const result = buildUxDebtReductionLane(payload, {
      nowMs: Date.parse('2026-03-18T10:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_BMAD_DEFINITION_LINK_MISSING');
  });

  it('is exported from index', () => {
    const result = buildFromIndex(buildPayload(), {
      nowMs: Date.parse('2026-03-18T10:00:00.000Z')
    });

    expect(result.reasonCode).toBe('OK');
  });
});
