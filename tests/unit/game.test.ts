// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const gameMocks = vi.hoisted(() => {
  const uiRender = vi.fn();
  const uiOnDrop = vi.fn<(handler: () => void) => void>();
  const audioPlay = vi.fn();
  const orbitUpdate = vi.fn();
  const sceneResize = vi.fn();
  const sceneRender = vi.fn();
  const physicsStep = vi.fn();
  const createDebugMenu = vi.fn();
  const installTestBridge = vi.fn();
  const scoring = vi.fn(() => 7);

  let dropHandler: (() => void) | null = null;
  let inputHandler: (() => void) | null = null;
  let bridge: {
    dropBall: () => void;
    stepFrames: (frames: number) => void;
  } | null = null;

  return {
    uiRender,
    uiOnDrop,
    audioPlay,
    orbitUpdate,
    sceneResize,
    sceneRender,
    physicsStep,
    createDebugMenu,
    installTestBridge,
    scoring,
    setDropHandler: (handler: () => void): void => {
      dropHandler = handler;
    },
    getDropHandler: (): (() => void) => {
      if (!dropHandler) {
        throw new Error('Missing drop handler');
      }
      return dropHandler;
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
    }): void => {
      bridge = nextBridge;
    },
    getBridge: (): {
      dropBall: () => void;
      stepFrames: (frames: number) => void;
    } => {
      if (!bridge) {
        throw new Error('Missing test bridge');
      }
      return bridge;
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
  }
}));

vi.mock('../../src/systems/UISystem', () => ({
  UISystem: class {
    public constructor() {}

    public onDrop(handler: () => void): void {
      gameMocks.uiOnDrop(handler);
      gameMocks.setDropHandler(handler);
    }

    public render = gameMocks.uiRender;
  }
}));

vi.mock('../../src/systems/ScoringSystem', () => ({
  ScoringSystem: class {
    public getDropScore(): number {
      return gameMocks.scoring();
    }
  }
}));

vi.mock('../../src/systems/AudioSystem', () => ({
  AudioSystem: class {
    public playDrop = gameMocks.audioPlay;
  }
}));

vi.mock('../../src/systems/OrbitSystem', () => ({
  OrbitSystem: class {
    public update = gameMocks.orbitUpdate;
  }
}));

vi.mock('../../src/systems/InputSystem', () => ({
  InputSystem: class {
    public constructor(handler: () => void) {
      gameMocks.setInputHandler(handler);
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
  createDebugMenu: gameMocks.createDebugMenu
}));

vi.mock('../../src/testhooks/testBridge', () => ({
  installTestBridge: (bridge: {
    dropBall: () => void;
    stepFrames: (frames: number) => void;
  }) => {
    gameMocks.installTestBridge(bridge);
    gameMocks.setBridge(bridge);
  }
}));

describe('Game', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    window.history.pushState({}, '', '/');
  });

  it('creates debug menu based on URL flag', async () => {
    window.history.pushState({}, '', '/?debug=1');
    const { Game } = await import('../../src/game/Game');

    const host = document.createElement('div');
    new Game(host);

    expect(gameMocks.createDebugMenu).toHaveBeenCalledWith(host, true);
  });

  it('initializes systems and reacts to drops and step bridge calls', async () => {
    const { Game } = await import('../../src/game/Game');
    const game = new Game(document.createElement('div'));

    await game.init();
    expect(gameMocks.installTestBridge).toHaveBeenCalledTimes(1);
    expect(gameMocks.uiRender).toHaveBeenCalled();

    gameMocks.getDropHandler()();
    expect(gameMocks.audioPlay).toHaveBeenCalledTimes(1);

    const latestState = gameMocks.uiRender.mock.calls.at(-1)?.[0] as {
      score: number;
      ballsRemaining: number;
    };
    expect(latestState.score).toBe(7);
    expect(latestState.ballsRemaining).toBe(49);

    gameMocks.getInputHandler()();
    expect(gameMocks.audioPlay).toHaveBeenCalledTimes(2);

    gameMocks.getBridge().stepFrames(3);
    expect(gameMocks.orbitUpdate).toHaveBeenCalledTimes(3);
    expect(gameMocks.physicsStep).toHaveBeenCalledTimes(3);
    expect(gameMocks.sceneRender).toHaveBeenCalledTimes(3);
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
