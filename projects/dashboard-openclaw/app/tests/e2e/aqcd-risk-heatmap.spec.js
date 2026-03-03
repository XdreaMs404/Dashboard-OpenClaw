import { expect, test } from '@playwright/test';
import { buildAqcdRiskHeatmap } from '../../src/aqcd-risk-heatmap.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Heatmap risques AQCD</title>
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
      #heatmap-value,
      #cost-value,
      #runbook-value,
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
      <h1>Heatmap risques AQCD</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="missing-decision-cost">Coût décision validée manquant</option>
        <option value="missing-runbook">Runbook critique manquant</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-heatmap" type="button">Calculer heatmap</button>

      <p id="state-indicator" role="status" aria-label="État heatmap AQCD" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>heatmapDashboard</dt><dd id="heatmap-value">—</dd></div>
          <div><dt>validatedDecisionCost</dt><dd id="cost-value">—</dd></div>
          <div><dt>criticalRunbook</dt><dd id="runbook-value">—</dd></div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-heatmap');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');

      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const diagValue = document.getElementById('diag-value');
      const heatmapValue = document.getElementById('heatmap-value');
      const costValue = document.getElementById('cost-value');
      const runbookValue = document.getElementById('runbook-value');

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
          ' | validatedDecisions=' + String(diagnostics.validatedDecisionCount ?? '—') +
          ' | avgCost=' + String(diagnostics.averageCostPerValidatedDecision ?? '—');

        const dashboard = result.heatmapDashboard ?? {};
        const topMover = Array.isArray(dashboard.topMovers) ? dashboard.topMovers[0] : null;
        heatmapValue.textContent =
          'window=' + String(dashboard.snapshotWindow?.from ?? '—') + '→' + String(dashboard.snapshotWindow?.to ?? '—') +
          ' | topMover=' + String(topMover?.riskId ?? '—') +
          ' | delta=' + String(topMover?.deltaExposure ?? '—');

        const cost = result.validatedDecisionCost ?? {};
        costValue.textContent =
          'validated=' + String(cost.validatedCount ?? '—') +
          ' | total=' + String(cost.totalCount ?? '—') +
          ' | average=' + String(cost.averageCostPerValidatedDecision ?? '—');

        const runbook = result.criticalRunbook ?? {};
        runbookValue.textContent =
          'ref=' + String(runbook.ref ?? '—') +
          ' | validated=' + String(runbook.validated ?? '—') +
          ' | testedAt=' + String(runbook.testedAt ?? '—');
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 120));
          const result = await window.runRiskHeatmapScenarioRuntime(scenarioInput.value);
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
    windowRef: 'S055',
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
        id: 'AQCD-S054-W1',
        windowRef: 'S054-W1',
        updatedAt: '2026-03-07T00:00:00.000Z',
        scores: {
          autonomy: 84,
          qualityTech: 81,
          costEfficiency: 76,
          designExcellence: 87,
          global: 82.05
        }
      },
      {
        id: 'AQCD-S055-W1',
        windowRef: 'S055-W1',
        updatedAt: '2026-03-08T00:00:00.000Z',
        scores: {
          autonomy: 85,
          qualityTech: 82,
          costEfficiency: 77,
          designExcellence: 88,
          global: 83.0
        }
      }
    ],
    gateActions: [
      {
        gate: 'G4',
        actionId: 'ACTION_G4_HEATMAP_VISIBILITY',
        action: 'Publier heatmap probabilité/impact et évolution quotidienne.',
        owner: 'PM',
        evidenceRef: '_bmad-output/implementation-artifacts/handoffs/S055-dev-to-tea.md',
        priorityScore: 94
      }
    ],
    riskRegister: [
      {
        id: 'M08',
        gate: 'G4',
        owner: 'UXLead',
        status: 'OPEN',
        dueAt: '2099-04-05T00:00:00.000Z',
        probability: 0.68,
        impact: 0.8,
        description: 'Lisibilité AQCD insuffisante pour sponsor',
        mitigations: [
          {
            taskId: 'TASK-M08-001',
            owner: 'UXLead',
            status: 'IN_PROGRESS',
            dueAt: '2099-04-03T00:00:00.000Z',
            proofRef: 'proof://mitigation/M08/001'
          }
        ]
      },
      {
        id: 'P05',
        gate: 'G5',
        owner: 'SM',
        status: 'MITIGATED',
        dueAt: '2099-04-08T00:00:00.000Z',
        exposure: 45,
        description: 'Actions de mitigation non fermées',
        mitigations: [
          {
            taskId: 'TASK-P05-001',
            owner: 'SM',
            status: 'DONE',
            dueAt: '2099-04-04T00:00:00.000Z',
            proofRef: 'proof://mitigation/P05/001'
          }
        ]
      }
    ],
    heatmapSeries: [
      {
        id: 'HEATMAP-S054',
        at: '2026-03-07T00:00:00.000Z',
        points: [
          { riskId: 'M08', probability: 0.68, impact: 0.8 },
          { riskId: 'P05', probability: 0.45, impact: 0.52 }
        ]
      },
      {
        id: 'HEATMAP-S055',
        at: '2026-03-08T00:00:00.000Z',
        points: [
          { riskId: 'M08', probability: 0.62, impact: 0.74 },
          { riskId: 'P05', probability: 0.35, impact: 0.4 }
        ]
      }
    ],
    decisionCostSeries: [
      { decisionId: 'DEC-001', status: 'VALIDATED', cost: 2.4 },
      { decisionId: 'DEC-002', validated: true, cost: 1.8 },
      { decisionId: 'DEC-003', status: 'REVIEW', cost: 3.1 }
    ],
    runbookRef: 'runbook://aqcd-priority-v1',
    runbookValidated: true,
    criticalRunbookRef: 'runbook://aqcd-heatmap-critical-v1',
    criticalRunbookValidated: true,
    criticalRunbookTestedAt: '2026-03-08T09:00:00.000Z',
    decisionLatencySamplesMs: [850, 1050, 1320, 1640, 1980]
  };
}

function runScenario(scenario) {
  if (scenario === 'success') {
    return buildAqcdRiskHeatmap(buildPayload());
  }

  if (scenario === 'missing-decision-cost') {
    const payload = buildPayload();
    payload.decisionCostSeries = [
      { decisionId: 'DEC-001', status: 'DRAFT', cost: 2.4 },
      { decisionId: 'DEC-002', status: 'REVIEW', cost: 1.8 }
    ];

    return buildAqcdRiskHeatmap(payload);
  }

  if (scenario === 'missing-runbook') {
    const payload = buildPayload();
    payload.criticalRunbookTestedAt = '';

    return buildAqcdRiskHeatmap(payload);
  }

  return buildAqcdRiskHeatmap('bad-input');
}

test('aqcd risk heatmap demo covers empty/loading/error/success with heatmap evolution + validated decision cost', async ({
  page
}) => {
  await page.exposeFunction('runRiskHeatmapScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  const scenario = page.locator('#scenario');
  const runButton = page.locator('#run-heatmap');
  const stateIndicator = page.locator('#state-indicator');
  const reasonCodeValue = page.locator('#reason-code-value');
  const diagValue = page.locator('#diag-value');
  const heatmapValue = page.locator('#heatmap-value');
  const costValue = page.locator('#cost-value');
  const runbookValue = page.locator('#runbook-value');
  const errorMessage = page.locator('#error-message');
  const successJson = page.locator('#success-json');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');

  await scenario.selectOption('invalid-input');
  await runButton.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_AQCD_RISK_HEATMAP_INPUT');

  await scenario.selectOption('missing-decision-cost');
  await runButton.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('AQCD_VALIDATED_DECISION_COST_REQUIRED');
  await expect(errorMessage).toContainText('AQCD_VALIDATED_DECISION_COST_REQUIRED');

  await scenario.selectOption('missing-runbook');
  await runButton.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('AQCD_CRITICAL_RUNBOOK_REQUIRED');

  await scenario.selectOption('success');
  await runButton.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(diagValue).toContainText('continuous=true');
  await expect(costValue).toContainText('average=2.1');
  await expect(heatmapValue).toContainText('window=HEATMAP-S054→HEATMAP-S055');
  await expect(runbookValue).toContainText('validated=true');
  await expect(successJson).toContainText('heatmapDashboard');
});

test('aqcd risk heatmap demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
  page
}) => {
  await page.exposeFunction('runRiskHeatmapScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  await page.selectOption('#scenario', 'success');
  await page.click('#run-heatmap');
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
        '#heatmap-value',
        '#cost-value',
        '#runbook-value',
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
