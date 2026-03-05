import { describe, expect, it } from 'vitest';
import { buildUxDesignTokenRogueLint } from '../../src/ux-design-token-rogue-lint.js';
import { buildUxDesignTokenRogueLint as buildFromIndex } from '../../src/index.js';

function buildPayload() {
  return {
    windowRef: 'S068',
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
      { id: 'slot-verdict', definitionRef: 'BMAD-CONCERNS' }
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
    ]
  };
}

describe('ux-design-token-rogue-lint unit', () => {
  it('validates design token governance + 4 states + responsive decision budget (S068/FR-070/FR-063)', () => {
    const result = buildUxDesignTokenRogueLint(buildPayload(), {
      nowMs: Date.parse('2026-03-20T09:00:00.000Z')
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.designTokenRogueLint).toMatchObject({
      model: 'UX_DESIGN_TOKEN_ROGUE_LINT',
      modelVersion: 'S068-v1',
      summary: {
        criticalViewCount: 2,
        compliantViewCount: 2,
        fourStateCoveragePct: 100,
        responsiveCoveragePct: 100,
        rogueSurfaceCount: 0,
        worstDecisionTimeSec: 66,
        decisionTimeBudgetSec: 90,
        withinDecisionBudget: true
      }
    });
  });

  it('fails when rogue style usage is detected', () => {
    const payload = buildPayload();
    payload.criticalViews[1].rogueStyles = ['style="margin: 13px"'];

    const result = buildUxDesignTokenRogueLint(payload, {
      nowMs: Date.parse('2026-03-20T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_DESIGN_TOKEN_ROGUE_STYLE_DETECTED');
  });

  it('fails when one critical view misses one mandatory state', () => {
    const payload = buildPayload();
    payload.criticalViews[0].states.error = false;

    const result = buildUxDesignTokenRogueLint(payload, {
      nowMs: Date.parse('2026-03-20T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_CRITICAL_VIEW_FOUR_STATES_REQUIRED');
  });

  it('is exported from index', () => {
    const result = buildFromIndex(buildPayload(), {
      nowMs: Date.parse('2026-03-20T09:00:00.000Z')
    });

    expect(result.reasonCode).toBe('OK');
  });
});
