// @vitest-environment jsdom
import { expect, it, vi } from 'vitest';
import { Group, PerspectiveCamera } from 'three';
import type { SceneRoot } from '../../src/scene/SceneRoot';
import { createFeverSink } from '../../src/juice/fever';

const { effect, screenState } = vi.hoisted(() => ({
  screenState: vi.fn(),
  effect: class {
    constructor() {
      return new Proxy(this, {
        get: (_, key) => (key === 'root' ? undefined : () => undefined)
      });
    }
  }
}));
vi.mock('../../src/juice/board', async () => {
  const { Group } = await import('three');
  return {
    FeverBoard: class {
      root = new Group();
      anchor(_where: string, out: import('three').Vector3) {
        return out;
      }
      hit() {}
      screenCelebrate() {}
      screenFeedback() {}
      screenState = screenState;
      setScore() {}
      setTime() {}
      setBalls() {}
      update() {}
      damagePoint() {
        return null;
      }
    }
  };
});
vi.mock('../../src/juice/machinery', async () => {
  const { Group } = await import('three');
  return {
    Machinery: class {
      root = new Group();
      update() {}
    }
  };
});
vi.mock('../../src/juice/particles', () => ({ ParticlePool: effect }));
vi.mock('../../src/juice/sound', () => ({ FeverSound: effect }));
vi.mock('../../src/juice/theme', () => ({ DiscoTheme: effect }));

it.each([3, 7])(
  'refreshes the screen after FEVER expires with %i post-miss hits',
  (hits) => {
    vi.stubGlobal(
      'ResizeObserver',
      class {
        observe() {}
        disconnect() {}
      }
    );
    const host = document.createElement('div');
    const display = new Group();
    const sink = createFeverSink(
      host,
      {
        scene: new Group(),
        camera: new PerspectiveCamera(),
        jars: [],
        getStage: () => ({
          statusDisplay: display,
          dropButton: new Group(),
          baseFov: 45,
          fitMargin: 1.1
        }),
        setCameraOffset() {},
        setFovPunch() {}
      } as unknown as SceneRoot,
      50
    );
    for (let i = 0; i < 15; i++) sink.emit('jar-hit', 1);
    sink.emit('miss', 1);
    for (let i = 0; i < hits; i++) sink.emit('jar-hit', 1);
    sink.update(0.01, 0, 50, 60);
    expect(screenState).toHaveBeenLastCalledWith(hits, 3, 'fever');
    sink.update(6, 0, 50, 60);
    expect(sink.getState()).toMatchObject({
      combo: hits,
      multiplier: hits < 5 ? 1 : 2,
      heat: 'calm'
    });
    expect(screenState).toHaveBeenLastCalledWith(
      hits,
      hits < 5 ? 1 : 2,
      'calm'
    );
    expect(host.querySelector('.fever-badge')).toBeNull();
    vi.unstubAllGlobals();
  }
);
