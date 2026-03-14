import { gameConfig } from './config';
import type { GameState } from './types';

export const createInitialState = (): GameState => ({
  score: 0,
  timeRemaining: gameConfig.timeStartSeconds,
  ballsRemaining: gameConfig.ballsTotal
});

export const tickState = (state: GameState, dt: number): GameState => {
  if (state.timeRemaining <= 0) {
    return { ...state, timeRemaining: 0 };
  }

  return {
    ...state,
    timeRemaining: Math.max(0, state.timeRemaining - dt)
  };
};

export const dropBallState = (state: GameState): GameState => {
  if (state.timeRemaining <= 0 || state.ballsRemaining <= 0) {
    return state;
  }

  return {
    ...state,
    ballsRemaining: state.ballsRemaining - 1
  };
};

export const applyBallSettledState = (
  state: GameState,
  scoreDelta: number,
  bonusTimeDelta = 0
): GameState => ({
  ...state,
  score: state.score + scoreDelta,
  timeRemaining: state.timeRemaining + Math.max(0, bonusTimeDelta)
});
