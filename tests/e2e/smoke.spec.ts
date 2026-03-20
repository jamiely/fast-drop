import { expect, test } from '@playwright/test';

test('does not render top-left HUD component', async ({ page }) => {
  await page.goto('/');

  await expect(page.locator('.hud')).toHaveCount(0);
  await expect(page.locator('[data-role="time"]')).toHaveCount(0);
  await expect(page.locator('[data-role="balls"]')).toHaveCount(0);
  await expect(page.locator('[data-role="score"]')).toHaveCount(0);
});

test('space drop works without HUD', async ({ page }) => {
  await page.goto('/');

  await page.keyboard.press('Space');
  await expect(page.locator('.hud')).toHaveCount(0);
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

test('debug controls still work with no HUD', async ({ page }) => {
  await page.goto('/?debug=1');

  await page.getByRole('button', { name: '+3s' }).click();
  await page.getByRole('button', { name: '+100' }).click();

  await expect(page.locator('.hud')).toHaveCount(0);
});

test('round ends on timer expiry and allows restart with space', async ({
  page
}) => {
  await page.goto('/?debug=1');

  await page.evaluate(() => {
    window.__FAST_DROP_TEST_BRIDGE__?.setTimeRemaining?.(0.1);
    window.__FAST_DROP_TEST_BRIDGE__?.stepFrames(12);
  });

  await expect(page.locator('.hud')).toHaveCount(0);
  await page.keyboard.press('Space');
  await expect(page.locator('.hud')).toHaveCount(0);
});

test('round waits a few seconds before ending after balls are exhausted', async ({
  page
}) => {
  await page.goto('/?debug=1');

  await page.evaluate(() => {
    window.__FAST_DROP_TEST_BRIDGE__?.setBallsRemaining?.(1);
  });

  await page.keyboard.press('Space');

  await page.evaluate(() => {
    window.__FAST_DROP_TEST_BRIDGE__?.stepFrames(181);
  });

  await expect(page.locator('.hud')).toHaveCount(0);
});

test('does not show summary overlay at end of round', async ({ page }) => {
  await page.goto('/?debug=1');

  await page.evaluate(() => {
    window.__FAST_DROP_TEST_BRIDGE__?.setTimeRemaining?.(0.1);
    window.__FAST_DROP_TEST_BRIDGE__?.stepFrames(12);
  });

  await expect(page.locator('.summary-overlay')).toBeHidden();
});

test('space restarts round after it ends', async ({ page }) => {
  await page.goto('/?debug=1');

  await page.evaluate(() => {
    window.__FAST_DROP_TEST_BRIDGE__?.setScore?.(240);
    window.__FAST_DROP_TEST_BRIDGE__?.setBallsRemaining?.(12);
    window.__FAST_DROP_TEST_BRIDGE__?.setTimeRemaining?.(0.1);
    window.__FAST_DROP_TEST_BRIDGE__?.stepFrames(12);
  });

  await page.keyboard.press('Space');

  await expect(page.locator('.hud')).toHaveCount(0);
  await expect(page.locator('[data-role="score"]')).toHaveCount(0);
});
