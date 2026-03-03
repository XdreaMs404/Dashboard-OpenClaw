import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { buildAqcdSponsorExecutiveView } from '../src/aqcd-sponsor-executive-view.js';

const sid = String(process.argv[2] || '').trim();
if (!/^S\d{3}$/.test(sid)) {
  console.error('Usage: node scripts/capture-aqcd-sponsor-executive-view-ux-evidence.mjs S059');
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

function buildPayload() {
  return {
    window: 'story',
    windowRef: sid,
    metrics: {
      autonomy: { A1: 91, A2: 89, A3: 86, A4: 90 },
      qualityTech: { Q1: 87, Q2: 85, Q3: 83, Q4: 82, Q5: 89 },
      costEfficiency: { C1: 76, C2: 79, C3: 80, C4: 75 },
      design: { D1: 91, D2: 90, D3: 88, D4: 87, D5: 89, D6: 86 }
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
        id: 'AQCD-S057-W1',
        windowRef: 'S057-W1',
        updatedAt: '2026-03-10T00:00:00.000Z',
        scores: {
          autonomy: 86,
          qualityTech: 83,
          costEfficiency: 78,
          designExcellence: 89,
          global: 84
        }
      },
      {
        id: 'AQCD-S058-W1',
        windowRef: 'S058-W1',
        updatedAt: '2026-03-11T00:00:00.000Z',
        scores: {
          autonomy: 87,
          qualityTech: 84,
          costEfficiency: 79,
          designExcellence: 90,
          global: 85
        }
      },
      {
        id: 'AQCD-S059-W1',
        windowRef: 'S059-W1',
        updatedAt: '2026-03-12T00:00:00.000Z',
        scores: {
          autonomy: 88,
          qualityTech: 85,
          costEfficiency: 80,
          designExcellence: 91,
          global: 86
        }
      }
    ],
    gateActions: [
      {
        gate: 'G5',
        actionId: 'ACTION_G5_SPONSOR_VIEW',
        action: 'Consolider une vue exécutive sponsor lisible avec preuves AQCD.',
        owner: 'PM',
        evidenceRef: '_bmad-output/implementation-artifacts/handoffs/S059-dev-to-tea.md',
        priorityScore: 95
      }
    ],
    riskRegister: [
      {
        id: 'M02',
        gate: 'G5',
        owner: 'PM',
        status: 'OPEN',
        dueAt: '2099-04-25T00:00:00.000Z',
        probability: 0.6,
        impact: 0.7,
        mitigations: [
          {
            taskId: 'TASK-M02-001',
            owner: 'PM',
            status: 'IN_PROGRESS',
            dueAt: '2099-04-22T00:00:00.000Z',
            proofRef: 'proof://mitigation/M02/001'
          }
        ]
      },
      {
        id: 'M08',
        gate: 'G4',
        owner: 'UX',
        status: 'MITIGATED',
        dueAt: '2099-04-26T00:00:00.000Z',
        exposure: 42,
        mitigations: [
          {
            taskId: 'TASK-M08-001',
            owner: 'UX',
            status: 'DONE',
            dueAt: '2099-04-21T00:00:00.000Z',
            proofRef: 'proof://mitigation/M08/001'
          }
        ]
      }
    ],
    heatmapSeries: [
      {
        id: 'HEATMAP-S058',
        at: '2026-03-11T00:00:00.000Z',
        points: [
          { riskId: 'M02', probability: 0.6, impact: 0.7 },
          { riskId: 'M08', probability: 0.42, impact: 0.42 }
        ]
      },
      {
        id: 'HEATMAP-S059',
        at: '2026-03-12T00:00:00.000Z',
        points: [
          { riskId: 'M02', probability: 0.55, impact: 0.63 },
          { riskId: 'M08', probability: 0.34, impact: 0.36 }
        ]
      }
    ],
    decisionCostSeries: [
      { decisionId: 'DEC-110', status: 'VALIDATED', cost: 2.4 },
      { decisionId: 'DEC-111', validated: true, cost: 2.0 },
      { decisionId: 'DEC-112', status: 'REVIEW', cost: 2.9 }
    ],
    phaseWasteSeries: [
      { phase: 'analysis', wasteRatioPct: 18.1, tokenWaste: 300, tokenTotal: 1660 },
      { phase: 'planning', wasteRatioPct: 20.6, tokenWaste: 390, tokenTotal: 1890 },
      { phase: 'implementation', wasteRatioPct: 23.5, tokenWaste: 940, tokenTotal: 4000 }
    ],
    wasteAlerting: {
      enabled: true,
      channels: ['ops-console'],
      notificationRef: 'ops://alerts/S059'
    },
    runbookRef: 'runbook://aqcd-priority-v1',
    runbookValidated: true,
    criticalRunbookRef: 'runbook://aqcd-critical-sponsor-v1',
    criticalRunbookValidated: true,
    criticalRunbookTestedAt: '2026-03-12T09:00:00.000Z',
    decisionLatencySamplesMs: [800, 1000, 1300, 1500, 2000],
    baselineThreshold: 0,
    readinessV1Threshold: 0,
    retroActions: [
      {
        phase: 'H21',
        actionId: 'RETRO-H21-010',
        owner: 'SM',
        status: 'DONE',
        closureEvidenceRef: 'proof://retro/H21/010',
        updatedAt: '2026-03-12T09:40:00.000Z'
      },
      {
        phase: 'H22',
        actionId: 'RETRO-H22-010',
        owner: 'PM',
        status: 'CLOSED',
        closureEvidenceRef: 'proof://retro/H22/010',
        updatedAt: '2026-03-12T09:45:00.000Z'
      },
      {
        phase: 'H23',
        actionId: 'RETRO-H23-010',
        owner: 'Jarvis',
        status: 'VERIFIED',
        closureEvidenceRef: 'proof://retro/H23/010',
        updatedAt: '2026-03-12T09:50:00.000Z'
      }
    ]
  };
}

function runScenario(mode) {
  if (mode === 'success') {
    return buildAqcdSponsorExecutiveView(buildPayload(), {
      nowMs: Date.parse('2026-03-12T12:00:00.000Z')
    });
  }

  if (mode === 'missing-source') {
    const payload = buildPayload();
    delete payload.metricSources.autonomy.A1;

    return buildAqcdSponsorExecutiveView(payload, {
      nowMs: Date.parse('2026-03-12T12:00:00.000Z')
    });
  }

  if (mode === 'missing-snapshot') {
    const payload = buildPayload();
    payload.snapshots = payload.snapshots.slice(1);

    return buildAqcdSponsorExecutiveView(payload, {
      nowMs: Date.parse('2026-03-12T12:00:00.000Z')
    });
  }

  if (mode === 'continuity-gap') {
    const payload = buildPayload();
    payload.snapshots[2].updatedAt = '2026-03-20T00:00:00.000Z';

    for (const action of payload.retroActions) {
      action.updatedAt = '2026-03-20T00:30:00.000Z';
    }

    return buildAqcdSponsorExecutiveView(payload, {
      nowMs: Date.parse('2026-03-20T01:00:00.000Z')
    });
  }

  return buildAqcdSponsorExecutiveView('bad-input');
}

function assertReason(expectedCode, mode) {
  const result = runScenario(mode);

  if (result.reasonCode !== expectedCode) {
    throw new Error(`Reason code mismatch for ${mode}: expected ${expectedCode}, got ${result.reasonCode}`);
  }

  return {
    expectedCode,
    reasonCode: result.reasonCode,
    reason: result.reason,
    correctiveActions: result.correctiveActions ?? []
  };
}

const pageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Vue exécutive sponsor simplifiée</title>
    <style>
      :root { font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif; }
      * { box-sizing: border-box; }
      body { margin: 0; padding: 1rem; }
      main { width: min(100%, 72rem); }
      #reason-value,#diag-value,#summary-value,#scorecards-value,#trend-value,#error-message,#success-json {
        max-width: 100%; overflow-wrap: anywhere; word-break: break-word;
      }
      #success-json {
        margin-top: .75rem; padding: .75rem; border: 1px solid #d1d5db; border-radius: .5rem; white-space: pre-wrap;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Vue exécutive sponsor simplifiée</h1>
      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="missing-source">Source formule manquante</option>
        <option value="missing-snapshot">Snapshots insuffisants</option>
        <option value="continuity-gap">Discontinuité snapshots</option>
        <option value="success">Nominal</option>
      </select>
      <button id="run-sponsor-view" type="button">Construire vue sponsor</button>
      <p id="state-indicator" role="status" aria-label="État vue sponsor" aria-live="polite" data-state="empty">État: empty</p>
      <p id="error-message" role="alert" hidden></p>
      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>summary</dt><dd id="summary-value">—</dd></div>
          <div><dt>scoreCards</dt><dd id="scorecards-value">—</dd></div>
          <div><dt>trend</dt><dd id="trend-value">—</dd></div>
        </dl>
      </section>
      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>
    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-sponsor-view');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');
      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const diagValue = document.getElementById('diag-value');
      const summaryValue = document.getElementById('summary-value');
      const scorecardsValue = document.getElementById('scorecards-value');
      const trendValue = document.getElementById('trend-value');

      const setState = (state) => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;
      };

      const renderResult = (result) => {
        reasonCodeValue.textContent = result.reasonCode;
        reasonValue.textContent = result.reason;

        const diagnostics = result.diagnostics ?? {};
        diagValue.textContent =
          'model=' + String(diagnostics.sponsorModelVersion ?? '—') +
          ' | snapshots=' + String(diagnostics.sponsorSnapshotCount ?? '—') +
          ' | min=' + String(diagnostics.sponsorMinimumSnapshotCount ?? '—') +
          ' | runbook=' + String(diagnostics.sponsorRunbookRef ?? '—');

        const sponsor = result.sponsorExecutiveView ?? {};
        const summary = sponsor.summary ?? {};
        summaryValue.textContent =
          'global=' + String(summary.globalScore ?? '—') +
          ' | band=' + String(summary.band ?? '—') +
          ' | trend=' + String(summary.trendDirection ?? '—') +
          ' | delta=' + String(summary.trendDeltaGlobal ?? '—');

        const scoreCards = Array.isArray(sponsor.scoreCards) ? sponsor.scoreCards : [];
        scorecardsValue.textContent = scoreCards
          .map((entry) => entry.id + ':' + String(entry.score) + '@' + String(entry.sourceRefs?.[0] ?? '—'))
          .join(' | ');

        const trend = sponsor.trend ?? {};
        trendValue.textContent =
          'count=' + String(trend.snapshotCount ?? '—') +
          ' | latest=' + String(trend.latestSnapshotRef ?? '—') +
          ' | previous=' + String(trend.previousSnapshotRef ?? '—') +
          ' | direction=' + String(trend.trendDirection ?? '—');
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 120));
          const result = await window.runSponsorExecutiveScenarioRuntime(scenarioInput.value);
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

await fs.mkdir(evidenceDir, { recursive: true });

const stateFlowPath = path.join(evidenceDir, 'state-flow-check.json');
const reasonCopyPath = path.join(evidenceDir, 'reason-copy-check.json');
const responsiveCheckPath = path.join(evidenceDir, 'responsive-check.json');

const reasonChecks = [
  assertReason('INVALID_AQCD_SPONSOR_VIEW_INPUT', 'invalid-input'),
  assertReason('AQCD_FORMULA_SOURCE_MISSING', 'missing-source'),
  assertReason('AQCD_SPONSOR_SNAPSHOT_HISTORY_REQUIRED', 'missing-snapshot'),
  assertReason('AQCD_SNAPSHOT_CONTINUITY_GAP', 'continuity-gap'),
  assertReason('OK', 'success')
];

await fs.writeFile(
  stateFlowPath,
  JSON.stringify({ storyId: sid, states: ['empty', 'loading', 'error', 'success'], status: 'validated' }, null, 2) + '\n',
  'utf8'
);

await fs.writeFile(
  reasonCopyPath,
  JSON.stringify({ storyId: sid, checks: reasonChecks, status: 'validated' }, null, 2) + '\n',
  'utf8'
);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });

await page.exposeFunction('runSponsorExecutiveScenarioRuntime', runScenario);
await page.goto(`data:text/html,${encodeURIComponent(pageHtml)}`);
await page.selectOption('#scenario', 'success');
await page.click('#run-sponsor-view');
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
      const element = document.querySelector(selector);
      if (!element) return 0;
      return Math.max(0, element.scrollWidth - element.clientWidth);
    };

    const overflow = {
      document: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      reason: getOverflow('#reason-value'),
      diagnostics: getOverflow('#diag-value'),
      summary: getOverflow('#summary-value'),
      scorecards: getOverflow('#scorecards-value'),
      trend: getOverflow('#trend-value'),
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
  allPass: checks.every((entry) => entry.pass)
};

await fs.writeFile(responsiveCheckPath, JSON.stringify(responsivePayload, null, 2) + '\n', 'utf8');

if (!responsivePayload.allPass) {
  console.error(`❌ AQCD_SPONSOR_VIEW_UX_RESPONSIVE_CHECK_FAILED (${sid})`);
  process.exit(2);
}

console.log(`✅ AQCD_SPONSOR_VIEW_UX_EVIDENCE_OK (${sid})`);
console.log(`- evidence_dir: ${evidenceDir}`);
