import { gameConfig } from './config';
import type { GameState } from './types';

export interface DropGateOptions {
  simulationTimeSeconds: number;
  lastDropAtSeconds: number | null;
  dropCooldownMs: number;
}

export const startRoundState = (): GameState => ({
  phase: 'playing',
  score: 0,
  timeRemaining: gameConfig.timeStartSeconds,
  ballsRemaining: gameConfig.ballsTotal,
  ballsDropped: 0,
  hits: 0,
  misses: 0
});

export const createInitialState = (): GameState => startRoundState();

export const endRoundState = (state: GameState): GameState => {
  if (state.phase === 'ended') {
    return state;
  }

  return {
    ...state,
    phase: 'ended',
    timeRemaining: Math.max(0, state.timeRemaining)
  };
};

export const tickState = (state: GameState, dt: number): GameState => {
  if (state.phase !== 'playing' || state.timeRemaining <= 0) {
    return { ...state, timeRemaining: Math.max(0, state.timeRemaining) };
  }

  return {
    ...state,
    timeRemaining: Math.max(0, state.timeRemaining - dt)
  };
};

export const canDropBall = (
  state: GameState,
  options?: Partial<DropGateOptions>
): boolean => {
  if (
    state.phase !== 'playing' ||
    state.timeRemaining <= 0 ||
    state.ballsRemaining <= 0
  ) {
    return false;
  }

  if (!options) {
    return true;
  }

  const simulationTimeSeconds = options.simulationTimeSeconds ?? 0;
  const lastDropAtSeconds = options.lastDropAtSeconds ?? null;
  const dropCooldownMs = Math.max(0, options.dropCooldownMs ?? 0);

  if (dropCooldownMs <= 0 || lastDropAtSeconds === null) {
    return true;
  }

  const elapsedMs = (simulationTimeSeconds - lastDropAtSeconds) * 1000;
  return elapsedMs >= dropCooldownMs;
};

export const dropBallState = (state: GameState): GameState => {
  if (!canDropBall(state)) {
    return state;
  }

  return {
    ...state,
    ballsRemaining: state.ballsRemaining - 1,
    ballsDropped: state.ballsDropped + 1
  };
};

export const applyBallSettledState = (
  state: GameState,
  scoreDelta: number,
  bonusTimeDelta = 0
): GameState => ({
  ...state,
  score: state.score + scoreDelta,
  timeRemaining: state.timeRemaining + Math.max(0, bonusTimeDelta),
  hits: state.hits + 1
});

export const applyMissState = (state: GameState, missCount = 1): GameState => ({
  ...state,
  misses: state.misses + Math.max(0, Math.floor(missCount))
});

export const selectAccuracy = (state: GameState): number => {
  const attempts = state.hits + state.misses;
  return state.hits / Math.max(1, attempts);
};
