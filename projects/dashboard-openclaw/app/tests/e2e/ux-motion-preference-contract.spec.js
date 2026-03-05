import { expect, test } from '@playwright/test';
import { buildUxMotionPreferenceContract } from '../../src/ux-motion-preference-contract.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Préférences motion (prefers-reduced-motion)</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 1rem;
        background: #fff;
        color: #0f172a;
      }
      main {
        width: min(100%, 72rem);
      }
      #reason-value,
      #diag-value,
      #summary-value,
      #profile-value,
      #error-message,
      #success-json {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      #success-json {
        margin-top: .75rem;
        padding: .75rem;
        border: 1px solid #d1d5db;
        border-radius: .5rem;
        white-space: pre-wrap;
      }
      .focus-target {
        border: 1px solid #0f172a;
        border-radius: .5rem;
        background: #ffffff;
        color: #0f172a;
        padding: .45rem .7rem;
      }
      .focus-target:focus-visible,
      button:focus-visible,
      select:focus-visible {
        outline: 3px solid #1d4ed8;
        outline-offset: 2px;
      }
      .focus-zone {
        display: flex;
        flex-wrap: wrap;
        gap: .5rem;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Préférences motion (prefers-reduced-motion)</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="missing-mode">Mode reduced manquant</option>
        <option value="reduced-noncompliant">Mode reduced non conforme</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-contract" type="button">Évaluer préférences motion</button>

      <p id="state-indicator" role="status" aria-label="État motion contract" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section aria-label="Zone focus démonstration">
        <h2>Parcours clavier critique</h2>
        <div class="focus-zone">
          <button id="focus-0" class="focus-target" type="button">Filtrer mode</button>
          <button id="focus-1" class="focus-target" type="button">Appliquer préférences</button>
          <button id="focus-2" class="focus-target" type="button">Continuer</button>
        </div>
      </section>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>summary</dt><dd id="summary-value">—</dd></div>
          <div><dt>profiles</dt><dd id="profile-value">—</dd></div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-contract');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');

      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const diagValue = document.getElementById('diag-value');
      const summaryValue = document.getElementById('summary-value');
      const profileValue = document.getElementById('profile-value');

      const setState = (state) => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;
      };

      const renderResult = (result) => {
        reasonCodeValue.textContent = result.reasonCode;
        reasonValue.textContent = result.reason;

        const diagnostics = result.diagnostics ?? {};
        diagValue.textContent =
          'model=' + String(diagnostics.motionPreferenceModelVersion ?? '—') +
          ' | missing=' + String((diagnostics.missingModes ?? []).join('|') || 'none') +
          ' | contrastFail=' + String(diagnostics.contrastFailureCount ?? '—') +
          ' | blocker=' + String(diagnostics.blockerCount ?? '—');

        const summary = result.motionPreferenceContract?.summary ?? {};
        summaryValue.textContent =
          'profiles=' + String(summary.profileCount ?? '—') +
          ' | reduced=' + String(summary.reducedModeCompliant ?? '—') +
          ' | contrast=' + String(summary.contrastPassCount ?? '—') +
          ' | score=' + String(summary.uxScore ?? '—') +
          ' | ttfv=' + String(summary.maxTtfvDays ?? '—') + 'j';

        const profiles = Array.isArray(result.motionPreferenceContract?.motionProfiles)
          ? result.motionPreferenceContract.motionProfiles
          : [];

        profileValue.textContent = profiles
          .map((entry) => String(entry.mode) + ':kbd=' + String(entry.keyboardFlowValidated))
          .join(' | ');
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 120));
          const result = await window.runMotionPreferenceScenarioRuntime(scenarioInput.value);
          renderResult(result);

          if (result.allowed && result.reasonCode === 'OK') {
            setState('success');
            errorMessage.hidden = true;
            successJson.hidden = false;
            successJson.textContent = JSON.stringify(result);
          } else {
            setState('error');
            errorMessage.hidden = false;
            errorMessage.textContent = result.reasonCode + ' — ' + result.reason;
            successJson.hidden = false;
            successJson.textContent = JSON.stringify(result);
          }
        } catch (error) {
          setState('error');
          errorMessage.hidden = false;
          errorMessage.textContent = error?.message ?? String(error);
          successJson.hidden = true;
          successJson.textContent = '';
        } finally {
          action.disabled = false;
          action.focus();
        }
      });
    </script>
  </body>
</html>
`;

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
          focusOrder: ['focus-0', 'focus-1', 'focus-2'],
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
        }
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
        }
      }
    ],
    contrastChecks: [
      { surfaceId: 'pass-card', ratio: 4.9, aaPass: true },
      { surfaceId: 'concerns-card', ratio: 5.2, aaPass: true },
      { surfaceId: 'fail-card', ratio: 7.1, aaPass: true }
    ]
  };
}

function runScenario(scenario) {
  if (scenario === 'success') {
    return buildUxMotionPreferenceContract(buildPayload(), {
      nowMs: Date.parse('2026-03-22T09:00:00.000Z')
    });
  }

  if (scenario === 'missing-mode') {
    const payload = buildPayload();
    payload.motionProfiles = payload.motionProfiles.filter((entry) => entry.mode !== 'reduced');

    return buildUxMotionPreferenceContract(payload, {
      nowMs: Date.parse('2026-03-22T09:00:00.000Z')
    });
  }

  if (scenario === 'reduced-noncompliant') {
    const payload = buildPayload();
    payload.motionProfiles[1].autoplayEnabled = true;

    return buildUxMotionPreferenceContract(payload, {
      nowMs: Date.parse('2026-03-22T09:00:00.000Z')
    });
  }

  return buildUxMotionPreferenceContract('bad-input');
}

test('motion preference demo covers empty/loading/error/success with reduced-motion compliance', async ({
  page
}) => {
  await page.exposeFunction('runMotionPreferenceScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Évaluer préférences motion' });
  const stateIndicator = page.getByRole('status', { name: 'État motion contract' });

  const reasonCodeValue = page.locator('#reason-code-value');
  const summaryValue = page.locator('#summary-value');
  const profileValue = page.locator('#profile-value');
  const errorMessage = page.getByRole('alert');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');

  await scenario.selectOption('invalid-input');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_UX_MOTION_INPUT');

  await scenario.selectOption('missing-mode');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('UX_MOTION_REQUIRED_MODE_MISSING');

  await scenario.selectOption('reduced-noncompliant');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('UX_MOTION_REDUCED_MODE_NON_COMPLIANT');

  await scenario.selectOption('success');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(summaryValue).toContainText('profiles=2');
  await expect(summaryValue).toContainText('reduced=true');
  await expect(summaryValue).toContainText('score=92');
  await expect(profileValue).toContainText('reduced:kbd=true');
  await expect(errorMessage).toBeHidden();

  const firstFocus = page.locator('#focus-0');
  const secondFocus = page.locator('#focus-1');
  await firstFocus.focus();
  await expect(firstFocus).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(secondFocus).toBeFocused();

  const outlineStyle = await secondFocus.evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outlineStyle).not.toBe('none');
});

test('motion preference demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
  page
}) => {
  await page.exposeFunction('runMotionPreferenceScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  await page.getByLabel('Scénario').selectOption('success');
  await page.getByRole('button', { name: 'Évaluer préférences motion' }).click();
  await expect(page.getByRole('status', { name: 'État motion contract' })).toHaveAttribute(
    'data-state',
    'success'
  );

  const viewports = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    const overflow = await page.evaluate(() => {
      const selectors = [
        '#reason-value',
        '#diag-value',
        '#summary-value',
        '#profile-value',
        '#error-message',
        '#success-json'
      ];

      const values = selectors.map((selector) => {
        const element = document.querySelector(selector);

        if (!element) {
          return 0;
        }

        return Math.max(0, element.scrollWidth - element.clientWidth);
      });

      const docOverflow = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);

      return Math.max(docOverflow, ...values);
    });

    expect(overflow).toBe(0);
  }
});
