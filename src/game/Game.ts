import { gameConfig } from './config';
import {
  applyBallSettledState,
  createInitialState,
  dropBallState,
  tickState
} from './state';
import type { BallSettledEvent, GameState } from './types';
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

  public constructor(host: HTMLElement) {
    this.state = createInitialState();
    this.sceneRoot = new SceneRoot(host, gameConfig.jarCount, gameConfig.orbitRadius);
    this.uiSystem = new UISystem(host);
    this.scoringSystem = new ScoringSystem();
    this.audioSystem = new AudioSystem();
    this.orbitSystem = new OrbitSystem(
      this.sceneRoot.jars,
      gameConfig.orbitRadius,
      gameConfig.ringAngularSpeed
    );
    this.debugEnabled =
      new URLSearchParams(window.location.search).get('debug') === '1';
    createDebugMenu(host, this.debugEnabled);
  }

  public async init(): Promise<void> {
    this.physicsWorld = await PhysicsWorld.create();

    this.uiSystem.onDrop(() => {
      this.dropBall();
    });
    new InputSystem(() => {
      this.dropBall();
    });

    window.addEventListener('resize', () => {
      this.sceneRoot.resize();
    });

    installTestBridge({
      dropBall: () => this.dropBall(),
      stepFrames: (n: number) => {
        const dt = 1 / 60;
        const frameCount = normalizeStepFrameCount(n);

        for (let index = 0; index < frameCount; index += 1) {
          this.step(dt);
        }
      }
    });

    this.uiSystem.render(this.state);
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

  private toBallSettledEvent(settlement: SceneBallSettlement): BallSettledEvent {
    return {
      jarIndex: settlement.jarIndex,
      isBonusJar: settlement.isBonusJar,
      ballId: settlement.ballId,
      settledAtSeconds: gameConfig.timeStartSeconds - this.state.timeRemaining
    };
  }

  private dropBall(): void {
    const nextState = dropBallState(this.state);

    if (nextState === this.state) {
      return;
    }

    this.state = nextState;
    console.info('[Game] drop ball', {
      ballsRemaining: this.state.ballsRemaining,
      score: this.state.score,
      timeRemaining: this.state.timeRemaining
    });

    this.audioSystem.play('drop');
    this.sceneRoot.spawnDropBall(0, gameConfig.orbitRadius, this.nextBallId);
    this.nextBallId += 1;
    this.uiSystem.render(this.state);
  }

  private step(dt: number): void {
    this.state = tickState(this.state, dt);
    this.orbitSystem.update(dt);

    const settlements = this.sceneRoot.update(dt);
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

    this.physicsWorld?.step();
    this.uiSystem.render(this.state);
    this.sceneRoot.render();
  }
}
