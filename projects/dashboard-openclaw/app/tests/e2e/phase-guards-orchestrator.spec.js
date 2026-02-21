import { expect, test } from '@playwright/test';
import { orchestratePhaseGuards } from '../../src/phase-guards-orchestrator.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Orchestration guards de phase BMAD</title>
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
        width: min(100%, 50rem);
      }

      #error-message,
      #success-json,
      #commands-value,
      #failure-details-value {
        width: 100%;
        max-width: 100%;
      }

      #success-json {
        margin-top: 0.75rem;
        padding: 0.75rem;
        border: 1px solid #d1d5db;
        border-radius: 0.5rem;
        background: #f8fafc;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      #commands-value,
      #failure-details-value {
        margin: 0;
        padding-left: 1.25rem;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      #failure-details-value {
        padding-left: 0;
        list-style: none;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Orchestration guards H13</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="blocked-prerequisites">Blocage prérequis (S004)</option>
        <option value="execution-failed">Échec exécution guard</option>
        <option value="success-simulation">Simulation nominale</option>
      </select>

      <button id="run-action" type="button">Exécuter orchestration guards</button>

      <p id="state-indicator" role="status" aria-label="État orchestration guards" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>failedCommand</dt><dd id="failed-command-value">—</dd></div>
          <div>
            <dt>commands</dt>
            <dd>
              <ul id="commands-value"><li>—</li></ul>
            </dd>
          </div>
          <div>
            <dt>failedResult</dt>
            <dd>
              <ul id="failure-details-value"><li>—</li></ul>
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
      const failedCommandValue = document.getElementById('failed-command-value');
      const commandsValue = document.getElementById('commands-value');
      const failureDetailsValue = document.getElementById('failure-details-value');

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
        failedCommandValue.textContent = result.diagnostics?.failedCommand ?? '—';

        renderList(commandsValue, result.commands ?? []);

        const failedResult = Array.isArray(result.results)
          ? result.results.find((entry) => entry && entry.ok === false)
          : null;

        if (!failedResult) {
          renderList(failureDetailsValue, []);
          return;
        }

        renderList(failureDetailsValue, [
          'command=' + failedResult.command,
          'exitCode=' + String(failedResult.exitCode),
          'stderr=' + String(failedResult.stderr || '')
        ]);
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 150));

          const result = await window.orchestratePhaseGuardsScenarioRuntime(scenarioInput.value);
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
  if (scenario === 'success-simulation') {
    return orchestratePhaseGuards({
      phaseNumber: 2,
      prerequisitesValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Prérequis validés.'
      }
    });
  }

  if (scenario === 'execution-failed') {
    return orchestratePhaseGuards(
      {
        phaseNumber: 1,
        simulate: false,
        prerequisitesValidation: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'Prérequis validés.'
        }
      },
      {
        commandExecutor: async ({ index }) => {
          if (index === 0) {
            return {
              ok: true,
              exitCode: 0,
              stdout: 'sequence guard ok',
              stderr: ''
            };
          }

          return {
            ok: false,
            exitCode: 17,
            stdout: '',
            stderr: 'ultra quality guard failed'
          };
        }
      }
    );
  }

  return orchestratePhaseGuards({
    phaseNumber: 3,
    prerequisitesValidation: {
      allowed: false,
      reasonCode: 'PHASE_PREREQUISITES_INCOMPLETE',
      reason: 'Prérequis requis incomplets: PR-002.'
    }
  });
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('orchestratePhaseGuardsScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('phase guards demo covers empty/loading/error/success with explicit reason, plan and failure diagnostics', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Exécuter orchestration guards' });
  const stateIndicator = page.getByRole('status', { name: 'État orchestration guards' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const reasonCodeValue = page.locator('#reason-code-value');
  const reasonValue = page.locator('#reason-value');
  const failedCommandValue = page.locator('#failed-command-value');
  const commandsValue = page.locator('#commands-value');
  const failureDetailsValue = page.locator('#failure-details-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('blocked-prerequisites');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('PHASE_PREREQUISITES_INCOMPLETE');
  await expect(reasonValue).toContainText('PR-002');
  await expect(commandsValue).toContainText('phase13-sequence-guard.sh 3');
  await expect(failedCommandValue).toHaveText('—');
  await expect(failureDetailsValue).toContainText('—');

  await scenario.selectOption('execution-failed');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('GUARD_EXECUTION_FAILED');
  await expect(reasonValue).toContainText('phase13-ultra-quality-check.sh 1');
  await expect(commandsValue).toContainText('phase13-sequence-guard.sh 1');
  await expect(commandsValue).toContainText('phase13-ultra-quality-check.sh 1');
  await expect(failedCommandValue).toContainText('phase13-ultra-quality-check.sh 1');
  await expect(failureDetailsValue).toContainText('exitCode=17');
  await expect(failureDetailsValue).toContainText('ultra quality guard failed');

  await scenario.selectOption('success-simulation');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Simulation guards prête pour la phase 2');
  await expect(failedCommandValue).toHaveText('—');
  await expect(commandsValue).toContainText('phase13-sequence-guard.sh 2');
  await expect(commandsValue).toContainText('phase13-ultra-quality-check.sh 2');
  await expect(successJson).toContainText('"allowed":true');
  await expect(successJson).toContainText('"reasonCode":"OK"');
  await expect(errorMessage).toBeHidden();
  await expect(action).toBeEnabled();
});

test('phase guards demo keeps rendered content without horizontal overflow on mobile/tablet/desktop', async ({
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

        await page.getByLabel('Scénario').selectOption('success-simulation');
        await page.getByRole('button', { name: 'Exécuter orchestration guards' }).click();

        await expect(page.getByRole('status', { name: 'État orchestration guards' })).toHaveAttribute(
          'data-state',
          'success'
        );

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const success = document.getElementById('success-json');
          const error = document.getElementById('error-message');
          const commands = document.getElementById('commands-value');
          const failureDetails = document.getElementById('failure-details-value');

          const computeOverflow = (element) => {
            if (!element) {
              return 0;
            }

            return element.scrollWidth - element.clientWidth;
          };

          return {
            document: computeOverflow(doc),
            body: computeOverflow(body),
            success: computeOverflow(success),
            error: computeOverflow(error),
            commands: computeOverflow(commands),
            failureDetails: computeOverflow(failureDetails)
          };
        });

        expect(
          Math.max(
            overflow.document,
            overflow.body,
            overflow.success,
            overflow.error,
            overflow.commands,
            overflow.failureDetails
          ),
          `Overflow horizontal détecté (${viewport.name}): ${JSON.stringify(overflow)}`
        ).toBeLessThanOrEqual(1);
      } finally {
        await context.close();
      }
    });
  }
});
