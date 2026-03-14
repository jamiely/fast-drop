import { describe, expect, it } from 'vitest';
import { MeshPhysicalMaterial } from 'three';
import { createBallMesh } from '../../src/entities/Ball';
import { createJarMesh } from '../../src/entities/Jar';

describe('entity factories', () => {
  it('creates a standard jar mesh', () => {
    const jar = createJarMesh(false);
    const material = jar.material as MeshPhysicalMaterial;

    expect(jar.position.y).toBeCloseTo(0.4);
    expect(material.color.getStyle()).toContain('rgb');
    expect(material.transparent).toBe(true);
    expect(material.opacity).toBeCloseTo(0.5);
  });

  it('creates a bonus jar mesh with a different material color', () => {
    const normal = createJarMesh(false).material as MeshPhysicalMaterial;
    const bonus = createJarMesh(true).material as MeshPhysicalMaterial;

    expect(bonus.color.getHex()).not.toBe(normal.color.getHex());
  });

  it('creates a visible placeholder ball mesh', () => {
    const ball = createBallMesh();
    const material = ball.material as MeshPhysicalMaterial;

    expect(ball.position.y).toBe(0);
    expect(material.emissiveIntensity).toBeGreaterThan(0);
  });
});
