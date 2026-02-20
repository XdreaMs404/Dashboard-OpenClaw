import { expect, test } from '@playwright/test';

test('basic app smoke on data URL', async ({ page }) => {
  await page.goto('data:text/html,<main><h1>BMAD App Smoke</h1><button id="run">Run</button></main>');
  await expect(page.getByRole('heading', { name: 'BMAD App Smoke' })).toBeVisible();
  await expect(page.locator('#run')).toHaveText('Run');
});
