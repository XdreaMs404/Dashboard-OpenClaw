import { expect, test } from '@playwright/test';
import { buildUxResponsiveDecisionContinuityContract } from '../../src/ux-responsive-decision-continuity-contract.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Responsive 360/768/1366/1920 sans perte décisionnelle</title>
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
        width: min(100%, 76rem);
      }
      #reason-value,
      #diag-value,
      #summary-value,
      #proofs-value,
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
      <h1>Responsive 360/768/1366/1920 sans perte décisionnelle</h1>

      <label for="scenario">Scénario</label>
      <select id="scenario" name="scenario">
        <option value="invalid-input">Entrée invalide</option>
        <option value="missing-width">Viewport manquant (1920)</option>
        <option value="link-missing">Lien G4-UX manquant</option>
        <option value="budget-exceeded">Budget décision dépassé</option>
        <option value="success">Nominal</option>
      </select>

      <button id="run-contract" type="button">Évaluer continuité responsive</button>

      <p id="state-indicator" role="status" aria-label="État continuité responsive" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section aria-label="Zone focus démonstration">
        <h2>Parcours clavier critique</h2>
        <div class="focus-zone">
          <button id="focus-0" class="focus-target" type="button">Filtre période</button>
          <button id="focus-1" class="focus-target" type="button">Rafraîchir verdicts</button>
          <button id="focus-2" class="focus-target" type="button">Ouvrir preuve</button>
        </div>
      </section>

      <section>
        <h2>Résultat</h2>
        <dl>
          <div><dt>reasonCode</dt><dd id="reason-code-value">—</dd></div>
          <div><dt>reason</dt><dd id="reason-value">—</dd></div>
          <div><dt>diagnostics</dt><dd id="diag-value">—</dd></div>
          <div><dt>summary</dt><dd id="summary-value">—</dd></div>
          <div><dt>proofs</dt><dd id="proofs-value">—</dd></div>
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
      const proofsValue = document.getElementById('proofs-value');

      const setState = (state) => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;
      };

      const renderResult = (result) => {
        reasonCodeValue.textContent = result.reasonCode;
        reasonValue.textContent = result.reason;

        const diagnostics = result.diagnostics ?? {};
        diagValue.textContent =
          'model=' + String(diagnostics.responsiveDecisionModelVersion ?? '—') +
          ' | coverage=' + String(diagnostics.continuityCoveragePct ?? '—') +
          ' | complete=' + String(diagnostics.completeCount ?? '—') +
          ' | linked=' + String(diagnostics.linkedEvidenceCount ?? '—') +
          ' | budget=' + String(diagnostics.decisionTimeBudgetSec ?? '—') + 's';

        const summary = result.responsiveDecisionContinuityContract?.summary ?? {};
        summaryValue.textContent =
          'proofs=' + String(summary.completeCount ?? '—') + '/' + String(summary.proofCount ?? '—') +
          ' | linked=' + String(summary.linkedEvidenceCount ?? '—') +
          ' | coverage=' + String(summary.continuityCoveragePct ?? '—') +
          '% | worst=' + String(summary.worstDecisionTimeSec ?? '—') + 's';

        const proofs = Array.isArray(result.responsiveDecisionContinuityContract?.proofs)
          ? result.responsiveDecisionContinuityContract.proofs
          : [];

        proofsValue.textContent = proofs
          .map((entry) => String(entry.width) + 'px:' + String(entry.decisionTimeSec) + 's/link=' + String(entry.linkedToG4Ux))
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
          const result = await window.runResponsiveDecisionScenarioRuntime(scenarioInput.value);
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
    windowRef: 'S064',
    uxAudit: {
      score: 94,
      blockerCount: 0,
      wcagLevel: 'WCAG-2.2-AA'
    },
    criticalWidgets: [
      {
        id: 'gate-overview',
        states: {
          empty: { copy: 'Aucune donnée gate disponible.' },
          loading: { copy: 'Chargement des verdicts en cours…' },
          error: { copy: 'Impossible de charger les verdicts.' },
          success: { copy: 'Verdicts gate disponibles.' }
        },
        keyboard: {
          focusOrder: ['focus-0', 'focus-1', 'focus-2'],
          focusVisible: true,
          logicalOrder: true,
          trapFree: true
        }
      }
    ],
    criticalSurfaces: [
      {
        id: 'gate-summary-card',
        foreground: '#0f172a',
        background: '#ffffff',
        minContrastRatio: 4.5
      },
      {
        id: 'focus-ring-primary',
        foreground: '#1d4ed8',
        background: '#ffffff',
        minContrastRatio: 3
      }
    ],
    responsive: {
      viewports: [
        {
          viewport: 'mobile',
          criticalFlowValidated: true,
          keyboardNavigationValidated: true,
          focusVisibleValidated: true,
          noHorizontalOverflow: true
        },
        {
          viewport: 'tablet',
          criticalFlowValidated: true,
          keyboardNavigationValidated: true,
          focusVisibleValidated: true,
          noHorizontalOverflow: true
        },
        {
          viewport: 'desktop',
          criticalFlowValidated: true,
          keyboardNavigationValidated: true,
          focusVisibleValidated: true,
          noHorizontalOverflow: true
        }
      ]
    },
    responsiveDecisionJourneys: [
      {
        viewport: 'mobile',
        decisionTimeSec: 72,
        keyboardValidated: true,
        focusVisibleValidated: true,
        contrastValidated: true,
        noHorizontalOverflow: true
      },
      {
        viewport: 'tablet',
        decisionTimeSec: 67,
        keyboardValidated: true,
        focusVisibleValidated: true,
        contrastValidated: true,
        noHorizontalOverflow: true
      },
      {
        viewport: 'desktop',
        decisionTimeSec: 59,
        keyboardValidated: true,
        focusVisibleValidated: true,
        contrastValidated: true,
        noHorizontalOverflow: true
      }
    ],
    responsiveDecisionProofs: [
      {
        viewportWidth: 360,
        viewport: 'mobile',
        decisionTimeSec: 77,
        criticalFlowValidated: true,
        keyboardValidated: true,
        focusVisibleValidated: true,
        noHorizontalOverflow: true,
        captureRef: 'proof://S064/360-mobile.png',
        g4UxVerdictRef: 'verdict://S064/mobile',
        g4UxSubgate: 'G4-UX'
      },
      {
        viewportWidth: 768,
        viewport: 'tablet',
        decisionTimeSec: 70,
        criticalFlowValidated: true,
        keyboardValidated: true,
        focusVisibleValidated: true,
        noHorizontalOverflow: true,
        captureRef: 'proof://S064/768-tablet.png',
        g4UxVerdictRef: 'verdict://S064/tablet',
        g4UxSubgate: 'G4-UX'
      },
      {
        viewportWidth: 1366,
        viewport: 'desktop',
        decisionTimeSec: 63,
        criticalFlowValidated: true,
        keyboardValidated: true,
        focusVisibleValidated: true,
        noHorizontalOverflow: true,
        captureRef: 'proof://S064/1366-desktop.png',
        g4UxVerdictRef: 'verdict://S064/desktop',
        g4UxSubgate: 'G4-UX'
      },
      {
        viewportWidth: 1920,
        viewport: 'desktop-wide',
        decisionTimeSec: 61,
        criticalFlowValidated: true,
        keyboardValidated: true,
        focusVisibleValidated: true,
        noHorizontalOverflow: true,
        captureRef: 'proof://S064/1920-desktop-wide.png',
        g4UxVerdictRef: 'verdict://S064/desktop-wide',
        g4UxSubgate: 'G4-UX'
      }
    ]
  };
}

function runScenario(scenario) {
  if (scenario === 'success') {
    return buildUxResponsiveDecisionContinuityContract(buildPayload(), {
      nowMs: Date.parse('2026-03-17T12:00:00.000Z')
    });
  }

  if (scenario === 'missing-width') {
    const payload = buildPayload();
    payload.responsiveDecisionProofs = payload.responsiveDecisionProofs.filter(
      (entry) => entry.viewportWidth !== 1920
    );

    return buildUxResponsiveDecisionContinuityContract(payload, {
      nowMs: Date.parse('2026-03-17T12:00:00.000Z')
    });
  }

  if (scenario === 'link-missing') {
    const payload = buildPayload();
    payload.responsiveDecisionProofs[2].g4UxVerdictRef = '';

    return buildUxResponsiveDecisionContinuityContract(payload, {
      nowMs: Date.parse('2026-03-17T12:00:00.000Z')
    });
  }

  if (scenario === 'budget-exceeded') {
    const payload = buildPayload();
    payload.responsiveDecisionProofs[0].decisionTimeSec = 101;

    return buildUxResponsiveDecisionContinuityContract(payload, {
      nowMs: Date.parse('2026-03-17T12:00:00.000Z')
    });
  }

  return buildUxResponsiveDecisionContinuityContract('bad-input');
}

test('ux responsive decision continuity demo covers empty/loading/error/success and G4-UX linkage outcomes', async ({
  page
}) => {
  await page.exposeFunction('runResponsiveDecisionScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  const scenario = page.getByLabel('Scénario');
  const action = page.getByRole('button', { name: 'Évaluer continuité responsive' });
  const stateIndicator = page.getByRole('status', { name: 'État continuité responsive' });

  const reasonCodeValue = page.locator('#reason-code-value');
  const summaryValue = page.locator('#summary-value');
  const proofsValue = page.locator('#proofs-value');
  const errorMessage = page.getByRole('alert');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');

  await scenario.selectOption('invalid-input');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('INVALID_UX_RESPONSIVE_DECISION_INPUT');

  await scenario.selectOption('missing-width');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('UX_RESPONSIVE_VIEWPORT_REQUIRED');

  await scenario.selectOption('link-missing');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('UX_G4_UX_EVIDENCE_LINK_REQUIRED');

  await scenario.selectOption('budget-exceeded');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');
  await expect(reasonCodeValue).toHaveText('UX_DECISION_TIME_BUDGET_EXCEEDED');

  await scenario.selectOption('success');
  await action.click();
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(reasonCodeValue).toHaveText('OK');
  await expect(summaryValue).toContainText('proofs=4/4');
  await expect(summaryValue).toContainText('linked=4');
  await expect(proofsValue).toContainText('1920px:61s/link=true');
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

test('ux responsive continuity demo remains readable without horizontal overflow on 360/768/1366/1920', async ({
  page
}) => {
  await page.exposeFunction('runResponsiveDecisionScenarioRuntime', runScenario);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  await page.getByLabel('Scénario').selectOption('success');
  await page.getByRole('button', { name: 'Évaluer continuité responsive' }).click();
  await expect(page.getByRole('status', { name: 'État continuité responsive' })).toHaveAttribute(
    'data-state',
    'success'
  );

  const viewports = [
    { width: 360, height: 780 },
    { width: 768, height: 1024 },
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 }
  ];

  for (const viewport of viewports) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });

    const overflow = await page.evaluate(() => {
      const selectors = [
        '#reason-value',
        '#diag-value',
        '#summary-value',
        '#proofs-value',
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
