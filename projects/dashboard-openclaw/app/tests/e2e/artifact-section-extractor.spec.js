import { expect, test } from '@playwright/test';
import { extractArtifactSectionsForNavigation } from '../../src/artifact-section-extractor.js';

const ALLOWLIST_ROOT =
  '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Extraction sections artefacts BMAD</title>
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
        width: min(100%, 58rem);
      }

      #reason-value,
      #counts-value,
      #actions-value,
      #error-message,
      #success-json {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

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
      <h1>Extracteur sections H2/H3</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Source absente</option>
        <option value="path-not-allowed">Chemin hors allowlist</option>
        <option value="unsupported-type">Type non supporté</option>
        <option value="metadata-missing">Metadata manquante</option>
        <option value="metadata-invalid">Metadata invalide</option>
        <option value="parse-failed">Parse invalide</option>
        <option value="sections-missing">Sections manquantes</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-action" type="button">Extraire sections</button>

      <p id="state-indicator" role="status" aria-label="État extraction sections" aria-live="polite" data-state="empty">
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
            <dt>correctiveActions</dt>
            <dd>
              <ul id="actions-value"><li>—</li></ul>
            </dd>
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

      const renderResult = (result) => {
        reasonCodeValue.textContent = result.reasonCode;
        reasonValue.textContent = result.reason;

        const diagnostics = result.diagnostics ?? {};
        countsValue.textContent =
          'h2=' + String(diagnostics.h2Count ?? '—') +
          ' | h3=' + String(diagnostics.h3Count ?? '—') +
          ' | sections=' + String(diagnostics.sectionCount ?? '—');

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

          const result = await window.runArtifactSectionExtractionScenarioRuntime(scenarioInput.value);
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

function markdownWithMetadata({ stepsCompleted = ['H01'], inputDocuments = ['brief.md'], headings = [] }) {
  const steps = stepsCompleted.map((entry) => `  - ${entry}`).join('\n');
  const inputs = inputDocuments.map((entry) => `  - ${entry}`).join('\n');

  return `---\nstepsCompleted:\n${steps}\ninputDocuments:\n${inputs}\n---\n${headings.join('\n')}\nContenu`;
}

async function runScenario(scenario) {
  if (scenario === 'success') {
    return extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata({
            stepsCompleted: ['H01', 'H02'],
            inputDocuments: ['brief.md', 'research.md'],
            headings: ['## Contexte', '### Objectif']
          })
        },
        {
          path: `${ALLOWLIST_ROOT}/notes.md`,
          content: '## Décisions\n### Impacts\nContenu'
        }
      ]
    });
  }

  if (scenario === 'sections-missing') {
    return extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: markdownWithMetadata({ headings: ['# Titre uniquement'] })
        }
      ]
    });
  }

  if (scenario === 'parse-failed') {
    return extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: '---\nstepsCompleted:\n  - H01\ninputDocuments:\n  - brief.md\n## frontmatter invalide'
        }
      ]
    });
  }

  if (scenario === 'metadata-invalid') {
    return extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/architecture.md`,
          content: '---\nstepsCompleted: done\ninputDocuments:\n  - prd.md\n---\n## Contexte\n### Contraintes'
        }
      ]
    });
  }

  if (scenario === 'metadata-missing') {
    return extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/prd.md`,
          content: '## Contexte\n### Objectif\nSans metadata'
        }
      ]
    });
  }

  if (scenario === 'unsupported-type') {
    return extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: `${ALLOWLIST_ROOT}/payload.yaml`,
          content: 'owner: pm\nstatus: draft'
        }
      ]
    });
  }

  if (scenario === 'path-not-allowed') {
    return extractArtifactSectionsForNavigation({
      allowlistRoots: [ALLOWLIST_ROOT],
      artifactDocuments: [
        {
          path: '/tmp/forbidden/prd.md',
          content: markdownWithMetadata({ headings: ['## Contexte'] })
        }
      ]
    });
  }

  return extractArtifactSectionsForNavigation({
    allowlistRoots: [ALLOWLIST_ROOT]
  });
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('runArtifactSectionExtractionScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('artifact section extractor demo covers empty/loading/error/success with explicit reason, section counters and correctiveActions', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Extraire sections' });
  const stateIndicator = page.getByRole('status', { name: 'État extraction sections' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const reasonCodeValue = page.locator('#reason-code-value');
  const reasonValue = page.locator('#reason-value');
  const countsValue = page.locator('#counts-value');
  const actionsValue = page.locator('#actions-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-input');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_SECTION_EXTRACTION_INPUT');
  await expect(reasonValue).toContainText('artifactDocuments ou artifactPaths est requis');
  await expect(countsValue).toContainText('h2=0 | h3=0 | sections=0');
  await expect(actionsValue).toContainText('—');

  await scenario.selectOption('path-not-allowed');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('ARTIFACT_PATH_NOT_ALLOWED');
  await expect(reasonValue).toContainText('Chemin hors allowlist');
  await expect(actionsValue).toContainText('RESTRICT_TO_ALLOWED_ROOTS');

  await scenario.selectOption('unsupported-type');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('UNSUPPORTED_ARTIFACT_TYPE');
  await expect(reasonValue).toContainText('Extension non supportée');
  await expect(actionsValue).toContainText('REMOVE_UNSUPPORTED_ARTIFACTS');

  await scenario.selectOption('metadata-missing');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('ARTIFACT_METADATA_MISSING');
  await expect(reasonValue).toContainText('Metadata obligatoire manquante');
  await expect(actionsValue).toContainText('ADD_REQUIRED_METADATA');

  await scenario.selectOption('metadata-invalid');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('ARTIFACT_METADATA_INVALID');
  await expect(reasonValue).toContainText('Metadata invalide');
  await expect(actionsValue).toContainText('FIX_INVALID_METADATA');

  await scenario.selectOption('parse-failed');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('ARTIFACT_PARSE_FAILED');
  await expect(reasonValue).toContainText('Frontmatter markdown invalide');
  await expect(actionsValue).toContainText('FIX_ARTIFACT_SYNTAX');

  await scenario.selectOption('sections-missing');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('ARTIFACT_SECTIONS_MISSING');
  await expect(reasonValue).toContainText('Aucune section H2/H3 exploitable');
  await expect(actionsValue).toContainText('ADD_STRUCTURED_HEADINGS');

  await scenario.selectOption('success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Extraction sections réussie');
  await expect(countsValue).toContainText('h2=2 | h3=2 | sections=4');
  await expect(actionsValue).toContainText('—');
  await expect(successJson).toContainText('"allowed":true');
  await expect(errorMessage).toBeHidden();
  await expect(action).toBeEnabled();
});

test('artifact section extractor demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
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

        await page.getByLabel('Scénario').selectOption('metadata-invalid');
        await page.getByRole('button', { name: 'Extraire sections' }).click();

        await expect(page.getByRole('status', { name: 'État extraction sections' })).toHaveAttribute(
          'data-state',
          'error'
        );

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const reason = document.getElementById('reason-value');
          const counts = document.getElementById('counts-value');
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
