import { describe, expect, it } from 'vitest';
import { MeshStandardMaterial } from 'three';
import { createBallMesh } from '../../src/entities/Ball';
import { createJarMesh } from '../../src/entities/Jar';

describe('entity factories', () => {
  it('creates a standard jar mesh', () => {
    const jar = createJarMesh(false);
    const material = jar.material as MeshStandardMaterial;

    expect(jar.position.y).toBeCloseTo(0.4);
    expect(material.color.getStyle()).toContain('rgb');
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBeCloseTo(0.38);
  });

  it('creates a bonus jar mesh with a different material color', () => {
    const normal = createJarMesh(false).material as MeshStandardMaterial;
    const bonus = createJarMesh(true).material as MeshStandardMaterial;

    expect(bonus.color.getHex()).not.toBe(normal.color.getHex());
  });

  it('creates a visible placeholder ball mesh', () => {
    const ball = createBallMesh();
    const material = ball.material as MeshStandardMaterial;

    expect(ball.position.y).toBe(0);
    expect(material.emissiveIntensity).toBeGreaterThan(0);
  });
});
