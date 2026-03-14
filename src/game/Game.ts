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
import type { SceneBallSettlement } from '../scene/SceneRoot';
import { SceneRoot } from '../scene/SceneRoot';
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

export class Game {
  private readonly sceneRoot: SceneRoot;
  private readonly uiSystem: UISystem;
  private readonly scoringSystem: ScoringSystem;
  private readonly audioSystem: AudioSystem;
  private readonly orbitSystem: OrbitSystem;
  private readonly debugEnabled: boolean;
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
  private readonly runtimeConfig = createRuntimeConfig();

  public constructor(host: HTMLElement) {
    this.state = createInitialState();
    this.sceneRoot = new SceneRoot(
      host,
      this.runtimeConfig.jarCount,
      this.runtimeConfig.tuning.ringRadius,
      this.runtimeConfig.bonusBucketCount
    );
    this.uiSystem = new UISystem(host);
    this.scoringSystem = new ScoringSystem();
    this.audioSystem = new AudioSystem();
    this.orbitSystem = new OrbitSystem(
      this.sceneRoot.jars,
      this.runtimeConfig.tuning.ringRadius,
      this.runtimeConfig.tuning.ringAngularSpeed
    );
    this.debugEnabled =
      new URLSearchParams(window.location.search).get('debug') === '1';

    createDebugMenu(host, this.debugEnabled, {
      togglePause: () => {
        this.paused = this.orbitSystem.togglePause();
      },
      stepFrame: () => this.step(1 / 60),
      addTime: () => this.setTimeRemaining(this.state.timeRemaining + 3),
      addScore: () => this.setScore(this.state.score + 100),
      spawnBall: () => this.spawnBall(),
      setSpeedMultiplier: (multiplier) => this.setSpeedMultiplier(multiplier),
      applyGameplayTuning: (key, value) => this.applyGameplayTuning(key, value),
      applyCameraTuning: (key, value) => {
        this.runtimeConfig.camera[key] = value;
        this.sceneRoot.applyCameraTuning(this.runtimeConfig.camera);
      },
      savePreset: () => this.savePreset(),
      loadPreset: () => this.loadPreset()
    });
  }

  public async init(): Promise<void> {
    this.physicsWorld = await PhysicsWorld.create();

    this.sceneRoot.applyCameraTuning(this.runtimeConfig.camera);

    this.uiSystem.onDrop(() => {
      this.dropBall();
    });
    this.uiSystem.onPlayAgain(() => {
      this.startRound();
    });

    new InputSystem({
      onDrop: () => {
        this.dropBall();
      },
      onPlayAgain: () => {
        this.startRound();
      },
      isRoundEnded: () => this.state.phase === 'ended'
    });

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
      this.step(dt);
      this.rafId = requestAnimationFrame(loop);
    };

    this.rafId = requestAnimationFrame(loop);
  }

  public destroy(): void {
    cancelAnimationFrame(this.rafId);
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
      spawnBall: () => this.spawnBall()
    };
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

  private applyGameplayTuning(key: keyof GameplayTuning, value: number): void {
    this.runtimeConfig.tuning[key] = value;
    this.sceneRoot.applyGameplayTuning(key, value);

    if (key === 'ringAngularSpeed') {
      this.orbitSystem.setBaseSpeed(value);
    }

    if (key === 'ringRadius') {
      this.orbitSystem.setRadius(value);
    }
  }

  private savePreset(): void {
    if (!this.debugEnabled) {
      return;
    }

    const payload = JSON.stringify({
      tuning: this.runtimeConfig.tuning,
      camera: this.runtimeConfig.camera
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
    };

    for (const [key, value] of Object.entries(parsed.tuning ?? {})) {
      this.applyGameplayTuning(key as keyof GameplayTuning, Number(value));
    }

    Object.assign(this.runtimeConfig.camera, parsed.camera ?? {});
    this.sceneRoot.applyCameraTuning(this.runtimeConfig.camera);
  }

  private startRound(): void {
    this.state = startRoundState();
    this.nextBallId = 1;
    this.simulationTimeSeconds = 0;
    this.lastDropAtSeconds = null;
    this.hasPlayedWarning = false;
    this.paused = false;
    this.orbitSystem.setPaused(false);
    this.sceneRoot.resetRound();
    this.uiSystem.render(this.state);
  }

  private endRound(): void {
    const next = endRoundState(this.state);
    if (next === this.state) {
      return;
    }

    this.state = next;
    this.audioSystem.play('game-over');
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

    this.audioSystem.play('drop');
    this.spawnBall();

    if (this.state.ballsRemaining <= 0) {
      this.endRound();
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
    this.state = {
      ...this.state,
      ballsRemaining: Math.max(0, Math.floor(remaining))
    };
    this.uiSystem.render(this.state);
  }

  private setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(0, multiplier);
    this.orbitSystem.setSpeedMultiplier(this.speedMultiplier);
  }

  private step(dt: number, renderFrame = true): void {
    const simDt = this.paused ? 0 : dt * this.speedMultiplier;

    if (!this.paused) {
      if (this.state.phase === 'playing') {
        this.simulationTimeSeconds += simDt;
        this.state = tickState(this.state, simDt);
      }
      this.orbitSystem.update(dt);
    }

    const settlements = this.sceneRoot.update(simDt);
    if (this.state.phase === 'playing') {
      for (const settlement of settlements) {
        const scoringResult = this.scoringSystem.onBallSettled(
          this.toBallSettledEvent(settlement)
        );

        this.state = applyBallSettledState(
          this.state,
          scoringResult.scoreDelta,
          scoringResult.bonusTimeDelta
        );

        this.audioSystem.play('ball-settled');
        if (scoringResult.bonusTimeDelta > 0) {
          this.audioSystem.play('bonus-awarded');
        }
      }

      const missedCount = this.sceneRoot.consumeMissedBallCount();
      if (missedCount > 0) {
        this.state = applyMissState(this.state, missedCount);
      }

      if (this.state.timeRemaining <= 8 && !this.hasPlayedWarning) {
        this.audioSystem.play('time-warning');
        this.hasPlayedWarning = true;
      }

      if (this.state.timeRemaining <= 0 || this.state.ballsRemaining <= 0) {
        this.endRound();
      }
    }

    this.physicsWorld?.step();

    if (renderFrame) {
      this.uiSystem.render(this.state);
      this.sceneRoot.render();
    }
  }
}
