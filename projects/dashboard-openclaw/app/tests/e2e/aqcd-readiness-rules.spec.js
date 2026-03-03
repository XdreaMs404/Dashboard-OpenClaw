import { expect, test } from '@playwright/test';
import { buildAqcdReadinessRules } from '../../src/aqcd-readiness-rules.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Readiness AQCD rule-based v1</title>
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
      #readiness-value,
      #recommendations-value,
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
      <h1>Readiness AQCD rule-based v1</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="missing-comparative">Snapshots insuffisants</option>
        <option value="threshold-unmet">Seuil readiness non atteint</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-readiness" type="button">Évaluer readiness</button>

      <p id="state-indicator" role="status" aria-label="État readiness AQCD" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>readiness</dt><dd id="readiness-value">—</dd></div>
          <div><dt>recommendations</dt><dd id="recommendations-value">—</dd></div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-readiness');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');

      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const diagValue = document.getElementById('diag-value');
      const readinessValue = document.getElementById('readiness-value');
      const recommendationsValue = document.getElementById('recommendations-value');

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
          ' | readiness=' + String(diagnostics.readinessScore ?? '—') +
          ' | threshold=' + String(diagnostics.readinessThreshold ?? '—') +
          ' | rules=' + String(diagnostics.rulesVersion ?? '—');

        const readiness = result.readiness ?? {};
        readinessValue.textContent =
          'score=' + String(readiness.score ?? '—') +
          ' | threshold=' + String(readiness.threshold ?? '—') +
          ' | met=' + String(readiness.met ?? '—') +
          ' | band=' + String(readiness.band ?? '—');

        const recommendations = Array.isArray(result.recommendations) ? result.recommendations : [];
        recommendationsValue.textContent =
          'count=' + String(recommendations.length) +
          ' | firstAction=' + String(recommendations[0]?.actionId ?? '—') +
          ' | firstOwner=' + String(recommendations[0]?.owner ?? '—') +
          ' | firstEvidence=' + String(recommendations[0]?.evidenceRef ?? '—');
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 120));
          const result = await window.runAqcdReadinessScenarioRuntime(scenarioInput.value);
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
    windowRef: 'S051',
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
      },
      {
        id: 'AQCD-S051-W1',
        windowRef: 'S051-W1',
        updatedAt: '2026-03-04T00:00:00.000Z',
        scores: {
          autonomy: 82,
          qualityTech: 79,
          costEfficiency: 74,
          designExcellence: 85,
          global: 80.15
        }
      }
    ],
    latencySamplesMs: [1100, 1400, 1700, 1800]
  };
}

function runScenario(scenario) {
  if (scenario === 'success') {
    return buildAqcdReadinessRules(buildPayload(), {
      nowMs: Date.parse('2026-03-04T01:00:00.000Z')
    });
  }

  if (scenario === 'missing-comparative') {
    const payload = buildPayload();
    payload.snapshots = payload.snapshots.slice(0, 1);

    return buildAqcdReadinessRules(payload, {
      nowMs: Date.parse('2026-03-04T01:00:00.000Z')
    });
  }

  if (scenario === 'threshold-unmet') {
    const payload = buildPayload();
    payload.snapshots[2].updatedAt = '2026-03-20T00:00:00.000Z';

    return buildAqcdReadinessRules(payload, {
      nowMs: Date.parse('2026-03-26T00:00:00.000Z'),
      enforceContinuity: false
    });
  }

  return buildAqcdReadinessRules('bad-input');
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('runAqcdReadinessScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('aqcd readiness v1 demo covers empty/loading/error/success with readiness factors and recommendations', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Évaluer readiness' });
  const stateIndicator = page.getByRole('status', { name: 'État readiness AQCD' });
  const errorMessage = page.getByRole('alert');

  const reasonCodeValue = page.locator('#reason-code-value');
  const diagValue = page.locator('#diag-value');
  const readinessValue = page.locator('#readiness-value');
  const recommendationsValue = page.locator('#recommendations-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');

  await scenario.selectOption('invalid-input');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_AQCD_READINESS_INPUT');

  await scenario.selectOption('missing-comparative');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('AQCD_COMPARATIVE_SNAPSHOTS_REQUIRED');

  await scenario.selectOption('threshold-unmet');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('AQCD_READINESS_THRESHOLD_UNMET');
  await expect(recommendationsValue).toContainText('count=');

  await scenario.selectOption('success');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(diagValue).toContainText('ref=S051');
  await expect(readinessValue).toContainText('met=true');
  await expect(errorMessage).toBeHidden();
});

test('aqcd readiness v1 demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  await page.getByLabel('Scénario').selectOption('success');
  await page.getByRole('button', { name: 'Évaluer readiness' }).click();

  await expect(page.getByRole('status', { name: 'État readiness AQCD' })).toHaveAttribute('data-state', 'success');

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
