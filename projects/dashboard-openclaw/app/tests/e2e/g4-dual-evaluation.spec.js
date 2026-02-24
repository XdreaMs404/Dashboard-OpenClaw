import { expect, test } from '@playwright/test';
import { evaluateG4DualCorrelation } from '../../src/g4-dual-evaluation.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Évaluation duale G4</title>
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
      #verdict-value,
      #subgates-value,
      #matrix-value,
      #actions-value,
      #error-message,
      #success-json {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      #subgates-value,
      #matrix-value,
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
      <h1>Évaluation duale G4-T / G4-UX</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="blocked-upstream">Blocage amont S025</option>
        <option value="unsync">Sous-gates non synchronisées</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-action" type="button">Évaluer dual G4</button>

      <p id="state-indicator" role="status" aria-label="État dual G4" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>compteurs</dt><dd id="counts-value">—</dd></div>
          <div><dt>verdict dual</dt><dd id="verdict-value">—</dd></div>
          <div>
            <dt>subGates</dt>
            <dd><ul id="subgates-value"><li>—</li></ul></dd>
          </div>
          <div>
            <dt>correlationMatrix</dt>
            <dd><ul id="matrix-value"><li>—</li></ul></dd>
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
      const verdictValue = document.getElementById('verdict-value');
      const subgatesValue = document.getElementById('subgates-value');
      const matrixValue = document.getElementById('matrix-value');
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
          'g4t=' + String(diagnostics.g4tStatus ?? '—') +
          ' | g4ux=' + String(diagnostics.g4uxStatus ?? '—') +
          ' | dual=' + String(diagnostics.dualVerdict ?? '—') +
          ' | mismatch=' + String(diagnostics.mismatchCount ?? '—') +
          ' | p95=' + String(diagnostics.p95DualEvalMs ?? '—') +
          ' | source=' + String(diagnostics.sourceReasonCode ?? '—');

        verdictValue.textContent = result.g4DualStatus?.dualVerdict ?? '—';

        const subGateRows = [result.g4DualStatus?.g4t, result.g4DualStatus?.g4ux]
          .filter(Boolean)
          .map((entry) => {
            return (
              entry.gateId +
              ' => status=' +
              String(entry.status) +
              ' owner=' +
              String(entry.owner) +
              ' evidence=' +
              String(entry.evidenceCount)
            );
          });

        const matrixRows = (result.correlationMatrix ?? [])
          .filter((entry) => entry.matched)
          .map((entry) => {
            return (
              entry.g4tStatus + '/' + entry.g4uxStatus + ' => ' + entry.dualVerdict + ' (' + entry.ruleId + ')'
            );
          });

        renderList(subgatesValue, subGateRows);
        renderList(matrixValue, matrixRows);
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

          const result = await window.runG4DualScenarioRuntime(scenarioInput.value);
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

function gateCenterResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    diagnostics: {
      sourceReasonCode: 'OK'
    },
    gateCenter: [
      {
        gateId: 'G1',
        status: 'PASS',
        owner: 'owner-g1',
        updatedAt: '2026-02-24T00:00:00.000Z',
        reasonCode: 'OK',
        sourceReasonCode: 'OK'
      },
      {
        gateId: 'G2',
        status: 'PASS',
        owner: 'owner-g2',
        updatedAt: '2026-02-24T00:00:01.000Z',
        reasonCode: 'OK',
        sourceReasonCode: 'OK'
      },
      {
        gateId: 'G3',
        status: 'PASS',
        owner: 'owner-g3',
        updatedAt: '2026-02-24T00:00:02.000Z',
        reasonCode: 'OK',
        sourceReasonCode: 'OK'
      },
      {
        gateId: 'G4',
        status: 'PASS',
        owner: 'owner-g4',
        updatedAt: '2026-02-24T00:00:03.000Z',
        reasonCode: 'OK',
        sourceReasonCode: 'OK'
      },
      {
        gateId: 'G5',
        status: 'PASS',
        owner: 'owner-g5',
        updatedAt: '2026-02-24T00:00:04.000Z',
        reasonCode: 'OK',
        sourceReasonCode: 'OK'
      }
    ],
    subGates: [
      {
        gateId: 'G4-T',
        parentGateId: 'G4',
        status: 'PASS',
        owner: 'owner-g4t',
        updatedAt: '2026-02-24T00:00:05.000Z',
        reasonCode: 'OK',
        sourceReasonCode: 'OK',
        evidenceCount: 2
      },
      {
        gateId: 'G4-UX',
        parentGateId: 'G4',
        status: 'PASS',
        owner: 'owner-g4ux',
        updatedAt: '2026-02-24T00:00:06.000Z',
        reasonCode: 'OK',
        sourceReasonCode: 'OK',
        evidenceCount: 3
      }
    ],
    correctiveActions: [],
    ...overrides
  };
}

async function runScenario(scenario) {
  if (scenario === 'success') {
    return evaluateG4DualCorrelation({
      gateCenterResult: gateCenterResult(),
      maxSyncSkewMs: 10_000
    });
  }

  if (scenario === 'blocked-upstream') {
    return evaluateG4DualCorrelation({
      gateCenterResult: {
        allowed: false,
        reasonCode: 'GATE_STATUS_INCOMPLETE',
        reason: 'Gate metadata incomplète.',
        diagnostics: {
          sourceReasonCode: 'GATE_STATUS_INCOMPLETE'
        },
        correctiveActions: ['COMPLETE_GATE_STATUS_FIELDS']
      }
    });
  }

  if (scenario === 'unsync') {
    return evaluateG4DualCorrelation({
      gateCenterResult: gateCenterResult({
        subGates: gateCenterResult().subGates.map((entry) =>
          entry.gateId === 'G4-UX'
            ? {
                ...entry,
                updatedAt: '2026-02-24T00:20:06.000Z'
              }
            : entry
        )
      }),
      maxSyncSkewMs: 5_000
    });
  }

  return evaluateG4DualCorrelation({});
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('runG4DualScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('g4 dual demo covers empty/loading/error/success with reason, counters, verdict, matrix and actions', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Évaluer dual G4' });
  const stateIndicator = page.getByRole('status', { name: 'État dual G4' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const reasonCodeValue = page.locator('#reason-code-value');
  const reasonValue = page.locator('#reason-value');
  const countsValue = page.locator('#counts-value');
  const verdictValue = page.locator('#verdict-value');
  const subgatesValue = page.locator('#subgates-value');
  const matrixValue = page.locator('#matrix-value');
  const actionsValue = page.locator('#actions-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-input');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_G4_DUAL_INPUT');
  await expect(reasonValue).toContainText('Aucune source exploitable');
  await expect(countsValue).toContainText('g4t=— | g4ux=— | dual=— | mismatch=0 | p95=0 | source=INVALID_G4_DUAL_INPUT');

  await scenario.selectOption('blocked-upstream');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('GATE_STATUS_INCOMPLETE');
  await expect(reasonValue).toContainText('Gate metadata incomplète');
  await expect(actionsValue).toContainText('COMPLETE_GATE_STATUS_FIELDS');

  await scenario.selectOption('unsync');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('G4_SUBGATES_UNSYNC');
  await expect(reasonValue).toContainText('Décalage horodatage G4-T/G4-UX');
  await expect(actionsValue).toContainText('SYNC_G4_SUBGATES');
  await expect(actionsValue).toContainText('BLOCK_DONE_TRANSITION');

  await scenario.selectOption('success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Corrélation duale G4 évaluée');
  await expect(countsValue).toContainText('g4t=PASS | g4ux=PASS | dual=PASS | mismatch=0 | p95=');
  await expect(verdictValue).toHaveText('PASS');
  await expect(subgatesValue).toContainText('G4-T => status=PASS owner=owner-g4t evidence=2');
  await expect(subgatesValue).toContainText('G4-UX => status=PASS owner=owner-g4ux evidence=3');
  await expect(matrixValue).toContainText('PASS/PASS => PASS (RULE-G4-01)');
  await expect(actionsValue).toContainText('—');
  await expect(successJson).toContainText('"allowed":true');
  await expect(errorMessage).toBeHidden();
  await expect(action).toBeEnabled();
});

test('g4 dual demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
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
        await page.getByRole('button', { name: 'Évaluer dual G4' }).click();

        await expect(page.getByRole('status', { name: 'État dual G4' })).toHaveAttribute(
          'data-state',
          'success'
        );

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const reason = document.getElementById('reason-value');
          const counts = document.getElementById('counts-value');
          const verdict = document.getElementById('verdict-value');
          const subgates = document.getElementById('subgates-value');
          const matrix = document.getElementById('matrix-value');
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
            verdict: computeOverflow(verdict),
            subgates: computeOverflow(subgates),
            matrix: computeOverflow(matrix),
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
            overflow.verdict,
            overflow.subgates,
            overflow.matrix,
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
