import { expect, test } from '@playwright/test';
import { createGateConcernsAction } from '../../src/gate-concerns-actions.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Actions CONCERNS auto</title>
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
      #action-value,
      #policy-value,
      #history-value,
      #error-message,
      #success-json {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      #actions-list {
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
      <h1>Création automatique actions CONCERNS</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="assignment-invalid">Assignation CONCERNS invalide</option>
        <option value="policy-missing">Policy version manquante</option>
        <option value="history-missing">Historique incomplet</option>
        <option value="pass-no-action">PASS sans action</option>
        <option value="success">CONCERNS nominal</option>
      </select>

      <button id="run-action" type="button">Créer action CONCERNS</button>

      <p id="state-indicator" role="status" aria-label="État action concerns" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>concernsAction</dt><dd id="action-value">—</dd></div>
          <div><dt>policySnapshot</dt><dd id="policy-value">—</dd></div>
          <div><dt>historyEntry</dt><dd id="history-value">—</dd></div>
          <div>
            <dt>correctiveActions</dt>
            <dd><ul id="actions-list"><li>—</li></ul></dd>
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
      const diagValue = document.getElementById('diag-value');
      const actionValue = document.getElementById('action-value');
      const policyValue = document.getElementById('policy-value');
      const historyValue = document.getElementById('history-value');
      const actionsList = document.getElementById('actions-list');

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
        diagValue.textContent =
          'verdict=' + String(diagnostics.verdict ?? '—') +
          ' | concernsActionRequired=' + String(diagnostics.concernsActionRequired ?? '—') +
          ' | actionCreated=' + String(diagnostics.actionCreated ?? '—') +
          ' | p95=' + String(diagnostics.p95ActionMs ?? '—') +
          ' | source=' + String(diagnostics.sourceReasonCode ?? '—') +
          ' | policyVersion=' + String(diagnostics.policyVersion ?? '—');

        const concernsAction = result.concernsAction ?? {};
        actionValue.textContent =
          'created=' + String(concernsAction.actionCreated ?? '—') +
          ' | actionId=' + String(concernsAction.actionId ?? '—') +
          ' | gateId=' + String(concernsAction.gateId ?? '—') +
          ' | storyId=' + String(concernsAction.storyId ?? '—') +
          ' | assignee=' + String(concernsAction.assignee ?? '—') +
          ' | dueAt=' + String(concernsAction.dueAt ?? '—') +
          ' | status=' + String(concernsAction.status ?? '—');

        const policySnapshot = result.policySnapshot ?? {};
        policyValue.textContent =
          'scope=' + String(policySnapshot.policyScope ?? '—') +
          ' | version=' + String(policySnapshot.version ?? '—');

        const historyEntry = result.historyEntry ?? {};
        historyValue.textContent =
          'actionId=' + String(historyEntry.actionId ?? '—') +
          ' | policyVersion=' + String(historyEntry.policyVersion ?? '—') +
          ' | changedAt=' + String(historyEntry.changedAt ?? '—') +
          ' | changedBy=' + String(historyEntry.changedBy ?? '—') +
          ' | changeType=' + String(historyEntry.changeType ?? '—');

        renderList(actionsList, result.correctiveActions);
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 150));

          const result = await window.runConcernsScenarioRuntime(scenarioInput.value);
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

function primaryEvidenceResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Preuve primaire valide: décision de gate conforme.',
    diagnostics: {
      verdict: 'PASS',
      canMarkDone: true,
      evidenceCount: 1,
      concernsActionRequired: false,
      durationMs: 5,
      p95ValidationMs: 1,
      sourceReasonCode: 'OK'
    },
    primaryEvidence: {
      required: true,
      valid: true,
      count: 1,
      minRequired: 1,
      refs: ['proof-1']
    },
    concernsAction: {
      required: false,
      valid: true,
      assignee: null,
      dueAt: null,
      status: null
    },
    correctiveActions: [],
    ...overrides
  };
}

async function runScenario(scenario) {
  if (scenario === 'success') {
    return createGateConcernsAction(
      {
        primaryEvidenceResult: primaryEvidenceResult({
          diagnostics: {
            ...primaryEvidenceResult().diagnostics,
            verdict: 'CONCERNS',
            canMarkDone: false,
            concernsActionRequired: true,
            sourceReasonCode: 'GATE_VERDICT_CONCERNS'
          },
          concernsAction: {
            required: true,
            valid: true,
            assignee: 'qa-owner',
            dueAt: '2026-03-03T10:00:00.000Z',
            status: 'OPEN'
          }
        }),
        concernsAction: {
          assignee: 'qa-owner',
          dueAt: '2026-03-03T10:00:00.000Z',
          gateId: 'G4-UX',
          storyId: 'S030'
        },
        policySnapshot: {
          policyScope: 'gate',
          version: 'gate-policy-v3'
        },
        changedBy: 'dev-bot'
      },
      {
        actionIdGenerator: () => 'act-001',
        nowMs: () => Date.parse('2026-02-24T04:12:00.000Z')
      }
    );
  }

  if (scenario === 'assignment-invalid') {
    return createGateConcernsAction({
      primaryEvidenceResult: primaryEvidenceResult({
        diagnostics: {
          ...primaryEvidenceResult().diagnostics,
          verdict: 'CONCERNS',
          canMarkDone: false,
          concernsActionRequired: true
        }
      }),
      concernsAction: {
        assignee: '   ',
        status: 'OPEN'
      },
      policySnapshot: {
        policyScope: 'gate',
        version: 'gate-policy-v3'
      }
    });
  }

  if (scenario === 'policy-missing') {
    return createGateConcernsAction({
      primaryEvidenceResult: primaryEvidenceResult({
        diagnostics: {
          ...primaryEvidenceResult().diagnostics,
          verdict: 'CONCERNS',
          canMarkDone: false,
          concernsActionRequired: true
        }
      }),
      concernsAction: {
        assignee: 'qa-owner',
        dueAt: '2026-03-03T10:00:00.000Z',
        status: 'OPEN'
      },
      policySnapshot: {
        policyScope: 'gate',
        version: ' '
      }
    });
  }

  if (scenario === 'history-missing') {
    return createGateConcernsAction({
      primaryEvidenceResult: primaryEvidenceResult({
        diagnostics: {
          ...primaryEvidenceResult().diagnostics,
          verdict: 'CONCERNS',
          canMarkDone: false,
          concernsActionRequired: true
        }
      }),
      concernsAction: {
        assignee: 'qa-owner',
        dueAt: '2026-03-03T10:00:00.000Z',
        status: 'OPEN'
      },
      policySnapshot: {
        policyScope: 'gate',
        version: 'gate-policy-v3'
      },
      historyEntry: {
        changeType: 'INVALID'
      }
    });
  }

  if (scenario === 'pass-no-action') {
    return createGateConcernsAction({
      primaryEvidenceResult: primaryEvidenceResult(),
      policySnapshot: {
        policyScope: 'gate',
        version: 'gate-policy-v3'
      }
    });
  }

  return createGateConcernsAction({});
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('runConcernsScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('concerns actions demo covers empty/loading/error/success and required output fields', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Créer action CONCERNS' });
  const stateIndicator = page.getByRole('status', { name: 'État action concerns' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const reasonCodeValue = page.locator('#reason-code-value');
  const reasonValue = page.locator('#reason-value');
  const diagValue = page.locator('#diag-value');
  const actionValue = page.locator('#action-value');
  const policyValue = page.locator('#policy-value');
  const historyValue = page.locator('#history-value');
  const actionsList = page.locator('#actions-list');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-input');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_CONCERNS_ACTION_INPUT');
  await expect(reasonValue).toContainText('Aucune source exploitable');

  await scenario.selectOption('assignment-invalid');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('CONCERNS_ACTION_ASSIGNMENT_INVALID');
  await expect(actionsList).toContainText('ASSIGN_CONCERNS_OWNER');
  await expect(actionsList).toContainText('SET_CONCERNS_DUE_DATE');

  await scenario.selectOption('policy-missing');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('GATE_POLICY_VERSION_MISSING');
  await expect(policyValue).toContainText('scope=gate | version=—');
  await expect(actionsList).toContainText('LINK_GATE_POLICY_VERSION');

  await scenario.selectOption('history-missing');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('CONCERNS_ACTION_HISTORY_INCOMPLETE');
  await expect(historyValue).toContainText('changeType=—');
  await expect(actionsList).toContainText('COMPLETE_CONCERNS_ACTION_HISTORY');

  await scenario.selectOption('pass-no-action');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(diagValue).toContainText('verdict=PASS | concernsActionRequired=false | actionCreated=false');
  await expect(actionValue).toContainText('created=false | actionId=—');

  await scenario.selectOption('success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Action CONCERNS créée automatiquement');
  await expect(diagValue).toContainText('verdict=CONCERNS | concernsActionRequired=true | actionCreated=true | p95=');
  await expect(actionValue).toContainText('created=true | actionId=act-001 | gateId=G4-UX | storyId=S030 | assignee=qa-owner | dueAt=2026-03-03T10:00:00.000Z | status=OPEN');
  await expect(policyValue).toContainText('scope=gate | version=gate-policy-v3');
  await expect(historyValue).toContainText('actionId=act-001 | policyVersion=gate-policy-v3 | changedAt=2026-02-24T04:12:00.000Z | changedBy=dev-bot | changeType=CREATE');
  await expect(actionsList).toContainText('TRACK_CONCERNS_ACTION');
  await expect(successJson).toContainText('"allowed":true');
  await expect(errorMessage).toBeHidden();
  await expect(action).toBeEnabled();
});

test('concerns actions demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
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
        await page.getByRole('button', { name: 'Créer action CONCERNS' }).click();

        await expect(page.getByRole('status', { name: 'État action concerns' })).toHaveAttribute(
          'data-state',
          'success'
        );

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const reason = document.getElementById('reason-value');
          const diag = document.getElementById('diag-value');
          const action = document.getElementById('action-value');
          const policy = document.getElementById('policy-value');
          const history = document.getElementById('history-value');
          const corrections = document.getElementById('actions-list');
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
            diag: computeOverflow(diag),
            action: computeOverflow(action),
            policy: computeOverflow(policy),
            history: computeOverflow(history),
            corrections: computeOverflow(corrections),
            error: computeOverflow(error),
            success: computeOverflow(success)
          };
        });

        expect(
          Math.max(
            overflow.document,
            overflow.body,
            overflow.reason,
            overflow.diag,
            overflow.action,
            overflow.policy,
            overflow.history,
            overflow.corrections,
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
