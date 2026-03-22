// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const gameMocks = vi.hoisted(() => {
  const uiRender = vi.fn();
  const uiOnPlayAgain = vi.fn<(handler: () => void) => void>();
  const audioPlay = vi.fn();
  const orbitUpdate = vi.fn();
  const orbitSetPaused = vi.fn();
  const orbitSetRadius = vi.fn();
  const sceneResize = vi.fn();
  const sceneRender = vi.fn();
  const sceneSpawnDropBall = vi.fn();
  const sceneApplyCameraTuning = vi.fn();
  const sceneApplyGameplayTuning = vi.fn();
  const sceneResetRound = vi.fn();
  const sceneHasUnresolvedBalls = vi.fn(() => true);
  const sceneConsumeMissedBallCount = vi.fn(() => 0);
  const sceneConsumeBounceCount = vi.fn(() => 0);
  const sceneUpdate = vi.fn<
    () => Array<{
      ballId: number | null;
      jarIndex: number;
      isBonusJar: boolean;
      centerOffsetNormalized?: number;
    }>
  >(() => []);
  const physicsStep = vi.fn();
  const createDebugMenu = vi.fn();
  const installTestBridge = vi.fn();
  const scoring = vi.fn(() => ({ scoreDelta: 7, bonusTimeDelta: 0 }));

  let playAgainHandler: (() => void) | null = null;
  let inputHandler: (() => void) | null = null;
  let bridge: {
    dropBall: () => void;
    stepFrames: (frames: number) => void;
    restartRound?: () => void;
  } | null = null;
  let debugControls: {
    applyGameplayTuning: (key: string, value: number) => void;
  } | null = null;

  return {
    uiRender,
    uiOnPlayAgain,
    audioPlay,
    orbitUpdate,
    orbitSetPaused,
    orbitSetRadius,
    sceneResize,
    sceneRender,
    sceneSpawnDropBall,
    sceneApplyCameraTuning,
    sceneApplyGameplayTuning,
    sceneResetRound,
    sceneHasUnresolvedBalls,
    sceneConsumeMissedBallCount,
    sceneConsumeBounceCount,
    sceneUpdate,
    physicsStep,
    createDebugMenu,
    installTestBridge,
    scoring,
    setPlayAgainHandler: (handler: () => void): void => {
      playAgainHandler = handler;
    },
    getPlayAgainHandler: (): (() => void) => {
      if (!playAgainHandler) {
        throw new Error('Missing play again handler');
      }
      return playAgainHandler;
    },
    setInputHandler: (handler: () => void): void => {
      inputHandler = handler;
    },
    getInputHandler: (): (() => void) => {
      if (!inputHandler) {
        throw new Error('Missing input handler');
      }
      return inputHandler;
    },
    setBridge: (nextBridge: {
      dropBall: () => void;
      stepFrames: (frames: number) => void;
      restartRound?: () => void;
    }): void => {
      bridge = nextBridge;
    },
    getBridge: (): {
      dropBall: () => void;
      stepFrames: (frames: number) => void;
      restartRound?: () => void;
    } => {
      if (!bridge) {
        throw new Error('Missing test bridge');
      }
      return bridge;
    },
    setDebugControls: (controls: {
      applyGameplayTuning: (key: string, value: number) => void;
    }): void => {
      debugControls = controls;
    },
    getDebugControls: (): {
      applyGameplayTuning: (key: string, value: number) => void;
    } => {
      if (!debugControls) {
        throw new Error('Missing debug controls');
      }
      return debugControls;
    }
  };
});

vi.mock('../../src/scene/SceneRoot', () => ({
  SceneRoot: class {
    public readonly jars = [
      { position: { x: 0, z: 0 } },
      { position: { x: 0, z: 0 } }
    ];
    public readonly resize = gameMocks.sceneResize;
    public readonly render = gameMocks.sceneRender;
    public readonly spawnDropBall = gameMocks.sceneSpawnDropBall;
    public readonly applyCameraTuning = gameMocks.sceneApplyCameraTuning;
    public readonly applyGameplayTuning = gameMocks.sceneApplyGameplayTuning;
    public readonly update = gameMocks.sceneUpdate;
    public readonly consumeMissedBallCount =
      gameMocks.sceneConsumeMissedBallCount;
    public readonly consumeBounceCount = gameMocks.sceneConsumeBounceCount;
    public readonly hasUnresolvedBalls = gameMocks.sceneHasUnresolvedBalls;
    public readonly resetRound = gameMocks.sceneResetRound;
    public getRecommendedOrbitRadius(): number {
      return 2.86;
    }
  }
}));

vi.mock('../../src/systems/UISystem', () => ({
  UISystem: class {
    public constructor() {}

    public onPlayAgain(handler: () => void): void {
      gameMocks.uiOnPlayAgain(handler);
      gameMocks.setPlayAgainHandler(handler);
    }

    public render = gameMocks.uiRender;
  }
}));

vi.mock('../../src/systems/ScoringSystem', () => ({
  ScoringSystem: class {
    public onBallSettled(): { scoreDelta: number; bonusTimeDelta: number } {
      return gameMocks.scoring();
    }
  }
}));

vi.mock('../../src/systems/AudioSystem', () => ({
  AudioSystem: class {
    public play = gameMocks.audioPlay;
  }
}));

vi.mock('../../src/systems/OrbitSystem', () => ({
  OrbitSystem: class {
    public update = gameMocks.orbitUpdate;
    public setPaused = gameMocks.orbitSetPaused;
    public setRadius = gameMocks.orbitSetRadius;
    public togglePause(): boolean {
      return false;
    }
    public setBaseSpeed(): void {}
    public setSpeedMultiplier(): void {}
  }
}));

vi.mock('../../src/systems/InputSystem', () => ({
  InputSystem: class {
    public constructor(options: { onDrop: () => void }) {
      gameMocks.setInputHandler(options.onDrop);
    }
  }
}));

vi.mock('../../src/physics/PhysicsWorld', () => ({
  PhysicsWorld: {
    create: vi.fn(() =>
      Promise.resolve({
        step: gameMocks.physicsStep
      })
    )
  }
}));

vi.mock('../../src/ui/debugMenu', () => ({
  createDebugMenu: (
    host: HTMLElement,
    debugEnabled: boolean,
    controls: {
      applyGameplayTuning: (key: string, value: number) => void;
    }
  ) => {
    gameMocks.createDebugMenu(host, debugEnabled, controls);
    gameMocks.setDebugControls(controls);
  }
}));

vi.mock('../../src/testhooks/testBridge', () => ({
  installTestBridge: (bridge: {
    dropBall: () => void;
    stepFrames: (frames: number) => void;
    restartRound?: () => void;
  }) => {
    gameMocks.installTestBridge(bridge);
    gameMocks.setBridge(bridge);
  },
  normalizeStepFrameCount: (n: number) => Math.floor(n)
}));

describe('Game', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    window.history.pushState({}, '', '/');
    gameMocks.sceneHasUnresolvedBalls.mockReturnValue(true);
    gameMocks.sceneConsumeMissedBallCount.mockReturnValue(0);
    gameMocks.sceneConsumeBounceCount.mockReturnValue(0);
    gameMocks.sceneUpdate.mockImplementation(() => []);
  });

  it('creates debug menu based on URL flag', async () => {
    window.history.pushState({}, '', '/?debug=1');
    const { Game } = await import('../../src/game/Game');

    const host = document.createElement('div');
    new Game(host);

    expect(gameMocks.createDebugMenu).toHaveBeenCalledWith(
      host,
      true,
      expect.any(Object)
    );
  });

  it('keeps drop point linked to jar orbit radius', async () => {
    window.history.pushState({}, '', '/?debug=1');
    const { Game } = await import('../../src/game/Game');

    const game = new Game(document.createElement('div'));
    await game.init();

    gameMocks.sceneApplyGameplayTuning.mockClear();
    gameMocks.orbitSetRadius.mockClear();

    gameMocks.getDebugControls().applyGameplayTuning('dropPointX', 1.43);

    const linkedDropXCall = gameMocks.sceneApplyGameplayTuning.mock.calls
      .slice()
      .reverse()
      .find(([key]) => key === 'dropPointX');
    const linkedDropZCall = gameMocks.sceneApplyGameplayTuning.mock.calls
      .slice()
      .reverse()
      .find(([key]) => key === 'dropPointZ');

    expect(linkedDropXCall?.[1]).toBeCloseTo(1.279, 4);
    expect(linkedDropZCall?.[1]).toBeCloseTo(2.5581, 4);

    gameMocks.getDebugControls().applyGameplayTuning('ringRadius', 4);

    const relinkedDropXCall = gameMocks.sceneApplyGameplayTuning.mock.calls
      .slice()
      .reverse()
      .find(([key]) => key === 'dropPointX');
    const relinkedDropZCall = gameMocks.sceneApplyGameplayTuning.mock.calls
      .slice()
      .reverse()
      .find(([key]) => key === 'dropPointZ');

    expect(gameMocks.orbitSetRadius).toHaveBeenCalledWith(4);
    expect(relinkedDropXCall?.[1]).toBeCloseTo(1.7889, 4);
    expect(relinkedDropZCall?.[1]).toBeCloseTo(3.5777, 4);
  });

  it('initializes systems and reacts to drops and step bridge calls', async () => {
    const { Game } = await import('../../src/game/Game');
    const game = new Game(document.createElement('div'));

    await game.init();
    expect(gameMocks.installTestBridge).toHaveBeenCalledTimes(1);
    expect(gameMocks.uiRender).toHaveBeenCalled();

    gameMocks.getInputHandler()();
    expect(gameMocks.audioPlay).toHaveBeenCalledWith('drop');
    expect(gameMocks.sceneSpawnDropBall).toHaveBeenCalledTimes(1);

    const latestState = gameMocks.uiRender.mock.calls.at(-1)?.[0] as {
      score: number;
      ballsRemaining: number;
      ballsDropped: number;
    };
    expect(latestState.score).toBe(0);
    expect(latestState.ballsRemaining).toBe(49);
    expect(latestState.ballsDropped).toBe(1);

    gameMocks.getInputHandler()();

    gameMocks.getBridge().stepFrames(3);
    expect(gameMocks.orbitUpdate).toHaveBeenCalledTimes(3);
    expect(gameMocks.sceneUpdate).toHaveBeenCalledTimes(3);
    expect(gameMocks.physicsStep).toHaveBeenCalledTimes(3);
    expect(gameMocks.sceneRender).toHaveBeenCalledTimes(1);
  });

  it('applies scoring and misses while round is playing', async () => {
    const { Game } = await import('../../src/game/Game');
    const game = new Game(document.createElement('div'));

    await game.init();
    gameMocks.getInputHandler()();

    gameMocks.sceneUpdate.mockImplementationOnce(() => [
      {
        ballId: 1,
        jarIndex: 0,
        isBonusJar: true
      }
    ]);
    gameMocks.sceneConsumeBounceCount.mockReturnValueOnce(1);
    gameMocks.sceneConsumeMissedBallCount.mockReturnValueOnce(2);
    gameMocks.scoring.mockReturnValueOnce({ scoreDelta: 7, bonusTimeDelta: 0 });

    gameMocks.getBridge().stepFrames(1);

    const latestState = gameMocks.uiRender.mock.calls.at(-1)?.[0] as {
      score: number;
      timeRemaining: number;
      hits: number;
      misses: number;
    };
    expect(latestState.score).toBe(7);
    expect(latestState.timeRemaining).toBeLessThanOrEqual(30);
    expect(latestState.hits).toBe(1);
    expect(latestState.misses).toBe(2);
    expect(gameMocks.audioPlay).toHaveBeenCalledWith('ball-settled');
  });

  it('does not play the bounce sound for clean jar entry alone', async () => {
    const { Game } = await import('../../src/game/Game');
    const game = new Game(document.createElement('div'));

    await game.init();
    gameMocks.getInputHandler()();
    gameMocks.audioPlay.mockClear();

    gameMocks.sceneUpdate.mockImplementationOnce(() => [
      {
        ballId: 1,
        jarIndex: 0,
        isBonusJar: false
      }
    ]);
    gameMocks.sceneConsumeBounceCount.mockReturnValueOnce(0);

    gameMocks.getBridge().stepFrames(1);

    expect(gameMocks.audioPlay).not.toHaveBeenCalledWith('ball-settled');
  });

  it('ends round on timer expiry', async () => {
    const { Game } = await import('../../src/game/Game');
    const game = new Game(document.createElement('div'));

    await game.init();
    gameMocks.getBridge().stepFrames(1801);

    const latestState = gameMocks.uiRender.mock.calls.at(-1)?.[0] as {
      phase: string;
    };
    expect(latestState.phase).toBe('ended');
    expect(gameMocks.audioPlay).toHaveBeenCalledWith('game-over');
  });

  it('waits a few seconds before ending after balls are exhausted', async () => {
    const { Game } = await import('../../src/game/Game');
    const game = new Game(document.createElement('div'));

    await game.init();

    const bridge = gameMocks.getBridge();
    for (let index = 0; index < 49; index += 1) {
      bridge.dropBall();
      bridge.stepFrames(10);
    }

    bridge.dropBall();

    let latestState = gameMocks.uiRender.mock.calls.at(-1)?.[0] as {
      phase: string;
      ballsRemaining?: number;
    };
    expect(latestState.ballsRemaining).toBe(0);
    expect(latestState.phase).toBe('playing');

    bridge.stepFrames(179);
    latestState = gameMocks.uiRender.mock.calls.at(-1)?.[0] as {
      phase: string;
    };
    expect(latestState.phase).toBe('playing');

    bridge.stepFrames(2);
    latestState = gameMocks.uiRender.mock.calls.at(-1)?.[0] as {
      phase: string;
    };
    expect(latestState.phase).toBe('ended');
  });

  it('delays restart from play again handler until score reveal window passes', async () => {
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(1000);
    const { Game } = await import('../../src/game/Game');
    const game = new Game(document.createElement('div'));

    await game.init();

    gameMocks.getBridge().stepFrames(1801);
    gameMocks.sceneResetRound.mockClear();

    gameMocks.getPlayAgainHandler()();

    const endedState = gameMocks.uiRender.mock.calls.at(-1)?.[0] as {
      phase: string;
    };
    expect(gameMocks.sceneResetRound).not.toHaveBeenCalled();
    expect(endedState.phase).toBe('ended');

    nowSpy.mockReturnValue(4100);
    gameMocks.getPlayAgainHandler()();

    const restartedState = gameMocks.uiRender.mock.calls.at(-1)?.[0] as {
      phase: string;
      score: number;
      ballsRemaining: number;
      hits: number;
      misses: number;
    };

    expect(gameMocks.sceneResetRound).toHaveBeenCalledTimes(1);
    expect(restartedState.phase).toBe('playing');
    expect(restartedState.score).toBe(0);
    expect(restartedState.ballsRemaining).toBe(50);
    expect(restartedState.hits).toBe(0);
    expect(restartedState.misses).toBe(0);

    nowSpy.mockRestore();
  });

  it('substeps orbit and scene updates on long frames', async () => {
    const { Game } = await import('../../src/game/Game');
    const game = new Game(document.createElement('div'));

    let nextId = 0;
    const callbacks: Array<(now: number) => void> = [];

    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((cb: (now: number) => void) => {
        callbacks.push(cb);
        nextId += 1;
        return nextId;
      })
    );
    vi.stubGlobal('cancelAnimationFrame', vi.fn());
    vi.spyOn(performance, 'now').mockReturnValue(1000);

    game.start();
    callbacks[0]?.(1050);

    expect(gameMocks.orbitUpdate.mock.calls.length).toBeGreaterThan(1);
    expect(gameMocks.sceneUpdate.mock.calls.length).toBeGreaterThan(1);
    expect(gameMocks.orbitUpdate).toHaveBeenCalledTimes(
      gameMocks.sceneUpdate.mock.calls.length
    );
  });

  it('starts and destroys animation loop', async () => {
    const { Game } = await import('../../src/game/Game');
    const game = new Game(document.createElement('div'));

    let nextId = 0;
    const callbacks: Array<(now: number) => void> = [];

    const raf = vi.fn((cb: (now: number) => void) => {
      callbacks.push(cb);
      nextId += 1;
      return nextId;
    });
    const cancel = vi.fn();

    vi.stubGlobal('requestAnimationFrame', raf);
    vi.stubGlobal('cancelAnimationFrame', cancel);
    vi.spyOn(performance, 'now').mockReturnValue(1000);

    game.start();
    expect(raf).toHaveBeenCalledTimes(1);

    callbacks[0]?.(1020);
    expect(gameMocks.orbitUpdate).toHaveBeenCalled();

    game.destroy();
    expect(cancel).toHaveBeenCalled();
  });
});
