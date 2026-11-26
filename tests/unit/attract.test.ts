import { describe, expect, it } from 'vitest';
import {
  AttractMode,
  autopilotJitter,
  fallTimeToJar,
  secondsUntilDrop
} from '../../src/juice/attract';

describe('attract lifecycle', () => {
  it('waits 20 real idle seconds after game over, consumes input, and resets after demo end', () => {
    const attract = new AttractMode(() => 0.5);
    expect(attract.update(60)).toBe(false); // Launch is already a real round.
    expect(attract.start()).toBe(false);
    expect(attract.input()).toBe(false);
    attract.endRound();
    expect(attract.update(19.9)).toBe(false);
    attract.activity();
    expect(attract.update(19)).toBe(false);
    expect(attract.input()).toBe(false); // A restart-lock press also resets idle.
    expect(attract.update(-1)).toBe(false);
    expect(attract.update(19)).toBe(false);
    expect(attract.update(1)).toBe(true);
    expect(attract.getState()).toEqual({ phase: 'attract', idleSeconds: 0 });
    attract.activity();
    expect(attract.update(60)).toBe(false);
    expect(attract.input()).toBe(true);
    expect(attract.getState()).toEqual({ phase: 'round', idleSeconds: 0 });
    attract.endRound();
    expect(attract.start()).toBe(true);
    attract.endRound(); // Demo end returns to the game-over idle clock.
    expect(attract.update(19)).toBe(false);
    expect(attract.update(1)).toBe(true);
    attract.resetRound();
    expect(attract.getState().phase).toBe('round');
    // Snapshots can't mutate the controller.
    attract.getState().phase = 'attract';
    expect(attract.getState().phase).toBe('round');
  });
});

describe('orbit autopilot', () => {
  it('predicts the earliest jar arrival including fall lead, wrapping and signed speed', () => {
    const angles = [0, Math.PI / 2, Math.PI];
    expect(secondsUntilDrop(angles, -1, 0, 0.5, 0)).toBeCloseTo(
      Math.PI / 2 - 0.5
    );
    expect(secondsUntilDrop([0], 1, Math.PI / 2, 0.5, 0.1)).toBeCloseTo(
      Math.PI / 2 - 0.4
    );
    expect(secondsUntilDrop([0], -1, 0, 0.5, 0)).toBeCloseTo(2 * Math.PI - 0.5);
    expect(secondsUntilDrop([0.5], -1, 0, 0.5, 0)).toBe(0);
    expect(secondsUntilDrop(angles, 0, 0, 0.5, 0)).toBe(Infinity);
    expect(secondsUntilDrop([], -1, 0, 0.5, 0)).toBe(Infinity);
    expect(fallTimeToJar(1, 2)).toBe(0);
    const fall = fallTimeToJar(3.25, 1.12 + 0.157);
    expect(1.8 * fall + 0.5 * 7.6 * fall ** 2).toBeCloseTo(3.25 - 1.277);
  });

  it('bounds paired-shot jitter and deliberately mistimes 9 of 26 aims', () => {
    let accurate = 0;
    for (let i = 0; i < 52; i += 1) {
      const low = autopilotJitter(i, 0);
      const high = autopilotJitter(i, 1);
      expect(high - low).toBeCloseTo(0.03);
      if (i % 26 < 17) {
        accurate++;
        expect(low).toBeGreaterThanOrEqual(-0.115);
        expect(high).toBeLessThanOrEqual(0.115);
      } else {
        expect(low).toBeGreaterThanOrEqual(0.385);
        expect(high).toBeLessThanOrEqual(0.615 + Number.EPSILON);
      }
    }
    expect(accurate / 52).toBeCloseTo(17 / 26);
  });

  it('only drops in demo when a predicted arrival falls within the next frame', () => {
    const attract = new AttractMode(() => 12 / 26); // Aim 12: -100 ms (with small random jitter).
    const fall = fallTimeToJar(3.25, 1.277);
    const angle = fall - autopilotJitter(12, 12 / 26);
    expect(attract.shouldDrop([angle], -1, 0, 3.25, 1.277, 1 / 60)).toBe(false);
    attract.endRound();
    attract.start();
    expect(attract.shouldDrop([angle + 0.1], -1, 0, 3.25, 1.277, 1 / 60)).toBe(
      false
    );
    expect(
      attract.shouldDrop([angle + 0.001], -1, 0, 3.25, 1.277, 1 / 60)
    ).toBe(true);
    attract.dropped(); // Second shot is 200 ms later.
    expect(attract.shouldDrop([angle], -1, 0, 3.25, 1.277, 1 / 60)).toBe(false);
    expect(
      attract.shouldDrop([angle - 0.199], -1, 0, 3.25, 1.277, 1 / 60)
    ).toBe(true);
  });
});
