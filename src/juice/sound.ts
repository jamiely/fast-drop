import { discoFinale, midiFrequency, type DiscoNote } from './finale';
import type { Heat, JuiceState } from './state';
import type { JuiceEvent } from './types';
import { comboFrequency, heatMusic, VoiceLimit } from './soundLogic';

type Source = OscillatorNode | AudioBufferSourceNode;

/** Procedural only: no assets, timers, or imports from the classic audio system. */
export class FeverSound {
  private context: AudioContext | null = null;
  private filter: BiquadFilterNode | null = null;
  private master: GainNode | null = null;
  private attract = false;
  private noiseBuffer: AudioBuffer | null = null;
  private readonly limit = new VoiceLimit();
  private readonly voices = new Map<symbol, () => void>();
  private queued: Array<[JuiceEvent, JuiceState]> = [];
  private heat: Heat = 'calm';
  private warning = false;
  private ended = false;
  private destroyed = false;
  private nextBeat = 0;
  private beat = 0;
  private dropPitch = 0;

  public constructor() {
    // Install before gameplay's handlers: the first press resumes in the gesture itself.
    window.addEventListener('keydown', this.unlock);
    window.addEventListener('pointerdown', this.unlock);
  }

  private readonly unlock = (): void => {
    if (this.destroyed) return;
    const audioGlobal = globalThis as typeof globalThis & {
      webkitAudioContext?: typeof AudioContext;
    };
    const Ctor = audioGlobal.AudioContext ?? audioGlobal.webkitAudioContext;
    if (!Ctor) return;
    if (!this.context) this.createGraph(new Ctor());
    const context = this.context!;
    void context
      .resume()
      .then(() => {
        if (this.destroyed || context.state !== 'running') return;
        this.removeUnlockHandlers();
        this.nextBeat = context.currentTime;
        const queued = this.queued;
        this.queued = [];
        for (const [event, state] of queued) this.emit(event, state);
      })
      .catch(() => {
        // Keep gesture handlers installed so a later press can retry an interrupted unlock.
      });
  };

  private removeUnlockHandlers(): void {
    window.removeEventListener('keydown', this.unlock);
    window.removeEventListener('pointerdown', this.unlock);
  }

  private createGraph(context: AudioContext): void {
    this.context = context;
    this.filter = context.createBiquadFilter();
    this.filter.type = 'lowpass';
    this.filter.frequency.value = 18000;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -14;
    compressor.knee.value = 6;
    compressor.ratio.value = 20;
    compressor.attack.value = 0.002;
    compressor.release.value = 0.15;
    const master = context.createGain();
    this.master = master;
    // 24 × 0.055 × 0.55 = 0.726 peak budget, with compression for extra headroom.
    master.gain.value = 0.55 * (this.attract ? 0.4 : 1);
    this.filter.connect(compressor);
    compressor.connect(master);
    master.connect(context.destination);
    this.noiseBuffer = context.createBuffer(
      1,
      context.sampleRate,
      context.sampleRate
    );
    const samples = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < samples.length; i += 1)
      samples[i] = Math.random() * 2 - 1;
  }

  private voice(
    source: Source,
    duration: number,
    volume: number,
    at: number,
    color?: BiquadFilterNode,
    attack = 0.006
  ): void {
    const context = this.context!;
    const token = this.limit.acquire();
    if (!token) {
      source.disconnect();
      color?.disconnect();
      return;
    }
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(
      Math.min(0.055, volume),
      at + attack
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(color ?? gain);
    if (color) color.connect(gain);
    gain.connect(this.filter!);
    const release = (): void => {
      source.disconnect();
      color?.disconnect();
      gain.disconnect();
      this.limit.release(token);
      this.voices.delete(token);
    };
    this.voices.set(token, () => {
      source.stop();
      release();
    });
    source.onended = release;
    source.start(at);
    source.stop(at + duration + 0.01);
  }

  private tone(
    frequency: number,
    duration = 0.2,
    volume = 0.04,
    type: OscillatorType = 'sine',
    delay = 0,
    slideTo = frequency
  ): void {
    const context = this.context!;
    const at = context.currentTime + delay;
    const oscillator = context.createOscillator();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, at);
    oscillator.frequency.exponentialRampToValueAtTime(slideTo, at + duration);
    this.voice(oscillator, duration, volume, at);
  }

  private noise(
    duration: number,
    volume: number,
    frequency: number,
    delay = 0
  ): void {
    const context = this.context!;
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const color = context.createBiquadFilter();
    color.type = 'highpass';
    color.frequency.value = frequency;
    this.voice(source, duration, volume, context.currentTime + delay, color);
  }

  /** Band-passed noise whose centre slides from `from` to `to`: air rushing down the tube. */
  private whoosh(
    duration: number,
    volume: number,
    from: number,
    to: number,
    delay = 0
  ): void {
    const context = this.context!;
    const at = context.currentTime + delay;
    const source = context.createBufferSource();
    source.buffer = this.noiseBuffer;
    const color = context.createBiquadFilter();
    color.type = 'bandpass';
    color.Q.value = 1.6;
    color.frequency.setValueAtTime(from, at);
    color.frequency.exponentialRampToValueAtTime(to, at + duration);
    this.voice(source, duration, volume, at, color);
  }

  public tick(): void {
    if (this.context?.state === 'running')
      this.tone(1400, 0.025, 0.008, 'triangle');
  }

  private celebration: {
    at: number;
    score: readonly DiscoNote[];
    note: number;
  } | null = null;

  private discoVoice(note: DiscoNote, at: number): void {
    const context = this.context!;
    for (const midi of note.notes) {
      const layers = note.part === 'horn' ? [0.997, 1.003] : [1];
      for (const detune of layers) {
        const source = context.createOscillator();
        source.type = note.part === 'kick' ? 'sine' : 'sawtooth';
        const frequency =
          note.part === 'kick' ? 145 : midiFrequency(midi) * detune;
        source.frequency.setValueAtTime(frequency, at);
        if (note.part === 'kick')
          source.frequency.exponentialRampToValueAtTime(42, at + note.duration);
        const color = context.createBiquadFilter();
        color.type = note.part === 'wah' ? 'bandpass' : 'lowpass';
        const from = {
          kick: 500,
          bass: 900,
          wah: 500,
          strings: 700,
          horn: 6000,
          chord: 3500
        }[note.part];
        color.frequency.setValueAtTime(from, at);
        color.frequency.exponentialRampToValueAtTime(
          note.part === 'wah' ? 3200 : note.part === 'strings' ? 7000 : from,
          at + note.duration * 0.8
        );
        this.voice(
          source,
          note.duration,
          note.part === 'kick' ? 0.055 : note.part === 'bass' ? 0.035 : 0.009,
          at,
          color,
          note.part === 'strings' ? note.duration * 0.8 : 0.006
        );
      }
    }
  }

  public stopFinale(): void {
    this.celebration = null;
    this.stopVoices();
  }

  public finale(short = false): void {
    if (this.context?.state !== 'running') return;
    this.celebration = {
      at: this.context.currentTime,
      score: discoFinale(short),
      note: 0
    };
    this.stopVoices();
    this.scheduleFinale(this.context.currentTime);
  }

  private scheduleFinale(now: number): void {
    const c = this.celebration;
    if (!c) return;
    while (c.note < c.score.length && c.at + c.score[c.note].at < now + 0.1) {
      const note = c.score[c.note++];
      this.discoVoice(note, Math.max(now, c.at + note.at));
    }
    const last = c.score[c.score.length - 1];
    if (now >= c.at + last.at + last.duration) this.celebration = null;
  }

  public emit(event: JuiceEvent, state: JuiceState): void {
    this.heat = state.heat;
    if (!this.context || this.context.state !== 'running') {
      this.queued.push([event, { ...state }]);
      if (this.queued.length > 12) this.queued.shift();
      return;
    }
    switch (event) {
      case 'jar-hit': {
        const note = comboFrequency(state.combo);
        this.tone(note, 0.65, 0.05);
        this.tone(note * 2.01, 0.3, 0.018, 'sine', 0.012);
        this.dropPitch = Math.max(0, this.dropPitch - 1);
        break;
      }
      case 'miss':
        this.dropPitch = Math.max(0, this.dropPitch - 1);
        this.noise(0.23, 0.018, 2200);
        this.tone(220, 0.2, 0.018, 'triangle', 0, 80);
        break;
      case 'drop': {
        // Four layers: a meaty thunk, a mechanical clack, air down the tube, and the pitch that climbs per ball in flight.
        this.dropPitch += 1;
        const rise = 2 ** (Math.min(12, this.dropPitch) / 12);
        this.tone(150, 0.2, 0.055, 'sine', 0, 42);
        this.tone(100 * rise, 0.14, 0.04, 'triangle', 0, 48);
        this.noise(0.035, 0.03, 3800);
        this.tone(1900, 0.03, 0.016, 'square', 0.012, 1200);
        this.whoosh(0.3, 0.03, 2600, 380, 0.02);
        this.tone(350 * rise, 0.09, 0.02, 'sine', 0.01);
        break;
      }
      case 'rim-bounce':
        this.tone(1760, 0.28, 0.035);
        this.tone(2491, 0.16, 0.018);
        break;
      case 'bonus-jar':
        [523.25, 659.25, 783.99, 1046.5].forEach((note, i) =>
          this.tone(note, 0.45, 0.035, 'triangle', i * 0.035)
        );
        break;
      case 'combo-milestone':
        this.tone(260, 0.4, 0.03, 'sawtooth', 0, 1568);
        this.noise(0.48, 0.045, 3500, 0.4);
        this.tone(100, 0.25, 0.05, 'sine', 0.4, 35);
        break;
      case 'fever-start':
        this.tone(180, 0.8, 0.055, 'sawtooth', 0, 35);
        this.noise(0.8, 0.04, 1800);
        [523.25, 783.99, 1046.5].forEach((note) =>
          this.tone(note, 0.6, 0.03, 'triangle', 0.08)
        );
        this.nextBeat = this.context.currentTime;
        this.beat = 0;
        break;
      case 'time-warning':
        this.warning = true;
        break;
      case 'last-ball':
        for (let i = 0; i < 8; i += 1)
          this.noise(0.06, 0.012 + i * 0.004, 1200, i * 0.07);
        break;
      case 'round-end':
        this.ended = true;
        this.warning = false;
        break;
    }
  }

  public update(state: JuiceState, timeScale: number, realDt: number): void {
    this.heat = state.heat;
    const context = this.context;
    if (!context || context.state !== 'running') return;
    const now = context.currentTime;
    this.scheduleFinale(now);
    this.filter!.frequency.setTargetAtTime(
      timeScale < 0.99 ? 800 : 18000,
      now,
      0.035
    );
    if (this.celebration || this.ended || realDt <= 0) {
      this.nextBeat = now;
      return;
    }
    const music = heatMusic(this.heat, this.warning);
    // Short audio-clock lookahead; never catch up a background tab's missed beats.
    this.nextBeat = Math.max(now, this.nextBeat);
    while (this.nextBeat < now + 0.1) {
      const delay = this.nextBeat - now;
      const step = this.beat % 8;
      const fever = this.heat === 'fever';
      const notes = fever
        ? [523.25, 659.25, 783.99, 1046.5]
        : [523.25, 659.25, 783.99, 659.25];
      this.tone(
        notes[step % 4],
        0.12,
        fever ? 0.025 : 0.014,
        'triangle',
        delay
      );
      if (music.bass && step % 2 === 0)
        this.tone(
          fever && step >= 4 ? 65.41 : 130.81,
          0.2,
          0.04,
          'triangle',
          delay
        );
      if (music.percussion) {
        this.noise(0.045, step % 2 === 0 ? 0.018 : 0.009, 6500, delay);
        if (step % 4 === 0) this.tone(120, 0.15, 0.05, 'sine', delay, 40);
        if (step % 4 === 2) this.noise(0.12, 0.025, 1500, delay);
      }
      this.beat += 1;
      this.nextBeat += 30 / music.bpm;
    }
  }

  /** One beat of the last 10 s, on each whole second the board pulses on: a clock tick and a lub-dub, sharper at 3…1. */
  public countdown(second: number): void {
    if (this.ended || this.context?.state !== 'running') return;
    const final = second <= 3;
    this.tone(final ? 2100 : 1500, 0.04, final ? 0.03 : 0.02, 'square', 0, 900);
    this.tone(65, 0.16, 0.05, 'sine', 0, 42);
    this.tone(80, 0.12, 0.04, 'sine', 0.16, 45);
  }

  private stopVoices(): void {
    for (const stop of this.voices.values()) stop();
  }

  public setAttract(active: boolean): void {
    this.attract = active;
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(
        0.55 * (active ? 0.4 : 1),
        this.context.currentTime,
        0.05
      );
    }
  }

  public reset(): void {
    this.celebration = null;
    this.stopVoices();
    this.queued = [];
    this.heat = 'calm';
    this.warning = false;
    this.ended = false;
    this.beat = 0;
    this.dropPitch = 0;
    this.nextBeat = this.context?.currentTime ?? 0;
  }

  public destroy(): void {
    this.destroyed = true;
    this.reset();
    this.removeUnlockHandlers();
    if (this.context) void this.context.close();
  }
}
