export type Heat = 'calm' | 'warm' | 'hot' | 'fever';

export interface JuiceState {
  combo: number;
  multiplier: 1 | 2 | 3;
  heat: Heat;
  meter: number;
  feverRemaining: number;
  orbitScale: 1 | 1.25;
}

export const initialJuiceState = (): JuiceState => ({
  combo: 0,
  multiplier: 1,
  heat: 'calm',
  meter: 0,
  feverRemaining: 0,
  orbitScale: 1
});

const tier = (combo: number): Heat =>
  combo >= 10 ? 'hot' : combo >= 5 ? 'warm' : 'calm';

const derive = (state: JuiceState): JuiceState => ({
  ...state,
  multiplier:
    state.feverRemaining > 0 || state.combo >= 10
      ? 3
      : state.combo >= 5
        ? 2
        : 1,
  heat: state.feverRemaining > 0 ? 'fever' : tier(state.combo),
  orbitScale: state.feverRemaining > 0 ? 1.25 : 1
});

/** Immutable transitions; only jar hits advance combo/meter, never bonus celebrations. */
export const hit = (state: JuiceState): JuiceState => {
  const combo = state.combo + 1;
  const meter = Math.min(1, state.meter + 1 / 15);
  const starts =
    state.feverRemaining <= 0 && (combo === 15 || meter >= 1 - Number.EPSILON);
  return derive({
    ...state,
    combo,
    meter: starts || state.feverRemaining > 0 ? 0 : meter,
    feverRemaining: starts ? 6 : state.feverRemaining
  });
};

export const miss = (state: JuiceState): JuiceState =>
  derive({ ...state, combo: 0, meter: 0 });

export const advance = (state: JuiceState, realDt: number): JuiceState => {
  const next = derive({
    ...state,
    feverRemaining: Math.max(0, state.feverRemaining - Math.max(0, realDt))
  });
  // Cool back to calm until the next hit; don't erase the consecutive-hit record or earned multiplier.
  return {
    ...next,
    heat:
      next.feverRemaining > 0
        ? 'fever'
        : state.feverRemaining > 0
          ? 'calm'
          : state.heat
  };
};
