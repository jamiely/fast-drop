import { describe, expect, it } from 'vitest';
import { normalizeStepFrameCount } from '../../src/testhooks/testBridge';

describe('test bridge helpers', () => {
  it('normalizes frame step requests for deterministic stepping', () => {
    expect(normalizeStepFrameCount(5)).toBe(5);
    expect(normalizeStepFrameCount(4.9)).toBe(4);
    expect(normalizeStepFrameCount(0)).toBe(0);
    expect(normalizeStepFrameCount(-3)).toBe(0);
    expect(normalizeStepFrameCount(Number.NaN)).toBe(0);
  });
});
