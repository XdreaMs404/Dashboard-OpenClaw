import { describe, expect, it } from 'vitest';
import { buildUxDesignTokenRogueLint } from '../../src/ux-design-token-rogue-lint.js';

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

describe('ux-design-token-rogue-lint edge', () => {
  it('rejects malformed payload', () => {
    const result = buildUxDesignTokenRogueLint('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_UX_DESIGN_TOKEN_INPUT');
  });

  it('propagates base S067 failure when contextual mapping is broken', () => {
    const payload = buildPayload();
    payload.contextualSlots[0].definitionRef = 'UNKNOWN-REF';

    const result = buildUxDesignTokenRogueLint(payload, {
      nowMs: Date.parse('2026-03-20T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_GLOSSARY_CONTEXT_MAPPING_REQUIRED');
  });

  it('fails when undeclared design token usage is present', () => {
    const payload = buildPayload();
    payload.criticalViews[1].tokenUsage.colors = ['color-bg-surface', 'color-rogue-shadow'];

    const result = buildUxDesignTokenRogueLint(payload, {
      nowMs: Date.parse('2026-03-20T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_DESIGN_TOKEN_UNDECLARED_USAGE');
  });

  it('fails when decision budget is exceeded', () => {
    const payload = buildPayload();
    payload.responsiveDecisionJourneys[0].decisionTimeSec = 103;

    const result = buildUxDesignTokenRogueLint(payload, {
      nowMs: Date.parse('2026-03-20T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_DESIGN_TOKEN_DECISION_BUDGET_EXCEEDED');
  });

  it('fails when design token policy is missing', () => {
    const payload = buildPayload();
    delete payload.designTokenPolicy;

    const result = buildUxDesignTokenRogueLint(payload, {
      nowMs: Date.parse('2026-03-20T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_DESIGN_TOKEN_POLICY_REQUIRED');
  });

  it('fails when design token allowlists are incomplete', () => {
    const payload = buildPayload();
    payload.designTokenPolicy.allowedColorTokens = [];

    const result = buildUxDesignTokenRogueLint(payload, {
      nowMs: Date.parse('2026-03-20T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_DESIGN_TOKEN_ALLOWLIST_REQUIRED');
  });

  it('fails when responsive journeys are incomplete for required viewports', () => {
    const payload = buildPayload();
    payload.responsiveDecisionJourneys = payload.responsiveDecisionJourneys.filter(
      (entry) => !(entry.viewId === 'decision-panel' && entry.viewport === 'desktop')
    );

    const result = buildUxDesignTokenRogueLint(payload, {
      nowMs: Date.parse('2026-03-20T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_DESIGN_TOKEN_RESPONSIVE_COVERAGE_REQUIRED');
  });

  it('accepts alias fields via runtime policy override (views + decisionJourneys)', () => {
    const payload = buildPayload();
    delete payload.designTokenPolicy;

    payload.views = payload.criticalViews.map((view) => ({
      viewId: view.id,
      states: {
        empty: { copy: 'ok' },
        loading: { copy: 'ok' },
        error: { copy: 'ok' },
        success: { copy: 'ok' }
      },
      tokenUsage: {
        spacing: [...view.tokenUsage.spacing],
        typography: [...view.tokenUsage.typography],
        color: [...view.tokenUsage.colors]
      },
      rogueDeclarations: []
    }));
    delete payload.criticalViews;

    payload.decisionJourneys = payload.responsiveDecisionJourneys.map((entry) => ({
      id: entry.viewId,
      breakpoint: entry.viewport,
      timeToDecisionSec: entry.decisionTimeSec
    }));
    delete payload.responsiveDecisionJourneys;

    const result = buildUxDesignTokenRogueLint(payload, {
      nowMs: Date.parse('2026-03-20T09:00:00.000Z'),
      designTokenPolicy: {
        modelVersion: 'S068-v1-runtime',
        requiredViewports: ['mobile', 'tablet', 'desktop', 'desktop'],
        decisionTimeBudgetSec: 90,
        allowedSpacingTokens: ['space-2', 'space-4', 'space-6'],
        allowedTypographyTokens: ['font-body-md', 'font-heading-sm'],
        allowedColorTokens: ['color-bg-surface', 'color-text-primary', 'color-accent-strong']
      }
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.designTokenRogueLint.modelVersion).toBe('S068-v1-runtime');
  });
});
