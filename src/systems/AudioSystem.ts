import type { AudioEvent, AudioSystemContract } from '../game/types';

interface AudioProfile {
  frequency: number;
  duration: number;
  gain: number;
  type: OscillatorType;
  slideTo?: number;
  minIntervalMs?: number;
}

export class AudioSystem implements AudioSystemContract {
  private context: AudioContext | null = null;
  private unlocked = false;
  private unlockHandlersInstalled = false;
  private queuedEvents: AudioEvent[] = [];
  private outputNode: AudioNode | null = null;
  private activeVoices = 0;
  private readonly maxConcurrentVoices = 8;
  private readonly lastPlayedAt = new Map<AudioEvent, number>();

  public play(event: AudioEvent): void {
    const context = this.getContext();
    if (!context) {
      console.info(`[AudioSystem] ${event} (placeholder)`);
      return;
    }

    if (!this.unlocked) {
      this.queueEvent(event);
      this.installUnlockHandlers();
      return;
    }

    this.playNow(context, event);
  }

  private queueEvent(event: AudioEvent): void {
    this.queuedEvents.push(event);
    if (this.queuedEvents.length > 12) {
      this.queuedEvents.shift();
    }
  }

  private installUnlockHandlers(): void {
    if (this.unlockHandlersInstalled) {
      return;
    }

    this.unlockHandlersInstalled = true;
    const unlock = (): void => {
      void this.unlockAudio();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      this.unlockHandlersInstalled = false;
    };

    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
  }

  private async unlockAudio(): Promise<void> {
    const context = this.getContext();
    if (!context) {
      return;
    }

    if (context.state === 'suspended') {
      await context.resume();
    }

    this.unlocked = true;

    const queued = [...this.queuedEvents];
    this.queuedEvents = [];
    for (const event of queued) {
      this.playNow(context, event);
    }
  }

  private playNow(context: AudioContext, event: AudioEvent): void {
    const profile = this.getProfile(event);
    const now = context.currentTime;
    const nowMs = now * 1000;

    const lastPlayedAtMs = this.lastPlayedAt.get(event);
    if (
      profile.minIntervalMs !== undefined &&
      lastPlayedAtMs !== undefined &&
      nowMs - lastPlayedAtMs < profile.minIntervalMs
    ) {
      return;
    }

    if (
      this.activeVoices >= this.maxConcurrentVoices &&
      (event === 'drop' || event === 'ball-settled')
    ) {
      return;
    }

    this.lastPlayedAt.set(event, nowMs);

    const oscillator = context.createOscillator();
    oscillator.type = profile.type;
    oscillator.frequency.setValueAtTime(profile.frequency, now);
    if (profile.slideTo) {
      oscillator.frequency.exponentialRampToValueAtTime(
        profile.slideTo,
        now + profile.duration
      );
    }

    const gainNode = context.createGain();
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(profile.gain, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + profile.duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.getOutputNode(context));

    this.activeVoices += 1;
    oscillator.onended = () => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    };

    oscillator.start(now);
    oscillator.stop(now + profile.duration + 0.02);
  }

  private getOutputNode(context: AudioContext): AudioNode {
    if (this.outputNode) {
      return this.outputNode;
    }

    if (typeof context.createDynamicsCompressor === 'function') {
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -18;
      compressor.knee.value = 24;
      compressor.ratio.value = 10;
      compressor.attack.value = 0.003;
      compressor.release.value = 0.2;

      const masterGain = context.createGain();
      masterGain.gain.value = 0.72;

      compressor.connect(masterGain);
      masterGain.connect(context.destination);
      this.outputNode = compressor;
      return this.outputNode;
    }

    this.outputNode = context.destination;
    return this.outputNode;
  }

  private getContext(): AudioContext | null {
    if (this.context) {
      return this.context;
    }

    const ctor = this.getAudioContextCtor();
    if (!ctor) {
      return null;
    }

    this.context = new ctor();
    return this.context;
  }

  private getAudioContextCtor(): (new () => AudioContext) | null {
    const audioGlobal = globalThis as typeof globalThis & {
      AudioContext?: new () => AudioContext;
      webkitAudioContext?: new () => AudioContext;
    };

    return audioGlobal.AudioContext ?? audioGlobal.webkitAudioContext ?? null;
  }

  private getProfile(event: AudioEvent): AudioProfile {
    switch (event) {
      case 'drop':
        return {
          frequency: 530,
          duration: 0.1,
          gain: 0.032,
          type: 'triangle',
          slideTo: 410,
          minIntervalMs: 45
        };
      case 'ball-settled':
        return {
          frequency: 420,
          duration: 0.12,
          gain: 0.04,
          type: 'square',
          slideTo: 520,
          minIntervalMs: 70
        };
      case 'bonus-awarded':
        return {
          frequency: 620,
          duration: 0.22,
          gain: 0.048,
          type: 'sine',
          slideTo: 920,
          minIntervalMs: 150
        };
      case 'time-warning':
        return {
          frequency: 260,
          duration: 0.16,
          gain: 0.038,
          type: 'sawtooth',
          minIntervalMs: 800
        };
      case 'game-over':
        return {
          frequency: 300,
          duration: 0.3,
          gain: 0.045,
          type: 'triangle',
          slideTo: 150,
          minIntervalMs: 1200
        };
      default:
        return { frequency: 440, duration: 0.12, gain: 0.03, type: 'sine' };
    }
  }
}
