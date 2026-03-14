import {
  Color,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  type Object3D
} from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { addLighting } from '../scene/lighting';

export const renderThreePreview = (object: Object3D): HTMLElement => {
  const host = document.createElement('div');
  const previewWidth = 520;
  const previewHeight = 320;

  host.style.width = `${previewWidth}px`;
  host.style.maxWidth = '90vw';
  host.style.height = `${previewHeight}px`;
  host.style.borderRadius = '14px';
  host.style.overflow = 'hidden';
  host.style.border = '1px solid rgba(255,255,255,0.16)';
  host.style.background = 'rgba(9, 12, 24, 0.9)';

  const renderer = new WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(previewWidth, previewHeight);
  host.append(renderer.domElement);

  const scene = new Scene();
  scene.background = new Color('#100d22');
  addLighting(scene);
  scene.add(object);

  const camera = new PerspectiveCamera(50, previewWidth / previewHeight, 0.1, 100);
  camera.position.set(0, 1.2, 3.1);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.target.set(0, 0.35, 0);
  controls.minDistance = 1.2;
  controls.maxDistance = 8;
  controls.update();

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  const observer = new MutationObserver(() => {
    if (host.isConnected) {
      return;
    }

    renderer.setAnimationLoop(null);
    controls.dispose();
    renderer.dispose();
    observer.disconnect();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return host;
};
