import { expect, test } from '@playwright/test';
import { buildUxWcagContrastConformity } from '../../src/ux-wcag-contrast-conformity.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Conformité contraste WCAG 2.2 AA</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      }
      * {
        box-sizing: border-box;
      }
      body {
        margin: 0;
        padding: 1rem;
      }
      main {
        width: min(100%, 72rem);
      }
      #reason-value,
      #diag-value,
      #summary-value,
      #viewports-value,
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
        border: 1px solid #1f2937;
        border-radius: .5rem;
        background: #ffffff;
        color: #111827;
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
      <h1>Conformité contraste WCAG 2.2 AA</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="missing-viewport">Viewport manquant</option>
        <option value="journey-incomplete">Parcours viewport incomplet</option>
        <option value="budget-exceeded">Temps décision > 90s</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-contract" type="button">Évaluer conformité WCAG</button>

      <p id="state-indicator" role="status" aria-label="État conformité WCAG" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section aria-label="Zone focus démonstration">
        <h2>Parcours clavier critique</h2>
        <div class="focus-zone">
          <button id="focus-0" class="focus-target" type="button">Filtre période</button>
          <button id="focus-1" class="focus-target" type="button">Rafraîchir verdicts</button>
          <button id="focus-2" class="focus-target" type="button">Ouvrir preuve</button>
        </div>
      </section>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>summary</dt><dd id="summary-value">—</dd></div>
          <div><dt>viewports</dt><dd id="viewports-value">—</dd></div>
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
      const viewportsValue = document.getElementById('viewports-value');

      const setState = (state) => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;
      };

      const renderResult = (result) => {
        reasonCodeValue.textContent = result.reasonCode;
        reasonValue.textContent = result.reason;

        const diagnostics = result.diagnostics ?? {};
        diagValue.textContent =
          'model=' + String(diagnostics.wcagConformityModelVersion ?? '—') +
          ' | coverage=' + String(diagnostics.responsiveCoveragePct ?? '—') +
          ' | worst=' + String(diagnostics.worstDecisionTimeSec ?? '—') +
          ' | budget=' + String(diagnostics.decisionTimeBudgetSec ?? '—');

        const summary = result.wcagContrastConformity?.summary ?? {};
        summaryValue.textContent =
          'viewports=' + String(summary.completeViewportCount ?? '—') + '/' + String(summary.viewportCount ?? '—') +
          ' | responsive=' + String(summary.responsiveCoveragePct ?? '—') +
          '% | worst=' + String(summary.worstDecisionTimeSec ?? '—') + 's';

        const viewports = Array.isArray(result.wcagContrastConformity?.viewports)
          ? result.wcagContrastConformity.viewports
          : [];

        viewportsValue.textContent = viewports
          .map((entry) => String(entry.viewport) + ':' + String(entry.decisionTimeSec) + 's/complete=' + String(entry.complete))
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
          const result = await window.runWcagConformityScenarioRuntime(scenarioInput.value);
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
    windowRef: 'S063',
    uxAudit: {
      score: 94,
      blockerCount: 0,
      wcagLevel: 'WCAG-2.2-AA'
    },
    criticalWidgets: [
      {
        id: 'gate-overview',
        states: {
          empty: { copy: 'Aucune donnée gate disponible.' },
          loading: { copy: 'Chargement des verdicts en cours…' },
          error: { copy: 'Impossible de charger les verdicts.' },
          success: { copy: 'Verdicts gate disponibles.' }
        },
        keyboard: {
          focusOrder: ['focus-0', 'focus-1', 'focus-2'],
          focusVisible: true,
          logicalOrder: true,
          trapFree: true
        }
      }
    ],
    criticalSurfaces: [
      {
        id: 'gate-summary-card',
        foreground: '#0f172a',
        background: '#ffffff',
        minContrastRatio: 4.5
      },
      {
        id: 'focus-ring-primary',
        foreground: '#1d4ed8',
        background: '#ffffff',
        minContrastRatio: 3
      }
    ],
    responsive: {
      viewports: [
        {
          viewport: 'mobile',
          criticalFlowValidated: true,
          keyboardNavigationValidated: true,
          focusVisibleValidated: true,
          noHorizontalOverflow: true
        },
        {
          viewport: 'tablet',
          criticalFlowValidated: true,
          keyboardNavigationValidated: true,
          focusVisibleValidated: true,
          noHorizontalOverflow: true
        },
        {
          viewport: 'desktop',
          criticalFlowValidated: true,
          keyboardNavigationValidated: true,
          focusVisibleValidated: true,
          noHorizontalOverflow: true
        }
      ]
    },
    responsiveDecisionJourneys: [
      {
        viewport: 'mobile',
        decisionTimeSec: 72,
        keyboardValidated: true,
        focusVisibleValidated: true,
        contrastValidated: true,
        noHorizontalOverflow: true
      },
      {
        viewport: 'tablet',
        decisionTimeSec: 67,
        keyboardValidated: true,
        focusVisibleValidated: true,
        contrastValidated: true,
        noHorizontalOverflow: true
      },
      {
        viewport: 'desktop',
        decisionTimeSec: 59,
        keyboardValidated: true,
        focusVisibleValidated: true,
        contrastValidated: true,
        noHorizontalOverflow: true
      }
    ]
  };
}

function runScenario(scenario) {
  if (scenario === 'success') {
    return buildUxWcagContrastConformity(buildPayload(), {
      nowMs: Date.parse('2026-03-16T12:00:00.000Z')
    });
  }

  if (scenario === 'missing-viewport') {
    const payload = buildPayload();
    payload.responsiveDecisionJourneys = payload.responsiveDecisionJourneys.slice(0, 2);

    return buildUxWcagContrastConformity(payload, {
      nowMs: Date.parse('2026-03-16T12:00:00.000Z')
    });
  }

  if (scenario === 'journey-incomplete') {
    const payload = buildPayload();
    payload.responsiveDecisionJourneys[0].contrastValidated = false;

    return buildUxWcagContrastConformity(payload, {
      nowMs: Date.parse('2026-03-16T12:00:00.000Z')
    });
  }

  if (scenario === 'budget-exceeded') {
    const payload = buildPayload();
    payload.responsiveDecisionJourneys[1].decisionTimeSec = 108;

    return buildUxWcagContrastConformity(payload, {
      nowMs: Date.parse('2026-03-16T12:00:00.000Z')
    });
  }

  return buildUxWcagContrastConformity('bad-input');
}

test('ux wcag conformity demo covers empty/loading/error/success with responsive decision outcomes', async ({ page }) => {
  await page.exposeFunction('runWcagConformityScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Évaluer conformité WCAG' });
  const stateIndicator = page.getByRole('status', { name: 'État conformité WCAG' });

  const reasonCodeValue = page.locator('#reason-code-value');
  const summaryValue = page.locator('#summary-value');
  const viewportsValue = page.locator('#viewports-value');
  const errorMessage = page.getByRole('alert');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');

  await scenario.selectOption('invalid-input');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_UX_WCAG_CONFORMITY_INPUT');

  await scenario.selectOption('missing-viewport');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('UX_RESPONSIVE_VIEWPORT_MISSING');

  await scenario.selectOption('journey-incomplete');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('UX_RESPONSIVE_JOURNEY_INCOMPLETE');

  await scenario.selectOption('budget-exceeded');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('UX_DECISION_TIME_BUDGET_EXCEEDED');

  await scenario.selectOption('success');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(summaryValue).toContainText('viewports=3/3');
  await expect(summaryValue).toContainText('worst=72s');
  await expect(viewportsValue).toContainText('mobile:72s/complete=true');
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

test('ux wcag conformity demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
  page
}) => {
  await page.exposeFunction('runWcagConformityScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  await page.getByLabel('Scénario').selectOption('success');
  await page.getByRole('button', { name: 'Évaluer conformité WCAG' }).click();
  await expect(page.getByRole('status', { name: 'État conformité WCAG' })).toHaveAttribute('data-state', 'success');

  const viewports = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    const overflow = await page.evaluate(() => {
      const selectors = [
        '#reason-value',
        '#diag-value',
        '#summary-value',
        '#viewports-value',
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
