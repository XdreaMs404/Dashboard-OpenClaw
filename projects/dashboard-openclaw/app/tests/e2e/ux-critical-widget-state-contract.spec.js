import { expect, test } from '@playwright/test';
import { buildUxCriticalWidgetStateContract } from '../../src/ux-critical-widget-state-contract.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Contrat 4 états widgets critiques</title>
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
      #widgets-value,
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
      #success-json {
        margin-top: .75rem;
        padding: .75rem;
        border: 1px solid #d1d5db;
        border-radius: .5rem;
        white-space: pre-wrap;
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
      <h1>Contrat 4 états widgets critiques</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="missing-state">État manquant</option>
        <option value="keyboard-gap">Navigation clavier incomplète</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-contract" type="button">Évaluer contrat UX</button>

      <p id="state-indicator" role="status" aria-label="État contrat UX" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section aria-label="Zone focus démonstration">
        <h2>Parcours clavier visible</h2>
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
          <div><dt>widgets</dt><dd id="widgets-value">—</dd></div>
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
      const widgetsValue = document.getElementById('widgets-value');

      const setState = (state) => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;
      };

      const renderResult = (result) => {
        reasonCodeValue.textContent = result.reasonCode;
        reasonValue.textContent = result.reason;

        const diagnostics = result.diagnostics ?? {};
        diagValue.textContent =
          'model=' + String(diagnostics.widgetStateModelVersion ?? '—') +
          ' | score=' + String(diagnostics.uxScore ?? '—') +
          ' | blockers=' + String(diagnostics.blockerCount ?? '—') +
          ' | widgets=' + String(diagnostics.criticalWidgetCount ?? '—');

        const summary = result.criticalWidgetStateContract?.summary ?? {};
        summaryValue.textContent =
          'stateCoverage=' + String(summary.fourStateCoveragePct ?? '—') + '% | ' +
          'keyboardCoverage=' + String(summary.keyboardCoveragePct ?? '—') + '% | ' +
          'fullyCompliant=' + String(summary.fullyCompliantCount ?? '—');

        const widgets = Array.isArray(result.criticalWidgetStateContract?.widgets)
          ? result.criticalWidgetStateContract.widgets
          : [];

        widgetsValue.textContent = widgets
          .map((widget) => {
            const missing = Array.isArray(widget.missingStates) ? widget.missingStates.join(',') : '';
            return (
              String(widget.id) +
              ':states=' +
              String(widget.stateCoveragePct) +
              '%/kb=' +
              String(widget.keyboard?.complete === true) +
              '/missing=' +
              String(missing || 'none')
            );
          })
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
          const result = await window.runCriticalWidgetScenarioRuntime(scenarioInput.value);
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
    windowRef: 'S061',
    uxAudit: {
      score: 92,
      blockerCount: 0,
      wcagLevel: 'WCAG-2.2-AA'
    },
    criticalWidgets: [
      {
        id: 'gate-overview',
        label: 'Vue synthèse gate',
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
        label: 'Preuves UX',
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
    ]
  };
}

function runScenario(scenario) {
  if (scenario === 'success') {
    return buildUxCriticalWidgetStateContract(buildPayload(), {
      nowMs: Date.parse('2026-03-14T12:00:00.000Z')
    });
  }

  if (scenario === 'missing-state') {
    const payload = buildPayload();
    delete payload.criticalWidgets[0].states.error;

    return buildUxCriticalWidgetStateContract(payload, {
      nowMs: Date.parse('2026-03-14T12:00:00.000Z')
    });
  }

  if (scenario === 'keyboard-gap') {
    const payload = buildPayload();
    payload.criticalWidgets[0].keyboard.focusVisible = false;

    return buildUxCriticalWidgetStateContract(payload, {
      nowMs: Date.parse('2026-03-14T12:00:00.000Z')
    });
  }

  return buildUxCriticalWidgetStateContract('bad-input');
}

test('ux critical widget state contract demo covers empty/loading/error/success and keyboard outcomes', async ({
  page
}) => {
  await page.exposeFunction('runCriticalWidgetScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Évaluer contrat UX' });
  const stateIndicator = page.getByRole('status', { name: 'État contrat UX' });

  const reasonCodeValue = page.locator('#reason-code-value');
  const summaryValue = page.locator('#summary-value');
  const widgetsValue = page.locator('#widgets-value');
  const errorMessage = page.getByRole('alert');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');

  await scenario.selectOption('invalid-input');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_UX_CRITICAL_WIDGET_STATE_INPUT');

  await scenario.selectOption('missing-state');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('UX_WIDGET_FOUR_STATES_REQUIRED');

  await scenario.selectOption('keyboard-gap');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('UX_KEYBOARD_NAVIGATION_REQUIRED');

  await scenario.selectOption('success');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(summaryValue).toContainText('stateCoverage=100%');
  await expect(summaryValue).toContainText('keyboardCoverage=100%');
  await expect(widgetsValue).toContainText('kb=true');
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

test('ux critical widget state contract demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
  page
}) => {
  await page.exposeFunction('runCriticalWidgetScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  await page.getByLabel('Scénario').selectOption('success');
  await page.getByRole('button', { name: 'Évaluer contrat UX' }).click();
  await expect(page.getByRole('status', { name: 'État contrat UX' })).toHaveAttribute('data-state', 'success');

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
        '#widgets-value',
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
