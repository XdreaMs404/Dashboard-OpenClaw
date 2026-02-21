import { expect, test } from '@playwright/test';
import { validatePhasePrerequisites } from '../../src/phase-prerequisites-validator.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Validation prérequis de phase BMAD</title>
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

      #error-message,
      #success-json {
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

      #missing-value {
        margin: 0;
        padding-left: 1.25rem;
        overflow-wrap: anywhere;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Validation des prérequis obligatoires</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="transition-blocked">Blocage transition (S002)</option>
        <option value="missing-prerequisites">Checklist absente</option>
        <option value="incomplete-prerequisites">Checklist incomplète</option>
        <option value="success">Transition autorisée</option>
      </select>

      <button id="validate-action" type="button">Valider prérequis</button>

      <p id="state-indicator" role="status" aria-label="État validation prérequis" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div>
            <dt>missingPrerequisiteIds</dt>
            <dd>
              <ul id="missing-value"><li>—</li></ul>
            </dd>
          </div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('validate-action');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');

      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const missingValue = document.getElementById('missing-value');

      const setState = (state) => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;
      };

      const renderMissing = (ids) => {
        missingValue.textContent = '';

        if (!Array.isArray(ids) || ids.length === 0) {
          const empty = document.createElement('li');
          empty.textContent = '—';
          missingValue.appendChild(empty);
          return;
        }

        for (const id of ids) {
          const item = document.createElement('li');
          item.textContent = id;
          missingValue.appendChild(item);
        }
      };

      const renderResult = (result) => {
        reasonCodeValue.textContent = result.reasonCode;
        reasonValue.textContent = result.reason;
        renderMissing(result.diagnostics?.missingPrerequisiteIds ?? []);
      };

      const buildTransitionInput = (fromPhase, toPhase, elapsedMs) => {
        const now = Date.now();

        return {
          fromPhase,
          toPhase,
          transitionRequestedAt: new Date(now).toISOString(),
          notificationPublishedAt: new Date(now - elapsedMs).toISOString(),
          notificationSlaMinutes: 10
        };
      };

      const buildPayload = (scenario) => {
        if (scenario === 'success') {
          return {
            transitionInput: buildTransitionInput('H03', 'H04', 2 * 60 * 1000),
            prerequisites: [
              { id: 'PR-001', required: true, status: 'done', label: 'brief validé' },
              { id: 'PR-002', required: true, status: 'done', label: 'UX audit aligné' },
              { id: 'PR-003', required: false, status: 'pending', label: 'note optionnelle' }
            ]
          };
        }

        if (scenario === 'incomplete-prerequisites') {
          return {
            transitionInput: buildTransitionInput('H03', 'H04', 2 * 60 * 1000),
            prerequisites: [
              { id: 'PR-001', required: true, status: 'done', label: 'brief validé' },
              { id: 'PR-002', required: true, status: 'pending', label: 'UX audit aligné' },
              { id: 'PR-003', required: false, status: 'blocked', label: 'note optionnelle' }
            ]
          };
        }

        if (scenario === 'missing-prerequisites') {
          return {
            transitionInput: buildTransitionInput('H03', 'H04', 2 * 60 * 1000),
            prerequisites: null
          };
        }

        return {
          transitionInput: buildTransitionInput('H03', 'H05', 2 * 60 * 1000),
          prerequisites: [
            { id: 'PR-001', required: true, status: 'done', label: 'brief validé' },
            { id: 'PR-002', required: true, status: 'done', label: 'UX audit aligné' }
          ]
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

          const result = await window.validatePhasePrerequisitesRuntime(
            buildPayload(scenarioInput.value)
          );

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

async function bootstrapDemoPage(page) {
  await page.exposeFunction('validatePhasePrerequisitesRuntime', validatePhasePrerequisites);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('phase prerequisites demo covers empty/loading/error/success with explicit blocking reason and missing list', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Valider prérequis' });
  const stateIndicator = page.getByRole('status', { name: 'État validation prérequis' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const reasonCodeValue = page.locator('#reason-code-value');
  const reasonValue = page.locator('#reason-value');
  const missingValue = page.locator('#missing-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('transition-blocked');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('TRANSITION_NOT_ALLOWED');
  await expect(reasonValue).toContainText('Transition non autorisée');
  await expect(errorMessage).toContainText('TRANSITION_NOT_ALLOWED');

  await scenario.selectOption('missing-prerequisites');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('PHASE_PREREQUISITES_MISSING');
  await expect(reasonValue).toContainText('Checklist de prérequis absente');
  await expect(missingValue).toContainText('—');

  await scenario.selectOption('incomplete-prerequisites');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('PHASE_PREREQUISITES_INCOMPLETE');
  await expect(reasonValue).toContainText('PR-002');
  await expect(missingValue).toContainText('PR-002');

  await scenario.selectOption('success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Prérequis validés');
  await expect(successJson).toContainText('"allowed":true');
  await expect(successJson).toContainText('"reasonCode":"OK"');
  await expect(errorMessage).toBeHidden();
  await expect(action).toBeEnabled();
});

test('phase prerequisites demo keeps success rendering without horizontal overflow on mobile/tablet/desktop', async ({
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
        await page.getByRole('button', { name: 'Valider prérequis' }).click();

        await expect(page.getByRole('status', { name: 'État validation prérequis' })).toHaveAttribute(
          'data-state',
          'success'
        );

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const success = document.getElementById('success-json');
          const error = document.getElementById('error-message');

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
            error: computeOverflow(error)
          };
        });

        expect(
          Math.max(overflow.document, overflow.body, overflow.success, overflow.error),
          `Overflow horizontal détecté (${viewport.name}): ${JSON.stringify(overflow)}`
        ).toBeLessThanOrEqual(1);
      } finally {
        await context.close();
      }
    });
  }
});
