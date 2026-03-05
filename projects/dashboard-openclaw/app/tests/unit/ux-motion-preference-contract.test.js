import { describe, expect, it } from 'vitest';
import { buildUxMotionPreferenceContract } from '../../src/ux-motion-preference-contract.js';
import { buildUxMotionPreferenceContract as buildFromIndex } from '../../src/index.js';

function buildPayload() {
  return {
    windowRef: 'S070',
    uxAudit: {
      score: 92,
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
    ],
    motionProfiles: [
      {
        mode: 'default',
        transitionMs: 220,
        autoplayEnabled: true,
        parallaxEnabled: true,
        respectReducedMotion: true,
        focusVisibleMaintained: true,
        keyboardFlowValidated: true,
        stateDurations: {
          loadingMs: 240,
          emptyMs: 200,
          errorMs: 260,
          successMs: 180
        },
        evidenceRef: 'motion-default.json'
      },
      {
        mode: 'reduced',
        transitionMs: 80,
        autoplayEnabled: false,
        parallaxEnabled: false,
        respectReducedMotion: true,
        focusVisibleMaintained: true,
        keyboardFlowValidated: true,
        stateDurations: {
          loadingMs: 120,
          emptyMs: 110,
          errorMs: 130,
          successMs: 90
        },
        evidenceRef: 'motion-reduced.json'
      }
    ],
    contrastChecks: [
      {
        surfaceId: 'pass-card',
        ratio: 4.9,
        aaPass: true
      },
      {
        surfaceId: 'concerns-card',
        ratio: 5.2,
        aaPass: true
      },
      {
        surfaceId: 'fail-card',
        ratio: 7.1,
        aaPass: true
      }
    ]
  };
}

describe('ux-motion-preference-contract unit', () => {
  it('validates reduced-motion preferences without breaking keyboard/contrast/quality constraints', () => {
    const result = buildUxMotionPreferenceContract(buildPayload(), {
      nowMs: Date.parse('2026-03-22T09:00:00.000Z')
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.motionPreferenceContract).toMatchObject({
      model: 'UX_MOTION_PREFERENCE_CONTRACT',
      modelVersion: 'S070-v1',
      summary: {
        profileCount: 2,
        keyboardReadyCount: 2,
        reducedModeCompliant: true,
        contrastPassCount: 3,
        uxScore: 92,
        blockerCount: 0,
        maxTtfvDays: 9
      }
    });
  });

  it('fails when reduced mode is missing', () => {
    const payload = buildPayload();
    payload.motionProfiles = payload.motionProfiles.filter((entry) => entry.mode !== 'reduced');

    const result = buildUxMotionPreferenceContract(payload, {
      nowMs: Date.parse('2026-03-22T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_MOTION_REQUIRED_MODE_MISSING');
  });

  it('fails when reduced mode still runs non-essential animation', () => {
    const payload = buildPayload();
    payload.motionProfiles[1].autoplayEnabled = true;

    const result = buildUxMotionPreferenceContract(payload, {
      nowMs: Date.parse('2026-03-22T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_MOTION_REDUCED_MODE_NON_COMPLIANT');
  });

  it('fails when ux score is below NFR-030 threshold', () => {
    const payload = buildPayload();
    payload.uxAudit.score = 79;

    const result = buildUxMotionPreferenceContract(payload, {
      nowMs: Date.parse('2026-03-22T09:00:00.000Z'),
      widgetStateRules: {
        minUxScore: 70,
        maxBlockers: 3
      }
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_MOTION_QUALITY_SCORE_LOW');
  });

  it('is exported from index', () => {
    const result = buildFromIndex(buildPayload(), {
      nowMs: Date.parse('2026-03-22T09:00:00.000Z')
    });

    expect(result.reasonCode).toBe('OK');
  });
});
