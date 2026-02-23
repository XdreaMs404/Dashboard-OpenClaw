import { expect, test } from '@playwright/test';
import { buildArtifactStalenessIndicator } from '../../src/artifact-staleness-indicator.js';

const ALLOWLIST_ROOT =
  '/root/.openclaw/workspace/projects/dashboard-openclaw/_bmad-output/planning-artifacts';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Indicateur de fraîcheur/staleness des vues</title>
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
      #board-value,
      #decision-value,
      #actions-value,
      #error-message,
      #success-json {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      #board-value,
      #decision-value,
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
      <h1>Indicateur de fraîcheur/staleness</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="blocked-upstream">Blocage amont</option>
        <option value="ledger-gap">Gap ledger</option>
        <option value="stale">Staleness détecté</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-action" type="button">Calculer staleness</button>

      <p id="state-indicator" role="status" aria-label="État staleness" aria-live="polite" data-state="empty">
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
            <dt>stalenessBoard</dt>
            <dd><ul id="board-value"><li>—</li></ul></dd>
          </div>
          <div>
            <dt>decisionFreshness</dt>
            <dd><ul id="decision-value"><li>—</li></ul></dd>
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
      const boardValue = document.getElementById('board-value');
      const decisionValue = document.getElementById('decision-value');
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
          'artifacts=' + String(diagnostics.artifactsCount ?? '—') +
          ' | stale=' + String(diagnostics.staleCount ?? '—') +
          ' | ratio=' + String(diagnostics.staleRatio ?? '—') +
          ' | maxAge=' + String(diagnostics.maxAgeSeconds ?? '—');

        const boardEntries = (result.stalenessBoard?.artifacts ?? []).map((entry) => {
          return (
            entry.artifactId +
            ' => stale=' + String(entry.isStale) +
            ' age=' + String(entry.ageSeconds) +
            ' level=' + String(entry.stalenessLevel)
          );
        });

        const decisionEntries = Object.entries(result.decisionFreshness ?? {}).map(([decisionId, artifacts]) => {
          const ids = (artifacts ?? []).map((entry) => entry.artifactId).join(',');
          return decisionId + ' => ' + ids;
        });

        renderList(boardValue, boardEntries);
        renderList(decisionValue, decisionEntries);
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

          const result = await window.runArtifactStalenessScenarioRuntime(scenarioInput.value);
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
            successJson.hidden = result.reasonCode !== 'ARTIFACT_STALENESS_DETECTED';
            successJson.textContent = result.reasonCode === 'ARTIFACT_STALENESS_DETECTED' ? JSON.stringify(result) : '';
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

function baseGraph() {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'graph ok',
    diagnostics: {
      sourceReasonCode: 'OK'
    },
    graph: {
      nodes: [
        {
          nodeId: 'artifact:rollout-v1',
          nodeType: 'artifact',
          artifactId: 'rollout-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
          artifactType: 'prd',
          updatedAt: '2026-02-23T12:00:00.000Z'
        },
        {
          nodeId: 'artifact:rollout-v2',
          nodeType: 'artifact',
          artifactId: 'rollout-v2',
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v2.md`,
          artifactType: 'prd',
          updatedAt: '2026-02-23T12:10:00.000Z'
        }
      ],
      edges: [],
      clusters: []
    },
    decisionBacklinks: {
      'DEC-1': [
        {
          artifactId: 'rollout-v1',
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v1.md`,
          artifactType: 'prd',
          updatedAt: '2026-02-23T12:00:00.000Z'
        },
        {
          artifactId: 'rollout-v2',
          artifactPath: `${ALLOWLIST_ROOT}/reports/rollout-v2.md`,
          artifactType: 'prd',
          updatedAt: '2026-02-23T12:10:00.000Z'
        }
      ]
    },
    orphanEvidence: [],
    correctiveActions: []
  };
}

async function runScenario(scenario) {
  const nowMs = () => new Date('2026-02-23T12:30:00.000Z').getTime();

  if (scenario === 'success') {
    return buildArtifactStalenessIndicator(
      {
        evidenceGraphResult: baseGraph(),
        maxAgeSeconds: 3600,
        artifactTimestamps: {
          'rollout-v1': '2026-02-23T12:00:00.000Z',
          'rollout-v2': '2026-02-23T12:10:00.000Z'
        },
        eventLedger: [100, 101, 102]
      },
      { nowMs }
    );
  }

  if (scenario === 'stale') {
    return buildArtifactStalenessIndicator(
      {
        evidenceGraphResult: baseGraph(),
        maxAgeSeconds: 600,
        artifactTimestamps: {
          'rollout-v1': '2026-02-23T10:00:00.000Z',
          'rollout-v2': '2026-02-23T12:10:00.000Z'
        },
        eventLedger: [100, 101, 102]
      },
      { nowMs }
    );
  }

  if (scenario === 'ledger-gap') {
    return buildArtifactStalenessIndicator(
      {
        evidenceGraphResult: baseGraph(),
        eventLedger: [100, 101, 103]
      },
      { nowMs }
    );
  }

  if (scenario === 'blocked-upstream') {
    return buildArtifactStalenessIndicator({
      evidenceGraphResult: {
        allowed: false,
        reasonCode: 'EVIDENCE_LINK_INCOMPLETE',
        reason: 'Graph incomplet.',
        diagnostics: {
          sourceReasonCode: 'EVIDENCE_LINK_INCOMPLETE'
        },
        correctiveActions: ['LINK_OR_RESTORE_EVIDENCE']
      }
    });
  }

  return buildArtifactStalenessIndicator({});
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('runArtifactStalenessScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('artifact staleness demo covers empty/loading/error/success with reason, counters, stale badges and actions', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Calculer staleness' });
  const stateIndicator = page.getByRole('status', { name: 'État staleness' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const reasonCodeValue = page.locator('#reason-code-value');
  const reasonValue = page.locator('#reason-value');
  const countsValue = page.locator('#counts-value');
  const boardValue = page.locator('#board-value');
  const decisionValue = page.locator('#decision-value');
  const actionsValue = page.locator('#actions-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-input');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_STALENESS_INPUT');
  await expect(reasonValue).toContainText('Aucune source exploitable');
  await expect(countsValue).toContainText('artifacts=0 | stale=0 | ratio=0 | maxAge=3600');

  await scenario.selectOption('blocked-upstream');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('EVIDENCE_LINK_INCOMPLETE');
  await expect(reasonValue).toContainText('Graph incomplet');
  await expect(actionsValue).toContainText('LINK_OR_RESTORE_EVIDENCE');

  await scenario.selectOption('ledger-gap');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('EVENT_LEDGER_GAP_DETECTED');
  await expect(reasonValue).toContainText('Gap ledger');
  await expect(actionsValue).toContainText('REPAIR_EVENT_LEDGER_GAP');

  await scenario.selectOption('stale');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('ARTIFACT_STALENESS_DETECTED');
  await expect(reasonValue).toContainText('Staleness détecté');
  await expect(boardValue).toContainText('rollout-v1 => stale=true');
  await expect(actionsValue).toContainText('REFRESH_STALE_ARTIFACTS');
  await expect(successJson).toContainText('"ARTIFACT_STALENESS_DETECTED"');

  await scenario.selectOption('success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Staleness check OK');
  await expect(countsValue).toContainText('artifacts=2 | stale=0 | ratio=0 | maxAge=3600');
  await expect(boardValue).toContainText('rollout-v1 => stale=false');
  await expect(decisionValue).toContainText('DEC-1 => rollout-v1,rollout-v2');
  await expect(actionsValue).toContainText('—');
  await expect(successJson).toContainText('"allowed":true');
  await expect(errorMessage).toBeHidden();
  await expect(action).toBeEnabled();
});

test('artifact staleness demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
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
        await page.getByRole('button', { name: 'Calculer staleness' }).click();

        await expect(page.getByRole('status', { name: 'État staleness' })).toHaveAttribute(
          'data-state',
          'success'
        );

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const reason = document.getElementById('reason-value');
          const counts = document.getElementById('counts-value');
          const board = document.getElementById('board-value');
          const decision = document.getElementById('decision-value');
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
            board: computeOverflow(board),
            decision: computeOverflow(decision),
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
            overflow.board,
            overflow.decision,
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
