import { expect, test } from '@playwright/test';
import { buildUxKeyboardFocusVisibleContract } from '../../src/ux-keyboard-focus-visible.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Navigation clavier + focus visible</title>
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
      #journeys-value,
      #contrast-value,
      #responsive-value,
      #error-message,
      #success-json {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      .focus-target {
        border: 1px solid #94a3b8;
        border-radius: .5rem;
        background: #fff;
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
      #success-json {
        margin-top: .75rem;
        padding: .75rem;
        border: 1px solid #d1d5db;
        border-radius: .5rem;
        white-space: pre-wrap;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Navigation clavier + focus visible</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="keyboard-gap">Parcours clavier incomplet</option>
        <option value="contrast-fail">Contraste insuffisant</option>
        <option value="responsive-gap">Responsive incomplet</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-contract" type="button">Évaluer navigation clavier</button>

      <p id="state-indicator" role="status" aria-label="État navigation clavier" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section aria-label="Zone focus démonstration">
        <h2>Parcours focus</h2>
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
          <div><dt>journeys</dt><dd id="journeys-value">—</dd></div>
          <div><dt>contrast</dt><dd id="contrast-value">—</dd></div>
          <div><dt>responsive</dt><dd id="responsive-value">—</dd></div>
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
      const journeysValue = document.getElementById('journeys-value');
      const contrastValue = document.getElementById('contrast-value');
      const responsiveValue = document.getElementById('responsive-value');

      const setState = (state) => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;
      };

      const renderResult = (result) => {
        reasonCodeValue.textContent = result.reasonCode;
        reasonValue.textContent = result.reason;

        const diagnostics = result.diagnostics ?? {};
        diagValue.textContent =
          'model=' + String(diagnostics.keyboardFocusModelVersion ?? '—') +
          ' | journeys=' + String(diagnostics.keyboardJourneyCount ?? '—') +
          ' | complete=' + String(diagnostics.keyboardJourneyCompleteCount ?? '—') +
          ' | surfaces=' + String(diagnostics.contrastSurfaceCount ?? '—');

        const summary = result.keyboardFocusVisibleContract?.summary ?? {};
        summaryValue.textContent =
          'journeyComplete=' + String(summary.journeyCompleteCount ?? '—') +
          '/' + String(summary.journeyCount ?? '—') +
          ' | contrast=' + String(summary.contrastPassingCount ?? '—') +
          '/' + String(summary.contrastTotalCount ?? '—') +
          ' | responsive=' + String(summary.responsivePassCount ?? '—') +
          '/' + String(summary.responsiveTotalCount ?? '—');

        const journeys = Array.isArray(result.keyboardFocusVisibleContract?.journeys)
          ? result.keyboardFocusVisibleContract.journeys
          : [];

        journeysValue.textContent = journeys
          .map(
            (journey) =>
              String(journey.id) +
              ':focus=' +
              String(journey.focusVisible) +
              '/logical=' +
              String(journey.logicalOrder) +
              '/trapFree=' +
              String(journey.trapFree)
          )
          .join(' | ');

        const contrastChecks = Array.isArray(result.keyboardFocusVisibleContract?.contrastChecks)
          ? result.keyboardFocusVisibleContract.contrastChecks
          : [];

        contrastValue.textContent = contrastChecks
          .map((surface) => String(surface.id) + ':' + String(surface.ratio) + '>=' + String(surface.requiredRatio))
          .join(' | ');

        const responsiveChecks = Array.isArray(result.keyboardFocusVisibleContract?.responsiveChecks)
          ? result.keyboardFocusVisibleContract.responsiveChecks
          : [];

        responsiveValue.textContent = responsiveChecks
          .map((entry) => String(entry.viewport) + ':' + String(entry.pass))
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
          const result = await window.runKeyboardFocusScenarioRuntime(scenarioInput.value);
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
    windowRef: 'S062',
    uxAudit: {
      score: 93,
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
      },
      {
        id: 'ux-evidence-panel',
        states: {
          empty: { copy: 'Aucune capture UX enregistrée.' },
          loading: { copy: 'Indexation des captures UX…' },
          error: { copy: 'Erreur pendant l’indexation des captures UX.' },
          success: { copy: 'Preuves UX synchronisées.' }
        },
        keyboard: {
          focusOrder: ['focus-0', 'focus-1', 'focus-2'],
          focusVisible: true,
          logicalOrder: true,
          trapFree: true
        }
      }
    ],
    keyboardJourneys: [
      {
        id: 'journey-gate-overview',
        keyboardOnly: true,
        logicalOrder: true,
        trapFree: true,
        steps: [
          { target: 'focus-0', focusVisible: true, order: 1 },
          { target: 'focus-1', focusVisible: true, order: 2 },
          { target: 'focus-2', focusVisible: true, order: 3 }
        ]
      }
    ],
    contrastChecks: [
      { id: 'gate-header', ratio: 5.1, requiredRatio: 4.5 },
      { id: 'focus-ring-primary', ratio: 4.8, requiredRatio: 3, isLargeText: true }
    ],
    responsiveChecks: [
      { viewport: 'mobile', status: 'PASS', evidenceRef: 'proof://S062/mobile' },
      { viewport: 'tablet', status: 'PASS', evidenceRef: 'proof://S062/tablet' },
      { viewport: 'desktop', status: 'PASS', evidenceRef: 'proof://S062/desktop' }
    ]
  };
}

function runScenario(scenario) {
  if (scenario === 'success') {
    return buildUxKeyboardFocusVisibleContract(buildPayload(), {
      nowMs: Date.parse('2026-03-15T12:00:00.000Z')
    });
  }

  if (scenario === 'keyboard-gap') {
    const payload = buildPayload();
    payload.keyboardJourneys[0].steps[1].focusVisible = false;

    return buildUxKeyboardFocusVisibleContract(payload, {
      nowMs: Date.parse('2026-03-15T12:00:00.000Z')
    });
  }

  if (scenario === 'contrast-fail') {
    const payload = buildPayload();
    payload.contrastChecks[0].ratio = 3.8;

    return buildUxKeyboardFocusVisibleContract(payload, {
      nowMs: Date.parse('2026-03-15T12:00:00.000Z')
    });
  }

  if (scenario === 'responsive-gap') {
    const payload = buildPayload();
    payload.responsiveChecks = [{ viewport: 'mobile', status: 'PASS' }];

    return buildUxKeyboardFocusVisibleContract(payload, {
      nowMs: Date.parse('2026-03-15T12:00:00.000Z')
    });
  }

  return buildUxKeyboardFocusVisibleContract('bad-input');
}

test('ux keyboard focus demo covers empty/loading/error/success and keyboard/contrast outcomes', async ({ page }) => {
  await page.exposeFunction('runKeyboardFocusScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Évaluer navigation clavier' });
  const stateIndicator = page.getByRole('status', { name: 'État navigation clavier' });

  const reasonCodeValue = page.locator('#reason-code-value');
  const summaryValue = page.locator('#summary-value');
  const journeysValue = page.locator('#journeys-value');
  const contrastValue = page.locator('#contrast-value');
  const responsiveValue = page.locator('#responsive-value');
  const errorMessage = page.getByRole('alert');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');

  await scenario.selectOption('invalid-input');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_UX_KEYBOARD_FOCUS_INPUT');

  await scenario.selectOption('keyboard-gap');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('UX_KEYBOARD_JOURNEY_INCOMPLETE');

  await scenario.selectOption('contrast-fail');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('UX_CONTRAST_WCAG_VIOLATION');

  await scenario.selectOption('responsive-gap');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('UX_RESPONSIVE_JOURNEY_REQUIRED');

  await scenario.selectOption('success');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(summaryValue).toContainText('journeyComplete=1/1');
  await expect(journeysValue).toContainText('focus=true');
  await expect(contrastValue).toContainText('gate-header:5.1>=4.5');
  await expect(responsiveValue).toContainText('mobile:true');
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

test('ux keyboard focus demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
  page
}) => {
  await page.exposeFunction('runKeyboardFocusScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  await page.getByLabel('Scénario').selectOption('success');
  await page.getByRole('button', { name: 'Évaluer navigation clavier' }).click();
  await expect(page.getByRole('status', { name: 'État navigation clavier' })).toHaveAttribute('data-state', 'success');

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
        '#journeys-value',
        '#contrast-value',
        '#responsive-value',
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
