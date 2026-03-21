import {
  Color,
  Group,
  Mesh,
  Object3D,
  MeshPhysicalMaterial,
  Scene,
  ShaderMaterial,
  TorusGeometry,
  WebGLRenderer
} from 'three';
import type { CameraTuning, GameplayTuning } from '../game/config';
import { BALL_RADIUS, createBallMesh } from '../entities/Ball';
import {
  createDropButtonVisual,
  createDropTubeVisual,
  createOuterEnclosure,
  type DropButtonVisual,
  type DropTubeVisual
} from '../entities/ArcadeShell';
import {
  type PlayfieldDimensions,
  createJarBridgeMesh,
  createJarPetalMesh,
  createPlayfieldBase,
  createPlayfieldDimensions
} from '../entities/Playfield';
import { JAR_HEIGHT, JAR_RADIUS, createJarMesh } from '../entities/Jar';
import {
  createStatusDisplay,
  type StatusDisplayVisual
} from '../entities/StatusDisplay';
import { applyCameraTuning, createCamera } from './camera';
import {
  addLighting,
  type LightPropertyKey,
  type LightSnapshot,
  type LightType,
  type LightingRig
} from './lighting';
import {
  OUTER_RING_LED_BASE_COLOR,
  createCenterDomeReflectionMaterial,
  createOuterRingLedShaderMaterial
} from './outerRingLed';

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
const PLAYFIELD_FRICTION = 0.965;
const MOUND_OUTWARD_ACCELERATION = 5.6;
const JAR_AIR_DAMPING = 0.992;
const CONTAINMENT_TOP_FACTOR = 0.55;
const SETTLE_SPEED_EPSILON = 0.2;
const SETTLE_FRAME_COUNT = 20;
const MAX_BALL_AGE_SECONDS = 8;
const MISSED_BALL_CLEANUP_Y = -3.5;
const BALL_COLLISION_RESTITUTION = 0.45;
const OUTER_RING_LED_REVERSE_CHECK_SECONDS = 2.4;
const BRIDGE_CENTER_DOME_UNDERLAP = 0.35;
const STATUS_DISPLAY_END_Z = 2.6;
const STATUS_DISPLAY_END_ANIMATION_SECONDS = 2;
const DROP_TUBE_END_HEIGHT = 5;
const DROP_TUBE_END_ANIMATION_SECONDS = 1;
const CAMERA_FILL_BASE_ZOOM = 1.15;
const CAMERA_FILL_REFERENCE_ASPECT = 16 / 9;
const CAMERA_FILL_MAX_ZOOM = 1.7;

export class SceneRoot {
  public readonly renderer: WebGLRenderer | null;
  public readonly scene: Scene;
  public readonly camera;
  public readonly jarGroup: Group;
  public readonly jars: Mesh[];
  private readonly petalGroup: Group;
  private readonly petals: Mesh[];
  private readonly bridgeGroup: Group;
  private readonly bridges: Mesh[];
  private playfieldDimensions: PlayfieldDimensions;
  private readonly ballGroup: Group;
  private readonly activeBalls: ActiveBallVisual[] = [];
  private readonly playfieldMesh: Group;
  private readonly moundMesh: Object3D;
  private readonly centerDomeReflectionMesh: Object3D | null;
  private readonly centerDomeReflectionMaterial: ShaderMaterial | null;
  private readonly outerRingMesh: Mesh<TorusGeometry, MeshPhysicalMaterial>;
  private readonly outerRingLedOverlayMesh: Mesh<
    TorusGeometry,
    ShaderMaterial
  > | null;
  private readonly bonusJarIndices: Set<number>;
  private readonly statusDisplay: StatusDisplayVisual;
  private readonly dropTube: DropTubeVisual;
  private readonly dropButton: DropButtonVisual;
  private readonly enclosure: Group;
  private readonly lightingRig: LightingRig;
  private missedBallCountSinceLastUpdate = 0;
  private bounceCountSinceLastUpdate = 0;
  private outerRingLedPhase = 0;
  private outerRingLedDirection = 1;
  private outerRingLedReverseTimer = 0;
  private dropButtonLightPulse = 0;
  private dropButtonPress = 0;

  private dropPoint = { x: 0, z: 2.2, y: 2.5 };
  private configuredDropHeight = this.dropPoint.y;
  private dropTubeEndAnimationElapsed = 0;
  private dropTubeEndAnimationStartY = this.dropPoint.y;
  private dropButtonZ = 3.75;
  private orbitRadius = 2.2;
  private jarDiameterScale = 1;
  private jarHeightScale = 1;
  private ballSizeScale = 2;
  private rimBounce = 0.46;
  private wallRestitution = 0.52;
  private floorRestitution = 0.42;
  private centerDomeDiameterScale = 1;
  private centerDomeSteepnessScale = 1;
  private centerDomeHeightOffset = 0;
  private centerDomeAppliedDiameterScale = 1;
  private platformArmLengthScale = 0.15;
  private outerRingLedEnabled = true;
  private outerRingLedSpeed = 0.35;
  private outerRingLedHeadCount = 4;
  private outerRingLedTrail = 0.58;
  private outerRingLedReverseChance = 0.2;
  private statusDisplayX = 0;
  private statusDisplayY = 2.25;
  private statusDisplayZ = 1.7;
  private statusDisplayScale = 1.3;
  private statusDisplayRoundEnded = false;
  private statusDisplayEndAnimationElapsed = 0;
  private statusDisplayEndAnimationStartZ = this.statusDisplayZ;
  private readonly shaderEffectsEnabled: boolean;

  public constructor(
    private readonly host: HTMLElement,
    jarCount: number,
    jarOrbitRadius = 2.2,
    bonusBucketCount = 2,
    showLightHelpers = false,
    shaderEffectsEnabled = true
  ) {
    this.shaderEffectsEnabled = shaderEffectsEnabled;
    this.orbitRadius = Math.max(0.5, jarOrbitRadius);
    this.scene = new Scene();
    this.scene.background = new Color('#170a2e');

    const aspect = host.clientWidth / host.clientHeight;
    this.camera = createCamera(aspect);
    this.applyViewportCameraFill();

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

    this.lightingRig = addLighting(this.scene, {
      showDebugHelpers: showLightHelpers
    });

    this.playfieldDimensions = createPlayfieldDimensions(
      jarOrbitRadius,
      JAR_RADIUS
    );
    this.playfieldMesh = createPlayfieldBase(this.playfieldDimensions);

    const mound = this.playfieldMesh.children[0];
    const outerRing = this.playfieldMesh.children[1];
    if (!(mound instanceof Mesh)) {
      throw new Error('[SceneRoot] Playfield mound mesh is missing');
    }

    if (
      !(outerRing instanceof Mesh) ||
      !(outerRing.material instanceof MeshPhysicalMaterial)
    ) {
      throw new Error('[SceneRoot] Playfield outer ring mesh is missing');
    }

    this.moundMesh = mound;
    if (this.shaderEffectsEnabled) {
      this.centerDomeReflectionMaterial = createCenterDomeReflectionMaterial();
      this.centerDomeReflectionMesh = new Mesh(
        mound.geometry,
        this.centerDomeReflectionMaterial
      );
      this.centerDomeReflectionMesh.scale.setScalar(1.002);
      this.centerDomeReflectionMesh.renderOrder = 2;
      this.centerDomeReflectionMesh.position.set(0, 0.001, 0);
      this.moundMesh.add(this.centerDomeReflectionMesh);
    } else {
      this.centerDomeReflectionMaterial = null;
      this.centerDomeReflectionMesh = null;
    }

    this.outerRingMesh = outerRing as Mesh<TorusGeometry, MeshPhysicalMaterial>;
    this.outerRingMesh.renderOrder = 1;
    this.scene.add(this.playfieldMesh);

    this.enclosure = createOuterEnclosure(
      this.playfieldDimensions.outerRingRadius + 0.34
    );
    this.scene.add(this.enclosure);

    this.dropTube = createDropTubeVisual(
      this.getBallRadius(),
      this.dropPoint.y
    );
    this.dropTube.group.position.x = this.dropPoint.x;
    this.dropTube.group.position.z = this.dropPoint.z;
    this.scene.add(this.dropTube.group);

    this.dropButton = createDropButtonVisual();
    this.dropButton.group.position.set(0, 0.07, this.dropButtonZ);
    this.scene.add(this.dropButton.group);
    this.syncDropButtonPlacement();

    if (this.shaderEffectsEnabled) {
      this.outerRingLedOverlayMesh = new Mesh(
        this.outerRingMesh.geometry.clone(),
        createOuterRingLedShaderMaterial({
          headCount: this.outerRingLedHeadCount,
          trail: this.outerRingLedTrail,
          direction: this.outerRingLedDirection
        })
      );
      this.outerRingLedOverlayMesh.rotation.copy(this.outerRingMesh.rotation);
      this.outerRingLedOverlayMesh.position.copy(this.outerRingMesh.position);
      this.outerRingLedOverlayMesh.scale.setScalar(1.0015);
      this.outerRingLedOverlayMesh.renderOrder = 2;
      this.scene.add(this.outerRingLedOverlayMesh);
    } else {
      this.outerRingLedOverlayMesh = null;
    }

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

    this.bridgeGroup = new Group();
    this.bridges = Array.from({ length: jarCount }, () => {
      const bridge = createJarBridgeMesh(this.playfieldDimensions);
      this.bridgeGroup.add(bridge);
      return bridge;
    });
    this.scene.add(this.bridgeGroup);

    this.ballGroup = new Group();
    this.scene.add(this.ballGroup);

    this.statusDisplay = createStatusDisplay();
    this.scene.add(this.statusDisplay.group);
    this.syncStatusDisplayPlacement();

    this.syncJarScale();
    this.updateCenterDomeScale();
  }

  public applyGameplayTuning(key: keyof GameplayTuning, value: number): void {
    if (!Number.isFinite(value)) {
      return;
    }

    if (key === 'outerRingDiameter') {
      this.updateOuterRingGeometry(value);
      this.syncEnclosureToOuterRingDiameter(value);
      this.syncDropButtonPlacement();
      return;
    }

    if (key === 'centerDomeDiameterScale') {
      this.centerDomeDiameterScale = Math.max(0.3, Math.min(3.2, value));
      this.updateCenterDomeScale();
      return;
    }

    if (key === 'centerDomeSteepnessScale') {
      this.centerDomeSteepnessScale = Math.max(0.35, Math.min(3.5, value));
      this.updateCenterDomeScale();
      return;
    }

    if (key === 'centerDomeHeightOffset') {
      this.centerDomeHeightOffset = Math.max(-1.2, Math.min(1.2, value));
      this.updateCenterDomeScale();
      return;
    }

    if (key === 'platformArmLengthScale') {
      this.platformArmLengthScale = Math.max(0.05, Math.min(2.4, value));
      return;
    }

    if (key === 'ringRadius') {
      this.orbitRadius = Math.max(0.5, value);
      this.updateCenterDomeScale();
      return;
    }

    if (key === 'dropPointX') {
      this.dropPoint.x = value;
      this.dropTube.group.position.x = this.dropPoint.x;
      return;
    }

    if (key === 'dropPointZ') {
      this.dropPoint.z = value;
      this.dropTube.group.position.z = this.dropPoint.z;
      return;
    }

    if (key === 'dropHeight') {
      this.configuredDropHeight = value;

      if (!this.statusDisplayRoundEnded) {
        this.dropPoint.y = value;
        this.dropTube.setDropHeight(this.dropPoint.y);
      }
      return;
    }

    if (key === 'dropButtonZ') {
      this.dropButtonZ = value;
      this.syncDropButtonPlacement();
      return;
    }

    if (key === 'statusDisplayX') {
      this.statusDisplayX = value;
      this.syncStatusDisplayPlacement();
      return;
    }

    if (key === 'statusDisplayY') {
      this.statusDisplayY = value;
      this.syncStatusDisplayPlacement();
      return;
    }

    if (key === 'statusDisplayZ') {
      this.statusDisplayZ = value;
      this.syncStatusDisplayPlacement();
      return;
    }

    if (key === 'statusDisplayScale') {
      this.statusDisplayScale = Math.max(0.2, Math.min(3, value));
      this.syncStatusDisplayPlacement();
      return;
    }

    if (key === 'statusDisplayBallScale') {
      this.statusDisplay.setBallsSphereScale(
        Math.max(0.5, Math.min(3.5, value))
      );
      return;
    }

    if (key === 'jarDiameterScale') {
      this.jarDiameterScale = Math.max(0.35, value);
      this.syncJarScale();
      return;
    }

    if (key === 'jarHeightScale') {
      this.jarHeightScale = Math.max(0.35, value);
      this.syncJarScale();
      return;
    }

    if (key === 'ballSizeScale') {
      this.ballSizeScale = Math.max(0.35, Math.min(3.2, value));
      this.syncBallScale();
      this.dropTube.syncToBallRadius(this.getBallRadius());
      return;
    }

    if (key === 'ballBounciness') {
      this.rimBounce = Math.max(0, Math.min(1.2, value));
      return;
    }

    if (key === 'wallBounciness') {
      this.wallRestitution = Math.max(0, Math.min(1.2, value));
      return;
    }

    if (key === 'floorBounciness') {
      this.floorRestitution = Math.max(0, Math.min(1.2, value));
      return;
    }

    if (key === 'outerRingLedEnabled') {
      this.outerRingLedEnabled = value >= 0.5;
      return;
    }

    if (key === 'outerRingLedSpeed') {
      this.outerRingLedSpeed = Math.max(0, Math.min(6, value));
      return;
    }

    if (key === 'outerRingLedHeadCount') {
      this.outerRingLedHeadCount = Math.max(1, Math.min(24, Math.round(value)));
      return;
    }

    if (key === 'outerRingLedTrail') {
      this.outerRingLedTrail = Math.max(0.05, Math.min(1, value));
      return;
    }

    if (key === 'outerRingLedReverseChance') {
      this.outerRingLedReverseChance = Math.max(0, Math.min(1, value));
    }
  }

  public applyCameraTuning(tuning: CameraTuning): void {
    applyCameraTuning(this.camera, tuning);
  }

  public getLightSnapshot(): LightSnapshot[] {
    return this.lightingRig.getSnapshot();
  }

  public updateLightValue(
    id: string,
    key: LightPropertyKey,
    value: number | string | boolean
  ): void {
    this.lightingRig.setLightValue(id, key, value);
  }

  public addDebugLight(type: LightType): LightSnapshot {
    return this.lightingRig.addLight(type);
  }

  public setSelectedDebugLight(id: string | null): void {
    this.lightingRig.setSelectedLight(id);
  }

  public setStatusDisplayState(
    timeRemaining: number,
    timeTotal: number,
    ballsRemaining: number,
    ballsTotal: number,
    roundEnded: boolean,
    score: number,
    ballsEntered: number
  ): void {
    if (roundEnded && !this.statusDisplayRoundEnded) {
      this.statusDisplayEndAnimationElapsed = 0;
      this.statusDisplayEndAnimationStartZ =
        this.statusDisplay.group.position.z;
      this.dropTubeEndAnimationElapsed = 0;
      this.dropTubeEndAnimationStartY = this.dropPoint.y;
    } else if (!roundEnded && this.statusDisplayRoundEnded) {
      this.statusDisplay.setPlacement(
        this.statusDisplayX,
        this.statusDisplayY,
        this.statusDisplayZ
      );
      this.dropPoint.y = this.configuredDropHeight;
      this.dropTube.setDropHeight(this.dropPoint.y);
    }

    this.statusDisplayRoundEnded = roundEnded;

    this.statusDisplay.updateData({
      timeRemaining,
      timeTotal,
      ballsRemaining,
      ballsTotal,
      roundEnded,
      score,
      ballsEntered
    });
  }

  public spawnDropBall(
    dropX = this.dropPoint.x,
    dropZ = this.dropPoint.z,
    ballId: number | null = null
  ): void {
    const ball = createBallMesh();
    ball.scale.setScalar(this.ballSizeScale);
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

    this.dropButtonLightPulse = 1;
    this.dropButtonPress = 1;
    this.dropButton.setLitIntensity(this.dropButtonLightPulse);
    this.dropButton.setPressAmount(this.dropButtonPress);
  }

  public update(dt: number): SceneBallSettlement[] {
    const settlements: SceneBallSettlement[] = [];

    this.syncPlayfieldVisuals();
    this.updateOuterRingLeds(dt);
    this.updateStatusDisplayAnimation(dt);
    this.updateDropTubeAnimation(dt);

    this.dropButtonLightPulse = Math.max(
      0,
      this.dropButtonLightPulse - dt * 3.4
    );
    this.dropButtonPress = Math.max(0, this.dropButtonPress - dt * 8.5);
    this.dropButton.setLitIntensity(this.dropButtonLightPulse);
    this.dropButton.setPressAmount(this.dropButtonPress);

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
        this.resolveOuterJarWallCollision(activeBall);
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

  public consumeBounceCount(): number {
    const value = this.bounceCountSinceLastUpdate;
    this.bounceCountSinceLastUpdate = 0;
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
    this.bounceCountSinceLastUpdate = 0;
  }

  public resize(): void {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    this.camera.aspect = width / height;
    this.applyViewportCameraFill();
    this.camera.updateProjectionMatrix();
    this.renderer?.setSize(width, height);
  }

  public render(): void {
    this.renderer?.render(this.scene, this.camera);
  }

  public getRecommendedOrbitRadius(): number {
    const moundRadius = this.getMoundRadius();
    const bridgeAnchorRadius = Math.max(
      0,
      moundRadius - this.getBridgeDomeIntersectionDepth()
    );
    const petalRadius =
      this.playfieldDimensions.petalRadius * this.jarDiameterScale;
    const baseArmLength = Math.max(
      this.getMinimumBridgeLength(),
      this.playfieldDimensions.bridgeLength
    );
    const targetArmLength = baseArmLength * this.platformArmLengthScale;

    return Math.max(
      0.5,
      bridgeAnchorRadius + targetArmLength + petalRadius * 0.98
    );
  }

  private applyViewportCameraFill(): void {
    const width = Math.max(1, this.host.clientWidth);
    const height = Math.max(1, this.host.clientHeight);
    const aspect = width / height;
    const aspectZoom = aspect / CAMERA_FILL_REFERENCE_ASPECT;

    this.camera.zoom = Math.min(
      CAMERA_FILL_MAX_ZOOM,
      Math.max(CAMERA_FILL_BASE_ZOOM, aspectZoom)
    );
  }

  private syncStatusDisplayPlacement(): void {
    this.statusDisplay.setPlacement(
      this.statusDisplayX,
      this.statusDisplayY,
      this.statusDisplayZ
    );
    this.statusDisplay.setScale(this.statusDisplayScale);
  }

  private updateStatusDisplayAnimation(dt: number): void {
    if (!this.statusDisplayRoundEnded) {
      return;
    }

    this.statusDisplayEndAnimationElapsed = Math.min(
      STATUS_DISPLAY_END_ANIMATION_SECONDS,
      this.statusDisplayEndAnimationElapsed + dt
    );

    const progress =
      this.statusDisplayEndAnimationElapsed /
      STATUS_DISPLAY_END_ANIMATION_SECONDS;
    const nextZ =
      this.statusDisplayEndAnimationStartZ +
      (STATUS_DISPLAY_END_Z - this.statusDisplayEndAnimationStartZ) * progress;

    this.statusDisplay.setPlacement(
      this.statusDisplayX,
      this.statusDisplayY,
      nextZ
    );
  }

  private updateDropTubeAnimation(dt: number): void {
    if (!this.statusDisplayRoundEnded) {
      return;
    }

    this.dropTubeEndAnimationElapsed = Math.min(
      DROP_TUBE_END_ANIMATION_SECONDS,
      this.dropTubeEndAnimationElapsed + dt
    );

    const progress =
      this.dropTubeEndAnimationElapsed / DROP_TUBE_END_ANIMATION_SECONDS;
    const nextDropHeight =
      this.dropTubeEndAnimationStartY +
      (DROP_TUBE_END_HEIGHT - this.dropTubeEndAnimationStartY) * progress;

    this.dropPoint.y = nextDropHeight;
    this.dropTube.setDropHeight(nextDropHeight);
  }

  private syncJarScale(): void {
    for (const jar of this.jars) {
      jar.scale.set(
        this.jarDiameterScale,
        this.jarHeightScale,
        this.jarDiameterScale
      );
      jar.position.y = this.getJarHeight() * 0.5;
    }

    for (const petal of this.petals) {
      petal.scale.set(this.jarDiameterScale, 1, this.jarDiameterScale);
    }

    this.updateCenterDomeScale();
  }

  private updateOuterRingGeometry(diameter: number): void {
    const safeDiameter = Math.max(0.6, diameter);
    const radius = safeDiameter * 0.5;
    const nextGeometry = new TorusGeometry(
      radius,
      this.playfieldDimensions.outerRingTubeRadius,
      24,
      120
    );

    this.outerRingMesh.geometry.dispose();
    this.outerRingMesh.geometry = nextGeometry;

    if (this.outerRingLedOverlayMesh) {
      this.outerRingLedOverlayMesh.geometry.dispose();
      this.outerRingLedOverlayMesh.geometry = nextGeometry.clone();
    }
  }

  private syncEnclosureToOuterRingDiameter(diameter: number): void {
    const safeDiameter = Math.max(0.6, diameter);
    const radius = safeDiameter * 0.5 + 0.34;
    this.scene.remove(this.enclosure);
    this.enclosure.clear();
    const nextEnclosure = createOuterEnclosure(radius);
    for (const child of [...nextEnclosure.children]) {
      nextEnclosure.remove(child);
      this.enclosure.add(child);
    }
    this.scene.add(this.enclosure);
  }

  private syncDropButtonPlacement(): void {
    this.dropButton.group.position.set(0, 0.07, this.dropButtonZ);
    this.dropButton.group.rotation.y = Math.PI * 0.5;
  }

  private syncBallScale(): void {
    for (const activeBall of this.activeBalls) {
      activeBall.mesh.scale.setScalar(this.ballSizeScale);
    }
  }

  private updateOuterRingLeds(dt: number): void {
    if (!this.shaderEffectsEnabled) {
      this.outerRingMesh.material.emissive.copy(OUTER_RING_LED_BASE_COLOR);
      this.outerRingMesh.material.emissiveIntensity = 0.02;
      return;
    }

    const centerDomeMaterial = this.centerDomeReflectionMaterial;
    const ledOverlay = this.outerRingLedOverlayMesh;
    if (!centerDomeMaterial || !ledOverlay) {
      return;
    }

    ledOverlay.visible = this.outerRingLedEnabled;

    if (!this.outerRingLedEnabled) {
      centerDomeMaterial.uniforms.uEnabled.value = 0;
      this.outerRingMesh.material.emissive.copy(OUTER_RING_LED_BASE_COLOR);
      this.outerRingMesh.material.emissiveIntensity = 0.02;
      return;
    }

    centerDomeMaterial.uniforms.uEnabled.value = 1;

    this.outerRingLedReverseTimer += dt;
    if (this.outerRingLedReverseTimer >= OUTER_RING_LED_REVERSE_CHECK_SECONDS) {
      this.outerRingLedReverseTimer = 0;
      if (Math.random() <= this.outerRingLedReverseChance) {
        this.outerRingLedDirection *= -1;
      }
    }

    this.outerRingLedPhase +=
      dt * this.outerRingLedSpeed * this.outerRingLedDirection;

    const material = ledOverlay.material;
    material.uniforms.uPhase.value = this.outerRingLedPhase;
    material.uniforms.uHeadCount.value = this.outerRingLedHeadCount;
    material.uniforms.uTrail.value = this.outerRingLedTrail;
    material.uniforms.uDirection.value = this.outerRingLedDirection;

    centerDomeMaterial.uniforms.uPhase.value = this.outerRingLedPhase;

    this.outerRingMesh.material.emissive.copy(OUTER_RING_LED_BASE_COLOR);
    this.outerRingMesh.material.emissiveIntensity = 0.08;
  }

  private getBallRadius(): number {
    return BALL_RADIUS * this.ballSizeScale;
  }

  private getBallCollisionMinDistance(): number {
    return this.getBallRadius() * 2;
  }

  private getJarRadius(): number {
    return JAR_RADIUS * this.jarDiameterScale;
  }

  private getJarHeight(): number {
    return JAR_HEIGHT * this.jarHeightScale;
  }

  private getEntryPlaneY(): number {
    return this.getJarHeight() + this.getBallRadius();
  }

  private getContainmentTopY(): number {
    return this.getJarHeight() + this.getBallRadius() * CONTAINMENT_TOP_FACTOR;
  }

  private getMoundRadius(): number {
    return (
      this.playfieldDimensions.moundRadius * this.centerDomeAppliedDiameterScale
    );
  }

  private getMoundHeight(): number {
    return this.playfieldDimensions.moundHeight * this.centerDomeSteepnessScale;
  }

  private getMoundYOffset(): number {
    return this.centerDomeHeightOffset;
  }

  private getBridgeDomeIntersectionDepth(): number {
    const moundRadius = this.getMoundRadius();
    const preferredDepth = Math.max(0.05, moundRadius * 0.12);
    return Math.min(preferredDepth, moundRadius * 0.45);
  }

  private getMinimumBridgeLength(): number {
    return Math.max(0.03, this.getJarRadius() * 0.08);
  }

  private getBridgeCenterDomeUnderlap(): number {
    const moundRadius = this.getMoundRadius();
    return Math.min(BRIDGE_CENTER_DOME_UNDERLAP, moundRadius * 0.28);
  }

  private updateCenterDomeScale(): void {
    const centerClearance = 0.06;
    const maxRadiusBeforeJarContact = Math.max(
      0.2,
      this.orbitRadius - this.getJarRadius() - centerClearance
    );
    const maxScaleFromJarClearance = Math.max(
      0.2,
      maxRadiusBeforeJarContact /
        Math.max(0.001, this.playfieldDimensions.moundRadius)
    );
    this.centerDomeAppliedDiameterScale = Math.min(
      this.centerDomeDiameterScale,
      maxScaleFromJarClearance
    );

    this.moundMesh.scale.set(
      this.centerDomeAppliedDiameterScale,
      this.centerDomeSteepnessScale,
      this.centerDomeAppliedDiameterScale
    );
    this.moundMesh.position.y =
      this.getMoundHeight() * 0.5 + this.getMoundYOffset();
  }

  private syncPlayfieldVisuals(): void {
    const jarRadius = this.getJarRadius();
    const petalRadius =
      this.playfieldDimensions.petalRadius * this.jarDiameterScale;

    for (const [index, jar] of this.jars.entries()) {
      jar.lookAt(0, jar.position.y, 0);

      const petal = this.petals[index];
      petal.position.x = jar.position.x;
      petal.position.z = jar.position.z;

      const bridge = this.bridges[index];
      const distanceFromCenter = Math.hypot(jar.position.x, jar.position.z);
      const safeDistance = Math.max(0.0001, distanceFromCenter);
      const dirX = jar.position.x / safeDistance;
      const dirZ = jar.position.z / safeDistance;
      const bridgeAnchorRadius = Math.max(
        0,
        this.getMoundRadius() - this.getBridgeDomeIntersectionDepth()
      );
      const underlapAnchorRadius = Math.max(
        0,
        bridgeAnchorRadius - this.getBridgeCenterDomeUnderlap()
      );
      const bridgeEndRadius = Math.max(
        jarRadius * 0.9,
        distanceFromCenter - petalRadius * 0.98
      );
      const bridgeLength = Math.max(
        this.getMinimumBridgeLength(),
        bridgeEndRadius - underlapAnchorRadius
      );
      const bridgeCenterRadius = underlapAnchorRadius + bridgeLength * 0.5;

      bridge.scale.z = bridgeLength / this.playfieldDimensions.bridgeLength;
      bridge.position.x = dirX * bridgeCenterRadius;
      bridge.position.z = dirZ * bridgeCenterRadius;
      bridge.rotation.y = Math.atan2(dirX, dirZ);
    }
  }

  private registerBounce(impactSpeed: number): void {
    if (impactSpeed < 0.5) {
      return;
    }

    this.bounceCountSinceLastUpdate += 1;
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

    const contactY = supportHeight + this.getBallRadius();
    if (activeBall.mesh.position.y > contactY) {
      return;
    }

    activeBall.mesh.position.y = contactY;

    if (activeBall.velocityY < 0) {
      this.registerBounce(Math.abs(activeBall.velocityY));
      activeBall.velocityY = -activeBall.velocityY * PLAYFIELD_RESTITUTION;
    }

    activeBall.velocityX *= PLAYFIELD_FRICTION;
    activeBall.velocityZ *= PLAYFIELD_FRICTION;

    const radiusFromCenter = Math.hypot(
      activeBall.mesh.position.x,
      activeBall.mesh.position.z
    );
    const moundRadius = this.getMoundRadius();
    const moundHeight = this.getMoundHeight();
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
    const { petalTopY, petalRadius, bridgeWidth, bridgeLength } =
      this.playfieldDimensions;

    const moundRadius = this.getMoundRadius();
    const moundHeight = this.getMoundHeight();
    const moundYOffset = this.getMoundYOffset();

    const radiusFromCenter = Math.hypot(x, z);
    const moundHeightAtPoint =
      radiusFromCenter <= moundRadius
        ? Math.max(0, moundHeight * (1 - radiusFromCenter / moundRadius)) +
          moundYOffset
        : Number.NEGATIVE_INFINITY;

    let petalHeightAtPoint = Number.NEGATIVE_INFINITY;
    const effectivePetalRadius = petalRadius * this.jarDiameterScale;

    for (const petal of this.petals) {
      const dx = x - petal.position.x;
      const dz = z - petal.position.z;
      const distanceFromPetalCenter = Math.hypot(dx, dz);

      if (distanceFromPetalCenter <= effectivePetalRadius) {
        petalHeightAtPoint = Math.max(petalHeightAtPoint, petalTopY);
      }
    }

    let bridgeHeightAtPoint = Number.NEGATIVE_INFINITY;

    for (const bridge of this.bridges) {
      const halfBridgeWidth = bridgeWidth * bridge.scale.x * 0.5;
      const halfBridgeLength = bridgeLength * bridge.scale.z * 0.5;
      const cosY = Math.cos(bridge.rotation.y);
      const sinY = Math.sin(bridge.rotation.y);
      const localX =
        (x - bridge.position.x) * cosY - (z - bridge.position.z) * sinY;
      const localZ =
        (x - bridge.position.x) * sinY + (z - bridge.position.z) * cosY;

      if (
        Math.abs(localX) <= halfBridgeWidth &&
        Math.abs(localZ) <= halfBridgeLength
      ) {
        bridgeHeightAtPoint = Math.max(bridgeHeightAtPoint, petalTopY);
      }
    }

    return Math.max(
      moundHeightAtPoint,
      petalHeightAtPoint,
      bridgeHeightAtPoint
    );
  }

  private resolveOuterJarWallCollision(activeBall: ActiveBallVisual): void {
    const y = activeBall.mesh.position.y;
    const ballRadius = this.getBallRadius();
    const jarHeight = this.getJarHeight();

    if (y > jarHeight - ballRadius * 0.15 || y < ballRadius * 0.7) {
      return;
    }

    const jarRadius = this.getJarRadius();
    const targetDistance = jarRadius + ballRadius;

    for (const jar of this.jars) {
      const dx = activeBall.mesh.position.x - jar.position.x;
      const dz = activeBall.mesh.position.z - jar.position.z;
      const distanceXZ = Math.hypot(dx, dz);

      if (distanceXZ >= targetDistance) {
        continue;
      }

      const safeDistance = Math.max(0.0001, distanceXZ);
      const fallbackDirectionX =
        Math.abs(activeBall.velocityX) >= Math.abs(activeBall.velocityZ)
          ? 1
          : 0;
      const fallbackDirectionZ = fallbackDirectionX === 1 ? 0 : 1;
      const nx = distanceXZ > 0.0001 ? dx / safeDistance : fallbackDirectionX;
      const nz = distanceXZ > 0.0001 ? dz / safeDistance : fallbackDirectionZ;
      const penetration = targetDistance - distanceXZ;

      activeBall.mesh.position.x += nx * penetration;
      activeBall.mesh.position.z += nz * penetration;

      const radialVelocity =
        activeBall.velocityX * nx + activeBall.velocityZ * nz;
      if (radialVelocity < 0) {
        this.registerBounce(-radialVelocity);
        activeBall.velocityX -=
          radialVelocity * (1 + this.wallRestitution) * nx;
        activeBall.velocityZ -=
          radialVelocity * (1 + this.wallRestitution) * nz;
      }
    }
  }

  private resolveRimBounce(activeBall: ActiveBallVisual): void {
    const y = activeBall.mesh.position.y;
    const ballRadius = this.getBallRadius();
    const jarHeight = this.getJarHeight();
    const jarRadius = this.getJarRadius();
    const cleanEntryRadius = jarRadius - ballRadius * 0.25;
    const rimMinY = jarHeight - ballRadius * 0.5;
    const rimMaxY = jarHeight + ballRadius * 1.1;

    if (y < rimMinY || y > rimMaxY || activeBall.velocityY >= 0) {
      return;
    }

    for (const jar of this.jars) {
      const dx = activeBall.mesh.position.x - jar.position.x;
      const dz = activeBall.mesh.position.z - jar.position.z;
      const distanceXZ = Math.hypot(dx, dz);

      if (
        distanceXZ < cleanEntryRadius ||
        distanceXZ > jarRadius + ballRadius
      ) {
        continue;
      }

      const nx = dx / Math.max(0.0001, distanceXZ);
      const nz = dz / Math.max(0.0001, distanceXZ);
      const targetDistance = jarRadius + ballRadius;
      const correction = targetDistance - distanceXZ;

      activeBall.mesh.position.x += nx * correction;
      activeBall.mesh.position.z += nz * correction;

      this.registerBounce(Math.abs(activeBall.velocityY));
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

    const cleanEntryRadius = this.getJarRadius() - this.getBallRadius() * 0.25;

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

        if (distance >= this.getBallCollisionMinDistance()) {
          continue;
        }

        const nx = dx / Math.max(0.0001, distance);
        const ny = dy / Math.max(0.0001, distance);
        const nz = dz / Math.max(0.0001, distance);
        const penetration = this.getBallCollisionMinDistance() - distance;

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
          this.registerBounce(-normalSpeed);
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
      this.registerBounce(-normalSpeed);
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

    const ballRadius = this.getBallRadius();
    const jarInnerRadius = this.getJarRadius() - ballRadius;

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
        this.registerBounce(radialVelocity);
        activeBall.velocityX -=
          radialVelocity * (1 + this.wallRestitution) * nx;
        activeBall.velocityZ -=
          radialVelocity * (1 + this.wallRestitution) * nz;
      }
    }

    if (
      activeBall.mesh.position.y <= ballRadius + 0.01 &&
      activeBall.velocityY < 0
    ) {
      this.registerBounce(Math.abs(activeBall.velocityY));
      activeBall.mesh.position.y = ballRadius + 0.01;
      activeBall.velocityY = -activeBall.velocityY * this.floorRestitution;
    }

    if (
      activeBall.mesh.position.y > this.getContainmentTopY() &&
      activeBall.velocityY > 0
    ) {
      this.registerBounce(activeBall.velocityY);
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
      activeBall.mesh.position.y <= ballRadius + 0.03 &&
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
      this.getBallRadius() + 0.01,
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
