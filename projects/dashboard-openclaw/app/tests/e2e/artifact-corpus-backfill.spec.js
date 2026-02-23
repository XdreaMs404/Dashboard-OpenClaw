import { expect, test } from '@playwright/test';
import { runArtifactCorpusBackfill } from '../../src/artifact-corpus-backfill.js';

const ALLOWLIST_ROOT =
  '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Backfill corpus historique</title>
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
        width: min(100%, 66rem);
      }

      h1,
      #reason-value,
      #counts-value,
      #resume-value,
      #error-message,
      #json-result,
      #migrated-value,
      #skipped-value,
      #failed-value,
      #actions-value {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      #migrated-value,
      #skipped-value,
      #failed-value,
      #actions-value {
        margin: 0;
        padding-left: 1.25rem;
      }

      #json-result {
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
      <h1>Backfill corpus historique</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="blocked-upstream">Blocage amont S023</option>
        <option value="queue-saturated">Queue saturée</option>
        <option value="batch-failure">Lot en échec</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-action" type="button">Lancer backfill</button>

      <p id="state-indicator" role="status" aria-label="État backfill" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>compteurs</dt><dd id="counts-value">—</dd></div>
          <div><dt>resumeToken</dt><dd id="resume-value">—</dd></div>
          <div>
            <dt>migratedArtifacts</dt>
            <dd><ul id="migrated-value"><li>—</li></ul></dd>
          </div>
          <div>
            <dt>skippedArtifacts</dt>
            <dd><ul id="skipped-value"><li>—</li></ul></dd>
          </div>
          <div>
            <dt>failedArtifacts</dt>
            <dd><ul id="failed-value"><li>—</li></ul></dd>
          </div>
          <div>
            <dt>correctiveActions</dt>
            <dd><ul id="actions-value"><li>—</li></ul></dd>
          </div>
        </dl>
      </section>

      <pre id="json-result" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-action');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const jsonResult = document.getElementById('json-result');
      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const countsValue = document.getElementById('counts-value');
      const resumeValue = document.getElementById('resume-value');
      const migratedValue = document.getElementById('migrated-value');
      const skippedValue = document.getElementById('skipped-value');
      const failedValue = document.getElementById('failed-value');
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
          'requested=' + String(diagnostics.requestedCount ?? '—') +
          ' | migrated=' + String(diagnostics.migratedCount ?? '—') +
          ' | skipped=' + String(diagnostics.skippedCount ?? '—') +
          ' | failed=' + String(diagnostics.failedCount ?? '—') +
          ' | batches=' + String(diagnostics.batchCount ?? '—') +
          ' | p95=' + String(diagnostics.p95BatchMs ?? '—') +
          ' | source=' + String(diagnostics.sourceReasonCode ?? '—');

        const resumeToken = result.migrationReport?.resumeToken ?? {};
        resumeValue.textContent =
          'nextOffset=' + String(resumeToken.nextOffset ?? '—') +
          ' | completed=' + String(resumeToken.completed ?? '—') +
          ' | dedup=' +
          (Array.isArray(resumeToken.processedDedupKeys) ? resumeToken.processedDedupKeys.length : '—');

        const migratedEntries = (result.migratedArtifacts ?? []).map((entry) => {
          return (
            entry.artifactId +
            ' => ' +
            entry.artifactPath +
            ' #batch=' +
            String(entry.batchIndex) +
            ' dedup=' +
            String(entry.dedupKey)
          );
        });

        const skippedEntries = (result.skippedArtifacts ?? []).map((entry) => {
          return entry.artifactId + ' => ' + entry.reasonCode + ' (' + entry.reason + ')';
        });

        const failedEntries = (result.failedArtifacts ?? []).map((entry) => {
          return entry.artifactId + ' => ' + entry.reasonCode + ' (' + entry.reason + ')';
        });

        renderList(migratedValue, migratedEntries);
        renderList(skippedValue, skippedEntries);
        renderList(failedValue, failedEntries);
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

          const result = await window.runArtifactBackfillScenarioRuntime(scenarioInput.value);
          renderResult(result);

          if (result.allowed && result.reasonCode === 'OK') {
            setState('success');
            errorMessage.hidden = true;
            errorMessage.textContent = '';
            jsonResult.hidden = false;
            jsonResult.textContent = JSON.stringify(result);
          } else {
            setState('error');
            errorMessage.hidden = false;
            errorMessage.textContent = result.reasonCode + ' — ' + result.reason;
            jsonResult.hidden = false;
            jsonResult.textContent = JSON.stringify(result);
          }
        } catch (error) {
          setState('error');
          errorMessage.hidden = false;
          errorMessage.textContent = error?.message ?? String(error);
          jsonResult.hidden = true;
          jsonResult.textContent = '';
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

function buildRiskAnnotationsResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Source S023 résolue.',
    diagnostics: {
      sourceReasonCode: 'OK'
    },
    taggedArtifacts: [
      {
        artifactId: 'rollout-v1',
        artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
        artifactType: 'prd',
        sourceIssueIds: ['issue-1'],
        riskTags: ['T01', 'T02'],
        severity: 'medium',
        ownerHint: 'owner-a',
        contentHash: 'hash-rollout-v1'
      },
      {
        artifactId: 'rollout-v2',
        artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v2.yaml`,
        artifactType: 'adr',
        sourceIssueIds: ['issue-2'],
        riskTags: ['T03'],
        severity: 'high',
        ownerHint: 'owner-b',
        contentHash: 'hash-rollout-v2'
      }
    ],
    contextAnnotations: [
      {
        annotationId: 'ann-rollout-v1',
        artifactId: 'rollout-v1',
        artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
        issueId: 'issue-1',
        parseStage: 'frontmatter',
        errorType: 'frontmatter',
        recommendedFix: 'Fix frontmatter',
        what: 'Erreur frontmatter',
        why: 'Conserver FR-032',
        nextAction: 'Corriger frontmatter',
        severity: 'medium',
        ownerHint: 'owner-a',
        riskTags: ['T01', 'T02']
      }
    ],
    ...overrides
  };
}

function buildBatchFailureResultPayload() {
  const taggedArtifacts = Array.from({ length: 5 }, (_, index) => ({
    artifactId: `batch-${index}`,
    artifactPath: `${ALLOWLIST_ROOT}/reports/batch-${index}.md`,
    artifactType: 'prd',
    sourceIssueIds: [`issue-batch-${index}`],
    riskTags: ['T01'],
    severity: 'medium',
    ownerHint: 'owner-batch',
    contentHash: `batch-hash-${index}`
  }));

  return buildRiskAnnotationsResult({
    taggedArtifacts,
    contextAnnotations: []
  });
}

async function runScenario(scenario) {
  if (scenario === 'success') {
    return runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      batchSize: 50,
      riskAnnotationsResult: buildRiskAnnotationsResult()
    });
  }

  if (scenario === 'blocked-upstream') {
    return runArtifactCorpusBackfill({
      riskAnnotationsResult: {
        allowed: false,
        reasonCode: 'RISK_TAGS_MISSING',
        reason: 'Tags manquants côté source S023.',
        diagnostics: {
          sourceReasonCode: 'RISK_TAGS_MISSING'
        },
        correctiveActions: ['ADD_RISK_TAGS']
      }
    });
  }

  if (scenario === 'queue-saturated') {
    return runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      queueDepth: 42,
      maxQueueDepth: 3,
      riskAnnotationsResult: buildRiskAnnotationsResult({
        taggedArtifacts: [],
        contextAnnotations: []
      })
    });
  }

  if (scenario === 'batch-failure') {
    return runArtifactCorpusBackfill({
      allowlistRoots: [ALLOWLIST_ROOT],
      batchSize: 2,
      batchFailureAtBatchIndex: 2,
      riskAnnotationsResult: buildBatchFailureResultPayload()
    });
  }

  return runArtifactCorpusBackfill({
    allowlistRoots: [ALLOWLIST_ROOT]
  });
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('runArtifactBackfillScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('artifact corpus backfill demo covers empty/loading/error/success states with diagnostics and actions', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Lancer backfill' });
  const stateIndicator = page.getByRole('status', { name: 'État backfill' });
  const errorMessage = page.getByRole('alert');
  const jsonResult = page.locator('#json-result');

  const reasonCodeValue = page.locator('#reason-code-value');
  const reasonValue = page.locator('#reason-value');
  const countsValue = page.locator('#counts-value');
  const resumeValue = page.locator('#resume-value');
  const migratedValue = page.locator('#migrated-value');
  const skippedValue = page.locator('#skipped-value');
  const failedValue = page.locator('#failed-value');
  const actionsValue = page.locator('#actions-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-input');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_BACKFILL_INPUT');
  await expect(reasonValue).toContainText('Aucune source exploitable');
  await expect(countsValue).toContainText(
    'requested=0 | migrated=0 | skipped=0 | failed=0 | batches=0 | p95=0 | source=INVALID_BACKFILL_INPUT'
  );

  await scenario.selectOption('blocked-upstream');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('RISK_TAGS_MISSING');
  await expect(reasonValue).toContainText('Tags manquants côté source');
  await expect(actionsValue).toContainText('ADD_RISK_TAGS');

  await scenario.selectOption('queue-saturated');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('BACKFILL_QUEUE_SATURATED');
  await expect(reasonValue).toContainText('Queue backfill saturée');
  await expect(actionsValue).toContainText('THROTTLE_BACKFILL_QUEUE');

  await scenario.selectOption('batch-failure');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('BACKFILL_BATCH_FAILED');
  await expect(reasonValue).toContainText('Echec de migration lot 2');
  await expect(countsValue).toContainText(
    'requested=5 | migrated=2 | skipped=0 | failed=2 | batches=2 | p95='
  );
  await expect(resumeValue).toContainText('nextOffset=2 | completed=false | dedup=2');
  await expect(failedValue).toContainText('batch-2 => BACKFILL_BATCH_FAILED');
  await expect(actionsValue).toContainText('RETRY_BACKFILL_BATCH');

  await scenario.selectOption('success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(jsonResult).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Backfill terminé');
  await expect(countsValue).toContainText(
    'requested=2 | migrated=2 | skipped=0 | failed=0 | batches=1 | p95='
  );
  await expect(resumeValue).toContainText('nextOffset=2 | completed=true | dedup=2');
  await expect(migratedValue).toContainText('rollout-v1 =>');
  await expect(migratedValue).toContainText('rollout-v2 =>');
  await expect(skippedValue).toContainText('—');
  await expect(failedValue).toContainText('—');
  await expect(actionsValue).toContainText('—');
  await expect(jsonResult).toContainText('"allowed":true');
  await expect(errorMessage).toBeHidden();
  await expect(action).toBeEnabled();
});

test('artifact corpus backfill demo stays readable without horizontal overflow on mobile/tablet/desktop', async ({
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
        await page.getByRole('button', { name: 'Lancer backfill' }).click();

        await expect(page.getByRole('status', { name: 'État backfill' })).toHaveAttribute(
          'data-state',
          'success'
        );

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const reason = document.getElementById('reason-value');
          const counts = document.getElementById('counts-value');
          const resume = document.getElementById('resume-value');
          const migrated = document.getElementById('migrated-value');
          const skipped = document.getElementById('skipped-value');
          const failed = document.getElementById('failed-value');
          const actions = document.getElementById('actions-value');
          const error = document.getElementById('error-message');
          const json = document.getElementById('json-result');

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
            resume: computeOverflow(resume),
            migrated: computeOverflow(migrated),
            skipped: computeOverflow(skipped),
            failed: computeOverflow(failed),
            actions: computeOverflow(actions),
            error: computeOverflow(error),
            json: computeOverflow(json)
          };
        });

        expect(
          Math.max(
            overflow.document,
            overflow.body,
            overflow.reason,
            overflow.counts,
            overflow.resume,
            overflow.migrated,
            overflow.skipped,
            overflow.failed,
            overflow.actions,
            overflow.error,
            overflow.json
          ),
          `Overflow horizontal détecté (${viewport.name}): ${JSON.stringify(overflow)}`
        ).toBeLessThanOrEqual(1);
      } finally {
        await context.close();
      }
    });
  }
});
