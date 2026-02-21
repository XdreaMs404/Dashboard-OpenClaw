import { expect, test } from '@playwright/test';
import { recordPhaseTransitionHistory } from '../../src/phase-transition-history.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Historique transitions BMAD</title>
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
        width: min(100%, 54rem);
      }

      #reason-value,
      #error-message,
      #history-value,
      #success-json {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      #history-value {
        margin: 0;
        padding-left: 1.25rem;
      }

      #success-json {
        margin-top: 0.75rem;
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        background: #f8fafc;
        white-space: pre-wrap;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Historique des transitions de phase</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-payload">Payload invalide</option>
        <option value="blocked-guard">Blocage guards</option>
        <option value="success">Nominal success</option>
      </select>

      <button id="run-action" type="button">Enregistrer transition</button>

      <p id="state-indicator" role="status" aria-label="État historique transitions" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div>
            <dt>history</dt>
            <dd>
              <ul id="history-value"><li>—</li></ul>
            </dd>
          </div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-action');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');
      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const historyValue = document.getElementById('history-value');

      const setState = (state) => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;
      };

      const renderList = (container, values) => {
        container.textContent = '';

        if (!Array.isArray(values) || values.length === 0) {
          const item = document.createElement('li');
          item.textContent = '—';
          container.appendChild(item);
          return;
        }

        for (const value of values) {
          const item = document.createElement('li');
          item.textContent = value;
          container.appendChild(item);
        }
      };

      const renderResult = (result) => {
        reasonCodeValue.textContent = result.reasonCode;
        reasonValue.textContent = result.reason;

        const rows = Array.isArray(result.history)
          ? result.history.map((entry) => {
              const fromPhase = entry?.fromPhase ?? '—';
              const toPhase = entry?.toPhase ?? '—';
              const reasonCode = entry?.reasonCode ?? '—';
              const timestamp = entry?.timestamp ?? '—';
              return fromPhase + ' -> ' + toPhase + ' | ' + reasonCode + ' | ' + timestamp;
            })
          : [];

        renderList(historyValue, rows);
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 150));

          const result = await window.recordPhaseTransitionHistoryScenarioRuntime(scenarioInput.value);
          renderResult(result);

          if (result.allowed) {
            setState('success');
            successJson.hidden = false;
            successJson.textContent = JSON.stringify(result);
            errorMessage.hidden = true;
            errorMessage.textContent = '';
          } else {
            setState('error');
            errorMessage.hidden = false;
            errorMessage.textContent = result.reasonCode + ' — ' + result.reason;
            successJson.hidden = true;
            successJson.textContent = '';
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

const responsiveViewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1366, height: 768 }
];

async function runScenario(scenario) {
  if (scenario === 'success') {
    return recordPhaseTransitionHistory({
      fromPhase: 'H03',
      toPhase: 'H04',
      guardResult: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Transition historisée avec succès.',
        diagnostics: {
          phaseNumber: 2,
          executedCount: 2
        }
      },
      history: [
        {
          fromPhase: 'H02',
          toPhase: 'H03',
          allowed: true,
          reasonCode: 'OK',
          reason: 'Historique antérieur.',
          timestamp: '2026-02-21T12:00:00.000Z'
        }
      ],
      recordedAt: '2026-02-21T13:50:00.000Z'
    });
  }

  if (scenario === 'blocked-guard') {
    return recordPhaseTransitionHistory({
      fromPhase: 'H04',
      toPhase: 'H05',
      guardResult: {
        allowed: false,
        reasonCode: 'PHASE_PREREQUISITES_INCOMPLETE',
        reason: 'Prérequis requis incomplets: PR-005.',
        diagnostics: {
          blockedByPrerequisites: true
        }
      },
      history: [],
      recordedAt: '2026-02-21T13:49:00.000Z'
    });
  }

  return recordPhaseTransitionHistory({
    fromPhase: 'H03',
    toPhase: 'H04',
    guardResult: {
      allowed: true,
      reasonCode: 'OK',
      reason: 'Guard nominal'
    },
    history: null
  });
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('recordPhaseTransitionHistoryScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('transition history demo covers empty/loading/error/success with reason and history rows', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Enregistrer transition' });
  const stateIndicator = page.getByRole('status', { name: 'État historique transitions' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const reasonCodeValue = page.locator('#reason-code-value');
  const reasonValue = page.locator('#reason-value');
  const historyValue = page.locator('#history-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-payload');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_TRANSITION_HISTORY');
  await expect(reasonValue).toContainText('history doit être un tableau');
  await expect(historyValue).toContainText('—');

  await scenario.selectOption('blocked-guard');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('PHASE_PREREQUISITES_INCOMPLETE');
  await expect(reasonValue).toContainText('PR-005');
  await expect(historyValue).toContainText('H04 -> H05 | PHASE_PREREQUISITES_INCOMPLETE');
  await expect(historyValue).toContainText('2026-02-21T13:49:00.000Z');

  await scenario.selectOption('success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Transition historisée avec succès');
  await expect(historyValue).toContainText('H03 -> H04 | OK | 2026-02-21T13:50:00.000Z');
  await expect(historyValue).toContainText('H02 -> H03 | OK | 2026-02-21T12:00:00.000Z');
  await expect(successJson).toContainText('"allowed":true');
  await expect(successJson).toContainText('"reasonCode":"OK"');
  await expect(errorMessage).toBeHidden();
  await expect(action).toBeEnabled();
});

test('transition history demo stays readable without horizontal overflow on mobile/tablet/desktop', async ({
  browser
}) => {
  for (const viewport of responsiveViewports) {
    await test.step(`${viewport.name} viewport`, async () => {
      const context = await browser.newContext({
        viewport: {
          width: viewport.width,
          height: viewport.height
        }
      });

      const page = await context.newPage();

      try {
        await bootstrapDemoPage(page);

        await page.getByLabel('Scénario').selectOption('success');
        await page.getByRole('button', { name: 'Enregistrer transition' }).click();

        await expect(page.getByRole('status', { name: 'État historique transitions' })).toHaveAttribute(
          'data-state',
          'success'
        );

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const reason = document.getElementById('reason-value');
          const error = document.getElementById('error-message');
          const history = document.getElementById('history-value');
          const success = document.getElementById('success-json');

          const computeOverflow = (element) => {
            if (!element) {
              return 0;
            }

            return element.scrollWidth - element.clientWidth;
          };

          return {
            document: computeOverflow(doc),
            body: computeOverflow(body),
            reason: computeOverflow(reason),
            error: computeOverflow(error),
            history: computeOverflow(history),
            success: computeOverflow(success)
          };
        });

        expect(
          Math.max(
            overflow.document,
            overflow.body,
            overflow.reason,
            overflow.error,
            overflow.history,
            overflow.success
          ),
          `Overflow horizontal détecté (${viewport.name}): ${JSON.stringify(overflow)}`
        ).toBeLessThanOrEqual(1);
      } finally {
        await context.close();
      }
    });
  }
});
