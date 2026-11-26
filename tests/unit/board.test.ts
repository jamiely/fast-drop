import { describe, expect, it } from 'vitest';
import {
  approachScore,
  boardBounce,
  boardDamage,
  comboLook,
  countdownPulse,
  countdownTick,
  emitCount,
  flyProgress,
  MARQUEE_CHASE,
  odometer,
  POINTS_FLY_SECONDS,
  POINTS_RISE_SECONDS,
  scoreDigits,
  spring,
  stepTumble,
  TUMBLE_SECONDS,
  tumbleScale
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

describe('Fever board countdown', () => {
  it('pulses only in the last 10 s, with a lub on each second and a softer dub', () => {
    expect(countdownPulse(10.5)).toBe(0);
    expect(countdownPulse(0)).toBe(0);
    expect(countdownPulse(Number.NaN)).toBe(0);
    expect(countdownPulse(10)).toBe(1);
    expect(countdownPulse(7)).toBe(1);
    const between = countdownPulse(6.9);
    const dub = countdownPulse(6.84);
    expect(between).toBeLessThan(dub);
    expect(dub).toBeLessThan(1);
    expect(countdownPulse(6.2)).toBeLessThan(0.05);
  });

  it('ticks once per whole second crossed, 10 down to 1, never on a rise', () => {
    expect(countdownTick(10.02, 9.99)).toBe(10);
    expect(countdownTick(9.99, 9.97)).toBeNull();
    expect(countdownTick(1.01, 0.99)).toBe(1);
    expect(countdownTick(0.5, 0.2)).toBeNull();
    expect(countdownTick(11.02, 10.99)).toBeNull();
    expect(countdownTick(Infinity, 30)).toBeNull();
    expect(countdownTick(Infinity, 9.5)).toBe(10);
    expect(countdownTick(5, 6)).toBeNull();
  });
});

describe('Fever board tumbling balls', () => {
  it('falls, bounces once on the lip at half speed, and finishes', () => {
    const ball = {
      ...{ x: 0, y: 0, z: 0, vx: 0.3, vy: -0.2, vz: 0.25 },
      ...{ spin: 8, age: 0, bounced: false }
    };
    let bounces = 0;
    let alive = true;
    let frames = 0;
    while (alive && frames < 600) {
      const wasBounced = ball.bounced;
      alive = stepTumble(ball, 1 / 60, -0.3);
      if (ball.bounced && !wasBounced) {
        bounces += 1;
        expect(ball.y).toBe(-0.3);
        expect(ball.vy).toBeGreaterThan(0);
      }
      frames += 1;
    }
    expect(bounces).toBe(1);
    expect(ball.y).toBeLessThan(-0.3);
    expect(frames).toBeCloseTo(TUMBLE_SECONDS * 60, -1);
  });

  it('pops in, holds, and shrinks away by the end', () => {
    expect(tumbleScale(-0.1)).toBe(0);
    expect(tumbleScale(0.03)).toBeCloseTo(0.5);
    expect(tumbleScale(0.3)).toBe(1);
    expect(tumbleScale(TUMBLE_SECONDS * 0.9)).toBeCloseTo(0.3);
    expect(tumbleScale(TUMBLE_SECONDS)).toBe(0);
  });
});

describe('Fever board damage', () => {
  it('stays intact until hot, cracks at hot and cracks through in FEVER', () => {
    expect(boardDamage('calm')).toEqual({ cracks: 0, steam: 0, sparks: 0 });
    expect(boardDamage('warm')).toEqual({ cracks: 0, steam: 0, sparks: 0 });
    expect(boardDamage('hot').cracks).toBe(1);
    expect(boardDamage('fever').cracks).toBe(2);
    expect(boardDamage('fever').steam).toBeGreaterThan(
      boardDamage('hot').steam
    );
    expect(boardDamage('fever').sparks).toBeGreaterThan(
      boardDamage('hot').sparks
    );
  });

  it('emits at a steady rate whatever the frame time, carrying the fraction', () => {
    let carry = 0;
    let total = 0;
    for (let i = 0; i < 60; i += 1) {
      const next = emitCount(10, 1 / 60, carry);
      total += next.count;
      carry = next.carry;
    }
    expect(total).toBe(9);
    expect(emitCount(10, 1 / 60, carry).count).toBe(1);
    expect(emitCount(0, 1, 0.5)).toEqual({ count: 0, carry: 0.5 });
    expect(emitCount(5, -1, 0)).toEqual({ count: 0, carry: 0 });
  });
});
