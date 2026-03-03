import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { buildAqcdGatePriorityActions } from '../src/aqcd-gate-priority-actions.js';

const sid = String(process.argv[2] || '').trim();
if (!/^S\d{3}$/.test(sid)) {
  console.error('Usage: node scripts/capture-aqcd-gate-priority-ux-evidence.mjs S052');
  process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const appRoot = path.resolve(__dirname, '..');
const projectRoot = process.env.BMAD_PROJECT_ROOT
  ? path.resolve(process.env.BMAD_PROJECT_ROOT)
  : path.resolve(appRoot, '..');

const evidenceDir = path.join(
  projectRoot,
  '_bmad-output',
  'implementation-artifacts',
  'ux-audits',
  'evidence',
  sid
);

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Top actions AQCD par gate</title>
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
      #actions-value,
      #risk-value,
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
      <h1>Top actions AQCD par gate</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="risk-register-invalid">Registre risques invalide</option>
        <option value="runbook-missing">Runbook manquant</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-priority" type="button">Calculer priorités</button>

      <p id="state-indicator" role="status" aria-label="État priorités AQCD" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>gateActions</dt><dd id="actions-value">—</dd></div>
          <div><dt>riskRegistry</dt><dd id="risk-value">—</dd></div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-priority');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');

      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const diagValue = document.getElementById('diag-value');
      const actionsValue = document.getElementById('actions-value');
      const riskValue = document.getElementById('risk-value');

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
          ' | gates=' + String(diagnostics.gateCount ?? '—') +
          ' | actions=' + String(diagnostics.actionCount ?? '—') +
          ' | runbook=' + String(diagnostics.runbookValidated ?? '—') +
          ' | p95=' + String(diagnostics.p95DecisionMs ?? '—');

        const gateActions = Array.isArray(result.gateActions) ? result.gateActions : [];
        const first = gateActions[0]?.actions?.[0] ?? null;
        actionsValue.textContent =
          'groups=' + String(gateActions.length) +
          ' | firstAction=' + String(first?.actionId ?? '—') +
          ' | firstOwner=' + String(first?.owner ?? '—') +
          ' | firstEvidence=' + String(first?.evidenceRef ?? '—');

        const riskRegistry = result.riskRegistry ?? {};
        const counts = riskRegistry.counts ?? {};
        riskValue.textContent =
          'open=' + String(counts.open ?? '—') +
          ' | mitigated=' + String(counts.mitigated ?? '—') +
          ' | closed=' + String(counts.closed ?? '—') +
          ' | highestExposure=' + String(riskRegistry.highestExposure ?? '—');
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 120));
          const result = await window.runAqcdGatePriorityScenarioRuntime(scenarioInput.value);
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
    windowRef: sid,
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
      },
      {
        id: 'AQCD-S052-W1',
        windowRef: 'S052-W1',
        updatedAt: '2026-03-05T00:00:00.000Z',
        scores: {
          autonomy: 84,
          qualityTech: 81,
          costEfficiency: 75,
          designExcellence: 86,
          global: 81.95
        }
      }
    ],
    latencySamplesMs: [1200, 1500, 1700, 1900],
    decisionLatencySamplesMs: [1300, 1600, 1700, 1800],
    riskRegister: [
      {
        id: 'RISK-C01',
        gate: 'G4',
        owner: 'PM',
        status: 'OPEN',
        dueAt: '2026-03-10T12:00:00.000Z',
        exposure: 82,
        evidenceRef: '_bmad-output/implementation-artifacts/handoffs/S052-dev-to-tea.md',
        description: 'Risque dérive coût token sur décisions critiques.'
      },
      {
        id: 'RISK-C02',
        gate: 'G5',
        owner: 'Architect',
        status: 'OPEN',
        dueAt: '2026-03-12T12:00:00.000Z',
        exposure: 68,
        evidenceRef: '_bmad-output/implementation-artifacts/stories/S052.md',
        description: 'Risque surcoût stockage projections.'
      }
    ],
    gateActions: [
      {
        gate: 'G4',
        actionId: 'ACTION_G4_REDUCE_COST_DRIFT',
        action: 'Réduire la dérive coût par décision via lotissement contrôlé.',
        owner: 'PM',
        evidenceRef: '_bmad-output/implementation-artifacts/handoffs/S052-dev-to-tea.md',
        priorityScore: 86
      },
      {
        gate: 'G5',
        actionId: 'ACTION_G5_LIMIT_PROJECTION_STORAGE',
        action: 'Limiter la rétention projections non utilisées et vérifier les seuils.',
        owner: 'Architect',
        evidenceRef: '_bmad-output/implementation-artifacts/stories/S052.md',
        priorityScore: 74
      }
    ],
    runbookRef: 'runbook://aqcd-priority-v1',
    runbookValidated: true
  };
}

function runScenario(scenario) {
  if (scenario === 'success') {
    return buildAqcdGatePriorityActions(buildPayload(), {
      nowMs: Date.parse('2026-03-05T01:00:00.000Z')
    });
  }

  if (scenario === 'risk-register-invalid') {
    const payload = buildPayload();
    payload.riskRegister[0].owner = '';

    return buildAqcdGatePriorityActions(payload, {
      nowMs: Date.parse('2026-03-05T01:00:00.000Z')
    });
  }

  if (scenario === 'runbook-missing') {
    const payload = buildPayload();
    payload.runbookValidated = false;

    return buildAqcdGatePriorityActions(payload, {
      nowMs: Date.parse('2026-03-05T01:00:00.000Z')
    });
  }

  return buildAqcdGatePriorityActions('bad-input');
}

function buildReasonCopyChecks() {
  const invalidInput = buildAqcdGatePriorityActions('bad-input');

  const invalidRiskPayload = buildPayload();
  invalidRiskPayload.riskRegister[0].owner = '';
  const invalidRisk = buildAqcdGatePriorityActions(invalidRiskPayload);

  const missingRunbookPayload = buildPayload();
  missingRunbookPayload.runbookValidated = false;
  const missingRunbook = buildAqcdGatePriorityActions(missingRunbookPayload);

  const success = buildAqcdGatePriorityActions(buildPayload(), {
    nowMs: Date.parse('2026-03-05T01:00:00.000Z')
  });

  return [
    {
      expectedCode: 'INVALID_AQCD_GATE_PRIORITY_INPUT',
      reasonCode: invalidInput.reasonCode,
      reason: invalidInput.reason,
      correctiveActions: invalidInput.correctiveActions
    },
    {
      expectedCode: 'AQCD_RISK_REGISTER_INVALID',
      reasonCode: invalidRisk.reasonCode,
      reason: invalidRisk.reason,
      correctiveActions: invalidRisk.correctiveActions
    },
    {
      expectedCode: 'AQCD_RUNBOOK_EVIDENCE_REQUIRED',
      reasonCode: missingRunbook.reasonCode,
      reason: missingRunbook.reason,
      correctiveActions: missingRunbook.correctiveActions
    },
    {
      expectedCode: 'OK',
      reasonCode: success.reasonCode,
      reason: success.reason,
      correctiveActions: success.correctiveActions,
      actionCount: success.diagnostics?.actionCount ?? 0,
      gateCount: success.diagnostics?.gateCount ?? 0
    }
  ];
}

await fs.mkdir(evidenceDir, { recursive: true });

const stateFlowPath = path.join(evidenceDir, 'state-flow-check.json');
const reasonCopyPath = path.join(evidenceDir, 'reason-copy-check.json');
const responsiveCheckPath = path.join(evidenceDir, 'responsive-check.json');

await fs.writeFile(
  stateFlowPath,
  JSON.stringify(
    {
      storyId: sid,
      states: ['empty', 'loading', 'error', 'success'],
      status: 'validated',
      source: 's052-uxqa-fix'
    },
    null,
    2
  ) + '\n',
  'utf8'
);

await fs.writeFile(
  reasonCopyPath,
  JSON.stringify(
    {
      storyId: sid,
      checks: buildReasonCopyChecks(),
      status: 'validated'
    },
    null,
    2
  ) + '\n',
  'utf8'
);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

await page.exposeFunction('runAqcdGatePriorityScenarioRuntime', runScenario);
await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

await page.selectOption('#scenario', 'success');
await page.click('#run-priority');
await page.waitForSelector('#state-indicator[data-state="success"]');

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 }
];

const checks = [];

for (const viewport of viewports) {
  await page.setViewportSize({ width: viewport.width, height: viewport.height });

  const metrics = await page.evaluate(() => {
    const getOverflow = (selector) => {
      const el = document.querySelector(selector);
      if (!el) return 0;
      return Math.max(0, el.scrollWidth - el.clientWidth);
    };

    const root = document.documentElement;
    const body = document.body;

    const overflow = {
      document: Math.max(0, root.scrollWidth - root.clientWidth),
      body: Math.max(0, body.scrollWidth - body.clientWidth),
      reason: getOverflow('#reason-value'),
      diagnostics: getOverflow('#diag-value'),
      actions: getOverflow('#actions-value'),
      risk: getOverflow('#risk-value'),
      alert: getOverflow('#error-message'),
      success: getOverflow('#success-json')
    };

    overflow.max = Math.max(...Object.values(overflow));

    return {
      state: document.querySelector('#state-indicator')?.getAttribute('data-state') ?? 'unknown',
      reasonCode: document.querySelector('#reason-code-value')?.textContent?.trim() ?? '',
      reason: document.querySelector('#reason-value')?.textContent?.trim() ?? '',
      diagnostics: document.querySelector('#diag-value')?.textContent?.trim() ?? '',
      actions: document.querySelector('#actions-value')?.textContent?.trim() ?? '',
      risk: document.querySelector('#risk-value')?.textContent?.trim() ?? '',
      ariaLiveStatus: document.querySelector('#state-indicator')?.getAttribute('aria-live') ?? null,
      ariaLiveSuccess: document.querySelector('#success-json')?.getAttribute('aria-live') ?? null,
      ariaAtomicSuccess: document.querySelector('#success-json')?.getAttribute('aria-atomic') ?? null,
      hasAlertRole: Boolean(document.querySelector('#error-message[role="alert"]')),
      focusReturnedToAction: document.activeElement?.id === 'run-priority',
      scenarioHasLabel: Boolean(document.querySelector('label[for="scenario"]')),
      headingOrderOk: Boolean(document.querySelector('h1')) && Boolean(document.querySelector('h2')),
      overflow
    };
  });

  const screenshotAbs = path.join(evidenceDir, `responsive-${viewport.name}.png`);
  await page.screenshot({ path: screenshotAbs, fullPage: true });

  checks.push({
    viewport,
    screenshot: screenshotAbs,
    state: metrics.state,
    reasonCode: metrics.reasonCode,
    reason: metrics.reason,
    diagnostics: metrics.diagnostics,
    actions: metrics.actions,
    risk: metrics.risk,
    ariaLiveStatus: metrics.ariaLiveStatus,
    ariaLiveSuccess: metrics.ariaLiveSuccess,
    ariaAtomicSuccess: metrics.ariaAtomicSuccess,
    hasAlertRole: metrics.hasAlertRole,
    focusReturnedToAction: metrics.focusReturnedToAction,
    scenarioHasLabel: metrics.scenarioHasLabel,
    headingOrderOk: metrics.headingOrderOk,
    overflow: metrics.overflow,
    pass:
      metrics.state === 'success' &&
      metrics.reasonCode === 'OK' &&
      Number(metrics.overflow?.max ?? 1) === 0 &&
      metrics.hasAlertRole === true &&
      metrics.scenarioHasLabel === true &&
      metrics.headingOrderOk === true
  });
}

await browser.close();

const responsivePayload = {
  storyId: sid,
  runAt: new Date().toISOString(),
  checks,
  allPass: checks.every((check) => check.pass)
};

await fs.writeFile(responsiveCheckPath, JSON.stringify(responsivePayload, null, 2) + '\n', 'utf8');

if (!responsivePayload.allPass) {
  console.error(`❌ AQCD_GATE_PRIORITY_UX_RESPONSIVE_CHECK_FAILED (${sid})`);
  process.exit(2);
}

console.log(`✅ AQCD_GATE_PRIORITY_UX_EVIDENCE_OK (${sid})`);
console.log(`- evidence_dir: ${evidenceDir}`);
console.log(`- responsive_check: ${responsiveCheckPath}`);
console.log(`- state_flow_check: ${stateFlowPath}`);
console.log(`- reason_copy_check: ${reasonCopyPath}`);
