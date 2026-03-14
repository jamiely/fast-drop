import { describe, expect, it, vi } from 'vitest';

const appMocks = vi.hoisted(() => {
  return {
    init: vi.fn(() => Promise.resolve(undefined)),
    start: vi.fn()
  };
});

vi.mock('../../src/game/Game', () => ({
  Game: class {
    public init = appMocks.init;
    public start = appMocks.start;
  }
}));

describe('App', () => {
  it('starts the game by initializing and entering loop', async () => {
    const { App } = await import('../../src/app/App');

    const host = {} as HTMLElement;
    const app = new App(host);
    await app.start();

    expect(appMocks.init).toHaveBeenCalledTimes(1);
    expect(appMocks.start).toHaveBeenCalledTimes(1);
  });
});
