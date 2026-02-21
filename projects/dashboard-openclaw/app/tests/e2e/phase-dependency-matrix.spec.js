import { expect, test } from '@playwright/test';
import { buildPhaseDependencyMatrix } from '../../src/phase-dependency-matrix.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Matrice des dépendances BMAD</title>
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
        width: min(100%, 60rem);
      }

      #reason-value,
      #owner-value,
      #blocking-value,
      #actions-value,
      #error-message,
      #success-json {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }

      #blocking-value,
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
      <h1>Matrice des dépendances inter-phases</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Payload invalide</option>
        <option value="transition-blocked">Blocage transition</option>
        <option value="prerequisites-incomplete">Prérequis incomplets</option>
        <option value="override-required">Override requis non appliqué</option>
        <option value="override-applied">Override appliqué</option>
        <option value="stale">Snapshot stale</option>
        <option value="nominal">Nominal</option>
      </select>

      <button id="run-action" type="button">Construire matrice</button>

      <p id="state-indicator" role="status" aria-label="État matrice dépendances" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>owner</dt><dd id="owner-value">—</dd></div>
          <div>
            <dt>blockingDependencies</dt>
            <dd>
              <ul id="blocking-value"><li>—</li></ul>
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
      const ownerValue = document.getElementById('owner-value');
      const blockingValue = document.getElementById('blocking-value');
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
        ownerValue.textContent = result.diagnostics?.owner ?? '—';
        renderList(
          blockingValue,
          result.blockingDependencies,
          (value) => value.id + ':' + value.reasonCode
        );
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

          const result = await window.buildPhaseDependencyMatrixScenarioRuntime(scenarioInput.value);
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
    return buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Transition autorisée H04 -> H05.',
        diagnostics: {
          fromIndex: 3,
          toIndex: 4,
          elapsedMs: 120_000,
          slaMs: 600_000
        }
      },
      prerequisitesValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Prérequis validés pour transition H04 -> H05.',
        diagnostics: {
          fromPhase: 'H04',
          toPhase: 'H05',
          requiredCount: 2,
          satisfiedCount: 2,
          missingPrerequisiteIds: []
        }
      },
      snapshotAgeMs: 800,
      maxRefreshIntervalMs: 5_000
    });
  }

  if (scenario === 'stale') {
    return buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Transition autorisée H04 -> H05.',
        diagnostics: {
          fromIndex: 3,
          toIndex: 4,
          elapsedMs: 120_000,
          slaMs: 600_000
        }
      },
      prerequisitesValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Prérequis validés pour transition H04 -> H05.',
        diagnostics: {
          fromPhase: 'H04',
          toPhase: 'H05',
          requiredCount: 2,
          satisfiedCount: 2,
          missingPrerequisiteIds: []
        }
      },
      snapshotAgeMs: 6_500,
      maxRefreshIntervalMs: 5_000
    });
  }

  if (scenario === 'override-applied') {
    return buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: {
        allowed: false,
        reasonCode: 'TRANSITION_NOT_ALLOWED',
        reason: 'Transition non autorisée H04 -> H06.',
        diagnostics: {
          fromIndex: 3,
          toIndex: 5,
          elapsedMs: null,
          slaMs: 600_000
        }
      },
      prerequisitesValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Prérequis validés pour transition H04 -> H05.',
        diagnostics: {
          fromPhase: 'H04',
          toPhase: 'H05',
          requiredCount: 2,
          satisfiedCount: 2,
          missingPrerequisiteIds: []
        }
      },
      overrideEvaluation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Override exceptionnel approuvé pour le blocage TRANSITION_NOT_ALLOWED.',
        diagnostics: {
          sourceReasonCode: 'TRANSITION_NOT_ALLOWED'
        },
        override: {
          required: true,
          applied: true
        },
        requiredActions: ['REVALIDATE_TRANSITION', 'RECORD_OVERRIDE_AUDIT']
      },
      snapshotAgeMs: 250
    });
  }

  if (scenario === 'override-required') {
    return buildPhaseDependencyMatrix({
      owner: 'ops.lead',
      transitionValidation: {
        allowed: false,
        reasonCode: 'PHASE_NOTIFICATION_MISSING',
        reason: 'notificationPublishedAt requis.',
        diagnostics: {
          fromIndex: 3,
          toIndex: 4,
          elapsedMs: null,
          slaMs: 600_000
        }
      },
      prerequisitesValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Prérequis validés pour transition H04 -> H05.',
        diagnostics: {
          fromPhase: 'H04',
          toPhase: 'H05',
          requiredCount: 2,
          satisfiedCount: 2,
          missingPrerequisiteIds: []
        }
      },
      overrideEvaluation: {
        allowed: false,
        reasonCode: 'OVERRIDE_REQUEST_MISSING',
        reason: 'overrideRequest est requis pour un blocage de transition éligible à override.',
        diagnostics: {
          sourceReasonCode: 'PHASE_NOTIFICATION_MISSING'
        },
        override: {
          required: true,
          applied: false
        },
        requiredActions: ['CAPTURE_JUSTIFICATION', 'CAPTURE_APPROVER']
      },
      snapshotAgeMs: 300
    });
  }

  if (scenario === 'prerequisites-incomplete') {
    return buildPhaseDependencyMatrix({
      owner: 'alex.pm',
      transitionValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Transition autorisée H04 -> H05.',
        diagnostics: {
          fromIndex: 3,
          toIndex: 4,
          elapsedMs: 120_000,
          slaMs: 600_000
        }
      },
      prerequisitesValidation: {
        allowed: false,
        reasonCode: 'PHASE_PREREQUISITES_INCOMPLETE',
        reason: 'Prérequis requis incomplets: PR-002, PR-003.',
        diagnostics: {
          fromPhase: 'H04',
          toPhase: 'H05',
          requiredCount: 3,
          satisfiedCount: 1,
          missingPrerequisiteIds: ['PR-002', 'PR-003']
        }
      },
      snapshotAgeMs: 200
    });
  }

  if (scenario === 'transition-blocked') {
    return buildPhaseDependencyMatrix({
      owner: 'alex.pm',
      transitionValidation: {
        allowed: false,
        reasonCode: 'TRANSITION_NOT_ALLOWED',
        reason: 'Transition non autorisée H04 -> H06.',
        diagnostics: {
          fromIndex: 3,
          toIndex: 5,
          elapsedMs: null,
          slaMs: 600_000
        }
      },
      prerequisitesValidation: {
        allowed: true,
        reasonCode: 'OK',
        reason: 'Prérequis validés pour transition H04 -> H05.',
        diagnostics: {
          fromPhase: 'H04',
          toPhase: 'H05',
          requiredCount: 2,
          satisfiedCount: 2,
          missingPrerequisiteIds: []
        }
      },
      snapshotAgeMs: 400
    });
  }

  return buildPhaseDependencyMatrix({
    transitionValidation: {
      allowed: true,
      reasonCode: 'OK',
      reason: 'Transition autorisée H04 -> H05.',
      diagnostics: {
        fromIndex: 3,
        toIndex: 4,
        elapsedMs: 120_000,
        slaMs: 600_000
      }
    },
    prerequisitesValidation: {
      allowed: true,
      reasonCode: 'OK',
      reason: 'Prérequis validés.',
      diagnostics: {
        fromPhase: 'H04',
        toPhase: 'H05'
      }
    },
    snapshotAgeMs: 200
  });
}

async function bootstrapDemoPage(page) {
  await page.exposeFunction('buildPhaseDependencyMatrixScenarioRuntime', runScenario);
  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);
}

test('phase dependency matrix demo covers empty/loading/error/success with explicit reason, owner, blockers and corrective actions', async ({
  page
}) => {
  await bootstrapDemoPage(page);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Construire matrice' });
  const stateIndicator = page.getByRole('status', { name: 'État matrice dépendances' });
  const errorMessage = page.getByRole('alert');
  const successJson = page.locator('#success-json');

  const reasonCodeValue = page.locator('#reason-code-value');
  const reasonValue = page.locator('#reason-value');
  const ownerValue = page.locator('#owner-value');
  const blockingValue = page.locator('#blocking-value');
  const actionsValue = page.locator('#actions-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await scenario.selectOption('invalid-input');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_PHASE_DEPENDENCY_INPUT');
  await expect(reasonValue).toContainText('owner est requis');
  await expect(ownerValue).toHaveText('—');
  await expect(blockingValue).toContainText('—');
  await expect(actionsValue).toContainText('—');

  await scenario.selectOption('transition-blocked');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('TRANSITION_NOT_ALLOWED');
  await expect(reasonValue).toContainText('owner=alex.pm');
  await expect(ownerValue).toHaveText('alex.pm');
  await expect(blockingValue).toContainText('TRANSITION:TRANSITION_NOT_ALLOWED');
  await expect(actionsValue).toContainText('ALIGN_PHASE_SEQUENCE');

  await scenario.selectOption('prerequisites-incomplete');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('PHASE_PREREQUISITES_INCOMPLETE');
  await expect(reasonValue).toContainText('PR-002');
  await expect(ownerValue).toHaveText('alex.pm');
  await expect(blockingValue).toContainText('PREREQUISITES:PHASE_PREREQUISITES_INCOMPLETE');
  await expect(actionsValue).toContainText('COMPLETE_PREREQUISITES');

  await scenario.selectOption('override-required');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('OVERRIDE_REQUEST_MISSING');
  await expect(reasonValue).toContainText('Override requis pour owner=ops.lead');
  await expect(blockingValue).toContainText('TRANSITION:PHASE_NOTIFICATION_MISSING');
  await expect(blockingValue).toContainText('OVERRIDE:OVERRIDE_REQUEST_MISSING');
  await expect(actionsValue).toContainText('REQUEST_OVERRIDE_APPROVAL');

  await scenario.selectOption('override-applied');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Matrice de dépendances prête');
  await expect(ownerValue).toHaveText('ops.lead');
  await expect(blockingValue).toContainText('—');
  await expect(actionsValue).toContainText('—');
  await expect(successJson).toContainText('"status":"overridden"');
  await expect(errorMessage).toBeHidden();

  await scenario.selectOption('stale');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('DEPENDENCY_STATE_STALE');
  await expect(reasonValue).toContainText('snapshotAgeMs=6500');
  await expect(blockingValue).toContainText('FRESHNESS:DEPENDENCY_STATE_STALE');
  await expect(actionsValue).toContainText('REFRESH_DEPENDENCY_MATRIX');

  await scenario.selectOption('nominal');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successJson).toBeVisible();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(reasonValue).toContainText('Matrice de dépendances prête');
  await expect(ownerValue).toHaveText('ops.lead');
  await expect(blockingValue).toContainText('—');
  await expect(actionsValue).toContainText('—');
  await expect(successJson).toContainText('"allowed":true');
  await expect(action).toBeEnabled();
});

test('phase dependency matrix demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
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

        await page.getByLabel('Scénario').selectOption('override-required');
        await page.getByRole('button', { name: 'Construire matrice' }).click();

        await expect(page.getByRole('status', { name: 'État matrice dépendances' })).toHaveAttribute(
          'data-state',
          'error'
        );

        const overflow = await page.evaluate(() => {
          const doc = document.documentElement;
          const body = document.body;
          const reason = document.getElementById('reason-value');
          const owner = document.getElementById('owner-value');
          const blocking = document.getElementById('blocking-value');
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
            blocking: computeOverflow(blocking),
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
            overflow.blocking,
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
