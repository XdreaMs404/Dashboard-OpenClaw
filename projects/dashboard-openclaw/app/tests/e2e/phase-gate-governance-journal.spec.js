import { expect, test } from '@playwright/test';
import { recordPhaseGateGovernanceDecision } from '../../src/phase-gate-governance-journal.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Journal gouvernance phase/gate</title>
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
      #entry-value,
      #history-value,
      #actions-value,
      #error-message,
      #success-json {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      #history-value,
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
      <h1>Journal décisionnel de gouvernance phase/gate</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Payload invalide</option>
        <option value="blocked-transition">Blocage transition non autorisée</option>
        <option value="blocked-notify-sla">Blocage notification SLA</option>
        <option value="success">Nominal success</option>
      </select>

      <button id="run-action" type="button">Journaliser décision</button>

      <p id="state-indicator" role="status" aria-label="État journal gouvernance" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>owner</dt><dd id="owner-value">—</dd></div>
          <div><dt>decisionEntry</dt><dd id="entry-value">—</dd></div>
          <div>
            <dt>decisionHistory</dt>
            <dd><ul id="history-value"><li>—</li></ul></dd>
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
      const ownerValue = document.getElementById('owner-value');
      const entryValue = document.getElementById('entry-value');
      const historyValue = document.getElementById('history-value');
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
        ownerValue.textContent = result.diagnostics?.owner ?? '—';

        if (result.decisionEntry) {
          const decisionId = result.decisionEntry.decisionId ?? '—';
          const gateId = result.decisionEntry.gateId ?? '—';
          const severity = result.decisionEntry.severity ?? '—';
          entryValue.textContent = decisionId + ' | ' + gateId + ' | ' + severity;
        } else {
          entryValue.textContent = '—';
        }

        const historyRows = Array.isArray(result.decisionHistory)
          ? result.decisionHistory.map((entry) => {
              const decisionId = entry?.decisionId ?? '—';
              const gateId = entry?.gateId ?? '—';
              const reasonCode = entry?.reasonCode ?? '—';
              return decisionId + ' | ' + gateId + ' | ' + reasonCode;
            })
          : [];

        renderList(historyValue, historyRows);
        renderList(actionsValue, Array.isArray(result.correctiveActions) ? result.correctiveActions : []);
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 150));

          const result = await window.recordPhaseGateGovernanceDecisionScenarioRuntime(scenarioInput.value);
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

function historyEntry(overrides = {}) {
  return {
    decisionId: 'dec-prev-1',
    decisionType: 'phase-gate',
    phaseFrom: 'H08',
    phaseTo: 'H09',
    gateId: 'G3',
    owner: 'ops.lead',
    allowed: true,
    reasonCode: 'OK',
    reason: 'Historique antérieur nominal.',
    severity: 'info',
    decidedAt: '2026-02-21T12:00:00.000Z',
    sourceReasonCode: 'OK',
    correctiveActions: [],
    evidenceRefs: [],
    ...overrides
  };
}

async function runScenario(scenario) {
  if (scenario === 'success') {
    return recordPhaseGateGovernanceDecision(
      {
        gateId: 'G4-T',
        progressionAlert: {
          allowed: true,
          reasonCode: 'OK',
          reason: 'Progression canonique valide pour owner=ops.lead: aucune anomalie détectée.',
          diagnostics: {
            fromPhase: 'H09',
            toPhase: 'H10',
            owner: 'ops.lead',
            sourceReasonCode: 'OK'
          },
          correctiveActions: []
        },
        decisionHistory: [historyEntry()],
        evidenceRefs: ['evidence://story/S012/nominal']
      },
      {
        idGenerator: () => 'dec-success-1',
        nowProvider: () => '2026-02-21T15:30:00.000Z'
      }
    );
  }

  if (scenario === 'blocked-notify-sla') {
    return recordPhaseGateGovernanceDecision(
      {
        gateId: 'G2',
        progressionAlert: {
          allowed: false,
          reasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED',
          reason:
            'Notification SLA dépassée pour owner=ops.lead: elapsedMs=620000, slaMs=600000, fromPhase=H09, toPhase=H10.',
          diagnostics: {
            fromPhase: 'H09',
            toPhase: 'H10',
            owner: 'ops.lead',
            sourceReasonCode: 'PHASE_NOTIFICATION_SLA_EXCEEDED'
          },
          correctiveActions: ['PUBLISH_PHASE_NOTIFICATION', 'REVALIDATE_TRANSITION']
        },
        decisionHistory: [historyEntry()],
        query: {
          owner: 'ops.lead',
          gate: 'G2',
          allowed: false,
          limit: 10
        }
      },
      {
        idGenerator: () => 'dec-blocked-sla-1',
        nowProvider: () => '2026-02-21T15:35:00.000Z'
      }
    );
  }

  if (scenario === 'blocked-transition') {
    return recordPhaseGateGovernanceDecision(
      {
        gateId: 'G2',
        progressionAlert: {
          allowed: false,
          reasonCode: 'TRANSITION_NOT_ALLOWED',
          reason: 'Transition bloquée pour owner=alex.pm: Transition non autorisée H09 -> H11.',
          diagnostics: {
            fromPhase: 'H09',
            toPhase: 'H11',
            owner: 'alex.pm',
            sourceReasonCode: 'TRANSITION_NOT_ALLOWED'
          },
          correctiveActions: ['ALIGN_PHASE_SEQUENCE']
        },
        decisionHistory: [
          historyEntry({
            decisionId: 'dec-prev-2',
            gateId: 'G2',
            owner: 'alex.pm',
            allowed: false,
            reasonCode: 'TRANSITION_NOT_ALLOWED',
            reason: 'Blocage précédent',
            severity: 'warning',
            decidedAt: '2026-02-21T14:20:00.000Z',
            sourceReasonCode: 'TRANSITION_NOT_ALLOWED',
            correctiveActions: ['ALIGN_PHASE_SEQUENCE']
          })
        ]
      },
      {
        idGenerator: () => 'dec-blocked-transition-1',
        nowProvider: () => '2026-02-21T15:32:00.000Z'
      }
    );
  }

  return recordPhaseGateGovernanceDecision({
    gateId: 'G2',
    progressionAlert: {
      allowed: true,
      reasonCode: 'OK',
      reason: 'Progression nominale.',
      diagnostics: {
        fromPhase: 'H09',
        toPhase: 'H10',
        owner: 'ops.lead',
        sourceReasonCode: 'OK'
      },
      correctiveActions: []
    },
    decisionHistory: null
  });
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('recordPhaseGateGovernanceDecisionScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('phase gate governance journal demo covers empty/loading/error/success with explicit reason and decisions', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Journaliser décision' });
  const stateIndicator = page.getByRole('status', { name: 'État journal gouvernance' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const reasonCodeValue = page.locator('#reason-code-value');
  const reasonValue = page.locator('#reason-value');
  const ownerValue = page.locator('#owner-value');
  const entryValue = page.locator('#entry-value');
  const historyValue = page.locator('#history-value');
  const actionsValue = page.locator('#actions-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-input');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_GOVERNANCE_DECISION_INPUT');
  await expect(reasonValue).toContainText('decisionHistory doit être un tableau');
  await expect(ownerValue).toHaveText('—');
  await expect(entryValue).toHaveText('—');

  await scenario.selectOption('blocked-transition');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('TRANSITION_NOT_ALLOWED');
  await expect(reasonValue).toContainText('owner=alex.pm');
  await expect(ownerValue).toHaveText('alex.pm');
  await expect(entryValue).toContainText('dec-blocked-transition-1 | G2 | warning');
  await expect(historyValue).toContainText('dec-blocked-transition-1 | G2 | TRANSITION_NOT_ALLOWED');
  await expect(historyValue).toContainText('dec-prev-2 | G2 | TRANSITION_NOT_ALLOWED');
  await expect(actionsValue).toContainText('ALIGN_PHASE_SEQUENCE');

  await scenario.selectOption('blocked-notify-sla');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('PHASE_NOTIFICATION_SLA_EXCEEDED');
  await expect(reasonValue).toContainText('elapsedMs=620000');
  await expect(ownerValue).toHaveText('ops.lead');
  await expect(entryValue).toContainText('dec-blocked-sla-1 | G2 | critical');
  await expect(historyValue).toContainText('dec-blocked-sla-1 | G2 | PHASE_NOTIFICATION_SLA_EXCEEDED');
  await expect(actionsValue).toContainText('PUBLISH_PHASE_NOTIFICATION');
  await expect(actionsValue).toContainText('REVALIDATE_TRANSITION');

  await scenario.selectOption('success');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Progression canonique valide');
  await expect(ownerValue).toHaveText('ops.lead');
  await expect(entryValue).toContainText('dec-success-1 | G4-T | info');
  await expect(historyValue).toContainText('dec-success-1 | G4-T | OK');
  await expect(historyValue).toContainText('dec-prev-1 | G3 | OK');
  await expect(actionsValue).toContainText('—');
  await expect(successJson).toContainText('"allowed":true');
  await expect(action).toBeEnabled();
});

test('phase gate governance journal demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
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

        await page.getByLabel('Scénario').selectOption('blocked-notify-sla');
        await page.getByRole('button', { name: 'Journaliser décision' }).click();

        await expect(page.getByRole('status', { name: 'État journal gouvernance' })).toHaveAttribute(
          'data-state',
          'error'
        );

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const reason = document.getElementById('reason-value');
          const owner = document.getElementById('owner-value');
          const entry = document.getElementById('entry-value');
          const history = document.getElementById('history-value');
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
            owner: computeOverflow(owner),
            entry: computeOverflow(entry),
            history: computeOverflow(history),
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
            overflow.owner,
            overflow.entry,
            overflow.history,
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
