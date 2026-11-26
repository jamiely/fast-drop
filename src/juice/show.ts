import type { Heat } from './state';
import type { JuiceEvent } from './types';

/** Pure light-show and machinery direction. The visual modules only read these numbers. */
export const LED_PATTERNS = [
  'chase',
  'sparkle',
  'wipe',
  'strobe',
  'rainbow',
  'heartbeat'
] as const;
export type LedPattern = (typeof LED_PATTERNS)[number];

export interface LedFrame {
  pattern: LedPattern;
  /** Pattern cycles per second. */
  speed: number;
  palette: readonly [string, string, string, string];
  /** 0–1 whole-ring flicker layered over the pattern. */
  strobe: number;
}

const CYAN = ['#32f2ff', '#6fd9ff', '#7b73ff', '#32f2ff'] as const;
const WARM = ['#ffe78a', '#32f2ff', '#ffb547', '#6fd9ff'] as const;
const MAGENTA = ['#ff3fc8', '#ff85de', '#b04bff', '#ff6bc9'] as const;
const GOLD = ['#ffe78a', '#ffffff', '#ffb547', '#ffe78a'] as const;
const ALARM = ['#ff2f5e', '#ff6a8a', '#ff2f5e', '#ff6a8a'] as const;

const HEAT_SHOWS: Record<Heat, LedFrame> = {
  calm: { pattern: 'chase', speed: 0.25, palette: CYAN, strobe: 0 },
  warm: { pattern: 'chase', speed: 0.7, palette: WARM, strobe: 0 },
  hot: { pattern: 'chase', speed: 1.1, palette: MAGENTA, strobe: 0 },
  fever: { pattern: 'rainbow', speed: 0.9, palette: MAGENTA, strobe: 0.45 }
};

export const heatShow = (heat: Heat): LedFrame => HEAT_SHOWS[heat];

/** Flashes per second of the strobe pattern and of the ring-wide strobe layer (ledShow.ts). */
export const MAX_FLASH_HZ = 3;

/** A celebration that takes over the ring for a moment, or null when the event only adds a burst. */
export const eventShow = (
  event: JuiceEvent,
  weight: number
): { frame: LedFrame; seconds: number } | null => {
  switch (event) {
    case 'bonus-jar':
      return {
        frame: { pattern: 'wipe', speed: 1.6, palette: GOLD, strobe: 0 },
        seconds: 0.7
      };
    case 'combo-milestone':
      return {
        // Strobes never exceed 3 flashes a second (WCAG 2.3.1 general flash threshold).
        frame: { pattern: 'strobe', speed: 3, palette: MAGENTA, strobe: 0 },
        seconds: 0.5
      };
    case 'fever-start':
      return {
        frame: { pattern: 'wipe', speed: 2.2, palette: GOLD, strobe: 0.6 },
        seconds: 0.5
      };
    case 'time-warning':
      return {
        frame: { pattern: 'heartbeat', speed: 1.4, palette: ALARM, strobe: 0 },
        seconds: 2.2
      };
    case 'last-ball':
      return {
        frame: { pattern: 'heartbeat', speed: 1.8, palette: GOLD, strobe: 0 },
        seconds: 1.6
      };
    case 'round-end':
      return {
        frame: {
          pattern: weight >= 5 ? 'rainbow' : 'sparkle',
          speed: 1.2,
          palette: GOLD,
          strobe: weight >= 5 ? 0.3 : 0
        },
        seconds: 3
      };
    default:
      return null;
  }
};

/** Heat sets the base show; celebrations override it until they expire. A later celebration replaces an earlier one. */
export class LedDirector {
  private override: { frame: LedFrame; remaining: number } | null = null;

  public trigger(event: JuiceEvent, weight: number): void {
    const show = eventShow(event, weight);
    if (show) this.override = { frame: show.frame, remaining: show.seconds };
  }

  public update(realDt: number, heat: Heat): LedFrame {
    if (this.override) {
      this.override.remaining -= Math.max(0, realDt);
      if (this.override.remaining > 0) return this.override.frame;
      this.override = null;
    }
    return heatShow(heat);
  }

  public reset(): void {
    this.override = null;
  }
}

export interface HeatMachinery {
  /** UnrealBloomPass strength. */
  bloom: number;
  /** Pinwheel turns per second. */
  spin: number;
  /** Piston strokes per second and stroke height in world units. */
  pump: number;
  stroke: number;
  /** Beacon turns per second. */
  beacon: number;
  /** Marquee around the status display: 0 off, 1 full. */
  marquee: number;
}

export const HEAT_MACHINERY: Record<Heat, HeatMachinery> = {
  calm: {
    bloom: 0.35,
    spin: 0.15,
    pump: 0.5,
    stroke: 0.04,
    beacon: 0.25,
    marquee: 0
  },
  warm: {
    bloom: 0.5,
    spin: 0.5,
    pump: 1.1,
    stroke: 0.08,
    beacon: 0.6,
    marquee: 0
  },
  hot: {
    bloom: 0.7,
    spin: 1.1,
    pump: 1.8,
    stroke: 0.13,
    beacon: 1.1,
    marquee: 0.7
  },
  fever: {
    bloom: 0.95,
    spin: 2.4,
    pump: 3,
    stroke: 0.18,
    beacon: 2,
    marquee: 1
  }
};

/** Glow colour of the machinery per heat; FEVER cycles the hue instead. */
export const HEAT_COLOR: Record<Heat, string> = {
  calm: '#32f2ff',
  warm: '#ffe78a',
  hot: '#ff3fc8',
  fever: '#ffffff'
};

/** Exponential approach of every machinery number toward the heat's target, so tiers blend instead of popping. */
export const blendMachinery = (
  current: HeatMachinery,
  heat: Heat,
  realDt: number,
  rate = 4
): HeatMachinery => {
  const target = HEAT_MACHINERY[heat];
  const k = 1 - Math.exp(-Math.max(0, realDt) * rate);
  const next = { ...current };
  for (const key of Object.keys(target) as Array<keyof HeatMachinery>) {
    next[key] = current[key] + (target[key] - current[key]) * k;
  }
  return next;
};

export const FOV_PUNCH_DEGREES = -3;
export const FOV_PUNCH_SECONDS = 0.1;
const FOV_PUNCH_ATTACK = 0.02;

/** 0→1 in 20 ms, then eases back to 0 by 100 ms; 0 outside. */
export const punchEnvelope = (age: number): number => {
  if (age < 0 || age >= FOV_PUNCH_SECONDS) return 0;
  if (age < FOV_PUNCH_ATTACK) return age / FOV_PUNCH_ATTACK;
  const release =
    (age - FOV_PUNCH_ATTACK) / (FOV_PUNCH_SECONDS - FOV_PUNCH_ATTACK);
  return (1 - release) * (1 - release);
};

/**
 * The narrowest FOV delta (negative, in degrees) that keeps a camera fitted to ±`margin` NDC inside ±`limit`.
 * Narrowing the FOV scales every projected point by tan(fov/2) / tan((fov+delta)/2).
 */
export const maxPunchDegrees = (
  fov: number,
  margin: number,
  limit = 0.98
): number => {
  const half = (fov * Math.PI) / 360;
  const zoom = limit / margin;
  const narrowed = Math.atan(Math.tan(half) / zoom);
  return ((narrowed - half) * 360) / Math.PI;
};

/** Squash-and-stretch for a hit jar: a damped spring that keeps the jar's volume (xz = 1/√y). */
export const jarSquash = (age: number): { xz: number; y: number } => {
  if (age < 0 || age > 0.6) return { xz: 1, y: 1 };
  const y = 1 - 0.3 * Math.exp(-age * 9) * Math.cos(age * 26);
  return { xz: 1 / Math.sqrt(y), y };
};

export const DROP_RECOIL_SECONDS = 0.32;

/**
 * Drop recoil at `age` seconds after a press: the button squashes flat and rebounds past rest (y, xz keep its
 * volume), and the camera dips down by `kick` (0–1 of the kick distance) and springs back.
 */
export const dropRecoil = (
  age: number
): { y: number; xz: number; kick: number } => {
  if (age < 0 || age >= DROP_RECOIL_SECONDS) return { y: 1, xz: 1, kick: 0 };
  const y = 1 - 0.26 * Math.exp(-age * 14) * Math.cos(age * 30);
  const kick = age < 0.025 ? age / 0.025 : Math.exp(-(age - 0.025) * 18);
  return { y, xz: 1 / Math.sqrt(y), kick };
};

/** `count` evenly spaced points (x, y) around a rounded rectangle centred on the origin, clockwise from top-left. */
export const roundedRectPoints = (
  width: number,
  height: number,
  radius: number,
  count: number
): Array<[number, number]> => {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  const sx = width - 2 * r;
  const sy = height - 2 * r;
  const arc = (Math.PI / 2) * r;
  const perimeter = 2 * (sx + sy) + 4 * arc;
  // Straight edges then corner arcs, clockwise from the top edge's left end.
  const segments: Array<{
    length: number;
    at: (u: number) => [number, number];
  }> = [];
  const corner = (cx: number, cy: number, start: number) => ({
    length: arc,
    at: (u: number): [number, number] => [
      cx + r * Math.cos(start - u * (Math.PI / 2)),
      cy + r * Math.sin(start - u * (Math.PI / 2))
    ]
  });
  const hx = width / 2;
  const hy = height / 2;
  segments.push(
    { length: sx, at: (u) => [-hx + r + u * sx, hy] },
    corner(hx - r, hy - r, Math.PI / 2),
    { length: sy, at: (u) => [hx, hy - r - u * sy] },
    corner(hx - r, -hy + r, 0),
    { length: sx, at: (u) => [hx - r - u * sx, -hy] },
    corner(-hx + r, -hy + r, -Math.PI / 2),
    { length: sy, at: (u) => [-hx, -hy + r + u * sy] },
    corner(-hx + r, hy - r, Math.PI)
  );
  const points: Array<[number, number]> = [];
  for (let i = 0; i < count; i += 1) {
    let distance = (i / count) * perimeter;
    for (const segment of segments) {
      if (distance <= segment.length || segment === segments.at(-1)) {
        points.push(
          segment.at(
            segment.length > 0 ? Math.min(1, distance / segment.length) : 0
          )
        );
        break;
      }
      distance -= segment.length;
    }
  }
  return points;
};

/**
 * Ball-counter column. Fifty real balls don't fit a readable tube, so it holds `slots` and its level is the
 * fraction left: every drop lowers the column by slots/total of a ball, so it visibly drains over the round.
 * Returns the balls to show and how far (0–1) the bottom one has shrunk out of the tube.
 */
export const counterColumn = (
  ballsLeft: number,
  total: number,
  slots: number
): { count: number; slide: number } => {
  const level =
    (Math.max(0, Math.min(total, ballsLeft)) / Math.max(1, total)) * slots;
  const count = Math.max(0, Math.ceil(level - 1e-6));
  return { count, slide: count - level };
};
