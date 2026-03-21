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

  it('does not mount HUD component in DOM', () => {
    const host = document.createElement('div');
    createHud(host);

    expect(host.querySelector('.hud')).toBeNull();
    expect(host.querySelector('.drop-btn')).toBeNull();
  });

  it('creates debug menu only when enabled and dispatches actions', () => {
    const host = document.createElement('div');
    const controls = {
      togglePause: vi.fn(),
      stepFrame: vi.fn(),
      addTime: vi.fn(),
      addScore: vi.fn(),
      forceTimerZero: vi.fn(),
      spawnBall: vi.fn(),
      forceGameOver: vi.fn(),
      forcePerfectGameOver: vi.fn(),
      setSpeedMultiplier: vi.fn(),
      applyGameplayTuning: vi.fn(),
      applyCameraTuning: vi.fn(),
      getLightSnapshot: vi.fn(() => []),
      applyLightValue: vi.fn(),
      addLight: vi.fn(),
      setSelectedLight: vi.fn(),
      savePreset: vi.fn(),
      loadPreset: vi.fn()
    };

    expect(createDebugMenu(host, false)).toBeNull();

    const menu = createDebugMenu(host, true, controls);
    expect(menu).not.toBeNull();
    menu
      ?.querySelector<HTMLButtonElement>('button[data-action="pause"]')
      ?.click();
    menu
      ?.querySelector<HTMLButtonElement>(
        'button[data-action="force-game-over"]'
      )
      ?.click();
    menu
      ?.querySelector<HTMLButtonElement>(
        'button[data-action="force-perfect-game-over"]'
      )
      ?.click();

    expect(controls.togglePause).toHaveBeenCalled();
    expect(controls.forceGameOver).toHaveBeenCalled();
    expect(controls.forcePerfectGameOver).toHaveBeenCalled();
  });

  it('updates light enabled toggle from debug menu', () => {
    const host = document.createElement('div');
    const controls = {
      togglePause: vi.fn(),
      stepFrame: vi.fn(),
      addTime: vi.fn(),
      addScore: vi.fn(),
      forceTimerZero: vi.fn(),
      spawnBall: vi.fn(),
      forceGameOver: vi.fn(),
      forcePerfectGameOver: vi.fn(),
      setSpeedMultiplier: vi.fn(),
      applyGameplayTuning: vi.fn(),
      applyCameraTuning: vi.fn(),
      getLightSnapshot: vi.fn(() => [
        {
          id: 'key',
          name: 'Key',
          type: 'directional' as const,
          enabled: true,
          color: '#ffffff',
          groundColor: '#111111',
          intensity: 1,
          x: 0,
          y: 5,
          z: 0,
          targetX: 0,
          targetY: 0,
          targetZ: 0,
          distance: 12,
          decay: 2,
          angle: 0.6,
          penumbra: 0.2
        }
      ]),
      applyLightValue: vi.fn(),
      addLight: vi.fn(),
      setSelectedLight: vi.fn(),
      savePreset: vi.fn(),
      loadPreset: vi.fn()
    };

    const menu = createDebugMenu(host, true, controls);
    const enabled = menu?.querySelector<HTMLInputElement>(
      'input[data-light-input="enabled"]'
    );
    expect(enabled).toBeTruthy();

    if (!enabled) {
      return;
    }

    enabled.checked = false;
    enabled.dispatchEvent(new Event('input', { bubbles: true }));

    expect(controls.applyLightValue).toHaveBeenCalledWith(
      'key',
      'enabled',
      false
    );
  });

  it('wires keyboard, pointer, and touch events in InputSystem', () => {
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

    const touchPointerEvent = new Event('pointerup') as PointerEvent;
    Object.defineProperty(touchPointerEvent, 'pointerType', {
      value: 'touch'
    });
    Object.defineProperty(touchPointerEvent, 'button', {
      value: 0
    });
    window.dispatchEvent(touchPointerEvent);

    window.dispatchEvent(new Event('touchend'));

    const button = document.createElement('button');
    document.body.appendChild(button);
    button.dispatchEvent(
      new MouseEvent('pointerup', { button: 0, bubbles: true })
    );

    ended = true;
    window.dispatchEvent(new Event('touchend'));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Enter' }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code: 'Space' }));

    expect(drops).toBe(3);
    expect(playAgain).toBe(3);
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

  it('renders state without mounting top-left HUD', () => {
    const host = document.createElement('div');
    const ui = new UISystem(host);

    ui.render({
      phase: 'playing',
      score: 25,
      timeRemaining: 9.91,
      ballsRemaining: 3,
      ballsDropped: 2,
      hits: 1,
      misses: 1
    });

    expect(host.querySelector('.hud')).toBeNull();
    expect(host.querySelector('[data-role="time"]')).toBeNull();
    expect(host.querySelector('[data-role="balls"]')).toBeNull();

    ui.render({
      phase: 'ended',
      score: 25,
      timeRemaining: 0,
      ballsRemaining: 3,
      ballsDropped: 2,
      hits: 1,
      misses: 1
    });

    expect(host.querySelector('.summary-overlay')?.hasAttribute('hidden')).toBe(
      true
    );
  });
});
