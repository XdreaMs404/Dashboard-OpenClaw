import { expect, test } from '@playwright/test';
import { calculateGateVerdict } from '../../src/gate-verdict-calculator.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Calculateur verdict gate</title>
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
      #can-mark-done-value,
      #factors-value,
      #actions-value,
      #error-message,
      #success-json {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      #factors-value,
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
      <h1>Calculateur verdict PASS / CONCERNS / FAIL</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="blocked-upstream">Blocage amont S026</option>
        <option value="concerns">Signal concerns</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-action" type="button">Calculer verdict</button>

      <p id="state-indicator" role="status" aria-label="État verdict gate" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>compteurs</dt><dd id="counts-value">—</dd></div>
          <div><dt>verdict</dt><dd id="verdict-value">—</dd></div>
          <div><dt>canMarkDone</dt><dd id="can-mark-done-value">—</dd></div>
          <div>
            <dt>contributingFactors</dt>
            <dd><ul id="factors-value"><li>—</li></ul></dd>
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
      const canMarkDoneValue = document.getElementById('can-mark-done-value');
      const factorsValue = document.getElementById('factors-value');
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
          'gates=' + String(diagnostics.inputGatesCount ?? '—') +
          ' | evidence=' + String(diagnostics.evidenceCount ?? '—') +
          ' | g4t=' + String(diagnostics.g4tStatus ?? '—') +
          ' | g4ux=' + String(diagnostics.g4uxStatus ?? '—') +
          ' | p95=' + String(diagnostics.p95VerdictMs ?? '—') +
          ' | source=' + String(diagnostics.sourceReasonCode ?? '—');

        verdictValue.textContent = String(result.verdict ?? '—');
        canMarkDoneValue.textContent = String(result.canMarkDone);

        const factorRows = (result.contributingFactors ?? []).map((entry) => {
          return (
            String(entry.factorId) +
            ' => status=' +
            String(entry.status) +
            ' impact=' +
            String(entry.impact)
          );
        });

        renderList(factorsValue, factorRows);
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

          const result = await window.runGateVerdictScenarioRuntime(scenarioInput.value);
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

function g4DualResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Dual G4 validé.',
    diagnostics: {
      g4tStatus: 'PASS',
      g4uxStatus: 'PASS',
      dualVerdict: 'PASS',
      mismatchCount: 0,
      durationMs: 12,
      p95DualEvalMs: 4,
      sourceReasonCode: 'OK'
    },
    g4DualStatus: {
      g4: {
        status: 'PASS',
        owner: 'owner-g4',
        updatedAt: '2026-02-24T00:00:03.000Z'
      },
      g4t: {
        gateId: 'G4-T',
        status: 'PASS',
        owner: 'owner-g4t',
        updatedAt: '2026-02-24T00:00:05.000Z',
        evidenceCount: 2,
        reasonCode: 'OK',
        sourceReasonCode: 'OK'
      },
      g4ux: {
        gateId: 'G4-UX',
        status: 'PASS',
        owner: 'owner-g4ux',
        updatedAt: '2026-02-24T00:00:06.000Z',
        evidenceCount: 3,
        reasonCode: 'OK',
        sourceReasonCode: 'OK'
      },
      dualVerdict: 'PASS',
      synchronized: true
    },
    correlationMatrix: [],
    correctiveActions: [],
    ...overrides
  };
}

async function runScenario(scenario) {
  if (scenario === 'success') {
    return calculateGateVerdict({
      g4DualResult: g4DualResult(),
      evidenceRefs: ['proof-1', 'proof-2']
    });
  }

  if (scenario === 'blocked-upstream') {
    return calculateGateVerdict({
      g4DualResult: {
        allowed: false,
        reasonCode: 'G4_SUBGATES_UNSYNC',
        reason: 'Sous-gates non synchronisées.',
        diagnostics: {
          sourceReasonCode: 'G4_SUBGATES_UNSYNC'
        },
        correctiveActions: ['SYNC_G4_SUBGATES']
      }
    });
  }

  if (scenario === 'concerns') {
    return calculateGateVerdict({
      g4DualResult: g4DualResult({
        g4DualStatus: {
          ...g4DualResult().g4DualStatus,
          g4t: {
            ...g4DualResult().g4DualStatus.g4t,
            status: 'CONCERNS',
            reasonCode: 'TRANSITION_NOT_ALLOWED',
            sourceReasonCode: 'TRANSITION_NOT_ALLOWED'
          },
          dualVerdict: 'CONCERNS'
        },
        diagnostics: {
          ...g4DualResult().diagnostics,
          g4tStatus: 'CONCERNS',
          dualVerdict: 'CONCERNS'
        }
      }),
      evidenceRefs: ['proof-1']
    });
  }

  return calculateGateVerdict({});
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('runGateVerdictScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('gate verdict demo covers empty/loading/error/success with reason, counters, verdict, canMarkDone, factors and actions', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Calculer verdict' });
  const stateIndicator = page.getByRole('status', { name: 'État verdict gate' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const reasonCodeValue = page.locator('#reason-code-value');
  const reasonValue = page.locator('#reason-value');
  const countsValue = page.locator('#counts-value');
  const verdictValue = page.locator('#verdict-value');
  const canMarkDoneValue = page.locator('#can-mark-done-value');
  const factorsValue = page.locator('#factors-value');
  const actionsValue = page.locator('#actions-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-input');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_GATE_VERDICT_INPUT');
  await expect(reasonValue).toContainText('Aucune source exploitable');
  await expect(countsValue).toContainText('gates=0 | evidence=0 | g4t=— | g4ux=— | p95=0 | source=INVALID_GATE_VERDICT_INPUT');

  await scenario.selectOption('blocked-upstream');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('G4_SUBGATES_UNSYNC');
  await expect(reasonValue).toContainText('Sous-gates non synchronisées');
  await expect(actionsValue).toContainText('SYNC_G4_SUBGATES');

  await scenario.selectOption('concerns');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('GATE_VERDICT_CONCERNS');
  await expect(verdictValue).toHaveText('CONCERNS');
  await expect(canMarkDoneValue).toHaveText('false');
  await expect(actionsValue).toContainText('BLOCK_DONE_TRANSITION');

  await scenario.selectOption('success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Verdict gate calculé: PASS');
  await expect(countsValue).toContainText('gates=5 | evidence=2 | g4t=PASS | g4ux=PASS | p95=');
  await expect(verdictValue).toHaveText('PASS');
  await expect(canMarkDoneValue).toHaveText('true');
  await expect(factorsValue).toContainText('FINAL_VERDICT => status=PASS impact=NEUTRAL');
  await expect(actionsValue).toContainText('—');
  await expect(successJson).toContainText('"allowed":true');
  await expect(errorMessage).toBeHidden();
  await expect(action).toBeEnabled();
});

test('gate verdict demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
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
        await page.getByRole('button', { name: 'Calculer verdict' }).click();

        await expect(page.getByRole('status', { name: 'État verdict gate' })).toHaveAttribute(
          'data-state',
          'success'
        );

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const reason = document.getElementById('reason-value');
          const counts = document.getElementById('counts-value');
          const verdict = document.getElementById('verdict-value');
          const canMarkDone = document.getElementById('can-mark-done-value');
          const factors = document.getElementById('factors-value');
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
            canMarkDone: computeOverflow(canMarkDone),
            factors: computeOverflow(factors),
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
            overflow.canMarkDone,
            overflow.factors,
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
