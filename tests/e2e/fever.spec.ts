import { expect, test } from '@playwright/test';

for (const viewport of [
  { width: 720, height: 1280 },
  { width: 720, height: 1680 }
]) {
  test(`big text fits ${viewport.width}x${viewport.height}`, async ({
    page
  }) => {
    await page.setViewportSize(viewport);
    await page.goto('/');
    await expect
      .poll(() =>
        page.evaluate(() => !!window.__FAST_DROP_TEST_BRIDGE__?.getJuiceState)
      )
      .toBe(true);
    await page.evaluate(() => {
      const b = window.__FAST_DROP_TEST_BRIDGE__!;
      for (let n = 0; n < 15; n++) b.scriptJarHit!();
      b.stepFrames(12);
    });
    const fit = async (selector: string) => {
      const boxes = await page.locator(selector).evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, height: r.height };
        })
      );
      expect(boxes.length).toBeGreaterThan(0);
      for (const box of boxes) {
        expect(box.x).toBeGreaterThanOrEqual(0);
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
        expect(box.y + box.height).toBeLessThanOrEqual(viewport.height);
      }
    };
    await fit('.fever-popup, .fever-edition, .fever-stamp, .fever-meter-label');
    await page.evaluate(() => {
      const b = window.__FAST_DROP_TEST_BRIDGE__!;
      b.setTimeRemaining!(0);
      b.stepFrames(1);
    });
    await expect(page.locator('.fever-finale')).toBeVisible();
    await fit('.fever-rank, .fever-tally, .fever-finale small');
  });
}

test('restart is fresh through Space and attract', async ({ page }) => {
  await page.goto('/');
  await expect
    .poll(() =>
      page.evaluate(() => !!window.__FAST_DROP_TEST_BRIDGE__?.getJuiceState)
    )
    .toBe(true);
  for (const attract of [false, true]) {
    await page.evaluate(() => {
      const b = window.__FAST_DROP_TEST_BRIDGE__!;
      for (let n = 0; n < 15; n++) b.scriptJarHit!();
      b.setTimeRemaining!(0);
      b.stepFrames(1);
    });
    if (attract)
      await page.evaluate(() =>
        window.__FAST_DROP_TEST_BRIDGE__!.startAttract!()
      );
    else await page.waitForTimeout(3100);
    await page.keyboard.press('Space');
    const fresh = await page.evaluate(() => {
      const b = window.__FAST_DROP_TEST_BRIDGE__!;
      return {
        game: b.getGameState!(),
        juice: b.getJuiceState!(),
        stats: b.getJuiceStats!()
      };
    });
    expect(fresh.game).toMatchObject({ score: 0, ballsRemaining: 50 });
    expect(fresh.juice).toMatchObject({
      combo: 0,
      meter: 0,
      heat: 'calm',
      multiplier: 1
    });
    expect(fresh.stats?.particles).toBe(0);
    await expect(page.locator('[data-fever-multiplier]')).toHaveText('×1');
    await expect(page.locator('.fever-popup, .fever-finale')).toHaveCount(0);
    await expect(page.locator('[data-fever-combo]')).toHaveAttribute(
      'data-visible',
      'false'
    );
  }
});

test('attract plays itself, then the first Space starts a full real round without dropping', async ({
  page
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/');
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(window.__FAST_DROP_TEST_BRIDGE__?.startAttract)
      )
    )
    .toBe(true);
  await page.evaluate(() => {
    const bridge = window.__FAST_DROP_TEST_BRIDGE__!;
    bridge.setTimeRemaining!(0);
    bridge.stepFrames(1);
    bridge.startAttract!();
  });
  await expect(page.locator('.fever-attract')).toBeVisible();
  await expect(page.locator('.fever-attract b')).toHaveText('PRESS DROP');
  const demo = await page.evaluate(() => {
    const bridge = window.__FAST_DROP_TEST_BRIDGE__!;
    bridge.stepFrames(180);
    return {
      attract: bridge.getAttractState!(),
      game: bridge.getGameState!(),
      framing: bridge.getFraming!()
    };
  });
  expect(demo.attract.phase).toBe('attract');
  expect(demo.game.ballsDropped).toBeGreaterThan(0);
  expect(demo.framing).toMatchObject({ layout: 'portrait' });
  expect(demo.framing.maxNdc).toBeLessThan(1);
  await page.keyboard.press('Space');
  const real = await page.evaluate(() => {
    const bridge = window.__FAST_DROP_TEST_BRIDGE__!;
    return {
      attract: bridge.getAttractState!(),
      game: bridge.getGameState!(),
      framing: bridge.getFraming!()
    };
  });
  expect(real.attract.phase).toBe('round');
  expect(real.game).toMatchObject({
    phase: 'playing',
    ballsRemaining: 50,
    ballsDropped: 0,
    hits: 0,
    misses: 0,
    score: 0
  });
  expect(real.framing.maxNdc).toBeLessThan(1);
  await expect(page.locator('.fever-attract')).toBeHidden();
  // A full mouse gesture must not restart on mousedown and then drop on pointerup.
  await page.evaluate(() => {
    const bridge = window.__FAST_DROP_TEST_BRIDGE__!;
    bridge.setTimeRemaining!(0);
    bridge.stepFrames(1);
    bridge.startAttract!();
  });
  await page.mouse.click(525, 1400);
  expect(
    await page.evaluate(() => window.__FAST_DROP_TEST_BRIDGE__!.getGameState!())
  ).toMatchObject({ phase: 'playing', ballsRemaining: 50, ballsDropped: 0 });
  await expect(page.locator('.fever-attract')).toBeHidden();
  expect(errors).toEqual([]);
});

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
    // 15 hits 8 frames apart: without the cap about ten callouts and three milestones would still be on screen.
    const live = [
      ...document.querySelectorAll<HTMLElement>(
        '.fever-popup:not(.fever-popup--hero):not([data-dismissed])'
      )
    ].map((p) => p.textContent);
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
      live,
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
  // Fast hits keep at most four score callouts, and the newest milestone replaced the older ones.
  expect(
    result.live.filter((text) => !text?.endsWith('COMBO!')).length
  ).toBeLessThanOrEqual(4);
  expect(result.live.filter((text) => text?.endsWith('COMBO!'))).toEqual([
    '15 COMBO!'
  ]);
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
