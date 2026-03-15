// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { InputSystem } from '../../src/systems/InputSystem';
import { UISystem } from '../../src/systems/UISystem';
import { createDebugMenu } from '../../src/ui/debugMenu';
import { createHud } from '../../src/ui/hud';

describe('DOM systems and UI helpers', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('creates HUD and appends controls', () => {
    const host = document.createElement('div');
    const hud = createHud(host);

    expect(host.contains(hud.root)).toBe(true);
    expect(hud.dropButton.textContent).toContain('Drop Ball');
  });

  it('creates debug menu only when enabled and dispatches actions', () => {
    const host = document.createElement('div');
    const controls = {
      togglePause: vi.fn(),
      stepFrame: vi.fn(),
      addTime: vi.fn(),
      addScore: vi.fn(),
      spawnBall: vi.fn(),
      setSpeedMultiplier: vi.fn(),
      applyGameplayTuning: vi.fn(),
      applyCameraTuning: vi.fn(),
      getLightSnapshot: vi.fn(() => []),
      applyLightValue: vi.fn(),
      addLight: vi.fn(),
      savePreset: vi.fn(),
      loadPreset: vi.fn()
    };

    expect(createDebugMenu(host, false)).toBeNull();

    const menu = createDebugMenu(host, true, controls);
    expect(menu).not.toBeNull();
    menu
      ?.querySelector<HTMLButtonElement>('button[data-action="pause"]')
      ?.click();

    expect(controls.togglePause).toHaveBeenCalled();
  });

  it('wires keyup and pointerup events in InputSystem', () => {
    let drops = 0;
    let playAgain = 0;
    let ended = false;

    new InputSystem({
      onDrop: () => {
        drops += 1;
      },
      onPlayAgain: () => {
        playAgain += 1;
      },
      isRoundEnded: () => ended
    });

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'KeyA' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));
    window.dispatchEvent(new MouseEvent('pointerup', { button: 0 }));
    window.dispatchEvent(new MouseEvent('pointerup', { button: 1 }));

    const button = document.createElement('button');
    document.body.appendChild(button);
    button.dispatchEvent(
      new MouseEvent('pointerup', { button: 0, bubbles: true })
    );

    ended = true;
    window.dispatchEvent(new MouseEvent('pointerup', { button: 0 }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));

    expect(drops).toBe(2);
    expect(playAgain).toBe(2);
  });

  it('handles ended-key input without play-again handler', () => {
    let drops = 0;
    new InputSystem({
      onDrop: () => {
        drops += 1;
      },
      isRoundEnded: () => true
    });

    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));

    expect(drops).toBe(0);
  });

  it('renders state and handles button events in UISystem', () => {
    const host = document.createElement('div');
    const ui = new UISystem(host);
    const handler = vi.fn();

    ui.onDrop(handler);

    const onPlayAgain = vi.fn();
    ui.onPlayAgain(onPlayAgain);

    ui.render({
      phase: 'playing',
      score: 25,
      timeRemaining: 9.91,
      ballsRemaining: 3,
      ballsDropped: 2,
      hits: 1,
      misses: 1
    });

    const score = host.querySelector('[data-role="score"]');
    const time = host.querySelector('[data-role="time"]');
    const balls = host.querySelector('[data-role="balls"]');
    const button = host.querySelector<HTMLButtonElement>('.drop-btn');
    const playAgainButton = host.querySelector<HTMLButtonElement>(
      '.summary-overlay__play-again'
    );

    expect(score?.textContent).toBe('000025');
    expect(time?.textContent).toBe('09.9');
    expect(balls?.textContent).toBe('03');
    expect(button?.disabled).toBe(false);

    button?.click();
    expect(handler).toHaveBeenCalledTimes(1);

    ui.render({
      phase: 'ended',
      score: 25,
      timeRemaining: 0,
      ballsRemaining: 3,
      ballsDropped: 2,
      hits: 1,
      misses: 1
    });

    expect(button?.disabled).toBe(true);
    expect(host.querySelector('.summary-overlay')?.hasAttribute('hidden')).toBe(
      false
    );
    expect(
      host.querySelector('[data-role="summary-accuracy"]')?.textContent
    ).toBe('50%');

    playAgainButton?.click();
    expect(onPlayAgain).toHaveBeenCalledTimes(1);
  });
});
