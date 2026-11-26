import {
  AdditiveBlending,
  Color,
  DynamicDrawUsage,
  InstancedMesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  type Camera,
  type Scene,
  type Vector3
} from 'three';

const CAPACITY = 1500;

export interface ParticleOptions {
  /** Life lost per second (1 = one second of life). */
  decay?: number;
  /** Downward acceleration in units/s². */
  gravity?: number;
  /** Quad size multiplier; 1 is the classic spark. */
  size?: number;
  /** Velocity kept per second (1 = no drag). */
  drag?: number;
  /** Keep full size until the last third of life instead of shrinking all the way (confetti). */
  hold?: boolean;
}

/** One unsorted additive draw, with a fixed ring-buffer allocation. */
export class ParticlePool {
  private readonly mesh = new InstancedMesh(
    new PlaneGeometry(1, 1),
    new MeshBasicMaterial({
      transparent: true,
      opacity: 0.85,
      blending: AdditiveBlending,
      depthWrite: false,
      toneMapped: false
    }),
    CAPACITY
  );
  private readonly life = new Float32Array(CAPACITY);
  private readonly positions = new Float32Array(CAPACITY * 3);
  private readonly velocities = new Float32Array(CAPACITY * 3);
  /** Per particle: decay, gravity, size, drag, hold. */
  private readonly params = new Float32Array(CAPACITY * 5);
  private readonly scratch = new Object3D();
  private readonly color = new Color();
  private cursor = 0;
  private colorsDirty = false;

  public constructor(scene: Scene) {
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  /** One particle with an explicit velocity. `hueJitter` spreads the colour around `color`. */
  public spawn(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    color: string,
    options: ParticleOptions = {},
    hueJitter = 0.125
  ): void {
    const slot = this.cursor++ % CAPACITY;
    const offset = slot * 3;
    this.life[slot] = 1;
    this.positions[offset] = x;
    this.positions[offset + 1] = y;
    this.positions[offset + 2] = z;
    this.velocities[offset] = vx;
    this.velocities[offset + 1] = vy;
    this.velocities[offset + 2] = vz;
    const p = slot * 5;
    this.params[p] = options.decay ?? 0.8;
    this.params[p + 1] = options.gravity ?? 3.6;
    this.params[p + 2] = options.size ?? 1;
    this.params[p + 3] = options.drag ?? 1;
    this.params[p + 4] = options.hold ? 1 : 0;
    this.color
      .set(color)
      .offsetHSL(Math.random() * hueJitter * 2 - hueJitter, 0, 0);
    this.mesh.setColorAt(slot, this.color);
    this.colorsDirty = true;
  }

  public burst(origin: Vector3, count: number, color: string): void {
    for (let i = 0; i < Math.min(300, count); i += 1) {
      this.spawn(
        origin.x,
        origin.y,
        origin.z,
        (Math.random() - 0.5) * 3.4,
        1.2 + Math.random() * 2.4,
        (Math.random() - 0.5) * 2.4,
        color
      );
    }
  }

  /** Live particles right now (counted, not the last frame's tally). */
  public get live(): number {
    let count = 0;
    for (let slot = 0; slot < CAPACITY; slot += 1)
      if (this.life[slot] > 0) count += 1;
    return count;
  }

  public update(realDt: number, camera: Camera): void {
    if (this.colorsDirty && this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
      this.colorsDirty = false;
    }
    let active = 0;
    for (let slot = 0; slot < CAPACITY; slot += 1) {
      const offset = slot * 3;
      const p = slot * 5;
      this.life[slot] = Math.max(0, this.life[slot] - realDt * this.params[p]);
      const life = this.life[slot];
      if (life > 0) {
        active += 1;
        const drag = this.params[p + 3] < 1 ? this.params[p + 3] ** realDt : 1;
        this.velocities[offset] *= drag;
        this.velocities[offset + 2] *= drag;
        this.velocities[offset + 1] =
          this.velocities[offset + 1] * drag - realDt * this.params[p + 1];
        for (let axis = 0; axis < 3; axis += 1) {
          this.positions[offset + axis] +=
            this.velocities[offset + axis] * realDt;
        }
        this.scratch.position.fromArray(this.positions, offset);
        this.scratch.quaternion.copy(camera.quaternion);
        this.scratch.rotateZ(life * 12 + slot);
      }
      const size =
        this.params[p + 2] *
        (this.params[p + 4] ? Math.min(1, life * 3) : life);
      this.scratch.scale.set(0.045 * size, 0.085 * size, size);
      this.scratch.updateMatrix();
      this.mesh.setMatrixAt(slot, this.scratch.matrix);
    }
    this.mesh.visible = active > 0;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  public reset(): void {
    this.life.fill(0);
    this.mesh.visible = false;
  }

  public destroy(): void {
    this.mesh.removeFromParent();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }
}
