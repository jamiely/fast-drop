import { describe, expect, it } from 'vitest';
import {
  canSkipFinale,
  ODE_TO_JOY,
  roundRank,
  tallyScore
} from '../../src/juice/finale';
describe('finale', () => {
  it('ranks a round and reserves PERFECT for all fifty hits', () => {
    expect([0, 150, 300, 500].map((s) => roundRank(s, 20))).toEqual([
      'C',
      'B',
      'A',
      'S'
    ]);
    expect(roundRank(500, 50)).toBe('PERFECT');
  });
  it('counts up monotonically and finishes exactly', () => {
    expect(tallyScore(500, -1)).toBe(0);
    expect(tallyScore(500, 0)).toBe(0);
    expect(tallyScore(500, 2.4)).toBe(437);
    expect(tallyScore(500, 4.8)).toBe(500);
    expect(tallyScore(500, 8)).toBe(500);
  });
  it('gates skipping at 1.5 seconds', () => {
    expect(canSkipFinale(1.499)).toBe(false);
    expect(canSkipFinale(1.5)).toBe(true);
  });
  it('keeps the public-domain melody pitches and rhythm', () => {
    expect(ODE_TO_JOY.map((n) => n[0])).toEqual([
      64, 64, 65, 67, 67, 65, 64, 62, 60, 60, 62, 64, 64, 62, 62
    ]);
    expect(ODE_TO_JOY.reduce((sum, n) => sum + n[1], 0)).toBe(16);
  });
});
