import { describe, expect, it } from 'vitest';
import { OrbitSystem } from '../../src/systems/OrbitSystem';

interface OrbitTarget {
  position: { x: number; z: number };
}

describe('OrbitSystem', () => {
  it('positions all targets on an orbit ring and advances over time', () => {
    const targets: OrbitTarget[] = [
      { position: { x: 0, z: 0 } },
      { position: { x: 0, z: 0 } },
      { position: { x: 0, z: 0 } },
      { position: { x: 0, z: 0 } }
    ];

    const orbit = new OrbitSystem(targets as never, 2, 1);
    orbit.update(Math.PI / 2);

    const radii = targets.map((target) =>
      Math.hypot(target.position.x, target.position.z)
    );

    radii.forEach((radius) => expect(radius).toBeCloseTo(2, 5));
  });

  it('supports pause and speed multipliers without changing update contract', () => {
    const targets: OrbitTarget[] = [{ position: { x: 0, z: 0 } }];
    const orbit = new OrbitSystem(targets as never, 2, 1);

    orbit.update(1);
    const firstX = targets[0]?.position.x ?? 0;

    orbit.setPaused(true);
    orbit.update(1);
    expect(targets[0]?.position.x).toBeCloseTo(firstX, 6);

    orbit.setPaused(false);
    orbit.setSpeedMultiplier(2);
    orbit.update(1);

    expect((targets[0]?.position.x ?? 0) - firstX).toBeLessThan(-0.4);
  });
});
