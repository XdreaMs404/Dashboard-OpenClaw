import { expect, test } from '@playwright/test';
import { normalizeUserName } from '../../src/core.js';

const demoPageHtml = `
<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>Normalize User Name Demo</title>
  </head>
  <body>
    <main>
      <h1>Normalisation du nom utilisateur</h1>

      <label for="user-name-input">Nom utilisateur</label>
      <input id="user-name-input" name="userName" type="text" autocomplete="off" />
      <button id="normalize-action" type="button">Normaliser</button>

      <p id="state-indicator" role="status" aria-label="État de normalisation" aria-live="polite" data-state="empty">
        État: empty
      </p>

      <p id="error-message" role="alert" hidden></p>

      <section>
        <h2>Résultat normalisé</h2>
        <p id="success-value" aria-live="polite" aria-atomic="true" hidden></p>
      </section>
    </main>

    <script>
      const input = document.getElementById('user-name-input');
      const action = document.getElementById('normalize-action');
      const stateIndicator = document.getElementById('state-indicator');
      const errorMessage = document.getElementById('error-message');
      const successValue = document.getElementById('success-value');

      const setState = (state, payload = '') => {
        stateIndicator.dataset.state = state;
        stateIndicator.textContent = 'État: ' + state;

        if (state === 'error') {
          errorMessage.hidden = false;
          errorMessage.textContent = payload;
          successValue.hidden = true;
          successValue.textContent = '';
          return;
        }

        if (state === 'success') {
          successValue.hidden = false;
          successValue.textContent = payload;
          errorMessage.hidden = true;
          errorMessage.textContent = '';
          return;
        }

        errorMessage.hidden = true;
        errorMessage.textContent = '';
        successValue.hidden = true;
        successValue.textContent = '';
      };

      setState('empty');

      input.addEventListener('input', () => {
        if (input.value.length === 0) {
          setState('empty');
        }
      });

      action.addEventListener('click', async () => {
        setState('loading');
        action.disabled = true;

        try {
          await new Promise((resolve) => setTimeout(resolve, 150));
          const normalized = await window.normalizeUserNameRuntime(input.value);
          setState('success', normalized);
        } catch (error) {
          setState('error', error?.message ?? String(error));
        } finally {
          action.disabled = false;
          input.focus();
        }
      });
    </script>
  </body>
</html>
`;

test('normalize user name flow covers empty/loading/error/success states', async ({ page }) => {
  await page.exposeFunction('normalizeUserNameRuntime', normalizeUserName);

  await page.goto(`data:text/html,${encodeURIComponent(demoPageHtml)}`);

  const input = page.getByLabel('Nom utilisateur');
  const action = page.getByRole('button', { name: 'Normaliser' });
  const stateIndicator = page.getByRole('status', { name: 'État de normalisation' });
  const errorMessage = page.getByRole('alert');
  const successValue = page.locator('#success-value');

  await expect(stateIndicator).toHaveAttribute('data-state', 'empty');
  await expect(stateIndicator).toHaveText('État: empty');

  await input.fill(' \n\t ');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(errorMessage).toHaveText('Le nom utilisateur est vide après normalisation');
  await expect(stateIndicator).toHaveAttribute('data-state', 'error');

  await input.fill('  ÉLODIE\t\n Martin  ');
  await action.click();

  await expect(stateIndicator).toHaveAttribute('data-state', 'loading');
  await expect(successValue).toHaveAttribute('aria-live', 'polite');
  await expect(successValue).toHaveText('ÉLODIE Martin');
  await expect(stateIndicator).toHaveAttribute('data-state', 'success');
  await expect(errorMessage).toBeHidden();
});
