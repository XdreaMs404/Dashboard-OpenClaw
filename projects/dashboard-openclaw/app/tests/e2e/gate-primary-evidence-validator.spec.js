import { expect, test } from '@playwright/test';
import { validatePrimaryGateEvidence } from '../../src/gate-primary-evidence-validator.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Validator preuve primaire</title>
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
        width: min(100%, 70rem);
      }

      #reason-value,
      #diag-value,
      #primary-value,
      #concerns-value,
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
      <h1>Validation preuve primaire obligatoire</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="evidence-missing">Preuve manquante</option>
        <option value="concerns-invalid">CONCERNS sans assignation valide</option>
        <option value="concerns-success">CONCERNS avec action valide</option>
        <option value="success">Nominal PASS</option>
      </select>

      <button id="run-action" type="button">Valider preuve primaire</button>

      <p id="state-indicator" role="status" aria-label="État validation preuve" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>primaryEvidence</dt><dd id="primary-value">—</dd></div>
          <div><dt>concernsAction</dt><dd id="concerns-value">—</dd></div>
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
      const primaryValue = document.getElementById('primary-value');
      const concernsValue = document.getElementById('concerns-value');
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
          'verdict=' + String(diagnostics.verdict ?? '—') +
          ' | canMarkDone=' + String(diagnostics.canMarkDone ?? '—') +
          ' | evidence=' + String(diagnostics.evidenceCount ?? '—') +
          ' | concernsActionRequired=' + String(diagnostics.concernsActionRequired ?? '—') +
          ' | p95=' + String(diagnostics.p95ValidationMs ?? '—') +
          ' | source=' + String(diagnostics.sourceReasonCode ?? '—');

        const primaryEvidence = result.primaryEvidence ?? {};
        primaryValue.textContent =
          'required=' + String(primaryEvidence.required ?? '—') +
          ' | valid=' + String(primaryEvidence.valid ?? '—') +
          ' | count=' + String(primaryEvidence.count ?? '—') +
          ' | min=' + String(primaryEvidence.minRequired ?? '—') +
          ' | refs=' + String((primaryEvidence.refs ?? []).length);

        const concernsAction = result.concernsAction ?? {};
        concernsValue.textContent =
          'required=' + String(concernsAction.required ?? '—') +
          ' | valid=' + String(concernsAction.valid ?? '—') +
          ' | assignee=' + String(concernsAction.assignee ?? '—') +
          ' | dueAt=' + String(concernsAction.dueAt ?? '—') +
          ' | status=' + String(concernsAction.status ?? '—');

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

          const result = await window.runPrimaryEvidenceScenarioRuntime(scenarioInput.value);
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

function doneTransitionGuardResult(overrides = {}) {
  return {
    allowed: true,
    reasonCode: 'OK',
    reason: 'Transition DONE autorisée: G4-T et G4-UX sont PASS avec chaîne de preuve complète.',
    diagnostics: {
      targetState: 'DONE',
      verdict: 'PASS',
      canMarkDone: true,
      g4tStatus: 'PASS',
      g4uxStatus: 'PASS',
      evidenceCount: 1,
      durationMs: 5,
      p95GuardMs: 1,
      sourceReasonCode: 'OK'
    },
    doneTransition: {
      targetState: 'DONE',
      blocked: false,
      blockingReasons: [],
      verdict: 'PASS',
      g4SubGates: {
        g4tStatus: 'PASS',
        g4uxStatus: 'PASS'
      }
    },
    correctiveActions: [],
    ...overrides
  };
}

async function runScenario(scenario) {
  if (scenario === 'success') {
    return validatePrimaryGateEvidence({
      doneTransitionGuardResult: doneTransitionGuardResult(),
      primaryEvidenceRefs: ['primary-proof-1']
    });
  }

  if (scenario === 'evidence-missing') {
    return validatePrimaryGateEvidence({
      doneTransitionGuardResult: doneTransitionGuardResult({
        diagnostics: {
          ...doneTransitionGuardResult().diagnostics,
          evidenceCount: 0
        }
      }),
      primaryEvidenceRefs: []
    });
  }

  if (scenario === 'concerns-invalid') {
    return validatePrimaryGateEvidence({
      doneTransitionGuardResult: doneTransitionGuardResult({
        diagnostics: {
          ...doneTransitionGuardResult().diagnostics,
          verdict: 'CONCERNS',
          canMarkDone: false,
          sourceReasonCode: 'GATE_VERDICT_CONCERNS'
        },
        doneTransition: {
          ...doneTransitionGuardResult().doneTransition,
          verdict: 'CONCERNS'
        }
      }),
      primaryEvidenceRefs: ['primary-proof-1'],
      concernsAction: {
        assignee: '   ',
        status: 'OPEN'
      }
    });
  }

  if (scenario === 'concerns-success') {
    return validatePrimaryGateEvidence({
      doneTransitionGuardResult: doneTransitionGuardResult({
        diagnostics: {
          ...doneTransitionGuardResult().diagnostics,
          verdict: 'CONCERNS',
          canMarkDone: false,
          sourceReasonCode: 'GATE_VERDICT_CONCERNS'
        },
        doneTransition: {
          ...doneTransitionGuardResult().doneTransition,
          verdict: 'CONCERNS'
        }
      }),
      primaryEvidenceRefs: ['primary-proof-1'],
      concernsAction: {
        assignee: 'ux-owner',
        dueAt: '2026-03-01T10:00:00.000Z',
        status: 'OPEN'
      }
    });
  }

  return validatePrimaryGateEvidence({});
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('runPrimaryEvidenceScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('primary evidence validator demo covers empty/loading/error/success and required fields', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Valider preuve primaire' });
  const stateIndicator = page.getByRole('status', { name: 'État validation preuve' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const reasonCodeValue = page.locator('#reason-code-value');
  const reasonValue = page.locator('#reason-value');
  const diagValue = page.locator('#diag-value');
  const primaryValue = page.locator('#primary-value');
  const concernsValue = page.locator('#concerns-value');
  const actionsValue = page.locator('#actions-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-input');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_PRIMARY_EVIDENCE_INPUT');
  await expect(reasonValue).toContainText('Aucune source exploitable');
  await expect(diagValue).toContainText('verdict=— | canMarkDone=false | evidence=0 | concernsActionRequired=false | p95=0 | source=INVALID_PRIMARY_EVIDENCE_INPUT');

  await scenario.selectOption('evidence-missing');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('EVIDENCE_CHAIN_INCOMPLETE');
  await expect(reasonValue).toContainText('Chaîne de preuve primaire incomplète');
  await expect(primaryValue).toContainText('required=true | valid=false | count=0 | min=1 | refs=0');
  await expect(actionsValue).toContainText('LINK_PRIMARY_EVIDENCE');
  await expect(actionsValue).toContainText('BLOCK_DONE_TRANSITION');

  await scenario.selectOption('concerns-invalid');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('CONCERNS_ACTION_ASSIGNMENT_INVALID');
  await expect(diagValue).toContainText('verdict=CONCERNS | canMarkDone=false | evidence=1 | concernsActionRequired=true');
  await expect(concernsValue).toContainText('required=true | valid=false');
  await expect(actionsValue).toContainText('ASSIGN_CONCERNS_OWNER');
  await expect(actionsValue).toContainText('SET_CONCERNS_DUE_DATE');

  await scenario.selectOption('concerns-success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Preuve primaire valide et action CONCERNS assignée');
  await expect(concernsValue).toContainText('required=true | valid=true | assignee=ux-owner | dueAt=2026-03-01T10:00:00.000Z | status=OPEN');
  await expect(actionsValue).toContainText('TRACK_CONCERNS_ACTION');
  await expect(successJson).toContainText('"allowed":true');
  await expect(errorMessage).toBeHidden();

  await scenario.selectOption('success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Preuve primaire valide: décision de gate conforme');
  await expect(primaryValue).toContainText('required=true | valid=true | count=1 | min=1 | refs=1');
  await expect(concernsValue).toContainText('required=false | valid=true | assignee=— | dueAt=— | status=—');
  await expect(actionsValue).toContainText('—');
  await expect(action).toBeEnabled();
});

test('primary evidence validator demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
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

        await page.getByLabel('Scénario').selectOption('concerns-success');
        await page.getByRole('button', { name: 'Valider preuve primaire' }).click();

        await expect(page.getByRole('status', { name: 'État validation preuve' })).toHaveAttribute(
          'data-state',
          'success'
        );

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const reason = document.getElementById('reason-value');
          const diag = document.getElementById('diag-value');
          const primary = document.getElementById('primary-value');
          const concerns = document.getElementById('concerns-value');
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
            primary: computeOverflow(primary),
            concerns: computeOverflow(concerns),
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
            overflow.primary,
            overflow.concerns,
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
