import { expect, test } from '@playwright/test';
import { buildGateCenterStatus } from '../../src/gate-center-status.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Gate Center unifié</title>
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

      #reason-value,
      #counts-value,
      #gates-value,
      #subgates-value,
      #actions-value,
      #error-message,
      #success-json {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      #gates-value,
      #subgates-value,
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
      <h1>Gate Center unifié G1→G5</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="blocked-upstream">Blocage amont S012</option>
        <option value="incomplete">Gate incomplète</option>
        <option value="mismatch">Mismatch G4 et sous-gates</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-action" type="button">Construire Gate Center</button>

      <p id="state-indicator" role="status" aria-label="État Gate Center" aria-live="polite" data-state="empty">
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
            <dt>gateCenter</dt>
            <dd><ul id="gates-value"><li>—</li></ul></dd>
          </div>
          <div>
            <dt>subGates</dt>
            <dd><ul id="subgates-value"><li>—</li></ul></dd>
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
      const gatesValue = document.getElementById('gates-value');
      const subgatesValue = document.getElementById('subgates-value');
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
          'gates=' + String(diagnostics.gatesCount ?? '—') +
          ' | subGates=' + String(diagnostics.subGatesCount ?? '—') +
          ' | stale=' + String(diagnostics.staleCount ?? '—') +
          ' | p95=' + String(diagnostics.p95BuildMs ?? '—') +
          ' | source=' + String(diagnostics.sourceReasonCode ?? '—');

        const gatesRows = (result.gateCenter ?? []).map((entry) => {
          return (
            entry.gateId +
            ' => status=' +
            String(entry.status) +
            ' owner=' +
            String(entry.owner) +
            ' updatedAt=' +
            String(entry.updatedAt)
          );
        });

        const subGateRows = (result.subGates ?? []).map((entry) => {
          return (
            entry.gateId +
            ' => parent=' +
            String(entry.parentGateId) +
            ' status=' +
            String(entry.status) +
            ' owner=' +
            String(entry.owner)
          );
        });

        renderList(gatesValue, gatesRows);
        renderList(subgatesValue, subGateRows);
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

          const result = await window.runGateCenterScenarioRuntime(scenarioInput.value);
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

function governanceDecisionResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Gouvernance validée.',
    diagnostics: {
      sourceReasonCode: 'OK'
    },
    decisionHistory: [
      {
        gateId: 'G1',
        owner: 'owner-g1',
        status: 'PASS',
        reasonCode: 'OK',
        updatedAt: '2026-02-23T21:00:00.000Z'
      },
      {
        gateId: 'G2',
        owner: 'owner-g2',
        status: 'PASS',
        reasonCode: 'OK',
        updatedAt: '2026-02-23T21:00:01.000Z'
      },
      {
        gateId: 'G3',
        owner: 'owner-g3',
        status: 'PASS',
        reasonCode: 'OK',
        updatedAt: '2026-02-23T21:00:02.000Z'
      },
      {
        gateId: 'G4',
        owner: 'owner-g4',
        status: 'PASS',
        reasonCode: 'OK',
        updatedAt: '2026-02-23T21:00:03.000Z'
      },
      {
        gateId: 'G5',
        owner: 'owner-g5',
        status: 'PASS',
        reasonCode: 'OK',
        updatedAt: '2026-02-23T21:00:04.000Z'
      },
      {
        gateId: 'G4-T',
        owner: 'owner-g4t',
        status: 'PASS',
        reasonCode: 'OK',
        updatedAt: '2026-02-23T21:00:05.000Z'
      },
      {
        gateId: 'G4-UX',
        owner: 'owner-g4ux',
        status: 'PASS',
        reasonCode: 'OK',
        updatedAt: '2026-02-23T21:00:06.000Z'
      }
    ],
    decisionEntry: null,
    correctiveActions: [],
    ...overrides
  };
}

async function runScenario(scenario) {
  if (scenario === 'success') {
    return buildGateCenterStatus(
      {
        governanceDecisionResult: governanceDecisionResult(),
        staleAfterMs: 60_000
      },
      {
        nowMs: () => Date.parse('2026-02-23T21:00:06.500Z')
      }
    );
  }

  if (scenario === 'blocked-upstream') {
    return buildGateCenterStatus({
      governanceDecisionResult: {
        allowed: false,
        reasonCode: 'PHASE_NOTIFICATION_MISSING',
        reason: 'Notification de phase manquante.',
        diagnostics: {
          sourceReasonCode: 'PHASE_NOTIFICATION_MISSING'
        },
        correctiveActions: ['PUBLISH_PHASE_NOTIFICATION']
      }
    });
  }

  if (scenario === 'incomplete') {
    return buildGateCenterStatus({
      governanceDecisionResult: governanceDecisionResult({
        decisionHistory: [
          {
            gateId: 'G1',
            owner: 'owner-g1',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:00.000Z'
          },
          {
            gateId: 'G2',
            owner: 'owner-g2',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:01.000Z'
          },
          {
            gateId: 'G3',
            owner: 'owner-g3',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:02.000Z'
          },
          {
            gateId: 'G4',
            owner: null,
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:03.000Z'
          },
          {
            gateId: 'G5',
            owner: 'owner-g5',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:04.000Z'
          },
          {
            gateId: 'G4-T',
            owner: 'owner-g4t',
            status: null,
            updatedAt: '2026-02-23T21:00:05.000Z'
          },
          {
            gateId: 'G4-UX',
            owner: 'owner-g4ux',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: null
          }
        ]
      })
    });
  }

  if (scenario === 'mismatch') {
    return buildGateCenterStatus({
      governanceDecisionResult: governanceDecisionResult({
        decisionHistory: [
          {
            gateId: 'G1',
            owner: 'owner-g1',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:00.000Z'
          },
          {
            gateId: 'G2',
            owner: 'owner-g2',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:01.000Z'
          },
          {
            gateId: 'G3',
            owner: 'owner-g3',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:02.000Z'
          },
          {
            gateId: 'G4',
            owner: 'owner-g4',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:03.000Z'
          },
          {
            gateId: 'G5',
            owner: 'owner-g5',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:04.000Z'
          },
          {
            gateId: 'G4-T',
            owner: 'owner-g4t',
            status: 'PASS',
            reasonCode: 'OK',
            updatedAt: '2026-02-23T21:00:05.000Z'
          },
          {
            gateId: 'G4-UX',
            owner: 'owner-g4ux',
            status: 'FAIL',
            reasonCode: 'TRANSITION_NOT_ALLOWED',
            updatedAt: '2026-02-23T21:00:06.000Z'
          }
        ]
      })
    });
  }

  return buildGateCenterStatus({});
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('runGateCenterScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('gate center demo covers empty/loading/error/success with counters, gates, subgates and actions', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Construire Gate Center' });
  const stateIndicator = page.getByRole('status', { name: 'État Gate Center' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const reasonCodeValue = page.locator('#reason-code-value');
  const reasonValue = page.locator('#reason-value');
  const countsValue = page.locator('#counts-value');
  const gatesValue = page.locator('#gates-value');
  const subgatesValue = page.locator('#subgates-value');
  const actionsValue = page.locator('#actions-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-input');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_GATE_CENTER_INPUT');
  await expect(reasonValue).toContainText('Aucune source exploitable');
  await expect(countsValue).toContainText(
    'gates=0 | subGates=0 | stale=0 | p95=0 | source=INVALID_GATE_CENTER_INPUT'
  );

  await scenario.selectOption('blocked-upstream');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('PHASE_NOTIFICATION_MISSING');
  await expect(reasonValue).toContainText('Notification de phase manquante');
  await expect(actionsValue).toContainText('PUBLISH_PHASE_NOTIFICATION');

  await scenario.selectOption('incomplete');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('GATE_STATUS_INCOMPLETE');
  await expect(reasonValue).toContainText('Gate metadata incomplète');
  await expect(actionsValue).toContainText('COMPLETE_GATE_STATUS_FIELDS');
  await expect(actionsValue).toContainText('BLOCK_DONE_TRANSITION');

  await scenario.selectOption('mismatch');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('G4_SUBGATE_MISMATCH');
  await expect(reasonValue).toContainText('Incohérence G4');
  await expect(actionsValue).toContainText('ALIGN_G4_SUBGATES');
  await expect(actionsValue).toContainText('BLOCK_DONE_TRANSITION');

  await scenario.selectOption('success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Gate Center prêt');
  await expect(countsValue).toContainText('gates=5 | subGates=2 | stale=0 | p95=');
  await expect(gatesValue).toContainText('G1 => status=PASS owner=owner-g1');
  await expect(gatesValue).toContainText('G4 => status=PASS owner=owner-g4');
  await expect(subgatesValue).toContainText('G4-T => parent=G4 status=PASS owner=owner-g4t');
  await expect(subgatesValue).toContainText('G4-UX => parent=G4 status=PASS owner=owner-g4ux');
  await expect(actionsValue).toContainText('—');
  await expect(successJson).toContainText('"allowed":true');
  await expect(errorMessage).toBeHidden();
  await expect(action).toBeEnabled();
});

test('gate center demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
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
        await page.getByRole('button', { name: 'Construire Gate Center' }).click();

        await expect(page.getByRole('status', { name: 'État Gate Center' })).toHaveAttribute(
          'data-state',
          'success'
        );

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const reason = document.getElementById('reason-value');
          const counts = document.getElementById('counts-value');
          const gates = document.getElementById('gates-value');
          const subgates = document.getElementById('subgates-value');
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
            gates: computeOverflow(gates),
            subgates: computeOverflow(subgates),
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
            overflow.gates,
            overflow.subgates,
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
