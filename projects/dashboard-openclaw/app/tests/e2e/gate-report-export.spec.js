import { expect, test } from '@playwright/test';
import { buildGateReportExport } from '../../src/gate-report-export.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Export rapport gate</title>
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
      #gate-value,
      #export-value,
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
      <h1>Export rapport gate</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="gate-view-missing">Vue gate incomplète</option>
        <option value="latency-budget">Budget latence dépassé</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-export" type="button">Exporter rapport</button>

      <p id="state-indicator" role="status" aria-label="État export rapport gate" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>gateView</dt><dd id="gate-value">—</dd></div>
          <div><dt>reportExport</dt><dd id="export-value">—</dd></div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-export');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');

      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const diagValue = document.getElementById('diag-value');
      const gateValue = document.getElementById('gate-value');
      const exportValue = document.getElementById('export-value');

      const setState = (state) => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;
      };

      const renderResult = (result) => {
        reasonCodeValue.textContent = result.reasonCode;
        reasonValue.textContent = result.reason;

        const diagnostics = result.diagnostics ?? {};
        diagValue.textContent =
          'verdict=' + String(diagnostics.verdict ?? '—') +
          ' | gates=' + String(diagnostics.gateCount ?? '—') +
          ' | evidence=' + String(diagnostics.evidenceRefCount ?? '—') +
          ' | p95=' + String(diagnostics.p95LatencyMs ?? '—');

        const gateRows = result.gateView?.rows ?? [];
        const totals = result.gateView?.totals ?? {};
        gateValue.textContent =
          'rows=' + String(gateRows.length) +
          ' | pass=' + String(totals.passCount ?? '—') +
          ' | concerns=' + String(totals.concernsCount ?? '—') +
          ' | fail=' + String(totals.failCount ?? '—');

        const reportExport = result.reportExport ?? {};
        exportValue.textContent =
          'requested=' + String(reportExport.requested ?? '—') +
          ' | canExport=' + String(reportExport.canExport ?? '—') +
          ' | blockers=' + String((reportExport.blockers ?? []).join(',') || '—');
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 120));
          const result = await window.runGateReportExportScenarioRuntime(scenarioInput.value);
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

function buildGates() {
  return [
    {
      gateId: 'G1',
      status: 'PASS',
      owner: 'analyst',
      updatedAt: '2026-02-24T10:00:00.000Z'
    },
    {
      gateId: 'G2',
      status: 'PASS',
      owner: 'pm',
      updatedAt: '2026-02-24T10:05:00.000Z'
    },
    {
      gateId: 'G3',
      status: 'PASS',
      owner: 'architect',
      updatedAt: '2026-02-24T10:10:00.000Z'
    },
    {
      gateId: 'G4',
      status: 'CONCERNS',
      owner: 'reviewer',
      updatedAt: '2026-02-24T10:15:00.000Z'
    },
    {
      gateId: 'G5',
      status: 'PASS',
      owner: 'jarvis',
      updatedAt: '2026-02-24T10:20:00.000Z'
    }
  ];
}

function runScenario(scenario) {
  if (scenario === 'success') {
    return buildGateReportExport({
      verdict: 'CONCERNS',
      exportRequest: true,
      gates: buildGates(),
      evidenceRefs: ['evidence://g4/review-001'],
      openActions: [{ id: 'ACT-001', title: 'Corriger dette UX', status: 'OPEN' }],
      latencySamplesMs: [300, 450, 520]
    });
  }

  if (scenario === 'gate-view-missing') {
    return buildGateReportExport({
      verdict: 'PASS',
      exportRequest: true,
      gates: buildGates().slice(0, 4),
      evidenceRefs: ['evidence://g4/review-001'],
      openActions: []
    });
  }

  if (scenario === 'latency-budget') {
    return buildGateReportExport({
      verdict: 'PASS',
      exportRequest: true,
      gates: buildGates(),
      evidenceRefs: ['evidence://g4/review-001'],
      openActions: [],
      latencySamplesMs: [2600, 2800, 3000]
    });
  }

  return buildGateReportExport('bad-input');
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('runGateReportExportScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('gate report export demo covers empty/loading/error/success with gate+evidence+actions output', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Exporter rapport' });
  const stateIndicator = page.getByRole('status', { name: 'État export rapport gate' });
  const errorMessage = page.getByRole('alert');

  const reasonCodeValue = page.locator('#reason-code-value');
  const diagValue = page.locator('#diag-value');
  const gateValue = page.locator('#gate-value');
  const exportValue = page.locator('#export-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-input');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_GATE_REPORT_EXPORT_INPUT');

  await scenario.selectOption('gate-view-missing');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('GATE_VIEW_INCOMPLETE');

  await scenario.selectOption('latency-budget');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('EXPORT_LATENCY_BUDGET_EXCEEDED');

  await scenario.selectOption('success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(errorMessage).toBeHidden();
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(diagValue).toContainText('gates=5');
  await expect(gateValue).toContainText('rows=5');
  await expect(exportValue).toContainText('canExport=true');
});

const responsiveViewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1366, height: 768 }
];

for (const viewport of responsiveViewports) {
  test(`gate report export demo remains readable without horizontal overflow on ${viewport.name}`, async ({
    page
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await bootstrapDemoPage(page);

    await page.getByLabel('Scénario').selectOption('success');
    await page.getByRole('button', { name: 'Exporter rapport' }).click();

    await expect(page.getByRole('status', { name: 'État export rapport gate' })).toHaveAttribute(
      'data-state',
      'success'
    );

    const docWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(docWidth).toBeLessThanOrEqual(viewport.width + 1);
  });
}
