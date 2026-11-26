import { describe, expect, it } from 'vitest';
import {
  FOV_PUNCH_SECONDS,
  HEAT_MACHINERY,
  LED_PATTERNS,
  LedDirector,
  MAX_FLASH_HZ,
  blendMachinery,
  counterColumn,
  eventShow,
  heatShow,
  jarSquash,
  maxPunchDegrees,
  punchEnvelope,
  roundedRectPoints
} from '../../src/juice/show';

describe('LED light show', () => {
  it('picks the show for each heat tier: calm cyan chase, warm faster, hot magenta, FEVER rainbow strobe', () => {
    expect(heatShow('calm')).toMatchObject({ pattern: 'chase', strobe: 0 });
    expect(heatShow('calm').palette[0]).toBe('#32f2ff');
    expect(heatShow('warm').pattern).toBe('chase');
    expect(heatShow('warm').speed).toBeGreaterThan(heatShow('calm').speed);
    expect(heatShow('hot').palette[0]).toBe('#ff3fc8');
    expect(heatShow('hot').speed).toBeGreaterThan(heatShow('warm').speed);
    expect(heatShow('fever').pattern).toBe('rainbow');
    expect(heatShow('fever').strobe).toBeGreaterThan(0);
  });

  it('maps celebrations to named patterns and leaves plain hits to the heat show', () => {
    expect(eventShow('bonus-jar', 4)?.frame.pattern).toBe('wipe');
    expect(eventShow('combo-milestone', 3)?.frame.pattern).toBe('strobe');
    expect(eventShow('fever-start', 5)?.frame.pattern).toBe('wipe');
    expect(eventShow('time-warning', 2)?.frame.pattern).toBe('heartbeat');
    expect(eventShow('last-ball', 3)?.frame.pattern).toBe('heartbeat');
    expect(eventShow('round-end', 3)?.frame.pattern).toBe('sparkle');
    expect(eventShow('round-end', 5)?.frame.pattern).toBe('rainbow');
    for (const event of ['drop', 'jar-hit', 'miss', 'rim-bounce'] as const)
      expect(eventShow(event, 2)).toBeNull();
  });

  it('never strobes faster than the photosensitivity limit', () => {
    expect(MAX_FLASH_HZ).toBeLessThanOrEqual(3);
    expect(eventShow('combo-milestone', 3)!.frame.speed).toBeLessThanOrEqual(
      MAX_FLASH_HZ
    );
  });

  it('uses every named pattern somewhere', () => {
    const used = new Set(
      [
        ...(['calm', 'warm', 'hot', 'fever'] as const).map(
          (heat) => heatShow(heat).pattern
        ),
        ...(
          [
            'bonus-jar',
            'combo-milestone',
            'fever-start',
            'time-warning',
            'last-ball',
            'round-end'
          ] as const
        ).flatMap((event) => [
          eventShow(event, 3)?.frame.pattern,
          eventShow(event, 5)?.frame.pattern
        ])
      ].filter(Boolean)
    );
    expect([...used].sort()).toEqual([...LED_PATTERNS].sort());
  });

  it('lets a celebration override the heat show until it expires, then falls back', () => {
    const director = new LedDirector();
    expect(director.update(0.1, 'calm').pattern).toBe('chase');
    director.trigger('combo-milestone', 3);
    expect(director.update(0.2, 'warm').pattern).toBe('strobe');
    director.trigger('jar-hit', 2);
    expect(director.update(0.2, 'warm').pattern).toBe('strobe');
    expect(director.update(0.2, 'warm')).toBe(heatShow('warm'));
    director.trigger('time-warning', 2);
    director.reset();
    expect(director.update(0, 'fever')).toBe(heatShow('fever'));
  });
});

describe('Machinery by heat', () => {
  it('escalates every channel from calm to FEVER, with the marquee off until hot', () => {
    const tiers = (['calm', 'warm', 'hot', 'fever'] as const).map(
      (heat) => HEAT_MACHINERY[heat]
    );
    for (let i = 1; i < tiers.length; i += 1) {
      for (const key of Object.keys(tiers[i]) as Array<
        keyof (typeof tiers)[number]
      >)
        expect(tiers[i][key]).toBeGreaterThanOrEqual(tiers[i - 1][key]);
    }
    expect(HEAT_MACHINERY.calm.marquee).toBe(0);
    expect(HEAT_MACHINERY.warm.marquee).toBe(0);
    expect(HEAT_MACHINERY.hot.marquee).toBeGreaterThan(0);
    expect(HEAT_MACHINERY.fever.bloom).toBeLessThanOrEqual(1);
  });

  it('blends toward the tier instead of popping, and holds still with no time', () => {
    const calm = HEAT_MACHINERY.calm;
    expect(blendMachinery(calm, 'fever', 0)).toEqual(calm);
    const half = blendMachinery(calm, 'fever', 0.1);
    expect(half.spin).toBeGreaterThan(calm.spin);
    expect(half.spin).toBeLessThan(HEAT_MACHINERY.fever.spin);
    const settled = blendMachinery(calm, 'fever', 10);
    expect(settled.spin).toBeCloseTo(HEAT_MACHINERY.fever.spin, 5);
  });
});

describe('Camera FOV punch', () => {
  it('attacks in 20 ms, releases by 100 ms and is zero outside', () => {
    expect(punchEnvelope(-0.01)).toBe(0);
    expect(punchEnvelope(0)).toBe(0);
    expect(punchEnvelope(0.01)).toBeCloseTo(0.5);
    expect(punchEnvelope(0.02)).toBe(1);
    expect(punchEnvelope(0.06)).toBeGreaterThan(0);
    expect(punchEnvelope(0.06)).toBeLessThan(1);
    expect(punchEnvelope(FOV_PUNCH_SECONDS)).toBe(0);
    expect(punchEnvelope(Infinity)).toBe(0);
  });

  it('caps the punch so the portrait fit stays in frame', () => {
    const degrees = maxPunchDegrees(55, 0.94, 0.985);
    expect(degrees).toBeLessThan(0);
    expect(degrees).toBeGreaterThan(-3);
    const half = (55 * Math.PI) / 360;
    const narrowed = ((55 + degrees) * Math.PI) / 360;
    expect((0.94 * Math.tan(half)) / Math.tan(narrowed)).toBeCloseTo(0.985, 6);
    // A full −3° would push the fitted edge out of frame.
    expect(
      (0.94 * Math.tan(half)) / Math.tan(((55 - 3) * Math.PI) / 360)
    ).toBeGreaterThan(1);
  });
});

describe('Jar squash and stretch', () => {
  it('starts squashed, springs back to rest and keeps the volume', () => {
    expect(jarSquash(0).y).toBeCloseTo(0.7);
    expect(jarSquash(-1)).toEqual({ xz: 1, y: 1 });
    expect(jarSquash(0.7)).toEqual({ xz: 1, y: 1 });
    for (const age of [0, 0.05, 0.12, 0.3]) {
      const { xz, y } = jarSquash(age);
      expect(xz * xz * y).toBeCloseTo(1, 6);
    }
    // Overshoots into a stretch on the rebound.
    expect(
      Math.max(...[0.08, 0.1, 0.12, 0.14].map((age) => jarSquash(age).y))
    ).toBeGreaterThan(1);
  });
});

describe('Ball counter column', () => {
  it('shows the fraction of balls left and shrinks the bottom ball out as it drains', () => {
    expect(counterColumn(50, 50, 16)).toEqual({ count: 16, slide: 0 });
    expect(counterColumn(0, 50, 16)).toEqual({ count: 0, slide: 0 });
    const one = counterColumn(49, 50, 16);
    expect(one.count).toBe(16);
    expect(one.slide).toBeCloseTo(0.32);
    expect(counterColumn(25, 50, 16)).toEqual({ count: 8, slide: 0 });
    expect(counterColumn(80, 50, 16).count).toBe(16);
    expect(counterColumn(-3, 50, 16).count).toBe(0);
  });
});

describe('Marquee bulbs', () => {
  it('spaces bulbs evenly round a rounded rectangle, inside its bounds', () => {
    const points = roundedRectPoints(4, 2, 0.4, 40);
    expect(points).toHaveLength(40);
    expect(points[0][0]).toBeCloseTo(-1.6);
    expect(points[0][1]).toBeCloseTo(1);
    for (const [x, y] of points) {
      expect(Math.abs(x)).toBeLessThanOrEqual(2 + 1e-9);
      expect(Math.abs(y)).toBeLessThanOrEqual(1 + 1e-9);
    }
    const gaps = points.map((p, i) => {
      const q = points[(i + 1) % points.length];
      return Math.hypot(q[0] - p[0], q[1] - p[1]);
    });
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeLessThan(0.02);
    // A zero radius gives sharp corners and still stays on the edge.
    expect(roundedRectPoints(2, 2, 0, 4)).toEqual([
      [-1, 1],
      [1, 1],
      [1, -1],
      [-1, -1]
    ]);
  });
});
