import { countdownPulse } from './boardLogic';

/** Shared alarm/heartbeat timing; no second countdown clock. */
export const urgentTime = (seconds: number): boolean =>
  seconds > 0 && seconds <= 10;
export type ScreenMood = 'dance' | 'cheer' | 'gasp' | 'sweat';
export const screenMood = (
  seconds: number,
  reactionAge: number,
  missed: boolean
): ScreenMood =>
  reactionAge < 0.85
    ? missed
      ? 'gasp'
      : 'cheer'
    : urgentTime(seconds)
      ? 'sweat'
      : 'dance';
export const lowBalls = (balls: number): boolean => balls >= 0 && balls <= 5;
export const flipScale = (age: number): number =>
  1 + Math.sin(Math.min(1, age / 0.3) * Math.PI) * 0.18;
export const timerShake = (seconds: number, phase: number): number =>
  urgentTime(seconds) ? Math.sin(phase * 55) * countdownPulse(seconds) * 4 : 0;
