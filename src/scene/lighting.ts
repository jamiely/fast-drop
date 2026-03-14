import {
  AmbientLight,
  DirectionalLight,
  HemisphereLight,
  PointLight,
  Scene
} from 'three';

export const addLighting = (scene: Scene): void => {
  const ambient = new AmbientLight('#8ab8ff', 0.34);

  const hemi = new HemisphereLight('#8cb6ff', '#1b0d3d', 0.62);
  hemi.position.set(0, 6, 0);

  const key = new DirectionalLight('#d8e6ff', 1.08);
  key.position.set(3.8, 6.5, 3.2);

  const magentaRim = new PointLight('#ff4ad5', 0.95, 12, 2.2);
  magentaRim.position.set(-4.5, 3.2, 4.8);

  const cyanRim = new PointLight('#32a7ff', 1.1, 12, 2.2);
  cyanRim.position.set(4.2, 3.2, 4.4);

  const purpleBack = new PointLight('#6d56ff', 0.8, 14, 2);
  purpleBack.position.set(0, 4.8, -5.5);

  scene.add(ambient, hemi, key, magentaRim, cyanRim, purpleBack);
};
