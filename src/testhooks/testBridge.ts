export interface TestBridge {
  dropBall: () => void;
  stepFrames: (frames: number) => void;
}

declare global {
  interface Window {
    __FAST_DROP_TEST_BRIDGE__?: TestBridge;
  }
}

export const installTestBridge = (bridge: TestBridge): void => {
  window.__FAST_DROP_TEST_BRIDGE__ = bridge;
};
