import { expect, test } from '@playwright/test';
import { buildCommandAllowlistCatalog } from '../../src/command-allowlist-catalog.js';

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
    catalogVersion: '2026.02.25-e04s04',
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
        impactFiles: ['/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/implementation-artifacts/stories/S040.md'],
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
          args: { sid: 'S040', status: 'OPEN' }
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
          args: { sid: 'S040', status: 'DONE' }
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
            impactFiles: [
              '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/implementation-artifacts/stories/S040.md'
            ],
            args: { sid: 'S040', status: 'DONE' }
          }
        ]
      },
      {
        activeProjectRoot: '/root/.openclaw/workspace/projects/dashboard-openclaw'
      }
    );
  }

  return buildCommandAllowlistCatalog('bad-input');
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('runCommandAllowlistScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('command allowlist catalog demo covers empty/loading/error/success with guard diagnostics', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Évaluer catalogue' });
  const stateIndicator = page.getByRole('status', { name: 'État catalogue allowlist' });
  const errorMessage = page.getByRole('alert');

  const reasonCodeValue = page.locator('#reason-code-value');
  const diagValue = page.locator('#diag-value');
  const catalogValue = page.locator('#catalog-value');
  const guardValue = page.locator('#guard-value');
  const impactPreviewValue = page.locator('#impact-preview-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');

  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_COMMAND_CATALOG_INPUT');
  await expect(errorMessage).toContainText('INVALID_COMMAND_CATALOG_INPUT');

  await scenario.selectOption('outside-catalog');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('COMMAND_OUTSIDE_CATALOG');

  await scenario.selectOption('dry-run-required');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('DRY_RUN_REQUIRED_FOR_WRITE');

  await scenario.selectOption('apply-impact-preview');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('DRY_RUN_REQUIRED_FOR_WRITE');
  await expect(impactPreviewValue).toContainText('commandId=story.patch');
  await expect(impactPreviewValue).toContainText('inProject=true');

  await scenario.selectOption('success');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(diagValue).toContainText('commands=3');
  await expect(diagValue).toContainText('impactPreviewProvided=1');
  await expect(catalogValue).toContainText('story.patch');
  await expect(guardValue).toContainText('allFromCatalog=true');
  await expect(guardValue).toContainText('dryRunByDefault=true');
  await expect(guardValue).toContainText('activeProjectRootSafe=true');
  await expect(errorMessage).toBeHidden();
});

test('command allowlist catalog demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Évaluer catalogue' });

  await scenario.selectOption('success');
  await action.click();
  await expect(page.getByRole('status', { name: 'État catalogue allowlist' })).toHaveAttribute(
    'data-state',
    'success'
  );

  const viewports = [
    { name: 'mobile', width: 390, height: 844 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1440, height: 900 }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    const overflow = await page.evaluate(() => {
      const root = document.documentElement;
      return root.scrollWidth > root.clientWidth;
    });

    expect.soft(
      overflow,
      `Overflow horizontal détecté en viewport ${viewport.name} (${viewport.width}x${viewport.height})`
    ).toBe(false);
  }
});
