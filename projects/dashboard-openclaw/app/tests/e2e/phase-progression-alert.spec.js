import { expect, test } from '@playwright/test';
import { evaluatePhaseProgressionAlert } from '../../src/phase-progression-alert.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Alerte progression BMAD</title>
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
      #owner-value,
      #anomalies-value,
      #actions-value,
      #error-message,
      #success-json,
      #alert-value,
      #severity-value {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      #anomalies-value,
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
      <h1>Alerte anomalies progression de phase</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Payload invalide</option>
        <option value="dependency-blocked">Blocage dépendances propagé</option>
        <option value="sequence-gap">Saut de séquence</option>
        <option value="sequence-regression">Régression de séquence</option>
        <option value="repeated-blocking">Récurrence de blocages</option>
        <option value="stale">Dépendances stale</option>
        <option value="nominal">Nominal</option>
      </select>

      <button id="run-action" type="button">Évaluer alerte</button>

      <p id="state-indicator" role="status" aria-label="État alerte progression" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>alert.active</dt><dd id="alert-value">—</dd></div>
          <div><dt>alert.severity</dt><dd id="severity-value">—</dd></div>
          <div><dt>owner</dt><dd id="owner-value">—</dd></div>
          <div>
            <dt>anomalies</dt>
            <dd>
              <ul id="anomalies-value"><li>—</li></ul>
            </dd>
          </div>
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
      const alertValue = document.getElementById('alert-value');
      const severityValue = document.getElementById('severity-value');
      const ownerValue = document.getElementById('owner-value');
      const anomaliesValue = document.getElementById('anomalies-value');
      const actionsValue = document.getElementById('actions-value');

      const setState = (state) => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;
      };

      const renderList = (container, values, formatter) => {
        container.textContent = '';

        if (!Array.isArray(values) || values.length === 0) {
          const item = document.createElement('li');
          item.textContent = '—';
          container.appendChild(item);
          return;
        }

        for (const value of values) {
          const item = document.createElement('li');
          item.textContent = formatter ? formatter(value) : String(value);
          container.appendChild(item);
        }
      };

      const renderResult = (result) => {
        reasonCodeValue.textContent = result.reasonCode;
        reasonValue.textContent = result.reason;
        alertValue.textContent = String(result.alert?.active ?? '—');
        severityValue.textContent = result.alert?.severity ?? '—';
        ownerValue.textContent = result.diagnostics?.owner ?? '—';

        renderList(anomaliesValue, result.anomalies, (value) => value.code);
        renderList(actionsValue, result.correctiveActions, (value) => value);
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 150));

          const result = await window.evaluatePhaseProgressionScenarioRuntime(scenarioInput.value);
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
  if (scenario === 'nominal') {
    return evaluatePhaseProgressionAlert({
      dependencyMatrix: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Matrice de dépendances prête pour owner=ops.lead: aucun blocage actif.',
        diagnostics: {
          fromPhase: 'H09',
          toPhase: 'H10',
          owner: 'ops.lead',
          sourceReasonCode: 'OK',
          snapshotAgeMs: 160,
          isStale: false
        },
        blockingDependencies: [],
        correctiveActions: []
      },
      historyEntries: []
    });
  }

  if (scenario === 'stale') {
    return evaluatePhaseProgressionAlert({
      dependencyMatrix: {
        allowed: false,
        reasonCode: 'DEPENDENCY_STATE_STALE',
        reason:
          'Matrice de dépendances stale pour owner=ops.lead: snapshotAgeMs=6800 > maxRefreshIntervalMs=5000.',
        diagnostics: {
          fromPhase: 'H09',
          toPhase: 'H10',
          owner: 'ops.lead',
          sourceReasonCode: 'OK',
          snapshotAgeMs: 6800,
          isStale: true
        },
        blockingDependencies: [
          {
            id: 'FRESHNESS',
            reasonCode: 'DEPENDENCY_STATE_STALE',
            reason: 'Snapshot stale',
            owner: 'ops.lead'
          }
        ],
        correctiveActions: ['REFRESH_DEPENDENCY_MATRIX']
      }
    });
  }

  if (scenario === 'repeated-blocking') {
    return evaluatePhaseProgressionAlert({
      dependencyMatrix: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Matrice de dépendances prête pour owner=ops.lead: aucun blocage actif.',
        diagnostics: {
          fromPhase: 'H09',
          toPhase: 'H10',
          owner: 'ops.lead',
          sourceReasonCode: 'OK',
          snapshotAgeMs: 210,
          isStale: false
        },
        blockingDependencies: [],
        correctiveActions: []
      },
      lookbackEntries: 5,
      escalationThreshold: 3,
      historyEntries: [
        {
          fromPhase: 'H08',
          toPhase: 'H09',
          allowed: false,
          reasonCode: 'PHASE_PREREQUISITES_INCOMPLETE',
          reason: 'Blocage 1',
          timestamp: '2026-02-21T15:05:00.000Z'
        },
        {
          fromPhase: 'H08',
          toPhase: 'H09',
          allowed: false,
          reasonCode: 'PHASE_NOTIFICATION_MISSING',
          reason: 'Blocage 2',
          timestamp: '2026-02-21T15:04:00.000Z'
        },
        {
          fromPhase: 'H08',
          toPhase: 'H09',
          allowed: false,
          reasonCode: 'TRANSITION_NOT_ALLOWED',
          reason: 'Blocage 3',
          timestamp: '2026-02-21T15:03:00.000Z'
        },
        {
          fromPhase: 'H07',
          toPhase: 'H08',
          allowed: true,
          reasonCode: 'OK',
          reason: 'Nominal',
          timestamp: '2026-02-21T15:02:00.000Z'
        }
      ]
    });
  }

  if (scenario === 'sequence-regression') {
    return evaluatePhaseProgressionAlert({
      dependencyMatrix: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Matrice de dépendances prête pour owner=ops.lead: aucun blocage actif.',
        diagnostics: {
          fromPhase: 'H10',
          toPhase: 'H09',
          owner: 'ops.lead',
          sourceReasonCode: 'OK',
          snapshotAgeMs: 150,
          isStale: false
        },
        blockingDependencies: [],
        correctiveActions: []
      }
    });
  }

  if (scenario === 'sequence-gap') {
    return evaluatePhaseProgressionAlert({
      dependencyMatrix: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Matrice de dépendances prête pour owner=ops.lead: aucun blocage actif.',
        diagnostics: {
          fromPhase: 'H09',
          toPhase: 'H11',
          owner: 'ops.lead',
          sourceReasonCode: 'OK',
          snapshotAgeMs: 130,
          isStale: false
        },
        blockingDependencies: [],
        correctiveActions: []
      }
    });
  }

  if (scenario === 'dependency-blocked') {
    return evaluatePhaseProgressionAlert({
      dependencyMatrix: {
        allowed: false,
        reasonCode: 'TRANSITION_NOT_ALLOWED',
        reason: 'Transition bloquée pour owner=alex.pm: Transition non autorisée H09 -> H11.',
        diagnostics: {
          fromPhase: 'H09',
          toPhase: 'H11',
          owner: 'alex.pm',
          sourceReasonCode: 'TRANSITION_NOT_ALLOWED',
          snapshotAgeMs: 220,
          isStale: false
        },
        blockingDependencies: [
          {
            id: 'TRANSITION',
            reasonCode: 'TRANSITION_NOT_ALLOWED',
            reason: 'Transition non autorisée H09 -> H11.',
            owner: 'alex.pm'
          }
        ],
        correctiveActions: ['ALIGN_PHASE_SEQUENCE']
      }
    });
  }

  return evaluatePhaseProgressionAlert({
    historyEntries: []
  });
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('evaluatePhaseProgressionScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('phase progression alert demo covers empty/loading/error/success and explicit alert context', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Évaluer alerte' });
  const stateIndicator = page.getByRole('status', { name: 'État alerte progression' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const reasonCodeValue = page.locator('#reason-code-value');
  const reasonValue = page.locator('#reason-value');
  const alertValue = page.locator('#alert-value');
  const severityValue = page.locator('#severity-value');
  const ownerValue = page.locator('#owner-value');
  const anomaliesValue = page.locator('#anomalies-value');
  const actionsValue = page.locator('#actions-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-input');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_PHASE_PROGRESSION_INPUT');
  await expect(reasonValue).toContainText('dependencyMatrix ou dependencyMatrixInput est requis');
  await expect(alertValue).toHaveText('false');
  await expect(severityValue).toHaveText('info');
  await expect(ownerValue).toHaveText('—');
  await expect(anomaliesValue).toContainText('—');
  await expect(actionsValue).toContainText('—');

  await scenario.selectOption('dependency-blocked');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('TRANSITION_NOT_ALLOWED');
  await expect(reasonValue).toContainText('owner=alex.pm');
  await expect(alertValue).toHaveText('true');
  await expect(severityValue).toHaveText('warning');
  await expect(ownerValue).toHaveText('alex.pm');
  await expect(anomaliesValue).toContainText('—');
  await expect(actionsValue).toContainText('ALIGN_PHASE_SEQUENCE');

  await scenario.selectOption('sequence-gap');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('PHASE_SEQUENCE_GAP_DETECTED');
  await expect(reasonValue).toContainText('fromPhase=H09');
  await expect(alertValue).toHaveText('true');
  await expect(severityValue).toHaveText('warning');
  await expect(anomaliesValue).toContainText('PHASE_SEQUENCE_GAP_DETECTED');
  await expect(actionsValue).toContainText('REVIEW_PHASE_SEQUENCE');

  await scenario.selectOption('sequence-regression');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('PHASE_SEQUENCE_REGRESSION_DETECTED');
  await expect(reasonValue).toContainText('indexDiff=-1');
  await expect(anomaliesValue).toContainText('PHASE_SEQUENCE_REGRESSION_DETECTED');
  await expect(actionsValue).toContainText('ROLLBACK_TO_CANONICAL_PHASE');

  await scenario.selectOption('repeated-blocking');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('REPEATED_BLOCKING_ANOMALY');
  await expect(alertValue).toHaveText('true');
  await expect(severityValue).toHaveText('critical');
  await expect(ownerValue).toHaveText('ops.lead');
  await expect(anomaliesValue).toContainText('REPEATED_BLOCKING_ANOMALY');
  await expect(actionsValue).toContainText('ESCALATE_TO_PM');

  await scenario.selectOption('stale');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('DEPENDENCY_STATE_STALE');
  await expect(reasonValue).toContainText('snapshotAgeMs=6800');
  await expect(alertValue).toHaveText('true');
  await expect(severityValue).toHaveText('warning');
  await expect(anomaliesValue).toContainText('DEPENDENCY_STATE_STALE');
  await expect(actionsValue).toContainText('REFRESH_DEPENDENCY_MATRIX');

  await scenario.selectOption('nominal');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Progression canonique valide');
  await expect(alertValue).toHaveText('false');
  await expect(severityValue).toHaveText('info');
  await expect(ownerValue).toHaveText('ops.lead');
  await expect(anomaliesValue).toContainText('—');
  await expect(actionsValue).toContainText('—');
  await expect(successJson).toContainText('"allowed":true');
  await expect(action).toBeEnabled();
});

test('phase progression alert demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
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

        await page.getByLabel('Scénario').selectOption('repeated-blocking');
        await page.getByRole('button', { name: 'Évaluer alerte' }).click();

        await expect(page.getByRole('status', { name: 'État alerte progression' })).toHaveAttribute(
          'data-state',
          'error'
        );

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const reason = document.getElementById('reason-value');
          const alert = document.getElementById('alert-value');
          const severity = document.getElementById('severity-value');
          const owner = document.getElementById('owner-value');
          const anomalies = document.getElementById('anomalies-value');
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
            alert: computeOverflow(alert),
            severity: computeOverflow(severity),
            owner: computeOverflow(owner),
            anomalies: computeOverflow(anomalies),
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
            overflow.alert,
            overflow.severity,
            overflow.owner,
            overflow.anomalies,
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
