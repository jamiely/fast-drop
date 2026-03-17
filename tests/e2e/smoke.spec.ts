import { expect, test } from '@playwright/test';

test('shows HUD and updates balls after drop', async ({ page }) => {
  await page.goto('/');

  const hud = page.locator('.hud');
  await expect(hud.getByText('Score', { exact: true })).toBeVisible();
  await expect(hud.getByText('Time', { exact: true })).toBeVisible();
  await expect(hud.getByText('Balls', { exact: true })).toBeVisible();

  const ballsValue = page.locator('[data-role="balls"]');
  await expect(ballsValue).toHaveText('50');

  await page.keyboard.press('Space');
  await expect(ballsValue).toHaveText('49');
});

test('shows debug menu when debug flag is enabled', async ({ page }) => {
  await page.goto('/?debug=1');
  await expect(page.getByText('Debug Menu')).toBeVisible();
});

test('uses 1.3 as default status display scale', async ({ page }) => {
  await page.goto('/?debug=1');

  const displayScale = page.locator(
    'input[data-gameplay="statusDisplayScale"]'
  );
  await expect(displayScale).toHaveValue('1.3');

  await page.getByRole('button', { name: 'Copy values' }).click();
  await expect(page.locator('.debug-menu textarea')).toHaveValue(
    /"statusDisplayScale": 1.3/
  );
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

test('round ends on timer expiry and shows summary overlay', async ({
  page
}) => {
  await page.goto('/?debug=1');

  await page.evaluate(() => {
    window.__FAST_DROP_TEST_BRIDGE__?.setTimeRemaining?.(0.1);
    window.__FAST_DROP_TEST_BRIDGE__?.stepFrames(12);
  });

  await expect(page.locator('.summary-overlay')).toBeVisible();
  await expect(page.getByText('Round Complete')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Play Again' })).toBeVisible();
});

test('round ends immediately after balls are exhausted', async ({ page }) => {
  await page.goto('/?debug=1');

  await page.evaluate(() => {
    window.__FAST_DROP_TEST_BRIDGE__?.setBallsRemaining?.(1);
  });

  await page.keyboard.press('Space');

  await expect(page.locator('[data-role="balls"]')).toHaveText('00');
  await expect(page.locator('.summary-overlay')).toBeVisible();
});

test('summary values are non-empty and internally consistent', async ({
  page
}) => {
  await page.goto('/?debug=1');

  await page.evaluate(() => {
    window.__FAST_DROP_TEST_BRIDGE__?.setTimeRemaining?.(0.1);
    window.__FAST_DROP_TEST_BRIDGE__?.stepFrames(12);
  });

  const scoreText =
    (await page.locator('[data-role="summary-score"]').textContent()) ?? '';
  const hitsText =
    (await page.locator('[data-role="summary-hits"]').textContent()) ?? '';
  const missesText =
    (await page.locator('[data-role="summary-misses"]').textContent()) ?? '';
  const accuracyText =
    (await page.locator('[data-role="summary-accuracy"]').textContent()) ?? '';

  const score = Number(scoreText.trim());
  const hits = Number(hitsText.trim());
  const misses = Number(missesText.trim());
  const accuracy = Number(accuracyText.replace('%', '').trim());

  expect(Number.isFinite(score)).toBe(true);
  expect(Number.isFinite(hits)).toBe(true);
  expect(Number.isFinite(misses)).toBe(true);
  expect(Number.isFinite(accuracy)).toBe(true);

  expect(score).toBeGreaterThanOrEqual(0);
  expect(hits).toBeGreaterThanOrEqual(0);
  expect(misses).toBeGreaterThanOrEqual(0);
  expect(accuracy).toBeGreaterThanOrEqual(0);
  expect(accuracy).toBeLessThanOrEqual(100);

  const attempts = hits + misses;
  const expectedAccuracy = Math.round((hits / Math.max(1, attempts)) * 100);
  expect(accuracy).toBe(expectedAccuracy);
});

test('play again resets round state after summary is shown', async ({
  page
}) => {
  await page.goto('/?debug=1');

  await page.evaluate(() => {
    window.__FAST_DROP_TEST_BRIDGE__?.setScore?.(240);
    window.__FAST_DROP_TEST_BRIDGE__?.setBallsRemaining?.(12);
    window.__FAST_DROP_TEST_BRIDGE__?.setTimeRemaining?.(0.1);
    window.__FAST_DROP_TEST_BRIDGE__?.stepFrames(12);
  });

  await expect(page.locator('.summary-overlay')).toBeVisible();
  await expect(page.locator('[data-role="summary-score"]')).toHaveText('240');

  await page.keyboard.press('Enter');

  await expect(page.locator('.summary-overlay')).toBeHidden();
  await expect(page.locator('[data-role="score"]')).toHaveText('000000');
  await expect(page.locator('[data-role="balls"]')).toHaveText('50');
  await expect(page.locator('[data-role="time"]')).toHaveText(
    /2[89]\.\d|30\.0/
  );
});
