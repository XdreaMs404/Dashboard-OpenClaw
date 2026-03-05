export function buildS071Payload() {
  return {
    windowRef: 'S071',
    uxAudit: {
      score: 92,
      blockerCount: 0,
      wcagLevel: 'WCAG-2.2-AA'
    },
    criticalWidgets: [
      {
        id: 'ux-usability-harness-panel',
        states: {
          empty: { copy: 'Aucun run usability disponible.' },
          loading: { copy: 'Exécution du harnais usability en cours...' },
          error: { copy: 'Le run usability est en échec.' },
          success: { copy: 'Le harnais usability est validé.' }
        },
        keyboard: {
          focusOrder: ['run-filter', 'run-launch', 'run-export'],
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
        id: 'UXD-211',
        title: 'Risque faux DONE sans harnais usability rapide',
        status: 'OPEN',
        severity: 'BLOCKER',
        riskTags: ['T07'],
        definitionRefs: ['BMAD-CONCERNS'],
        reductionPlan: {
          owner: 'ux-qa-auditor',
          targetDate: '2026-04-02',
          successMetric: '0 ambiguïté sur les scénarios usability critiques',
          actions: ['Rendre les scénarios empty/loading/error/success exécutables en <3s']
        }
      },
      {
        id: 'UXD-212',
        title: 'Stabiliser lisibilité mobile/tablette/desktop',
        status: 'IN_PROGRESS',
        severity: 'MAJOR',
        riskTags: ['U01'],
        definitionRefs: ['BMAD-G4-UX'],
        reductionPlan: {
          owner: 'bmad-pm',
          targetDate: '2026-04-05',
          successMetric: '100% des runs usability couvrent les 3 viewports',
          actions: ['Automatiser les checks anti-overflow par viewport']
        }
      }
    ],
    contextualSlots: [
      { id: 'slot-gate', definitionRef: 'BMAD-G4-UX' },
      { id: 'slot-verdict', definitionRef: 'BMAD-CONCERNS' },
      { id: 'slot-fail', definitionRef: 'BMAD-FAIL' }
    ],
    designSystemChecks: [
      { id: 'usability-header', spacingPass: true, typographyPass: true, colorPass: true },
      { id: 'usability-grid', spacingPass: true, typographyPass: true, colorPass: true }
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
        id: 'usability-overview',
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
        id: 'usability-evidence-panel',
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
      { viewId: 'usability-overview', viewport: 'mobile', decisionTimeSec: 55 },
      { viewId: 'usability-overview', viewport: 'tablet', decisionTimeSec: 44 },
      { viewId: 'usability-overview', viewport: 'desktop', decisionTimeSec: 38 },
      { viewId: 'usability-evidence-panel', viewport: 'mobile', decisionTimeSec: 63 },
      { viewId: 'usability-evidence-panel', viewport: 'tablet', decisionTimeSec: 49 },
      { viewId: 'usability-evidence-panel', viewport: 'desktop', decisionTimeSec: 41 }
    ],
    microcopyCatalog: [
      {
        verdict: 'PASS',
        title: 'Harnais usability validé',
        helperText: 'Toutes les vérifications rapides sont conformes.',
        actionLabel: 'Continuer',
        states: {
          loading: 'Validation PASS en cours...',
          empty: 'Aucune correction usability restante.',
          error: 'Impossible de charger le statut PASS.',
          success: 'Story prête pour la suite.'
        },
        keyboardFlow: {
          focusOrder: ['pass-card', 'pass-action'],
          focusVisible: true,
          logicalOrder: true,
          trapFree: true
        },
        decisionTimeSec: 41,
        ttfvDays: 6
      },
      {
        verdict: 'CONCERNS',
        title: 'Corrections usability requises',
        helperText: 'Des points non bloquants restent à traiter.',
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
        decisionTimeSec: 53,
        ttfvDays: 8
      },
      {
        verdict: 'FAIL',
        title: 'Blocage usability critique',
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
        decisionTimeSec: 60,
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
          loadingMs: 230,
          emptyMs: 190,
          errorMs: 250,
          successMs: 170
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
      { surfaceId: 'pass-card', ratio: 4.9, aaPass: true },
      { surfaceId: 'concerns-card', ratio: 5.2, aaPass: true },
      { surfaceId: 'fail-card', ratio: 7.1, aaPass: true }
    ],
    usabilitySuites: [
      {
        id: 'suite-empty-mobile',
        scenario: 'empty',
        state: 'empty',
        viewport: 'mobile',
        durationMs: 780,
        pass: true,
        assertions: ['STATE_EMPTY_VISIBLE', 'NO_HORIZONTAL_OVERFLOW'],
        evidenceRefs: ['s071-empty-mobile.png', 's071-empty-mobile.log']
      },
      {
        id: 'suite-loading-tablet',
        scenario: 'loading',
        state: 'loading',
        viewport: 'tablet',
        durationMs: 960,
        pass: true,
        assertions: ['STATE_LOADING_VISIBLE', 'FOCUS_VISIBLE'],
        evidenceRefs: ['s071-loading-tablet.png']
      },
      {
        id: 'suite-error-desktop',
        scenario: 'error',
        state: 'error',
        viewport: 'desktop',
        durationMs: 1100,
        pass: true,
        assertions: ['STATE_ERROR_VISIBLE', 'RECOVERY_ACTION_PRESENT'],
        evidenceRefs: ['s071-error-desktop.png']
      },
      {
        id: 'suite-success-mobile',
        scenario: 'success',
        state: 'success',
        viewport: 'mobile',
        durationMs: 900,
        pass: true,
        assertions: ['STATE_SUCCESS_VISIBLE', 'NEXT_ACTION_AVAILABLE'],
        evidenceRefs: ['s071-success-mobile.png']
      }
    ]
  };
}
