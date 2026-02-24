import { expect, test } from '@playwright/test';
import { simulateGateVerdictBeforeSubmission } from '../../src/gate-pre-submit-simulation.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Simulation pré-soumission</title>
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
        width: min(100%, 70rem);
      }

      #reason-value,
      #diag-value,
      #sim-value,
      #trend-value,
      #evidence-value,
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
      <h1>Simulation verdict pré-soumission</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="trend-window-invalid">Fenêtre tendance invalide</option>
        <option value="evidence-incomplete">Chaîne de preuve incomplète</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-simulation" type="button">Lancer simulation</button>

      <p id="state-indicator" role="status" aria-label="État simulation pré-soumission" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>simulation</dt><dd id="sim-value">—</dd></div>
          <div><dt>trendSnapshot</dt><dd id="trend-value">—</dd></div>
          <div><dt>evidenceChain</dt><dd id="evidence-value">—</dd></div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-simulation');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');

      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const diagValue = document.getElementById('diag-value');
      const simValue = document.getElementById('sim-value');
      const trendValue = document.getElementById('trend-value');
      const evidenceValue = document.getElementById('evidence-value');

      const setState = (state) => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;
      };

      const renderResult = (result) => {
        reasonCodeValue.textContent = result.reasonCode;
        reasonValue.textContent = result.reason;

        const diagnostics = result.diagnostics ?? {};
        diagValue.textContent =
          'eligible=' + String(diagnostics.simulationEligible ?? '—') +
          ' | simulated=' + String(diagnostics.simulatedVerdict ?? '—') +
          ' | p95=' + String(diagnostics.p95SimulationMs ?? '—') +
          ' | source=' + String(diagnostics.sourceReasonCode ?? '—');

        const simulation = result.simulation ?? {};
        simValue.textContent =
          'eligible=' + String(simulation.eligible ?? '—') +
          ' | nonMutative=' + String(simulation.nonMutative ?? '—') +
          ' | simulated=' + String(simulation.simulatedVerdict ?? '—');

        const trendSnapshot = result.trendSnapshot ?? {};
        trendValue.textContent =
          'phase=' + String(trendSnapshot.phase ?? '—') +
          ' | period=' + String(trendSnapshot.period ?? '—') +
          ' | pass=' + String(trendSnapshot.passCount ?? '—') +
          ' | concerns=' + String(trendSnapshot.concernsCount ?? '—') +
          ' | fail=' + String(trendSnapshot.failCount ?? '—') +
          ' | direction=' + String(trendSnapshot.trendDirection ?? '—');

        const evidence = result.evidenceChain ?? {};
        evidenceValue.textContent =
          'primary=' + String((evidence.primaryEvidenceRefs ?? []).length) +
          ' | trend=' + String((evidence.trendEvidenceRefs ?? []).length);
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 120));
          const result = await window.runPreSubmitScenarioRuntime(scenarioInput.value);
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
    return simulateGateVerdictBeforeSubmission({
      baseVerdict: 'PASS',
      simulationInput: {
        eligible: true,
        readOnly: true,
        additionalSignals: [{ severity: 'CONCERNS', factorId: 'ux-risk' }]
      },
      trendWindow: {
        startAt: '2026-02-01T00:00:00.000Z',
        endAt: '2026-02-07T23:59:59.000Z',
        period: '2026-W06'
      },
      trendSamples: [
        { verdict: 'PASS', at: '2026-02-02T12:00:00.000Z' },
        { verdict: 'CONCERNS', at: '2026-02-06T12:00:00.000Z' }
      ],
      evidenceChain: {
        primaryEvidenceRefs: ['proof:gate-center'],
        trendEvidenceRefs: ['proof:trend-snapshot']
      }
    });
  }

  if (scenario === 'trend-window-invalid') {
    return simulateGateVerdictBeforeSubmission({
      baseVerdict: 'PASS',
      simulationInput: {
        eligible: true,
        readOnly: true
      },
      trendWindow: {
        startAt: '2026-02-10T00:00:00.000Z',
        endAt: '2026-02-01T00:00:00.000Z'
      }
    });
  }

  if (scenario === 'evidence-incomplete') {
    return simulateGateVerdictBeforeSubmission({
      baseVerdict: 'PASS',
      simulationInput: {
        eligible: true,
        readOnly: true
      },
      evidenceChain: {
        primaryEvidenceRefs: [],
        trendEvidenceRefs: []
      }
    });
  }

  return simulateGateVerdictBeforeSubmission({});
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('runPreSubmitScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('pre-submit simulation demo covers empty/loading/error/success and S032 fields', async ({ page }) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Lancer simulation' });
  const stateIndicator = page.getByRole('status', { name: 'État simulation pré-soumission' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const reasonCodeValue = page.locator('#reason-code-value');
  const diagValue = page.locator('#diag-value');
  const simValue = page.locator('#sim-value');
  const trendValue = page.locator('#trend-value');
  const evidenceValue = page.locator('#evidence-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-input');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(errorMessage).toBeVisible();
  await expect(reasonCodeValue).toHaveText('INVALID_GATE_SIMULATION_INPUT');

  await scenario.selectOption('trend-window-invalid');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('SIMULATION_TREND_WINDOW_INVALID');

  await scenario.selectOption('evidence-incomplete');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('EVIDENCE_CHAIN_INCOMPLETE');

  await scenario.selectOption('success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(errorMessage).toBeHidden();
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(diagValue).toContainText('simulated=CONCERNS');
  await expect(simValue).toContainText('nonMutative=true');
  await expect(trendValue).toContainText('period=2026-W06');
  await expect(evidenceValue).toContainText('primary=1');
  await expect(evidenceValue).toContainText('trend=1');
  await expect(successJson).toBeVisible();
});

const responsiveViewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1366, height: 768 }
];

for (const viewport of responsiveViewports) {
  test(`pre-submit simulation demo stays readable on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await bootstrapDemoPage(page);

    await page.getByLabel('Scénario').selectOption('success');
    await page.getByRole('button', { name: 'Lancer simulation' }).click();

    const stateIndicator = page.getByRole('status', { name: 'État simulation pré-soumission' });
    await expect(stateIndicator).toHaveAttribute('data-state', 'success');

    const bodyScrollWidth = await page.evaluate(() => document.body.scrollWidth);
    expect(bodyScrollWidth).toBeLessThanOrEqual(viewport.width + 2);
  });
}
