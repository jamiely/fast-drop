import type { JuiceSink } from './juice/types';

export const EDITION: 'classic' | 'fever' =
  import.meta.env.VITE_EDITION === 'fever' ? 'fever' : 'classic';

/** No runtime import from juice: the classic build never loads the Fever engine. */
export const silentJuice: JuiceSink = {
  emit: () => {},
  update: () => {},
  timeScale: () => 1,
  reset: () => {},
  getState: () => null,
  destroy: () => {}
};
