import { describe, expect, it } from 'vitest';
import { buildUxMotionPreferenceContract } from '../../src/ux-motion-preference-contract.js';

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

describe('ux-motion-preference-contract edge', () => {
  it('rejects malformed payload', () => {
    const result = buildUxMotionPreferenceContract('bad-input');

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('INVALID_UX_MOTION_INPUT');
  });

  it('propagates base S069 failure when FAIL microcopy is missing', () => {
    const payload = buildPayload();
    payload.microcopyCatalog = payload.microcopyCatalog.filter((entry) => entry.verdict !== 'FAIL');

    const result = buildUxMotionPreferenceContract(payload, {
      nowMs: Date.parse('2026-03-22T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_MICROCOPY_MISSING_VERDICT_ENTRY');
  });

  it('fails when contrast check is below AA threshold', () => {
    const payload = buildPayload();
    payload.contrastChecks[0].ratio = 3.4;
    payload.contrastChecks[0].aaPass = false;

    const result = buildUxMotionPreferenceContract(payload, {
      nowMs: Date.parse('2026-03-22T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_MOTION_CONTRAST_AA_REQUIRED');
  });

  it('fails when blocker count is above threshold', () => {
    const payload = buildPayload();
    payload.uxAudit.blockerCount = 1;

    const result = buildUxMotionPreferenceContract(payload, {
      nowMs: Date.parse('2026-03-22T09:00:00.000Z'),
      widgetStateRules: {
        minUxScore: 85,
        maxBlockers: 2
      }
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_MOTION_BLOCKERS_PRESENT');
  });

  it('fails when ttfv exceeds NFR-040 limit', () => {
    const payload = buildPayload();
    payload.microcopyCatalog[0].ttfvDays = 16;

    const result = buildUxMotionPreferenceContract(payload, {
      nowMs: Date.parse('2026-03-22T09:00:00.000Z'),
      microcopyCatalogRules: {
        ttfvMaxDays: 21
      }
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_MOTION_TTFV_EXCEEDED');
  });

  it('accepts aliases and runtime rules override', () => {
    const payload = buildPayload();
    payload.prefersReducedMotionProfiles = [
      {
        preference: 'default',
        motionDurationMs: 200,
        autoAnimate: true,
        parallax: true,
        focusVisible: true,
        keyboardNavigation: true
      },
      {
        preference: 'reduced',
        motionDurationMs: 60,
        autoAnimate: false,
        parallax: false,
        respectsReducedMotion: true,
        focusRingVisible: true,
        keyboardValidated: true
      }
    ];
    delete payload.motionProfiles;

    payload.motionContrastChecks = [
      { id: 'pass', contrastRatio: 4.8, pass: true },
      { id: 'concerns', contrastRatio: 5.1, pass: true },
      { id: 'fail', contrastRatio: 7.2, pass: true }
    ];
    delete payload.contrastChecks;

    const result = buildUxMotionPreferenceContract(payload, {
      nowMs: Date.parse('2026-03-22T09:00:00.000Z'),
      motionPreferenceRules: {
        modelVersion: 'S070-runtime',
        requiredModes: ['default', 'reduced', 'reduced'],
        contrastRatioMin: 4.5,
        reducedTransitionMaxMs: 120,
        scoreMin: 85,
        blockerMax: 0,
        ttfvMaxDays: 14
      }
    });

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.motionPreferenceContract.modelVersion).toBe('S070-runtime');
  });

  it('fails when motion profiles are missing', () => {
    const payload = buildPayload();
    delete payload.motionProfiles;

    const result = buildUxMotionPreferenceContract(payload, {
      nowMs: Date.parse('2026-03-22T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_MOTION_PROFILES_REQUIRED');
  });

  it('fails when reduced mode degrades keyboard access', () => {
    const payload = buildPayload();
    payload.motionProfiles[1].keyboardFlowValidated = false;

    const result = buildUxMotionPreferenceContract(payload, {
      nowMs: Date.parse('2026-03-22T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_MOTION_KEYBOARD_ACCESS_REQUIRED');
  });

  it('fails when no contrast checks are provided', () => {
    const payload = buildPayload();
    delete payload.contrastChecks;

    const result = buildUxMotionPreferenceContract(payload, {
      nowMs: Date.parse('2026-03-22T09:00:00.000Z')
    });

    expect(result.allowed).toBe(false);
    expect(result.reasonCode).toBe('UX_MOTION_CONTRAST_AA_REQUIRED');
  });

  it('uses payload rules fallback and id/surface/value aliases without runtime nowMs override', () => {
    const payload = buildPayload();
    payload.motionPreferenceModelVersion = 'S070-payload-rules';
    payload.motionPreferenceRules = {
      requiredModes: []
    };

    payload.motionProfiles = [
      {
        id: 'default',
        durationMs: 'unknown',
        autoplayEnabled: true,
        parallaxEnabled: true,
        focusVisibleMaintained: true,
        keyboardFlowValidated: true,
        stateDurations: {
          loading: 210,
          empty: 190,
          error: 230,
          success: 170
        }
      },
      {
        mode: 'reduced',
        transitionMs: 80,
        autoplayEnabled: false,
        parallaxEnabled: false,
        respectReducedMotion: true,
        focusVisibleMaintained: true,
        keyboardFlowValidated: true
      }
    ];

    payload.contrastChecks = [
      { surface: 'pass-card', value: 4.9 },
      { surface: 'concerns-card', value: 5.1 },
      { surface: 'fail-card', value: 7.2 }
    ];

    const result = buildUxMotionPreferenceContract(payload);

    expect(result.allowed).toBe(true);
    expect(result.reasonCode).toBe('OK');
    expect(result.motionPreferenceContract.modelVersion).toBe('S070-payload-rules');
    expect(result.motionPreferenceContract.summary.profileCount).toBe(2);
  });
});
