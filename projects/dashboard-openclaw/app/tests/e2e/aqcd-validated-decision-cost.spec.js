import { expect, test } from '@playwright/test';
import { buildAqcdValidatedDecisionCost } from '../../src/aqcd-validated-decision-cost.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Coût moyen décision validée AQCD</title>
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
      #cost-value,
      #waste-value,
      #alerts-value,
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
      <h1>Coût moyen décision validée AQCD</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="missing-phase-waste">Waste ratio phase manquant</option>
        <option value="drift-without-alert">Dérive sans alerte</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-decision-cost" type="button">Calculer coût validé</button>

      <p id="state-indicator" role="status" aria-label="État coût validé AQCD" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>validatedDecisionCost</dt><dd id="cost-value">—</dd></div>
          <div><dt>phaseWasteRatios</dt><dd id="waste-value">—</dd></div>
          <div><dt>wasteAlerts</dt><dd id="alerts-value">—</dd></div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-decision-cost');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');

      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const diagValue = document.getElementById('diag-value');
      const costValue = document.getElementById('cost-value');
      const wasteValue = document.getElementById('waste-value');
      const alertsValue = document.getElementById('alerts-value');

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
          ' | avgCost=' + String(diagnostics.averageCostPerValidatedDecision ?? '—') +
          ' | driftCount=' + String(diagnostics.wasteRatioDriftCount ?? '—') +
          ' | p95=' + String(diagnostics.p95DecisionMs ?? '—');

        const cost = result.validatedDecisionCost ?? {};
        costValue.textContent =
          'validated=' + String(cost.validatedCount ?? '—') +
          ' | total=' + String(cost.totalCount ?? '—') +
          ' | average=' + String(cost.averageCostPerValidatedDecision ?? '—');

        const waste = result.phaseWasteRatios ?? {};
        wasteValue.textContent =
          'phases=' + String((waste.entries ?? []).length) +
          ' | mean=' + String(waste.meanWasteRatioPct ?? '—') +
          ' | max=' + String(waste.maxWasteRatioPct ?? '—');

        const alerts = result.wasteAlerts ?? {};
        alertsValue.textContent =
          'hasDrift=' + String(alerts.hasDrift ?? '—') +
          ' | driftCount=' + String(alerts.driftCount ?? '—') +
          ' | threshold=' + String(alerts.thresholdPct ?? '—');
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 120));
          const result = await window.runValidatedDecisionCostScenarioRuntime(scenarioInput.value);
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
    windowRef: 'S056',
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
        id: 'AQCD-S055-W1',
        windowRef: 'S055-W1',
        updatedAt: '2026-03-08T00:00:00.000Z',
        scores: {
          autonomy: 85,
          qualityTech: 82,
          costEfficiency: 77,
          designExcellence: 88,
          global: 83
        }
      },
      {
        id: 'AQCD-S056-W1',
        windowRef: 'S056-W1',
        updatedAt: '2026-03-09T00:00:00.000Z',
        scores: {
          autonomy: 86,
          qualityTech: 83,
          costEfficiency: 78,
          designExcellence: 89,
          global: 84
        }
      }
    ],
    gateActions: [
      {
        gate: 'G4',
        actionId: 'ACTION_G4_COST_DECISION_CONTROL',
        action: 'Surveiller coût moyen décision validée.',
        owner: 'FinOps',
        evidenceRef: '_bmad-output/implementation-artifacts/handoffs/S056-dev-to-tea.md',
        priorityScore: 93
      }
    ],
    riskRegister: [
      {
        id: 'P05',
        gate: 'G5',
        owner: 'SM',
        status: 'OPEN',
        dueAt: '2099-04-15T00:00:00.000Z',
        probability: 0.62,
        impact: 0.71,
        mitigations: [
          {
            taskId: 'TASK-P05-001',
            owner: 'SM',
            status: 'IN_PROGRESS',
            dueAt: '2099-04-12T00:00:00.000Z',
            proofRef: 'proof://mitigation/P05/001'
          }
        ]
      },
      {
        id: 'C01',
        gate: 'G4',
        owner: 'FinOps',
        status: 'MITIGATED',
        dueAt: '2099-04-18T00:00:00.000Z',
        exposure: 44,
        mitigations: [
          {
            taskId: 'TASK-C01-001',
            owner: 'FinOps',
            status: 'DONE',
            dueAt: '2099-04-10T00:00:00.000Z',
            proofRef: 'proof://mitigation/C01/001'
          }
        ]
      }
    ],
    heatmapSeries: [
      {
        id: 'HEATMAP-S055',
        at: '2026-03-08T00:00:00.000Z',
        points: [
          { riskId: 'P05', probability: 0.62, impact: 0.71 },
          { riskId: 'C01', probability: 0.48, impact: 0.44 }
        ]
      },
      {
        id: 'HEATMAP-S056',
        at: '2026-03-09T00:00:00.000Z',
        points: [
          { riskId: 'P05', probability: 0.55, impact: 0.64 },
          { riskId: 'C01', probability: 0.38, impact: 0.36 }
        ]
      }
    ],
    decisionCostSeries: [
      { decisionId: 'DEC-100', status: 'VALIDATED', cost: 2.2 },
      { decisionId: 'DEC-101', validated: true, cost: 1.9 },
      { decisionId: 'DEC-102', status: 'REVIEW', cost: 2.8 }
    ],
    phaseWasteSeries: [
      { phase: 'analysis', wasteRatioPct: 18.5, tokenWaste: 320, tokenTotal: 1720 },
      { phase: 'planning', wasteRatioPct: 21.4, tokenWaste: 410, tokenTotal: 1916 },
      { phase: 'implementation', wasteRatioPct: 24.1, tokenWaste: 980, tokenTotal: 4066 }
    ],
    wasteAlerting: {
      enabled: true,
      channels: ['ops-console'],
      notificationRef: 'ops://alerts/S056'
    },
    runbookRef: 'runbook://aqcd-priority-v1',
    runbookValidated: true,
    criticalRunbookRef: 'runbook://aqcd-cost-critical-v1',
    criticalRunbookValidated: true,
    criticalRunbookTestedAt: '2026-03-09T09:00:00.000Z',
    decisionLatencySamplesMs: [900, 1100, 1400, 1800, 2100]
  };
}

function runScenario(scenario) {
  if (scenario === 'success') {
    return buildAqcdValidatedDecisionCost(buildPayload());
  }

  if (scenario === 'missing-phase-waste') {
    const payload = buildPayload();
    payload.phaseWasteSeries = [];

    return buildAqcdValidatedDecisionCost(payload);
  }

  if (scenario === 'drift-without-alert') {
    const payload = buildPayload();
    payload.phaseWasteSeries[2].wasteRatioPct = 41;
    payload.wasteAlerting = {
      enabled: false,
      channels: []
    };

    return buildAqcdValidatedDecisionCost(payload);
  }

  return buildAqcdValidatedDecisionCost('bad-input');
}

test('aqcd validated decision cost demo covers empty/loading/error/success with waste ratio drift controls', async ({
  page
}) => {
  await page.exposeFunction('runValidatedDecisionCostScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  const scenario = page.locator('#scenario');
  const runButton = page.locator('#run-decision-cost');
  const stateIndicator = page.locator('#state-indicator');
  const reasonCodeValue = page.locator('#reason-code-value');
  const diagValue = page.locator('#diag-value');
  const costValue = page.locator('#cost-value');
  const wasteValue = page.locator('#waste-value');
  const alertsValue = page.locator('#alerts-value');
  const errorMessage = page.locator('#error-message');
  const successJson = page.locator('#success-json');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');

  await scenario.selectOption('invalid-input');
  await runButton.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_AQCD_VALIDATED_DECISION_COST_INPUT');

  await scenario.selectOption('missing-phase-waste');
  await runButton.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('AQCD_PHASE_WASTE_RATIO_REQUIRED');

  await scenario.selectOption('drift-without-alert');
  await runButton.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('AQCD_WASTE_RATIO_ALERT_REQUIRED');
  await expect(errorMessage).toContainText('AQCD_WASTE_RATIO_ALERT_REQUIRED');

  await scenario.selectOption('success');
  await runButton.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(diagValue).toContainText('avgCost=2.05');
  await expect(costValue).toContainText('average=2.05');
  await expect(wasteValue).toContainText('mean=21.33');
  await expect(alertsValue).toContainText('hasDrift=false');
  await expect(successJson).toContainText('phaseWasteRatios');
});

test('aqcd validated decision cost demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
  page
}) => {
  await page.exposeFunction('runValidatedDecisionCostScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  await page.selectOption('#scenario', 'success');
  await page.click('#run-decision-cost');
  await expect(page.locator('#state-indicator')).toHaveAttribute('data-state', 'success');

  const viewports = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    const overflow = await page.evaluate(() => {
      const selectors = [
        '#reason-value',
        '#diag-value',
        '#cost-value',
        '#waste-value',
        '#alerts-value',
        '#error-message',
        '#success-json'
      ];

      const values = selectors.map((selector) => {
        const element = document.querySelector(selector);

        if (!element) {
          return 0;
        }

        return Math.max(0, element.scrollWidth - element.clientWidth);
      });

      const docOverflow = Math.max(
        0,
        document.documentElement.scrollWidth - document.documentElement.clientWidth
      );

      return Math.max(docOverflow, ...values);
    });

    expect(overflow).toBe(0);
  }
});
