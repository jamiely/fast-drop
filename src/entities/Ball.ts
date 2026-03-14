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
    color: '#df2a2a',
    metalness: 0.02,
    roughness: 0.85,
    clearcoat: 0.08,
    clearcoatRoughness: 0.8,
    emissive: '#4a0808',
    emissiveIntensity: 0.1
  });

  return new Mesh(ballGeometry, material);
};
