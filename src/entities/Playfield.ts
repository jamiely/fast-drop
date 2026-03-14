import {
  BoxGeometry,
  ConeGeometry,
  Group,
  Mesh,
  MeshStandardMaterial
} from 'three';

export interface PlayfieldDimensions {
  moundRadius: number;
  moundHeight: number;
  petalLength: number;
  petalWidth: number;
  petalThickness: number;
  petalInnerRadius: number;
  petalOuterRadius: number;
  petalCenterRadius: number;
  petalTopY: number;
}

const moundMaterial = new MeshStandardMaterial({
  color: '#4f74a0',
  metalness: 0.08,
  roughness: 0.42
});

const petalMaterial = new MeshStandardMaterial({
  color: '#426182',
  metalness: 0.07,
  roughness: 0.42
});

export const createPlayfieldDimensions = (
  jarOrbitRadius: number,
  jarRadius: number
): PlayfieldDimensions => {
  const moundRadius = jarOrbitRadius * 0.35;
  const moundHeight = jarOrbitRadius * 0.1;

  const suggestedPetalLength = jarOrbitRadius * 0.6;
  const suggestedPetalWidth = jarRadius * 2 * 1.8;
  const petalThickness = jarRadius * 2 * 0.25;

  const petalInnerRadius = moundRadius * 0.98;
  const targetJarOffsetFromInner = suggestedPetalLength * 0.82;
  const adjustedPetalLength = Math.max(
    suggestedPetalLength,
    jarOrbitRadius - petalInnerRadius + jarRadius * 0.55
  );

  const petalLength = Math.max(adjustedPetalLength, targetJarOffsetFromInner + jarRadius * 0.55);
  const petalOuterRadius = petalInnerRadius + petalLength;
  const petalCenterRadius = petalInnerRadius + petalLength * 0.5;

  return {
    moundRadius,
    moundHeight,
    petalLength,
    petalWidth: suggestedPetalWidth,
    petalThickness,
    petalInnerRadius,
    petalOuterRadius,
    petalCenterRadius,
    petalTopY: 0
  };
};

export const createPlayfieldBase = (dimensions: PlayfieldDimensions): Group => {
  const group = new Group();

  const mound = new Mesh(new ConeGeometry(dimensions.moundRadius, dimensions.moundHeight, 64), moundMaterial);
  mound.position.y = dimensions.moundHeight * 0.5;
  group.add(mound);

  return group;
};

export const createJarPetalMesh = (dimensions: PlayfieldDimensions): Mesh => {
  const petal = new Mesh(
    new BoxGeometry(dimensions.petalWidth, dimensions.petalThickness, dimensions.petalLength),
    petalMaterial
  );
  petal.position.y = dimensions.petalTopY - dimensions.petalThickness * 0.5;
  return petal;
};
