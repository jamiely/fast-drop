import { Color, Group, Mesh, Scene, WebGLRenderer } from 'three';
import type { CameraTuning, GameplayTuning } from '../game/config';
import { BALL_RADIUS, createBallMesh } from '../entities/Ball';
import {
  type PlayfieldDimensions,
  createJarPetalMesh,
  createPlayfieldBase,
  createPlayfieldDimensions
} from '../entities/Playfield';
import { JAR_HEIGHT, JAR_RADIUS, createJarMesh } from '../entities/Jar';
import { applyCameraTuning, createCamera } from './camera';
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
  centerOffsetNormalized: number;
}

const GRAVITY = 7.6;
const AIR_DAMPING = 0.998;
const PLAYFIELD_RESTITUTION = 0.22;
const PLAYFIELD_FRICTION = 0.92;
const MOUND_OUTWARD_ACCELERATION = 2.8;
const JAR_AIR_DAMPING = 0.992;
const CONTAINMENT_TOP_FACTOR = 0.55;
const SETTLE_SPEED_EPSILON = 0.2;
const SETTLE_FRAME_COUNT = 20;
const MAX_BALL_AGE_SECONDS = 8;
const MISSED_BALL_CLEANUP_Y = -3.5;
const BALL_COLLISION_RESTITUTION = 0.45;
const BALL_COLLISION_MIN_DISTANCE = BALL_RADIUS * 2;

export class SceneRoot {
  public readonly renderer: WebGLRenderer | null;
  public readonly scene: Scene;
  public readonly camera;
  public readonly jarGroup: Group;
  public readonly jars: Mesh[];
  private readonly petalGroup: Group;
  private readonly petals: Mesh[];
  private playfieldDimensions: PlayfieldDimensions;
  private readonly ballGroup: Group;
  private readonly activeBalls: ActiveBallVisual[] = [];
  private readonly playfieldMesh: Group;
  private readonly bonusJarIndices: Set<number>;
  private missedBallCountSinceLastUpdate = 0;

  private dropPoint = { x: 0, z: 2.2, y: 2.6 };
  private jarDiameterScale = 1;
  private jarHeightScale = 1;
  private rimBounce = 0.46;
  private wallRestitution = 0.52;
  private floorRestitution = 0.42;

  public constructor(
    private readonly host: HTMLElement,
    jarCount: number,
    jarOrbitRadius = 2.2,
    bonusBucketCount = 2
  ) {
    this.scene = new Scene();
    this.scene.background = new Color('#170a2e');

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

    this.playfieldDimensions = createPlayfieldDimensions(
      jarOrbitRadius,
      JAR_RADIUS
    );
    this.playfieldMesh = createPlayfieldBase(this.playfieldDimensions);
    this.scene.add(this.playfieldMesh);

    this.jarGroup = new Group();
    this.jars = Array.from({ length: jarCount }, (_, index) => {
      const jar = createJarMesh(index < bonusBucketCount);
      this.jarGroup.add(jar);
      return jar;
    });
    this.scene.add(this.jarGroup);

    this.bonusJarIndices = new Set(
      Array.from({ length: Math.max(0, bonusBucketCount) }, (_, index) => index)
    );

    this.petalGroup = new Group();
    this.petals = Array.from({ length: jarCount }, () => {
      const petal = createJarPetalMesh(this.playfieldDimensions);
      this.petalGroup.add(petal);
      return petal;
    });
    this.scene.add(this.petalGroup);

    this.ballGroup = new Group();
    this.scene.add(this.ballGroup);
  }

  public applyGameplayTuning(key: keyof GameplayTuning, value: number): void {
    if (!Number.isFinite(value)) {
      return;
    }

    if (key === 'dropPointX') {
      this.dropPoint.x = value;
      return;
    }

    if (key === 'dropPointZ') {
      this.dropPoint.z = value;
      return;
    }

    if (key === 'dropHeight') {
      this.dropPoint.y = value;
      return;
    }

    if (key === 'jarDiameterScale') {
      this.jarDiameterScale = Math.max(0.6, value);
      this.syncJarScale();
      return;
    }

    if (key === 'jarHeightScale') {
      this.jarHeightScale = Math.max(0.6, value);
      this.syncJarScale();
      return;
    }

    if (key === 'ballBounciness') {
      this.rimBounce = Math.max(0.05, Math.min(0.95, value));
      return;
    }

    if (key === 'wallBounciness') {
      this.wallRestitution = Math.max(0.05, Math.min(0.95, value));
      return;
    }

    if (key === 'floorBounciness') {
      this.floorRestitution = Math.max(0.05, Math.min(0.95, value));
    }
  }

  public applyCameraTuning(tuning: CameraTuning): void {
    applyCameraTuning(this.camera, tuning);
  }

  public spawnDropBall(
    dropX = this.dropPoint.x,
    dropZ = this.dropPoint.z,
    ballId: number | null = null
  ): void {
    const ball = createBallMesh();
    ball.position.set(dropX, this.dropPoint.y, dropZ);
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

    this.syncPlayfieldVisuals();

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

      if (activeBall.enteredJarIndex === null) {
        this.resolvePlayfieldCollision(activeBall, dt);
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
          this.missedBallCountSinceLastUpdate += 1;
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
        this.missedBallCountSinceLastUpdate += 1;
        this.ballGroup.remove(activeBall.mesh);
        this.activeBalls.splice(index, 1);
      }
    }

    this.resolveBallPairCollisions();

    return settlements;
  }

  public consumeMissedBallCount(): number {
    const value = this.missedBallCountSinceLastUpdate;
    this.missedBallCountSinceLastUpdate = 0;
    return value;
  }

  public hasUnresolvedBalls(): boolean {
    return this.activeBalls.some((ball) => !ball.isSettled);
  }

  public resetRound(): void {
    for (const activeBall of this.activeBalls) {
      this.ballGroup.remove(activeBall.mesh);
    }

    this.activeBalls.length = 0;
    this.missedBallCountSinceLastUpdate = 0;
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

  private syncJarScale(): void {
    for (const jar of this.jars) {
      jar.scale.set(
        this.jarDiameterScale,
        this.jarHeightScale,
        this.jarDiameterScale
      );
    }
  }

  private getJarRadius(): number {
    return JAR_RADIUS * this.jarDiameterScale;
  }

  private getJarHeight(): number {
    return JAR_HEIGHT * this.jarHeightScale;
  }

  private getEntryPlaneY(): number {
    return this.getJarHeight() + BALL_RADIUS;
  }

  private getContainmentTopY(): number {
    return this.getJarHeight() + BALL_RADIUS * CONTAINMENT_TOP_FACTOR;
  }

  private syncPlayfieldVisuals(): void {
    for (const [index, jar] of this.jars.entries()) {
      jar.lookAt(0, jar.position.y, 0);

      const petal = this.petals[index];
      petal.position.x = jar.position.x;
      petal.position.z = jar.position.z;
    }
  }

  private resolvePlayfieldCollision(
    activeBall: ActiveBallVisual,
    dt: number
  ): void {
    const supportHeight = this.getSupportHeightAt(
      activeBall.mesh.position.x,
      activeBall.mesh.position.z
    );

    if (!Number.isFinite(supportHeight)) {
      return;
    }

    const contactY = supportHeight + BALL_RADIUS;
    if (activeBall.mesh.position.y > contactY) {
      return;
    }

    activeBall.mesh.position.y = contactY;

    if (activeBall.velocityY < 0) {
      activeBall.velocityY = -activeBall.velocityY * PLAYFIELD_RESTITUTION;
    }

    activeBall.velocityX *= PLAYFIELD_FRICTION;
    activeBall.velocityZ *= PLAYFIELD_FRICTION;

    const radiusFromCenter = Math.hypot(
      activeBall.mesh.position.x,
      activeBall.mesh.position.z
    );
    const { moundRadius, moundHeight } = this.playfieldDimensions;
    if (radiusFromCenter >= moundRadius) {
      return;
    }

    const safeRadius = Math.max(0.0001, radiusFromCenter);
    const outwardX = activeBall.mesh.position.x / safeRadius;
    const outwardZ = activeBall.mesh.position.z / safeRadius;
    const slopeStrength = moundHeight / moundRadius;
    const outwardAcceleration = MOUND_OUTWARD_ACCELERATION * slopeStrength;

    activeBall.velocityX += outwardX * outwardAcceleration * dt;
    activeBall.velocityZ += outwardZ * outwardAcceleration * dt;
  }

  private getSupportHeightAt(x: number, z: number): number {
    const { moundRadius, moundHeight, petalTopY, petalRadius } =
      this.playfieldDimensions;

    const radiusFromCenter = Math.hypot(x, z);
    const moundHeightAtPoint =
      radiusFromCenter <= moundRadius
        ? Math.max(0, moundHeight * (1 - radiusFromCenter / moundRadius))
        : Number.NEGATIVE_INFINITY;

    let petalHeightAtPoint = Number.NEGATIVE_INFINITY;

    for (const petal of this.petals) {
      const dx = x - petal.position.x;
      const dz = z - petal.position.z;
      const distanceFromPetalCenter = Math.hypot(dx, dz);

      if (distanceFromPetalCenter <= petalRadius) {
        petalHeightAtPoint = Math.max(petalHeightAtPoint, petalTopY);
      }
    }

    return Math.max(moundHeightAtPoint, petalHeightAtPoint);
  }

  private resolveRimBounce(activeBall: ActiveBallVisual): void {
    const y = activeBall.mesh.position.y;
    const jarHeight = this.getJarHeight();
    const jarRadius = this.getJarRadius();
    const cleanEntryRadius = jarRadius - BALL_RADIUS * 0.25;
    const rimMinY = jarHeight - BALL_RADIUS * 0.5;
    const rimMaxY = jarHeight + BALL_RADIUS * 1.1;

    if (y < rimMinY || y > rimMaxY || activeBall.velocityY >= 0) {
      return;
    }

    for (const jar of this.jars) {
      const dx = activeBall.mesh.position.x - jar.position.x;
      const dz = activeBall.mesh.position.z - jar.position.z;
      const distanceXZ = Math.hypot(dx, dz);

      if (
        distanceXZ < cleanEntryRadius ||
        distanceXZ > jarRadius + BALL_RADIUS
      ) {
        continue;
      }

      const nx = dx / Math.max(0.0001, distanceXZ);
      const nz = dz / Math.max(0.0001, distanceXZ);
      const targetDistance = jarRadius + BALL_RADIUS;
      const correction = targetDistance - distanceXZ;

      activeBall.mesh.position.x += nx * correction;
      activeBall.mesh.position.z += nz * correction;

      activeBall.velocityY = Math.max(
        Math.abs(activeBall.velocityY) * this.rimBounce,
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

    if (
      !(previousY > this.getEntryPlaneY() && nextY <= this.getEntryPlaneY())
    ) {
      return null;
    }

    const cleanEntryRadius = this.getJarRadius() - BALL_RADIUS * 0.25;

    for (const [jarIndex, jar] of this.jars.entries()) {
      const dx = activeBall.mesh.position.x - jar.position.x;
      const dz = activeBall.mesh.position.z - jar.position.z;
      const distanceXZ = Math.hypot(dx, dz);

      if (distanceXZ <= cleanEntryRadius) {
        return {
          ballId: activeBall.id,
          jarIndex,
          isBonusJar: this.bonusJarIndices.has(jarIndex),
          centerOffsetNormalized: Math.min(
            1,
            distanceXZ / Math.max(0.001, cleanEntryRadius)
          )
        };
      }
    }

    return null;
  }

  private resolveBallPairCollisions(): void {
    for (
      let leftIndex = 0;
      leftIndex < this.activeBalls.length;
      leftIndex += 1
    ) {
      const leftBall = this.activeBalls[leftIndex];

      for (
        let rightIndex = leftIndex + 1;
        rightIndex < this.activeBalls.length;
        rightIndex += 1
      ) {
        const rightBall = this.activeBalls[rightIndex];

        const dx = rightBall.mesh.position.x - leftBall.mesh.position.x;
        const dy = rightBall.mesh.position.y - leftBall.mesh.position.y;
        const dz = rightBall.mesh.position.z - leftBall.mesh.position.z;
        const distance = Math.hypot(dx, dy, dz);

        if (distance >= BALL_COLLISION_MIN_DISTANCE) {
          continue;
        }

        const nx = dx / Math.max(0.0001, distance);
        const ny = dy / Math.max(0.0001, distance);
        const nz = dz / Math.max(0.0001, distance);
        const penetration = BALL_COLLISION_MIN_DISTANCE - distance;

        if (leftBall.isSettled && rightBall.isSettled) {
          continue;
        }

        if (leftBall.isSettled) {
          this.separateAndBounceMovingBall(rightBall, nx, ny, nz, penetration);
          continue;
        }

        if (rightBall.isSettled) {
          this.separateAndBounceMovingBall(
            leftBall,
            -nx,
            -ny,
            -nz,
            penetration
          );
          continue;
        }

        leftBall.mesh.position.x -= nx * penetration * 0.5;
        leftBall.mesh.position.y -= ny * penetration * 0.5;
        leftBall.mesh.position.z -= nz * penetration * 0.5;
        rightBall.mesh.position.x += nx * penetration * 0.5;
        rightBall.mesh.position.y += ny * penetration * 0.5;
        rightBall.mesh.position.z += nz * penetration * 0.5;

        const relativeVelocityX = rightBall.velocityX - leftBall.velocityX;
        const relativeVelocityY = rightBall.velocityY - leftBall.velocityY;
        const relativeVelocityZ = rightBall.velocityZ - leftBall.velocityZ;
        const normalSpeed =
          relativeVelocityX * nx +
          relativeVelocityY * ny +
          relativeVelocityZ * nz;

        if (normalSpeed < 0) {
          const impulse = (-(1 + BALL_COLLISION_RESTITUTION) * normalSpeed) / 2;
          leftBall.velocityX -= impulse * nx;
          leftBall.velocityY -= impulse * ny;
          leftBall.velocityZ -= impulse * nz;
          rightBall.velocityX += impulse * nx;
          rightBall.velocityY += impulse * ny;
          rightBall.velocityZ += impulse * nz;
        }

        this.stabilizeBallAfterCollision(leftBall);
        this.stabilizeBallAfterCollision(rightBall);
      }
    }
  }

  private separateAndBounceMovingBall(
    movingBall: ActiveBallVisual,
    nx: number,
    ny: number,
    nz: number,
    penetration: number
  ): void {
    movingBall.mesh.position.x += nx * penetration;
    movingBall.mesh.position.y += ny * penetration;
    movingBall.mesh.position.z += nz * penetration;

    const normalSpeed =
      movingBall.velocityX * nx +
      movingBall.velocityY * ny +
      movingBall.velocityZ * nz;

    if (normalSpeed < 0) {
      movingBall.velocityX -=
        (1 + BALL_COLLISION_RESTITUTION) * normalSpeed * nx;
      movingBall.velocityY -=
        (1 + BALL_COLLISION_RESTITUTION) * normalSpeed * ny;
      movingBall.velocityZ -=
        (1 + BALL_COLLISION_RESTITUTION) * normalSpeed * nz;
    }

    this.stabilizeBallAfterCollision(movingBall);
  }

  private stabilizeBallAfterCollision(activeBall: ActiveBallVisual): void {
    if (activeBall.isSettled) {
      this.updateSettledBallAttachment(activeBall);
    }
  }

  private resolveEnteredJarPhysics(
    activeBall: ActiveBallVisual,
    dt: number
  ): boolean {
    if (activeBall.enteredJarIndex === null) {
      activeBall.velocityX *= AIR_DAMPING;
      activeBall.velocityZ *= AIR_DAMPING;
      return false;
    }

    const jar = this.jars[activeBall.enteredJarIndex];
    if (!jar) {
      return true;
    }

    const jarInnerRadius = this.getJarRadius() - BALL_RADIUS;

    const dx = activeBall.mesh.position.x - jar.position.x;
    const dz = activeBall.mesh.position.z - jar.position.z;
    const distanceXZ = Math.hypot(dx, dz);

    if (distanceXZ > jarInnerRadius) {
      const nx = dx / Math.max(0.0001, distanceXZ);
      const nz = dz / Math.max(0.0001, distanceXZ);
      const penetration = distanceXZ - jarInnerRadius;

      activeBall.mesh.position.x -= nx * penetration;
      activeBall.mesh.position.z -= nz * penetration;

      const radialVelocity =
        activeBall.velocityX * nx + activeBall.velocityZ * nz;
      if (radialVelocity > 0) {
        activeBall.velocityX -=
          radialVelocity * (1 + this.wallRestitution) * nx;
        activeBall.velocityZ -=
          radialVelocity * (1 + this.wallRestitution) * nz;
      }
    }

    if (
      activeBall.mesh.position.y <= BALL_RADIUS + 0.01 &&
      activeBall.velocityY < 0
    ) {
      activeBall.mesh.position.y = BALL_RADIUS + 0.01;
      activeBall.velocityY = -activeBall.velocityY * this.floorRestitution;
    }

    if (
      activeBall.mesh.position.y > this.getContainmentTopY() &&
      activeBall.velocityY > 0
    ) {
      activeBall.mesh.position.y = this.getContainmentTopY();
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

    if (
      activeBall.mesh.position.y <= BALL_RADIUS + 0.03 &&
      speed <= SETTLE_SPEED_EPSILON
    ) {
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
    activeBall.settledOffsetY = Math.max(
      BALL_RADIUS + 0.01,
      activeBall.mesh.position.y
    );
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
