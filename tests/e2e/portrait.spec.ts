import { expect, test } from '@playwright/test';

const framing = async (page: import('@playwright/test').Page) =>
  page.evaluate(() => window.__FAST_DROP_TEST_BRIDGE__?.getFraming?.());

test('a tall (vertical cabinet) viewport switches to portrait and keeps the playfield in frame', async ({
  page
}) => {
  await page.setViewportSize({ width: 1080, height: 1920 });
  await page.goto('/');
  await expect.poll(() => framing(page)).toBeTruthy();

  const tall = await framing(page);
  expect(tall?.layout).toBe('portrait');
  expect(tall?.maxNdc).toBeLessThan(1);
  await expect(page.locator('#app')).toHaveAttribute('data-layout', 'portrait');

  // Rotating back to landscape restores the landscape layout.
  await page.setViewportSize({ width: 1920, height: 1080 });
  await expect
    .poll(async () => (await framing(page))?.layout)
    .toBe('landscape');
  await expect(page.locator('#app')).toHaveAttribute(
    'data-layout',
    'landscape'
  );
});
