import {
  ConeGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  MeshStandardMaterial
} from 'three';

const centerBaseMaterial = new MeshStandardMaterial({
  color: '#36506d',
  metalness: 0.08,
  roughness: 0.44
});

const centerMoundMaterial = new MeshStandardMaterial({
  color: '#4f74a0',
  metalness: 0.08,
  roughness: 0.4
});

const petalMaterial = new MeshStandardMaterial({
  color: '#426182',
  metalness: 0.07,
  roughness: 0.42
});

export const createPlayfieldBase = (): Group => {
  const group = new Group();

  const centerBaseRadius = 1.15;
  const centerBaseHeight = 0.24;

  const centerBase = new Mesh(
    new CylinderGeometry(centerBaseRadius, centerBaseRadius * 1.18, centerBaseHeight, 48),
    centerBaseMaterial
  );
  centerBase.position.y = centerBaseHeight * 0.5 - 0.1;
  group.add(centerBase);

  const mound = new Mesh(new ConeGeometry(0.92, 0.5, 48), centerMoundMaterial);
  mound.position.y = 0.22;
  group.add(mound);

  return group;
};

export const createJarPetalMesh = (): Mesh => {
  const petal = new Mesh(new CylinderGeometry(0.44, 0.64, 1.56, 24), petalMaterial);
  petal.rotation.x = Math.PI * 0.5;
  petal.position.set(0, -0.3, -0.86);
  return petal;
};
