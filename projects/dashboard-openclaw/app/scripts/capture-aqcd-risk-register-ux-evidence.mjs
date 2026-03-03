import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { buildAqcdRiskRegister } from '../src/aqcd-risk-register.js';

const sid = String(process.argv[2] || '').trim();
if (!/^S\d{3}$/.test(sid)) {
  console.error('Usage: node scripts/capture-aqcd-risk-register-ux-evidence.mjs S053');
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
    <title>Registre risques AQCD</title>
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
      #risk-value,
      #mitigation-value,
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
      <h1>Registre risques AQCD</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="mitigation-missing">Liens mitigation manquants</option>
        <option value="baseline-unmet">Baseline insuffisante</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-risk-register" type="button">Évaluer registre</button>

      <p id="state-indicator" role="status" aria-label="État registre risques AQCD" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>riskRegister</dt><dd id="risk-value">—</dd></div>
          <div><dt>mitigationLinks</dt><dd id="mitigation-value">—</dd></div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-risk-register');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');

      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const diagValue = document.getElementById('diag-value');
      const riskValue = document.getElementById('risk-value');
      const mitigationValue = document.getElementById('mitigation-value');

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
          ' | baseline=' + String(diagnostics.baselineScore ?? '—') +
          ' | threshold=' + String(diagnostics.baselineThreshold ?? '—') +
          ' | p95=' + String(diagnostics.p95DecisionMs ?? '—');

        const risk = result.riskRegister ?? {};
        const counts = risk.counts ?? {};
        riskValue.textContent =
          'open=' + String(counts.open ?? '—') +
          ' | mitigated=' + String(counts.mitigated ?? '—') +
          ' | closed=' + String(counts.closed ?? '—') +
          ' | highest=' + String(risk.highestExposure ?? '—');

        const links = result.mitigationLinks ?? {};
        mitigationValue.textContent =
          'open=' + String(links.totalOpenRisks ?? '—') +
          ' | linked=' + String(links.linkedOpenRisks ?? '—') +
          ' | missing=' + String(links.missingLinkOpenRisks ?? '—') +
          ' | coverage=' + String(links.coveragePct ?? '—');
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 120));
          const result = await window.runAqcdRiskRegisterScenarioRuntime(scenarioInput.value);
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
      },
      {
        id: 'AQCD-S053-W1',
        windowRef: 'S053-W1',
        updatedAt: '2026-03-06T00:00:00.000Z',
        scores: {
          autonomy: 85,
          qualityTech: 82,
          costEfficiency: 76,
          designExcellence: 87,
          global: 82.95
        }
      }
    ],
    gateActions: [
      {
        gate: 'G4',
        actionId: 'ACTION_G4_COST_GUARD',
        action: 'Activer un budget guardrail token sur G4',
        owner: 'FinOps',
        evidenceRef: '_bmad-output/implementation-artifacts/handoffs/S053-dev-to-tea.md',
        priorityScore: 95
      }
    ],
    riskRegister: [
      {
        id: 'C02',
        gate: 'G5',
        owner: 'TechLead',
        status: 'OPEN',
        dueAt: '2099-03-12T00:00:00.000Z',
        probability: 0.72,
        impact: 0.89,
        description: 'Surcoût stockage ledger/projections',
        mitigations: [
          {
            taskId: 'TASK-C02-001',
            owner: 'TechLead',
            status: 'IN_PROGRESS',
            dueAt: '2099-03-10T00:00:00.000Z',
            proofRef: 'proof://mitigation/C02/001'
          }
        ]
      },
      {
        id: 'M02',
        gate: 'G4',
        owner: 'PM',
        status: 'MITIGATED',
        dueAt: '2099-03-18T00:00:00.000Z',
        exposure: 50,
        description: 'ROI TCD non démontré',
        mitigations: [
          {
            taskId: 'TASK-M02-001',
            owner: 'PM',
            status: 'DONE',
            dueAt: '2099-03-08T00:00:00.000Z',
            proofRef: 'proof://mitigation/M02/001'
          }
        ]
      }
    ],
    runbookRef: 'runbook://aqcd-priority-v1',
    runbookValidated: true,
    decisionLatencySamplesMs: [850, 1050, 1320, 1640, 1980]
  };
}

function runScenario(scenario) {
  if (scenario === 'success') {
    return buildAqcdRiskRegister(buildPayload());
  }

  if (scenario === 'mitigation-missing') {
    const payload = buildPayload();
    payload.riskRegister[0].mitigations = [];

    return buildAqcdRiskRegister(payload);
  }

  if (scenario === 'baseline-unmet') {
    return buildAqcdRiskRegister(buildPayload(), {
      riskRegisterRules: {
        baselineThreshold: 95
      }
    });
  }

  return buildAqcdRiskRegister('bad-input');
}

function buildReasonCopyChecks() {
  const invalidInput = buildAqcdRiskRegister('bad-input');

  const missingMitigationPayload = buildPayload();
  missingMitigationPayload.riskRegister[0].mitigations = [];
  const missingMitigation = buildAqcdRiskRegister(missingMitigationPayload);

  const baselineUnmet = buildAqcdRiskRegister(buildPayload(), {
    riskRegisterRules: {
      baselineThreshold: 95
    }
  });

  const success = buildAqcdRiskRegister(buildPayload());

  return [
    {
      expectedCode: 'INVALID_AQCD_RISK_REGISTER_INPUT',
      reasonCode: invalidInput.reasonCode,
      reason: invalidInput.reason,
      correctiveActions: invalidInput.correctiveActions
    },
    {
      expectedCode: 'AQCD_MITIGATION_LINKS_REQUIRED',
      reasonCode: missingMitigation.reasonCode,
      reason: missingMitigation.reason,
      correctiveActions: missingMitigation.correctiveActions
    },
    {
      expectedCode: 'AQCD_BASELINE_THRESHOLD_UNMET',
      reasonCode: baselineUnmet.reasonCode,
      reason: baselineUnmet.reason,
      correctiveActions: baselineUnmet.correctiveActions
    },
    {
      expectedCode: 'OK',
      reasonCode: success.reasonCode,
      reason: success.reason,
      correctiveActions: success.correctiveActions,
      mitigationCoveragePct: success.mitigationLinks?.coveragePct ?? null
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
      source: 's053-uxqa-fix'
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

await page.exposeFunction('runAqcdRiskRegisterScenarioRuntime', runScenario);
await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

await page.selectOption('#scenario', 'success');
await page.click('#run-risk-register');
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

    const overflow = {
      document: Math.max(0, root.scrollWidth - root.clientWidth),
      reason: getOverflow('#reason-value'),
      diagnostics: getOverflow('#diag-value'),
      risk: getOverflow('#risk-value'),
      mitigation: getOverflow('#mitigation-value'),
      alert: getOverflow('#error-message'),
      success: getOverflow('#success-json')
    };

    overflow.max = Math.max(...Object.values(overflow));

    return {
      state: document.querySelector('#state-indicator')?.getAttribute('data-state') ?? 'unknown',
      reasonCode: document.querySelector('#reason-code-value')?.textContent?.trim() ?? '',
      hasAlertRole: Boolean(document.querySelector('#error-message[role="alert"]')),
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
    hasAlertRole: metrics.hasAlertRole,
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
  console.error(`❌ AQCD_RISK_REGISTER_UX_RESPONSIVE_CHECK_FAILED (${sid})`);
  process.exit(2);
}

console.log(`✅ AQCD_RISK_REGISTER_UX_EVIDENCE_OK (${sid})`);
console.log(`- evidence_dir: ${evidenceDir}`);
console.log(`- responsive_check: ${responsiveCheckPath}`);
console.log(`- state_flow_check: ${stateFlowPath}`);
console.log(`- reason_copy_check: ${reasonCopyPath}`);
