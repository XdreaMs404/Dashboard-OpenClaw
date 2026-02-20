import { expect, test } from '@playwright/test';
import { validatePhaseTransition } from '../../src/phase-transition-validator.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Validation transition BMAD</title>
  </head>
  <body>
    <main>
      <h1>Validation de transition BMAD</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="missing">Notification manquante</option>
        <option value="invalid-transition">Transition interdite</option>
        <option value="success">Transition valide</option>
      </select>

      <button id="validate-action" type="button">Valider transition</button>

      <p id="state-indicator" role="status" aria-label="État validation transition" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <pre id="success-value" aria-live="polite" aria-atomic="true" hidden></pre>
      </section>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('validate-action');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successValue = document.getElementById('success-value');

      const setState = (state, payload = '') => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;

        if (state === 'error') {
          errorMessage.hidden = false;
          errorMessage.textContent = payload;
          successValue.hidden = true;
          successValue.textContent = '';
          return;
        }

        if (state === 'success') {
          successValue.hidden = false;
          successValue.textContent = payload;
          errorMessage.hidden = true;
          errorMessage.textContent = '';
          return;
        }

        errorMessage.hidden = true;
        errorMessage.textContent = '';
        successValue.hidden = true;
        successValue.textContent = '';
      };

      const buildPayload = (scenario) => {
        const now = Date.now();
        const transitionRequestedAt = new Date(now).toISOString();

        if (scenario === 'success') {
          return {
            fromPhase: 'H01',
            toPhase: 'H02',
            transitionRequestedAt,
            notificationPublishedAt: new Date(now - 5 * 60 * 1000).toISOString(),
            notificationSlaMinutes: 10
          };
        }

        if (scenario === 'invalid-transition') {
          return {
            fromPhase: 'H01',
            toPhase: 'H03',
            transitionRequestedAt,
            notificationPublishedAt: new Date(now - 2 * 60 * 1000).toISOString(),
            notificationSlaMinutes: 10
          };
        }

        return {
          fromPhase: 'H02',
          toPhase: 'H03',
          transitionRequestedAt,
          notificationPublishedAt: null,
          notificationSlaMinutes: 10
        };
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;

        try {
          await new Promise((resolve) => setTimeout(resolve, 150));
          const result = await window.validatePhaseTransitionRuntime(buildPayload(scenarioInput.value));

          if (result.allowed) {
            setState('success', JSON.stringify(result));
          } else {
            setState('error', result.reasonCode + ' — ' + result.reason);
          }
        } catch (error) {
          setState('error', error?.message ?? String(error));
        } finally {
          action.disabled = false;
          action.focus();
        }
      });
    </script>
  </body>
</html>
`;

test('phase transition demo covers empty/loading/error/success and shows blocking reason', async ({ page }) => {
  await page.exposeFunction('validatePhaseTransitionRuntime', validatePhaseTransition);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Valider transition' });
  const stateIndicator = page.getByRole('status', { name: 'État validation transition' });
  const errorMessage = page.getByRole('alert');
  const successValue = page.locator('#success-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('missing');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(errorMessage).toContainText('PHASE_NOTIFICATION_MISSING');
  await expect(errorMessage).toContainText('notificationPublishedAt');
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');

  await scenario.selectOption('invalid-transition');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toContainText('TRANSITION_NOT_ALLOWED');
  await expect(errorMessage).toContainText('fromPhase=H01');
  await expect(errorMessage).toContainText('expectedToPhase=H02');
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');

  await scenario.selectOption('success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successValue).toBeVisible();
  await expect(successValue).toContainText('"reasonCode":"OK"');
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(errorMessage).toBeHidden();
  await expect(action).toBeEnabled();
});
