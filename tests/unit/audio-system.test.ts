// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioSystem } from '../../src/systems/AudioSystem';

interface FakeOscillator {
  type: OscillatorType;
  frequency: {
    setValueAtTime: ReturnType<typeof vi.fn>;
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
}

interface FakeGain {
  gain: {
    value: number;
    setValueAtTime: ReturnType<typeof vi.fn>;
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
  connect: ReturnType<typeof vi.fn>;
}

interface FakeCompressor {
  threshold: { value: number };
  knee: { value: number };
  ratio: { value: number };
  attack: { value: number };
  release: { value: number };
  connect: ReturnType<typeof vi.fn>;
}

const installFakeAudioContext = (state: AudioContextState = 'running') => {
  const oscillator: FakeOscillator = {
    type: 'sine',
    frequency: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn()
    },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null
  };

  const gain: FakeGain = {
    gain: {
      value: 1,
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn()
    },
    connect: vi.fn()
  };

  const compressor: FakeCompressor = {
    threshold: { value: 0 },
    knee: { value: 0 },
    ratio: { value: 0 },
    attack: { value: 0 },
    release: { value: 0 },
    connect: vi.fn()
  };

  const createOscillator = vi.fn(() => oscillator);
  const createGain = vi.fn(() => gain);
  const createDynamicsCompressor = vi.fn(() => compressor);
  const resume = vi.fn(() => Promise.resolve());

  class FakeAudioContext {
    public static instanceCount = 0;
    public static nowSeconds = 1;
    public readonly destination = {} as AudioNode;
    public state: AudioContextState = state;

    public constructor() {
      FakeAudioContext.instanceCount += 1;
    }

    public get currentTime(): number {
      return FakeAudioContext.nowSeconds;
    }

    public readonly resume = resume;
    public readonly createOscillator = createOscillator;
    public readonly createGain = createGain;
    public readonly createDynamicsCompressor = createDynamicsCompressor;
  }

  Object.defineProperty(window, 'AudioContext', {
    configurable: true,
    writable: true,
    value: FakeAudioContext
  });
  Object.defineProperty(window, 'webkitAudioContext', {
    configurable: true,
    writable: true,
    value: undefined
  });

  return {
    oscillator,
    gain,
    compressor,
    createOscillator,
    createGain,
    createDynamicsCompressor,
    resume,
    FakeAudioContext
  };
};

describe('AudioSystem', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to placeholder log when no audio context is available', () => {
    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: undefined
    });
    Object.defineProperty(window, 'webkitAudioContext', {
      configurable: true,
      writable: true,
      value: undefined
    });

    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    new AudioSystem().play('drop');
    expect(infoSpy).toHaveBeenCalledWith('[AudioSystem] drop (placeholder)');
  });

  it('queues until first interaction and then plays queued sounds', async () => {
    const fake = installFakeAudioContext('suspended');

    const system = new AudioSystem();
    system.play('drop');
    system.play('ball-settled');

    expect(fake.createOscillator).toHaveBeenCalledTimes(0);

    window.dispatchEvent(new PointerEvent('pointerdown'));
    await Promise.resolve();

    expect(fake.FakeAudioContext.instanceCount).toBe(1);
    expect(fake.resume).toHaveBeenCalled();
    expect(fake.createOscillator).toHaveBeenCalledTimes(2);
    expect(fake.createGain).toHaveBeenCalledTimes(3);
    expect(fake.createDynamicsCompressor).toHaveBeenCalledTimes(1);
    expect(fake.oscillator.frequency.setValueAtTime).toHaveBeenCalled();
    expect(fake.gain.gain.exponentialRampToValueAtTime).toHaveBeenCalled();
    expect(fake.oscillator.start).toHaveBeenCalled();
    expect(fake.oscillator.stop).toHaveBeenCalled();
  });

  it('supports webkit audio context fallback', async () => {
    const fake = installFakeAudioContext('running');

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: undefined
    });
    Object.defineProperty(window, 'webkitAudioContext', {
      configurable: true,
      writable: true,
      value: fake.FakeAudioContext
    });

    const system = new AudioSystem();
    system.play('drop');
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    await Promise.resolve();

    expect(fake.createOscillator).toHaveBeenCalledTimes(1);
  });

  it('throttles repeated events inside minimum interval', async () => {
    const fake = installFakeAudioContext('running');
    const system = new AudioSystem();

    system.play('drop');
    window.dispatchEvent(new PointerEvent('pointerdown'));
    await Promise.resolve();

    expect(fake.createOscillator).toHaveBeenCalledTimes(1);

    system.play('drop');
    expect(fake.createOscillator).toHaveBeenCalledTimes(1);

    fake.FakeAudioContext.nowSeconds = 1.1;
    system.play('drop');
    expect(fake.createOscillator).toHaveBeenCalledTimes(2);
  });
});
