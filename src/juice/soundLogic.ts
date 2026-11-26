import type { Heat } from './state';

const SCALE = [0, 2, 4, 7, 9];

/** C-major pentatonic; keep climbing through three octaves, then hold the crown. */
export const comboSemitone = (combo: number): number => {
  const degree = Math.min(15, Math.max(0, Math.floor(combo) - 1));
  return SCALE[degree % SCALE.length] + 12 * Math.floor(degree / SCALE.length);
};

export const comboFrequency = (combo: number): number =>
  523.25 * 2 ** (comboSemitone(combo) / 12);

export const heatMusic = (heat: Heat, warning = false) => ({
  bpm: { calm: 88, warm: 112, hot: 136, fever: 164 }[heat] + (warning ? 12 : 0),
  pulse: true,
  bass: heat === 'hot' || heat === 'fever',
  percussion: heat !== 'calm'
});

/** Includes future scheduled voices. Idempotent release makes reset/onended races safe. */
export class VoiceLimit {
  private readonly voices = new Set<symbol>();

  public constructor(public readonly maximum = 24) {}

  public acquire(): symbol | null {
    if (this.voices.size >= this.maximum) return null;
    const voice = Symbol();
    this.voices.add(voice);
    return voice;
  }

  public release(voice: symbol): void {
    this.voices.delete(voice);
  }

  public get active(): number {
    return this.voices.size;
  }
}
