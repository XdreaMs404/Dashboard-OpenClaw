import { expect, test } from '@playwright/test';
import { buildRolePersonalizedDashboards } from '../../src/role-personalized-dashboards.js';
import { buildS073Payload } from '../fixtures/role-s073-payload.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Dashboards personnalisés par rôle</title>
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
      #roles-value,
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
      <h1>Dashboards personnalisés par rôle</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="missing-role">Rôle dashboard manquant</option>
        <option value="missing-context">Action sans contexte</option>
        <option value="latency-budget">Dépassement p95</option>
        <option value="mtta-budget">Dépassement MTTA</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-role-dashboard" type="button">Évaluer dashboards rôles</button>

      <p id="state-indicator" role="status" aria-label="État dashboards rôles" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section aria-label="Zone focus démonstration">
        <h2>Parcours clavier critique</h2>
        <div class="focus-zone">
          <button id="focus-0" class="focus-target" type="button">Filtrer par rôle</button>
          <button id="focus-1" class="focus-target" type="button">Prioriser actions</button>
          <button id="focus-2" class="focus-target" type="button">Exporter vue sponsor</button>
        </div>
      </section>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>summary</dt><dd id="summary-value">—</dd></div>
          <div><dt>roles</dt><dd id="roles-value">—</dd></div>
          <div><dt>queue</dt><dd id="queue-value">—</dd></div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-role-dashboard');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');

      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const diagValue = document.getElementById('diag-value');
      const summaryValue = document.getElementById('summary-value');
      const rolesValue = document.getElementById('roles-value');
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
          'model=' + String(diagnostics.roleDashboardModelVersion ?? '—') +
          ' | p95=' + String(diagnostics.latencyP95Ms ?? '—') +
          ' | mtta=' + String(diagnostics.mttaP90Minutes ?? '—') +
          ' | actions=' + String(diagnostics.totalActions ?? '—');

        const dashboards = result.roleDashboards ?? {};
        const perf = dashboards.performance ?? {};
        const rel = dashboards.reliability ?? {};

        summaryValue.textContent =
          'p95=' + String(perf.latencyP95Ms ?? '—') + 'ms' +
          ' | mtta=' + String(rel.mttaP90Minutes ?? '—') + 'min' +
          ' | roles=' + String(dashboards.roles?.length ?? '—');

        const roles = Array.isArray(dashboards.roles) ? dashboards.roles : [];
        rolesValue.textContent = roles
          .map((entry) => String(entry.role) + ':' + String(entry.topAction?.actionId ?? '—'))
          .join(' | ');

        const queue = result.prioritizedActionQueue?.queueByRole ?? {};
        queueValue.textContent = Object.entries(queue)
          .map(([role, actions]) => role + ':' + String(actions.length))
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
          const result = await window.runRoleDashboardScenarioRuntime(scenarioInput.value);
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
    return buildRolePersonalizedDashboards(buildS073Payload(), {
      nowMs: Date.parse('2026-03-25T09:00:00.000Z')
    });
  }

  if (scenario === 'missing-role') {
    const payload = buildS073Payload();
    payload.roleDashboards = payload.roleDashboards.filter((entry) => String(entry.role).toUpperCase() !== 'SPONSOR');

    return buildRolePersonalizedDashboards(payload, {
      nowMs: Date.parse('2026-03-25T09:00:00.000Z')
    });
  }

  if (scenario === 'missing-context') {
    const payload = buildS073Payload();
    payload.roleActionQueue[0].contextRef = '';

    return buildRolePersonalizedDashboards(payload, {
      nowMs: Date.parse('2026-03-25T09:00:00.000Z')
    });
  }

  if (scenario === 'latency-budget') {
    const payload = buildS073Payload();
    payload.latencySamplesMs = [1200, 1500, 2100, 2300, 2400];

    return buildRolePersonalizedDashboards(payload, {
      nowMs: Date.parse('2026-03-25T09:00:00.000Z')
    });
  }

  if (scenario === 'mtta-budget') {
    const payload = buildS073Payload();
    payload.mttaSamplesMinutes = [7, 9, 11, 13, 15];

    return buildRolePersonalizedDashboards(payload, {
      nowMs: Date.parse('2026-03-25T09:00:00.000Z')
    });
  }

  return buildRolePersonalizedDashboards('bad-input');
}

test('role dashboards demo covers empty/loading/error/success states with FR-055/FR-056 outcomes', async ({ page }) => {
  await page.exposeFunction('runRoleDashboardScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Évaluer dashboards rôles' });
  const stateIndicator = page.getByRole('status', { name: 'État dashboards rôles' });
  const reasonCodeValue = page.locator('#reason-code-value');
  const summaryValue = page.locator('#summary-value');
  const rolesValue = page.locator('#roles-value');
  const errorMessage = page.getByRole('alert');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');

  await scenario.selectOption('invalid-input');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_ROLE_DASHBOARD_INPUT');

  await scenario.selectOption('missing-role');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('ROLE_DASHBOARD_REQUIRED_ROLES_MISSING');

  await scenario.selectOption('missing-context');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('ROLE_ACTION_CONTEXT_REQUIRED');

  await scenario.selectOption('latency-budget');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('ROLE_DASHBOARD_P95_LATENCY_BUDGET_EXCEEDED');

  await scenario.selectOption('mtta-budget');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('ROLE_DASHBOARD_MTTA_BUDGET_EXCEEDED');

  await scenario.selectOption('success');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(summaryValue).toContainText('roles=5');
  await expect(rolesValue).toContainText('PM:ACT-PM-001');
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

test('role dashboards demo stays readable without overflow on mobile/tablet/desktop', async ({ page }) => {
  await page.exposeFunction('runRoleDashboardScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  await page.getByLabel('Scénario').selectOption('success');
  await page.getByRole('button', { name: 'Évaluer dashboards rôles' }).click();
  await expect(page.getByRole('status', { name: 'État dashboards rôles' })).toHaveAttribute(
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
      const selectors = ['#reason-value', '#diag-value', '#summary-value', '#roles-value', '#queue-value', '#success-json'];

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
