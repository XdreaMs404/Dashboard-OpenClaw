import { expect, test } from '@playwright/test';
import { buildAqcdSnapshotComparisons } from '../../src/aqcd-snapshot-comparisons.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Snapshots AQCD comparatifs</title>
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
      #comparison-value,
      #readiness-value,
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
      <h1>Snapshots AQCD comparatifs</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="missing-comparative">Snapshots insuffisants</option>
        <option value="continuity-gap">Gap périodique</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-comparison" type="button">Calculer comparatif</button>

      <p id="state-indicator" role="status" aria-label="État snapshots AQCD" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>comparisons</dt><dd id="comparison-value">—</dd></div>
          <div><dt>readiness</dt><dd id="readiness-value">—</dd></div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-comparison');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');

      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const diagValue = document.getElementById('diag-value');
      const comparisonValue = document.getElementById('comparison-value');
      const readinessValue = document.getElementById('readiness-value');

      const setState = (state) => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;
      };

      const renderResult = (result) => {
        reasonCodeValue.textContent = result.reasonCode;
        reasonValue.textContent = result.reason;

        const diagnostics = result.diagnostics ?? {};
        diagValue.textContent =
          'ref=' + String(diagnostics.windowRef ?? '—') +
          ' | continuous=' + String(diagnostics.metricsContinuous ?? '—') +
          ' | comparisons=' + String(diagnostics.comparisonCount ?? '—') +
          ' | readiness=' + String(diagnostics.readinessScore ?? '—');

        const comparisons = result.snapshots?.comparisons ?? [];
        const lastComparison = comparisons[comparisons.length - 1] ?? null;
        comparisonValue.textContent =
          'count=' + String(comparisons.length) +
          ' | lastDirection=' + String(lastComparison?.direction ?? '—') +
          ' | lastDelta=' + String(lastComparison?.delta?.global ?? '—');

        const readiness = result.readiness ?? {};
        readinessValue.textContent =
          'score=' + String(readiness.score ?? '—') +
          ' | threshold=' + String(readiness.threshold ?? '—') +
          ' | met=' + String(readiness.met ?? '—') +
          ' | rules=' + String(readiness.rulesVersion ?? '—');
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 120));
          const result = await window.runSnapshotComparisonScenarioRuntime(scenarioInput.value);
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

function buildPayload() {
  return {
    window: 'story',
    windowRef: 'S050',
    metrics: {
      autonomy: { A1: 90, A2: 88, A3: 85, A4: 89 },
      qualityTech: { Q1: 86, Q2: 84, Q3: 82, Q4: 80, Q5: 88 },
      costEfficiency: { C1: 74, C2: 77, C3: 79, C4: 73 },
      design: { D1: 90, D2: 89, D3: 87, D4: 86, D5: 88, D6: 85 }
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
        id: 'AQCD-S048-W1',
        windowRef: 'S048-W1',
        updatedAt: '2026-03-01T00:00:00.000Z',
        scores: {
          autonomy: 74,
          qualityTech: 72,
          costEfficiency: 70,
          designExcellence: 78,
          global: 73.6
        }
      },
      {
        id: 'AQCD-S049-W1',
        windowRef: 'S049-W1',
        updatedAt: '2026-03-02T00:00:00.000Z',
        scores: {
          autonomy: 78,
          qualityTech: 75,
          costEfficiency: 71,
          designExcellence: 81,
          global: 76.55
        }
      },
      {
        id: 'AQCD-S050-W1',
        windowRef: 'S050-W1',
        updatedAt: '2026-03-03T00:00:00.000Z',
        scores: {
          autonomy: 80,
          qualityTech: 77,
          costEfficiency: 73,
          designExcellence: 83,
          global: 78.45
        }
      }
    ],
    latencySamplesMs: [1200, 1400, 1700, 1900]
  };
}

function runScenario(scenario) {
  if (scenario === 'success') {
    return buildAqcdSnapshotComparisons(buildPayload(), {
      nowMs: Date.parse('2026-03-03T01:00:00.000Z'),
      cadenceHours: 24
    });
  }

  if (scenario === 'missing-comparative') {
    const payload = buildPayload();
    payload.snapshots = payload.snapshots.slice(0, 1);
    return buildAqcdSnapshotComparisons(payload, {
      nowMs: Date.parse('2026-03-03T01:00:00.000Z')
    });
  }

  if (scenario === 'continuity-gap') {
    const payload = buildPayload();
    payload.snapshots[2].updatedAt = '2026-03-08T00:00:00.000Z';
    return buildAqcdSnapshotComparisons(payload, {
      nowMs: Date.parse('2026-03-08T00:10:00.000Z'),
      cadenceHours: 24,
      continuityToleranceMultiplier: 1.5
    });
  }

  return buildAqcdSnapshotComparisons('bad-input');
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('runSnapshotComparisonScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('aqcd snapshot comparisons demo covers empty/loading/error/success with comparative and readiness details', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Calculer comparatif' });
  const stateIndicator = page.getByRole('status', { name: 'État snapshots AQCD' });
  const errorMessage = page.getByRole('alert');

  const reasonCodeValue = page.locator('#reason-code-value');
  const diagValue = page.locator('#diag-value');
  const comparisonValue = page.locator('#comparison-value');
  const readinessValue = page.locator('#readiness-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');

  await scenario.selectOption('invalid-input');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_AQCD_SNAPSHOT_COMPARISON_INPUT');

  await scenario.selectOption('missing-comparative');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('AQCD_COMPARATIVE_SNAPSHOTS_REQUIRED');

  await scenario.selectOption('continuity-gap');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('AQCD_SNAPSHOT_CONTINUITY_GAP');

  await scenario.selectOption('success');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(diagValue).toContainText('ref=S050');
  await expect(comparisonValue).toContainText('count=2');
  await expect(readinessValue).toContainText('rules=S050-v1');
  await expect(errorMessage).toBeHidden();
});

test('aqcd snapshot comparisons demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  await page.getByLabel('Scénario').selectOption('success');
  await page.getByRole('button', { name: 'Calculer comparatif' }).click();

  await expect(page.getByRole('status', { name: 'État snapshots AQCD' })).toHaveAttribute('data-state', 'success');

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
