import type { Heat, JuiceState } from './state';
import type { JuiceEvent } from './types';
import { comboFrequency, heatMusic, VoiceLimit } from './soundLogic';

type Source = OscillatorNode | AudioBufferSourceNode;

/** Procedural only: no assets, timers, or imports from the classic audio system. */
export class FeverSound {
  private context: AudioContext | null = null;
  private filter: BiquadFilterNode | null = null;
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
  private nextHeart = 0;
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
    // 24 × 0.055 × 0.55 = 0.726 peak budget, with compression for extra headroom.
    master.gain.value = 0.55;
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
    color?: BiquadFilterNode
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
    gain.gain.exponentialRampToValueAtTime(Math.min(0.055, volume), at + 0.006);
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
      case 'drop':
        this.dropPitch += 1;
        this.tone(
          100 * 2 ** (Math.min(12, this.dropPitch) / 12),
          0.14,
          0.05,
          'triangle',
          0,
          48
        );
        this.tone(
          350 * 2 ** (Math.min(12, this.dropPitch) / 12),
          0.09,
          0.022,
          'sine'
        );
        break;
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
        this.nextHeart = this.context.currentTime;
        break;
      case 'last-ball':
        for (let i = 0; i < 8; i += 1)
          this.noise(0.06, 0.012 + i * 0.004, 1200, i * 0.07);
        break;
      case 'round-end':
        this.stopVoices();
        this.ended = true;
        this.warning = false;
        for (let i = 0; i < 8; i += 1)
          this.tone(700 + i * 100, 0.06, 0.03, 'square', i * 0.09);
        this.noise(0.8, 0.05, 4500, 0.8);
        this.tone(1046.5, 0.7, 0.03, 'triangle', 0.8);
        break;
    }
  }

  public update(state: JuiceState, timeScale: number, realDt: number): void {
    this.heat = state.heat;
    const context = this.context;
    if (!context || context.state !== 'running') return;
    const now = context.currentTime;
    this.filter!.frequency.setTargetAtTime(
      timeScale < 0.99 ? 800 : 18000,
      now,
      0.035
    );
    if (this.ended || realDt <= 0) {
      this.nextBeat = now;
      this.nextHeart = now;
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
    if (this.warning && now >= this.nextHeart) {
      this.tone(65, 0.16, 0.05, 'sine', 0, 42);
      this.tone(80, 0.12, 0.04, 'sine', 0.16, 45);
      this.nextHeart = now + 0.65;
    }
  }

  private stopVoices(): void {
    for (const stop of this.voices.values()) stop();
  }

  public reset(): void {
    this.stopVoices();
    this.queued = [];
    this.heat = 'calm';
    this.warning = false;
    this.ended = false;
    this.beat = 0;
    this.dropPitch = 0;
    this.nextBeat = this.context?.currentTime ?? 0;
    this.nextHeart = 0;
  }

  public destroy(): void {
    this.destroyed = true;
    this.reset();
    this.removeUnlockHandlers();
    if (this.context) void this.context.close();
  }
}
