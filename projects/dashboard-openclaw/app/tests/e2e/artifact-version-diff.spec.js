import { expect, test } from '@playwright/test';
import { diffArtifactVersions } from '../../src/artifact-version-diff.js';

const ALLOWLIST_ROOT =
  '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Diff version-vers-version d'artefacts</title>
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

      #reason-value,
      #counts-value,
      #diff-value,
      #provenance-value,
      #actions-value,
      #error-message,
      #success-json {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      #diff-value,
      #provenance-value,
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
      <h1>Diff artefact version-vers-version</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="blocked-upstream">Blocage amont</option>
        <option value="not-eligible">Candidats non éligibles</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-action" type="button">Lancer diff</button>

      <p id="state-indicator" role="status" aria-label="État diff artefact" aria-live="polite" data-state="empty">
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
            <dt>diffResults</dt>
            <dd><ul id="diff-value"><li>—</li></ul></dd>
          </div>
          <div>
            <dt>provenanceLinks</dt>
            <dd><ul id="provenance-value"><li>—</li></ul></dd>
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
      const diffValue = document.getElementById('diff-value');
      const provenanceValue = document.getElementById('provenance-value');
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
          'compared=' + String(diagnostics.comparedPairsCount ?? '—') +
          ' | unresolved=' + String(diagnostics.unresolvedCount ?? '—') +
          ' | requested=' + String(diagnostics.requestedCandidatesCount ?? '—');

        const diffEntries = (result.diffResults ?? []).map((diff) => {
          return diff.groupKey + ' => ' + diff.leftArtifactId + ' vs ' + diff.rightArtifactId;
        });

        const provenanceEntries = (result.provenanceLinks ?? []).map((entry) => {
          return (
            entry.groupKey +
            ' => decisions=' + (entry.decisionRefs ?? []).join(',') +
            ' gates=' + (entry.gateRefs ?? []).join(',') +
            ' commands=' + (entry.commandRefs ?? []).join(',')
          );
        });

        renderList(diffValue, diffEntries);
        renderList(provenanceValue, provenanceEntries);
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

          const result = await window.runArtifactVersionDiffScenarioRuntime(scenarioInput.value);
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
    return diffArtifactVersions({
      artifactPairs: [
        {
          groupKey: 'prd:rollout',
          left: {
            artifactId: 'rollout-v1',
            artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
            artifactType: 'prd',
            metadata: {
              owner: 'team-a',
              riskLevel: 'high'
            },
            sections: ['Contexte', 'Plan'],
            tables: [
              {
                headers: ['metric', 'value'],
                rows: [['coverage', '95%']]
              }
            ],
            contentSummary: 'rollout baseline',
            decisionRefs: ['DEC-1'],
            gateRefs: ['G4-T'],
            commandRefs: ['CMD-1']
          },
          right: {
            artifactId: 'rollout-v2',
            artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v2.md`,
            artifactType: 'prd',
            metadata: {
              owner: 'team-a',
              riskLevel: 'critical'
            },
            sections: ['Contexte', 'Plan', 'Runbook'],
            tables: [
              {
                headers: ['metric', 'value'],
                rows: [
                  ['coverage', '98%'],
                  ['p95', '1.2s']
                ]
              }
            ],
            contentSummary: 'rollout with runbook',
            decisionRefs: ['DEC-1', 'DEC-2'],
            gateRefs: ['G4-T', 'G4-UX'],
            commandRefs: ['CMD-1', 'CMD-2']
          }
        }
      ]
    });
  }

  if (scenario === 'not-eligible') {
    return diffArtifactVersions({
      contextFilterResult: {
        allowed: true,
        reasonCode: 'OK',
        filteredResults: [
          {
            artifactId: 'single-v1',
            artifactPath: `${ALLOWLIST_ROOT}/reports/single-v1.md`,
            artifactType: 'prd',
            score: 1,
            snippet: 'single version only'
          }
        ],
        diffCandidates: [
          {
            groupKey: 'prd:single',
            artifactIds: ['single-v1']
          }
        ]
      }
    });
  }

  if (scenario === 'blocked-upstream') {
    return diffArtifactVersions({
      contextFilterResult: {
        allowed: false,
        reasonCode: 'ARTIFACT_METADATA_INVALID',
        reason: 'Metadata invalide pour la comparaison.',
        diagnostics: {
          diffCandidateGroupsCount: 1,
          sourceReasonCode: 'ARTIFACT_METADATA_INVALID'
        },
        correctiveActions: ['FIX_INVALID_METADATA']
      }
    });
  }

  return diffArtifactVersions({});
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('runArtifactVersionDiffScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('artifact version diff demo covers empty/loading/error/success with reason, counters, diff, provenance and actions', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Lancer diff' });
  const stateIndicator = page.getByRole('status', { name: 'État diff artefact' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const reasonCodeValue = page.locator('#reason-code-value');
  const reasonValue = page.locator('#reason-value');
  const countsValue = page.locator('#counts-value');
  const diffValue = page.locator('#diff-value');
  const provenanceValue = page.locator('#provenance-value');
  const actionsValue = page.locator('#actions-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-input');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_ARTIFACT_DIFF_INPUT');
  await expect(reasonValue).toContainText('Aucune source exploitable');
  await expect(countsValue).toContainText('compared=0 | unresolved=0 | requested=0');

  await scenario.selectOption('blocked-upstream');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('ARTIFACT_METADATA_INVALID');
  await expect(reasonValue).toContainText('Metadata invalide');
  await expect(actionsValue).toContainText('FIX_INVALID_METADATA');

  await scenario.selectOption('not-eligible');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('ARTIFACT_DIFF_NOT_ELIGIBLE');
  await expect(reasonValue).toContainText('Aucun candidat diff éligible');
  await expect(actionsValue).toContainText('REVIEW_DIFF_CANDIDATES');

  await scenario.selectOption('success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Diff version-vers-version exécuté');
  await expect(countsValue).toContainText('compared=1 | unresolved=0 | requested=1');
  await expect(diffValue).toContainText('prd:rollout => rollout-v1 vs rollout-v2');
  await expect(provenanceValue).toContainText('decisions=DEC-1,DEC-2');
  await expect(provenanceValue).toContainText('gates=G4-T,G4-UX');
  await expect(provenanceValue).toContainText('commands=CMD-1,CMD-2');
  await expect(actionsValue).toContainText('—');
  await expect(successJson).toContainText('"allowed":true');
  await expect(errorMessage).toBeHidden();
  await expect(action).toBeEnabled();
});

test('artifact version diff demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
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
        await page.getByRole('button', { name: 'Lancer diff' }).click();

        await expect(page.getByRole('status', { name: 'État diff artefact' })).toHaveAttribute(
          'data-state',
          'success'
        );

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const reason = document.getElementById('reason-value');
          const counts = document.getElementById('counts-value');
          const diff = document.getElementById('diff-value');
          const provenance = document.getElementById('provenance-value');
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
            diff: computeOverflow(diff),
            provenance: computeOverflow(provenance),
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
            overflow.diff,
            overflow.provenance,
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
