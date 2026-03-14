export interface GameState {
  score: number;
  timeRemaining: number;
  ballsRemaining: number;
}

export interface BallSettledEvent {
  jarIndex: number;
  isBonusJar: boolean;
  ballId: number | null;
  settledAtSeconds: number;
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
}
