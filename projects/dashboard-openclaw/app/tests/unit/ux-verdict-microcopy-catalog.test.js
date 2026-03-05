import { describe, expect, it } from 'vitest';
import { buildUxVerdictMicrocopyCatalog } from '../../src/ux-verdict-microcopy-catalog.js';
import { buildUxVerdictMicrocopyCatalog as buildFromIndex } from '../../src/index.js';

function buildPayload() {
  return {
    windowRef: 'S069',
    uxAudit: {
      score: 95,
      blockerCount: 0,
      wcagLevel: 'WCAG-2.2-AA'
    },
    criticalWidgets: [
      {
        id: 'ux-token-lint-panel',
        states: {
          empty: { copy: 'Aucune vue critique à auditer.' },
          loading: { copy: 'Audit design tokens en cours...' },
          error: { copy: 'Audit design tokens en erreur.' },
          success: { copy: 'Audit design tokens validé.' }
        },
        keyboard: {
          focusOrder: ['token-filter', 'token-run', 'token-export'],
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
        definition: 'Sous-gate UX bloquante validant design, accessibilité et responsive avant DONE.'
      },
      {
        id: 'BMAD-CONCERNS',
        term: 'CONCERNS',
        definition: 'Verdict intermédiaire demandant correction avant progression.'
      },
      {
        id: 'BMAD-FAIL',
        term: 'FAIL',
        definition: 'Blocage total nécessitant correction immédiate.'
      }
    ],
    uxDebts: [
      {
        id: 'UXD-201',
        title: 'Risque faux DONE sans lint token global',
        status: 'OPEN',
        severity: 'BLOCKER',
        riskTags: ['T07'],
        definitionRefs: ['BMAD-CONCERNS'],
        reductionPlan: {
          owner: 'ux-qa-auditor',
          targetDate: '2026-03-28',
          successMetric: '0 style rogue sur vues critiques',
          actions: ['Bloquer styles inline non autorisés']
        }
      },
      {
        id: 'UXD-202',
        title: 'Consolider cohérence spacing/typo/couleurs',
        status: 'IN_PROGRESS',
        severity: 'MAJOR',
        riskTags: ['U01'],
        definitionRefs: ['BMAD-G4-UX'],
        reductionPlan: {
          owner: 'bmad-pm',
          targetDate: '2026-03-30',
          successMetric: '100% vues critiques lintées',
          actions: ['Uniformiser tokens design system']
        }
      }
    ],
    contextualSlots: [
      { id: 'slot-gate', definitionRef: 'BMAD-G4-UX' },
      { id: 'slot-verdict', definitionRef: 'BMAD-CONCERNS' },
      { id: 'slot-fail', definitionRef: 'BMAD-FAIL' }
    ],
    designSystemChecks: [
      { id: 'token-audit-header', spacingPass: true, typographyPass: true, colorPass: true },
      { id: 'token-audit-table', spacingPass: true, typographyPass: true, colorPass: true }
    ],
    responsiveChecks: [
      { viewport: 'mobile', readable: true, noHorizontalOverflow: true, pass: true },
      { viewport: 'tablet', readable: true, noHorizontalOverflow: true, pass: true },
      { viewport: 'desktop', readable: true, noHorizontalOverflow: true, pass: true }
    ],
    designTokenPolicy: {
      modelVersion: 'S068-v1',
      requiredViewports: ['mobile', 'tablet', 'desktop'],
      decisionTimeBudgetSec: 90,
      allowedSpacingTokens: ['space-2', 'space-4', 'space-6'],
      allowedTypographyTokens: ['font-body-md', 'font-heading-sm'],
      allowedColorTokens: ['color-bg-surface', 'color-text-primary', 'color-accent-strong']
    },
    criticalViews: [
      {
        id: 'gate-overview',
        states: {
          empty: true,
          loading: true,
          error: true,
          success: true
        },
        tokenUsage: {
          spacing: ['space-2', 'space-4'],
          typography: ['font-heading-sm', 'font-body-md'],
          colors: ['color-bg-surface', 'color-text-primary']
        },
        rogueStyles: []
      },
      {
        id: 'decision-panel',
        states: {
          empty: true,
          loading: true,
          error: true,
          success: true
        },
        tokenUsage: {
          spacing: ['space-2', 'space-6'],
          typography: ['font-body-md'],
          colors: ['color-bg-surface', 'color-accent-strong']
        },
        rogueStyles: []
      }
    ],
    responsiveDecisionJourneys: [
      { viewId: 'gate-overview', viewport: 'mobile', decisionTimeSec: 58 },
      { viewId: 'gate-overview', viewport: 'tablet', decisionTimeSec: 47 },
      { viewId: 'gate-overview', viewport: 'desktop', decisionTimeSec: 41 },
      { viewId: 'decision-panel', viewport: 'mobile', decisionTimeSec: 66 },
      { viewId: 'decision-panel', viewport: 'tablet', decisionTimeSec: 52 },
      { viewId: 'decision-panel', viewport: 'desktop', decisionTimeSec: 44 }
    ],
    microcopyCatalog: [
      {
        verdict: 'PASS',
        title: 'Validation complète',
        helperText: 'Tous les contrôles requis sont validés.',
        actionLabel: 'Continuer',
        tone: 'positive',
        states: {
          loading: 'Validation PASS en cours...',
          empty: 'Aucune action corrective restante.',
          error: 'Impossible de charger le statut PASS.',
          success: 'Story prête pour étape suivante.'
        },
        keyboardFlow: {
          focusOrder: ['pass-card', 'pass-action'],
          focusVisible: true,
          logicalOrder: true,
          trapFree: true
        },
        decisionTimeSec: 42,
        ttfvDays: 6
      },
      {
        verdict: 'CONCERNS',
        title: 'Corrections requises',
        helperText: 'Des ajustements non bloquants sont nécessaires.',
        actionLabel: 'Voir actions',
        tone: 'warning',
        states: {
          loading: 'Analyse CONCERNS en cours...',
          empty: 'Aucune action CONCERNS ouverte.',
          error: 'Impossible de charger CONCERNS.',
          success: 'Plan de correction disponible.'
        },
        keyboardFlow: {
          focusOrder: ['concerns-card', 'concerns-action'],
          focusVisible: true,
          logicalOrder: true,
          trapFree: true
        },
        decisionTimeSec: 55,
        ttfvDays: 8
      },
      {
        verdict: 'FAIL',
        title: 'Blocage critique',
        helperText: 'Un correctif immédiat est requis avant progression.',
        actionLabel: 'Corriger maintenant',
        tone: 'critical',
        states: {
          loading: 'Analyse FAIL en cours...',
          empty: 'Aucun blocage critique en attente.',
          error: 'Impossible de charger FAIL.',
          success: 'Blocage traité, revérification requise.'
        },
        keyboardFlow: {
          focusOrder: ['fail-card', 'fail-action'],
          focusVisible: true,
          logicalOrder: true,
          trapFree: true
        },
        decisionTimeSec: 63,
        ttfvDays: 9
      }
    ]
  };
}

describe('ux-verdict-microcopy-catalog unit', () => {
  it('validates PASS/CONCERNS/FAIL microcopy catalog with 4 states, keyboard flow, PER-01 and TTFV constraints', () => {
    const result = buildUxVerdictMicrocopyCatalog(buildPayload(), {
      nowMs: Date.parse('2026-03-21T09:00:00.000Z')
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.verdictMicrocopyCatalog).toMatchObject({
      model: 'UX_VERDICT_MICROCOPY_CATALOG',
      modelVersion: 'S069-v1',
      summary: {
        entryCount: 3,
        completeEntryCount: 3,
        keyboardReadyCount: 3,
        stateCoveragePct: 100,
        keyboardFlowCoveragePct: 100,
        worstDecisionTimeSec: 63,
        maxTtfvDays: 9,
        withinDecisionBudget: true,
        withinTtfvThreshold: true
      }
    });
  });

  it('fails when FAIL verdict microcopy entry is missing', () => {
    const payload = buildPayload();
    payload.microcopyCatalog = payload.microcopyCatalog.filter((entry) => entry.verdict !== 'FAIL');

    const result = buildUxVerdictMicrocopyCatalog(payload, {
      nowMs: Date.parse('2026-03-21T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_MICROCOPY_MISSING_VERDICT_ENTRY');
  });

  it('fails when one entry has incomplete state microcopy', () => {
    const payload = buildPayload();
    payload.microcopyCatalog[1].states.error = '';

    const result = buildUxVerdictMicrocopyCatalog(payload, {
      nowMs: Date.parse('2026-03-21T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_MICROCOPY_ENTRY_INCOMPLETE');
  });

  it('is exported from index', () => {
    const result = buildFromIndex(buildPayload(), {
      nowMs: Date.parse('2026-03-21T09:00:00.000Z')
    });

    expect(result.reasonCode).toBe('OK');
  });
});
