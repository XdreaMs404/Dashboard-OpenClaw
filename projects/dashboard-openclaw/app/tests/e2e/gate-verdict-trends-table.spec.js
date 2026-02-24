import { expect, test } from '@playwright/test';
import { buildGateVerdictTrendsTable } from '../../src/gate-verdict-trends-table.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Tableau tendances verdicts</title>
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
      #totals-value,
      #rows-value,
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
      <h1>Tableau tendances des verdicts</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="evidence-missing">Preuve manquante</option>
        <option value="export-blocked">Export bloqué</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-trends" type="button">Calculer tendances</button>

      <p id="state-indicator" role="status" aria-label="État tableau tendances verdicts" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>totals</dt><dd id="totals-value">—</dd></div>
          <div><dt>rows</dt><dd id="rows-value">—</dd></div>
          <div><dt>reportExport</dt><dd id="export-value">—</dd></div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-trends');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');

      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const diagValue = document.getElementById('diag-value');
      const totalsValue = document.getElementById('totals-value');
      const rowsValue = document.getElementById('rows-value');
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
          'phase=' + String(diagnostics.phase ?? '—') +
          ' | period=' + String(diagnostics.period ?? '—') +
          ' | rows=' + String(diagnostics.rowsCount ?? '—') +
          ' | total=' + String(diagnostics.totalVerdicts ?? '—') +
          ' | source=' + String(diagnostics.sourceReasonCode ?? '—');

        const totals = result.trendTable?.totals ?? {};
        totalsValue.textContent =
          'pass=' + String(totals.passCount ?? '—') +
          ' | concerns=' + String(totals.concernsCount ?? '—') +
          ' | fail=' + String(totals.failCount ?? '—') +
          ' | dominant=' + String(totals.dominantVerdict ?? '—') +
          ' | direction=' + String(totals.trendDirection ?? '—');

        const firstRow = (result.trendTable?.rows ?? [])[0] ?? {};
        rowsValue.textContent =
          'rows=' + String((result.trendTable?.rows ?? []).length) +
          ' | firstPeriod=' + String(firstRow.periodLabel ?? '—') +
          ' | firstDirection=' + String(firstRow.trendDirection ?? '—');

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
          const result = await window.runVerdictTrendScenarioRuntime(scenarioInput.value);
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
    return buildGateVerdictTrendsTable({
      phase: 'G4-UX',
      period: 'weekly',
      exportRequest: true,
      evidenceRefs: ['proof:trend:2026-W06'],
      trendRows: [
        {
          periodLabel: '2026-W05',
          passCount: 1,
          concernsCount: 2,
          failCount: 1
        },
        {
          periodLabel: '2026-W06',
          passCount: 3,
          concernsCount: 1,
          failCount: 0
        }
      ]
    });
  }

  if (scenario === 'evidence-missing') {
    return buildGateVerdictTrendsTable({
      phase: 'G4-T',
      period: 'daily',
      trendRows: [
        {
          periodLabel: '2026-02-24',
          passCount: 1,
          concernsCount: 0,
          failCount: 0
        }
      ]
    });
  }

  if (scenario === 'export-blocked') {
    return buildGateVerdictTrendsTable({
      phase: 'G4',
      period: 'monthly',
      exportRequest: true,
      evidenceRefs: ['proof:trend:empty'],
      trendRows: []
    });
  }

  return buildGateVerdictTrendsTable('bad-input');
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('runVerdictTrendScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('verdict trends table demo covers empty/loading/error/success with export context', async ({ page }) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Calculer tendances' });
  const stateIndicator = page.getByRole('status', { name: 'État tableau tendances verdicts' });
  const errorMessage = page.getByRole('alert');

  const reasonCodeValue = page.locator('#reason-code-value');
  const diagValue = page.locator('#diag-value');
  const totalsValue = page.locator('#totals-value');
  const rowsValue = page.locator('#rows-value');
  const exportValue = page.locator('#export-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-input');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_VERDICT_TRENDS_INPUT');

  await scenario.selectOption('evidence-missing');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('EVIDENCE_CHAIN_INCOMPLETE');

  await scenario.selectOption('export-blocked');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('REPORT_EXPORT_BLOCKED');

  await scenario.selectOption('success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(errorMessage).toBeHidden();
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(diagValue).toContainText('rows=2');
  await expect(totalsValue).toContainText('dominant=PASS');
  await expect(rowsValue).toContainText('firstPeriod=2026-W05');
  await expect(exportValue).toContainText('canExport=true');
});

const responsiveViewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1366, height: 768 }
];

for (const viewport of responsiveViewports) {
  test(`verdict trends table demo remains readable without horizontal overflow on ${viewport.name}`, async ({
    page
  }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await bootstrapDemoPage(page);

    await page.getByLabel('Scénario').selectOption('success');
    await page.getByRole('button', { name: 'Calculer tendances' }).click();

    const stateIndicator = page.getByRole('status', { name: 'État tableau tendances verdicts' });
    await expect(stateIndicator).toHaveAttribute('data-state', 'success');

    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(viewport.width + 2);
  });
}
