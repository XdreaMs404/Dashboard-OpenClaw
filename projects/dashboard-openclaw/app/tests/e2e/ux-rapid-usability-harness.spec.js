import { expect, test } from '@playwright/test';
import { buildUxRapidUsabilityHarness } from '../../src/ux-rapid-usability-harness.js';
import { buildS071Payload } from '../fixtures/ux-s071-payload.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Harnais de tests usability rapides</title>
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
      #suite-value,
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
      <h1>Harnais de tests usability rapides</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="missing-state">État manquant</option>
        <option value="missing-viewport">Viewport manquant</option>
        <option value="suite-failure">Suite en échec</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-contract" type="button">Évaluer harnais usability</button>

      <p id="state-indicator" role="status" aria-label="État harnais usability" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section aria-label="Zone focus démonstration">
        <h2>Parcours clavier critique</h2>
        <div class="focus-zone">
          <button id="focus-0" class="focus-target" type="button">Filtrer suite</button>
          <button id="focus-1" class="focus-target" type="button">Lancer suite</button>
          <button id="focus-2" class="focus-target" type="button">Exporter preuve</button>
        </div>
      </section>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>summary</dt><dd id="summary-value">—</dd></div>
          <div><dt>suites</dt><dd id="suite-value">—</dd></div>
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
      const suiteValue = document.getElementById('suite-value');

      const setState = (state) => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;
      };

      const renderResult = (result) => {
        reasonCodeValue.textContent = result.reasonCode;
        reasonValue.textContent = result.reason;

        const diagnostics = result.diagnostics ?? {};
        diagValue.textContent =
          'model=' + String(diagnostics.usabilityHarnessModelVersion ?? '—') +
          ' | missingStates=' + String((diagnostics.missingStates ?? []).join('|') || 'none') +
          ' | missingViewports=' + String((diagnostics.missingViewports ?? []).join('|') || 'none') +
          ' | failures=' + String(diagnostics.failingSuiteCount ?? '—');

        const summary = result.rapidUsabilityHarness?.summary ?? {};
        summaryValue.textContent =
          'total=' + String(summary.totalSuites ?? '—') +
          ' | pass=' + String(summary.passCount ?? '—') +
          ' | stateCoverage=' + String(summary.stateCoveragePct ?? '—') + '%' +
          ' | viewportCoverage=' + String(summary.viewportCoveragePct ?? '—') + '%' +
          ' | contrastFail=' + String(summary.contrastFailureCount ?? '—');

        const suites = Array.isArray(result.rapidUsabilityHarness?.suites)
          ? result.rapidUsabilityHarness.suites
          : [];

        suiteValue.textContent = suites
          .map((entry) => String(entry.id) + ':' + String(entry.state) + ':' + String(entry.viewport) + ':' + String(entry.passed))
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
          const result = await window.runRapidUsabilityScenarioRuntime(scenarioInput.value);
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

function runScenario(scenario) {
  if (scenario === 'success') {
    return buildUxRapidUsabilityHarness(buildS071Payload(), {
      nowMs: Date.parse('2026-03-23T09:00:00.000Z')
    });
  }

  if (scenario === 'missing-state') {
    const payload = buildS071Payload();
    payload.usabilitySuites = payload.usabilitySuites.filter((suite) => suite.state !== 'error');

    return buildUxRapidUsabilityHarness(payload, {
      nowMs: Date.parse('2026-03-23T09:00:00.000Z')
    });
  }

  if (scenario === 'missing-viewport') {
    const payload = buildS071Payload();
    payload.usabilitySuites = payload.usabilitySuites.map((suite) => ({
      ...suite,
      viewport: 'mobile'
    }));

    return buildUxRapidUsabilityHarness(payload, {
      nowMs: Date.parse('2026-03-23T09:00:00.000Z')
    });
  }

  if (scenario === 'suite-failure') {
    const payload = buildS071Payload();
    payload.usabilitySuites[2].pass = false;
    payload.usabilitySuites.push({
      ...payload.usabilitySuites[2],
      id: 'suite-error-desktop-pass-backup',
      pass: true,
      evidenceRefs: ['s071-error-desktop-backup.png']
    });

    return buildUxRapidUsabilityHarness(payload, {
      nowMs: Date.parse('2026-03-23T09:00:00.000Z')
    });
  }

  return buildUxRapidUsabilityHarness('bad-input');
}

test('rapid usability harness demo covers empty/loading/error/success with strict gate reasons', async ({
  page
}) => {
  await page.exposeFunction('runRapidUsabilityScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Évaluer harnais usability' });
  const stateIndicator = page.getByRole('status', { name: 'État harnais usability' });

  const reasonCodeValue = page.locator('#reason-code-value');
  const summaryValue = page.locator('#summary-value');
  const suiteValue = page.locator('#suite-value');
  const errorMessage = page.getByRole('alert');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');

  await scenario.selectOption('invalid-input');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_UX_USABILITY_HARNESS_INPUT');

  await scenario.selectOption('missing-state');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('UX_USABILITY_REQUIRED_STATE_MISSING');

  await scenario.selectOption('missing-viewport');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('UX_USABILITY_REQUIRED_VIEWPORT_MISSING');

  await scenario.selectOption('suite-failure');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('UX_USABILITY_SUITE_FAILURE_PRESENT');

  await scenario.selectOption('success');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(summaryValue).toContainText('total=4');
  await expect(summaryValue).toContainText('stateCoverage=100%');
  await expect(summaryValue).toContainText('viewportCoverage=100%');
  await expect(suiteValue).toContainText('suite-success-mobile:success:mobile:true');
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

test('rapid usability harness demo stays readable on mobile/tablet/desktop without overflow', async ({
  page
}) => {
  await page.exposeFunction('runRapidUsabilityScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  await page.getByLabel('Scénario').selectOption('success');
  await page.getByRole('button', { name: 'Évaluer harnais usability' }).click();
  await expect(page.getByRole('status', { name: 'État harnais usability' })).toHaveAttribute(
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
        '#suite-value',
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
