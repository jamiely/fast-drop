import {
  BoxGeometry,
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial
} from 'three';

export interface PlayfieldDimensions {
  moundRadius: number;
  moundHeight: number;
  petalRadius: number;
  petalThickness: number;
  petalTopY: number;
  bridgeWidth: number;
  bridgeLength: number;
  bridgeThickness: number;
  bridgeCenterRadius: number;
}

const moundMaterial = new MeshPhysicalMaterial({
  color: '#4f87ff',
  metalness: 0.14,
  roughness: 0.16,
  clearcoat: 1,
  clearcoatRoughness: 0.08,
  emissive: '#2e4fff',
  emissiveIntensity: 0.18
});

const petalMaterial = new MeshPhysicalMaterial({
  color: '#69a8ff',
  metalness: 0.12,
  roughness: 0.2,
  clearcoat: 1,
  clearcoatRoughness: 0.1,
  emissive: '#355eff',
  emissiveIntensity: 0.14
});

const bridgeMaterial = new MeshPhysicalMaterial({
  color: '#5d99ff',
  metalness: 0.12,
  roughness: 0.2,
  clearcoat: 1,
  clearcoatRoughness: 0.1,
  emissive: '#3158ff',
  emissiveIntensity: 0.12
});

export const createPlayfieldDimensions = (
  jarOrbitRadius: number,
  jarRadius: number
): PlayfieldDimensions => {
  const moundRadius = Math.max(
    jarOrbitRadius * 0.82,
    jarOrbitRadius - jarRadius * 1.15
  );
  const moundHeight = jarOrbitRadius * 0.11;

  const petalRadius = jarRadius * 1.15;
  const petalThickness = jarRadius * 2 * 0.25;
  const petalTopY = 0;

  const bridgeStartRadius = moundRadius * 0.4;
  const bridgeEndRadius = Math.max(
    bridgeStartRadius + jarRadius * 0.9,
    jarOrbitRadius - petalRadius * 0.98
  );
  const bridgeLength = bridgeEndRadius - bridgeStartRadius;
  const bridgeCenterRadius = bridgeStartRadius + bridgeLength * 0.5;
  const bridgeWidth = jarRadius * 0.75;
  const bridgeThickness = petalThickness;

  return {
    moundRadius,
    moundHeight,
    petalRadius,
    petalThickness,
    petalTopY,
    bridgeWidth,
    bridgeLength,
    bridgeThickness,
    bridgeCenterRadius
  };
};

export const createPlayfieldBase = (dimensions: PlayfieldDimensions): Group => {
  const group = new Group();

  const mound = new Mesh(
    new ConeGeometry(dimensions.moundRadius, dimensions.moundHeight, 64),
    moundMaterial
  );
  mound.position.y = dimensions.moundHeight * 0.5;
  group.add(mound);

  return group;
};

export const createJarPetalMesh = (dimensions: PlayfieldDimensions): Mesh => {
  const petal = new Mesh(
    new CylinderGeometry(
      dimensions.petalRadius,
      dimensions.petalRadius,
      dimensions.petalThickness,
      48
    ),
    petalMaterial
  );
  petal.position.y = dimensions.petalTopY - dimensions.petalThickness * 0.5;
  return petal;
};

export const createJarBridgeMesh = (dimensions: PlayfieldDimensions): Mesh => {
  const bridge = new Mesh(
    new BoxGeometry(
      dimensions.bridgeWidth,
      dimensions.bridgeThickness,
      dimensions.bridgeLength
    ),
    bridgeMaterial
  );
  bridge.position.y = dimensions.petalTopY - dimensions.bridgeThickness * 0.5;
  return bridge;
};
