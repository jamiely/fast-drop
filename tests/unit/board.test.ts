import { describe, expect, it } from 'vitest';
import {
  approachScore,
  boardBounce,
  comboLook,
  flyProgress,
  MARQUEE_CHASE,
  odometer,
  POINTS_FLY_SECONDS,
  POINTS_RISE_SECONDS,
  scoreDigits,
  spring
} from '../../src/juice/boardLogic';

describe('Fever board score reels', () => {
  it('shows whole digits at rest, least significant first', () => {
    expect(odometer(0, 4)).toEqual([0, 0, 0, 0]);
    expect(odometer(1230, 4)).toEqual([0, 3, 2, 1]);
  });

  it('turns a higher reel only while the reel below rolls from 9 to 0', () => {
    const [ones, tens, hundreds] = odometer(195.5, 4);
    expect(ones).toBeCloseTo(5.5);
    expect(tens).toBe(9);
    expect(hundreds).toBe(1);
    const carry = odometer(199.5, 4);
    expect(carry[0]).toBeCloseTo(9.5);
    expect(carry[1]).toBeCloseTo(9.5);
    expect(carry[2]).toBeCloseTo(1.5);
    expect(odometer(-5, 4)).toEqual([0, 0, 0, 0]);
  });

  it('keeps four reels and grows with the score', () => {
    expect(scoreDigits(0)).toBe(4);
    expect(scoreDigits(9999)).toBe(4);
    expect(scoreDigits(10000)).toBe(5);
  });

  it('rolls toward the target in about a third of a second, then snaps', () => {
    expect(approachScore(0, 30, 0)).toBe(0);
    const early = approachScore(0, 30, 1 / 60);
    expect(early).toBeGreaterThan(0);
    expect(early).toBeLessThan(30);
    let shown = 0;
    let frames = 0;
    while (shown !== 30 && frames < 120) {
      shown = approachScore(shown, 30, 1 / 60);
      frames += 1;
    }
    expect(shown).toBe(30);
    expect(frames).toBeLessThan(30);
  });
});

describe('Fever board squash', () => {
  it('springs from the squash back to rest', () => {
    expect(spring(0, 0.1)).toBeCloseTo(0.9);
    expect(spring(-1, 0.1)).toBe(1);
    expect(spring(2, 0.1)).toBe(1);
    expect(Math.abs(spring(0.6, 0.1) - 1)).toBeLessThan(0.01);
  });

  it('squashes harder for heavier hits and keeps its volume', () => {
    const light = boardBounce(0, 2);
    const heavy = boardBounce(0, 4);
    expect(heavy.y).toBeLessThan(light.y);
    expect(heavy.x * Math.sqrt(heavy.y)).toBeCloseTo(1);
    expect(heavy.dip).toBeGreaterThan(0);
    expect(boardBounce(5, 4)).toEqual({ y: 1, x: 1, dip: 0 });
  });
});

describe('Fever board marquee', () => {
  it('chases faster and denser as the heat rises', () => {
    const tiers = (['calm', 'warm', 'hot', 'fever'] as const).map(
      (heat) => MARQUEE_CHASE[heat]
    );
    for (let i = 1; i < tiers.length; i += 1) {
      expect(tiers[i].speed).toBeGreaterThan(tiers[i - 1].speed);
      expect(tiers[i].period).toBeLessThanOrEqual(tiers[i - 1].period);
    }
  });
});

describe('Fever board combo badge', () => {
  it('hides at no combo, grows to a cap, and shakes and recolours per tier', () => {
    expect(comboLook(0, 'calm').visible).toBe(false);
    expect(comboLook(1, 'calm')).toMatchObject({ visible: true, shake: 0 });
    expect(comboLook(20, 'hot').scale).toBeCloseTo(1.4);
    expect(comboLook(60, 'hot').scale).toBeCloseTo(1.4);
    const tiers = (['calm', 'warm', 'hot', 'fever'] as const).map((heat) =>
      comboLook(5, heat)
    );
    for (let i = 1; i < tiers.length; i += 1) {
      expect(tiers[i].shake).toBeGreaterThan(tiers[i - 1].shake);
      expect(tiers[i].color).not.toBe(tiers[i - 1].color);
    }
  });
});

describe('Fever "+N" fly-in', () => {
  it('rises first, then accelerates into the plate and arrives', () => {
    expect(flyProgress(0)).toBe(0);
    expect(flyProgress(POINTS_RISE_SECONDS)).toBe(0);
    const half = flyProgress(POINTS_RISE_SECONDS + POINTS_FLY_SECONDS / 2);
    expect(half).toBeCloseTo(0.25);
    expect(flyProgress(POINTS_RISE_SECONDS + POINTS_FLY_SECONDS)).toBe(1);
    expect(flyProgress(5)).toBe(1);
  });
});
