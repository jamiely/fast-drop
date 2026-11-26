import { describe, expect, it } from 'vitest';
import {
  BLINK_SECONDS,
  FACE_FRAMES,
  MOOD_SECONDS,
  advanceMascot,
  faceFrame,
  faceMotion,
  initialMascot,
  mascotEvent
} from '../../src/juice/mascot';
import { DROP_RECOIL_SECONDS, dropRecoil } from '../../src/juice/show';

const run = (
  state: ReturnType<typeof initialMascot>,
  seconds: number,
  random = () => 0.5
) => {
  let s = state;
  for (let t = 0; t < seconds; t += 1 / 60)
    s = advanceMascot(s, 1 / 60, random);
  return s;
};

describe('jar mascot moods', () => {
  it('idles with blinks at irregular gaps, each about 120 ms long', () => {
    const start = initialMascot(0);
    expect(faceFrame(start)).toBe('idle');
    const blinking = advanceMascot(start, start.blinkIn + 0.01);
    expect(faceFrame(blinking)).toBe('blink');
    const open = advanceMascot(blinking, BLINK_SECONDS, () => 1);
    expect(faceFrame(open)).toBe('idle');
    expect(open.blinkIn).toBeCloseTo(2.2 + 3.2);
  });

  it('grins and hops on a hit, then settles back to idle', () => {
    const happy = mascotEvent(initialMascot(), 'hit');
    expect(faceFrame(happy)).toBe('happy');
    expect(faceMotion(advanceMascot(happy, 0.1)).lift).toBeGreaterThan(0);
    const later = run(happy, MOOD_SECONDS.happy + 0.05);
    expect(later.mood).toBe('idle');
    expect(faceMotion(later)).toEqual({ lift: 0, squash: 1, tilt: 0 });
  });

  it('looks worried on a near miss, but a grin outranks a scare', () => {
    const worried = mascotEvent(initialMascot(), 'near-miss');
    expect(faceFrame(worried)).toBe('worried');
    expect(run(worried, MOOD_SECONDS.worried + 0.05).mood).toBe('idle');
    const happy = mascotEvent(initialMascot(), 'hit');
    expect(mascotEvent(happy, 'near-miss')).toBe(happy);
    expect(mascotEvent(worried, 'hit').mood).toBe('happy');
  });

  it('cheers at the finale until calmed, and blinks while cheering', () => {
    const cheer = run(mascotEvent(initialMascot(), 'cheer'), 10);
    expect(cheer.mood).toBe('cheer');
    expect(mascotEvent(cheer, 'near-miss')).toBe(cheer);
    expect(['cheer', 'cheer-blink']).toContain(faceFrame(cheer));
    expect(faceFrame({ ...cheer, blinkIn: -0.01 })).toBe('cheer-blink');
    expect(faceMotion({ ...cheer, moodAge: 0.2 }).lift).toBeGreaterThan(0);
    expect(mascotEvent(cheer, 'calm').mood).toBe('idle');
  });

  it('shivers when worried and every mood maps to an atlas frame', () => {
    const worried = {
      ...mascotEvent(initialMascot(), 'near-miss'),
      moodAge: 0.05
    };
    expect(Math.abs(faceMotion(worried).tilt)).toBeGreaterThan(0);
    for (const mood of ['idle', 'happy', 'worried', 'cheer'] as const) {
      for (const blinkIn of [-0.05, 1]) {
        expect(FACE_FRAMES).toContain(
          faceFrame({ mood, moodLeft: 1, moodAge: 0, blinkIn })
        );
      }
    }
  });
});

describe('drop recoil', () => {
  it('squashes the button and rebounds past rest, keeping volume', () => {
    expect(dropRecoil(-1)).toEqual({ y: 1, xz: 1, kick: 0 });
    const squash = dropRecoil(0.001);
    expect(squash.y).toBeLessThan(0.8);
    expect(squash.xz * squash.xz * squash.y).toBeCloseTo(1);
    const ys = Array.from({ length: 30 }, (_, i) => dropRecoil(i / 100).y);
    expect(Math.max(...ys)).toBeGreaterThan(1);
    expect(dropRecoil(DROP_RECOIL_SECONDS)).toEqual({ y: 1, xz: 1, kick: 0 });
  });

  it('kicks the camera fully down within 25 ms, then springs back', () => {
    expect(dropRecoil(0.025).kick).toBeCloseTo(1);
    expect(dropRecoil(0.0125).kick).toBeCloseTo(0.5);
    expect(dropRecoil(0.2).kick).toBeLessThan(0.05);
  });
});
