import { expect, test } from '@playwright/test';

test('shows bootstrap heading', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Fast Drop' })).toBeVisible();
});
