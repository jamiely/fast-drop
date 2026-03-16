export interface GameplayTuning {
  ringAngularSpeed: number;
  ringRadius: number;
  outerRingDiameter: number;
  dropPointX: number;
  dropPointZ: number;
  dropHeight: number;
  statusDisplayX: number;
  statusDisplayY: number;
  statusDisplayZ: number;
  statusDisplayScale: number;
  dropCooldownMs: number;
  jarDiameterScale: number;
  jarHeightScale: number;
  ballSizeScale: number;
  ballBounciness: number;
  wallBounciness: number;
  floorBounciness: number;
  centerDomeDiameterScale: number;
  centerDomeSteepnessScale: number;
  centerDomeHeightOffset: number;
  platformArmLengthScale: number;
  outerRingLedEnabled: number;
  outerRingLedSpeed: number;
  outerRingLedHeadCount: number;
  outerRingLedTrail: number;
  outerRingLedReverseChance: number;
}

export interface CameraTuning {
  distance: number;
  pitch: number;
  yaw: number;
  panX?: number;
  targetY: number;
  targetZ?: number;
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
    outerRingDiameter: 7.5,
    dropPointX: 0,
    dropPointZ: 2.2 + DEFAULT_JAR_DIAMETER,
    dropHeight: 2.5,
    statusDisplayX: 0,
    statusDisplayY: 2.25,
    statusDisplayZ: 2.2,
    statusDisplayScale: 1,
    dropCooldownMs: 80,
    jarDiameterScale: 1.5,
    jarHeightScale: 1.4,
    ballSizeScale: 2,
    ballBounciness: 0.46,
    wallBounciness: 0.52,
    floorBounciness: 0.42,
    centerDomeDiameterScale: 0.6,
    centerDomeSteepnessScale: 2,
    centerDomeHeightOffset: 0,
    platformArmLengthScale: 0.15,
    outerRingLedEnabled: 1,
    outerRingLedSpeed: 0.35,
    outerRingLedHeadCount: 4,
    outerRingLedTrail: 0.58,
    outerRingLedReverseChance: 0.2
  },
  camera: {
    distance: 6,
    pitch: 2.1,
    yaw: 0,
    panX: 0,
    targetY: 1.45,
    targetZ: 2.2
  }
};

export const createRuntimeConfig = (): RuntimeConfig =>
  structuredClone(gameConfig);
