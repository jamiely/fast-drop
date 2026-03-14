import { gameConfig } from './config';
import { createInitialState, dropBallState, tickState } from './state';
import type { GameState } from './types';
import { PhysicsWorld } from '../physics/PhysicsWorld';
import { SceneRoot } from '../scene/SceneRoot';
import { AudioSystem } from '../systems/AudioSystem';
import { InputSystem } from '../systems/InputSystem';
import { OrbitSystem } from '../systems/OrbitSystem';
import { ScoringSystem } from '../systems/ScoringSystem';
import { UISystem } from '../systems/UISystem';
import { createDebugMenu } from '../ui/debugMenu';
import { installTestBridge } from '../testhooks/testBridge';

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

  public constructor(host: HTMLElement) {
    this.state = createInitialState();
    this.sceneRoot = new SceneRoot(host, gameConfig.jarCount);
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
      stepFrames: (frames: number) => {
        const dt = 1 / 60;
        for (let index = 0; index < frames; index += 1) {
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

  private dropBall(): void {
    const nextState = dropBallState(
      this.state,
      this.scoringSystem.getDropScore()
    );
    if (nextState === this.state) {
      return;
    }

    this.state = nextState;
    console.info('[Game] drop ball', {
      ballsRemaining: this.state.ballsRemaining,
      score: this.state.score
    });
    this.audioSystem.playDrop();
    this.uiSystem.render(this.state);
  }

  private step(dt: number): void {
    this.state = tickState(this.state, dt);
    this.orbitSystem.update(dt);
    this.physicsWorld?.step();
    this.uiSystem.render(this.state);
    this.sceneRoot.render();
  }
}
