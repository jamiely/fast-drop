// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { SceneRoot } from '../../src/scene/SceneRoot';

describe('SceneRoot', () => {
  it('builds scene graph and supports resize/render without WebGL', () => {
    const host = document.createElement('div');

    Object.defineProperty(host, 'clientWidth', { value: 800 });
    Object.defineProperty(host, 'clientHeight', { value: 600 });

    const root = new SceneRoot(host, 4);

    expect(root.jars).toHaveLength(4);
    expect(root.jarGroup.children).toHaveLength(4);

    root.resize();
    expect(root.camera.aspect).toBeCloseTo(800 / 600);

    expect(() => root.render()).not.toThrow();
  });

  it('reports settlements when ball intersects jar top area', () => {
    const host = document.createElement('div');
    Object.defineProperty(host, 'clientWidth', { value: 800 });
    Object.defineProperty(host, 'clientHeight', { value: 600 });

    const root = new SceneRoot(host, 1);
    root.spawnDropBall(0, 0, 99);

    let settlements = root.update(0.1);
    while (settlements.length === 0) {
      settlements = root.update(0.1);
    }

    expect(settlements[0]).toEqual({
      ballId: 99,
      jarIndex: 0,
      isBonusJar: true
    });
  });
});
