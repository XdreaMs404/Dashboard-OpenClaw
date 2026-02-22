import { expect, test } from '@playwright/test';
import { searchArtifactsFullText } from '../../src/artifact-fulltext-search.js';

const ALLOWLIST_ROOT =
  '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Recherche full-text BMAD</title>
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
        width: min(100%, 60rem);
      }

      #reason-value,
      #counts-value,
      #filters-value,
      #actions-value,
      #error-message,
      #success-json {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      #filters-value,
      #actions-value {
        margin: 0;
        padding-left: 1.25rem;
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
      <h1>Recherche full-text artefacts</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="blocked-upstream">Blocage S014</option>
        <option value="filtered-empty">Filtre sans résultat</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-action" type="button">Lancer recherche</button>

      <p id="state-indicator" role="status" aria-label="État recherche full-text" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>compteurs</dt><dd id="counts-value">—</dd></div>
          <div>
            <dt>appliedFilters</dt>
            <dd><ul id="filters-value"><li>—</li></ul></dd>
          </div>
          <div>
            <dt>correctiveActions</dt>
            <dd><ul id="actions-value"><li>—</li></ul></dd>
          </div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-action');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');
      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const countsValue = document.getElementById('counts-value');
      const filtersValue = document.getElementById('filters-value');
      const actionsValue = document.getElementById('actions-value');

      const setState = (state) => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;
      };

      const renderList = (container, values) => {
        container.textContent = '';

        if (!Array.isArray(values) || values.length === 0) {
          const item = document.createElement('li');
          item.textContent = '—';
          container.appendChild(item);
          return;
        }

        for (const value of values) {
          const item = document.createElement('li');
          item.textContent = value;
          container.appendChild(item);
        }
      };

      const renderAppliedFilters = (appliedFilters) => {
        const entries = Object.entries(appliedFilters ?? {})
          .filter(([key]) => !['offset', 'limit'].includes(key))
          .map(([key, value]) => {
            if (Array.isArray(value) && value.length > 0) {
              return key + '=' + value.join(',');
            }

            if (typeof value === 'string' && value.length > 0) {
              return key + '=' + value;
            }

            return null;
          })
          .filter(Boolean);

        renderList(filtersValue, entries);
      };

      const renderResult = (result) => {
        reasonCodeValue.textContent = result.reasonCode;
        reasonValue.textContent = result.reason;

        const diagnostics = result.diagnostics ?? {};
        countsValue.textContent =
          'matched=' + String(diagnostics.matchedCount ?? '—') +
          ' | filteredOut=' + String(diagnostics.filteredOutCount ?? '—');

        renderAppliedFilters(result.appliedFilters);
        renderList(actionsValue, result.correctiveActions);
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 150));

          const result = await window.runArtifactFulltextScenarioRuntime(scenarioInput.value);
          renderResult(result);

          if (result.allowed) {
            setState('success');
            successJson.hidden = false;
            successJson.textContent = JSON.stringify(result);
            errorMessage.hidden = true;
            errorMessage.textContent = '';
          } else {
            setState('error');
            errorMessage.hidden = false;
            errorMessage.textContent = result.reasonCode + ' — ' + result.reason;
            successJson.hidden = true;
            successJson.textContent = '';
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

const responsiveViewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1366, height: 768 }
];

async function runScenario(scenario) {
  if (scenario === 'success') {
    return searchArtifactsFullText({
      query: 'gate latence',
      filters: {
        artifactTypes: ['architecture']
      },
      searchIndex: [
        {
          artifactPath: `${ALLOWLIST_ROOT}/architecture.md`,
          artifactType: 'architecture',
          content: 'Gate G4-T latence validée.',
          sections: ['Perf'],
          phase: 'implementation',
          agent: 'dev',
          gate: 'g4-t',
          owner: 'team-a',
          riskLevel: 'medium',
          date: '2026-02-22T00:00:00.000Z'
        },
        {
          artifactPath: `${ALLOWLIST_ROOT}/prd.md`,
          artifactType: 'prd',
          content: 'Gate planning.'
        }
      ]
    });
  }

  if (scenario === 'filtered-empty') {
    return searchArtifactsFullText({
      query: 'gate',
      filters: {
        artifactTypes: ['ux']
      },
      searchIndex: [
        {
          artifactPath: `${ALLOWLIST_ROOT}/architecture.md`,
          artifactType: 'architecture',
          content: 'Gate G4-T latence validée.'
        }
      ]
    });
  }

  if (scenario === 'blocked-upstream') {
    return searchArtifactsFullText({
      query: 'latence',
      tableIndexResult: {
        allowed: false,
        reasonCode: 'ARTIFACT_TABLES_MISSING',
        reason: 'Aucun tableau markdown exploitable.',
        diagnostics: {
          requestedCount: 2,
          indexedCount: 0
        },
        correctiveActions: ['ADD_MARKDOWN_TABLES']
      }
    });
  }

  return searchArtifactsFullText({
    query: '   ',
    searchIndex: []
  });
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('runArtifactFulltextScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('artifact fulltext search demo covers empty/loading/error/success with reason, counters, filters and correctiveActions', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Lancer recherche' });
  const stateIndicator = page.getByRole('status', { name: 'État recherche full-text' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const reasonCodeValue = page.locator('#reason-code-value');
  const reasonValue = page.locator('#reason-value');
  const countsValue = page.locator('#counts-value');
  const filtersValue = page.locator('#filters-value');
  const actionsValue = page.locator('#actions-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-input');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_ARTIFACT_SEARCH_INPUT');
  await expect(reasonValue).toContainText('query invalide');
  await expect(countsValue).toContainText('matched=0 | filteredOut=0');
  await expect(actionsValue).toContainText('—');

  await scenario.selectOption('blocked-upstream');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('ARTIFACT_TABLES_MISSING');
  await expect(reasonValue).toContainText('Recherche full-text bloquée');
  await expect(actionsValue).toContainText('ADD_MARKDOWN_TABLES');

  await scenario.selectOption('filtered-empty');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('aucun résultat');
  await expect(countsValue).toContainText('matched=0 | filteredOut=1');
  await expect(filtersValue).toContainText('artifactTypes=ux');

  await scenario.selectOption('success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Recherche full-text exécutée');
  await expect(countsValue).toContainText('matched=1 | filteredOut=1');
  await expect(filtersValue).toContainText('artifactTypes=architecture');
  await expect(actionsValue).toContainText('—');
  await expect(successJson).toContainText('"allowed":true');
  await expect(errorMessage).toBeHidden();
  await expect(action).toBeEnabled();
});

test('artifact fulltext search demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
  browser
}) => {
  for (const viewport of responsiveViewports) {
    await test.step(`${viewport.name} viewport`, async () => {
      const context = await browser.newContext({
        viewport: {
          width: viewport.width,
          height: viewport.height
        }
      });

      const page = await context.newPage();

      try {
        await bootstrapDemoPage(page);

        await page.getByLabel('Scénario').selectOption('success');
        await page.getByRole('button', { name: 'Lancer recherche' }).click();

        await expect(page.getByRole('status', { name: 'État recherche full-text' })).toHaveAttribute(
          'data-state',
          'success'
        );

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const reason = document.getElementById('reason-value');
          const counts = document.getElementById('counts-value');
          const filters = document.getElementById('filters-value');
          const actions = document.getElementById('actions-value');
          const error = document.getElementById('error-message');
          const success = document.getElementById('success-json');

          const computeOverflow = (element) => {
            if (!element) {
              return 0;
            }

            return element.scrollWidth - element.clientWidth;
          };

          return {
            document: computeOverflow(doc),
            body: computeOverflow(body),
            reason: computeOverflow(reason),
            counts: computeOverflow(counts),
            filters: computeOverflow(filters),
            actions: computeOverflow(actions),
            error: computeOverflow(error),
            success: computeOverflow(success)
          };
        });

        expect(
          Math.max(
            overflow.document,
            overflow.body,
            overflow.reason,
            overflow.counts,
            overflow.filters,
            overflow.actions,
            overflow.error,
            overflow.success
          ),
          `Overflow horizontal détecté (${viewport.name}): ${JSON.stringify(overflow)}`
        ).toBeLessThanOrEqual(1);
      } finally {
        await context.close();
      }
    });
  }
});
