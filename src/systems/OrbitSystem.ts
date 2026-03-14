import type { Object3D } from 'three';

export class OrbitSystem {
  private angle = 0;

  public constructor(
    private readonly targets: Object3D[],
    private readonly radius: number,
    private readonly speed: number
  ) {}

  public update(dt: number): void {
    this.angle += dt * this.speed;
    const spacing = (Math.PI * 2) / this.targets.length;

    this.targets.forEach((target, index) => {
      const angle = this.angle + spacing * index;
      target.position.x = Math.cos(angle) * this.radius;
      target.position.z = Math.sin(angle) * this.radius;
    });
  }
}
