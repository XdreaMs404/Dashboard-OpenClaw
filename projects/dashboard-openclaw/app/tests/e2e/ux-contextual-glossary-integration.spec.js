import { expect, test } from '@playwright/test';
import { buildUxContextualGlossaryIntegration } from '../../src/ux-contextual-glossary-integration.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Glossaire BMAD contextuel intégré</title>
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
      #slot-value,
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
      <h1>Glossaire BMAD contextuel intégré</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="mapping-missing">Mapping contextuel manquant</option>
        <option value="design-fail">Incohérence design system</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-contract" type="button">Évaluer glossaire contextuel</button>

      <p id="state-indicator" role="status" aria-label="État glossaire contextuel" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section aria-label="Zone focus démonstration">
        <h2>Parcours clavier critique</h2>
        <div class="focus-zone">
          <button id="focus-0" class="focus-target" type="button">Filtre termes</button>
          <button id="focus-1" class="focus-target" type="button">Rafraîchir glossaire</button>
          <button id="focus-2" class="focus-target" type="button">Ouvrir définition</button>
        </div>
      </section>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>summary</dt><dd id="summary-value">—</dd></div>
          <div><dt>context slots</dt><dd id="slot-value">—</dd></div>
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
      const slotValue = document.getElementById('slot-value');

      const setState = (state) => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;
      };

      const renderResult = (result) => {
        reasonCodeValue.textContent = result.reasonCode;
        reasonValue.textContent = result.reason;

        const diagnostics = result.diagnostics ?? {};
        diagValue.textContent =
          'model=' + String(diagnostics.uxGlossaryModelVersion ?? '—') +
          ' | entries=' + String(diagnostics.glossaryEntryCount ?? '—') +
          ' | slots=' + String(diagnostics.contextualSlotCount ?? '—') +
          ' | designFail=' + String(diagnostics.failedDesignCheckCount ?? '—');

        const summary = result.contextualGlossaryIntegration?.summary ?? {};
        summaryValue.textContent =
          'mapped=' + String(summary.mappedSlotCount ?? '—') + '/' + String(summary.contextualSlotCount ?? '—') +
          ' | design=' + String(summary.designSystemCoveragePct ?? '—') +
          '% | responsive=' + String(summary.responsiveCoveragePct ?? '—') + '%';

        const slots = Array.isArray(result.contextualGlossaryIntegration?.contextualSlots)
          ? result.contextualGlossaryIntegration.contextualSlots
          : [];

        slotValue.textContent = slots
          .map((entry) => String(entry.id) + ':' + String(entry.definitionRef) + '/mapped=' + String(entry.mapped))
          .join(' | ');
      };

      setState('empty');

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;
        errorMessage.hidden = true;
        errorMessage.textContent = '';

        try {
          await new Promise((resolve) => setTimeout(resolve, 120));
          const result = await window.runGlossaryIntegrationScenarioRuntime(scenarioInput.value);
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
    windowRef: 'S067',
    uxAudit: {
      score: 94,
      blockerCount: 0,
      wcagLevel: 'WCAG-2.2-AA'
    },
    criticalWidgets: [
      {
        id: 'ux-glossary-panel',
        states: {
          empty: { copy: 'Aucun terme.' },
          loading: { copy: 'Chargement...' },
          error: { copy: 'Erreur.' },
          success: { copy: 'Succès.' }
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
        definition: 'Sous-gate UX bloquante.'
      },
      {
        id: 'BMAD-CONCERNS',
        term: 'CONCERNS',
        definition: 'Verdict intermédiaire.'
      },
      {
        id: 'BMAD-HANDOFF',
        term: 'Handoff',
        definition: 'Passage explicite au prochain rôle BMAD.'
      }
    ],
    uxDebts: [
      {
        id: 'UXD-101',
        title: 'Clarifier CONCERNS',
        status: 'OPEN',
        severity: 'BLOCKER',
        riskTags: ['T07'],
        definitionRefs: ['BMAD-CONCERNS'],
        reductionPlan: {
          owner: 'ux-qa-auditor',
          targetDate: '2026-03-23',
          successMetric: 'Aucune ambiguïté',
          actions: ['Aligner microcopy']
        }
      },
      {
        id: 'UXD-102',
        title: 'Réduire surcharge cognitive',
        status: 'IN_PROGRESS',
        severity: 'MAJOR',
        riskTags: ['U01'],
        definitionRefs: ['BMAD-G4-UX'],
        reductionPlan: {
          owner: 'bmad-pm',
          targetDate: '2026-03-25',
          successMetric: 'Parcours < 90s',
          actions: ['Ajouter contexte']
        }
      }
    ],
    contextualSlots: [
      { id: 'slot-verdict', label: 'Aide verdict', context: 'verdict-panel', definitionRef: 'BMAD-CONCERNS' },
      { id: 'slot-gate', label: 'Aide gate', context: 'gate-panel', definitionRef: 'BMAD-G4-UX' },
      { id: 'slot-handoff', label: 'Aide handoff', context: 'handoff-panel', definitionRef: 'BMAD-HANDOFF' }
    ],
    designSystemChecks: [
      { id: 'glossary-header', spacingPass: true, typographyPass: true, colorPass: true },
      { id: 'glossary-cards', spacingPass: true, typographyPass: true, colorPass: true }
    ],
    responsiveChecks: [
      { viewport: 'mobile', readable: true, noHorizontalOverflow: true, pass: true },
      { viewport: 'tablet', readable: true, noHorizontalOverflow: true, pass: true },
      { viewport: 'desktop', readable: true, noHorizontalOverflow: true, pass: true }
    ]
  };
}

function runScenario(scenario) {
  if (scenario === 'success') {
    return buildUxContextualGlossaryIntegration(buildPayload(), {
      nowMs: Date.parse('2026-03-19T09:00:00.000Z')
    });
  }

  if (scenario === 'mapping-missing') {
    const payload = buildPayload();
    payload.contextualSlots[1].definitionRef = 'UNKNOWN-REF';

    return buildUxContextualGlossaryIntegration(payload, {
      nowMs: Date.parse('2026-03-19T09:00:00.000Z')
    });
  }

  if (scenario === 'design-fail') {
    const payload = buildPayload();
    payload.designSystemChecks[0].spacingPass = false;

    return buildUxContextualGlossaryIntegration(payload, {
      nowMs: Date.parse('2026-03-19T09:00:00.000Z')
    });
  }

  return buildUxContextualGlossaryIntegration('bad-input');
}

test('ux contextual glossary demo covers empty/loading/error/success with contextual mapping + design checks', async ({
  page
}) => {
  await page.exposeFunction('runGlossaryIntegrationScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Évaluer glossaire contextuel' });
  const stateIndicator = page.getByRole('status', { name: 'État glossaire contextuel' });

  const reasonCodeValue = page.locator('#reason-code-value');
  const summaryValue = page.locator('#summary-value');
  const slotValue = page.locator('#slot-value');
  const errorMessage = page.getByRole('alert');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');

  await scenario.selectOption('invalid-input');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_UX_GLOSSARY_INPUT');

  await scenario.selectOption('mapping-missing');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('UX_GLOSSARY_CONTEXT_MAPPING_REQUIRED');

  await scenario.selectOption('design-fail');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('UX_DESIGN_SYSTEM_CONSISTENCY_REQUIRED');

  await scenario.selectOption('success');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(summaryValue).toContainText('mapped=3/3');
  await expect(summaryValue).toContainText('design=100%');
  await expect(slotValue).toContainText('slot-handoff:BMAD-HANDOFF/mapped=true');
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

test('ux contextual glossary demo remains readable without horizontal overflow on mobile/tablet/desktop', async ({
  page
}) => {
  await page.exposeFunction('runGlossaryIntegrationScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  await page.getByLabel('Scénario').selectOption('success');
  await page.getByRole('button', { name: 'Évaluer glossaire contextuel' }).click();
  await expect(page.getByRole('status', { name: 'État glossaire contextuel' })).toHaveAttribute(
    'data-state',
    'success'
  );

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
        '#slot-value',
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
