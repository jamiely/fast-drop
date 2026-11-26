import type { Heat } from './state';

/** Pure timing and look of the Fever score board; board.ts only reads these numbers. */

/**
 * Odometer reel positions for `value`, least significant digit first, each in [0, 10): the ones reel turns
 * continuously and every higher reel only turns while the reel below it rolls from 9 to 0.
 */
export const odometer = (value: number, digits: number): number[] => {
  const v = Math.max(0, value);
  const reels: number[] = [];
  for (let k = 0; k < digits; k += 1) {
    const place = 10 ** k;
    const whole = Math.floor(v / place);
    const below = v - whole * place;
    const roll = k === 0 ? below : Math.max(0, below - (place - 1));
    reels.push((whole % 10) + roll);
  }
  return reels;
};

/** Reels shown: four, or more once the score outgrows them. */
export const scoreDigits = (score: number): number =>
  Math.max(4, String(Math.max(0, Math.floor(score))).length);

/** The shown score eases toward the target in about 0.3 s, then snaps. */
export const approachScore = (
  shown: number,
  target: number,
  realDt: number
): number => {
  const next =
    shown + (target - shown) * (1 - Math.exp(-Math.max(0, realDt) * 14));
  return Math.abs(target - next) < 0.5 ? target : next;
};

/** Damped spring for squash, bounce and pops: 1 at rest, `amount` away at age 0. */
export const spring = (
  age: number,
  amount: number,
  decay = 10,
  frequency = 24
): number =>
  age < 0 || age > 1.2
    ? 1
    : 1 - amount * Math.exp(-age * decay) * Math.cos(age * frequency);

/** The board's squash on a jar hit of weight 2–4: y squashes, x keeps the volume, and it dips. */
export const boardBounce = (
  age: number,
  weight: number
): { y: number; x: number; dip: number } => {
  const amount = 0.02 + 0.012 * Math.max(0, Math.min(4, weight));
  const y = spring(age, amount);
  return { y, x: 1 / Math.sqrt(y), dip: (1 - y) * 1.6 };
};

/** Marquee chase per heat: bulbs per second, one lit bulb every `period`, and the unlit glow. */
export const MARQUEE_CHASE: Record<
  Heat,
  { speed: number; period: number; dim: number }
> = {
  calm: { speed: 4, period: 4, dim: 0.22 },
  warm: { speed: 9, period: 3, dim: 0.25 },
  hot: { speed: 18, period: 2, dim: 0.2 },
  fever: { speed: 28, period: 2, dim: 0.35 }
};

export interface ComboLook {
  visible: boolean;
  /** Badge scale: grows with the combo. */
  scale: number;
  /** Shake amplitude, in px at 1050 wide. */
  shake: number;
  color: string;
}

const COMBO_COLOR: Record<Heat, string> = {
  calm: '#72efff',
  warm: '#ffe78a',
  hot: '#ff85de',
  fever: '#ffffff'
};
const COMBO_SHAKE: Record<Heat, number> = {
  calm: 0,
  warm: 1.5,
  hot: 3,
  fever: 4.5
};

/** The board's combo badge: hidden at 0, grows to 1.4× by a 20 combo, shakes and changes colour per tier. */
export const comboLook = (combo: number, heat: Heat): ComboLook => ({
  visible: combo > 0,
  scale: 1 + Math.min(Math.max(0, combo), 20) * 0.02,
  shake: COMBO_SHAKE[heat],
  color: COMBO_COLOR[heat]
});

/** Seconds a "+N" rises from its jar, then flies into the score plate. */
export const POINTS_RISE_SECONDS = 0.42;
export const POINTS_FLY_SECONDS = 0.32;

/** Progress of the fly from the jar to the plate: 0 while rising, eased in (it accelerates into the board), 1 on arrival. */
export const flyProgress = (age: number): number => {
  const t = (age - POINTS_RISE_SECONDS) / POINTS_FLY_SECONDS;
  return t <= 0 ? 0 : t >= 1 ? 1 : t * t;
};

/** A ball tumbling out of the counter, in board units: launched from the hole, one bounce on the lip, then off the front. */
export interface TumbleBall {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  spin: number;
  age: number;
  bounced: boolean;
}

export const TUMBLE_SECONDS = 1.1;
const TUMBLE_GRAVITY = 6;

/** Steps a tumbling ball; it bounces once, at half its speed, where it meets `lip`. False once it is done. */
export const stepTumble = (
  ball: TumbleBall,
  dt: number,
  lip: number
): boolean => {
  ball.age += dt;
  ball.vy -= TUMBLE_GRAVITY * dt;
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;
  ball.z += ball.vz * dt;
  if (!ball.bounced && ball.y <= lip && ball.vy < 0) {
    ball.y = lip;
    ball.vy = -ball.vy * 0.5;
    ball.vz += 0.5;
    ball.bounced = true;
  }
  return ball.age < TUMBLE_SECONDS;
};

/** Ball size through its tumble: pops in, holds, then shrinks away over the last third. */
export const tumbleScale = (age: number): number =>
  age < 0 || age >= TUMBLE_SECONDS
    ? 0
    : Math.min(1, age / 0.06) *
      Math.min(1, ((TUMBLE_SECONDS - age) / TUMBLE_SECONDS) * 3);

export const COUNTDOWN_SECONDS = 10;

/** Heartbeat envelope of the last 10 s: lub on each whole second, a softer dub 0.16 s later; 0 outside. */
export const countdownPulse = (timeRemaining: number): number => {
  if (!(timeRemaining > 0) || timeRemaining > COUNTDOWN_SECONDS) return 0;
  const since = Math.ceil(timeRemaining) - timeRemaining;
  const lub = Math.exp(-since * 9);
  const dub = since >= 0.16 ? 0.6 * Math.exp(-(since - 0.16) * 9) : 0;
  return Math.min(1, lub + dub);
};

/** The whole second (10…1) a step from `previous` to `next` time left crossed, which beats and ticks; else null. */
export const countdownTick = (
  previous: number,
  next: number
): number | null => {
  if (!(next < previous)) return null;
  const second = Math.ceil(next);
  return second >= 1 && second <= COUNTDOWN_SECONDS && previous > second
    ? second
    : null;
};
