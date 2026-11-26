import { expect, test } from '@playwright/test';

test('scripted jar hits build combo into FEVER without losing portrait framing', async ({
  page
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/');
  await expect(page.locator('#app > canvas')).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(window.__FAST_DROP_TEST_BRIDGE__?.getJuiceState)
      )
    )
    .toBe(true);

  const result = await page.evaluate(() => {
    const bridge = window.__FAST_DROP_TEST_BRIDGE__!;
    bridge.restartRound!();
    let milestoneSeparated = false;
    for (let i = 0; i < 15; i += 1) {
      bridge.scriptJarHit!(i % 5);
      bridge.stepFrames(8);
      if (i === 4) {
        const popups = [...document.querySelectorAll('.fever-popup')];
        const score = popups
          .find((p) => p.textContent === '+20×2')
          ?.getBoundingClientRect();
        const milestone = popups
          .find((p) => p.textContent === '5 COMBO!')
          ?.getBoundingClientRect();
        milestoneSeparated = Boolean(
          score && milestone && score.top >= milestone.bottom
        );
      }
    }
    const state = bridge.getJuiceState!();
    const game = bridge.getGameState!();
    const tag = [...document.querySelectorAll('.fever-popup')]
      .filter((p) => p.querySelector('.fever-popup__tag'))
      .at(-1);
    let maxNdc = 0;
    // Sample during peak shake and the FOV punch, not just after effects have decayed.
    for (let i = 0; i < 60; i += 1) {
      bridge.stepFrames(1);
      maxNdc = Math.max(maxNdc, bridge.getFraming!().maxNdc);
    }
    // A weight-4 hit punches the FOV; sample every frame of the 100 ms punch.
    bridge.scriptJarHit!(0, true);
    for (let i = 0; i < 8; i += 1) {
      bridge.stepFrames(1);
      maxNdc = Math.max(maxNdc, bridge.getFraming!().maxNdc);
    }
    const feverStats = bridge.getJuiceStats!();
    bridge.setQualityTier!('low');
    bridge.stepFrames(1);
    const lowStats = bridge.getJuiceStats!();
    bridge.setQualityTier!('balanced');
    bridge.stepFrames(1);
    return {
      state,
      game,
      maxNdc,
      milestoneSeparated,
      points: tag?.firstChild?.textContent,
      tag: tag?.querySelector('.fever-popup__tag')?.textContent,
      feverStats,
      lowStats,
      balancedStats: bridge.getJuiceStats!(),
      layout: bridge.getFraming!().layout
    };
  });

  expect(result.state).toMatchObject({
    combo: 15,
    heat: 'fever',
    multiplier: 3,
    orbitScale: 1.25
  });
  expect(result.state!.feverRemaining).toBeGreaterThan(0);
  expect(result.game.score).toBe(320);
  expect(result.game.hits).toBe(15);
  expect(result.milestoneSeparated).toBe(true);
  // The popup shows the awarded points, with the multiplier as a separate tag.
  expect(result.points).toBe('+30');
  expect(result.tag).toBe('×3');
  // Bloom is on in FEVER, within the draw-call budget, and the low tier drops it.
  expect(result.feverStats).toMatchObject({ bloom: true });
  expect(result.feverStats!.calls).toBeGreaterThan(0);
  expect(result.feverStats!.calls).toBeLessThanOrEqual(150);
  expect(result.feverStats!.juiceMs).toBeLessThan(1);
  expect(result.lowStats).toMatchObject({ bloom: false });
  expect(result.lowStats!.calls).toBeLessThan(result.feverStats!.calls);
  expect(result.balancedStats).toMatchObject({ bloom: true });
  expect(result.layout).toBe('portrait');
  expect(result.maxNdc).toBeLessThan(1);
  await expect(page.locator('.fever-overlay')).toHaveAttribute(
    'data-heat',
    'fever'
  );
  // 15 scripted hits, plus the bonus hit that exercised the FOV punch.
  await expect(page.locator('[data-fever-combo]')).toHaveText('16 COMBO');
  await expect(page.getByRole('meter', { name: 'Fever' })).toBeVisible();
  expect(errors).toEqual([]);
});
