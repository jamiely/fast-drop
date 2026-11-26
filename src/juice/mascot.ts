/** Pure mood machine for the jar mascots: idle blinks, a grin and a hop on a hit, worry on a near miss, cheering at the finale. */

export type Mood = 'idle' | 'happy' | 'worried' | 'cheer';

/** Atlas frames, in the order theme.ts draws them. */
export const FACE_FRAMES = [
  'idle',
  'blink',
  'happy',
  'worried',
  'cheer',
  'cheer-blink'
] as const;
export type FaceFrame = (typeof FACE_FRAMES)[number];

export interface MascotState {
  mood: Mood;
  /** Seconds left in a timed mood (happy, worried); cheer lasts until changed. */
  moodLeft: number;
  /** Seconds since the mood began, for the bounce. */
  moodAge: number;
  /** Seconds until the next blink starts; negative while blinking. */
  blinkIn: number;
}

export const MOOD_SECONDS = { happy: 0.9, worried: 1.1 } as const;
export const BLINK_SECONDS = 0.12;

const nextBlink = (random: number): number => 2.2 + random * 3.2;

export const initialMascot = (random = 0.5): MascotState => ({
  mood: 'idle',
  moodLeft: 0,
  moodAge: 0,
  blinkIn: nextBlink(random)
});

export type MascotEvent = 'hit' | 'near-miss' | 'cheer' | 'calm';

export const mascotEvent = (
  state: MascotState,
  event: MascotEvent
): MascotState => {
  switch (event) {
    case 'hit':
      return {
        ...state,
        mood: 'happy',
        moodLeft: MOOD_SECONDS.happy,
        moodAge: 0
      };
    case 'near-miss':
      // A grin or a cheer outranks a scare.
      if (state.mood === 'happy' || state.mood === 'cheer') return state;
      return {
        ...state,
        mood: 'worried',
        moodLeft: MOOD_SECONDS.worried,
        moodAge: 0
      };
    case 'cheer':
      return { ...state, mood: 'cheer', moodLeft: 0, moodAge: 0 };
    case 'calm':
      return { ...state, mood: 'idle', moodLeft: 0, moodAge: 0 };
  }
};

export const advanceMascot = (
  state: MascotState,
  dt: number,
  random = Math.random
): MascotState => {
  const step = Math.max(0, dt);
  let { mood, moodLeft, moodAge, blinkIn } = state;
  moodAge += step;
  if (mood === 'happy' || mood === 'worried') {
    moodLeft -= step;
    if (moodLeft <= 0) {
      mood = 'idle';
      moodLeft = 0;
      moodAge = 0;
    }
  }
  blinkIn -= step;
  if (blinkIn <= -BLINK_SECONDS) blinkIn = nextBlink(random());
  return { mood, moodLeft, moodAge, blinkIn };
};

export const faceFrame = (state: MascotState): FaceFrame => {
  const blinking = state.blinkIn <= 0;
  switch (state.mood) {
    case 'happy':
      return 'happy';
    case 'cheer':
      return blinking ? 'cheer-blink' : 'cheer';
    case 'worried':
      return 'worried';
    case 'idle':
      return blinking ? 'blink' : 'idle';
  }
};

/** Face lift in jar heights and a squash for the face: a damped hop on a hit, a steady bounce while cheering, a shiver when worried. */
export const faceMotion = (
  state: MascotState
): { lift: number; squash: number; tilt: number } => {
  const t = state.moodAge;
  switch (state.mood) {
    case 'happy': {
      const hop = Math.abs(Math.sin(t * 11)) * Math.exp(-t * 3.2);
      return { lift: hop * 0.22, squash: 1 + hop * 0.12, tilt: 0 };
    }
    case 'cheer': {
      const hop = Math.abs(Math.sin(t * 8));
      return {
        lift: hop * 0.16,
        squash: 1 + hop * 0.08,
        tilt: Math.sin(t * 4) * 0.18
      };
    }
    case 'worried':
      return {
        lift: 0,
        squash: 1,
        tilt: Math.sin(t * 38) * 0.05 * Math.exp(-t * 2)
      };
    case 'idle':
      return { lift: 0, squash: 1, tilt: 0 };
  }
};
