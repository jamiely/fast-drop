import type { Vector3 } from 'three';
import type { JuiceState } from './state';

export type JuiceEvent =
  | 'drop'
  | 'rim-bounce'
  | 'jar-hit'
  | 'bonus-jar'
  | 'miss'
  | 'combo-milestone'
  | 'fever-start'
  | 'time-warning'
  | 'last-ball'
  | 'round-end';

export type QualityTier = 'balanced' | 'low';

export interface JuiceStats {
  bloom: boolean;
  particles?: number;
  /** Draw calls of the last rendered frame, post passes included. */
  calls: number;
  /** Smoothed CPU time of `update`, in ms. */
  juiceMs: number;
  /** The score the board's reels show and the one they roll toward. */
  board?: {
    shown: number;
    score: number;
    maxNdc: number;
    /** The last-10 s alarm is on the dial. */
    countdown: boolean;
  };
}

export interface JuiceSink {
  emit(event: JuiceEvent, weight: number, worldPos?: Vector3): void;
  /** `ballsRemaining` drives the ball-counter tube; `score` the board's rolling score; `timeRemaining` its countdown. */
  update(
    realDt: number,
    ballsRemaining: number,
    score?: number,
    timeRemaining?: number
  ): void;
  setQuality(tier: QualityTier): void;
  /** Fever-only demo banner and quieter audio. */
  setAttract?(active: boolean): void;
  getStats(): JuiceStats | null;
  timeScale(): number;
  reset(): void;
  finishRound?(score: number, hits: number): void;
  skipFinale?(): void;
  getState(): JuiceState | null;
  destroy(): void;
}
