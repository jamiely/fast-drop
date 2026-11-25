import { PerspectiveCamera, Vector3 } from 'three';
import type { CameraTuning } from '../game/config';

export type ViewLayout = 'landscape' | 'portrait';

/** A window taller than it is wide (a rotated cabinet monitor, a phone held upright) uses the portrait layout. */
export const layoutForAspect = (aspect: number): ViewLayout =>
  aspect < 1 ? 'portrait' : 'landscape';

/** Portrait view: higher and steeper than landscape, so the ring reads as a circle that fills a tall screen. */
export const PORTRAIT_CAMERA = {
  target: new Vector3(0, 1.1, 0.75),
  direction: new Vector3(0, 0.78, 1).normalize(),
  /** Largest |NDC| any fitted point may reach: leaves a small border. */
  margin: 0.94,
  /** The status display rises above the ring and grows, so it fills the top band. */
  displayLift: 2.4,
  displayScale: 1.35
};

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

/**
 * Places the camera on `direction` from `target` at the closest distance where every point projects inside
 * ±`margin` in normalized device coordinates. Uses the camera's current FOV, aspect and zoom.
 */
export const fitCameraToPoints = (
  camera: PerspectiveCamera,
  target: Vector3,
  direction: Vector3,
  points: readonly Vector3[],
  margin: number
): void => {
  const place = (distance: number): void => {
    camera.position.copy(direction).multiplyScalar(distance).add(target);
    camera.lookAt(target);
    camera.updateMatrixWorld();
  };
  const fits = (): boolean =>
    points.every((point) => {
      const ndc = point.clone().project(camera);
      return (
        ndc.z < 1 && Math.abs(ndc.x) <= margin && Math.abs(ndc.y) <= margin
      );
    });

  camera.updateProjectionMatrix();
  let near = 0.5;
  let far = 60;
  for (let step = 0; step < 32; step += 1) {
    const mid = (near + far) / 2;
    place(mid);
    if (fits()) {
      far = mid;
    } else {
      near = mid;
    }
  }
  place(far);
};
