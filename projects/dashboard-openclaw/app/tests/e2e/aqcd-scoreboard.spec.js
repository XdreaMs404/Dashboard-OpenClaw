import { expect, test } from '@playwright/test';
import { buildAqcdExplainableScoreboard } from '../../src/aqcd-scoreboard.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Tableau AQCD explicable</title>
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
      #formula-value,
      #snapshot-value,
      #error-message,
      #success-json {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
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
      <h1>Tableau AQCD explicable</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="missing-source">Source de formule manquante</option>
        <option value="latency-budget">Budget latence dépassé</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-aqcd" type="button">Calculer AQCD</button>

      <p id="state-indicator" role="status" aria-label="État tableau AQCD" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>formula</dt><dd id="formula-value">—</dd></div>
          <div><dt>snapshots</dt><dd id="snapshot-value">—</dd></div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-aqcd');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');

      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const diagValue = document.getElementById('diag-value');
      const formulaValue = document.getElementById('formula-value');
      const snapshotValue = document.getElementById('snapshot-value');

      const setState = (state) => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;
      };

      const renderResult = (result) => {
        reasonCodeValue.textContent = result.reasonCode;
        reasonValue.textContent = result.reason;

        const diagnostics = result.diagnostics ?? {};
        const scores = diagnostics.scores ?? {};
        diagValue.textContent =
          'window=' + String(diagnostics.window ?? '—') +
          ' | ref=' + String(diagnostics.windowRef ?? '—') +
          ' | global=' + String(scores.global ?? '—') +
          ' | baselineMet=' + String(diagnostics.baselineMet ?? '—') +
          ' | p95=' + String(diagnostics.p95LatencyMs ?? '—');

        const formula = result.formula ?? {};
        const autonomy = formula.dimensions?.autonomy?.expression ?? '—';
        formulaValue.textContent =
          'global=' + String(formula.globalExpression ?? '—') +
          ' | autonomy=' + String(autonomy);

        const snapshots = result.snapshots ?? {};
        const trend = snapshots.trend ?? {};
        snapshotValue.textContent =
          'series=' + String((snapshots.series ?? []).length) +
          ' | prev=' + String(trend.previousGlobal ?? '—') +
          ' | delta=' + String(trend.deltaGlobal ?? '—') +
          ' | direction=' + String(trend.direction ?? '—');
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 120));
          const result = await window.runAqcdScenarioRuntime(scenarioInput.value);
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

function buildNominalPayload() {
  return {
    window: 'story',
    windowRef: 'S049',
    metrics: {
      autonomy: { A1: 92, A2: 88, A3: 84, A4: 90 },
      qualityTech: { Q1: 86, Q2: 82, Q3: 79, Q4: 88, Q5: 91 },
      costEfficiency: { C1: 74, C2: 76, C3: 80, C4: 72 },
      design: { D1: 90, D2: 87, D3: 85, D4: 83, D5: 88, D6: 84 }
    },
    metricSources: {
      autonomy: {
        A1: 'telemetry://autonomy/A1',
        A2: 'telemetry://autonomy/A2',
        A3: 'telemetry://autonomy/A3',
        A4: 'telemetry://autonomy/A4'
      },
      qualityTech: {
        Q1: 'telemetry://quality/Q1',
        Q2: 'telemetry://quality/Q2',
        Q3: 'telemetry://quality/Q3',
        Q4: 'telemetry://quality/Q4',
        Q5: 'telemetry://quality/Q5'
      },
      costEfficiency: {
        C1: 'telemetry://cost/C1',
        C2: 'telemetry://cost/C2',
        C3: 'telemetry://cost/C3',
        C4: 'telemetry://cost/C4'
      },
      design: {
        D1: 'telemetry://design/D1',
        D2: 'telemetry://design/D2',
        D3: 'telemetry://design/D3',
        D4: 'telemetry://design/D4',
        D5: 'telemetry://design/D5',
        D6: 'telemetry://design/D6'
      }
    },
    snapshots: [
      {
        id: 'AQCD-S048',
        window: 'story',
        windowRef: 'S048',
        updatedAt: '2026-03-03T04:00:00.000Z',
        scores: {
          autonomy: 78,
          qualityTech: 74,
          costEfficiency: 70,
          designExcellence: 80,
          global: 75.8
        }
      }
    ],
    latencySamplesMs: [1200, 1600, 1900, 2100]
  };
}

function runScenario(scenario) {
  if (scenario === 'success') {
    return buildAqcdExplainableScoreboard(buildNominalPayload());
  }

  if (scenario === 'missing-source') {
    const payload = buildNominalPayload();
    delete payload.metricSources.qualityTech.Q3;
    return buildAqcdExplainableScoreboard(payload);
  }

  if (scenario === 'latency-budget') {
    const payload = buildNominalPayload();
    payload.latencySamplesMs = [2600, 2700, 2800];
    return buildAqcdExplainableScoreboard(payload);
  }

  return buildAqcdExplainableScoreboard('bad-input');
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('runAqcdScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('aqcd scoreboard demo covers empty/loading/error/success with formula and source transparency', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Calculer AQCD' });
  const stateIndicator = page.getByRole('status', { name: 'État tableau AQCD' });
  const errorMessage = page.getByRole('alert');

  const reasonCodeValue = page.locator('#reason-code-value');
  const diagValue = page.locator('#diag-value');
  const formulaValue = page.locator('#formula-value');
  const snapshotValue = page.locator('#snapshot-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');

  await scenario.selectOption('invalid-input');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_AQCD_SCOREBOARD_INPUT');

  await scenario.selectOption('missing-source');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('AQCD_FORMULA_SOURCE_MISSING');

  await scenario.selectOption('latency-budget');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('AQCD_LATENCY_BUDGET_EXCEEDED');

  await scenario.selectOption('success');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(diagValue).toContainText('ref=S049');
  await expect(formulaValue).toContainText('global=');
  await expect(snapshotValue).toContainText('series=1');
  await expect(errorMessage).toBeHidden();
});

test('aqcd scoreboard demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  await page.getByLabel('Scénario').selectOption('success');
  await page.getByRole('button', { name: 'Calculer AQCD' }).click();

  await expect(page.getByRole('status', { name: 'État tableau AQCD' })).toHaveAttribute('data-state', 'success');

  const viewports = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth > root.clientWidth;
    });

    expect.soft(
      overflow,
      `Overflow horizontal détecté en viewport ${viewport.name} (${viewport.width}x${viewport.height})`
    ).toBe(false);
  }
});
