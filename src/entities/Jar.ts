import { CylinderGeometry, Mesh, MeshStandardMaterial } from 'three';

const jarGeometry = new CylinderGeometry(0.33, 0.33, 0.8, 24, 1, true);

export const createJarMesh = (isBonus: boolean): Mesh => {
  const material = new MeshStandardMaterial({
    color: isBonus ? '#e3b341' : '#58a6ff',
    metalness: 0.15,
    roughness: 0.55
  });

  const jar = new Mesh(jarGeometry, material);
  jar.position.y = 0.4;
  return jar;
};
