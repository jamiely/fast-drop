import { Vector3 } from 'three';
import { EDITION, silentJuice } from '../edition';
import type { JuiceSink } from '../juice/types';
import type { AttractMode } from '../juice/attract';
import { BALL_RADIUS } from '../entities/Ball';
import { JAR_HEIGHT } from '../entities/Jar';
import {
  createRuntimeConfig,
  gameConfig,
  type CameraTuning,
  type GameplayTuning
} from './config';
import {
  applyBallSettledState,
  applyMissState,
  canDropBall,
  createInitialState,
  dropBallState,
  endRoundState,
  startRoundState,
  tickState
} from './state';
import type { BallSettledEvent, GameState, TestBridgeContract } from './types';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import type {
  SceneBallSettlement,
  SceneRendererConfig
} from '../scene/SceneRoot';
import { SceneRoot } from '../scene/SceneRoot';
import type { LightPropertyKey, LightType } from '../scene/lighting';
import { AudioSystem } from '../systems/AudioSystem';
import { InputSystem } from '../systems/InputSystem';
import { OrbitSystem } from '../systems/OrbitSystem';
import { ScoringSystem } from '../systems/ScoringSystem';
import { UISystem } from '../systems/UISystem';
import {
  normalizeStepFrameCount,
  installTestBridge
} from '../testhooks/testBridge';
import { createDebugMenu } from '../ui/debugMenu';

const DEV_PRESET_STORAGE_KEY = 'fast-drop-debug-preset';
const BALLS_EXHAUSTED_END_DELAY_SECONDS = 3;
const MAX_SIMULATION_SUBSTEP_SECONDS = 1 / 60;
const GAME_OVER_RESTART_LOCK_MS = 3000;
const MOBILE_SLOW_FPS_THRESHOLD = 48;
const MOBILE_RECOVERY_FPS_THRESHOLD = 56;
const MOBILE_QUALITY_DOWNGRADE_SECONDS = 1.2;
const MOBILE_QUALITY_UPGRADE_SECONDS = 5;

type PerformanceQualityTier = 'balanced' | 'low';

export class Game {
  private readonly sceneRoot: SceneRoot;
  private readonly uiSystem: UISystem;
  private readonly scoringSystem: ScoringSystem;
  private readonly audioSystem: AudioSystem;
  private readonly orbitSystem: OrbitSystem;
  private readonly urlParams = new URLSearchParams(window.location.search);
  private readonly debugEnabled = this.urlParams.get('debug') === '1';
  private readonly mobileDevice = this.detectMobileDevice();
  private readonly explicitEffectsParam =
    this.urlParams.get('effects') ?? this.urlParams.get('fx');
  private readonly shaderEffectsEnabled =
    this.explicitEffectsParam === null
      ? !this.mobileDevice
      : this.explicitEffectsParam !== '0';
  private readonly autoMobileQualityEnabled =
    this.mobileDevice &&
    this.urlParams.get('mobileQuality') !== '0' &&
    this.urlParams.get('mq') !== '0';
  private state: GameState;
  private physicsWorld: PhysicsWorld | null = null;
  private rafId = 0;
  private lastTime = 0;
  private nextBallId = 1;
  private speedMultiplier = 1;
  private paused = false;
  private hasPlayedWarning = false;
  private simulationTimeSeconds = 0;
  private lastDropAtSeconds: number | null = null;
  private ballsExhaustedAtSeconds: number | null = null;
  private roundEndedAtMs: number | null = null;
  private readonly runtimeConfig = createRuntimeConfig();
  private performanceQualityTier: PerformanceQualityTier = 'balanced';
  private smoothedFrameMs = 16.67;
  private lowFpsDurationSeconds = 0;
  private highFpsDurationSeconds = 0;
  private juice: JuiceSink = silentJuice;
  private attract: AttractMode | null = null;
  private readonly onAttractActivity = (): void => this.attract?.activity();
  private readonly pendingMissPositions: Array<Vector3 | undefined> = [];

  public constructor(private readonly host: HTMLElement) {
    this.state = createInitialState();

    const rendererConfig = this.getRendererConfig();
    this.sceneRoot = new SceneRoot(
      host,
      this.runtimeConfig.jarCount,
      this.runtimeConfig.tuning.ringRadius,
      this.runtimeConfig.bonusBucketCount,
      this.debugEnabled,
      this.shaderEffectsEnabled,
      rendererConfig
    );
    this.uiSystem = new UISystem(host);
    this.scoringSystem = new ScoringSystem();
    this.audioSystem = new AudioSystem();
    this.orbitSystem = new OrbitSystem(
      this.sceneRoot.jars,
      this.runtimeConfig.tuning.ringRadius,
      this.runtimeConfig.tuning.ringAngularSpeed
    );

    for (const [key, value] of Object.entries(this.runtimeConfig.tuning)) {
      this.applyGameplayTuning(key as keyof GameplayTuning, Number(value));
    }

    if (this.autoMobileQualityEnabled) {
      this.applyPerformanceQualityTier('balanced');
    }

    this.syncStatusDisplayFromState();

    createDebugMenu(host, this.debugEnabled, {
      togglePause: () => {
        this.paused = this.orbitSystem.togglePause();
      },
      stepFrame: () => this.step(1 / 60),
      addTime: () => this.setTimeRemaining(this.state.timeRemaining + 3),
      addScore: () => this.setScore(this.state.score + 100),
      forceTimerZero: () => this.setTimeRemaining(0),
      spawnBall: () => this.spawnBall(),
      forceGameOver: () => this.forceGameOver(),
      forcePerfectGameOver: () => this.forcePerfectGameOver(),
      setSpeedMultiplier: (multiplier) => this.setSpeedMultiplier(multiplier),
      applyGameplayTuning: (key, value) => this.applyGameplayTuning(key, value),
      applyCameraTuning: (key, value) => {
        this.runtimeConfig.camera[key] = value;
        this.sceneRoot.applyCameraTuning(this.runtimeConfig.camera);
      },
      getLightSnapshot: () => this.sceneRoot.getLightSnapshot(),
      applyLightValue: (id, key, value) =>
        this.sceneRoot.updateLightValue(id, key, value),
      addLight: (type) => this.sceneRoot.addDebugLight(type),
      setSelectedLight: (id) => this.sceneRoot.setSelectedDebugLight(id),
      savePreset: () => this.savePreset(),
      loadPreset: () => this.loadPreset()
    });
  }

  public async init(): Promise<void> {
    this.physicsWorld = await PhysicsWorld.create();

    if (EDITION === 'fever') {
      const { createFeverSink } = await import('../juice/fever');
      const { AttractMode } = await import('../juice/attract');
      this.attract = new AttractMode();
      for (const event of ['keydown', 'pointerdown', 'touchstart']) {
        window.addEventListener(event, this.onAttractActivity, {
          capture: true
        });
      }
      this.juice = createFeverSink(
        this.host,
        this.sceneRoot,
        this.runtimeConfig.ballsTotal
      );
      this.juice.setQuality(this.performanceQualityTier);
      this.sceneRoot.onRimBounce = (position) =>
        this.juice.emit('rim-bounce', 2, position);
      this.sceneRoot.onMiss = (position) =>
        this.pendingMissPositions.push(position?.clone());
    }

    this.sceneRoot.applyCameraTuning(this.runtimeConfig.camera);

    this.uiSystem.onPlayAgain(() => {
      this.tryRestartRoundFromGameOver();
    });

    new InputSystem({
      onDrop: () => {
        if (EDITION === 'fever' && this.attract?.input()) {
          this.startRound();
          return;
        }
        this.dropBall();
      },
      preferPointerEvents: EDITION === 'fever',
      onPlayAgain: () => {
        this.tryRestartRoundFromGameOver();
      },
      isRoundEnded: () => this.state.phase === 'ended'
    });

    if (this.debugEnabled) {
      window.addEventListener(
        'wheel',
        (event) => {
          if (event.ctrlKey || event.metaKey) {
            return;
          }

          if (event.target instanceof Element) {
            const interactive = event.target.closest(
              'button, input, select, textarea, label, a, [role="button"], .debug-menu, .summary-overlay'
            );
            if (interactive) {
              return;
            }
          }

          event.preventDefault();
          this.applyDebugZoomDelta(event.deltaY);
        },
        { passive: false }
      );
    }

    window.addEventListener('resize', () => {
      this.sceneRoot.resize();
    });

    installTestBridge(this.createTestBridge());

    this.startRound();
  }

  public start(): void {
    this.lastTime = performance.now();
    const loop = (now: number): void => {
      const dt = Math.min(0.05, (now - this.lastTime) / 1000);
      this.lastTime = now;
      this.updateAdaptiveMobileQuality(dt);
      this.step(dt);
      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  public destroy(): void {
    cancelAnimationFrame(this.rafId);
    this.juice.destroy();
    if (EDITION === 'fever') {
      for (const event of ['keydown', 'pointerdown', 'touchstart']) {
        window.removeEventListener(event, this.onAttractActivity, {
          capture: true
        });
      }
    }
  }

  private createTestBridge(): TestBridgeContract {
    return {
      dropBall: () => this.dropBall(),
      stepFrames: (n: number) => {
        const dt = 1 / 60;
        const frameCount = normalizeStepFrameCount(n);

        for (let index = 0; index < frameCount; index += 1) {
          this.step(dt, false);
        }

        this.uiSystem.render(this.state);
        this.sceneRoot.render();
      },
      restartRound: () => this.startRound(),
      setTimeRemaining: (seconds: number) => this.setTimeRemaining(seconds),
      setScore: (score: number) => this.setScore(score),
      setBallsRemaining: (remaining: number) =>
        this.setBallsRemaining(remaining),
      setSpeedMultiplier: (multiplier: number) =>
        this.setSpeedMultiplier(multiplier),
      togglePause: () => {
        this.paused = this.orbitSystem.togglePause();
      },
      spawnBall: () => this.spawnBall(),
      getFraming: () => this.sceneRoot.getFraming(),
      ...(EDITION === 'fever'
        ? {
            getJuiceState: () => this.juice.getState(),
            getAttractState: () => this.attract!.getState(),
            startAttract: () => this.startAttract(),
            getJuiceStats: () => this.juice.getStats(),
            setQualityTier: (tier: PerformanceQualityTier) =>
              this.applyPerformanceQualityTier(tier),
            getGameState: () => ({ ...this.state }),
            scriptJarHit: (jarIndex = 0, isBonusJar = false) => {
              if (!this.sceneRoot.jars[jarIndex]) return;
              this.processSceneSettlements([
                {
                  jarIndex,
                  isBonusJar,
                  ballId: null,
                  centerOffsetNormalized: 0
                }
              ]);
            }
          }
        : {})
    };
  }

  private detectMobileDevice(): boolean {
    const agent = navigator.userAgent || '';
    const mobilePattern = /Android|iPhone|iPad|iPod|Mobi|Mobile/i;
    return mobilePattern.test(agent);
  }

  private getRendererConfig(): SceneRendererConfig {
    if (!this.mobileDevice) {
      return {
        antialias: true,
        pixelRatioCap: 2,
        powerPreference: 'high-performance'
      };
    }

    return {
      antialias: false,
      pixelRatioCap: this.autoMobileQualityEnabled ? 1.2 : 1.3,
      powerPreference: 'high-performance'
    };
  }

  private applyPerformanceQualityTier(tier: PerformanceQualityTier): void {
    this.performanceQualityTier = tier;
    this.juice.setQuality(tier);

    if (tier === 'low') {
      this.sceneRoot.setRenderPixelRatioCap(1);
      this.applyGameplayTuning('outerRingLedEnabled', 0);
      this.applyGameplayTuning('outerRingLedHeadCount', 2);
      this.applyGameplayTuning('outerRingLedTrail', 0.3);
      this.applyGameplayTuning('outerRingLedReverseChance', 0.08);
      this.applyGameplayTuning('dropCooldownMs', 210);
      return;
    }

    this.sceneRoot.setRenderPixelRatioCap(1.2);
    this.applyGameplayTuning('outerRingLedEnabled', 1);
    this.applyGameplayTuning('outerRingLedHeadCount', 3);
    this.applyGameplayTuning('outerRingLedTrail', 0.45);
    this.applyGameplayTuning('outerRingLedReverseChance', 0.14);
    this.applyGameplayTuning('dropCooldownMs', 185);
  }

  private updateAdaptiveMobileQuality(frameDtSeconds: number): void {
    if (!this.autoMobileQualityEnabled) {
      return;
    }

    const frameMs = frameDtSeconds * 1000;
    this.smoothedFrameMs = this.smoothedFrameMs * 0.92 + frameMs * 0.08;
    const fps = 1000 / Math.max(0.001, this.smoothedFrameMs);

    if (fps <= MOBILE_SLOW_FPS_THRESHOLD) {
      this.lowFpsDurationSeconds += frameDtSeconds;
      this.highFpsDurationSeconds = Math.max(
        0,
        this.highFpsDurationSeconds - frameDtSeconds * 0.5
      );
    } else if (fps >= MOBILE_RECOVERY_FPS_THRESHOLD) {
      this.highFpsDurationSeconds += frameDtSeconds;
      this.lowFpsDurationSeconds = Math.max(
        0,
        this.lowFpsDurationSeconds - frameDtSeconds
      );
    } else {
      this.lowFpsDurationSeconds = Math.max(
        0,
        this.lowFpsDurationSeconds - frameDtSeconds * 0.25
      );
      this.highFpsDurationSeconds = Math.max(
        0,
        this.highFpsDurationSeconds - frameDtSeconds * 0.5
      );
    }

    if (
      this.performanceQualityTier !== 'low' &&
      this.lowFpsDurationSeconds >= MOBILE_QUALITY_DOWNGRADE_SECONDS
    ) {
      this.applyPerformanceQualityTier('low');
      this.lowFpsDurationSeconds = 0;
      this.highFpsDurationSeconds = 0;
      return;
    }

    if (
      this.performanceQualityTier !== 'balanced' &&
      this.highFpsDurationSeconds >= MOBILE_QUALITY_UPGRADE_SECONDS
    ) {
      this.applyPerformanceQualityTier('balanced');
      this.lowFpsDurationSeconds = 0;
      this.highFpsDurationSeconds = 0;
    }
  }

  private toBallSettledEvent(
    settlement: SceneBallSettlement
  ): BallSettledEvent {
    return {
      jarIndex: settlement.jarIndex,
      isBonusJar: settlement.isBonusJar,
      ballId: settlement.ballId,
      settledAtSeconds: gameConfig.timeStartSeconds - this.state.timeRemaining,
      centerOffsetNormalized: settlement.centerOffsetNormalized
    };
  }

  private syncStatusDisplayFromState(): void {
    const sceneRoot = this.sceneRoot as SceneRoot & {
      setStatusDisplayState?: (
        timeRemaining: number,
        timeTotal: number,
        ballsRemaining: number,
        ballsTotal: number,
        roundEnded: boolean,
        score: number,
        ballsEntered: number
      ) => void;
    };

    sceneRoot.setStatusDisplayState?.(
      this.state.timeRemaining,
      this.runtimeConfig.timeStartSeconds,
      this.state.ballsRemaining,
      this.runtimeConfig.ballsTotal,
      this.state.phase === 'ended',
      this.state.score,
      this.state.hits
    );
  }

  private applyGameplayTuning(key: keyof GameplayTuning, value: number): void {
    const applyDropPointToRing = (): void => {
      const linkedDropPoint = this.projectDropPointToRing(
        this.runtimeConfig.tuning.dropPointX,
        this.runtimeConfig.tuning.dropPointZ
      );
      this.runtimeConfig.tuning.dropPointX = linkedDropPoint.x;
      this.runtimeConfig.tuning.dropPointZ = linkedDropPoint.z;
      this.sceneRoot.applyGameplayTuning('dropPointX', linkedDropPoint.x);
      this.sceneRoot.applyGameplayTuning('dropPointZ', linkedDropPoint.z);
    };

    this.runtimeConfig.tuning[key] = value;
    this.sceneRoot.applyGameplayTuning(key, value);

    if (key === 'ringAngularSpeed') {
      this.orbitSystem.setBaseSpeed(value);
    }

    if (key === 'ringRadius') {
      this.orbitSystem.setRadius(value);
      applyDropPointToRing();
      return;
    }

    if (key === 'dropPointX' || key === 'dropPointZ') {
      applyDropPointToRing();
      return;
    }

    if (
      key === 'platformArmLengthScale' ||
      key === 'centerDomeDiameterScale' ||
      key === 'jarDiameterScale'
    ) {
      const nextOrbitRadius = this.sceneRoot.getRecommendedOrbitRadius();
      this.runtimeConfig.tuning.ringRadius = nextOrbitRadius;
      this.sceneRoot.applyGameplayTuning('ringRadius', nextOrbitRadius);
      this.orbitSystem.setRadius(nextOrbitRadius);
      applyDropPointToRing();
    }
  }

  private projectDropPointToRing(
    x: number,
    z: number
  ): { x: number; z: number } {
    const radius = Math.max(0.5, this.runtimeConfig.tuning.ringRadius);
    const length = Math.hypot(x, z);

    if (length <= 0.0001) {
      return { x: 0, z: radius };
    }

    const scale = radius / length;
    return {
      x: x * scale,
      z: z * scale
    };
  }

  private savePreset(): void {
    if (!this.debugEnabled) {
      return;
    }

    const payload = JSON.stringify({
      tuning: this.runtimeConfig.tuning,
      camera: this.runtimeConfig.camera,
      lights: this.sceneRoot.getLightSnapshot()
    });
    localStorage.setItem(DEV_PRESET_STORAGE_KEY, payload);
  }

  private loadPreset(): void {
    if (!this.debugEnabled) {
      return;
    }

    const payload = localStorage.getItem(DEV_PRESET_STORAGE_KEY);
    if (!payload) {
      return;
    }

    const parsed = JSON.parse(payload) as {
      tuning?: Partial<GameplayTuning>;
      camera?: Partial<CameraTuning>;
      lights?: Array<{
        id?: string;
        type?: LightType;
        enabled?: boolean;
        color?: string;
        groundColor?: string;
        intensity?: number;
        x?: number;
        y?: number;
        z?: number;
        targetX?: number;
        targetY?: number;
        targetZ?: number;
        distance?: number;
        decay?: number;
        angle?: number;
        penumbra?: number;
      }>;
    };

    for (const [key, value] of Object.entries(parsed.tuning ?? {})) {
      this.applyGameplayTuning(key as keyof GameplayTuning, Number(value));
    }

    for (const light of parsed.lights ?? []) {
      if (!light.id) {
        continue;
      }

      const lightId = light.id;
      const applyValue = (
        key: LightPropertyKey,
        value: number | string | boolean | undefined
      ): void => {
        if (value === undefined) {
          return;
        }

        this.sceneRoot.updateLightValue(lightId, key, value);
      };

      applyValue('type', light.type);
      applyValue('enabled', light.enabled);
      applyValue('color', light.color);
      applyValue('groundColor', light.groundColor);
      applyValue('intensity', light.intensity);
      applyValue('x', light.x);
      applyValue('y', light.y);
      applyValue('z', light.z);
      applyValue('targetX', light.targetX);
      applyValue('targetY', light.targetY);
      applyValue('targetZ', light.targetZ);
      applyValue('distance', light.distance);
      applyValue('decay', light.decay);
      applyValue('angle', light.angle);
      applyValue('penumbra', light.penumbra);
    }

    Object.assign(this.runtimeConfig.camera, parsed.camera ?? {});
    this.sceneRoot.applyCameraTuning(this.runtimeConfig.camera);
  }

  private startRound(demo = false): void {
    if (EDITION === 'fever') {
      if (!demo) this.attract?.resetRound();
      this.juice.setAttract?.(demo);
    }
    this.state = startRoundState();
    this.nextBallId = 1;
    this.simulationTimeSeconds = 0;
    this.lastDropAtSeconds = null;
    this.ballsExhaustedAtSeconds = null;
    this.roundEndedAtMs = null;
    this.hasPlayedWarning = false;
    this.paused = false;
    this.lowFpsDurationSeconds = 0;
    this.highFpsDurationSeconds = 0;
    this.smoothedFrameMs = 16.67;
    this.orbitSystem.setPaused(false);
    this.sceneRoot.resetRound();
    this.juice.reset();
    this.pendingMissPositions.length = 0;
    if (
      this.autoMobileQualityEnabled &&
      this.performanceQualityTier !== 'balanced'
    ) {
      this.applyPerformanceQualityTier('balanced');
    }
    this.syncStatusDisplayFromState();
    this.uiSystem.render(this.state);
  }

  private canRestartRoundFromGameOver(): boolean {
    if (this.state.phase !== 'ended' || this.roundEndedAtMs === null) {
      return false;
    }

    return performance.now() - this.roundEndedAtMs >= GAME_OVER_RESTART_LOCK_MS;
  }

  private startAttract(alreadyStarted = false): void {
    if (this.state.phase !== 'ended') return;
    if (!alreadyStarted && !this.attract?.start()) return;
    // Reuse the real reset/physics/scoring path; there is no score persistence in Game.
    this.startRound(true);
  }

  private tryRestartRoundFromGameOver(): void {
    if (EDITION === 'fever' && this.attract?.input()) {
      this.startRound();
      return;
    }
    if (!this.canRestartRoundFromGameOver()) {
      if (EDITION === 'fever') this.juice.skipFinale?.();
      return;
    }

    this.startRound();
  }

  private endRound(): void {
    const next = endRoundState(this.state);
    if (next === this.state) {
      return;
    }

    this.state = next;
    this.roundEndedAtMs = performance.now();
    this.playAudio('game-over');
    if (EDITION === 'fever') {
      this.attract?.endRound();
      this.juice.setAttract?.(false);
    }
    if (EDITION === 'fever')
      this.juice.finishRound?.(this.state.score, this.state.hits);
    this.juice.emit('round-end', this.state.score >= 500 ? 5 : 3);
  }

  private forceGameOver(): void {
    this.endRound();
    this.ballsExhaustedAtSeconds = null;
    this.syncStatusDisplayFromState();
    this.uiSystem.render(this.state);
  }

  private forcePerfectGameOver(): void {
    const totalBalls = Math.max(0, Math.floor(this.runtimeConfig.ballsTotal));
    this.state = {
      ...this.state,
      phase: 'ended',
      score: totalBalls * 10,
      ballsRemaining: 0,
      ballsDropped: totalBalls,
      hits: totalBalls,
      misses: 0,
      timeRemaining: Math.max(0, this.state.timeRemaining)
    };
    this.ballsExhaustedAtSeconds = null;
    this.roundEndedAtMs = performance.now();
    this.sceneRoot.resetRound();
    this.playAudio('game-over');
    if (EDITION === 'fever') {
      this.attract?.endRound();
      this.juice.setAttract?.(false);
    }
    this.syncStatusDisplayFromState();
    this.uiSystem.render(this.state);
  }

  private dropBall(): void {
    if (
      !canDropBall(this.state, {
        simulationTimeSeconds: this.simulationTimeSeconds,
        lastDropAtSeconds: this.lastDropAtSeconds,
        dropCooldownMs: this.runtimeConfig.tuning.dropCooldownMs
      })
    ) {
      return;
    }

    const nextState = dropBallState(this.state);
    if (nextState === this.state) {
      return;
    }

    this.state = nextState;
    this.lastDropAtSeconds = this.simulationTimeSeconds;

    this.playAudio('drop');
    this.spawnBall();
    if (EDITION === 'fever') {
      const position = new Vector3(
        this.runtimeConfig.tuning.dropPointX,
        this.runtimeConfig.tuning.dropHeight,
        this.runtimeConfig.tuning.dropPointZ
      );
      this.juice.emit('drop', 1, position);
      if (this.state.ballsRemaining === 0)
        this.juice.emit('last-ball', 3, position);
    }

    if (
      this.state.ballsRemaining <= 0 &&
      this.ballsExhaustedAtSeconds === null
    ) {
      this.ballsExhaustedAtSeconds = this.simulationTimeSeconds;
    }

    this.uiSystem.render(this.state);
  }

  private spawnBall(): void {
    this.sceneRoot.spawnDropBall(
      this.runtimeConfig.tuning.dropPointX,
      this.runtimeConfig.tuning.dropPointZ,
      this.nextBallId
    );
    this.nextBallId += 1;
  }

  private setTimeRemaining(seconds: number): void {
    this.state = {
      ...this.state,
      timeRemaining: Math.max(0, seconds)
    };
    this.syncStatusDisplayFromState();
    this.uiSystem.render(this.state);
  }

  private setScore(score: number): void {
    this.state = {
      ...this.state,
      score: Math.max(0, Math.floor(score))
    };
    this.uiSystem.render(this.state);
  }

  private setBallsRemaining(remaining: number): void {
    const nextRemaining = Math.max(0, Math.floor(remaining));
    this.state = {
      ...this.state,
      ballsRemaining: nextRemaining
    };

    if (nextRemaining <= 0) {
      this.ballsExhaustedAtSeconds ??= this.simulationTimeSeconds;
    } else {
      this.ballsExhaustedAtSeconds = null;
    }

    this.syncStatusDisplayFromState();
    this.uiSystem.render(this.state);
  }

  private setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(0, multiplier);
    this.orbitSystem.setSpeedMultiplier(this.speedMultiplier);
  }

  private applyDebugZoomDelta(deltaY: number): void {
    const delta = Math.sign(deltaY) * 0.2;
    const nextDistance = Math.max(
      3.6,
      Math.min(16, this.runtimeConfig.camera.distance + delta)
    );

    if (Math.abs(nextDistance - this.runtimeConfig.camera.distance) <= 0.001) {
      return;
    }

    this.runtimeConfig.camera.distance = nextDistance;
    this.sceneRoot.applyCameraTuning(this.runtimeConfig.camera);
  }

  private processSceneSettlements(settlements: SceneBallSettlement[]): void {
    if (this.state.phase !== 'playing') {
      return;
    }

    for (const settlement of settlements) {
      if (EDITION === 'fever') {
        const position =
          this.sceneRoot.jars[settlement.jarIndex].position.clone();
        position.y += 0.5;
        const combo = this.juice.getState()!.combo;
        this.juice.emit('jar-hit', Math.min(4, 2 + combo / 5), position);
        if (settlement.isBonusJar) this.juice.emit('bonus-jar', 4, position);
      }
      const scoringResult = this.scoringSystem.onBallSettled(
        this.toBallSettledEvent(settlement),
        this.juice.getState()?.multiplier ?? 1
      );

      this.state = applyBallSettledState(
        this.state,
        scoringResult.scoreDelta,
        scoringResult.bonusTimeDelta
      );
    }

    const bounceCount = this.sceneRoot.consumeBounceCount();
    if (bounceCount > 0) {
      this.playAudio('ball-settled');
    }

    const missedCount = this.sceneRoot.consumeMissedBallCount();
    if (missedCount > 0) {
      this.state = applyMissState(this.state, missedCount);
      for (let i = 0; i < missedCount; i += 1)
        this.juice.emit('miss', 1, this.pendingMissPositions.shift());
    }

    if (this.state.timeRemaining <= 8 && !this.hasPlayedWarning) {
      this.playAudio('time-warning');
      this.juice.emit('time-warning', 2);
      this.hasPlayedWarning = true;
    }

    if (
      this.state.ballsRemaining <= 0 &&
      this.ballsExhaustedAtSeconds === null
    ) {
      this.ballsExhaustedAtSeconds = this.simulationTimeSeconds;
    }

    if (this.state.ballsRemaining > 0) {
      this.ballsExhaustedAtSeconds = null;
    }

    if (this.state.timeRemaining <= 0) {
      this.endRound();
    } else if (
      this.state.ballsRemaining <= 0 &&
      this.ballsExhaustedAtSeconds !== null &&
      this.simulationTimeSeconds - this.ballsExhaustedAtSeconds >=
        BALLS_EXHAUSTED_END_DELAY_SECONDS
    ) {
      this.endRound();
    }
  }

  private playAudio(event: Parameters<AudioSystem['play']>[0]): void {
    // Fever supplies all demo cues through its quieter master bus, not classic's bus.
    if (EDITION === 'fever' && this.attract?.getState().phase === 'attract')
      return;
    this.audioSystem.play(event);
  }

  private step(dt: number, renderFrame = true): void {
    if (EDITION === 'fever' && this.attract?.update(dt))
      this.startAttract(true);
    this.juice.update(
      this.paused ? 0 : dt,
      this.state.ballsRemaining,
      this.state.score
    );
    const simDt = this.paused
      ? 0
      : dt * this.speedMultiplier * this.juice.timeScale();
    const settlements: SceneBallSettlement[] = [];

    if (
      EDITION === 'fever' &&
      !this.paused &&
      this.attract?.shouldDrop(
        this.sceneRoot.jars.map((jar) =>
          Math.atan2(jar.position.z, jar.position.x)
        ),
        -this.runtimeConfig.tuning.ringAngularSpeed *
          (this.juice.getState()?.orbitScale ?? 1),
        Math.atan2(
          this.runtimeConfig.tuning.dropPointZ,
          this.runtimeConfig.tuning.dropPointX
        ),
        this.runtimeConfig.tuning.dropHeight,
        JAR_HEIGHT * this.runtimeConfig.tuning.jarHeightScale +
          BALL_RADIUS * this.runtimeConfig.tuning.ballSizeScale,
        simDt
      ) &&
      canDropBall(this.state, {
        simulationTimeSeconds: this.simulationTimeSeconds,
        lastDropAtSeconds: this.lastDropAtSeconds,
        dropCooldownMs: this.runtimeConfig.tuning.dropCooldownMs
      })
    ) {
      this.dropBall();
      this.attract.dropped();
    }

    if (!this.paused) {
      let remainingOrbitDt =
        dt * this.juice.timeScale() * (this.juice.getState()?.orbitScale ?? 1);
      while (remainingOrbitDt > 0) {
        const orbitStepDt = Math.min(
          MAX_SIMULATION_SUBSTEP_SECONDS,
          remainingOrbitDt
        );
        this.orbitSystem.update(orbitStepDt);
        remainingOrbitDt -= orbitStepDt;
      }

      if (simDt > 0) {
        let remainingSimDt = simDt;
        while (remainingSimDt > 0) {
          const simulationStepDt = Math.min(
            MAX_SIMULATION_SUBSTEP_SECONDS,
            remainingSimDt
          );

          if (this.state.phase === 'playing') {
            this.simulationTimeSeconds += simulationStepDt;
            this.state = tickState(this.state, simulationStepDt);
          }

          settlements.push(...this.sceneRoot.update(simulationStepDt));
          remainingSimDt -= simulationStepDt;
        }
      } else {
        settlements.push(...this.sceneRoot.update(0));
      }
    } else {
      settlements.push(...this.sceneRoot.update(0));
    }

    this.processSceneSettlements(settlements);

    this.physicsWorld?.step();
    this.syncStatusDisplayFromState();

    if (renderFrame) {
      this.uiSystem.render(this.state);
      this.sceneRoot.render();
    }
  }
}
