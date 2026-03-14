import type { CameraTuning, GameplayTuning } from '../game/config';

export interface DebugMenuControls {
  togglePause: () => void;
  stepFrame: () => void;
  addTime: () => void;
  addScore: () => void;
  spawnBall: () => void;
  setSpeedMultiplier: (multiplier: number) => void;
  applyGameplayTuning: (key: keyof GameplayTuning, value: number) => void;
  applyCameraTuning: (key: keyof CameraTuning, value: number) => void;
  savePreset: () => void;
  loadPreset: () => void;
}

const parseNumber = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const createDebugMenu = (
  host: HTMLElement,
  enabled: boolean,
  controls?: DebugMenuControls
): HTMLElement | null => {
  if (!enabled) {
    return null;
  }

  const menu = document.createElement('aside');
  menu.className = 'debug-menu';
  menu.innerHTML = `
    <h3>Debug Menu</h3>
    <div class="debug-menu__actions">
      <button type="button" data-action="pause">Pause/Resume</button>
      <button type="button" data-action="step">Step Frame</button>
      <button type="button" data-action="add-time">+3s</button>
      <button type="button" data-action="add-score">+100</button>
      <button type="button" data-action="spawn-ball">Spawn Ball</button>
      <button type="button" data-action="speed-05">0.5x</button>
      <button type="button" data-action="speed-1">1x</button>
      <button type="button" data-action="speed-2">2x</button>
      <button type="button" data-action="save">Save Preset</button>
      <button type="button" data-action="load">Load Preset</button>
    </div>
    <div class="debug-menu__group">
      <h4>Gameplay tuning</h4>
      <label>Ball bounce <input type="range" min="0.1" max="0.9" step="0.01" value="0.46" data-gameplay="ballBounciness" /></label>
      <label>Wall bounce <input type="range" min="0.1" max="0.9" step="0.01" value="0.52" data-gameplay="wallBounciness" /></label>
      <label>Floor bounce <input type="range" min="0.1" max="0.9" step="0.01" value="0.42" data-gameplay="floorBounciness" /></label>
      <label>Jar diameter <input type="range" min="0.7" max="1.5" step="0.01" value="1" data-gameplay="jarDiameterScale" /></label>
      <label>Jar height <input type="range" min="0.7" max="1.6" step="0.01" value="1" data-gameplay="jarHeightScale" /></label>
      <label>Ball size <input type="range" min="0.6" max="1.8" step="0.01" value="1" data-gameplay="ballSizeScale" /></label>
      <label>Ring diameter <input type="range" min="3" max="7" step="0.1" value="5.72" data-gameplay="ringDiameter" /></label>
      <label>Drop distance <input type="range" min="1.2" max="3.2" step="0.05" value="2.86" data-gameplay="dropPointZ" /></label>
      <label>Drop height <input type="range" min="1.2" max="4.2" step="0.05" value="2.6" data-gameplay="dropHeight" /></label>
      <label>Drop cooldown (ms) <input type="range" min="0" max="100" step="5" value="80" data-gameplay="dropCooldownMs" /></label>
    </div>
    <div class="debug-menu__group">
      <h4>Camera tuning</h4>
      <label>Distance <input type="range" min="4" max="10" step="0.1" value="6.8" data-camera="distance" /></label>
      <label>Pitch <input type="range" min="2" max="6" step="0.1" value="3.8" data-camera="pitch" /></label>
      <label>Yaw <input type="range" min="-2" max="2" step="0.1" value="0" data-camera="yaw" /></label>
      <label>Target Y <input type="range" min="0" max="2" step="0.05" value="0.6" data-camera="targetY" /></label>
    </div>
  `;

  menu.querySelectorAll<HTMLButtonElement>('button').forEach((button) => {
    button.addEventListener('click', () => {
      const action = button.getAttribute('data-action') ?? 'unknown';
      switch (action) {
        case 'pause':
          controls?.togglePause();
          break;
        case 'step':
          controls?.stepFrame();
          break;
        case 'add-time':
          controls?.addTime();
          break;
        case 'add-score':
          controls?.addScore();
          break;
        case 'spawn-ball':
          controls?.spawnBall();
          break;
        case 'speed-05':
          controls?.setSpeedMultiplier(0.5);
          break;
        case 'speed-1':
          controls?.setSpeedMultiplier(1);
          break;
        case 'speed-2':
          controls?.setSpeedMultiplier(2);
          break;
        case 'save':
          controls?.savePreset();
          break;
        case 'load':
          controls?.loadPreset();
          break;
        default:
          console.info('[DebugMenu] unknown action', action);
      }
    });
  });

  menu
    .querySelectorAll<HTMLInputElement>('input[data-gameplay]')
    .forEach((input) => {
      input.addEventListener('input', () => {
        const key = input.dataset.gameplay;
        if (!key) {
          return;
        }

        if (key === 'ringDiameter') {
          controls?.applyGameplayTuning(
            'ringRadius',
            parseNumber(input.value) * 0.5
          );
          return;
        }

        controls?.applyGameplayTuning(
          key as keyof GameplayTuning,
          parseNumber(input.value)
        );
      });
    });

  menu
    .querySelectorAll<HTMLInputElement>('input[data-camera]')
    .forEach((input) => {
      input.addEventListener('input', () => {
        const key = input.dataset.camera;
        if (!key) {
          return;
        }

        controls?.applyCameraTuning(
          key as keyof CameraTuning,
          parseNumber(input.value)
        );
      });
    });

  host.appendChild(menu);
  return menu;
};
