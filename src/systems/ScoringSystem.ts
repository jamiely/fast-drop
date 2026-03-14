import { gameConfig } from '../game/config';
import type {
  BallSettledEvent,
  BallSettlementResult,
  ScoringSystemContract
} from '../game/types';

const JAR_BASE_VALUES = [180, 140, 120, 100, 80];

export class ScoringSystem implements ScoringSystemContract {
  private streak = 0;
  private lastSettledAtSeconds: number | null = null;

  public onBallSettled(event: BallSettledEvent): BallSettlementResult {
    this.updateStreak(event.settledAtSeconds);

    const baseValue = this.getJarBaseValue(event.jarIndex);
    const centerBonusMultiplier = this.getCenterMultiplier(
      event.centerOffsetNormalized ?? 0.5
    );
    const streakBonus = this.getStreakBonus();

    return {
      scoreDelta: Math.max(
        1,
        Math.round(baseValue * centerBonusMultiplier + streakBonus)
      ),
      bonusTimeDelta: event.isBonusJar ? gameConfig.bonusTimeSeconds : 0
    };
  }

  private getJarBaseValue(jarIndex: number): number {
    return JAR_BASE_VALUES[jarIndex] ?? gameConfig.dropScore;
  }

  private getCenterMultiplier(centerOffsetNormalized: number): number {
    const clamped = Math.max(0, Math.min(1, centerOffsetNormalized));
    return 1.4 - clamped * 0.5;
  }

  private getStreakBonus(): number {
    if (this.streak < 2) {
      return 0;
    }

    return Math.min(120, (this.streak - 1) * 10);
  }

  private updateStreak(settledAtSeconds: number): void {
    if (
      this.lastSettledAtSeconds === null ||
      settledAtSeconds - this.lastSettledAtSeconds > 2.25
    ) {
      this.streak = 1;
    } else {
      this.streak += 1;
    }

    this.lastSettledAtSeconds = settledAtSeconds;
  }
}
