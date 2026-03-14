import { describe, expect, it } from 'vitest';
import { AmbientLight, DirectionalLight, Scene } from 'three';
import { createCamera } from '../../src/scene/camera';
import { addLighting } from '../../src/scene/lighting';

describe('scene helpers', () => {
  it('creates a configured perspective camera', () => {
    const camera = createCamera(16 / 9);

    expect(camera.fov).toBe(55);
    expect(camera.aspect).toBeCloseTo(16 / 9);
    expect(camera.position.y).toBeCloseTo(3.8);
    expect(camera.position.z).toBeCloseTo(6.8);
  });

  it('adds ambient and directional lighting to the scene', () => {
    const scene = new Scene();
    addLighting(scene);

    const lights = scene.children.filter(
      (node) => node instanceof AmbientLight || node instanceof DirectionalLight
    );

    expect(lights).toHaveLength(2);
  });
});
