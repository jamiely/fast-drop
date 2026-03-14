import { PerspectiveCamera } from 'three';

export const createCamera = (aspect: number): PerspectiveCamera => {
  const camera = new PerspectiveCamera(55, aspect, 0.1, 100);
  camera.position.set(0, 3.8, 6.8);
  camera.lookAt(0, 0.6, 0);
  return camera;
};
