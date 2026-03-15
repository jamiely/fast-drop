import type { Meta, StoryObj } from '@storybook/html';
import { SceneRoot } from '../scene/SceneRoot';
import { OrbitSystem } from '../systems/OrbitSystem';
import type { LightType } from '../scene/lighting';

interface LightingRigStoryArgs {
  selectedLightId: string;
  lightType: LightType;
  color: string;
  groundColor: string;
  intensity: number;
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
  distance: number;
  decay: number;
  angle: number;
  penumbra: number;
  ringAngularSpeed: number;
  cameraDistance: number;
  cameraPitch: number;
  cameraYaw: number;
  cameraTargetY: number;
}

interface LightingStoryInstance {
  host: HTMLDivElement;
  sceneRoot: SceneRoot;
  orbitSystem: OrbitSystem;
  frameId: number;
  running: boolean;
  destroy: () => void;
}

const STORY_ID = 'lighting-rig-lab';
const instances = new Map<string, LightingStoryInstance>();

const ensureInstance = (): LightingStoryInstance => {
  const existing = instances.get(STORY_ID);
  if (existing) {
    return existing;
  }

  const host = document.createElement('div');
  host.style.width = 'min(620px, 94vw)';
  host.style.height = '360px';
  host.style.borderRadius = '14px';
  host.style.overflow = 'hidden';
  host.style.border = '1px solid rgba(255,255,255,0.16)';
  host.style.background = 'rgba(9, 12, 24, 0.92)';
  host.style.position = 'relative';

  const hint = document.createElement('div');
  hint.textContent = 'Light helpers: ● source color, ◆ target marker';
  hint.style.position = 'absolute';
  hint.style.right = '10px';
  hint.style.bottom = '8px';
  hint.style.padding = '4px 8px';
  hint.style.borderRadius = '999px';
  hint.style.fontSize = '11px';
  hint.style.letterSpacing = '0.02em';
  hint.style.color = 'rgba(228, 236, 255, 0.9)';
  hint.style.background = 'rgba(9, 12, 24, 0.55)';
  hint.style.border = '1px solid rgba(255,255,255,0.16)';
  hint.style.backdropFilter = 'blur(4px)';
  hint.style.pointerEvents = 'none';
  host.append(hint);

  const sceneRoot = new SceneRoot(host, 5, 2.86, 2, true, true);
  const orbitSystem = new OrbitSystem(sceneRoot.jars, 2.86, 0.7);

  let frameId = 0;
  let lastNow = performance.now();
  let running = true;

  const loop = (now: number): void => {
    if (!running) {
      return;
    }

    const dt = Math.min(0.05, (now - lastNow) / 1000);
    lastNow = now;

    orbitSystem.update(dt);
    sceneRoot.update(dt);
    sceneRoot.render();
    frameId = window.requestAnimationFrame(loop);
  };

  frameId = window.requestAnimationFrame(loop);

  const observer = new MutationObserver(() => {
    if (host.isConnected) {
      return;
    }

    running = false;
    window.cancelAnimationFrame(frameId);
    observer.disconnect();
    instances.delete(STORY_ID);
  });
  observer.observe(document.body, { childList: true, subtree: true });

  const instance: LightingStoryInstance = {
    host,
    sceneRoot,
    orbitSystem,
    frameId,
    running,
    destroy: () => {
      running = false;
      window.cancelAnimationFrame(frameId);
      observer.disconnect();
      instances.delete(STORY_ID);
    }
  };

  instances.set(STORY_ID, instance);
  return instance;
};

const applyLightArgs = (
  instance: LightingStoryInstance,
  args: LightingRigStoryArgs
): void => {
  const lightId = args.selectedLightId;

  instance.sceneRoot.updateLightValue(lightId, 'type', args.lightType);
  instance.sceneRoot.updateLightValue(lightId, 'color', args.color);
  instance.sceneRoot.updateLightValue(lightId, 'groundColor', args.groundColor);
  instance.sceneRoot.updateLightValue(lightId, 'intensity', args.intensity);
  instance.sceneRoot.updateLightValue(lightId, 'x', args.x);
  instance.sceneRoot.updateLightValue(lightId, 'y', args.y);
  instance.sceneRoot.updateLightValue(lightId, 'z', args.z);
  instance.sceneRoot.updateLightValue(lightId, 'targetX', args.targetX);
  instance.sceneRoot.updateLightValue(lightId, 'targetY', args.targetY);
  instance.sceneRoot.updateLightValue(lightId, 'targetZ', args.targetZ);
  instance.sceneRoot.updateLightValue(lightId, 'distance', args.distance);
  instance.sceneRoot.updateLightValue(lightId, 'decay', args.decay);
  instance.sceneRoot.updateLightValue(lightId, 'angle', args.angle);
  instance.sceneRoot.updateLightValue(lightId, 'penumbra', args.penumbra);

  instance.orbitSystem.setBaseSpeed(args.ringAngularSpeed);
  instance.sceneRoot.applyCameraTuning({
    distance: args.cameraDistance,
    pitch: args.cameraPitch,
    yaw: args.cameraYaw,
    targetY: args.cameraTargetY
  });
};

const meta: Meta<LightingRigStoryArgs> = {
  title: 'Lighting/Light Rig Lab',
  render: (args) => {
    const instance = ensureInstance();
    applyLightArgs(instance, args);
    return instance.host;
  },
  args: {
    selectedLightId: 'key',
    lightType: 'directional',
    color: '#ffffff',
    groundColor: '#1b0f36',
    intensity: 0.8,
    x: 2.6,
    y: 6.2,
    z: 2.8,
    targetX: 0,
    targetY: 0.45,
    targetZ: 0,
    distance: 12,
    decay: 2,
    angle: 0.62,
    penumbra: 0.28,
    ringAngularSpeed: 0.7,
    cameraDistance: 6.8,
    cameraPitch: 3.8,
    cameraYaw: 0,
    cameraTargetY: 0.6
  },
  argTypes: {
    selectedLightId: {
      options: ['ambient', 'hemi', 'key', 'center-spot', 'purple-back'],
      control: { type: 'select' }
    },
    lightType: {
      options: ['ambient', 'hemisphere', 'directional', 'point', 'spot'],
      control: { type: 'select' }
    },
    color: { control: 'color' },
    groundColor: { control: 'color' },
    intensity: { control: { type: 'range', min: 0, max: 8, step: 0.05 } },
    x: { control: { type: 'range', min: -10, max: 10, step: 0.1 } },
    y: { control: { type: 'range', min: -2, max: 10, step: 0.1 } },
    z: { control: { type: 'range', min: -10, max: 10, step: 0.1 } },
    targetX: { control: { type: 'range', min: -8, max: 8, step: 0.1 } },
    targetY: { control: { type: 'range', min: -2, max: 6, step: 0.1 } },
    targetZ: { control: { type: 'range', min: -8, max: 8, step: 0.1 } },
    distance: { control: { type: 'range', min: 0, max: 40, step: 0.2 } },
    decay: { control: { type: 'range', min: 0, max: 4, step: 0.05 } },
    angle: { control: { type: 'range', min: 0.05, max: 1.57, step: 0.01 } },
    penumbra: { control: { type: 'range', min: 0, max: 1, step: 0.01 } },
    ringAngularSpeed: {
      control: { type: 'range', min: 0, max: 2.2, step: 0.01 }
    },
    cameraDistance: { control: { type: 'range', min: 3.6, max: 11, step: 0.1 } },
    cameraPitch: { control: { type: 'range', min: 2, max: 6, step: 0.1 } },
    cameraYaw: { control: { type: 'range', min: -2, max: 2, step: 0.1 } },
    cameraTargetY: { control: { type: 'range', min: 0, max: 2, step: 0.05 } }
  }
};

export default meta;
type Story = StoryObj<LightingRigStoryArgs>;

export const Default: Story = {};
