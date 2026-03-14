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

  const rimMaterial = new MeshPhysicalMaterial({
    color: isBonus ? '#7deb88' : '#7dc0ff',
    transparent: true,
    opacity: isBonus ? 0.9 : 0.84,
    depthWrite: false,
    metalness: 0.08,
    roughness: 0.2,
    transmission: 0.4,
    clearcoat: 1,
    clearcoatRoughness: 0.07,
    emissive: isBonus ? '#b6ff74' : '#84ccff',
    emissiveIntensity: isBonus ? 0.38 : 0.25
  });

  const jar = new Mesh(jarGeometry, material);
  jar.position.y = JAR_HEIGHT * 0.5;

  const rim = new Mesh(jarRimGeometry, rimMaterial);
  rim.rotation.x = Math.PI * 0.5;
  rim.position.y = JAR_HEIGHT * 0.5;
  jar.add(rim);

  return jar;
};
