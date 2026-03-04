import { expect, test } from '@playwright/test';
import { buildAqcdBaselineRoiInstrumentation } from '../../src/aqcd-baseline-roi-instrumentation.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Instrumentation baseline TCD et ROI</title>
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
      #summary-value,
      #roi-value,
      #tcd-value,
      #factors-value,
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
    </style>
  </head>
  <body>
    <main>
      <h1>Instrumentation baseline TCD et ROI</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="missing-source">Source formule manquante</option>
        <option value="snapshot-short">Snapshots insuffisants</option>
        <option value="latency-budget">Dépassement latence budget</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-baseline-roi" type="button">Calculer baseline ROI</button>

      <p id="state-indicator" role="status" aria-label="État baseline ROI" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>summary</dt><dd id="summary-value">—</dd></div>
          <div><dt>roiProjection</dt><dd id="roi-value">—</dd></div>
          <div><dt>tcdBaseline</dt><dd id="tcd-value">—</dd></div>
          <div><dt>readinessFactors</dt><dd id="factors-value">—</dd></div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-baseline-roi');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');

      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const diagValue = document.getElementById('diag-value');
      const summaryValue = document.getElementById('summary-value');
      const roiValue = document.getElementById('roi-value');
      const tcdValue = document.getElementById('tcd-value');
      const factorsValue = document.getElementById('factors-value');

      const setState = (state) => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;
      };

      const renderResult = (result) => {
        reasonCodeValue.textContent = result.reasonCode;
        reasonValue.textContent = result.reason;

        const diagnostics = result.diagnostics ?? {};
        diagValue.textContent =
          'model=' + String(diagnostics.baselineRoiModelVersion ?? '—') +
          ' | snapshots=' + String(diagnostics.baselineRoiSnapshotCount ?? '—') +
          ' | roi=' + String(diagnostics.baselineRoiProjectedRoiPct ?? '—') +
          ' | p95=' + String(diagnostics.p95DecisionMs ?? '—');

        const baseline = result.baselineRoiInstrumentation ?? {};
        const summary = baseline.summary ?? {};
        summaryValue.textContent =
          'baseline=' + String(summary.baselineGlobalScore ?? '—') +
          ' | current=' + String(summary.currentGlobalScore ?? '—') +
          ' | delta=' + String(summary.globalDelta ?? '—') +
          ' | adjROI=' + String(summary.riskAdjustedRoiPct ?? '—');

        const roi = baseline.roiProjection ?? {};
        roiValue.textContent =
          'gain=' + String(roi.costGainPerDecision ?? '—') +
          ' | gainPct=' + String(roi.costGainPct ?? '—') +
          ' | riskPenalty=' + String(roi.riskPenaltyPct ?? '—');

        const tcd = baseline.tcdBaseline ?? {};
        tcdValue.textContent =
          'baselineDays=' + String(tcd.baselineDays ?? '—') +
          ' | currentDays=' + String(tcd.currentDays ?? '—') +
          ' | improvement=' + String(tcd.improvementPct ?? '—') + '%';

        const readinessFactors = Array.isArray(baseline.readinessFactors) ? baseline.readinessFactors : [];
        factorsValue.textContent = readinessFactors
          .map(
            (factor) =>
              String(factor.rule) +
              ':' +
              String(factor.contribution) +
              '@' +
              String(factor.source ?? '—')
          )
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
          const result = await window.runBaselineRoiScenarioRuntime(scenarioInput.value);
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
    windowRef: 'S060',
    metrics: {
      autonomy: { A1: 92, A2: 90, A3: 87, A4: 91 },
      qualityTech: { Q1: 88, Q2: 86, Q3: 84, Q4: 83, Q5: 90 },
      costEfficiency: { C1: 77, C2: 80, C3: 81, C4: 76 },
      design: { D1: 92, D2: 91, D3: 89, D4: 88, D5: 90, D6: 87 }
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
        id: 'AQCD-S058-W1',
        windowRef: 'S058-W1',
        updatedAt: '2026-03-11T00:00:00.000Z',
        scores: { autonomy: 87, qualityTech: 84, costEfficiency: 79, designExcellence: 90, global: 85 }
      },
      {
        id: 'AQCD-S059-W1',
        windowRef: 'S059-W1',
        updatedAt: '2026-03-12T00:00:00.000Z',
        scores: { autonomy: 88, qualityTech: 85, costEfficiency: 80, designExcellence: 91, global: 86 }
      },
      {
        id: 'AQCD-S060-W1',
        windowRef: 'S060-W1',
        updatedAt: '2026-03-13T00:00:00.000Z',
        scores: { autonomy: 89, qualityTech: 86, costEfficiency: 81, designExcellence: 92, global: 87 }
      }
    ],
    gateActions: [
      {
        gate: 'G5',
        actionId: 'ACTION_G5_BASELINE_ROI',
        action: 'Instrumenter baseline TCD + ROI pour pilotage exécutif.',
        owner: 'PM',
        evidenceRef: '_bmad-output/implementation-artifacts/handoffs/S060-dev-to-tea.md',
        priorityScore: 96
      }
    ],
    riskRegister: [
      {
        id: 'P05',
        gate: 'G5',
        owner: 'SM',
        status: 'OPEN',
        dueAt: '2099-05-10T00:00:00.000Z',
        probability: 0.58,
        impact: 0.67,
        mitigations: [
          {
            taskId: 'TASK-P05-060',
            owner: 'SM',
            status: 'IN_PROGRESS',
            dueAt: '2099-05-08T00:00:00.000Z',
            proofRef: 'proof://mitigation/P05/060'
          }
        ]
      },
      {
        id: 'M08',
        gate: 'G4',
        owner: 'UX',
        status: 'MITIGATED',
        dueAt: '2099-05-12T00:00:00.000Z',
        exposure: 40,
        mitigations: [
          {
            taskId: 'TASK-M08-060',
            owner: 'UX',
            status: 'DONE',
            dueAt: '2099-05-09T00:00:00.000Z',
            proofRef: 'proof://mitigation/M08/060'
          }
        ]
      }
    ],
    heatmapSeries: [
      {
        id: 'HEATMAP-S059',
        at: '2026-03-12T00:00:00.000Z',
        points: [
          { riskId: 'P05', probability: 0.58, impact: 0.67 },
          { riskId: 'M08', probability: 0.4, impact: 0.4 }
        ]
      },
      {
        id: 'HEATMAP-S060',
        at: '2026-03-13T00:00:00.000Z',
        points: [
          { riskId: 'P05', probability: 0.52, impact: 0.61 },
          { riskId: 'M08', probability: 0.33, impact: 0.35 }
        ]
      }
    ],
    decisionCostSeries: [
      { decisionId: 'DEC-120', status: 'VALIDATED', cost: 2.3 },
      { decisionId: 'DEC-121', validated: true, cost: 2.1 },
      { decisionId: 'DEC-122', status: 'REVIEW', cost: 2.8 }
    ],
    phaseWasteSeries: [
      { phase: 'analysis', wasteRatioPct: 18.2, tokenWaste: 310, tokenTotal: 1700 },
      { phase: 'planning', wasteRatioPct: 20.5, tokenWaste: 385, tokenTotal: 1880 },
      { phase: 'implementation', wasteRatioPct: 23.4, tokenWaste: 930, tokenTotal: 3980 }
    ],
    wasteAlerting: {
      enabled: true,
      channels: ['ops-console'],
      notificationRef: 'ops://alerts/S060'
    },
    runbookRef: 'runbook://aqcd-priority-v1',
    runbookValidated: true,
    criticalRunbookRef: 'runbook://aqcd-critical-baseline-roi-v1',
    criticalRunbookValidated: true,
    criticalRunbookTestedAt: '2026-03-13T09:00:00.000Z',
    decisionLatencySamplesMs: [850, 1050, 1300, 1600, 2000],
    baselineThreshold: 0,
    readinessV1Threshold: 0,
    baselineCostPerDecision: 2.7,
    tcdBaselineDays: 22,
    tcdCurrentDays: 16,
    retroActions: [
      {
        phase: 'H21',
        actionId: 'RETRO-H21-060',
        owner: 'SM',
        status: 'DONE',
        closureEvidenceRef: 'proof://retro/H21/060',
        updatedAt: '2026-03-13T09:40:00.000Z'
      },
      {
        phase: 'H22',
        actionId: 'RETRO-H22-060',
        owner: 'PM',
        status: 'CLOSED',
        closureEvidenceRef: 'proof://retro/H22/060',
        updatedAt: '2026-03-13T09:45:00.000Z'
      },
      {
        phase: 'H23',
        actionId: 'RETRO-H23-060',
        owner: 'Jarvis',
        status: 'VERIFIED',
        closureEvidenceRef: 'proof://retro/H23/060',
        updatedAt: '2026-03-13T09:50:00.000Z'
      }
    ]
  };
}

function runScenario(scenario) {
  if (scenario === 'success') {
    return buildAqcdBaselineRoiInstrumentation(buildPayload(), {
      nowMs: Date.parse('2026-03-13T12:00:00.000Z')
    });
  }

  if (scenario === 'missing-source') {
    const payload = buildPayload();
    delete payload.metricSources.autonomy.A1;

    return buildAqcdBaselineRoiInstrumentation(payload, {
      nowMs: Date.parse('2026-03-13T12:00:00.000Z')
    });
  }

  if (scenario === 'snapshot-short') {
    const payload = buildPayload();
    payload.snapshots = payload.snapshots.slice(1);

    return buildAqcdBaselineRoiInstrumentation(payload, {
      nowMs: Date.parse('2026-03-13T12:00:00.000Z'),
      sponsorExecutiveRules: { minimumSnapshotCount: 2 },
      minimumSnapshotCount: 3
    });
  }

  if (scenario === 'latency-budget') {
    return buildAqcdBaselineRoiInstrumentation(buildPayload(), {
      nowMs: Date.parse('2026-03-13T12:00:00.000Z'),
      baselineRoiLatencySamplesMs: [1200, 2100, 2800, 3200, 3500],
      decisionLatencyBudgetMs: 2500
    });
  }

  return buildAqcdBaselineRoiInstrumentation('bad-input');
}

test('aqcd baseline roi demo covers empty/loading/error/success with visible TCD/ROI factors', async ({ page }) => {
  await page.exposeFunction('runBaselineRoiScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Calculer baseline ROI' });
  const stateIndicator = page.getByRole('status', { name: 'État baseline ROI' });

  const reasonCodeValue = page.locator('#reason-code-value');
  const summaryValue = page.locator('#summary-value');
  const roiValue = page.locator('#roi-value');
  const tcdValue = page.locator('#tcd-value');
  const factorsValue = page.locator('#factors-value');
  const errorMessage = page.getByRole('alert');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');

  await scenario.selectOption('invalid-input');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_AQCD_BASELINE_ROI_INPUT');

  await scenario.selectOption('snapshot-short');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('AQCD_BASELINE_ROI_SNAPSHOTS_REQUIRED');

  await scenario.selectOption('latency-budget');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('AQCD_BASELINE_ROI_LATENCY_BUDGET_EXCEEDED');

  await scenario.selectOption('success');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(summaryValue).toContainText('adjROI=');
  await expect(roiValue).toContainText('gain=');
  await expect(tcdValue).toContainText('improvement=');
  await expect(factorsValue).toContainText('SNAPSHOT_COMPARATIVE');
  await expect(factorsValue).toContainText('comparisonCount=');
  await expect(errorMessage).toBeHidden();
});

test('aqcd baseline roi demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
  page
}) => {
  await page.exposeFunction('runBaselineRoiScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  await page.getByLabel('Scénario').selectOption('success');
  await page.getByRole('button', { name: 'Calculer baseline ROI' }).click();
  await expect(page.getByRole('status', { name: 'État baseline ROI' })).toHaveAttribute('data-state', 'success');

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
        '#summary-value',
        '#roi-value',
        '#tcd-value',
        '#factors-value',
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
