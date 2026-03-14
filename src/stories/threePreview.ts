import {
  Color,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
  type Object3D
} from 'three';
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
  camera.lookAt(0, 0.35, 0);

  renderer.render(scene, camera);
  return host;
};
