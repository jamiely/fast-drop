import { gameConfig } from '../game/config';
import type {
  BallSettledEvent,
  BallSettlementResult,
  ScoringSystemContract
} from '../game/types';

// TODO(phase5-gameplay): Replace placeholder scoring with jar-specific multipliers,
// center-accuracy scoring, streak bonuses, and dynamic bonus-time rules.
export class ScoringSystem implements ScoringSystemContract {
  public onBallSettled(event: BallSettledEvent): BallSettlementResult {
    return {
      scoreDelta: gameConfig.dropScore,
      bonusTimeDelta: event.isBonusJar ? gameConfig.bonusTimeSeconds : 0
    };
  }
}
