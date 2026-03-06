import { expect, test } from '@playwright/test';
import { buildRolePrioritizedContextualQueue } from '../../src/role-prioritized-contextual-queue.js';
import { buildS074Payload } from '../fixtures/role-s074-payload.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>File actions priorisées contextualisées</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        padding: 1rem;
        color: #0f172a;
        background: #fff;
      }
      main {
        width: min(100%, 72rem);
      }
      #reason-value,
      #diag-value,
      #summary-value,
      #queue-value,
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
    </style>
  </head>
  <body>
    <main>
      <h1>File actions priorisées contextualisées</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="missing-severity">Niveau de sévérité manquant</option>
        <option value="decision-budget">Dépassement NFR-033</option>
        <option value="mtta-budget">Dépassement NFR-017</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-priority-queue" type="button">Évaluer file priorisée</button>

      <p id="state-indicator" role="status" aria-label="État file priorisée" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section aria-label="Zone focus démonstration">
        <h2>Parcours clavier critique</h2>
        <div class="focus-zone">
          <button id="focus-0" class="focus-target" type="button">Filtrer critiques</button>
          <button id="focus-1" class="focus-target" type="button">Trier par priorité</button>
          <button id="focus-2" class="focus-target" type="button">Exporter notifications</button>
        </div>
      </section>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>summary</dt><dd id="summary-value">—</dd></div>
          <div><dt>queue</dt><dd id="queue-value">—</dd></div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-priority-queue');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');

      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const diagValue = document.getElementById('diag-value');
      const summaryValue = document.getElementById('summary-value');
      const queueValue = document.getElementById('queue-value');

      const setState = (state) => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;
      };

      const renderResult = (result) => {
        reasonCodeValue.textContent = result.reasonCode;
        reasonValue.textContent = result.reason;

        const diagnostics = result.diagnostics ?? {};
        diagValue.textContent =
          'model=' + String(diagnostics.priorityQueueModelVersion ?? '—') +
          ' | p95Critical=' + String(diagnostics.p95CriticalDecisionSec ?? '—') +
          ' | p90MTTA=' + String(diagnostics.p90MttaMinutes ?? '—') +
          ' | total=' + String(diagnostics.totalNotifications ?? '—');

        const summary = result.notificationCenter?.summary ?? {};
        summaryValue.textContent =
          'critical=' + String(summary.severityDistribution?.CRITICAL ?? '—') +
          ' | high=' + String(summary.severityDistribution?.HIGH ?? '—') +
          ' | medium=' + String(summary.severityDistribution?.MEDIUM ?? '—') +
          ' | low=' + String(summary.severityDistribution?.LOW ?? '—');

        const queue = Array.isArray(result.notificationCenter?.queue) ? result.notificationCenter.queue : [];
        queueValue.textContent = queue
          .slice(0, 5)
          .map((entry) => String(entry.notificationId) + ':' + String(entry.severity) + ':' + String(entry.role))
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
          const result = await window.runPriorityQueueScenarioRuntime(scenarioInput.value);
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
    return buildRolePrioritizedContextualQueue(buildS074Payload(), {
      nowMs: Date.parse('2026-03-26T09:00:00.000Z')
    });
  }

  if (scenario === 'missing-severity') {
    const payload = buildS074Payload();
    payload.notificationCenter = payload.notificationCenter.filter((entry) => String(entry.severity).toUpperCase() !== 'LOW');

    return buildRolePrioritizedContextualQueue(payload, {
      nowMs: Date.parse('2026-03-26T09:00:00.000Z')
    });
  }

  if (scenario === 'decision-budget') {
    const payload = buildS074Payload();
    payload.criticalDecisionSamplesSec = [70, 91, 105];

    return buildRolePrioritizedContextualQueue(payload, {
      nowMs: Date.parse('2026-03-26T09:00:00.000Z')
    });
  }

  if (scenario === 'mtta-budget') {
    const payload = buildS074Payload();
    payload.notificationMttaSamplesMinutes = [8, 10, 12, 13];

    return buildRolePrioritizedContextualQueue(payload, {
      nowMs: Date.parse('2026-03-26T09:00:00.000Z')
    });
  }

  return buildRolePrioritizedContextualQueue('bad-input');
}

test('priority queue demo covers empty/loading/error/success with FR-056/FR-057 outcomes', async ({ page }) => {
  await page.exposeFunction('runPriorityQueueScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Évaluer file priorisée' });
  const stateIndicator = page.getByRole('status', { name: 'État file priorisée' });
  const reasonCodeValue = page.locator('#reason-code-value');
  const summaryValue = page.locator('#summary-value');
  const queueValue = page.locator('#queue-value');
  const errorMessage = page.getByRole('alert');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');

  await scenario.selectOption('invalid-input');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_ROLE_PRIORITY_QUEUE_INPUT');

  await scenario.selectOption('missing-severity');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('ROLE_NOTIFICATION_SEVERITY_COVERAGE_REQUIRED');

  await scenario.selectOption('decision-budget');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('ROLE_NOTIFICATION_DECISION_LATENCY_BUDGET_EXCEEDED');

  await scenario.selectOption('mtta-budget');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('ROLE_NOTIFICATION_MTTA_BUDGET_EXCEEDED');

  await scenario.selectOption('success');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(summaryValue).toContainText('critical=2');
  await expect(summaryValue).toContainText('low=2');
  await expect(queueValue).toContainText('NOTIF-CRIT-001:CRITICAL:PM');
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

test('priority queue demo remains readable without overflow on mobile/tablet/desktop', async ({ page }) => {
  await page.exposeFunction('runPriorityQueueScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  await page.getByLabel('Scénario').selectOption('success');
  await page.getByRole('button', { name: 'Évaluer file priorisée' }).click();
  await expect(page.getByRole('status', { name: 'État file priorisée' })).toHaveAttribute('data-state', 'success');

  const viewports = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    const overflow = await page.evaluate(() => {
      const selectors = ['#reason-value', '#diag-value', '#summary-value', '#queue-value', '#error-message', '#success-json'];

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
