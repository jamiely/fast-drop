import { describe, expect, it } from 'vitest';
import { gameConfig } from '../../src/game/config';
import {
  applyBallSettledState,
  applyMissState,
  canDropBall,
  createInitialState,
  dropBallState,
  endRoundState,
  selectAccuracy,
  startRoundState,
  tickState
} from '../../src/game/state';

describe('game state helpers', () => {
  it('creates the initial state from config', () => {
    expect(createInitialState()).toEqual({
      phase: 'playing',
      score: 0,
      timeRemaining: gameConfig.timeStartSeconds,
      ballsRemaining: gameConfig.ballsTotal,
      ballsDropped: 0,
      hits: 0,
      misses: 0
    });
  });

  it('starts and ends rounds predictably', () => {
    const started = startRoundState();
    const ended = endRoundState(started);

    expect(started.phase).toBe('playing');
    expect(ended.phase).toBe('ended');
    expect(endRoundState(ended)).toBe(ended);
  });

  it('ticks time down and clamps at zero', () => {
    const start = {
      phase: 'playing' as const,
      score: 0,
      timeRemaining: 1,
      ballsRemaining: 10,
      ballsDropped: 0,
      hits: 0,
      misses: 0
    };
    expect(tickState(start, 0.25).timeRemaining).toBeCloseTo(0.75);
    expect(tickState(start, 3).timeRemaining).toBe(0);
  });

  it('does not tick while round has ended', () => {
    const ended = {
      phase: 'ended' as const,
      score: 0,
      timeRemaining: 0,
      ballsRemaining: 10,
      ballsDropped: 0,
      hits: 0,
      misses: 0
    };
    expect(tickState(ended, 1)).toEqual({ ...ended, timeRemaining: 0 });
  });

  it('drops a ball by decrementing remaining balls', () => {
    const state = {
      phase: 'playing' as const,
      score: 10,
      timeRemaining: 5,
      ballsRemaining: 2,
      ballsDropped: 3,
      hits: 0,
      misses: 0
    };

    expect(dropBallState(state)).toEqual({
      ...state,
      ballsRemaining: 1,
      ballsDropped: 4
    });
  });

  it('applies settled scoring and bonus time after collision', () => {
    const state = {
      phase: 'playing' as const,
      score: 10,
      timeRemaining: 5,
      ballsRemaining: 1,
      ballsDropped: 4,
      hits: 2,
      misses: 1
    };
    expect(applyBallSettledState(state, 7, 3)).toEqual({
      ...state,
      score: 17,
      timeRemaining: 8,
      hits: 3
    });
  });

  it('tracks misses and accuracy across edge cases', () => {
    const state = {
      phase: 'playing' as const,
      score: 0,
      timeRemaining: 1,
      ballsRemaining: 0,
      ballsDropped: 0,
      hits: 0,
      misses: 0
    };

    expect(selectAccuracy(state)).toBe(0);
    const missOnly = applyMissState(state, 2);
    expect(missOnly.misses).toBe(2);
    expect(selectAccuracy(missOnly)).toBe(0);

    const mixed = applyBallSettledState(missOnly, 10, 0);
    expect(mixed.hits).toBe(1);
    expect(selectAccuracy(mixed)).toBeCloseTo(1 / 3);
  });

  it('gates drops by phase, resources, and cooldown', () => {
    const state = {
      phase: 'playing' as const,
      score: 0,
      timeRemaining: 10,
      ballsRemaining: 5,
      ballsDropped: 0,
      hits: 0,
      misses: 0
    };

    expect(canDropBall({ ...state, phase: 'ended' })).toBe(false);
    expect(canDropBall({ ...state, ballsRemaining: 0 })).toBe(false);
    expect(
      canDropBall(state, {
        simulationTimeSeconds: 2,
        lastDropAtSeconds: 1.95,
        dropCooldownMs: 80
      })
    ).toBe(false);
    expect(
      canDropBall(state, {
        simulationTimeSeconds: 2,
        lastDropAtSeconds: 1.9,
        dropCooldownMs: 80
      })
    ).toBe(true);
  });
});
