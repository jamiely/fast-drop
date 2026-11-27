import { describe, expect, it } from 'vitest';
import {
  flipScale,
  scheduleTakeover,
  takeoverVisible,
  INSTRUMENT_STRIP_Y,
  lowBalls,
  screenMood,
  timerShake,
  urgentTime
} from '../../src/juice/screenLogic';

describe('Fever screen instruments', () => {
  it('prioritizes FEVER over streaks, expires and reserves a readable instrument strip', () => {
    expect(scheduleTakeover('streak', 0.2, 'fever')).toBe('fever');
    expect(scheduleTakeover('fever', 0.2, 'streak')).toBe('fever');
    expect(scheduleTakeover('fever', 3, 'streak')).toBe('streak');
    expect(takeoverVisible('streak', 1.6)).toBe(false);
    expect(takeoverVisible('fever', 2.59)).toBe(true);
    expect(takeoverVisible('none', 0)).toBe(false);
    expect(512 - INSTRUMENT_STRIP_Y).toBeGreaterThanOrEqual(100);
  });
  it('reacts briefly, then sweats only in the live final ten', () => {
    expect(screenMood(40, Infinity, false)).toBe('dance');
    expect(screenMood(40, 0.2, false)).toBe('cheer');
    expect(screenMood(8, 0.2, true)).toBe('gasp');
    expect(screenMood(8, 1, true)).toBe('sweat');
    expect(screenMood(0, 1, true)).toBe('dance');
  });
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
