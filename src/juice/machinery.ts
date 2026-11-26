import {
  AdditiveBlending,
  CircleGeometry,
  Color,
  ConeGeometry,
  DoubleSide,
  CylinderGeometry,
  DynamicDrawUsage,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  Quaternion,
  SphereGeometry,
  Vector3,
  type Material,
  type BufferGeometry
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  HEAT_COLOR,
  counterColumn,
  roundedRectPoints,
  type HeatMachinery
} from './show';
import type { Heat } from './state';

const PINWHEELS = 4;
const PINWHEEL_POST = 0.32;
const BLADE_COLORS = ['#32f2ff', '#ff6bc9', '#ffe78a', '#7b73ff'];
const UP = new Vector3(0, 1, 0);
const FORWARD = new Vector3(0, 0, 1);
const BLADES = 4;
const PISTONS = 8;
const COUNTER_SLOTS = 16;
/** Colours above 1 are what the bloom threshold picks up. */
const GLOW_GAIN = 2.2;
const MARQUEE_BULBS = 44;
// Status display housing, in its local units (StatusDisplay.ts: screen 2.45 × 1.18, housing ×1.14 / ×1.24).
const HOUSING_WIDTH = 2.45 * 1.14;
const HOUSING_HEIGHT = 1.18 * 1.24;

export interface MachineryStage {
  mound: Object3D;
  dropTube: Group;
  statusDisplay: Group;
  outerRingRadius: number;
}

/**
 * Purely visual Fever machinery: pinwheels on the dome, a beacon on the drop tube, pistons round the base, a
 * ball-counter column beside the tube and a marquee of bulbs round the status display. Each kind is one
 * instanced (or single) mesh, eleven draws in all, and none of it touches physics.
 */
export class Machinery {
  public readonly root = new Group();
  /** Follow the drop tube and the display without joining their groups, which the portrait fit measures. */
  private readonly tubeMount = new Group();
  private readonly displayMount = new Group();
  private readonly disposables: Array<
    BufferGeometry | Material | InstancedMesh
  > = [];
  private readonly scratch = new Object3D();
  private readonly color = new Color();
  private readonly glow: MeshBasicMaterial;
  private readonly pinwheelHub: InstancedMesh;
  private readonly pinwheelBlades: InstancedMesh;
  private readonly pistonBody: InstancedMesh;
  private readonly pistonRod: InstancedMesh;
  private readonly beaconBeam: Mesh;
  private readonly beamMaterial: MeshBasicMaterial;
  private readonly beaconCap: Mesh;
  private readonly counterBalls: InstancedMesh;
  private readonly counterTube: Mesh;
  private readonly marquee: InstancedMesh;
  private readonly marqueeColor = new Color();
  private readonly pinwheelSpots: Array<{
    x: number;
    y: number;
    z: number;
    facing: Quaternion;
  }> = [];
  private readonly spinQuat = new Quaternion();
  private readonly marqueeSpots: Array<[number, number]>;
  private spin = 0;
  private pumpPhase = 0;
  private beacon = 0;
  private marqueePhase = 0;
  private level: number;
  private hue = 0;
  private animated = true;

  public constructor(
    private readonly stage: MachineryStage,
    private readonly ballsTotal: number
  ) {
    this.level = ballsTotal;
    this.glow = this.track(
      new MeshBasicMaterial({ color: '#32f2ff', toneMapped: false })
    );
    const metal = this.track(
      new MeshStandardMaterial({
        color: '#9aa8e8',
        metalness: 0.7,
        roughness: 0.28,
        emissive: '#2a3f86',
        emissiveIntensity: 0.3
      })
    );
    const additive = (opacity: number) =>
      this.track(
        new MeshBasicMaterial({
          color: '#ffffff',
          transparent: true,
          opacity,
          blending: AdditiveBlending,
          depthWrite: false,
          toneMapped: false
        })
      );

    // Pinwheels: four toy windmills on posts round the dome. Each blade is a flat wedge; one instanced mesh.
    const post = new CylinderGeometry(0.018, 0.024, PINWHEEL_POST, 8);
    post.translate(0, PINWHEEL_POST / 2, 0);
    this.pinwheelHub = this.instanced(post, metal, PINWHEELS);
    this.pinwheelBlades = this.instanced(
      new CircleGeometry(0.26, 1, 0, Math.PI / 3.2),
      this.track(
        new MeshBasicMaterial({
          color: '#ffffff',
          side: DoubleSide,
          toneMapped: false
        })
      ),
      PINWHEELS * BLADES
    );
    for (let i = 0; i < PINWHEELS * BLADES; i += 1) {
      this.color.set(BLADE_COLORS[i % BLADES]);
      this.pinwheelBlades.setColorAt(i, this.color);
    }

    // Pistons: eight round the outside of the ring, sunk into the floor.
    this.pistonBody = this.instanced(
      new CylinderGeometry(0.075, 0.09, 0.16, 12),
      metal,
      PISTONS
    );
    const rod = new CylinderGeometry(0.035, 0.035, 0.22, 8);
    rod.translate(0, 0.11, 0);
    this.pistonRod = this.instanced(rod, this.glow, PISTONS);

    // Beacon: a glowing cap on the tube with a rotating additive beam.
    this.beaconCap = new Mesh(
      this.track(
        new SphereGeometry(0.075, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2)
      ),
      this.glow
    );
    // Two opposed beams in one geometry, so the rotating light is a single draw.
    const beamA = new ConeGeometry(0.08, 0.5, 10, 1, true);
    beamA.rotateZ(Math.PI / 2);
    beamA.translate(-0.25, 0, 0);
    const beamB = beamA.clone().rotateY(Math.PI);
    const beam = mergeGeometries([beamA, beamB]);
    beamA.dispose();
    beamB.dispose();
    this.beamMaterial = additive(0.3);
    this.beaconBeam = new Mesh(this.track(beam), this.beamMaterial);

    // Ball counter: a clear column beside the drop tube that drains over the round.
    this.counterTube = new Mesh(
      this.track(new CylinderGeometry(0.075, 0.075, 1.05, 14, 1, true)),
      this.track(
        new MeshStandardMaterial({
          color: '#dff8ff',
          transparent: true,
          opacity: 0.16,
          depthWrite: false
        })
      )
    );
    this.counterBalls = this.instanced(
      new SphereGeometry(0.058, 12, 10),
      this.track(
        new MeshStandardMaterial({
          color: '#df2a2a',
          roughness: 0.6,
          emissive: '#ff3355',
          emissiveIntensity: 0.35
        })
      ),
      COUNTER_SLOTS
    );

    // Marquee: chasing bulbs round the status display, lit in hot and FEVER only.
    this.marqueeSpots = roundedRectPoints(
      HOUSING_WIDTH * 1.03,
      HOUSING_HEIGHT * 1.05,
      0.18,
      MARQUEE_BULBS
    );
    this.marquee = this.instanced(
      new SphereGeometry(0.032, 8, 6),
      this.track(
        new MeshBasicMaterial({ color: '#ffffff', toneMapped: false })
      ),
      MARQUEE_BULBS
    );
    this.marqueeSpots.forEach(([x, y], i) => {
      this.scratch.position.set(x, y, 0.08);
      this.scratch.scale.setScalar(1);
      this.scratch.rotation.set(0, 0, 0);
      this.scratch.updateMatrix();
      this.marquee.setMatrixAt(i, this.scratch.matrix);
      this.marquee.setColorAt(i, this.color.set('#000000'));
    });

    this.tubeMount.add(
      this.beaconCap,
      this.beaconBeam,
      this.counterTube,
      this.counterBalls
    );
    this.displayMount.add(this.marquee);
    this.root.add(
      this.pinwheelHub,
      this.pinwheelBlades,
      this.pistonBody,
      this.pistonRod,
      this.tubeMount,
      this.displayMount
    );
    this.layout();
  }

  /** Recomputes the placements that follow the playfield (dome size, ring radius, tube). */
  public layout(): void {
    const mound = this.stage.mound;
    const cone = (mound as Mesh).geometry as ConeGeometry;
    const radius = cone.parameters.radius * mound.scale.x;
    const height = cone.parameters.height * mound.scale.y;
    const base = mound.position.y - height / 2;
    this.pinwheelSpots.length = 0;
    for (let i = 0; i < PINWHEELS; i += 1) {
      const yaw = (i / PINWHEELS) * Math.PI * 2 + Math.PI / 4;
      const r = radius * 0.55;
      const x = Math.cos(yaw) * r;
      const y = base + height * (1 - r / radius) - 0.02;
      const z = Math.sin(yaw) * r;
      this.scratch.position.set(x, y, z);
      this.scratch.quaternion.identity();
      this.scratch.scale.setScalar(1);
      this.scratch.updateMatrix();
      this.pinwheelHub.setMatrixAt(i, this.scratch.matrix);
      // The wheel faces outward: its local +z points along the radius.
      const facing = new Quaternion().setFromAxisAngle(UP, Math.atan2(x, z));
      this.pinwheelSpots.push({ x, y: y + PINWHEEL_POST, z, facing });
    }
    this.pinwheelHub.instanceMatrix.needsUpdate = true;

    const ring = this.stage.outerRingRadius + 0.2;
    for (let i = 0; i < PISTONS; i += 1) {
      // Leave the front (+z, where the drop button and tube sit) clear.
      const angle = (i / PISTONS) * Math.PI * 2 + Math.PI / PISTONS;
      this.scratch.position.set(
        Math.cos(angle) * ring,
        0.08,
        Math.sin(angle) * ring
      );
      this.scratch.rotation.set(0, 0, 0);
      this.scratch.scale.setScalar(1);
      this.scratch.updateMatrix();
      this.pistonBody.setMatrixAt(i, this.scratch.matrix);
    }
    this.pistonBody.instanceMatrix.needsUpdate = true;

    // Drop tube local space: 1.05 tall, centred; radius ≈ 0.22.
    this.beaconCap.position.set(0, 0.56, 0);
    this.beaconBeam.position.set(0, 0.6, 0);
    this.counterTube.position.set(0.36, 0, 0);
    this.counterBalls.position.set(0.36, 0, 0);
  }

  /** Low tier: machinery stops (static frame), marquee off. */
  public setAnimated(animated: boolean): void {
    this.animated = animated;
  }

  public update(
    realDt: number,
    heat: Heat,
    params: HeatMachinery,
    ballsLeft: number
  ): void {
    const dt = this.animated ? realDt : 0;
    for (const [mount, source] of [
      [this.tubeMount, this.stage.dropTube],
      [this.displayMount, this.stage.statusDisplay]
    ] as const) {
      mount.position.copy(source.position);
      mount.quaternion.copy(source.quaternion);
      mount.scale.copy(source.scale);
    }
    this.spin += dt * params.spin * Math.PI * 2;
    this.pumpPhase += dt * params.pump * Math.PI * 2;
    this.beacon += dt * params.beacon * Math.PI * 2;
    this.marqueePhase += dt * (4 + params.marquee * 10);
    this.hue = (this.hue + dt * 0.6) % 1;

    if (heat === 'fever') this.color.setHSL(this.hue, 1, 0.6);
    else this.color.set(HEAT_COLOR[heat]);
    this.glow.color.lerp(
      this.color.multiplyScalar(GLOW_GAIN),
      1 - Math.exp(-realDt * 8)
    );
    this.beamMaterial.color.copy(this.glow.color).multiplyScalar(0.5);

    this.pinwheelSpots.forEach((spot, i) => {
      const direction = i % 2 === 0 ? 1 : -1;
      this.scratch.position.set(spot.x, spot.y, spot.z);
      this.scratch.scale.setScalar(1);
      for (let b = 0; b < BLADES; b += 1) {
        this.spinQuat.setFromAxisAngle(
          FORWARD,
          this.spin * direction + (b / BLADES) * Math.PI * 2
        );
        this.scratch.quaternion.copy(spot.facing).multiply(this.spinQuat);
        this.scratch.updateMatrix();
        this.pinwheelBlades.setMatrixAt(i * BLADES + b, this.scratch.matrix);
      }
    });
    this.pinwheelBlades.instanceMatrix.needsUpdate = true;

    const ring = this.stage.outerRingRadius + 0.2;
    for (let i = 0; i < PISTONS; i += 1) {
      const angle = (i / PISTONS) * Math.PI * 2 + Math.PI / PISTONS;
      // Alternate pistons pump in opposite phase, like a crankshaft.
      const stroke =
        (Math.sin(this.pumpPhase + (i % 2) * Math.PI) * 0.5 + 0.5) *
        params.stroke;
      this.scratch.position.set(
        Math.cos(angle) * ring,
        0.12 + stroke,
        Math.sin(angle) * ring
      );
      this.scratch.rotation.set(0, 0, 0);
      this.scratch.scale.setScalar(1);
      this.scratch.updateMatrix();
      this.pistonRod.setMatrixAt(i, this.scratch.matrix);
    }
    this.pistonRod.instanceMatrix.needsUpdate = true;

    this.beaconBeam.rotation.y = this.beacon;
    this.beaconBeam.visible = params.beacon > 0.4;

    // The counter eases down; the bottom ball shrinks out of the column as the stack slides.
    this.level += (ballsLeft - this.level) * (1 - Math.exp(-realDt * 10));
    const { count, slide } = counterColumn(
      this.level,
      this.ballsTotal,
      COUNTER_SLOTS
    );
    const spacing = 0.98 / COUNTER_SLOTS;
    for (let i = 0; i < COUNTER_SLOTS; i += 1) {
      const visible = i < count;
      const scale = !visible ? 0 : i === 0 ? 1 - slide : 1;
      this.scratch.position.set(0, -0.49 + (i - slide + 0.5) * spacing, 0);
      this.scratch.rotation.set(0, 0, 0);
      this.scratch.scale.setScalar(scale);
      this.scratch.updateMatrix();
      this.counterBalls.setMatrixAt(i, this.scratch.matrix);
    }
    this.counterBalls.instanceMatrix.needsUpdate = true;

    this.marquee.visible = params.marquee > 0.02;
    if (this.marquee.visible) {
      for (let i = 0; i < MARQUEE_BULBS; i += 1) {
        const on = Math.floor(this.marqueePhase + i) % 3 === 0;
        if (heat === 'fever')
          this.marqueeColor.setHSL((i / MARQUEE_BULBS + this.hue) % 1, 1, 0.6);
        else this.marqueeColor.set(HEAT_COLOR[heat]);
        this.marqueeColor.multiplyScalar(
          (on ? GLOW_GAIN : 0.15) * params.marquee
        );
        this.marquee.setColorAt(i, this.marqueeColor);
      }
      this.marquee.instanceColor!.needsUpdate = true;
    }
  }

  public reset(): void {
    this.level = this.ballsTotal;
  }

  public dispose(): void {
    this.root.removeFromParent();
    this.disposables.forEach((item) => item.dispose());
  }

  private track<T extends BufferGeometry | Material | InstancedMesh>(
    item: T
  ): T {
    this.disposables.push(item);
    return item;
  }

  private instanced(
    geometry: BufferGeometry,
    material: Material,
    count: number
  ): InstancedMesh {
    const mesh = this.track(
      new InstancedMesh(this.track(geometry), material, count)
    );
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    // Instances span the scene; the geometry's own bounds would cull them wrongly.
    mesh.frustumCulled = false;
    return mesh;
  }
}
