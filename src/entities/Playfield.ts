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
  const moundRadius = Math.max(
    jarOrbitRadius * 0.82,
    jarOrbitRadius - jarRadius * 1.15
  );
  const moundHeight = jarOrbitRadius * 0.11;

  const petalWidth = jarRadius * 2 * 1.8;
  const petalThickness = jarRadius * 2 * 0.25;

  const petalTopY = 0;
  const petalInnerRadius = moundRadius * 0.995;
  const petalOuterRadius = jarOrbitRadius + jarRadius * 0.65;
  const petalLength = Math.max(jarRadius * 1.4, petalOuterRadius - petalInnerRadius);
  const petalCenterRadius = petalInnerRadius + petalLength * 0.5;

  return {
    moundRadius,
    moundHeight,
    petalLength,
    petalWidth,
    petalThickness,
    petalInnerRadius,
    petalOuterRadius,
    petalCenterRadius,
    petalTopY
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
