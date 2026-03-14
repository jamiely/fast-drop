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

  it('wires space key drop in InputSystem', () => {
    let drops = 0;
    new InputSystem(() => {
      drops += 1;
    });

    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyA' }));
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));

    expect(drops).toBe(1);
  });

  it('renders state and handles button events in UISystem', () => {
    const host = document.createElement('div');
    const ui = new UISystem(host);
    const handler = vi.fn();

    ui.onDrop(handler);

    ui.render({ score: 25, timeRemaining: 9.91, ballsRemaining: 3 });
    const score = host.querySelector('[data-role="score"]');
    const time = host.querySelector('[data-role="time"]');
    const balls = host.querySelector('[data-role="balls"]');
    const button = host.querySelector<HTMLButtonElement>('button');

    expect(score?.textContent).toBe('000025');
    expect(time?.textContent).toBe('09.9');
    expect(balls?.textContent).toBe('03');
    expect(button?.disabled).toBe(false);

    button?.click();
    expect(handler).toHaveBeenCalledTimes(1);

    ui.render({ score: 25, timeRemaining: 0, ballsRemaining: 3 });
    expect(button?.disabled).toBe(true);
  });
});
