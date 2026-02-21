import { expect, test } from '@playwright/test';
import { evaluatePhaseTransitionOverride } from '../../src/phase-transition-override.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Override transition BMAD</title>
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
      #override-required-value,
      #override-applied-value,
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
      <h1>Override exceptionnel de transition</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Payload invalide</option>
        <option value="missing-request">Blocage éligible sans request</option>
        <option value="approver-conflict">Conflit approbateur</option>
        <option value="approved-override">Override approuvé</option>
        <option value="nominal">Nominal sans override</option>
      </select>

      <button id="run-action" type="button">Évaluer override</button>

      <p id="state-indicator" role="status" aria-label="État override" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>override.required</dt><dd id="override-required-value">—</dd></div>
          <div><dt>override.applied</dt><dd id="override-applied-value">—</dd></div>
          <div>
            <dt>requiredActions</dt>
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
      const overrideRequiredValue = document.getElementById('override-required-value');
      const overrideAppliedValue = document.getElementById('override-applied-value');
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
        overrideRequiredValue.textContent = String(result.override?.required ?? '—');
        overrideAppliedValue.textContent = String(result.override?.applied ?? '—');
        renderList(actionsValue, Array.isArray(result.requiredActions) ? result.requiredActions : []);
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 150));

          const result = await window.evaluatePhaseTransitionOverrideScenarioRuntime(scenarioInput.value);
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
  if (scenario === 'nominal') {
    return evaluatePhaseTransitionOverride({
      transitionValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Transition autorisée H04 -> H05.',
        diagnostics: {
          fromIndex: 3,
          toIndex: 4,
          elapsedMs: 180_000,
          slaMs: 600_000
        }
      }
    });
  }

  if (scenario === 'approved-override') {
    return evaluatePhaseTransitionOverride({
      transitionValidation: {
        allowed: false,
        reasonCode: 'PHASE_NOTIFICATION_MISSING',
        reason: 'notificationPublishedAt requis.',
        diagnostics: {
          fromIndex: 3,
          toIndex: 4,
          elapsedMs: null,
          slaMs: 600_000
        }
      },
      overrideRequest: {
        requestedBy: 'ops.lead',
        approver: 'pm.owner',
        justification:
          'Notification régularisée et override exceptionnel approuvé avec audit complet et revalidation immédiate.'
      }
    });
  }

  if (scenario === 'approver-conflict') {
    return evaluatePhaseTransitionOverride({
      transitionValidation: {
        allowed: false,
        reasonCode: 'TRANSITION_NOT_ALLOWED',
        reason: 'Transition non autorisée H08 -> H10.',
        diagnostics: {
          fromIndex: 7,
          toIndex: 9,
          elapsedMs: null,
          slaMs: 600_000
        }
      },
      overrideRequest: {
        requestedBy: 'alex.pm',
        approver: 'Alex.PM',
        justification:
          'Blocage critique validé en comité, correction en cours et suivi renforcé immédiat.'
      }
    });
  }

  if (scenario === 'missing-request') {
    return evaluatePhaseTransitionOverride({
      transitionValidation: {
        allowed: false,
        reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
        reason: 'Notification hors SLA: elapsedMs=620000, slaMs=600000.',
        diagnostics: {
          fromIndex: 3,
          toIndex: 4,
          elapsedMs: 620_000,
          slaMs: 600_000
        }
      }
    });
  }

  return evaluatePhaseTransitionOverride({
    overrideRequest: {
      requestedBy: 'ops.lead',
      approver: 'pm.owner',
      justification:
        'Justification fournie mais transition source absente pour déclencher un input invalide contrôlé.'
    }
  });
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('evaluatePhaseTransitionOverrideScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('phase transition override demo covers empty/loading/error/success with reason and override states', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Évaluer override' });
  const stateIndicator = page.getByRole('status', { name: 'État override' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const reasonCodeValue = page.locator('#reason-code-value');
  const reasonValue = page.locator('#reason-value');
  const overrideRequiredValue = page.locator('#override-required-value');
  const overrideAppliedValue = page.locator('#override-applied-value');
  const actionsValue = page.locator('#actions-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-input');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_OVERRIDE_INPUT');
  await expect(reasonValue).toContainText('transitionValidation ou transitionInput est requis');
  await expect(overrideRequiredValue).toHaveText('false');
  await expect(overrideAppliedValue).toHaveText('false');
  await expect(actionsValue).toContainText('—');

  await scenario.selectOption('missing-request');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('OVERRIDE_REQUEST_MISSING');
  await expect(reasonValue).toContainText('overrideRequest est requis');
  await expect(overrideRequiredValue).toHaveText('true');
  await expect(overrideAppliedValue).toHaveText('false');
  await expect(actionsValue).toContainText('CAPTURE_JUSTIFICATION');
  await expect(actionsValue).toContainText('CAPTURE_APPROVER');

  await scenario.selectOption('approver-conflict');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('OVERRIDE_APPROVER_CONFLICT');
  await expect(reasonValue).toContainText('doit être distinct du demandeur');
  await expect(overrideRequiredValue).toHaveText('true');
  await expect(overrideAppliedValue).toHaveText('false');
  await expect(actionsValue).toContainText('CAPTURE_APPROVER');

  await scenario.selectOption('approved-override');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Override exceptionnel approuvé');
  await expect(overrideRequiredValue).toHaveText('true');
  await expect(overrideAppliedValue).toHaveText('true');
  await expect(actionsValue).toContainText('REVALIDATE_TRANSITION');
  await expect(actionsValue).toContainText('RECORD_OVERRIDE_AUDIT');
  await expect(successJson).toContainText('"allowed":true');
  await expect(errorMessage).toBeHidden();

  await scenario.selectOption('nominal');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Transition autorisée H04 -> H05');
  await expect(overrideRequiredValue).toHaveText('false');
  await expect(overrideAppliedValue).toHaveText('false');
  await expect(actionsValue).toContainText('—');
  await expect(action).toBeEnabled();
});

test('phase transition override demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
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

        await page.getByLabel('Scénario').selectOption('approved-override');
        await page.getByRole('button', { name: 'Évaluer override' }).click();

        await expect(page.getByRole('status', { name: 'État override' })).toHaveAttribute(
          'data-state',
          'success'
        );

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const reason = document.getElementById('reason-value');
          const required = document.getElementById('override-required-value');
          const applied = document.getElementById('override-applied-value');
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
            required: computeOverflow(required),
            applied: computeOverflow(applied),
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
            overflow.required,
            overflow.applied,
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
