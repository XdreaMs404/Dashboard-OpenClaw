import { expect, test } from '@playwright/test';
import { buildArtifactEvidenceGraph } from '../../src/artifact-evidence-graph.js';

const ALLOWLIST_ROOT =
  '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Evidence graph décision↔preuve↔gate↔commande</title>
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
        width: min(100%, 62rem);
      }

      h1,
      #reason-value,
      #counts-value,
      #graph-value,
      #backlinks-value,
      #orphans-value,
      #actions-value,
      #error-message,
      #success-json {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      #graph-value,
      #backlinks-value,
      #orphans-value,
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
      <h1>Evidence graph décision↔preuve↔gate↔commande</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="blocked-upstream">Blocage amont</option>
        <option value="incomplete-links">Liens incomplets</option>
        <option value="decision-not-found">Décision absente</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-action" type="button">Construire graph</button>

      <p id="state-indicator" role="status" aria-label="État evidence graph" aria-live="polite" data-state="empty">
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
            <dt>graph</dt>
            <dd><ul id="graph-value"><li>—</li></ul></dd>
          </div>
          <div>
            <dt>decisionBacklinks</dt>
            <dd><ul id="backlinks-value"><li>—</li></ul></dd>
          </div>
          <div>
            <dt>orphanEvidence</dt>
            <dd><ul id="orphans-value"><li>—</li></ul></dd>
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
      const graphValue = document.getElementById('graph-value');
      const backlinksValue = document.getElementById('backlinks-value');
      const orphansValue = document.getElementById('orphans-value');
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
          'nodes=' + String(diagnostics.nodesCount ?? '—') +
          ' | edges=' + String(diagnostics.edgesCount ?? '—') +
          ' | decisions=' + String(diagnostics.decisionsCount ?? '—') +
          ' | backlinks=' + String(diagnostics.backlinkedArtifactsCount ?? '—') +
          ' | orphans=' + String(diagnostics.orphanCount ?? '—');

        const graphEntries = [
          'nodes=' + String(result.graph?.nodes?.length ?? 0),
          'edges=' + String(result.graph?.edges?.length ?? 0),
          'clusters=' + String(result.graph?.clusters?.length ?? 0)
        ];

        const backlinksEntries = Object.entries(result.decisionBacklinks ?? {}).map(([decisionId, artifacts]) => {
          const ids = (artifacts ?? []).map((entry) => entry.artifactId).join(',');
          return decisionId + ' => ' + ids;
        });

        const orphanEntries = (result.orphanEvidence ?? []).map((entry) => {
          return entry.candidateSource + ' => ' + entry.reason;
        });

        renderList(graphValue, graphEntries);
        renderList(backlinksValue, backlinksEntries);
        renderList(orphansValue, orphanEntries);
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

          const result = await window.runArtifactEvidenceGraphScenarioRuntime(scenarioInput.value);
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
    return buildArtifactEvidenceGraph({
      artifactDiffResult: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Diff exécuté.',
        diagnostics: {
          sourceReasonCode: 'OK'
        },
        diffResults: [
          {
            groupKey: 'prd:rollout',
            leftArtifactId: 'rollout-v1',
            rightArtifactId: 'rollout-v2',
            leftArtifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
            rightArtifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v2.md`,
            artifactType: 'prd'
          }
        ],
        unresolvedCandidates: [],
        provenanceLinks: [
          {
            groupKey: 'prd:rollout',
            leftArtifactId: 'rollout-v1',
            rightArtifactId: 'rollout-v2',
            decisionRefs: ['DEC-1', 'DEC-2'],
            gateRefs: ['G4-T', 'G4-UX'],
            commandRefs: ['CMD-1', 'CMD-2']
          }
        ],
        correctiveActions: []
      }
    });
  }

  if (scenario === 'decision-not-found') {
    return buildArtifactEvidenceGraph({
      artifactDiffResult: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Diff exécuté.',
        diagnostics: {
          sourceReasonCode: 'OK'
        },
        diffResults: [
          {
            groupKey: 'prd:rollout',
            leftArtifactId: 'rollout-v1',
            rightArtifactId: 'rollout-v2',
            leftArtifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
            rightArtifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v2.md`,
            artifactType: 'prd'
          }
        ],
        unresolvedCandidates: [],
        provenanceLinks: [
          {
            groupKey: 'prd:rollout',
            leftArtifactId: 'rollout-v1',
            rightArtifactId: 'rollout-v2',
            decisionRefs: ['DEC-1'],
            gateRefs: ['G4-T'],
            commandRefs: ['CMD-1']
          }
        ],
        correctiveActions: []
      },
      decisionId: 'DEC-404'
    });
  }

  if (scenario === 'incomplete-links') {
    return buildArtifactEvidenceGraph({
      artifactDiffResult: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Diff exécuté.',
        diagnostics: {
          sourceReasonCode: 'OK'
        },
        diffResults: [
          {
            groupKey: 'prd:orphan',
            leftArtifactId: 'orphan-v1',
            rightArtifactId: 'orphan-v2',
            leftArtifactPath: `${ALLOWLIST_ROOT}/reports/orphan-v1.md`,
            rightArtifactPath: `${ALLOWLIST_ROOT}/reports/orphan-v2.md`,
            artifactType: 'prd'
          }
        ],
        unresolvedCandidates: [],
        provenanceLinks: [],
        correctiveActions: []
      }
    });
  }

  if (scenario === 'blocked-upstream') {
    return buildArtifactEvidenceGraph({
      artifactDiffResult: {
        allowed: false,
        reasonCode: 'ARTIFACT_METADATA_INVALID',
        reason: 'Metadata invalide pour la comparaison.',
        diagnostics: {
          sourceReasonCode: 'ARTIFACT_METADATA_INVALID'
        },
        correctiveActions: ['FIX_INVALID_METADATA']
      }
    });
  }

  return buildArtifactEvidenceGraph({});
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('runArtifactEvidenceGraphScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('artifact evidence graph demo covers empty/loading/error/success with reason, counters, graph, backlinks, orphan evidence and actions', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Construire graph' });
  const stateIndicator = page.getByRole('status', { name: 'État evidence graph' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const reasonCodeValue = page.locator('#reason-code-value');
  const reasonValue = page.locator('#reason-value');
  const countsValue = page.locator('#counts-value');
  const graphValue = page.locator('#graph-value');
  const backlinksValue = page.locator('#backlinks-value');
  const orphansValue = page.locator('#orphans-value');
  const actionsValue = page.locator('#actions-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-input');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_EVIDENCE_GRAPH_INPUT');
  await expect(reasonValue).toContainText('Aucune source exploitable');
  await expect(countsValue).toContainText('nodes=0 | edges=0 | decisions=0 | backlinks=0 | orphans=0');

  await scenario.selectOption('blocked-upstream');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('ARTIFACT_METADATA_INVALID');
  await expect(reasonValue).toContainText('Metadata invalide');
  await expect(actionsValue).toContainText('FIX_INVALID_METADATA');

  await scenario.selectOption('incomplete-links');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('EVIDENCE_LINK_INCOMPLETE');
  await expect(reasonValue).toContainText('preuve');
  await expect(orphansValue).toContainText('artifactDiffResult.diffResults');
  await expect(actionsValue).toContainText('LINK_OR_RESTORE_EVIDENCE');

  await scenario.selectOption('decision-not-found');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('DECISION_NOT_FOUND');
  await expect(reasonValue).toContainText('DEC-404');
  await expect(actionsValue).toContainText('VERIFY_DECISION_ID');

  await scenario.selectOption('success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Evidence graph construit');
  await expect(countsValue).toContainText('nodes=8 | edges=12 | decisions=2 | backlinks=2 | orphans=0');
  await expect(graphValue).toContainText('nodes=8');
  await expect(graphValue).toContainText('edges=12');
  await expect(backlinksValue).toContainText('DEC-1 => rollout-v1,rollout-v2');
  await expect(backlinksValue).toContainText('DEC-2 => rollout-v1,rollout-v2');
  await expect(orphansValue).toContainText('—');
  await expect(actionsValue).toContainText('—');
  await expect(successJson).toContainText('"allowed":true');
  await expect(errorMessage).toBeHidden();
  await expect(action).toBeEnabled();
});

test('artifact evidence graph demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
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
        await page.getByRole('button', { name: 'Construire graph' }).click();

        await expect(page.getByRole('status', { name: 'État evidence graph' })).toHaveAttribute(
          'data-state',
          'success'
        );

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const reason = document.getElementById('reason-value');
          const counts = document.getElementById('counts-value');
          const graph = document.getElementById('graph-value');
          const backlinks = document.getElementById('backlinks-value');
          const orphans = document.getElementById('orphans-value');
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
            graph: computeOverflow(graph),
            backlinks: computeOverflow(backlinks),
            orphans: computeOverflow(orphans),
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
            overflow.graph,
            overflow.backlinks,
            overflow.orphans,
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
