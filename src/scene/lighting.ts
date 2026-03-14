import {
  AmbientLight,
  DirectionalLight,
  HemisphereLight,
  PointLight,
  Scene,
  SpotLight
} from 'three';

export const addLighting = (scene: Scene): void => {
  const ambient = new AmbientLight('#88a8e0', 0.22);

  const hemi = new HemisphereLight('#c6dcff', '#1b0f36', 0.5);
  hemi.position.set(0, 5.8, 0);

  const key = new DirectionalLight('#ffffff', 0.8);
  key.position.set(2.6, 6.2, 2.8);

  const centerSpot = new SpotLight('#fff7df', 1.9, 14, 0.62, 0.28, 1.3);
  centerSpot.position.set(0, 5.2, 1.3);
  centerSpot.target.position.set(0, 0.45, 0);

  const cyanRim = new PointLight('#3ca7ff', 0.78, 12, 2.2);
  cyanRim.position.set(4.2, 3.2, 4.4);

  const purpleBack = new PointLight('#6d56ff', 0.66, 14, 2);
  purpleBack.position.set(0, 4.8, -5.5);

  scene.add(ambient, hemi, key, centerSpot, centerSpot.target, cyanRim, purpleBack);
};
