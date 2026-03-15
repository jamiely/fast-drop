import {
  CylinderGeometry,
  DoubleSide,
  Mesh,
  MeshPhysicalMaterial,
  TorusGeometry
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

const rimOuterRadius = JAR_RADIUS * 1.06;
const rimTubeRadius = JAR_RADIUS * 0.08;
const jarRimGeometry = new TorusGeometry(rimOuterRadius, rimTubeRadius, 20, 48);

export const createJarMesh = (isBonus: boolean): Mesh => {
  void isBonus;

  const material = new MeshPhysicalMaterial({
    color: '#79c2ff',
    transparent: true,
    opacity: 0.4,
    depthWrite: false,
    side: DoubleSide,
    metalness: 0,
    roughness: 0.04,
    transmission: 0.92,
    ior: 1.48,
    thickness: 0.6,
    clearcoat: 1,
    clearcoatRoughness: 0.02,
    emissive: '#8fd1ff',
    emissiveIntensity: 0.22
  });

  const rimMaterial = new MeshPhysicalMaterial({
    color: '#111111',
    metalness: 0,
    roughness: 0.92,
    clearcoat: 0.04,
    clearcoatRoughness: 0.9,
    emissive: '#000000',
    emissiveIntensity: 0
  });

  const jar = new Mesh(jarGeometry, material);
  jar.position.y = JAR_HEIGHT * 0.5;

  const rim = new Mesh(jarRimGeometry, rimMaterial);
  rim.rotation.x = Math.PI * 0.5;
  rim.position.y = JAR_HEIGHT * 0.5;
  jar.add(rim);

  return jar;
};
