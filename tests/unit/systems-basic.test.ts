import { describe, expect, it, vi } from 'vitest';
import { AudioSystem } from '../../src/systems/AudioSystem';
import { ScoringSystem } from '../../src/systems/ScoringSystem';

describe('basic systems', () => {
  it('returns fixed drop score', () => {
    expect(new ScoringSystem().getDropScore()).toBe(10);
  });

  it('logs audio placeholder on drop', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => {});
    new AudioSystem().playDrop();
    expect(spy).toHaveBeenCalledWith('[AudioSystem] drop (placeholder)');
    spy.mockRestore();
  });
});
