import type { Object3D } from 'three';
import type { OrbitSystemContract } from '../game/types';

// TODO(phase5-gameplay): Drive angular speed from gameplay state (pause, slow-mo,
// and bonus states) while preserving deterministic `update(dt)` stepping.
export class OrbitSystem implements OrbitSystemContract {
  private angle = 0;

  public constructor(
    private readonly targets: Object3D[],
    private readonly radius: number,
    private readonly speed: number
  ) {}

  public update(dt: number): void {
    if (this.targets.length === 0) {
      return;
    }

    this.angle += dt * this.speed;
    const spacing = (Math.PI * 2) / this.targets.length;

    this.targets.forEach((target, index) => {
      const angle = this.angle + spacing * index;
      target.position.x = Math.cos(angle) * this.radius;
      target.position.z = Math.sin(angle) * this.radius;
    });
  }
}
