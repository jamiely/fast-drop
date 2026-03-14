import {
  Color,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  type Object3D
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { addLighting } from '../scene/lighting';

interface OrbitCameraState {
  x: number;
  y: number;
  z: number;
  targetX: number;
  targetY: number;
  targetZ: number;
}

interface ThreePreviewOptions {
  previewId?: string;
  camera?: {
    x?: number;
    y?: number;
    z?: number;
    targetX?: number;
    targetY?: number;
    targetZ?: number;
    fov?: number;
    minDistance?: number;
    maxDistance?: number;
  };
  showHint?: boolean;
  onCameraChange?: (state: OrbitCameraState) => void;
}

interface PreviewInstance {
  host: HTMLDivElement;
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  renderer: WebGLRenderer;
  currentObject: Object3D;
  hint?: HTMLDivElement;
  pendingCameraFrame: number | null;
  queueCameraChange: () => void;
  observer: MutationObserver;
}

const previewInstances = new Map<string, PreviewInstance>();

const PREVIEW_WIDTH = 520;
const PREVIEW_HEIGHT = 320;
const CAMERA_SYNC_EPSILON = 0.002;

const nearlyEqual = (a: number, b: number) => Math.abs(a - b) <= CAMERA_SYNC_EPSILON;

const applyCameraSettings = (
  instance: PreviewInstance,
  cameraSettings: NonNullable<ThreePreviewOptions['camera']>
) => {
  if (typeof cameraSettings.fov === 'number' && !nearlyEqual(instance.camera.fov, cameraSettings.fov)) {
    instance.camera.fov = cameraSettings.fov;
    instance.camera.updateProjectionMatrix();
  }

  const nextX = cameraSettings.x ?? instance.camera.position.x;
  const nextY = cameraSettings.y ?? instance.camera.position.y;
  const nextZ = cameraSettings.z ?? instance.camera.position.z;
  const nextTargetX = cameraSettings.targetX ?? instance.controls.target.x;
  const nextTargetY = cameraSettings.targetY ?? instance.controls.target.y;
  const nextTargetZ = cameraSettings.targetZ ?? instance.controls.target.z;

  if (
    !nearlyEqual(instance.camera.position.x, nextX) ||
    !nearlyEqual(instance.camera.position.y, nextY) ||
    !nearlyEqual(instance.camera.position.z, nextZ)
  ) {
    instance.camera.position.set(nextX, nextY, nextZ);
  }

  if (
    !nearlyEqual(instance.controls.target.x, nextTargetX) ||
    !nearlyEqual(instance.controls.target.y, nextTargetY) ||
    !nearlyEqual(instance.controls.target.z, nextTargetZ)
  ) {
    instance.controls.target.set(nextTargetX, nextTargetY, nextTargetZ);
  }

  instance.controls.minDistance = cameraSettings.minDistance ?? 1.2;
  instance.controls.maxDistance = cameraSettings.maxDistance ?? 8;
  instance.controls.update();
};

const createPreviewInstance = (
  object: Object3D,
  options: ThreePreviewOptions,
  instanceId: string
): PreviewInstance => {
  const host = document.createElement('div');
  host.style.width = `${PREVIEW_WIDTH}px`;
  host.style.maxWidth = '90vw';
  host.style.position = 'relative';
  host.style.height = `${PREVIEW_HEIGHT}px`;
  host.style.borderRadius = '14px';
  host.style.overflow = 'hidden';
  host.style.border = '1px solid rgba(255,255,255,0.16)';
  host.style.background = 'rgba(9, 12, 24, 0.9)';

  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(PREVIEW_WIDTH, PREVIEW_HEIGHT);
  host.append(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color('#100d22');
  addLighting(scene);
  scene.add(object);

  const cameraSettings = options.camera ?? {};
  const camera = new PerspectiveCamera(
    cameraSettings.fov ?? 50,
    PREVIEW_WIDTH / PREVIEW_HEIGHT,
    0.1,
    100
  );
  camera.position.set(
    cameraSettings.x ?? 0,
    cameraSettings.y ?? 1.2,
    cameraSettings.z ?? 3.1
  );

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(
    cameraSettings.targetX ?? 0,
    cameraSettings.targetY ?? 0.35,
    cameraSettings.targetZ ?? 0
  );

  let pendingCameraFrame: number | null = null;
  const queueCameraChange = () => {
    if (pendingCameraFrame !== null) {
      return;
    }

    pendingCameraFrame = window.requestAnimationFrame(() => {
      pendingCameraFrame = null;
      options.onCameraChange?.({
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z,
        targetX: controls.target.x,
        targetY: controls.target.y,
        targetZ: controls.target.z
      });
    });
  };

  controls.addEventListener('change', queueCameraChange);

  const hintEnabled = options.showHint ?? true;
  let hint: HTMLDivElement | undefined;
  if (hintEnabled) {
    hint = document.createElement('div');
    hint.textContent = 'Drag to rotate · Scroll to zoom';
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
  }

  const instance: PreviewInstance = {
    host,
    scene,
    camera,
    controls,
    renderer,
    currentObject: object,
    hint,
    pendingCameraFrame,
    queueCameraChange,
    observer: new MutationObserver(() => {})
  };

  applyCameraSettings(instance, cameraSettings);

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  instance.observer = new MutationObserver(() => {
    if (host.isConnected) {
      return;
    }

    renderer.setAnimationLoop(null);
    controls.removeEventListener('change', queueCameraChange);
    if (pendingCameraFrame !== null) {
      window.cancelAnimationFrame(pendingCameraFrame);
      pendingCameraFrame = null;
    }
    controls.dispose();
    renderer.dispose();
    instance.observer.disconnect();
    previewInstances.delete(instanceId);
  });
  instance.observer.observe(document.body, { childList: true, subtree: true });

  return instance;
};

const updatePreviewInstance = (
  instance: PreviewInstance,
  object: Object3D,
  options: ThreePreviewOptions
) => {
  instance.scene.remove(instance.currentObject);
  instance.currentObject = object;
  instance.scene.add(object);

  if (options.showHint === false && instance.hint) {
    instance.hint.remove();
    instance.hint = undefined;
  }

  if (options.showHint !== false && !instance.hint) {
    const hint = document.createElement('div');
    hint.textContent = 'Drag to rotate · Scroll to zoom';
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
    instance.host.append(hint);
    instance.hint = hint;
  }

  applyCameraSettings(instance, options.camera ?? {});

  if (options.onCameraChange) {
    instance.controls.removeEventListener('change', instance.queueCameraChange);
    const queueCameraChange = () => {
      if (instance.pendingCameraFrame !== null) {
        return;
      }

      instance.pendingCameraFrame = window.requestAnimationFrame(() => {
        instance.pendingCameraFrame = null;
        options.onCameraChange?.({
          x: instance.camera.position.x,
          y: instance.camera.position.y,
          z: instance.camera.position.z,
          targetX: instance.controls.target.x,
          targetY: instance.controls.target.y,
          targetZ: instance.controls.target.z
        });
      });
    };

    instance.queueCameraChange = queueCameraChange;
    instance.controls.addEventListener('change', instance.queueCameraChange);
  }
};

export const renderThreePreview = (
  object: Object3D,
  options: ThreePreviewOptions = {}
): HTMLElement => {
  const instanceId = options.previewId ?? `preview-${Math.random().toString(36).slice(2)}`;
  const existing = previewInstances.get(instanceId);

  if (existing) {
    updatePreviewInstance(existing, object, options);
    return existing.host;
  }

  const instance = createPreviewInstance(object, options, instanceId);
  previewInstances.set(instanceId, instance);
  return instance.host;
};
