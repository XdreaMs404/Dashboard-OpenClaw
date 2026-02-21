import { expect, test } from '@playwright/test';
import { buildPhaseStateProjection } from '../../src/phase-state-projection.js';
import { validatePhaseTransition } from '../../src/phase-transition-validator.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Projection état de phase BMAD</title>
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
        width: min(100%, 48rem);
      }

      section,
      #success-json,
      #error-message {
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
    </style>
  </head>
  <body>
    <main>
      <h1>Projection état de phase</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="missing-notification">Blocage notification manquante</option>
        <option value="invalid-timestamps">Blocage horodatages invalides</option>
        <option value="done">Phase terminée</option>
      </select>

      <button id="project-action" type="button">Projeter état</button>

      <p id="state-indicator" role="status" aria-label="État projection phase" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Projection</h2>
        <dl>
          <div><dt>owner</dt><dd id="owner-value">—</dd></div>
          <div><dt>started_at</dt><dd id="started-value">—</dd></div>
          <div><dt>finished_at</dt><dd id="finished-value">—</dd></div>
          <div><dt>status</dt><dd id="status-value">—</dd></div>
          <div><dt>duration_ms</dt><dd id="duration-value">—</dd></div>
          <div><dt>blocking_reason</dt><dd id="reason-value">—</dd></div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('project-action');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');

      const ownerValue = document.getElementById('owner-value');
      const startedValue = document.getElementById('started-value');
      const finishedValue = document.getElementById('finished-value');
      const statusValue = document.getElementById('status-value');
      const durationValue = document.getElementById('duration-value');
      const reasonValue = document.getElementById('reason-value');

      const setState = (state) => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;
      };

      const renderProjection = (projection) => {
        ownerValue.textContent = projection.owner || '—';
        startedValue.textContent = projection.started_at || 'null';
        finishedValue.textContent = projection.finished_at || 'null';
        statusValue.textContent = projection.status;
        durationValue.textContent = projection.duration_ms === null ? 'null' : String(projection.duration_ms);
        reasonValue.textContent = projection.blockingReasonCode
          ? projection.blockingReasonCode + ' — ' + projection.blockingReason
          : '—';
      };

      const buildPayload = async (scenario) => {
        const now = Date.now();

        if (scenario === 'done') {
          return {
            phaseId: 'H02',
            owner: 'Alex',
            startedAt: new Date(now - 10 * 60 * 1000).toISOString(),
            finishedAt: new Date(now).toISOString(),
            nowAt: new Date(now).toISOString()
          };
        }

        if (scenario === 'invalid-timestamps') {
          return {
            phaseId: 'H03',
            owner: 'Iris',
            startedAt: new Date(now).toISOString(),
            finishedAt: new Date(now - 1_000).toISOString(),
            nowAt: new Date(now).toISOString()
          };
        }

        const transitionValidation = await window.validatePhaseTransitionRuntime({
          fromPhase: 'H02',
          toPhase: 'H03',
          transitionRequestedAt: new Date(now).toISOString(),
          notificationPublishedAt: null,
          notificationSlaMinutes: 10
        });

        return {
          phaseId: 'H02',
          owner: 'Mina',
          startedAt: null,
          finishedAt: null,
          nowAt: new Date(now).toISOString(),
          transitionValidation
        };
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 150));
          const projection = await window.buildPhaseStateProjectionRuntime(
            await buildPayload(scenarioInput.value)
          );

          renderProjection(projection);

          if (projection.status === 'blocked') {
            setState('error');
            errorMessage.hidden = false;
            errorMessage.textContent = projection.blockingReasonCode + ' — ' + projection.blockingReason;
            successJson.hidden = true;
            successJson.textContent = '';
          } else {
            setState('success');
            successJson.hidden = false;
            successJson.textContent = JSON.stringify(projection);
            errorMessage.hidden = true;
            errorMessage.textContent = '';
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

async function bootstrapDemoPage(page) {
  await page.exposeFunction('buildPhaseStateProjectionRuntime', buildPhaseStateProjection);
  await page.exposeFunction('validatePhaseTransitionRuntime', validatePhaseTransition);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

async function projectDoneState(page) {
  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Projeter état' });
  const stateIndicator = page.getByRole('status', { name: 'État projection phase' });

  await scenario.selectOption('done');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(page.locator('#success-json')).toBeVisible();
}

test('phase state projection demo covers empty/loading/error/success with required phase fields', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Projeter état' });
  const stateIndicator = page.getByRole('status', { name: 'État projection phase' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const ownerValue = page.locator('#owner-value');
  const startedValue = page.locator('#started-value');
  const finishedValue = page.locator('#finished-value');
  const statusValue = page.locator('#status-value');
  const durationValue = page.locator('#duration-value');
  const reasonValue = page.locator('#reason-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('missing-notification');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(statusValue).toHaveText('blocked');
  await expect(ownerValue).toHaveText('Mina');
  await expect(startedValue).toHaveText('null');
  await expect(finishedValue).toHaveText('null');
  await expect(durationValue).toHaveText('null');
  await expect(reasonValue).toContainText('PHASE_NOTIFICATION_MISSING');

  await scenario.selectOption('invalid-timestamps');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(statusValue).toHaveText('blocked');
  await expect(reasonValue).toContainText('INVALID_PHASE_TIMESTAMPS');

  await scenario.selectOption('done');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(statusValue).toHaveText('done');
  await expect(ownerValue).toHaveText('Alex');
  await expect(startedValue).not.toHaveText('null');
  await expect(finishedValue).not.toHaveText('null');
  await expect(durationValue).toHaveText('600000');
  await expect(reasonValue).toHaveText('—');
  await expect(successJson).toContainText('"status":"done"');
  await expect(successJson).toContainText('"owner":"Alex"');
  await expect(errorMessage).toBeHidden();
  await expect(action).toBeEnabled();
});

test('phase state projection success payload stays without horizontal overflow on mobile/tablet/desktop', async ({
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
        await projectDoneState(page);

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
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
            success: computeOverflow(success)
          };
        });

        expect(
          Math.max(overflow.document, overflow.body, overflow.success),
          `Overflow horizontal détecté (${viewport.name}): ${JSON.stringify(overflow)}`
        ).toBeLessThanOrEqual(1);
      } finally {
        await context.close();
      }
    });
  }
});
