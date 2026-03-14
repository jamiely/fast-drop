import { Mesh, MeshStandardMaterial, SphereGeometry } from 'three';

export interface Ball {
  id: number;
}

export const BALL_RADIUS = 0.12;

const ballGeometry = new SphereGeometry(BALL_RADIUS, 24, 24);

export const createBallMesh = (): Mesh => {
  const material = new MeshStandardMaterial({
    color: '#f0f6fc',
    metalness: 0.2,
    roughness: 0.35,
    emissive: '#7ee787',
    emissiveIntensity: 0.22
  });

  return new Mesh(ballGeometry, material);
};
