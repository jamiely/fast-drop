import {
  Color,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  Scene,
  WebGLRenderer
} from 'three';
import { BALL_RADIUS, createBallMesh } from '../entities/Ball';
import { JAR_HEIGHT, JAR_RADIUS, createJarMesh } from '../entities/Jar';
import { createCamera } from './camera';
import { addLighting } from './lighting';

interface ActiveBallVisual {
  id: number | null;
  mesh: Mesh;
  velocityX: number;
  velocityY: number;
  velocityZ: number;
  enteredJarIndex: number | null;
  hasScoredEntry: boolean;
  ageSeconds: number;
  settledFrames: number;
  isSettled: boolean;
  settledOffsetX: number;
  settledOffsetY: number;
  settledOffsetZ: number;
}

export interface SceneBallSettlement {
  ballId: number | null;
  jarIndex: number;
  isBonusJar: boolean;
}

const bonusJarIndices = new Set([0, 1]);

const GRAVITY = 7.6;
const FLOOR_RESTITUTION = 0.38;
const FLOOR_FRICTION = 0.89;
const AIR_DAMPING = 0.998;
const JAR_AIR_DAMPING = 0.992;
const RIM_BOUNCE = 0.46;
const JAR_WALL_RESTITUTION = 0.52;
const JAR_BOTTOM_RESTITUTION = 0.42;
const ENTRY_PLANE_Y = JAR_HEIGHT + BALL_RADIUS;
const CLEAN_ENTRY_RADIUS = JAR_RADIUS - BALL_RADIUS * 0.25;
const JAR_INNER_RADIUS = JAR_RADIUS - BALL_RADIUS;
const CONTAINMENT_TOP_Y = JAR_HEIGHT + BALL_RADIUS * 0.55;
const SETTLE_SPEED_EPSILON = 0.2;
const SETTLE_FRAME_COUNT = 20;
const MAX_BALL_AGE_SECONDS = 8;
const MISSED_BALL_CLEANUP_Y = -1.5;

export class SceneRoot {
  public readonly renderer: WebGLRenderer | null;
  public readonly scene: Scene;
  public readonly camera;
  public readonly jarGroup: Group;
  public readonly jars: Mesh[];
  private readonly ballGroup: Group;
  private readonly activeBalls: ActiveBallVisual[] = [];

  public constructor(
    private readonly host: HTMLElement,
    jarCount: number
  ) {
    this.scene = new Scene();
    this.scene.background = new Color('#0f1724');

    const aspect = host.clientWidth / host.clientHeight;
    this.camera = createCamera(aspect);

    try {
      this.renderer = new WebGLRenderer({ antialias: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setSize(host.clientWidth, host.clientHeight);
      host.appendChild(this.renderer.domElement);
    } catch (error) {
      console.warn(
        '[SceneRoot] WebGL unavailable, continuing without renderer',
        error
      );
      this.renderer = null;
    }

    addLighting(this.scene);

    const floor = new Mesh(
      new PlaneGeometry(8, 8),
      new MeshStandardMaterial({ color: '#1a2433', roughness: 0.9 })
    );
    floor.rotation.x = -Math.PI * 0.5;
    this.scene.add(floor);

    this.jarGroup = new Group();
    this.jars = Array.from({ length: jarCount }, (_, index) => {
      const jar = createJarMesh(index < 2);
      this.jarGroup.add(jar);
      return jar;
    });
    this.scene.add(this.jarGroup);

    this.ballGroup = new Group();
    this.scene.add(this.ballGroup);
  }

  public spawnDropBall(dropX = 0, dropZ = 2.2, ballId: number | null = null): void {
    const ball = createBallMesh();
    ball.position.set(dropX, 2.6, dropZ);
    this.ballGroup.add(ball);

    const horizontalSeed = ((ballId ?? this.activeBalls.length) % 7) - 3;

    this.activeBalls.push({
      id: ballId,
      mesh: ball,
      velocityX: horizontalSeed * 0.05,
      velocityY: -1.8,
      velocityZ: -0.12,
      enteredJarIndex: null,
      hasScoredEntry: false,
      ageSeconds: 0,
      settledFrames: 0,
      isSettled: false,
      settledOffsetX: 0,
      settledOffsetY: 0,
      settledOffsetZ: 0
    });
  }

  public update(dt: number): SceneBallSettlement[] {
    const settlements: SceneBallSettlement[] = [];

    for (let index = this.activeBalls.length - 1; index >= 0; index -= 1) {
      const activeBall = this.activeBalls[index];

      if (activeBall.isSettled) {
        this.updateSettledBallAttachment(activeBall);
        continue;
      }

      activeBall.ageSeconds += dt;
      const previousY = activeBall.mesh.position.y;

      activeBall.velocityY -= GRAVITY * dt;
      activeBall.mesh.position.x += activeBall.velocityX * dt;
      activeBall.mesh.position.y += activeBall.velocityY * dt;
      activeBall.mesh.position.z += activeBall.velocityZ * dt;

      this.resolveFloorCollision(activeBall);

      if (activeBall.enteredJarIndex === null) {
        this.resolveRimBounce(activeBall);
      }

      const entry = this.findCleanEntry(
        activeBall,
        previousY,
        activeBall.mesh.position.y
      );
      if (entry) {
        settlements.push(entry);
        activeBall.hasScoredEntry = true;
        activeBall.enteredJarIndex = entry.jarIndex;
      }

      const settled = this.resolveEnteredJarPhysics(activeBall, dt);
      if (settled) {
        if (activeBall.enteredJarIndex === null) {
          this.ballGroup.remove(activeBall.mesh);
          this.activeBalls.splice(index, 1);
          continue;
        }

        const frozen = this.freezeBallInJar(activeBall);
        if (!frozen) {
          this.ballGroup.remove(activeBall.mesh);
          this.activeBalls.splice(index, 1);
        }
        continue;
      }

      if (
        activeBall.enteredJarIndex === null &&
        (activeBall.ageSeconds >= MAX_BALL_AGE_SECONDS ||
          activeBall.mesh.position.y <= MISSED_BALL_CLEANUP_Y)
      ) {
        this.ballGroup.remove(activeBall.mesh);
        this.activeBalls.splice(index, 1);
      }
    }

    return settlements;
  }

  public resize(): void {
    const width = this.host.clientWidth;
    const height = this.host.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer?.setSize(width, height);
  }

  public render(): void {
    this.renderer?.render(this.scene, this.camera);
  }

  private resolveFloorCollision(activeBall: ActiveBallVisual): void {
    if (activeBall.mesh.position.y > BALL_RADIUS) {
      return;
    }

    activeBall.mesh.position.y = BALL_RADIUS;
    if (activeBall.velocityY < 0) {
      activeBall.velocityY = -activeBall.velocityY * FLOOR_RESTITUTION;
    }

    activeBall.velocityX *= FLOOR_FRICTION;
    activeBall.velocityZ *= FLOOR_FRICTION;
  }

  private resolveRimBounce(activeBall: ActiveBallVisual): void {
    const y = activeBall.mesh.position.y;
    const rimMinY = JAR_HEIGHT - BALL_RADIUS * 0.5;
    const rimMaxY = JAR_HEIGHT + BALL_RADIUS * 1.1;

    if (y < rimMinY || y > rimMaxY || activeBall.velocityY >= 0) {
      return;
    }

    for (const jar of this.jars) {
      const dx = activeBall.mesh.position.x - jar.position.x;
      const dz = activeBall.mesh.position.z - jar.position.z;
      const distanceXZ = Math.hypot(dx, dz);

      if (distanceXZ < CLEAN_ENTRY_RADIUS || distanceXZ > JAR_RADIUS + BALL_RADIUS) {
        continue;
      }

      const nx = dx / Math.max(0.0001, distanceXZ);
      const nz = dz / Math.max(0.0001, distanceXZ);
      const targetDistance = JAR_RADIUS + BALL_RADIUS;
      const correction = targetDistance - distanceXZ;

      activeBall.mesh.position.x += nx * correction;
      activeBall.mesh.position.z += nz * correction;

      activeBall.velocityY = Math.max(
        Math.abs(activeBall.velocityY) * RIM_BOUNCE,
        0.9
      );
      activeBall.velocityX += nx * 0.28;
      activeBall.velocityZ += nz * 0.28;
      return;
    }
  }

  private findCleanEntry(
    activeBall: ActiveBallVisual,
    previousY: number,
    nextY: number
  ): SceneBallSettlement | null {
    if (activeBall.hasScoredEntry) {
      return null;
    }

    if (!(previousY > ENTRY_PLANE_Y && nextY <= ENTRY_PLANE_Y)) {
      return null;
    }

    for (const [jarIndex, jar] of this.jars.entries()) {
      const dx = activeBall.mesh.position.x - jar.position.x;
      const dz = activeBall.mesh.position.z - jar.position.z;
      const distanceXZ = Math.hypot(dx, dz);

      if (distanceXZ <= CLEAN_ENTRY_RADIUS) {
        return {
          ballId: activeBall.id,
          jarIndex,
          isBonusJar: bonusJarIndices.has(jarIndex)
        };
      }
    }

    return null;
  }

  private resolveEnteredJarPhysics(activeBall: ActiveBallVisual, dt: number): boolean {
    if (activeBall.enteredJarIndex === null) {
      activeBall.velocityX *= AIR_DAMPING;
      activeBall.velocityZ *= AIR_DAMPING;
      return false;
    }

    const jar = this.jars[activeBall.enteredJarIndex];
    if (!jar) {
      return true;
    }

    const dx = activeBall.mesh.position.x - jar.position.x;
    const dz = activeBall.mesh.position.z - jar.position.z;
    const distanceXZ = Math.hypot(dx, dz);

    if (distanceXZ > JAR_INNER_RADIUS) {
      const nx = dx / Math.max(0.0001, distanceXZ);
      const nz = dz / Math.max(0.0001, distanceXZ);
      const penetration = distanceXZ - JAR_INNER_RADIUS;

      activeBall.mesh.position.x -= nx * penetration;
      activeBall.mesh.position.z -= nz * penetration;

      const radialVelocity = activeBall.velocityX * nx + activeBall.velocityZ * nz;
      if (radialVelocity > 0) {
        activeBall.velocityX -= radialVelocity * (1 + JAR_WALL_RESTITUTION) * nx;
        activeBall.velocityZ -= radialVelocity * (1 + JAR_WALL_RESTITUTION) * nz;
      }
    }

    if (activeBall.mesh.position.y <= BALL_RADIUS + 0.01 && activeBall.velocityY < 0) {
      activeBall.mesh.position.y = BALL_RADIUS + 0.01;
      activeBall.velocityY = -activeBall.velocityY * JAR_BOTTOM_RESTITUTION;
    }

    if (activeBall.mesh.position.y > CONTAINMENT_TOP_Y && activeBall.velocityY > 0) {
      activeBall.mesh.position.y = CONTAINMENT_TOP_Y;
      activeBall.velocityY = -activeBall.velocityY * 0.24;
      activeBall.velocityX *= 0.9;
      activeBall.velocityZ *= 0.9;
    }

    activeBall.velocityX -= dx * 0.35 * dt;
    activeBall.velocityZ -= dz * 0.35 * dt;

    activeBall.velocityX *= JAR_AIR_DAMPING;
    activeBall.velocityY *= JAR_AIR_DAMPING;
    activeBall.velocityZ *= JAR_AIR_DAMPING;

    const speed = Math.hypot(
      activeBall.velocityX,
      activeBall.velocityY,
      activeBall.velocityZ
    );

    if (activeBall.mesh.position.y <= BALL_RADIUS + 0.03 && speed <= SETTLE_SPEED_EPSILON) {
      activeBall.settledFrames += 1;
    } else {
      activeBall.settledFrames = 0;
    }

    return activeBall.settledFrames >= SETTLE_FRAME_COUNT;
  }

  private freezeBallInJar(activeBall: ActiveBallVisual): boolean {
    const jarIndex = activeBall.enteredJarIndex;
    if (jarIndex === null) {
      return false;
    }

    const jar = this.jars[jarIndex];
    if (!jar) {
      return false;
    }

    activeBall.isSettled = true;
    activeBall.velocityX = 0;
    activeBall.velocityY = 0;
    activeBall.velocityZ = 0;
    activeBall.settledOffsetX = activeBall.mesh.position.x - jar.position.x;
    activeBall.settledOffsetY = Math.max(BALL_RADIUS + 0.01, activeBall.mesh.position.y);
    activeBall.settledOffsetZ = activeBall.mesh.position.z - jar.position.z;

    this.updateSettledBallAttachment(activeBall);
    return true;
  }

  private updateSettledBallAttachment(activeBall: ActiveBallVisual): void {
    const jarIndex = activeBall.enteredJarIndex;
    if (jarIndex === null) {
      return;
    }

    const jar = this.jars[jarIndex];
    if (!jar) {
      return;
    }

    activeBall.mesh.position.x = jar.position.x + activeBall.settledOffsetX;
    activeBall.mesh.position.y = activeBall.settledOffsetY;
    activeBall.mesh.position.z = jar.position.z + activeBall.settledOffsetZ;
  }
}
