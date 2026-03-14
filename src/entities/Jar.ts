import {
  CylinderGeometry,
  DoubleSide,
  Mesh,
  MeshStandardMaterial
} from 'three';

export const JAR_RADIUS = 0.33;
export const JAR_HEIGHT = 0.8;

const jarGeometry = new CylinderGeometry(
  JAR_RADIUS,
  JAR_RADIUS,
  JAR_HEIGHT,
  24,
  1,
  true
);

export const createJarMesh = (isBonus: boolean): Mesh => {
  const material = new MeshStandardMaterial({
    color: isBonus ? '#f2cc60' : '#79c0ff',
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    side: DoubleSide,
    metalness: 0.05,
    roughness: 0.2,
    emissive: isBonus ? '#f2cc60' : '#79c0ff',
    emissiveIntensity: 0.2
  });

  const jar = new Mesh(jarGeometry, material);
  jar.position.y = JAR_HEIGHT * 0.5;
  return jar;
};
