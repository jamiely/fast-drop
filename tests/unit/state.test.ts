import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/game/config';
import {
  createInitialState,
  dropBallState,
  tickState
} from '../../src/game/state';

describe('game state helpers', () => {
  it('creates the initial state from config', () => {
    expect(createInitialState()).toEqual({
      score: 0,
      timeRemaining: gameConfig.timeStartSeconds,
      ballsRemaining: gameConfig.ballsTotal
    });
  });

  it('ticks time down and clamps at zero', () => {
    const start = { score: 0, timeRemaining: 1, ballsRemaining: 10 };
    expect(tickState(start, 0.25).timeRemaining).toBeCloseTo(0.75);
    expect(tickState(start, 3).timeRemaining).toBe(0);
  });

  it('does not tick below zero when time has ended', () => {
    const ended = { score: 0, timeRemaining: 0, ballsRemaining: 10 };
    expect(tickState(ended, 1)).toEqual({ ...ended, timeRemaining: 0 });
  });

  it('drops a ball and updates score during active play', () => {
    const state = { score: 10, timeRemaining: 5, ballsRemaining: 2 };
    expect(dropBallState(state, 7)).toEqual({
      score: 17,
      timeRemaining: 5,
      ballsRemaining: 1
    });
  });

  it('ignores drops when out of time or balls', () => {
    const outOfTime = { score: 10, timeRemaining: 0, ballsRemaining: 2 };
    const outOfBalls = { score: 10, timeRemaining: 5, ballsRemaining: 0 };

    expect(dropBallState(outOfTime, 7)).toBe(outOfTime);
    expect(dropBallState(outOfBalls, 7)).toBe(outOfBalls);
  });
});
