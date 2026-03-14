import { AmbientLight, DirectionalLight, Scene } from 'three';

export const addLighting = (scene: Scene): void => {
  const ambient = new AmbientLight(0xffffff, 0.65);
  const key = new DirectionalLight(0xffffff, 1.1);
  key.position.set(4, 7, 3);
  scene.add(ambient, key);
};
