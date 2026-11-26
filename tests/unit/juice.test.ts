import { describe, expect, it } from 'vitest';
import { advance, hit, initialJuiceState, miss } from '../../src/juice/state';
import { TimeDistortion, Trauma } from '../../src/juice/core';
import { JUICE_TABLE } from '../../src/juice/table';
import { EDITION, silentJuice } from '../../src/edition';
import { ScoringSystem } from '../../src/systems/ScoringSystem';

const hits = (count: number, start = initialJuiceState()) => {
  let state = start;
  for (let i = 0; i < count; i += 1) state = hit(state);
  return state;
};

describe('Fever combo / heat / scoring', () => {
  it('counts consecutive hits, with ×1 at 0–4, ×2 at 5–9 and ×3 from 10', () => {
    expect(hits(4)).toMatchObject({
      combo: 4,
      multiplier: 1,
      heat: 'calm',
      orbitScale: 1
    });
    expect(hits(5)).toMatchObject({ combo: 5, multiplier: 2, heat: 'warm' });
    expect(hits(9)).toMatchObject({ combo: 9, multiplier: 2, heat: 'warm' });
    expect(hits(10)).toMatchObject({ combo: 10, multiplier: 3, heat: 'hot' });
    expect(miss(hits(10))).toEqual(initialJuiceState());
  });

  it('enters at 15, lasts six real seconds, and can retrigger by meter', () => {
    const before = hits(14);
    const fever = hit(before);
    expect(before.feverRemaining).toBe(0); // transitions are immutable
    expect(fever).toMatchObject({
      combo: 15,
      heat: 'fever',
      feverRemaining: 6,
      multiplier: 3,
      meter: 0,
      orbitScale: 1.25
    });
    const active = hits(4, advance(fever, 2));
    expect(active.feverRemaining).toBe(4); // hits don't extend the six-second window
    expect(active.meter).toBe(0);
    expect(miss(active)).toMatchObject({
      combo: 0,
      multiplier: 3,
      heat: 'fever'
    });
    const cooled = advance(active, 4);
    expect(cooled).toMatchObject({
      feverRemaining: 0,
      orbitScale: 1,
      heat: 'calm',
      multiplier: 3,
      combo: 19
    });
    expect(advance(cooled, 1).heat).toBe('calm');
    expect(hit(cooled).heat).toBe('hot');
    expect(hits(14, cooled).feverRemaining).toBe(0);
    expect(hits(15, cooled)).toMatchObject({
      heat: 'fever',
      feverRemaining: 6,
      meter: 0
    });
    expect(hit({ ...initialJuiceState(), meter: 1 })).toMatchObject({
      combo: 1,
      heat: 'fever'
    });
    expect(advance(fever, -1)).toEqual(fever);
    expect(advance(miss(fever), 7)).toEqual(initialJuiceState());
  });

  it('passes the earned multiplier into scoring; default classic remains 10', () => {
    const scoring = new ScoringSystem();
    const event = {
      ballId: 1,
      jarIndex: 0,
      isBonusJar: true,
      settledAtSeconds: 0
    };
    expect(scoring.onBallSettled(event).scoreDelta).toBe(10);
    expect(scoring.onBallSettled(event, hits(5).multiplier).scoreDelta).toBe(
      20
    );
    expect(scoring.onBallSettled(event, hits(15).multiplier)).toEqual({
      scoreDelta: 30,
      bonusTimeDelta: 0
    });
  });
});

describe('trauma', () => {
  it('adds weight squared, produces bounded smooth shake, and decays on real dt', () => {
    const trauma = new Trauma();
    trauma.add(2, 0.02);
    expect(trauma.value).toBeCloseTo(0.08);
    trauma.add(5, 1);
    expect(trauma.value).toBe(1);
    const first = trauma.update(0);
    expect(Math.abs(first.y)).toBeLessThanOrEqual(0.035);
    const second = trauma.update(0.001);
    expect(Math.abs(second.x - first.x)).toBeLessThan(0.002);
    expect(trauma.value).toBeCloseTo(0.9982);
    trauma.update(1);
    expect(trauma.update(0)).toEqual({ x: 0, y: 0 });
    expect(trauma.value).toBe(0);
  });
});

describe('simulation distortion', () => {
  it('never goes below 0.25 even with overlapping hit-stops and slow-mo', () => {
    const time = new TimeDistortion();
    time.request(0.5, 0.4);
    time.request(0, 0.1);
    expect(time.update(0.1)).toBe(0.25);
    expect(time.update(0)).toBe(1);
    expect(time.used).toBeCloseTo(0.1);
    expect(time.update(1)).toBeCloseTo(0.85); // slow-mo outlives hit-stop without inheriting its scale
    expect(time.update(0.1)).toBe(1);
  });

  it('caps total distortion to two real seconds per round, including a boundary frame', () => {
    const time = new TimeDistortion();
    for (let i = 0; i < 19; i += 1) {
      time.request(0.25, 5);
      expect(time.update(0.1)).toBeCloseTo(0.25);
    }
    expect(time.update(0.2)).toBeCloseTo(0.625);
    expect(time.used).toBe(2);
    time.request(0.25, 1);
    expect(time.update(1)).toBe(1);
    expect(new TimeDistortion().update(1)).toBe(1);
  });

  it('ignores nonpositive durations and caps requested speed at normal time', () => {
    const time = new TimeDistortion();
    time.request(0.25, 0);
    expect(time.update(1)).toBe(1);
    time.request(5, 1);
    expect(time.update(1)).toBe(1);
  });
});

it('keeps every event in the single bounded tuning table', () => {
  expect(Object.keys(JUICE_TABLE)).toHaveLength(10);
  for (const channel of Object.values(JUICE_TABLE)) {
    expect(channel.particles).toBeLessThanOrEqual(300);
    expect(channel.scale).toBeGreaterThanOrEqual(0.25);
    expect(channel.shake).toBeGreaterThanOrEqual(0);
  }
});

it('binds a fully inert classic sink by default', () => {
  expect(EDITION).toBe('classic');
  silentJuice.emit('jar-hit', 5);
  silentJuice.update(1);
  silentJuice.reset();
  silentJuice.destroy();
  expect(silentJuice.timeScale()).toBe(1);
  expect(silentJuice.getState()).toBeNull();
});
