import { expect, test } from '@playwright/test';
import { evaluatePhaseSlaAlert } from '../../src/phase-sla-alert.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Alerte SLA transition BMAD</title>
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
      #severity-value,
      #actions-value,
      #error-message,
      #success-json {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      #actions-value {
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
      <h1>Alerte SLA de transition</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Payload invalide</option>
        <option value="sla-warning">Incident SLA warning</option>
        <option value="sla-critical">Incident SLA critical</option>
        <option value="success">Nominal success</option>
      </select>

      <button id="run-action" type="button">Évaluer alerte SLA</button>

      <p id="state-indicator" role="status" aria-label="État alerte SLA" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>severity</dt><dd id="severity-value">—</dd></div>
          <div>
            <dt>correctiveActions</dt>
            <dd>
              <ul id="actions-value"><li>—</li></ul>
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
      const severityValue = document.getElementById('severity-value');
      const actionsValue = document.getElementById('actions-value');

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
        severityValue.textContent = result.alert?.severity ?? '—';
        renderList(actionsValue, Array.isArray(result.correctiveActions) ? result.correctiveActions : []);
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 150));

          const result = await window.evaluatePhaseSlaAlertScenarioRuntime(scenarioInput.value);
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
    return evaluatePhaseSlaAlert(
      {
        transitionValidation: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'Transition autorisée H04 -> H05.',
          diagnostics: {
            fromIndex: 3,
            toIndex: 4,
            elapsedMs: 300_000,
            slaMs: 600_000
          }
        },
        history: [
          {
            reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
            timestamp: '2026-02-21T10:00:00.000Z'
          }
        ]
      },
      {
        nowProvider: () => '2026-02-21T14:00:00.000Z'
      }
    );
  }

  if (scenario === 'sla-critical') {
    return evaluatePhaseSlaAlert(
      {
        transitionValidation: {
          allowed: false,
          reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
          reason:
            'Notification hors SLA: elapsedMs=620000, slaMs=600000, fromPhase=H04, toPhase=H05.',
          diagnostics: {
            fromIndex: 3,
            toIndex: 4,
            elapsedMs: 620_000,
            slaMs: 600_000
          }
        },
        history: [
          {
            reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
            timestamp: '2026-02-21T13:45:00.000Z'
          }
        ],
        lookbackMinutes: 60,
        escalationThreshold: 2
      },
      {
        nowProvider: () => '2026-02-21T14:00:00.000Z'
      }
    );
  }

  if (scenario === 'sla-warning') {
    return evaluatePhaseSlaAlert(
      {
        transitionValidation: {
          allowed: false,
          reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
          reason:
            'Notification hors SLA: elapsedMs=610000, slaMs=600000, fromPhase=H04, toPhase=H05.',
          diagnostics: {
            fromIndex: 3,
            toIndex: 4,
            elapsedMs: 610_000,
            slaMs: 600_000
          }
        },
        history: [],
        lookbackMinutes: 60,
        escalationThreshold: 2
      },
      {
        nowProvider: () => '2026-02-21T14:00:00.000Z'
      }
    );
  }

  return evaluatePhaseSlaAlert({
    history: null
  });
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('evaluatePhaseSlaAlertScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('phase SLA alert demo covers empty/loading/error/success with reason, severity and correctiveActions', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Évaluer alerte SLA' });
  const stateIndicator = page.getByRole('status', { name: 'État alerte SLA' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const reasonCodeValue = page.locator('#reason-code-value');
  const reasonValue = page.locator('#reason-value');
  const severityValue = page.locator('#severity-value');
  const actionsValue = page.locator('#actions-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-input');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_SLA_ALERT_INPUT');
  await expect(reasonValue).toContainText('history doit être un tableau');
  await expect(severityValue).toHaveText('none');
  await expect(actionsValue).toContainText('—');

  await scenario.selectOption('sla-warning');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('PHASE_NOTIFICATION_SLA_EXCEEDED');
  await expect(reasonValue).toContainText('elapsedMs=610000');
  await expect(severityValue).toHaveText('warning');
  await expect(actionsValue).toContainText('PUBLISH_PHASE_NOTIFY');
  await expect(actionsValue).toContainText('REVALIDATE_TRANSITION');
  await expect(actionsValue).not.toContainText('ESCALATE_TO_PM');

  await scenario.selectOption('sla-critical');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('PHASE_NOTIFICATION_SLA_EXCEEDED');
  await expect(severityValue).toHaveText('critical');
  await expect(actionsValue).toContainText('PUBLISH_PHASE_NOTIFY');
  await expect(actionsValue).toContainText('REVALIDATE_TRANSITION');
  await expect(actionsValue).toContainText('ESCALATE_TO_PM');

  await scenario.selectOption('success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Transition autorisée H04 -> H05');
  await expect(severityValue).toHaveText('none');
  await expect(actionsValue).toContainText('—');
  await expect(successJson).toContainText('"allowed":true');
  await expect(successJson).toContainText('"reasonCode":"OK"');
  await expect(errorMessage).toBeHidden();
  await expect(action).toBeEnabled();
});

test('phase SLA alert demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
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

        await page.getByLabel('Scénario').selectOption('sla-critical');
        await page.getByRole('button', { name: 'Évaluer alerte SLA' }).click();

        await expect(page.getByRole('status', { name: 'État alerte SLA' })).toHaveAttribute(
          'data-state',
          'error'
        );

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const reason = document.getElementById('reason-value');
          const severity = document.getElementById('severity-value');
          const actions = document.getElementById('actions-value');
          const error = document.getElementById('error-message');
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
            severity: computeOverflow(severity),
            actions: computeOverflow(actions),
            error: computeOverflow(error),
            success: computeOverflow(success)
          };
        });

        expect(
          Math.max(
            overflow.document,
            overflow.body,
            overflow.reason,
            overflow.severity,
            overflow.actions,
            overflow.error,
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
