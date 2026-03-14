import { describe, expect, it, vi } from 'vitest';
import { AudioSystem } from '../../src/systems/AudioSystem';
import { ScoringSystem } from '../../src/systems/ScoringSystem';

describe('basic systems', () => {
  it('returns placeholder score and bonus values for settled balls', () => {
    const scoring = new ScoringSystem();

    expect(
      scoring.onBallSettled({
        jarIndex: 1,
        isBonusJar: false,
        ballId: 10,
        settledAtSeconds: 4
      })
    ).toEqual({ scoreDelta: 10, bonusTimeDelta: 0 });

    expect(
      scoring.onBallSettled({
        jarIndex: 0,
        isBonusJar: true,
        ballId: 11,
        settledAtSeconds: 5
      })
    ).toEqual({ scoreDelta: 10, bonusTimeDelta: 3 });
  });

  it('logs audio placeholder events', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    new AudioSystem().play('drop');
    expect(spy).toHaveBeenCalledWith('[AudioSystem] drop (placeholder)');
    spy.mockRestore();
  });
});
