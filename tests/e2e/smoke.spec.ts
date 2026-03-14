import { expect, test } from '@playwright/test';

test('shows HUD and updates balls after drop', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByText('Score', { exact: true })).toBeVisible();
  await expect(page.getByText('Time', { exact: true })).toBeVisible();
  await expect(page.getByText('Balls', { exact: true })).toBeVisible();

  const ballsValue = page.locator('[data-role="balls"]');
  await expect(ballsValue).toHaveText('50');

  await page.getByRole('button', { name: 'Drop Ball (Space)' }).click();
  await expect(ballsValue).toHaveText('49');
});

test('shows debug menu when debug flag is enabled', async ({ page }) => {
  await page.goto('/?debug=1');
  await expect(page.getByText('Debug Menu')).toBeVisible();
});

test('debug controls mutate HUD state when debug is enabled', async ({
  page
}) => {
  await page.goto('/?debug=1');

  const timeValue = page.locator('[data-role="time"]');
  const scoreValue = page.locator('[data-role="score"]');

  await expect(timeValue).toHaveText(/2?9\.\d|30\.0/);
  await expect(scoreValue).toHaveText('000000');

  await page.getByRole('button', { name: '+3s' }).click();
  await expect(timeValue).toHaveText(/3[2-3]\.\d/);

  await page.getByRole('button', { name: '+100' }).click();
  await expect(scoreValue).toHaveText('000100');
});
