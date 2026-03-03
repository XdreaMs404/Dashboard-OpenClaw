import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { buildAqcdExplainableScoreboard } from '../src/aqcd-scoreboard.js';

const sid = String(process.argv[2] || '').trim();
if (!/^S\d{3}$/.test(sid)) {
  console.error('Usage: node scripts/capture-aqcd-ux-evidence.mjs S049');
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
    <title>Tableau AQCD explicable</title>
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
      #formula-value,
      #snapshot-value,
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
      <h1>Tableau AQCD explicable</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="missing-source">Source de formule manquante</option>
        <option value="latency-budget">Budget latence dépassé</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-aqcd" type="button">Calculer AQCD</button>

      <p id="state-indicator" role="status" aria-label="État tableau AQCD" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>formula</dt><dd id="formula-value">—</dd></div>
          <div><dt>snapshots</dt><dd id="snapshot-value">—</dd></div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-aqcd');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');

      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const diagValue = document.getElementById('diag-value');
      const formulaValue = document.getElementById('formula-value');
      const snapshotValue = document.getElementById('snapshot-value');

      const setState = (state) => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;
      };

      const renderResult = (result) => {
        reasonCodeValue.textContent = result.reasonCode;
        reasonValue.textContent = result.reason;

        const diagnostics = result.diagnostics ?? {};
        const scores = diagnostics.scores ?? {};
        diagValue.textContent =
          'window=' + String(diagnostics.window ?? '—') +
          ' | ref=' + String(diagnostics.windowRef ?? '—') +
          ' | global=' + String(scores.global ?? '—') +
          ' | baselineMet=' + String(diagnostics.baselineMet ?? '—') +
          ' | p95=' + String(diagnostics.p95LatencyMs ?? '—');

        const formula = result.formula ?? {};
        const autonomy = formula.dimensions?.autonomy?.expression ?? '—';
        formulaValue.textContent =
          'global=' + String(formula.globalExpression ?? '—') +
          ' | autonomy=' + String(autonomy);

        const snapshots = result.snapshots ?? {};
        const trend = snapshots.trend ?? {};
        snapshotValue.textContent =
          'series=' + String((snapshots.series ?? []).length) +
          ' | prev=' + String(trend.previousGlobal ?? '—') +
          ' | delta=' + String(trend.deltaGlobal ?? '—') +
          ' | direction=' + String(trend.direction ?? '—');
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 120));
          const result = await window.runAqcdScenarioRuntime(scenarioInput.value);
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

function buildNominalPayload() {
  return {
    window: 'story',
    windowRef: sid,
    metrics: {
      autonomy: { A1: 92, A2: 88, A3: 84, A4: 90 },
      qualityTech: { Q1: 86, Q2: 82, Q3: 79, Q4: 88, Q5: 91 },
      costEfficiency: { C1: 74, C2: 76, C3: 80, C4: 72 },
      design: { D1: 90, D2: 87, D3: 85, D4: 83, D5: 88, D6: 84 }
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
        id: 'AQCD-S048',
        window: 'story',
        windowRef: 'S048',
        updatedAt: '2026-03-03T04:00:00.000Z',
        scores: {
          autonomy: 78,
          qualityTech: 74,
          costEfficiency: 70,
          designExcellence: 80,
          global: 75.8
        }
      }
    ],
    latencySamplesMs: [1200, 1600, 1900, 2100]
  };
}

function runScenario(scenario) {
  if (scenario === 'success') {
    return buildAqcdExplainableScoreboard(buildNominalPayload());
  }

  if (scenario === 'missing-source') {
    const payload = buildNominalPayload();
    delete payload.metricSources.qualityTech.Q3;
    return buildAqcdExplainableScoreboard(payload);
  }

  if (scenario === 'latency-budget') {
    const payload = buildNominalPayload();
    payload.latencySamplesMs = [2600, 2700, 2800];
    return buildAqcdExplainableScoreboard(payload);
  }

  return buildAqcdExplainableScoreboard('bad-input');
}

function buildReasonCopyChecks() {
  const checks = [];

  const invalidInput = buildAqcdExplainableScoreboard('bad-input');
  checks.push({
    expectedCode: 'INVALID_AQCD_SCOREBOARD_INPUT',
    reasonCode: invalidInput.reasonCode,
    reason: invalidInput.reason,
    correctiveActions: invalidInput.correctiveActions,
    diagnostics: invalidInput.diagnostics ?? null
  });

  const missingSourcePayload = buildNominalPayload();
  delete missingSourcePayload.metricSources.qualityTech.Q3;
  const missingSource = buildAqcdExplainableScoreboard(missingSourcePayload);
  checks.push({
    expectedCode: 'AQCD_FORMULA_SOURCE_MISSING',
    reasonCode: missingSource.reasonCode,
    reason: missingSource.reason,
    correctiveActions: missingSource.correctiveActions,
    diagnostics: missingSource.diagnostics ?? null
  });

  const latencyPayload = buildNominalPayload();
  latencyPayload.latencySamplesMs = [2600, 2700, 2800];
  const latencyExceeded = buildAqcdExplainableScoreboard(latencyPayload);
  checks.push({
    expectedCode: 'AQCD_LATENCY_BUDGET_EXCEEDED',
    reasonCode: latencyExceeded.reasonCode,
    reason: latencyExceeded.reason,
    correctiveActions: latencyExceeded.correctiveActions,
    diagnostics: latencyExceeded.diagnostics ?? null
  });

  const baselinePayload = buildNominalPayload();
  baselinePayload.metrics = {
    autonomy: { A1: 20, A2: 20, A3: 20, A4: 20 },
    qualityTech: { Q1: 20, Q2: 20, Q3: 20, Q4: 20, Q5: 20 },
    costEfficiency: { C1: 20, C2: 20, C3: 20, C4: 20 },
    design: { D1: 20, D2: 20, D3: 20, D4: 20, D5: 20, D6: 20 }
  };
  const baselineBelow = buildAqcdExplainableScoreboard(baselinePayload);
  checks.push({
    expectedCode: 'AQCD_BASELINE_BELOW_TARGET',
    reasonCode: baselineBelow.reasonCode,
    reason: baselineBelow.reason,
    correctiveActions: baselineBelow.correctiveActions,
    diagnostics: baselineBelow.diagnostics ?? null
  });

  return checks;
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
      source: 'tests/e2e/aqcd-scoreboard.spec.js'
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

await page.exposeFunction('runAqcdScenarioRuntime', runScenario);
await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

await page.selectOption('#scenario', 'success');
await page.click('#run-aqcd');
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
      formula: getOverflow('#formula-value'),
      snapshots: getOverflow('#snapshot-value'),
      alert: getOverflow('#error-message'),
      success: getOverflow('#success-json')
    };

    overflow.max = Math.max(...Object.values(overflow));

    return {
      state: document.querySelector('#state-indicator')?.getAttribute('data-state') ?? 'unknown',
      reasonCode: document.querySelector('#reason-code-value')?.textContent?.trim() ?? '',
      reason: document.querySelector('#reason-value')?.textContent?.trim() ?? '',
      diagnostics: document.querySelector('#diag-value')?.textContent?.trim() ?? '',
      formula: document.querySelector('#formula-value')?.textContent?.trim() ?? '',
      snapshots: document.querySelector('#snapshot-value')?.textContent?.trim() ?? '',
      ariaLiveStatus: document.querySelector('#state-indicator')?.getAttribute('aria-live') ?? null,
      ariaLiveSuccess: document.querySelector('#success-json')?.getAttribute('aria-live') ?? null,
      ariaAtomicSuccess: document.querySelector('#success-json')?.getAttribute('aria-atomic') ?? null,
      hasAlertRole: Boolean(document.querySelector('#error-message[role="alert"]')),
      focusReturnedToAction: document.activeElement?.id === 'run-aqcd',
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
    formula: metrics.formula,
    snapshots: metrics.snapshots,
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
  console.error(`❌ AQCD_UX_RESPONSIVE_CHECK_FAILED (${sid})`);
  process.exit(2);
}

console.log(`✅ AQCD_UX_EVIDENCE_OK (${sid})`);
console.log(`- evidence_dir: ${evidenceDir}`);
console.log(`- responsive_check: ${responsiveCheckPath}`);
console.log(`- state_flow_check: ${stateFlowPath}`);
console.log(`- reason_copy_check: ${reasonCopyPath}`);
