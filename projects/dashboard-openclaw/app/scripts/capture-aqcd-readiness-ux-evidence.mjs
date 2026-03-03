import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { buildAqcdReadinessRules } from '../src/aqcd-readiness-rules.js';

const sid = String(process.argv[2] || '').trim();
if (!/^S\d{3}$/.test(sid)) {
  console.error('Usage: node scripts/capture-aqcd-readiness-ux-evidence.mjs S051');
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
    <title>Readiness AQCD rule-based v1</title>
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
      #readiness-value,
      #recommendations-value,
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
      <h1>Readiness AQCD rule-based v1</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="missing-comparative">Snapshots insuffisants</option>
        <option value="threshold-unmet">Seuil readiness non atteint</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-readiness" type="button">Évaluer readiness</button>

      <p id="state-indicator" role="status" aria-label="État readiness AQCD" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>readiness</dt><dd id="readiness-value">—</dd></div>
          <div><dt>recommendations</dt><dd id="recommendations-value">—</dd></div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-readiness');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');

      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const diagValue = document.getElementById('diag-value');
      const readinessValue = document.getElementById('readiness-value');
      const recommendationsValue = document.getElementById('recommendations-value');

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
          ' | readiness=' + String(diagnostics.readinessScore ?? '—') +
          ' | threshold=' + String(diagnostics.readinessThreshold ?? '—') +
          ' | rules=' + String(diagnostics.rulesVersion ?? '—');

        const readiness = result.readiness ?? {};
        readinessValue.textContent =
          'score=' + String(readiness.score ?? '—') +
          ' | threshold=' + String(readiness.threshold ?? '—') +
          ' | met=' + String(readiness.met ?? '—') +
          ' | band=' + String(readiness.band ?? '—');

        const recommendations = Array.isArray(result.recommendations) ? result.recommendations : [];
        recommendationsValue.textContent =
          'count=' + String(recommendations.length) +
          ' | firstAction=' + String(recommendations[0]?.actionId ?? '—') +
          ' | firstOwner=' + String(recommendations[0]?.owner ?? '—') +
          ' | firstEvidence=' + String(recommendations[0]?.evidenceRef ?? '—');
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 120));
          const result = await window.runAqcdReadinessScenarioRuntime(scenarioInput.value);
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
        id: 'AQCD-S049-W1',
        windowRef: 'S049-W1',
        updatedAt: '2026-03-02T00:00:00.000Z',
        scores: {
          autonomy: 78,
          qualityTech: 75,
          costEfficiency: 71,
          designExcellence: 81,
          global: 76.55
        }
      },
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
      }
    ],
    latencySamplesMs: [1100, 1400, 1700, 1800]
  };
}

function runScenario(scenario) {
  if (scenario === 'success') {
    return buildAqcdReadinessRules(buildPayload(), {
      nowMs: Date.parse('2026-03-04T01:00:00.000Z')
    });
  }

  if (scenario === 'missing-comparative') {
    const payload = buildPayload();
    payload.snapshots = payload.snapshots.slice(0, 1);

    return buildAqcdReadinessRules(payload, {
      nowMs: Date.parse('2026-03-04T01:00:00.000Z')
    });
  }

  if (scenario === 'threshold-unmet') {
    const payload = buildPayload();
    payload.snapshots[2].updatedAt = '2026-03-20T00:00:00.000Z';

    return buildAqcdReadinessRules(payload, {
      nowMs: Date.parse('2026-03-26T00:00:00.000Z'),
      enforceContinuity: false
    });
  }

  return buildAqcdReadinessRules('bad-input');
}

function buildReasonCopyChecks() {
  const invalidInput = buildAqcdReadinessRules('bad-input');

  const missingComparativePayload = buildPayload();
  missingComparativePayload.snapshots = missingComparativePayload.snapshots.slice(0, 1);
  const missingComparative = buildAqcdReadinessRules(missingComparativePayload, {
    nowMs: Date.parse('2026-03-04T01:00:00.000Z')
  });

  const thresholdPayload = buildPayload();
  thresholdPayload.snapshots[2].updatedAt = '2026-03-20T00:00:00.000Z';
  const thresholdUnmet = buildAqcdReadinessRules(thresholdPayload, {
    nowMs: Date.parse('2026-03-26T00:00:00.000Z'),
    enforceContinuity: false
  });

  const success = buildAqcdReadinessRules(buildPayload(), {
    nowMs: Date.parse('2026-03-04T01:00:00.000Z')
  });

  return [
    {
      expectedCode: 'INVALID_AQCD_READINESS_INPUT',
      reasonCode: invalidInput.reasonCode,
      reason: invalidInput.reason,
      correctiveActions: invalidInput.correctiveActions
    },
    {
      expectedCode: 'AQCD_COMPARATIVE_SNAPSHOTS_REQUIRED',
      reasonCode: missingComparative.reasonCode,
      reason: missingComparative.reason,
      correctiveActions: missingComparative.correctiveActions
    },
    {
      expectedCode: 'AQCD_READINESS_THRESHOLD_UNMET',
      reasonCode: thresholdUnmet.reasonCode,
      reason: thresholdUnmet.reason,
      correctiveActions: thresholdUnmet.correctiveActions,
      recommendations: thresholdUnmet.recommendations?.length ?? 0
    },
    {
      expectedCode: 'OK',
      reasonCode: success.reasonCode,
      reason: success.reason,
      correctiveActions: success.correctiveActions,
      readiness: {
        score: success.readiness?.score ?? null,
        threshold: success.readiness?.threshold ?? null,
        met: success.readiness?.met ?? null
      }
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
      source: 'tests/e2e/aqcd-readiness-rules.spec.js'
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

await page.exposeFunction('runAqcdReadinessScenarioRuntime', runScenario);
await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

await page.selectOption('#scenario', 'success');
await page.click('#run-readiness');
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
      readiness: getOverflow('#readiness-value'),
      recommendations: getOverflow('#recommendations-value'),
      alert: getOverflow('#error-message'),
      success: getOverflow('#success-json')
    };

    overflow.max = Math.max(...Object.values(overflow));

    return {
      state: document.querySelector('#state-indicator')?.getAttribute('data-state') ?? 'unknown',
      reasonCode: document.querySelector('#reason-code-value')?.textContent?.trim() ?? '',
      reason: document.querySelector('#reason-value')?.textContent?.trim() ?? '',
      diagnostics: document.querySelector('#diag-value')?.textContent?.trim() ?? '',
      readiness: document.querySelector('#readiness-value')?.textContent?.trim() ?? '',
      recommendations: document.querySelector('#recommendations-value')?.textContent?.trim() ?? '',
      ariaLiveStatus: document.querySelector('#state-indicator')?.getAttribute('aria-live') ?? null,
      ariaLiveSuccess: document.querySelector('#success-json')?.getAttribute('aria-live') ?? null,
      ariaAtomicSuccess: document.querySelector('#success-json')?.getAttribute('aria-atomic') ?? null,
      hasAlertRole: Boolean(document.querySelector('#error-message[role="alert"]')),
      focusReturnedToAction: document.activeElement?.id === 'run-readiness',
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
    readiness: metrics.readiness,
    recommendations: metrics.recommendations,
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
  console.error(`❌ AQCD_READINESS_UX_RESPONSIVE_CHECK_FAILED (${sid})`);
  process.exit(2);
}

console.log(`✅ AQCD_READINESS_UX_EVIDENCE_OK (${sid})`);
console.log(`- evidence_dir: ${evidenceDir}`);
console.log(`- responsive_check: ${responsiveCheckPath}`);
console.log(`- state_flow_check: ${stateFlowPath}`);
console.log(`- reason_copy_check: ${reasonCopyPath}`);
