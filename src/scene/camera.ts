import { PerspectiveCamera } from 'three';
import type { CameraTuning } from '../game/config';

export const createCamera = (aspect: number): PerspectiveCamera => {
  const camera = new PerspectiveCamera(55, aspect, 0.1, 100);
  applyCameraTuning(camera, {
    distance: 6.8,
    pitch: 3.8,
    yaw: 0,
    targetY: 0.6
  });
  return camera;
};

export const applyCameraTuning = (
  camera: PerspectiveCamera,
  tuning: CameraTuning
): void => {
  camera.position.set(tuning.yaw, tuning.pitch, tuning.distance);
  camera.lookAt(0, tuning.targetY, 0);
};
