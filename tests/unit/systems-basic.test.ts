import { describe, expect, it, vi } from 'vitest';
import { AudioSystem } from '../../src/systems/AudioSystem';
import { ScoringSystem } from '../../src/systems/ScoringSystem';

describe('basic systems', () => {
  it('awards a flat +10 score for each settled ball', () => {
    const scoring = new ScoringSystem();

    const first = scoring.onBallSettled({
      jarIndex: 1,
      isBonusJar: false,
      ballId: 10,
      settledAtSeconds: 4,
      centerOffsetNormalized: 0.5
    });

    const second = scoring.onBallSettled({
      jarIndex: 0,
      isBonusJar: true,
      ballId: 11,
      settledAtSeconds: 5,
      centerOffsetNormalized: 0.05
    });

    expect(first.scoreDelta).toBe(10);
    expect(second.scoreDelta).toBe(10);
    expect(second.bonusTimeDelta).toBe(0);
  });

  it('logs audio placeholder events when no audio context exists', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    new AudioSystem().play('drop');
    expect(spy).toHaveBeenCalledWith('[AudioSystem] drop (placeholder)');
    spy.mockRestore();
  });
});
