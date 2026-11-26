import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  comboFrequency,
  comboSemitone,
  heatMusic,
  VoiceLimit
} from '../../src/juice/soundLogic';
import { FeverSound } from '../../src/juice/sound';
import { hit, initialJuiceState, miss } from '../../src/juice/state';

afterEach(() => vi.unstubAllGlobals());

describe('Fever musical logic', () => {
  it('climbs a pentatonic scale, starts again after a miss, and caps the top octave', () => {
    expect(Array.from({ length: 6 }, (_, i) => comboSemitone(i + 1))).toEqual([
      0, 2, 4, 7, 9, 12
    ]);
    expect(comboSemitone(0)).toBe(0);
    expect(comboSemitone(-3)).toBe(0);
    expect(comboSemitone(1.9)).toBe(0);
    expect(comboSemitone(16)).toBe(36);
    expect(comboSemitone(100)).toBe(36);
    expect(comboFrequency(6)).toBeCloseTo(comboFrequency(1) * 2);
    let state = initialJuiceState();
    for (let i = 0; i < 6; i += 1) state = hit(state);
    expect(comboFrequency(hit(miss(state)).combo)).toBe(523.25);
  });

  it('adds percussion at warm, bass at hot, and a faster Fever/warning tempo', () => {
    expect(heatMusic('calm')).toEqual({
      bpm: 88,
      pulse: true,
      bass: false,
      percussion: false
    });
    expect(heatMusic('warm')).toEqual({
      bpm: 112,
      pulse: true,
      bass: false,
      percussion: true
    });
    expect(heatMusic('hot')).toEqual({
      bpm: 136,
      pulse: true,
      bass: true,
      percussion: true
    });
    expect(heatMusic('fever')).toEqual({
      bpm: 164,
      pulse: true,
      bass: true,
      percussion: true
    });
    expect(heatMusic('fever', true).bpm).toBe(176);
  });

  it('counts scheduled voices too, refuses overflow, and safely releases after reset', () => {
    const limit = new VoiceLimit(2);
    const first = limit.acquire()!;
    const second = limit.acquire()!;
    expect(limit.active).toBe(2);
    expect(limit.acquire()).toBeNull();
    limit.release(first);
    limit.release(first);
    expect(limit.active).toBe(1);
    const replacement = limit.acquire()!;
    expect(replacement).not.toBe(first);
    expect(limit.acquire()).toBeNull();
    limit.release(second);
    limit.release(replacement);
    expect(limit.active).toBe(0);
    const defaultLimit = new VoiceLimit();
    for (let i = 0; i < 24; i += 1)
      expect(defaultLimit.acquire()).not.toBeNull();
    expect(defaultLimit.acquire()).toBeNull();
  });
});

it('unlocks on the first key and bounds/cleans scheduled sources with a minimal AudioContext', async () => {
  const param = () => ({
    value: 0,
    setValueAtTime: vi.fn(),
    exponentialRampToValueAtTime: vi.fn(),
    setTargetAtTime: vi.fn()
  });
  const node = () => ({ connect: vi.fn(), disconnect: vi.fn() });
  const sourceNode = () => ({
    ...node(),
    frequency: param(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null
  });
  const sources: Array<ReturnType<typeof sourceNode>> = [];
  const source = () => {
    const value = sourceNode();
    sources.push(value);
    return value;
  };
  const gains: Array<ReturnType<typeof param>> = [];
  const context = {
    state: 'suspended',
    currentTime: 0,
    sampleRate: 128,
    destination: node(),
    resume: vi.fn(() => {
      context.state = 'running';
      return Promise.resolve();
    }),
    close: vi.fn(() => Promise.resolve()),
    createBiquadFilter: () => ({ ...node(), frequency: param() }),
    createDynamicsCompressor: () => ({
      ...node(),
      threshold: param(),
      knee: param(),
      ratio: param(),
      attack: param(),
      release: param()
    }),
    createGain: () => {
      const gain = param();
      gains.push(gain);
      return { ...node(), gain };
    },
    createBuffer: () => ({ getChannelData: () => new Float32Array(128) }),
    createOscillator: source,
    createBufferSource: source
  };
  const target = new EventTarget();
  vi.stubGlobal('window', target);
  vi.stubGlobal(
    'AudioContext',
    class {
      constructor() {
        return context;
      }
    }
  );
  const sound = new FeverSound();
  sound.setAttract(true); // Demo may start before audio is unlocked.
  const state = initialJuiceState();
  sound.emit('jar-hit', { ...state, combo: 1 });
  expect(context.resume).not.toHaveBeenCalled();
  target.dispatchEvent(new Event('keydown'));
  await Promise.resolve();
  expect(context.state).toBe('running');
  expect(gains[0].value).toBeCloseTo(0.55 * 0.4);
  sound.setAttract(false);
  expect(gains[0].setTargetAtTime).toHaveBeenLastCalledWith(0.55, 0, 0.05);
  sound.setAttract(true);
  expect(gains[0].setTargetAtTime).toHaveBeenLastCalledWith(
    0.55 * 0.4,
    0,
    0.05
  );
  expect(sources.filter((s) => s.start.mock.calls.length)).toHaveLength(2);
  for (let i = 0; i < 30; i += 1)
    sound.emit('jar-hit', { ...state, combo: i + 1 });
  expect(sources.filter((s) => s.start.mock.calls.length)).toHaveLength(24);
  sound.reset();
  expect(sources.filter((s) => s.disconnect.mock.calls.length)).toHaveLength(
    sources.length
  );
  const before = sources.length;
  sound.update({ ...state, heat: 'hot' }, 0.25, 1 / 60);
  expect(sources.length).toBeGreaterThan(before);
  sound.destroy();
  expect(context.close).toHaveBeenCalledOnce();
});
