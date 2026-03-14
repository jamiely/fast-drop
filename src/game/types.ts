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
}
