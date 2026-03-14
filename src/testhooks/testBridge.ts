import type { TestBridgeContract } from '../game/types';

export type TestBridge = TestBridgeContract;

declare global {
  interface Window {
    __FAST_DROP_TEST_BRIDGE__?: TestBridge;
  }
}

export const normalizeStepFrameCount = (n: number): number => {
  if (!Number.isFinite(n) || n <= 0) {
    return 0;
  }

  return Math.floor(n);
};

export const installTestBridge = (bridge: TestBridge): void => {
  window.__FAST_DROP_TEST_BRIDGE__ = bridge;
};
