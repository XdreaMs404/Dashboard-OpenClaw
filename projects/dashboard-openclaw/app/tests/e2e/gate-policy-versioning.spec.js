import { expect, test } from '@playwright/test';
import { versionGatePolicy } from '../../src/gate-policy-versioning.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Versioning policy gate</title>
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
        width: min(100%, 74rem);
      }

      #reason-value,
      #diag-value,
      #policy-value,
      #sim-value,
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
      <h1>Versioning policy et simulation pré-soumission</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="policy-missing">Policy version manquante</option>
        <option value="policy-stale">Policy version stale/inactive</option>
        <option value="simulation-invalid">Simulation invalide</option>
        <option value="success">Nominal policy + simulation</option>
      </select>

      <button id="run-action" type="button">Versionner policy gate</button>

      <p id="state-indicator" role="status" aria-label="État versioning policy" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>policyVersioning</dt><dd id="policy-value">—</dd></div>
          <div><dt>simulation</dt><dd id="sim-value">—</dd></div>
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
      const diagValue = document.getElementById('diag-value');
      const policyValue = document.getElementById('policy-value');
      const simValue = document.getElementById('sim-value');
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
        diagValue.textContent =
          'policyVersion=' + String(diagnostics.policyVersion ?? '—') +
          ' | historyEntryCount=' + String(diagnostics.historyEntryCount ?? '—') +
          ' | simulationEligible=' + String(diagnostics.simulationEligible ?? '—') +
          ' | simulatedVerdict=' + String(diagnostics.simulatedVerdict ?? '—') +
          ' | p95=' + String(diagnostics.p95SimulationMs ?? '—') +
          ' | source=' + String(diagnostics.sourceReasonCode ?? '—');

        const policyVersioning = result.policyVersioning ?? {};
        const historyEntry = policyVersioning.historyEntry ?? {};
        policyValue.textContent =
          'policyId=' + String(policyVersioning.policyId ?? '—') +
          ' | scope=' + String(policyVersioning.policyScope ?? '—') +
          ' | active=' + String(policyVersioning.activeVersion ?? '—') +
          ' | requested=' + String(policyVersioning.requestedVersion ?? '—') +
          ' | isActive=' + String(policyVersioning.isActive ?? '—') +
          ' | history.changeType=' + String(historyEntry.changeType ?? '—');

        const simulation = result.simulation ?? {};
        simValue.textContent =
          'eligible=' + String(simulation.eligible ?? '—') +
          ' | simulatedVerdict=' + String(simulation.simulatedVerdict ?? '—') +
          ' | nonMutative=' + String(simulation.nonMutative ?? '—') +
          ' | factors=' + String((simulation.factors ?? []).length) +
          ' | evaluatedAt=' + String(simulation.evaluatedAt ?? '—');

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

          const result = await window.runPolicyVersioningScenarioRuntime(scenarioInput.value);
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

function concernsActionResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Action CONCERNS créée automatiquement avec policy snapshot et historique.',
    diagnostics: {
      verdict: 'CONCERNS',
      concernsActionRequired: true,
      actionCreated: true,
      durationMs: 6,
      p95ActionMs: 2,
      sourceReasonCode: 'GATE_VERDICT_CONCERNS',
      policyVersion: '1.2.0'
    },
    concernsAction: {
      actionCreated: true,
      actionId: 'act-001',
      gateId: 'G4-UX',
      storyId: 'S030',
      assignee: 'qa-owner',
      dueAt: '2026-03-03T10:00:00.000Z',
      status: 'OPEN'
    },
    policySnapshot: {
      policyScope: 'gate',
      version: '1.2.0'
    },
    historyEntry: {
      actionId: 'act-001',
      policyVersion: '1.2.0',
      changedAt: '2026-02-24T05:20:00.000Z',
      changedBy: 'dev-bot',
      changeType: 'CREATE'
    },
    correctiveActions: ['TRACK_CONCERNS_ACTION'],
    ...overrides
  };
}

async function runScenario(scenario) {
  if (scenario === 'success') {
    return versionGatePolicy(
      {
        concernsActionResult: concernsActionResult(),
        policyVersioning: {
          policyId: 'POLICY-G4-UX',
          policyScope: 'gate',
          activeVersion: '1.2.0',
          requestedVersion: '1.2.0',
          previousVersion: '1.1.5',
          gateId: 'G4-UX',
          isActive: true
        },
        simulationInput: {
          eligible: true,
          readOnly: true,
          additionalSignals: [{ signalId: 'dry-run', severity: 'PASS' }]
        },
        changedBy: 'dev-bot'
      },
      {
        nowMs: () => Date.parse('2026-02-24T05:30:00.000Z')
      }
    );
  }

  if (scenario === 'policy-missing') {
    return versionGatePolicy({
      concernsActionResult: concernsActionResult(),
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: 'bad-semver',
        requestedVersion: 'bad-semver'
      }
    });
  }

  if (scenario === 'policy-stale') {
    return versionGatePolicy({
      concernsActionResult: concernsActionResult(),
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.1.0',
        previousVersion: '1.1.0',
        isActive: true
      }
    });
  }

  if (scenario === 'simulation-invalid') {
    return versionGatePolicy({
      concernsActionResult: concernsActionResult(),
      policyVersioning: {
        policyScope: 'gate',
        activeVersion: '1.2.0',
        requestedVersion: '1.2.0',
        previousVersion: '1.1.5'
      },
      simulationInput: {
        eligible: false
      }
    });
  }

  return versionGatePolicy({});
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('runPolicyVersioningScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('policy versioning demo covers empty/loading/error/success with policy and simulation fields', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Versionner policy gate' });
  const stateIndicator = page.getByRole('status', { name: 'État versioning policy' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const reasonCodeValue = page.locator('#reason-code-value');
  const reasonValue = page.locator('#reason-value');
  const diagValue = page.locator('#diag-value');
  const policyValue = page.locator('#policy-value');
  const simValue = page.locator('#sim-value');
  const actionsValue = page.locator('#actions-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-input');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_GATE_POLICY_INPUT');
  await expect(reasonValue).toContainText('Aucune source exploitable');

  await scenario.selectOption('policy-missing');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('GATE_POLICY_VERSION_MISSING');
  await expect(actionsValue).toContainText('LINK_GATE_POLICY_VERSION');

  await scenario.selectOption('policy-stale');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('POLICY_VERSION_NOT_ACTIVE');
  await expect(actionsValue).toContainText('SYNC_ACTIVE_POLICY_VERSION');

  await scenario.selectOption('simulation-invalid');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_GATE_SIMULATION_INPUT');
  await expect(diagValue).toContainText('simulationEligible=false');

  await scenario.selectOption('success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Policy gate versionnée (1.2.0)');
  await expect(diagValue).toContainText('policyVersion=1.2.0 | historyEntryCount=1 | simulationEligible=true | simulatedVerdict=CONCERNS | p95=');
  await expect(policyValue).toContainText('policyId=POLICY-G4-UX | scope=gate | active=1.2.0 | requested=1.2.0 | isActive=true | history.changeType=CREATE');
  await expect(simValue).toContainText('eligible=true | simulatedVerdict=CONCERNS | nonMutative=true');
  await expect(actionsValue).toContainText('TRACK_CONCERNS_ACTION');
  await expect(successJson).toContainText('"allowed":true');
  await expect(errorMessage).toBeHidden();
  await expect(action).toBeEnabled();
});

test('policy versioning demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
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
        await page.getByRole('button', { name: 'Versionner policy gate' }).click();

        await expect(page.getByRole('status', { name: 'État versioning policy' })).toHaveAttribute(
          'data-state',
          'success'
        );

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const reason = document.getElementById('reason-value');
          const diag = document.getElementById('diag-value');
          const policy = document.getElementById('policy-value');
          const sim = document.getElementById('sim-value');
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
            diag: computeOverflow(diag),
            policy: computeOverflow(policy),
            sim: computeOverflow(sim),
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
            overflow.diag,
            overflow.policy,
            overflow.sim,
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
