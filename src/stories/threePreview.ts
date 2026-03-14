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

export const renderThreePreview = (
  object: Object3D,
  options: ThreePreviewOptions = {}
): HTMLElement => {
  const host = document.createElement('div');
  const previewWidth = 520;
  const previewHeight = 320;

  host.style.width = `${previewWidth}px`;
  host.style.maxWidth = '90vw';
  host.style.position = 'relative';
  host.style.height = `${previewHeight}px`;
  host.style.borderRadius = '14px';
  host.style.overflow = 'hidden';
  host.style.border = '1px solid rgba(255,255,255,0.16)';
  host.style.background = 'rgba(9, 12, 24, 0.9)';

  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(previewWidth, previewHeight);
  host.append(renderer.domElement);

  if (options.showHint ?? true) {
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
    host.append(hint);
  }

  const scene = new Scene();
  scene.background = new Color('#100d22');
  addLighting(scene);
  scene.add(object);

  const cameraSettings = options.camera ?? {};
  const camera = new PerspectiveCamera(
    cameraSettings.fov ?? 50,
    previewWidth / previewHeight,
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
  controls.minDistance = cameraSettings.minDistance ?? 1.2;
  controls.maxDistance = cameraSettings.maxDistance ?? 8;
  controls.update();

  const emitCameraChange = () => {
    options.onCameraChange?.({
      x: camera.position.x,
      y: camera.position.y,
      z: camera.position.z,
      targetX: controls.target.x,
      targetY: controls.target.y,
      targetZ: controls.target.z
    });
  };

  controls.addEventListener('end', emitCameraChange);

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  const observer = new MutationObserver(() => {
    if (host.isConnected) {
      return;
    }

    renderer.setAnimationLoop(null);
    controls.removeEventListener('end', emitCameraChange);
    controls.dispose();
    renderer.dispose();
    observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return host;
};
