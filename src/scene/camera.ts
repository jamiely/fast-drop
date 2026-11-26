import { PerspectiveCamera, Vector3 } from 'three';
import type { CameraTuning } from '../game/config';

export type ViewLayout = 'landscape' | 'portrait';

/** A window taller than it is wide (a rotated cabinet monitor, a phone held upright) uses the portrait layout. */
export const layoutForAspect = (aspect: number): ViewLayout =>
  aspect < 1 ? 'portrait' : 'landscape';

/** Portrait view: near eye level like landscape, backed off so the display stacked above the ring fits a tall screen. */
export const PORTRAIT_CAMERA = {
  target: new Vector3(0, 1.1, 0.75),
  direction: new Vector3(0, 0.2, 1).normalize(),
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
 * Places the camera on `direction` from a point level with `target` at the closest distance where every point
 * projects inside ±`margin` in normalized device coordinates, raising or lowering the aim so the points sit
 * centred vertically. Uses the camera's current FOV, aspect and zoom.
 */
export const fitCameraToPoints = (
  camera: PerspectiveCamera,
  target: Vector3,
  direction: Vector3,
  points: readonly Vector3[],
  margin: number
): void => {
  const aim = target.clone();
  const place = (distance: number): void => {
    camera.position.copy(direction).multiplyScalar(distance).add(aim);
    camera.lookAt(aim);
    camera.updateMatrixWorld();
  };
  const fits = (): boolean =>
    points.every((point) => {
      const ndc = point.clone().project(camera);
      return (
        ndc.z < 1 && Math.abs(ndc.x) <= margin && Math.abs(ndc.y) <= margin
      );
    });

  const fitDistance = (): number => {
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
    return far;
  };

  camera.updateProjectionMatrix();
  for (let pass = 0; pass < 4; pass += 1) {
    const distance = fitDistance();
    let minY = Infinity;
    let maxY = -Infinity;
    for (const point of points) {
      const y = point.clone().project(camera).y;
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    const halfHeight =
      (distance * Math.tan(((camera.fov / 2) * Math.PI) / 180)) / camera.zoom;
    aim.y += ((minY + maxY) / 2) * halfHeight;
  }
  fitDistance();
};
