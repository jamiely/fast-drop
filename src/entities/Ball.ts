import { Mesh, MeshPhysicalMaterial, SphereGeometry } from 'three';
import { JAR_RADIUS } from './Jar';

export interface Ball {
  id: number;
}

const REFERENCE_JAR_DIAMETER = 0.66;
const REFERENCE_BALL_DIAMETER = 0.157;
export const BALL_DIAMETER_TO_JAR_DIAMETER =
  REFERENCE_BALL_DIAMETER / REFERENCE_JAR_DIAMETER;

export const BALL_RADIUS = JAR_RADIUS * BALL_DIAMETER_TO_JAR_DIAMETER;
export const BALL_DIAMETER = BALL_RADIUS * 2;

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
