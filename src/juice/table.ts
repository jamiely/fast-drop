import type { JuiceEvent } from './types';

interface Channels {
  shake: number;
  scale: number;
  seconds: number;
  light: number;
  particles: number;
  text: string;
  color: string;
}

/** Per-event channel strengths. Particle counts are per burst, never multiplied by weight. */
export const JUICE_TABLE: Record<JuiceEvent, Channels> = {
  drop: {
    shake: 0.012,
    scale: 1,
    seconds: 0,
    light: 0.08,
    particles: 12,
    text: '',
    color: '#72efff'
  },
  'rim-bounce': {
    shake: 0.018,
    scale: 0.35,
    seconds: 0.4,
    light: 0.16,
    particles: 28,
    text: '',
    color: '#ffe78a'
  },
  'jar-hit': {
    shake: 0.02,
    scale: 0.25,
    seconds: 0.065,
    light: 0.24,
    particles: 90,
    text: '+10',
    color: '#72efff'
  },
  'bonus-jar': {
    shake: 0.025,
    scale: 0.25,
    seconds: 0.11,
    light: 0.38,
    particles: 150,
    text: 'BONUS!',
    color: '#ffe78a'
  },
  miss: {
    shake: 0,
    scale: 1,
    seconds: 0,
    light: 0.04,
    particles: 10,
    text: 'SO CLOSE',
    color: '#c3b7e9'
  },
  'combo-milestone': {
    shake: 0.025,
    scale: 0.5,
    seconds: 0.5,
    light: 0.28,
    particles: 120,
    text: 'COMBO!',
    color: '#ff85de'
  },
  'fever-start': {
    shake: 0.04,
    scale: 0.25,
    seconds: 0.15,
    light: 0.48,
    particles: 300,
    text: 'FEVER!!',
    color: '#ffe78a'
  },
  'time-warning': {
    shake: 0.008,
    scale: 1,
    seconds: 0,
    light: 0.15,
    particles: 0,
    text: 'HURRY!',
    color: '#ff6a8a'
  },
  'last-ball': {
    shake: 0,
    scale: 0.5,
    seconds: 0.5,
    light: 0.12,
    particles: 25,
    text: '',
    color: '#ffffff'
  },
  'round-end': {
    shake: 0,
    scale: 1,
    seconds: 0,
    light: 0.25,
    particles: 200,
    text: 'ROUND COMPLETE',
    color: '#ffe78a'
  }
};
