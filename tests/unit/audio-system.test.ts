// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AudioSystem } from '../../src/systems/AudioSystem';

interface FakeOscillator {
  type: OscillatorType;
  frequency: { setValueAtTime: ReturnType<typeof vi.fn> };
  connect: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}

interface FakeGain {
  gain: {
    setValueAtTime: ReturnType<typeof vi.fn>;
    exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
  };
  connect: ReturnType<typeof vi.fn>;
}

const installFakeAudioContext = (state: AudioContextState = 'running') => {
  const oscillator: FakeOscillator = {
    type: 'sine',
    frequency: { setValueAtTime: vi.fn() },
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn()
  };

  const gain: FakeGain = {
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn()
    },
    connect: vi.fn()
  };

  const createOscillator = vi.fn(() => oscillator);
  const createGain = vi.fn(() => gain);
  const resume = vi.fn(() => Promise.resolve());

  class FakeAudioContext {
    public static instanceCount = 0;
    public readonly destination = {} as AudioNode;
    public readonly currentTime = 1;
    public state: AudioContextState = state;

    public constructor() {
      FakeAudioContext.instanceCount += 1;
    }

    public readonly resume = resume;
    public readonly createOscillator = createOscillator;
    public readonly createGain = createGain;
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
    createOscillator,
    createGain,
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

  it('plays synthesized sounds and reuses one audio context instance', () => {
    const fake = installFakeAudioContext('suspended');

    const system = new AudioSystem();
    system.play('drop');
    system.play('ball-settled');
    system.play('bonus-awarded');
    system.play('time-warning');
    system.play('game-over');
    system.play('not-a-real-event' as never);

    expect(fake.FakeAudioContext.instanceCount).toBe(1);
    expect(fake.resume).toHaveBeenCalled();
    expect(fake.createOscillator).toHaveBeenCalledTimes(6);
    expect(fake.createGain).toHaveBeenCalledTimes(6);
    expect(fake.oscillator.frequency.setValueAtTime).toHaveBeenCalled();
    expect(fake.gain.gain.exponentialRampToValueAtTime).toHaveBeenCalled();
    expect(fake.oscillator.start).toHaveBeenCalled();
    expect(fake.oscillator.stop).toHaveBeenCalled();
  });

  it('supports webkit audio context fallback', () => {
    const fake = installFakeAudioContext('running');

    Object.defineProperty(window, 'AudioContext', {
      configurable: true,
      writable: true,
      value: undefined
    });
    Object.defineProperty(window, 'webkitAudioContext', {
      configurable: true,
      writable: true,
      value: window.AudioContext ?? fake.FakeAudioContext
    });

    const system = new AudioSystem();
    system.play('drop');

    expect(fake.createOscillator).toHaveBeenCalledTimes(1);
  });
});
