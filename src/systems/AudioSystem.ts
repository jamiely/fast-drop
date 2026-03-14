import type { AudioEvent, AudioSystemContract } from '../game/types';

interface AudioProfile {
  frequency: number;
  duration: number;
  gain: number;
  type: OscillatorType;
}

// TODO(phase5-gameplay): Replace oscillator placeholders with loaded assets
// and mixer routing while keeping the event-driven `play(event)` contract.
export class AudioSystem implements AudioSystemContract {
  private context: AudioContext | null = null;

  public play(event: AudioEvent): void {
    const context = this.getContext();
    if (!context) {
      console.info(`[AudioSystem] ${event} (placeholder)`);
      return;
    }

    if (context.state === 'suspended') {
      void context.resume();
    }

    const profile = this.getProfile(event);
    const now = context.currentTime;

    const oscillator = context.createOscillator();
    oscillator.type = profile.type;
    oscillator.frequency.setValueAtTime(profile.frequency, now);

    const gainNode = context.createGain();
    gainNode.gain.setValueAtTime(0.0001, now);
    gainNode.gain.exponentialRampToValueAtTime(profile.gain, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(
      0.0001,
      now + profile.duration
    );

    oscillator.connect(gainNode);
    gainNode.connect(context.destination);

    oscillator.start(now);
    oscillator.stop(now + profile.duration + 0.02);
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
        return { frequency: 440, duration: 0.13, gain: 0.05, type: 'triangle' };
      case 'ball-settled':
        return { frequency: 330, duration: 0.12, gain: 0.04, type: 'sine' };
      case 'bonus-awarded':
        return { frequency: 660, duration: 0.2, gain: 0.06, type: 'square' };
      case 'time-warning':
        return { frequency: 220, duration: 0.16, gain: 0.05, type: 'sawtooth' };
      case 'game-over':
        return { frequency: 170, duration: 0.26, gain: 0.06, type: 'triangle' };
      default:
        return { frequency: 440, duration: 0.12, gain: 0.04, type: 'sine' };
    }
  }
}
