export const SKIP_SECONDS = 1.5;
export const TALLY_SECONDS = 4.8;
export const canSkipFinale = (age: number): boolean => age >= SKIP_SECONDS;
export const tallyScore = (score: number, age: number): number =>
  Math.floor(
    score * (1 - Math.pow(1 - Math.min(1, Math.max(0, age / TALLY_SECONDS)), 3))
  );
export const roundRank = (score: number, hits: number, balls = 50): string =>
  hits === balls
    ? 'PERFECT'
    : score >= 500
      ? 'S'
      : score >= 300
        ? 'A'
        : score >= 150
          ? 'B'
          : 'C';
/** Original “Drop Pocket”: three bars at 150 BPM, in D minor ninth. */
export const DISCO_BEAT = 0.4;
export const DISCO_BARS = 3;
// The rank is inserted immediately: its horn accent must land at the same instant.
export const STAMP_SECONDS = 0;
export const DISCO_BASS = [38, 50, 38, 53, 41, 53, 45, 57] as const;
export const DISCO_CHORD = [62, 65, 69, 72, 76] as const;
export const midiFrequency = (note: number): number =>
  440 * 2 ** ((note - 69) / 12);
export type DiscoNote = {
  part: 'kick' | 'bass' | 'wah' | 'strings' | 'horn' | 'chord';
  at: number;
  duration: number;
  notes: readonly number[];
};
/** Pure score in seconds; the short tag uses the same pocket and voicing. */
export const discoFinale = (short = false): readonly DiscoNote[] => {
  const beat = short ? 0.3 : DISCO_BEAT;
  const beats = short ? 4 : DISCO_BARS * 4;
  const end = short ? SKIP_SECONDS : TALLY_SECONDS;
  const chordAt = end - beat;
  const score: DiscoNote[] = [
    { part: 'horn', at: STAMP_SECONDS, duration: 0.18, notes: DISCO_CHORD },
    {
      part: 'strings',
      at: beat / 2,
      duration: chordAt - beat / 2,
      notes: DISCO_CHORD
    },
    { part: 'chord', at: chordAt, duration: beat, notes: DISCO_CHORD }
  ];
  for (let step = 0; step < beats * 2; step += 1) {
    const at = (step * beat) / 2;
    if (at >= chordAt - 0.001) break;
    if (step % 2 === 0)
      score.push({ part: 'kick', at, duration: 0.16, notes: [36] });
    score.push({
      part: 'bass',
      at,
      duration: beat * 0.36,
      notes: [DISCO_BASS[step % 8]]
    });
    if (step % 2 === 1)
      score.push({
        part: 'wah',
        at,
        duration: beat * 0.3,
        notes: [65, 72, step % 4 === 1 ? 76 : 69]
      });
  }
  return score.sort((a, b) => a.at - b.at);
};
