import type { JuiceState } from '../juice/state';
import type { AttractState } from '../juice/attract';
import type { JuiceStats, QualityTier } from '../juice/types';

export type RoundPhase = 'idle' | 'countdown' | 'playing' | 'ended';

export interface GameState {
  phase: RoundPhase;
  score: number;
  timeRemaining: number;
  ballsRemaining: number;
  ballsDropped: number;
  hits: number;
  misses: number;
}

export interface BallSettledEvent {
  jarIndex: number;
  isBonusJar: boolean;
  ballId: number | null;
  settledAtSeconds: number;
  centerOffsetNormalized?: number;
}

export interface BallSettlementResult {
  scoreDelta: number;
  bonusTimeDelta: number;
}

export interface OrbitSystemContract {
  update(dt: number): void;
}

export interface ScoringSystemContract {
  onBallSettled(event: BallSettledEvent): BallSettlementResult;
}

export type AudioEvent =
  | 'drop'
  | 'ball-settled'
  | 'bonus-awarded'
  | 'time-warning'
  | 'game-over';

export interface AudioSystemContract {
  play(event: AudioEvent): void;
}

export interface TestBridgeContract {
  dropBall: () => void;
  stepFrames: (n: number) => void;
  restartRound?: () => void;
  setTimeRemaining?: (seconds: number) => void;
  setScore?: (score: number) => void;
  setBallsRemaining?: (remaining: number) => void;
  setSpeedMultiplier?: (multiplier: number) => void;
  togglePause?: () => void;
  spawnBall?: () => void;
  /** Current layout and the largest |NDC| reached by the playfield, display, drop tube and button (< 1: in frame). */
  getFraming?: () => { layout: 'landscape' | 'portrait'; maxNdc: number };
  /** Fever-only. Uses the real settlement/scoring path, following the existing test bridge convention. */
  scriptJarHit?: (jarIndex?: number, isBonusJar?: boolean) => void;
  getJuiceState?: () => JuiceState | null;
  /** Fever-only: skip the idle wait, only from an ended round. */
  startAttract?: () => void;
  getAttractState?: () => AttractState;
  /** Fever-only: bloom on/off, last frame's draw calls and the juice CPU time. */
  getJuiceStats?: () => JuiceStats | null;
  /** Fever-only: force the adaptive quality tier, as a slow GPU would. */
  setQualityTier?: (tier: QualityTier) => void;
  getGameState?: () => GameState;
}
