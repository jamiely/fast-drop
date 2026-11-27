import { describe, expect, it } from 'vitest';
import {
  canSkipFinale,
  discoFinale,
  DISCO_BARS,
  DISCO_BEAT,
  DISCO_BASS,
  DISCO_CHORD,
  midiFrequency,
  STAMP_SECONDS,
  TALLY_SECONDS,
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
  it('scores an original octave-jumping disco pocket over three bars', () => {
    expect(DISCO_BARS * 4 * DISCO_BEAT).toBeCloseTo(TALLY_SECONDS);
    expect(DISCO_BASS).toEqual([38, 50, 38, 53, 41, 53, 45, 57]);
    expect(DISCO_CHORD).toEqual([62, 65, 69, 72, 76]);
    expect(midiFrequency(69)).toBe(440);
    expect(midiFrequency(50)).toBeCloseTo(midiFrequency(38) * 2);
    const score = discoFinale();
    expect(score.filter((n) => n.part === 'kick').map((n) => n.at)).toEqual(
      Array.from({ length: 11 }, (_, i) => i * DISCO_BEAT)
    );
    expect(
      score
        .filter((n) => n.part === 'wah')
        .every((n) => n.at % DISCO_BEAT > 0.19)
    ).toBe(true);
  });
  it.each([false, true])(
    'schedules the stamp, swell and resolving chord (short=%s)',
    (short) => {
      const score = discoFinale(short);
      const horn = score.find((n) => n.part === 'horn')!;
      const swell = score.find((n) => n.part === 'strings')!;
      const chord = score.find((n) => n.part === 'chord')!;
      expect(horn.at).toBe(STAMP_SECONDS);
      expect(swell.at + swell.duration).toBeCloseTo(chord.at);
      expect(chord.at + chord.duration).toBeCloseTo(short ? 1.5 : 4.8);
      expect(Math.max(...score.map((n) => n.at + n.duration))).toBeCloseTo(
        short ? 1.5 : 4.8
      );
      expect(score.map((n) => n.at)).toEqual(
        [...score.map((n) => n.at)].sort((a, b) => a - b)
      );
    }
  );
});
