import {
  CylinderGeometry,
  DoubleSide,
  Mesh,
  MeshPhysicalMaterial
} from 'three';

export const JAR_RADIUS = 0.33;
export const JAR_HEIGHT = 0.8;

const jarGeometry = new CylinderGeometry(
  JAR_RADIUS,
  JAR_RADIUS,
  JAR_HEIGHT,
  32,
  1,
  true
);

export const createJarMesh = (isBonus: boolean): Mesh => {
  const material = new MeshPhysicalMaterial({
    color: isBonus ? '#57d66a' : '#4ea4ff',
    transparent: true,
    opacity: isBonus ? 0.56 : 0.5,
    depthWrite: false,
    side: DoubleSide,
    metalness: 0.05,
    roughness: 0.14,
    transmission: 0.62,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    emissive: isBonus ? '#a6ff5c' : '#66b7ff',
    emissiveIntensity: isBonus ? 0.45 : 0.24
  });

  const jar = new Mesh(jarGeometry, material);
  jar.position.y = JAR_HEIGHT * 0.5;
  return jar;
};
