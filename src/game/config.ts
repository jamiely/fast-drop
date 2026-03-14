export interface GameplayTuning {
  ringAngularSpeed: number;
  ringRadius: number;
  outerRingDiameter: number;
  dropPointX: number;
  dropPointZ: number;
  dropHeight: number;
  dropCooldownMs: number;
  jarDiameterScale: number;
  jarHeightScale: number;
  ballSizeScale: number;
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

const DEFAULT_JAR_DIAMETER = 0.66;

export const gameConfig: RuntimeConfig = {
  ballsTotal: 50,
  timeStartSeconds: 30,
  bonusTimeSeconds: 3,
  jarCount: 5,
  bonusBucketCount: 2,
  dropScore: 10,
  tuning: {
    ringAngularSpeed: 0.7,
    ringRadius: 2.2 + DEFAULT_JAR_DIAMETER,
    outerRingDiameter: (2.2 + DEFAULT_JAR_DIAMETER + (DEFAULT_JAR_DIAMETER * 0.5) * 1.05) * 2,
    dropPointX: 0,
    dropPointZ: 2.2 + DEFAULT_JAR_DIAMETER,
    dropHeight: 2.3,
    dropCooldownMs: 80,
    jarDiameterScale: 1,
    jarHeightScale: 1,
    ballSizeScale: 1,
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
