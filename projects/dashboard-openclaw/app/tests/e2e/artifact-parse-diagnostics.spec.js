import { expect, test } from '@playwright/test';
import { buildArtifactParseDiagnostics } from '../../src/artifact-parse-diagnostics.js';

const ALLOWLIST_ROOT =
  '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Diagnostic parse-errors et recommandations</title>
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
      #issues-value,
      #recommendations-value,
      #dlq-value,
      #actions-value,
      #error-message,
      #success-json {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      #issues-value,
      #recommendations-value,
      #dlq-value,
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
      <h1>Diagnostic parse-errors</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="blocked-upstream">Blocage amont</option>
        <option value="retry-limit">Retry limit reached</option>
        <option value="dlq-required">DLQ required</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-action" type="button">Diagnostiquer parse</button>

      <p id="state-indicator" role="status" aria-label="État parse diagnostics" aria-live="polite" data-state="empty">
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
            <dt>parseIssues</dt>
            <dd><ul id="issues-value"><li>—</li></ul></dd>
          </div>
          <div>
            <dt>recommendations</dt>
            <dd><ul id="recommendations-value"><li>—</li></ul></dd>
          </div>
          <div>
            <dt>dlqCandidates</dt>
            <dd><ul id="dlq-value"><li>—</li></ul></dd>
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
      const issuesValue = document.getElementById('issues-value');
      const recommendationsValue = document.getElementById('recommendations-value');
      const dlqValue = document.getElementById('dlq-value');
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
          'checked=' + String(diagnostics.artifactsChecked ?? '—') +
          ' | errors=' + String(diagnostics.parseErrorCount ?? '—') +
          ' | retry=' + String(diagnostics.retryScheduledCount ?? '—') +
          ' | dlq=' + String(diagnostics.dlqCount ?? '—');

        const issuesEntries = (result.parseIssues ?? []).map((issue) => {
          return (
            issue.artifactId +
            ' => ' + issue.parseStage + '/' + issue.errorType +
            ' retry=' + String(issue.retryCount)
          );
        });

        const recommendationsEntries = (result.recommendations ?? []).map((rec) => {
          return rec.artifactId + ' => ' + rec.action;
        });

        const dlqEntries = (result.dlqCandidates ?? []).map((candidate) => {
          return candidate.artifactId + ' => retry=' + String(candidate.retryCount);
        });

        renderList(issuesValue, issuesEntries);
        renderList(recommendationsValue, recommendationsEntries);
        renderList(dlqValue, dlqEntries);
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

          const result = await window.runArtifactParseDiagnosticsScenarioRuntime(scenarioInput.value);
          renderResult(result);

          if (result.allowed && result.reasonCode === 'OK') {
            setState('success');
            successJson.hidden = false;
            successJson.textContent = JSON.stringify(result);
            errorMessage.hidden = true;
            errorMessage.textContent = '';
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

const responsiveViewports = [
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 820, height: 1180 },
  { name: 'desktop', width: 1366, height: 768 }
];

function baseStalenessResult() {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'staleness ok',
    diagnostics: {
      sourceReasonCode: 'OK'
    },
    stalenessBoard: {
      staleButAvailable: true,
      maxAgeSeconds: 3600,
      artifacts: [
        {
          artifactId: 'rollout-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
          artifactType: 'prd',
          updatedAt: '2026-02-23T15:00:00.000Z',
          ageSeconds: 300,
          maxAgeSeconds: 3600,
          isStale: false,
          stalenessLevel: 'fresh'
        }
      ],
      summary: {
        artifactsCount: 1,
        staleCount: 0,
        staleRatio: 0,
        maxAgeSeconds: 3600,
        highestAgeSeconds: 300
      }
    },
    decisionFreshness: {
      'DEC-1': [
        {
          artifactId: 'rollout-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
          artifactType: 'prd',
          updatedAt: '2026-02-23T15:00:00.000Z',
          ageSeconds: 300,
          isStale: false,
          stalenessLevel: 'fresh'
        }
      ]
    },
    correctiveActions: []
  };
}

async function runScenario(scenario) {
  if (scenario === 'success') {
    return buildArtifactParseDiagnostics({
      stalenessResult: baseStalenessResult(),
      parseEvents: []
    });
  }

  if (scenario === 'retry-limit') {
    return buildArtifactParseDiagnostics({
      stalenessResult: baseStalenessResult(),
      parseEvents: [
        {
          artifactId: 'rollout-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
          parseStage: 'schema',
          errorType: 'schema',
          errorMessage: 'schema mismatch',
          line: 12,
          column: 2,
          retryCount: 3
        }
      ]
    });
  }

  if (scenario === 'dlq-required') {
    return buildArtifactParseDiagnostics({
      stalenessResult: baseStalenessResult(),
      parseEvents: [
        {
          artifactId: 'rollout-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
          parseStage: 'decode',
          errorType: 'encoding',
          errorMessage: 'encoding invalid',
          line: 1,
          column: 1,
          retryCount: 4
        }
      ]
    });
  }

  if (scenario === 'blocked-upstream') {
    return buildArtifactParseDiagnostics({
      stalenessResult: {
        allowed: false,
        reasonCode: 'EVENT_LEDGER_GAP_DETECTED',
        reason: 'Gap ledger détecté.',
        diagnostics: {
          sourceReasonCode: 'EVENT_LEDGER_GAP_DETECTED'
        },
        correctiveActions: ['REPAIR_EVENT_LEDGER_GAP']
      }
    });
  }

  return buildArtifactParseDiagnostics({});
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('runArtifactParseDiagnosticsScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('artifact parse diagnostics demo covers empty/loading/error/success with reason, counters, issues, recommendations, dlq and actions', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Diagnostiquer parse' });
  const stateIndicator = page.getByRole('status', { name: 'État parse diagnostics' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const reasonCodeValue = page.locator('#reason-code-value');
  const reasonValue = page.locator('#reason-value');
  const countsValue = page.locator('#counts-value');
  const issuesValue = page.locator('#issues-value');
  const recommendationsValue = page.locator('#recommendations-value');
  const dlqValue = page.locator('#dlq-value');
  const actionsValue = page.locator('#actions-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-input');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_PARSE_DIAGNOSTIC_INPUT');
  await expect(reasonValue).toContainText('Aucune source exploitable');
  await expect(countsValue).toContainText('checked=0 | errors=0 | retry=0 | dlq=0');

  await scenario.selectOption('blocked-upstream');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('EVENT_LEDGER_GAP_DETECTED');
  await expect(reasonValue).toContainText('Gap ledger');
  await expect(actionsValue).toContainText('REPAIR_EVENT_LEDGER_GAP');

  await scenario.selectOption('retry-limit');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('PARSE_RETRY_LIMIT_REACHED');
  await expect(reasonValue).toContainText('Limite de retry');
  await expect(issuesValue).toContainText('rollout-v1 => schema/schema retry=3');
  await expect(recommendationsValue).toContainText('rollout-v1 => SCHEDULE_PARSE_RETRY');
  await expect(actionsValue).toContainText('SCHEDULE_PARSE_RETRY');

  await scenario.selectOption('dlq-required');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('PARSE_DLQ_REQUIRED');
  await expect(reasonValue).toContainText('DLQ requis');
  await expect(dlqValue).toContainText('rollout-v1 => retry=4');
  await expect(actionsValue).toContainText('MOVE_TO_PARSE_DLQ');

  await scenario.selectOption('success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Diagnostic parse OK');
  await expect(countsValue).toContainText('checked=1 | errors=0 | retry=0 | dlq=0');
  await expect(issuesValue).toContainText('—');
  await expect(recommendationsValue).toContainText('—');
  await expect(dlqValue).toContainText('—');
  await expect(actionsValue).toContainText('—');
  await expect(successJson).toContainText('"allowed":true');
  await expect(errorMessage).toBeHidden();
  await expect(action).toBeEnabled();
});

test('artifact parse diagnostics demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
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
        await page.getByRole('button', { name: 'Diagnostiquer parse' }).click();

        await expect(page.getByRole('status', { name: 'État parse diagnostics' })).toHaveAttribute(
          'data-state',
          'success'
        );

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const reason = document.getElementById('reason-value');
          const counts = document.getElementById('counts-value');
          const issues = document.getElementById('issues-value');
          const recommendations = document.getElementById('recommendations-value');
          const dlq = document.getElementById('dlq-value');
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
            issues: computeOverflow(issues),
            recommendations: computeOverflow(recommendations),
            dlq: computeOverflow(dlq),
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
            overflow.issues,
            overflow.recommendations,
            overflow.dlq,
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
