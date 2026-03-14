export interface GameplayTuning {
  ringAngularSpeed: number;
  ringRadius: number;
  dropPointX: number;
  dropPointZ: number;
  dropHeight: number;
  dropCooldownMs: number;
  jarDiameterScale: number;
  jarHeightScale: number;
  ballBounciness: number;
  wallBounciness: number;
  floorBounciness: number;
}

export interface CameraTuning {
  distance: number;
  pitch: number;
  yaw: number;
  targetY: number;
}

export interface RuntimeConfig {
  ballsTotal: number;
  timeStartSeconds: number;
  bonusTimeSeconds: number;
  jarCount: number;
  bonusBucketCount: number;
  dropScore: number;
  tuning: GameplayTuning;
  camera: CameraTuning;
}

export const gameConfig: RuntimeConfig = {
  ballsTotal: 50,
  timeStartSeconds: 30,
  bonusTimeSeconds: 3,
  jarCount: 5,
  bonusBucketCount: 2,
  dropScore: 10,
  tuning: {
    ringAngularSpeed: 0.8,
    ringRadius: 2.2,
    dropPointX: 0,
    dropPointZ: 2.2,
    dropHeight: 2.6,
    dropCooldownMs: 80,
    jarDiameterScale: 1,
    jarHeightScale: 1,
    ballBounciness: 0.46,
    wallBounciness: 0.52,
    floorBounciness: 0.42
  },
  camera: {
    distance: 6.8,
    pitch: 3.8,
    yaw: 0,
    targetY: 0.6
  }
};

export const createRuntimeConfig = (): RuntimeConfig =>
  structuredClone(gameConfig);
