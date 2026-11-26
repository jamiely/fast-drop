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
/** Beethoven, Symphony 9, Ode to Joy: MIDI pitches and beat lengths. */
export const ODE_TO_JOY: readonly (readonly [number, number])[] = [
  [64, 1],
  [64, 1],
  [65, 1],
  [67, 1],
  [67, 1],
  [65, 1],
  [64, 1],
  [62, 1],
  [60, 1],
  [60, 1],
  [62, 1],
  [64, 1],
  [64, 1.5],
  [62, 0.5],
  [62, 2]
];
