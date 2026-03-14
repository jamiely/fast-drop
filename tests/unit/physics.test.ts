import { describe, expect, it, vi } from 'vitest';

const rapierMocks = vi.hoisted(() => {
  const init = vi.fn(() => Promise.resolve(undefined));
  const step = vi.fn();

  class World {
    public constructor(
      public readonly gravity: { x: number; y: number; z: number }
    ) {}

    public step = step;
  }

  return { init, step, World };
});

vi.mock('@dimforge/rapier3d-compat', () => ({
  default: {
    init: rapierMocks.init,
    World: rapierMocks.World
  }
}));

describe('PhysicsWorld', () => {
  it('initializes rapier and advances simulation', async () => {
    const { PhysicsWorld } = await import('../../src/physics/PhysicsWorld');

    const world = await PhysicsWorld.create();
    world.step();

    expect(rapierMocks.init).toHaveBeenCalledTimes(1);
    expect(rapierMocks.step).toHaveBeenCalledTimes(1);
  });
});
