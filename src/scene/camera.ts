import { PerspectiveCamera } from 'three';
import type { CameraTuning } from '../game/config';

export const createCamera = (aspect: number): PerspectiveCamera => {
  const camera = new PerspectiveCamera(55, aspect, 0.1, 100);
  applyCameraTuning(camera, {
    distance: 6,
    pitch: 2.1,
    yaw: 0,
    panX: 0,
    targetY: 1.45,
    targetZ: 2.2
  });
  return camera;
};

export const applyCameraTuning = (
  camera: PerspectiveCamera,
  tuning: CameraTuning
): void => {
  const panX = tuning.panX ?? 0;
  const targetZ = tuning.targetZ ?? 0;
  camera.position.set(tuning.yaw + panX, tuning.pitch, tuning.distance);
  camera.lookAt(panX, tuning.targetY, targetZ);
};
