import type { Vector3 } from 'three';
import type { JuiceState } from './state';

export type JuiceEvent =
  | 'drop'
  | 'rim-bounce'
  | 'jar-hit'
  | 'bonus-jar'
  | 'miss'
  | 'combo-milestone'
  | 'fever-start'
  | 'time-warning'
  | 'last-ball'
  | 'round-end';

export interface JuiceSink {
  emit(event: JuiceEvent, weight: number, worldPos?: Vector3): void;
  update(realDt: number): void;
  timeScale(): number;
  reset(): void;
  getState(): JuiceState | null;
  destroy(): void;
}
