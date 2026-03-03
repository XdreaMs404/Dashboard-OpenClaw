import { expect, test } from '@playwright/test';
import { buildAqcdRetroClosureTracking } from '../../src/aqcd-retro-closure-tracker.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Suivi rétro H21/H22/H23</title>
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
      #closure-value,
      #phase-value,
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
      <h1>Suivi rétro H21/H22/H23</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="missing-phase">Phase manquante</option>
        <option value="pending-closure">Clôture en attente</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-retro-closure" type="button">Calculer suivi rétro</button>

      <p id="state-indicator" role="status" aria-label="État suivi rétro" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>retroClosureTracking</dt><dd id="closure-value">—</dd></div>
          <div><dt>phaseSummaries</dt><dd id="phase-value">—</dd></div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-retro-closure');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');

      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const diagValue = document.getElementById('diag-value');
      const closureValue = document.getElementById('closure-value');
      const phaseValue = document.getElementById('phase-value');

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
          ' | closureRate=' + String(diagnostics.retroClosureRatePct ?? '—') +
          ' | continuous=' + String(diagnostics.retroMetricsContinuous ?? '—');

        const tracking = result.retroClosureTracking ?? {};
        closureValue.textContent =
          'verified=' + String(tracking.verifiedClosure ?? '—') +
          ' | total=' + String(tracking.totalActions ?? '—') +
          ' | pending=' + String(tracking.pendingActions ?? '—');

        const phaseSummaries = Array.isArray(tracking.phaseSummaries) ? tracking.phaseSummaries : [];
        phaseValue.textContent = phaseSummaries
          .map((entry) => entry.phase + ':' + entry.closedActions + '/' + entry.totalActions)
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
          const result = await window.runRetroClosureScenarioRuntime(scenarioInput.value);
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
    windowRef: 'S058',
    metrics: {
      autonomy: { A1: 90, A2: 88, A3: 85, A4: 89 },
      qualityTech: { Q1: 86, Q2: 84, Q3: 82, Q4: 80, Q5: 88 },
      costEfficiency: { C1: 74, C2: 77, C3: 79, C4: 73 },
      design: { D1: 90, D2: 89, D3: 87, D4: 86, D5: 88, D6: 85 }
    },
    metricSources: {
      autonomy: { A1: 's://A1', A2: 's://A2', A3: 's://A3', A4: 's://A4' },
      qualityTech: { Q1: 's://Q1', Q2: 's://Q2', Q3: 's://Q3', Q4: 's://Q4', Q5: 's://Q5' },
      costEfficiency: { C1: 's://C1', C2: 's://C2', C3: 's://C3', C4: 's://C4' },
      design: { D1: 's://D1', D2: 's://D2', D3: 's://D3', D4: 's://D4', D5: 's://D5', D6: 's://D6' }
    },
    snapshots: [
      {
        id: 'AQCD-S057-W1',
        windowRef: 'S057-W1',
        updatedAt: '2026-03-10T00:00:00.000Z',
        scores: { autonomy: 86, qualityTech: 83, costEfficiency: 78, designExcellence: 89, global: 84 }
      },
      {
        id: 'AQCD-S058-W1',
        windowRef: 'S058-W1',
        updatedAt: '2026-03-11T00:00:00.000Z',
        scores: { autonomy: 87, qualityTech: 84, costEfficiency: 79, designExcellence: 90, global: 85 }
      }
    ],
    gateActions: [
      {
        gate: 'G5',
        actionId: 'ACTION_G5_RETRO_TRACKING',
        action: 'Suivre fermeture H21/H22/H23 avec preuves vérifiées.',
        owner: 'PM',
        evidenceRef: 'proof://handoff/S058',
        priorityScore: 95
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
          { taskId: 'TASK-P05-001', owner: 'SM', status: 'IN_PROGRESS', dueAt: '2099-04-12T00:00:00.000Z', proofRef: 'proof://mitigation/P05/001' }
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
          { taskId: 'TASK-C01-001', owner: 'FinOps', status: 'DONE', dueAt: '2099-04-10T00:00:00.000Z', proofRef: 'proof://mitigation/C01/001' }
        ]
      }
    ],
    heatmapSeries: [
      {
        id: 'HEATMAP-S057',
        at: '2026-03-10T00:00:00.000Z',
        points: [
          { riskId: 'P05', probability: 0.62, impact: 0.71 },
          { riskId: 'C01', probability: 0.48, impact: 0.44 }
        ]
      },
      {
        id: 'HEATMAP-S058',
        at: '2026-03-11T00:00:00.000Z',
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
      notificationRef: 'ops://alerts/S058'
    },
    runbookRef: 'runbook://aqcd-priority-v1',
    runbookValidated: true,
    criticalRunbookRef: 'runbook://aqcd-cost-critical-v1',
    criticalRunbookValidated: true,
    criticalRunbookTestedAt: '2026-03-11T09:00:00.000Z',
    decisionLatencySamplesMs: [900, 1100, 1400, 1800, 2100],
    readinessV1Threshold: 0,
    baselineThreshold: 0,
    retroActions: [
      {
        phase: 'H21',
        actionId: 'RETRO-H21-001',
        owner: 'SM',
        status: 'DONE',
        closureEvidenceRef: 'proof://retro/H21/001',
        updatedAt: '2026-03-11T09:46:00.000Z'
      },
      {
        phase: 'H22',
        actionId: 'RETRO-H22-001',
        owner: 'PM',
        status: 'CLOSED',
        closureEvidenceRef: 'proof://retro/H22/001',
        updatedAt: '2026-03-11T09:51:00.000Z'
      },
      {
        phase: 'H23',
        actionId: 'RETRO-H23-001',
        owner: 'Jarvis',
        status: 'VERIFIED',
        closureEvidenceRef: 'proof://retro/H23/001',
        updatedAt: '2026-03-11T09:56:00.000Z'
      }
    ]
  };
}

function runScenario(scenario) {
  if (scenario === 'success') {
    return buildAqcdRetroClosureTracking(buildPayload(), {
      nowMs: Date.parse('2026-03-11T12:00:00.000Z')
    });
  }

  if (scenario === 'missing-phase') {
    const payload = buildPayload();
    payload.retroActions = payload.retroActions.filter((entry) => entry.phase !== 'H23');

    return buildAqcdRetroClosureTracking(payload, {
      nowMs: Date.parse('2026-03-11T12:00:00.000Z')
    });
  }

  if (scenario === 'pending-closure') {
    const payload = buildPayload();
    payload.retroActions[1].status = 'IN_PROGRESS';

    return buildAqcdRetroClosureTracking(payload, {
      nowMs: Date.parse('2026-03-11T12:00:00.000Z')
    });
  }

  return buildAqcdRetroClosureTracking('bad-input');
}

test('aqcd retro closure demo covers empty/loading/error/success with H21/H22/H23 tracking', async ({ page }) => {
  await page.exposeFunction('runRetroClosureScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  const scenario = page.locator('#scenario');
  const runButton = page.locator('#run-retro-closure');
  const stateIndicator = page.locator('#state-indicator');
  const reasonCodeValue = page.locator('#reason-code-value');
  const closureValue = page.locator('#closure-value');
  const errorMessage = page.locator('#error-message');
  const successJson = page.locator('#success-json');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');

  await scenario.selectOption('invalid-input');
  await runButton.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_AQCD_RETRO_CLOSURE_INPUT');

  await scenario.selectOption('missing-phase');
  await runButton.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('AQCD_RETRO_PHASE_MISSING');

  await scenario.selectOption('pending-closure');
  await runButton.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('AQCD_RETRO_CLOSURE_PENDING');
  await expect(errorMessage).toContainText('AQCD_RETRO_CLOSURE_PENDING');

  await scenario.selectOption('success');
  await runButton.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(closureValue).toContainText('verified=true');
  await expect(successJson).toContainText('retroClosureTracking');
});

test('aqcd retro closure demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({ page }) => {
  await page.exposeFunction('runRetroClosureScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  await page.selectOption('#scenario', 'success');
  await page.click('#run-retro-closure');
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
        '#closure-value',
        '#phase-value',
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
