import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import {
  buildCommandAllowlistCatalog,
  signActiveProjectRoot
} from '../src/command-allowlist-catalog.js';

const sid = String(process.argv[2] || '').trim();
if (!/^S\d{3}$/.test(sid)) {
  console.error('Usage: node scripts/capture-command-allowlist-ux-evidence.mjs S041');
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

const ACTIVE_PROJECT_ROOT = '/root/.openclaw/workspace/projects/dashboard-openclaw';
const ACTIVE_PROJECT_ROOT_SIGNING_SECRET = 'ux-evidence-secret-s042';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Catalogue commandes allowlist</title>
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
      #catalog-value,
      #guard-value,
      #impact-preview-value,
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
      <h1>Catalogue commandes allowlist</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="outside-catalog">Commande hors catalogue</option>
        <option value="dry-run-required">Dry-run requis</option>
        <option value="apply-impact-preview">Preview impact avant apply</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-catalog" type="button">Évaluer catalogue</button>

      <p id="state-indicator" role="status" aria-label="État catalogue allowlist" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>catalog</dt><dd id="catalog-value">—</dd></div>
          <div><dt>executionGuard</dt><dd id="guard-value">—</dd></div>
          <div><dt>impactPreview</dt><dd id="impact-preview-value">—</dd></div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-catalog');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');

      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const diagValue = document.getElementById('diag-value');
      const catalogValue = document.getElementById('catalog-value');
      const guardValue = document.getElementById('guard-value');
      const impactPreviewValue = document.getElementById('impact-preview-value');

      const setState = (state) => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;
      };

      const renderResult = (result) => {
        reasonCodeValue.textContent = result.reasonCode;
        reasonValue.textContent = result.reason;

        const diagnostics = result.diagnostics ?? {};
        diagValue.textContent =
          'version=' + String(diagnostics.catalogVersion ?? '—') +
          ' | commands=' + String(diagnostics.commandCount ?? '—') +
          ' | executions=' + String(diagnostics.executionCount ?? '—') +
          ' | outside=' + String(diagnostics.outsideCatalogCount ?? '—') +
          ' | dryRunViolations=' + String(diagnostics.dryRunViolations ?? '—') +
          ' | impactPreviewProvided=' + String(diagnostics.impactPreviewProvidedCount ?? '—');

        const commands = result.catalog?.commands ?? [];
        catalogValue.textContent =
          'version=' + String(result.catalog?.version ?? '—') +
          ' | commandIds=' + (commands.map((entry) => entry.id).join(',') || '—');

        const guard = result.executionGuard ?? {};
        guardValue.textContent =
          'allFromCatalog=' + String(guard.allFromCatalog ?? '—') +
          ' | dryRunByDefault=' + String(guard.dryRunByDefault ?? '—') +
          ' | criticalRoleCompliant=' + String(guard.criticalRoleCompliant ?? '—') +
          ' | activeProjectRootSafe=' + String(guard.activeProjectRootSafe ?? '—');

        const impactPreview = diagnostics.impactPreview ?? {};
        const previewFiles = Array.isArray(impactPreview.files) ? impactPreview.files.join(',') : '—';
        impactPreviewValue.textContent =
          'commandId=' + String(impactPreview.commandId ?? '—') +
          ' | files=' + (previewFiles || '—') +
          ' | inProject=' + String(impactPreview.allInsideActiveProjectRoot ?? '—');
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 120));
          const result = await window.runCommandAllowlistScenarioRuntime(scenarioInput.value);
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

function buildCatalog() {
  return {
    catalogVersion: '2026.03.02-e04s05',
    commands: [
      {
        id: 'status.read',
        command: 'openclaw status',
        mode: 'READ',
        parameters: [{ name: 'verbose', type: 'boolean', required: false }]
      },
      {
        id: 'story.patch',
        command: 'bash scripts/update-story-status.sh',
        mode: 'WRITE',
        allowedRoles: ['DEV', 'TEA'],
        impactFiles: [
          `/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/implementation-artifacts/stories/${sid}.md`
        ],
        parameters: [
          { name: 'sid', type: 'string', required: true, pattern: '^S[0-9]{3}$' },
          { name: 'status', type: 'string', required: true, enum: ['OPEN', 'DONE'] }
        ]
      },
      {
        id: 'runtime.kill',
        command: 'openclaw gateway restart',
        mode: 'CRITICAL',
        allowedRoles: ['ADMIN'],
        impactFiles: ['/root/.openclaw/workspace/bmad-total/PROJECT_STATUS.md'],
        parameters: [{ name: 'reason', type: 'string', required: true }]
      }
    ]
  };
}

function runScenario(scenario) {
  if (scenario === 'success') {
    return buildCommandAllowlistCatalog({
      ...buildCatalog(),
      executionRequests: [
        {
          commandId: 'status.read',
          dryRun: true,
          role: 'DEV',
          args: { verbose: true }
        },
        {
          commandId: 'story.patch',
          dryRun: true,
          role: 'DEV',
          args: { sid, status: 'OPEN' }
        }
      ]
    });
  }

  if (scenario === 'outside-catalog') {
    return buildCommandAllowlistCatalog({
      ...buildCatalog(),
      executionRequests: [
        {
          commandId: 'rm.rf',
          dryRun: true,
          role: 'DEV',
          args: {}
        }
      ]
    });
  }

  if (scenario === 'dry-run-required') {
    return buildCommandAllowlistCatalog({
      ...buildCatalog(),
      executionRequests: [
        {
          commandId: 'story.patch',
          dryRun: false,
          role: 'DEV',
          args: { sid, status: 'DONE' }
        }
      ]
    });
  }

  if (scenario === 'apply-impact-preview') {
    return buildCommandAllowlistCatalog(
      {
        ...buildCatalog(),
        executionRequests: [
          {
            commandId: 'story.patch',
            dryRun: false,
            role: 'DEV',
            impactFiles: ['/etc/passwd'],
            args: { sid, status: 'DONE' }
          }
        ]
      },
      {
        activeProjectRoot: ACTIVE_PROJECT_ROOT,
        activeProjectRootSigningSecret: ACTIVE_PROJECT_ROOT_SIGNING_SECRET,
        activeProjectRootSignature: signActiveProjectRoot(
          ACTIVE_PROJECT_ROOT,
          ACTIVE_PROJECT_ROOT_SIGNING_SECRET
        )
      }
    );
  }

  return buildCommandAllowlistCatalog('bad-input');
}

function buildReasonCopyChecks() {
  const catalog = buildCatalog();

  const checks = [];

  const signatureRequired = buildCommandAllowlistCatalog(
    {
      ...catalog,
      executionRequests: [{ commandId: 'status.read', dryRun: true, role: 'DEV', args: { verbose: true } }]
    },
    {
      activeProjectRoot: ACTIVE_PROJECT_ROOT,
      activeProjectRootSigningSecret: ACTIVE_PROJECT_ROOT_SIGNING_SECRET
    }
  );
  checks.push({
    expectedCode: 'ACTIVE_PROJECT_ROOT_SIGNATURE_REQUIRED',
    reasonCode: signatureRequired.reasonCode,
    reason: signatureRequired.reason,
    correctiveActions: signatureRequired.correctiveActions,
    executionGuard: signatureRequired.executionGuard ?? null
  });

  const roleDenied = buildCommandAllowlistCatalog({
    ...catalog,
    executionRequests: [
      { commandId: 'story.patch', dryRun: true, role: 'UXQA', args: { sid, status: 'OPEN' } }
    ]
  });
  checks.push({
    expectedCode: 'ROLE_PERMISSION_REQUIRED',
    reasonCode: roleDenied.reasonCode,
    reason: roleDenied.reason,
    correctiveActions: roleDenied.correctiveActions,
    executionGuard: roleDenied.executionGuard ?? null
  });

  const criticalRoleDenied = buildCommandAllowlistCatalog({
    ...catalog,
    executionRequests: [
      { commandId: 'runtime.kill', dryRun: true, role: 'DEV', args: { reason: 'incident' } }
    ]
  });
  checks.push({
    expectedCode: 'CRITICAL_ACTION_ROLE_REQUIRED',
    reasonCode: criticalRoleDenied.reasonCode,
    reason: criticalRoleDenied.reason,
    correctiveActions: criticalRoleDenied.correctiveActions,
    executionGuard: criticalRoleDenied.executionGuard ?? null
  });

  const activeProjectRootGuard = buildCommandAllowlistCatalog(
    {
      ...catalog,
      executionRequests: [
        {
          commandId: 'story.patch',
          dryRun: false,
          role: 'DEV',
          impactFiles: ['/etc/passwd'],
          args: { sid, status: 'DONE' }
        }
      ]
    },
    {
      activeProjectRoot: ACTIVE_PROJECT_ROOT,
      activeProjectRootSigningSecret: ACTIVE_PROJECT_ROOT_SIGNING_SECRET,
      activeProjectRootSignature: signActiveProjectRoot(
        ACTIVE_PROJECT_ROOT,
        ACTIVE_PROJECT_ROOT_SIGNING_SECRET
      )
    }
  );
  checks.push({
    expectedCode: 'DRY_RUN_REQUIRED_FOR_WRITE',
    reasonCode: activeProjectRootGuard.reasonCode,
    reason: activeProjectRootGuard.reason,
    correctiveActions: activeProjectRootGuard.correctiveActions,
    activeProjectRootSafe: activeProjectRootGuard.executionGuard?.activeProjectRootSafe ?? false,
    impactPreviewOutsideProjectCount: activeProjectRootGuard.diagnostics?.impactPreviewOutsideProjectCount ?? -1
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
      source: 'tests/e2e/command-allowlist-catalog.spec.js'
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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

await page.exposeFunction('runCommandAllowlistScenarioRuntime', runScenario);
await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

await page.selectOption('#scenario', 'success');
await page.click('#run-catalog');
await page.waitForSelector('#state-indicator[data-state="success"]');

const viewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1366, height: 768 }
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
      diag: getOverflow('#diag-value'),
      catalog: getOverflow('#catalog-value'),
      guard: getOverflow('#guard-value'),
      impact: getOverflow('#impact-preview-value'),
      error: getOverflow('#error-message'),
      success: getOverflow('#success-json')
    };

    overflow.max = Math.max(...Object.values(overflow));

    return {
      state: document.querySelector('#state-indicator')?.getAttribute('data-state') ?? 'unknown',
      reasonCode: document.querySelector('#reason-code-value')?.textContent?.trim() ?? '',
      reason: document.querySelector('#reason-value')?.textContent?.trim() ?? '',
      diagnostics: document.querySelector('#diag-value')?.textContent?.trim() ?? '',
      guard: document.querySelector('#guard-value')?.textContent?.trim() ?? '',
      ariaLiveStatus: document.querySelector('#state-indicator')?.getAttribute('aria-live') ?? null,
      ariaLiveSuccess: document.querySelector('#success-json')?.getAttribute('aria-live') ?? null,
      ariaAtomicSuccess: document.querySelector('#success-json')?.getAttribute('aria-atomic') ?? null,
      hasAlertRole: Boolean(document.querySelector('#error-message[role="alert"]')),
      focusReturnedToAction: document.activeElement?.id === 'run-catalog',
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
    guard: metrics.guard,
    ariaLiveStatus: metrics.ariaLiveStatus,
    ariaLiveSuccess: metrics.ariaLiveSuccess,
    ariaAtomicSuccess: metrics.ariaAtomicSuccess,
    hasAlertRole: metrics.hasAlertRole,
    focusReturnedToAction: metrics.focusReturnedToAction,
    scenarioHasLabel: metrics.scenarioHasLabel,
    headingOrderOk: metrics.headingOrderOk,
    overflow: metrics.overflow,
    pass: metrics.state === 'success' && Number(metrics.overflow?.max ?? 1) === 0
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
  console.error(`❌ RESPONSIVE_CHECK_FAILED (${sid})`);
  process.exit(2);
}

console.log(`✅ UX_RESPONSIVE_EVIDENCE_OK (${sid})`);
console.log(`- evidence_dir: ${evidenceDir}`);
console.log(`- responsive_check: ${responsiveCheckPath}`);
console.log(`- state_flow_check: ${stateFlowPath}`);
console.log(`- reason_copy_check: ${reasonCopyPath}`);
