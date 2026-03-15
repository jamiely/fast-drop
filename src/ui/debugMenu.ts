import type { CameraTuning, GameplayTuning } from '../game/config';
import type {
  LightPropertyKey,
  LightSnapshot,
  LightType
} from '../scene/lighting';

export interface DebugMenuControls {
  togglePause: () => void;
  stepFrame: () => void;
  addTime: () => void;
  addScore: () => void;
  spawnBall: () => void;
  setSpeedMultiplier: (multiplier: number) => void;
  applyGameplayTuning: (key: keyof GameplayTuning, value: number) => void;
  applyCameraTuning: (key: keyof CameraTuning, value: number) => void;
  getLightSnapshot: () => LightSnapshot[];
  applyLightValue: (
    id: string,
    key: LightPropertyKey,
    value: number | string
  ) => void;
  addLight: (type: LightType) => void;
  savePreset: () => void;
  loadPreset: () => void;
}

interface LightEditorState {
  selectedLightId: string | null;
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

const readCurrentSettings = (
  menu: HTMLElement,
  controls?: DebugMenuControls
): Record<string, unknown> => {
  const snapshot: Record<string, unknown> = {};

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

  if (Number.isFinite(snapshot.outerRingDiameter as number)) {
    snapshot.outerRingRadius = Number(snapshot.outerRingDiameter) * 0.5;
  }

  if (controls) {
    snapshot.lights = controls.getLightSnapshot();
  }

  return snapshot;
};

const updateControlBadges = (menu: HTMLElement): void => {
  menu.querySelectorAll<HTMLInputElement>('input[type="range"]').forEach((input) => {
    const gameplayKey = input.dataset.gameplay;
    const cameraKey = input.dataset.camera;
    const lightKey = input.dataset.lightInput;

    let key = '';
    if (gameplayKey) {
      key = `gameplay:${gameplayKey}`;
    } else if (cameraKey) {
      key = `camera:${cameraKey}`;
    } else if (lightKey) {
      key = `light:${lightKey}`;
    }

    if (!key) {
      return;
    }

    const output = menu.querySelector<HTMLElement>(`[data-value-for="${key}"]`);
    if (!output) {
      return;
    }

    output.textContent = formatControlValue(input.value);
  });
};

const updateSnapshotField = (
  menu: HTMLElement,
  controls?: DebugMenuControls
): void => {
  const output = menu.querySelector<HTMLTextAreaElement>('[data-role="snapshot"]');
  if (!output) {
    return;
  }

  const snapshot = readCurrentSettings(menu, controls);
  output.value = JSON.stringify(snapshot, null, 2);
};

const LIGHT_TYPES: LightType[] = [
  'ambient',
  'hemisphere',
  'directional',
  'point',
  'spot'
];

const renderLightEditor = (
  menu: HTMLElement,
  controls: DebugMenuControls | undefined,
  state: LightEditorState
): void => {
  if (!controls) {
    return;
  }

  const lights = controls.getLightSnapshot();
  const select = menu.querySelector<HTMLSelectElement>('[data-light-selector]');
  if (!select) {
    return;
  }

  const hasCurrent = lights.some((light) => light.id === state.selectedLightId);
  if (!hasCurrent) {
    state.selectedLightId = lights[0]?.id ?? null;
  }

  select.innerHTML = lights
    .map(
      (light) =>
        `<option value="${light.id}">${light.name} (${light.type})</option>`
    )
    .join('');

  if (state.selectedLightId) {
    select.value = state.selectedLightId;
  }

  const selected = lights.find((light) => light.id === state.selectedLightId);
  const fields = menu.querySelectorAll<
    HTMLInputElement | HTMLSelectElement
  >('[data-light-input]');

  for (const field of fields) {
    if (!selected) {
      field.disabled = true;
      continue;
    }

    field.disabled = false;
    const key = field.dataset.lightInput as LightPropertyKey | undefined;
    if (!key) {
      continue;
    }

    const value = selected[key];
    if (typeof value === 'number') {
      field.value = String(value);
    } else if (typeof value === 'string') {
      field.value = value;
    }
  }
};

const refreshDebugMenuValues = (
  menu: HTMLElement,
  controls?: DebugMenuControls,
  lightState: LightEditorState = { selectedLightId: null }
): void => {
  renderLightEditor(menu, controls, lightState);
  updateControlBadges(menu);
  updateSnapshotField(menu, controls);
};

export const createDebugMenu = (
  host: HTMLElement,
  enabled: boolean,
  controls?: DebugMenuControls
): HTMLElement | null => {
  if (!enabled) {
    return null;
  }

  const lightState: LightEditorState = { selectedLightId: null };

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
      <label>Jar spin speed <span class="debug-menu__value" data-value-for="gameplay:ringAngularSpeed">0.70</span><input type="range" min="0" max="2.2" step="0.01" value="0.7" data-gameplay="ringAngularSpeed" /></label>
      <label>Ball size <span class="debug-menu__value" data-value-for="gameplay:ballSizeScale">1.00</span><input type="range" min="0.6" max="1.8" step="0.01" value="1" data-gameplay="ballSizeScale" /></label>
      <label>Ring diameter <span class="debug-menu__value" data-value-for="gameplay:outerRingDiameter">7.50</span><input type="range" min="3" max="8" step="0.1" value="7.5" data-gameplay="outerRingDiameter" /></label>
      <label>Drop distance <span class="debug-menu__value" data-value-for="gameplay:dropPointZ">2.86</span><input type="range" min="1.2" max="3.2" step="0.05" value="2.86" data-gameplay="dropPointZ" /></label>
      <label>Drop height <span class="debug-menu__value" data-value-for="gameplay:dropHeight">2.30</span><input type="range" min="1.2" max="4.2" step="0.05" value="2.3" data-gameplay="dropHeight" /></label>
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
      <h4>Lighting</h4>
      <label>Selected light
        <select data-light-selector></select>
      </label>
      <div class="debug-menu__actions">
        <button type="button" data-action="add-point-light">+ Point light</button>
        <button type="button" data-action="add-spot-light">+ Spot light</button>
      </div>
      <label>Type
        <select data-light-input="type">
          <option value="ambient">Ambient</option>
          <option value="hemisphere">Hemisphere</option>
          <option value="directional">Directional</option>
          <option value="point">Point</option>
          <option value="spot">Spot</option>
        </select>
      </label>
      <label>Color
        <input type="color" value="#ffffff" data-light-input="color" />
      </label>
      <label>Intensity <span class="debug-menu__value" data-value-for="light:intensity">1.00</span><input type="range" min="0" max="8" step="0.05" value="1" data-light-input="intensity" /></label>
      <label>X <span class="debug-menu__value" data-value-for="light:x">0.00</span><input type="range" min="-8" max="8" step="0.1" value="0" data-light-input="x" /></label>
      <label>Y <span class="debug-menu__value" data-value-for="light:y">5.00</span><input type="range" min="-2" max="10" step="0.1" value="5" data-light-input="y" /></label>
      <label>Z <span class="debug-menu__value" data-value-for="light:z">0.00</span><input type="range" min="-8" max="8" step="0.1" value="0" data-light-input="z" /></label>
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
        case 'add-point-light':
          controls?.addLight('point');
          break;
        case 'add-spot-light':
          controls?.addLight('spot');
          break;
        case 'save':
          controls?.savePreset();
          break;
        case 'load':
          controls?.loadPreset();
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

      refreshDebugMenuValues(menu, controls, lightState);
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

        controls?.applyGameplayTuning(
          key as keyof GameplayTuning,
          parseNumber(input.value)
        );
        refreshDebugMenuValues(menu, controls, lightState);
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
        refreshDebugMenuValues(menu, controls, lightState);
      });
    });

  const lightSelect = menu.querySelector<HTMLSelectElement>('[data-light-selector]');
  lightSelect?.addEventListener('change', () => {
    lightState.selectedLightId = lightSelect.value || null;
    refreshDebugMenuValues(menu, controls, lightState);
  });

  menu
    .querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-light-input]')
    .forEach((input) => {
      const trigger = input instanceof HTMLSelectElement ? 'change' : 'input';
      input.addEventListener(trigger, () => {
        if (!controls || !lightState.selectedLightId) {
          return;
        }

        const key = input.dataset.lightInput as LightPropertyKey | undefined;
        if (!key) {
          return;
        }

        const value =
          input instanceof HTMLInputElement && input.type === 'range'
            ? parseNumber(input.value)
            : input.value;

        if (key === 'type') {
          const type = String(value) as LightType;
          if (!LIGHT_TYPES.includes(type)) {
            return;
          }
        }

        controls.applyLightValue(lightState.selectedLightId, key, value);
        refreshDebugMenuValues(menu, controls, lightState);
      });
    });

  host.appendChild(menu);
  refreshDebugMenuValues(menu, controls, lightState);
  return menu;
};
