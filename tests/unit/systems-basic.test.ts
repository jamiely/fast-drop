import { describe, expect, it, vi } from 'vitest';
import { AudioSystem } from '../../src/systems/AudioSystem';
import { ScoringSystem } from '../../src/systems/ScoringSystem';

describe('basic systems', () => {
  it('applies jar value, center weighting, streak bonus, and bonus time', () => {
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

    expect(first.scoreDelta).toBeGreaterThan(100);
    expect(second.scoreDelta).toBeGreaterThan(first.scoreDelta);
    expect(second.bonusTimeDelta).toBe(3);
  });

  it('logs audio placeholder events when no audio context exists', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    new AudioSystem().play('drop');
    expect(spy).toHaveBeenCalledWith('[AudioSystem] drop (placeholder)');
    spy.mockRestore();
  });
});
