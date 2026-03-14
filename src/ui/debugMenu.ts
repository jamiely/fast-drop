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

const formatControlValue = (value: string): string => {
  const number = parseNumber(value);
  if (Math.abs(number) >= 100) {
    return number.toFixed(0);
  }

  if (Math.abs(number) >= 10) {
    return number.toFixed(1);
  }

  return number.toFixed(2);
};

const readCurrentSettings = (menu: HTMLElement): Record<string, number> => {
  const snapshot: Record<string, number> = {};

  menu.querySelectorAll<HTMLInputElement>('input[data-gameplay]').forEach((input) => {
    const key = input.dataset.gameplay;
    if (!key) {
      return;
    }

    snapshot[key] = parseNumber(input.value);
  });

  menu.querySelectorAll<HTMLInputElement>('input[data-camera]').forEach((input) => {
    const key = input.dataset.camera;
    if (!key) {
      return;
    }

    snapshot[`camera.${key}`] = parseNumber(input.value);
  });

  if (Number.isFinite(snapshot.ringDiameter)) {
    snapshot.ringRadius = snapshot.ringDiameter * 0.5;
  }

  return snapshot;
};

const updateControlBadges = (menu: HTMLElement): void => {
  menu.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach((input) => {
    const gameplayKey = input.dataset.gameplay;
    const cameraKey = input.dataset.camera;
    const key = gameplayKey ? `gameplay:${gameplayKey}` : `camera:${cameraKey ?? ''}`;

    const output = menu.querySelector<HTMLElement>(`[data-value-for="${key}"]`);
    if (!output) {
      return;
    }

    output.textContent = formatControlValue(input.value);
  });
};

const updateSnapshotField = (menu: HTMLElement): void => {
  const output = menu.querySelector<HTMLTextAreaElement>('[data-role="snapshot"]');
  if (!output) {
    return;
  }

  const snapshot = readCurrentSettings(menu);
  output.value = JSON.stringify(snapshot, null, 2);
};

const refreshDebugMenuValues = (menu: HTMLElement): void => {
  updateControlBadges(menu);
  updateSnapshotField(menu);
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
      <label>Ball bounce <span class="debug-menu__value" data-value-for="gameplay:ballBounciness">0.46</span><input type="range" min="0.1" max="0.9" step="0.01" value="0.46" data-gameplay="ballBounciness" /></label>
      <label>Wall bounce <span class="debug-menu__value" data-value-for="gameplay:wallBounciness">0.52</span><input type="range" min="0.1" max="0.9" step="0.01" value="0.52" data-gameplay="wallBounciness" /></label>
      <label>Floor bounce <span class="debug-menu__value" data-value-for="gameplay:floorBounciness">0.42</span><input type="range" min="0.1" max="0.9" step="0.01" value="0.42" data-gameplay="floorBounciness" /></label>
      <label>Jar diameter <span class="debug-menu__value" data-value-for="gameplay:jarDiameterScale">1.00</span><input type="range" min="0.7" max="1.5" step="0.01" value="1" data-gameplay="jarDiameterScale" /></label>
      <label>Jar height <span class="debug-menu__value" data-value-for="gameplay:jarHeightScale">1.00</span><input type="range" min="0.7" max="1.6" step="0.01" value="1" data-gameplay="jarHeightScale" /></label>
      <label>Jar spin speed <span class="debug-menu__value" data-value-for="gameplay:ringAngularSpeed">0.80</span><input type="range" min="0" max="2.2" step="0.01" value="0.8" data-gameplay="ringAngularSpeed" /></label>
      <label>Ball size <span class="debug-menu__value" data-value-for="gameplay:ballSizeScale">1.00</span><input type="range" min="0.6" max="1.8" step="0.01" value="1" data-gameplay="ballSizeScale" /></label>
      <label>Ring diameter <span class="debug-menu__value" data-value-for="gameplay:ringDiameter">5.72</span><input type="range" min="3" max="7" step="0.1" value="5.72" data-gameplay="ringDiameter" /></label>
      <label>Drop distance <span class="debug-menu__value" data-value-for="gameplay:dropPointZ">2.86</span><input type="range" min="1.2" max="3.2" step="0.05" value="2.86" data-gameplay="dropPointZ" /></label>
      <label>Drop height <span class="debug-menu__value" data-value-for="gameplay:dropHeight">2.60</span><input type="range" min="1.2" max="4.2" step="0.05" value="2.6" data-gameplay="dropHeight" /></label>
      <label>Drop cooldown (ms) <span class="debug-menu__value" data-value-for="gameplay:dropCooldownMs">80</span><input type="range" min="0" max="100" step="5" value="80" data-gameplay="dropCooldownMs" /></label>
    </div>
    <div class="debug-menu__group">
      <h4>Camera tuning</h4>
      <label>Distance <span class="debug-menu__value" data-value-for="camera:distance">6.80</span><input type="range" min="4" max="10" step="0.1" value="6.8" data-camera="distance" /></label>
      <label>Pitch <span class="debug-menu__value" data-value-for="camera:pitch">3.80</span><input type="range" min="2" max="6" step="0.1" value="3.8" data-camera="pitch" /></label>
      <label>Yaw <span class="debug-menu__value" data-value-for="camera:yaw">0.00</span><input type="range" min="-2" max="2" step="0.1" value="0" data-camera="yaw" /></label>
      <label>Target Y <span class="debug-menu__value" data-value-for="camera:targetY">0.60</span><input type="range" min="0" max="2" step="0.05" value="0.6" data-camera="targetY" /></label>
    </div>
    <div class="debug-menu__group">
      <h4>Current values</h4>
      <textarea class="debug-menu__snapshot" data-role="snapshot" readonly></textarea>
      <button type="button" data-action="copy-values">Copy values</button>
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
          refreshDebugMenuValues(menu);
          break;
        case 'copy-values': {
          const snapshot = menu.querySelector<HTMLTextAreaElement>(
            '[data-role="snapshot"]'
          );
          if (!snapshot) {
            return;
          }

          void navigator.clipboard.writeText(snapshot.value).catch((error) => {
            console.warn('[DebugMenu] Unable to copy values to clipboard', error);
          });
          break;
        }
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
          refreshDebugMenuValues(menu);
          return;
        }

        controls?.applyGameplayTuning(
          key as keyof GameplayTuning,
          parseNumber(input.value)
        );
        refreshDebugMenuValues(menu);
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
        refreshDebugMenuValues(menu);
      });
    });

  host.appendChild(menu);
  refreshDebugMenuValues(menu);
  return menu;
};
