import { Mesh, MeshPhysicalMaterial, SphereGeometry } from 'three';
import { JAR_RADIUS } from './Jar';

export interface Ball {
  id: number;
}

// Ball diameter should be 1/8 jar diameter -> ball radius = jar radius / 8
export const BALL_RADIUS = JAR_RADIUS / 8;

const ballGeometry = new SphereGeometry(BALL_RADIUS, 20, 20);

export const createBallMesh = (): Mesh => {
  const material = new MeshPhysicalMaterial({
    color: '#f7fbff',
    metalness: 0.18,
    roughness: 0.08,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    emissive: '#6cd6ff',
    emissiveIntensity: 0.15
  });

  return new Mesh(ballGeometry, material);
};
