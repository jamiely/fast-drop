import { expect, test } from '@playwright/test';

test('scripted jar hits build combo into FEVER without losing portrait framing', async ({
  page
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  // Observe the real Fever context without adding a production debug surface.
  await page.addInitScript(() => {
    const contexts: AudioContext[] = [];
    Object.assign(window, { feverAudioContexts: contexts });
    window.AudioContext = new Proxy(window.AudioContext, {
      construct(target, args) {
        const context = Reflect.construct(target, args) as AudioContext;
        contexts.push(context);
        return context;
      }
    });
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

  // A non-drop key proves Fever itself unlocks, independently of classic's drop cue.
  await page.keyboard.press('KeyA');
  const audioStates = () =>
    page.evaluate(() =>
      (
        window as typeof window & { feverAudioContexts: AudioContext[] }
      ).feverAudioContexts.map((context) => context.state)
    );
  await expect.poll(audioStates).toEqual(['running']);

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
          .find((p) => p.textContent === '+20 ×2')
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
    let maxNdc = 0;
    // Sample during peak shake, not just after effects have decayed.
    for (let i = 0; i < 60; i += 1) {
      bridge.stepFrames(1);
      maxNdc = Math.max(maxNdc, bridge.getFraming!().maxNdc);
    }
    return {
      state,
      game,
      maxNdc,
      milestoneSeparated,
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
  expect(result.layout).toBe('portrait');
  expect(result.maxNdc).toBeLessThan(1);
  await expect(page.locator('.fever-overlay')).toHaveAttribute(
    'data-heat',
    'fever'
  );
  await expect(page.locator('[data-fever-combo]')).toHaveText('15 COMBO');
  await expect(page.getByRole('meter', { name: 'Fever' })).toBeVisible();
  expect(errors).toEqual([]);
  console.log(
    'Fever audio proof:',
    JSON.stringify({
      combo: result.state!.combo,
      heat: result.state!.heat,
      audioContexts: await audioStates(),
      consoleErrors: errors
    })
  );
});
