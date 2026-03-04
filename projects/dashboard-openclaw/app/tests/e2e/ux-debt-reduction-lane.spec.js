import { expect, test } from '@playwright/test';
import { buildUxDebtReductionLane } from '../../src/ux-debt-reduction-lane.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>UX debt lane et plan de réduction</title>
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
      #summary-value,
      #lane-value,
      #error-message,
      #success-json {
        max-width: 100%;
        overflow-wrap: anywhere;
        word-break: break-word;
      }
      #success-json {
        margin-top: .75rem;
        padding: .75rem;
        border: 1px solid #d1d5db;
        border-radius: .5rem;
        white-space: pre-wrap;
      }
      .focus-target {
        border: 1px solid #1f2937;
        border-radius: .5rem;
        background: #ffffff;
        color: #111827;
        padding: .45rem .7rem;
      }
      .focus-target:focus-visible,
      button:focus-visible,
      select:focus-visible {
        outline: 3px solid #1d4ed8;
        outline-offset: 2px;
      }
      .focus-zone {
        display: flex;
        flex-wrap: wrap;
        gap: .5rem;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>UX debt lane et plan de réduction</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="missing-definitions">Définitions BMAD absentes</option>
        <option value="plan-incomplete">Plan de réduction incomplet</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-contract" type="button">Évaluer lane UX</button>

      <p id="state-indicator" role="status" aria-label="État lane UX" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section aria-label="Zone focus démonstration">
        <h2>Parcours clavier critique</h2>
        <div class="focus-zone">
          <button id="focus-0" class="focus-target" type="button">Filtre lane</button>
          <button id="focus-1" class="focus-target" type="button">Rafraîchir lane</button>
          <button id="focus-2" class="focus-target" type="button">Ouvrir dette</button>
        </div>
      </section>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>summary</dt><dd id="summary-value">—</dd></div>
          <div><dt>lane</dt><dd id="lane-value">—</dd></div>
        </dl>
      </section>

      <pre id="success-json" aria-live="polite" aria-atomic="true" hidden></pre>
    </main>

    <script>
      const scenarioInput = document.getElementById('scenario');
      const action = document.getElementById('run-contract');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successJson = document.getElementById('success-json');

      const reasonCodeValue = document.getElementById('reason-code-value');
      const reasonValue = document.getElementById('reason-value');
      const diagValue = document.getElementById('diag-value');
      const summaryValue = document.getElementById('summary-value');
      const laneValue = document.getElementById('lane-value');

      const setState = (state) => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;
      };

      const renderResult = (result) => {
        reasonCodeValue.textContent = result.reasonCode;
        reasonValue.textContent = result.reason;

        const diagnostics = result.diagnostics ?? {};
        diagValue.textContent =
          'model=' + String(diagnostics.uxDebtModelVersion ?? '—') +
          ' | total=' + String(diagnostics.totalDebts ?? '—') +
          ' | open=' + String(diagnostics.openDebtCount ?? '—') +
          ' | defs=' + String(diagnostics.definitionCount ?? '—');

        const summary = result.uxDebtReductionLane?.summary ?? {};
        summaryValue.textContent =
          'open=' + String(summary.openCount ?? '—') +
          ' | inProgress=' + String(summary.inProgressCount ?? '—') +
          ' | closed=' + String(summary.closedCount ?? '—') +
          ' | plan=' + String(summary.reductionPlanCoveragePct ?? '—') + '%';

        const lane = result.uxDebtReductionLane?.lane ?? {};
        laneValue.textContent =
          'open=' + String((lane.open ?? []).length) +
          ' | inProgress=' + String((lane.inProgress ?? []).length) +
          ' | closed=' + String((lane.closed ?? []).length);
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 120));
          const result = await window.runUxDebtLaneScenarioRuntime(scenarioInput.value);
          renderResult(result);

          if (result.allowed && result.reasonCode === 'OK') {
            setState('success');
            errorMessage.hidden = true;
            successJson.hidden = false;
            successJson.textContent = JSON.stringify(result);
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

function buildPayload() {
  return {
    windowRef: 'S066',
    uxAudit: {
      score: 93,
      blockerCount: 0,
      wcagLevel: 'WCAG-2.2-AA'
    },
    criticalWidgets: [
      {
        id: 'ux-debt-lane',
        states: {
          empty: { copy: 'Aucune dette UX ouverte.' },
          loading: { copy: 'Chargement des dettes UX...' },
          error: { copy: 'Impossible de charger la lane UX.' },
          success: { copy: 'Lane UX disponible.' }
        },
        keyboard: {
          focusOrder: ['focus-0', 'focus-1', 'focus-2'],
          focusVisible: true,
          logicalOrder: true,
          trapFree: true
        }
      }
    ],
    bmadDefinitions: [
      {
        id: 'BMAD-G4-UX',
        term: 'G4-UX',
        definition: 'Sous-gate UX bloquante qui valide design, accessibilité et responsive avant DONE.'
      },
      {
        id: 'BMAD-CONCERNS',
        term: 'CONCERNS',
        definition: 'Verdict intermédiaire nécessitant corrections avant passage au gate suivant.'
      }
    ],
    uxDebts: [
      {
        id: 'UXD-001',
        title: 'Réduire ambiguïté CONCERNS',
        status: 'OPEN',
        severity: 'BLOCKER',
        riskTags: ['T07'],
        definitionRefs: ['BMAD-CONCERNS'],
        reductionPlan: {
          owner: 'ux-qa-auditor',
          targetDate: '2026-03-20',
          successMetric: '0 ambiguïté',
          actions: ['Aligner microcopy', 'Ajouter exemples']
        }
      },
      {
        id: 'UXD-002',
        title: 'Clarifier dépendance G4-UX',
        status: 'IN_PROGRESS',
        severity: 'MAJOR',
        riskTags: ['U01'],
        definitionRefs: ['BMAD-G4-UX'],
        reductionPlan: {
          owner: 'bmad-pm',
          targetDate: '2026-03-22',
          successMetric: '100% stories contextualisées',
          actions: ['Ajouter résumé contextuel', 'Lier preuves UX']
        }
      }
    ]
  };
}

function runScenario(scenario) {
  if (scenario === 'success') {
    return buildUxDebtReductionLane(buildPayload(), {
      nowMs: Date.parse('2026-03-18T10:00:00.000Z')
    });
  }

  if (scenario === 'missing-definitions') {
    const payload = buildPayload();
    payload.bmadDefinitions = [];

    return buildUxDebtReductionLane(payload, {
      nowMs: Date.parse('2026-03-18T10:00:00.000Z')
    });
  }

  if (scenario === 'plan-incomplete') {
    const payload = buildPayload();
    payload.uxDebts[0].reductionPlan.actions = [];

    return buildUxDebtReductionLane(payload, {
      nowMs: Date.parse('2026-03-18T10:00:00.000Z')
    });
  }

  return buildUxDebtReductionLane('bad-input');
}

test('ux debt lane demo covers empty/loading/error/success with reduction plan + contextual definitions', async ({
  page
}) => {
  await page.exposeFunction('runUxDebtLaneScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Évaluer lane UX' });
  const stateIndicator = page.getByRole('status', { name: 'État lane UX' });

  const reasonCodeValue = page.locator('#reason-code-value');
  const summaryValue = page.locator('#summary-value');
  const laneValue = page.locator('#lane-value');
  const errorMessage = page.getByRole('alert');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');

  await scenario.selectOption('invalid-input');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_UX_DEBT_LANE_INPUT');

  await scenario.selectOption('missing-definitions');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('UX_BMAD_DEFINITIONS_REQUIRED');

  await scenario.selectOption('plan-incomplete');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('UX_DEBT_PLAN_INCOMPLETE');

  await scenario.selectOption('success');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(summaryValue).toContainText('open=1');
  await expect(summaryValue).toContainText('inProgress=1');
  await expect(laneValue).toContainText('open=1');
  await expect(errorMessage).toBeHidden();

  const firstFocus = page.locator('#focus-0');
  const secondFocus = page.locator('#focus-1');
  await firstFocus.focus();
  await expect(firstFocus).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(secondFocus).toBeFocused();

  const outlineStyle = await secondFocus.evaluate((element) => getComputedStyle(element).outlineStyle);
  expect(outlineStyle).not.toBe('none');
});

test('ux debt lane demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
  page
}) => {
  await page.exposeFunction('runUxDebtLaneScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  await page.getByLabel('Scénario').selectOption('success');
  await page.getByRole('button', { name: 'Évaluer lane UX' }).click();
  await expect(page.getByRole('status', { name: 'État lane UX' })).toHaveAttribute('data-state', 'success');

  const viewports = [
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1440, height: 900 }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    const overflow = await page.evaluate(() => {
      const selectors = [
        '#reason-value',
        '#diag-value',
        '#summary-value',
        '#lane-value',
        '#error-message',
        '#success-json'
      ];

      const values = selectors.map((selector) => {
        const element = document.querySelector(selector);

        if (!element) {
          return 0;
        }

        return Math.max(0, element.scrollWidth - element.clientWidth);
      });

      const docOverflow = Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth);

      return Math.max(docOverflow, ...values);
    });

    expect(overflow).toBe(0);
  }
});
