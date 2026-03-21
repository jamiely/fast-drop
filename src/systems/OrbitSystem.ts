import type { Object3D } from 'three';
import type { OrbitSystemContract } from '../game/types';

export class OrbitSystem implements OrbitSystemContract {
  private angle = 0;
  private paused = false;
  private speedMultiplier = 1;
  private radius: number;
  private speed: number;

  public constructor(
    private readonly targets: Object3D[],
    radius: number,
    speed: number
  ) {
    this.radius = radius;
    this.speed = speed;
  }

  public update(dt: number): void {
    if (this.targets.length === 0 || this.paused) {
      return;
    }

    this.angle -= dt * this.speed * this.speedMultiplier;
    const spacing = (Math.PI * 2) / this.targets.length;

    this.targets.forEach((target, index) => {
      const angle = this.angle + spacing * index;
      target.position.x = Math.cos(angle) * this.radius;
      target.position.z = Math.sin(angle) * this.radius;
    });
  }

  public setPaused(paused: boolean): void {
    this.paused = paused;
  }

  public togglePause(): boolean {
    this.paused = !this.paused;
    return this.paused;
  }

  public setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Number.isFinite(multiplier)
      ? Math.max(0, multiplier)
      : 1;
  }

  public setBaseSpeed(speed: number): void {
    if (Number.isFinite(speed)) {
      this.speed = speed;
    }
  }

  public setRadius(radius: number): void {
    if (Number.isFinite(radius)) {
      this.radius = Math.max(0.5, radius);
    }
  }
}
