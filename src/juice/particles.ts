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
  private readonly scratch = new Object3D();
  private readonly color = new Color();
  private cursor = 0;

  public constructor(scene: Scene) {
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    scene.add(this.mesh);
  }

  public burst(origin: Vector3, count: number, color: string): void {
    for (let i = 0; i < Math.min(300, count); i += 1) {
      const slot = this.cursor++ % CAPACITY;
      const offset = slot * 3;
      this.life[slot] = 1;
      this.positions.set([origin.x, origin.y, origin.z], offset);
      this.velocities.set(
        [
          (Math.random() - 0.5) * 3.4,
          1.2 + Math.random() * 2.4,
          (Math.random() - 0.5) * 2.4
        ],
        offset
      );
      this.color.set(color).offsetHSL(Math.random() * 0.25 - 0.125, 0, 0);
      this.mesh.setColorAt(slot, this.color);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  public update(realDt: number, camera: Camera): void {
    let active = 0;
    for (let slot = 0; slot < CAPACITY; slot += 1) {
      const offset = slot * 3;
      this.life[slot] = Math.max(0, this.life[slot] - realDt * 0.8);
      const life = this.life[slot];
      if (life > 0) {
        active += 1;
        this.velocities[offset + 1] -= realDt * 3.6;
        for (let axis = 0; axis < 3; axis += 1) {
          this.positions[offset + axis] +=
            this.velocities[offset + axis] * realDt;
        }
        this.scratch.position.fromArray(this.positions, offset);
        this.scratch.quaternion.copy(camera.quaternion);
        this.scratch.rotateZ(life * 12 + slot);
      }
      this.scratch.scale.set(0.045 * life, 0.085 * life, life);
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
