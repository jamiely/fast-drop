import { describe, expect, it } from 'vitest';
import {
  flipScale,
  lowBalls,
  timerShake,
  urgentTime
} from '../../src/juice/screenLogic';

describe('Fever screen instruments', () => {
  it('squashes once per flip and settles without drifting', () => {
    expect(flipScale(0)).toBe(1);
    expect(flipScale(0.15)).toBeCloseTo(1.18);
    expect(flipScale(0.3)).toBeCloseTo(1);
    expect(flipScale(20)).toBeCloseTo(1);
  });
  it('gates the red alarm and shake to live final seconds', () => {
    for (const seconds of [Infinity, 11, 0, -1]) {
      expect(urgentTime(seconds)).toBe(false);
      expect(timerShake(seconds, 1)).toBe(0);
    }
    expect(urgentTime(10)).toBe(true);
    expect(urgentTime(0.1)).toBe(true);
    expect(timerShake(9.95, 1)).not.toBe(0);
  });
  it('warns at five balls, not before initialization', () => {
    expect(lowBalls(-1)).toBe(false);
    expect(lowBalls(6)).toBe(false);
    expect(lowBalls(5)).toBe(true);
    expect(lowBalls(0)).toBe(true);
  });
});
