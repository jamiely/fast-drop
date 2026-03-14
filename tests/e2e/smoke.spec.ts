import { expect, test } from '@playwright/test';

test('shows HUD and updates balls after drop', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Score')).toBeVisible();
  await expect(page.getByText('Time')).toBeVisible();
  await expect(page.getByText('Balls')).toBeVisible();

  const ballsValue = page.locator('[data-role="balls"]');
  await expect(ballsValue).toHaveText('50');

  await page.getByRole('button', { name: 'Drop Ball (Space)' }).click();
  await expect(ballsValue).toHaveText('49');
});

test('shows debug menu when debug flag is enabled', async ({ page }) => {
  await page.goto('/?debug=1');
  await expect(page.getByText('Debug Menu (stubs)')).toBeVisible();
});
