import type {
  BallSettledEvent,
  BallSettlementResult,
  ScoringSystemContract
} from '../game/types';

const SCORE_PER_JAR_BALL = 10;

export class ScoringSystem implements ScoringSystemContract {
  public onBallSettled(event: BallSettledEvent): BallSettlementResult {
    void event;

    return {
      scoreDelta: SCORE_PER_JAR_BALL,
      bonusTimeDelta: 0
    };
  }
}
