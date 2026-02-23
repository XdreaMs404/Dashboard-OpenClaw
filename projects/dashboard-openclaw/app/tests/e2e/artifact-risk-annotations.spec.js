import { expect, test } from '@playwright/test';
import { annotateArtifactRiskContext } from '../../src/artifact-risk-annotations.js';

const ALLOWLIST_ROOT =
  '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Tags risques et annotations contextuelles</title>
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
      #tagged-value,
      #annotations-value,
      #catalog-value,
      #actions-value,
      #error-message,
      #success-json {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      #tagged-value,
      #annotations-value,
      #catalog-value,
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
      <h1>Annotations de risques artefacts</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="blocked-upstream">Blocage amont</option>
        <option value="missing-tags">Risk tags manquants</option>
        <option value="conflict">Conflit annotation</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-action" type="button">Annoter risques</button>

      <p id="state-indicator" role="status" aria-label="État risk annotations" aria-live="polite" data-state="empty">
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
            <dt>taggedArtifacts</dt>
            <dd><ul id="tagged-value"><li>—</li></ul></dd>
          </div>
          <div>
            <dt>contextAnnotations</dt>
            <dd><ul id="annotations-value"><li>—</li></ul></dd>
          </div>
          <div>
            <dt>riskTagCatalog</dt>
            <dd><ul id="catalog-value"><li>—</li></ul></dd>
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
      const taggedValue = document.getElementById('tagged-value');
      const annotationsValue = document.getElementById('annotations-value');
      const catalogValue = document.getElementById('catalog-value');
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
          'tagged=' + String(diagnostics.artifactsTaggedCount ?? '—') +
          ' | annotations=' + String(diagnostics.annotationsCount ?? '—') +
          ' | highRisk=' + String(diagnostics.highRiskCount ?? '—') +
          ' | retryLimited=' + String(diagnostics.retryLimitedCount ?? '—') +
          ' | dlq=' + String(diagnostics.dlqCount ?? '—');

        const taggedEntries = (result.taggedArtifacts ?? []).map((artifact) => {
          const tags = Array.isArray(artifact.riskTags) ? artifact.riskTags.join(',') : '';
          return artifact.artifactId + ' => severity=' + artifact.severity + ' tags=' + tags;
        });

        const annotationEntries = (result.contextAnnotations ?? []).map((annotation) => {
          return annotation.artifactId + ' => ' + annotation.parseStage + '/' + annotation.errorType;
        });

        const catalogEntries = (result.riskTagCatalog ?? []).map((entry) => {
          return entry.riskTag + ' => count=' + String(entry.count) + ' max=' + String(entry.highestSeverity);
        });

        renderList(taggedValue, taggedEntries);
        renderList(annotationsValue, annotationEntries);
        renderList(catalogValue, catalogEntries);
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

          const result = await window.runArtifactRiskAnnotationsScenarioRuntime(scenarioInput.value);
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

function parseDiagnosticsResultNominal() {
  return {
    allowed: true,
    reasonCode: 'ARTIFACT_PARSE_FAILED',
    reason: 'Parse errors détectés.',
    diagnostics: {
      sourceReasonCode: 'OK'
    },
    parseIssues: [
      {
        issueId: 'issue-1',
        artifactId: 'rollout-v1',
        artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
        artifactType: 'prd',
        parseStage: 'frontmatter',
        errorType: 'frontmatter',
        errorMessage: 'frontmatter invalide',
        retryCount: 1,
        recommendedFix: 'Corriger le frontmatter',
        stalenessContext: {
          isStale: false,
          ageSeconds: 60,
          stalenessLevel: 'fresh'
        }
      },
      {
        issueId: 'issue-2',
        artifactId: 'rollout-v2',
        artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v2.md`,
        artifactType: 'prd',
        parseStage: 'schema',
        errorType: 'schema',
        errorMessage: 'schema mismatch',
        retryCount: 3,
        recommendedFix: 'Aligner le schéma',
        stalenessContext: {
          isStale: true,
          ageSeconds: 4800,
          stalenessLevel: 'critical'
        }
      }
    ],
    recommendations: [
      {
        artifactId: 'rollout-v1',
        action: 'SCHEDULE_PARSE_RETRY'
      },
      {
        artifactId: 'rollout-v2',
        action: 'SCHEDULE_PARSE_RETRY'
      }
    ],
    dlqCandidates: [
      {
        artifactId: 'rollout-v2',
        retryCount: 3,
        maxRetries: 3
      }
    ],
    correctiveActions: ['SCHEDULE_PARSE_RETRY']
  };
}

async function runScenario(scenario) {
  if (scenario === 'success') {
    return annotateArtifactRiskContext({
      parseDiagnosticsResult: parseDiagnosticsResultNominal()
    });
  }

  if (scenario === 'missing-tags') {
    return annotateArtifactRiskContext({
      parseDiagnosticsResult: {
        ...parseDiagnosticsResultNominal(),
        parseIssues: [
          {
            issueId: 'critical-1',
            artifactId: 'critical-v1',
            artifactPath: `${ALLOWLIST_ROOT}/reports/critical-v1.md`,
            parseStage: 'schema',
            errorType: 'schema',
            retryCount: 4,
            recommendedFix: 'Corriger schema'
          }
        ],
        recommendations: [],
        dlqCandidates: []
      },
      taggedArtifacts: [
        {
          artifactId: 'critical-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/critical-v1.md`,
          artifactType: 'prd',
          sourceIssueIds: ['critical-1'],
          riskTags: [],
          severity: 'critical',
          ownerHint: 'owner-risk'
        }
      ],
      contextAnnotations: []
    });
  }

  if (scenario === 'conflict') {
    return annotateArtifactRiskContext({
      parseDiagnosticsResult: {
        ...parseDiagnosticsResultNominal(),
        parseIssues: [
          {
            issueId: 'conflict-1',
            artifactId: 'conflict-v1',
            artifactPath: `${ALLOWLIST_ROOT}/reports/conflict-v1.md`,
            parseStage: 'markdown',
            errorType: 'syntax',
            retryCount: 1,
            recommendedFix: 'Fix conflict'
          }
        ],
        recommendations: [],
        dlqCandidates: []
      },
      taggedArtifacts: [
        {
          artifactId: 'conflict-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/conflict-v1.md`,
          artifactType: 'prd',
          sourceIssueIds: ['conflict-1'],
          riskTags: ['T01'],
          severity: 'high',
          ownerHint: 'owner-conflict'
        }
      ],
      contextAnnotations: [
        {
          annotationId: 'ann-conflict',
          artifactId: 'conflict-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/conflict-v1.md`,
          issueId: 'conflict-1',
          parseStage: 'markdown',
          errorType: 'syntax',
          recommendedFix: 'Fix conflict',
          what: 'Conflit de tags',
          why: 'Tag annotation absent du tag artefact',
          nextAction: 'Aligner les tags',
          severity: 'high',
          ownerHint: 'owner-conflict',
          riskTags: ['T02']
        }
      ]
    });
  }

  if (scenario === 'blocked-upstream') {
    return annotateArtifactRiskContext({
      parseDiagnosticsResult: {
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

  return annotateArtifactRiskContext({});
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('runArtifactRiskAnnotationsScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('artifact risk annotations demo covers empty/loading/error/success with reason, counters, tags, annotations, catalog and actions', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Annoter risques' });
  const stateIndicator = page.getByRole('status', { name: 'État risk annotations' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const reasonCodeValue = page.locator('#reason-code-value');
  const reasonValue = page.locator('#reason-value');
  const countsValue = page.locator('#counts-value');
  const taggedValue = page.locator('#tagged-value');
  const annotationsValue = page.locator('#annotations-value');
  const catalogValue = page.locator('#catalog-value');
  const actionsValue = page.locator('#actions-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-input');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_RISK_ANNOTATION_INPUT');
  await expect(reasonValue).toContainText('Aucune source exploitable');
  await expect(countsValue).toContainText('tagged=0 | annotations=0 | highRisk=0 | retryLimited=0 | dlq=0');

  await scenario.selectOption('blocked-upstream');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('EVENT_LEDGER_GAP_DETECTED');
  await expect(reasonValue).toContainText('Gap ledger');
  await expect(actionsValue).toContainText('REPAIR_EVENT_LEDGER_GAP');

  await scenario.selectOption('missing-tags');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('RISK_TAGS_MISSING');
  await expect(reasonValue).toContainText('aucun riskTag');
  await expect(actionsValue).toContainText('ADD_RISK_TAGS');

  await scenario.selectOption('conflict');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('RISK_ANNOTATION_CONFLICT');
  await expect(reasonValue).toContainText('Conflit de contexte');
  await expect(actionsValue).toContainText('RESOLVE_RISK_ANNOTATION_CONFLICT');

  await scenario.selectOption('success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Annotations risque générées');
  await expect(countsValue).toContainText('tagged=2 | annotations=2 | highRisk=1 | retryLimited=1 | dlq=1');
  await expect(taggedValue).toContainText('rollout-v1 => severity=medium tags=T01,T02');
  await expect(taggedValue).toContainText('rollout-v2 => severity=high tags=NFR016,NFR038,P02,T01,T02');
  await expect(annotationsValue).toContainText('rollout-v1 => frontmatter/frontmatter');
  await expect(annotationsValue).toContainText('rollout-v2 => schema/schema');
  await expect(catalogValue).toContainText('T01 => count=4 max=high');
  await expect(catalogValue).toContainText('NFR016 => count=2 max=high');
  await expect(actionsValue).toContainText('—');
  await expect(successJson).toContainText('"allowed":true');
  await expect(errorMessage).toBeHidden();
  await expect(action).toBeEnabled();
});

test('artifact risk annotations demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
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
        await page.getByRole('button', { name: 'Annoter risques' }).click();

        await expect(page.getByRole('status', { name: 'État risk annotations' })).toHaveAttribute(
          'data-state',
          'success'
        );

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const reason = document.getElementById('reason-value');
          const counts = document.getElementById('counts-value');
          const tagged = document.getElementById('tagged-value');
          const annotations = document.getElementById('annotations-value');
          const catalog = document.getElementById('catalog-value');
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
            tagged: computeOverflow(tagged),
            annotations: computeOverflow(annotations),
            catalog: computeOverflow(catalog),
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
            overflow.tagged,
            overflow.annotations,
            overflow.catalog,
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
